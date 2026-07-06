import { db } from '../db';
import { lotes, asignacion_personal, cosecha } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';
import * as Location from 'expo-location';
import { networkService } from './network.service';

const remoteSql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

const toIsoString = (value: any) => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return new Date(value).toISOString();
  if (value?.toISOString) return value.toISOString();
  return new Date(value).toISOString();
};

const normalizeNullableText = (value: any) => (value && `${value}`.trim() !== '' ? value : null);

const resolveRemoteResponsableId = async (responsableId: any) => {
  if (!responsableId) return null;

  const remoteUser = await remoteSql`SELECT id FROM users WHERE id = ${responsableId} LIMIT 1`;
  return remoteUser.length > 0 ? responsableId : null;
};

async function upsertRemoteCosecha(record: any) {
  const remoteResponsableId = await resolveRemoteResponsableId(record.responsable_id);

  await remoteSql`
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
}

export const cosechaService = {
  async create(data: typeof cosecha.$inferInsert) {
    const record = {
      ...data,
      id: data.id ?? uuidv4(),
      fecha_creacion: data.fecha_creacion || new Date().toISOString(),
      fecha_modificacion: data.fecha_modificacion || new Date().toISOString(),
      is_synced: false,
      sync_status: 'pending' as const,
    };

    const inserted = await db.insert(cosecha).values(record).returning();

    if (process.env.EXPO_PUBLIC_DATABASE_URL && (await networkService.isOnline())) {
      try {
        await upsertRemoteCosecha(record);
        await db.update(cosecha)
          .set({ is_synced: true, sync_status: 'synced' })
          .where(eq(cosecha.id, record.id));
      } catch (error) {
        console.error(`[cosechaService] Error guardando cosecha remota para ${record.id}:`, error);
      }
    }

    return inserted;
  },

  async update(id: string, data: Partial<typeof cosecha.$inferInsert>) {
    const updated = await db
      .update(cosecha)
      .set({
        ...data,
        is_synced: false,
        sync_status: 'pending',
        fecha_modificacion: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(cosecha.id, id))
      .returning();

    if (process.env.EXPO_PUBLIC_DATABASE_URL && (await networkService.isOnline())) {
      try {
        const localRecord = updated[0];
        if (localRecord) {
          await upsertRemoteCosecha(localRecord);
          await db.update(cosecha)
            .set({ is_synced: true, sync_status: 'synced' })
            .where(eq(cosecha.id, id));
        }
      } catch (error) {
        console.error(`[cosechaService] Error actualizando cosecha remota para ${id}:`, error);
      }
    }

    return updated;
  },

  async getByLoteId(loteId: string): Promise<any | null> {
    const result = await db
      .select()
      .from(cosecha)
      .where(eq(cosecha.lote_id, loteId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  },
}; // 👈 y que este cierre exista

export const asignacionPersonalService = {
  async updateCosecha(
    asignacionId: string,
    data: {
      cantidad_cosechada: number;
      tipo_grano: string;
      pago_calculado: number;
    }
  ): Promise<void> {
    await db
      .update(asignacion_personal)
      .set({
        cantidad_cosechada: data.cantidad_cosechada,
        tipo_grano: data.tipo_grano,
        pago_calculado: data.pago_calculado,
        is_synced: false,
        sync_status: 'pending',
        fecha_modificacion: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(asignacion_personal.id, asignacionId));

    const dbUrl = process.env.EXPO_PUBLIC_DATABASE_URL;
    if (!dbUrl || !(await networkService.isOnline())) {
      return;
    }

    try {
      await remoteSql`
        UPDATE asignacion_personal
        SET cantidad_cosechada = ${data.cantidad_cosechada},
            tipo_grano = ${data.tipo_grano},
            pago_calculado = ${data.pago_calculado},
            is_synced = true
        WHERE id = ${asignacionId}
      `;

      await db
        .update(asignacion_personal)
        .set({ is_synced: true, sync_status: 'synced' })
        .where(eq(asignacion_personal.id, asignacionId));
    } catch (error) {
      console.error(`[asignacionPersonalService] Error actualizando cosecha remota para ${asignacionId}:`, error);
    }
  },
};