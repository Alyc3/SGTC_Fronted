import { db } from '../db';
import { metricas_subetapa_sembrado } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const sembradoMetricasService = {
  /**
   * Get metrics for a specific lot and sub-phase
   */
  async getMetricas(loteId: string, subfase: any) {
    try {
      const result = await db.query.metricas_subetapa_sembrado.findFirst({
        where: and(
          eq(metricas_subetapa_sembrado.lote_id, loteId),
          eq(metricas_subetapa_sembrado.subfase, subfase)
        ),
        orderBy: (metricas, { desc }) => [desc(metricas.fecha_inicio)],
      });
      return result || null;
    } catch (error) {
      console.error('Error fetching sembrado metrics:', error);
      return null;
    }
  },

  /**
   * Save or update metrics for a sub-phase
   */
  async saveMetricas(data: any) {
    try {
      const { lote_id, subfase, tecnico_id, id: metricId } = data;
      
      if (metricId) {
        // Explicitly update existing record
        await db.update(metricas_subetapa_sembrado)
          .set({
            ...data,
            is_synced: 0,
          })
          .where(eq(metricas_subetapa_sembrado.id, metricId));
        return metricId;
      }

      // Check if an open record already exists for this sub-phase
      const existing = await this.getMetricas(lote_id, subfase);

      if (existing && !existing.fecha_fin) {
        // Update existing open record
        await db.update(metricas_subetapa_sembrado)
          .set({
            ...data,
            is_synced: 0,
          })
          .where(eq(metricas_subetapa_sembrado.id, existing.id));
        return existing.id;
      } else {
        // Create new record
        const id = uuidv4();
        await db.insert(metricas_subetapa_sembrado).values({
          id,
          ...data,
          fecha_inicio: data.fecha_inicio || new Date().toISOString(),
          is_synced: 0,
        });
        return id;
      }
    } catch (error) {
      console.error('Error saving sembrado metrics:', error);
      throw error;
    }
  },

  /**
   * Close a sub-phase by setting the end date
   */
  async closeSubfase(loteId: string, subfase: any) {
    try {
      const existing = await this.getMetricas(loteId, subfase);
      if (existing && !existing.fecha_fin) {
        await db.update(metricas_subetapa_sembrado)
          .set({
            fecha_fin: new Date().toISOString(),
            is_synced: 0,
          })
          .where(eq(metricas_subetapa_sembrado.id, existing.id));
      }
    } catch (error) {
      console.error('Error closing sub-phase:', error);
    }
  }
};
