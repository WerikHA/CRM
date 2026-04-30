import React from 'react';
import { AlertCircle, RefreshCcw, Home, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface CheckoutErrorProps {
  onRetry: () => void;
  onGoHome: () => void;
}

export default function CheckoutError({ onRetry, onGoHome }: CheckoutErrorProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 text-center border border-red-50"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <AlertCircle className="text-red-500 w-10 h-10" />
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">
          Ops! Algo deu errado
        </h1>
        <p className="text-slate-500 font-medium leading-relaxed mb-10">
          Não conseguimos processar seu pagamento. Verifique os dados do seu cartão ou tente outro método.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={onRetry}
            className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:shadow-indigo-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCcw size={14} /> Tentar dnv
          </button>
          <button
            onClick={onGoHome}
            className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <Home size={14} /> Início
          </button>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 mb-4 flex items-center justify-center gap-2">
            <MessageSquare size={14} /> Ficou com dúvida?
          </p>
          <a 
            href="#" 
            className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline"
          >
            Falar com suporte técnico
          </a>
        </div>
      </motion.div>
    </div>
  );
}
