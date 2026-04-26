import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Server, ChevronRight, ShieldAlert, Copy, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';

export default function DatabaseAuditView() {
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fixSql, setFixSql] = useState<string | null>(null);
  const [showFixModal, setShowFixModal] = useState(false);

  const fetchAudit = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system/audit-db');
      const data = await res.json();
      setAuditData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async () => {
    try {
        const res = await fetch('/api/system/fix-db', { method: 'POST' });
        const data = await res.json();
        setFixSql(data.sql);
        setShowFixModal(true);
    } catch (err: any) {
        alert("Erro ao carregar script de correção: " + err.message);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Database className="text-indigo-500" />
            Auditoria do Banco de Dados
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Verificação de integridade e existência das tabelas do sistema.</p>
        </div>
        <button 
          onClick={fetchAudit}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Atualizar Relatório
        </button>
      </div>

      {loading && !auditData ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-12 text-center">
            <RefreshCw size={48} className="mx-auto text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Escaneando Infraestrutura...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 p-8 rounded-[2.5rem] flex items-center gap-4 text-rose-600 dark:text-rose-400">
          <AlertCircle size={32} />
          <div>
            <h4 className="font-bold">Erro na Auditoria</h4>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black font-display uppercase tracking-tight">Status Geral</h3>
                <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${auditData.missing_count === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {auditData.summary}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <Server className="text-indigo-500" size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Instância</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100">Supabase Cloud</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <Database className="text-indigo-500" size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Tabelas</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100">{Object.keys(auditData.details).length} total</span>
                </div>
            </div>

             {auditData.missing_tables.length > 0 && (
                <div className="mt-8 p-6 bg-rose-50 dark:bg-rose-900/20 rounded-[1.5rem] border border-rose-100 dark:border-rose-900/30">
                    <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertCircle size={14} />
                        Ação Necessária: Tabelas Faltantes
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {auditData.missing_tables.map((table: string) => (
                            <span key={table} className="px-3 py-1 bg-white dark:bg-gray-900 rounded-lg text-[10px] font-mono font-bold text-rose-500 shadow-sm border border-rose-100 dark:border-rose-950">
                                {table}
                            </span>
                        ))}
                    </div>
                    <button 
                        onClick={handleFix}
                        className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-md hover:bg-rose-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <ShieldAlert size={16} />
                        Gerar Script de Correção
                    </button>
                </div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm flex flex-col justify-between"
          >
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black font-display uppercase tracking-tight">Zona de Resgate</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recuperação de Acesso</p>
                    </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                    Se você perdeu o acesso à conta principal ou esqueceu a senha, utilize o botão abaixo para resetar a senha do primeiro <b>Administrador (OWNER)</b> encontrado no banco para <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-indigo-500">admin123</code>.
                </p>
            </div>

            <button 
                onClick={async () => {
                    if (confirm("Isso irá resetar a senha do administrador principal para 'admin123'. Deseja continuar?")) {
                        try {
                            const res = await fetch('/api/system/rescue-admin', { method: 'POST' });
                            const data = await res.json();
                            if (data.success) {
                                alert(`SUCESSO!\n\nEmail: ${data.email}\nNova Senha: ${data.newPassword}\n\nAgora você pode fazer login.`);
                            } else {
                                alert("Erro: " + data.error);
                            }
                        } catch (err: any) {
                            alert("Falha na requisição: " + err.message);
                        }
                    }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-amber-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-md hover:bg-amber-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                Resetar Senha Admin
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-2 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm"
          >
            <h3 className="text-lg font-black font-display uppercase tracking-tight mb-8">Dicionário de Tabelas</h3>
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(auditData.details).map(([table, detail]: [string, any]) => (
                    <div key={table} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-indigo-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{table}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${detail.status === 'ok' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {detail.status === 'ok' ? 'Online' : 'Erro'}
                            </span>
                            {detail.status === 'ok' ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                            ) : (
                                <AlertCircle size={16} className="text-rose-500" />
                            )}
                        </div>
                    </div>
                ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Fix Modal */}
      <AnimatePresence>
        {showFixModal && fixSql && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowFixModal(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-gray-950 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                >
                    <div className="p-8 border-b border-gray-50 dark:border-gray-900 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <h3 className="font-black font-display uppercase tracking-tight text-gray-900 dark:text-gray-100">Script de Correção</h3>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Execute no SQL Editor do Supabase</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowFixModal(false)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl transition-colors text-gray-400"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex gap-3">
                            <AlertCircle className="text-amber-500 shrink-0" size={18} />
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                                Este script irá criar todas as tabelas faltantes e configurar as permissões básicas. 
                                Copie o código abaixo e cole no <b>SQL Editor</b> do seu painel Supabase.
                            </p>
                        </div>

                        <div className="relative group">
                            <pre className="w-full h-64 bg-gray-900 dark:bg-black rounded-2xl p-6 font-mono text-[10px] text-emerald-400 overflow-y-auto custom-scrollbar border border-gray-800 shadow-inner select-all">
                                {fixSql}
                            </pre>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(fixSql);
                                    const btn = document.getElementById('copy-sql-btn');
                                    if (btn) btn.innerHTML = 'Copiado!';
                                    setTimeout(() => {
                                        if (btn) btn.innerHTML = 'Copiar Script';
                                    }, 2000);
                                }}
                                id="copy-sql-btn"
                                className="absolute top-4 right-4 p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm flex items-center gap-2 text-[10px] font-bold"
                            >
                                <Copy size={16} />
                                Copiar Script
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <a 
                                href={auditData.sql_editor_url || "https://supabase.com/dashboard/project/_/sql"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
                            >
                                Abrir SQL Editor
                            </a>
                            <button 
                                onClick={() => setShowFixModal(false)}
                                className="px-8 py-4 bg-gray-50 dark:bg-gray-900 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all border border-gray-100 dark:border-gray-800"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
