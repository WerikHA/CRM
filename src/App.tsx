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
  Sun,
  Target,
  Activity,
  Bell,
  Database
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
import ProspectingView from './components/prospecting/ProspectingView';
import VideoWorkflowView from './components/VideoWorkflowView';
import DemandsView from './components/DemandsView';
import DesignModificationForm from './components/DesignModificationForm';
import NotificationBell from './components/NotificationBell';
import GoogleDriveManager from './components/GoogleDriveManager';
import { SocialPostSchedulerView } from './components/SocialPostSchedulerView';
import { LogOut, Film, ClipboardList, MessageSquare, HardDrive, CalendarClock } from 'lucide-react';
import { ChatWindow } from './components/ChatWindow';

import LandingPage from './components/LandingPage';

type ViewType = 'dashboard' | 'leads' | 'clients' | 'finance' | 'design' | 'videos' | 'partners' | 'demands' | 'tickets' | 'admin' | 'prospecting' | 'productivity' | 'drive';

import { api } from './services/api';
import { VideoOrder, SupportTicket, DemandTask } from './types';
import ProductivityView from './components/ProductivityView';
import ErrorNotifier from './components/ErrorNotifier';
import { ToastContainer } from './components/ui/Toast';
import CookieConsent from './components/CookieConsent';
import MeetingView from './components/MeetingView';

import { storageService } from './lib/storage';

const VIEW_LABELS: Record<ViewType, string> = {
  dashboard: 'Painel',
  leads: 'Leads',
  clients: 'Clientes',
  finance: 'Financeiro',
  design: 'Design',
  videos: 'Edição de Vídeo',
  demands: 'Demandas',
  partners: 'Parceiros',
  tickets: 'Suporte',
  prospecting: 'Prospecção',
  productivity: 'Produtividade',
  drive: 'Arquivos Drive',
  admin: 'Configurações'
};

// Configuração da Agência
const getEnv = (key: string, defaultValue: string) => {
  return (window as any)._env_?.[key] || import.meta.env[key] || defaultValue;
};

const DEFAULT_AGENCY_CONFIG = {
  name: getEnv('VITE_COMPANY_NAME', 'Amplifica CRM'),
  primaryColor: getEnv('VITE_PRIMARY_COLOR', '#4f46e5'),
  logoBgColor: '#6366f1',
  logoUrl: '',
  currency: 'R$',
  locale: 'pt-BR'
};

// Componente de Chat Flutuante Global
function FloatingChat({ currentUser }: { currentUser: User }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 group ring-4 ring-white dark:ring-gray-950",
          isOpen ? "bg-rose-500 rotate-90" : "bg-indigo-600 hover:bg-indigo-700"
        )}
        title="Chat da Equipe"
      >
        {isOpen ? <X size={24} className="text-white" /> : <MessageSquare size={24} className="text-white group-hover:scale-110" />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-950 animate-pulse"></div>
        )}
      </button>
      
      <div className={cn(
        "absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[550px] sm:h-[600px] transition-all duration-500 origin-bottom-right",
        isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-0 opacity-0 translate-y-10 pointer-events-none"
      )}>
         {isOpen && (
           <ChatWindow 
              chatType="team"
              senderId={currentUser.id}
              senderName={currentUser.name}
              ownerId={currentUser.ownerId || currentUser.id}
              title="Chat da Equipe"
              onClose={() => setIsOpen(false)}
           />
         )}
      </div>
    </div>
  );
}

export default function App() {
  const [agencyConfig, setAgencyConfig] = useState(() => {
    try {
      const saved = storageService.getItem('agency_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_AGENCY_CONFIG, ...parsed };
      }
    } catch (e) {
      console.error("Erro ao ler agency_config do storageService:", e);
    }
    return DEFAULT_AGENCY_CONFIG;
  });
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [authView, setAuthView] = useState<'landing' | 'login' | 'signup'>('landing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Debug auth state in production
  useEffect(() => {
    if (import.meta.env.PROD) {
      console.log(`[AUTH DEBUG] Authenticated: ${isAuthenticated}, View: ${authView}, User: ${!!currentUser}`);
    }
  }, [isAuthenticated, authView, currentUser]);
  const [perspective, setPerspective] = useState<User['role'] | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = storageService.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const rid = urlParams.get('roomId');
    if (rid) {
      console.log("[MEET] Room ID detectado:", rid);
      setActiveRoomId(rid);
    }

    (window as any).onJoinMeeting = (id: string) => setActiveRoomId(id);
    return () => { delete (window as any).onJoinMeeting; };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      storageService.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      storageService.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Check for public modification form URL
  const [publicOrderId, setPublicOrderId] = useState<string | null>(null);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('refuseOrderId');
    if (orderId) {
      setPublicOrderId(orderId);
    }
  }, []);

  // Global State
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [receivables, setReceivables] = useState<Receivable[]>(INITIAL_RECEIVABLES);
  const [artOrders, setArtOrders] = useState<ArtOrder[]>(INITIAL_ART_ORDERS);
  const [videoOrders, setVideoOrders] = useState<VideoOrder[]>([]);
  const [demandTasks, setDemandTasks] = useState<DemandTask[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>(INITIAL_PARTNER_REQUESTS);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS_LIST);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(INITIAL_INTEGRATIONS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [holidays] = useState([{ date: '21/04/2026', name: 'Tiradentes' }]);

  useEffect(() => {
    (window as any).onNavigate = (view: ViewType) => setActiveView(view);
    return () => { delete (window as any).onNavigate; };
  }, []);

  const effectiveUser = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role !== 'ADMIN' || !perspective) return currentUser;
    return { ...currentUser, role: perspective };
  }, [currentUser, perspective]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsAuthLoading(true);
      const res = await api.login(email, password);
      // Set storage BEFORE state to avoid race conditions with components that fetch on mount
      storageService.setItem('agency_user', JSON.stringify(res.user), true);
      storageService.setItem('agency_token', res.token, true);
      setCurrentUser(res.user);
      setIsAuthenticated(true);
    } catch (err) {
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    try {
      setIsAuthLoading(true);
      const res = await api.signup(name, email, password);
      // Set storage BEFORE state to avoid race conditions
      storageService.setItem('agency_user', JSON.stringify(res.user), true);
      storageService.setItem('agency_token', res.token, true);
      setCurrentUser(res.user);
      setIsAuthenticated(true);
    } catch (err) {
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    storageService.removeItem('agency_user');
    storageService.removeItem('agency_token');
    setAuthView('landing');
  };

  useEffect(() => {
    (window as any).onLogout = handleLogout;
    return () => { delete (window as any).onLogout; };
  }, []);

  // Check persisted auth
  useEffect(() => {
    const savedUser = storageService.getItem('agency_user');
    const token = storageService.getItem('agency_token');
    
    if (savedUser && token) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setAuthView('landing');
    }
  }, []);

  // Fetch data on mount & auth change
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    const fetchData = async (showLoading = true) => {
      try {
        if (showLoading) setIsLoading(true);
        const data = await api.syncData();

        setLeads(data.leads || []);
        setClients(data.clients || []);
        setReceivables(data.receivables || []);
        setArtOrders(data.artOrders || []);
        setPartners(data.partners || []);
        setPartnerRequests(data.partnerRequests || []);
        setTickets(data.tickets || []);
        setVideoOrders(data.videoOrders || []);
        setDemandTasks(data.demandTasks || []);
        setUsers(data.users || []);
        
        if (currentUser && data.users && data.users.length > 0) {
          const freshSelf = data.users.find((u: any) => u.id === currentUser.id);
          if (freshSelf) {
            setCurrentUser(freshSelf);
            storageService.setItem('agency_user', JSON.stringify(freshSelf));
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    };

    fetchData();

    // Auto-refresh data every 90 seconds to reduce load and stay within rate limits
    const interval = setInterval(() => {
      fetchData(false);
    }, 90000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Filtro de Menu baseado no cargo
  const menuItems = useMemo(() => {
    if (!effectiveUser) return [];
    const isPartner = effectiveUser.role === 'PARTNER';
    
    return [
      { id: 'dashboard', label: 'Painel', icon: LineChart, roles: ['ADMIN', 'DESIGNER', 'PARTNER', 'EDITOR', 'OWNER'] },
      { id: 'leads', label: 'Leads', icon: TrendingUp, roles: ['ADMIN', 'OWNER'] },
      { id: 'clients', label: 'Clientes', icon: Users, roles: ['ADMIN', 'PARTNER', 'OWNER'] },
      { id: 'finance', label: 'Financeiro', icon: DollarSign, roles: ['ADMIN', 'DESIGNER', 'EDITOR', 'OWNER'] },
      { id: 'social_posts', label: 'Agendamento de Posts', icon: CalendarClock, roles: ['ADMIN', 'PARTNER', 'OWNER'] },
      { id: 'design', label: 'Design', icon: Palette, roles: ['ADMIN', 'DESIGNER', 'PARTNER', 'OWNER'] },
      { id: 'videos', label: 'Edição de Vídeo', icon: Briefcase, roles: ['ADMIN', 'EDITOR', 'PARTNER', 'OWNER'] },
      { id: 'demands', label: 'Demandas', icon: ClipboardList, roles: ['ADMIN', 'DESIGNER', 'PARTNER', 'EDITOR', 'OWNER'] },
      { id: 'prospecting', label: 'Prospecção', icon: Target, roles: ['ADMIN'] },
      { id: 'productivity', label: 'Produtividade', icon: Activity, roles: ['ADMIN', 'DESIGNER', 'EDITOR', 'OWNER'] },
      { id: 'drive', label: 'Arquivos Drive', icon: HardDrive, roles: ['ADMIN', 'OWNER'] },
      { id: 'partners', label: isPartner ? 'Solicitações' : 'Parceiros', icon: Handshake, roles: ['ADMIN', 'PARTNER', 'OWNER'] },
      { id: 'tickets', label: 'Suporte', icon: MessageSquare, roles: ['ADMIN', 'PARTNER', 'OWNER'] },
      { id: 'admin', label: 'Configurações', icon: Settings, roles: ['ADMIN', 'OWNER'] },
    ].filter(item => {
      if (effectiveUser.role === 'OWNER' && item.id === 'partners') {
        return partners.some(p => p.email === effectiveUser.email);
      }
      return item.roles.includes(effectiveUser.role);
    });
  }, [effectiveUser, partners]);

  const renderView = () => {
    if (!effectiveUser) return null;
    switch (activeView) {
      case 'dashboard': 
        return <DashboardView 
          leads={leads} 
          clients={clients} 
          receivables={receivables} 
          artOrders={artOrders} 
          videoOrders={videoOrders}
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
      case 'social_posts':
        return <SocialPostSchedulerView
          clients={clients}
          currentUser={effectiveUser}
        />;
      case 'design': 
        return <DesignView 
          artOrders={artOrders} 
          setArtOrders={setArtOrders} 
          clients={clients}
          setClients={setClients}
          receivables={receivables}
          setReceivables={setReceivables}
          partnerRequests={partnerRequests}
          setPartnerRequests={setPartnerRequests}
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
      case 'prospecting':
        return <ProspectingView />;
      case 'videos':
        return <VideoWorkflowView 
          videoOrders={videoOrders}
          setVideoOrders={setVideoOrders}
          clients={clients}
          setClients={setClients}
          receivables={receivables}
          setReceivables={setReceivables}
          users={users}
          currentUser={effectiveUser}
        />;
      case 'productivity':
        return <ProductivityView 
          artOrders={artOrders}
          videoOrders={videoOrders}
          demandTasks={demandTasks}
          users={users}
        />;
      case 'drive':
        return <GoogleDriveManager />;
      case 'demands':
        return <DemandsView 
          tasks={demandTasks}
          setTasks={setDemandTasks}
          clients={clients}
          users={users}
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
          agencyConfig={agencyConfig}
          setAgencyConfig={setAgencyConfig}
          currentUser={effectiveUser}
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

  if (activeRoomId && !currentUser) {
    return (
      <MeetingView 
        roomId={activeRoomId} 
        currentUser={null} 
        onExit={() => {
          setActiveRoomId(null);
          const url = new URL(window.location.href);
          url.searchParams.delete('roomId');
          window.history.pushState({}, '', url.pathname + url.search);
        }} 
      />
    );
  }

  if (publicOrderId) {
    return (
      <>
        <DesignModificationForm 
          orderId={publicOrderId} 
          onSuccess={() => {
            window.history.replaceState({}, '', window.location.pathname);
            setPublicOrderId(null);
          }} 
        />
        <CookieConsent />
      </>
    );
  }

  if (!isAuthenticated || !currentUser || !effectiveUser) {
    if (authView === 'landing') {
      return (
        <>
          <LandingPage 
            onLogin={() => setAuthView('login')} 
            onSignup={() => setAuthView('signup')} 
            agencyName={agencyConfig.name}
            primaryColor={agencyConfig.primaryColor}
          />
          <CookieConsent />
        </>
      );
    }
    return (
      <>
        <LoginView 
          onLogin={handleLogin} 
          onSignup={handleSignup} 
          isLoading={isAuthLoading} 
          initialMode={authView === 'login' ? 'login' : 'signup'}
          onBack={() => setAuthView('landing')}
        />
        <CookieConsent />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "transition-all duration-300 flex flex-col z-50 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 absolute md:relative h-full top-0 left-0",
          isSidebarOpen ? "w-64 translate-x-0" : "w-64 md:w-16 -translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 font-bold text-xl tracking-tight text-indigo-500 flex-1"
            >
              <div 
                className="flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-xl shadow-sm"
                style={{ backgroundColor: agencyConfig.logoBgColor || agencyConfig.primaryColor }}
              >
                {agencyConfig.logoUrl ? (
                  <img src={agencyConfig.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Briefcase className="w-6 h-6 text-white" />
                )}
              </div>
              <span className="leading-tight text-lg break-words whitespace-normal max-w-[130px]" style={{ color: agencyConfig.primaryColor }}>{agencyConfig.name}</span>
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
                  ? "bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-500/20"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-indigo-500 dark:hover:text-indigo-400"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 min-w-[20px]",
                activeView === item.id ? "text-indigo-500" : "text-gray-400 group-hover:text-indigo-500"
              )} />
              {isSidebarOpen && (
                <span className="font-medium text-sm whitespace-nowrap flex items-center gap-2">
                  {item.label}
                </span>
              )}
              {!isSidebarOpen && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-indigo-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap hidden md:block">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {currentUser.role === 'ADMIN' && (
            <div className="flex flex-col gap-1 mb-2">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest px-1">Simular Visão</label>
              <div className="flex bg-gray-50 dark:bg-gray-800/50 rounded-xl p-1 gap-1">
                <button 
                  onClick={() => { setPerspective(null); setActiveView('dashboard'); }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all",
                    !perspective ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-transparent"
                  )}
                >
                  Admin
                </button>
                <button 
                  onClick={() => { setPerspective('OWNER'); setActiveView('dashboard'); }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all",
                    perspective === 'OWNER' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-transparent"
                  )}
                >
                  Proprietário
                </button>
                <button 
                  onClick={() => { setPerspective('PARTNER'); setActiveView('dashboard'); }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all",
                    perspective === 'PARTNER' ? "bg-white text-amber-600 shadow-sm" : "text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-transparent"
                  )}
                >
                  Parceiro
                </button>
                <button 
                  onClick={() => { setPerspective('DESIGNER'); setActiveView('dashboard'); }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all",
                    perspective === 'DESIGNER' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-transparent"
                  )}
                >
                  Design
                </button>
                <button 
                  onClick={() => { setPerspective('EDITOR'); setActiveView('dashboard'); }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all whitespace-nowrap px-1",
                    perspective === 'EDITOR' ? "bg-white text-purple-600 shadow-sm" : "text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-transparent"
                  )}
                >
                  Editor <span className="text-[7px] text-amber-500">(Breve)</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border uppercase",
                !perspective ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" :
                perspective === 'OWNER' ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" :
                perspective === 'PARTNER' ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" :
                perspective === 'DESIGNER' ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" :
                perspective === 'EDITOR' ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" :
                ""
              )}>
                {currentUser.name.substring(0, 2)}
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[120px]">{currentUser.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                    {perspective ? `Visualizar: ${perspective === 'OWNER' ? 'Proprietário' : perspective}` : (currentUser.role === 'OWNER' ? 'PROPRIETÁRIO' : currentUser.role)}
                  </span>
                </div>
              )}
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="h-16 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 transition-colors duration-300">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
            <button 
              className="md:hidden p-1 mr-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="cursor-pointer transition-colors hidden sm:block truncate max-w-[120px]" style={{ color: agencyConfig.primaryColor }}>{agencyConfig.name}</span>
            <ChevronRight size={14} className="opacity-40 hidden sm:block" />
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {VIEW_LABELS[activeView]}
            </span>
          </div>
          <div className="flex items-center gap-4">
             {/* Meeting Button Quick Access */}
             {(effectiveUser.role === 'ADMIN' || effectiveUser.role === 'OWNER') && (
               <button 
                onClick={() => {
                  const id = Math.random().toString(36).substr(2, 9);
                  setActiveRoomId(id);
                }}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20"
               >
                 <Film size={12} />
                 Meet
               </button>
             )}

             {/* Theme Toggle */}
             <button 
               onClick={toggleTheme}
               type="button"
               className="p-2 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
               title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
             >
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>

             {/* Holidays Monthly Widget */}
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400">
               <CalendarIcon size={12} className="text-amber-500" />
               <span>Feriados: {holidays.map(h => `${h.date.split('/')[0]}Abr`).join(', ')}</span>
             </div>

             <div className="h-8 w-[1px] mx-2 bg-gray-100 dark:bg-gray-800" />
             <NotificationBell onNavigate={setActiveView} />
             <div className="flex items-center gap-2 cursor-pointer group">
               <span className="text-xs font-semibold text-gray-400 dark:text-gray-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-widest italic">Status: Online</span>
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

      {/* Floating Team Chat Trigger (Global) */}
      <AnimatePresence>
        {isAuthenticated && effectiveUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <FloatingChat currentUser={effectiveUser} />
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorNotifier />
      <ToastContainer />
      <CookieConsent />

      {activeRoomId && (
        <MeetingView 
          roomId={activeRoomId} 
          currentUser={currentUser} 
          onExit={() => {
            setActiveRoomId(null);
            // Clear URL param
            const url = new URL(window.location.href);
            url.searchParams.delete('roomId');
            window.history.pushState({}, '', url.pathname + url.search);
          }} 
        />
      )}
    </div>
  );
}
