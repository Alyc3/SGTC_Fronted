import { db } from '../../db';
import { lotes } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '@env';

const sql = neon(DATABASE_URL);

export const lotesSync = {
  async sync() {
    const pending = await db.select().from(lotes).where(eq(lotes.is_synced, false));
    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        await sql`
          INSERT INTO lotes (id, codigo, parcela_id, semilla_id, zona_seleccionada, hectareas_lote, variedad_cafe, porcentaje_progreso, costo_total_mano_obra, estado_lote, calidad_final, is_synced)
          VALUES (${record.id}, ${record.codigo}, ${record.parcela_id}, ${record.semilla_id}, ${record.zona_seleccionada}, ${record.hectareas_lote}, ${record.variedadCafe}, ${record.porcentajeProgreso}, ${record.costoTotalManoObra}, ${record.estado_lote}, ${record.calidadFinal}, true)
          ON CONFLICT (id) DO UPDATE SET estado_lote = EXCLUDED.estado_lote, is_synced = true
        `;

        await db.update(lotes).set({ is_synced: true }).where(eq(lotes.id, record.id));
      } catch (err) {
        console.error(`Sync error lotes ${record.id}:`, err);
      }
    }
  }
};
