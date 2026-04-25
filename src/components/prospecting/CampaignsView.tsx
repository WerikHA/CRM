import React, { useState, useEffect } from 'react';
import { Target, Plus, Play, Pause, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProspectCampaign, ProspectList } from '../../types';
import { api } from '../../services/api';

export default function CampaignsView({ lists }: { lists: ProspectList[] }) {
  const [campaigns, setCampaigns] = useState<ProspectCampaign[]>([]);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName || !selectedList) return;
    try {
      const campaignData: any = {
        name: newCampaignName,
        listId: selectedList,
        status: 'draft',
        channel: 'whatsapp',
        messageTemplate: 'Olá {nome}, vi sua empresa {empresa} em {cidade} e acredito que podemos ajudar...',
        delayBetweenMessages: 30, // segundos
        dailyLimit: 50,
      };
      const created = await api.createCampaign(campaignData);
      setCampaigns([...campaigns, created]);
      setNewCampaignName('');
    } catch (err) {
      alert('Erro ao criar campanha: ' + err);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Excluir esta campanha?')) return;
    try {
      await api.deleteCampaign(id);
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (err) {
      alert('Erro ao excluir campanha: ' + err);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">Carregando campanhas...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-end transition-all shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-1 uppercase tracking-widest text-[10px]">Nome da Campanha</label>
          <input 
            type="text" 
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
            placeholder="Ex: Prospecção Dentistas SP"
          />
        </div>
        <div className="w-48">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-1 uppercase tracking-widest text-[10px]">Lista</label>
          <select 
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium outline-none"
          >
            <option value="" className="dark:bg-gray-900">Selecione uma lista...</option>
            {lists.map(list => <option key={list.id} value={list.id} className="dark:bg-gray-900">{list.name}</option>)}
          </select>
        </div>
        <button 
          onClick={handleCreateCampaign}
          className="bg-indigo-600 dark:bg-indigo-50 text-white dark:text-indigo-600 px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 dark:hover:bg-indigo-100 transition-all shadow-md active:scale-95 transition-colors"
        >
          <Plus size={18} />
          Criar Campanha
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden transition-all shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500">
            <tr>
              <th className="px-8 py-5 text-left text-[10px] uppercase tracking-[0.2em] font-black">Nome</th>
              <th className="px-8 py-5 text-left text-[10px] uppercase tracking-[0.2em] font-black">Status</th>
              <th className="px-8 py-5 text-left text-[10px] uppercase tracking-[0.2em] font-black">Canal</th>
              <th className="px-8 py-5 text-left text-[10px] uppercase tracking-[0.2em] font-black">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-16 text-center text-gray-400 dark:text-gray-500 italic font-medium">
                  Nenhuma campanha ativa. Crie uma nova para começar a automação.
                </td>
              </tr>
            )}
            {campaigns.map(camp => (
              <tr key={camp.id} className="hover:bg-indigo-50/10 dark:hover:bg-indigo-500/5 transition-all group">
                <td className="px-8 py-6 font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all uppercase tracking-tight">{camp.name}</td>
                <td className="px-8 py-6">
                  <span className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    camp.status === 'draft' ? "bg-gray-100 text-gray-500 dark:bg-gray-800" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                  )}>
                    {camp.status === 'draft' ? 'Rascunho' : camp.status}
                  </span>
                </td>
                <td className="px-8 py-6 uppercase text-[10px] font-black text-indigo-500 dark:text-indigo-400 tracking-widest">{camp.channel}</td>
                <td className="px-8 py-6 text-right">
                  <div className="flex gap-2 justify-start">
                    <button className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-sm"><Play size={16} fill="currentColor" /></button>
                    <button className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all shadow-sm"><Pause size={16} fill="currentColor" /></button>
                    <button 
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
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
