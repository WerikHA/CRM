import React, { useState } from 'react';
import { Search, Loader2, Plus, Instagram, MapPin, Globe } from 'lucide-react';
import { ProspectLead } from '../../types';

export default function LeadsCapturedView() {
  const [source, setSource] = useState<'google' | 'instagram'>('google');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<ProspectLead[]>([]);

  const handleScrape = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const response = await fetch('/api/prospecting/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, query, location }),
      });
      
      const data = await response.json();
      
      if (data.success && data.leads) {
        setLeads([...leads, ...data.leads]);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro na extração técnica:', error);
      alert('Erro ao extrair leads. Tente outro nicho ou localidade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-end transition-colors">
        <div className="w-48">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-1 uppercase tracking-widest text-[10px]">Fonte</label>
          <select 
            value={source || 'google'} 
            onChange={(e) => setSource(e.target.value as any)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
          >
            <option value="google" className="dark:bg-gray-900">Google Maps</option>
            <option value="instagram" className="dark:bg-gray-900">Instagram</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-1 uppercase tracking-widest text-[10px]">Busca ({source === 'google' ? 'Nicho' : 'Keyword'})</label>
          <input 
            type="text" 
            value={query || ''} 
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
            placeholder={source === 'google' ? 'Ex: Padarias' : 'Ex: @marketing'}
          />
        </div>
        {source === 'google' && (
          <div className="w-48">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-1 uppercase tracking-widest text-[10px]">Cidade</label>
            <input 
              type="text" 
              value={location || ''} 
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
              placeholder="Ex: São Paulo"
            />
          </div>
        )}
        <button 
          onClick={handleScrape}
          disabled={loading}
          className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-md active:scale-95"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          Extrair
        </button>
      </div>

      <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden transition-colors shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold">Nome</th>
                <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold">Fonte</th>
                <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold">Contato</th>
                <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold">Info</th>
                <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {leads.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 italic">
                    Nenhum lead capturado nesta sessão. Use o formulário acima para extrair contatos.
                  </td>
                </tr>
              )}
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{lead.name}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">{lead.category}</div>
                  </td>
                  <td className="px-6 py-4">
                    {lead.source === 'google' ? (
                      <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <MapPin size={14} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">G-Maps</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400">
                        <Instagram size={14} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Insta</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 dark:text-gray-100 font-mono text-xs">{lead.phone}</div>
                    <div className="text-[11px] text-indigo-500 dark:text-indigo-400 truncate max-w-[150px] font-medium">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{lead.city}</div>
                    {lead.username && <div className="text-[10px] text-pink-500 font-bold">@{lead.username}</div>}
                    {lead.site && (
                      <a href={lead.site.startsWith('http') ? lead.site : `https://${lead.site}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-500 hover:underline flex items-center gap-1 mt-1 transition-colors">
                        <Globe size={10} /> Ver Site
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm active:scale-90"
                      title="Importar como Lead no CRM"
                    >
                      <Plus size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
