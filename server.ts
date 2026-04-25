import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { whatsappService } from "./src/services/whatsappService.ts";
import { scraperService } from "./src/services/prospecting/scraper.service.ts";
import { startBackupScheduler } from "./src/services/backupService.ts";
import { startPaymentReminderScheduler, getFinanceConfig, updateFinanceConfig } from "./src/services/paymentReminderService.ts";
import { supabase } from "./src/lib/supabaseClient.ts";

import { dbService, DbContext, UserRole } from "./src/services/dbService.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // --- Middleware for typed user context ---
  const getContext = (req: express.Request): DbContext | undefined => {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as UserRole;
    
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return { userId, userRole };
    }
    return undefined;
  };

  // --- Improved CRUD helper ---
  const supabaseCrud = (pathName: string, tableName: string) => {
    app.get(`/api/${pathName}`, async (req, res) => {
      try {
        const data = await dbService.list(tableName, getContext(req));
        res.json(data);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.post(`/api/${pathName}`, async (req, res) => {
      try {
        const data = await dbService.insert(tableName, req.body, getContext(req));
        res.json(data);
      } catch (error: any) {
        console.error(`[API] Erro ao criar em ${tableName}:`, error);
        res.status(500).json({ error: error.message });
      }
    });

    app.put(`/api/${pathName}/:id`, async (req, res) => {
      try {
        const data = await dbService.update(tableName, req.params.id, req.body, getContext(req));
        res.json(data);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete(`/api/${pathName}/:id`, async (req, res) => {
      try {
        const result = await dbService.delete(tableName, req.params.id, getContext(req));
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  };

  // --- Initialize Database (formerly PostgreSQL) ---
  
  // Recurring Demands Logic
  async function processDemands() {
    console.log("[DEMANDS] Iniciando processamento de demandas recorrentes...");
    try {
      const { data: clients, error } = await supabase.from('clients').select('*');
      if (error) throw error;
      
      const now = new Date();
      for (const client of (clients || [])) {
        const config = typeof client.demand_config === 'string' ? JSON.parse(client.demand_config) : client.demand_config;
        if (!config || !config.enabled) continue;

        let periodStart = new Date();
        let periodEnd = new Date();

        if (config.frequency === 'daily') {
          periodStart.setHours(0, 0, 0, 0);
          periodEnd.setHours(23, 59, 59, 999);
        } else if (config.frequency === 'weekly') {
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

        const { data: existingTasks } = await supabase
          .from('demand_tasks')
          .select('id')
          .eq('client_id', client.id)
          .eq('period_start', startStr);

        if (!existingTasks || existingTasks.length < (config.quantity || 1)) {
          const tasksToCreate = (config.type === 'recording') ? (config.quantity || 1) - (existingTasks?.length || 0) : (existingTasks?.length === 0 ? 1 : 0);
          
          for (let i = 0; i < tasksToCreate; i++) {
            const taskIndex = (existingTasks?.length || 0) + i + 1;
            const newTask = {
              client_id: client.id,
              type: config.type || 'art',
              title: config.type === 'recording' ? `Gravação ${taskIndex}` : null,
              quantity: config.type === 'recording' ? 1 : (config.quantity || 1),
              period_start: startStr,
              period_end: periodEnd.toISOString(),
              status: 'todo',
              editor_id: config.default_editor_id || config.defaultEditorId || null,
              created_at: new Date().toISOString()
            };

            await supabase.from('demand_tasks').insert(newTask);
            console.log(`[DEMANDS] Nova demanda gerada para ${client.name}: ${newTask.title || config.type} (${config.frequency})`);
          }
        }
      }
    } catch (err) {
      console.error("[DEMANDS] Erro ao processar demandas:", err);
    }
  }

  // --- Helper to handle Supabase DB errors ---
  const handleSupabaseError = (error: any, res: any) => {
    console.error("[SUPABASE ERROR]", error);
    res.status(500).json({ error: error.message });
  };

  // --- CUSTOM DASHBOARD/DEMANDS SPECIFIC ROUTES ---
  // Must come before supabaseCrud to take precedence
  app.post("/api/demand-tasks", async (req, res) => {
    try {
      const data = await dbService.insert('demand_tasks', req.body, getContext(req));
      res.json(data);
    } catch (err: any) {
      console.error("[DEMANDS] Erro ao criar demanda:", err);
      res.status(500).json({ error: `Erro no banco de dados: ${err.message}` });
    }
  });

  app.put("/api/demand-tasks/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    try {
      const updatedTask = await dbService.update('demand_tasks', id, updates, getContext(req));

      // Special logic: if status set to 'done' and type is 'recording', create a video order
      if (updates.status === 'done' && updatedTask && updatedTask.type === 'recording') {
        const client = await dbService.list('clients', getContext(req)).then(list => list.find((c: any) => c.id === updatedTask.clientId));
        
        if (client) {
          const newVideoOrder = {
            title: `Edição: ${updatedTask.title || updatedTask.observations || 'Sem título'}`,
            clientId: updatedTask.clientId,
            editorId: updatedTask.editorId || client.demandConfig?.defaultEditorId || '',
            deadline: updatedTask.postDate || 'Imediato',
            priority: 'high',
            progress: 0,
            status: 'queue'
          };

          await dbService.insert('video_orders', newVideoOrder, getContext(req));
          console.log(`[DEMANDS] Video order created automatically for Recording Demand ${id}`);
        }
      }

      res.json(updatedTask);
    } catch (err: any) {
      console.error("[DEMANDS] Erro ao atualizar demanda:", err);
      res.status(500).json({ error: `Erro ao salvar demanda: ${err.message}` });
    }
  });

  // --- API ROUTES ---
  supabaseCrud("leads", "leads");
  supabaseCrud("clients", "clients");
  supabaseCrud("receivables", "receivables");
  supabaseCrud("art-orders", "art_orders");
  supabaseCrud("partners", "partners");
  supabaseCrud("partner-requests", "partner_requests");
  supabaseCrud("support-tickets", "support_tickets");
  supabaseCrud("video-orders", "video_orders");
  supabaseCrud("demand-tasks", "demand_tasks");
  supabaseCrud("users", "users");
  supabaseCrud("notifications", "notifications");
  supabaseCrud("prospecting/lists", "prospecting_lists");
  supabaseCrud("prospecting/leads", "prospecting_leads");
  supabaseCrud("prospecting/campaigns", "campaigns");
  supabaseCrud("prospecting/history", "message_history");


  // Run on start and then every hour
  processDemands();
  setInterval(processDemands, 1000 * 60 * 60);

  // Initialize Payment Reminder Scheduler
  startPaymentReminderScheduler(
    async () => {
      try {
        const { data, error } = await supabase.from('receivables').select('*');
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Error fetching receivables in scheduler", err);
        return [];
      }
    },
    async () => {
      try {
        const { data, error } = await supabase.from('clients').select('*');
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Error fetching clients in scheduler", err);
        return [];
      }
    },
    async (phone: string, message: string) => {
        const owner = await dbService.list('users', { userId: '', userRole: 'ADMIN' } as any).then(list => list.find((u: any) => u.role === 'OWNER'));
        if (owner) {
            return whatsappService.sendMessage(owner.id, phone, message);
        }
        console.error("No OWNER found to send WhatsApp message");
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
    res.json({ status: "ok", message: "Amplifica CRM API is active" });
  });

  app.get("/api/health/supabase", async (req, res) => {
    try {
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (error) throw error;
      
      const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      res.json({ 
        status: "ok", 
        connected: true, 
        isServiceRole,
        message: isServiceRole ? "Conectado com Chave de Serviço (Bypass RLS Ativo)" : "Conectado com Chave Anon (RLS Ativo)"
      });
    } catch (err: any) {
      console.error("[HEALTH] Supabase connection failed:", err.message);
      res.status(500).json({ status: "error", connected: false, message: err.message });
    }
  });

  app.get("/api/system/audit-db", async (req, res) => {
    const tables = [
      "users", "clients", "leads", "receivables", "art_orders", 
      "partners", "partner_requests", "support_tickets", "video_orders", 
      "demand_tasks", "notifications", "prospecting_lists", 
      "prospecting_leads", "campaigns", "message_history"
    ];
    
    const results: any = {};
    const missing = [];
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id', { count: 'exact', head: true });
        if (error) {
          results[table] = { status: "error", message: error.message };
          if (error.code === '42P01') missing.push(table);
        } else {
          results[table] = { status: "ok" };
        }
      } catch (err: any) {
        results[table] = { status: "exception", message: err.message };
      }
    }
    
    res.json({
      summary: missing.length === 0 ? "All tables found" : `${missing.length} tables missing`,
      missing_count: missing.length,
      missing_tables: missing,
      details: results
    });
  });

  app.post("/api/signup", async (req, res) => {
    let { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    email = email.trim().toLowerCase();
    const newUser = { name, email, password, role: 'OWNER' as const };

    try {
      const users = await dbService.list('users');
      const existingUser = users.find((u: any) => u.email === email);
        
      if (existingUser) {
        return res.status(400).json({ error: "E-mail já cadastrado" });
      }

      const data = await dbService.insert('users', newUser);
      
      // Update owner_id to be same as own ID for OWNERs
      await dbService.update('users', data.id, { ownerId: data.id });
      
      res.json({ success: true, user: { ...data, ownerId: data.id } });
    } catch (err: any) {
      console.error("[AUTH] Erro no signup:", err);
      res.status(500).json({ error: `Erro ao criar conta: ${err.message || 'Erro desconhecido'}` });
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
      const users = await dbService.list('users');
      const data = users.find((u: any) => u.email === email && u.password === password);
        
      if (!data) {
        console.log(`[AUTH] Falha no login: ${email}`);
        return res.status(401).json({ error: "E-mail ou senha incorretos" });
      }
      
      console.log(`[AUTH] Login bem-sucedido: ${email}`);
      res.json({ success: true, user: data });
    } catch (err: any) {
      console.error(`[AUTH] Erro interno no login:`, err);
      res.status(500).json({ error: "Erro interno no servidor de autenticação" });
    }
  });

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
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ error: "ownerId é obrigatório" });
    res.json(whatsappService.getStatus(ownerId as string));
  });

  app.get("/api/whatsapp/logs", (req, res) => {
    const { ownerId } = req.query;
    try {
      const logPath = path.join(process.cwd(), "whatsapp_interaction_logs.txt");
      if (fs.existsSync(logPath)) {
        const logs = fs.readFileSync(logPath, "utf-8");
        if (ownerId) {
          const filtered = logs.split('\n')
            .filter(line => line.includes(`[Owner: ${ownerId}]`))
            .join('\n');
          res.send(filtered || "Sem logs registrados para este proprietário.");
        } else {
          res.send(logs);
        }
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
    const { ownerId } = req.body;
    if (!ownerId) return res.status(400).json({ error: "ownerId é obrigatório" });
    await whatsappService.logout(ownerId);
    res.json({ success: true });
  });
  
  app.post("/api/whatsapp/reload", async (req, res) => {
    const { ownerId } = req.body;
    if (!ownerId) return res.status(400).json({ error: "ownerId é obrigatório" });
    await whatsappService.reload(ownerId);
    res.json({ success: true });
  });

  app.get("/api/system/network", async (req, res) => {
    try {
      const os = await import("os");
      const interfaces = os.networkInterfaces();
      const addresses: string[] = [];
      for (const k in interfaces) {
        for (const k2 in interfaces[k]!) {
          const address = interfaces[k]![k2];
          if (address.family === "IPv4" && !address.internal) {
            addresses.push(address.address);
          }
        }
      }
      res.json({ 
        localIp: addresses[0] || "Não detectado",
        allAddresses: addresses,
        port: PORT,
        appUrl: process.env.APP_URL || ""
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao detectar rede" });
    }
  });

  app.post("/api/whatsapp/send", async (req, res) => {
    const { ownerId, phone, message, poll, mediaBase64 } = req.body;
    if (!ownerId || !phone || !message) {
      return res.status(400).json({ error: 'OwnerId, telefone e mensagem são obrigatórios.' });
    }
    
    try {
      // Send the text message first
      const sendResult = await whatsappService.sendMessage(ownerId, phone, message, mediaBase64);
      
      // If a poll is provided, send it right after the text message
      if (poll && poll.name && poll.options) {
        await whatsappService.sendPoll(ownerId, phone, poll.name, poll.options, poll.orderId);
      }
      
      res.json({ success: true, messageId: sendResult?.key?.id });
    } catch (err: any) {
      console.error('[WHATSAPP] Erro ao enviar:', err);
      res.status(500).json({ error: 'Erro ao enviar mensagem', detail: err.message });
    }
  });

  whatsappService.on('pollVote', async ({ ownerId, orderId, option, phone }) => {
    console.log(`[CRM][${ownerId}] Recebido voto para a arte ${orderId}: ${option}`);
    let newStatus = '';
    
    if (option.includes('Aprovar')) {
      newStatus = 'approved';
    } else if (option.includes('Ajustes')) {
      newStatus = 'rejected';
    }

    if (newStatus && orderId) {
      try {
        const update = newStatus === 'approved' 
          ? { approval_status: 'approved', status: 'done', feedback_requested: false }
          : { feedback_requested: true, approval_status: 'pending' };

        const { error } = await supabase
          .from('art_orders')
          .update(update)
          .eq('id', orderId);
        
        if (error) throw error;
        
        console.log(`[CRM][${ownerId}] Arte ${orderId} atualizada. Status: ${newStatus}`);
        
        // Optionally send a confirmation back to the user
        let responseMsg = '';
        if (newStatus === 'approved') {
          responseMsg = '✅ Muito obrigado pela aprovação! Já vamos finalizar o processo.';
        } else {
          // GENERATE THE LINK AUTOMATICALLY
          let appUrl = process.env.APP_URL || 'https://amplifica.app';
          appUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
          
          const link = `${appUrl}/?refuseOrderId=${orderId}`;
          responseMsg = `📝 Entendido! Para que possamos fazer os ajustes exatamente como você deseja, por favor preencha este rápido formulário:\n\n${link}\n\nAguardamos seu feedback!`;
        }
        
        console.log(`[CRM][${ownerId}] Enviando resposta automática para ${phone}`);
        await whatsappService.sendMessage(ownerId, phone, responseMsg);
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

  // --- INICIALIZAÇÃO E CORREÇÃO DE DADOS ---
  async function fixUserData() {
    try {
      const { data: users, error } = await supabase.from('users').select('*');
      if (error) throw error;

      for (const user of users) {
        // Se for OWNER e não tiver owner_id, ou owner_id for diferente do próprio ID
        if (user.role === 'OWNER' && (!user.owner_id || user.owner_id !== user.id)) {
          await supabase.from('users').update({ owner_id: user.id }).eq('id', user.id);
          console.log(`[FIX] Atualizado owner_id para o proprietário: ${user.name}`);
        }
      }
    } catch (err) {
      console.error('[FIX] Erro ao corrigir dados de usuários:', err);
    }
  }
  fixUserData();
  // --- FIM CORREÇÃO ---

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 Amplifica CRM rodando em http://localhost:${PORT}`);
  });
}

startServer();
