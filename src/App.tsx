/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, 
  Users, 
  Briefcase, 
  DollarSign, 
  Palette, 
  Handshake, 
  Settings, 
  Menu, 
  X, 
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar as CalendarIcon,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  INITIAL_LEADS, 
  INITIAL_CLIENTS, 
  INITIAL_RECEIVABLES, 
  INITIAL_ART_ORDERS, 
  INITIAL_PARTNERS, 
  INITIAL_INTEGRATIONS 
} from './constants';
import { Lead, Client, Receivable, ArtOrder, PartnerRequest, IntegrationConfig, Theme } from './types';

// Views
import DashboardView from './components/DashboardView';
import LeadsView from './components/LeadsView';
import ClientsView from './components/ClientsView';
import FinanceView from './components/FinanceView';
import DesignView from './components/DesignView';
import PartnersView from './components/PartnersView';
import AdminView from './components/AdminView';

type ViewType = 'dashboard' | 'leads' | 'clients' | 'finance' | 'design' | 'partners' | 'admin';

const VIEW_LABELS: Record<ViewType, string> = {
  dashboard: 'Painel',
  leads: 'Leads',
  clients: 'Clientes',
  finance: 'Financeiro',
  design: 'Design',
  partners: 'Parceiros',
  admin: 'Configurações'
};

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Global State
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [receivables, setReceivables] = useState<Receivable[]>(INITIAL_RECEIVABLES);
  const [artOrders, setArtOrders] = useState<ArtOrder[]>(INITIAL_ART_ORDERS);
  const [partners, setPartners] = useState<PartnerRequest[]>(INITIAL_PARTNERS);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(INITIAL_INTEGRATIONS);

  // Holidays (April 2026) - dd/mm/aaaa
  const holidays = useMemo(() => [
    { date: '03/04/2026', name: 'Sexta-feira Santa' },
    { date: '05/04/2026', name: 'Páscoa' },
    { date: '21/04/2026', name: 'Tiradentes' },
  ], []);

  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LineChart },
    { id: 'leads', label: 'Leads', icon: TrendingUp },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'finance', label: 'Financeiro', icon: DollarSign },
    { id: 'design', label: 'Design', icon: Palette },
    { id: 'partners', label: 'Parceiros', icon: Handshake },
    { id: 'admin', label: 'Configurações', icon: Settings },
  ];

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': 
        return <DashboardView 
          leads={leads} 
          clients={clients} 
          receivables={receivables} 
          artOrders={artOrders} 
          onViewChange={setActiveView}
        />;
      case 'leads': 
        return <LeadsView 
          leads={leads} 
          setLeads={setLeads} 
        />;
      case 'clients': 
        return <ClientsView 
          clients={clients} 
          setClients={setClients} 
        />;
      case 'finance': 
        return <FinanceView 
          receivables={receivables} 
          setReceivables={setReceivables} 
          clients={clients}
        />;
      case 'design': 
        return <DesignView 
          artOrders={artOrders} 
          setArtOrders={setArtOrders} 
          clients={clients}
          holidays={holidays}
          integrations={integrations}
        />;
      case 'partners': 
        return <PartnersView 
          partners={partners} 
          setPartners={setPartners} 
        />;
      case 'admin': 
        return <AdminView 
          integrations={integrations} 
          setIntegrations={setIntegrations} 
          leads={leads}
          clients={clients}
          artOrders={artOrders}
          receivables={receivables}
        />;
      default: return <DashboardView leads={leads} clients={clients} receivables={receivables} artOrders={artOrders} />;
    }
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <aside 
        className={cn(
          "transition-all duration-300 flex flex-col z-50 border-r border-gray-100 bg-white",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 font-bold text-xl tracking-tight text-indigo-500"
            >
              <Briefcase className="w-6 h-6" />
              <span>AgencyFlow</span>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 text-gray-500"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ViewType)}
              className={cn(
                "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all group relative",
                activeView === item.id 
                  ? "bg-indigo-50/50 text-indigo-600 shadow-sm border border-indigo-100/50"
                  : "text-gray-500 hover:bg-gray-50 hover:text-indigo-500"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 min-w-[20px]",
                activeView === item.id ? "text-indigo-500" : "text-gray-400 group-hover:text-indigo-500"
              )} />
              {isSidebarOpen && (
                <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
              )}
              {!isSidebarOpen && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-indigo-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-indigo-100 text-indigo-700 border border-indigo-200">
              AD
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">Admin Silva</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Diretoria</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-300">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="hover:text-indigo-500 cursor-pointer transition-colors">AgencyFlow</span>
            <ChevronRight size={14} className="opacity-40" />
            <span className="font-medium text-gray-900">
              {VIEW_LABELS[activeView]}
            </span>
          </div>
          <div className="flex items-center gap-4">
             {/* Holidays Monthly Widget */}
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 bg-amber-50 border border-amber-100 text-amber-700">
               <CalendarIcon size={12} className="text-amber-500" />
               <span>Feriados: {holidays.map(h => `${h.date.split('/')[0]}Abr`).join(', ')}</span>
             </div>

             <div className="h-8 w-[1px] mx-2 bg-gray-100" />
             <div className="flex items-center gap-2 cursor-pointer group">
               <span className="text-xs font-semibold text-gray-400 group-hover:text-indigo-500 transition-colors uppercase tracking-widest italic">Status: Online</span>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
