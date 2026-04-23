import React from 'react';
import { TrendingUp, Users, DollarSign, Palette, ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieChartIcon, CheckCircle2, Handshake, Clock, Receipt, Briefcase, ArrowUp } from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '../lib/utils';
import { Lead, Client, Receivable, ArtOrder, User, Partner, PartnerRequest, VideoOrder } from '../types';

interface DashboardViewProps {
  leads: Lead[];
  clients: Client[];
  receivables: Receivable[];
  artOrders: ArtOrder[];
  videoOrders?: VideoOrder[];
  partners: Partner[];
  partnerRequests: PartnerRequest[];
  onViewChange?: (view: any) => void;
  currentUser: User;
}

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group transition-all duration-300">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] transition-transform group-hover:scale-110 duration-500`} style={{ color }}>
      <Icon size={96} />
    </div>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
              <div className={cn(
                "p-2.5 rounded-xl transition-colors duration-300",
                color === '#6366f1' ? "bg-indigo-50/50 text-indigo-500" : 
                color === '#10b981' ? "bg-emerald-50/50 text-emerald-500" : 
                color === '#f59e0b' ? "bg-amber-50/50 text-amber-500" : 
                "bg-rose-50/50 text-rose-500"
              )}>
        <Icon size={20} />
      </div>
    </div>
    <div className="mt-4 flex items-center gap-2">
      <span className={cn(
        "flex items-center text-xs font-bold px-1.5 py-0.5 rounded-lg",
        change > 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
      )}>
        {change > 0 ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
        {Math.abs(change)}%
      </span>
      <span className="text-xs text-gray-400 font-medium whitespace-nowrap">vs. mês passado</span>
    </div>
  </div>
);

export default function DashboardView({ leads, clients, receivables, artOrders, videoOrders = [], partners, partnerRequests, onViewChange, currentUser }: DashboardViewProps) {
  // Lógica de filtragem por papel
  const isDesigner = currentUser.role === 'DESIGNER';
  const isPartner = currentUser.role === 'PARTNER';
  const isAdmin = currentUser.role === 'ADMIN';
  const isEditor = currentUser.role === 'EDITOR';

  // Métricas Filtradas
  const filteredClients = isDesigner || isEditor
    ? clients.filter(c => c.assignedDesignerId === currentUser.id)
    : isPartner 
      ? clients.filter(c => c.partnerId === currentUser.id)
      : clients;

  const filteredOrders = isDesigner
    ? artOrders.filter(o => o.designerId === currentUser.id)
    : isEditor
      ? videoOrders.filter(o => o.editorId === currentUser.id)
      : isPartner
        ? artOrders.filter(o => clients.find(c => c.id === o.clientId)?.partnerId === currentUser.id)
        : artOrders;

  const filteredReceivables = isDesigner || isEditor
    ? receivables.filter(r => r.designerId === currentUser.id)
    : isPartner
      ? receivables.filter(r => clients.find(c => c.id === r.clientId)?.partnerId === currentUser.id)
      : receivables;

  // Valores
  const totalValue = isAdmin 
    ? clients.reduce((acc, c) => acc + c.monthlyValue, 0)
    : isDesigner || isEditor
      ? clients.filter(c => c.assignedDesignerId === currentUser.id).reduce((acc, c) => acc + (c.designerPayout || 0), 0)
      : filteredClients.reduce((acc, c) => acc + c.monthlyValue, 0);

  const activeOrdersCount = filteredOrders.filter(o => o.status !== 'done').length;

  // Segmented Revenue Data
  const getRevenueData = (partnerId?: string | null) => {
    // Current Month Revenue
    const filterClients = partnerId === undefined 
      ? clients 
      : partnerId === null 
        ? clients.filter(c => !c.partnerId)
        : clients.filter(c => c.partnerId === partnerId);
    
    const currentRevenue = filterClients.reduce((sum, c) => sum + (c.monthlyValue || 0), 0);
    
    // For simplicity, we'll simulate some history based on the current revenue
    // In a real app, this would come from a transactions/billing history table
    return [
      { name: 'Jan', value: Math.round(currentRevenue * 0.8) },
      { name: 'Fev', value: Math.round(currentRevenue * 0.9) },
      { name: 'Mar', value: Math.round(currentRevenue * 0.95) },
      { name: 'Abr', value: currentRevenue },
    ];
  };

  const totalRevenueData = getRevenueData();
  const ownRevenueData = getRevenueData(null);
  const partnerRevenueData = isAdmin ? partners.map(p => ({
    name: p.agencyName || p.name,
    data: getRevenueData(p.id)
  })) : [];

  const leadData = [
    { name: 'Prospect', value: leads.filter(l => l.status === 'prospect').length },
    { name: 'Negoc.', value: leads.filter(l => l.status === 'negotiation').length },
    { name: 'Convert.', value: leads.filter(l => l.status === 'converted').length },
    { name: 'Negat.', value: leads.filter(l => l.status === 'lost').length },
  ];

  const jobStatusData = [
    { name: 'Fila', value: (isEditor ? videoOrders : artOrders).filter(o => o.status === 'queue').length, color: '#94a3b8' },
    { name: 'Prod', value: (isEditor ? videoOrders : artOrders).filter(o => o.status === 'production').length, color: '#0ea5e9' },
    { name: 'Revisão', value: (isEditor ? videoOrders : artOrders).filter(o => o.status === 'review').length, color: '#f59e0b' },
    { name: 'Feito', value: (isEditor ? videoOrders : artOrders).filter(o => o.status === 'done').length, color: '#10b981' },
  ];

  const filteredPartnerRequests = isPartner 
    ? partnerRequests.filter(r => r.partnerId === currentUser.id)
    : partnerRequests;

  const totalTasks = filteredOrders.length;
  const finishedTasks = filteredOrders.filter(o => o.status === 'done').length;
  const completionPercentage = totalTasks > 0 ? Math.round((finishedTasks / totalTasks) * 100) : 0;
  
  const completionData = [
    { name: 'Concluído', value: finishedTasks, color: '#10b981' },
    { name: 'Pendente', value: totalTasks - finishedTasks, color: '#f1f5f9' },
  ];

  // Delivery Breakdown for Admin
  const deliveryByPartner = isAdmin ? partners.map(p => {
    const partnerClientIds = clients.filter(c => c.partnerId === p.id).map(c => c.id);
    const pOrders = artOrders.filter(o => partnerClientIds.includes(o.clientId));
    const total = pOrders.length;
    const done = pOrders.filter(o => o.status === 'done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { name: p.agencyName || p.name, total, done, pct, color: '#6366f1' };
  }).filter(p => p.total > 0) : [];

  const ownDelivery = isAdmin ? (() => {
    const ownClientIds = clients.filter(c => !c.partnerId).map(c => c.id);
    const oOrders = artOrders.filter(o => ownClientIds.includes(o.clientId));
    const total = oOrders.length;
    const done = oOrders.filter(o => o.status === 'done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { name: 'Meus Clientes', total, done, pct, color: '#10b981' };
  })() : null;

  // Delivery Rate Card Component
  const DeliveryRateChart = ({ title, pct, done, total, color }: any) => {
    const data = [
      { name: 'Concluído', value: done, color: color },
      { name: 'Pendente', value: Math.max(0, total - done), color: '#f1f5f9' },
    ];
    
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-colors duration-300 flex flex-col items-center justify-center relative overflow-hidden h-fit">
        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: color }} />
        <div className="text-center mb-4">
          <h2 className="font-bold text-gray-900 flex items-center justify-center gap-2 text-sm">
            <CheckCircle2 size={16} style={{ color }} />
            {title}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Taxa de Entrega</p>
        </div>
        
        <div className="h-40 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-gray-900">{pct}%</span>
            <span className="text-[8px] font-bold text-gray-400 uppercase">{done}/{total} JOBS</span>
          </div>
        </div>
      </div>
    );
  };

  // Revenue Chart Component
  const RevenueChart = ({ title, data, color = "#6366f1" }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={18} style={{ color }} />
          {title}
        </h2>
        <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
          <ArrowUp size={12} />
          <span className="text-[10px] font-bold">12%</span>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
              tickFormatter={(value) => `R$ ${value}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={3} 
              dot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Revenue Breakdown for Admin
  const revenueByPartner = isAdmin ? partners.map(p => ({
    name: p.agencyName || p.name,
    value: clients.filter(c => c.partnerId === p.id).reduce((acc, c) => acc + c.monthlyValue, 0),
    color: '#6366f1'
  })).filter(p => p.value > 0) : [];

  const ownRevenue = isAdmin ? {
    name: 'Meus Clientes',
    value: clients.filter(c => !c.partnerId).reduce((acc, c) => acc + c.monthlyValue, 0),
    color: '#10b981'
  } : null;

  // Active Clients Breakdown for Admin
  const clientsByPartner = isAdmin ? partners.map(p => ({
    name: p.agencyName || p.name,
    count: clients.filter(c => c.partnerId === p.id && c.status === 'active').length,
    color: '#0ea5e9'
  })).filter(p => p.count > 0) : [];

  const ownClientsCount = isAdmin ? clients.filter(c => !c.partnerId && c.status === 'active').length : 0;

  // Mock historical data for each revenue category
  const getRevenueHistory = (currentVal: number) => [
    { name: 'Jan', value: Math.round(currentVal * 0.7) },
    { name: 'Fev', value: Math.round(currentVal * 0.85) },
    { name: 'Mar', value: Math.round(currentVal * 0.9) },
    { name: 'Abr', value: currentVal },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight transition-colors">
            {isDesigner ? 'Painel do Designer' : isEditor ? 'Painel do Editor' : isPartner ? 'Painel do Parceiro' : 'Painel Administrativo'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isDesigner || isEditor ? `Olá, ${currentUser.name}. Acompanhe suas produções e ganhos.` : 
             isPartner ? `Olá, ${currentUser.name}. Acompanhe seus clientes indicados.` : 
             'Bem-vindo de volta! Aqui está o resumo da sua agência.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={isDesigner || isEditor ? "Ganhos Previstos" : isPartner ? "Gasto (Amplifica Marketing)" : "Receita Mensal"} 
          value={`R$ ${totalValue.toLocaleString()}`} 
          change={12.5} 
          icon={DollarSign} 
          color="#6366f1" 
        />
        {isAdmin && <StatCard title="Leads Ativos" value={leads.length} change={8.2} icon={TrendingUp} color="#10b981" />}
        <StatCard 
          title={isPartner ? "Clientes em Parceria" : "Clientes Ativos"} 
          value={filteredClients.length} 
          change={0} 
          icon={Users} 
          color="#f59e0b" 
        />
        <StatCard title="Produções Ativas" value={activeOrdersCount} change={-4.1} icon={Palette} color="#ec4899" />
        {isPartner && <StatCard title="Tickets de Suporte" value={0} change={0} icon={TrendingUp} color="#10b981" />}
        
        {!isAdmin && (
          <DeliveryRateChart 
            title={isPartner ? "Taxa de Entrega" : "Sua Taxa de Entrega"} 
            pct={completionPercentage} 
            done={finishedTasks} 
            total={totalTasks} 
            color="#10b981" 
          />
        )}
      </div>

      {/* Partnership Summary Section for Admin and Partner */}
      {(isAdmin || isPartner) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {isAdmin ? 'Resumo de Parcerias' : 'Meu Desempenho como Parceiro'}
            </h2>
            <button 
              onClick={() => onViewChange && onViewChange('partners')}
              className="text-xs font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-widest"
            >
              Ver Gestão Completa
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total de Parceiros</p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-bold text-gray-900">{isAdmin ? partners.length : 1}</h3>
                <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                  <Briefcase size={16} />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pedidos Pendentes</p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  {filteredPartnerRequests.filter(r => r.status === 'pending').length}
                </h3>
                <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                  <Clock size={16} />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Jobs Concluídos</p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  {filteredPartnerRequests.filter(r => r.status === 'completed' || r.status === 'delivered').length}
                </h3>
                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                  <Receipt size={16} />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Receita Gerada</p>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  R$ {filteredPartnerRequests.reduce((acc, r) => acc + r.cost, 0).toLocaleString()}
                </h3>
                <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                  <DollarSign size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clients by Partner Section for Admin */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Clientes por Parceiro</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
              <Users size={12} className="text-sky-500" />
              Base Ativa
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md border-t-4 border-t-emerald-500">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">Meus Clientes</p>
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900">{ownClientsCount}</h3>
                  <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg">
                    <Users size={14} />
                  </div>
               </div>
            </div>
            {clientsByPartner.map((p, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md border-t-4 border-t-sky-500">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">{p.name}</p>
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900">{p.count}</h3>
                    <div className="p-1.5 bg-sky-50 text-sky-500 rounded-lg">
                      <Users size={14} />
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Rate Breakdown Section for Admin */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Produtividade de Entrega</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
              <CheckCircle2 size={12} className="text-emerald-500" />
              Status de Conclusão
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <DeliveryRateChart 
                title="Geral da Agência" 
                pct={completionPercentage} 
                done={finishedTasks} 
                total={totalTasks} 
                color="#6366f1" 
             />
             {ownDelivery && (
                <DeliveryRateChart 
                  title="Meus Clientes" 
                  pct={ownDelivery.pct} 
                  done={ownDelivery.done} 
                  total={ownDelivery.total} 
                  color="#10b981" 
                />
             )}
             {deliveryByPartner.map((p, idx) => (
                <DeliveryRateChart 
                  key={idx}
                  title={p.name} 
                  pct={p.pct} 
                  done={p.done} 
                  total={p.total} 
                  color="#f59e0b" 
                />
             ))}
          </div>
        </div>
      )}

      {/* Revenue Breakdown Section */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Segmentação de Receita</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
              <TrendingUp size={12} className="text-indigo-500" />
              Desempenho Geral
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Revenue Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Receita Mensal Total</p>
                  <h3 className="text-xl font-bold text-gray-900">R$ {totalValue.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getRevenueHistory(totalValue)}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#colorTotal)" />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Own Revenue Card */}
            {ownRevenue && (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Faturamento Próprio</p>
                    <h3 className="text-xl font-bold text-gray-900">R$ {ownRevenue.value.toLocaleString()}</h3>
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                    <Users size={20} />
                  </div>
                </div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getRevenueHistory(ownRevenue.value)}>
                      <defs>
                        <linearGradient id="colorOwn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#colorOwn)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Partner Revenue Cards */}
            {revenueByPartner.map((partner, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Receita: {partner.name}</p>
                    <h3 className="text-xl font-bold text-gray-900">R$ {partner.value.toLocaleString()}</h3>
                  </div>
                  <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                    <Handshake size={20} />
                  </div>
                </div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getRevenueHistory(partner.value)}>
                      <defs>
                        <linearGradient id={`colorPartner-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} fill={`url(#colorPartner-${idx})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        {isAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RevenueChart title="Faturamento Total" data={totalRevenueData} color="#4f46e5" />
            <RevenueChart title="Meus Clientes Diretos" data={ownRevenueData} color="#10b981" />
            {partnerRevenueData.map((pr, idx) => (
              <RevenueChart key={idx} title={`Agência: ${pr.name}`} data={pr.data} color="#f59e0b" />
            ))}
          </div>
        ) : (
          <RevenueChart title="Evolução Financeira" data={totalRevenueData} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-500" />
              Funil de Leads
            </h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadData}>
                <defs>
                  <linearGradient id="colorLead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorLead)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Palette size={18} className="text-indigo-500" />
              Status Geral das Artes
            </h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={jobStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {jobStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
             {jobStatusData.map((status, idx) => (
                <div key={idx} className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{status.name}: {status.value}</span>
                </div>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Finance/Receivables View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900">
              {isDesigner || isEditor ? 'Meus Recebimentos' : isPartner ? 'Pagamentos dos Meus Clientes' : 'Pendências Financeiras'}
            </h2>
            <button 
              onClick={() => onViewChange && onViewChange('finance')}
              className="text-sm font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-4">
            {filteredReceivables.filter(r => r.status !== 'paid').slice(0, 5).map(r => {
              const client = clients.find(c => c.id === r.clientId);
              const displayAmount = isDesigner || isEditor ? (r.payoutAmount || 0) : r.amount;
              return (
                <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{client?.name}</p>
                      <p className="text-xs text-gray-400 italic">{r.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">R$ {displayAmount.toLocaleString()}</p>
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      r.status === 'overdue' ? "text-rose-500" : "text-amber-500"
                    )}>
                      {r.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                    </p>
                  </div>
                </div>
              );
            })}
            {filteredReceivables.length === 0 && (
              <div className="p-8 text-center text-gray-400 italic text-sm">
                Nenhuma pendência encontrada.
              </div>
            )}
          </div>
        </div>

        {/* Workflow/Jobs View */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 transition-colors duration-300">
          <h2 className="font-bold text-gray-900 mb-6 transition-colors">
            {isPartner ? 'Status dos Jobs' : 'Meus Trabalhos'}
          </h2>
          <div className="space-y-6">
            {filteredOrders.slice(0, 4).map(order => (
              <div key={order.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-900 transition-colors uppercase text-xs tracking-tight truncate max-w-[150px]">
                    {order.title}
                  </span>
                  <span className="text-xs text-gray-400 font-bold">{order.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden transition-colors">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500" 
                    style={{ width: `${order.progress}%` }} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-400 font-medium italic transition-colors">Venc: {order.deadline}</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase py-0.5 px-1.5 rounded-md",
                    order.status === 'production' ? "bg-sky-50 text-sky-600" : 
                    order.status === 'review' ? "bg-amber-50 text-amber-600" : 
                    "bg-slate-50 text-slate-600"
                  )}>
                    {order.status === 'production' ? 'Produção' : 
                     order.status === 'review' ? 'Aprovação' : 'Aguardando'}
                  </span>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="p-8 text-center text-gray-400 italic text-sm">
                Nenhum job ativo.
              </div>
            )}
          </div>
          <button 
            onClick={() => onViewChange && onViewChange(isEditor ? 'videos' : 'design')}
            className="w-full mt-8 py-2.5 rounded-xl border border-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all duration-300"
          >
            Gerenciar Jobs
          </button>
        </div>
      </div>
    </div>
  );
}
