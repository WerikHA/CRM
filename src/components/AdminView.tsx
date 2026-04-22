import React, { useState } from 'react';
import { Settings, Shield, Link, Database, Code, Globe, Key, Copy, Check, ExternalLink, Activity, AlertTriangle, CheckCircle, Plus, MoreHorizontal, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { IntegrationConfig, Lead, Client, ArtOrder, Receivable, User } from '../types';

interface AdminViewProps {
  integrations: IntegrationConfig[];
  setIntegrations: React.Dispatch<React.SetStateAction<IntegrationConfig[]>>;
  leads?: Lead[];
  clients?: Client[];
  artOrders?: ArtOrder[];
  receivables?: Receivable[];
  users: User[];
}

export default function AdminView({ 
  integrations, 
  setIntegrations,
  leads = [],
  clients = [],
  artOrders = [],
  receivables = [],
  users
}: AdminViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'integrations' | 'users' | 'database'>('integrations');
  const [copied, setCopied] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<any>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleToggleIntegration = (id: string) => {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, isActive: !i.isActive } : i));
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
            <Link size={18} /> Integrações n8n / Zapier
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
            <Database size={18} /> Backup & Banco de Dados
          </button>
          <button className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold text-sm text-left transition-colors opacity-50 cursor-not-allowed">
            <Globe size={18} /> White-label & Domínio
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {activeSubTab === 'integrations' && integrations.map((integration) => (
            <div key={integration.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-colors duration-300">
               {/* ... rest of integration card ... */}
              <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-900 shadow-sm transition-colors duration-300">
                    <Code size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{integration.service}</h3>
                    <p className="text-xs text-gray-500 font-medium">Status: 
                      <span className={cn("ml-1", integration.isActive ? "text-emerald-600" : "text-gray-400 italic")}>
                        {integration.isActive ? 'Conectado' : 'Aguardando Configuração'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                      Docs de API <ExternalLink size={12} />
                   </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {integration.type === 'whatsapp' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        ID do Número de Telefone
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ex: 123456789012345"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono text-gray-600 focus:outline-none transition-colors duration-300"
                        value={integration.whatsappConfig?.phoneNumberId || ''}
                        onChange={(e) => handleUpdateWhatsAppConfig(integration.id, 'phoneNumberId', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        ID da Conta Business
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ex: 987654321098765"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono text-gray-600 focus:outline-none transition-colors duration-300"
                        value={integration.whatsappConfig?.businessAccountId || ''}
                        onChange={(e) => handleUpdateWhatsAppConfig(integration.id, 'businessAccountId', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        Token de Acesso Temporário ou Permanente
                      </label>
                      <div className="relative group">
                        <input 
                          type="password" 
                          placeholder="Token da API do Facebook Graph"
                          className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono text-gray-600 focus:outline-none transition-colors duration-300"
                          value={integration.whatsappConfig?.accessToken || ''}
                          onChange={(e) => handleUpdateWhatsAppConfig(integration.id, 'accessToken', e.target.value)}
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600 transition-all">
                          <Key size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Globe size={12} /> Webhook URL
                      </label>
                      <div className="relative group">
                        <input 
                          type="text" 
                          readOnly={true}
                          value={integration.webhookUrl || 'https://seu-vps-n8n.com/webhook/agencyflow-trigger'} 
                          className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono text-gray-600 focus:outline-none transition-all duration-300"
                        />
                        <button 
                          onClick={() => handleCopy(integration.webhookUrl || 'https://seu-vps-n8n.com/webhook/agencyflow-trigger', 'url-' + integration.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600 transition-all"
                        >
                          {copied === 'url-' + integration.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Key size={12} /> API Key / Secret
                      </label>
                      <div className="relative group">
                        <input 
                          type="password" 
                          readOnly={true}
                          value="••••••••••••••••••••••••" 
                          className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono text-gray-600 focus:outline-none transition-all duration-300"
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600 transition-all">
                          <Key size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs",
                      integration.type === 'whatsapp' ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
                    )}>
                      {integration.type === 'whatsapp' ? 'WPP' : 'n8n'}
                    </div>
                    <p className="text-xs text-gray-500 max-w-[250px]">
                      {integration.type === 'whatsapp' 
                        ? 'Envie artes para aprovação e receba feedback automático via API oficial do WhatsApp.' 
                        : 'Use esta URL no seu workflow do n8n para receber notificações de novos leads e pedidos de arte.'}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleToggleIntegration(integration.id)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm",
                      integration.isActive 
                        ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                        : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                    )}
                  >
                    {integration.isActive ? 'Desativar Integração' : 'Ativar Integração'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {activeSubTab === 'users' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Usuários Ativos</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors">
                   <Plus size={14} /> Convidar Membro
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {users.map(user => (
                  <div key={user.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {user.name.substring(0, 2).toUpperCase()}
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
                         "bg-emerald-50 text-emerald-600 border-emerald-100"
                       )}>
                         {user.role}
                       </span>
                       <button className="p-2 text-gray-300 hover:text-gray-500 transition-colors"><MoreHorizontal size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'database' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
                 <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
                    <Database size={32} />
                 </div>
                 <h3 className="font-bold text-gray-900 text-xl mb-2">Monitoramento de Postgres</h3>
                 <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8">
                    Seu banco de dados está sincronizado e operando em um container Docker isolado. Backups automáticos ocorrem a cada 24 horas.
                 </p>
                 <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    <button className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                       <Download size={16} /> Exportar SQL
                    </button>
                    <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm">
                       Forçar Snapshot
                    </button>
                 </div>
              </div>

              <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex items-start gap-4 transition-colors">
                <div className="p-2 bg-white rounded-xl text-amber-600 shadow-sm transition-colors"><Database size={20} /></div>
                <div className="space-y-1">
                    <h4 className="font-bold text-amber-900">Auto-Hospedagem Docker</h4>
                    <p className="text-sm text-amber-800/70 leading-relaxed">
                      Seu banco de dados PostgreSQL está sendo executado em modo persistente. 
                      Para exportar seus dados, utilize o comando <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">docker exec crm-db pg_dump</code>.
                    </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
