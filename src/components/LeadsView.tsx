import React, { useState } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Mail, LayoutGrid, List, ChevronRight, Info, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Lead, LeadStatus, Client } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
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

export default function LeadsView({ leads, setLeads, setClients }: LeadsViewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
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
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === 'kanban' ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-inner" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              )}
            >
              <LayoutGrid size={18} />
            </button>
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

      {viewMode === 'table' ? (
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
                      {Object.entries(statusConfig).map(([val, { label }]) => (
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
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Empresa</label>
              <input 
                type="text" 
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 shadow-sm text-gray-900 dark:text-gray-100"
                placeholder="Ex: Agency S.A"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Contato</label>
              <input 
                type="text" 
                value={formData.contactName}
                onChange={e => setFormData({...formData, contactName: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Valor Estimado</label>
              <input 
                type="number" 
                value={formData.estimatedValue}
                onChange={e => setFormData({...formData, estimatedValue: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">E-mail</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Telefone</label>
              <input 
                type="text" 
                value={formData.phone}
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
                {Object.entries(statusConfig).map(([val, { label }]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Notas / Observações</label>
              <textarea 
                rows={3}
                value={formData.notes}
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
