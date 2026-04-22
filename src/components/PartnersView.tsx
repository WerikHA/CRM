import React, { useState } from 'react';
import { Handshake, ExternalLink, Plus, MoreHorizontal, Briefcase, Mail, Trash2 } from 'lucide-react';
import { PartnerRequest, PartnerRequestStatus } from '../types';
import Modal from './Modal';
import { cn } from '../lib/utils';

interface PartnersViewProps {
  partners: PartnerRequest[];
  setPartners: React.Dispatch<React.SetStateAction<PartnerRequest[]>>;
}

export default function PartnersView({ partners, setPartners }: PartnersViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerRequest | null>(null);
  const [formData, setFormData] = useState<Partial<PartnerRequest>>({
    partnerName: '',
    serviceType: '',
    cost: 0,
    status: 'pending'
  });

  const handleAddPartner = () => {
    setEditingPartner(null);
    setFormData({
      partnerName: '',
      serviceType: '',
      cost: 0,
      status: 'pending'
    });
    setIsModalOpen(true);
  };

  const handleEditPartner = (partner: PartnerRequest) => {
    setEditingPartner(partner);
    setFormData(partner);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPartner) {
      setPartners(partners.map(p => p.id === editingPartner.id ? { ...p, ...formData } as PartnerRequest : p));
    } else {
      const newPartner: PartnerRequest = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
      } as PartnerRequest;
      setPartners([...partners, newPartner]);
    }
    setIsModalOpen(false);
  };

  const handleDeletePartner = (id: string) => {
    setPartners(partners.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight transition-colors">Agências Parceiras</h1>
          <p className="text-sm text-gray-500">Gestão de serviços terceirizados e colaborações.</p>
        </div>
        <button 
          onClick={handleAddPartner}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
        >
          <Plus size={16} />
          Nova Solicitação
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parceiro</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Serviço</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custo Est.</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {partners.map((partner) => (
              <tr key={partner.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => handleEditPartner(partner)}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-colors duration-300">
                      <Briefcase size={20} />
                    </div>
                    <span className="font-bold text-gray-900 tracking-tight transition-colors">{partner.partnerName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-600">{partner.serviceType}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-900 transition-colors">R$ {partner.cost.toLocaleString()}</p>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={partner.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, status: e.target.value as any } : p));
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border focus:outline-none transition-colors",
                      partner.status === 'ongoing' ? "bg-sky-50 text-sky-600 border-sky-100" :
                      partner.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}
                  >
                    <option value="pending">Solicitado</option>
                    <option value="ongoing">Em Andamento</option>
                    <option value="completed">Concluído</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); }}
                      className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Mail size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeletePartner(partner.id); }}
                      className="p-2 hover:bg-rose-50 rounded-lg text-gray-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-indigo-50/30 rounded-2xl border border-indigo-100/50 p-6 flex flex-col md:flex-row items-center gap-6 transition-colors">
        <div className="w-16 h-16 rounded-2xl bg-white border border-indigo-100/50 flex items-center justify-center text-indigo-500 shrink-0 transition-colors">
          <Handshake size={32} />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-bold text-indigo-900 text-lg transition-colors">Deseja expandir suas parcerias?</h3>
          <p className="text-sm text-indigo-600/60 transition-colors font-medium italic">Conecte-se com agências especializadas em tráfego pago, SEO e desenvolvimento web diretamente pelo AgencyFlow.</p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-[0_4px_12px_rgba(99,102,241,0.15)]">
           Explorar MarketPlace
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPartner ? 'Editar Solicitação' : 'Nova Solicitação de Parceria'}
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
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
            >
              {editingPartner ? 'Salvar Alterações' : 'Enviar Solicitação'}
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome do Parceiro / Agência</label>
            <input 
              type="text" 
              value={formData.partnerName}
              onChange={e => setFormData({...formData, partnerName: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
              placeholder="Ex: Agência de Performance X"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo de Serviço</label>
              <input 
                type="text" 
                value={formData.serviceType}
                onChange={e => setFormData({...formData, serviceType: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
                placeholder="Ex: Tráfego Pago"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custo Estimado (R$)</label>
              <input 
                type="number" 
                value={formData.cost}
                onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status Inicial</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as PartnerRequestStatus})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              >
                <option value="pending">Solicitado</option>
                <option value="ongoing">Em Andamento</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
