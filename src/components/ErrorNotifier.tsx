import React, { useState, useEffect } from 'react';
import { AlertCircle, Send, CheckCircle2, X } from 'lucide-react';
import { api } from '../services/api';
import Modal from './Modal';

interface ErrorInfo {
  message: string;
  context?: string;
}

export default function ErrorNotifier() {
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    // Add global error handler
    const originalAlert = window.alert;
    
    // We override window.alert specifically for reporting if we want, 
    // or just expose a new global. Let's expose a global.
    (window as any).reportAppError = (message: string, context?: string) => {
      setError({ message, context });
    };

    return () => {
      delete (window as any).reportAppError;
    };
  }, []);

  const handleReport = async () => {
    if (!error) return;
    setIsReporting(true);
    try {
      await api.reportError({
        message: error.message,
        context: error.context,
        stack: new Error().stack
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setError(null);
      }, 3000);
    } catch (err) {
      console.error('Falha ao reportar erro:', err);
    } finally {
      setIsReporting(false);
    }
  };

  if (!error) return null;

  return (
    <Modal
      isOpen={!!error}
      onClose={() => setError(null)}
      title="Ocorreu um erro"
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Fechar
          </button>
          {!reportSuccess && (
            <button
              onClick={handleReport}
              disabled={isReporting}
              className="px-6 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors shadow-sm flex items-center gap-2"
            >
              <Send size={16} />
              {isReporting ? 'Enviando...' : 'Reportar para Suporte'}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 border border-rose-200">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-rose-900 mb-1 font-mono">Dethalhes do Erro:</p>
            <p className="text-sm text-rose-700 leading-relaxed font-mono break-all">{error.message}</p>
            {error.context && (
              <p className="text-xs text-rose-500 mt-2 italic">Contexto: {error.context}</p>
            )}
          </div>
        </div>

        {reportSuccess && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 size={18} />
            <p className="text-sm font-semibold text-emerald-800">Erro reportado com sucesso! Nossos técnicos analisarão em breve.</p>
          </div>
        )}

        <p className="text-xs text-gray-500 leading-relaxed px-1">
          Ao clicar em reportar, enviaremos os detalhes técnicos deste erro para nossa equipe de suporte. Isso nos ajuda a melhorar sua experiência.
        </p>
      </div>
    </Modal>
  );
}
