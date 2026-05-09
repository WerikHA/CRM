import React, { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Link,
  Database,
  Code,
  Globe,
  Key,
  Copy,
  Check,
  ExternalLink,
  Activity,
  AlertTriangle,
  CheckCircle,
  Plus,
  MoreHorizontal,
  Download,
  X,
  Trash2,
  Palette,
  RefreshCcw,
  ShieldAlert,
  MessageSquare,
  Terminal,
  ShieldCheck,
  Layout,
  Eye,
  EyeOff,
  FileText,
  Zap,
} from "lucide-react";
import { api } from "../services/api";
import { cn } from "../lib/utils";
import { storageService } from "../lib/storage";
import {
  IntegrationConfig,
  Lead,
  Client,
  ArtOrder,
  Receivable,
  User,
} from "../types";
import Modal from "./Modal";
import { ChatWindow } from "./ChatWindow";

import { EmailConfigView } from "./EmailConfigView";

import { ToastContainer, toast } from "./ui/Toast";

import { meetLogService } from "../services/meetLogService";
import PersonalizationView from "./PersonalizationView";

// Helper para fetch com autenticação automática
const fetchWithAuth = async (url: string, options: any = {}) => {
  const token = storageService.getItem("agency_token");
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...options, headers });
};

// Componente Interno para Gestão do QR do WhatsApp Cloud
function N8nLogs({ isAdmin }: { isAdmin: boolean }) {
  const [logs, setLogs] = useState<string>("");
  useEffect(() => {
    if (!isAdmin) return;
    const fetchLogs = async () => {
      try {
        const res = await fetchWithAuth("/api/n8n/logs");
        if (res.ok) setLogs(await res.text());
      } catch (err) {}
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="font-mono text-[10px] text-indigo-400 dark:text-indigo-300">
      {logs
        ? logs.split("\n").map((line, i) => <div key={i}>{line}</div>)
        : "Nenhum log disponível..."}
    </div>
  );
}

function WhatsAppAccountLogs({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<string>("");
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetchWithAuth(`/api/whatsapp/logs?ownerId=${userId}`);
        if (res.ok) setLogs(await res.text());
      } catch (err) {}
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <div className="font-mono text-[10px] text-emerald-400">
      {logs
        ? logs.split("\n").map((line, i) => (
            <div key={i} className="mb-1 leading-relaxed">
              <span className="opacity-40">{i + 1}</span> {line}
            </div>
          ))
        : "Nenhum log disponível para este usuário..."}
    </div>
  );
}

function VideoLogsView() {
  const [logs, setLogs] = useState(meetLogService.getLogs());

  useEffect(() => {
    return meetLogService.subscribe(setLogs);
  }, []);

  return (
    <div className="bg-gray-900 rounded-2xl p-4 font-mono text-[10px] text-emerald-400 h-96 overflow-y-auto border border-gray-800 shadow-inner">
      {logs.length > 0 ? (
        logs.map((log, i) => (
          <div key={i} className="mb-1 leading-relaxed">
            <span className="opacity-40">[{log.timestamp}]</span> {log.message}
          </div>
        ))
      ) : (
        <div className="text-gray-600 italic">
          Nenhum log de vídeo disponível...
        </div>
      )}
    </div>
  );
}

function SubscriptionView({ currentUser }: { currentUser: User }) {
  const [loading, setLoading] = useState(false);
  const currentPlanId = (currentUser as any).planId || "plan1";

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erro ao iniciar checkout");
      }
    } catch (err) {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/create-portal-session", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erro ao abrir portal do cliente");
      }
    } catch (err) {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: "plan1",
      name: "Growth Pack",
      price: "147",
      features: [
        "Até 3 membros",
        "Dashboard",
        "Financeiro + Lembretes",
        "Workflow Criativo",
        "Formulários",
      ],
      isCurrent: currentPlanId === "plan1",
    },
    {
      id: "plan2",
      name: "Elite Scale",
      price: "247",
      features: [
        "Até 8 membros",
        "Google Drive",
        "Agendamento Social",
        "Tudo do Growth Pack",
      ],
      isCurrent: currentPlanId === "plan2",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">
            Assinatura Atual
          </h2>
          <p className="text-indigo-100 font-medium mb-6">
            Você está no plano{" "}
            <span className="font-bold underline">
              {currentPlanId === "plan1" ? "Growth Pack" : "Elite Scale"}
            </span>
          </p>
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest">
              {currentUser.subscriptionStatus === "active"
                ? "Assinatura Ativa"
                : "Assinatura Inativa"}
            </div>
            {currentUser.subscriptionStatus === "active" && (
              <button
                onClick={handleOpenPortal}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                <ShieldCheck size={14} />
                Portal do Cliente
              </button>
            )}
          </div>
        </div>
        <Zap className="absolute top-1/2 right-10 -translate-y-1/2 text-white/10 w-48 h-48 -rotate-12" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "p-8 rounded-[3rem] border transition-all duration-300 flex flex-col",
              plan.isCurrent
                ? "bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-900 shadow-xl"
                : "bg-gray-50/50 dark:bg-gray-800/50 border-transparent hover:bg-white dark:hover:bg-gray-900 hover:border-gray-100 dark:hover:border-gray-800 hover:shadow-lg",
            )}
          >
            <div className="flex justify-between items-start mb-8 transition-colors">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">
                  {plan.name}
                </h3>
                <div className="text-lg font-bold text-gray-400">
                  R$ {plan.price}/mês
                </div>
              </div>
              {plan.isCurrent && (
                <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                  Atual
                </span>
              )}
            </div>

            <ul className="space-y-4 mb-10 flex-grow">
              {plan.features.map((f, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400"
                >
                  <CheckCircle size={16} className="text-indigo-500" />
                  {f}
                </li>
              ))}
            </ul>

            {!plan.isCurrent && (
              <button
                disabled={loading}
                onClick={() => handleUpgrade(plan.id)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Processando..." : "Mudar para este plano"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NetworkStatus() {
  const [data, setData] = useState<{
    localIp: string;
    allAddresses: string[];
    port: string | number;
    appUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/system/network")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error("Erro ao buscar rede:", err));
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data)
    return (
      <div className="p-8 text-center text-gray-500">
        Carregando informações de rede...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 transition-all duration-300">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-colors">
            <Globe size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg dark:text-gray-100 transition-colors uppercase tracking-tight">
              Endereços de Acesso
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
              Use estes endereços para acessar o CRM de outros dispositivos na
              mesma rede.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {data.allAddresses?.map((ip: string, i: number) => {
            const url = `${window.location.protocol}//${ip}:${data.port}`;
            return (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">
                    {i === 0 ? "IP Local Recomendado" : "Interface de Rede"}
                  </span>
                  <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 transition-colors">
                    {url}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(url)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all"
                >
                  {copied ? (
                    <CheckCircle size={18} className="text-emerald-500" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl transition-colors">
          <div className="flex gap-3">
            <AlertTriangle className="text-amber-500 shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-tight mb-1">
                Dica de Acesso Externo
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-500/80 leading-relaxed transition-colors">
                Se você está usando o <b>ZimaOS</b>, certifique-se de que a
                porta <b>{data.port}</b> está aberta no firewall do sistema e
                que você está conectado na mesma rede Wi-Fi/CABO que o servidor.
                <br />
                <br />
                Para acesso <b>externo real</b> (fora de casa), recomendamos
                usar o <b>Tailscale</b> (disponível na App Store do ZimaOS) ou
                configurar o <b>Port Forwarding</b> no seu roteador para a porta{" "}
                {data.port}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatabaseStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [dbInfo, setDbInfo] = useState<{
    isServiceRole: boolean;
    message: string;
    logs?: string[];
  } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetchWithAuth("/api/health/supabase");
        const data = await res.json();
        if (data.connected) {
          setStatus("connected");
          setDbInfo({
            isServiceRole: data.isUsingServiceRole,
            message: data.message,
            logs: data.logs,
          });
        } else {
          setStatus("error");
          setMessage(
            data.message || "Erro desconhecido ao conectar com Supabase",
          );
          setDbInfo({
            isServiceRole: data.isUsingServiceRole,
            message: data.message,
            logs: data.logs,
          });
        }
      } catch (err) {
        setStatus("error");
        setMessage("Falha ao comunicar com o servidor");
      }
    };
    checkStatus();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 text-center transition-all duration-300">
      <div
        className={cn(
          "w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 transition-colors",
          status === "connected"
            ? dbInfo?.isServiceRole
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : status === "loading"
              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
        )}
      >
        <Activity
          size={32}
          className={cn(status === "loading" && "animate-spin")}
        />
      </div>
      {status === "connected" && dbInfo && (
        <>
          <div
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4",
              dbInfo.isServiceRole
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-amber-500/10 text-amber-600",
            )}
          >
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                dbInfo.isServiceRole ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
            {dbInfo.isServiceRole
              ? "Modo Alta Segurança (Recomendado)"
              : "Modo Acesso Limitado (RLS Ativo)"}
          </div>

          <h3 className="font-bold text-xl mb-2 dark:text-gray-100 transition-colors uppercase tracking-tight">
            Banco de Dados Cloud
          </h3>
          <p className="text-xs text-emerald-600 font-medium mt-2 transition-colors mb-6">
            {dbInfo.message}
          </p>

          {dbInfo.logs && dbInfo.logs.length > 0 && (
            <div className="mb-8 text-left bg-gray-50 dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800 rounded-xl p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                <Terminal size={12} /> Log de Conexão
              </h4>
              <pre className="text-[10px] font-mono whitespace-pre-wrap text-emerald-600/80 dark:text-emerald-400/80">
                {dbInfo.logs.join("\n")}
              </pre>
            </div>
          )}

          {!dbInfo.isServiceRole && (
            <div className="space-y-4">
              <div className="p-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl text-left border-l-4 border-l-rose-500">
                <div className="flex gap-3 mb-4">
                  <ShieldAlert className="text-rose-500 shrink-0" size={24} />
                  <div>
                    <p className="text-sm font-bold text-rose-800 dark:text-rose-400 uppercase tracking-tight">
                      Problema de Permissão Detectado
                    </p>
                    <p className="text-[10px] text-rose-700/80 dark:text-rose-500/80 font-medium">
                      O erro "New row violates RLS policy" indica que o Supabase
                      está bloqueando suas gravações.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Opção 1: Configurar Variável (Recomendado & Seguro)
                    </p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      Vá no painel do <b>Render</b> (Environment) e adicione a
                      chave:
                      <br />
                      <span className="font-mono font-bold text-rose-600 select-all">
                        SUPABASE_SERVICE_ROLE_KEY
                      </span>
                      <br />
                      <span className="text-[10px] block mt-1 text-gray-500 italic">
                        * Use a string que começa com "eyJ..." encontrada em
                        Project Settings &gt; API &gt; service_role (secret).
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">
                      Opção 2: Atualização de Esquema (Corrigir Erros)
                    </p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                      Se você vir erros de tabelas faltantes (como
                      form_integrations), execute este script no{" "}
                      <b>SQL Editor</b> do Supabase:
                    </p>
                    <pre className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-500/5 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/10 text-indigo-700 dark:text-indigo-400 overflow-x-auto select-all">
                      {`CREATE TABLE IF NOT EXISTS public.form_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fields JSONB DEFAULT '[]'::jsonb,
  success_message TEXT DEFAULT 'Sucesso!',
  redirect_url TEXT,
  owner_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Desativar RLS para garantir funcionamento inicial sem complexidade
ALTER TABLE public.form_integrations DISABLE ROW LEVEL SECURITY;

-- Garantir que leads tenha todas as colunas
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT;`}
                    </pre>
                  </div>
                  <div className="group relative pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Opção 3: Editor de Vídeo & Workflow
                    </p>
                    <pre className="text-[10px] font-mono bg-black text-indigo-400 p-4 rounded-xl overflow-x-auto select-all">
                      {`-- Adicionar colunas de Editor de Vídeo na tabela de Clientes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_video_editor_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS video_editor_payout NUMERIC DEFAULT 0;

-- Adicionar colunas de Editor nas tabelas de Pedidos e Tarefas (se não existirem)
ALTER TABLE video_orders ADD COLUMN IF NOT EXISTS editor_id TEXT;
ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS editor_id TEXT;
ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS materials_link TEXT;
ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS post_date TEXT;
ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS post_time TEXT;
ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';`}
                    </pre>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">
                      Opção 3: Desativar RLS (Menos Seguro)
                    </p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                      Se não conseguir configurar a variável, você pode
                      desativar o RLS manualmente. Isso resolve o erro, mas
                      remove a proteção de acesso direto via chave pública.
                    </p>
                    <div className="group relative">
                      <pre className="text-[10px] font-mono bg-black text-emerald-400 p-4 rounded-xl overflow-x-auto select-all">
                        {`ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE receivables DISABLE ROW LEVEL SECURITY;
ALTER TABLE demand_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE art_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {status === "loading" && (
        <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg animate-pulse">
          Verificando conexão...
        </p>
      )}

      {status === "error" && (
        <>
          <p className="text-rose-600 dark:text-rose-400 font-bold text-lg">
            Status: Falha na Conexão
          </p>
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl">
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Dica: Verifique se a URL do Supabase está correta nas
              configurações (Segredos) e se termina em{" "}
              <span className="font-bold">.co</span> e não em .com.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function FormIntegrationsView() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingForm, setEditingForm] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await fetchWithAuth("/api/forms");
      if (res.ok) setForms(await res.json());
    } catch (err) {
      toast.error("Erro ao carregar formulários.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const currentForm = e.currentTarget;
    const formData = new FormData(currentForm);

    const fieldsToSave =
      editingForm?.fields && editingForm.fields.length > 0
        ? editingForm.fields
        : [
            {
              name: "contact_name",
              label: "Nome Completo",
              type: "text",
              required: true,
            },
            { name: "email", label: "E-mail", type: "email", required: true },
            {
              name: "phone",
              label: "WhatsApp / Telefone",
              type: "tel",
              required: false,
            },
            {
              name: "message",
              label: "Como podemos ajudar?",
              type: "textarea",
              required: false,
            },
          ];

    const data = {
      id: editingForm?.id,
      name: formData.get("name"),
      success_message: formData.get("success_message"),
      redirect_url: formData.get("redirect_url"),
      fields: fieldsToSave,
    };

    console.log("[FORM] Salvando formulário:", data);

    try {
      const res = await fetchWithAuth("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();

      if (res.ok) {
        toast.success("Formulário salvo com sucesso!");
        fetchForms();
        setShowModal(false);
      } else {
        console.error("[FORM] Erro na resposta:", responseData);
        toast.error(
          `Falha ao salvar: ${responseData.error || "Erro no servidor"}`,
        );
      }
    } catch (err) {
      console.error("[FORM] Erro de rede:", err);
      toast.error("Erro de conexão ao salvar formulário.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este formulário?")) return;
    try {
      const res = await fetchWithAuth(`/api/forms/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Formulário excluído!");
        fetchForms();
      }
    } catch (err) {
      toast.error("Erro ao excluir formulário.");
    }
  };

  const testForm = async (id: string) => {
    try {
      const res = await fetch(`/api/forms/submit/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          contact_name: "Teste de Integração",
          email: "teste@exemplo.com",
          phone: "11999999999",
          message: "Esta é uma submissão de teste enviada do painel admin.",
          consent_given: true,
        }),
      });
      if (res.ok)
        toast.success("Submissão de teste enviada! Verifique seus leads.");
      else {
        const data = await res.json();
        toast.error(`Falha no teste: ${data.error || "Erro desconhecido"}`);
      }
    } catch (err) {
      toast.error("Erro ao conectar com o servidor.");
    }
  };
  const copyCode = (id: string, type: "html" | "embed", form?: any) => {
    const baseUrl = window.location.origin;
    const submitUrl = `${baseUrl}/api/forms/submit/${id}`;
    const fields = form?.fields || [
      {
        name: "contact_name",
        label: "Nome Completo",
        type: "text",
        required: true,
      },
      { name: "email", label: "E-mail", type: "email", required: true },
      {
        name: "phone",
        label: "WhatsApp / Telefone",
        type: "tel",
        required: false,
      },
      {
        name: "message",
        label: "Como podemos ajudar?",
        type: "textarea",
        required: false,
      },
    ];

    let code = "";
    if (type === "html") {
      code = `
<!-- Formulário de Captura Amplifica CRM - Estilo Minimalista -->
<style>
  .amplifica-form { font-family: sans-serif; max-width: 400px; padding: 20px; border-radius: 12px; background: #fff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
  .amplifica-field { margin-bottom: 15px; }
  .amplifica-label { display: block; font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 5px; text-transform: uppercase; }
  .amplifica-input { w-full: 100%; width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; box-sizing: border-box; }
  .amplifica-checkbox-container { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 20px; cursor: pointer; }
  .amplifica-checkbox { margin-top: 3px; }
  .amplifica-checkbox-label { font-size: 11px; color: #64748b; line-height: 1.4; }
  .amplifica-link { color: #4f46e5; text-decoration: underline; }
  .amplifica-submit { background: #4f46e5; color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; }
  .amplifica-submit:hover { opacity: 0.9; }
</style>

<div class="amplifica-form">
  <form action="${submitUrl}" method="POST">
    ${fields
      .map(
        (f: any) => `
    <div class="amplifica-field">
      <label class="amplifica-label">${f.label}</label>
      ${
        f.type === "textarea"
          ? `<textarea name="${f.name}" class="amplifica-input" rows="3" ${f.required ? "required" : ""}></textarea>`
          : `<input type="${f.type}" name="${f.name}" class="amplifica-input" ${f.required ? "required" : ""}>`
      }
    </div>`,
      )
      .join("")}
    
    <div class="amplifica-checkbox-container">
      <input type="checkbox" name="consent_given" id="consent_${id}" class="amplifica-checkbox" required>
      <label for="consent_${id}" class="amplifica-checkbox-label">
        Concordo com o uso dos meus dados para fins de contato comercial conforme a 
        <a href="${baseUrl}/privacy" target="_blank" class="amplifica-link">Política de Privacidade</a>.
      </label>
    </div>

    <button type="submit" class="amplifica-submit">ENVIAR AGORA</button>
  </form>
</div>
      `;
    } else {
      code = `
<!-- Integração com AJAX (Sem Recarregar Página) -->
<div id="amplifica-container-${id}">
  <form id="amplifica-form-${id}" style="font-family: sans-serif; display: flex; flex-direction: column; gap: 12px;">
    ${fields
      .map(
        (f: any) => `
    <div>
      <input type="${f.type === "textarea" ? "text" : f.type}" name="${f.name}" placeholder="${f.label}" ${f.required ? "required" : ""} style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; width: 100%;">
    </div>`,
      )
      .join("")}
    
    <div style="display: flex; gap: 8px; align-items: flex-start; margin-top: 4px;">
      <input type="checkbox" name="consent_given" id="consent_js_${id}" required style="margin-top: 3px;">
      <label for="consent_js_${id}" style="font-size: 11px; color: #666; line-height: 1.3;">
        Concordo com o tratamento dos meus dados conforme a 
        <a href="${baseUrl}/privacy" target="_blank" style="color: #4f46e5;">Política de Privacidade</a>.
      </label>
    </div>

    <button type="submit" style="background: #4f46e5; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer;">CAPTURAR LEAD</button>
  </form>
  <div id="amplifica-msg-${id}" style="display: none; padding: 10px; text-align: center; color: green; font-weight: bold;"></div>
</div>

<script>
document.getElementById('amplifica-form-${id}').addEventListener('submit', function(e) {
  e.preventDefault();
  const form = e.target;
  const consent = form.querySelector('input[name="consent_given"]');
  
  if (!consent.checked) {
    alert('Você precisa aceitar os termos de privacidade para continuar.');
    return;
  }

  const btn = form.querySelector('button');
  const msg = document.getElementById('amplifica-msg-${id}');
  
  btn.disabled = true;
  btn.innerText = 'Enviando...';
  
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  // Ensure boolean for consent
  data.consent_given = consent.checked;

  fetch("${submitUrl}", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(res => {
    if(res.redirect) window.location.href = res.redirect;
    else {
      form.style.display = 'none';
      msg.innerText = res.message || 'Sucesso!';
      msg.style.display = 'block';
    }
  })
  .catch(err => {
    console.error('Erro na submissão:', err);
    alert('Erro ao enviar. Tente novamente.');
    btn.disabled = false;
    btn.innerText = 'Tentar Novamente';
  });
});
</script>
      `;
    }

    navigator.clipboard.writeText(code.trim());
    setCopiedId(id + type);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Código copiado!");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4 opacity-80">
            <Globe size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">
              Integração Externa
            </span>
          </div>
          <h2 className="text-3xl font-black tracking-tighter mb-2">
            CAPTURA DE LEADS
          </h2>
          <p className="text-indigo-100 max-w-xl font-medium leading-relaxed">
            Gere formulários para capturar leads diretamente do seu site. Cada
            submissão aparecerá automaticamente no seu painel de leads.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingForm(null);
            setShowModal(true);
          }}
          className="mt-6 flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-2xl font-bold transition-all shadow-xl hover:scale-105 active:scale-95"
        >
          <Plus size={20} />
          Criar Novo Formulário
        </button>
        <div className="absolute top-0 right-0 p-8 transform translate-x-1/4 -translate-y-1/4 opacity-10">
          <Globe size={240} className="text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form) => (
          <div
            key={form.id}
            className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all group relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-2xl">
                <Layout size={20} className="text-indigo-600" />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                <button
                  onClick={() => {
                    setEditingForm(form);
                    setShowModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => handleDelete(form.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => testForm(form.id)}
                  className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 rounded-xl transition-all"
                  title="Testar Submissão"
                >
                  <Activity size={16} />
                </button>
              </div>
            </div>

            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 leading-tight uppercase tracking-tight">
              {form.name}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 truncate italic font-mono">
              ID: {form.id}
            </p>

            <div className="space-y-2">
              <button
                onClick={() => copyCode(form.id, "html", form)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all group/btn"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 group-hover/btn:bg-white/20">
                    <Code
                      size={12}
                      className="group-hover/btn:text-white text-indigo-600"
                    />
                  </div>
                  <span className="uppercase tracking-widest">Código HTML</span>
                </div>
                {copiedId === form.id + "html" ? (
                  <Check
                    size={14}
                    className="text-green-500 group-hover/btn:text-white"
                  />
                ) : (
                  <Copy size={14} className="opacity-40" />
                )}
              </button>

              <button
                onClick={() => copyCode(form.id, "embed", form)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all group/btn"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 group-hover/btn:bg-white/20">
                    <Link
                      size={12}
                      className="group-hover/btn:text-white text-indigo-600"
                    />
                  </div>
                  <span className="uppercase tracking-widest">Embed JS</span>
                </div>
                {copiedId === form.id + "embed" ? (
                  <Check
                    size={14}
                    className="text-green-500 group-hover/btn:text-white"
                  />
                ) : (
                  <Copy size={14} className="opacity-40" />
                )}
              </button>
            </div>
          </div>
        ))}

        {forms.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-400 italic font-medium">
              Nenhum formulário criado ainda.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <ShieldCheck size={16} /> Guia de Integração
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-indigo-50">
              1
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
              Crie o Formulário
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Defina o nome e os campos necessários. Recomendamos sempre pedir
              Nome, E-mail e WhatsApp.
            </p>
          </div>
          <div className="space-y-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-indigo-50">
              2
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
              Copie o Código
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Escolha entre HTML (estilo padrão) ou Embed JS (AJAX sem
              recarregar a página para sites modernos).
            </p>
          </div>
          <div className="space-y-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-indigo-50">
              3
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
              Cole no seu Site
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Cole no local desejado do seu site (WordPress, Elementor, HTML
              Puro ou Wix). Os leads cairão no CRM instantly!
            </p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingForm ? "Editar Formulário" : "Novo Formulário"}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Nome do Formulário
              </label>
              <input
                name="name"
                defaultValue={editingForm?.name}
                required
                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                placeholder="Ex: Landing Page Campanha X"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                URL de Redirecionamento (Opcional)
              </label>
              <input
                name="redirect_url"
                defaultValue={editingForm?.redirect_url}
                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
                placeholder="https://meusite.com/obrigado"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Mensagem de Sucesso (se não houver redirecionamento)
            </label>
            <input
              name="success_message"
              defaultValue={
                editingForm?.success_message ||
                "Obrigado! Recebemos seus dados."
              }
              className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Configuração de Campos
              </label>
              <button
                type="button"
                onClick={() =>
                  setEditingForm((prev: any) => ({
                    ...prev,
                    fields: [
                      ...(prev?.fields || []),
                      {
                        name: `campo_${Date.now()}`,
                        label: "Novo Campo",
                        type: "text",
                        required: false,
                      },
                    ],
                  }))
                }
                className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
              >
                + ADICIONAR CAMPO
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {(
                editingForm?.fields || [
                  {
                    name: "contact_name",
                    label: "Nome Completo",
                    type: "text",
                    required: true,
                  },
                  {
                    name: "email",
                    label: "E-mail",
                    type: "email",
                    required: true,
                  },
                  {
                    name: "phone",
                    label: "WhatsApp / Telefone",
                    type: "tel",
                    required: false,
                  },
                  {
                    name: "message",
                    label: "Mensagem",
                    type: "textarea",
                    required: false,
                  },
                ]
              ).map((field: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-end gap-3 group relative"
                >
                  <div className="flex-1 space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">
                      Label (O que o usuário vê)
                    </label>
                    <input
                      value={field.label || ""}
                      onChange={(e) => {
                        const newFields = [...(editingForm?.fields || [])];
                        const val = e.target.value;
                        const slug = val
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]/g, "_");

                        if (newFields.length === 0) {
                          const defaults = [
                            {
                              name: "contact_name",
                              label: "Nome Completo",
                              type: "text",
                              required: true,
                            },
                            {
                              name: "email",
                              label: "E-mail",
                              type: "email",
                              required: true,
                            },
                            {
                              name: "phone",
                              label: "WhatsApp / Telefone",
                              type: "tel",
                              required: false,
                            },
                            {
                              name: "message",
                              label: "Como podemos ajudar?",
                              type: "textarea",
                              required: false,
                            },
                          ];
                          defaults[idx].label = val;
                          // Only update name if it was auto-generated or default
                          if (defaults[idx].name.includes("campo_"))
                            defaults[idx].name = slug;
                          setEditingForm((prev: any) => ({
                            ...prev,
                            fields: defaults,
                          }));
                        } else {
                          newFields[idx].label = val;
                          if (newFields[idx].name.includes("campo_"))
                            newFields[idx].name = slug;
                          setEditingForm((prev: any) => ({
                            ...prev,
                            fields: newFields,
                          }));
                        }
                      }}
                      className="w-full bg-white dark:bg-gray-900 p-2 rounded-xl text-xs border border-gray-100 dark:border-gray-800 font-bold"
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">
                      Tipo
                    </label>
                    <select
                      value={field.type || "text"}
                      onChange={(e) => {
                        const newFields = [...(editingForm?.fields || [])];
                        newFields[idx].type = e.target.value;
                        setEditingForm((prev: any) => ({
                          ...prev,
                          fields: newFields,
                        }));
                      }}
                      className="w-full bg-white dark:bg-gray-900 p-2 rounded-xl text-xs border border-gray-100 dark:border-gray-800"
                    >
                      <option value="text">Texto</option>
                      <option value="email">E-mail</option>
                      <option value="tel">Telefone</option>
                      <option value="textarea">Área de Texto</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => {
                        const newFields = [...(editingForm?.fields || [])];
                        newFields[idx].required = e.target.checked;
                        setEditingForm((prev: any) => ({
                          ...prev,
                          fields: newFields,
                        }));
                      }}
                      className="w-4 h-4 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      Obrig.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newFields = [...(editingForm?.fields || [])].filter(
                        (_, i) => i !== idx,
                      );
                      setEditingForm((prev: any) => ({
                        ...prev,
                        fields: newFields,
                      }));
                    }}
                    className="p-2 text-rose-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 mt-6">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-6 py-2 text-sm font-bold text-gray-500"
            >
              Voltar
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
            >
              Salvar Configurações
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SqlEditor() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeSql = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/admin/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao executar SQL");
      setResult(data);
      toast.success("Query executada com sucesso!");
    } catch (err: any) {
      setError(err.message);
      toast.error("Erro na execução SQL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Terminal size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">
              Terminal SQL Direto
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Acesso root ao PostgreSQL do Supabase
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-500/20 animate-pulse">
            Modo Super Admin
          </span>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Sua Query
            </label>
            <button
              onClick={() => setQuery("SELECT * FROM receivables LIMIT 10;")}
              className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold"
            >
              Carregar Exemplo
            </button>
          </div>
          <div className="relative group">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-48 p-6 bg-gray-900 dark:bg-black text-emerald-400 font-mono text-xs rounded-2xl border border-gray-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner"
              placeholder="-- Exemplo: ALTER TABLE receivables ADD COLUMN quantia NUMERIC;
SELECT * FROM users LIMIT 5;"
            />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/20 to-transparent flex justify-end">
              <button
                onClick={executeSql}
                disabled={loading || !query.trim()}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCcw size={14} className="animate-spin" />
                ) : (
                  <Activity size={14} />
                )}
                EXECUTAR COMANDO
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex gap-3 items-start animate-in zoom-in duration-300">
            <ShieldAlert className="text-rose-500 shrink-0" size={18} />
            <div>
              <p className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-tight mb-1">
                Erro do Postgres
              </p>
              <pre className="text-[10px] text-rose-700/80 dark:text-rose-500/80 font-mono whitespace-pre-wrap">
                {error}
              </pre>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-500" size={14} />
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Resultado: {result.command}{" "}
                  {result.rowCount !== null && `(${result.rowCount} registros)`}
                </h4>
              </div>
              <button
                onClick={() => setResult(null)}
                className="text-[10px] text-gray-400 hover:text-gray-600 uppercase font-bold transition-colors"
              >
                Limpar Grade
              </button>
            </div>

            {result.rows && result.rows.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-[10px] font-mono border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#0a0a0a] sticky top-0 z-10">
                        {result.fields?.map((f: any) => (
                          <th
                            key={f.name}
                            className="px-4 py-3 text-left border-b border-gray-100 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-500 whitespace-nowrap"
                          >
                            {f.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {result.rows.map((row: any, i: number) => (
                        <tr
                          key={i}
                          className="hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors group"
                        >
                          {result.fields?.map((f: any) => (
                            <td
                              key={f.name}
                              className="px-4 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap border-r border-gray-50/50 dark:border-gray-800/50 last:border-0 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                            >
                              {row[f.name] === null ? (
                                <span className="text-gray-300 italic opacity-50">
                                  null
                                </span>
                              ) : typeof row[f.name] === "object" ? (
                                JSON.stringify(row[f.name])
                              ) : (
                                String(row[f.name])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              result.command && (
                <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium italic">
                    Comando executado com sucesso, mas não retornou linhas.
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>
      <div className="px-6 py-4 bg-indigo-50/30 dark:bg-indigo-500/5 border-t border-indigo-100/50 dark:border-indigo-500/10 flex items-center gap-3">
        <Shield size={14} className="text-indigo-500" />
        <p className="text-[10px] text-indigo-700/70 dark:text-indigo-400/70 leading-relaxed italic">
          Os comandos SQL são executados diretamente no banco de dados com
          permissões elevadas. Evite comandos que deletem tabelas críticas como{" "}
          <strong>users</strong>, <strong>clients</strong> ou{" "}
          <strong>leads</strong>.
        </p>
      </div>
    </div>
  );
}

function WhatsAppConfig({
  ownerId,
  isAdmin,
  currentUserId,
}: {
  ownerId: string;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [status, setStatus] = useState<
    "disconnected" | "qr" | "connected" | "connecting"
  >("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    action: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string>("");

  const canControl = isAdmin || ownerId === currentUserId;

  const fetchStatus = async () => {
    try {
      const res = await fetchWithAuth(
        `/api/whatsapp/status?ownerId=${ownerId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setQrCode(data.qr);
        setErrorInfo(data.error);
      }

      if (isAdmin) {
        const logsRes = await fetchWithAuth(
          `/api/whatsapp/logs?ownerId=${ownerId}`,
        );
        if (logsRes.ok) {
          const text = await logsRes.text();
          setLogs(text);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar status do WhatsApp", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [ownerId]);

  const handleLogout = async () => {
    if (!canControl) return;
    setLoading(true);
    await fetchWithAuth("/api/whatsapp/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId }),
    });
    await fetchStatus();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-3 h-3 rounded-full animate-pulse transition-colors",
              status === "connected" ? "bg-emerald-500" : "bg-amber-500",
            )}
          ></div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 transition-colors tracking-tight uppercase">
              Status da Conexão
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
              {status === "connected"
                ? "WhatsApp Autenticado e Pronto"
                : status === "qr"
                  ? "Aguardando Leitura do QR Code"
                  : status === "connecting"
                    ? "Inicializando Motor..."
                    : "Desconectado"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all"
          >
            <RefreshCcw size={16} />
          </button>
          {status === "connected" && canControl && (
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setLoading(true);
                  await fetchWithAuth("/api/whatsapp/reload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ownerId }),
                  });
                  await fetchStatus();
                }}
                className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 font-bold text-xs rounded-xl transition-all shadow-sm border border-amber-100 dark:border-amber-500/20"
                title="Reinicia a conexão sem deslogar completamente"
              >
                Reiniciar
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 font-bold text-xs rounded-xl transition-all shadow-sm border border-rose-100 dark:border-rose-500/20"
              >
                Sair / Desconectar
              </button>
            </div>
          )}
        </div>
      </div>

      {errorInfo && canControl && (
        <div className="p-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-3xl animate-in fade-in zoom-in duration-300">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div className="space-y-1 flex-1">
              <p className="text-sm font-bold text-rose-900 dark:text-rose-100 uppercase tracking-tight">
                Ocorreu um Problema na Conexão
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
                {errorInfo.message}
              </p>
              <div className="mt-3 p-3 bg-white dark:bg-black/20 rounded-xl border border-rose-100 dark:border-rose-500/10">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                  O que fazer?
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  {errorInfo.action}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleLogout}
                    className="mt-3 flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
                  >
                    Sair / Desconectar
                  </button>
                  <button
                    onClick={() => {
                      api.reportError({
                        message: `WhatsApp Erro: ${errorInfo.message}`,
                        context: `Status: ${status}, Owner: ${ownerId}`,
                      });
                      toast.success("Erro enviado ao suporte!");
                    }}
                    className="mt-3 flex-1 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all border border-gray-200 dark:border-gray-700"
                  >
                    Reportar Erro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === "qr" && qrCode && canControl && (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 transition-colors">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors uppercase tracking-tight">
            Leia o QR Code
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-sm transition-colors">
            Abra o WhatsApp no seu celular, vá em "Aparelhos Conectados" e
            aponte a câmera para este código.
          </p>
          <div className="p-4 bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-700 transition-colors">
            <img
              src={qrCode}
              alt="WhatsApp QR Code"
              className="w-64 h-64 dark:opacity-90"
            />
          </div>
        </div>
      )}

      {status === "qr" && !canControl && (
        <div className="p-8 text-center bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-3xl">
          <AlertTriangle size={32} className="mx-auto text-amber-500 mb-3" />
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
            Aguardando Conexão do Proprietário
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            O proprietário da conta precisa escanear o QR Code para que a equipe
            possa enviar mensagens.
          </p>
        </div>
      )}

      {status === "connecting" && (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 dark:bg-gray-800 rounded-3xl transition-colors">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-gray-900 dark:text-gray-100 transition-colors tracking-tight uppercase">
            Iniciando Serviço
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm transition-colors">
            Estamos preparando o motor de conexão. Isso pode levar alguns
            segundos...
          </p>
        </div>
      )}

      {status === "disconnected" && canControl && (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 dark:bg-gray-800 rounded-3xl transition-colors">
          <AlertTriangle size={48} className="text-amber-400 mb-4" />
          <p className="font-bold text-gray-900 dark:text-gray-100 transition-colors tracking-tight uppercase">
            Serviço Offline
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm transition-colors">
            O motor de envio está aguardando inicialização ou reconexão. Se
            demorar, tente atualizar a página.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={fetchStatus}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl font-bold text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-all uppercase"
            >
              <RefreshCcw size={14} /> Atualizar Agora
            </button>
            <button
              onClick={() => {
                api.reportError({
                  message: "WhatsApp Offline no Monitoramento do Sistema",
                  context: `Status: Disconnected, Owner: ${ownerId}`,
                });
                toast.success("O suporte técnico foi alertado sobre a falha.");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 shadow-sm rounded-xl font-bold text-rose-600 dark:text-rose-400 text-xs hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all uppercase"
            >
              <ShieldAlert size={14} /> Reportar Falha
            </button>
          </div>
        </div>
      )}
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
  agencyConfig?: {
    name: string;
    primaryColor: string;
    currency: string;
    locale: string;
    logoUrl?: string;
    logoBgColor?: string;
  };
  setAgencyConfig?: React.Dispatch<React.SetStateAction<any>>;
  currentUser: User;
  setCurrentUser: (user: User) => void;
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
  setAgencyConfig,
  currentUser,
  setCurrentUser,
}: AdminViewProps) {
  const isOwner = currentUser.role === "OWNER";
  const isAdmin = currentUser.role === "ADMIN";
  const canManageSystem = isOwner || isAdmin;

  const [activeSubTab, setActiveSubTab] = useState<
    | "subscription"
    | "integrations"
    | "users"
    | "database"
    | "sql"
    | "personalizacao"
    | "whatsapp"
    | "video"
    | "forms"
    | "logs"
    | "privacidade"
    | "network"
    | "email"
    | "revoke"
  >(canManageSystem ? "subscription" : "personalizacao");
  const [isTeamChatOpen, setIsTeamChatOpen] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isUserLogsModalOpen, setIsUserLogsModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingUserLogs, setViewingUserLogs] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState({
    name: "",
    email: "",
    password: "",
    role: "DESIGNER" as User["role"],
  });
  const [inviteData, setInviteData] = useState({
    name: "",
    email: "",
    password: "",
    role: "DESIGNER" as User["role"],
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showInvitePassword, setShowInvitePassword] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerateLink = () => {
    if (!inviteData.name || !inviteData.email) {
      toast.error("Por favor, preencha nome e e-mail antes de gerar o link.");
      return;
    }
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/join?email=${encodeURIComponent(inviteData.email)}&role=${inviteData.role}&name=${encodeURIComponent(inviteData.name)}&token=${Math.random().toString(36).substr(2, 12)}`;
    setGeneratedLink(link);
    handleCopy(link, "invite-link");
  };

  const handleGenerateTempPassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditUserData((prev) => ({ ...prev, password: pass }));
    setTempPassword(pass);
  };

  const handleToggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isActive: !i.isActive } : i)),
    );
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    });
    setTempPassword(null);
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updates: any = {
      name: editUserData.name,
      email: editUserData.email,
      role: editUserData.role,
    };

    if (editUserData.password) {
      updates.password = editUserData.password;
    }

    try {
      const updated = await api.updateUser(editingUser.id, updates);
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u)),
      );
      setIsEditUserModalOpen(false);
      toast.success("Usuário atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar usuário: " + (error as Error).message);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUserFormData: any = {
      name: inviteData.name,
      email: inviteData.email,
      role: inviteData.role,
      password: inviteData.password,
      ownerId:
        currentUser.role === "OWNER" || currentUser.role === "ADMIN"
          ? currentUser.id
          : currentUser.ownerId,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteData.name)}&background=random`,
    };

    try {
      const savedUser = await api.createUser(newUserFormData as any);
      setUsers((prev) => [...prev, savedUser]);
      setIsInviteModalOpen(false);
      setInviteData({ name: "", email: "", password: "", role: "DESIGNER" });
      setGeneratedLink(null);
      toast.success(
        `Usuário ${inviteData.name} criado com sucesso! Ele já pode logar com e-mail e senha.`,
      );
    } catch (error) {
      toast.error("Erro ao criar usuário: " + (error as Error).message);
    }
  };

  const handleRemoveUser = async (id: string) => {
    console.log(`[DEBUG] Tentando remover usuário com ID: ${id}`);
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      console.error(`[DEBUG] Erro ao remover usuário:`, err);
      alert("Erro ao remover usuário: " + err.message);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (
      !confirm(
        "Deseja realmente desconectar o Google Drive? Todos os tokens de acesso serão revogados e excluídos permanentemente.",
      )
    )
      return;
    try {
      await api.post("/google/disconnect", { userId: currentUser.id });
      toast.success("Google Drive desconectado e dados revogados");
    } catch (err) {
      toast.error("Erro ao desconectar Google Drive");
    }
  };

  const handleDisconnectMeta = async () => {
    if (
      !confirm(
        "Deseja realmente desconectar TODAS as contas Meta (Facebook/Instagram)? Todos os tokens e dados sincronizados serão excluídos permanentemente.",
      )
    )
      return;
    try {
      await api.post("/facebook/disconnect-all", {
        ownerId: currentUser.ownerId || currentUser.id,
      });
      toast.success("Contas Meta desconectadas e dados revogados");
    } catch (err) {
      toast.error("Erro ao desconectar contas Meta");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      await api.delete("/auth/account");
      toast.success("Sua conta e todos os dados foram excluídos do sistema.");
      storageService.clear();
      window.location.href = "/";
    } catch (err) {
      toast.error("Erro ao excluir conta. Contate o suporte.");
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdateWhatsAppConfig = (
    id: string,
    key: string,
    value: string,
  ) => {
    setIntegrations((prev) =>
      prev.map((i) => {
        if (i.id === id && i.whatsappConfig) {
          return {
            ...i,
            whatsappConfig: {
              ...i.whatsappConfig,
              [key]: value,
            },
          };
        }
        return i;
      }),
    );
  };

  const runAudit = () => {
    setIsAuditing(true);
    setAuditResults(null);

    // Simulate auditing script
    setTimeout(() => {
      const issues = [];

      // Data Integrity Checks
      if (clients.length === 0)
        issues.push({
          type: "warning",
          msg: "Base de clientes vazia pode afetar Design e Financeiro.",
        });

      const orphanedOrders = artOrders.filter(
        (o) => !clients.some((c) => c.id === o.clientId),
      );
      if (orphanedOrders.length > 0)
        issues.push({
          type: "error",
          msg: `${orphanedOrders.length} pedidos de arte órfãos (sem cliente).`,
        });

      const orphanedFinance = receivables.filter(
        (r) => !clients.some((c) => c.id === r.clientId),
      );
      if (orphanedFinance.length > 0)
        issues.push({
          type: "error",
          msg: `${orphanedFinance.length} lançamentos financeiros órfãos.`,
        });

      setAuditResults({
        timestamp: new Date().toLocaleString(),
        status: issues.some((i) => i.type === "error")
          ? "failed"
          : issues.length > 0
            ? "warning"
            : "healthy",
        issues,
        checks: [
          { name: "Consistência de Temas", status: "pass" },
          { name: "Módulo de Leads (Modals)", status: "pass" },
          { name: "Módulo Financeiro (Ações)", status: "pass" },
          { name: "Módulo Design (Eventos)", status: "pass" },
          {
            name: "Integrações Externas",
            status: integrations.some((i) => i.isActive) ? "pass" : "info",
          },
        ],
      });
      setIsAuditing(false);
    }, 2000);
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-colors uppercase">
              Configurações & Admin
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium transition-colors">
              Gerencie integrações, chaves de API e automações.
            </p>
          </div>
          <button
            onClick={runAudit}
            disabled={isAuditing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border",
              isAuditing
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-700"
                : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-indigo-500 dark:hover:border-indigo-500/50",
            )}
          >
            <Activity size={14} className={cn(isAuditing && "animate-spin")} />
            {isAuditing ? "Auditoria em curso..." : "Audit Global CRM"}
          </button>
        </div>

        {auditResults && (
          <div className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 p-6 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-500 transition-colors">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    auditResults.status === "healthy"
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : auditResults.status === "warning"
                        ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
                  )}
                >
                  {auditResults.status === "healthy" ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertTriangle size={20} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
                    Resultado da Auditoria Automatizada
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                    {auditResults.timestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuditResults(null)}
                className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                <Check size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors text-center">
                  Verificação de Módulos
                </h4>
                {auditResults.checks?.map((check: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-50 dark:border-gray-800 transition-colors"
                  >
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 transition-colors">
                      {check.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-lg transition-colors border",
                        check.status === "pass"
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                          : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-700",
                      )}
                    >
                      {check.status === "pass" ? "OK" : "INFO"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors text-center">
                  Alertas de Integridade
                </h4>
                {!auditResults.issues || auditResults.issues.length === 0 ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium italic transition-colors">
                    Nenhum problema de integridade detectado.
                  </p>
                ) : (
                  auditResults.issues?.map((issue: any, i: number) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-xl border flex items-center gap-3 transition-colors",
                        issue.type === "error"
                          ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
                          : "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400",
                      )}
                    >
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
            {canManageSystem && (
              <button
                onClick={() => setActiveSubTab("subscription")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                  activeSubTab === "subscription"
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                )}
              >
                <Activity size={18} /> Assinatura
              </button>
            )}
            {canManageSystem && (
              <button
                onClick={() => setActiveSubTab("integrations")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                  activeSubTab === "integrations"
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                )}
              >
                <Link size={18} /> Integrações
              </button>
            )}
            <button
              onClick={() => setActiveSubTab("users")}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                activeSubTab === "users"
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
              )}
            >
              <Shield size={18} />{" "}
              {canManageSystem ? "Gestão de Usuários" : "Membros da Equipe"}
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveSubTab("database")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                  activeSubTab === "database"
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                )}
              >
                <Database size={18} /> Banco de Dados
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveSubTab("sql")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                  activeSubTab === "sql"
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                )}
              >
                <Terminal size={18} /> Editor SQL
              </button>
            )}
            <button
              onClick={() => setActiveSubTab("personalizacao")}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                activeSubTab === "personalizacao"
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
              )}
            >
              <Palette size={18} /> Personalização
            </button>
            {(isAdmin || isOwner) && (
              <>
                <button
                  onClick={() => setActiveSubTab("forms")}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                    activeSubTab === "forms"
                      ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                  )}
                >
                  <Globe size={18} />
                  Formulários
                </button>
              </>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveSubTab("logs")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                  activeSubTab === "logs"
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                )}
              >
                <Terminal size={18} /> Central de Logs
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveSubTab("privacidade")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                  activeSubTab === "privacidade"
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                )}
              >
                <ShieldCheck size={18} /> Privacidade & Cookies
              </button>
            )}
            <button
              onClick={() => setActiveSubTab("revoke")}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                activeSubTab === "revoke"
                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
              )}
            >
              <Shield size={18} /> Revogar ou Excluir
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveSubTab("network")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                  activeSubTab === "network"
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                )}
              >
                <Globe size={18} /> Rede & Acesso
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveSubTab("email")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-left transition-all",
                  activeSubTab === "email"
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                )}
              >
                <MessageSquare size={18} /> Servidor de E-mail
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {activeSubTab === "subscription" && (
              <SubscriptionView currentUser={currentUser} />
            )}
            {activeSubTab === "integrations" && (
              <div className="space-y-6">
                {integrations
                  .filter((i) => isAdmin || i.type === "whatsapp")
                  .map((integration) => (
                    <div
                      key={integration.id}
                      className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300"
                    >
                      <div className="p-6 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 flex items-center justify-between transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-300">
                            {integration.type === "whatsapp" ? (
                              <svg
                                xmlns="https://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                              </svg>
                            ) : (
                              <Code size={24} />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 transition-colors uppercase tracking-tight">
                              {integration.type === "whatsapp"
                                ? "WhatsApp (QR)"
                                : integration.service}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium transition-colors">
                              Status:
                              <span
                                className={cn(
                                  "ml-1",
                                  integration.isActive
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-gray-400 italic",
                                )}
                              >
                                {integration.isActive
                                  ? "Conectado"
                                  : "Aguardando Configuração"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-8">
                        {integration.type === "whatsapp" ? (
                          <div className="space-y-4">
                            <WhatsAppConfig
                              ownerId={
                                canManageSystem
                                  ? currentUser.id
                                  : currentUser.ownerId || ""
                              }
                              isAdmin={isAdmin}
                              currentUserId={currentUser.id}
                            />
                            <a
                              href="https://web.whatsapp.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm"
                            >
                              <ExternalLink size={16} /> Abrir WhatsApp Web em
                              nova aba
                            </a>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 italic transition-colors text-center mt-2">
                              Por segurança, não é possível embutir o WhatsApp
                              Web diretamente no CRM. Use o botão acima para
                              abrir em nova aba.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors block">
                                Webhook URL (n8n)
                              </label>
                              <input
                                type="text"
                                value={integration.webhookUrl || ""}
                                onChange={(e) =>
                                  setIntegrations((prev) =>
                                    prev.map((i) =>
                                      i.id === integration.id
                                        ? { ...i, webhookUrl: e.target.value }
                                        : i,
                                    ),
                                  )
                                }
                                placeholder="https://n8n.seusite.com/webhook/..."
                                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-inner"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors block">
                                API Key
                              </label>
                              <input
                                type="password"
                                value={integration.apiKey || ""}
                                onChange={(e) =>
                                  setIntegrations((prev) =>
                                    prev.map((i) =>
                                      i.id === integration.id
                                        ? { ...i, apiKey: e.target.value }
                                        : i,
                                    ),
                                  )
                                }
                                placeholder="n8n_..."
                                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-inner"
                              />
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await fetchWithAuth(
                                    `/api/integrations/${integration.id}/trigger`,
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({ test: true }),
                                    },
                                  );
                                  alert(
                                    "Simulação de gatilho enviada com sucesso!",
                                  );
                                } catch (e) {
                                  alert("Erro ao disparar gatilho.");
                                }
                              }}
                              className="col-span-2 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-all shadow-sm"
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

            {activeSubTab === "users" && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between transition-colors">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                    Usuários Ativos
                  </h3>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow-sm"
                  >
                    <Plus size={14} /> Convidar Membro
                  </button>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold overflow-hidden transition-colors">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            user.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100 transition-colors uppercase tracking-tight text-sm">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 transition-colors">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors",
                            user.role === "OWNER"
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20"
                              : user.role === "ADMIN"
                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20"
                                : user.role === "DESIGNER"
                                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
                                  : user.role === "EDITOR"
                                    ? "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-500/20"
                                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20",
                          )}
                        >
                          {user.role === "OWNER"
                            ? "PROPRIETÁRIO"
                            : user.role === "DESIGNER"
                              ? "DESIGNER"
                              : user.role === "EDITOR"
                                ? "EDITOR"
                                : user.role === "ADMIN"
                                  ? "ADMIN"
                                  : user.role === "PARTNER"
                                    ? "PARCEIRO"
                                    : user.role}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canManageSystem && (
                            <button
                              onClick={() => {
                                setViewingUserLogs(user);
                                setIsUserLogsModalOpen(true);
                              }}
                              className="p-2 text-gray-300 dark:text-gray-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all"
                              title="Ver Logs do WhatsApp"
                            >
                              <Activity size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditUser(user)}
                            className="p-2 text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all"
                            title="Editar Usuário / Alterar Senha"
                          >
                            <Settings size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveUser(user.id)}
                            className="p-2 text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 transition-all"
                            title="Excluir Usuário"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSubTab === "database" && isAdmin && <DatabaseStatus />}

            {activeSubTab === "sql" && isAdmin && <SqlEditor />}

            {activeSubTab === "whatsapp" && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <svg
                        xmlns="https://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-emerald-500"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      Configuração do WhatsApp Cloud
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Vincule seu WhatsApp corporativo lendo o QR Code para
                      enviar propostas e artes via sistema.
                    </p>
                  </div>
                </div>
                <div className="p-8">
                  <WhatsAppConfig
                    ownerId={currentUser.id}
                    isAdmin={isAdmin}
                    currentUserId={currentUser.id}
                  />
                </div>
              </div>
            )}

            {activeSubTab === "forms" && <FormIntegrationsView />}

            {activeSubTab === "logs" && isAdmin && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Terminal className="text-indigo-600" size={24} />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                      Central de Logs do Sistema
                    </h2>
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Globe size={14} /> Integração n8n / Webhooks
                      </h3>
                      <N8nLogs isAdmin={isAdmin} />
                    </section>

                    <section>
                      <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MessageSquare size={14} /> WhatsApp Debug
                      </h3>
                      <WhatsAppAccountLogs userId={currentUser.id} />
                    </section>

                    <section>
                      <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity size={14} /> Processamento de Vídeo
                      </h3>
                      <VideoLogsView />
                    </section>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === "revoke" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                    Revogar e Excluir
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                    Controle seus dados, tokens e a existência da sua conta.
                  </p>
                </div>

                {/* Sessão: Segurança e Privacidade (Conexões) */}
                <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Shield size={14} /> Revogar Acessos Externos
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            Google Drive
                          </h4>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest font-black">
                            Integração OAUTH
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnectGoogle}
                        className="w-full py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-rose-500 rounded-xl text-xs font-black font-display uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shadow-sm"
                      >
                        Revogar Acesso
                      </button>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            Contas Meta
                          </h4>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest font-black">
                            FB & IG Business
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                          <Globe size={20} />
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnectMeta}
                        className="w-full py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-rose-500 rounded-xl text-xs font-black font-display uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shadow-sm"
                      >
                        Revogar Todas Chaves
                      </button>
                    </div>
                  </div>

                  <div className="pt-8 mt-8 border-t border-gray-100 dark:border-gray-800">
                    <h4 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <AlertTriangle size={14} /> Zona de Perigo
                    </h4>

                    {showDeleteConfirm ? (
                      <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-8 rounded-[2rem] animate-in zoom-in-95 duration-200 shadow-xl shadow-rose-500/5">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/40">
                            <AlertTriangle size={24} />
                          </div>
                          <div>
                            <h5 className="font-bold text-rose-900 dark:text-rose-100 tracking-tight text-lg">
                              Exclusão Permanente
                            </h5>
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                              Esta ação não pode ser revertida.
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-rose-700 dark:text-rose-400 font-medium mb-6 leading-relaxed">
                          Ao excluir sua conta, removeremos permanentemente
                          todos os seus leads, campanhas, automações e arquivos
                          vinculados ao CRM.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount}
                            className="px-8 py-3 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all disabled:opacity-50 shadow-lg shadow-rose-600/30"
                          >
                            {isDeletingAccount
                              ? "Processando..."
                              : "Confirmar Exclusão"}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-8 py-3 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 transition-all"
                          >
                            Cancelar e Voltar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-4 px-8 py-4 bg-white dark:bg-gray-900 border-2 border-rose-100 dark:border-rose-900/30 text-rose-600 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all group shadow-sm hover:shadow-md"
                      >
                        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-colors">
                          <Trash2 size={18} />
                        </div>
                        Excluir permanentemente minha conta do CRM
                      </button>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeSubTab === "privacidade" && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 space-y-8 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg dark:text-gray-100 uppercase tracking-tight">
                        Privacidade & Cookies
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Gerencie as configurações de conformidade e revise as
                        políticas.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open("/privacy", "_blank")}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-500 hover:underline px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl"
                  >
                    <ExternalLink size={14} /> Link Público
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h4 className="font-bold text-sm mb-2 uppercase tracking-tight">
                      Reiniciar Consentimento
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Clique no botão abaixo para remover sua decisão de
                      cookies. O banner aparecerá novamente na próxima recarga.
                    </p>
                    <button
                      onClick={() => {
                        localStorage.removeItem("cookie_consent");
                        toast.success(
                          "Consentimento removido! O banner reaparecerá em breve.",
                        );
                      }}
                      className="px-6 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-all shadow-sm"
                    >
                      Limpar Cookies
                    </button>
                  </div>

                  <div className="p-6 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
                    <h4 className="font-bold text-sm mb-2 uppercase tracking-tight text-indigo-600">
                      Conformidade LGPD
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      O Amplifica CRM utiliza essa funcionalidade para garantir
                      que sua agência esteja em conformidade por padrão,
                      solicitando consentimento antes de coletar dados não
                      essenciais.
                    </p>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-600 mb-4">
                      Cláusulas de Integração (Google OAuth)
                    </h4>

                    <div className="space-y-4 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                      <section>
                        <h5 className="font-bold text-gray-900 dark:text-gray-200">
                          1. INTEGRAÇÃO COM SERVIÇOS DO GOOGLE
                        </h5>
                        <p>
                          A plataforma acessará arquivos do seu Google Drive
                          estritamente para visualização e agendamento de
                          mídias. Não comercializamos dados nem os utilizamos
                          para fins publicitários.
                        </p>
                      </section>

                      <section>
                        <h5 className="font-bold text-gray-900 dark:text-gray-200">
                          2. POLÍTICA DE USO LIMITADO
                        </h5>
                        <p>
                          O uso de informações recebidas das APIs do Google
                          segue a Política de Dados do Usuário dos Serviços de
                          API do Google, cumprindo integralmente os requisitos
                          de Uso Limitado.
                        </p>
                      </section>

                      <section>
                        <h5 className="font-bold text-gray-900 dark:text-gray-200">
                          3. REVOGAÇÃO DE ACESSO
                        </h5>
                        <p>
                          Usuários podem desconectar sua conta a qualquer
                          momento via Configurações ou através do Google
                          Permissions Hub.
                        </p>
                      </section>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === "personalizacao" && (
              <div className="space-y-6">
                <PersonalizationView
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                />

                {canManageSystem && agencyConfig && setAgencyConfig && (
                  <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                    <div className="p-6 border-b border-gray-50 dark:border-gray-800 transition-colors">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 uppercase tracking-tight text-center w-full justify-center">
                        <Palette size={20} className="text-indigo-500" />{" "}
                        Identidade Visual da Agência
                      </h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 transition-colors text-center">
                        Configurações globais que afetam todos os usuários e
                        clientes.
                      </p>
                    </div>
                    <div className="p-8 space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors text-center block">
                          Nome da Empresa
                        </label>
                        <input
                          type="text"
                          value={agencyConfig.name || ""}
                          onChange={(e) => {
                            const next = {
                              ...agencyConfig,
                              name: e.target.value,
                            };
                            setAgencyConfig(next);
                            storageService.setItem(
                              "agency_config",
                              JSON.stringify(next),
                            );
                          }}
                          className="w-full max-w-sm mx-auto block px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300 shadow-inner"
                          placeholder="Sua Agência Ltda"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors text-center block">
                          Logo da Agência (Upload PNG/SVG)
                        </label>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/svg+xml"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const next = {
                                ...agencyConfig,
                                logoUrl: reader.result as string,
                              };
                              setAgencyConfig(next);
                              storageService.setItem(
                                "agency_config",
                                JSON.stringify(next),
                              );
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="w-full max-w-sm mx-auto block px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-500/10 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-500/20 transition-all cursor-pointer text-gray-500 dark:text-gray-400"
                        />
                        {agencyConfig.logoUrl &&
                          agencyConfig.logoUrl.startsWith("data:image") && (
                            <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 max-w-sm mx-auto transition-colors">
                              <div
                                className="p-2 rounded flex items-center justify-center bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors"
                                style={{
                                  backgroundColor:
                                    agencyConfig.logoBgColor ||
                                    agencyConfig.primaryColor,
                                }}
                              >
                                <img
                                  src={agencyConfig.logoUrl}
                                  alt="Preview"
                                  className="w-8 h-8 object-contain"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = { ...agencyConfig, logoUrl: "" };
                                  setAgencyConfig(next);
                                  storageService.setItem(
                                    "agency_config",
                                    JSON.stringify(next),
                                  );
                                }}
                                className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1 bg-rose-50 dark:bg-rose-500/10 rounded-lg transition-colors uppercase"
                              >
                                Remover Logo
                              </button>
                            </div>
                          )}
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 transition-colors text-center">
                          Recomendado: Imagens transparentes em formato quadrado
                          (1:1)
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto">
                        <div className="space-y-2 text-center">
                          <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors block">
                            Cor Primária
                          </label>
                          <div className="flex items-center gap-4 justify-center">
                            <input
                              type="color"
                              value={agencyConfig.primaryColor || "#6366f1"}
                              onChange={(e) => {
                                const next = {
                                  ...agencyConfig,
                                  primaryColor: e.target.value,
                                };
                                setAgencyConfig(next);
                                storageService.setItem(
                                  "agency_config",
                                  JSON.stringify(next),
                                );
                              }}
                              className="w-12 h-12 rounded-xl cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 transition-all"
                            />
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 transition-colors">
                              {agencyConfig.primaryColor}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 text-center">
                          <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors block">
                            Cor Fundo (Logo)
                          </label>
                          <div className="flex items-center gap-4 justify-center">
                            <input
                              type="color"
                              value={
                                agencyConfig.logoBgColor ||
                                agencyConfig.primaryColor ||
                                "#6366f1"
                              }
                              onChange={(e) => {
                                const next = {
                                  ...agencyConfig,
                                  logoBgColor: e.target.value,
                                };
                                setAgencyConfig(next);
                                storageService.setItem(
                                  "agency_config",
                                  JSON.stringify(next),
                                );
                              }}
                              className="w-12 h-12 rounded-xl cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 transition-all"
                            />
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 transition-colors">
                              {agencyConfig.logoBgColor ||
                                agencyConfig.primaryColor}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSubTab === "email" && isAdmin && <EmailConfigView />}
          </div>
        </div>
      </div>

      {/* Modal de Logs do Usuário */}
      <Modal
        isOpen={isUserLogsModalOpen}
        onClose={() => setIsUserLogsModalOpen(false)}
        title={`Logs de WhatsApp: ${viewingUserLogs?.name}`}
        footer={
          <div className="flex justify-end w-full">
            <button
              onClick={() => setIsUserLogsModalOpen(false)}
              className="px-6 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Fechar
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Activity size={16} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                Interações Recentes
              </h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Aqui você visualiza as mensagens enviadas e recebidas pelo motor
              de WhatsApp vinculado a este usuário.
            </p>
          </div>

          {viewingUserLogs && (
            <div className="bg-gray-900 dark:bg-black rounded-2xl p-4 font-mono text-[10px] text-emerald-400 h-80 overflow-y-auto border border-gray-800 dark:border-gray-900 shadow-inner transition-colors">
              <WhatsAppAccountLogs userId={viewingUserLogs.id} />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isEditUserModalOpen}
        onClose={() => setIsEditUserModalOpen(false)}
        title={`Editar Usuário: ${editingUser?.name}`}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => setIsEditUserModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdateUser}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors shadow-sm"
            >
              Salvar Alterações
            </button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleUpdateUser}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Nome
              </label>
              <input
                type="text"
                value={editUserData.name || ""}
                onChange={(e) =>
                  setEditUserData({ ...editUserData, name: e.target.value })
                }
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Role
              </label>
              <select
                value={editUserData.role || "DESIGNER"}
                onChange={(e) =>
                  setEditUserData({
                    ...editUserData,
                    role: e.target.value as any,
                  })
                }
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 transition-all"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="OWNER">OWNER</option>
                <option value="DESIGNER">DESIGNER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="PARTNER">PARCEIRO</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              E-mail
            </label>
            <input
              type="email"
              value={editUserData.email || ""}
              onChange={(e) =>
                setEditUserData({ ...editUserData, email: e.target.value })
              }
              className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 transition-all"
              required
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Nova Senha
              </label>
              <button
                type="button"
                onClick={handleGenerateTempPassword}
                className="text-[10px] font-bold text-indigo-500 hover:underline"
              >
                Gerar Senha Temporária
              </button>
            </div>
            <div className="relative group">
              <input
                type={showEditPassword ? "text" : "password"}
                value={editUserData.password || ""}
                onChange={(e) =>
                  setEditUserData({ ...editUserData, password: e.target.value })
                }
                placeholder="Deixe em branco para manter a atual"
                className="w-full pl-4 pr-10 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 transition-all font-mono placeholder:font-sans"
              />
              <button
                type="button"
                onClick={() => setShowEditPassword(!showEditPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-500 transition-colors"
              >
                {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {tempPassword && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium italic">
                Senha Gerada:{" "}
                <span className="font-bold underline">{tempPassword}</span>.
                Salve para aplicar.
              </p>
            )}
          </div>
          <p className="text-[10px] text-gray-400 italic">
            Alterar a senha forçará o usuário a usar a nova credencial no
            próximo login.
          </p>
        </form>
      </Modal>

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
              className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 font-bold hover:underline text-xs transition-colors"
            >
              <Link size={14} /> Gerar e Copiar Link
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setGeneratedLink(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
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
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl mb-4 animate-in fade-in zoom-in duration-300">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Check size={12} /> Link Copiado!
              </p>
              <input
                readOnly
                value={generatedLink || ""}
                className="w-full bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-500/20 px-3 py-2 rounded-lg text-[10px] font-mono text-emerald-700 dark:text-emerald-300 focus:outline-none"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={inviteData.name || ""}
              onChange={(e) =>
                setInviteData({ ...inviteData, name: e.target.value })
              }
              className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
              placeholder="Ex: João Designer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              E-mail
            </label>
            <input
              type="email"
              required
              value={inviteData.email || ""}
              onChange={(e) =>
                setInviteData({ ...inviteData, email: e.target.value })
              }
              className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
              placeholder="contato@amplifica.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Senha Provisória
            </label>
            <div className="relative group">
              <input
                type={showInvitePassword ? "text" : "password"}
                required
                value={inviteData.password || ""}
                onChange={(e) =>
                  setInviteData({ ...inviteData, password: e.target.value })
                }
                className="w-full pl-4 pr-10 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                placeholder="Ex: design123"
              />
              <button
                type="button"
                onClick={() => setShowInvitePassword(!showInvitePassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-500 transition-colors"
              >
                {showInvitePassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Cargo / Permissão
            </label>
            <select
              value={inviteData.role || "DESIGNER"}
              onChange={(e) =>
                setInviteData({ ...inviteData, role: e.target.value as any })
              }
              className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="DESIGNER" className="dark:bg-gray-900">
                Designer
              </option>
              <option value="EDITOR" className="dark:bg-gray-900">
                Editor
              </option>
              <option value="PARTNER" className="dark:bg-gray-900">
                Parceiro
              </option>
              <option value="ADMIN" className="dark:bg-gray-900">
                Administrador
              </option>
            </select>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </Modal>
    </>
  );
}
