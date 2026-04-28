import React, { useState, useEffect } from 'react';
import { Facebook, Instagram, Share2, Plus, Unlink } from 'lucide-react';
import { Client } from '../types';
import { api } from '../services/api';
import { cn, notifyError } from '../lib/utils';

interface ClientSocialAccountsManagerProps {
  client: Client;
}

export default function ClientSocialAccountsManager({ client }: ClientSocialAccountsManagerProps) {
  const [socialStatus, setSocialStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!client.id) return;
    loadStatus();

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'FACEBOOK_AUTH_SUCCESS' && event.data?.clientId === client.id) {
        await loadStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [client.id]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const status = await api.get(`/facebook/status/${client.id}`);
      setSocialStatus(status);
    } catch (err) {
      console.error('Erro ao carregar status social:', err);
    } finally {
      setLoading(false);
    }
  };

  const initiateAuth = async () => {
    try {
      const data = await api.get(`/facebook/auth-url?clientId=${client.id}`);
      if (data && data.url) {
        window.open(data.url, 'FacebookAuth', 'width=600,height=700');
      } else {
        alert("Erro ao obter URL de autenticação.");
      }
    } catch (e: any) {
      if (e?.message?.includes("não configurado")) {
         alert("Configuração Incompleta: O Facebook App ID ou Redirect URI não estão configurados. Por favor, adicione as variáveis FACEBOOK_APP_ID e FACEBOOK_REDIRECT_URI na configuração de Ambiente/Servidor (.env).");
      } else {
         alert(`Falha na comunicação: ${e?.message}`);
      }
    }
  };

  const isFB = socialStatus?.connected && socialStatus?.pages?.length > 0;
  const isIG = socialStatus?.connected && socialStatus?.igAccounts?.length > 0;

  return (
    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Redes Sociais</h3>
      </div>

      <div className="grid gap-3">
        {/* Facebook */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", isFB ? "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400" : "bg-gray-50 border-gray-100 text-gray-400 dark:bg-gray-800 dark:border-gray-700")}>
              <Facebook size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none mb-1">Páginas do Facebook</p>
              {isFB ? (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{socialStatus.pages.length} página(s) conectada(s)</p>
              ) : (
                <p className="text-xs text-gray-400">Não conectado</p>
              )}
            </div>
          </div>
          <div>
            {!isFB ? (
              <button onClick={initiateAuth} className="p-2 text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-colors">
                Conectar
              </button>
            ) : (
              <button title="Atualizar Token" onClick={initiateAuth} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                <Share2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Instagram */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", isIG ? "bg-pink-50 border-pink-100 text-pink-600 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-400" : "bg-gray-50 border-gray-100 text-gray-400 dark:bg-gray-800 dark:border-gray-700")}>
              <Instagram size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none mb-1">Contas do Instagram</p>
              {isIG ? (
                <p className="text-xs text-pink-600 dark:text-pink-400 font-medium">{socialStatus.igAccounts.length} conta(s) conectada(s)</p>
              ) : (
                <p className="text-xs text-gray-400">Não conectado</p>
              )}
            </div>
          </div>
          <div>
            {!isIG ? (
              <button onClick={initiateAuth} className="p-2 text-xs font-bold bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:hover:bg-pink-900/40 rounded-lg transition-colors">
                Conectar (Via FB)
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
