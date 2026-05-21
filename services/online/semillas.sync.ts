import { db } from '../../db';
import { semillas } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '@env';

const sql = neon(DATABASE_URL);

export const semillasSync = {
  async sync() {
    const pending = await db.select().from(semillas).where(eq(semillas.is_synced, false));
    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        await sql`
          INSERT INTO semillas (id, variedad, pais_origen, distribuidor, anexo_ruta, anexo_tamano, anexo_creacion, is_synced)
          VALUES (${record.id}, ${record.variedad}, ${record.paisOrigen}, ${record.distribuidor}, ${record.anexo_ruta}, ${record.anexo_tamano}, ${record.anexo_creacion}, true)
          ON CONFLICT (id) DO UPDATE SET variedad = EXCLUDED.variedad, is_synced = true
        `;
        
        await db.update(semillas).set({ is_synced: true }).where(eq(semillas.id, record.id));
      } catch (err) {
        console.error(`Sync error semillas ${record.id}:`, err);
      }
    }
  }
};
