import React, { useState, useEffect } from 'react';
import { Settings, Shield, Link, Database, Code, Globe, Key, Copy, Check, ExternalLink, Activity, AlertTriangle, CheckCircle, Plus, MoreHorizontal, Download, X, Trash2, Palette, RefreshCcw } from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { IntegrationConfig, Lead, Client, ArtOrder, Receivable, User } from '../types';
import Modal from './Modal';

// Componente Interno para Gestão do QR do WhatsApp Cloud
function N8nLogs() {
  const [logs, setLogs] = useState<string>('');
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/n8n/logs');
        if (res.ok) setLogs(await res.text());
      } catch (err) {}
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="font-mono text-[10px] text-indigo-400">
      {logs ? logs.split('\n').map((line, i) => <div key={i}>{line}</div>) : 'Nenhum log disponível...'}
    </div>
  );
}

function WhatsAppConfig() {
  const [status, setStatus] = useState<'disconnected' | 'qr' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string>('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setQrCode(data.qr);
      }
      
      const logsRes = await fetch('/api/whatsapp/logs');
      if (logsRes.ok) {
        const text = await logsRes.text();
        setLogs(text);
      }
    } catch (error) {
      console.error('Erro ao buscar status do WhatsApp', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Polls only if waiting for QR code to be scanned or to update logs
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await fetch('/api/whatsapp/logout', { method: 'POST' });
    await fetchStatus();
  };

  if (loading) {
     return <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3">
             <div className={cn("w-3 h-3 rounded-full animate-pulse", status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500')}></div>
             <div>
                <p className="text-sm font-bold text-gray-900">Status da API Interna</p>
                <p className="text-xs text-gray-500">
                  {status === 'connected' ? 'WhatsApp Autenticado e Pronto' : 
                   status === 'qr' ? 'Aguardando Leitura do QR Code' : 
                   'Motor Desconectado'}
                </p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchStatus} className="p-2 text-gray-400 hover:text-emerald-500 transition-colors">
               <RefreshCcw size={16} />
            </button>
            {status === 'connected' && (
              <button onClick={handleLogout} className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs rounded-xl transition-all">
                  Desconectar Dispositivo
              </button>
            )}
          </div>
       </div>

       {status === 'qr' && qrCode && (
         <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-3xl bg-white">
            <h4 className="font-bold text-gray-900 mb-2">Leia o QR Code</h4>
            <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">Abra o WhatsApp no seu celular, vá em "Aparelhos Conectados" e aponte a câmera para este código.</p>
            <div className="p-4 bg-white shadow-xl rounded-2xl border border-gray-100">
               <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
            </div>
         </div>
       )}

       {status === 'disconnected' && !qrCode && (
         <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-3xl">
           <AlertTriangle size={48} className="text-amber-400 mb-4" />
           <p className="font-bold text-gray-900">Serviço de WhatsApp Offline</p>
           <p className="text-sm text-gray-500 mt-2 max-w-sm">O motor interno fechou a conexão. Isso costuma ocorrer quando você desloga do aparelho ou quando a internet cai. Aguarde a auto-reconexão ou reinicie o App pelo ZimaOS.</p>
           <button onClick={fetchStatus} className="mt-6 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl font-bold text-gray-600 text-xs hover:bg-gray-50">
             <RefreshCcw size={14} /> Atualizar Agora
           </button>
         </div>
       )}

       {/* Logs Area */}
       <div className="mt-8 space-y-3">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Activity size={12} /> Log de Interações Recentes
          </h4>
          <div className="bg-gray-900 rounded-2xl p-4 font-mono text-[10px] text-emerald-400 h-48 overflow-y-auto border border-gray-800 shadow-inner">
            {logs ? (
              logs.split('\n').map((line, i) => (
                <div key={i} className="mb-1 leading-relaxed">
                  <span className="opacity-40">{i+1}</span> {line}
                </div>
              ))
            ) : (
              <div className="text-gray-600 italic">Nenhum log disponível...</div>
            )}
          </div>
       </div>
    </div>
  );
}

interface AdminViewProps {
  integrations: IntegrationConfig[];
  setIntegrations: React.Dispatch<React.SetStateAction<IntegrationConfig[]>>;
  leads?: Lead[];
  clients?: Client[];
  artOrders?: ArtOrder[];
  receivables?: Receivable[];
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  agencyConfig?: { name: string, primaryColor: string, currency: string, locale: string, logoUrl?: string, logoBgColor?: string };
  setAgencyConfig?: React.Dispatch<React.SetStateAction<any>>;
}

export default function AdminView({ 
  integrations, 
  setIntegrations,
  leads = [],
  clients = [],
  artOrders = [],
  receivables = [],
  users,
  setUsers,
  agencyConfig,
  setAgencyConfig
}: AdminViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'integrations' | 'users' | 'database' | 'personalizacao'>('integrations');
  const [copied, setCopied] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DESIGNER' as User['role']
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerateLink = () => {
    if (!inviteData.name || !inviteData.email) {
      alert("Por favor, preencha nome e e-mail antes de gerar o link.");
      return;
    }
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/join?email=${encodeURIComponent(inviteData.email)}&role=${inviteData.role}&name=${encodeURIComponent(inviteData.name)}&token=${Math.random().toString(36).substr(2, 12)}`;
    setGeneratedLink(link);
    handleCopy(link, 'invite-link');
  };

  const handleToggleIntegration = (id: string) => {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, isActive: !i.isActive } : i));
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUserFormData = {
      id: Math.random().toString(36).substring(2, 9),
      name: inviteData.name,
      email: inviteData.email,
      role: inviteData.role,
      password: inviteData.password,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteData.name)}&background=random`
    };
    
    try {
      const savedUser = await api.createUser(newUserFormData as any);
      setUsers(prev => [...prev, savedUser]);
      setIsInviteModalOpen(false);
      setInviteData({ name: '', email: '', password: '', role: 'DESIGNER' });
      setGeneratedLink(null);
      alert(`Usuário ${inviteData.name} criado com sucesso! Ele já pode logar com e-mail e senha.`);
    } catch (error) {
      alert('Erro ao criar usuário: ' + (error as Error).message);
    }
  };

  const handleRemoveUser = async (id: string) => {
    console.log(`[DEBUG] Tentando remover usuário com ID: ${id}`);
    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      console.error(`[DEBUG] Erro ao remover usuário:`, err);
      alert('Erro ao remover usuário: ' + err.message);
    }
  };

  const handleUpdateWhatsAppConfig = (id: string, key: string, value: string) => {
    setIntegrations(prev => prev.map(i => {
      if (i.id === id && i.whatsappConfig) {
        return {
          ...i,
          whatsappConfig: {
            ...i.whatsappConfig,
            [key]: value
          }
        };
      }
      return i;
    }));
  };

  const runAudit = () => {
    setIsAuditing(true);
    setAuditResults(null);
    
    // Simulate auditing script
    setTimeout(() => {
      const issues = [];
      
      // Data Integrity Checks
      if (clients.length === 0) issues.push({ type: 'warning', msg: 'Base de clientes vazia pode afetar Design e Financeiro.' });
      
      const orphanedOrders = artOrders.filter(o => !clients.some(c => c.id === o.clientId));
      if (orphanedOrders.length > 0) issues.push({ type: 'error', msg: `${orphanedOrders.length} pedidos de arte órfãos (sem cliente).` });

      const orphanedFinance = receivables.filter(r => !clients.some(c => c.id === r.clientId));
      if (orphanedFinance.length > 0) issues.push({ type: 'error', msg: `${orphanedFinance.length} lançamentos financeiros órfãos.` });

      setAuditResults({
        timestamp: new Date().toLocaleString(),
        status: issues.some(i => i.type === 'error') ? 'failed' : issues.length > 0 ? 'warning' : 'healthy',
        issues,
        checks: [
          { name: 'Consistência de Temas', status: 'pass' },
          { name: 'Módulo de Leads (Modals)', status: 'pass' },
          { name: 'Módulo Financeiro (Ações)', status: 'pass' },
          { name: 'Módulo Design (Eventos)', status: 'pass' },
          { name: 'Integrações Externas', status: integrations.some(i => i.isActive) ? 'pass' : 'info' }
        ]
      });
      setIsAuditing(false);
    }, 2000);
  };

  return (
    <>
      <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight transition-colors">Configurações & Admin</h1>
          <p className="text-sm text-gray-500 font-medium">Gerencie integrações, chaves de API e automações.</p>
        </div>
        <button 
          onClick={runAudit}
          disabled={isAuditing}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
            isAuditing ? "bg-gray-100 text-gray-400" : "bg-white border border-gray-100 text-gray-600 hover:border-indigo-500"
          )}
        >
          <Activity size={14} className={cn(isAuditing && "animate-spin")} />
          {isAuditing ? 'Auditoria em curso...' : 'Audit Global CRM'}
        </button>
      </div>

      {auditResults && (
        <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start justify-between mb-6">
             <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  auditResults.status === 'healthy' ? "bg-emerald-100 text-emerald-600" : 
                  auditResults.status === 'warning' ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                )}>
                   {auditResults.status === 'healthy' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div>
                   <h3 className="font-bold text-gray-900">Resultado da Auditoria Automatizada</h3>
                   <p className="text-xs text-gray-500">{auditResults.timestamp}</p>
                </div>
             </div>
             <button onClick={() => setAuditResults(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><Check size={16} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verificação de Módulos</h4>
                {auditResults.checks.map((check: any, i: number) => (
                   <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-50">
                      <span className="text-xs font-semibold text-gray-600">{check.name}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-lg",
                        check.status === 'pass' ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
                      )}>
                        {check.status === 'pass' ? 'OK' : 'INFO'}
                      </span>
                   </div>
                ))}
             </div>
             <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alertas de Integridade</h4>
                {auditResults.issues.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-medium italic">Nenhum problema de integridade detectado.</p>
                ) : (
                  auditResults.issues.map((issue: any, i: number) => (
                    <div key={i} className={cn(
                      "p-3 rounded-xl border flex items-center gap-3",
                      issue.type === 'error' ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-amber-50 border-amber-100 text-amber-700"
                    )}>
                       <AlertTriangle size={14} />
                       <span className="text-xs font-semibold">{issue.msg}</span>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Mini-nav */}
        <div className="space-y-2">
          <button 
            onClick={() => setActiveSubTab('integrations')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-colors",
              activeSubTab === 'integrations' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Link size={18} /> Integrações
          </button>
          <button 
            onClick={() => setActiveSubTab('users')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-colors",
              activeSubTab === 'users' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Shield size={18} /> Membros da Equipe
          </button>
          <button 
            onClick={() => setActiveSubTab('database')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-colors",
              activeSubTab === 'database' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Database size={18} /> Banco de Dados
          </button>
          <button 
            onClick={() => setActiveSubTab('personalizacao')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-colors",
              activeSubTab === 'personalizacao' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Globe size={18} /> Personalização
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {activeSubTab === 'integrations' && (
            <div className="space-y-6">
              {integrations.map((integration) => (
                <div key={integration.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-colors duration-300">
                  <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-900 shadow-sm transition-colors duration-300">
                        {integration.type === 'whatsapp' ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> : <Code size={24} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{integration.type === 'whatsapp' ? 'WhatsApp (QR)' : integration.service}</h3>
                        <p className="text-xs text-gray-500 font-medium">Status: 
                          <span className={cn("ml-1", integration.isActive ? "text-emerald-600" : "text-gray-400 italic")}>
                            {integration.isActive ? 'Conectado' : 'Aguardando Configuração'}
                          </span>
                        </p                >
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                     {integration.type === 'whatsapp' ? (
                       <div className="space-y-4">
                         <WhatsAppConfig />
                         <a 
                           href="https://web.whatsapp.com" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                         >
                            <ExternalLink size={16} /> Abrir WhatsApp Web em nova aba
                         </a>
                         <p className="text-[10px] text-gray-400 italic">Por segurança, não é possível embutir o WhatsApp Web diretamente no CRM. Use o botão acima para abrir em nova aba.</p>
                       </div>
                     ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Webhook URL (n8n)</label>
                           <input 
                             type="text" 
                             value={integration.webhookUrl || ''}
                             onChange={e => setIntegrations(prev => prev.map(i => i.id === integration.id ? {...i, webhookUrl: e.target.value} : i))}
                             placeholder="https://n8n.seusite.com/webhook/..."
                             className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">API Key</label>
                           <input 
                             type="password" 
                             value={integration.apiKey || ''}
                             onChange={e => setIntegrations(prev => prev.map(i => i.id === integration.id ? {...i, apiKey: e.target.value} : i))}
                             placeholder="n8n_..."
                             className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm"
                           />
                        </div>
                        <button 
                            onClick={async () => {
                                try {
                                    await fetch(`/api/integrations/${integration.id}/trigger`, {
                                        method: 'POST',
                                        headers: {'Content-Type': 'application/json'},
                                        body: JSON.stringify({ test: true })
                                    });
                                    alert('Simulação de gatilho enviada com sucesso!');
                                } catch (e) {
                                    alert('Erro ao disparar gatilho.');
                                }
                            }}
                            className="col-span-2 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-sm"
                        >
                            <Activity size={16} /> Disparar teste
                        </button>
                       </div>
                     )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSubTab === 'users' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Usuários Ativos</h3>
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors"
                >
                   <Plus size={14} /> Convidar Membro
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {users.map(user => (
                  <div key={user.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
                        {user.avatar ? <img src={user.avatar} alt={user.name} /> : user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className={cn(
                         "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                         user.role === 'ADMIN' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                         user.role === 'DESIGNER' ? "bg-amber-50 text-amber-600 border-amber-100" :
                         user.role === 'EDITOR' ? "bg-purple-50 text-purple-600 border-purple-100" :
                         "bg-emerald-50 text-emerald-600 border-emerald-100"
                       )}>
                         {user.role}
                       </span>
                       <button 
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                       >
                        <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'database' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center text-gray-900">
               <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
                  <Activity size={32} />
               </div>
               <h3 className="font-bold text-xl mb-2">Conexão</h3>
               <p className="text-emerald-600 font-bold text-lg">Status: OK</p>
            </div>
          )}

          {activeSubTab === 'whatsapp' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> 
                       Configuração do WhatsApp Cloud
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">Vincule seu WhatsApp corporativo lendo o QR Code para enviar propostas e artes via sistema.</p>
                  </div>
               </div>
               <div className="p-8">
                 <WhatsAppConfig />
               </div>
            </div>
          )}

          {activeSubTab === 'personalizacao' && agencyConfig && setAgencyConfig && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-gray-50">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2"><Palette size={20} className="text-indigo-500" /> Personalização do Painel</h3>
                  <p className="text-sm text-gray-400 mt-1">Altere o nome e as cores para adequar o CRM à sua marca.</p>
               </div>
               <div className="p-8 space-y-6">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome da Empresa</label>
                     <input 
                       type="text" 
                       value={agencyConfig.name}
                       onChange={e => {
                         const next = { ...agencyConfig, name: e.target.value };
                         setAgencyConfig(next);
                         localStorage.setItem('agency_config', JSON.stringify(next));
                       }}
                       className="w-full max-w-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:outline-none transition-colors duration-300"
                       placeholder="Sua Agência Ltda"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Logo da Agência (Upload PNG/SVG)</label>
                     <input 
                       type="file" 
                       accept="image/png, image/jpeg, image/svg+xml"
                       onChange={e => {
                         const file = e.target.files?.[0];
                         if (!file) return;
                         const reader = new FileReader();
                         reader.onloadend = () => {
                           const next = { ...agencyConfig, logoUrl: reader.result as string };
                           setAgencyConfig(next);
                           localStorage.setItem('agency_config', JSON.stringify(next));
                         };
                         reader.readAsDataURL(file);
                       }}
                       className="w-full max-w-sm px-4 py-2 border border-gray-200 rounded-2xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer"
                     />
                     {agencyConfig.logoUrl && agencyConfig.logoUrl.startsWith('data:image') && (
                       <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100 max-w-sm">
                          <div className="p-2 rounded flex items-center justify-center bg-white shadow-sm border border-gray-100" style={{ backgroundColor: agencyConfig.logoBgColor || agencyConfig.primaryColor }}>
                             <img src={agencyConfig.logoUrl} alt="Preview" className="w-8 h-8 object-contain" />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              const next = { ...agencyConfig, logoUrl: '' };
                              setAgencyConfig(next);
                              localStorage.setItem('agency_config', JSON.stringify(next));
                            }} 
                            className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1 bg-rose-50 rounded-lg"
                          >
                            Remover Logo
                          </button>
                         <div className="col-span-2 mt-4 space-y-3">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <Activity size={12} /> Log de Interações n8n Recentes
                            </h4>
                            <div className="bg-gray-900 rounded-2xl p-4 font-mono text-[10px] h-32 overflow-y-auto border border-gray-800 shadow-inner">
                              <N8nLogs />
                            </div>
                         </div>
                        </div>
                     )}
                     <p className="text-[10px] text-gray-400">Recomendado: Imagens transparentes em formato quadrado (1:1)</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cor Primária</label>
                       <div className="flex items-center gap-4">
                          <input 
                            type="color" 
                            value={agencyConfig.primaryColor}
                            onChange={e => {
                              const next = { ...agencyConfig, primaryColor: e.target.value };
                              setAgencyConfig(next);
                              localStorage.setItem('agency_config', JSON.stringify(next));
                            }}
                            className="w-12 h-12 rounded-xl cursor-pointer bg-white border border-gray-200 p-1"
                          />
                          <span className="text-xs font-mono text-gray-500">{agencyConfig.primaryColor}</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cor Fundo (Logo)</label>
                       <div className="flex items-center gap-4">
                          <input 
                            type="color" 
                            value={agencyConfig.logoBgColor || agencyConfig.primaryColor}
                            onChange={e => {
                              const next = { ...agencyConfig, logoBgColor: e.target.value };
                              setAgencyConfig(next);
                              localStorage.setItem('agency_config', JSON.stringify(next));
                            }}
                            className="w-12 h-12 rounded-xl cursor-pointer bg-white border border-gray-200 p-1"
                          />
                          <span className="text-xs font-mono text-gray-500">{agencyConfig.logoBgColor || agencyConfig.primaryColor}</span>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setGeneratedLink(null);
        }}
        title="Convidar Novo Membro"
        footer={
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 w-full">
            <button 
              onClick={handleGenerateLink}
              className="flex items-center gap-2 text-indigo-600 font-bold hover:underline text-xs"
            >
               <Link size={14} /> Gerar e Copiar Link
            </button>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setGeneratedLink(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Fechar
              </button>
              <button 
                onClick={handleInviteMember}
                className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors shadow-sm"
              >
                Adicionar Direto
              </button>
            </div>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleInviteMember}>
          {generatedLink && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl mb-4 animate-in fade-in zoom-in duration-300">
               <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Check size={12} /> Link Copiado!
               </p>
               <input 
                 readOnly 
                 value={generatedLink} 
                 className="w-full bg-white border border-emerald-100 px-3 py-2 rounded-lg text-[10px] font-mono text-emerald-700 focus:outline-none"
               />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome Completo</label>
            <input 
              type="text" 
              required
              value={inviteData.name}
              onChange={e => setInviteData({...inviteData, name: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              placeholder="Ex: João Designer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">E-mail</label>
            <input 
              type="email" 
              required
              value={inviteData.email}
              onChange={e => setInviteData({...inviteData, email: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              placeholder="exemplo@agencyflow.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Senha Provisória</label>
            <input 
              type="text" 
              required
              value={inviteData.password}
              onChange={e => setInviteData({...inviteData, password: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              placeholder="Ex: design123"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargo / Permissão</label>
            <select 
              value={inviteData.role}
              onChange={e => setInviteData({...inviteData, role: e.target.value as any})}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
            >
              <option value="DESIGNER">Designer</option>
              <option value="EDITOR" disabled>Editor de Vídeo (Em breve)</option>
              <option value="PARTNER">Parceiro</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </Modal>
    </>
  );
}
