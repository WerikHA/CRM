import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, LayoutGrid, List, MessageSquare, ExternalLink, Trash2, Phone } from 'lucide-react';
import { cn } from '../lib/utils';
import { Client, ClientStatus, User, Partner } from '../types';
import Modal from './Modal';
import { api } from '../services/api';

interface ClientsViewProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  users: User[];
  partners: Partner[];
  currentUser: User;
}

export default function ClientsView({ clients, setClients, users, partners, currentUser }: ClientsViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const initialFormData: Partial<Client> = {
    name: '',
    contactEmail: '',
    phone: '',
    pixKey: '',
    monthlyValue: 0,
    renewalDate: '',
    status: 'active',
    assignedDesignerId: '',
    partnerId: '',
    designerPayout: 0,
    branding: {
      colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'],
      logo: ''
    }
  };

  const [formData, setFormData] = useState<Partial<Client>>(initialFormData);

  const designers = users.filter(u => u.role === 'DESIGNER');
  const isPartner = currentUser.role === 'PARTNER';
  const isAdmin = currentUser.role === 'ADMIN';

  const filteredClients = isPartner 
    ? clients.filter(c => c.partnerId === currentUser.id)
    : clients;

  const handleAddClient = () => {
    setEditingClient(null);
    setFormData(initialFormData);
    setFormData(prev => ({
      ...prev,
      renewalDate: new Date().toLocaleDateString('pt-BR'),
      partnerId: isPartner ? currentUser.id : ''
    }));
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      ...initialFormData,
      ...client
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        const updated = await api.updateClient(editingClient.id, formData);
        setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...updated } : c));
      } else {
        const newClientData: any = {
          ...formData,
          id: 'c' + Math.random().toString(36).substr(2, 9),
          status: formData.status || 'active'
        };
        const created = await api.createClient(newClientData);
        setClients([...clients, created]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar cliente: ' + err.message);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await api.deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir cliente: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight transition-colors">Clientes Ativos</h1>
          <p className="text-sm text-gray-500">Gerencie sua base de clientes recorrentes e contratos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 overflow-hidden shadow-sm transition-colors">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1 px-2.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:text-indigo-500"
              )}
            >
              <List size={14} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1 px-2.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'grid' ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:text-indigo-500"
              )}
            >
              <LayoutGrid size={14} />
            </button>
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

      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-colors">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mensalidade</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => handleEditClient(client)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {client.branding?.logo ? (
                        <img src={client.branding.logo} className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 leading-none">{client.name}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{client.contactEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border",
                      client.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      client.status === 'paused' ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      {client.status === 'active' ? 'Ativo' : client.status === 'paused' ? 'Pausado' : 'Encerrado'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">R$ {client.monthlyValue.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                      className="p-2 hover:bg-white rounded-lg text-rose-300 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div 
              key={client.id} 
              onClick={() => handleEditClient(client)}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden transition-colors"
            >
              <div className="flex justify-between items-start mb-6">
                {client.branding?.logo ? (
                  <img src={client.branding.logo} className="w-12 h-12 rounded-2xl object-cover border border-gray-100 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg transition-colors">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
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
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if(client.phone) window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}`, '_blank');
                  }}
                  className="flex-1 py-2 rounded-xl bg-white border border-gray-100 text-xs font-bold text-gray-500 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
                >
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
      )}

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
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chave PIX</label>
              <input 
                type="text" 
                value={formData.pixKey || ''}
                onChange={e => setFormData({...formData, pixKey: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
                placeholder="Ex: CPF, E-mail ou Chave Aleatória"
              />
            </div>
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
              <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-4">Branding do Cliente</h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Logo do Cliente (Upload)</label>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/svg+xml"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({...formData, branding: { ...formData.branding!, logo: reader.result as string }});
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-2xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer"
                  />
                  {formData.branding?.logo && formData.branding.logo.startsWith('data:image') && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100">
                       <img src={formData.branding.logo} alt="Preview" className="w-10 h-10 object-contain rounded bg-white shadow-sm" />
                       <button 
                         type="button" 
                         onClick={() => setFormData({...formData, branding: { ...formData.branding!, logo: '' }})} 
                         className="text-xs font-bold text-rose-500 hover:text-rose-600"
                       >
                         Remover Logo
                       </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cores da Marca (Até 5)</label>
                  <div className="flex gap-2 flex-wrap">
                    {formData.branding?.colors.map((color, idx) => (
                      <div key={idx} className="flex flex-col gap-1 items-center">
                        <input 
                          type="color" 
                          value={color}
                          onChange={e => {
                            const newColors = [...formData.branding!.colors];
                            newColors[idx] = e.target.value;
                            setFormData({...formData, branding: { ...formData.branding!, colors: newColors }});
                          }}
                          className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          value={color}
                          onChange={e => {
                            const newColors = [...formData.branding!.colors];
                            newColors[idx] = e.target.value;
                            setFormData({...formData, branding: { ...formData.branding!, colors: newColors }});
                          }}
                          className="w-16 text-[8px] font-mono border border-gray-100 rounded text-center uppercase"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
