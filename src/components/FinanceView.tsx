import React, { useState } from 'react';
import { DollarSign, Download, Printer, Filter, ArrowDownToLine, MoreHorizontal, AlertCircle, CheckCircle2, Plus, Trash2, Edit, PieChart as PieChartIcon, BarChart3, Users } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { cn } from '../lib/utils';
import { Client, Receivable, ReceivableStatus, User } from '../types';
import Modal from './Modal';

interface FinanceViewProps {
  receivables: Receivable[];
  setReceivables: React.Dispatch<React.SetStateAction<Receivable[]>>;
  clients: Client[];
  currentUser: User;
}

export default function FinanceView({ receivables, setReceivables, clients, currentUser }: FinanceViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
  const [formData, setFormData] = useState<Partial<Receivable>>({
    clientId: '',
    description: '',
    amount: 0,
    dueDate: '',
    status: 'pending'
  });
  
  const [filter, setFilter] = useState<ReceivableStatus | 'all'>('all');
  
  const isDesigner = currentUser.role === 'DESIGNER';
  const isAdmin = currentUser.role === 'ADMIN';

  const filteredReceivables = (isDesigner 
    ? receivables.filter(r => r.designerId === currentUser.id)
    : receivables).filter(r => filter === 'all' ? true : r.status === filter);

  const totalAmount = filteredReceivables.filter(r => r.status === 'paid').reduce((acc, r) => acc + (isDesigner ? (r.payoutAmount || 0) : r.amount), 0);
  const totalPending = filteredReceivables.filter(r => r.status === 'pending').reduce((acc, r) => acc + (isDesigner ? (r.payoutAmount || 0) : r.amount), 0);
  const totalOverdue = filteredReceivables.filter(r => r.status === 'overdue').reduce((acc, r) => acc + (isDesigner ? (r.payoutAmount || 0) : r.amount), 0);

  const chartData = [
    { name: 'Pago', value: totalAmount, color: '#10b981' },
    { name: 'Pendente', value: totalPending, color: '#f59e0b' },
    { name: 'Em Atraso', value: totalOverdue, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  // Group by month for additional chart
  const monthlyDataMap = receivables.reduce((acc: any, r) => {
    const month = r.dueDate.split('/')[1] || '01';
    const monthNames: any = { '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez' };
    const monthName = monthNames[month] || month;
    if (!acc[monthName]) acc[monthName] = { name: monthName, total: 0, count: 0 };
    acc[monthName].total += isDesigner ? (r.payoutAmount || 0) : r.amount;
    acc[monthName].count += 1;
    return acc;
  }, {});

  const monthlyData = Object.values(monthlyDataMap);

  // Top clients by revenue
  const clientRevenueMap = receivables.reduce((acc: any, r) => {
    const client = clients.find(c => c.id === r.clientId);
    if (!client) return acc;
    const clientName = client.name;
    if (!acc[clientName]) acc[clientName] = { name: clientName, total: 0 };
    acc[clientName].total += isDesigner ? (r.payoutAmount || 0) : r.amount;
    return acc;
  }, {});

  const clientRevenueData = Object.values(clientRevenueMap)
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 5);

  const handleAddReceivable = () => {
    setEditingReceivable(null);
    setFormData({
      clientId: clients[0]?.id || '',
      description: '',
      amount: 0,
      dueDate: new Date().toLocaleDateString('pt-BR'),
      status: 'pending'
    });
    setIsModalOpen(true);
  };

  const handleEditReceivable = (receivable: Receivable) => {
    setEditingReceivable(receivable);
    setFormData(receivable);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReceivable) {
      setReceivables(receivables.map(r => r.id === editingReceivable.id ? { ...r, ...formData } as Receivable : r));
    } else {
      const newReceivable: Receivable = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
      } as Receivable;
      setReceivables([...receivables, newReceivable]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteReceivable = (id: string) => {
    if (window.confirm('Deseja excluir este lançamento financeiro?')) {
      setReceivables(receivables.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight transition-colors">Financeiro</h1>
          <p className="text-sm text-gray-500">Gestão de recebíveis, faturas e fluxo de caixa.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
            <Download size={18} />
          </button>
          <button 
            onClick={handleAddReceivable}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
          >
            <Plus size={16} />
            Lançar Cobrança
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={18} /></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isDesigner ? 'Recebido' : 'Receita Total'}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">R$ {totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><DollarSign size={18} /></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isDesigner ? 'A Receber' : 'Pendentes'}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">R$ {totalPending.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><AlertCircle size={18} /></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Em Atraso</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">R$ {totalOverdue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-colors flex flex-col items-center justify-center min-h-[160px]">
           {chartData.length > 0 ? (
             <div className="w-full h-full">
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                   {chartData.map(d => (
                     <div key={d.name} className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-[9px] font-bold text-gray-500 uppercase">{d.name}</span>
                     </div>
                   ))}
                </div>
             </div>
           ) : (
             <div className="text-gray-300 text-[10px] italic">Sem dados financeiros</div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-500" />
              Volume Mensal
            </h2>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '10px' }}
                />
                <Bar 
                  dataKey="total" 
                  fill="#6366f1" 
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-emerald-500" />
              Top Clientes (Receita)
            </h2>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientRevenueData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '10px' }}
                />
                <Bar 
                  dataKey="total" 
                  fill="#10b981" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Transações Recentes</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFilter('all')}
              className={cn(
                "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors",
                filter === 'all' ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Tudo
            </button>
            <button 
              onClick={() => setFilter('paid')}
              className={cn(
                "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors",
                filter === 'paid' ? "text-emerald-600 bg-emerald-50" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Pagos
            </button>
            <button 
              onClick={() => setFilter('pending')}
              className={cn(
                "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors",
                filter === 'pending' ? "text-amber-600 bg-amber-50" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Pendentes
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredReceivables.map((r) => {
                const client = clients.find(c => c.id === r.clientId);
                const displayAmount = isDesigner ? (r.payoutAmount || 0) : r.amount;
                return (
                  <tr key={r.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => isAdmin && handleEditReceivable(r)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-[10px] transition-colors">
                          {client?.name.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <span className="font-bold text-gray-900 text-sm transition-colors">{client?.name || 'Cliente Removido'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">{r.description}</td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">{r.dueDate}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">R$ {displayAmount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <select 
                          value={r.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            setReceivables(prev => prev.map(item => item.id === r.id ? { ...item, status: e.target.value as any } : item));
                          }}
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors bg-transparent border focus:outline-none",
                            r.status === 'paid' ? "border-emerald-100 text-emerald-600" : 
                            r.status === 'overdue' ? "border-rose-100 text-rose-600" : 
                            "border-amber-100 text-amber-600"
                          )}
                        >
                          <option value="paid">Pago</option>
                          <option value="pending">Pendente</option>
                          <option value="overdue">Atrasado</option>
                        </select>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border",
                          r.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                          r.status === 'overdue' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                          "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {r.status === 'paid' ? 'Recebido' : r.status === 'overdue' ? 'Atrasado' : 'A Receber'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       {isAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteReceivable(r.id); }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-300 hover:text-rose-500 transition-all font-bold"
                        >
                          <Trash2 size={16} />
                        </button>
                       )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReceivable ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
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
              {editingReceivable ? 'Salvar Alterações' : 'Lançar'}
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cliente</label>
            <select 
              value={formData.clientId}
              onChange={e => setFormData({...formData, clientId: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
            >
              <option value="">Selecione um cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descrição / Referência</label>
            <input 
              type="text" 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
              placeholder="Ex: Gestão de Tráfego - Abril"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor (R$)</label>
              <input 
                type="number" 
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vencimento</label>
              <input 
                type="text" 
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300"
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status Inicial</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as ReceivableStatus})}
                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Atrasado</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
