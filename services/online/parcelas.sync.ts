import { db } from '../../db';
import { parcelas, lotes } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { EXPO_PUBLIC_DATABASE_URL } from '@env';

const sql = neon(EXPO_PUBLIC_DATABASE_URL);

export const parcelasSync = {
  async sync() {
    await this.pushParcelas();
    await this.pullParcelas();
  },

  async syncLotes() {
    await this.pushLotes();
    await this.pullLotes();
  },

  async pushParcelas() {
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
            ${record.altitudMsnm}, ${record.cortinasRompevientos ? true : false}, ${record.orientacionLadera}, 
            ${record.tipoTerreno}, ${record.tipoZona || null}, ${record.estado}, ${record.fecha_creacion}, ${record.fecha_modificacion}, true
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

  async pullParcelas() {
    try {
      const remoteData = await sql`SELECT * FROM parcelas`;
      for (const record of remoteData) {
        await db.insert(parcelas).values({
          id: record.id,
          nombre: record.nombre,
          hectareas: record.hectareas,
          latitud: record.latitud,
          longitud: record.longitud,
          phSuelo: record.ph_suelo,
          textura: record.textura,
          altitudMsnm: record.altitud_msnm,
          cortinasRompevientos: record.cortinas_rompevientos,
          orientacionLadera: record.orientacion_ladera,
          tipoTerreno: record.tipo_terreno,
          tipoZona: record.tipo_zona,
          estado: record.estado,
          fecha_creacion: record.fecha_creacion?.toISOString ? record.fecha_creacion.toISOString() : record.fecha_creacion,
          fecha_modificacion: record.fecha_modificacion?.toISOString ? record.fecha_modificacion.toISOString() : record.fecha_modificacion,
          activo: record.activo,
          is_synced: true
        }).onConflictDoUpdate({
          target: parcelas.id,
          set: {
            nombre: record.nombre,
            hectareas: record.hectareas,
            latitud: record.latitud,
            longitud: record.longitud,
            phSuelo: record.ph_suelo,
            textura: record.textura,
            altitudMsnm: record.altitud_msnm,
            cortinasRompevientos: record.cortinas_rompevientos,
            orientacionLadera: record.orientacion_ladera,
            tipoTerreno: record.tipo_terreno,
            tipoZona: record.tipo_zona,
            estado: record.estado,
            fecha_modificacion: record.fecha_modificacion?.toISOString ? record.fecha_modificacion.toISOString() : record.fecha_modificacion,
            activo: record.activo,
            is_synced: true
          }
        });
      }
    } catch (err) {
      console.error(`Pull error parcelas:`, err);
    }
  },

  async pushLotes() {
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
            ${record.id}, ${record.codigo}, ${record.parcela_id}, ${record.semilla_id}, ${record.zona_seleccionada || null}, ${record.hectareas_lote}, 
            ${record.variedadCafe}, ${record.porcentajeProgreso}, ${record.costoTotalManoObra}, 
            ${record.estado_lote}, ${record.calidadFinal || null}, ${record.fecha_creacion}, ${record.fecha_modificacion}, true
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
  },

  async pullLotes() {
    try {
      const remoteData = await sql`SELECT * FROM lotes`;
      for (const record of remoteData) {
        await db.insert(lotes).values({
          id: record.id,
          codigo: record.codigo,
          parcela_id: record.parcela_id,
          semilla_id: record.semilla_id,
          zona_seleccionada: record.zona_seleccionada,
          hectareas_lote: record.hectareas_lote,
          variedadCafe: record.variedad_cafe,
          porcentajeProgreso: record.porcentaje_progreso,
          costoTotalManoObra: record.costo_total_mano_obra,
          estado_lote: record.estado_lote,
          calidadFinal: record.calidad_final,
          fecha_creacion: record.fecha_creacion?.toISOString ? record.fecha_creacion.toISOString() : record.fecha_creacion,
          fecha_modificacion: record.fecha_modificacion?.toISOString ? record.fecha_modificacion.toISOString() : record.fecha_modificacion,
          is_synced: true
        }).onConflictDoUpdate({
          target: lotes.id,
          set: {
            codigo: record.codigo,
            parcela_id: record.parcela_id,
            semilla_id: record.semilla_id,
            zona_seleccionada: record.zona_seleccionada,
            hectareas_lote: record.hectareas_lote,
            variedadCafe: record.variedad_cafe,
            porcentajeProgreso: record.porcentaje_progreso,
            costoTotalManoObra: record.costo_total_mano_obra,
            estado_lote: record.estado_lote,
            calidadFinal: record.calidad_final,
            fecha_modificacion: record.fecha_modificacion?.toISOString ? record.fecha_modificacion.toISOString() : record.fecha_modificacion,
            is_synced: true
          }
        });
      }
    } catch (err) {
      console.error(`Pull error lotes:`, err);
    }
  }
};
