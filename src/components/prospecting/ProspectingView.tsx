import React, { useState } from 'react';
import { Target, Search, Users, LayoutList, Send, History } from 'lucide-react';
import { cn } from '../../lib/utils';
import LeadsCapturedView from './LeadsCapturedView';
import ListsView from './ListsView';
import CampaignsView from './CampaignsView';
import { ProspectList } from '../../types';

export default function ProspectingView() {
  const [activeSubTab, setActiveSubTab] = useState<'leads' | 'lists' | 'campaigns' | 'messages' | 'history'>('leads');
  const [lists] = useState<ProspectList[]>([]);

  const tabs = [
    { id: 'leads', label: 'Leads Capturados', icon: Search },
    { id: 'lists', label: 'Listas', icon: LayoutList },
    { id: 'campaigns', label: 'Campanhas', icon: Target },
    { id: 'messages', label: 'Mensagens', icon: Send },
    { id: 'history', label: 'Histórico', icon: History },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Módulo de Prospecção</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Extração, organização e automação de contatos.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit transition-colors">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all",
              activeSubTab === tab.id 
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-gray-900 p-4 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm min-h-[400px] transition-all duration-300">
        {activeSubTab === 'leads' && <LeadsCapturedView />}
        {activeSubTab === 'lists' && <ListsView />}
        {activeSubTab === 'campaigns' && <CampaignsView lists={lists} />}
        {activeSubTab === 'messages' && <p className="text-gray-500 dark:text-gray-400 text-center py-20 italic">Fila de Mensagens (Em breve)</p>}
        {activeSubTab === 'history' && <p className="text-gray-500 dark:text-gray-400 text-center py-20 italic">Histórico de Interações (Em breve)</p>}
      </div>
    </div>
  );
}
