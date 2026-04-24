import React, { useState, useEffect } from 'react';
import { Palette, Send, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { ArtOrder, Client } from '../types';
import { api } from '../services/api';
import { cn } from '../lib/utils';

interface DesignModificationFormProps {
  orderId: string;
  onSuccess: () => void;
}

export default function DesignModificationForm({ orderId, onSuccess }: DesignModificationFormProps) {
  const [order, setOrder] = useState<ArtOrder | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orders = await api.getArtOrders();
        const foundOrder = orders.find(o => o.id === orderId);
        
        if (!foundOrder) {
          setError('Pedido não encontrado ou já processado.');
          setLoading(false);
          return;
        }

        setOrder(foundOrder);
        
        const clients = await api.getClients();
        const foundClient = clients.find(c => c.id === foundOrder.clientId);
        setClient(foundClient || null);
        
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar dados do pedido.');
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setSubmitting(true);
    try {
      // O status só muda para reprovado quando o cliente envia a modificação
      await api.updateArtOrder(orderId, {
        rejectionNotes: notes,
        approvalStatus: 'rejected',
        status: 'production', // Volta para produção
        progress: 40,
        feedbackRequested: false // Reseta a flag
      });
      
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err) {
      alert('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h2>
          <p className="text-gray-500 mb-6">{error || 'Link inválido ou expirado.'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl border border-gray-100">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 animate-bounce">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ajustes Enviados!</h2>
          <p className="text-gray-500 mb-0">Nossa equipe já recebeu suas instruções e começará as alterações em breve.</p>
          <p className="text-gray-400 text-xs mt-4 italic font-medium uppercase tracking-widest">Você pode fechar esta aba.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 py-12 transition-colors">
      <div className="max-w-2xl w-full">
        {/* Logo/Branding Header */}
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4 text-white">
             <Palette size={32} />
           </div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Formulário de Ajustes</h1>
           <p className="text-gray-500 dark:text-gray-400 font-medium">Pedido: <span className="font-bold text-indigo-600 dark:text-indigo-400">{order.title}</span></p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300">
           <div className="p-8 md:p-10">
              <div className="flex items-start gap-4 mb-8 bg-indigo-50/50 dark:bg-indigo-500/5 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
                 <div className="p-2 bg-indigo-500 text-white rounded-xl shadow-md">
                   <MessageSquare size={20} />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Instruções para Ajustes</p>
                   <p className="text-xs text-gray-600 dark:text-gray-400 font-medium italic">Seja o mais específico possível sobre o que deseja alterar (cores, textos, fontes, imagens, etc).</p>
                 </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">O que você deseja alterar?</label>
                  <textarea
                    required
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    placeholder="Ex: Gostaria de trocar a cor principal para azul marinho e aumentar o tamanho do logo..."
                    className="w-full px-6 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 border border-transparent focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-gray-900 dark:text-gray-100 outline-none text-sm leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !notes.trim()}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95",
                    submitting || !notes.trim() 
                      ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed" 
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-indigo-900/50"
                  )}
                >
                  {submitting ? (
                    'Enviando...'
                  ) : (
                    <>
                      Enviar Solicitação de Ajuste
                      <Send size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-800 text-center">
                 <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em]">© {new Date().getFullYear()} - Sistema de Gestão de Artes</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
