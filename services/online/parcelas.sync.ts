import { db } from '../../db';
import { parcelas, lotes } from '../../db/schema';
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
          INSERT INTO parcelas (
            id, nombre, hectareas, latitud, longitud, ph_suelo, textura, 
            altitud_msnm, cortinas_rompevientos, orientacion_ladera, 
            tipo_terreno, tipo_zona, estado, fecha_creacion, fecha_modificacion, is_synced
          )
          VALUES (
            ${record.id}, ${record.nombre}, ${record.hectareas}, ${record.latitud}, ${record.longitud}, ${record.phSuelo}, ${record.textura}, 
            ${record.altitudMsnm}, ${record.cortinasRompevientos}, ${record.orientacionLadera}, 
            ${record.tipoTerreno}, ${record.tipoZona}, ${record.estado}, ${record.fecha_creacion}, ${record.fecha_modificacion}, true
          )
          ON CONFLICT (id) DO UPDATE SET 
            nombre = EXCLUDED.nombre,
            hectareas = EXCLUDED.hectareas,
            latitud = EXCLUDED.latitud,
            longitud = EXCLUDED.longitud,
            ph_suelo = EXCLUDED.ph_suelo,
            textura = EXCLUDED.textura,
            altitud_msnm = EXCLUDED.altitud_msnm,
            cortinas_rompevientos = EXCLUDED.cortinas_rompevientos,
            orientacion_ladera = EXCLUDED.orientacion_ladera,
            tipo_terreno = EXCLUDED.tipo_terreno,
            tipo_zona = EXCLUDED.tipo_zona,
            estado = EXCLUDED.estado,
            fecha_modificacion = EXCLUDED.fecha_modificacion,
            is_synced = true
        `;

        await db.update(parcelas).set({ is_synced: true }).where(eq(parcelas.id, record.id));
      } catch (err) {
        console.error(`Sync error parcelas ${record.id}:`, err);
      }
    }
  },

  async syncLotes() {
    const pending = await db.select().from(lotes).where(eq(lotes.is_synced, false));
    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        await sql`
          INSERT INTO lotes (
            id, codigo, parcela_id, semilla_id, zona_seleccionada, hectareas_lote, 
            variedad_cafe, porcentaje_progreso, costo_total_mano_obra, 
            estado_lote, calidad_final, fecha_creacion, fecha_modificacion, is_synced
          )
          VALUES (
            ${record.id}, ${record.codigo}, ${record.parcela_id}, ${record.semilla_id}, ${record.zona_seleccionada}, ${record.hectareas_lote}, 
            ${record.variedadCafe}, ${record.porcentajeProgreso}, ${record.costoTotalManoObra}, 
            ${record.estado_lote}, ${record.calidadFinal}, ${record.fecha_creacion}, ${record.fecha_modificacion}, true
          )
          ON CONFLICT (id) DO UPDATE SET 
            codigo = EXCLUDED.codigo,
            parcela_id = EXCLUDED.parcela_id,
            semilla_id = EXCLUDED.semilla_id,
            zona_seleccionada = EXCLUDED.zona_seleccionada,
            hectareas_lote = EXCLUDED.hectareas_lote,
            variedad_cafe = EXCLUDED.variedad_cafe,
            porcentaje_progreso = EXCLUDED.porcentaje_progreso,
            costo_total_mano_obra = EXCLUDED.costo_total_mano_obra,
            estado_lote = EXCLUDED.estado_lote,
            calidad_final = EXCLUDED.calidad_final,
            fecha_modificacion = EXCLUDED.fecha_modificacion,
            is_synced = true
        `;

        await db.update(lotes).set({ is_synced: true }).where(eq(lotes.id, record.id));
      } catch (err) {
        console.error(`Sync error lotes ${record.id}:`, err);
      }
    }
  }
};
