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
  INITIAL_PARTNER_REQUESTS, 
  INITIAL_INTEGRATIONS,
  INITIAL_USERS,
  INITIAL_PARTNERS_LIST
} from './constants';
import { Lead, Client, Receivable, ArtOrder, PartnerRequest, IntegrationConfig, User, Partner } from './types';

// Views
import DashboardView from './components/DashboardView';
import LeadsView from './components/LeadsView';
import ClientsView from './components/ClientsView';
import FinanceView from './components/FinanceView';
import DesignView from './components/DesignView';
import PartnersView from './components/PartnersView';
import AdminView from './components/AdminView';

type ViewType = 'dashboard' | 'leads' | 'clients' | 'finance' | 'design' | 'partners' | 'admin';

import { api } from './services/api';

const VIEW_LABELS: Record<ViewType, string> = {
  dashboard: 'Painel',
  leads: 'Leads',
  clients: 'Clientes',
  finance: 'Financeiro',
  design: 'Design',
  partners: 'Parceiros',
  admin: 'Configurações'
};

// Configuração da Agência
const AGENCY_CONFIG = {
  name: import.meta.env.VITE_COMPANY_NAME || 'AgencyFlow CRM',
  primaryColor: import.meta.env.VITE_PRIMARY_COLOR || '#4f46e5',
  currency: 'R$',
  locale: 'pt-BR'
};

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [isLoading, setIsLoading] = useState(true);

  // Global State
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [receivables, setReceivables] = useState<Receivable[]>(INITIAL_RECEIVABLES);
  const [artOrders, setArtOrders] = useState<ArtOrder[]>(INITIAL_ART_ORDERS);
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>(INITIAL_PARTNER_REQUESTS);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS_LIST);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(INITIAL_INTEGRATIONS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [holidays] = useState([{ date: '21/04/2026', name: 'Tiradentes' }]);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [
          leadsData, 
          clientsData, 
          receivablesData, 
          artOrdersData, 
          partnersData,
          usersData
        ] = await Promise.all([
          api.getLeads(),
          api.getClients(),
          api.getReceivables(),
          api.getArtOrders(),
          api.getPartners(),
          api.getUsers()
        ]);

        if (leadsData.length > 0) setLeads(leadsData);
        if (clientsData.length > 0) setClients(clientsData);
        if (receivablesData.length > 0) setReceivables(receivablesData);
        if (artOrdersData.length > 0) setArtOrders(artOrdersData);
        if (partnersData.length > 0) setPartners(partnersData);
        if (usersData.length > 0) {
          setUsers(usersData);
          setCurrentUser(usersData[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtro de Menu baseado no cargo
  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LineChart, roles: ['ADMIN', 'DESIGNER', 'PARTNER'] },
    { id: 'leads', label: 'Leads', icon: TrendingUp, roles: ['ADMIN'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['ADMIN'] },
    { id: 'finance', label: 'Financeiro', icon: DollarSign, roles: ['ADMIN', 'DESIGNER'] },
    { id: 'design', label: 'Design', icon: Palette, roles: ['ADMIN', 'DESIGNER'] },
    { id: 'partners', label: 'Parceiros', icon: Handshake, roles: ['ADMIN', 'PARTNER'] },
    { id: 'admin', label: 'Configurações', icon: Settings, roles: ['ADMIN'] },
  ].filter(item => item.roles.includes(currentUser.role));

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': 
        return <DashboardView 
          leads={leads} 
          clients={clients} 
          receivables={receivables} 
          artOrders={artOrders} 
          onViewChange={setActiveView}
          currentUser={currentUser}
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
          users={users}
          partners={partners}
        />;
      case 'finance': 
        return <FinanceView 
          receivables={receivables} 
          setReceivables={setReceivables} 
          clients={clients}
          currentUser={currentUser}
        />;
      case 'design': 
        return <DesignView 
          artOrders={artOrders} 
          setArtOrders={setArtOrders} 
          clients={clients}
          holidays={holidays}
          integrations={integrations}
          currentUser={currentUser}
          users={users}
        />;
      case 'partners': 
        return <PartnersView 
          partnerRequests={partnerRequests} 
          setPartnerRequests={setPartnerRequests}
          partners={partners}
          setPartners={setPartners}
          currentUser={currentUser}
        />;
      case 'admin': 
        return <AdminView 
          integrations={integrations} 
          setIntegrations={setIntegrations} 
          leads={leads}
          clients={clients}
          artOrders={artOrders}
          receivables={receivables}
          users={users}
        />;
      default: return <DashboardView leads={leads} clients={clients} receivables={receivables} artOrders={artOrders} currentUser={currentUser} />;
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
              <span>{AGENCY_CONFIG.name}</span>
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

        <div className="p-4 border-t border-gray-100 space-y-3">
          <select 
            value={currentUser.id}
            onChange={(e) => {
              const user = users.find(u => u.id === e.target.value);
              if (user) {
                setCurrentUser(user);
                setActiveView('dashboard');
              }
            }}
            className="w-full text-[10px] font-bold text-indigo-600 bg-indigo-50 border-none rounded-lg p-1 px-2 focus:ring-0 cursor-pointer mb-2"
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>Simular: {u.name} ({u.role})</option>
            ))}
          </select>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase">
              {currentUser.name.substring(0, 2)}
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">{currentUser.name}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{currentUser.role}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-300">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="hover:text-indigo-500 cursor-pointer transition-colors">{AGENCY_CONFIG.name}</span>
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
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-indigo-500">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium animate-pulse">Carregando dados da agência...</p>
            </div>
          ) : (
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
          )}
        </section>
      </main>
    </div>
  );
}
