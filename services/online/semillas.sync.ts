import { db } from '../../db';
import { semillas, catalogo } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { catalogoSync } from './catalogo.sync';

const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

export const semillasSync = {
  async sync() {
    await this.push();
    await this.pull();
  },

  async push() {
    const pending = await db.select().from(semillas).where(eq(semillas.is_synced, false));
    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        await this.pushRecord(record);
      } catch (err) {
        console.error(`Sync error semillas ${record.id}:`, err);
      }
    }
  },

  async pushRecord(record: any) {
    // Asegurar formato ISO para las fechas
    const fechaCreacion = record.fecha_creacion ? new Date(record.fecha_creacion).toISOString() : new Date().toISOString();
    const fechaModificacion = record.fecha_modificacion ? new Date(record.fecha_modificacion).toISOString() : new Date().toISOString();

    // Primero asegurar que las llaves foráneas de catálogo existan en Neon
    const foreignKeys = [
      record.variedad_id,
      record.pais_origen_id,
      record.distribuidor_id,
      record.metodo_secado_id,
      record.seleccion_id,
      record.olor_id,
      record.color_id,
      record.integridad_id
    ];

    for (const fkId of foreignKeys) {
      if (fkId) {
        const remoteCatalog = await sql`SELECT id FROM catalogo WHERE id = ${fkId}`;
        if (remoteCatalog.length === 0) {
          console.log(`[semillasSync] Catálogo ${fkId} no encontrado en Neon. Forzando push...`);
          const localCatalog = await db.query.catalogo.findFirst({
            where: eq(catalogo.id, fkId)
          });
          if (localCatalog) {
            await catalogoSync.pushRecord(localCatalog);
          }
        }
      }
    }

    await sql`
      INSERT INTO semillas (
        id, variedad_id, pais_origen_id, distribuidor_id, 
        metodo_secado_id, seleccion_id, olor_id, color_id, 
        integridad_id, anexo_ruta, anexo_tamano, anexo_creacion, 
        fecha_creacion, fecha_modificacion, is_synced
      )
      VALUES (
        ${record.id}, 
        ${record.variedad_id}, 
        ${record.pais_origen_id || null}, 
        ${record.distribuidor_id || null},
        ${record.metodo_secado_id || null}, 
        ${record.seleccion_id || null}, 
        ${record.olor_id || null}, 
        ${record.color_id || null},
        ${record.integridad_id || null}, 
        ${record.anexo_ruta || null}, 
        ${record.anexo_tamano || null}, 
        ${record.anexo_creacion || null},
        ${fechaCreacion}, 
        ${fechaModificacion}, 
        true
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
        fecha_modificacion = EXCLUDED.fecha_modificacion,
        is_synced = true
    `;
    
    await db.update(semillas).set({ is_synced: true }).where(eq(semillas.id, record.id));
  },

  async pull() {
    try {
      const remoteData = await sql`SELECT * FROM semillas`;
      for (const record of remoteData) {
        await db.insert(semillas).values({
          id: record.id,
          variedad_id: record.variedad_id,
          pais_origen_id: record.pais_origen_id,
          distribuidor_id: record.distribuidor_id,
          metodo_secado_id: record.metodo_secado_id,
          seleccion_id: record.seleccion_id,
          olor_id: record.olor_id,
          color_id: record.color_id,
          integridad_id: record.integridad_id,
          anexo_ruta: record.anexo_ruta,
          anexo_tamano: record.anexo_tamano,
          anexo_creacion: record.anexo_creacion,
          fecha_creacion: record.fecha_creacion?.toISOString ? record.fecha_creacion.toISOString() : record.fecha_creacion,
          fecha_modificacion: record.fecha_modificacion?.toISOString ? record.fecha_modificacion.toISOString() : record.fecha_modificacion,
          activo: record.activo,
          is_synced: true
        }).onConflictDoUpdate({
          target: semillas.id,
          set: {
            variedad_id: record.variedad_id,
            pais_origen_id: record.pais_origen_id,
            distribuidor_id: record.distribuidor_id,
            metodo_secado_id: record.metodo_secado_id,
            seleccion_id: record.seleccion_id,
            olor_id: record.olor_id,
            color_id: record.color_id,
            integridad_id: record.integridad_id,
            anexo_ruta: record.anexo_ruta,
            anexo_tamano: record.anexo_tamano,
            fecha_modificacion: record.fecha_modificacion?.toISOString ? record.fecha_modificacion.toISOString() : record.fecha_modificacion,
            activo: record.activo,
            is_synced: true
          }
        });
      }
    } catch (err) {
      console.error(`Pull error semillas:`, err);
    }
  }
};
