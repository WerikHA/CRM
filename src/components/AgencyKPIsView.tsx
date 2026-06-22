import React, { useMemo, useState } from 'react';
import { TrendingUp, Users, DollarSign, Palette, ArrowUpRight, CheckCircle2, History, Save, BarChart3 } from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Lead, Client, ArtOrder, User, AgencyKPI } from '../types';
import { api } from '../services/api';
import { toast } from './ui/Toast';

interface AgencyKPIsViewProps {
  leads: Lead[];
  clients: Client[];
  artOrders: ArtOrder[];
  currentUser: User;
  agencyKPIs: AgencyKPI[];
}

const StatWidget = ({ title, value, subtext, icon: Icon, color, index }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03]`} style={{ color }}>
      <Icon size={96} />
    </div>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100">{value}</h3>
        {subtext && <p className="text-xs text-gray-400 mt-1 font-medium italic">{subtext}</p>}
      </div>
      <div className={cn(
        "p-2.5 rounded-2xl",
        "bg-gray-50 dark:bg-gray-800 text-gray-500"
      )} style={{ color }}>
        <Icon size={24} />
      </div>
    </div>
  </motion.div>
);

export default function AgencyKPIsView({ leads, clients, artOrders, currentUser, agencyKPIs = [] }: AgencyKPIsViewProps) {
  const [isSaving, setIsSaving] = useState(false);

  const activeClients = useMemo(() => clients.filter(c => c.status === 'active'), [clients]);
  
  const totalMonthlyValue = useMemo(() => 
    activeClients.reduce((acc, c) => acc + (Number(c.monthlyValue) || 0), 0)
  , [activeClients]);

  const leadsVsClientsData = useMemo(() => [
    { name: 'Leads', value: leads.length, color: '#6366f1' },
    { name: 'Clientes Ativos', value: activeClients.length, color: '#10b981' }
  ], [leads.length, activeClients.length]);

  const avgArtCompletion = useMemo(() => {
    if (artOrders.length === 0) return 0;
    const totalProgress = artOrders.reduce((acc, o) => acc + (o.progress || 0), 0);
    return Math.round(totalProgress / artOrders.length);
  }, [artOrders]);

  const handleCreateSnapshot = async () => {
    try {
      setIsSaving(true);
      const newKPI: Partial<AgencyKPI> = {
        ownerId: currentUser.ownerId || currentUser.id,
        periodDate: new Date().toISOString().split('T')[0],
        totalActiveMonthlyValue: totalMonthlyValue,
        totalLeadsCount: leads.length,
        totalActiveClientsCount: activeClients.length,
        avgArtCompletionPercent: avgArtCompletion
      };
      
      await api.createAgencyKPI(newKPI);
      toast.success("Snapshot de KPIs salvo com sucesso!");
      // O App.tsx via realtime vai atualizar a lista se estiver configurado
    } catch (err) {
      console.error("Erro ao salvar snapshot de KPIs:", err);
      toast.error("Erro ao salvar snapshot.");
    } finally {
      setIsSaving(false);
    }
  };

  const chartData = useMemo(() => {
    if (!agencyKPIs || agencyKPIs.length === 0) return [];
    return [...agencyKPIs]
      .sort((a, b) => new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime())
      .map(k => ({
        date: new Date(k.periodDate).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
        valor: k.totalActiveMonthlyValue,
        leads: k.totalLeadsCount,
        clientes: k.totalActiveClientsCount,
        conclusao: k.avgArtCompletionPercent
      }));
  }, [agencyKPIs]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">KPIs da Agência</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Métricas estratégicas e desempenho histórico.</p>
        </div>
        <button 
          onClick={handleCreateSnapshot}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
          <span>Salvar Snapshot</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatWidget 
          title="Valor Mensal Ativo" 
          value={`R$ ${totalMonthlyValue.toLocaleString()}`} 
          subtext={`${activeClients.length} clientes ativos`}
          icon={DollarSign} 
          color="#10b981" 
          index={0}
        />
        <StatWidget 
          title="Funil de Leads" 
          value={`${leads.length} Leads`} 
          subtext={`${activeClients.length} converted leads`}
          icon={TrendingUp} 
          color="#6366f1" 
          index={1}
        />
        <StatWidget 
          title="Conclusão de Artes" 
          value={`${avgArtCompletion}%`} 
          subtext="Média de progresso atual"
          icon={CheckCircle2} 
          color="#f59e0b" 
          index={2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Leads vs Clientes Chart */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users size={20} className="text-indigo-500" />
              Leads vs Clientes Ativos
            </h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsVsClientsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: '#fff' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {leadsVsClientsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Art Progress Overview */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Palette size={20} className="text-amber-500" />
              Desenvolvimento de Artes
            </h2>
          </div>
          <div className="space-y-6">
             <div className="text-center py-4">
                <div className="inline-flex items-center justify-center p-8 bg-amber-50 dark:bg-amber-900/20 rounded-full mb-4">
                   <h3 className="text-5xl font-black text-amber-600 dark:text-amber-400">{avgArtCompletion}%</h3>
                </div>
                <p className="text-sm font-medium text-gray-500">Média Global de Conclusão</p>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total de Artes</p>
                   <p className="text-xl font-bold">{artOrders.length}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Concluídas</p>
                   <p className="text-xl font-bold text-emerald-500">{artOrders.filter(o => o.status === 'done').length}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Historical Performance Chart */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <History size={20} className="text-indigo-500" />
            Histórico de Performance
          </h2>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Receita</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Leads</span>
             </div>
          </div>
        </div>
        
        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: '#fff' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="valor" stroke="#6366f1" strokeWidth={3} fill="url(#colorValor)" />
                <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-60 flex flex-col items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
             <BarChart3 size={48} className="mb-4 opacity-20" />
             <p className="text-sm font-medium">Nenhum snapshot de KPI salvo ainda.</p>
             <p className="text-xs mt-1">Clique em "Salvar Snapshot" para começar a traçar o histórico.</p>
          </div>
        )}
      </div>
    </div>
  );
}
