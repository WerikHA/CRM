import React, { useState } from 'react';
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle, Send, Trash2, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { SupportTicket, User } from '../types';
import Modal from './Modal';
import { api } from '../services/api';

interface SupportViewProps {
  tickets: SupportTicket[];
  setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  currentUser: User;
}

export default function SupportView({ tickets, setTickets, currentUser }: SupportViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const initialFormData: Partial<SupportTicket> = {
    subject: '',
    description: '',
  };

  const [formData, setFormData] = useState<Partial<SupportTicket>>(initialFormData);

  const isPartner = currentUser.role === 'PARTNER';
  const isAdmin = currentUser.role === 'ADMIN';
  const isOwner = currentUser.role === 'OWNER';

  const filteredTickets = isPartner 
    ? tickets.filter(t => t.partnerId === currentUser.id)
    : tickets;

  const handleOpenTicket = () => {
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTicketData: SupportTicket = {
        id: Math.random().toString(36).substr(2, 9),
        partnerId: currentUser.id,
        subject: formData.subject || '',
        description: formData.description || '',
        status: 'open',
        createdAt: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      const created = await api.createSupportTicket(newTicketData);
      setTickets([...tickets, created]);
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao abrir ticket: ' + err.message);
    }
  };

  const handleRespondTicket = async (id: string, response: string) => {
    try {
      const ticket = tickets.find(t => t.id === id);
      if (!ticket) return;

      const updated = {
        ...ticket,
        response,
        status: 'replied' as 'replied'
      };

      await api.updateSupportTicket(id, updated);
      setTickets(tickets.map(t => t.id === id ? updated : t));
    } catch (err: any) {
      alert('Erro ao responder ticket: ' + err.message);
    }
  };

  const handleCloseTicket = async (id: string) => {
    try {
      const ticket = tickets.find(t => t.id === id);
      if (!ticket) return;

      const updated = {
        ...ticket,
        status: 'closed' as 'closed'
      };

      await api.updateSupportTicket(id, updated);
      setTickets(tickets.map(t => t.id === id ? updated : t));
    } catch (err: any) {
      alert('Erro ao fechar ticket: ' + err.message);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ticket?')) return;
    try {
      await api.deleteSupportTicket(id);
      setTickets(tickets.filter(t => t.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir ticket: ' + err.message);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'replied': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'closed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Aberto';
      case 'replied': return 'Respondido';
      case 'closed': return 'Concluído';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight transition-colors">Central de Suporte</h1>
          <p className="text-sm text-gray-500">
            {isPartner ? 'Abra chamados para suporte técnico ou financeiro.' : 'Gerencie as solicitações de suporte dos parceiros.'}
          </p>
        </div>
        {isPartner && (
          <button 
            onClick={handleOpenTicket}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-all shadow-sm"
          >
            <Plus size={16} />
            Novo Ticket
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhum ticket encontrado</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {isPartner ? 'Você ainda não abriu nenhum chamado de suporte.' : 'Não há chamados de parceiros no momento.'}
            </p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div key={ticket.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-all group relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", getStatusStyle(ticket.status))}>
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{ticket.subject}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Clock size={10} /> {ticket.createdAt}
                      </span>
                      <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border", getStatusStyle(ticket.status))}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteTicket(ticket.id)}
                    className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-500 leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100/50 italic mb-4">
                {ticket.description}
              </p>
              
              {ticket.response && (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-4">
                  <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Resposta do Suporte:</p>
                  <p className="text-sm text-indigo-900">{ticket.response}</p>
                </div>
              )}

              {isAdmin && ticket.status !== 'closed' && (
                <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                   <textarea 
                     className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                     placeholder="Digite sua resposta..."
                     onBlur={(e) => {
                       if (e.target.value.trim()) {
                         handleRespondTicket(ticket.id, e.target.value);
                         e.target.value = '';
                       }
                     }}
                   />
                   <div className="flex gap-2">
                     <button 
                       onClick={() => handleCloseTicket(ticket.id)}
                       className="px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                     >
                       Marcar como Concluído
                     </button>
                   </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Ticket de Suporte"
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
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors shadow-sm"
            >
              Enviar Ticket
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assunto</label>
            <input 
              type="text" 
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              placeholder="Ex: Problema com pagamento ou Erro no workflow"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descrição detalhada</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm min-h-[120px]"
              placeholder="Descreva o que está acontecendo..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
