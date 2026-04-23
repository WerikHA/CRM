import React, { useState } from 'react';
import { Handshake, ExternalLink, Plus, MoreHorizontal, Briefcase, Mail, Trash2, Users, Receipt, ArrowRight, Clock, DollarSign } from 'lucide-react';
import { PartnerRequest, PartnerRequestStatus, Partner, User, ArtOrder, Client } from '../types';
import Modal from './Modal';
import { cn } from '../lib/utils';
import { api } from '../services/api';

interface PartnersViewProps {
  partnerRequests: PartnerRequest[];
  setPartnerRequests: React.Dispatch<React.SetStateAction<PartnerRequest[]>>;
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  currentUser: User;
  artOrders: ArtOrder[];
  setArtOrders: React.Dispatch<React.SetStateAction<ArtOrder[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

export default function PartnersView({ 
  partnerRequests, 
  setPartnerRequests, 
  partners, 
  setPartners, 
  currentUser,
  artOrders,
  setArtOrders,
  clients,
  setClients,
  users,
  setUsers
}: PartnersViewProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'agencies' | 'team'>(currentUser.role === 'PARTNER' ? 'requests' : 'agencies');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PartnerRequest | null>(null);
  const [editingAgency, setEditingAgency] = useState<Partner | null>(null);
  const [editingTeamMember, setEditingTeamMember] = useState<User | null>(null);
  
  const isAdmin = currentUser.role === 'ADMIN';
  const isPartner = currentUser.role === 'PARTNER';

  const initialTeamFormData: Partial<User> = {
    name: '',
    email: '',
    role: 'EDITOR'
  };

  const initialAgencyFormData: Partial<Partner> = {
    name: '',
    agencyName: '',
    email: '',
    phone: '',
    commissionType: 'percentage',
    commissionValue: 10
  };

  const initialRequestFormData: Partial<PartnerRequest> = {
    clientName: '',
    serviceType: '',
    cost: 0,
    status: 'pending',
    partnerId: '',
    partnerName: ''
  };

  const [teamFormData, setTeamFormData] = useState<Partial<User>>(initialTeamFormData);

  const [agencyFormData, setAgencyFormData] = useState<Partial<Partner>>(initialAgencyFormData);

  const [formData, setFormData] = useState<Partial<PartnerRequest>>(initialRequestFormData);

  const filteredRequests = currentUser.role === 'PARTNER' 
    ? partnerRequests.filter(r => r.partnerId === currentUser.id)
    : partnerRequests;

  const handleAddRequest = () => {
    setEditingRequest(null);
    setFormData({
      ...initialRequestFormData,
      partnerId: isAdmin ? (partners[0]?.id || '') : currentUser.id,
      partnerName: isAdmin ? (partners[0]?.name || '') : currentUser.name
    });
    setIsModalOpen(true);
  };

  const handleAddAgency = () => {
    setEditingAgency(null);
    setAgencyFormData(initialAgencyFormData);
    setIsAgencyModalOpen(true);
  };

  const handleAgencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAgency) {
      setPartners(prev => prev.map(p => p.id === editingAgency.id ? { ...p, ...agencyFormData } as Partner : p));
    } else {
      const newPartner: Partner = {
        ...agencyFormData,
        id: 'p' + Math.random().toString(36).substring(2, 9)
      } as Partner;
      setPartners(prev => [...prev, newPartner]);
    }
    setIsAgencyModalOpen(false);
  };

  const handleAddTeamMember = () => {
    setEditingTeamMember(null);
    setTeamFormData(initialTeamFormData);
    setIsTeamModalOpen(true);
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeamMember) {
        const updated = await api.updateUser(editingTeamMember.id, teamFormData);
        setUsers(users.map(u => u.id === editingTeamMember.id ? { ...u, ...updated } : u));
      } else {
        const newUser: User = {
          ...teamFormData,
          id: Math.random().toString(36).substr(2, 9),
          role: teamFormData.role || 'EDITOR',
          ownerId: currentUser.id
        } as User;
        const created = await api.createUser(newUser);
        setUsers([...users, created]);
      }
      setIsTeamModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar membro da equipe: ' + err.message);
    }
  };

  const handleDeleteTeamMember = async (id: string) => {
    try {
      await api.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir membro: ' + err.message);
    }
  };

  const myTeam = users.filter(u => u.ownerId === currentUser.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRequest) {
        const updated = await api.updatePartnerRequest(editingRequest.id, formData);
        setPartnerRequests(prev => prev.map(r => r.id === editingRequest.id ? { ...r, ...updated } : r));
      } else {
        const requestId = 'pr' + Math.random().toString(36).substring(2, 9);
        const newRequestData: any = {
          ...formData,
          id: requestId,
          partnerId: formData.partnerId || 'unknown',
          partnerName: formData.partnerName || 'Agência Externa',
          clientName: formData.clientName || '',
          serviceType: formData.serviceType || '',
          cost: formData.cost || 0,
          status: formData.status as PartnerRequestStatus || 'pending'
        };
        const createdRequest = await api.createPartnerRequest(newRequestData);
        setPartnerRequests(prev => [...prev, createdRequest]);

        // Automatically push to Design Workflow (ArtOrder)
        // First, check/create client if needed
        let clientId = clients.find(c => c.name === formData.clientName)?.id;
        if (!clientId) {
          clientId = 'c' + Math.random().toString(36).substring(2, 9);
          const newClient: Client = {
            id: clientId,
            name: formData.clientName || '',
            status: 'active',
            monthlyValue: formData.cost || 0,
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
            contactEmail: '',
            partnerId: formData.partnerId
          };
          const createdClient = await api.createClient(newClient);
          setClients(prev => [...prev, createdClient]);
        }

        const designers = users.filter(u => u.role === 'DESIGNER');
        const newOrder: ArtOrder = {
          id: 'ao' + Math.random().toString(36).substring(2, 9),
          title: formData.serviceType || 'Novo Job',
          clientId: clientId,
          designerId: designers[0]?.id || 'unknown',
          designerName: designers[0]?.name || 'Pendente',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
          priority: 'medium',
          progress: 0,
          status: 'queue'
        };
        const createdOrder = await api.createArtOrder(newOrder);
        setArtOrders(prev => [...prev, createdOrder]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar solicitação: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight transition-colors">
            {isAdmin ? 'Gestão de Parcerias' : 'Área do Parceiro'}
          </h1>
          <p className="text-sm text-gray-500">
            {isAdmin ? 'Controle agências parceiras e fluxos Agency-to-Agency.' : 'Gerencie suas solicitações e clientes atendidos pela nossa agência.'}
          </p>
        </div>
        
        {activeTab === 'requests' && (currentUser.role === 'PARTNER' || isAdmin) && (
          <button 
            onClick={handleAddRequest}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nova Solicitação
          </button>
        )}
      </div>

      {/* Partners Summary Cards (The "Group") */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total de Parceiros</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{partners.length}</h3>
            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
              <Briefcase size={16} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pedidos Pendentes</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-gray-900">
              {filteredRequests.filter(r => r.status === 'pending').length}
            </h3>
            <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
              <Clock size={16} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Jobs Concluídos</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-gray-900">
              {filteredRequests.filter(r => r.status === 'completed' || r.status === 'delivered').length}
            </h3>
            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
              <Receipt size={16} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Receita Gerada</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-gray-900">
              R$ {filteredRequests.reduce((acc, r) => acc + r.cost, 0).toLocaleString()}
            </h3>
            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
              <DollarSign size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('agencies')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'agencies' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Agências Parceiras
          </button>
        )}
        <button 
          onClick={() => setActiveTab('requests')}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
            activeTab === 'requests' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
           {isPartner ? 'Minhas Solicitações' : 'Solicitações (Jobs)'}
        </button>
        <button 
          onClick={() => setActiveTab('team')}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
            activeTab === 'team' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
           {isPartner ? 'Minha Equipe' : 'Gestão de Equipes'}
        </button>
      </div>

      {activeTab === 'agencies' && isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner) => (
            <div key={partner.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Briefcase size={24} />
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase">Parceiro Ativo</span>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 text-lg tracking-tight uppercase">{partner.agencyName}</h3>
                <p className="text-sm text-gray-400 font-medium italic">{partner.name}</p>
                <div className="flex items-center gap-2 mt-2">
                   <Mail size={12} className="text-gray-300" />
                   <span className="text-xs text-gray-500">{partner.email}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Comissão</p>
                    <p className="text-sm font-bold text-gray-900">
                      {partner.commissionValue}{partner.commissionType === 'percentage' ? '%' : ' BRL'}
                    </p>
                 </div>
                 <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Contatos</p>
                    <p className="text-sm font-bold text-indigo-600 flex items-center gap-1">
                      WPP <ExternalLink size={10} />
                    </p>
                 </div>
              </div>
              
              <button className="w-full mt-6 py-2 rounded-xl bg-gray-50 text-xs font-bold text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                 <Users size={14} /> Ver Clientes Deste Parceiro
              </button>
            </div>
          ))}
          
          <button 
            onClick={handleAddAgency}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-all"
          >
             <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                <Plus size={24} />
             </div>
             <span className="font-bold text-sm">Adicionar Nova Agência</span>
          </button>
        </div>
      ) : activeTab === 'team' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 uppercase tracking-tight">Membros da Equipe</h3>
            <button 
              onClick={handleAddTeamMember}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow-sm"
            >
              <Plus size={14} /> Adicionar Membro
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cargo</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {myTeam.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center font-bold text-xs">
                          {member.name.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{member.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-100">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteTeamMember(member.id)}
                        className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {myTeam.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users size={32} className="text-gray-200" />
                        <p className="text-sm text-gray-400 italic">Sua equipe está vazia. Adicione membros para começar.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente Final</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Serviço Solicitado</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parceiro</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custo / Valor</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-xs">
                          {request.clientName.substring(0, 1)}
                       </div>
                       <span className="font-bold text-gray-900 text-sm tracking-tight">{request.clientName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">{request.serviceType}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-gray-500">{request.partnerName || 'Externo'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">R$ {request.cost.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                      request.status === 'ongoing' ? "bg-sky-50 text-sky-600 border-sky-100" :
                      request.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {request.status === 'pending' ? 'Pendente' : request.status === 'ongoing' ? 'Em Andamento' : 'Concluído'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                       <ArrowRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                    Nenhuma solicitação encontrada para o seu perfil.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Banner de Info */}
      <div className="bg-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
         <div className="absolute right-0 top-0 p-12 opacity-10 pointer-events-none transform rotate-12">
            <Handshake size={180} />
         </div>
         <div className="relative z-10 max-w-xl">
            <h2 className="text-2xl font-bold mb-2">Agency for Agencies (A4A)</h2>
            <p className="text-indigo-100 text-sm leading-relaxed mb-6">
              Aumente o faturamento da sua agência fornecendo nossos braços operacionais de tráfego, design e vídeo 
              para seus parceiros. Você gerencia o relacionamento, nós gerenciamos o pixel.
            </p>
            <div className="flex items-center gap-4">
               <button className="px-6 py-2.5 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all">
                  Tabela de Preços Atacado
               </button>
               <button className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl font-bold text-sm hover:bg-indigo-400 transition-all">
                  Suporte ao Parceiro
               </button>
            </div>
         </div>
      </div>
      
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRequest ? "Editar Solicitação" : "Nova Solicitação de Job"}
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
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors shadow-sm"
            >
              {editingRequest ? 'Salvar Alterações' : 'Enviar Solicitação'}
            </button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome do Cliente Final</label>
            <input 
              type="text" 
              required
              value={formData.clientName}
              onChange={e => setFormData({...formData, clientName: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              placeholder="Ex: Restaurante do Porto"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo de Serviço</label>
            <select 
              value={formData.serviceType}
              onChange={e => setFormData({...formData, serviceType: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
            >
              <option value="">Selecione...</option>
              <option value="Design de Logo">Design de Logo</option>
              <option value="Social Media (Mensal)">Social Media (Mensal)</option>
              <option value="Edição de Vídeo Ad">Edição de Vídeo Ad</option>
              <option value="Configuração de Pixel">Configuração de Pixel</option>
              <option value="Landing Page">Landing Page</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custo para o Parceiro (R$)</label>
              <input 
                type="number" 
                value={formData.cost}
                onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status Inicial</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as PartnerRequestStatus})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm h-[42px]"
                disabled={currentUser.role === 'PARTNER'}
              >
                <option value="pending">Pendente</option>
                <option value="ongoing">Em Andamento</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Atribuir ao Parceiro</label>
              <select 
                value={formData.partnerId}
                onChange={e => {
                  const p = partners.find(part => part.id === e.target.value);
                  setFormData({...formData, partnerId: e.target.value, partnerName: p?.name || 'Agência Externa'});
                }}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              >
                <option value="">Selecione um parceiro...</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.agencyName} ({p.name})</option>
                ))}
              </select>
            </div>
          )}
          
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <Modal
        isOpen={isAgencyModalOpen}
        onClose={() => setIsAgencyModalOpen(false)}
        title={editingAgency ? "Editar Agência" : "Nova Agência Parceira"}
        footer={
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsAgencyModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleAgencySubmit}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors shadow-sm"
            >
              {editingAgency ? 'Salvar Alterações' : 'Cadastrar Agência'}
            </button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleAgencySubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome da Agência</label>
              <input 
                type="text" 
                required
                value={agencyFormData.agencyName || ''}
                onChange={e => setAgencyFormData({...agencyFormData, agencyName: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                placeholder="Ex: Agência Digital X"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome do Responsável</label>
              <input 
                type="text" 
                required
                value={agencyFormData.name || ''}
                onChange={e => setAgencyFormData({...agencyFormData, name: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                placeholder="Ex: João Silva"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">E-mail de Contato</label>
            <input 
              type="email" 
              required
              value={agencyFormData.email || ''}
              onChange={e => setAgencyFormData({...agencyFormData, email: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo de Comissão</label>
              <select 
                value={agencyFormData.commissionType || 'percentage'}
                onChange={e => setAgencyFormData({...agencyFormData, commissionType: e.target.value as any})}
                className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:outline-none h-[42px] text-sm"
              >
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (BRL)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor</label>
              <input 
                type="number" 
                value={agencyFormData.commissionValue || 0}
                onChange={e => setAgencyFormData({...agencyFormData, commissionValue: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title={editingTeamMember ? 'Editar Membro' : 'Novo Membro da Equipe'}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsTeamModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleTeamSubmit} className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl">Salvar</button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome Completo</label>
            <input type="text" value={teamFormData.name || ''} onChange={e => setTeamFormData({...teamFormData, name: e.target.value})} className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email de Acesso</label>
            <input type="email" value={teamFormData.email || ''} onChange={e => setTeamFormData({...teamFormData, email: e.target.value})} className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargo/Permissão</label>
            <select value={teamFormData.role || 'EDITOR'} onChange={e => setTeamFormData({...teamFormData, role: e.target.value as any})} className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm">
              <option value="EDITOR">EDITOR (Vídeos)</option>
              {isAdmin && <option value="DESIGNER">DESIGNER (Artes)</option>}
              {isAdmin && <option value="PARTNER">PARCEIRO</option>}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
