import { db } from '../db';
import { parcelas } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const parcelasService = {
  async getAll() {
    return await db.query.parcelas.findMany();
  },
  async create(data: typeof parcelas.$inferInsert) {
    return await db.insert(parcelas).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async update(id: string, data: Partial<typeof parcelas.$inferInsert>) {
    return await db.update(parcelas).set({ 
      ...data, 
      is_synced: false,
      fecha_modificacion: new Date().toISOString() 
    }).where(eq(parcelas.id, id)).returning();
  },
  async delete(id: string) {
    return await db.delete(parcelas).where(eq(parcelas.id, id)).returning();
  }
};
