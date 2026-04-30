export type UserRole = 'OWNER' | 'ADMIN' | 'DESIGNER' | 'PARTNER' | 'EDITOR';

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  primaryColor?: string;
  borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'full';
  density?: 'compact' | 'normal' | 'relaxed';
  sidebarStyle?: 'full' | 'mini' | 'glass';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  ownerId?: string; // Admin or Partner who created this user
  uiPreferences?: UserPreferences;
  acceptedTerms?: boolean;
  planId?: string;
  subscriptionStatus?: string;
}

export type LeadStatus = 'prospect' | 'negotiation' | 'converted' | 'lost';
export type ClientStatus = 'active' | 'paused' | 'former';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type ReceivableStatus = PaymentStatus;
export type WorkStatus = 'queue' | 'production' | 'review' | 'done';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Lead {
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone?: string;
  source?: string;
  notes?: string;
  status: LeadStatus;
  estimatedValue: number;
  lastContact: string; // dd/mm/aaaa
}

export interface ClientBranding {
  logo?: string;
  colors: string[]; // up to 5 hex/rgb colors
}

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  monthlyValue: number;
  renewalDate: string; // dd/mm/aaaa
  contactEmail: string;
  phone?: string;
  pixKey?: string; // Chave PIX para pagamentos
  assignedDesignerId?: string; // Designer responsável
  assignedVideoEditorId?: string; // Editor de Vídeo responsável
  partnerId?: string; // Parceiro que trouxe o cliente
  designerPayout?: number; // Quanto o designer ganha por este cliente
  videoEditorPayout?: number; // Quanto o editor de vídeo ganha por este cliente
  branding?: ClientBranding;
  socialAccounts?: {
    facebook?: { connected: boolean; pageName?: string; token?: string; };
    instagram?: { connected: boolean; handle?: string; token?: string; };
  };
  demandConfig?: {
    enabled: boolean;
    type: 'art' | 'video' | 'recording';
    quantity: number;
    frequency: 'daily' | 'weekly' | 'monthly';
    defaultEditorId?: string;
  };
}

export interface ClientDocument {
  id: string;
  clientId: string;
  ownerId: string;
  name: string;
  url: string;
  fileType: string;
  source: 'local' | 'google_drive';
  externalId?: string;
  createdAt: string;
}

export interface DemandTask {
  id: string;
  clientId: string;
  clientName?: string;
  type: 'art' | 'video' | 'recording';
  quantity: number;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  status: 'todo' | 'done';
  createdAt: string;
  title?: string;
  observations?: string;
  materialsLink?: string;
  postDate?: string;
  postTime?: string;
  editorId?: string;
  attachments?: string[];
}

export interface SupportTicket {
  id: string;
  partnerId: string;
  subject: string;
  description: string;
  response?: string;
  status: 'open' | 'closed' | 'replied';
  createdAt: string;
}

export interface Receivable {
  id: string;
  clientId: string;
  description: string;
  quantia: number;
  dueDate: string; // dd/mm/aaaa
  status: PaymentStatus;
  designerId?: string; // Designer que receberá parte deste valor
  payoutAmount?: number; // Valor do payout específico
}

export interface VideoOrder {
  id: string;
  title: string;
  clientId: string;
  editorId: string;
  editorName?: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  progress: number;
  status: WorkStatus;
  videoUrl?: string;
  approvedAt?: string;
  rejectionNotes?: string;
  rejectionAudioUrl?: string;
  ownerId?: string;
  demandId?: string;
  observations?: string;
  postDate?: string;
  materialsLink?: string;
}

export interface ArtOrder {
  id: string;
  title: string;
  clientId: string;
  designerId: string; // ID do designer atribuído
  designerName?: string; // Nome cacheado para facilidade
  deadline: string; // dd/mm/aaaa
  priority: 'low' | 'medium' | 'high';
  progress: number; // 0-100
  status: WorkStatus;
  approvalStatus?: ApprovalStatus;
  whatsappSentAt?: string; // dd/mm/aaaa hh:mm
  observation?: string; // Limite de 300 caracteres
  rejectionNotes?: string; // Observações de reprovação do cliente
  feedbackRequested?: boolean; // Flag para indicar que o link de ajustes foi enviado
  ownerId?: string; // Master owner of the agency
}

export type PartnerRequestStatus = 'pending' | 'ongoing' | 'completed' | 'requested' | 'delivered';

export interface Partner {
  id: string;
  name: string;
  agencyName: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  commissionType: 'fixed' | 'percentage';
  commissionValue: number;
}

export interface PartnerRequest {
  id: string;
  partnerId: string;
  partnerName?: string;
  serviceType: string;
  clientName: string;
  cost: number;
  status: PartnerRequestStatus;
  relatedOrderId?: string;
}

export interface IntegrationConfig {
  id: string;
  service: string;
  isActive: boolean;
  webhookUrl: string;
  apiKey: string;
  accessUrl: string;
  type?: 'generic' | 'whatsapp';
  whatsappConfig?: {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId: string;
  };
}

export interface ProspectLead {
  id: string;
  name: string;
  source: 'google' | 'instagram';
  phone: string;
  email?: string;
  username?: string;
  site?: string;
  category: string;
  city: string;
  status: 'novo' | 'contatado' | 'respondeu' | 'convertido' | 'descartado';
  tags: string[];
  createdAt: string;
  listId?: string; // ID da lista vinculada
}

export interface ProspectList {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ProspectCampaign {
  id: string;
  name: string;
  listId: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  channel: 'whatsapp';
  messageTemplate: string;
  delayBetweenMessages: number; // segundos
  dailyLimit: number;
  lastRunAt?: string;
}

export interface FinanceConfig {
  pixKey: string;
  enableReminders: boolean;
  reminderTemplate: string;
}

export interface FormIntegration {
  id: string;
  name: string;
  fields: string[];
  successMessage: string;
  redirectUrl?: string;
  ownerId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'lead' | 'ticket' | 'approval' | 'system';
  link?: string;
  isRead: boolean;
  createdAt: string;
}
