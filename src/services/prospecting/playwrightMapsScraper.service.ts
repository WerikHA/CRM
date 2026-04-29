import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';

// Cast chromium to any to bypass type conflicts during build if necessary
const chromiumExtra = (chromium as any).use(stealth());

export const playwrightMapsScraper = {
  async scrapeGoogleMaps(nicho: string, cidade: string): Promise<any[]> {
    console.log(`[SCRAPER] Realizando busca (Playwright + Stealth): ${nicho} em ${cidade}`);
    const userAgent = new UserAgent();

    const browser = await chromiumExtra.launch({ 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    const context = await browser.newContext({
      userAgent: userAgent.toString(),
      viewport: { width: 1280, height: 800 },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    
    const page = await context.newPage();
    
    try {
      // Set extra headers to look more like a browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      });

      const query = encodeURIComponent(`${nicho} em ${cidade}`);
      const url = `https://www.google.com/maps/search/${query}`;
      
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000); // Wait longer for initial load
      
      console.log(`[SCRAPER] URL atual após navegação: ${page.url()}`);

      // Check if redirected to login
      if (page.url().includes('accounts.google.com')) {
        throw new Error('Sessão expirada ou inválida. Por favor, faça login novamente.');
      }

      // Sidebar selector
      const sidebarSelector = 'div[role="feed"]';
      
      // Wait for the feed to appear
      await page.waitForSelector(sidebarSelector, { timeout: 10000 });
      
      // Infinite scroll logic
      async function scrollSidebar() {
        const sidebar = page.locator(sidebarSelector);
        let lastHeight = await sidebar.evaluate(el => el.scrollHeight);
        
        while (true) {
          await sidebar.evaluate(el => el.scrollTo(0, el.scrollHeight));
          await page.waitForTimeout(2000 + Math.random() * 1000); // Random delay
          let newHeight = await sidebar.evaluate(el => el.scrollHeight);
          if (newHeight === lastHeight) break; // Parar se não carregar mais nada
          lastHeight = newHeight;
        }
      }

      await scrollSidebar();
      
      // Extract results
      const results = await page.evaluate(() => {
        const container = document.querySelector('div[role="feed"]');
        if (!container) return [];
        const items = Array.from(container.querySelectorAll('a[href*="/maps/place/"]'));
        return items.map(item => ({
            name: item.getAttribute('aria-label'),
            url: item.getAttribute('href')
        })).filter((value, index, self) =>
            index === self.findIndex((t) => t.url === value.url)
        );
      });

      console.log(`[SCRAPER] Encontrados ${results.length} itens.`);
      
      await browser.close();
      return results;
    } catch (error) {
      console.error('[SCRAPER ERROR]', error);
      await browser.close();
      throw error; // Propagate error
    }
  }
};
