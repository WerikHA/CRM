import cron from 'node-cron';
import { Receivable, Client, FinanceConfig } from '../types';
// In a real DB, you'd fetch this from a config table
let financeConfig: FinanceConfig = {
    pixKey: '',
    enableReminders: false,
    reminderTemplate: 'Olá, *{{clientName}}*! Lembrete: {{description}} vence hoje (R$ {{amount}}). Chave PIX: {{pixKey}}'
};

export const getFinanceConfig = () => financeConfig;
export const updateFinanceConfig = (config: FinanceConfig) => {
    financeConfig = config;
};

export const startPaymentReminderScheduler = (
    fetchReceivables: () => Promise<Receivable[]>,
    fetchClients: () => Promise<Client[]>,
    sendWhatsApp: (phone: string, message: string) => Promise<any>
) => {
    // Run daily at 08:00
    cron.schedule('0 8 * * *', async () => {
        if (!financeConfig.enableReminders) return;

        const receivables = await fetchReceivables();
        const clients = await fetchClients();
        const today = new Date().toLocaleDateString('pt-BR');

        for (const r of receivables) {
            if (r.dueDate === today && r.status === 'pending') {
                const client = clients.find(c => c.id === r.clientId);
                if (client && client.phone) {
                    const message = financeConfig.reminderTemplate
                        .replace('{{clientName}}', client.name)
                        .replace('{{description}}', r.description)
                        .replace('{{amount}}', r.amount.toString())
                        .replace('{{pixKey}}', financeConfig.pixKey);
                    
                    await sendWhatsApp(client.phone, message);
                }
            }
        }
    });
};
