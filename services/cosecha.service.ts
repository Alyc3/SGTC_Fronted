import { db } from '../db';
import { lotes, asignacion_personal, cosecha } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as Location from 'expo-location';

export const cosechaService = {
  async create(data: typeof cosecha.$inferInsert) {
    return await db.insert(cosecha).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },

  async update(id: string, data: Partial<typeof cosecha.$inferInsert>) {
    return await db
      .update(cosecha)
      .set({
        ...data,
        is_synced: false,
        sync_status: 'pending',
        fecha_modificacion: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(cosecha.id, id))
      .returning();
  }, // 👈 verifica que esta coma esté

  async getByLoteId(loteId: string): Promise<any | null> {
    const result = await db
      .select()
      .from(cosecha)
      .where(eq(cosecha.lote_id, loteId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  },
}; // 👈 y que este cierre exista

export const asignacionPersonalService = {
  async updateCosecha(
    asignacionId: string,
    data: {
      cantidad_cosechada: number;
      tipo_grano: string;
      pago_calculado: number;
    }
  ): Promise<void> {
    await db
      .update(asignacion_personal)
      .set({
        cantidad_cosechada: data.cantidad_cosechada,
        tipo_grano: data.tipo_grano,
        pago_calculado: data.pago_calculado,
        is_synced: false,
      })
      .where(eq(asignacion_personal.id, asignacionId));
  },
};