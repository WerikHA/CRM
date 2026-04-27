import express from "express";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { whatsappService } from "./src/services/whatsappService.ts";
import { scraperService } from "./src/services/prospecting/scraper.service.ts";
import { startBackupScheduler } from "./src/services/backupService.ts";
import { startPaymentReminderScheduler, getFinanceConfig, updateFinanceConfig } from "./src/services/paymentReminderService.ts";
import { supabase } from "./src/lib/supabaseClient.ts";
import { getEmailConfig, saveEmailConfig, resetTransporter, sendEmail } from "./src/services/emailService.ts";

import { dbService, DbContext, UserRole } from "./src/services/dbService.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Chat DB Constants ---
const CHAT_DB_PATH = path.join(process.cwd(), 'chat_messages_v2.json');
if (!fs.existsSync(CHAT_DB_PATH)) {
    fs.writeFileSync(CHAT_DB_PATH, JSON.stringify([]));
}
function readChats(): any[] {
    try {
        const data = fs.readFileSync(CHAT_DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) { return []; }
}
function writeChats(chats: any[]) {
    fs.writeFileSync(CHAT_DB_PATH, JSON.stringify(chats, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  console.log("[STARTUP] Iniciando servidor Express...");

  app.use(compression());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Debug middleware for API
  app.use("/api", (req, res, next) => {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
    next();
  });
  
  // --- Runtime Env Config for Docker ---
  app.get("/env-config.js", (req, res) => {
    const config = {
      VITE_COMPANY_NAME: process.env.VITE_COMPANY_NAME || "Amplifica CRM",
      VITE_PRIMARY_COLOR: process.env.VITE_PRIMARY_COLOR || "#4f46e5",
      VITE_SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    };
    res.type("application/javascript");
    res.send(`window._env_ = ${JSON.stringify(config)};`);
  });
  
  console.log(`[INIT] Supabase URL: ${process.env.SUPABASE_URL ? 'Configurada' : 'MISSING'}`);
  console.log(`[INIT] Supabase Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Presente' : 'MISSING (RLS pode causar erros)'}`);

  // --- Middleware for typed user context ---
  const getContext = (req: express.Request): DbContext | undefined => {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as UserRole;
    const ownerId = req.headers['x-user-owner-id'] as string;
    
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return { userId, userRole, ownerId };
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

    app.get(`/api/${pathName}/:id`, async (req, res) => {
      try {
        const data = await dbService.getById(tableName, req.params.id, getContext(req));
        if (!data) return res.status(404).json({ error: "Registro não encontrado" });
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

  // --- Initialize Database ---
  
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
  // Chat Operations (Moved up for priority)
  app.get("/api/chat-messages", (req, res) => {
    try {
      const chats = readChats();
      res.json(chats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chat-messages", (req, res) => {
    try {
      const chats = readChats();
      const newMessage = {
          id: Math.random().toString(36).substr(2, 9),
          ...req.body,
          createdAt: new Date().toISOString()
      };
      chats.push(newMessage);
      writeChats(chats);
      res.status(201).json(newMessage);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/chat-cleanup/:refId", (req, res) => {
    try {
      const chats = readChats();
      const filtered = chats.filter((c: any) => c.referenceId !== req.params.refId);
      writeChats(filtered);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Must come before generic CRUD to take precedence
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

      // Cleanup task chat if finished
      if (updates.status === 'done' || updates.status === 'finished') {
          const chats = readChats();
          const filtered = chats.filter(c => c.referenceId !== id);
          writeChats(filtered);
          console.log(`[CHAT] Cleanup triggered for finished task ${id}`);
      }

      res.json(updatedTask);
    } catch (err: any) {
      console.error("[DEMANDS] Erro ao atualizar demanda:", err);
      res.status(500).json({ error: `Erro ao salvar demanda: ${err.message}` });
    }
  });

  // Authentication
  app.post("/api/forgot-password", async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail obrigatório" });
    
    try {
      const users = await dbService.list('users');
      const userFound = users.find((u: any) => u.email === email.trim().toLowerCase());
      
      if (!userFound) {
        return res.status(404).json({ error: "E-mail não encontrado" });
      }

      // Generate temp password
      const tempPassword = Math.random().toString(36).substr(2, 8);
      
      await dbService.update('users', userFound.id, { password: tempPassword });
      
      const emailBody = `
        <h3>Recuperação de Senha</h3>
        <p>Olá ${userFound.name},</p>
        <p>Uma nova senha foi gerada para você acessar o CRM:</p>
        <p><strong>Senha:</strong> ${tempPassword}</p>
        <p>Faça login e altere sua senha imediatamente nas configurações.</p>
      `;
      
      await sendEmail(email, "Sua nova senha de acesso", emailBody);
      
      res.json({ success: true, message: "E-mail de recuperação enviado." });
    } catch (err: any) {
      console.error("[AUTH] Erro ao redefinir senha:", err);
      res.status(500).json({ error: "Erro interno: " + err.message });
    }
  });

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
      
      if (users.length === 0) {
        return res.status(404).json({ 
          error: "Nenhum usuário cadastrado no sistema.", 
          code: "SYSTEM_EMPTY"
        });
      }
      
      const userFound = users.find((u: any) => u.email === email);
      const data = userFound && userFound.password === password ? userFound : null;
        
      if (!data) {
        return res.status(401).json({ error: "E-mail ou senha incorretos" });
      }
      
      console.log(`[AUTH] Login bem-sucedido: ${email}`);
      await logActivity(data.id, data.ownerId || data.id, 'LOGIN', { email: data.email });
      res.json({ success: true, user: data });
    } catch (err: any) {
      console.error(`[AUTH] Erro interno no login:`, err);
      res.status(500).json({ error: "Erro interno no servidor de autenticação" });
    }
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
      await dbService.update('users', data.id, { ownerId: data.id });
      
      await logActivity(data.id, data.id, 'SIGNUP', { email: data.email, role: data.role });
      res.json({ success: true, user: { ...data, ownerId: data.id } });
    } catch (err: any) {
      console.error("[AUTH] Erro no signup:", err);
      res.status(500).json({ error: `Erro ao criar conta: ${err.message}` });
    }
  });

  supabaseCrud("leads", "leads");
  supabaseCrud("clients", "clients");
  supabaseCrud("receivables", "receivables");
  
  // Art Orders with Cleanup
  app.put("/api/art-orders/:id", async (req, res) => {
    try {
      const updated = await dbService.update('art_orders', req.params.id, req.body, getContext(req));
      if (req.body.status === 'done' || req.body.status === 'finished') {
        const chats = readChats();
        const filtered = chats.filter((c: any) => c.referenceId !== req.params.id);
        writeChats(filtered);
        console.log(`[CHAT] Cleanup triggered for art order ${req.params.id}`);
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  supabaseCrud("art-orders", "art_orders");

  supabaseCrud("partners", "partners");
  supabaseCrud("partner-requests", "partner_requests");
  supabaseCrud("support-tickets", "support_tickets");
  
  // Video Orders with Cleanup
  app.put("/api/video-orders/:id", async (req, res) => {
    try {
      const updated = await dbService.update('video_orders', req.params.id, req.body, getContext(req));
      if (req.body.status === 'done' || req.body.status === 'finished') {
        const chats = readChats();
        const filtered = chats.filter((c: any) => c.referenceId !== req.params.id);
        writeChats(filtered);
        console.log(`[CHAT] Cleanup triggered for video order ${req.params.id}`);
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  supabaseCrud("video-orders", "video_orders");

  supabaseCrud("demand-tasks", "demand_tasks"); // Unified path
  supabaseCrud("users", "users");
  supabaseCrud("notifications", "notifications");
  supabaseCrud("prospecting/lists", "prospecting_lists");
  supabaseCrud("prospecting/leads", "prospecting_leads");
  supabaseCrud("prospecting/campaigns", "campaigns");
  
  // --- Email Service Routes ---
  app.get("/api/email/config", (req, res) => {
    res.json(getEmailConfig() || {
      host: '', port: 465, secure: true, user: '', pass: '', fromAddress: ''
    });
  });

  app.post("/api/email/config", (req, res) => {
    saveEmailConfig(req.body);
    resetTransporter();
    res.json({ success: true });
  });

  app.post("/api/email/test", async (req, res) => {
    const { to } = req.body;
    try {
        await sendEmail(to, "Teste do Servidor de Email CRM Amplifica", "<h3>E-mail Configurado com Sucesso!</h3><p>O seu servidor de email interno foi configurado corretamente no CRM.</p>");
        res.json({ success: true });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
  });

  // Finance Config
  app.get("/api/finance/config", (req, res) => res.json(getFinanceConfig()));
  app.post("/api/finance/config", (req, res) => {
      updateFinanceConfig(req.body);
      res.json({ success: true });
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

  app.post("/api/whatsapp/send", async (req, res) => {
    const { ownerId, phone, message, poll, mediaBase64 } = req.body;
    if (!ownerId || !phone || !message) {
      return res.status(400).json({ error: 'OwnerId, telefone e mensagem são obrigatórios.' });
    }
    try {
      const sendResult = await whatsappService.sendMessage(ownerId, phone, message, mediaBase64);
      if (poll && poll.name && poll.options) {
        await whatsappService.sendPoll(ownerId, phone, poll.name, poll.options, poll.orderId);
      }
      res.json({ success: true, messageId: sendResult?.key?.id });
    } catch (err: any) {
      console.error('[WHATSAPP] Erro ao enviar:', err);
      res.status(500).json({ error: 'Erro ao enviar mensagem', detail: err.message });
    }
  });

  // Health check - Supabase
  app.get("/api/health/supabase", async (req, res) => {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
      const activeKey = serviceKey || anonKey;
      
      const isServiceRole = activeKey.includes('service_role') || !!serviceKey;
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      
      if (!supabaseUrl || !activeKey) {
        return res.json({ connected: false, message: "URL ou Chave do Supabase ausentes", isServiceRole: false });
      }

      // Test the connection by running a simple query
      const { data, error } = await supabase.from('clients').select('id').limit(1);
      
      let message = "Conectado com sucesso ao Supabase Cloud";
      let connected = true;
      let logs = [];

      if (error) {
         logs.push(`[PostgREST Error] ${error.code} - ${error.message} - ${error.details || ''}`);
         // If error specifies relation does not exist, we ARE connected to Postgres!
         if (error.code === '42P01') {
            message = "Conectado, mas a tabela 'clients' não existe. (Tabelas ausentes)";
         } else if (error.code === 'PGRST301' || error.message.includes('JWT')) {
            message = "Conectado. (Erro de JWT/Auth)";
         } else if (error.message.includes('FetchError') || error.message.includes('fetch failed')) {
            connected = false;
            message = "Falha na rede ao conectar no Supabase. URL inválida?";
         } else {
            // Other error? Still likely connected if we get a PostgreSQL/PostgREST error code
            message = "Conectado, mas ocorreu um erro na leitura: " + error.message;
         }
      } else {
         logs.push(`[Success] Tabelas lidas com sucesso. Dados: ${data?.length} registros.`);
      }

      return res.json({ connected, message, isServiceRole, logs });
    } catch(err: any) {
      return res.json({ connected: false, message: err.message || "Unknown error", isServiceRole: false, logs: [err.message] });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Amplifica CRM API is active" });
  });

  console.log("[STARTUP] Rotas registradas.");

  // Catch-all API 404 (IMPORTANT: always return JSON for /api requests)
  app.all("/api/*", (req, res) => {
    console.warn(`[SERVER] API 404: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Endpoint da API não encontrado: ${req.url}` });
  });

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 Amplifica CRM rodando em http://localhost:${PORT}`);
  });

  // --- BACKGROUND TASKS & POST-INITIALIZATION ---
  console.log("[STARTUP] Iniciando tarefas de fundo...");
  
  // Run on start and then every hour
  processDemands().catch(e => console.error("[STARTUP] Falha ao processar demandas:", e));
  setInterval(processDemands, 1000 * 60 * 60);

  // Initialize Payment Reminder Scheduler
  try {
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
          const users = await dbService.list('users', { userId: '', userRole: 'ADMIN' } as any);
          const owner = users.find((u: any) => u.role === 'OWNER');
          if (owner) {
              return whatsappService.sendMessage(owner.id, phone, message);
          }
          console.error("No OWNER found to send WhatsApp message");
      }
    );
  } catch (e) {
    console.error("[STARTUP] Falha ao iniciar agendador de cobranças:", e);
  }

  // Chat Cleanup Scheduler (Every 24 hours)
  async function performChatCleanup() {
      console.log("[CHAT] Invocando limpeza programada...");
      try {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const chats = readChats();
          const filtered = chats.filter((c: any) => {
              if (c.chatType === 'team') {
                  return new Date(c.createdAt) > thirtyDaysAgo;
              }
              return true;
          });
          
          writeChats(filtered);
          console.log("[CHAT] Limpeza de 30 dias (Team) concluída.");
      } catch (err) {
          console.error("[CHAT] Erro na limpeza programada:", err);
      }
  }

  performChatCleanup();
  setInterval(performChatCleanup, 1000 * 60 * 60 * 24);

  // --- Vite & Static Assets ---
  if (process.env.NODE_ENV !== "production") {
    console.log("[STARTUP] Iniciando middleware do Vite...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[STARTUP] Vite middleware pronto.");
    } catch (e) {
      console.error("[STARTUP] Falha ao carregar Vite:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      console.log(`[PROD] Servindo arquivos estáticos de: ${distPath}`);
      app.use(express.static(distPath));
    } else {
      console.error(`[PROD] ALERTA: Pasta 'dist' não encontrada em: ${distPath}`);
    }
    
    app.get("*", (req, res) => {
      if (fs.existsSync(path.join(distPath, "index.html"))) {
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        res.status(404).send("Erro Crítico: Frontend não encontrado. Certifique-se de rodar 'npm run build' e que a pasta 'dist' existe.");
      }
    });
  }

  // --- INICIALIZAÇÃO E CORREÇÃO DE DADOS ---
  console.log("[STARTUP] Verificando banco de dados...");

  async function checkDbConnection() {
    console.log("[INIT] Verificando conexão com Supabase...");
    try {
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      if (error) throw error;
      console.log("[INIT] Conexão com Supabase OK.");
    } catch (e: any) {
      console.error("[INIT] ALERTA: Não foi possível conectar ao banco ou tabelas faltantes:", e.message);
    }
  }

  async function fixUserData() {
    try {
      const { data: users, error } = await supabase.from('users').select('*');
      if (error) return;

      for (const user of users) {
        const dbOwnerId = user.owner_id;
        if (user.role === 'OWNER' && (!dbOwnerId || dbOwnerId !== user.id)) {
          await supabase.from('users').update({ owner_id: user.id }).eq('id', user.id);
          console.log(`[FIX] Atualizado owner_id para o proprietário: ${user.name}`);
        }
      }
    } catch (err) {
      // Ignorar silenciosamente se a tabela não existir ainda
    }
  }

  async function logActivity(userId: string, ownerId: string, action: string, details: any) {
    try {
      await supabase.from('activity_logs').insert({
        user_id: userId,
        owner_id: ownerId,
        action,
        details,
        ip_address: 'internal'
      });
    } catch (e) {
      console.error("[LOG] Falha ao gravar log de atividade:", e);
    }
  }

  checkDbConnection().catch(e => console.error("[STARTUP] Erro na conexão inicial:", e));
  fixUserData().catch(e => console.error("[STARTUP] Erro ao corrigir dados:", e));
}

startServer();
