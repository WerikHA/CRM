import { Lead, Client, Receivable, ArtOrder, Partner, User, SupportTicket, VideoOrder, ClientDocument } from '../types';
import { storageService } from '../lib/storage';

const API_BASE = '/api';

function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj || {}).reduce((acc, key) => {
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
    return Object.keys(obj || {}).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

async function request(endpoint: string, method: string, data?: any) {
  const url = `${API_BASE}${endpoint}`;
  
  // Get user/token from storageService
  const storedUser = storageService.getItem('agency_user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const token = storageService.getItem('agency_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(toSnakeCase(data)) : undefined,
    });
    
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const text = await res.text();
      console.error(`[API] Erro: O endpoint ${url} retornou HTML. Isso geralmente significa que o servidor está iniciando ou a rota não existe.`);
      console.error(`[API] Preview do conteúdo: ${text.substring(0, 100).replace(/\n/g, ' ')}...`);
      throw new Error(`Endpoint ${endpoint} retornou HTML (Servidor iniciando ou Erro 404).`);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMessage = err.error || `Failed to ${method} ${endpoint}`;
      
      // Auto-logout on 401 (if not on login/signup)
      if (res.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/signup')) {
        if ((window as any).onLogout) {
          (window as any).onLogout();
        }
      }
      
      // Trigger global error notifier (skip for soft errors like SYSTEM_EMPTY)
      if ((window as any).reportAppError && err.code !== 'SYSTEM_EMPTY') {
        (window as any).reportAppError(errorMessage, `Endpoint: ${endpoint} (${method})`);
      }
      
      const error: any = new Error(errorMessage);
      error.code = err.code;
      throw error;
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
    if (!Array.isArray(data)) return [];
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
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      ...item,
      monthlyValue: Number(item.monthlyValue),
      designerPayout: Number(item.designerPayout)
    }));
  },
  async getClient(id: string): Promise<Client> {
    const item = await request(`/clients/${id}`, 'GET');
    return {
      ...item,
      monthlyValue: Number(item.monthlyValue),
      designerPayout: Number(item.designerPayout)
    };
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
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      ...item,
      quantia: Number(item.quantia || item.amount || 0),
      payoutAmount: Number(item.payoutAmount || 0)
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

  // CLIENT DOCUMENTS
  async listClientDocuments(clientId: string): Promise<ClientDocument[]> {
    return request(`/client-documents?clientId=${clientId}`, 'GET');
  },
  async createClientDocument(doc: Partial<ClientDocument>): Promise<ClientDocument> {
    return request('/client-documents', 'POST', doc);
  },
  async deleteClientDocument(id: string): Promise<void> {
    return request(`/client-documents/${id}`, 'DELETE');
  },

  // ART ORDERS
  async getArtOrders(): Promise<ArtOrder[]> {
    return request('/art-orders', 'GET');
  },
  async getArtOrder(id: string): Promise<ArtOrder> {
    return request(`/art-orders/${id}`, 'GET');
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
    if (!Array.isArray(data)) return [];
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
    if (!Array.isArray(data)) return [];
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
  async getUser(id: string): Promise<User> {
    return request(`/users/${id}`, 'GET');
  },
  async createUser(user: User & { password?: string }): Promise<User> {
    return request('/users', 'POST', user);
  },
  async updateUser(id: string, user: Partial<User>): Promise<User> {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await request(`/users/${id}`, 'PUT', user);
      } catch (error: any) {
        if (attempt === maxRetries || !error.message?.includes('HTML')) throw error;
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
    throw new Error('Falha ao atualizar usuário após várias tentativas.');
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

  async login(email: string, password: string): Promise<{ success: boolean; user: User; token: string }> {
    return request('/login', 'POST', { email, password });
  },

  async uploadFile(file: File): Promise<{ success: boolean; url: string; filename: string; originalName: string }> {
    const url = `${API_BASE}/upload`;
    const token = storageService.getItem('agency_token');
    
    const formData = new FormData();
    formData.append('file', file);
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha no upload do arquivo');
    }
    
    return res.json();
  },

  async signup(name: string, email: string, password: string, acceptedTerms: boolean = true, sessionId?: string | null, planId?: string | null): Promise<{ success: boolean; user: User; token: string }> {
    return request('/signup', 'POST', { name, email, password, acceptedTerms, sessionId, planId });
  },

  async triggerIntegration(integrationId: string, payload: any): Promise<void> {
    return request(`/integrations/${integrationId}/trigger`, 'POST', payload);
  },

  async reportError(errorInfo: { message: string, stack?: string, context?: string }): Promise<SupportTicket> {
    const storedUser = storageService.getItem('agency_user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    return request('/support-tickets', 'POST', {
      partnerId: user?.id || null, // Changed from 'system' to null
      subject: `[ERRO DO SISTEMA] - ${user?.name || 'Visitante'}`,
      description: `Mensagem: ${errorInfo.message}\nContexto: ${errorInfo.context || 'Não informado'}\nStack: ${errorInfo.stack || 'Não disponível'}`,
      status: 'open',
      createdAt: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
  },

  // SYNC
  async syncData(): Promise<any> {
    const maxRetries = 2;
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await request('/sync', 'GET');
      } catch (error: any) {
        if (attempt === maxRetries || (!error.message?.includes('HTML') && !error.message?.includes('Rate exceeded'))) throw error;
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
    throw new Error('Falha ao sincronizar dados após várias tentativas.');
  },

  // NOTIFICATIONS
  async getNotifications(): Promise<any[]> {
    const maxRetries = 2;
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await request('/user-notifications', 'GET');
      } catch (error: any) {
        if (attempt === maxRetries || !error.message?.includes('HTML')) throw error;
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
    return [];
  },
  async markNotificationRead(id: string): Promise<any> {
    return request(`/user-notifications/${id}`, 'PUT', { isRead: true });
  },
  async deleteNotification(id: string): Promise<void> {
    return request(`/user-notifications/${id}`, 'DELETE');
  },

  // GENERIC METHODS
  async get(endpoint: string): Promise<any> {
    return request(endpoint, 'GET');
  },
  async post(endpoint: string, data: any): Promise<any> {
    return request(endpoint, 'POST', data);
  },
  async put(endpoint: string, data: any): Promise<any> {
    return request(endpoint, 'PUT', data);
  },
  async patch(endpoint: string, data: any): Promise<any> {
    return request(endpoint, 'PATCH', data);
  },
  async delete(endpoint: string): Promise<any> {
    return request(endpoint, 'DELETE');
  }
};
