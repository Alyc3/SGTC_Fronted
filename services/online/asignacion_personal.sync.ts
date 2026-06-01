import { db } from '../../db';
import { asignacion_personal } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { EXPO_PUBLIC_DATABASE_URL } from '@env';

const sql = neon(EXPO_PUBLIC_DATABASE_URL);

/**
 * Servicio de sincronización para la tabla asignacion_personal.
 * Maneja la subida (push) y descarga (pull) de asignaciones de trabajadores a lotes.
 */
export const asignacionPersonalSync = {
  async sync() {
    await this.push();
    await this.pull();
  },

  async push() {
    // 1. Obtener registros locales que no se han sincronizado o están marcados como pendientes
    const pending = await db.select()
      .from(asignacion_personal)
      .where(eq(asignacion_personal.sync_status, 'pending'));

    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        // 2. Insertar o actualizar en Neon PostgreSQL
        await sql`
          INSERT INTO asignacion_personal (
            id, lote_id, etapa, trabajador_id, tipo_grano, 
            pago_calculado, fecha_asignacion, fecha_jornada, 
            horas_trabajadas, cantidad_cosechada, is_synced
          )
          VALUES (
            ${record.id}, ${record.lote_id}, ${record.etapa}, ${record.trabajador_id}, ${record.tipo_grano},
            ${record.pago_calculado}, ${record.fechaAsignacion}, ${record.fecha_jornada},
            ${record.horasTrabajadas}, ${record.cantidad_cosechada}, true
          )
          ON CONFLICT (id) DO UPDATE SET
            etapa = EXCLUDED.etapa,
            tipo_grano = EXCLUDED.tipo_grano,
            pago_calculado = EXCLUDED.pago_calculado,
            horas_trabajadas = EXCLUDED.horas_trabajadas,
            cantidad_cosechada = EXCLUDED.cantidad_cosechada,
            is_synced = true
        `;

        // 3. Marcar como sincronizado localmente
        await db.update(asignacion_personal)
          .set({ is_synced: true, sync_status: 'synced' })
          .where(eq(asignacion_personal.id, record.id));

      } catch (err) {
        console.error(`[asignacionPersonalSync] Error al subir registro ${record.id}:`, err);
        await db.update(asignacion_personal)
          .set({ sync_status: 'error' })
          .where(eq(asignacion_personal.id, record.id));
      }
    }
  },

  async pull() {
    try {
      // 1. Descargar todos los registros desde Neon
      const remoteData = await sql`SELECT * FROM asignacion_personal`;
      
      for (const record of remoteData) {
        // 2. Insertar o actualizar localmente en SQLite
        await db.insert(asignacion_personal).values({
          id: record.id,
          lote_id: record.lote_id,
          etapa: record.etapa,
          trabajador_id: record.trabajador_id,
          tipo_grano: record.tipo_grano,
          pago_calculado: record.pago_calculado,
          fechaAsignacion: record.fecha_asignacion?.toISOString ? record.fecha_asignacion.toISOString() : record.fecha_asignacion,
          fecha_jornada: record.fecha_jornada,
          horasTrabajadas: record.horas_trabajadas,
          cantidad_cosechada: record.cantidad_cosechada,
          is_synced: true,
          sync_status: 'synced',
          fecha_modificacion: new Date().toISOString()
        }).onConflictDoUpdate({
          target: asignacion_personal.id,
          set: {
            etapa: record.etapa,
            tipo_grano: record.tipo_grano,
            pago_calculado: record.pago_calculado,
            horasTrabajadas: record.horas_trabajadas,
            cantidad_cosechada: record.cantidad_cosechada,
            is_synced: true,
            sync_status: 'synced',
            fecha_modificacion: new Date().toISOString()
          }
        });
      }
    } catch (err) {
      console.error(`[asignacionPersonalSync] Error al descargar registros:`, err);
    }
  }
};
