import React, { useState } from 'react';
import { Target, Plus, Play, Pause, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProspectCampaign, ProspectList } from '../../types';

export default function CampaignsView({ lists }: { lists: ProspectList[] }) {
  const [campaigns, setCampaigns] = useState<ProspectCampaign[]>([]);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [selectedList, setSelectedList] = useState('');

  const handleCreateCampaign = () => {
    if (!newCampaignName || !selectedList) return;
    const campaign: ProspectCampaign = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCampaignName,
      listId: selectedList,
      status: 'draft',
      channel: 'whatsapp',
      messageTemplate: 'Olá {nome}, vi sua empresa {empresa} em {cidade} e acredito que podemos ajudar...',
      delayBetweenMessages: 30, // segundos
      dailyLimit: 50,
    };
    setCampaigns([...campaigns, campaign]);
    setNewCampaignName('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-end transition-colors">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-1 uppercase tracking-widest text-[10px]">Nome da Campanha</label>
          <input 
            type="text" 
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
            placeholder="Ex: Prospecção Dentistas SP"
          />
        </div>
        <div className="w-48">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-1 uppercase tracking-widest text-[10px]">Lista</label>
          <select 
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
          >
            <option value="" className="dark:bg-gray-900">Selecione...</option>
            {lists.map(list => <option key={list.id} value={list.id} className="dark:bg-gray-900">{list.name}</option>)}
          </select>
        </div>
        <button 
          onClick={handleCreateCampaign}
          className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-md active:scale-95"
        >
          <Plus size={18} />
          Criar Campanha
        </button>
      </div>

      <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden transition-colors shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold">Nome</th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold">Status</th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold">Canal</th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 italic">
                  Nenhuma campanha ativa. Crie uma nova para começar a automação.
                </td>
              </tr>
            )}
            {campaigns.map(camp => (
              <tr key={camp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{camp.name}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                    camp.status === 'draft' ? "bg-gray-100 text-gray-600 dark:bg-gray-800" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10"
                  )}>
                    {camp.status}
                  </span>
                </td>
                <td className="px-6 py-4 uppercase text-[10px] font-black text-indigo-500 dark:text-indigo-400">{camp.channel}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 transition shadow-sm"><Play size={16} /></button>
                    <button className="p-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 transition shadow-sm"><Pause size={16} /></button>
                    <button className="p-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-lg hover:bg-rose-100 transition shadow-sm"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
