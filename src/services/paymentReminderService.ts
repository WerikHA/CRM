import cron from 'node-cron';
import { Receivable, Client, FinanceConfig } from '../types.ts';
import { supabase } from '../lib/supabaseClient.ts';

// Cache for performance, but fetch from DB regularly
let financeConfigCache: Record<string, FinanceConfig> = {};

export const getFinanceConfig = async (ownerId: string): Promise<FinanceConfig> => {
    if (financeConfigCache[ownerId]) return financeConfigCache[ownerId];

    const { data } = await supabase
        .from('system_configs')
        .select('config_value')
        .eq('owner_id', ownerId)
        .eq('config_key', 'finance_config')
        .single();
    
    const config = data?.config_value || {
        pixKey: '',
        enableReminders: false,
        reminderTemplate: 'Olá, *{{clientName}}*! Lembrete: {{description}} vence hoje (R$ {{quantia}}). Chave PIX: {{pixKey}}'
    };
    
    financeConfigCache[ownerId] = config;
    return config;
};

export const updateFinanceConfig = async (ownerId: string, config: FinanceConfig) => {
    await supabase.from('system_configs').upsert({
        owner_id: ownerId,
        config_key: 'finance_config',
        config_value: config,
        updated_at: new Date().toISOString()
    }, { onConflict: 'owner_id,config_key' });
    
    financeConfigCache[ownerId] = config;
};

export const startPaymentReminderScheduler = (
    fetchReceivables: () => Promise<Receivable[]>,
    fetchClients: () => Promise<Client[]>,
    sendWhatsApp: (phone: string, message: string, ownerId: string) => Promise<any>
) => {
    // Run daily at 08:00
    cron.schedule('0 8 * * *', async () => {
        try {
            // Fetch all unique owner IDs from system_configs who enabled reminders
            const { data: configs } = await supabase
                .from('system_configs')
                .select('owner_id, config_value')
                .eq('config_key', 'finance_config');
            
            if (!configs) return;

            for (const cfg of configs) {
                const ownerId = cfg.owner_id;
                const config = cfg.config_value as FinanceConfig;

                if (!config.enableReminders) continue;

                const allReceivables = await fetchReceivables();
                const receivables = allReceivables.filter(r => (r as any).ownerId === ownerId);
                
                const allClients = await fetchClients();
                const clients = allClients.filter(c => (c as any).ownerId === ownerId);
                
                const today = new Date().toLocaleDateString('pt-BR');

                for (const r of receivables) {
                    if (r.dueDate === today && r.status === 'pending') {
                        const client = clients.find(c => c.id === r.clientId);
                        if (client && client.phone) {
                            const message = config.reminderTemplate
                                .replace('{{clientName}}', client.name)
                                .replace('{{description}}', r.description)
                                .replace('{{quantia}}', r.quantia.toString())
                                .replace('{{pixKey}}', config.pixKey);
                            
                            await sendWhatsApp(client.phone, message, ownerId);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[FINANCE REMINDER] Erro na rotina de cobrança:', err);
        }
    });
};
