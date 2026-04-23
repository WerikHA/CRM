
import cron from 'node-cron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

export function startBackupScheduler() {
  // Cron: At of every hour (0 * * * *)
  cron.schedule('0 * * * *', () => {
    console.log('[BACKUP] Iniciando rotina de backup');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}.sql`);
    
    // Assumes pg_dump is available in path, or use specific path if needed
    // Using a simple file copy for now as a fallback or if sqlite is used
    // If using Postgres properly, replace with: pg_dump $DATABASE_URL > ${backupFile}
    
    const dbPath = path.join(process.cwd(), 'db', 'init.sql'); // Placeholder
    
    // Real implementation should use the actual DB connection string from process.env.DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl || dbUrl === 'undefined') {
      console.log('[BACKUP] DATABASE_URL não definida ou inválida. Pulando backup do Postgres.');
      // Optionally, backup the mock data if using fallback, but pg_dump won't work on memory
      return;
    }
    
    const cmd = `pg_dump "${dbUrl}" > "${backupFile}"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`[BACKUP] Erro no backup: ${error.message}`);
        return;
      }
      console.log(`[BACKUP] Backup criado com sucesso: ${backupFile}`);
      
      // Cleanup: Keep last 7 days (7 * 24 hours = 168 hours)
      cleanupOldBackups();
    });
  });
}

function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  
  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`[BACKUP] Backup antigo removido: ${file}`);
    }
  });
}
