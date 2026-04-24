import React, { useState, useMemo, useRef } from 'react';
import { ClipboardList, CheckCircle2, Clock, Calendar, ArrowRight, User as UserIcon, Palette, Video, Filter, Edit3, X, Upload, MessageSquare, AlertCircle, Film, Link as LinkIcon, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { DemandTask, Client, User } from '../types';
import { api } from '../services/api';
import Modal from './Modal';

interface DemandsViewProps {
  tasks: DemandTask[];
  setTasks: React.Dispatch<React.SetStateAction<DemandTask[]>>;
  clients: Client[];
  users: User[];
}

export default function DemandsView({ tasks, setTasks, clients, users }: DemandsViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'art' | 'video' | 'recording'>('all');
  const [editingTask, setEditingTask] = useState<DemandTask | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<DemandTask>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editors = users.filter(u => u.role === 'EDITOR' || u.role === 'DESIGNER');

  const formattedTasks = useMemo(() => {
    return tasks.map(task => {
      let attachments = [];
      if (task.attachments) {
        if (typeof task.attachments === 'string') {
          try {
            attachments = JSON.parse(task.attachments);
          } catch (e) {
            attachments = [];
          }
        } else if (Array.isArray(task.attachments)) {
          attachments = task.attachments;
        }
      }
      return {
        ...task,
        attachments,
        client: clients.find(c => c.id === task.clientId)
      };
    }).filter(t => filterType === 'all' ? true : t.type === filterType);
  }, [tasks, clients, filterType]);

  // Group tasks by period and SORT: Oldest left (ascending by periodStart)
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: { label: string, tasks: any[], date: number } } = {};
    
    formattedTasks.forEach(task => {
      if (task.status === 'done') {
        const key = 'done';
        if (!groups[key]) groups[key] = { label: 'Demandas Concluídas', tasks: [], date: Infinity };
        groups[key].tasks.push(task);
      } else {
        const start = new Date(task.periodStart);
        const end = new Date(task.periodEnd);
        const label = `Demandas a fazer - ${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
        const key = task.periodStart;
        
        if (!groups[key]) groups[key] = { label, tasks: [], date: start.getTime() };
        groups[key].tasks.push(task);
      }
    });

    return Object.entries(groups).sort((a, b) => {
        if (a[0] === 'done') return 1;
        if (b[0] === 'done') return -1;
        // Ascending order: older dates first (left)
        return a[1].date - b[1].date;
    });
  }, [formattedTasks]);

  const handleToggleStatus = async (task: DemandTask) => {
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    try {
      const updated = await api.updateDemandTask(task.id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updated } : t));
    } catch (err) {
      alert('Erro ao atualizar demanda');
    }
  };

  const handleCreateDemand = () => {
    setIsCreating(true);
    setEditingTask(null);
    setFormData({
      type: 'art',
      quantity: 1,
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'todo',
      attachments: [],
      createdAt: new Date().toISOString()
    });
    setIsEditModalOpen(true);
  };

  const openEditModal = (task: DemandTask) => {
    setIsCreating(false);
    setEditingTask(task);
    setFormData({ ...task });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (isCreating) {
        if (!formData.clientId) {
          alert('Selecione um cliente');
          return;
        }
        const newTaskData = {
          ...formData,
          id: 'dem-' + Math.random().toString(36).substr(2, 9),
        } as DemandTask;
        const created = await api.createDemandTask(newTaskData);
        setTasks(prev => [...prev, created]);
      } else if (editingTask) {
        const updated = await api.updateDemandTask(editingTask.id, formData);
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updated } : t));
      }
      setIsEditModalOpen(false);
    } catch (err) {
      alert('Erro ao salvar demanda');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Simulate upload - in a real app you'd upload to S3/Firebase and get URLs
    const newAttachments = [...(formData.attachments || [])];
    Array.from(files).forEach((file: File) => {
      if (file.size > 100 * 1024 * 1024) {
        alert(`Arquivo ${file.name} excede 100MB.`);
        return;
      }
      // Using object URL as temporary mock string
      newAttachments.push(URL.createObjectURL(file));
    });
    setFormData({ ...formData, attachments: newAttachments });
  };

  const attachmentsArray = useMemo(() => {
    if (!formData.attachments) return [];
    if (typeof formData.attachments === 'string') {
      try {
        return JSON.parse(formData.attachments);
      } catch (e) {
        return [];
      }
    }
    if (Array.isArray(formData.attachments)) return formData.attachments;
    return [];
  }, [formData.attachments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Painel de Demandas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">Acompanhamento de entregas recorrentes automáticas.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCreateDemand}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={16} />
            Nova Demanda
          </button>
          
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-800">
            <Filter size={14} className="text-gray-400" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-gray-500 dark:text-gray-300 border-none focus:ring-0 cursor-pointer outline-none"
            >
                <option value="all" className="dark:bg-gray-900">Todos os Tipos</option>
                <option value="art" className="dark:bg-gray-900">Artes</option>
                <option value="video" className="dark:bg-gray-900">Vídeos</option>
                <option value="recording" className="dark:bg-gray-900">Gravações</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar min-h-[600px] items-start">
        {groupedTasks.map(([key, group]) => (
          <div key={key} className="flex-shrink-0 w-80 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{group.label}</h3>
              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-bold">{group.tasks.length}</span>
            </div>

            <div className="space-y-3">
              {group.tasks.map((task) => (
                <div 
                  key={task.id}
                  className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-2">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        task.type === 'art' ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10" : 
                        task.type === 'video' ? "bg-sky-50 text-sky-600 dark:bg-sky-500/10" : 
                        "bg-rose-50 text-rose-600 dark:bg-rose-500/10"
                      )}>
                        {task.type === 'art' ? <Palette size={20} /> : task.type === 'video' ? <Video size={20} /> : <Film size={20} />}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(task)}
                        className="p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(task)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          task.status === 'done' 
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" 
                            : "bg-gray-50 dark:bg-gray-800 text-gray-300 hover:text-emerald-500"
                        )}
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">{task.title || task.client?.name || 'Cliente Desconhecido'}</h4>
                    {task.title && task.client?.name && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">{task.client.name}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Quantidade: <span className="font-bold text-indigo-500">{task.quantity} {task.type === 'art' ? 'Artes' : task.type === 'video' ? 'Vídeos' : 'Gravações'}</span></p>
                    {task.observations && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic line-clamp-2 mt-1">{task.observations}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 space-y-2">
                    {task.materialsLink && (
                      <div className="flex items-center gap-1.5 text-sky-500 mb-1">
                        <LinkIcon size={10} />
                        <a href={task.materialsLink} target="_blank" rel="noreferrer" className="text-[10px] font-bold hover:underline truncate">Link de Materiais</a>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Calendar size={12} />
                        <span>Até {new Date(task.periodEnd).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {task.postDate && (
                        <div className="flex items-center gap-1.5 text-indigo-500 font-bold">
                          <Clock size={12} />
                          <span>Postagem: {task.postDate} {task.postTime}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-1">
                         <UserIcon size={10} className="text-gray-400" />
                         <span className="text-[10px] font-bold text-gray-500 uppercase">{users.find(u => u.id === task.editorId)?.name || 'N/A'}</span>
                       </div>
                       {task.attachments && task.attachments.length > 0 && (
                         <div className="bg-sky-50 dark:bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                           {task.attachments.length} Anexos
                         </div>
                       )}
                    </div>
                  </div>

                  {task.status === 'done' && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  )}
                  {task.status === 'todo' && (
                     <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={isCreating ? "Criar Nova Demanda Manual" : "Editar Detalhes da Demanda"}
        footer={
          <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
             <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">Cancelar</button>
             <button onClick={handleSaveEdit} className="px-6 py-2 bg-indigo-500 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all">
               {isCreating ? "Criar Demanda" : "Salvar Alterações"}
             </button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          {isCreating && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</label>
                <select 
                  value={formData.clientId || ''}
                  onChange={e => setFormData({...formData, clientId: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none"
                >
                  <option value="">Selecione o cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Demanda</label>
                <select 
                  value={formData.type || 'art'}
                  onChange={e => setFormData({...formData, type: e.target.value as any})}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none"
                >
                  <option value="art">Arte</option>
                  <option value="video">Vídeo</option>
                  <option value="recording">Gravação</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade</label>
                <input 
                  type="number"
                  min="1"
                  value={formData.quantity || 1}
                  onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Limite (Período)</label>
                <input 
                  type="date"
                  value={formData.periodEnd ? new Date(formData.periodEnd).toISOString().split('T')[0] : ''}
                  onChange={e => setFormData({...formData, periodEnd: new Date(e.target.value).toISOString()})}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Título da Demanda</label>
            <input 
              type="text"
              value={formData.title || ''}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              placeholder="Ex: Criativo Promoção Maio"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Observações / Roteiro</label>
            <textarea 
              value={formData.observations || ''}
              onChange={e => setFormData({...formData, observations: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm min-h-[80px]"
              placeholder="Descreva os detalhes da demanda, roteiro ou referências..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Link de Materiais (Drive, Wetransfer, etc)</label>
            <input 
              type="url"
              value={formData.materialsLink || ''}
              onChange={e => setFormData({...formData, materialsLink: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              placeholder="https://link-dos-materiais.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data de Postagem</label>
              <input 
                type="date"
                value={formData.postDate || ''}
                onChange={e => setFormData({...formData, postDate: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Horário de Postagem</label>
              <input 
                type="time"
                value={formData.postTime || ''}
                onChange={e => setFormData({...formData, postTime: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Editor / Designer Responsável</label>
            <select 
              value={formData.editorId || ''}
              onChange={e => setFormData({...formData, editorId: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none"
            >
              <option value="">Selecione um profissional...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Anexos e Referências (Até 100MB)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all"
            >
               <Upload size={24} className="text-gray-300" />
               <p className="text-xs text-gray-400 font-medium">Clique para anexar imagens ou arquivos</p>
               <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            </div>
            
            {attachmentsArray.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachmentsArray.map((url: string, i: number) => (
                  <div key={i} className="relative group w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800">
                    <img src={url} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setFormData({...formData, attachments: attachmentsArray.filter((_, idx) => idx !== i)})}
                      className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
