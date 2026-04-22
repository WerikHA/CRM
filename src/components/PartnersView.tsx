import React, { useState } from 'react';
import { Handshake, ExternalLink, Plus, MoreHorizontal, Briefcase, Mail, Trash2, Users, Receipt, ArrowRight } from 'lucide-react';
import { PartnerRequest, PartnerRequestStatus, Partner, User } from '../types';
import Modal from './Modal';
import { cn } from '../lib/utils';

interface PartnersViewProps {
  partnerRequests: PartnerRequest[];
  setPartnerRequests: React.Dispatch<React.SetStateAction<PartnerRequest[]>>;
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  currentUser: User;
}

export default function PartnersView({ partnerRequests, setPartnerRequests, partners, setPartners, currentUser }: PartnersViewProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'agencies'>(currentUser.role === 'PARTNER' ? 'requests' : 'agencies');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PartnerRequest | null>(null);
  
  const isAdmin = currentUser.role === 'ADMIN';

  const filteredRequests = currentUser.role === 'PARTNER' 
    ? partnerRequests.filter(r => r.partnerId === currentUser.id)
    : partnerRequests;

  const handleAddRequest = () => {
    setEditingRequest(null);
    setIsModalOpen(true);
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
        
        {activeTab === 'requests' && (
          <button 
            onClick={handleAddRequest}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nova Solicitação
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('agencies')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'agencies' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Agências Parceiras
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'requests' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
             Solicitações (Jobs)
          </button>
        </div>
      )}

      {activeTab === 'agencies' ? (
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
          
          <button className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-all">
             <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                <Plus size={24} />
             </div>
             <span className="font-bold text-sm">Adicionar Nova Agência</span>
          </button>
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
    </div>
  );
}
