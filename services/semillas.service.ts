import { db } from '../db';
import { semillas } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const semillasService = {
  async getAll() {
    return await db.query.semillas.findMany({
      where: eq(semillas.activo, true)
    });
  },
  async getById(id: string) {
    return await db.query.semillas.findFirst({
      where: eq(semillas.id, id)
    });
  },
  async create(data: typeof semillas.$inferInsert) {
    return await db.insert(semillas).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async update(id: string, data: Partial<typeof semillas.$inferInsert>) {
    return await db.update(semillas).set({ 
      ...data, 
      is_synced: false,
      fecha_modificacion: new Date().toISOString() 
    }).where(eq(semillas.id, id)).returning();
  },
  async delete(id: string) {
    // Soft delete (dar de baja)
    return await db.update(semillas)
      .set({ 
        activo: false, 
        is_synced: false, 
        fecha_modificacion: new Date().toISOString() 
      })
      .where(eq(semillas.id, id))
      .returning();
  },
  search(data: any[], query: string) {
    if (!query || query.trim() === '') return data;
    const s = query.toLowerCase().trim();
    return data.filter(item => 
      item.variedad?.valor?.toLowerCase().includes(s) ||
      item.pais_origen?.valor?.toLowerCase().includes(s) ||
      item.distribuidor?.valor?.toLowerCase().includes(s) ||
      item.color?.valor?.toLowerCase().includes(s) ||
      item.olor?.valor?.toLowerCase().includes(s) ||
      item.metodo_secado?.valor?.toLowerCase().includes(s) ||
      item.seleccion?.valor?.toLowerCase().includes(s) ||
      item.integridad?.valor?.toLowerCase().includes(s)
    );
  }
};
