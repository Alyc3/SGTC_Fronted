import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const personalService = {
  async getAll() {
    return await db.query.users.findMany();
  },
  async create(data: typeof users.$inferInsert) {
    return await db.insert(users).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async update(id: string, data: Partial<typeof users.$inferInsert>) {
    return await db.update(users).set({ 
      ...data, 
      is_synced: false,
      fecha_modificacion: new Date().toISOString() 
    }).where(eq(users.id, id)).returning();
  },
  async delete(id: string) {
    return await db.delete(users).where(eq(users.id, id)).returning();
  },
  
  /**
   * Filtra una lista de trabajadores basándose en un término de búsqueda
   * Busca en: Nombre, Apellido, Identificación y Nombre de Rol
   */
  filterWorkers(workers: any[], rolesMap: Record<string, string>, term: string) {
    if (!term.trim()) return workers;
    
    const search = term.toLowerCase().trim();
    
    return workers.filter(w => {
      const firstName = (w.first_name || '').toLowerCase();
      const lastName = (w.last_name || '').toLowerCase();
      const identifier = (w.identifier || '').toLowerCase();
      const roleName = (rolesMap[w.role_id] || '').toLowerCase();
      
      return firstName.includes(search) || 
             lastName.includes(search) || 
             identifier.includes(search) || 
             roleName.includes(search);
    });
  }
};
