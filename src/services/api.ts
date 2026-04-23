import { Lead, Client, Receivable, ArtOrder, Partner, User } from '../types';

const API_BASE = '/api';

export const api = {
  async getLeads(): Promise<Lead[]> {
    const res = await fetch(`${API_BASE}/leads`);
    if (!res.ok) throw new Error('Failed to fetch leads');
    const data = await res.json();
    return data.map((item: any) => ({
      ...item,
      contactName: item.contact_name,
      estimatedValue: Number(item.estimated_value),
      lastContact: item.last_contact
    }));
  },

  async createLead(lead: Lead): Promise<Lead> {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...lead,
        contact_name: lead.contactName,
        estimated_value: lead.estimatedValue,
        last_contact: lead.lastContact
      }),
    });
    if (!res.ok) throw new Error('Failed to create lead');
    return res.json();
  },

  async getClients(): Promise<Client[]> {
    const res = await fetch(`${API_BASE}/clients`);
    if (!res.ok) throw new Error('Failed to fetch clients');
    const data = await res.json();
    return data.map((item: any) => ({
      ...item,
      monthlyValue: Number(item.monthly_value),
      renewalDate: item.renewal_date,
      contactEmail: item.contact_email,
      assignedDesignerId: item.assigned_designer_id,
      partnerId: item.partner_id,
      designerPayout: Number(item.designer_payout)
    }));
  },

  async getReceivables(): Promise<Receivable[]> {
    const res = await fetch(`${API_BASE}/receivables`);
    if (!res.ok) throw new Error('Failed to fetch receivables');
    const data = await res.json();
    return data.map((item: any) => ({
      ...item,
      clientId: item.client_id,
      amount: Number(item.amount),
      dueDate: item.due_date,
      designerId: item.designer_id,
      payoutAmount: Number(item.payout_amount)
    }));
  },

  async getArtOrders(): Promise<ArtOrder[]> {
    const res = await fetch(`${API_BASE}/art-orders`);
    if (!res.ok) throw new Error('Failed to fetch art orders');
    const data = await res.json();
    return data.map((item: any) => ({
      ...item,
      clientId: item.client_id,
      designerId: item.designer_id,
      approvalStatus: item.approval_status,
      whatsappSentAt: item.whatsapp_sent_at
    }));
  },

  async getPartners(): Promise<Partner[]> {
    const res = await fetch(`${API_BASE}/partners`);
    if (!res.ok) throw new Error('Failed to fetch partners');
    const data = await res.json();
    return data.map((item: any) => ({
      ...item,
      agencyName: item.agency_name,
      commissionType: item.commission_type,
      commissionValue: Number(item.commission_value)
    }));
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async createUser(user: User & { password?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  },

  async login(email: string, password: string): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Falha na autenticação');
    }
    return res.json();
  }
};
