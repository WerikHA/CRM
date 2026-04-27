import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromAddress: string;
}

const CONFIG_PATH = path.join(process.cwd(), 'email_config.json');

export function getEmailConfig(): EmailConfig | null {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('[EMAIL] Erro ao carregar configuração de e-mail', err);
    }
    return null;
}

export function saveEmailConfig(config: EmailConfig) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
    const config = getEmailConfig();
    if (!config) return null;
    
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });
    }
    return transporter;
}

export function resetTransporter() {
    transporter = null;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const config = getEmailConfig();
    const t = getTransporter();
    
    if (!config || !t) {
        console.warn('[EMAIL] Servidor de e-mail não está configurado. Ignore ou configure antes de usar.');
        return false;
    }

    try {
        await t.sendMail({
            from: config.fromAddress || config.user,
            to,
            subject,
            html,
        });
        return true;
    } catch (err) {
        console.error('[EMAIL] Erro ao enviar e-mail:', err);
        throw err;
    }
}
