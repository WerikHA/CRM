import express from "express";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import multer from "multer";
import cron from "node-cron";
import bcrypt from "bcrypt";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import cors from "cors";
import xss from "xss";
import { Pool } from "pg";
import { ocrService } from "./src/services/ocrService.ts";
import { whatsappService } from "./src/services/whatsappService.ts";
import { scraperService } from "./src/services/prospecting/scraper.service.ts";
import { playwrightMapsScraper } from "./src/services/prospecting/playwrightMapsScraper.service.ts";
import { startBackupScheduler } from "./src/services/backupService.ts";
import { startPaymentReminderScheduler, getFinanceConfig, updateFinanceConfig } from "./src/services/paymentReminderService.ts";
import { supabase, isUsingServiceRole } from "./src/lib/supabaseClient.ts";
import { getEmailConfig, saveEmailConfig, resetTransporter, sendEmail } from "./src/services/emailService.ts";
import { googleDriveService } from "./src/services/googleDriveService.ts";
import { facebookService } from "./src/services/facebookService.ts";
import { Server } from "socket.io";
import { createServer } from "http";
import Stripe from 'stripe';

import { dbService, DbContext, keysToCamel, keysToSnake } from "./src/services/dbService.ts";
import { UserRole } from "./src/types.ts";

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
const isValidStripeKey = stripeSecretKey && (stripeSecretKey.startsWith('sk_') || stripeSecretKey.startsWith('rk_'));

if (stripeSecretKey && !isValidStripeKey) {
  console.warn('[STRIPE WARNING] A chave STRIPE_SECRET_KEY fornecida é inválida (deve começar com "sk_" ou "rk_"). O sistema entrará em modo de simulação.');
} else if (!stripeSecretKey) {
  console.info('[STRIPE INFO] STRIPE_SECRET_KEY não encontrada. Checkout em modo de simulação.');
}

const stripe = isValidStripeKey ? new Stripe(stripeSecretKey!) : null;

const APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || '';

// Plans definition matching user request
const PLANS = {
  plan1: {
    id: 'plan1',
    name: 'Plano 1',
    price: 147,
    maxMembers: 3,
    features: ['dashboard', 'finance', 'workflow', 'personalization', 'productivity', 'forms', 'support'],
    priceId: process.env.STRIPE_PLAN1_PRICE_ID || 'price_1QxX' // Placeholder
  },
  plan2: {
    id: 'plan2',
    name: 'Plano 2',
    price: 247,
    maxMembers: 8,
    features: ['dashboard', 'finance', 'workflow', 'personalization', 'productivity', 'forms', 'support', 'scheduler', 'google_drive'],
    priceId: process.env.STRIPE_PLAN2_PRICE_ID || 'price_1QxY' // Placeholder
  }
};

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
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      // Silence noisy source file requests in dev mode if they are successful
      const isSourceFile = req.url.startsWith('/src/') || req.url.includes('.tsx') || req.url.includes('.ts') || req.url.includes('.css');
      if (isSourceFile && res.statusCode < 400 && process.env.NODE_ENV !== "production") {
        return;
      }

      const duration = Date.now() - start;
      const referer = req.headers.referer ? ` [Ref: ${req.headers.referer}]` : '';
      console.log(`[REQUEST] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)${referer}`);
    });
    next();
  });
  console.log("[DEBUG] SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
  console.log("[DEBUG] SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  app.use(compression());
  app.set('trust proxy', 1);
  
  // CORS configurado para ser mais restrito
  app.use(cors({
    origin: process.env.APP_URL || "*", // Em produção, mude para o domínio real
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  // Helmet para cabeçalhos de segurança robustos
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // Sanitização XSS básica para o body das requisições
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const sensitiveFields = ['password', 'accessToken', 'tokens', 'config_value', 'videoUrl', 'mediaBase64'];
      const sanitize = (obj: any) => {
        Object.keys(obj).forEach(key => {
          if (sensitiveFields.includes(key)) return;
          if (typeof obj[key] === 'string') obj[key] = xss(obj[key]);
          else if (typeof obj[key] === 'object' && obj[key] !== null) sanitize(obj[key]);
        });
      };
      sanitize(req.body);
    }
    next();
  });

  // Rate Limiting global
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 5000, 
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Muitas requisições, por favor tente novamente mais tarde." }
  });
  app.use("/api", limiter);

  // Rate Limiting específico para rotas sensíveis
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    message: { error: "Muitas tentativas de login. Tente novamente em uma hora." }
  });
  app.use("/api/login", authLimiter);
  app.use("/api/signup", authLimiter);
  app.use("/api/forgot-password", authLimiter);

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

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));
  
  // Debug middleware for API
  app.use("/api", (req, res, next) => {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/public/stats", async (req, res) => {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error("[STATS API ERROR] Supabase error:", error);
        throw error;
      }
      console.log(`[STATS API] Total usuários encontrados: ${count}`);
      res.json({ totalUsers: count || 0 });
    } catch (err: any) {
      console.error("[STATS API ERROR] API caught error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Global Process Error Handlers
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise);
    if (reason instanceof Error) {
      console.error('[CRITICAL] Reason:', reason.message);
      console.error('[CRITICAL] Stack:', reason.stack);
    } else {
      console.error('[CRITICAL] Reason:', reason);
    }
  });
  process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
  if (pool) {
    console.log("[STARTUP] Conexão SQL Direta (PG Pool) configurada.");
    
    // Auto-migration for missing columns (Run in background to avoid blocking server boot)
    (async () => {
      try {
        console.log("[STARTUP] Verificando schema do banco de dados...");
        
        const migrationPromise = pool.query(`
          DO $$ 
          BEGIN
              -- 1. Check/Add ui_preferences to users
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ui_preferences') THEN
                  RAISE NOTICE 'Adicionando ui_preferences em users...';
                  ALTER TABLE public.users ADD COLUMN ui_preferences JSONB DEFAULT '{}'::jsonb;
              END IF;

              -- Add accepted_terms to users
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'accepted_terms') THEN
                  RAISE NOTICE 'Adicionando accepted_terms em users...';
                  ALTER TABLE public.users ADD COLUMN accepted_terms BOOLEAN DEFAULT FALSE;
              END IF;

              -- 6. Check/Add plan_id and stripe info to users
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'plan_id') THEN
                  RAISE NOTICE 'Adicionando plan_id em users...';
                  ALTER TABLE public.users ADD COLUMN plan_id TEXT DEFAULT 'plan1'; -- Default to plan1 for new owners
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_customer_id') THEN
                  RAISE NOTICE 'Adicionando stripe_customer_id em users...';
                  ALTER TABLE public.users ADD COLUMN stripe_customer_id TEXT;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_status') THEN
                  RAISE NOTICE 'Adicionando subscription_status em users...';
                  ALTER TABLE public.users ADD COLUMN subscription_status TEXT DEFAULT 'active'; 
              END IF;

              -- 2. Check/Add rejection_audio_url to video_orders
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_orders') THEN
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_orders' AND column_name = 'rejection_audio_url') THEN
                      RAISE NOTICE 'Adicionando rejection_audio_url em video_orders...';
                      ALTER TABLE public.video_orders ADD COLUMN rejection_audio_url TEXT;
                  END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_orders' AND column_name = 'demand_id') THEN
                      RAISE NOTICE 'Adicionando demand_id em video_orders...';
                      ALTER TABLE public.video_orders ADD COLUMN demand_id UUID;
                  END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_orders' AND column_name = 'rejection_notes') THEN
                      RAISE NOTICE 'Adicionando rejection_notes em video_orders...';
                      ALTER TABLE public.video_orders ADD COLUMN rejection_notes TEXT;
                  END IF;
              END IF;

              -- 3. Check/Create support_tickets
              IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
                  RAISE NOTICE 'Criando tabela support_tickets...';
                  CREATE TABLE public.support_tickets (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
                    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
                    subject TEXT,
                    description TEXT,
                    response TEXT,
                    priority TEXT DEFAULT 'normal',
                    status TEXT DEFAULT 'open',
                    owner_id UUID REFERENCES public.users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                  );
              ELSE
                  -- Ensure columns exist in support_tickets
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'partner_id') THEN
                      ALTER TABLE public.support_tickets ADD COLUMN partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE;
                  END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'description') THEN
                      ALTER TABLE public.support_tickets ADD COLUMN description TEXT;
                  END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'response') THEN
                      ALTER TABLE public.support_tickets ADD COLUMN response TEXT;
                  END IF;
              END IF;

              -- 3. Check/Add is_read to notifications and fix column name
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
                  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
                      RAISE NOTICE 'Renomeando read para is_read em notifications...';
                      ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
                  END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
                      ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
                  END IF;
              END IF;

              -- 4. Check/Create system_configs
              IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_configs') THEN
                  RAISE NOTICE 'Criando tabela system_configs...';
                  CREATE TABLE public.system_configs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
                    config_key TEXT NOT NULL,
                    config_value JSONB,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(owner_id, config_key)
                  );
              END IF;

              -- 5. Check/Create form_integrations
              IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_integrations') THEN
                  RAISE NOTICE 'Criando tabela form_integrations...';
                  CREATE TABLE public.form_integrations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    fields JSONB DEFAULT '[]'::jsonb,
                    success_message TEXT,
                    redirect_url TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                  );
              END IF;

              -- 6. Reload PostgREST schema cache
          END $$;
        `);

        await Promise.race([
          migrationPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Database migration timeout")), 15000))
        ]).catch(err => console.warn("[STARTUP] Alerta Mãos-à-obra: Migração demorando mais que o esperado ou falhou:", err.message));
        
        console.log("[STARTUP] Hotpatch de schema concluída.");

        // Migration: Hash existing plain-text passwords
        try {
          console.log("[STARTUP] Verificando usuários com senhas em texto plano...");
          const { data: users, error } = await supabase.from('users').select('id, password');
          if (error) throw error;

          if (users && users.length > 0) {
            let updatedCount = 0;
            for (const user of users) {
              const pwd = user.password;
              const isHashed = typeof pwd === 'string' && /^\$2[aby]\$\d+\$/.test(pwd.substring(0, 10));

              if (!isHashed && pwd) {
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(pwd, saltRounds);
                await supabase.from('users').update({ password: hashedPassword }).eq('id', user.id);
                updatedCount++;
              }
            }
            if (updatedCount > 0) console.log(`[MIGRATION] ${updatedCount} senhas foram criptografadas.`);
          }
        } catch (migrationErr: any) {
          console.error("[STARTUP] Erro na migração de senhas:", migrationErr.message);
        }
      } catch (err) {
        console.error("[STARTUP] Falha não fatal no hotpatch:", err);
      }
    })();
  } else {
    console.warn("[STARTUP] DATABASE_URL não encontrada. SQL Editor não funcionará.");
  }

  // --- Socket.io Meeting Logic ---
  const meetingRequests = new Map<string, any[]>();
  
  const emitDataChange = (ownerId: string, table: string, type: 'insert' | 'update' | 'delete', data?: any) => {
    if (!ownerId) return;
    io.to(`owner:${ownerId}`).emit("data_changed", { table, type, data });
  };

  io.on("connection", (socket) => {
    console.log(`[SOCKET] Cliente conectado: ${socket.id}`);
    
    socket.on("join-owner-room", (ownerId) => {
      if (ownerId) {
        const room = `owner:${ownerId}`;
        socket.join(room);
        console.log(`[SOCKET] Cliente ${socket.id} entrou na sala da agência: ${room}`);
      }
    });

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
    user?: { 
      id: string; 
      role: UserRole; 
      ownerId: string; 
      planId?: string;
      subscriptionStatus?: string;
    };
  }

  // --- Auth Middleware ---
  const userCache = new Map<string, { user: any, timestamp: number }>();
  const AUTH_CACHE_TTL = 30000; // 30 seconds cache for user info
  
  // Generic GET response cache
  const getCache = new Map<string, { data: any, timestamp: number }>();
  const GET_CACHE_TTL = 30000; // 30 seconds cache for generic data

  const authMiddleware = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    const publicPaths = ["/api/login", "/api/signup", "/api/forgot-password", "/api/health", "/api/health/supabase", "/env-config.js", "/api/facebook/callback", "/api/google/callback", "/api/forms/submit", "/api/support-tickets", "/api/create-anonymous-checkout", "/api/stripe-webhook"];
    
    // Check if path is public - handle both originalUrl and relative path
    const isPublic = publicPaths.some(p => 
      req.originalUrl === p || 
      req.originalUrl.startsWith(p + "?") ||
      req.originalUrl.startsWith(p + "/") ||
      req.path === p.replace('/api', '') ||
      req.path.startsWith(p.replace('/api', '') + "/")
    );
    
    if (isPublic) return next();

    // Allow GET access to specific orders for guests (DesignModificationForm)
    const isPublicGet = req.method === 'GET' && (
      req.path.includes('/art-orders/') || 
      req.path.includes('/video-orders/') ||
      req.path.includes('/users/') ||
      req.path.includes('/clients/')
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
    } else {
      try {
        // Decode JWT locally first (much faster, no rate limit)
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userData = { 
          id: decoded.id, 
          role: decoded.role, 
          ownerId: decoded.ownerId,
          planId: decoded.planId,
          subscriptionStatus: decoded.subscriptionStatus 
        };
        
        // Cache and proceed
        userCache.set(token, { user: userData, timestamp: Date.now() });
        req.user = userData;
      } catch (err) {
        return res.status(401).json({ error: "Sessão inválida ou expirada" });
      }
    }

    // BLOCK access if subscription is inactive, UNLESS it's a checkout related route or user-notifications
    const allowedForInactive = ["/api/create-checkout-session", "/api/user-notifications", "/api/sync"];
    const isAllowedForInactive = allowedForInactive.some(p => req.originalUrl.startsWith(p));

    if (req.user?.subscriptionStatus === 'inactive' && !isAllowedForInactive && req.method !== 'GET') {
      return res.status(403).json({ 
        error: "Assinatura pendente", 
        message: "Sua assinatura não está ativa. Por favor, complete o pagamento para acessar este recurso.",
        code: "SUBSCRIPTION_REQUIRED"
      });
    }

    next();
    
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

  // --- SOCIAL MEDIA SCHEDULER API ---
  app.get("/api/social-accounts", async (req: AuthRequest, res) => {
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('owner_id', req.user!.ownerId);
      if (error) throw error;
      res.json(keysToCamel(data));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/social-posts", async (req: AuthRequest, res) => {
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*, post_media(*), post_schedules(*)')
        .eq('owner_id', req.user!.ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json(keysToCamel(data));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/social-posts", async (req: AuthRequest, res) => {
    try {
      const { client_id, content, external_link, hashtags, media, schedules } = req.body;
      
      // 1. Create Post
      const { data: post, error: postError } = await supabase
        .from('social_posts')
        .insert({
          owner_id: req.user!.ownerId,
          client_id,
          content,
          external_link,
          hashtags,
          status: (schedules && schedules.length > 0) ? 'scheduled' : 'draft'
        })
        .select()
        .single();
      
      if (postError) throw postError;

      // 2. Add Media
      if (media && media.length > 0) {
        const mediaToInsert = media.map((m: any) => ({
          post_id: post.id,
          media_url: m.media_url,
          media_type: m.media_type || 'image',
          format: m.format || 'feed'
        }));
        await supabase.from('post_media').insert(mediaToInsert);
      }

      // 3. Add Schedules
      if (schedules && schedules.length > 0) {
        const schedulesToInsert = schedules.map((s: any) => ({
          post_id: post.id,
          social_account_id: s.social_account_id,
          scheduled_at: s.scheduled_at,
          status: 'scheduled'
        }));
        await supabase.from('post_schedules').insert(schedulesToInsert);
      }

      res.json(keysToCamel(post));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/social-posts/:id", async (req: AuthRequest, res) => {
    try {
      const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', req.params.id)
        .eq('owner_id', req.user!.ownerId);
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/social-posts/:id/reschedule", async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { scheduled_at } = req.body;

      if (!scheduled_at) return res.status(400).json({ error: "scheduled_at is required" });

      // Update all pending schedules for this post
      const { error } = await supabase
        .from('post_schedules')
        .update({ scheduled_at: new Date(scheduled_at).toISOString() })
        .eq('post_id', id)
        .eq('status', 'scheduled');

      if (error) throw error;

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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

  app.post("/api/ocr/process-receipt", upload.single('file'), async (req, res) => {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
      try {
          const text = await ocrService.processReceipt(req.file.path);
          const context = getContext(req as AuthRequest);
          if (!context) return res.status(401).json({ error: "Contexto de usuário não encontrado" });

          const result = await ocrService.identifyClientAndMarkAsPaid(text, context);
          res.json({ success: true, text, ...result });
      } catch (err: any) {
          res.status(500).json({ error: err.message });
      }
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
    if (!req.user) return undefined;
    
    return {
      userId: req.user.id,
      userRole: req.user.role,
      ownerId: req.user.ownerId,
      planId: req.user.planId,
      subscriptionStatus: req.user.subscriptionStatus
    } as any;
  };
  
  const supabaseCrud = (pathName: string, tableName: string) => {
    app.get(`/api/${pathName}`, async (req, res) => {
      console.log(`[DEBUG] Received request for /api/${pathName}`);
      const context = getContext(req);
      const cacheKey = `${tableName}-${context?.userId || 'GUEST'}-${JSON.stringify(req.query)}`;
      const cached = getCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < GET_CACHE_TTL)) {
        return res.json(cached.data);
      }

      try { 
        const result = await dbService.list(tableName, context);
        console.log(`[DEBUG] Result of dbService.list for ${tableName}:`, result);
        getCache.set(cacheKey, { data: result, timestamp: Date.now() });
        res.json(result); 
      }
      catch (error: any) { 
        console.error(`[ERROR] dbService.list for ${tableName} failed:`, error);
        res.status(500).json({ error: error.message }); 
      }
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
        
        const data = { ...req.body };

        // Plan limits check for team members
        if (tableName === 'users' && context?.ownerId) {
          const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('owner_id', context.ownerId);
          const planId = (context as any).planId || 'plan1';
          const plan = PLANS[planId as keyof typeof PLANS] || PLANS.plan1;
          
          if (count !== null && count >= plan.maxMembers) {
            return res.status(403).json({ error: `Limite de membros atingido para seu plano (${plan.maxMembers} membros). Faça upgrade para adicionar mais.` });
          }
        }

        if (tableName === 'users' && data.password) {
          data.password = await bcrypt.hash(data.password, 10);
        }
        
        const response = await dbService.insert(tableName, data, context);
        if (context?.ownerId) {
          emitDataChange(context.ownerId, tableName, 'insert', response);
        }
        res.json(response); 
      }
      catch (error: any) { res.status(500).json({ error: error.message }); }
    });
    app.put(`/api/${pathName}/:id`, async (req, res) => {
      try { 
        // Invalidate cache
        for (const key of getCache.keys()) {
          if (key.startsWith(tableName)) getCache.delete(key);
        }
        
        const data = { ...req.body };
        if (tableName === 'users' && data.password) {
          data.password = await bcrypt.hash(data.password, 10);
        }
        
        const response = await dbService.update(tableName, req.params.id, data, getContext(req)); 
        const context = getContext(req);
        if (context?.ownerId) {
          emitDataChange(context.ownerId, tableName, 'update', response);
        }
        res.json(response); 
      }
      catch (error: any) { res.status(500).json({ error: error.message }); }
    });
    app.delete(`/api/${pathName}/:id`, async (req, res) => {
      try { 
        // Invalidate cache
        for (const key of getCache.keys()) {
          if (key.startsWith(tableName)) getCache.delete(key);
        }
        const result = await dbService.delete(tableName, req.params.id, getContext(req)); 
        const context = getContext(req);
        if (context?.ownerId) {
          emitDataChange(context.ownerId, tableName, 'delete', { id: req.params.id });
        }
        res.json(result); 
      }
      catch (error: any) { res.status(500).json({ error: error.message }); }
    });
  };

  // --- Combined Sync Endpoint ---
  app.get("/api/sync", async (req: AuthRequest, res) => {
    console.log(`[SYNC] Request received from user: ${req.user?.id || 'GUEST'}`);
    try {
      const context = getContext(req);
      if (!context) {
        console.warn("[SYNC] No context found for request");
        return res.status(401).json({ error: "Não autorizado" });
      }

      const safeList = async (table: string) => {
        try {
          return await dbService.list(table, context);
        } catch (err: any) {
          console.error(`[SYNC ERROR] Failed to load table: ${table}`, err.message);
          return [];
        }
      };

      const [
        leads, clients, receivables, artOrders, partners, 
        usersRaw, partnerRequests, tickets, videoOrders, demandTasks, notifications
      ] = await Promise.all([
        safeList('leads'),
        safeList('clients'),
        safeList('receivables'),
        safeList('art_orders'),
        safeList('partners'),
        safeList('users'),
        safeList('partner_requests'),
        safeList('support_tickets'),
        safeList('video_orders'),
        safeList('demand_tasks'),
        safeList('notifications')
      ]);

      const results = {
        leads, clients, receivables, artOrders, partners,
        users: usersRaw?.map((u: any) => {
          const { password, ...safeUser } = u;
          return safeUser;
        }),
        partnerRequests, tickets, videoOrders, demandTasks, notifications
      };

      res.json(results);
    } catch (err: any) {
      console.error("[SYNC CRITICAL ERROR]", err);
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
    
    if (context.ownerId) {
      emitDataChange(context.ownerId, 'chat_messages', 'insert', newMessage);
    }
    
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
      const context = getContext(req);
      if (context?.ownerId) {
        emitDataChange(context.ownerId, 'art_orders', 'update', updated);
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
      const result = await dbService.update('video_orders', id, updates, context);
      if (context?.ownerId) {
        emitDataChange(context.ownerId, 'video_orders', 'update', result);
      }
      res.json(result);
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
          const newOrder = await dbService.insert('video_orders', {
            title: `Edição: ${updatedTask.title || updatedTask.observations || 'Sem título'}`,
            clientId: updatedTask.clientId,
            editorId: updatedTask.editorId || client.demandConfig?.defaultEditorId || '',
            deadline: updatedTask.postDate || 'Imediato',
            priority: 'high', progress: 0, status: 'queue'
          }, getContext(req));
          if (getContext(req)?.ownerId) {
            emitDataChange(getContext(req)!.ownerId!, 'video_orders', 'insert', newOrder);
          }
        }
      }
      if (['done', 'finished'].includes(updates.status)) {
        writeChats(readChats().filter(c => c.referenceId !== id));
      }
      if (getContext(req)?.ownerId) {
        emitDataChange(getContext(req)!.ownerId!, 'demand_tasks', 'update', updatedTask);
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
      if (!userRaw) return res.status(401).json({ error: "Credenciais inválidas" });
      
      const user = keysToCamel(userRaw);
      let isMatch = false;
      
      // Verifica se a senha armazenada parece um hash bcrypt ($2a$..., $2b$..., $2y$...)
      const isStoredHashed = typeof user.password === 'string' && /^\$2[aby]\$\d+\$/.test(user.password.substring(0, 10));

      if (isStoredHashed) {
        // Se já é hash, usamos obrigatoriamente o bcrypt
        try {
          isMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
          isMatch = false;
        }
      } else {
        // Se ainda for texto puro (usuário antigo), comparamos e migramos na hora
        if (password === user.password) {
          isMatch = true;
          console.info(`[AUTH] Migrando senha em texto puro para hash: ${user.email}`);
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(password, saltRounds);
          await supabase.from('users').update({ password: hashedPassword }).eq('id', user.id);
        }
      }
      
      if (!isMatch) return res.status(401).json({ error: "Credenciais inválidas" });
      
      let planId = user.planId;
      let subscriptionStatus = user.subscriptionStatus;
      
      // If not OWNER, fetch owner's plan
      if (user.role !== 'OWNER' && user.ownerId) {
        const { data: owner } = await supabase.from('users').select('plan_id, subscription_status').eq('id', user.ownerId).maybeSingle();
        if (owner) {
          planId = owner.plan_id;
          subscriptionStatus = owner.subscription_status;
        }
      }
      
      const tokenPayload = { 
        id: user.id, 
        role: user.role, 
        ownerId: user.ownerId || user.id,
        planId: planId || 'plan1',
        subscriptionStatus: subscriptionStatus || 'active'
      };
      
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...userSafe } = user;
      res.json({ success: true, user: userSafe, token });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/signup", async (req, res) => {
    let { name, email, password, acceptedTerms, accepted_terms, sessionId, planId: reqPlanId } = req.body;
    const finalAcceptedTerms = acceptedTerms !== undefined ? acceptedTerms : accepted_terms;
    email = email.trim().toLowerCase();
    
    let stripeCustomerId = null;
    let planId = reqPlanId || 'plan1';
    let subscriptionStatus = 'inactive';

    // Mandatory paywall check if Stripe is enabled
    if (isValidStripeKey && !sessionId) {
      return res.status(402).json({ error: "É necessário concluir o pagamento antes de criar sua conta." });
    }

    if (sessionId) {
      if (stripe) {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.payment_status === 'paid') {
            stripeCustomerId = session.customer as string;
            planId = session.metadata?.planId || planId;
            subscriptionStatus = 'active';
          } else {
            return res.status(402).json({ error: "O pagamento desta sessão ainda não foi confirmado." });
          }
        } catch (err) {
          console.warn("[SIGNUP] Erro ao verificar sessão Stripe:", err);
          return res.status(400).json({ error: "Sessão de pagamento inválida ou expirada." });
        }
      } else if (sessionId.startsWith('test_dev_')) {
        subscriptionStatus = 'active';
      }
    }

    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      const { data: userRaw, error: insertError } = await supabase.from('users').insert(keysToSnake({ 
        name, 
        email, 
        password: hashedPassword, 
        role: 'OWNER',
        acceptedTerms: finalAcceptedTerms,
        stripeCustomerId,
        planId,
        subscriptionStatus
      })).select().single();
      
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
      const saltRounds = 10;
      const hashedTempPassword = await bcrypt.hash(tempPassword, saltRounds);
      
      await dbService.update('users', userFound.id, { password: hashedTempPassword });
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

  app.post("/api/prospecting/maps-playwright", async (req, res) => {
    const { query, location } = req.body;
    try { 
      let leads = await playwrightMapsScraper.scrapeGoogleMaps(query, location);
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

  // --- Form Integration Routes ---
  app.get("/api/forms", async (req: AuthRequest, res) => {
    const ownerId = req.user?.ownerId || req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Não autorizado" });
    try {
      const result = await dbService.list('form_integrations', { userId: req.user!.id, userRole: req.user!.role, ownerId });
      res.json(result);
    } catch (err: any) {
      console.error("[API] Erro ao listar formulários:", err);
      res.status(500).json({ error: err.message, details: "Verifique se a tabela form_integrations existe no banco de dados." });
    }
  });

  app.post("/api/forms", async (req: AuthRequest, res) => {
    const ownerId = req.user?.ownerId || req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Não autorizado" });
    const { id, ...data } = req.body;
    const form = { ...data, owner_id: ownerId };
    try {
      if (id) {
        await dbService.update('form_integrations', id, form, { userId: req.user!.id, userRole: req.user!.role, ownerId });
        res.json({ success: true, id });
      } else {
        const newForm = await dbService.insert('form_integrations', form, { userId: req.user!.id, userRole: req.user!.role, ownerId });
        res.json({ success: true, id: newForm.id });
      }
    } catch (err: any) { 
      console.error("[API] Erro ao salvar formulário:", err);
      res.status(500).json({ error: err.message }); 
    }
  });

  app.delete("/api/forms/:id", async (req: AuthRequest, res) => {
    const ownerId = req.user?.ownerId || req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Não autorizado" });
    try {
      await dbService.delete('form_integrations', req.params.id, { userId: req.user!.id, userRole: req.user!.role, ownerId });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/forms/submit/:formId", async (req, res) => {
    const { formId } = req.params;
    const body = req.body;
    console.log(`[FORM] Submissão recebida para form ${formId}:`, body);

    try {
      // 1. Fetch form config
      const { data: form, error } = await supabase.from('form_integrations').select('*').eq('id', formId).single();
      if (error || !form) {
        console.error(`[FORM] Erro ao buscar form ${formId}:`, error);
        return res.status(404).json({ error: "Formulário não encontrado" });
      }

      // 2. Create lead mapping
      const standardFields = ['contact_name', 'name', 'full_name', 'email', 'phone', 'company', 'message', 'notes', 'source'];
      const customData: string[] = [];
      
      Object.entries(body).forEach(([key, value]) => {
        if (!standardFields.includes(key)) {
          customData.push(`${key}: ${value}`);
        }
      });

      const lead = {
        company: body.company || body.empresa || "Capturado via Formulário",
        contact_name: body.contact_name || body.name || body.full_name || body.nome || "N/A",
        email: body.email || "N/A",
        phone: body.phone || body.telefone || body.whatsapp || "N/A",
        source: body.source || `Formulário: ${form.name}`,
        notes: (body.message || body.mensagem || body.notes || "") + 
               (customData.length > 0 ? "\n\nCampos Extras:\n" + customData.join("\n") : ""),
        status: 'prospect',
        owner_id: form.owner_id,
        last_contact: new Date().toLocaleDateString('pt-BR'),
        estimated_value: 0
      };

      console.log(`[FORM] Criando lead para form ${form.name}:`, lead);
      const newLead = await dbService.insert('leads', lead, { userId: lead.owner_id, userRole: 'OWNER', ownerId: lead.owner_id });
      if (form.owner_id) {
        emitDataChange(form.owner_id, 'leads', 'insert', newLead);
      }

      const isJson = req.headers['content-type'] === 'application/json' || req.headers['accept']?.includes('application/json');

      if (isJson) {
        return res.json({ success: true, message: form.success_message, redirect: form.redirect_url });
      }

      if (form.redirect_url) {
        return res.redirect(form.redirect_url);
      }

      res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 40px; border-radius: 24px; shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; max-width: 400px; width: 100%;">
            <div style="color: #4f46e5; margin-bottom: 20px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h2 style="margin: 0 0 10px 0; color: #0f172a;">${form.success_message || "Recebemos sua mensagem!"}</h2>
            <p style="color: #64748b; margin: 0;">Obrigado pelo contato. Em breve nossa equipe falará com você.</p>
            <button onclick="window.history.back()" style="margin-top: 30px; padding: 12px 24px; background: #4f46e5; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">Voltar</button>
          </div>
        </div>
      `);
    } catch (err: any) {
      console.error("[FORM] Erro crítico na submissão do formulário:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/facebook/publish", async (req: AuthRequest, res) => {
    try {
      const { clientId, networks, content, mediaUrl, scheduledTimeUnix, selectedPageId, selectedIgAccountId } = req.body;
      const results = await facebookService.publishPost(clientId, networks, content, mediaUrl, scheduledTimeUnix, selectedPageId, selectedIgAccountId);
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

  app.post("/api/facebook/disconnect-all", async (req: AuthRequest, res) => {
    const ownerId = req.user?.ownerId || req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Não autorizado" });
    try {
      await facebookService.disconnectAll(ownerId);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/auth/account", async (req: AuthRequest, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Não autorizado" });
    try {
      // Se for OWNER, deletamos a agência toda? O usuário pediu deletar a conta.
      // Vou focar em deletar o usuário. O ON DELETE CASCADE deve fazer o resto se o schema estiver correto.
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      res.json({ success: true, message: "Conta excluída com sucesso." });
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

  // --- Stripe Endpoints ---
  app.post("/api/create-anonymous-checkout", async (req, res) => {
    try {
      const planId = req.body.planId || req.body.plan_id;
      const plan = PLANS[planId as keyof typeof PLANS];
      if (!plan) return res.status(400).json({ error: "Plano inválido" });

      const origin = req.headers.origin || APP_URL || `${req.protocol}://${req.get('host')}`;

      if (!stripe) {
        console.warn("[STRIPE] Stripe não configurado. Simulando checkout anônimo para o plano:", planId);
        return res.json({ url: `${origin}/signup?session_id=test_dev_${Date.now()}&plan_id=${planId}&test=true` });
      }

      console.log(`[STRIPE] Criando sessão de checkout anônima para o plano: ${planId}`);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: plan.priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${origin}/signup?session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}`,
        cancel_url: `${origin}/`,
        metadata: { planId }
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[STRIPE ERROR ANONYMOUS]", err);
      if (err.type === 'StripeAuthenticationError') {
        return res.status(401).json({ error: "Configuração do Stripe inválida (Chave API). Por favor, verifique as variáveis de ambiente." });
      }
      res.status(500).json({ error: "Erro ao processar pagamento: " + (err.message || "Unknown error") });
    }
  });

  app.post("/api/create-checkout-session", async (req: AuthRequest, res) => {
    try {
      const context = getContext(req);
      if (!context) return res.status(401).json({ error: "Não autorizado" });
      
      const planId = req.body.planId || req.body.plan_id;
      const plan = PLANS[planId as keyof typeof PLANS];
      if (!plan) return res.status(400).json({ error: "Plano inválido" });

      const origin = req.headers.origin || APP_URL || `${req.protocol}://${req.get('host')}`;

      if (!stripe) {
        console.warn("[STRIPE] Stripe não configurado. Simulando checkout para usuário logado:", context.userId);
        // Em desenvolvimento sem chave Stripe, apenas atualizamos o plano
        await supabase.from('users').update({ 
          plan_id: planId, 
          subscription_status: 'active' 
        }).eq('id', context.userId);
        return res.json({ url: `${origin}/dashboard?success=true` });
      }

      console.log(`[STRIPE] Criando sessão de checkout para usuário: ${context.userId}, plano: ${planId}`);
      // Get or create customer
      const { data: userRaw } = await supabase.from('users').select('stripe_customer_id, email, name').eq('id', context.userId).single();
      const user = keysToCamel(userRaw);
      let customerId = user?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email,
          name: user?.name,
          metadata: { userId: context.userId }
        });
        customerId = customer.id;
        await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', context.userId);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: plan.priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel`,
        metadata: { userId: context.userId, planId }
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[STRIPE ERROR AUTH]", err);
      if (err.type === 'StripeAuthenticationError') {
        return res.status(401).json({ error: "Configuração do Stripe inválida (Chave API). Por favor, verifique as variáveis de ambiente." });
      }
      res.status(500).json({ error: "Erro ao processar pagamento: " + (err.message || "Unknown error") });
    }
  });

  app.post("/api/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Webhook secret not set");
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.warn(`[STRIPE WEBHOOK ERROR] ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[STRIPE WEBHOOK] Evento recebido: ${event.type}`);

    if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
      const session = event.data.object as any;
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      
      if (userId && planId) {
        await supabase.from('users').update({ 
          plan_id: planId, 
          subscription_status: 'active' 
        }).eq('id', userId);
        console.log(`[STRIPE WEBHOOK] Plano atualizado para o usuário ${userId}: ${planId}`);
      }
    }

    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;
      
      const status = subscription.status === 'active' ? 'active' : 'inactive';
      
      await supabase.from('users').update({ 
        subscription_status: status 
      }).eq('stripe_customer_id', customerId);
    }

    res.json({received: true});
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
    ["demand-tasks", "demand_tasks"], 
    ["partners", "partners"], ["partner-requests", "partner_requests"], 
    ["support-tickets", "support_tickets"], ["art-orders", "art_orders"],
    ["prospecting/lists", "prospecting_lists"], ["prospecting/leads", "prospecting_leads"], 
    ["prospecting/campaigns", "campaigns"], ["client-documents", "client_documents"]
  ];
  crudPaths.forEach(([p, t]) => {
    if (p === 'support-tickets') {
      app.post(`/api/${p}`, async (req, res) => {
        try {
          const context = getContext(req as AuthRequest);
          const ticket = { ...req.body };
          
          // If no ownerId in context (unauthenticated), try to find the owner from the partnerId or just default to a system owner
          let effectiveOwnerId = context?.ownerId;
          if (!effectiveOwnerId) {
             // Try to find an owner if we have some info, or just find the first owner in the DB
             const { data: owners } = await supabase.from('users').select('id').eq('role', 'OWNER').limit(1);
             effectiveOwnerId = owners?.[0]?.id;
          }

          const created = await dbService.insert('support_tickets', ticket, context || { userId: 'SYSTEM', userRole: 'GUEST', ownerId: effectiveOwnerId } as any);
          
          // Notify Admins and Owners
          const ownerId = effectiveOwnerId || (created as any).ownerId;
          if (ownerId) {
            const { data: teamMembers } = await supabase.from('users').select('id, role').eq('owner_id', ownerId);
            const admins = teamMembers?.filter(u => u.role === 'ADMIN' || u.role === 'OWNER') || [];
            
            for (const admin of admins) {
              await dbService.insert('notifications', {
                userId: admin.id,
                title: (ticket.partnerId && ticket.partnerId !== 'system') ? 'Novo Ticket de Suporte' : 'Erro de Sistema Reportado',
                message: `Assunto: ${ticket.subject}`,
                type: 'ticket',
                isRead: false,
                createdAt: new Date().toISOString()
              }, { userId: 'SYSTEM', userRole: 'OWNER' as any, ownerId });

              // Also try to send email if admin has email
              try {
                const adminData = await dbService.getById('users', admin.id, { userId: 'SYSTEM', userRole: 'OWNER' as any, ownerId });
                if (adminData && adminData.email) {
                  await sendEmail(ownerId, adminData.email, 
                    ticket.partnerId ? 'Novo Ticket de Suporte' : 'Alerta de Erro de Sistema',
                    `Um novo ticket foi aberto.\nAssunto: ${ticket.subject}\nDescrição: ${ticket.description}`
                  );
                }
              } catch (emailErr) {
                console.error("[ERROR] Falha ao enviar e-mail de notificação de ticket:", emailErr);
              }
            }
          }
          
          res.json(created);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
      });
    }
    supabaseCrud(p, t);
  });

  supabaseCrud("user-notifications", "notifications");

  app.post("/api/admin/sql", async (req, res) => {
    try {
      const context = getContext(req as AuthRequest);
      if (!context || (context.userRole !== 'OWNER' && context.userRole !== 'ADMIN')) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem executar SQL." });
      }

      const { query } = req.body;
      if (!query) return res.status(400).json({ error: "Query não fornecida." });

      if (!pool) {
        return res.status(500).json({ error: "Conexão direta com banco de dados (DATABASE_URL) não configurada." });
      }

      console.log(`[SQL EXEC] By ${context.userId}: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);
      const result = await pool.query(query);
      res.json({
        command: result.command,
        rowCount: result.rowCount,
        rows: result.rows,
        fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID }))
      });
    } catch (error: any) {
      console.error("[SQL ERROR]", error);
      res.status(500).json({ error: error.message });
    }
  });

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
    console.log("[CHAT] Limpeza programada (24h)...");
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const chats = readChats();
    const filtered = chats.filter((c: any) => c.chatType !== 'team' || new Date(c.createdAt) > oneDayAgo);
    writeChats(filtered);
  }, 1000 * 60 * 60); // Limpeza a cada hora

  // --- VITE / STATIC ---
  if (process.env.NODE_ENV !== "production") {
    console.log("[STARTUP] Modo Desenvolvimento: Ativando Vite Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ 
      server: { middlewareMode: true }, 
      appType: "spa" 
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`[STARTUP] Modo Produção: Servindo arquivos de ${distPath}`);
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, {
        maxAge: '1d',
        index: false // We'll handle index with the catch-all to avoid confusion
      }));
      
      app.get('/privacy', (req, res) => {
        res.sendFile(path.join(process.cwd(), "public", "privacy.html"));
      });
      
      app.get("*", (req, res, next) => {
        // Se for uma rota de API, deixa passar para o handler de 404 de API
        if (req.path.startsWith('/api')) return next();
        
        // Se for um pedido de arquivo (com extensão) que não foi encontrado pelo express.static
        // não devemos servir o index.html, mas sim um 404 real.
        if (req.path.includes('.') && !req.path.endsWith('.html')) {
          return res.status(404).end();
        }

        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Aplicação não encontrada (Build faltando).");
        }
      });
    } else {
      console.error("[CRITICAL] Diretório 'dist' não encontrado em modo produção!");
      app.get("*", (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: "API não encontrada" });
        res.status(500).send("Erro de Configuração: Build de produção não encontrado.");
      });
    }
  }

  // Background Worker for Social Posts
  const processSocialSchedules = async () => {
    try {
      const now = new Date().toISOString();
      const { data: pendingSchedules, error } = await supabase
        .from('post_schedules')
        .select('*, social_posts(*), social_accounts(*)')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now)
        .limit(10);

      if (error) {
        console.error("[WORKER] Erro ao buscar agendamentos:", error);
        return;
      }

      if (!pendingSchedules || pendingSchedules.length === 0) return;

      console.log(`[WORKER] Processando ${pendingSchedules.length} agendamentos sociais...`);

      for (const schedule of pendingSchedules) {
        try {
          const postText = schedule.social_posts;
          const account = schedule.social_accounts;
          
          // Get media
          const { data: media } = await supabase
            .from('post_media')
            .select('*')
            .eq('post_id', schedule.post_id);

          const result = await facebookService.publishToSpecificAccount(
            account,
            postText.content,
            media && media.length > 0 ? media[0].media_url : undefined
          );

          if (result.success) {
            await supabase.from('post_schedules').update({
              status: 'published',
              published_at: new Date().toISOString(),
              api_response: result.data
            }).eq('id', schedule.id);

            // Update main post status if all schedules are done
            const { data: remaining } = await supabase
              .from('post_schedules')
              .select('id')
              .eq('post_id', schedule.post_id)
              .eq('status', 'scheduled');
            
            if (!remaining || remaining.length === 0) {
              await supabase.from('social_posts').update({ status: 'published' }).eq('id', schedule.post_id);
            }

            await supabase.from('social_post_logs').insert({
              post_id: schedule.post_id,
              schedule_id: schedule.id,
              owner_id: postText.owner_id,
              action: 'publish_success',
              details: `Publicado com sucesso no ${account.platform}: ${account.platform_account_name}`,
              status: 'success'
            });
          } else {
            throw new Error(result.error);
          }
        } catch (postErr: any) {
          console.error(`[WORKER] Erro ao publicar post ${schedule.post_id}:`, postErr);
          
          const retryCount = (schedule.retry_count || 0) + 1;
          const status = retryCount >= 3 ? 'failed' : 'scheduled';
          
          await supabase.from('post_schedules').update({
            status,
            retry_count: retryCount,
            error_message: postErr.message
          }).eq('id', schedule.id);

          if (status === 'failed') {
            await supabase.from('social_posts').update({ status: 'failed' }).eq('id', schedule.post_id);
          }

          await supabase.from('social_post_logs').insert({
            post_id: schedule.post_id,
            schedule_id: schedule.id,
            owner_id: schedule.social_posts.owner_id,
            action: 'publish_error',
            details: `Erro ao publicar: ${postErr.message}`,
            status: 'error'
          });
        }
      }
    } catch (err) {
      console.error("[WORKER] Erro crítico no worker social:", err);
    }
  };

  // Run worker every minute
  cron.schedule("* * * * *", processSocialSchedules);

  httpServer.listen(Number(PORT), "0.0.0.0", () => console.log(`🚀 Server on ${PORT}`));
}

startServer().catch(err => {
  console.error("[FATAL ERROR] Server failed to start:", err);
  process.exit(1);
});
