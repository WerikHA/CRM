import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Check, X, AlertTriangle, Scale, ArrowRight, Zap } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface TermsAcceptanceModalProps {
  currentUser: User;
  onAccept: (updatedUser: User) => void;
  onReject: () => void;
  agencyName: string;
  primaryColor: string;
}

export default function TermsAcceptanceModal({ currentUser, onAccept, onReject, agencyName, primaryColor }: TermsAcceptanceModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      const updatedUser = await api.updateUser(currentUser.id, {
        acceptedTerms: true
      });
      toast.success('Termos aceitos com sucesso!');
      onAccept(updatedUser);
    } catch (err) {
      toast.error('Erro ao processar aceitação. Tente novamente.');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Termos de Uso</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest mt-0.5">Atualização de Segurança</p>
            </div>
          </div>
          <div 
            className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20"
          >
            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Ação Necessária</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 font-medium text-gray-600 dark:text-gray-400 space-y-6 text-sm leading-relaxed custom-scrollbar">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
            <p className="text-gray-900 dark:text-gray-100 font-bold mb-2">Olá, {currentUser.name}!</p>
            <p>Atualizamos nossos Termos e Condições de Uso para melhor refletir as práticas de privacidade e segurança do <strong>{agencyName}</strong>. Para continuar utilizando a plataforma, é necessário revisar e aceitar estes termos.</p>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-gray-900 dark:text-gray-100 font-bold uppercase tracking-tight mb-3 flex items-center gap-2">
                <Scale size={16} className="text-indigo-500" /> 1. Conexão com Google e Meta
              </h3>
              <p>Ao utilizar o CRM, você autoriza integrações com Google Drive e Meta (Facebook/Instagram). Você é o único responsável pelo conteúdo publicado e pela segurança de suas credenciais de terceiros.</p>
            </section>

            <section>
              <h3 className="text-gray-900 dark:text-gray-100 font-bold uppercase tracking-tight mb-3 flex items-center gap-2">
                <Check size={16} className="text-indigo-500" /> 2. Responsabilidade do Conteúdo
              </h3>
              <p>Você garante possuir os direitos autorais de todo material (texto, imagem, vídeo) carregado no sistema. É proibido o uso da plataforma para spam ou atividades ilegais.</p>
            </section>

            <section>
              <h3 className="text-gray-900 dark:text-gray-100 font-bold uppercase tracking-tight mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-indigo-500" /> 3. Isenção de Garantias
              </h3>
              <p>O software é fornecido "como está". Não garantimos disponibilidade ininterrupta, dado que o serviço depende de infraestruturas de terceiros que podem sofrer alterações sem aviso prévio.</p>
            </section>

            <section className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Você pode ler a versão completa dos termos em nosso{' '}
                <a href="/terms" target="_blank" className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 transition-colors">
                  site principal
                </a>.
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className={cn(
                "w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-8 py-4 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50",
                "bg-indigo-600 hover:bg-indigo-700"
              )}
            >
              {isAccepting ? 'Processando...' : (
                <>
                  Aceitar e Continuar <ArrowRight size={18} />
                </>
              )}
            </button>
            <button
              onClick={onReject}
              disabled={isAccepting}
              className="w-full sm:w-auto px-8 py-4 text-gray-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20"
            >
              Recusar e Sair
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-4 font-bold uppercase tracking-widest">
            Ao clicar em aceitar, você concorda com nossos termos e políticas.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
