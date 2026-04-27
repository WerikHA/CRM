import { supabase } from "../lib/supabaseClient.ts";
import { UserRole } from "../types.ts";

export interface DbContext {
  userId: string;
  userRole: UserRole;
  ownerId?: string;
}

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

export const keysToSnake = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    if (obj === "") return null;
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(keysToSnake);
  const n: any = {};
  Object.keys(obj || {}).forEach(k => {
    n[toSnakeCase(k)] = keysToSnake(obj[k]);
  });
  return n;
};

export const keysToCamel = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  const n: any = {};
  Object.keys(obj || {}).forEach(k => {
    n[toCamelCase(k)] = keysToCamel(obj[k]);
  });
  return n;
};

export const dbService = {
  async list(tableName: string, context?: DbContext) {
    if (!context) throw new Error("Acesso negado: Contexto de usuário não fornecido.");

    // Special handling for GUESTS
    if ((context.userRole as any) === 'GUEST') {
      if (tableName === 'users' || tableName === 'clients') {
        // GUESTS can only see everything in these tables for now (simplification)
        // In a real app, we'd filter by some shared token or ID
        return keysToCamel((await supabase.from(tableName).select('*')).data);
      }
      throw new Error("Acesso negado para convidados nesta tabela.");
    }

    let query = supabase.from(tableName).select('*');

    // Multi-tenant isolation: always filter by ownerId by default if not super admin
    // In this system, OWNERS can see all in their agency, and ADMINs can see all in their agency.
    // If we want total separation between agencies, we MUST filter by owner_id.
    if (context.ownerId) {
      query = query.eq('owner_id', context.ownerId);
    }

    // Role-based sub-filtering
    if (context.userRole !== 'OWNER' && context.userRole !== 'ADMIN') {
      const { userId, userRole } = context;
      
      if (tableName === 'clients') {
        if (userRole === 'PARTNER') {
          query = query.eq('partner_id', userId);
        } else {
          query = query.or(`assigned_designer_id.eq.${userId},assigned_video_editor_id.eq.${userId}`);
        }
      } else if (tableName === 'users') {
        query = query.eq('id', userId);
      } else if (tableName === 'art_orders' || tableName === 'video_orders' || tableName === 'demand_tasks') {
        const designerField = tableName === 'video_orders' ? 'editor_id' : (tableName === 'demand_tasks' ? 'editor_id' : 'designer_id');
        query = query.eq(designerField, userId);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    
    const camelData = keysToCamel(data);
    
    // Map amount to quantia for receivables
    if (tableName === 'receivables' && Array.isArray(camelData)) {
      return camelData.map(item => {
        if (item.amount !== undefined) {
          item.quantia = item.amount;
          delete item.amount;
        }
        return item;
      });
    }

    return camelData;
  },

  async getById(tableName: string, id: string, context?: DbContext) {
    if (!context) throw new Error("Acesso negado: Contexto de usuário não fornecido.");
    
    let query = supabase.from(tableName).select('*').eq('id', id);
    
    // GUESTS don't have an ownerId, so we skip that filter for them
    if (context.ownerId && (context.userRole as any) !== 'GUEST') {
      query = query.eq('owner_id', context.ownerId);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    
    const camelData = keysToCamel(data);
    
    // Map amount to quantia for receivables
    if (tableName === 'receivables' && camelData && camelData.amount !== undefined) {
      camelData.quantia = camelData.amount;
      delete camelData.amount;
    }
    
    return camelData;
  },

  async insert(tableName: string, payload: any, context?: DbContext) {
    const snakePayload = keysToSnake(payload);
    
    // Special handling for renamed columns
    if (tableName === 'receivables' && snakePayload.quantia !== undefined) {
      snakePayload.amount = snakePayload.quantia;
      delete snakePayload.quantia;
    }
    
    // Auto-set owner_id if available and not set
    if (context && !snakePayload.owner_id) {
      snakePayload.owner_id = context.ownerId || context.userId;
    }

    const { data, error } = await supabase.from(tableName).insert(snakePayload).select().single();
    if (error) throw error;
    return keysToCamel(data);
  },

  async update(tableName: string, id: string, payload: any, context?: DbContext) {
    if (!context) throw new Error("Acesso negado: Contexto de usuário não fornecido.");
    
    const snakePayload = keysToSnake(payload);
    
    // Special handling for renamed columns
    if (tableName === 'receivables' && snakePayload.quantia !== undefined) {
      snakePayload.amount = snakePayload.quantia;
      delete snakePayload.quantia;
    }
    
    // Ensure we only update if it belongs to the owner
    let query = supabase.from(tableName).update(snakePayload).eq('id', id);
    
    if (context.ownerId) {
      query = query.eq('owner_id', context.ownerId);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return keysToCamel(data);
  },

  async delete(tableName: string, id: string, context?: DbContext) {
    if (!context) throw new Error("Acesso negado: Contexto de usuário não fornecido.");

    let query = supabase.from(tableName).delete().eq('id', id);

    if (context.ownerId) {
      query = query.eq('owner_id', context.ownerId);
    }

    const { error } = await query;
    if (error) throw error;
    return { success: true };
  }
};
