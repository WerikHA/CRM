import React from 'react';
import { CheckCircle, ArrowRight, Zap, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface CheckoutSuccessProps {
  onGoToDashboard: () => void;
}

export default function CheckoutSuccess({ onGoToDashboard }: CheckoutSuccessProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 text-center relative overflow-hidden border border-slate-100"
      >
        {/* Confetti decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <CheckCircle className="text-green-500 w-12 h-12" />
        </div>

        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">
          BEM-VINDO AO ELITE!
        </h1>
        <p className="text-slate-500 font-medium leading-relaxed mb-10">
          Sua assinatura foi processada com sucesso. Agora você tem acesso total às ferramentas avançadas do Amplifica CRM.
        </p>

        <div className="space-y-4 mb-10">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <Zap size={20} />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Upgrade Ativado</div>
              <div className="text-sm font-bold text-slate-900">Novos recursos liberados</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shrink-0">
              <Star size={20} />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Status</div>
              <div className="text-sm font-bold text-slate-900">Membro Premium</div>
            </div>
          </div>
        </div>

        <button
          onClick={onGoToDashboard}
          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          Acessar Dashboard <ArrowRight size={18} />
        </button>

        <p className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Obrigado por confiar na nossa tecnologia
        </p>
      </motion.div>
    </div>
  );
}
