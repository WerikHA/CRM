import nodemailer from 'nodemailer';
import { supabase } from '../lib/supabaseClient.ts';

export interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromAddress: string;
}

export async function getEmailConfig(ownerId: string): Promise<EmailConfig | null> {
    try {
        const { data } = await supabase
          .from('system_configs')
          .select('config_value')
          .eq('owner_id', ownerId)
          .eq('config_key', 'email_config')
          .single();
        
        return data?.config_value || null;
    } catch (err) {
        console.error('[EMAIL] Erro ao carregar configuração de e-mail', err);
    }
    return null;
}

export async function saveEmailConfig(ownerId: string, config: EmailConfig) {
    await supabase.from('system_configs').upsert({
        owner_id: ownerId,
        config_key: 'email_config',
        config_value: config,
        updated_at: new Date().toISOString()
    }, { onConflict: 'owner_id,config_key' });
}

const transporters: Record<string, nodemailer.Transporter> = {};

async function getTransporter(ownerId: string) {
    const config = await getEmailConfig(ownerId);
    if (!config) return null;
    
    if (!transporters[ownerId]) {
        transporters[ownerId] = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });
    }
    return transporters[ownerId];
}

export function resetTransporter(ownerId?: string) {
    if (ownerId) {
        delete transporters[ownerId];
    } else {
        // Limpa todos se não especificar
        Object.keys(transporters).forEach(k => delete transporters[k]);
    }
}

export async function sendEmail(ownerId: string, to: string, subject: string, html: string): Promise<boolean> {
    const config = await getEmailConfig(ownerId);
    const t = await getTransporter(ownerId);
    
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
