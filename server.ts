import express from "express";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import multer from "multer";
import cron from "node-cron";
import { whatsappService } from "./src/services/whatsappService.ts";
import { scraperService } from "./src/services/prospecting/scraper.service.ts";
import { startBackupScheduler } from "./src/services/backupService.ts";
import { startPaymentReminderScheduler, getFinanceConfig, updateFinanceConfig } from "./src/services/paymentReminderService.ts";
import { supabase, isUsingServiceRole } from "./src/lib/supabaseClient.ts";
import { getEmailConfig, saveEmailConfig, resetTransporter, sendEmail } from "./src/services/emailService.ts";
import { googleDriveService } from "./src/services/googleDriveService.ts";
import { facebookService } from "./src/services/facebookService.ts";
import { Server } from "socket.io";
import { createServer } from "http";

import { dbService, DbContext, keysToCamel, keysToSnake } from "./src/services/dbService.ts";
import { UserRole } from "./src/types.ts";

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
  console.log("[DEBUG] SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
  console.log("[DEBUG] SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  app.use(compression());
  app.set('trust proxy', true);
  
  // Redirecionar para HTTPS em produção
  if (process.env.NODE_ENV === "production" || process.env.FORCE_HTTPS === "true") {
    app.use((req, res, next) => {
      res.setHeader("Content-Security-Policy", "upgrade-insecure-requests; block-all-mixed-content");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

      const isHttps = req.headers["x-forwarded-proto"] === "https" || 
                      req.headers["x-forwarded-ssl"] === "on" || 
                      req.secure;

      if (!isHttps) {
        console.log(`[SECURITY] Redirecting non-https request from ${req.headers.host} to https`);
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }

  app.use(express.json({ limit: "5000mb" }));
  app.use(express.urlencoded({ limit: "5000mb", extended: true }));
  
  // Debug middleware for API
  app.use("/api", (req, res, next) => {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
    next();
  });

  // Global Process Error Handlers
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  // --- Socket.io Meeting Logic ---
  const meetingRequests = new Map<string, any[]>();
  io.on("connection", (socket) => {
    console.log(`[SOCKET] Cliente conectado: ${socket.id}`);
    socket.on("join-room", ({ roomId, user, isGuest }) => {
      socket.join(roomId);
      (socket as any).userId = user.id; // Save user id on socket for disconnect
      if (!isGuest) socket.to(roomId).emit("host-joined", { hostId: user.id });
      socket.to(roomId).emit("user-connected", { userId: user.id, user });
      socket.on("disconnect", () => socket.to(roomId).emit("user-disconnected", (socket as any).userId));
    });
    socket.on("signal", ({ to, from, signal }) => io.to(to).emit("signal", { from, signal }));
    socket.on("request-join", ({ roomId, guestInfo }) => {
      const requests = meetingRequests.get(roomId) || [];
      const newRequest = { id: socket.id, ...guestInfo };
      requests.push(newRequest);
      meetingRequests.set(roomId, requests);
      io.to(roomId).emit("new-join-request", newRequest);
    });
    socket.on("approve-request", ({ roomId, guestId }) => {
      io.to(guestId).emit("request-approved", { roomId });
      let requests = meetingRequests.get(roomId) || [];
      requests = requests.filter(r => r.id !== guestId);
      meetingRequests.set(roomId, requests);
    });
    socket.on("deny-request", ({ roomId, guestId }) => {
      io.to(guestId).emit("request-denied");
      let requests = meetingRequests.get(roomId) || [];
      requests = requests.filter(r => r.id !== guestId);
      meetingRequests.set(roomId, requests);
    });
  });

  // --- Runtime Env Config ---
  app.get("/env-config.js", (req, res) => {
    const config = {
      VITE_COMPANY_NAME: process.env.VITE_COMPANY_NAME || "Amplifica CRM",
      VITE_PRIMARY_COLOR: process.env.VITE_PRIMARY_COLOR || "#4f46e5",
    };
    res.type("application/javascript");
    res.send(`window._env_ = ${JSON.stringify(config)};`);
  });

  const JWT_SECRET = process.env.JWT_SECRET || "amplifica-crm-secure-token-2026";

  interface AuthRequest extends express.Request {
    user?: { id: string; role: UserRole; ownerId: string; };
  }

  // --- Auth Middleware ---
  const userCache = new Map<string, { user: any, timestamp: number }>();
  const AUTH_CACHE_TTL = 30000; // 30 seconds cache for user info
  
  // Generic GET response cache
  const getCache = new Map<string, { data: any, timestamp: number }>();
  const GET_CACHE_TTL = 30000; // 30 seconds cache for generic data

  const authMiddleware = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    const publicPaths = ["/api/login", "/api/signup", "/api/forgot-password", "/api/health", "/api/health/supabase", "/env-config.js", "/api/facebook/callback", "/api/google/callback"];
    
    // Check if path is public - handle both originalUrl and relative path
    const isPublic = publicPaths.some(p => 
      req.originalUrl === p || 
      req.originalUrl.startsWith(p + "?") ||
      req.path === p.replace('/api', '')
    );
    
    if (isPublic) return next();

    // Allow GET access to specific orders for guests (DesignModificationForm)
    const isPublicGet = req.method === 'GET' && (
      req.path.includes('art-orders/') || 
      req.path.includes('video-orders/') ||
      req.path.includes('users') ||
      req.path.includes('clients/')
    );

    if (isPublicGet) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // If we are getting here and it's a GET /api/leads, it might be a public request or missing token
      // Let's not log error unless it's not a GET
      if (req.method !== 'GET') {
          console.warn(`[AUTH] Missing auth header for ${req.method} ${req.url}`);
      }
      return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor, faça login novamente." });
    }
    
    const token = authHeader.split(" ")[1];
    if (!token || token === 'null' || token === 'undefined') {
       return res.status(401).json({ error: "Sessão expirada ou inválida." });
    }

    // Check Cache
    const cached = userCache.get(token);
    if (cached && (Date.now() - cached.timestamp < AUTH_CACHE_TTL)) {
      req.user = cached.user;
      return next();
    }

    try {
      // Decode JWT locally first (much faster, no rate limit)
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userData = { id: decoded.id, role: decoded.role, ownerId: decoded.ownerId };
      
      // Cache and proceed
      userCache.set(token, { user: userData, timestamp: Date.now() });
      req.user = userData;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Sessão inválida ou expirada" });
    }
    
    // Periodically clean caches
    if (userCache.size > 1000) {
      const now = Date.now();
      for (const [t, data] of userCache.entries()) {
        if (now - data.timestamp > AUTH_CACHE_TTL) userCache.delete(t);
      }
    }
    if (getCache.size > 2000) {
      const now = Date.now();
      for (const [k, d] of getCache.entries()) {
        if (now - d.timestamp > GET_CACHE_TTL * 10) getCache.delete(k);
      }
    }
  };

  app.use("/api", authMiddleware as any);

  // --- Upload Configuration ---
  const UPLOADS_DIR = path.join(process.cwd(), 'uploads_secure');
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.docx', '.csv', '.xlsx', '.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp', '.mpeg'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(ext)) cb(null, true);
      else cb(new Error("Tipo de arquivo não permitido.") as any);
    }
  });

  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    res.json({ success: true, filename: req.file.filename, originalName: req.file.originalname, url: `/api/files/${req.file.filename}` });
  });

  app.get("/api/files/:filename", (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-zA-Z0-9.\-_]+$/.test(filename)) return res.status(400).json({ error: "Nome inválido" });
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) res.sendFile(filePath);
      else res.download(filePath);
    } else res.status(404).json({ error: "Não encontrado" });
  });

  // --- Supabase CRUD Helper ---
  const getContext = (req: AuthRequest): DbContext | undefined => {
    if (req.user) return { userId: req.user.id, userRole: req.user.role, ownerId: req.user.ownerId };
    
    // Check if it's a public GET allowed by authMiddleware
    const publicPaths = ["/art-orders/", "/video-orders/", "/users", "/clients/"];
    const isPublicGet = req.method === 'GET' && publicPaths.some(p => req.path.includes(p));
    
    if (isPublicGet) {
      // Return a bypass context - list() and getById() in dbService should be updated to handle this if needed
      // or we just return a limited context.
      return { userId: 'SYSTEM', userRole: 'GUEST' as any, ownerId: undefined };
    }
    
    return undefined;
  };
  
  const supabaseCrud = (pathName: string, tableName: string) => {
    app.get(`/api/${pathName}`, async (req, res) => {
      const context = getContext(req);
      const cacheKey = `${tableName}-${context?.userId || 'GUEST'}-${JSON.stringify(req.query)}`;
      const cached = getCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < GET_CACHE_TTL)) {
        return res.json(cached.data);
      }

      try { 
        const result = await dbService.list(tableName, context);
        getCache.set(cacheKey, { data: result, timestamp: Date.now() });
        res.json(result); 
      }
      catch (error: any) { res.status(500).json({ error: error.message }); }
    });
    app.get(`/api/${pathName}/:id`, async (req, res) => {
      const context = getContext(req);
      const cacheKey = `${tableName}-${req.params.id}-${context?.userId || 'GUEST'}`;
      const cached = getCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < GET_CACHE_TTL)) {
        return res.json(cached.data);
      }

      try {
        const data = await dbService.getById(tableName, req.params.id, context);
        if (!data) return res.status(404).json({ error: "Não encontrado" });
        getCache.set(cacheKey, { data: data, timestamp: Date.now() });
        res.json(data);
      } catch (error: any) { res.status(500).json({ error: error.message }); }
    });
    app.post(`/api/${pathName}`, async (req, res) => {
      try { 
        // Invalidate list cache on mutations
        const context = getContext(req);
        for (const key of getCache.keys()) {
          if (key.startsWith(tableName)) getCache.delete(key);
        }
        res.json(await dbService.insert(tableName, req.body, context)); 
      }
      catch (error: any) { res.status(500).json({ error: error.message }); }
    });
    app.put(`/api/${pathName}/:id`, async (req, res) => {
      try { 
        // Invalidate cache
        for (const key of getCache.keys()) {
          if (key.startsWith(tableName)) getCache.delete(key);
        }
        res.json(await dbService.update(tableName, req.params.id, req.body, getContext(req))); 
      }
      catch (error: any) { res.status(500).json({ error: error.message }); }
    });
    app.delete(`/api/${pathName}/:id`, async (req, res) => {
      try { 
        // Invalidate cache
        for (const key of getCache.keys()) {
          if (key.startsWith(tableName)) getCache.delete(key);
        }
        res.json(await dbService.delete(tableName, req.params.id, getContext(req))); 
      }
      catch (error: any) { res.status(500).json({ error: error.message }); }
    });
  };

  // --- Combined Sync Endpoint ---
  app.get("/api/sync", async (req: AuthRequest, res) => {
    try {
      const context = getContext(req);
      if (!context) return res.status(401).json({ error: "Não autorizado" });

      const results = await Promise.all([
        dbService.list('leads', context),
        dbService.list('clients', context),
        dbService.list('receivables', context),
        dbService.list('art_orders', context),
        dbService.list('partners', context),
        dbService.list('users', context),
        dbService.list('partner_requests', context),
        dbService.list('support_tickets', context),
        dbService.list('video_orders', context),
        dbService.list('demand_tasks', context),
        dbService.list('notifications', context)
      ]);

      res.json({
        leads: results[0],
        clients: results[1],
        receivables: results[2],
        artOrders: results[3],
        partners: results[4],
        users: results[5],
        partnerRequests: results[6],
        tickets: results[7],
        videoOrders: results[8],
        demandTasks: results[9],
        notifications: results[10]
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Specific Logic Routes (Must come BEFORE generic CRUD) ---
  app.get("/api/chat-messages", (req, res) => {
    const context = getContext(req as AuthRequest);
    const chats = readChats();
    res.json(chats.filter((c: any) => c.ownerId === context?.ownerId));
  });

  app.post("/api/chat-messages", (req, res) => {
    const context = getContext(req as AuthRequest);
    if (!context) return res.status(401).json({ error: "Não autorizado" });
    const chats = readChats();
    const newMessage = { id: Math.random().toString(36).substr(2, 9), ...req.body, ownerId: context.ownerId, createdAt: new Date().toISOString() };
    chats.push(newMessage);
    writeChats(chats);
    res.status(201).json(newMessage);
  });

  app.delete("/api/chat-cleanup/:refId", (req, res) => {
    const chats = readChats();
    writeChats(chats.filter((c: any) => c.referenceId !== req.params.refId));
    res.status(204).end();
  });

  app.put("/api/art-orders/:id", async (req, res) => {
    try {
      const updated = await dbService.update('art_orders', req.params.id, req.body, getContext(req));
      if (['done', 'finished'].includes(req.body.status)) {
        writeChats(readChats().filter((c: any) => c.referenceId !== req.params.id));
      }
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/video-orders/:id", async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body };
    const context = getContext(req as AuthRequest);
    delete updates.approvedAt;
    delete updates.approved_at;
    try {
      const currentOrder = await dbService.getById('video_orders', id, context);
      if (updates.status === 'production' && currentOrder.videoUrl) {
        const filename = currentOrder.videoUrl.replace('/api/files/', '');
        const filePath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        updates.videoUrl = null;
      }
      if (['done', 'finished'].includes(updates.status)) {
        writeChats(readChats().filter((c: any) => c.referenceId !== id));
      }
      res.json(await dbService.update('video_orders', id, updates, context));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/demand-tasks/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
      const updatedTask = await dbService.update('demand_tasks', id, updates, getContext(req));
      if (updates.status === 'done' && updatedTask && updatedTask.type === 'recording') {
        const clients = await dbService.list('clients', getContext(req));
        const client = clients.find((c: any) => c.id === updatedTask.clientId);
        if (client) {
          await dbService.insert('video_orders', {
            title: `Edição: ${updatedTask.title || updatedTask.observations || 'Sem título'}`,
            clientId: updatedTask.clientId,
            editorId: updatedTask.editorId || client.demandConfig?.defaultEditorId || '',
            deadline: updatedTask.postDate || 'Imediato',
            priority: 'high', progress: 0, status: 'queue'
          }, getContext(req));
        }
      }
      if (['done', 'finished'].includes(updates.status)) {
        writeChats(readChats().filter(c => c.referenceId !== id));
      }
      res.json(updatedTask);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // --- Authentication ---
  app.post("/api/login", async (req, res) => {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Campos obrigatórios" });
    email = email.trim().toLowerCase();
    try {
      const { data: userRaw, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (error) throw error;
      if (!userRaw || keysToCamel(userRaw).password !== password) return res.status(401).json({ error: "Credenciais inválidas" });
      const data = keysToCamel(userRaw);
      const token = jwt.sign({ id: data.id, role: data.role, ownerId: data.ownerId || data.id }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...userSafe } = data;
      res.json({ success: true, user: userSafe, token });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/signup", async (req, res) => {
    let { name, email, password } = req.body;
    email = email.trim().toLowerCase();
    try {
      const { data: userRaw, error: insertError } = await supabase.from('users').insert(keysToSnake({ name, email, password, role: 'OWNER' })).select().single();
      if (insertError) throw insertError;
      const user = keysToCamel(userRaw);
      await supabase.from('users').update({ owner_id: user.id }).eq('id', user.id);
      const token = jwt.sign({ id: user.id, role: user.role, ownerId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...userSafe } = user;
      res.json({ success: true, user: userSafe, token });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/forgot-password", async (req, res) => {
    let { email } = req.body;
    try {
      const { data: userFound, error } = await supabase.from('users').select('*').eq('email', email.trim().toLowerCase()).single();
      if (error || !userFound) return res.status(404).json({ error: "E-mail não encontrado" });
      const tempPassword = Math.random().toString(36).substr(2, 8);
      await dbService.update('users', userFound.id, { password: tempPassword });
      await sendEmail(userFound.owner_id || userFound.id, email, "Nova senha", `Sua nova senha: ${tempPassword}`);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // --- Email/Finance/Prospecting/Whatsapp ---
  app.get("/api/email/config", async (req: AuthRequest, res) => {
    const ownerId = req.user?.ownerId || req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Não autorizado" });
    res.json(await getEmailConfig(ownerId) || {});
  });
  app.post("/api/email/config", async (req: AuthRequest, res) => { 
    const ownerId = req.user?.ownerId || req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Não autorizado" });
    await saveEmailConfig(ownerId, req.body); 
    resetTransporter(); 
    res.json({ success: true }); 
  });
  app.post("/api/email/test", async (req: AuthRequest, res) => {
    const ownerId = req.user?.ownerId || req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Não autorizado" });
    try { await sendEmail(ownerId, req.body.to, "Teste", "Teste de e-mail"); res.json({ success: true }); }
    catch(err: any) { res.status(500).json({ error: err.message }); }
  });
  app.get("/api/finance/config", async (req: AuthRequest, res) => {
    const ownerId = req.user?.ownerId || req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Não autorizado" });
    res.json(await getFinanceConfig(ownerId));
  });
  app.post("/api/finance/config", async (req: AuthRequest, res) => { 
    const ownerId = req.user?.ownerId || req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Não autorizado" });
    await updateFinanceConfig(ownerId, req.body); 
    res.json({ success: true }); 
  });
  app.post("/api/prospecting/scrape", async (req, res) => {
    const { source, query, location } = req.body;
    try { 
      let leads = source === 'google' ? await scraperService.scrapeGoogleMaps(query, location) : await scraperService.scrapeInstagram(query);
      res.json({ success: true, leads });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.get("/api/whatsapp/status", (req, res) => res.json(whatsappService.getStatus(req.query.ownerId as string)));
  app.post("/api/whatsapp/logout", async (req, res) => { await whatsappService.logout(req.body.ownerId); res.json({ success: true }); });
  app.post("/api/whatsapp/send", async (req, res) => {
    const { ownerId, phone, message, poll, mediaBase64 } = req.body;
    try {
      const sendResult = await whatsappService.sendMessage(ownerId, phone, message, mediaBase64);
      if (poll?.name) await whatsappService.sendPoll(ownerId, phone, poll.name, poll.options, poll.orderId);
      res.json({ success: true, messageId: sendResult?.key?.id });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // --- Facebook Integration Routes ---
  app.get("/api/facebook/auth-url", (req: AuthRequest, res) => {
    try {
      const { clientId } = req.query;
      if (!clientId) return res.status(400).json({ error: "Client ID ausente" });
      const url = facebookService.getAuthUrl(clientId as string);
      res.json({ url });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/facebook/callback", async (req, res) => {
    const { code, state: clientId } = req.query;
    if (!code || !clientId) return res.status(400).json({ error: "Código ou ID do cliente ausente" });
    try {
      await facebookService.handleCallback(code as string, clientId as string);
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'FACEBOOK_AUTH_SUCCESS', clientId: '${clientId}' }, '*');
                window.close();
              } else {
                window.location.href = '/?route=social_posts';
              }
            </script>
            <p>Autenticação do Facebook bem-sucedida! Esta janela será fechada...</p>
          </body>
        </html>
      `);
    } catch (err: any) { 
      res.status(500).send(`Erro na autenticação: ${err.message}`);
    }
  });

  app.get("/api/facebook/status/:clientId", async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      const connected = facebookService.isConnected(clientId);
      const pages = facebookService.getPages(clientId);
      const igAccounts = facebookService.getInstagramAccounts(clientId);
      res.json({ connected, pages, igAccounts });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/facebook/publish", async (req: AuthRequest, res) => {
    try {
      const { clientId, networks, content, mediaUrl, scheduledTimeUnix } = req.body;
      const results = await facebookService.publishPost(clientId, networks, content, mediaUrl, scheduledTimeUnix);
      res.json({ success: true, results });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // --- Google Drive Integration Routes ---
  app.get("/api/google/auth-url", (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
      const url = googleDriveService.getAuthUrl(userId);
      res.json({ url });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/google/callback", async (req, res) => {
    const { code, state: userId } = req.query;
    if (!code || !userId) return res.status(400).json({ error: "Código ou ID de usuário ausente" });
    try {
      await googleDriveService.saveTokens(userId as string, code as string);
      // Redirect back to the Drive page in the frontend
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_DRIVE_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/dashboard/drive';
              }
            </script>
            <p>Autenticação do Google Drive bem-sucedida! Esta janela será fechada...</p>
          </body>
        </html>
      `);
    } catch (err: any) { 
      res.status(500).send(`Erro na autenticação: ${err.message}`);
    }
  });

  app.get("/api/google/status", async (req: AuthRequest, res) => {
    try {
      const connected = await googleDriveService.isConnected(req.user!.id);
      res.json({ connected });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/google/disconnect", async (req: AuthRequest, res) => {
    try {
      await googleDriveService.disconnect(req.user!.id);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/google/files", async (req: AuthRequest, res) => {
    try {
      const folderId = (req.query.folderId as string) || 'root';
      const files = await googleDriveService.listFiles(req.user!.id, folderId);
      res.json(files);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/google/upload", upload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
      const folderId = (req.body.folderId as string) || 'root';
      const file = await googleDriveService.uploadFile(req.user!.id, req.file, folderId);
      // Cleanup local file
      fs.unlinkSync(req.file.path);
      res.json(file);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/google/download/:fileId", async (req: AuthRequest, res) => {
    try {
      const stream = await googleDriveService.downloadFile(req.user!.id, req.params.fileId);
      stream.pipe(res);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/google/share-link", async (req: AuthRequest, res) => {
    try {
      const link = await googleDriveService.generateShareLink(req.user!.id, req.body.fileId);
      res.json({ link });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Health
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.get("/api/health/supabase", async (req, res) => {
    try {
      const { error } = await supabase.from('clients').select('id').limit(1);
      res.json({ connected: !error, isUsingServiceRole: isUsingServiceRole, message: error ? error.message : "OK" });
    } catch(err: any) { res.json({ connected: false, error: err.message }); }
  });

  // --- Initialize Generic CRUD (Must be AFTER specific routes) ---
  const crudPaths = [
    ["users", "users"], ["leads", "leads"], ["clients", "clients"], 
    ["receivables", "receivables"], ["video-orders", "video_orders"], 
    ["demand-tasks", "demand_tasks"], ["notifications", "notifications"], 
    ["partners", "partners"], ["partner-requests", "partner_requests"], 
    ["support-tickets", "support_tickets"], ["art-orders", "art_orders"],
    ["prospecting/lists", "prospecting_lists"], ["prospecting/leads", "prospecting_leads"], 
    ["prospecting/campaigns", "campaigns"], ["client-documents", "client_documents"]
  ];
  crudPaths.forEach(([p, t]) => supabaseCrud(p, t));

  // --- Catch-all API 404 ---
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Endpoint não encontrado: ${req.url}` });
  });

  // --- SCHEDULERS ---
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
            console.log(`[DEMANDS] Nova demanda gerada para ${client.name}`);
          }
        }
      }
    } catch (err) { console.error("[DEMANDS] Erro ao processar demandas:", err); }
  }

  processDemands().catch(console.error);
  setInterval(processDemands, 1000 * 60 * 60);

  startPaymentReminderScheduler(
    async () => {
      const { data } = await supabase.from('receivables').select('*');
      return keysToCamel(data) || [];
    },
    async () => {
      const { data } = await supabase.from('clients').select('*');
      return keysToCamel(data) || [];
    },
    async (phone: string, message: string, ownerId: string) => {
       return whatsappService.sendMessage(ownerId, phone, message);
    }
  );

  setInterval(() => {
    console.log("[CHAT] Limpeza programada...");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const chats = readChats();
    const filtered = chats.filter((c: any) => c.chatType !== 'team' || new Date(c.createdAt) > thirtyDaysAgo);
    writeChats(filtered);
  }, 1000 * 60 * 60 * 24);

  // --- VITE / STATIC ---
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
    }
  }

  httpServer.listen(Number(PORT), "0.0.0.0", () => console.log(`🚀 Server on ${PORT}`));
}

startServer();
