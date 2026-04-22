import React, { useState } from 'react';
import { Palette, Clock, CheckCircle2, AlertCircle, Plus, Send, User, Trash2, ArrowUpCircle, Filter, MessageSquare, Check, X as XIcon, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { ArtOrder, Client, WorkStatus, IntegrationConfig, ApprovalStatus } from '../types';
import Modal from './Modal';

interface DesignViewProps {
  artOrders: ArtOrder[];
  setArtOrders: React.Dispatch<React.SetStateAction<ArtOrder[]>>;
  clients: Client[];
  holidays: { date: string; name: string }[];
  integrations: IntegrationConfig[];
}

export default function DesignView({ artOrders, setArtOrders, clients, holidays, integrations }: DesignViewProps) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ArtOrder | null>(null);
  const [formData, setFormData] = useState<Partial<ArtOrder>>({
    title: '',
    clientId: '',
    designer: '',
    deadline: '',
    priority: 'medium',
    progress: 0,
    status: 'queue'
  });

  const whatsappIntegration = integrations.find(i => i.type === 'whatsapp' && i.isActive);

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
      case 'production': return 'Em Produção';
      case 'review': return 'Aprovação';
      case 'done': return 'Finalizado';
      default: return status;
    }
  };

  const getApprovalLabel = (status?: ApprovalStatus) => {
    switch (status) {
      case 'approved': return 'Aprovado pelo Cliente';
      case 'rejected': return 'Reprovado (Ajustes)';
      case 'pending': return 'Aguardando Cliente';
      default: return 'Não Enviado';
    }
  };

  const handleAddOrder = () => {
    if (clients.length === 0) return;
    setEditingOrder(null);
    setFormData({
      title: '',
      clientId: clients[0].id,
      designer: 'Designer Principal',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      priority: 'medium',
      progress: 0,
      status: 'queue'
    });
    setIsModalOpen(true);
  };

  const handleEditOrder = (order: ArtOrder) => {
    setEditingOrder(order);
    setFormData(order);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrder) {
      setArtOrders(orders => orders.map(o => o.id === editingOrder.id ? { ...o, ...formData } as ArtOrder : o));
    } else {
      const newOrder: ArtOrder = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
      } as ArtOrder;
      setArtOrders([...artOrders, newOrder]);
    }
    setIsModalOpen(false);
  };

  const handleUpdateStatus = (id: string, status: WorkStatus) => {
    setArtOrders(orders => orders.map(o => o.id === id ? { ...o, status, progress: status === 'done' ? 100 : o.progress } : o));
  };

  const handleIncreaseProgress = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setArtOrders(orders => orders.map(o => {
      if (o.id === id) {
        const nextProgress = Math.min(o.progress + 10, 100);
        const nextStatus = nextProgress === 100 ? 'done' : o.status === 'queue' ? 'production' : o.status;
        return { ...o, progress: nextProgress, status: nextStatus };
      }
      return o;
    }));
  };

  const handleDeleteOrder = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setArtOrders(orders => orders.filter(o => o.id !== id));
  };

  const handleSendToWhatsapp = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!whatsappIntegration) {
      alert("Integração com WhatsApp não configurada ou inativa no painel Admin.");
      return;
    }

    setSendingId(id);
    
    // Simulação de chamada de API
    setTimeout(() => {
      setArtOrders(orders => orders.map(o => {
        if (o.id === id) {
          const now = new Date();
          const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          return { 
            ...o, 
            status: 'review', 
            approvalStatus: 'pending',
            whatsappSentAt: timestamp
          };
        }
        return o;
      }));
      setSendingId(null);
    }, 1500);
  };

  const handleSimulateResponse = (e: React.MouseEvent, id: string, status: ApprovalStatus) => {
    e.stopPropagation();
    setArtOrders(orders => orders.map(o => o.id === id ? { 
      ...o, 
      approvalStatus: status,
      status: status === 'approved' ? 'done' : 'production',
      progress: status === 'approved' ? 100 : 80
    } : o));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight transition-all duration-300">Workflow de Design</h1>
          <p className="text-sm text-gray-500 font-medium">Acompanhe a produção de artes e aprovações via WhatsApp.</p>
        </div>
        <button 
          onClick={handleAddOrder}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-all shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
        >
          <Plus size={16} />
          Novo Pedido
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {['queue', 'production', 'review', 'done'].map((status) => {
          const count = artOrders.filter(o => o.status === status).length;
          return (
            <div key={status} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between transition-all duration-300">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{getStatusLabel(status)}</span>
              <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-lg font-bold text-xs transition-colors duration-300", getStatusColor(status))}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Task List Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 transition-colors duration-300">Lista de Tarefas</h2>
        <div className="flex items-center gap-2">
           <Filter size={14} className="text-gray-400" />
           <select className="bg-transparent text-xs font-bold text-gray-500 border-none focus:ring-0 cursor-pointer transition-colors duration-300">
              <option>Todos os Designers</option>
              <option>Ana Silva</option>
              <option>Marcos Designer</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 grid grid-cols-1 gap-6">
          {artOrders.map((order) => {
            const client = clients.find(c => c.id === order.clientId);
          return (
            <div 
              key={order.id} 
              onClick={() => handleEditOrder(order)}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-indigo-200 transition-all group shadow-sm hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      order.priority === 'high' ? "bg-rose-500" : order.priority === 'medium' ? "bg-amber-500" : "bg-sky-500"
                    )} />
                    <h3 className="font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{order.title}</h3>
                  </div>
                  <p className="text-xs font-medium text-gray-400 italic">Cliente: {client?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={order.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleUpdateStatus(order.id, e.target.value as WorkStatus)}
                    className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border focus:outline-none transition-all duration-300", getStatusColor(order.status))}
                  >
                    <option value="queue">Na Fila</option>
                    <option value="production">Em Produção</option>
                    <option value="review">Aprovação</option>
                    <option value="done">Finalizado</option>
                  </select>
                  <button 
                    onClick={(e) => handleDeleteOrder(e, order.id)}
                    className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 py-4 border-y border-gray-50 mb-4 transition-colors">
                <div className="flex items-center gap-2 text-gray-500">
                  <User size={14} />
                  <span className="text-xs font-semibold">{order.designer}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock size={14} />
                  <span className="text-xs font-medium">{order.deadline}</span>
                </div>
                {order.approvalStatus && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    order.approvalStatus === 'approved' ? "bg-emerald-100 text-emerald-700" :
                    order.approvalStatus === 'rejected' ? "bg-rose-100 text-rose-700" :
                    "bg-amber-100 text-amber-700"
                  )}>
                    {order.approvalStatus === 'approved' ? <CheckCircle2 size={10} /> : 
                     order.approvalStatus === 'rejected' ? <AlertCircle size={10} /> :
                     <RefreshCcw size={10} className="animate-spin-slow text-amber-500" />}
                    {getApprovalLabel(order.approvalStatus)}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progresso da Tarefa</span>
                    <button 
                      onClick={(e) => handleIncreaseProgress(e, order.id)}
                      className="p-1 text-indigo-500 hover:bg-indigo-50 rounded transition-colors"
                    >
                      <ArrowUpCircle size={14} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-indigo-500">{order.progress}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(79,70,229,0.3)]" 
                    style={{ width: `${order.progress}%` }} 
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div>
                  {order.whatsappSentAt && (
                    <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                      <MessageSquare size={12} />
                      Enviado WhatsApp: {order.whatsappSentAt}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {order.status === 'review' && order.approvalStatus === 'pending' && (
                    <div className="flex gap-1 mr-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
                      <button 
                        onClick={(e) => handleSimulateResponse(e, order.id, 'approved')}
                        title="Simular Aprovação"
                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleSimulateResponse(e, order.id, 'rejected')}
                        title="Simular Reprovação"
                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md transition-colors"
                      >
                        <XIcon size={14} />
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={(e) => handleSendToWhatsapp(e, order.id)}
                    disabled={sendingId === order.id || order.status === 'done' || order.approvalStatus === 'approved'}
                    className={cn(
                      "flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex-1 sm:flex-initial",
                      (order.status === 'done' || order.approvalStatus === 'approved')
                      ? "bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100"
                      : sendingId === order.id 
                        ? "bg-indigo-50 text-indigo-400 animate-pulse border border-indigo-100"
                        : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                    )}
                  >
                    <MessageSquare size={14} />
                    {sendingId === order.id ? 'Iniciando WhatsApp...' : 'Enviar p/ Aprovação (WPP)'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
        
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingOrder ? 'Editar Pedido' : 'Novo Pedido de Arte'}
          footer={
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit}
                className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
              >
                {editingOrder ? 'Salvar Alterações' : 'Criar Pedido'}
              </button>
            </div>
          }
        >
          <form className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Título do Job</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 shadow-sm"
                  placeholder="Ex: Post Carrossel Instagram"
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cliente</label>
                  <select 
                    value={formData.clientId}
                    onChange={e => setFormData({...formData, clientId: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                  >
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Responsável</label>
                  <input 
                    type="text" 
                    value={formData.designer}
                    onChange={e => setFormData({...formData, designer: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 shadow-sm"
                    placeholder="Nome do designer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prazo</label>
                  <input 
                    type="text" 
                    value={formData.deadline}
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 shadow-sm"
                    placeholder="dd/mm/aaaa"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prioridade</label>
                  <select 
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm shadow-sm"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
             </div>
          </form>
        </Modal>

        {/* Sidebar Widgets */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm transition-all duration-300">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 transition-colors">
               <Clock size={18} className="text-indigo-500" />
               Feriados do Mês
            </h3>
            <div className="space-y-3">
               {holidays.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 transition-colors">
                     <div className="flex flex-col items-center justify-center w-10 h-10 bg-indigo-50 rounded-lg border border-indigo-100 shadow-sm transition-colors">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase">Abr</span>
                        <span className="text-sm font-bold text-gray-900 leading-none">{h.date.split('/')[0]}</span>
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-900 transition-colors">{h.name}</p>
                        <p className="text-[10px] text-gray-400">Ponto facultativo</p>
                     </div>
                  </div>
               ))}
               {holidays.length === 0 && <p className="text-xs text-gray-400 italic">Sem feriados previstos.</p>}
            </div>
            <button className="w-full mt-6 py-2 rounded-xl text-xs font-bold text-indigo-500 border border-indigo-100 hover:bg-indigo-50 transition-all">
               Ver calendário completo
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm transition-all duration-300">
             <h3 className="font-bold text-gray-900 mb-2 transition-colors">Dica do Pro</h3>
             <p className="text-xs text-gray-500 leading-relaxed transition-colors">
                Designer, lembre-se de verificar as referências do cliente antes de iniciar a produção. Isso reduz o retrabalho em até 40%.
             </p>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 relative overflow-hidden transition-all duration-500 shadow-sm">
        <div className="absolute right-0 top-0 p-8 opacity-[0.03] pointer-events-none">
          <Palette size={200} className="text-indigo-600" />
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-2">Média de Entrega</h4>
            <p className="text-3xl font-bold tracking-tight text-gray-900">4.2 Dias</p>
            <p className="text-gray-500 text-xs mt-1 font-medium italic">85% das artes entregues no prazo</p>
          </div>
          <div>
            <h4 className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-2">Capacidade Atual</h4>
            <p className="text-3xl font-bold tracking-tight text-gray-900">{Math.round((artOrders.filter(o => o.status !== 'done').length / (artOrders.length || 1)) * 100)}%</p>
            <p className="text-gray-500 text-xs mt-1 font-medium italic">Fluxo de trabalho baseado em pedidos ativos</p>
          </div>
          <div>
            <h4 className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-2">Pendência de Aprovação</h4>
            <p className="text-3xl font-bold tracking-tight text-gray-900">{artOrders.filter(o => o.status === 'review').length} Artes</p>
            <p className="text-gray-500 text-xs mt-1 font-medium italic">Aguardando feedback do cliente (WPP)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
