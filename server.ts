import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import fs from "fs";
import dotenv from "dotenv";
import { whatsappService } from "./src/services/whatsappService";
import { scraperService } from "./src/services/prospecting/scraper.service";
import { startBackupScheduler } from "./src/services/backupService";
import { startPaymentReminderScheduler, getFinanceConfig, updateFinanceConfig } from "./src/services/paymentReminderService";

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// --- WHATSAPP INTEGRATION ---
// Integrado via src/services/whatsappService.ts
// --- FIM WHATSAPP INTEGRATION ---

// Database Pool Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://agency_admin:agency_secure_password@45.167.187.80:5432/agencyflow_db",
  connectionTimeoutMillis: 10000, // Increased timeout for external server
});

// Mock database fallback for environments without Postgres (like AI Studio preview)
let useFallback = false;
const mockData: any = {
  users: [
    { id: 'u1', name: 'Werik Admin', email: 'admin@agency.com', password: 'admin123', role: 'ADMIN' },
    { id: 'u2', name: 'Lucas Andrade', email: 'lucas@design.com', password: 'design123', role: 'DESIGNER' },
    { id: 'u3', name: 'Mariana Costa', email: 'mariana@design.com', password: 'design123', role: 'DESIGNER' },
    { id: 'u4', name: 'Roberto Financeiro', email: 'finance@agency.com', password: 'finance123', role: 'ADMIN' },
    { id: 'u5', name: 'Agência Video Pro', email: 'parceiro@videopro.com', password: 'partner123', role: 'PARTNER' },
    { id: 'u6', name: 'Fernanda Lima', email: 'fernanda@design.com', password: 'design123', role: 'DESIGNER' },
    { id: 'u7', name: 'Eduardo Santos', email: 'edu@design.com', password: 'design123', role: 'DESIGNER' }
  ],
  partners: [
    { id: 'part1', name: 'Rodrigo Maker', agency_name: 'Video Maker Pro', email: 'rodrigo@maker.com', commission_type: 'fixed', commission_value: 500 },
    { id: 'part2', name: 'Juliana Tráfego', agency_name: 'Ads Experts', email: 'juliana@ads.com', commission_type: 'percentage', commission_value: 10 },
    { id: 'part3', name: 'Marcos Dev', agency_name: 'Code Hub', email: 'marcos@codehub.com', commission_type: 'percentage', commission_value: 15 }
  ],
  clients: [
    { id: 'c1', name: 'Global Fitness', status: 'active', monthly_value: 3500, renewal_date: '10/05/2026', contact_email: 'mkt@globalfitness.com', assigned_designer_id: 'u2', partner_id: 'part1', designer_payout: 450 },
    { id: 'c2', name: 'Eco Vida', status: 'active', monthly_value: 2800, renewal_date: '01/06/2026', contact_email: 'contato@ecovida.org', assigned_designer_id: 'u3', partner_id: 'part2', designer_payout: 380 },
    { id: 'c3', name: 'Hotel Paradiso', status: 'active', monthly_value: 4200, renewal_date: '15/05/2026', contact_email: 'reservas@paradiso.com', assigned_designer_id: 'u6', partner_id: 'part1', designer_payout: 600 },
    { id: 'c4', name: 'Boutique Glamour', status: 'active', monthly_value: 2200, renewal_date: '20/05/2026', contact_email: 'vendas@glamour.com', assigned_designer_id: 'u7', partner_id: null, designer_payout: 300 },
    { id: 'c5', name: 'Sacolão do Bairro', status: 'paused', monthly_value: 1500, renewal_date: '05/06/2026', contact_email: 'contato@sacolao.com', assigned_designer_id: 'u2', partner_id: null, designer_payout: 200 }
  ],
  leads: [
    { id: 'l1', company: 'TechFlow Solutions', contact_name: 'Ana Silva', email: 'ana@techflow.com', status: 'negotiation', estimated_value: 5000, last_contact: '15/04/2026' },
    { id: 'l2', company: 'Padaria Central', contact_name: 'João Santos', email: 'joao@padaria.com', status: 'prospect', estimated_value: 1200, last_contact: '18/04/2026' },
    { id: 'l3', company: 'Academia Muscle', contact_name: 'Carlos Perez', email: 'carlos@muscle.com', status: 'converted', estimated_value: 3000, last_contact: '20/04/2026' },
    { id: 'l4', company: 'Clínica Sorriso', contact_name: 'Beatriz Oliveira', email: 'beatriz@sorriso.com', status: 'negotiation', estimated_value: 4500, last_contact: '22/04/2026' },
    { id: 'l5', company: 'Restaurante Sabor', contact_name: 'Henrique Lima', email: 'henrique@sabor.com', status: 'prospect', estimated_value: 2500, last_contact: '23/04/2026' },
    { id: 'l6', company: 'Loja Moda Fit', contact_name: 'Sílvia Reis', email: 'silvia@modafit.com', status: 'lost', estimated_value: 1800, last_contact: '10/04/2026' }
  ],
  art_orders: [
    { id: 'a1', title: 'Post Instagram - Promoção Maio', client_id: 'c1', designer_id: 'u2', deadline: '22/04/2026', priority: 'high', progress: 65, status: 'production', approval_status: 'pending' },
    { id: 'a2', title: 'Banner Site - Verão', client_id: 'c2', designer_id: 'u3', deadline: '25/04/2026', priority: 'medium', progress: 20, status: 'queue', approval_status: 'pending' },
    { id: 'a3', title: 'Logo Refresh', client_id: 'c1', designer_id: 'u2', deadline: '30/04/2026', priority: 'low', progress: 100, status: 'done', approval_status: 'approved' },
    { id: 'a4', title: 'Vídeo Reels Semanal', client_id: 'c3', designer_id: 'u6', deadline: '24/04/2026', priority: 'high', progress: 90, status: 'review', approval_status: 'pending' },
    { id: 'a5', title: 'Artes Stories Dia das Mães', client_id: 'c1', designer_id: 'u2', deadline: '05/05/2026', priority: 'high', progress: 10, status: 'queue', approval_status: 'pending' },
    { id: 'a6', title: 'Identidade Visual Café', client_id: 'c4', designer_id: 'u7', deadline: '15/05/2026', priority: 'medium', progress: 45, status: 'production', approval_status: 'pending' },
    { id: 'a7', title: 'Cardápio Digital QR', client_id: 'c5', designer_id: 'u2', deadline: '10/04/2026', priority: 'low', progress: 100, status: 'done', approval_status: 'approved' }
  ],
  receivables: [
    { id: 'r1', client_id: 'c1', description: 'Mensalidade Abril', amount: 3500, due_date: '25/04/2026', status: 'pending', designer_id: 'u2', payout_amount: 450 },
    { id: 'r2', client_id: 'c2', description: 'Campanha Orgânica', amount: 1500, due_date: '10/04/2026', status: 'paid', designer_id: 'u3', payout_amount: 380 },
    { id: 'r4', client_id: 'c3', description: 'Mensalidade Abril', amount: 4200, due_date: '20/04/2026', status: 'paid', designer_id: 'u6', payout_amount: 600 },
    { id: 'r5', client_id: 'c4', description: 'Lançamento Coleção', amount: 2200, due_date: '28/04/2026', status: 'pending', designer_id: 'u7', payout_amount: 300 }
  ],
  partner_requests: [
    { id: 'pr1', partner_id: 'part1', partner_name: 'Rodrigo Maker', service_type: 'Video Editing', client_name: 'Global Fitness', cost: 500, status: 'pending', related_order_id: 'a1' },
    { id: 'pr2', partner_id: 'part2', partner_name: 'Juliana Tráfego', service_type: 'Media Buying', client_name: 'Eco Vida', cost: 300, status: 'completed', related_order_id: null },
    { id: 'pr3', partner_id: 'part3', partner_name: 'Marcos Dev', service_type: 'LP Development', client_name: 'Hotel Paradiso', cost: 1200, status: 'pending', related_order_id: 'a4' }
  ],
  support_tickets: [
    { id: 't1', partner_id: 'u5', subject: 'Erro no Upload de Arquivo', description: 'Não consigo subir o vídeo de 50MB no sistema.', status: 'open', created_at: '21/04/2026 14:30' },
    { id: 't2', partner_id: 'u5', subject: 'Dúvida sobre Pagamento', description: 'O valor da comissão de Março veio diferente do esperado.', status: 'replied', created_at: '15/04/2026 09:15' },
    { id: 't3', partner_id: 'u2', subject: 'Sugestão de Feature', description: 'Seria legal ter um modo escuro no dashboard.', status: 'closed', created_at: '10/04/2026 18:00' }
  ],
  video_orders: [
    { id: 'v1', title: 'Edição Workshop Fit', client_id: 'c1', editor_id: 'u5', deadline: '28/04/2026', priority: 'high', progress: 30, status: 'production' },
    { id: 'v2', title: 'Motion Graphics Logo', client_id: 'c3', editor_id: 'u5', deadline: '02/05/2026', priority: 'medium', progress: 0, status: 'queue' }
  ]
};

async function initDb(retries = 2) {
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log("✅ Conectado ao banco de dados PostgreSQL");
      const initSql = fs.readFileSync(path.join(__dirname, "db", "init.sql"), "utf-8");
      await client.query(initSql);
      client.release();
      console.log("✅ Banco de dados inicializado com sucesso");
      return;
    } catch (err) {
      retries--;
      console.error(`❌ Erro ao conectar ao banco de dados (${2 - retries}/2):`, (err as Error).message);
      if (retries === 0) {
        console.warn("⚠️ Usando fallback em memória para desenvolvimento...");
        useFallback = true;
      } else {
        console.log("Retentando em 2 segundos...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Database
  await initDb();

  startBackupScheduler();
  
  // Initialize Payment Reminder Scheduler
  startPaymentReminderScheduler(
    async () => (await pool.query("SELECT * FROM receivables")).rows,
    async () => (await pool.query("SELECT * FROM clients")).rows,
    async (phone: string, message: string) => {
        return whatsappService.sendMessage(phone, message);
    }
  );

  // --- API ROUTES ---
  app.get("/api/finance/config", (req, res) => res.json(getFinanceConfig()));
  app.post("/api/finance/config", (req, res) => {
      updateFinanceConfig(req.body);
      res.json({ success: true });
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "AgencyFlow API is active" });
  });

  // Authentication
  app.post("/api/login", async (req, res) => {
    let { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    }
    
    email = email.trim().toLowerCase();
    password = password.trim();
    
    console.log(`[AUTH] Tentativa de login para: ${email}`);
    
    try {
      if (useFallback) {
        const user = mockData.users.find((u: any) => u.email.toLowerCase() === email && u.password === password);
        if (user) {
          console.log(`[AUTH] Login bem-sucedido (Fallback): ${email}`);
          const { password: _, ...userWithoutPassword } = user;
          return res.json({ success: true, user: userWithoutPassword });
        }
        console.log(`[AUTH] Falha no login (Fallback): ${email}`);
        return res.status(401).json({ error: "E-mail ou senha incorretos" });
      }
      const result = await pool.query("SELECT id, name, email, role, avatar FROM users WHERE LOWER(email) = $1 AND password = $2", [email, password]);
      if (result.rows.length > 0) {
        console.log(`[AUTH] Login bem-sucedido (DB): ${email}`);
        res.json({ success: true, user: result.rows[0] });
      } else {
        console.log(`[AUTH] Falha no login (DB): ${email}`);
        res.status(401).json({ error: "E-mail ou senha incorretos" });
      }
    } catch (err) {
      console.error(`[AUTH] Erro interno no login:`, err);
      res.status(500).json({ error: "Erro interno no servidor de autenticação" });
    }
  });

  // GENERATE GENERIC CRUD ROUTES
  const setupCrud = (pathName: string, tableName: string, mockArrayName: keyof typeof mockData) => {
    // GET
    app.get(`/api/${pathName}`, async (req, res) => {
      try {
        if (useFallback) return res.json(mockData[mockArrayName]);
        const result = await pool.query(`SELECT * FROM ${tableName}`);
        res.json(result.rows);
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

    // POST
    app.post(`/api/${pathName}`, async (req, res) => {
      try {
        const item = req.body;
        if (useFallback) {
          const newItem = { ...item, created_at: new Date() };
          (mockData[mockArrayName] as any[]).push(newItem);
          return res.json(newItem);
        }
        const keys = Object.keys(item);
        const values = Object.values(item);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
        const result = await pool.query(
          `INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`,
          values
        );
        res.json(result.rows[0]);
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

    // PUT
    app.put(`/api/${pathName}/:id`, async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        if (useFallback) {
          const arr = mockData[mockArrayName] as any[];
          const index = arr.findIndex((item: any) => item.id === id);
          if (index > -1) {
            arr[index] = { ...arr[index], ...updates };
            return res.json(arr[index]);
          }
          return res.status(404).json({ error: "Not found" });
        }
        const keys = Object.keys(updates);
        const values = Object.values(updates);
        const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
        const result = await pool.query(
          `UPDATE ${tableName} SET ${setString} WHERE id = $${keys.length + 1} RETURNING *`,
          [...values, id]
        );
        res.json(result.rows[0]);
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

    // DELETE
    app.delete(`/api/${pathName}/:id`, async (req, res) => {
      try {
        const { id } = req.params;
        if (useFallback) {
          const arr = mockData[mockArrayName] as any[];
          mockData[mockArrayName] = arr.filter((item: any) => item.id !== id) as any;
          return res.json({ success: true });
        }
        await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
        console.log(`[DEBUG] Executed DELETE FROM ${tableName} WHERE id = ${id}`);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });
  };

  setupCrud("leads", "leads", "leads");
  setupCrud("clients", "clients", "clients");
  setupCrud("receivables", "receivables", "receivables");
  setupCrud("art-orders", "art_orders", "art_orders");
  setupCrud("partners", "partners", "partners");
  setupCrud("partner-requests", "partner_requests", "partner_requests");
  setupCrud("support-tickets", "support_tickets", "support_tickets");
  setupCrud("video-orders", "video_orders", "video_orders");
  setupCrud("users", "users", "users");

  // --- PROSPECTING ROUTES ---
  app.post("/api/prospecting/scrape", async (req, res) => {
    const { source, query, location } = req.body;
    try {
      let leads = [];
      if (source === 'google') {
          leads = await scraperService.scrapeGoogleMaps(query, location);
      } else if (source === 'instagram') {
          leads = await scraperService.scrapeInstagram(query);
      }
      res.json({ success: true, leads });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- WHATSAPP ROUTES ---
  app.get("/api/whatsapp/status", (req, res) => {
    res.json(whatsappService.getStatus());
  });

  app.get("/api/whatsapp/logs", (req, res) => {
    try {
      const logPath = path.join(process.cwd(), "whatsapp_interaction_logs.txt");
      if (fs.existsSync(logPath)) {
        const logs = fs.readFileSync(logPath, "utf-8");
        res.send(logs);
      } else {
        res.send("Sem logs registrados ainda.");
      }
    } catch (err) {
      res.status(500).send("Erro ao ler logs");
    }
  });

  app.get("/api/n8n/logs", (req, res) => {
    try {
      const logPath = path.join(process.cwd(), "n8n_interaction_logs.txt");
      if (fs.existsSync(logPath)) {
        const logs = fs.readFileSync(logPath, "utf-8");
        res.send(logs);
      } else {
        res.send("Sem logs registrados ainda.");
      }
    } catch (err) {
      res.status(500).send("Erro ao ler logs do n8n");
    }
  });

  app.post("/api/whatsapp/logout", async (req, res) => {
    await whatsappService.logout();
    res.json({ success: true });
  });

  app.post("/api/whatsapp/send", async (req, res) => {
    const { phone, message, poll, mediaBase64 } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios.' });
    }
    
    try {
      // Send the text message first
      const sendResult = await whatsappService.sendMessage(phone, message, mediaBase64);
      
      // If a poll is provided, send it right after the text message
      if (poll && poll.name && poll.options) {
        await whatsappService.sendPoll(phone, poll.name, poll.options, poll.orderId);
      }
      
      res.json({ success: true, messageId: sendResult?.key?.id });
    } catch (err: any) {
      console.error('[WHATSAPP] Erro ao enviar:', err);
      res.status(500).json({ error: 'Erro ao enviar mensagem', detail: err.message });
    }
  });

  whatsappService.on('pollVote', async ({ orderId, option, phone }) => {
    console.log(`[CRM] Recebido voto para a arte ${orderId}: ${option}`);
    let newStatus = '';
    
    if (option.includes('Aprovar')) {
      newStatus = 'approved';
    } else if (option.includes('Ajustes')) {
      newStatus = 'rejected';
    }

    if (newStatus && orderId) {
      try {
        if (useFallback) {
          const order = mockData.art_orders.find((o: any) => o.id === orderId);
          if (order) {
            order.approval_status = newStatus;
            order.status = newStatus === 'approved' ? 'done' : 'production';
          }
        } else {
          await pool.query(
            "UPDATE art_orders SET approval_status = $1, status = $2 WHERE id = $3",
            [newStatus, newStatus === 'approved' ? 'done' : 'production', orderId]
          );
        }
        console.log(`[CRM] Arte ${orderId} atualizada para ${newStatus}`);
        
        // Optionally send a confirmation back to the user
        const responseMsg = newStatus === 'approved' 
          ? '✅ Muito obrigado pela aprovação! Já vamos finalizar o processo.'
          : '📝 Entendido! Nossa equipe entrará em contato para entender os ajustes necessários.';
        
        await whatsappService.sendMessage(phone, responseMsg);
      } catch (err) {
        console.error('[CRM] Erro ao atualizar status via WhatsApp:', err);
      }
    }
  });
  // --- FIM WHATSAPP ROUTES ---

  // Generic Integration Webhook Trigger
  app.post("/api/integrations/:id/trigger", async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    console.log(`[INTEGRATION] Acionando webhook ${id} com payload:`, payload);
    
    // In a real scenario, fetch webhookUrl from DB/config and POST to it
    // For now, simulate success
    res.json({ success: true, message: `Trigger ${id} executado.` });
  });

  // API routes and middleware setup...

  // Middleware to catch 404s for API and log them
  app.use("/api", (req, res, next) => {
    console.warn(`[SERVER] 404 no endpoint da API: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Rota da API não encontrada: ${req.originalUrl}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 AgencyFlow rodando em http://localhost:${PORT}`);
  });
}

startServer();
