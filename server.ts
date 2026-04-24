import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import fs from "fs";
import dotenv from "dotenv";
import { whatsappService } from "./src/services/whatsappService.ts";
import { scraperService } from "./src/services/prospecting/scraper.service.ts";
import { startBackupScheduler } from "./src/services/backupService.ts";
import { startPaymentReminderScheduler, getFinanceConfig, updateFinanceConfig } from "./src/services/paymentReminderService.ts";

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
  connectionTimeoutMillis: 15000, 
});

// Mock database fallback default to true to avoid initial connection hangs
let useFallback = true;
let isDbInitializing = true;
const mockData: any = {
  users: [
    { id: 'u1', name: 'Werik Admin', email: 'admin@agency.com', password: 'admin123', role: 'ADMIN' },
    { id: 'u_main', name: 'Werik User', email: 'werikplaystore@gmail.com', password: 'admin123', role: 'ADMIN' },
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
    { id: 'c1', name: 'Global Fitness', status: 'active', monthly_value: 3500, renewal_date: '10/05/2026', contact_email: 'mkt@globalfitness.com', assigned_designer_id: 'u2', partner_id: 'part1', designer_payout: 450, demand_config: { enabled: true, type: 'art', quantity: 3, frequency: 'weekly' } },
    { id: 'c2', name: 'Eco Vida', status: 'active', monthly_value: 2800, renewal_date: '01/06/2026', contact_email: 'contato@ecovida.org', assigned_designer_id: 'u3', partner_id: 'part2', designer_payout: 380, demand_config: { enabled: true, type: 'video', quantity: 2, frequency: 'weekly' } },
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
  ],
  demand_tasks: [
    { id: 'dem-test-1', client_id: 'c1', type: 'art', quantity: 3, period_start: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), period_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'todo', created_at: new Date().toISOString() },
    { id: 'dem-test-2', client_id: 'c2', type: 'video', quantity: 2, period_start: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), period_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'done', created_at: new Date().toISOString() },
    { id: 'dem-test-3', client_id: 'c1', type: 'art', quantity: 5, period_start: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), period_end: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: 'done', created_at: new Date().toISOString() }
  ]
};

async function initDb(retries = 2) {
  isDbInitializing = true;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log("✅ Conectado ao banco de dados PostgreSQL");
      const initSql = fs.readFileSync(path.join(__dirname, "db", "init.sql"), "utf-8");
      await client.query(initSql);
      
      // Ensure new columns exist for existing databases
      try {
        await client.query("ALTER TABLE art_orders ADD COLUMN IF NOT EXISTS rejection_notes TEXT");
        await client.query("ALTER TABLE art_orders ADD COLUMN IF NOT EXISTS feedback_requested BOOLEAN DEFAULT FALSE");
        await client.query("ALTER TABLE clients ADD COLUMN IF NOT EXISTS demand_config JSONB DEFAULT '{\"enabled\": false, \"type\": \"art\", \"quantity\": 1, \"frequency\": \"weekly\"}'::jsonb");
        await client.query("ALTER TABLE clients ADD COLUMN IF NOT EXISTS branding JSONB");
        
        await client.query(`
          CREATE TABLE IF NOT EXISTS demand_tasks (
            id TEXT PRIMARY KEY,
            client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            period_start TIMESTAMP WITH TIME ZONE NOT NULL,
            period_end TIMESTAMP WITH TIME ZONE NOT NULL,
            status TEXT DEFAULT 'todo',
            title TEXT,
            observations TEXT,
            materials_link TEXT,
            post_date TEXT,
            post_time TEXT,
            editor_id TEXT,
            attachments JSONB DEFAULT '[]',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Migration for new columns if table existed
        await client.query("ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS title TEXT");
        await client.query("ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS observations TEXT");
        await client.query("ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS materials_link TEXT");
        await client.query("ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS post_date TEXT");
        await client.query("ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS post_time TEXT");
        await client.query("ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS editor_id TEXT");
        await client.query("ALTER TABLE demand_tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'");

        await client.query(`
          INSERT INTO users (id, name, email, password, role)
          VALUES ('u_main', 'Werik User', 'werikplaystore@gmail.com', 'admin123', 'ADMIN')
          ON CONFLICT (id) DO NOTHING;
        `);
        
        // Insert sample demands for testing if not exists
        await client.query(`
          INSERT INTO demand_tasks (id, client_id, type, quantity, period_start, period_end, status)
          SELECT 'dem-1', 'c1', 'art', 3, NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 'todo'
          WHERE NOT EXISTS (SELECT 1 FROM demand_tasks WHERE id = 'dem-1');
          
          INSERT INTO demand_tasks (id, client_id, type, quantity, period_start, period_end, status)
          SELECT 'dem-2', 'c2', 'video', 2, NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 'done'
          WHERE NOT EXISTS (SELECT 1 FROM demand_tasks WHERE id = 'dem-2');
        `);
      } catch (err) {
        console.warn("⚠️ Avisos ao atualizar colunas da tabela: ", (err as Error).message);
      }

      client.release();
      console.log("✅ Banco de dados inicializado com sucesso");
      useFallback = false;
      isDbInitializing = false;
      return;
    } catch (err) {
      retries--;
      console.error(`❌ Erro ao conectar ao banco de dados (${2 - retries}/2):`, (err as Error).message);
      if (retries === 0) {
        console.warn("⚠️ Usando fallback em memória...");
        useFallback = true;
        isDbInitializing = false;
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

  // Initialize Database (non-blocking for startup)
  initDb().catch(err => {
    console.error("❌ Fatal error during DB initialization:", err);
    useFallback = true;
  });

  startBackupScheduler();
  
  // Recurring Demands Logic
  async function processDemands() {
    console.log("[DEMANDS] Iniciando processamento de demandas recorrentes...");
    let clients = [];
    try {
      if (useFallback || isDbInitializing) {
        clients = mockData.clients;
      } else {
        clients = (await pool.query("SELECT * FROM clients")).rows;
      }

      const now = new Date();
      for (const client of clients) {
        // Enforce JSON parsing if it's a string from DB
        const config = typeof client.demand_config === 'string' ? JSON.parse(client.demand_config) : client.demand_config;
        if (!config || !config.enabled) continue;

        let periodStart = new Date();
        let periodEnd = new Date();

        if (config.frequency === 'daily') {
          periodStart.setHours(0, 0, 0, 0);
          periodEnd.setHours(23, 59, 59, 999);
        } else if (config.frequency === 'weekly') {
          // Find last Monday
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          periodStart = new Date(now.setDate(diff));
          periodStart.setHours(0, 0, 0, 0);
          
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodStart.getDate() + 6);
          periodEnd.setHours(23, 59, 59, 999);
        } else if (config.frequency === 'monthly') {
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          periodEnd.setHours(23, 59, 59, 999);
        }

        const startStr = periodStart.toISOString();
        const endStr = periodEnd.toISOString();

        // Check if task exists
        let exists = false;
        if (useFallback || isDbInitializing) {
          exists = (mockData.demand_tasks || []).some((t: any) => 
            t.client_id === client.id && t.period_start === startStr
          );
        } else {
          const res = await pool.query(
            "SELECT id FROM demand_tasks WHERE client_id = $1 AND period_start = $2",
            [client.id, startStr]
          );
          exists = res.rows.length > 0;
        }

        if (!exists) {
          const newTask = {
            id: 'dem-' + Math.random().toString(36).substr(2, 9),
            client_id: client.id,
            type: config.type || 'art',
            quantity: config.quantity || 1,
            period_start: startStr,
            period_end: endStr,
            status: 'todo',
            editor_id: config.defaultEditorId || '',
            observations: '',
            attachments: [],
            created_at: new Date()
          };

          if (useFallback || isDbInitializing) {
            if (!mockData.demand_tasks) mockData.demand_tasks = [];
            mockData.demand_tasks.push(newTask);
          } else {
            await pool.query(
              "INSERT INTO demand_tasks (id, client_id, type, quantity, period_start, period_end, status, editor_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
              [newTask.id, newTask.client_id, newTask.type, newTask.quantity, newTask.period_start, newTask.period_end, newTask.status, newTask.editor_id]
            );
          }
          console.log(`[DEMANDS] Nova demanda gerada para ${client.name} (${config.frequency})`);
        }
      }
    } catch (err) {
      console.error("[DEMANDS] Erro ao processar demandas:", err);
    }
  }

  // Run on start and then every hour
  processDemands();
  setInterval(processDemands, 1000 * 60 * 60);

  // Initialize Payment Reminder Scheduler
  startPaymentReminderScheduler(
    async () => {
      if (useFallback || isDbInitializing) return mockData.receivables;
      try {
        return (await pool.query("SELECT * FROM receivables")).rows;
      } catch (err) {
        useFallback = true;
        return mockData.receivables;
      }
    },
    async () => {
      if (useFallback || isDbInitializing) return mockData.clients;
      try {
        return (await pool.query("SELECT * FROM clients")).rows;
      } catch (err) {
        useFallback = true;
        return mockData.clients;
      }
    },
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

  app.post("/api/signup", async (req, res) => {
    let { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    email = email.trim().toLowerCase();
    const id = 'u-' + Math.random().toString(36).substr(2, 9);
    const newUser = { id, name, email, password, role: 'OWNER' };

    try {
      if (useFallback || isDbInitializing) {
        if (mockData.users.find((u: any) => u.email.toLowerCase() === email)) {
          return res.status(400).json({ error: "E-mail já cadastrado" });
        }
        mockData.users.push(newUser);
        const { password: _, ...userWithoutPassword } = newUser;
        return res.json({ success: true, user: userWithoutPassword });
      }

      const check = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      if (check.rows.length > 0) {
        return res.status(400).json({ error: "E-mail já cadastrado" });
      }

      const result = await pool.query(
        "INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, avatar",
        [id, name, email, password, 'OWNER']
      );
      res.json({ success: true, user: result.rows[0] });
    } catch (err) {
      console.error("[AUTH] Erro no signup:", err);
      res.status(500).json({ error: "Erro ao criar conta" });
    }
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
      if (useFallback || isDbInitializing) {
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
      if ((err as any).message?.includes('connect')) {
        useFallback = true;
        const user = mockData.users.find((u: any) => u.email.toLowerCase() === email && u.password === password);
        if (user) {
          console.log(`[AUTH] Login bem-sucedido (Fallback Triggered): ${email}`);
          const { password: _, ...userWithoutPassword } = user;
          return res.json({ success: true, user: userWithoutPassword });
        }
      }
      console.error(`[AUTH] Erro interno no login:`, err);
      res.status(500).json({ error: "Erro interno no servidor de autenticação" });
    }
  });

  // GENERATE GENERIC CRUD ROUTES
  const setupCrud = (pathName: string, tableName: string, mockArrayName: keyof typeof mockData) => {
    // GET
    app.get(`/api/${pathName}`, async (req, res) => {
      try {
        if (useFallback || isDbInitializing) return res.json(mockData[mockArrayName]);
        const result = await pool.query(`SELECT * FROM ${tableName}`);
        res.json(result.rows);
      } catch (err) {
        // Automatically switch to fallback if query fails due to connection
        if ((err as any).message?.includes('connect')) {
           useFallback = true;
           return res.json(mockData[mockArrayName]);
        }
        res.status(500).json({ error: (err as Error).message });
      }
    });

    // POST
    app.post(`/api/${pathName}`, async (req, res) => {
      try {
        const item = req.body;
        if (useFallback || isDbInitializing) {
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
        if ((err as any).message?.includes('connect')) {
          useFallback = true;
          const item = req.body;
          const newItem = { ...item, created_at: new Date() };
          (mockData[mockArrayName] as any[]).push(newItem);
          return res.json(newItem);
        }
        res.status(500).json({ error: (err as Error).message });
      }
    });

    // PUT
    app.put(`/api/${pathName}/:id`, async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        if (useFallback || isDbInitializing) {
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
        if ((err as any).message?.includes('connect')) {
          useFallback = true;
          const { id } = req.params;
          const updates = req.body;
          const arr = mockData[mockArrayName] as any[];
          const index = arr.findIndex((item: any) => item.id === id);
          if (index > -1) {
            arr[index] = { ...arr[index], ...updates };
            return res.json(arr[index]);
          }
        }
        res.status(500).json({ error: (err as Error).message });
      }
    });

    // DELETE
    app.delete(`/api/${pathName}/:id`, async (req, res) => {
      try {
        const { id } = req.params;
        if (useFallback || isDbInitializing) {
          const arr = mockData[mockArrayName] as any[];
          mockData[mockArrayName] = arr.filter((item: any) => item.id !== id) as any;
          return res.json({ success: true });
        }
        await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
        res.json({ success: true });
      } catch (err) {
        if ((err as any).message?.includes('connect')) {
          useFallback = true;
          const { id } = req.params;
          const arr = mockData[mockArrayName] as any[];
          mockData[mockArrayName] = arr.filter((item: any) => item.id !== id) as any;
          return res.json({ success: true });
        }
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
  app.put("/api/demand-tasks/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
      let updatedTask;
      if (useFallback) {
        const idx = mockData.demand_tasks.findIndex((t: any) => t.id === id);
        if (idx === -1) return res.status(404).json({ error: "Task not found" });
        updatedTask = { ...mockData.demand_tasks[idx], ...updates };
        mockData.demand_tasks[idx] = updatedTask;
      } else {
        const keys = Object.keys(updates);
        const values = Object.values(updates);
        const setStmt = keys.map((k, i) => `${k.replace(/[A-Z]/g, (m: any) => `_${m.toLowerCase()}`)} = $${i + 1}`).join(', ');
        const result = await pool.query(
          `UPDATE demand_tasks SET ${setStmt} WHERE id = $${keys.length + 1} RETURNING *`,
          [...values, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Task not found" });
        updatedTask = result.rows[0];
      }

      // Special logic: if status set to 'done' and type is 'recording', create a video order
      if (updates.status === 'done' && updatedTask.type === 'recording') {
        const clientRes = useFallback ? 
          { rows: [mockData.clients.find((c: any) => c.id === updatedTask.client_id)] } : 
          await pool.query("SELECT * FROM clients WHERE id = $1", [updatedTask.client_id]);
        
        const client = clientRes.rows[0];
        
        // Calculate deadline: 12 hours before postTime on postDate
        let deadlineStr = 'Imediato';
        if (updatedTask.post_date) {
            try {
                const [year, month, day] = updatedTask.post_date.split('-').map(Number);
                const [hour, minute] = (updatedTask.post_time || '00:00').split(':').map(Number);
                
                const postDateObj = new Date(year, month - 1, day, hour, minute);
                const deadlineObj = new Date(postDateObj.getTime() - (12 * 60 * 60 * 1000));
                
                deadlineStr = `${deadlineObj.getDate().toString().padStart(2, '0')}/${(deadlineObj.getMonth() + 1).toString().padStart(2, '0')}/${deadlineObj.getFullYear()} às ${deadlineObj.getHours().toString().padStart(2, '0')}:${deadlineObj.getMinutes().toString().padStart(2, '0')}`;
            } catch (e) {
                deadlineStr = updatedTask.post_date;
            }
        }

        const newVideoOrder = {
          id: 'v-' + Math.random().toString(36).substr(2, 9),
          title: `Edição: ${updatedTask.title || updatedTask.observations || 'Sem título'}`,
          client_id: updatedTask.client_id,
          editor_id: updatedTask.editor_id || client.demand_config?.defaultEditorId || '',
          editor_name: '', // Will be resolved by client if needed
          deadline: deadlineStr,
          priority: 'high',
          progress: 0,
          status: 'queue'
        };

        if (useFallback) {
          mockData.video_orders.push(newVideoOrder);
        } else {
          await pool.query(
            "INSERT INTO video_orders (id, title, client_id, editor_id, deadline, priority, progress, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [newVideoOrder.id, newVideoOrder.title, newVideoOrder.client_id, newVideoOrder.editor_id, newVideoOrder.deadline, newVideoOrder.priority, newVideoOrder.progress, newVideoOrder.status]
          );
        }
        console.log(`[DEMANDS] Video order created automatically for Recording Demand ${id}`);
      }

      res.json(updatedTask);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  setupCrud("demand-tasks", "demand_tasks", "demand_tasks");

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
        const feedbackRequested = newStatus === 'rejected';
        // When rejected, approval_status stays pending until the link is filled, 
        // but we need to track that the link was sent.
        // Actually, the user wants: "status only changes to rejected when they fill the link".
        // So here we just set feedback_requested = true and keep approvalStatus = pending.
        
        if (useFallback || isDbInitializing) {
          const order = mockData.art_orders.find((o: any) => o.id === orderId);
          if (order) {
            if (newStatus === 'approved') {
              order.approval_status = 'approved';
              order.status = 'done';
              order.feedback_requested = false;
            } else {
              order.feedback_requested = true;
              order.approval_status = 'pending'; // Keep pending until link is filled
            }
          }
        } else {
          if (newStatus === 'approved') {
            await pool.query(
              "UPDATE art_orders SET approval_status = 'approved', status = 'done', feedback_requested = false WHERE id = $1",
              [orderId]
            );
          } else {
            await pool.query(
              "UPDATE art_orders SET feedback_requested = true, approval_status = 'pending' WHERE id = $1",
              [orderId]
            );
          }
        }
        console.log(`[CRM] Arte ${orderId} atualizada. Status: ${newStatus}`);
        
        // Optionally send a confirmation back to the user
        let responseMsg = '';
        if (newStatus === 'approved') {
          responseMsg = '✅ Muito obrigado pela aprovação! Já vamos finalizar o processo.';
        } else {
          // GENERATE THE LINK AUTOMATICALLY
          let appUrl = process.env.APP_URL || 'https://agencyflow.app';
          // Ensure it doesn't end with a slash for consistent construction
          appUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
          
          const link = `${appUrl}/?refuseOrderId=${orderId}`;
          responseMsg = `📝 Entendido! Para que possamos fazer os ajustes exatamente como você deseja, por favor preencha este rápido formulário:\n\n${link}\n\nAguardamos seu feedback!`;
        }
        
        console.log(`[CRM] Enviando resposta automática via WhatsApp para ${phone}: ${newStatus}`);
        await whatsappService.sendMessage(phone, responseMsg);
        console.log(`[CRM] Mensagem enviada com sucesso para ${phone}`);
      } catch (err) {
        console.error('[CRM] Erro ao atualizar status via WhatsApp:', err);
      }
    } else {
      console.warn(`[CRM] Voto recebido mas ignorado: Status=${newStatus}, OrderId=${orderId}`);
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
