import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, X } from 'lucide-react';
import { storageService } from '../lib/storage';

/**
 * Componente de consentimento de cookies para conformidade com LGPD/GDPR.
 * Exibe um banner discreto no canto inferior direito.
 */
export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já tomou uma decisão
    const consent = storageService.getItem('cookie_consent');
    if (!consent) {
      // Menor delay para garantir que o usuário veja logo
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    storageService.setItem('cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    // Mesmo que o usuário recuse, salvamos a decisão para não perguntar novamente
    storageService.setItem('cookie_consent', 'declined');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-[9999] max-w-sm w-[calc(100vw-3rem)]"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95">
            {/* Sotaque colorido lateral */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-600" />
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0 animate-pulse">
                <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Privacidade e Cookies
                  </h3>
                  <button 
                    onClick={() => setIsVisible(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                  Utilizamos cookies para melhorar sua experiência, analisar o tráfego e personalizar conteúdo conforme as diretrizes da LGPD.
                </p>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAccept}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                  >
                    Aceitar Todos
                  </button>
                  <button
                    onClick={handleDecline}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
