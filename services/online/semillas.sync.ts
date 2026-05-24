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
          INSERT INTO semillas (
            id, variedad_id, pais_origen_id, distribuidor_id, 
            metodo_secado_id, seleccion_id, olor_id, color_id, 
            integridad_id, anexo_ruta, anexo_tamano, anexo_creacion, 
            fecha_creacion, fecha_modificacion, is_synced
          )
          VALUES (
            ${record.id}, ${record.variedad_id}, ${record.pais_origen_id}, ${record.distribuidor_id},
            ${record.metodo_secado_id}, ${record.seleccion_id}, ${record.olor_id}, ${record.color_id},
            ${record.integridad_id}, ${record.anexo_ruta}, ${record.anexo_tamano}, ${record.anexo_creacion},
            ${record.fecha_creacion}, ${record.fecha_modificacion}, true
          )
          ON CONFLICT (id) DO UPDATE SET 
            variedad_id = EXCLUDED.variedad_id,
            pais_origen_id = EXCLUDED.pais_origen_id,
            distribuidor_id = EXCLUDED.distribuidor_id,
            metodo_secado_id = EXCLUDED.metodo_secado_id,
            seleccion_id = EXCLUDED.seleccion_id,
            olor_id = EXCLUDED.olor_id,
            color_id = EXCLUDED.color_id,
            integridad_id = EXCLUDED.integridad_id,
            anexo_ruta = EXCLUDED.anexo_ruta,
            anexo_tamano = EXCLUDED.anexo_tamano,
            fecha_modificacion = EXCLUDED.fecha_modificacion,
            is_synced = true
        `;
        
        await db.update(semillas).set({ is_synced: true }).where(eq(semillas.id, record.id));
      } catch (err) {
        console.error(`Sync error semillas ${record.id}:`, err);
      }
    }
  }
};
