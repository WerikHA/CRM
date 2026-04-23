import React, { useState, useMemo } from 'react';
import { Film, Clock, CheckCircle2, Plus, User as UserIcon, Trash2, ArrowUpCircle, Filter, Check, X as XIcon, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import { VideoOrder, Client, WorkStatus, User } from '../types';
import Modal from './Modal';

interface VideoWorkflowViewProps {
  videoOrders: VideoOrder[];
  setVideoOrders: React.Dispatch<React.SetStateAction<VideoOrder[]>>;
  clients: Client[];
  users: User[];
  currentUser: any;
}

export default function VideoWorkflowView({ videoOrders, setVideoOrders, clients, users, currentUser }: VideoWorkflowViewProps) {
  const [editorFilter, setEditorFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<VideoOrder | null>(null);
  const [formData, setFormData] = useState<Partial<VideoOrder>>({
    title: '',
    clientId: '',
    editorId: '',
    editorName: '',
    deadline: '',
    priority: 'medium',
    progress: 0,
    status: 'queue'
  });

  const isEditor = currentUser.role === 'EDITOR';
  const isAdmin = currentUser.role === 'ADMIN';
  const isPartner = currentUser.role === 'PARTNER';

  const editors = users.filter(u => u.role === 'EDITOR');

  const filteredOrders = useMemo(() => {
    let orders = videoOrders;
    
    if (isEditor) {
      orders = orders.filter(o => o.editorId === currentUser.id);
    } else if (isPartner) {
      const partnerClientIds = clients.filter(c => c.partnerId === currentUser.id).map(c => c.id);
      orders = orders.filter(o => partnerClientIds.includes(o.clientId));
    }

    return orders.filter(o => editorFilter === 'all' ? true : o.editorId === editorFilter);
  }, [videoOrders, isEditor, isPartner, currentUser.id, clients, editorFilter]);

  const partnerClients = useMemo(() => {
    if (isAdmin) return clients;
    if (isPartner) return clients.filter(c => c.partnerId === currentUser.id);
    return [];
  }, [clients, isAdmin, isPartner, currentUser.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queue': return 'text-slate-400 bg-slate-50';
      case 'production': return 'text-sky-600 bg-sky-50';
      case 'review': return 'text-amber-600 bg-amber-50';
      case 'done': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-gray-400 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'queue': return 'Na Fila';
      case 'production': return 'Editando';
      case 'review': return 'Aprovação';
      case 'done': return 'Finalizado';
      default: return status;
    }
  };

  const getEditorWithLowestLoad = () => {
    if (editors.length === 0) return { id: '', name: '' };
    const loadMap = editors.map(e => ({
      id: e.id,
      name: e.name,
      taskCount: videoOrders.filter(o => o.editorId === e.id && o.status !== 'done').length
    }));
    const best = loadMap.sort((a, b) => a.taskCount - b.taskCount)[0];
    return { id: best.id, name: best.name };
  };

  const handleAddOrder = () => {
    if (partnerClients.length === 0) return;
    
    const assigned = (isPartner || isAdmin) ? getEditorWithLowestLoad() : { id: editors[0]?.id || '', name: editors[0]?.name || '' };
    
    setEditingOrder(null);
    setFormData({
      title: '',
      clientId: partnerClients[0].id,
      editorId: assigned.id,
      editorName: assigned.name,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      priority: 'medium',
      progress: 0,
      status: 'queue'
    });
    setIsModalOpen(true);
  };

  const handleEditOrder = (order: VideoOrder) => {
    setEditingOrder(order);
    setFormData(order);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrder) {
      setVideoOrders(orders => orders.map(o => o.id === editingOrder.id ? { ...o, ...formData } as VideoOrder : o));
    } else {
      const newOrder: VideoOrder = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
      } as VideoOrder;
      setVideoOrders([...videoOrders, newOrder]);
    }
    setIsModalOpen(false);
  };

  const handleUpdateStatus = (id: string, status: WorkStatus) => {
    setVideoOrders(orders => orders.map(o => o.id === id ? { ...o, status, progress: status === 'done' ? 100 : o.progress } : o));
  };

  const handleIncreaseProgress = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setVideoOrders(orders => orders.map(o => {
      if (o.id === id) {
        const nextProgress = Math.min(o.progress + 10, 100);
        const nextStatus = nextProgress === 100 ? 'done' : o.status === 'queue' ? 'production' : o.status;
        return { ...o, progress: nextProgress, status: nextStatus };
      }
      return o;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Film className="text-indigo-500" />
            Workflow de Vídeo
          </h1>
          <p className="text-sm text-gray-500">Gestão de edições, reels e produções audiovisuais.</p>
        </div>
        {(isPartner || isAdmin) && (
          <button 
            onClick={handleAddOrder}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-all shadow-sm"
          >
            <Plus size={16} />
            Novo Vídeo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {['queue', 'production', 'review', 'done'].map((status) => {
          const count = filteredOrders.filter(o => o.status === status).length;
          return (
            <div key={status} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{getStatusLabel(status)}</span>
              <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-lg font-bold text-xs", getStatusColor(status))}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Tarefas de Edição</h2>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
           <Filter size={14} />
           <select 
             value={editorFilter}
             onChange={(e) => setEditorFilter(e.target.value)}
             className="bg-transparent border-none focus:ring-0 cursor-pointer"
           >
              <option value="all">Todos os Editores</option>
              {editors.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.map((order) => {
          const client = clients.find(c => c.id === order.clientId);
          return (
            <div 
              key={order.id} 
              onClick={() => handleEditOrder(order)}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-indigo-200 transition-all group shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", getStatusColor(order.status))}>
                    <Film size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{order.title}</h3>
                    <p className="text-xs text-gray-400 font-medium italic">Cliente: {client?.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Editor</span>
                  <div className="flex items-center gap-2 mt-1">
                    <UserIcon size={12} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-700">{order.editorName || 'Pendente'}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Prazo</span>
                  <div className="flex items-center gap-2 mt-1 text-gray-500">
                    <Clock size={12} />
                    <span className="text-xs font-bold">{order.deadline}</span>
                  </div>
                </div>
                <div className="w-32 space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</span>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{order.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${order.progress}%` }} />
                  </div>
                </div>
                <select 
                  value={order.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleUpdateStatus(order.id, e.target.value as WorkStatus)}
                  className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border focus:outline-none transition-all", getStatusColor(order.status))}
                >
                  <option value="queue">Pendente</option>
                  <option value="production">Em Edição</option>
                  <option value="review">Aprovação</option>
                  <option value="done">Entregue</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOrder ? 'Editar Vídeo' : 'Nova Solicitação de Vídeo'}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleSubmit} className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl shadow-sm">
              {editingOrder ? 'Salvar' : 'Solicitar'}
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Título do Vídeo/Projeto</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm" placeholder="Ex: Reels Campanha Natal" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cliente</label>
              <select value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm">
                {partnerClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Editor Responsável</label>
              {isPartner ? (
                <div className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-500">Auto-Atribuição</div>
              ) : (
                <select 
                  value={formData.editorId} 
                  onChange={e => {
                    const finded = editors.find(u => u.id === e.target.value);
                    setFormData({...formData, editorId: e.target.value, editorName: finded?.name || ''});
                  }} 
                  className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm"
                >
                  <option value="">Selecione...</option>
                  {editors.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
