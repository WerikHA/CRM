export type UserRole = 'ADMIN' | 'DESIGNER' | 'PARTNER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
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

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  monthlyValue: number;
  renewalDate: string; // dd/mm/aaaa
  contactEmail: string;
  phone?: string;
  assignedDesignerId?: string; // Designer responsável
  partnerId?: string; // Parceiro que trouxe o cliente
  designerPayout?: number; // Quanto o designer ganha por este cliente
}

export interface Receivable {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  dueDate: string; // dd/mm/aaaa
  status: PaymentStatus;
  designerId?: string; // Designer que receberá parte deste valor
  payoutAmount?: number; // Valor do payout específico
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
