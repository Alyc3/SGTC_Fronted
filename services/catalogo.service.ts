import { db } from '../db';
import { catalogo } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const catalogoService = {
  async getAll() {
    return await db.query.catalogo.findMany({
      where: eq(catalogo.activo, true),
      orderBy: (catalogo, { asc }) => [asc(catalogo.valor)]
    });
  },

  async getByCategoria(categoria: string) {
    return await db.query.catalogo.findMany({
      where: and(
        eq(catalogo.categoria, categoria),
        eq(catalogo.activo, true)
      ),
      orderBy: (catalogo, { asc }) => [asc(catalogo.valor)]
    });
  },

  async create(data: typeof catalogo.$inferInsert) {
    const id = data.id || uuidv4();
    return await db.insert(catalogo).values({ ...data, id }).returning();
  },

  async update(id: string, data: Partial<typeof catalogo.$inferInsert>) {
    return await db.update(catalogo)
      .set({ ...data, is_synced: false, fecha_modificacion: new Date().toISOString() })
      .where(eq(catalogo.id, id))
      .returning();
  },

  async delete(id: string) {
    // Soft delete preferred for lookup tables
    return await db.update(catalogo)
      .set({ activo: false, is_synced: false, fecha_modificacion: new Date().toISOString() })
      .where(eq(catalogo.id, id))
      .returning();
  }
};
