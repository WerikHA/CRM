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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// --- Database is now handled via Supabase ---


async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: "50mb" }));

  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // --- Helper to handle CRUD via Supabase ---
  const supabaseCrud = (pathName: string, tableName: string) => {
    app.get(`/api/${pathName}`, async (req, res) => {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) return res.status(500).json({ error: error.message });
      res.json(data);
    });
    
    app.post(`/api/${pathName}`, async (req, res) => {
      const payload = { ...req.body };
      // Sanitize ID fields: empty string or "null" string -> null
      Object.keys(payload).forEach(key => {
        if (key.endsWith('_id') && (payload[key] === "" || payload[key] === "null")) {
          payload[key] = null;
        }
      });

      const { data, error } = await supabase.from(tableName).insert(payload).select().single();
      if (error) {
        console.error(`[SUPABASE][${tableName}] Insert error:`, error);
        return res.status(500).json({ error: error.message });
      }
      res.json(data);
    });

    app.put(`/api/${pathName}/:id`, async (req, res) => {
      const payload = { ...req.body };
      // Sanitize ID fields: empty string or "null" string -> null
      Object.keys(payload).forEach(key => {
        if (key.endsWith('_id') && (payload[key] === "" || payload[key] === "null")) {
          payload[key] = null;
        }
      });

      const { data, error } = await supabase.from(tableName).update(payload).eq('id', req.params.id).select().single();
      if (error) {
        console.error(`[SUPABASE][${tableName}] Update error:`, error);
        return res.status(500).json({ error: error.message });
      }
      res.json(data);
    });

    app.delete(`/api/${pathName}/:id`, async (req, res) => {
      const { error } = await supabase.from(tableName).delete().eq('id', req.params.id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
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

        if (!existingTasks || existingTasks.length === 0) {
          const newTask = {
            id: 'dem-' + Math.random().toString(36).substr(2, 9),
            client_id: client.id,
            type: config.type || 'art',
            quantity: config.quantity || 1,
            period_start: startStr,
            period_end: periodEnd.toISOString(),
            status: 'todo',
            editor_id: config.defaultEditorId || null,
            created_at: new Date().toISOString()
          };

          await supabase.from('demand_tasks').insert(newTask);
          console.log(`[DEMANDS] Nova demanda gerada para ${client.name} (${config.frequency})`);
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
        const { data: owner } = await supabase.from('users').select('id').eq('role', 'OWNER').limit(1).single();
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

  app.post("/api/signup", async (req, res) => {
    let { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    email = email.trim().toLowerCase();
    const id = 'u-' + Math.random().toString(36).substr(2, 9);
    const newUser = { id, name, email, password, role: 'OWNER', owner_id: id };

    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
        
      if (existingUser) {
        return res.status(400).json({ error: "E-mail já cadastrado" });
      }

      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select('id, name, email, role, avatar')
        .single();
        
      if (error) throw error;
      
      res.json({ success: true, user: data });
    } catch (err: any) {
      console.error("[AUTH] Erro no signup:", err);
      // Return the actual error message for easier debugging of connection issues
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
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, avatar')
        .eq('email', email)
        .eq('password', password)
        .single();
        
      if (error) {
        console.log(`[AUTH] Falha no login: ${email}`, error.message);
        // If it's a real database error (not just not found), return more detail
        const isNotFound = error.code === 'PGRST116';
        const msg = isNotFound ? "E-mail ou senha incorretos" : `Erro de banco de dados: ${error.message}`;
        return res.status(isNotFound ? 401 : 500).json({ error: msg });
      }
      
      console.log(`[AUTH] Login bem-sucedido: ${email}`);
      res.json({ success: true, user: data });
    } catch (err) {
      console.error(`[AUTH] Erro interno no login:`, err);
      res.status(500).json({ error: "Erro interno no servidor de autenticação" });
    }
  });

// --- Legacy CRUD functionality has been replaced by supabaseCrud helper ---

  // setupCrud replacements will go here as we refactor each endpoint.
  // The old 'pool' dependency has been removed.
  // Database routes should be converted to use `supabase` client.
  app.put("/api/demand-tasks/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
      const { data, error } = await supabase
        .from('demand_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      const updatedTask = data;

      // Special logic: if status set to 'done' and type is 'recording', create a video order
      if (updates.status === 'done' && updatedTask.type === 'recording') {
        const { data: client, error: clientErr } = await supabase
          .from('clients')
          .select('*')
          .eq('id', updatedTask.client_id)
          .single();
        
        if (clientErr) throw clientErr;
        
        // Calculate deadline: 12 hours before postTime on postDate
        let deadlineStr = 'Imediato';
        if (updatedTask.post_date) {
            deadlineStr = updatedTask.post_date; // simplifying deadline calculation for stability
        }

        const newVideoOrder = {
          id: 'v-' + Math.random().toString(36).substr(2, 9),
          title: `Edição: ${updatedTask.title || updatedTask.observations || 'Sem título'}`,
          client_id: updatedTask.client_id,
          editor_id: updatedTask.editor_id || client.demand_config?.defaultEditorId || '',
          deadline: deadlineStr,
          priority: 'high',
          progress: 0,
          status: 'queue'
        };

        await supabase.from('video_orders').insert(newVideoOrder);
        console.log(`[DEMANDS] Video order created automatically for Recording Demand ${id}`);
      }

      res.json(updatedTask);
    } catch (err: any) {
      console.error("[DEMANDS] Erro ao atualizar demanda:", err);
      res.status(500).json({ error: err.message });
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
