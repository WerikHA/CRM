import { Lead, Client, Receivable, ArtOrder, Partner, User, SupportTicket, VideoOrder } from '../types';

const API_BASE = '/api';

function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

async function request(endpoint: string, method: string, data?: any) {
  const url = `${API_BASE}${endpoint}`;
  
  // Get user from localStorage to pass role/id headers
  const storedUser = localStorage.getItem('agency_user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-user-role'] = user.role;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(toSnakeCase(data)) : undefined,
    });
    
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error(`[API] Erro: O endpoint ${url} retornou HTML em vez de JSON. Possível erro de rota ou 404.`);
      const text = await res.text();
      console.error(`[API] Conteúdo retornado (truncado): ${text.substring(0, 200)}...`);
      throw new Error(`Endpoint ${endpoint} retornou HTML. Verifique se a rota existe no servidor.`);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMessage = err.error || `Failed to ${method} ${endpoint}`;
      
      // Trigger global error notifier
      if ((window as any).reportAppError) {
        (window as any).reportAppError(errorMessage, `Endpoint: ${endpoint} (${method})`);
      }
      
      throw new Error(errorMessage);
    }
    const result = await res.json();
    return toCamelCase(result);
  } catch (error) {
    console.error(`[API] Falha na requisição para ${url}:`, error);
    throw error;
  }
}

export const api = {
  // LEADS
  async getLeads(): Promise<Lead[]> {
    const data = await request('/leads', 'GET');
    return data.map((item: any) => ({
      ...item,
      estimatedValue: Number(item.estimatedValue)
    }));
  },
  async createLead(lead: Lead): Promise<Lead> {
    return request('/leads', 'POST', lead);
  },
  async updateLead(id: string, lead: Partial<Lead>): Promise<Lead> {
    return request(`/leads/${id}`, 'PUT', lead);
  },
  async deleteLead(id: string): Promise<void> {
    return request(`/leads/${id}`, 'DELETE');
  },

  // CLIENTS
  async getClients(): Promise<Client[]> {
    const data = await request('/clients', 'GET');
    return data.map((item: any) => ({
      ...item,
      monthlyValue: Number(item.monthlyValue),
      designerPayout: Number(item.designerPayout)
    }));
  },
  async createClient(client: Client): Promise<Client> {
    return request('/clients', 'POST', client);
  },
  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    return request(`/clients/${id}`, 'PUT', client);
  },
  async deleteClient(id: string): Promise<void> {
    return request(`/clients/${id}`, 'DELETE');
  },

  // RECEIVABLES
  async getReceivables(): Promise<Receivable[]> {
    const data = await request('/receivables', 'GET');
    return data.map((item: any) => ({
      ...item,
      amount: Number(item.amount),
      payoutAmount: Number(item.payoutAmount)
    }));
  },
  async createReceivable(receivable: Receivable): Promise<Receivable> {
    return request('/receivables', 'POST', receivable);
  },
  async updateReceivable(id: string, receivable: Partial<Receivable>): Promise<Receivable> {
    return request(`/receivables/${id}`, 'PUT', receivable);
  },
  async deleteReceivable(id: string): Promise<void> {
    return request(`/receivables/${id}`, 'DELETE');
  },

  // ART ORDERS
  async getArtOrders(): Promise<ArtOrder[]> {
    return request('/art-orders', 'GET');
  },
  async createArtOrder(order: ArtOrder): Promise<ArtOrder> {
    return request('/art-orders', 'POST', order);
  },
  async updateArtOrder(id: string, order: Partial<ArtOrder>): Promise<ArtOrder> {
    return request(`/art-orders/${id}`, 'PUT', order);
  },
  async deleteArtOrder(id: string): Promise<void> {
    return request(`/art-orders/${id}`, 'DELETE');
  },

  // PARTNERS
  async getPartners(): Promise<Partner[]> {
    const data = await request('/partners', 'GET');
    return data.map((item: any) => ({
      ...item,
      commissionValue: Number(item.commissionValue)
    }));
  },
  async createPartner(partner: Partner): Promise<Partner> {
    return request('/partners', 'POST', partner);
  },
  async updatePartner(id: string, partner: Partial<Partner>): Promise<Partner> {
    return request(`/partners/${id}`, 'PUT', partner);
  },
  async deletePartner(id: string): Promise<void> {
    return request(`/partners/${id}`, 'DELETE');
  },

  // PARTNER REQUESTS
  async getPartnerRequests(): Promise<any[]> {
    const data = await request('/partner-requests', 'GET');
    return data.map((item: any) => ({
      ...item,
      cost: Number(item.cost)
    }));
  },
  async createPartnerRequest(partnerReq: any): Promise<any> {
    return request('/partner-requests', 'POST', partnerReq);
  },
  async updatePartnerRequest(id: string, partnerReq: any): Promise<any> {
    return request(`/partner-requests/${id}`, 'PUT', partnerReq);
  },
  async deletePartnerRequest(id: string): Promise<void> {
    return request(`/partner-requests/${id}`, 'DELETE');
  },

  // SUPPORT TICKETS
  async getSupportTickets(): Promise<SupportTicket[]> {
    return request('/support-tickets', 'GET');
  },
  async createSupportTicket(ticket: SupportTicket): Promise<SupportTicket> {
    return request('/support-tickets', 'POST', ticket);
  },
  async updateSupportTicket(id: string, ticket: Partial<SupportTicket>): Promise<SupportTicket> {
    return request(`/support-tickets/${id}`, 'PUT', ticket);
  },
  async deleteSupportTicket(id: string): Promise<void> {
    return request(`/support-tickets/${id}`, 'DELETE');
  },

  // VIDEO ORDERS
  async getVideoOrders(): Promise<VideoOrder[]> {
    return request('/video-orders', 'GET');
  },
  async createVideoOrder(order: VideoOrder): Promise<VideoOrder> {
    return request('/video-orders', 'POST', order);
  },
  async updateVideoOrder(id: string, order: Partial<VideoOrder>): Promise<VideoOrder> {
    return request(`/video-orders/${id}`, 'PUT', order);
  },
  async deleteVideoOrder(id: string): Promise<void> {
    return request(`/video-orders/${id}`, 'DELETE');
  },

  // USERS
  async getUsers(): Promise<User[]> {
    return request('/users', 'GET');
  },
  async createUser(user: User & { password?: string }): Promise<User> {
    return request('/users', 'POST', user);
  },
  async updateUser(id: string, user: Partial<User>): Promise<User> {
    return request(`/users/${id}`, 'PUT', user);
  },
  async deleteUser(id: string): Promise<void> {
    return request(`/users/${id}`, 'DELETE');
  },

  // DEMAND TASKS
  async getDemandTasks(): Promise<any[]> {
    return request('/demand-tasks', 'GET');
  },
  async createDemandTask(task: any): Promise<any> {
    return request('/demand-tasks', 'POST', task);
  },
  async updateDemandTask(id: string, task: any): Promise<any> {
    return request(`/demand-tasks/${id}`, 'PUT', task);
  },
  async deleteDemandTask(id: string): Promise<void> {
    return request(`/demand-tasks/${id}`, 'DELETE');
  },

  // PROSPECTING
  async getProspectLists(): Promise<any[]> {
    return request('/prospecting/lists', 'GET');
  },
  async createProspectList(list: any): Promise<any> {
    return request('/prospecting/lists', 'POST', list);
  },
  async deleteProspectList(id: string): Promise<void> {
    return request(`/prospecting/lists/${id}`, 'DELETE');
  },
  async getProspectLeads(listId?: string): Promise<any[]> {
    const endpoint = listId ? `/prospecting/leads?list_id=${listId}` : '/prospecting/leads';
    return request(endpoint, 'GET');
  },
  async createProspectLead(lead: any): Promise<any> {
    return request('/prospecting/leads', 'POST', lead);
  },
  async updateProspectLead(id: string, lead: any): Promise<any> {
    return request(`/prospecting/leads/${id}`, 'PUT', lead);
  },
  async deleteProspectLead(id: string): Promise<void> {
    return request(`/prospecting/leads/${id}`, 'DELETE');
  },
  async getCampaigns(): Promise<any[]> {
    return request('/prospecting/campaigns', 'GET');
  },
  async createCampaign(campaign: any): Promise<any> {
    return request('/prospecting/campaigns', 'POST', campaign);
  },
  async updateCampaign(id: string, campaign: any): Promise<any> {
    return request(`/prospecting/campaigns/${id}`, 'PUT', campaign);
  },
  async deleteCampaign(id: string): Promise<void> {
    return request(`/prospecting/campaigns/${id}`, 'DELETE');
  },

  async login(email: string, password: string): Promise<{ success: boolean; user: User }> {
    return request('/login', 'POST', { email, password });
  },

  async signup(name: string, email: string, password: string): Promise<{ success: boolean; user: User }> {
    return request('/signup', 'POST', { name, email, password });
  },

  async triggerIntegration(integrationId: string, payload: any): Promise<void> {
    return request(`/integrations/${integrationId}/trigger`, 'POST', payload);
  },

  async reportError(errorInfo: { message: string, stack?: string, context?: string }): Promise<SupportTicket> {
    const storedUser = localStorage.getItem('agency_user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    return request('/support-tickets', 'POST', {
      partnerId: user?.id || null, // Changed from 'system' to null
      subject: `[ERRO DO SISTEMA] - ${user?.name || 'Visitante'}`,
      description: `Mensagem: ${errorInfo.message}\nContexto: ${errorInfo.context || 'Não informado'}\nStack: ${errorInfo.stack || 'Não disponível'}`,
      status: 'open',
      createdAt: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
  },

  // NOTIFICATIONS
  async getNotifications(): Promise<any[]> {
    return request('/notifications', 'GET');
  },
  async markNotificationRead(id: string): Promise<any> {
    return request(`/notifications/${id}`, 'PUT', { isRead: true });
  },
  async deleteNotification(id: string): Promise<void> {
    return request(`/notifications/${id}`, 'DELETE');
  }
};
