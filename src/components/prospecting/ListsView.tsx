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
          className="flex-1 border rounded-xl px-4 py-2"
        />
        <button 
          onClick={handleCreateList}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-indigo-700"
        >
          <Plus size={18} />
          Criar Lista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map(list => (
          <div key={list.id} className="border rounded-2xl p-6 shadow-sm hover:border-indigo-200 transition">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                <LayoutList size={24} />
              </div>
              <button className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
            </div>
            <h3 className="font-bold text-lg">{list.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Criada em {list.createdAt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
