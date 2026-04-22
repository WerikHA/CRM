import { Lead, Client, Receivable, ArtOrder, PartnerRequest, IntegrationConfig } from './types';

export const INITIAL_LEADS: Lead[] = [
  { id: '1', company: 'TechFlow Solutions', contactName: 'Ana Silva', email: 'ana@techflow.com', status: 'negotiation', estimatedValue: 5000, lastContact: '15/04/2026' },
  { id: '2', company: 'Padaria Central', contactName: 'João Santos', email: 'joao@padaria.com', status: 'prospect', estimatedValue: 1200, lastContact: '18/04/2026' },
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Global Fitness', status: 'active', monthlyValue: 3500, renewalDate: '10/05/2026', contactEmail: 'mkt@globalfitness.com', phone: '5511999999999' },
  { id: 'c2', name: 'Eco Vida', status: 'active', monthlyValue: 2800, renewalDate: '01/06/2026', contactEmail: 'contato@ecovida.org', phone: '5511888888888' },
];

export const INITIAL_RECEIVABLES: Receivable[] = [
  { id: 'r1', clientId: 'c1', description: 'Mensalidade Abril', amount: 3500, dueDate: '25/04/2026', status: 'pending' },
  { id: 'r2', clientId: 'c2', description: 'Campanha Black Friday (Antecipado)', amount: 1500, dueDate: '10/04/2026', status: 'overdue' },
];

export const INITIAL_ART_ORDERS: ArtOrder[] = [
  { id: 'a1', title: 'Post Instagram - Promoção Maio', clientId: 'c1', designer: 'Lucas Andrade', deadline: '22/04/2026', priority: 'high', progress: 65, status: 'production', approvalStatus: 'pending' },
  { id: 'a2', title: 'Banner Site - Verão', clientId: 'c2', designer: 'Mariana Costa', deadline: '25/04/2026', priority: 'medium', progress: 20, status: 'queue' },
];

export const INITIAL_PARTNERS: PartnerRequest[] = [
  { id: 'p1', partnerName: 'Tráfego Pro', serviceType: 'Google Ads', cost: 800, status: 'ongoing' },
];

export const INITIAL_INTEGRATIONS: IntegrationConfig[] = [
  { id: 'i1', service: 'n8n Automações', isActive: false, webhookUrl: '', apiKey: '', accessUrl: 'http://localhost:5678', type: 'generic' },
  { id: 'i2', service: 'WhatsApp API Oficial', isActive: false, webhookUrl: '', apiKey: '', accessUrl: 'https://developers.facebook.com', type: 'whatsapp', whatsappConfig: { phoneNumberId: '', accessToken: '', businessAccountId: '' } },
];
