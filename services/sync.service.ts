import { db } from '../db';
import { 
  semillas, parcelas, lotes, personal, 
  asignacion_personal, estado_etapa 
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '@env';

const sql = neon(DATABASE_URL);

export const syncService = {
  async syncWithRemote() {
    if (!DATABASE_URL) return;

    try {
      await this.syncTable('semillas', semillas, (item: any) => sql`
        INSERT INTO semillas (id, variedad, pais_origen, distribuidor, anexo_ruta, anexo_tamano, anexo_creacion, is_synced)
        VALUES (${item.id}, ${item.variedad}, ${item.paisOrigen}, ${item.distribuidor}, ${item.anexo_ruta}, ${item.anexo_tamano}, ${item.anexo_creacion}, true)
        ON CONFLICT (id) DO UPDATE SET variedad = EXCLUDED.variedad, is_synced = true
      `);

      await this.syncTable('parcelas', parcelas, (item: any) => sql`
        INSERT INTO parcelas (id, codigo, hectareas, ubicacion, ph_suelo, textura, altitud_msnm, orientacion_ladera, tipo_terreno, estado, is_synced)
        VALUES (${item.id}, ${item.codigo}, ${item.hectareas}, ${item.ubicacion}, ${item.phSuelo}, ${item.textura}, ${item.altitudMsnm}, ${item.orientacionLadera}, ${item.tipoTerreno}, ${item.estado}, true)
        ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, is_synced = true
      `);

      await this.syncTable('lotes', lotes, (item: any) => sql`
        INSERT INTO lotes (id, codigo, parcela_id, semilla_id, zona_seleccionada, hectareas_lote, variedad_cafe, porcentaje_progreso, costo_total_mano_obra, estado_lote, calidad_final, is_synced)
        VALUES (${item.id}, ${item.codigo}, ${item.parcela_id}, ${item.semilla_id}, ${item.zona_seleccionada}, ${item.hectareas_lote}, ${item.variedadCafe}, ${item.porcentajeProgreso}, ${item.costoTotalManoObra}, ${item.estado_lote}, ${item.calidadFinal}, true)
        ON CONFLICT (id) DO UPDATE SET estado_lote = EXCLUDED.estado_lote, is_synced = true
      `);
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  },

  async syncTable(tableName: string, tableSchema: any, queryFn: (item: any) => Promise<any>) {
    const pendingRecords = await db.select().from(tableSchema).where(eq(tableSchema.is_synced, false));
    if (pendingRecords.length === 0) return;

    for (const record of pendingRecords) {
      try {
        await queryFn(record);
        await db.update(tableSchema).set({ is_synced: true }).where(eq(tableSchema.id, record.id));
      } catch (err) {
        console.error(`Sync error ${tableName}:`, err);
      }
    }
  }
};
