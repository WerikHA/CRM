import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, ShieldCheck, Zap, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (name: string, email: string, password: string) => Promise<void>;
  isLoading: boolean;
  initialMode?: 'login' | 'signup';
  onBack?: () => void;
}

export default function LoginView({ onLogin, onSignup, isLoading, initialMode = 'login', onBack }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onSignup(name, email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-white to-gray-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8 relative">
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute left-0 top-0 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 mb-6 group transition-transform hover:scale-110">
            <Zap className="w-8 h-8 group-hover:animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Amplifica <span className="text-indigo-600">CRM</span></h1>
          <p className="text-gray-500 font-medium">
            {mode === 'login' ? 'Acesso restrito para parceiros e admins' : 'Crie sua conta administrativa (OWNER)'}
          </p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600" />
          
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

            <div>
              <div className="flex items-center justify-between mb-2 ml-1">
                <label className="block text-sm font-bold text-gray-700">Senha de Acesso</label>
                {mode === 'login' && <button type="button" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Esqueceu?</button>}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

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
                  {mode === 'login' ? 'Entrar no Sistema' : 'Criar minha conta'}
                  <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center">
              <button 
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                {mode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem uma conta? Entre aqui'}
              </button>
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
