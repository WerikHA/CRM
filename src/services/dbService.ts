import { api } from "./api.ts";
import { UserRole } from "../types.ts";

export interface DbContext {
  userId: string;
  userRole: UserRole;
  ownerId?: string;
}

export const dbService = {
  async list(tableName: string, context?: DbContext) {
    return api.get(`/${tableName.replace(/_/g, '-')}`);
  },

  async getById(tableName: string, id: string, context?: DbContext) {
    return api.get(`/${tableName.replace(/_/g, '-')}/${id}`);
  },

  async insert(tableName: string, payload: any, context?: DbContext) {
    return api.post(`/${tableName.replace(/_/g, '-')}`, payload);
  },

  async update(tableName: string, id: string, payload: any, context?: DbContext) {
    return api.put(`/${tableName.replace(/_/g, '-')}/${id}`, payload);
  },

  async delete(tableName: string, id: string, context?: DbContext) {
    return api.delete(`/${tableName.replace(/_/g, '-')}/${id}`);
  }
};
