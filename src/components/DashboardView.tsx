import React from 'react';
import { TrendingUp, Users, DollarSign, Palette, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Lead, Client, Receivable, ArtOrder } from '../types';

interface DashboardViewProps {
  leads: Lead[];
  clients: Client[];
  receivables: Receivable[];
  artOrders: ArtOrder[];
  onViewChange?: (view: any) => void;
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

export default function DashboardView({ leads, clients, receivables, artOrders, onViewChange }: DashboardViewProps) {
  const totalMonthlyValue = clients.reduce((acc, c) => acc + c.monthlyValue, 0);
  const activeOrders = artOrders.filter(o => o.status !== 'done').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight transition-colors">Bem-vindo de volta!</h1>
        <p className="text-gray-500 mt-1">Aqui está o resumo da sua agência hoje.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Receita Mensal" value={`R$ ${totalMonthlyValue.toLocaleString()}`} change={12.5} icon={DollarSign} color="#6366f1" />
        <StatCard title="Leads Ativos" value={leads.length} change={8.2} icon={TrendingUp} color="#10b981" />
        <StatCard title="Clientes Ativos" value={clients.length} change={0} icon={Users} color="#f59e0b" />
        <StatCard title="Pedidos em Produção" value={activeOrders} change={-4.1} icon={Palette} color="#ec4899" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Finance Quick View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900">Pendências Financeiras</h2>
            <button 
              onClick={() => onViewChange && onViewChange('finance')}
              className="text-sm font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-4">
            {receivables.filter(r => r.status !== 'paid').map(r => {
              const client = clients.find(c => c.id === r.clientId);
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
                    <p className="font-bold text-gray-900">R$ {r.amount.toLocaleString()}</p>
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
          </div>
        </div>

        {/* Design Focus */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 transition-colors duration-300">
          <h2 className="font-bold text-gray-900 mb-6 transition-colors">Foco do Design</h2>
          <div className="space-y-6">
            {artOrders.slice(0, 3).map(order => (
              <div key={order.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-900 transition-colors uppercase text-xs tracking-tight">{order.title}</span>
                  <span className="text-xs text-gray-400 font-bold">{order.progress}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden transition-colors">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500" 
                    style={{ width: `${order.progress}%` }} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-400 font-medium italic transition-colors">Prazo: {order.deadline}</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase py-0.5 px-1.5 rounded-md",
                    order.status === 'production' ? "bg-sky-50 text-sky-600" : 
                    order.status === 'review' ? "bg-amber-50 text-amber-600" : 
                    "bg-slate-50 text-slate-600"
                  )}>
                    {order.status === 'production' ? 'Em Produção' : 
                     order.status === 'review' ? 'Aprovação' : 'Na Fila'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => {
              // We need a way to change the active view from the Dashboard.
              // I'll add a 'setActiveView' prop to DashboardView.
              if (onViewChange) onViewChange('design');
            }}
            className="w-full mt-8 py-2.5 rounded-xl border border-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all duration-300"
          >
            Gerenciar Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
