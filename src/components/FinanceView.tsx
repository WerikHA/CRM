import React, { useState, useEffect } from 'react';
import { DollarSign, Download, Printer, Filter, ArrowDownToLine, MoreHorizontal, AlertCircle, CheckCircle2, Plus, Trash2, Edit, PieChart as PieChartIcon, BarChart3, Users, MessageSquare, Settings } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { cn } from '../lib/utils';
import { Client, Receivable, ReceivableStatus, User, FinanceConfig } from '../types';
import Modal from './Modal';
import { api } from '../services/api';

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
  const [financeConfig, setFinanceConfig] = useState<FinanceConfig>({ pixKey: '', enableReminders: false, reminderTemplate: '' });

  useEffect(() => {
    fetch('/api/finance/config').then(res => res.json()).then(setFinanceConfig);
  }, []);

  const saveConfig = async () => {
      await fetch('/api/finance/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(financeConfig)
      });
      alert("Configurações salvas!");
  };
  
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr; // Already BR format
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      // Remove time part if exists
      const cleanDay = day.split('T')[0];
      return `${cleanDay}/${month}/${year}`;
    }
    return dateStr;
  };

  const isDesigner = currentUser.role === 'DESIGNER';
  const isAdmin = currentUser.role === 'ADMIN';
  const isOwner = currentUser.role === 'OWNER';
  const isAdminOrOwner = isAdmin || isOwner;
  const isEditor = currentUser.role === 'EDITOR';

  const filteredReceivables = (isDesigner || isEditor
    ? receivables.filter(r => r.designerId === currentUser.id)
    : receivables).filter(r => filter === 'all' ? true : r.status === filter);

  const totalAmount = filteredReceivables.filter(r => r.status === 'paid').reduce((acc, r) => acc + (isDesigner || isEditor ? (r.payoutAmount || 0) : r.amount), 0);
  const totalPending = filteredReceivables.filter(r => r.status === 'pending').reduce((acc, r) => acc + (isDesigner || isEditor ? (r.payoutAmount || 0) : r.amount), 0);
  const totalOverdue = filteredReceivables.filter(r => r.status === 'overdue').reduce((acc, r) => acc + (isDesigner || isEditor ? (r.payoutAmount || 0) : r.amount), 0);

  const chartData = [
    { name: 'Pago', value: totalAmount, color: '#10b981' },
    { name: 'Pendente', value: totalPending, color: '#f59e0b' },
    { name: 'Em Atraso', value: totalOverdue, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  // Group by month for additional chart
  const monthlyDataMap = receivables.reduce((acc: any, r) => {
    const formattedDate = formatDateForDisplay(r.dueDate);
    const month = formattedDate.split('/')[1] || '01';
    const monthNames: any = { '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez' };
    const monthName = monthNames[month] || month;
    if (!acc[monthName]) acc[monthName] = { name: monthName, total: 0, count: 0 };
    acc[monthName].total += isDesigner || isEditor ? (r.payoutAmount || 0) : r.amount;
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
    acc[clientName].total += isDesigner || isEditor ? (r.payoutAmount || 0) : r.amount;
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
    setFormData({
      clientId: receivable.clientId || '',
      description: receivable.description || '',
      amount: receivable.amount || 0,
      dueDate: receivable.dueDate || '',
      status: receivable.status || 'pending',
      ...receivable
    });
    setIsModalOpen(true);
  };

  const formatDateForDB = (dateStr: string) => {
    if (!dateStr) return null;
    if (dateStr.includes('-')) return dateStr; // Already ISO
    const [day, month, year] = dateStr.split('/');
    if (day && month && year) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedData = {
        ...formData,
        dueDate: formatDateForDB(formData.dueDate || '')
      };

      if (editingReceivable) {
        const updated = await api.updateReceivable(editingReceivable.id, formattedData);
        setReceivables(receivables.map(r => r.id === editingReceivable.id ? { ...r, ...updated } : r));
      } else {
        const created = await api.createReceivable(formattedData);
        setReceivables([...receivables, created]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar financeiro: ' + err.message);
    }
  };

  const handleDeleteReceivable = async (id: string) => {
    try {
      await api.deleteReceivable(id);
      setReceivables(receivables.filter(r => r.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir financeiro: ' + err.message);
    }
  };

  const handleSendReminder = async (e: React.MouseEvent, receivableId: string) => {
    e.stopPropagation();
    const receivable = receivables.find(r => r.id === receivableId);
    const client = clients.find(c => c.id === receivable?.clientId);
    
    if (!client || !client.phone) {
      alert("Cliente sem telefone cadastrado.");
      return;
    }

    const pixKey = client.pixKey || financeConfig.pixKey || 'Não cadastrada';
    const message = financeConfig.reminderTemplate
        .replace('{{clientName}}', client.name)
        .replace('{{description}}', receivable?.description || '')
        .replace('{{amount}}', receivable?.amount.toString() || '0')
        .replace('{{pixKey}}', pixKey);

    try {
        const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: client.phone, message })
      });
      if (res.ok) alert("Lembrete enviado!");
      else alert("Erro ao enviar lembrete.");
    } catch(e) { alert("Erro de conexão."); }
    
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Financeiro</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">Gestão de recebíveis, faturas e fluxo de caixa.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
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
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg"><CheckCircle2 size={18} /></div>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">{isDesigner || isEditor ? 'Recebido' : 'Receita Total'}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">R$ {totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg"><DollarSign size={18} /></div>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">{isDesigner || isEditor ? 'A Receber' : 'Pendentes'}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">R$ {totalPending.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg"><AlertCircle size={18} /></div>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Em Atraso</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">R$ {totalOverdue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors flex flex-col items-center justify-center min-h-[160px]">
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
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">{d.name}</span>
                     </div>
                   ))}
                </div>
             </div>
           ) : (
             <div className="text-gray-300 dark:text-gray-600 text-[10px] italic">Sem dados financeiros</div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-500" />
              Volume Mensal
            </h2>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
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
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
                    fontSize: '10px',
                    backgroundColor: 'white'
                  }}
                  itemStyle={{ color: '#6366f1' }}
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

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users size={18} className="text-emerald-500" />
              Top Clientes (Receita)
            </h2>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientRevenueData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
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
                  cursor={{ fill: '#f8fafc', opacity: 0.1 }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
                    fontSize: '10px',
                    backgroundColor: 'white'
                  }}
                  itemStyle={{ color: '#10b981' }}
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

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Transações Recentes</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFilter('all')}
              className={cn(
                "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors",
                filter === 'all' ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              Tudo
            </button>
            <button 
              onClick={() => setFilter('paid')}
              className={cn(
                "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors",
                filter === 'paid' ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              Pagos
            </button>
            <button 
              onClick={() => setFilter('pending')}
              className={cn(
                "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors",
                filter === 'pending' ? "text-amber-600 bg-amber-50 dark:bg-amber-500/10" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              Pendentes
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Valor</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Chave PIX</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredReceivables.map((r) => {
                const client = clients.find(c => c.id === r.clientId);
                const displayAmount = isDesigner || isEditor ? (r.payoutAmount || 0) : r.amount;
                return (
                  <tr key={r.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer" onClick={() => isAdminOrOwner && handleEditReceivable(r)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-[10px] transition-colors">
                          {client?.name.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm transition-colors">{client?.name || 'Cliente Removido'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-300">{r.description}</td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-300">{formatDateForDisplay(r.dueDate)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-100">R$ {displayAmount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                       <span className="text-[10px] font-mono text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded border border-gray-100 dark:border-gray-700">
                         {client?.pixKey || 'N/A'}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      {isAdminOrOwner ? (
                        <select 
                          value={r.status || 'pending'}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            setReceivables(prev => prev.map(item => item.id === r.id ? { ...item, status: e.target.value as any } : item));
                          }}
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors bg-transparent border focus:outline-none",
                            r.status === 'paid' ? "border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : 
                            r.status === 'overdue' ? "border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400" : 
                            "border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          <option value="paid" className="dark:bg-gray-900">Pago</option>
                          <option value="pending" className="dark:bg-gray-900">Pendente</option>
                          <option value="overdue" className="dark:bg-gray-900">Atrasado</option>
                        </select>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border",
                          r.status === 'paid' ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20" : 
                          r.status === 'overdue' ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20" : 
                          "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
                        )}>
                          {r.status === 'paid' ? 'Recebido' : r.status === 'overdue' ? 'Atrasado' : 'A Receber'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleSendReminder(e, r.id); }}
                         className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg text-gray-400 dark:text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all font-bold"
                         title="Enviar Lembrete"
                       >
                         <MessageSquare size={16} />
                       </button>
                       {isAdminOrOwner && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteReceivable(r.id); }}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-gray-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 transition-all font-bold"
                          title="Excluir Transação"
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
      
      {isAdminOrOwner && (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors space-y-4">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Settings size={18} className="text-indigo-500" />
            Configurações de Cobrança
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Chave PIX Global" 
              value={financeConfig.pixKey} 
              onChange={e => setFinanceConfig({...financeConfig, pixKey: e.target.value})} 
              className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-gray-900 dark:text-gray-100" 
            />
            <label className="flex items-center gap-2">
                <input type="checkbox" checked={financeConfig.enableReminders} onChange={e => setFinanceConfig({...financeConfig, enableReminders: e.target.checked})} className="rounded text-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Habilitar lembretes automáticos</span>
            </label>
            <textarea 
              placeholder="Mensagem de lembrete" 
              value={financeConfig.reminderTemplate} 
              onChange={e => setFinanceConfig({...financeConfig, reminderTemplate: e.target.value})} 
              className="col-span-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-gray-900 dark:text-gray-100" 
              rows={2} 
            />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-300">
            Variáveis disponíveis: <code>{'{{clientName}}'}</code>, <code>{'{{description}}'}</code>, <code>{'{{amount}}'}</code>, <code>{'{{pixKey}}'}</code>.
        </p>
        <button onClick={saveConfig} className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 transition-colors">Salvar Configurações</button>
      </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReceivable ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
        footer={
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
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
            <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Cliente</label>
            <select 
              value={formData.clientId || ''}
              onChange={e => setFormData({...formData, clientId: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="" className="dark:bg-gray-900">Selecione um cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id} className="dark:bg-gray-900">{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Descrição / Referência</label>
            <input 
              type="text" 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
              placeholder="Ex: Gestão de Tráfego - Abril"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Valor (R$)</label>
              <input 
                type="number" 
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Vencimento</label>
              <input 
                type="text" 
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Status Inicial</label>
              <select 
                value={formData.status || 'pending'}
                onChange={e => setFormData({...formData, status: e.target.value as ReceivableStatus})}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="pending" className="dark:bg-gray-900">Pendente</option>
                <option value="paid" className="dark:bg-gray-900">Pago</option>
                <option value="overdue" className="dark:bg-gray-900">Atrasado</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
