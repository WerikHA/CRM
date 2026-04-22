import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, LayoutGrid, List, MessageSquare, ExternalLink, Trash2, Phone } from 'lucide-react';
import { cn } from '../lib/utils';
import { Client, ClientStatus, User, Partner } from '../types';
import Modal from './Modal';

interface ClientsViewProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  users: User[];
  partners: Partner[];
}

export default function ClientsView({ clients, setClients, users, partners }: ClientsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    contactEmail: '',
    phone: '',
    monthlyValue: 0,
    renewlDate: '',
    status: 'active',
    assignedDesignerId: '',
    partnerId: '',
    designerPayout: 0
  });

  const designers = users.filter(u => u.role === 'DESIGNER');

  const handleAddClient = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      contactEmail: '',
      phone: '',
      monthlyValue: 0,
      renewalDate: new Date().toLocaleDateString('pt-BR'),
      status: 'active',
      assignedDesignerId: '',
      partnerId: '',
      designerPayout: 0
    });
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData(client);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...formData } as Client : c));
    } else {
      const newClient: Client = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        status: formData.status || 'active'
      } as Client;
      setClients([...clients, newClient]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClient = (id: string) => {
    setClients(clients.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight transition-colors">Clientes Ativos</h1>
          <p className="text-sm text-gray-500">Gerencie sua base de clientes recorrentes e contratos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-100 rounded-xl p-1 overflow-hidden shadow-sm transition-colors">
            <button className="p-1 px-2.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold transition-all"><List size={14} /></button>
            <button className="p-1 px-2.5 text-gray-400 hover:text-indigo-500 rounded-lg text-xs font-bold transition-all"><LayoutGrid size={14} /></button>
          </div>
          <button 
            onClick={handleAddClient}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
          >
            <Plus size={16} />
            Novo Cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div 
            key={client.id} 
            onClick={() => handleEditClient(client)}
            className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden transition-colors"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg transition-colors">
                {client.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors",
                  client.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                  client.status === 'paused' ? "bg-amber-50 text-amber-600 border-amber-100" :
                  "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {client.status === 'active' ? 'Ativo' : client.status === 'paused' ? 'Pausado' : 'Encerrado'}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{client.name}</h3>
              <p className="text-sm text-gray-400 mb-1 italic font-medium">{client.contactEmail}</p>
              {client.phone && (
                <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Phone size={10} /> {client.phone}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 mt-4 border-t border-gray-50 transition-colors">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Mensalidade</p>
                <p className="text-sm font-bold text-gray-900">R$ {client.monthlyValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Renovação</p>
                <p className="text-sm font-bold text-gray-700">{client.renewalDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <button className="flex-1 py-2 rounded-xl bg-white border border-gray-100 text-xs font-bold text-gray-500 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2">
                <MessageSquare size={14} /> Contato
              </button>
              <button className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-indigo-500 transition-all">
                <ExternalLink size={16} />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 w-0 group-hover:w-full transition-all duration-500" />
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
        footer={
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSubmit}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
            >
              {editingClient ? 'Salvar Alterações' : 'Adicionar Cliente'}
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome do Cliente / Empresa</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
              placeholder="Ex: Empresa de Tecnologia"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">E-mail</label>
              <input 
                type="email" 
                value={formData.contactEmail}
                onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Telefone</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mensalidade (R$)</label>
              <input 
                type="number" 
                value={formData.monthlyValue}
                onChange={e => setFormData({...formData, monthlyValue: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Data de Renovação</label>
              <input 
                type="text" 
                value={formData.renewalDate}
                onChange={e => setFormData({...formData, renewalDate: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status Inicial</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as ClientStatus})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              >
                <option value="active">Ativo</option>
                <option value="paused">Pausado</option>
                <option value="former">Encerrado</option>
              </select>
            </div>

            <div className="col-span-2 pt-4 border-t border-gray-100">
              <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-4">Atribuições e Parcerias</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Designer Responsável</label>
                  <select 
                    value={formData.assignedDesignerId}
                    onChange={e => setFormData({...formData, assignedDesignerId: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="">Nenhum</option>
                    {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payout do Designer (R$)</label>
                  <input 
                    type="number" 
                    value={formData.designerPayout}
                    onChange={e => setFormData({...formData, designerPayout: Number(e.target.value)})}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Valor fixo por mês"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Agência Parceira (Referência)</label>
                  <select 
                    value={formData.partnerId}
                    onChange={e => setFormData({...formData, partnerId: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="">Venda Direta (Sem Parceiro)</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.agencyName} ({p.name})</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
