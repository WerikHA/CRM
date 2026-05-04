import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ProspectLead } from '../../types.ts';

export const scraperService = {
  async scrapeGoogleMaps(nicho: string, cidade: string): Promise<ProspectLead[]> {
    console.log(`[SCRAPER] Realizando busca (Tradicional): ${nicho} em ${cidade}`);
    
    try {
      const query = encodeURIComponent(`${nicho} em ${cidade}`);
      const url = `https://html.duckduckgo.com/html/?q=${query}`;
      
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const $ = cheerio.load(data);
      const leads: ProspectLead[] = [];

      $('.result').each((i, el) => {
        if (i >= 10) return;
        
        const title = $(el).find('.result__title').text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();
        const link = $(el).find('.result__url').text().trim();

        const phoneMatch = snippet.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
        const emailMatch = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        leads.push({
          id: Math.random().toString(36).substr(2, 9),
          name: title,
          source: 'google',
          phone: phoneMatch ? phoneMatch[0] : 'Consultar no site',
          email: emailMatch ? emailMatch[0] : '',
          category: nicho,
          city: cidade,
          site: link,
          status: 'novo',
          tags: ['search-engine'],
          createdAt: new Date().toLocaleDateString('pt-BR')
        });
      });

      return leads;
    } catch (error) {
      console.error('[SCRAPER ERROR]', error);
      return [];
    }
  },

  async scrapeInstagram(keyword: string): Promise<ProspectLead[]> {
    console.log(`[SCRAPER] Realizando busca Instagram (Tradicional): ${keyword}`);
    
    try {
      const query = encodeURIComponent(`site:instagram.com "${keyword}"`);
      const url = `https://html.duckduckgo.com/html/?q=${query}`;
      
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const $ = cheerio.load(data);
      const leads: ProspectLead[] = [];

      $('.result').each((i, el) => {
        if (i >= 10) return;
        
        const title = $(el).find('.result__title').text().trim();
        
        const usernameMatch = title.match(/@(\w+)/) || title.match(/instagram\.com\/(\w+)/);

        leads.push({
          id: Math.random().toString(36).substr(2, 9),
          name: title.split('|')[0].trim(),
          username: usernameMatch ? `@${usernameMatch[1]}` : '',
          source: 'instagram',
          phone: '',
          category: 'instagram',
          city: 'N/A',
          status: 'novo',
          tags: ['social-search'],
          createdAt: new Date().toLocaleDateString('pt-BR')
        });
      });

      return leads;
    } catch (error) {
      console.error('[SCRAPER ERROR]', error);
      return [];
    }
  }
};
