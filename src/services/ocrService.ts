import { createWorker } from 'tesseract.js';
import { dbService, DbContext } from './dbService.ts';

export const ocrService = {
  async processReceipt(imagePath: string): Promise<string> {
    const worker = await createWorker('por');
    try {
      const { data: { text } } = await worker.recognize(imagePath);
      return text;
    } finally {
      await worker.terminate();
    }
  },
  
  async identifyClientAndMarkAsPaid(text: string, context: DbContext): Promise<{ success: boolean; message?: string }> {
    const possibleId = text.match(/\d{5,}/); 
    if (!possibleId) return { success: false, message: 'Não foi possível detectar um ID de cobrança no comprovante.' };
    
    const id = possibleId[0];
    
    try {
      const receivables = await dbService.list('receivables', context);
      const receivable = receivables.find((r: any) => r.id === id || r.referenceId === id);
      
      if (!receivable) {
        return { success: false, message: `ID detectado (${id}), mas nenhuma cobrança encontrada.` };
      }
      
      await dbService.update('receivables', receivable.id, { status: 'paid' }, context);
      return { success: true, message: `Cobrança ${id} marcada como paga com sucesso!` };
      
    } catch (err: any) {
        return { success: false, message: `Erro ao processar cobrança: ${err.message}` };
    }
  }
};
