import React, { useState } from 'react';
import { Search, Loader2, Plus, Instagram, MapPin } from 'lucide-react';
import { ProspectLead } from '../../types';

export default function LeadsCapturedView() {
  const [source, setSource] = useState<'google' | 'instagram'>('google');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<ProspectLead[]>([]);

  const handleScrape = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prospecting/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, query, location }),
      });
      const data = await response.json();
      if (data.leads) {
        setLeads([...leads, ...data.leads]);
      }
    } catch (error) {
      console.error('Erro na extração:', error);
      alert('Erro ao extrair leads');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-wrap gap-4 items-end">
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
          <select 
            value={source} 
            onChange={(e) => setSource(e.target.value as any)}
            className="w-full border rounded-xl px-4 py-2"
          >
            <option value="google">Google Maps</option>
            <option value="instagram">Instagram</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Busca ({source === 'google' ? 'Nicho' : 'Keyword'})</label>
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border rounded-xl px-4 py-2"
            placeholder={source === 'google' ? 'Ex: Padarias' : 'Ex: @marketing'}
          />
        </div>
        {source === 'google' && (
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input 
              type="text" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border rounded-xl px-4 py-2"
              placeholder="Ex: São Paulo"
            />
          </div>
        )}
        <button 
          onClick={handleScrape}
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          Extrair
        </button>
      </div>

      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-3 text-left">Nome</th>
              <th className="px-6 py-3 text-left">Fonte</th>
              <th className="px-6 py-3 text-left">Cidade</th>
              <th className="px-6 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.map(lead => (
              <tr key={lead.id}>
                <td className="px-6 py-4 font-medium text-gray-900">{lead.name}</td>
                <td className="px-6 py-4">{lead.source === 'google' ? <MapPin size={16} className="text-red-500" /> : <Instagram size={16} className="text-pink-500" />}</td>
                <td className="px-6 py-4">{lead.city}</td>
                <td className="px-6 py-4">
                  <button className="text-indigo-600 hover:text-indigo-800"><Plus size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
