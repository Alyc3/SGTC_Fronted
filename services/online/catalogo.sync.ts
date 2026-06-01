import { db } from '../../db';
import { catalogo } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { EXPO_PUBLIC_DATABASE_URL } from '@env';

const sql = neon(EXPO_PUBLIC_DATABASE_URL);

export const catalogoSync = {
  async sync() {
    await this.push();
    await this.pull();
  },

  async push() {
    const pending = await db.select().from(catalogo).where(eq(catalogo.is_synced, false));
    if (pending.length === 0) return;

    for (const record of pending) {
      if (!record.categoria || !record.valor) continue;
      try {
        // Asegurar formato ISO para las fechas de PostgreSQL (Neon)
        const fechaCreacion = record.fecha_creacion ? new Date(record.fecha_creacion).toISOString() : new Date().toISOString();
        const fechaModificacion = record.fecha_modificacion ? new Date(record.fecha_modificacion).toISOString() : new Date().toISOString();

        await sql`
          INSERT INTO catalogo (
            id, categoria, valor, activo, origen_local, 
            fecha_creacion, fecha_modificacion, is_synced
          )
          VALUES (
            ${record.id}, ${record.categoria}, ${record.valor}, ${record.activo ? true : false}, 
            ${record.origen_local ? true : false}, ${fechaCreacion}, ${fechaModificacion}, true
          )
          ON CONFLICT (id) DO UPDATE SET 
            categoria = EXCLUDED.categoria,
            valor = EXCLUDED.valor,
            activo = EXCLUDED.activo,
            fecha_modificacion = EXCLUDED.fecha_modificacion,
            is_synced = true
        `;
        await db.update(catalogo).set({ is_synced: true }).where(eq(catalogo.id, record.id));
      } catch (err) {
        console.error(`Sync error catalogo ${record.id}:`, err);
      }
    }
  },

  async pull() {
    try {
      const remoteData = await sql`SELECT * FROM catalogo`;
      for (const record of remoteData) {
        await db.insert(catalogo).values({
          id: record.id,
          categoria: record.categoria,
          valor: record.valor,
          activo: record.activo,
          origen_local: record.origen_local,
          fecha_creacion: record.fecha_creacion?.toISOString ? record.fecha_creacion.toISOString() : record.fecha_creacion,
          fecha_modificacion: record.fecha_modificacion?.toISOString ? record.fecha_modificacion.toISOString() : record.fecha_modificacion,
          is_synced: true
        }).onConflictDoUpdate({
          target: catalogo.id,
          set: {
            categoria: record.categoria,
            valor: record.valor,
            activo: record.activo,
            origen_local: record.origen_local,
            fecha_modificacion: record.fecha_modificacion?.toISOString ? record.fecha_modificacion.toISOString() : record.fecha_modificacion,
            is_synced: true
          }
        });
      }
    } catch (err) {
      console.error(`Pull error catalogo:`, err);
    }
  }
};
