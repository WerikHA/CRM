import React, { useState } from 'react';
import { Target, Plus, Play, Pause, Trash2 } from 'lucide-react';
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
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Campanha</label>
          <input 
            type="text" 
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            className="w-full border rounded-xl px-4 py-2"
            placeholder="Ex: Prospecção Dentistas SP"
          />
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Lista</label>
          <select 
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
            className="w-full border rounded-xl px-4 py-2"
          >
            <option value="">Selecione...</option>
            {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
        </div>
        <button 
          onClick={handleCreateCampaign}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-indigo-700"
        >
          <Plus size={18} />
          Criar Campanha
        </button>
      </div>

      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-3 text-left">Nome</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Canal</th>
              <th className="px-6 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {campaigns.map(camp => (
              <tr key={camp.id}>
                <td className="px-6 py-4 font-medium">{camp.name}</td>
                <td className="px-6 py-4 capitalize">{camp.status}</td>
                <td className="px-6 py-4 uppercase text-xs font-bold">{camp.channel}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button className="text-green-600 hover:text-green-800"><Play size={18} /></button>
                  <button className="text-amber-600 hover:text-amber-800"><Pause size={18} /></button>
                  <button className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
