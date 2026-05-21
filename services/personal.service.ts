import { db } from '../db';
import { personal } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const personalService = {
  async getAll() {
    return await db.query.personal.findMany();
  },
  async create(data: typeof personal.$inferInsert) {
    return await db.insert(personal).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async update(id: string, data: Partial<typeof personal.$inferInsert>) {
    return await db.update(personal).set({ 
      ...data, 
      is_synced: false,
      fecha_modificacion: new Date().toISOString() 
    }).where(eq(personal.id, id)).returning();
  },
  async delete(id: string) {
    return await db.delete(personal).where(eq(personal.id, id)).returning();
  }
};
