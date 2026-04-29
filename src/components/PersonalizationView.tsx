import React, { useState } from 'react';
import { Palette, Moon, Sun, Monitor, Maximize2, Minimize2, Layout, Check, RotateCcw } from 'lucide-react';
import { User, UserPreferences } from '../types';
import { cn } from '../lib/utils';
import { api } from '../services/api';
import { storageService } from '../lib/storage';
import toast from 'react-hot-toast';

interface PersonalizationViewProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
}

const PRESET_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Rose', value: '#fb7185' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Slate', value: '#475569' },
];

export default function PersonalizationView({ currentUser, setCurrentUser }: PersonalizationViewProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    primaryColor: '#6366f1',
    borderRadius: 'medium',
    density: 'normal',
    sidebarStyle: 'full',
    ...currentUser.uiPreferences
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedUser = await api.updateUser(currentUser.id, {
        uiPreferences: preferences
      });
      
      setCurrentUser(updatedUser);
      storageService.setItem('agency_user', JSON.stringify(updatedUser), true);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      toast.error('Erro ao salvar preferências');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPreferences({
      theme: 'system',
      primaryColor: '#6366f1',
      borderRadius: 'medium',
      density: 'normal',
      sidebarStyle: 'full'
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Personalização</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Ajuste o visual e a densidade da interface do CRM.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <RotateCcw size={16} /> Restaurar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-2 px-6 py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50",
              showSuccess && "bg-emerald-500 hover:bg-emerald-500"
            )}
          >
            {isSaving ? 'Salvando...' : showSuccess ? <><Check size={16} /> Salvo!</> : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Sessão: Cores */}
        <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Palette size={14} /> Cor de Destaque
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
            {PRESET_COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => updatePreference('primaryColor', color.value)}
                className={cn(
                  "group relative aspect-square rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95",
                  preferences.primaryColor === color.value ? "ring-4 ring-offset-2 ring-indigo-500/20 dark:ring-offset-gray-900" : ""
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {preferences.primaryColor === color.value && (
                  <Check size={20} className="text-white drop-shadow-md" />
                )}
              </button>
            ))}
            <div className="relative group aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden transition-all hover:border-indigo-400">
              <input 
                type="color" 
                value={preferences.primaryColor}
                onChange={e => updatePreference('primaryColor', e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div 
                className={cn("w-6 h-6 rounded-lg transition-transform group-hover:scale-125")}
                style={{ backgroundColor: preferences.primaryColor }}
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sessão: Tema */}
          <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Palette size={14} /> Tema Visual
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', name: 'Claro', icon: Sun },
                { id: 'dark', name: 'Escuro', icon: Moon },
                { id: 'system', name: 'Sistema', icon: Monitor }
              ].map(theme => {
                const Icon = theme.icon;
                return (
                  <button
                    key={theme.id}
                    onClick={() => updatePreference('theme', theme.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                      preferences.theme === theme.id 
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                        : "border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200 dark:hover:border-gray-700"
                    )}
                  >
                    <Icon size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sessão: Densidade */}
          <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Maximize2 size={14} /> Densidade Visual
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'compact', name: 'Compacto', icon: Minimize2 },
                { id: 'normal', name: 'Normal', icon: Layout },
                { id: 'relaxed', name: 'Espaçoso', icon: Maximize2 }
              ].map(d => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    onClick={() => updatePreference('density', d.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                      preferences.density === d.id 
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                        : "border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200 dark:hover:border-gray-700"
                    )}
                  >
                    <Icon size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{d.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sessão: Estilo de Bordas */}
          <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Layout size={14} /> Arredondamento
            </h2>
            <div className="flex flex-wrap gap-2">
              {['none', 'small', 'medium', 'large', 'full'].map(radius => (
                <button
                  key={radius}
                  onClick={() => updatePreference('borderRadius', radius as any)}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all uppercase tracking-widest",
                    preferences.borderRadius === radius 
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                      : "border-gray-100 dark:border-gray-800 text-gray-500"
                  )}
                >
                  {radius === 'none' ? 'Reto' : radius === 'small' ? 'P' : radius === 'medium' ? 'M' : radius === 'large' ? 'G' : 'Total'}
                </button>
              ))}
            </div>
          </section>

          {/* Sessão: Estilo da Barra Lateral */}
          <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Layout size={14} /> Barra Lateral
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'full', name: 'Padrão' },
                { id: 'glass', name: 'Vidro (Blur)' }
              ].map(style => (
                <button
                  key={style.id}
                  onClick={() => updatePreference('sidebarStyle', style.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                    preferences.sidebarStyle === style.id 
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                      : "border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200 dark:hover:border-gray-700"
                  )}
                >
                  <Layout size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{style.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
