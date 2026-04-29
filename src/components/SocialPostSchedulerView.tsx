import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Calendar as CalendarIcon, Clock, Image as ImageIcon, Send, Instagram, Facebook, Check, AlertCircle, Trash2, Edit2, Info, Link as LinkIcon, List, Calendar as CalendarViewIcon } from 'lucide-react';
import { Client } from '../types';
import { api } from '../services/api';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

interface SocialPost {
  id: string;
  clientId: string;
  content: string;
  mediaUrls: string[];
  networks: ('facebook' | 'instagram')[];
  selectedPageId?: string;
  selectedIgAccountId?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  createdAt: string;
}

interface SocialPostSchedulerViewProps {
  clients: Client[];
  currentUser: any;
}

export function SocialPostSchedulerView({ clients: initialClients, currentUser }: SocialPostSchedulerViewProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [formData, setFormData] = useState<Partial<SocialPost>>({
    networks: [],
    status: 'scheduled'
  });

  const [availableAccounts, setAvailableAccounts] = useState<{pages: any[], igAccounts: any[]}>({pages: [], igAccounts: []});

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  useEffect(() => {
    if (formData.clientId) {
      api.get(`/facebook/status/${formData.clientId}`).then(status => {
        if (status) {
          setAvailableAccounts({ pages: status.pages || [], igAccounts: status.igAccounts || [] });
          setFormData(prev => ({
            ...prev,
            selectedPageId: prev.selectedPageId || status.pages?.[0]?.id,
            selectedIgAccountId: prev.selectedIgAccountId || status.igAccounts?.[0]?.igAccountId
          }));
        }
      }).catch(console.error);
    } else {
      setAvailableAccounts({ pages: [], igAccounts: [] });
    }
  }, [formData.clientId]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'FACEBOOK_AUTH_SUCCESS') {
        const { clientId } = event.data;
        try {
          const status = await api.get(`/facebook/status/${clientId}`);
          if (status) {
             if (status.connected) {
                // Update client state locally so UI updates
                setClients(prev => prev.map(c => {
                  if (c.id === clientId) {
                    const hasFB = status.pages.length > 0;
                    const hasIG = status.igAccounts.length > 0;
                    return {
                      ...c,
                      socialAccounts: {
                        ...(c.socialAccounts || {}),
                        facebook: { connected: hasFB, pageName: hasFB ? status.pages[0].name : undefined },
                        instagram: { connected: hasIG, handle: hasIG ? `@${status.igAccounts[0].pageName}` : undefined }
                      }
                    }
                  }
                  return c;
                }));
             }
          }
        } catch (e) { console.error('Erro ao buscar status do facebook', e); }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const initiateFacebookAuth = async (clientId: string) => {
    try {
      const data = await api.get(`/facebook/auth-url?clientId=${clientId}`);
      if (data && data.url) {
        window.open(data.url, 'FacebookAuth', 'width=600,height=700');
      } else {
        alert(`Erro de configuração: ${data.error || "O App ID ou Redirect URI do Facebook não estão configurados."}`);
      }
    } catch (e: any) {
      if (e?.message?.includes("não configurado")) {
         alert("Configuração Incompleta: O Facebook App ID ou Redirect URI não estão configurados. Por favor, adicione as variáveis FACEBOOK_APP_ID e FACEBOOK_REDIRECT_URI na configuração de Ambiente/Servidor (.env).");
      } else {
         alert(`Falha ao iniciar autenticação com o Facebook: ${e?.message}`);
      }
    }
  };

  const toggleConnection = (clientId: string, network: 'facebook' | 'instagram') => {
    const client = clients.find(c => c.id === clientId);
    const isConnected = client?.socialAccounts?.[network]?.connected;
    
    if (!isConnected) {
      // Initiate real OAuth for both
      initiateFacebookAuth(clientId);
    } else {
      // Disconnect Mock - for MVP we just remove from state
      setClients(clients.map(c => {
        if (c.id === clientId) {
          const currentSocial = c.socialAccounts || {};
          return {
            ...c,
            socialAccounts: {
              ...currentSocial,
              [network]: { connected: false }
            }
          };
        }
        return c;
      }));
    }
  };

  const handleSave = async () => {
    if (!formData.clientId || !formData.content || formData.networks?.length === 0 || !formData.scheduledDate || !formData.scheduledTime) {
      alert("Preencha os campos obrigatórios (Cliente, Redes, Conteúdo, Data e Hora).");
      return;
    }

    // Verify if accounts are connected
    const client = clients.find(c => c.id === formData.clientId);
    if (!client) return;

    for (const network of formData.networks) {
      const isConnected = network === 'facebook' 
        ? client.socialAccounts?.facebook?.connected
        : client.socialAccounts?.instagram?.connected;
        
      if (!isConnected) {
        alert(`O cliente ${client.name} não possui a conta do ${network === 'facebook' ? 'Facebook' : 'Instagram'} conectada.`);
        return;
      }
    }

    const scheduledDateObj = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    const isPastOrNow = scheduledDateObj.getTime() <= Date.now() + 60000; // scheduled for past or less than 1 min
    
    // Only call API if we are actually publishing now, or if it's scheduling (Facebook expects unix timestamp for scheduling)
    let finalStatus: any = formData.status;
    
    if (formData.status === 'scheduled' || formData.status === 'published') {
       try {
         const scheduledTimeUnix = isPastOrNow ? undefined : Math.floor(scheduledDateObj.getTime() / 1000);
         const data = await api.post("/facebook/publish", {
             clientId: formData.clientId,
             networks: formData.networks,
             content: formData.content,
             mediaUrl: formData.mediaUrls?.[0],
             scheduledTimeUnix,
             selectedPageId: formData.selectedPageId,
             selectedIgAccountId: formData.selectedIgAccountId
         });
         
         if (data.success) {
           alert(isPastOrNow ? "Publicado com sucesso!" : "Agendado via API do Facebook com sucesso (Verifique limitações no Instagram).");
           finalStatus = isPastOrNow ? 'published' : 'scheduled';
         } else {
           alert("Erro ao publicar: " + JSON.stringify(data));
           finalStatus = 'failed';
         }
       } catch (e) {
         console.error(e);
         alert("Falha na chamada à API do Facebook.");
         finalStatus = 'failed';
       }
    }

    const newPost: SocialPost = {
      id: formData.id || Math.random().toString(36).substr(2, 9),
      clientId: formData.clientId,
      content: formData.content,
      mediaUrls: formData.mediaUrls || [],
      networks: formData.networks as ('facebook' | 'instagram')[],
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      status: finalStatus,
      createdAt: new Date().toISOString()
    };

    if (formData.id) {
      setPosts(posts.map(p => p.id === formData.id ? newPost : p));
    } else {
      setPosts([newPost, ...posts]);
    }
    
    setShowModal(false);
    setFormData({ networks: [], status: 'scheduled' });
  };

  const getClientName = (id: string) => {
    return clients.find(c => c.id === id)?.name || 'Cliente Desconhecido';
  };

  const isAdminOrOwner = ['ADMIN', 'OWNER'].includes(currentUser?.role);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Agendamento de Posts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie publicações para Facebook e Instagram (Estilo MLabs)</p>
        </div>
        <div className="flex space-x-3">
          {isAdminOrOwner && (
            <button
              onClick={() => setShowAccountsModal(true)}
              className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
            >
              <LinkIcon className="w-5 h-5 mr-2" />
              Conectar Redes
            </button>
          )}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mr-3">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`p-2 rounded ${view === 'calendar' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              <CalendarViewIcon className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => {
              setFormData({ networks: [], status: 'scheduled' });
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Post
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-xl flex items-start">
              <Info className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                As publicações serão agendadas e poderão ser enviadas automaticamente usando integrações (funcionalidade de envio automático em desenvolvimento).
              </p>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum post agendado</h3>
              <p className="text-gray-500 dark:text-gray-400">Comece criando sua primeira publicação.</p>
            </div>
          ) : view === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mídia</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Conteúdo</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Redes</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agendamento</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="py-4 pr-4">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                          {post.mediaUrls?.[0] ? (
                            <img src={post.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-sm font-medium text-gray-900 dark:text-white">
                        {getClientName(post.clientId)}
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 max-w-xs">{post.content}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex space-x-2">
                          {post.networks.includes('facebook') && <Facebook className="w-4 h-4 text-blue-600" />}
                          {post.networks.includes('instagram') && <Instagram className="w-4 h-4 text-pink-600" />}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{post.scheduledDate}</span>
                          <span className="text-xs text-gray-500">{post.scheduledTime}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${post.status === 'scheduled' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                            post.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            post.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {post.status === 'scheduled' ? 'Agendado' : post.status === 'published' ? 'Publicado' : post.status === 'failed' ? 'Falha' : 'Rascunho'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => { setFormData(post); setShowModal(true); }} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setPosts(posts.filter(p => p.id !== post.id))} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[600px] bg-white dark:bg-gray-800 p-4 rounded-xl">
              <Calendar
                localizer={localizer}
                events={posts.map(p => ({
                  id: p.id,
                  title: p.content,
                  start: new Date(`${p.scheduledDate}T${p.scheduledTime}`),
                  end: new Date(`${p.scheduledDate}T${p.scheduledTime}`),
                }))}
                startAccessor="start"
                endAccessor="end"
              />
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl flex overflow-hidden shadow-xl max-h-[90vh]">
            
            {/* Esquerda: Formulário */}
            <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                {formData.id ? 'Editar Post' : 'Criar Novo Post'}
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cliente</label>
                  <select 
                    value={formData.clientId || ''}
                    onChange={e => setFormData({...formData, clientId: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 mb-2 dark:text-white"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Redes Sociais</label>
                  <div className="flex flex-col space-y-4">
                    <div className="flex space-x-4">
                      <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition flex-1 ${formData.networks?.includes('facebook') ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={formData.networks?.includes('facebook') || false}
                          disabled={availableAccounts.pages.length === 0}
                          onChange={(e) => {
                            const n = formData.networks || [];
                            if (e.target.checked) setFormData({...formData, networks: [...n, 'facebook'] as any});
                            else setFormData({...formData, networks: n.filter(x => x !== 'facebook')});
                          }}
                        />
                        <Facebook className={`w-5 h-5 mr-2 ${formData.networks?.includes('facebook') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                        <span className={`text-sm ${formData.networks?.includes('facebook') ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>Facebook</span>
                      </label>
                      <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition flex-1 ${formData.networks?.includes('instagram') ? 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={formData.networks?.includes('instagram') || false}
                          disabled={availableAccounts.igAccounts.length === 0}
                          onChange={(e) => {
                            const n = formData.networks || [];
                            if (e.target.checked) setFormData({...formData, networks: [...n, 'instagram'] as any});
                            else setFormData({...formData, networks: n.filter(x => x !== 'instagram')});
                          }}
                        />
                        <Instagram className={`w-5 h-5 mr-2 ${formData.networks?.includes('instagram') ? 'text-pink-600 dark:text-pink-400' : 'text-gray-400'}`} />
                        <span className={`text-sm ${formData.networks?.includes('instagram') ? 'text-pink-700 dark:text-pink-300 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>Instagram</span>
                      </label>
                    </div>

                    {/* Account Selection */}
                    {formData.networks?.includes('facebook') && availableAccounts.pages.length > 0 && (
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Selecione a Página do Facebook</label>
                        <select
                          value={formData.selectedPageId || ''}
                          onChange={e => setFormData({...formData, selectedPageId: e.target.value})}
                          className="w-full text-sm px-3 py-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-1 focus:ring-blue-500 dark:text-white"
                        >
                          <option value="">Selecione uma página...</option>
                          {availableAccounts.pages.map(page => (
                            <option key={page.id} value={page.id}>{page.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formData.networks?.includes('instagram') && availableAccounts.igAccounts.length > 0 && (
                      <div className="bg-pink-50/50 dark:bg-pink-900/10 p-3 rounded-xl border border-pink-100 dark:border-pink-900/30">
                        <label className="block text-xs font-medium text-pink-800 dark:text-pink-300 mb-1">Selecione a Conta do Instagram</label>
                        <select
                          value={formData.selectedIgAccountId || ''}
                          onChange={e => setFormData({...formData, selectedIgAccountId: e.target.value})}
                          className="w-full text-sm px-3 py-2 bg-white dark:bg-gray-800 border border-pink-200 dark:border-pink-800 rounded-lg focus:ring-1 focus:ring-pink-500 dark:text-white"
                        >
                          <option value="">Selecione uma conta...</option>
                          {availableAccounts.igAccounts.map(ig => (
                            <option key={ig.igAccountId} value={ig.igAccountId}>{`@${ig.pageName}`}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Texto da Publicação</label>
                  <textarea 
                    value={formData.content || ''}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 h-32 resize-none dark:text-white"
                    placeholder="O que você quer compartilhar?"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mídia (URL da Imagem/Vídeo para preview)</label>
                  <input 
                    type="url" 
                    value={formData.mediaUrls?.[0] || ''}
                    onChange={e => setFormData({...formData, mediaUrls: [e.target.value]})}
                    placeholder="https://exemplo.com/imagem.png"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-2">Para o MVP, insira um link direto de imagem.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" /> Data
                    </label>
                    <input 
                      type="date" 
                      value={formData.scheduledDate || ''}
                      onChange={e => setFormData({...formData, scheduledDate: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-1" /> Hora
                    </label>
                    <input 
                      type="time" 
                      value={formData.scheduledTime || ''}
                      onChange={e => setFormData({...formData, scheduledTime: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Direita: Preview */}
            <div className="w-1/2 p-6 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center relative">
              <h4 className="absolute top-6 left-6 text-sm font-bold text-gray-400 uppercase tracking-widest">Preview</h4>
              
              <div className="w-full max-w-[320px] bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transform scale-95">
                {/* Instagram Header Mock */}
                <div className="flex items-center p-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">RM</span>
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">Sua Agência / Cliente</p>
                    <p className="text-xs text-gray-500">Patrocinado</p>
                  </div>
                </div>

                {/* Media Mock */}
                <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  {formData.mediaUrls?.[0] ? (
                    <img src={formData.mediaUrls[0]} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                  )}
                </div>

                {/* Content Mock */}
                <div className="p-4">
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap line-clamp-4">
                    {formData.content || 'Sua legenda aparecerá aqui...'}
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="absolute bottom-6 right-6 left-6 flex justify-end space-x-3 bg-gray-50 dark:bg-transparent pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, status: 'draft'});
                    setTimeout(handleSave, 0);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition font-medium"
                >
                  Salvar Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, status: 'published'});
                    setTimeout(handleSave, 0);
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition font-medium shadow-sm flex items-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publicar/Agendar via API
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAccountsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl flex overflow-hidden shadow-xl max-h-[90vh] flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <LinkIcon className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                Conectar Redes Sociais dos Clientes
              </h3>
              <button onClick={() => setShowAccountsModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <Trash2 className="w-6 h-6 hidden" /> {/* Espaçador */}
                X
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-50 dark:bg-gray-800/20 flex-1">
              <div className="grid gap-4">
                {clients.map(client => (
                  <div key={client.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg">{client.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{client.socialAccounts?.facebook?.connected || client.socialAccounts?.instagram?.connected ? 'Contas configuradas prontas para uso' : 'Nenhuma conta configurada ainda'}</p>
                    </div>
                    
                    <div className="flex space-x-3">
                      {/* Facebook Button */}
                      <button 
                        onClick={() => toggleConnection(client.id, 'facebook')}
                        className={`flex items-center px-4 py-2 rounded-xl transition border shadow-sm text-sm font-medium ${
                          client.socialAccounts?.facebook?.connected 
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 hover:bg-blue-100'
                            : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600'
                        }`}
                      >
                        <Facebook className="w-4 h-4 mr-2" />
                        {client.socialAccounts?.facebook?.connected ? 'Conectado' : 'Conectar FB'}
                      </button>

                      {/* Instagram Button */}
                      <button 
                        onClick={() => toggleConnection(client.id, 'instagram')}
                        className={`flex items-center px-4 py-2 rounded-xl transition border shadow-sm text-sm font-medium ${
                          client.socialAccounts?.instagram?.connected 
                            ? 'bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-900/30 dark:border-pink-800 dark:text-pink-400 hover:bg-pink-100'
                            : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:border-pink-500 hover:text-pink-600'
                        }`}
                      >
                        <Instagram className="w-4 h-4 mr-2" />
                        {client.socialAccounts?.instagram?.connected ? 'Conectado' : 'Conectar IG'}
                      </button>
                    </div>
                  </div>
                ))}
                {clients.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Nenhum cliente cadastrado ainda.
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setShowAccountsModal(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
