import React, { useState, useMemo } from 'react';
import { Film, Clock, CheckCircle2, Plus, User as UserIcon, Trash2, Filter, MessageSquare, Link as LinkIcon, Calendar, Edit3, Check, X as XIcon, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { DemandTask, Client, User } from '../types';
import Modal from './Modal';
import { api } from '../services/api';
import { ChatWindow } from './ChatWindow';
import { notifySuccess, notifyError } from '../lib/utils';

interface RecordingWorkflowViewProps {
  tasks: DemandTask[];
  setTasks: React.Dispatch<React.SetStateAction<DemandTask[]>>;
  clients: Client[];
  users: User[];
  currentUser: any;
}

export default function RecordingWorkflowView({ 
  tasks, 
  setTasks, 
  clients, 
  users, 
  currentUser 
}: RecordingWorkflowViewProps) {
  const [editorFilter, setEditorFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'todo' | 'done'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DemandTask | null>(null);
  const [chatTask, setChatTask] = useState<DemandTask | null>(null);
  
  const initialFormData: Partial<DemandTask> = {
    title: '',
    clientId: '',
    editorId: '',
    type: 'recording',
    quantity: 1,
    periodStart: new Date().toISOString(),
    periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'todo',
    observations: '',
    materialsLink: '',
    postDate: '',
    postTime: '',
    attachments: []
  };

  const [formData, setFormData] = useState<Partial<DemandTask>>(initialFormData);

  const isAdminOrOwner = currentUser.role === 'ADMIN' || currentUser.role === 'OWNER';
  const isPartner = currentUser.role === 'PARTNER';

  const editors = users.filter(u => u.role === 'EDITOR' || u.role === 'DESIGNER');

  const recordingTasks = useMemo(() => {
    let filtered = tasks.filter(t => t.type === 'recording');
    
    if (currentUser.role === 'EDITOR') {
      filtered = filtered.filter(t => t.editorId === currentUser.id);
    } else if (isPartner) {
      const partnerClientIds = clients.filter(c => c.partnerId === currentUser.id).map(c => c.id);
      filtered = filtered.filter(t => partnerClientIds.includes(t.clientId));
    }

    if (activeTab !== 'all') {
      filtered = filtered.filter(t => t.status === activeTab);
    }

    if (editorFilter !== 'all') {
      filtered = filtered.filter(t => t.editorId === editorFilter);
    }

    // Sort by periodEnd (deadline)
    return filtered.sort((a, b) => new Date(a.periodEnd).getTime() - new Date(b.periodEnd).getTime());
  }, [tasks, activeTab, editorFilter, currentUser, clients, isPartner]);

  const partnerClients = useMemo(() => {
    if (isAdminOrOwner) return clients;
    if (isPartner) return clients.filter(c => c.partnerId === currentUser.id);
    return [];
  }, [clients, isAdminOrOwner, isPartner, currentUser.id]);

  const getStatusLabel = (status: string) => {
    return status === 'todo' ? 'Pendente' : 'Finalizado';
  };

  const handleAddOrder = () => {
    if (partnerClients.length === 0) {
      notifyError("Erro", "Você precisa ter pelo menos um cliente vinculado.");
      return;
    }
    setEditingTask(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleEditTask = (e: React.MouseEvent, task: DemandTask) => {
    e.stopPropagation();
    setEditingTask(task);
    setFormData({ ...task });
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir esta gravação?')) return;
    try {
      await api.deleteDemandTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      notifySuccess("Gravação excluída.");
    } catch (err: any) {
      notifyError("Erro ao excluir", err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        const { clientName, ...payload } = formData as any;
        const updated = await api.updateDemandTask(editingTask.id, payload);
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updated } : t));
        notifySuccess("Gravação atualizada.");
      } else {
        const created = await api.createDemandTask(formData);
        setTasks(prev => [...prev, created]);
        notifySuccess("Gravação criada.");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      notifyError("Erro ao salvar", err.message);
    }
  };

  const handleToggleStatus = async (task: DemandTask) => {
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    try {
      const updated = await api.updateDemandTask(task.id, { ...task, status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updated } : t));
      notifySuccess(`Status atualizado para: ${getStatusLabel(newStatus)}`);
      
      // Auto-sync to video workflow if recording is done
      if (newStatus === 'done') {
        const allVideoOrders = await api.getVideoOrders();
        const existingOrder = allVideoOrders.find(o => o.demandId === task.id);
        const client = clients.find(c => c.id === task.clientId);

        const videoOrderData = {
          title: task.title || `Edição: ${client?.name || 'Sem Nome'}`,
          clientId: task.clientId,
          editorId: task.editorId || client?.assignedVideoEditorId || '',
          deadline: task.postDate || task.periodEnd,
          priority: 'medium',
          progress: 0,
          status: 'queue',
          demandId: task.id,
          observations: task.observations,
          postDate: task.postDate,
          materialsLink: task.materialsLink
        } as any;

        if (existingOrder) {
          await api.updateVideoOrder(existingOrder.id, videoOrderData);
        } else {
          await api.createVideoOrder(videoOrderData);
        }
      }
    } catch (err: any) {
      notifyError("Erro ao atualizar status", err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Workflow de Gravação</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300 font-medium">Gestão de pautas e demandas de gravação.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'all' ? "bg-white dark:bg-gray-700 text-indigo-500 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            Todas
          </button>
          <button 
            onClick={() => setActiveTab('todo')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'todo' ? "bg-white dark:bg-gray-700 text-indigo-500 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setActiveTab('done')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'done' ? "bg-white dark:bg-gray-700 text-indigo-500 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            Concluídas
          </button>
        </div>
        {(isAdminOrOwner || isPartner) && (
          <button 
            onClick={handleAddOrder}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-all shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
          >
            <Plus size={16} />
            Nova Demanda
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {['todo', 'done'].map((status) => {
          const count = tasks.filter(t => t.type === 'recording' && t.status === status).length;
          return (
            <div key={status} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest leading-none">{getStatusLabel(status)}</span>
              <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-lg font-bold text-xs", 
                  status === 'todo' ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" : "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10"
              )}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">Pilha de Gravação</h2>
        <div className="flex items-center gap-2">
           <Filter size={14} className="text-gray-400 dark:text-gray-400" />
           <select 
             value={editorFilter}
             onChange={(e) => setEditorFilter(e.target.value)}
             className="bg-transparent text-xs font-bold text-gray-500 dark:text-gray-300 border-none focus:ring-0 cursor-pointer outline-none"
           >
              <option value="all" className="dark:bg-gray-900">Todos os Editores</option>
              {editors.map(e => <option key={e.id} value={e.id} className="dark:bg-gray-900">{e.name}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {recordingTasks.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <Film size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma demanda de gravação encontrada.</p>
          </div>
        ) : (
          recordingTasks.map((task) => {
            const client = clients.find(c => c.id === task.clientId);
            return (
              <div 
                key={task.id} 
                onClick={(e) => handleEditTask(e, task)}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all group shadow-sm hover:shadow-md cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                      {task.title || `Gravação: ${client?.name || 'S/N'}`}
                    </h3>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-400 italic">Cliente: {client?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setChatTask(task); }}
                      title="Chat da Tarefa"
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                    >
                      <MessageSquare size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(task); }}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        task.status === 'done' 
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" 
                          : "bg-gray-50 dark:bg-gray-800 text-gray-300 hover:text-emerald-500"
                      )}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    {(isAdminOrOwner || isPartner) && (
                      <button 
                        onClick={(e) => handleDeleteTask(e, task.id)}
                        className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 py-4 border-y border-gray-50 dark:border-gray-800 mb-4">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                    <UserIcon size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold">{users.find(u => u.id === task.editorId)?.name || 'Sem Responsável'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-400">
                    <Clock size={14} />
                    <span className="text-xs font-medium">{new Date(task.periodEnd).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {task.postDate && (
                    <div className="flex items-center gap-2 text-indigo-500 font-bold">
                      <Calendar size={14} />
                      <span className="text-xs uppercase">Postagem: {task.postDate} {task.postTime}</span>
                    </div>
                  )}
                </div>

                {task.observations && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Roteiro / Briefing</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">{task.observations}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {task.materialsLink && (
                    <a 
                      href={task.materialsLink} 
                      target="_blank" 
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-1.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-sky-100 transition-colors"
                    >
                      <LinkIcon size={12} /> Materiais
                    </a>
                  )}
                  <div className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2",
                    task.status === 'done' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                  )}>
                    {task.status === 'done' ? <Check size={14} /> : <RefreshCcw size={14} className="animate-spin-slow" />}
                    {getStatusLabel(task.status)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Editar Gravação' : 'Nova Demanda de Gravação'}
        footer={
          <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">Cancelar</button>
            <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-500 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all font-semibold">
              {editingTask ? "Salvar Alterações" : "Criar Demanda"}
            </button>
          </div>
        }
      >
        <form className="space-y-4 p-1" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Título da Demanda</label>
            <input 
              type="text"
              value={formData.title || ''}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm dark:text-white"
              placeholder="Ex: Gravação Depoimentos"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</label>
              <select 
                value={formData.clientId || ''}
                onChange={e => setFormData({...formData, clientId: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none dark:text-white"
                required
              >
                <option value="">Selecione...</option>
                {partnerClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsável</label>
              <select 
                value={formData.editorId || ''}
                onChange={e => setFormData({...formData, editorId: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none dark:text-white"
              >
                <option value="">Selecione...</option>
                {editors.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Limite</label>
              <input 
                type="date"
                value={formData.periodEnd ? new Date(formData.periodEnd).toISOString().split('T')[0] : ''}
                onChange={e => setFormData({...formData, periodEnd: new Date(e.target.value).toISOString()})}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm dark:text-white"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade</label>
              <input 
                type="number"
                min="1"
                value={formData.quantity || 1}
                onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Observações / Roteiro</label>
            <textarea 
              value={formData.observations || ''}
              onChange={e => setFormData({...formData, observations: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm min-h-[80px] dark:text-white"
              placeholder="Descreva os detalhes da gravação..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data de Postagem</label>
              <input 
                type="date"
                value={formData.postDate || ''}
                onChange={e => setFormData({...formData, postDate: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Horário de Postagem</label>
              <input 
                type="time"
                value={formData.postTime || ''}
                onChange={e => setFormData({...formData, postTime: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Link de Materiais</label>
            <input 
              type="url"
              value={formData.materialsLink || ''}
              onChange={e => setFormData({...formData, materialsLink: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm dark:text-white"
              placeholder="https://..."
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!chatTask}
        onClose={() => setChatTask(null)}
        title={`Chat: ${chatTask?.title || 'Gravação'}`}
      >
        <div className="h-[500px]">
           {chatTask && (
             <ChatWindow 
               chatType="task"
               referenceId={chatTask.id}
               senderId={currentUser.id}
               senderName={currentUser.name}
               ownerId={currentUser.ownerId || currentUser.id}
             />
           )}
        </div>
      </Modal>
    </div>
  );
}
