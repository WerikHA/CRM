import React, { useState, useEffect } from 'react';
import { Plus, Trash2, LayoutList } from 'lucide-react';
import { ProspectList } from '../../types';
import { api } from '../../services/api';

export default function ListsView() {
  const [lists, setLists] = useState<ProspectList[]>([]);
  const [newList, setNewList] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const data = await api.getProspectLists();
      setLists(data);
    } catch (err) {
      console.error('Erro ao buscar listas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newList) return;
    try {
      const listData = {
        name: newList,
        createdAt: new Date().toLocaleDateString('pt-BR')
      };
      const created = await api.createProspectList(listData);
      setLists([...lists, created]);
      setNewList('');
    } catch (err) {
      alert('Erro ao criar lista: ' + err);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm('Excluir esta lista?')) return;
    try {
      await api.deleteProspectList(id);
      setLists(lists.filter(l => l.id !== id));
    } catch (err) {
      alert('Erro ao excluir lista: ' + err);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">Carregando listas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <input 
          type="text" 
          value={newList || ''} 
          onChange={(e) => setNewList(e.target.value)}
          placeholder="Nome da nova lista"
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
        />
        <button 
          onClick={handleCreateList}
          className="bg-indigo-600 dark:bg-indigo-50 text-white dark:text-indigo-600 px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 dark:hover:bg-indigo-100 transition-all shadow-md active:scale-95 transition-colors"
        >
          <Plus size={18} />
          Criar Lista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map(list => (
          <div key={list.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                onClick={() => handleDeleteList(list.id)}
                className="text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
               >
                 <Trash2 size={18} />
               </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
               <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 transition-colors shadow-sm">
                 <LayoutList size={22} />
               </div>
               <div>
                 <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{list.name}</h3>
                 <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest leading-none">Criada em {list.createdAt}</p>
               </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-800">
               <span className="text-xs font-bold text-gray-400 dark:text-gray-500 transition-colors tracking-tight">Status: Ativa</span>
               <button className="text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:underline transition-colors uppercase tracking-widest">Ver Leads</button>
            </div>
          </div>
        ))}
        {lists.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 dark:text-gray-600 italic">
            Nenhuma lista encontrada. Comece criando uma acima.
          </div>
        )}
      </div>
    </div>
  );
}
