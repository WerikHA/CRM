import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import fs from "fs";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database Pool Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://agency_admin:agency_secure_password@45.167.187.80:5432/agencyflow_db",
  connectionTimeoutMillis: 10000, // Increased timeout for external server
});

// Mock database fallback for environments without Postgres (like AI Studio preview)
let useFallback = false;
const mockData: any = {
  users: [],
  partners: [],
  clients: [],
  leads: [],
  art_orders: [],
  receivables: [],
  partner_requests: []
};

async function initDb(retries = 5) {
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
      console.error(`❌ Erro ao conectar ao banco de dados (${5 - retries}/5):`, (err as Error).message);
      if (retries === 0) {
        console.warn("⚠️ Usando fallback em memória para desenvolvimento...");
        useFallback = true;
      } else {
        console.log("Retentando em 3 segundos...");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Database
  await initDb();

  // --- API ROUTES ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "AgencyFlow API is active" });
  });

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      if (useFallback) return res.json(mockData.users);
      const result = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Leads
  app.get("/api/leads", async (req, res) => {
    try {
      if (useFallback) return res.json(mockData.leads);
      const result = await pool.query("SELECT * FROM leads ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/leads", async (req, res) => {
    const { id, company, contact_name, email, phone, source, notes, status, estimated_value, last_contact } = req.body;
    try {
      if (useFallback) {
        const newLead = { id, company, contact_name, email, phone, source, notes, status, estimated_value, last_contact, created_at: new Date() };
        mockData.leads.push(newLead);
        return res.json(newLead);
      }
      const result = await pool.query(
        "INSERT INTO leads (id, company, contact_name, email, phone, source, notes, status, estimated_value, last_contact) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
        [id, company, contact_name, email, phone, source, notes, status, estimated_value, last_contact]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    try {
      if (useFallback) return res.json(mockData.clients);
      const result = await pool.query("SELECT * FROM clients ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Finance / Receivables
  app.get("/api/receivables", async (req, res) => {
    try {
      if (useFallback) return res.json(mockData.receivables);
      const result = await pool.query("SELECT * FROM receivables ORDER BY due_date ASC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Art Orders
  app.get("/api/art-orders", async (req, res) => {
    try {
      if (useFallback) return res.json(mockData.art_orders);
      const result = await pool.query("SELECT * FROM art_orders ORDER BY deadline ASC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Partners
  app.get("/api/partners", async (req, res) => {
    try {
      if (useFallback) return res.json(mockData.partners);
      const result = await pool.query("SELECT * FROM partners ORDER BY name ASC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
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
