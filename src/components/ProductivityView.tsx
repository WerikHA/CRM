import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Activity, CheckCircle2, Clock, Calendar, TrendingUp, Users, Target, Zap } from 'lucide-react';
import { ArtOrder, VideoOrder, DemandTask, User } from '../types';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie } from 'recharts';

interface ProductivityViewProps {
  artOrders: ArtOrder[];
  videoOrders: VideoOrder[];
  demandTasks: DemandTask[];
  users: User[];
}

export default function ProductivityView({ artOrders, videoOrders, demandTasks, users }: ProductivityViewProps) {
  const stats = useMemo(() => {
    const totalDeliveries = artOrders.filter(o => o.status === 'done').length + 
                           videoOrders.filter(o => o.status === 'done').length +
                           demandTasks.filter(o => o.status === 'done').length;
    
    const pendingDeliveries = artOrders.filter(o => o.status !== 'done').length + 
                             videoOrders.filter(o => o.status !== 'done').length +
                             demandTasks.filter(o => o.status !== 'done').length;

    // Delivery by type for Pie Chart
    const deliveriesByType = [
      { name: 'Artes', value: artOrders.filter(o => o.status === 'done').length },
      { name: 'Vídeos', value: videoOrders.filter(o => o.status === 'done').length },
      { name: 'Demandas', value: demandTasks.filter(o => o.status === 'done').length }
    ].filter(d => d.value > 0);

    // Productivity by Designer/Editor
    const teamProductivity = users.map(user => {
      const arts = artOrders.filter(o => o.designerId === user.id && o.status === 'done').length;
      const videos = videoOrders.filter(o => o.editorId === user.id && o.status === 'done').length;
      return {
        name: user.name,
        entregas: arts + videos,
        role: user.role
      };
    }).filter(u => u.entregas > 0).sort((a, b) => b.entregas - a.entregas);

    return {
      totalDeliveries,
      pendingDeliveries,
      deliveriesByType,
      teamProductivity
    };
  }, [artOrders, videoOrders, demandTasks, users]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Produtividade de Entrega</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Métricas de performance e eficiência da equipe.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
          <Calendar size={18} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100 uppercase tracking-wider">Últimos 30 Dias</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Entregue', value: stats.totalDeliveries, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Em Produção', value: stats.pendingDeliveries, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Eficiência Média', value: '94%', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { label: 'Metas Atingidas', value: '8/10', icon: Target, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group"
          >
            <div className={cn("absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform", stat.color)}>
              <stat.icon size={80} />
            </div>
            <div className={cn("w-12 h-12 rounded-2xl mb-4 flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Performance Individual</h3>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={stats.teamProductivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={150}
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="entregas" radius={[0, 10, 10, 0]} barSize={24}>
                  {stats.teamProductivity.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Mix de Entregas</h3>
            </div>
          </div>
          <div className="h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={stats.deliveriesByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.deliveriesByType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalDeliveries}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {stats.deliveriesByType.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{d.name}</span>
                </div>
                <span className="text-sm font-black text-gray-900 dark:text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight mb-8">Destaques da Equipe</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.teamProductivity.slice(0, 3).map((user, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
              <div className="relative">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl uppercase border-2", 
                  i === 0 ? "bg-amber-100 text-amber-600 border-amber-200" : 
                  i === 1 ? "bg-gray-100 text-gray-500 border-gray-200" : 
                  "bg-orange-50 text-orange-600 border-orange-100")}>
                  {user.name.substring(0, 2)}
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-xs font-bold shadow-sm">
                  {i + 1}º
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white uppercase text-sm">{user.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role}</span>
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                    <Zap size={10} fill="currentColor" />
                    <span className="text-xs font-black">{user.entregas} Entregas</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
