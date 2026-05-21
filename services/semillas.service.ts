import { db } from '../db';
import { semillas } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const semillasService = {
  async getAll() {
    return await db.query.semillas.findMany();
  },
  async create(data: typeof semillas.$inferInsert) {
    return await db.insert(semillas).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async update(id: string, data: Partial<typeof semillas.$inferInsert>) {
    return await db.update(semillas).set({ ...data, is_synced: false }).where(eq(semillas.id, id)).returning();
  },
  async delete(id: string) {
    return await db.delete(semillas).where(eq(semillas.id, id)).returning();
  }
};
