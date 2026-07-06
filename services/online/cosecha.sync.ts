import { db } from '../../db';
import { cosecha } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

const toIsoString = (value: any) => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return new Date(value).toISOString();
  if (value?.toISOString) return value.toISOString();
  return new Date(value).toISOString();
};

const normalizeNullableText = (value: any) => (value && `${value}`.trim() !== '' ? value : null);

const resolveRemoteResponsableId = async (responsableId: any) => {
  if (!responsableId) return null;

  const remoteUser = await sql`SELECT id FROM users WHERE id = ${responsableId} LIMIT 1`;
  return remoteUser.length > 0 ? responsableId : null;
};

const ensureRemoteTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS cosecha (
      id text PRIMARY KEY,
      lote_id text NOT NULL REFERENCES lotes(id),
      responsable_id text REFERENCES users(id),
      grados_brix real NOT NULL,
      peso_kilos real NOT NULL,
      imagen_evidencia_uri text,
      observaciones text,
      fecha_inicio text NOT NULL,
      calidad_cosecha text,
      tarifa_por_kilo real,
      fecha_final text,
      duracion_horas real,
      fecha_creacion timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      fecha_modificacion timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      is_synced boolean DEFAULT false NOT NULL
    )
  `;
};

export const cosechaSync = {
  async sync() {
    await ensureRemoteTable();
    await this.push();
    await this.pull();
  },

  async push() {
    const pending = await db.select().from(cosecha).where(eq(cosecha.sync_status, 'pending'));
    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        const remoteResponsableId = await resolveRemoteResponsableId(record.responsable_id);

        await sql`
          INSERT INTO cosecha (
            id, lote_id, responsable_id, grados_brix, peso_kilos,
            imagen_evidencia_uri, observaciones, fecha_inicio,
            calidad_cosecha, tarifa_por_kilo, fecha_final, duracion_horas,
            fecha_creacion, fecha_modificacion, is_synced
          )
          VALUES (
            ${record.id},
            ${record.lote_id},
            ${remoteResponsableId},
            ${record.grados_brix},
            ${record.peso_kilos},
            ${normalizeNullableText(record.imagen_evidencia_uri)},
            ${normalizeNullableText(record.observaciones)},
            ${record.fecha_inicio},
            ${normalizeNullableText(record.calidad_cosecha)},
            ${record.tarifa_por_kilo ?? null},
            ${normalizeNullableText(record.fecha_final)},
            ${record.duracion_horas ?? null},
            ${toIsoString(record.fecha_creacion)},
            ${toIsoString(record.fecha_modificacion)},
            true
          )
          ON CONFLICT (id) DO UPDATE SET
            lote_id = EXCLUDED.lote_id,
            responsable_id = EXCLUDED.responsable_id,
            grados_brix = EXCLUDED.grados_brix,
            peso_kilos = EXCLUDED.peso_kilos,
            imagen_evidencia_uri = EXCLUDED.imagen_evidencia_uri,
            observaciones = EXCLUDED.observaciones,
            fecha_inicio = EXCLUDED.fecha_inicio,
            calidad_cosecha = EXCLUDED.calidad_cosecha,
            tarifa_por_kilo = EXCLUDED.tarifa_por_kilo,
            fecha_final = EXCLUDED.fecha_final,
            duracion_horas = EXCLUDED.duracion_horas,
            fecha_modificacion = EXCLUDED.fecha_modificacion,
            is_synced = true
        `;

        await db.update(cosecha)
          .set({ is_synced: true, sync_status: 'synced' })
          .where(eq(cosecha.id, record.id));
      } catch (error) {
        console.error(`[cosechaSync] Error al subir registro ${record.id}:`, error);
        await db.update(cosecha)
          .set({ sync_status: 'error' })
          .where(eq(cosecha.id, record.id));
      }
    }
  },

  async pull() {
    try {
      const remoteData = await sql`SELECT * FROM cosecha`;

      for (const record of remoteData) {
        await db.insert(cosecha).values({
          id: record.id,
          lote_id: record.lote_id,
          responsable_id: record.responsable_id,
          grados_brix: record.grados_brix,
          peso_kilos: record.peso_kilos,
          imagen_evidencia_uri: record.imagen_evidencia_uri,
          observaciones: record.observaciones,
          fecha_inicio: record.fecha_inicio,
          calidad_cosecha: record.calidad_cosecha,
          tarifa_por_kilo: record.tarifa_por_kilo,
          fecha_final: record.fecha_final,
          duracion_horas: record.duracion_horas,
          fecha_creacion: record.fecha_creacion?.toISOString ? record.fecha_creacion.toISOString() : record.fecha_creacion,
          fecha_modificacion: record.fecha_modificacion?.toISOString ? record.fecha_modificacion.toISOString() : record.fecha_modificacion,
          is_synced: true,
          sync_status: 'synced'
        }).onConflictDoUpdate({
          target: cosecha.id,
          set: {
            lote_id: record.lote_id,
            responsable_id: record.responsable_id,
            grados_brix: record.grados_brix,
            peso_kilos: record.peso_kilos,
            imagen_evidencia_uri: record.imagen_evidencia_uri,
            observaciones: record.observaciones,
            fecha_inicio: record.fecha_inicio,
            calidad_cosecha: record.calidad_cosecha,
            tarifa_por_kilo: record.tarifa_por_kilo,
            fecha_final: record.fecha_final,
            duracion_horas: record.duracion_horas,
            fecha_modificacion: record.fecha_modificacion?.toISOString ? record.fecha_modificacion.toISOString() : record.fecha_modificacion,
            is_synced: true,
            sync_status: 'synced'
          }
        });
      }
    } catch (error) {
      console.error('[cosechaSync] Error al descargar registros:', error);
    }
  }
};