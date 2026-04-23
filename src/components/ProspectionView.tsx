import React from 'react';
import { Target, Construction } from 'lucide-react';

export default function ProspectionView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
      <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse">
        <Target size={40} className="text-indigo-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center justify-center gap-3">
          Painel de Prospecção
        </h1>
        <p className="text-gray-500 max-w-sm mx-auto">
          Nosso novo módulo de Inteligência de Vendas e automação de prospecção está em construção e chegará em breve!
        </p>
      </div>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-full text-xs font-bold uppercase tracking-widest border border-amber-100">
        <Construction size={14} />
        Em Construção
      </div>
    </div>
  );
}
