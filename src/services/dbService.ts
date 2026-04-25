import { supabase } from "../lib/supabaseClient.ts";

export type UserRole = 'ADMIN' | 'DESIGNER' | 'PARTNER' | 'EDITOR' | 'OWNER';

export interface DbContext {
  userId: string;
  userRole: UserRole;
}

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const keysToSnake = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(keysToSnake);
  const n: any = {};
  Object.keys(obj).forEach(k => {
    n[toSnakeCase(k)] = keysToSnake(obj[k]);
  });
  return n;
};

const keysToCamel = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  const n: any = {};
  Object.keys(obj).forEach(k => {
    n[toCamelCase(k)] = keysToCamel(obj[k]);
  });
  return n;
};

export const dbService = {
  async list(tableName: string, context?: DbContext) {
    let query = supabase.from(tableName).select('*');

    if (context && context.userRole !== 'OWNER' && context.userRole !== 'ADMIN') {
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
    return keysToCamel(data);
  },

  async insert(tableName: string, payload: any, context?: DbContext) {
    const snakePayload = keysToSnake(payload);
    
    // Auto-set owner_id if available and not set
    if (context && !snakePayload.owner_id) {
      snakePayload.owner_id = context.userId;
    }

    const { data, error } = await supabase.from(tableName).insert(snakePayload).select().single();
    if (error) throw error;
    return keysToCamel(data);
  },

  async update(tableName: string, id: string, payload: any, context?: DbContext) {
    const snakePayload = keysToSnake(payload);
    const { data, error } = await supabase.from(tableName).update(snakePayload).eq('id', id).select().single();
    if (error) throw error;
    return keysToCamel(data);
  },

  async delete(tableName: string, id: string, context?: DbContext) {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  }
};
