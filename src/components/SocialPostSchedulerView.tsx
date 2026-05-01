import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Calendar as CalendarIcon, Clock, Image as ImageIcon, Send, Instagram, Facebook, Check, AlertCircle, Trash2, Edit2, Info, Link as LinkIcon, List, Calendar as CalendarViewIcon } from 'lucide-react';
import { Client } from '../types';
import { api } from '../services/api';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'pt-BR': ptBR },
});

const DnDCalendar = withDragAndDrop(Calendar);


interface SocialPost {
  id: string;
  clientId: string;
  content: string;
  externalLink?: string;
  hashtags?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  postMedia?: {
    id: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    format: 'feed' | 'stories' | 'reels';
  }[];
  postSchedules?: {
    id: string;
    socialAccountId: string;
    scheduledAt: string;
    status: 'scheduled' | 'published' | 'failed';
    errorMessage?: string;
  }[];
  createdAt: string;
}

interface SocialAccount {
  id: string;
  clientId: string;
  platform: 'facebook' | 'instagram';
  platformAccountId: string;
  platformAccountName: string;
  isActive: boolean;
}

interface SocialPostSchedulerViewProps {
  clients: Client[];
  currentUser: any;
}

export function SocialPostSchedulerView({ clients: initialClients, currentUser }: SocialPostSchedulerViewProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [formData, setFormData] = useState<any>({
    networks: [],
    media: [],
    schedules: []
  });

  const [availableAccounts, setAvailableAccounts] = useState<{pages: any[], igAccounts: any[]}>({pages: [], igAccounts: []});

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [postsData, accountsData] = await Promise.all([
        api.get('/social-posts'),
        api.get('/social-accounts')
      ]);
      setPosts(postsData || []);
      setSocialAccounts(accountsData || []);
    } catch (err) {
      console.error("Erro ao buscar dados do agendador:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  useEffect(() => {
    if (formData.client_id) {
      api.get(`/facebook/status/${formData.client_id}`).then(status => {
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
  }, [formData.client_id]);

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
    if (!formData.client_id || !formData.content || (formData.schedules || []).length === 0) {
      alert("Preencha os campos obrigatórios (Cliente, Conteúdo e Agendamento).");
      return;
    }

    try {
      await api.post("/social-posts", {
        ...formData,
        media: (formData.media || []).map((url: string) => ({ media_url: url, media_type: 'image', format: 'feed' }))
      });
      
      alert(formData.id ? "Post atualizado com sucesso!" : "Post criado e agendado com sucesso!");
      fetchData();
      setShowModal(false);
      setFormData({ networks: [], media: [], schedules: [], status: 'scheduled' });
    } catch (e: any) {
      console.error(e);
      alert("Falha ao salvar post: " + e.message);
    }
  };

  const getClientName = (id: string) => {
    return clients.find(c => c.id === id)?.name || 'Cliente Desconhecido';
  };

  const getAccountsForClient = (clientId: string) => {
    return socialAccounts.filter(acc => acc.clientId === clientId);
  };

  const isAdminOrOwner = ['ADMIN', 'OWNER'].includes(currentUser?.role);
  
  const moveEvent = async ({ event, start }: any) => {
    try {
      await api.patch(`/social-posts/${event.id}/reschedule`, {
        scheduled_at: start
      });
      fetchData();
    } catch (err) {
      console.error("Erro ao reagendar post:", err);
      alert("Falha ao reagendar post.");
    }
  };

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
              setFormData({ networks: [], media: [], schedules: [], status: 'scheduled' });
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
                          {post.postMedia?.[0]?.mediaUrl ? (
                            <img src={post.postMedia?.[0]?.mediaUrl} alt="" className="w-full h-full object-cover" />
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
                          {post.postSchedules?.some(s => {
                            const acc = socialAccounts.find(a => a.id === s.socialAccountId);
                            return acc?.platform === 'facebook';
                          }) && <Facebook className="w-4 h-4 text-blue-600" />}
                          {post.postSchedules?.some(s => {
                            const acc = socialAccounts.find(a => a.id === s.socialAccountId);
                            return acc?.platform === 'instagram';
                          }) && <Instagram className="w-4 h-4 text-pink-600" />}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {post.postSchedules?.[0]?.scheduledAt ? format(new Date(post.postSchedules[0].scheduledAt), 'dd/MM/yyyy') : 'N/A'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {post.postSchedules?.[0]?.scheduledAt ? format(new Date(post.postSchedules[0].scheduledAt), 'HH:mm') : '-'}
                          </span>
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
                          <button onClick={() => { 
                            setFormData({
                              ...post,
                              client_id: post.clientId,
                              media: post.postMedia?.map(m => m.mediaUrl) || [],
                              schedules: post.postSchedules?.map(s => ({
                                social_account_id: s.socialAccountId,
                                scheduled_at: s.scheduledAt
                              })) || []
                            }); 
                            setShowModal(true); 
                          }} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
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
            <div className="h-[700px] bg-white dark:bg-gray-800 p-4 rounded-xl shadow-inner border border-gray-100 dark:border-gray-700">
              <DnDCalendar
                localizer={localizer}
                events={posts.map(p => {
                  const firstSchedule = p.postSchedules?.[0];
                  const date = firstSchedule ? new Date(firstSchedule.scheduledAt) : new Date();
                  return {
                    id: p.id,
                    title: p.content,
                    start: date,
                    end: date,
                    resource: p
                  };
                })}
                startAccessor={(event: any) => event.start}
                endAccessor={(event: any) => event.end}
                draggableAccessor={() => true}
                onEventDrop={moveEvent}
                resizable={false}
                messages={{
                  next: "Próximo",
                  previous: "Anterior",
                  today: "Hoje",
                  month: "Mês",
                  week: "Semana",
                  day: "Dia"
                }}
                className="rounded-lg overflow-hidden"
              />
            </div>
          )}
        </div>
      </div>


      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl flex overflow-hidden shadow-xl max-h-[95vh]">
            
            {/* Esquerda: Formulário */}
            <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {formData.id ? 'Editar Publicação' : 'Nova Publicação Multi-Rede'}
                </h3>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cliente Alvo</label>
                    <select 
                      value={formData.client_id || ''}
                      onChange={e => setFormData({...formData, client_id: e.target.value, schedules: []})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    >
                      <option value="">Selecione o Cliente</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Link Externo (Opcional)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input 
                        type="url" 
                        value={formData.external_link || ''}
                        onChange={e => setFormData({...formData, external_link: e.target.value})}
                        placeholder="https://suapagina.com"
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Legenda Oficial</label>
                    <span className="text-xs text-gray-500">{formData.content?.length || 0}/2200</span>
                  </div>
                  <textarea 
                    value={formData.content || ''}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 h-32 resize-none dark:text-white text-sm"
                    placeholder="Escreva sua legenda aqui... Use #hashtags para maior alcance."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Canais de Publicação & Agendamento</label>
                  {!formData.client_id ? (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center text-sm text-gray-500 border border-dashed border-gray-200 dark:border-gray-700">
                      Selecione um cliente para ver as contas conectadas.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getAccountsForClient(formData.client_id).map(acc => {
                        const existingSchedule = (formData.schedules || []).find((s: any) => s.social_account_id === acc.id);
                        return (
                          <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center">
                              <div className={`p-2 rounded-lg mr-3 ${acc.platform === 'facebook' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                {acc.platform === 'facebook' ? <Facebook size={18} /> : <Instagram size={18} />}
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{acc.platformAccountName}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              {existingSchedule ? (
                                <div className="flex items-center space-x-2">
                                  <input 
                                    type="datetime-local" 
                                    value={existingSchedule.scheduled_at?.substring(0, 16)}
                                    onChange={(e) => {
                                      const newSchedules = (formData.schedules || []).map((s: any) => 
                                        s.social_account_id === acc.id ? { ...s, scheduled_at: e.target.value } : s
                                      );
                                      setFormData({...formData, schedules: newSchedules});
                                    }}
                                    className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:text-white"
                                  />
                                  <button 
                                    onClick={() => setFormData({...formData, schedules: (formData.schedules || []).filter((s: any) => s.social_account_id !== acc.id)})}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setFormData({...formData, schedules: [...(formData.schedules || []), { social_account_id: acc.id, scheduled_at: new Date(Date.now() + 3600000).toISOString().substring(0, 16) }]})}
                                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  + Agendar nesta conta
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mídia Principal (URL)</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="url" 
                      value={formData.media?.[0] || ''}
                      onChange={e => setFormData({...formData, media: [e.target.value]})}
                      placeholder="https://exemplo.com/imagem.png"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Direita: Preview Realista */}
            <div className="w-1/2 p-8 bg-gray-50 dark:bg-gray-800/40 flex flex-col items-center justify-between relative overflow-y-auto">
              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8 text-center italic">Preview Mobile (Simulado)</h4>
                
                <div className="w-full max-w-[340px] bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border-[10px] border-gray-900 dark:border-gray-950 overflow-hidden aspect-[9/18.5] flex flex-col relative">
                  {/* Phone Notch/Status Bar */}
                  <div className="h-10 w-full flex items-center justify-between px-8 pt-4">
                    <span className="text-[10px] font-bold text-gray-900 dark:text-white">9:41</span>
                    <div className="flex space-x-1 items-center">
                      <div className="w-4 h-2 bg-gray-900 dark:bg-white rounded-full"></div>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="flex items-center px-4 py-3 border-b border-gray-50 dark:border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                      <div className="w-full h-full rounded-full bg-white dark:bg-black p-[2px]">
                         <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                            <Instagram size={14} className="text-pink-500" />
                         </div>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Publicidade</p>
                      <p className="text-[10px] text-gray-400">Patrocinado</p>
                    </div>
                  </div>

                  {/* Media */}
                  <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {formData.media?.[0] ? (
                      <img src={formData.media?.[0]} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-8">
                        <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-[10px] text-gray-400 font-medium italic">Insira uma URL de mídia para visualizar o preview</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-4 flex flex-col flex-1 overflow-hidden">
                    <div className="flex space-x-4 mb-3">
                      <div className="w-5 h-5 border-2 border-gray-900 dark:border-white rounded-full"></div>
                      <div className="w-5 h-5 border-2 border-gray-900 dark:border-white rounded"></div>
                      <div className="w-5 h-5 border-2 border-gray-900 dark:border-white rounded-tr-lg"></div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                      <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                        <span className="font-bold mr-2 text-[11px]">Sua Empresa</span>
                        {formData.content || 'Sua legenda aparecerá aqui...'}
                        {formData.external_link && <span className="block text-blue-500 mt-1">{formData.external_link}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações do Modal */}
              <div className="w-full flex justify-end space-x-3 pt-8 border-t border-gray-100 dark:border-gray-800 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={(formData.schedules || []).length === 0}
                  onClick={handleSave}
                  className="px-8 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none flex items-center"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Salvar e Agendar
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
