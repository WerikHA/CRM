import React, { useState, useEffect } from 'react';
import { Mail, Check, RefreshCcw, Save } from 'lucide-react';
import { cn, notifyError } from '../lib/utils';
import { toast } from './ui/Toast';

export function EmailConfigView() {
  const [config, setConfig] = useState({
    host: '',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    fromAddress: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/email/config');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('Erro ao buscar config de email', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Erro ao salvar configuração');
      toast.success('Configurações de e-mail salvas com sucesso!');
    } catch (err: any) {
      notifyError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error('Preencha o e-mail de destino para o teste.');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar e-mail de teste');
      toast.success('E-mail de teste enviado com sucesso!');
    } catch (err: any) {
      notifyError(err.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 transition-all duration-300">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-colors">
            <Mail size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg dark:text-gray-100 transition-colors uppercase tracking-tight">Servidor SMTP Interno</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">Configure os dados de SMTP para habilitar envio de e-mails pelo sistema.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">Servidor SMTP (Host)</label>
              <input
                type="text"
                required
                value={config.host || ''}
                onChange={e => setConfig({ ...config, host: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                placeholder="Ex: smtp.gmail.com"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Porta</label>
                <input
                  type="number"
                  required
                  value={config.port || 465}
                  onChange={e => setConfig({ ...config, port: Number(e.target.value) })}
                  className="w-full mt-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                  placeholder="Ex: 465"
                />
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 border rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.secure}
                    onChange={e => setConfig({ ...config, secure: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">SSL/TLS Seguro</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">Usuário / E-mail</label>
              <input
                type="text"
                required
                value={config.user || ''}
                onChange={e => setConfig({ ...config, user: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                placeholder="seuemail@exemplo.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">Senha do E-mail</label>
              <input
                type="password"
                required
                value={config.pass || ''}
                onChange={e => setConfig({ ...config, pass: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                placeholder="••••••••••••"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Remetente (Opicional)</label>
              <input
                type="text"
                value={config.fromAddress || ''}
                onChange={e => setConfig({ ...config, fromAddress: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                placeholder="Ex: Amplifica CRM <crm@seu-dominio.com>"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              {saving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 transition-all duration-300">
        <h3 className="font-bold text-lg dark:text-gray-100 uppercase tracking-tight mb-2">Testar Envio de E-mail</h3>
        <p className="text-xs text-gray-500 mb-4">Insira um endereço de e-mail válido para testar se as configurações acima estão corretas.</p>
        <div className="flex gap-4">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
            placeholder="E-mail de destino (ex: cliente@hotmail.com)"
          />
          <button
            onClick={handleTest}
            disabled={testing || !testEmail}
            className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold uppercase text-xs rounded-xl"
          >
            {testing ? 'Enviando...' : 'Enviar Teste'}
          </button>
        </div>
      </div>
    </div>
  );
}
