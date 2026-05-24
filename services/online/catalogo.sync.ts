import { db } from '../../db';
import { catalogo } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '@env';

const sql = neon(DATABASE_URL);

export const catalogoSync = {
  async sync() {
    const pending = await db.select().from(catalogo).where(eq(catalogo.is_synced, false));
    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        await sql`
          INSERT INTO catalogo (
            id, categoria, valor, activo, origen_local, 
            fecha_creacion, fecha_modificacion, is_synced
          )
          VALUES (
            ${record.id}, ${record.categoria}, ${record.valor}, ${record.activo}, 
            ${record.origen_local}, ${record.fecha_creacion}, ${record.fecha_modificacion}, true
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
  }
};
