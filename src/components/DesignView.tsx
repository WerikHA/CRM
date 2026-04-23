import React, { useState, useMemo } from 'react';
import { Palette, Clock, CheckCircle2, AlertCircle, Plus, Send, User as UserIcon, Trash2, ArrowUpCircle, Filter, MessageSquare, Check, X as XIcon, RefreshCcw, Eye, Download, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { ArtOrder, Client, WorkStatus, IntegrationConfig, ApprovalStatus, User, Receivable, PartnerRequest } from '../types';
import Modal from './Modal';
import { api } from '../services/api';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getBrazilianHolidays, Holiday } from '../constants/holidays';

interface DesignViewProps {
  artOrders: ArtOrder[];
  setArtOrders: React.Dispatch<React.SetStateAction<ArtOrder[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  receivables: Receivable[];
  setReceivables: React.Dispatch<React.SetStateAction<Receivable[]>>;
  partnerRequests: PartnerRequest[];
  setPartnerRequests: React.Dispatch<React.SetStateAction<PartnerRequest[]>>;
  holidays: { date: string; name: string }[];
  integrations: IntegrationConfig[];
  users: User[];
  currentUser: any; // User type
}

export default function DesignView({ 
  artOrders, 
  setArtOrders, 
  clients, 
  setClients,
  receivables,
  setReceivables,
  partnerRequests,
  setPartnerRequests,
  holidays, 
  integrations, 
  users, 
  currentUser 
}: DesignViewProps) {
  const [designerFilter, setDesignerFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [orderToApprove, setOrderToApprove] = useState<ArtOrder | null>(null);
  const [whatsappImageBase64, setWhatsappImageBase64] = useState<string>('');
  const [selectedBrandClient, setSelectedBrandClient] = useState<Client | null>(null);
  const [editingOrder, setEditingOrder] = useState<ArtOrder | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  
  const initialFormData: Partial<ArtOrder> = {
    title: '',
    clientId: '',
    designerId: '',
    designerName: '',
    deadline: '',
    priority: 'medium',
    progress: 0,
    status: 'queue',
    observation: ''
  };

  const [formData, setFormData] = useState<Partial<ArtOrder>>(initialFormData);

  const isDesigner = currentUser.role === 'DESIGNER';
  const isAdmin = currentUser.role === 'ADMIN';
  const isPartner = currentUser.role === 'PARTNER';

  const designers = users.filter(u => u.role === 'DESIGNER');

  const getDesignerWithLowestLoad = () => {
    if (designers.length === 0) return { id: '', name: '' };
    const loadMap = designers.map(d => ({
      id: d.id,
      name: d.name,
      taskCount: artOrders.filter(o => o.designerId === d.id && o.status !== 'done').length
    }));
    const best = loadMap.sort((a, b) => a.taskCount - b.taskCount)[0];
    return { id: best.id, name: best.name };
  };

  const filteredOrders = useMemo(() => {
    let orders = artOrders;
    
    if (isDesigner) {
      orders = orders.filter(o => o.designerId === currentUser.id);
    } else if (isPartner) {
      // Partners only see orders for clients they brought
      const partnerClientIds = clients.filter(c => c.partnerId === currentUser.id).map(c => c.id);
      orders = orders.filter(o => partnerClientIds.includes(o.clientId));
    }

    return orders.filter(o => designerFilter === 'all' ? true : o.designerId === designerFilter);
  }, [artOrders, isDesigner, isPartner, currentUser.id, clients, designerFilter]);

  const partnerClients = useMemo(() => {
    if (isAdmin) return clients;
    if (isPartner) return clients.filter(c => c.partnerId === currentUser.id);
    return [];
  }, [clients, isAdmin, isPartner, currentUser.id]);

  const monthShortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const sidebarHolidays = useMemo(() => {
    const yearHolidays = getBrazilianHolidays(getYear(currentCalendarDate));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return yearHolidays.filter(h => {
      // Must be in the month we are viewing
      const inMonth = isSameMonth(h.date, currentCalendarDate);
      if (!inMonth) return false;
      
      // If viewing current month, only show from today onwards
      if (isSameMonth(currentCalendarDate, today)) {
        return h.date >= today;
      }
      
      // If viewing future month, show all (they are all upcoming)
      // If viewing past month, h.date >= today will naturally be false for those dates
      return h.date >= today;
    });
  }, [currentCalendarDate]);

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

  const handleShowCalendar = () => {
    setIsCalendarModalOpen(true);
  };

  const handleAddOrder = () => {
    if (partnerClients.length === 0) {
      alert("Você precisa ter pelo menos um cliente vinculado para solicitar um pedido.");
      return;
    }

    const assigned = (isPartner || isAdmin) ? getDesignerWithLowestLoad() : { id: designers[0]?.id || '', name: designers[0]?.name || '' };

    setEditingOrder(null);
    setFormData({
      ...initialFormData,
      clientId: partnerClients[0].id,
      designerId: assigned.id,
      designerName: assigned.name,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    });
    setIsModalOpen(true);
  };

  const handleEditOrder = (e: React.MouseEvent, order: ArtOrder) => {
    e.stopPropagation();
    setEditingOrder(order);
    setFormData({
      ...initialFormData,
      ...order
    });
    setIsModalOpen(true);
  };

  const handleShowBranding = (e: React.MouseEvent, client: Client | undefined) => {
    e.stopPropagation();
    if (client) {
      setSelectedBrandClient(client);
      setIsBrandModalOpen(true);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(text);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrder) {
        const updated = await api.updateArtOrder(editingOrder.id, formData);
        setArtOrders(orders => orders.map(o => o.id === editingOrder.id ? { ...o, ...updated } : o));
      } else {
        const newOrderData: any = {
          ...formData,
          id: 'o' + Math.random().toString(36).substr(2, 9),
        };
        const created = await api.createArtOrder(newOrderData);
        setArtOrders([...artOrders, created]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar pedido: ' + err.message);
    }
  };

  const handleUpdateStatus = async (id: string, status: WorkStatus) => {
    let progress = 0;
    if (status === 'queue') progress = 0;
    else if (status === 'production') progress = 40;
    else if (status === 'review') progress = 80;
    else if (status === 'done') progress = 100;
    
    // Evitar updates desnecessários
    const currentOrder = artOrders.find(o => o.id === id);
    if (currentOrder && currentOrder.status === status) return;

    // Update otimista local
    setArtOrders(prev => prev.map(o => o.id === id ? { ...o, status, progress } : o));
    
    try {
      await api.updateArtOrder(id, { status, progress });
      
      // Sincronização silenciosa com solicitações de parceiros
      if (status === 'done') {
        const relatedRequest = partnerRequests.find(pr => pr.relatedOrderId === id);
        if (relatedRequest && relatedRequest.status !== 'completed') {
          api.updatePartnerRequest(relatedRequest.id, { status: 'completed' })
            .then(updated => {
              setPartnerRequests(prev => prev.map(pr => pr.id === updated.id ? updated : pr));
            }).catch(e => console.error('Silent sync failed:', e));
        }
      }
    } catch (err: any) {
      console.error('Falha ao atualizar status:', err);
      // Em caso de erro, busca os dados mais recentes do servidor para garantir consistência
      try {
        const latest = await api.getArtOrders();
        setArtOrders(latest);
      } catch (fetchErr) {
        alert('Erro crítico de conexão. Por favor, recarregue a página.');
      }
    }
  };

  const handleDeleteOrder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteArtOrder(id);
      setArtOrders(orders => orders.filter(o => o.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir pedido: ' + err.message);
    }
  };


  const handleSimulateResponse = async (e: React.MouseEvent, id: string, status: ApprovalStatus) => {
    e.stopPropagation();
    try {
      const updates = { 
        approvalStatus: status,
        status: status === 'approved' ? 'done' as WorkStatus : 'production' as WorkStatus,
        progress: status === 'approved' ? 100 : 80
      };
      await api.updateArtOrder(id, updates);
      setArtOrders(orders => orders.map(o => o.id === id ? { ...o, ...updates } : o));

      if (status === 'approved') {
        // Sync with partner request if approved (translated to 'done')
        const relatedRequest = partnerRequests.find(pr => pr.relatedOrderId === id);
        if (relatedRequest && relatedRequest.status !== 'completed') {
          api.updatePartnerRequest(relatedRequest.id, { status: 'completed' }).then(updated => {
             setPartnerRequests(prev => prev.map(pr => pr.id === updated.id ? updated : pr));
          }).catch(e => console.error('Sync failed', e));
        }
      }
    } catch (err: any) {
      alert('Erro ao simular resposta: ' + err.message);
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentCalendarDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const currentYear = getYear(currentCalendarDate);
    
    // Get holidays for the current year being viewed
    const yearlyHolidays = getBrazilianHolidays(currentYear);

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2">
          <div className="space-y-0.5">
            <h3 className="text-4xl font-black text-gray-900 capitalize tracking-tighter">
              {format(currentCalendarDate, 'MMMM', { locale: ptBR })}
              <span className="text-indigo-500 ml-2">{format(currentCalendarDate, 'yyyy')}</span>
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Feriados e Planejamento Mensal</p>
          </div>
          
          <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-sm">
            <button 
              onClick={() => setCurrentCalendarDate(subMonths(currentCalendarDate, 1))}
              className="p-2 hover:bg-white hover:text-indigo-600 rounded-xl text-gray-500 transition-all hover:shadow-sm"
              title="Mês Anterior"
            >
               <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => setCurrentCalendarDate(new Date())}
              className="px-4 py-2 text-[10px] font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-widest shadow-md shadow-indigo-100"
            >
               Hoje
            </button>
            <button 
              onClick={() => setCurrentCalendarDate(addMonths(currentCalendarDate, 1))}
              className="p-2 hover:bg-white hover:text-indigo-600 rounded-xl text-gray-500 transition-all hover:shadow-sm"
              title="Próximo Mês"
            >
               <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 border-2 border-gray-200 rounded-[2rem] overflow-hidden shadow-xl bg-opacity-50">
          {weekDays.map(day => (
            <div key={day} className="bg-gray-50/80 backdrop-blur-sm py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
              {day}
            </div>
          ))}
          {calendarDays.map((day, i) => {
            const dayHolidays = yearlyHolidays.filter(h => isSameDay(day, h.date));
            const dayOrders = artOrders.filter(o => {
              const parts = o.deadline.split('/');
              if (parts.length !== 3) return false;
              const orderDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              return isSameDay(day, orderDate);
            });

            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={i} 
                className={cn(
                  "min-h-[130px] p-2.5 bg-white flex flex-col gap-1.5 transition-all group relative",
                  !isCurrentMonth && "bg-gray-50/40 opacity-30 grayscale-[0.5]",
                  isToday && "bg-indigo-50/30"
                )}
              >
                {/* Visual indicator for today */}
                {isToday && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]" />
                )}

                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "text-lg font-black tracking-tighter leading-none transition-colors",
                    isToday ? "text-indigo-600" : isCurrentMonth ? "text-gray-900" : "text-gray-300"
                  )}>
                    {format(day, 'dd')}
                  </span>
                  
                  <div className="flex gap-1">
                    {dayHolidays.length > 0 && (
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white",
                        dayHolidays.some(h => h.type === 'holiday') ? "bg-rose-500 animate-pulse" : "bg-amber-400"
                      )} />
                    )}
                    {dayOrders.length > 0 && (
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-2 ring-white" />
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar scroll-smooth">
                  {/* Holidays Card */}
                  {dayHolidays.map((holiday, idx) => (
                    <div 
                      key={`h-${idx}`}
                      className={cn(
                        "text-[9px] p-2 rounded-xl font-black leading-none shadow-sm border-l-4 transition-transform hover:scale-[1.02]",
                        holiday.type === 'holiday' 
                          ? "bg-rose-50 text-rose-700 border-rose-500" 
                          : "bg-amber-50 text-amber-700 border-amber-400"
                      )}
                    >
                      {holiday.name}
                    </div>
                  ))}
                  
                  {/* Orders Summary */}
                  {dayOrders.length > 0 && isCurrentMonth && (
                    <div className="mt-auto space-y-1">
                      <div className="flex items-center gap-1.5 opacity-60">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{dayOrders.length} Tarefa(s)</span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {dayOrders.map(order => (
                          <div 
                            key={order.id}
                            className={cn(
                              "w-full text-[8px] px-2 py-1 rounded-lg font-bold truncate",
                              order.status === 'done' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                            )}
                            title={order.title}
                          >
                            {order.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-8 px-8 py-5 bg-white rounded-3xl border-2 border-gray-100 shadow-sm">
           <div className="flex items-center gap-3 group cursor-default">
             <div className="w-5 h-5 rounded-full bg-rose-500 shadow-lg shadow-rose-100 animate-pulse" />
             <div className="flex flex-col">
               <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Feriado Nacional</span>
               <span className="text-[9px] text-gray-400 font-medium italic -mt-0.5">Prazo de entrega bloqueado</span>
             </div>
           </div>
           
           <div className="flex items-center gap-3 group cursor-default">
             <div className="w-5 h-5 rounded-full bg-amber-400 shadow-lg shadow-amber-100" />
             <div className="flex flex-col">
               <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Data Comemorativa</span>
               <span className="text-[9px] text-gray-400 font-medium italic -mt-0.5">Oportunidade p/ campanhas</span>
             </div>
           </div>

           <div className="flex items-center gap-3 group cursor-default ml-auto">
             <div className="w-5 h-5 rounded-full bg-slate-300 shadow-lg shadow-slate-100" />
             <div className="flex flex-col">
               <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Job Delivery</span>
               <span className="text-[9px] text-gray-400 font-medium italic -mt-0.5">Prazos de entrega do designer</span>
             </div>
           </div>
        </div>
      </div>
    );
  };

  const handleOpenWhatsappModal = (e: React.MouseEvent, order: ArtOrder) => {
    e.stopPropagation();
    setOrderToApprove(order);
    setWhatsappImageBase64('');
    setWhatsappModalOpen(true);
  };

  const confirmSendToWhatsapp = async () => {
    if (!orderToApprove) return;
    const client = clients.find(c => c.id === orderToApprove.clientId);
    if (!client || !client.phone) {
      alert('Cliente sem telefone cadastrado ou não encontrado.');
      return;
    }

    try {
      const message = `Olá, *${client.name}*! A arte *${orderToApprove.title}* está pronta para sua análise. 🎨✨\n\nPor favor, vote na enquete abaixo para nos enviar seu feedback instantaneamente!`;
      
      const poll = {
        name: `Aprovação: ${orderToApprove.title}`,
        options: ['🟢 Aprovar Arte', '🔴 Solicitar Ajustes'],
        orderId: orderToApprove.id
      };

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: client.phone, message, poll, mediaBase64: whatsappImageBase64 || undefined })
      });

      const data = await res.json();
      if (data.success) {
        setArtOrders(prev => prev.map(o => 
          o.id === orderToApprove.id 
            ? { ...o, approvalStatus: 'pending', whatsappSentAt: new Date().toLocaleString('pt-BR') } 
            : o
        ));
        alert('Mensagem e enquete de aprovação enviadas com sucesso via WhatsApp!');
        setWhatsappModalOpen(false);
      } else {
        alert('Erro ao enviar WhatsApp: ' + (data.error || 'Verifique se o WhatsApp está conectado no painel Admin.'));
      }
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      alert('Erro na comunicação com o servidor.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight transition-all duration-300">Workflow de Design</h1>
          <p className="text-sm text-gray-500 font-medium">Acompanhe a produção de artes e aprovações via WhatsApp.</p>
        </div>
        {(isPartner || isAdmin) && (
          <button 
            onClick={handleAddOrder}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-all shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
          >
            <Plus size={16} />
            Novo Pedido
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {['queue', 'production', 'review', 'done'].map((status) => {
          const count = filteredOrders.filter(o => o.status === status).length;
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
           <select 
             value={designerFilter}
             onChange={(e) => setDesignerFilter(e.target.value)}
             className="bg-transparent text-xs font-bold text-gray-500 border-none focus:ring-0 cursor-pointer transition-colors duration-300"
           >
              <option value="all">Todos os Designers</option>
              {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 grid grid-cols-1 gap-6">
          {filteredOrders.map((order) => {
            const client = clients.find(c => c.id === order.clientId);
          return (
            <div 
              key={order.id} 
              onClick={(e) => handleEditOrder(e, order)}
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
                  <button 
                    onClick={(e) => handleShowBranding(e, client)}
                    title="Ver Branding do Cliente"
                    className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Eye size={16} />
                  </button>
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
                  <UserIcon size={14} />
                  <span className="text-xs font-semibold">{order.designerName || 'Sem Responsável'}</span>
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
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progresso da Tarefa</span>
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
                <div className="text-xs text-gray-500 italic max-w-sm">
                  {order.observation && <p className="line-clamp-2" title={order.observation}>Obs: {order.observation}</p>}
                  {order.whatsappSentAt && (
                    <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-wider mt-1">
                      <MessageSquare size={12} />
                      Enviado WhatsApp: {order.whatsappSentAt}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {order.status === 'review' && (
                    <button 
                      onClick={(e) => handleOpenWhatsappModal(e, order)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-sm flex-1 sm:flex-none"
                    >
                      <Send size={14} /> Enviar para Aprovação
                    </button>
                  )}
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
                  value={formData.title || ''}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 shadow-sm"
                  placeholder="Ex: Post Carrossel Instagram"
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cliente</label>
                  <select 
                    value={formData.clientId || ''}
                    onChange={e => setFormData({...formData, clientId: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                  >
                    {partnerClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Responsável</label>
                   {isPartner ? (
                     <div className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-500 font-medium">
                       Atribuição Automática
                     </div>
                   ) : (
                     <select 
                       value={formData.designerId || ''}
                       onChange={e => {
                         const d = designers.find(u => u.id === e.target.value);
                         setFormData({...formData, designerId: e.target.value, designerName: d?.name || ''});
                       }}
                       className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm shadow-sm"
                     >
                       <option value="">Selecione um designer...</option>
                       {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                     </select>
                   )}
                 </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prazo</label>
                  <input 
                    type="text" 
                    value={formData.deadline || ''}
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 shadow-sm"
                    placeholder="dd/mm/aaaa"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prioridade</label>
                  <select 
                    value={formData.priority || 'medium'}
                    onChange={e => setFormData({...formData, priority: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm shadow-sm"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                 <div className="col-span-2 space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Observações ({formData.observation?.length || 0}/300)</label>
                   <textarea 
                     value={formData.observation || ''}
                     onChange={e => setFormData({...formData, observation: e.target.value})}
                     maxLength={300}
                     className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 shadow-sm"
                     placeholder="Alguma observação importante para o designer?"
                     rows={3}
                   />
                </div>
             </div>
          </form>
        </Modal>

        {/* Sidebar Widgets */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 transition-colors">
                 <Clock size={18} className="text-indigo-500" />
                 Próximos de {monthShortNames[currentCalendarDate.getMonth()]}
              </h3>
            </div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
               {sidebarHolidays.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-indigo-100 transition-all">
                     <div className={cn(
                       "flex flex-col items-center justify-center w-10 h-10 rounded-lg border shadow-sm transition-colors",
                       h.type === 'holiday' ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"
                     )}>
                        <span className={cn(
                          "text-[9px] font-bold uppercase",
                          h.type === 'holiday' ? "text-rose-500" : "text-amber-500"
                        )}>{monthShortNames[h.date.getMonth()]}</span>
                        <span className={cn(
                          "text-sm font-bold leading-none",
                          h.type === 'holiday' ? "text-rose-600" : "text-amber-600"
                        )}>{h.date.getDate()}</span>
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate transition-colors">{h.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium capitalize">
                          {h.type === 'holiday' ? 'Feriado Nacional' : 'Data Comemorativa'}
                        </p>
                     </div>
                  </div>
               ))}
               {sidebarHolidays.length === 0 && (
                 <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                   <p className="text-xs text-gray-400 italic">Sem eventos previstos para este mês.</p>
                 </div>
               )}
            </div>
            <button onClick={handleShowCalendar} className="w-full mt-6 py-2 rounded-xl text-xs font-bold text-indigo-500 border border-indigo-100 hover:bg-indigo-50 transition-all">
               Calendário Completo
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm transition-all duration-300">
             <h3 className="font-bold text-gray-900 mb-2 transition-colors">Dica do Pro</h3>
             <p className="text-xs text-gray-500 leading-relaxed transition-colors">
                • <b>Reflexão:</b> Verifique o guia de marca antes de iniciar.<br/>
                • <b>Organização:</b> Nomeie bem suas camadas e arquivos.<br/>
                • <b>Feedback:</b> A aprovação via WhatsApp agiliza muito o processo, seja claro na mensagem.
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
            <p className="text-3xl font-bold tracking-tight text-gray-900">{Math.round((filteredOrders.filter(o => o.status !== 'done').length / (filteredOrders.length || 1)) * 100)}%</p>
            <p className="text-gray-500 text-xs mt-1 font-medium italic">Fluxo de trabalho baseado em pedidos ativos</p>
          </div>
          <div>
            <h4 className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-2">Pendência de Aprovação</h4>
            <p className="text-3xl font-bold tracking-tight text-gray-900">{filteredOrders.filter(o => o.status === 'review').length} Artes</p>
            <p className="text-gray-500 text-xs mt-1 font-medium italic">Aguardando feedback do cliente (WPP)</p>
          </div>
        </div>
      </div>

      {/* Brand Modal */}
      <Modal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        title={`Identidade Visual: ${selectedBrandClient?.name || 'Cliente'}`}
        footer={
          <div className="flex justify-end">
            <button 
              onClick={() => setIsBrandModalOpen(false)}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors shadow-sm"
            >
              Fechar Guia
            </button>
          </div>
        }
      >
        <div className="space-y-8 py-4">
          {/* Logo Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Palette size={12} className="text-indigo-500" />
              Logotipo Principal
            </h4>
            <div className="bg-gray-50 rounded-2xl p-8 flex flex-col items-center justify-center border border-dashed border-gray-200 group relative">
              {selectedBrandClient?.branding?.logo ? (
                <>
                  <img src={selectedBrandClient.branding.logo} className="max-h-32 object-contain transition-transform group-hover:scale-105" alt="Logo" />
                  <a 
                    href={selectedBrandClient.branding.logo} 
                    download 
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-4 right-4 p-2 bg-white rounded-xl shadow-sm text-gray-400 hover:text-indigo-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Download size={18} />
                  </a>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Nenhuma logo cadastrada para este cliente.</p>
              )}
            </div>
          </div>

          {/* Colors Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={12} className="text-emerald-500" />
              Paleta de Cores
            </h4>
            <div className="grid grid-cols-5 gap-3">
              {selectedBrandClient?.branding?.colors?.map((color, idx) => (
                <button 
                  key={idx}
                  onClick={() => copyToClipboard(color)}
                  className="group flex flex-col gap-2 items-center focus:outline-none"
                >
                  <div 
                    className="w-full aspect-square rounded-2xl border border-gray-100 shadow-sm transition-transform active:scale-95 group-hover:shadow-md relative"
                    style={{ backgroundColor: color }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                      <Copy size={20} className="text-white" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-mono font-bold text-gray-900 uppercase">{color}</span>
                    {copyFeedback === color && (
                      <span className="text-[8px] font-bold text-emerald-500 uppercase animate-bounce mt-1">Copiado!</span>
                    )}
                  </div>
                </button>
              )) || <p className="col-span-5 text-sm text-gray-400 italic text-center">Nenhuma cor definida.</p>}
            </div>
            <p className="text-[10px] text-gray-400 text-center italic">Clique no card da cor para copiar o código HEX.</p>
          </div>
        </div>
      </Modal>
      <Modal 
        isOpen={isCalendarModalOpen} 
        onClose={() => setIsCalendarModalOpen(false)} 
        title="Calendário Completo"
      >
        <div className="p-2">
           {renderCalendar()}
        </div>
      </Modal>

      <Modal 
        isOpen={whatsappModalOpen} 
        onClose={() => setWhatsappModalOpen(false)} 
        title="Enviar p/ Aprovação (WhatsApp)"
        footer={
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setWhatsappModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmSendToWhatsapp}
              className="px-6 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-sm"
            >
              Confirmar Envio
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Você está prestes a enviar a arte <strong>{orderToApprove?.title}</strong> ao cliente <strong>{clients.find(c => c.id === orderToApprove?.clientId)?.name}</strong>.
          </p>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Anexar Arte Pronta (Opcional)</label>
            <div className="relative">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setWhatsappImageBase64(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-xl file:border-0
                  file:text-sm file:font-semibold
                  file:bg-emerald-50 file:text-emerald-700
                  hover:file:bg-emerald-100 transition-colors"
              />
            </div>
            {whatsappImageBase64 && (
              <div className="mt-4 text-xs text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-50 p-2 rounded-lg justify-center border border-emerald-100">
                <CheckCircle2 size={14} />
                Imagem anexada
              </div>
            )}
            <p className="text-[10px] text-gray-400 italic mt-2">
              Se anexar uma imagem, o WhatsApp enviará primeiro a arte, e logo em seguida a enquete de aprovação.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
