import React, { useState } from 'react';
import { Plus, Trash2, LayoutList } from 'lucide-react';
import { ProspectList } from '../../types';

export default function ListsView() {
  const [lists, setLists] = useState<ProspectList[]>([]);
  const [newList, setNewList] = useState('');

  const handleCreateList = () => {
    if (!newList) return;
    const list: ProspectList = {
      id: Math.random().toString(36).substr(2, 9),
      name: newList,
      createdAt: new Date().toLocaleDateString('pt-BR')
    };
    setLists([...lists, list]);
    setNewList('');
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <input 
          type="text" 
          value={newList} 
          onChange={(e) => setNewList(e.target.value)}
          placeholder="Nome da nova lista"
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
        />
        <button 
          onClick={handleCreateList}
          className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-md active:scale-95"
        >
          <Plus size={18} />
          Criar Lista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map(list => (
          <div key={list.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <button className="text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
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
               <span className="text-xs font-bold text-gray-400 dark:text-gray-500">0 Leads</span>
               <button className="text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:underline">Ver Leads</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
