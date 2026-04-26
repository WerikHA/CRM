import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function runMigrations() {
    await client.connect();
    
    const migrationFile = process.argv[2] || 'notifications_migration.sql';
    const filePath = path.isAbsolute(migrationFile) ? migrationFile : path.join('./db', migrationFile);
    
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found at ${filePath}`);
        await client.end();
        process.exit(1);
    }

    console.log(`Running migration: ${filePath}`);
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
        await client.query(sql);
        console.log("Migration applied successfully.");
    } catch (err) {
        console.error("Error applying migration:", err);
    } finally {
        await client.end();
    }
}

runMigrations();
