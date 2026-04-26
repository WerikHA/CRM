import React, { useState, useMemo } from 'react';
import { Film, Clock, CheckCircle2, AlertCircle, Plus, Send, User as UserIcon, Trash2, Filter, Check, X as XIcon, RefreshCcw, Eye, Copy, ChevronLeft, ChevronRight, Video, Play, Pause, Square, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { VideoOrder, Client, WorkStatus, ApprovalStatus, User, Receivable } from '../types';
import Modal from './Modal';
import { api } from '../services/api';
import { ChatWindow } from './ChatWindow';

interface VideoWorkflowViewProps {
  videoOrders: VideoOrder[];
  setVideoOrders: React.Dispatch<React.SetStateAction<VideoOrder[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  receivables: Receivable[];
  setReceivables: React.Dispatch<React.SetStateAction<Receivable[]>>;
  users: User[];
  currentUser: any;
}

export default function VideoWorkflowView({ 
  videoOrders, 
  setVideoOrders, 
  clients, 
  setClients,
  receivables,
  setReceivables,
  users, 
  currentUser 
}: VideoWorkflowViewProps) {
  const [editorFilter, setEditorFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<VideoOrder | null>(null);
  const [chatOrder, setChatOrder] = useState<VideoOrder | null>(null);
  
  const initialFormData: Partial<VideoOrder> = {
    title: '',
    clientId: '',
    editorId: '',
    editorName: '',
    deadline: '',
    priority: 'medium',
    progress: 0,
    status: 'queue'
  };

  const [formData, setFormData] = useState<Partial<VideoOrder>>(initialFormData);

  const isEditor = currentUser.role === 'EDITOR';
  const isAdmin = currentUser.role === 'ADMIN';
  const isOwner = currentUser.role === 'OWNER';
  const isAdminOrOwner = isAdmin || isOwner;
  const isPartner = currentUser.role === 'PARTNER';

  const editors = users.filter(u => u.role === 'EDITOR');

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
    if (isAdminOrOwner) return clients;
    if (isPartner) return clients.filter(c => c.partnerId === currentUser.id);
    return [];
  }, [clients, isAdminOrOwner, isPartner, currentUser.id]);

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
      case 'queue': return 'No Roteiro';
      case 'production': return 'Editando';
      case 'review': return 'Aprovação';
      case 'done': return 'Entregue';
      default: return status;
    }
  };

  const handleAddOrder = () => {
    if (partnerClients.length === 0) {
      alert("Você precisa ter pelo menos um cliente vinculado para solicitar um vídeo.");
      return;
    }

    const assigned = (isPartner || isAdminOrOwner) ? getEditorWithLowestLoad() : { id: editors[0]?.id || '', name: editors[0]?.name || '' };

    setEditingOrder(null);
    setFormData({
      ...initialFormData,
      clientId: partnerClients[0].id,
      editorId: assigned.id,
      editorName: assigned.name,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    });
    setIsModalOpen(true);
  };

  const handleEditOrder = (e: React.MouseEvent, order: VideoOrder) => {
    e.stopPropagation();
    setEditingOrder(order);
    setFormData({
      ...initialFormData,
      ...order
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrder) {
        const updated = await api.updateVideoOrder(editingOrder.id, formData);
        setVideoOrders(orders => orders.map(o => o.id === editingOrder.id ? { ...o, ...updated } : o));
      } else {
        const newOrderData: any = {
          ...formData
        };
        const created = await api.createVideoOrder(newOrderData);
        setVideoOrders([...videoOrders, created]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar pedido: ' + err.message);
    }
  };

  const handleUpdateStatus = async (id: string, status: WorkStatus) => {
    let progress = 0;
    if (status === 'queue') progress = 10;
    else if (status === 'production') progress = 50;
    else if (status === 'review') progress = 90;
    else if (status === 'done') progress = 100;
    
    setVideoOrders(prev => prev.map(o => o.id === id ? { ...o, status, progress } : o));
    
    try {
      await api.updateVideoOrder(id, { status, progress });
    } catch (err: any) {
      console.error('Falha ao atualizar status:', err);
      const latest = await api.getVideoOrders();
      setVideoOrders(latest);
    }
  };

  const handleDeleteOrder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    try {
      await api.deleteVideoOrder(id);
      setVideoOrders(orders => orders.filter(o => o.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir vídeo: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Workflow de Vídeo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300 font-medium">Gestão de edições, roteiros e entregas finais.</p>
        </div>
        {(isPartner || isAdminOrOwner) && (
          <button 
            onClick={handleAddOrder}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-all shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
          >
            <Plus size={16} />
            Novo Pedido de Vídeo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {['queue', 'production', 'review', 'done'].map((status) => {
          const count = filteredOrders.filter(o => o.status === status).length;
          return (
            <div key={status} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between transition-all duration-300">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest leading-none">{getStatusLabel(status)}</span>
              <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-lg font-bold text-xs transition-colors duration-300", 
                  status === 'queue' ? "text-slate-400 bg-slate-50 dark:bg-slate-500/10" :
                  status === 'production' ? "text-sky-600 bg-sky-50 dark:bg-sky-500/10" :
                  status === 'review' ? "text-amber-600 bg-amber-50 dark:bg-amber-500/10" :
                  "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10"
              )}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">Pilha de Edição</h2>
        <div className="flex items-center gap-2">
           <Filter size={14} className="text-gray-400 dark:text-gray-400" />
           <select 
             value={editorFilter || 'all'}
             onChange={(e) => setEditorFilter(e.target.value)}
             className="bg-transparent text-xs font-bold text-gray-500 dark:text-gray-300 border-none focus:ring-0 cursor-pointer transition-colors duration-300 outline-none"
           >
              <option value="all" className="dark:bg-gray-900">Todos os Editores</option>
              {editors.map(e => <option key={e.id} value={e.id} className="dark:bg-gray-900">{e.name}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <Film size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum vídeo encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const client = clients.find(c => c.id === order.clientId);
            return (
              <div 
                key={order.id} 
                onClick={(e) => handleEditOrder(e, order)}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all group shadow-sm hover:shadow-md cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        order.priority === 'high' ? "bg-rose-500" : order.priority === 'medium' ? "bg-amber-500" : "bg-sky-500"
                      )} />
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{order.title}</h3>
                    </div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-400 italic">Cliente: {client?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <select 
                      value={order.status || 'queue'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value as WorkStatus)}
                      className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border focus:outline-none transition-all duration-300", 
                          order.status === 'queue' ? "text-slate-400 bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20" :
                          order.status === 'production' ? "text-sky-600 bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20" :
                          order.status === 'review' ? "text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20" :
                          "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
                      )}
                    >
                      <option value="queue" className="dark:bg-gray-900">Roteiro</option>
                      <option value="production" className="dark:bg-gray-900">Edição</option>
                      <option value="review" className="dark:bg-gray-900">Revisão</option>
                      <option value="done" className="dark:bg-gray-900">Finalizado</option>
                    </select>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setChatOrder(order); }}
                      title="Chat da Tarefa"
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                    >
                      <MessageSquare size={16} />
                    </button>
                    {(isAdminOrOwner || isPartner) && (
                      <button 
                        onClick={(e) => handleDeleteOrder(e, order.id)}
                        className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 py-4 border-y border-gray-50 dark:border-gray-800 mb-4 transition-colors">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                    <Video size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold">{order.editorName || 'Sem Responsável'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-400">
                    <Clock size={14} />
                    <span className="text-xs font-medium">{order.deadline}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Status da Edição</span>
                      <span className="text-sm font-bold text-indigo-500 dark:text-indigo-400">{order.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(79,70,229,0.3)]",
                          order.status === 'done' ? "bg-emerald-500" : "bg-indigo-500"
                        )} 
                        style={{ width: `${order.progress}%` }} 
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {order.status === 'production' && (
                      <button className="flex-1 py-1.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-sky-100 transition-colors">
                        <Play size={12} fill="currentColor" /> Assistir Prévia
                      </button>
                    )}
                    {order.status === 'review' && (
                      <button className="flex-1 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors">
                        <Eye size={12} /> Abrir Pauta
                      </button>
                    )}
                    {order.status === 'done' && (
                      <button className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors">
                        <Check size={12} /> Link Finalizado
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={!!chatOrder}
        onClose={() => setChatOrder(null)}
        title={`Chat: ${chatOrder?.title}`}
      >
        <div className="h-[500px]">
           {chatOrder && (
             <ChatWindow 
               chatType="task"
               referenceId={chatOrder.id}
               senderId={currentUser.id}
               senderName={currentUser.name}
               ownerId={currentUser.ownerId || currentUser.id}
             />
           )}
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOrder ? 'Editar Vídeo' : 'Nova Solicitação de Edição'}
        footer={
          <div className="flex justify-end gap-3 px-6 pb-6">
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
              {editingOrder ? 'Salvar Alterações' : 'Criar Solicitação'}
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Título do Vídeo/Job</label>
            <input 
              type="text" 
              value={formData.title || ''}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100"
              placeholder="Ex: Reel Promoção Verão"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Cliente</label>
              <select 
                value={formData.clientId || ''}
                onChange={e => setFormData({...formData, clientId: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100 outline-none"
              >
                <option value="">Selecione...</option>
                {partnerClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Editor</label>
              <select 
                value={formData.editorId || ''}
                onChange={e => {
                  const editor = editors.find(u => u.id === e.target.value);
                  setFormData({...formData, editorId: e.target.value, editorName: editor?.name || ''});
                }}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100 outline-none"
              >
                <option value="">Selecione...</option>
                {editors.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Prioridade</label>
              <select 
                value={formData.priority || 'medium'}
                onChange={e => setFormData({...formData, priority: e.target.value as any})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100 outline-none"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Prazo Final</label>
              <input 
                type="text" 
                value={formData.deadline || ''}
                onChange={e => setFormData({...formData, deadline: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100"
                placeholder="dd/mm/aaaa"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

