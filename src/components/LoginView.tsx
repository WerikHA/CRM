import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, ShieldCheck, Zap, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (name: string, email: string, password: string) => Promise<void>;
  isLoading: boolean;
  initialMode?: 'login' | 'signup';
  onBack?: () => void;
}

export default function LoginView({ onLogin, onSignup, isLoading, initialMode = 'login', onBack }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode as any);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'forgot') {
        const res = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao recuperar senha');
        setError(null);
        alert('Uma nova senha foi enviada para o seu e-mail!');
        setMode('login');
        return;
      }

      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onSignup(name, email, password);
      }
    } catch (err: any) {
      if (err.code === 'SYSTEM_EMPTY') {
        setError('Bem-vindo ao Amplifica CRM! Crie a primeira conta administrativa para começar.');
        setMode('signup');
      } else if (err.code === 'RLS_VIOLATION') {
        setError(
          <div className="flex flex-col gap-2">
            <span>{err.message || 'Erro de Permissão (RLS).'}</span>
            <button 
              onClick={() => (window as any).onNavigate?.('audit')}
              className="text-[10px] bg-white/10 hover:bg-white/20 p-2 rounded uppercase font-bold tracking-tighter"
            >
              Abrir Corretor de Banco de Dados
            </button>
          </div>
        );
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10 relative">
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute left-0 top-0 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg mb-6">
            <Zap className="w-7 h-7" />
          </div>
          <h1 className="text-4xl font-black font-display text-gray-900 tracking-tight mb-2 uppercase">Amplifica <span className="text-indigo-600 italic">CRM</span></h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest px-4">
            {mode === 'login' ? 'Autenticação de Usuário' : 'Novo Registro Administrativo'}
          </p>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 sm:p-12 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Nome Completo</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                    <LogIn size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 focus:bg-white transition-all"
                    placeholder="Seu nome"
                  />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">E-mail Corporativo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 focus:bg-white transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-2 ml-1">
                  <label className="block text-sm font-bold text-gray-700">Senha de Acesso</label>
                  {mode === 'login' && <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Esqueceu?</button>}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-12 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 focus:bg-white transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-2xl flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-bold text-lg hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Entrar no Sistema' : mode === 'signup' ? 'Criar minha conta' : 'Confirmar e Enviar'}
                  <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center">
              {mode !== 'login' ? (
                <button 
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Voltar para o Login
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Ainda não tem conta? Cadastre-se
                </button>
              )}
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-center gap-6 text-gray-400">
             <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
               <ShieldCheck size={14} /> Dados Protegidos
             </div>
             <div className="w-1 h-1 rounded-full bg-gray-200" />
             <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
               V. 2.0.4
             </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-gray-400 text-xs font-medium">
          Dificuldades de acesso? Entre em contato com o administrador da rede.
        </p>
      </motion.div>
    </div>
  );
}
