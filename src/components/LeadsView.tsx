import React, { useState } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Mail, LayoutGrid, List, ChevronRight, Info, Trash2, Key, Eye, EyeOff, Copy, CheckCircle, Zap, Code } from 'lucide-react';
import { cn, notifyError } from '../lib/utils';
import { Lead, LeadStatus, Client, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { storageService } from '../lib/storage';
import { toast } from './ui/Toast';
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  KeyboardSensor,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Modal from './Modal';

const statusConfig: Record<LeadStatus, { label: string; color: string; dot: string }> = {
  prospect: { label: 'Prospecção', color: 'bg-slate-50 text-slate-600 border-slate-100', dot: 'bg-slate-400' },
  negotiation: { label: 'Negociação', color: 'bg-indigo-50/50 text-indigo-600 border-indigo-100/50', dot: 'bg-indigo-500' },
  converted: { label: 'Convertido', color: 'bg-emerald-50/50 text-emerald-600 border-emerald-100/50', dot: 'bg-emerald-500' },
  lost: { label: 'Perdido', color: 'bg-rose-50/50 text-rose-600 border-rose-100/50', dot: 'bg-rose-500' },
};

interface LeadsViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  currentUser?: User;
  setCurrentUser?: (u: User) => void;
}

interface KanbanCardProps {
  lead: Lead;
  status: LeadStatus;
  onDelete: (id: string) => void;
  onChangeStatus: (id: string, status: LeadStatus) => void;
  onClick: (lead: Lead) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ lead, status, onDelete, onChangeStatus, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: lead.id,
    data: {
      type: 'Lead',
      lead,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className="bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-indigo-500 opacity-30 h-[120px]"
      />
    );
  }

  return (
    <motion.div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      onClick={() => onClick(lead)}
      className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{lead.company}</h4>
        <button className="text-gray-300 dark:text-gray-600 hover:text-gray-500"><MoreHorizontal size={14} /></button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-300 mb-4 font-medium italic">{lead.contactName}</p>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-800 transition-colors">
        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">R$ {lead.estimatedValue.toLocaleString()}</span>
        <div className="flex gap-1">
          {status !== 'converted' && (
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onChangeStatus(lead.id, 'converted'); }}
              className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-300 dark:text-gray-600 hover:text-emerald-500 dark:hover:text-emerald-400 rounded transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          )}
          <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { 
                e.stopPropagation(); 
                if(lead.phone) window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank');
                else if(lead.email) window.open(`mailto:${lead.email}`, '_blank');
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 rounded transition-colors"
            >
              <Mail size={12} />
          </button>
          <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 rounded transition-colors"
            >
              <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onDeleteLead: (id: string) => void;
  onChangeLeadStatus: (id: string, status: LeadStatus) => void;
  onEditLead: (lead: Lead) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, leads, onDeleteLead, onChangeLeadStatus, onEditLead }) => {
  const { setNodeRef } = useDroppable({
    id: status,
    data: {
      type: 'Column',
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig[status].dot)} />
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-[0.2em]">{statusConfig[status].label}</span>
        </div>
        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-500/20 transition-colors">
          {leads.length}
        </span>
      </div>
      
      <SortableContext 
        id={status}
        items={leads.map(l => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div 
          ref={setNodeRef}
          className="bg-white dark:bg-gray-950 p-2 rounded-2xl border border-gray-100 dark:border-gray-800 min-h-[400px] space-y-3 shadow-inner shadow-gray-50/50 dark:shadow-black/20 transition-colors duration-300"
        >
          {leads.map((lead) => (
            <KanbanCard 
              key={lead.id} 
              lead={lead} 
              status={status}
              onDelete={onDeleteLead}
              onChangeStatus={onChangeLeadStatus}
              onClick={onEditLead}
            />
          ))}
          {leads.length === 0 && (
            <div className="h-24 border border-dashed border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs italic">
              Vazio
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default function LeadsView({ leads, setLeads, setClients, currentUser, setCurrentUser }: LeadsViewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'api'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const initialFormData: Partial<Lead> = {
    company: '',
    contactName: '',
    email: '',
    phone: '',
    source: '',
    estimatedValue: 0,
    notes: '',
    status: 'prospect'
  };

  const [formData, setFormData] = useState<Partial<Lead>>(initialFormData);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredLeads = leads.filter(l => 
    l.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: LeadStatus[] = ['prospect', 'negotiation', 'converted', 'lost'];

  const handleAddLead = () => {
    setEditingLead(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      ...initialFormData,
      ...lead
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company?.trim() || !formData.contactName?.trim() || !formData.email?.trim()) {
      notifyError('Preencha os campos obrigatórios (Empresa, Contato e E-mail) para continuar.', 'Atenção');
      return;
    }

    try {
      if (editingLead) {
        const updatedLead = await api.updateLead(editingLead.id, formData);
        setLeads(leads.map(l => l.id === editingLead.id ? { ...l, ...updatedLead } : l));
      } else {
        const newLeadData: any = {
          ...formData,
          lastContact: new Date().toLocaleDateString('pt-BR'),
          status: formData.status || 'prospect'
        };
        const newLead = await api.createLead(newLeadData);
        setLeads([...leads, newLead]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar lead: ' + err.message);
    }
  };

  const handleChangeStatus = async (id: string, newStatus: LeadStatus) => {
    try {
      const updatedLead = await api.updateLead(id, { status: newStatus });
      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));

      const lead = leads.find(l => l.id === id);
      if (newStatus === 'converted' && lead) {
          const newClientData: any = {
            name: lead.company,
            contactEmail: lead.email,
            phone: lead.phone || '',
            monthlyValue: lead.estimatedValue,
            status: 'active',
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
          };
          const createdClient = await api.createClient(newClientData);
          setClients(prev => [...prev, createdClient]);
          alert('Cliente criado com sucesso! Verifique a aba de Clientes.');
      }
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await api.deleteLead(id);
      setLeads(leads.filter(l => l.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === 'Lead') {
      setActiveLead(event.active.data.current.lead);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveALead = active.data.current?.type === 'Lead';
    const isOverALead = over.data.current?.type === 'Lead';

    if (!isActiveALead) return;

    // Im dropping a lead over another lead
    if (isActiveALead && isOverALead) {
      setLeads((prevLeads) => {
        const leadsClone = [...prevLeads];
        const activeIndex = leadsClone.findIndex((l) => l.id === activeId);
        const overIndex = leadsClone.findIndex((l) => l.id === overId);

        if (leadsClone[activeIndex].status !== leadsClone[overIndex].status) {
          leadsClone[activeIndex] = {
            ...leadsClone[activeIndex],
            status: leadsClone[overIndex].status
          };
          return arrayMove(leadsClone, activeIndex, overIndex);
        }

        return arrayMove(leadsClone, activeIndex, overIndex);
      });
    }

    const isOverAColumn = over.data.current?.type === 'Column';

    // Im dropping a lead over a column
    if (isActiveALead && isOverAColumn) {
      setLeads((prevLeads) => {
        const leadsClone = [...prevLeads];
        const activeIndex = leadsClone.findIndex((l) => l.id === activeId);
        
        if (leadsClone[activeIndex].status !== overId) {
          leadsClone[activeIndex] = {
            ...leadsClone[activeIndex],
            status: overId as LeadStatus
          };
          return arrayMove(leadsClone, activeIndex, activeIndex);
        }
        
        return leadsClone;
      });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);
    
    if (!over) return;
    
    const leadId = active.id as string;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Check if status actually changed in the final position
    // (though dnd-kit already updated our local state in handleDragOver, 
    // we take the latest state from the 'leads' array)
    const finalizedLead = leads.find(l => l.id === leadId);
    if (finalizedLead) {
      try {
        await api.updateLead(leadId, { status: finalizedLead.status });
        
        // If it was converted, we might need more logic
        if (finalizedLead.status === 'converted') {
          // This logic is usually already handled in handleChangeStatus but here we need it for drag-drop
          // However, for drag-drop, we usually want the user to fill client details.
          // For now, let's at least persist the status.
        }
      } catch (err: any) {
        alert('Erro ao persistir mudança de status: ' + err.message);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Gestão de Leads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">Acompanhe potenciais clientes e oportunidades de negócio.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-sm transition-colors">
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === 'table' ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-inner" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              )}
              title="Visualização em Lista"
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === 'kanban' ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-inner" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              )}
              title="Visualização em Kanban"
            >
              <LayoutGrid size={18} />
            </button>
            {currentUser && (currentUser.role === 'OWNER' || currentUser.role === 'ADMIN') && (
              <button 
                onClick={() => setViewMode('api')}
                className={cn(
                  "p-1.5 rounded-lg transition-all flex items-center gap-1",
                  viewMode === 'api' ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-inner" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                )}
                title="Configuração de API de Entrada"
              >
                <Key size={18} />
                <span className="text-xs font-semibold px-1 hidden md:inline">API</span>
              </button>
            )}
          </div>
          <button 
            onClick={handleAddLead}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
          >
            <Plus size={16} />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {viewMode !== 'api' && (
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar leads por nome, empresa ou e-mail..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm shadow-sm text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {viewMode === 'api' ? (
        <LeadAPISettingsView currentUser={currentUser} setCurrentUser={setCurrentUser} />
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Empresa / Contato</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Valor Est.</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer" onClick={() => handleEditLead(lead)}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">{lead.company}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-300">{lead.contactName}</span>
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        <span className="text-xs text-gray-400 dark:text-gray-400">{lead.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={lead.status || 'prospect'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleChangeStatus(lead.id, e.target.value as LeadStatus)}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border focus:outline-none transition-colors",
                        statusConfig[lead.status].color
                      )}
                    >
                      {Object.entries(statusConfig || {}).map(([val, { label }]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 transition-colors">R$ {lead.estimatedValue.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if(lead.phone) window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank');
                        else if(lead.email) window.open(`mailto:${lead.email}`, '_blank');
                      }}
                      className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Mail size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                      className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-rose-300 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 dark:text-gray-600 transition-colors">
                <Search size={24} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium italic">Nenhum lead encontrado.</p>
            </div>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {columns.map((status) => (
              <KanbanColumn 
                key={status}
                status={status}
                leads={filteredLeads.filter(l => l.status === status)}
                onDeleteLead={handleDeleteLead}
                onChangeLeadStatus={handleChangeStatus}
                onEditLead={handleEditLead}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-indigo-500 shadow-xl opacity-90 w-[280px]">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-tight">{activeLead.company}</h4>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-300 mb-4 font-medium italic">{activeLead.contactName}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">R$ {activeLead.estimatedValue.toLocaleString()}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLead ? 'Editar Lead' : 'Novo Lead'}
        footer={
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSubmit}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
            >
              {editingLead ? 'Salvar Alterações' : 'Criar Lead'}
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Empresa <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.company || ''}
                onChange={e => setFormData({...formData, company: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 shadow-sm text-gray-900 dark:text-gray-100"
                placeholder="Ex: Agency S.A"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Contato <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.contactName || ''}
                onChange={e => setFormData({...formData, contactName: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Valor Estimado</label>
              <input 
                type="number" 
                value={formData.estimatedValue || 0}
                onChange={e => setFormData({...formData, estimatedValue: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">E-mail <span className="text-red-500">*</span></label>
              <input 
                type="email" 
                value={formData.email || ''}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Telefone</label>
              <input 
                type="text" 
                value={formData.phone || ''}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Origem</label>
              <select 
                value={formData.source || ''}
                onChange={e => setFormData({...formData, source: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">Selecione...</option>
                <option value="Instagram">Instagram</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Indicação">Indicação</option>
                <option value="Google">Google</option>
                <option value="Facebook">Facebook</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Status Inicial</label>
              <select 
                value={formData.status || 'prospect'}
                onChange={e => setFormData({...formData, status: e.target.value as LeadStatus})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100"
              >
                {Object.entries(statusConfig || {}).map(([val, { label }]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Notas / Observações</label>
              <textarea 
                rows={3}
                value={formData.notes || ''}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm resize-none placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
                placeholder="Detalhes sobre a negociação..."
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

interface LeadAPISettingsViewProps {
  currentUser?: User;
  setCurrentUser?: (u: User) => void;
}

const LeadAPISettingsView: React.FC<LeadAPISettingsViewProps> = ({ currentUser, setCurrentUser }) => {
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchWithAuth = async (url: string, options: any = {}) => {
    const token = storageService.getItem("agency_token");
    const headers = {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...options, headers });
  };

  const generateApiKey = async () => {
    if (!setCurrentUser || !currentUser) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/users/generate-api-key", { method: "POST" });
      const data = await res.json();
      if (data.apiKey) {
        setCurrentUser({ ...currentUser, apiKey: data.apiKey });
        toast.success("Chave de API gerada com sucesso!");
      } else {
        toast.error("Erro ao gerar chave de API");
      }
    } catch (err) {
      toast.error("Erro ao gerar chave de API");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copiado com sucesso!");
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl animate-pulse">
            <Key size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">API Individual de Leads</h2>
            <p className="text-xs text-gray-500">Cada usuário possui sua própria chave de API para integrar com formulários, chatbots ou IA externa.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sua Chave de API Pessoal (X-API-Key)</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white dark:bg-gray-950 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 font-mono text-xs overflow-hidden whitespace-nowrap text-ellipsis text-gray-900 dark:text-gray-100">
                {currentUser.apiKey ? (showKey ? currentUser.apiKey : "••••••••••••••••••••••••••••••••") : "Nenhuma chave gerada"}
              </div>
              <button 
                onClick={() => setShowKey(!showKey)}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-550 transition-colors"
                title={showKey ? "Ocultar" : "Mostrar"}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button 
                onClick={() => currentUser.apiKey && copyToClipboard(currentUser.apiKey)}
                disabled={!currentUser.apiKey}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-550 transition-colors disabled:opacity-30"
                title="Copiar Código"
              >
                {copied ? <CheckCircle size={18} className="text-emerald-500" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-500/5 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
            <div className="flex gap-3">
              <Zap className="text-indigo-500 shrink-0 animate-bounce" size={20} />
              <div>
                <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Integração do Funil</p>
                <p className="text-[10px] text-indigo-700/70 dark:text-indigo-400/70">Novo Lead enviado para este endpoint cai diretamente na lista ou visualização em Kanban.</p>
              </div>
            </div>
            <button 
              onClick={generateApiKey}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {currentUser.apiKey ? "Rotacionar Chave" : "Gerar Minha Chave"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Zap size={20} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Link de Webhook Inteligente (Recomendado)</h2>
        </div>

        <div className="space-y-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Use esta URL diretamente no <strong>Elementor, Zapier, Make, Typeform, RD Station</strong> ou qualquer formulário e chatbot. 
            Este endpoint é inteligente: ele aceita dados em português e inglês e mapeia automaticamente os campos para criar o lead.
          </p>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Escolha o formato do Webhook:</label>
              <div className="space-y-2.5">
                {/* Formato 1 */}
                <div className="bg-white dark:bg-gray-950 p-3 rounded-xl border border-gray-200 dark:border-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded mr-2 inline-block mb-1 md:mb-0">Path Param</span>
                    <code className="text-[11px] font-mono text-gray-700 dark:text-gray-300 break-all">
                      {window.location.origin}/api/webhooks/leads/{currentUser.apiKey || "SUA_CHAVE"}
                    </code>
                  </div>
                  <button 
                    onClick={() => currentUser.apiKey && copyToClipboard(`${window.location.origin}/api/webhooks/leads/${currentUser.apiKey}`)}
                    disabled={!currentUser.apiKey}
                    className="shrink-0 flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-30"
                  >
                    <Copy size={12} /> Copiar URL
                  </button>
                </div>

                {/* Formato 2 */}
                <div className="bg-white dark:bg-gray-950 p-3 rounded-xl border border-gray-200 dark:border-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 rounded mr-2 inline-block mb-1 md:mb-0">Query Param</span>
                    <code className="text-[11px] font-mono text-gray-700 dark:text-gray-300 break-all">
                      {window.location.origin}/api/webhooks/leads?apiKey={currentUser.apiKey || "SUA_CHAVE"}
                    </code>
                  </div>
                  <button 
                    onClick={() => currentUser.apiKey && copyToClipboard(`${window.location.origin}/api/webhooks/leads?apiKey=${currentUser.apiKey}`)}
                    disabled={!currentUser.apiKey}
                    className="shrink-0 flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-30"
                  >
                    <Copy size={12} /> Copiar URL
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Mapeamento Inteligente de Campos
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              O webhook traduz dinamicamente qualquer payload que você enviar. Envie as chaves como quiser (em português ou inglês):
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-950 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-850">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Empresa / Título</span>
                <p className="text-[10px] text-gray-400 mt-1">Busca por: <code className="text-indigo-500 font-semibold font-mono">company</code>, <code className="text-indigo-500 font-semibold font-mono">empresa</code>, <code className="text-indigo-500 font-semibold font-mono">title</code>, <code className="text-indigo-500 font-semibold font-mono">organizacao</code></p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-950 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-850">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Nome do Contato</span>
                <p className="text-[10px] text-gray-400 mt-1">Busca por: <code className="text-indigo-500 font-semibold font-mono">name</code>, <code className="text-indigo-500 font-semibold font-mono">nome</code>, <code className="text-indigo-500 font-semibold font-mono">contact_name</code>, <code className="text-indigo-500 font-semibold font-mono">contato</code></p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-950 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-850">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Celular / Telefone</span>
                <p className="text-[10px] text-gray-400 mt-1">Busca por: <code className="text-indigo-500 font-semibold font-mono">phone</code>, <code className="text-indigo-500 font-semibold font-mono">telefone</code>, <code className="text-indigo-500 font-semibold font-mono">whatsapp</code>, <code className="text-indigo-500 font-semibold font-mono">celular</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Code size={20} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Documentação das Rotas de Leads</h2>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Cabeçalho de Autenticação
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Todas as requisições devem incluir o header <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">X-API-Key</code> com sua chave privada gerada acima.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded uppercase">POST</span>
              <code className="text-xs font-mono text-gray-700 dark:text-gray-300">{window.location.origin}/api/external/leads</code>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">Insere o lead em nosso CRM de forma síncrona. Os web sockets do sistema carregarão o card no Kanban automaticamente para você e todos os seus colegas.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opções do Corpo (JSON)</h4>
                <div className="bg-gray-950 rounded-2xl p-4 overflow-x-auto">
                  <pre className="text-[10px] text-gray-300 font-mono leading-relaxed">
{`{
  "company": "Empresa S.A",  // Obrigatório (Será o título do Card)
  "name": "Nome do Lead",    // Opcional (Nome do Contato)
  "contact_name": "Nome",    // Opcional (Alternativa para "name")
  "email": "lead@email.com", // Opcional
  "phone": "11988887777",    // Opcional
  "notes": "Notas ou Bio",   // Opcional
  "estimated_value": 1500,   // Opcional (Valor Estimado)
  "source": "Make / Zapier", // Opcional (Origem do Lead)
  "status": "prospect"       // Opcional: 'prospect' | 'negotiation' | 'converted' | 'lost'
}`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Exemplo com cURL</h4>
                <div className="bg-gray-950 rounded-2xl p-4 overflow-x-auto">
                  <pre className="text-[10px] text-gray-300 font-mono leading-relaxed">
{`curl -X POST "${window.location.origin}/api/external/leads" \\
-H "X-API-Key: ${currentUser.apiKey || 'SUA_CHAVE_AQUI'}" \\
-H "Content-Type: application/json" \\
-d '{
  "company": "Amplifica Digital",
  "name": "Guilherme Santos",
  "email": "gui@amplifica.com.br",
  "phone": "11999998888",
  "estimated_value": 2500,
  "source": "Site Institucional"
}'`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/20 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
              <p className="text-[10px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                <strong>💡 Dica:</strong> No seu chatbot de WhatsApp preferido ou formulário Contact-Form-7 / Elementor, basta disparar um Webhook para a URL acima, inserindo o Header <code className="font-mono">X-API-Key</code> e mapeando o JSON. Seus leads cairão no CRM em tempo real!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

