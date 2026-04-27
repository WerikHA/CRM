import { Lead, Client, Receivable, ArtOrder, PartnerRequest, IntegrationConfig, User, Partner } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Werik Admin', email: 'admin@amplifica.com', role: 'ADMIN' },
  { id: 'u2', name: 'Lucas Andrade', email: 'lucas@design.com', role: 'DESIGNER' },
  { id: 'u3', name: 'Mariana Costa', email: 'mariana@design.com', role: 'DESIGNER' },
  { id: 'u4', name: 'Agência Vídeo Pro', email: 'contato@videopro.com', role: 'PARTNER' },
];

export const INITIAL_PARTNERS_LIST: Partner[] = [
  { id: 'part1', name: 'Rodrigo Maker', agencyName: 'Video Maker Pro', email: 'rodrigo@maker.com', commissionType: 'fixed', commissionValue: 500 },
];

export const INITIAL_LEADS: Lead[] = [
  { id: '1', company: 'TechFlow Solutions', contactName: 'Ana Silva', email: 'ana@techflow.com', status: 'negotiation', estimatedValue: 5000, lastContact: '15/04/2026' },
  { id: '2', company: 'Padaria Central', contactName: 'João Santos', email: 'joao@padaria.com', status: 'prospect', estimatedValue: 1200, lastContact: '18/04/2026' },
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Global Fitness', status: 'active', monthlyValue: 3500, renewalDate: '10/05/2026', contactEmail: 'mkt@globalfitness.com', phone: '5511999999999', assignedDesignerId: 'u2', designerPayout: 450 },
  { id: 'c2', name: 'Eco Vida', status: 'active', monthlyValue: 2800, renewalDate: '01/06/2026', contactEmail: 'contato@ecovida.org', phone: '5511888888888', assignedDesignerId: 'u3', designerPayout: 380 },
];

export const INITIAL_RECEIVABLES: Receivable[] = [
  { id: 'r1', clientId: 'c1', description: 'Mensalidade Abril', amount: 3500, dueDate: '25/04/2026', status: 'pending', designerId: 'u2', payoutAmount: 450 },
  { id: 'r2', clientId: 'c2', description: 'Campanha Black Friday (Antecipado)', amount: 1500, dueDate: '10/04/2026', status: 'overdue', designerId: 'u3', payoutAmount: 380 },
];

export const INITIAL_ART_ORDERS: ArtOrder[] = [
  { id: 'a1', title: 'Post Instagram - Promoção Maio', clientId: 'c1', designerId: 'u2', designerName: 'Lucas Andrade', deadline: '22/04/2026', priority: 'high', progress: 65, status: 'production', approvalStatus: 'pending' },
  { id: 'a2', title: 'Banner Site - Verão', clientId: 'c2', designerId: 'u3', designerName: 'Mariana Costa', deadline: '25/04/2026', priority: 'medium', progress: 20, status: 'queue' },
];

export const INITIAL_PARTNER_REQUESTS: PartnerRequest[] = [
  { id: 'pr1', partnerId: 'part1', partnerName: 'Video Maker Pro', serviceType: 'Tráfego Pago', clientName: 'Loja do Rodrigo', cost: 800, status: 'ongoing' },
];

export const INITIAL_INTEGRATIONS: IntegrationConfig[] = [
  { 
    id: 'i1', 
    service: 'n8n Automações', 
    isActive: true, 
    webhookUrl: '', 
    apiKey: '', 
    accessUrl: '', 
    type: 'generic' 
  },
  { 
    id: 'i2', 
    service: 'WhatsApp API Oficial', 
    isActive: true, 
    webhookUrl: 'https://graph.facebook.com/v17.0/', 
    apiKey: '', 
    accessUrl: 'https://developers.facebook.com', 
    type: 'whatsapp'
  },
];
