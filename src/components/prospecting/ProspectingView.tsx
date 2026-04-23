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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Módulo de Prospecção</h1>
        <p className="text-sm text-gray-500">Extração, organização e automação de contatos.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all",
              activeSubTab === tab.id 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm min-h-[400px]">
        {activeSubTab === 'leads' && <LeadsCapturedView />}
        {activeSubTab === 'lists' && <ListsView />}
        {activeSubTab === 'campaigns' && <CampaignsView lists={lists} />}
        {activeSubTab === 'messages' && <p>Fila de Mensagens</p>}
        {activeSubTab === 'history' && <p>Histórico de Interações</p>}
      </div>
    </div>
  );
}
