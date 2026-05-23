import { db } from '../../db';
import { parcelas } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '@env';

const sql = neon(DATABASE_URL);

export const parcelasSync = {
  async sync() {
    const pending = await db.select().from(parcelas).where(eq(parcelas.is_synced, false));
    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        await sql`
          INSERT INTO parcelas (id, nombre, hectareas, latitud, longitud, ph_suelo, textura, altitud_msnm, orientacion_ladera, tipo_terreno, estado, is_synced)
          VALUES (${record.id}, ${record.nombre}, ${record.hectareas}, ${record.latitud}, ${record.longitud}, ${record.phSuelo}, ${record.textura}, ${record.altitudMsnm}, ${record.orientacionLadera}, ${record.tipoTerreno}, ${record.estado}, true)
          ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, is_synced = true
        `;

        await db.update(parcelas).set({ is_synced: true }).where(eq(parcelas.id, record.id));
      } catch (err) {
        console.error(`Sync error parcelas ${record.id}:`, err);
      }
    }
  }
};
