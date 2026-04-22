import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database Pool Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/agencyflow",
  ssl: process.env.NODE_ENV === "production" ? false : false, // Adjust if using managed postgres (e.g. RDS)
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Test Database Connection
  try {
    const client = await pool.connect();
    console.log("✅ Conectado ao banco de dados PostgreSQL");
    client.release();
  } catch (err) {
    console.error("❌ Erro ao conectar ao banco de dados:", err);
  }

  // API placeholders - logic can be expanded here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "AgencyFlow API is active" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
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
