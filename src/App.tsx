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
import LoginView from './components/LoginView';
import SupportView from './components/SupportView';
import VideoWorkflowView from './components/VideoWorkflowView';
import { LogOut, Film } from 'lucide-react';

type ViewType = 'dashboard' | 'leads' | 'clients' | 'finance' | 'design' | 'videos' | 'partners' | 'tickets' | 'admin';

import { api } from './services/api';
import { VideoOrder, SupportTicket } from './types';

const VIEW_LABELS: Record<ViewType, string> = {
  dashboard: 'Painel',
  leads: 'Leads',
  clients: 'Clientes',
  finance: 'Financeiro',
  design: 'Design',
  videos: 'Edição de Vídeo',
  partners: 'Parceiros',
  tickets: 'Suporte',
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [perspective, setPerspective] = useState<User['role'] | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Global State
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [receivables, setReceivables] = useState<Receivable[]>(INITIAL_RECEIVABLES);
  const [artOrders, setArtOrders] = useState<ArtOrder[]>(INITIAL_ART_ORDERS);
  const [videoOrders, setVideoOrders] = useState<VideoOrder[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>(INITIAL_PARTNER_REQUESTS);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS_LIST);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(INITIAL_INTEGRATIONS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [holidays] = useState([{ date: '21/04/2026', name: 'Tiradentes' }]);

  const effectiveUser = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role !== 'ADMIN' || !perspective) return currentUser;
    return { ...currentUser, role: perspective };
  }, [currentUser, perspective]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsAuthLoading(true);
      const res = await api.login(email, password);
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      localStorage.setItem('agency_user', JSON.stringify(res.user));
    } catch (err) {
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('agency_user');
  };

  // Check persisted auth
  useEffect(() => {
    const savedUser = localStorage.getItem('agency_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch data on mount & auth change
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
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
          // Only update current user if it matches the ID to refresh profile data, 
          // but don't overwrite with a different user
          if (currentUser) {
            const freshSelf = usersData.find(u => u.id === currentUser.id);
            if (freshSelf) setCurrentUser(freshSelf);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Filtro de Menu baseado no cargo
  const menuItems = useMemo(() => {
    if (!effectiveUser) return [];
    const isPartner = effectiveUser.role === 'PARTNER';
    
    return [
      { id: 'dashboard', label: 'Painel', icon: LineChart, roles: ['ADMIN', 'DESIGNER', 'PARTNER', 'EDITOR'] },
      { id: 'leads', label: 'Leads', icon: TrendingUp, roles: ['ADMIN'] },
      { id: 'clients', label: 'Clientes', icon: Users, roles: ['ADMIN', 'PARTNER'] },
      { id: 'finance', label: 'Financeiro', icon: DollarSign, roles: ['ADMIN', 'DESIGNER', 'EDITOR'] },
      { id: 'design', label: 'Design', icon: Palette, roles: ['ADMIN', 'DESIGNER', 'PARTNER'] },
      { id: 'videos', label: 'Edição de Vídeo', icon: Briefcase, roles: ['ADMIN', 'EDITOR', 'PARTNER'] },
      { id: 'partners', label: isPartner ? 'Solicitações' : 'Parceiros', icon: Handshake, roles: ['ADMIN', 'PARTNER'] },
      { id: 'tickets', label: 'Suporte', icon: Settings, roles: ['ADMIN', 'PARTNER'] },
      { id: 'admin', label: 'Configurações', icon: Settings, roles: ['ADMIN'] },
    ].filter(item => item.roles.includes(effectiveUser.role));
  }, [effectiveUser]);

  const renderView = () => {
    if (!effectiveUser) return null;
    switch (activeView) {
      case 'dashboard': 
        return <DashboardView 
          leads={leads} 
          clients={clients} 
          receivables={receivables} 
          artOrders={artOrders} 
          partners={partners}
          partnerRequests={partnerRequests}
          onViewChange={setActiveView}
          currentUser={effectiveUser}
        />;
      case 'leads': 
        return <LeadsView 
          leads={leads} 
          setLeads={setLeads} 
          setClients={setClients}
        />;
      case 'clients': 
        return <ClientsView 
          clients={clients} 
          setClients={setClients} 
          users={users}
          partners={partners}
          currentUser={effectiveUser}
        />;
      case 'finance': 
        return <FinanceView 
          receivables={receivables} 
          setReceivables={setReceivables} 
          clients={clients}
          currentUser={effectiveUser}
        />;
      case 'design': 
        return <DesignView 
          artOrders={artOrders} 
          setArtOrders={setArtOrders} 
          clients={clients}
          holidays={holidays}
          integrations={integrations}
          currentUser={effectiveUser}
          users={users}
        />;
      case 'partners': 
        return <PartnersView 
          partnerRequests={partnerRequests} 
          setPartnerRequests={setPartnerRequests}
          partners={partners}
          setPartners={setPartners}
          currentUser={effectiveUser}
          artOrders={artOrders}
          setArtOrders={setArtOrders}
          clients={clients}
          setClients={setClients}
          users={users}
          setUsers={setUsers}
        />;
      case 'tickets':
        return <SupportView 
          tickets={tickets}
          setTickets={setTickets}
          currentUser={effectiveUser}
        />;
      case 'videos':
        return <VideoWorkflowView 
          videoOrders={videoOrders}
          setVideoOrders={setVideoOrders}
          clients={clients}
          users={users}
          currentUser={effectiveUser}
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
          setUsers={setUsers}
        />;
      default: return <DashboardView 
        leads={leads} 
        clients={clients} 
        receivables={receivables} 
        artOrders={artOrders} 
        currentUser={effectiveUser} 
        partners={partners}
        partnerRequests={partnerRequests}
      />;
    }
  };

  if (!isAuthenticated || !currentUser || !effectiveUser) {
    return <LoginView onLogin={handleLogin} isLoading={isAuthLoading} />;
  }

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
          {currentUser.role === 'ADMIN' && (
            <div className="flex flex-col gap-1 mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Simular Visão</label>
              <div className="flex bg-gray-50 rounded-xl p-1 gap-1">
                <button 
                  onClick={() => { setPerspective(null); setActiveView('dashboard'); }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all",
                    !perspective ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600 border border-transparent"
                  )}
                >
                  Admin
                </button>
                <button 
                  onClick={() => { setPerspective('PARTNER'); setActiveView('dashboard'); }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all",
                    perspective === 'PARTNER' ? "bg-white text-amber-600 shadow-sm" : "text-gray-400 hover:text-gray-600 border border-transparent"
                  )}
                >
                  Parceiro
                </button>
                <button 
                  onClick={() => { setPerspective('DESIGNER'); setActiveView('dashboard'); }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all",
                    perspective === 'DESIGNER' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600 border border-transparent"
                  )}
                >
                  Design
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border uppercase",
                !perspective ? "bg-indigo-100 text-indigo-700 border-indigo-200" :
                perspective === 'PARTNER' ? "bg-amber-100 text-amber-700 border-amber-200" :
                perspective === 'DESIGNER' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                ""
              )}>
                {currentUser.name.substring(0, 2)}
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">{currentUser.name}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                    {perspective ? `Visualizar: ${perspective}` : currentUser.role}
                  </span>
                </div>
              )}
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
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
