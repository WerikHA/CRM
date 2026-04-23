import { ProspectLead } from '../../types';

export const scraperService = {
  async scrapeGoogleMaps(nicho: string, cidade: string): Promise<ProspectLead[]> {
    console.log(`[SCRAPER] Iniciando busca Google Maps: ${nicho} em ${cidade}`);
    
    // Simula uma busca real com retorno variado
    return Array.from({ length: 5 }).map((_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: `${nicho} ${cidade} ${i + 1}`,
      source: 'google',
      phone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `contato@${nicho.toLowerCase().replace(/\s/g, '')}${i + 1}.com`,
      category: nicho,
      city: cidade,
      status: 'novo',
      tags: ['google-maps', 'alta-conversao'],
      createdAt: new Date().toLocaleDateString('pt-BR')
    }));
  },

  async scrapeInstagram(keyword: string): Promise<ProspectLead[]> {
    console.log(`[SCRAPER] Iniciando busca Instagram: ${keyword}`);
    
    return Array.from({ length: 5 }).map((_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: `Empresa ${keyword} ${i + 1}`,
      username: `@${keyword.replace(' ', '_')}_${i + 1}`,
      source: 'instagram',
      phone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
      category: 'instagram',
      city: 'N/A',
      status: 'novo',
      tags: ['instagram', 'influencer'],
      createdAt: new Date().toLocaleDateString('pt-BR')
    }));
  }
};
