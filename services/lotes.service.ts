import { db } from '../db';
import {
  lotes,
  estado_etapa,
  asignacion_personal,
  SubFaseSiembraValues,
  EtapaActualValues,
  EtapaProcesoValues,
  semillas,
  parcelas
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { semillasService } from './semillas.service';

export const lotesService = {
  async getAll() {
    return await db.query.lotes.findMany({
      with: {
        parcela: true,
        semilla: true,
      }
    });
  },

  async getSeeds() {
    try {
      console.log('[lotesService] Iniciando obtención de semillas técnicas...');
      const seeds = await semillasService.getAll();
      console.log(`[lotesService] Semillas recuperadas: ${seeds.length}`);
      
      seeds.forEach((s, i) => {
        console.log(`  #${i + 1}: [${s.origenDatos}] ID=${s.id.slice(0,8)}... | Variedad=${s.variedadNombre} | Origen=${s.paisNombre}`);
      });
      return seeds;
    } catch (error) {
      console.error('[lotesService] Error al obtener semillas:', error);
      throw error;
    }
  },

  async getParcelInfo(id: string) {
    return await db.query.parcelas.findFirst({
      where: eq(parcelas.id, id),
      with: {
        lotes: true
      }
    });
  },

  generateLotCode(parcelName: string, variety: string) {
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    // Sanitize variety and parcelName (remove spaces, etc)
    const cleanParcel = parcelName.replace(/\s+/g, '').slice(0, 3).toUpperCase();
    const cleanVariety = variety.replace(/\s+/g, '').slice(0, 5).toUpperCase();
    return `${cleanParcel}-${cleanVariety}-${month}${year}`;
  },

  async create(data: typeof lotes.$inferInsert) {
    const id = data.id ?? uuidv4();
    await db.insert(lotes).values({ ...data, id });

    // Inicializar etapa de sembrado por defecto
    await db.insert(estado_etapa).values({
      id: uuidv4(),
      lote_id: id,
      etapa: 'Sembrado',
      subFaseSiembra: 'Germinacion',
      estado: 'Pendiente',
    });

    return id;
  },

  async update(id: string, data: Partial<typeof lotes.$inferInsert>) {
    const lot = await db.query.lotes.findFirst({
      where: eq(lotes.id, id)
    });

    if (lot?.estado_lote === 'En_Produccion') {
      throw new Error('No se puede modificar un lote que ya está en producción.');
    }

    return await db.update(lotes).set({
      ...data,
      is_synced: false,
      fecha_modificacion: new Date().toISOString()
    }).where(eq(lotes.id, id)).returning();
  },

  async delete(id: string) {
    const lot = await db.query.lotes.findFirst({
      where: eq(lotes.id, id)
    });

    if (lot?.estado_lote === 'En_Produccion') {
      throw new Error('No se puede dar de baja un lote que está en producción.');
    }

    return await db.delete(lotes).where(eq(lotes.id, id)).returning();
  },

  async hasProductionLots(parcelId: string) {
    const productionLots = await db.query.lotes.findMany({
      where: and(
        eq(lotes.parcela_id, parcelId),
        eq(lotes.estado_lote, 'En_Produccion')
      )
    });
    return productionLots.length > 0;
  },

  // --- Lógica de Trazabilidad ---

  async asignarPersonal(loteId: string, trabajadorId: string, etapa: typeof EtapaProcesoValues[number], extras?: Partial<typeof asignacion_personal.$inferInsert>) {
    return await db.insert(asignacion_personal).values({
      id: uuidv4(),
      lote_id: loteId,
      trabajador_id: trabajadorId,
      etapa: etapa,
      ...extras
    }).returning();
  },

  async gestionarEtapaSembrado(
    loteId: string,
    subFase: typeof SubFaseSiembraValues[number],
    estado: typeof EtapaActualValues[number]
  ) {
    const existing = await db.query.estado_etapa.findFirst({
      where: and(
        eq(estado_etapa.lote_id, loteId),
        eq(estado_etapa.etapa, 'Sembrado')
      )
    });

    if (existing) {
      return await db.update(estado_etapa)
        .set({
          subFaseSiembra: subFase,
          estado: estado,
          is_synced: false,
        })
        .where(eq(estado_etapa.id, existing.id))
        .returning();
    } else {
      return await db.insert(estado_etapa).values({
        id: uuidv4(),
        lote_id: loteId,
        etapa: 'Sembrado',
        subFaseSiembra: subFase,
        estado: estado,
      }).returning();
    }
  },

  async getStages(loteId: string) {
    return await db.query.estado_etapa.findMany({
      where: eq(estado_etapa.lote_id, loteId)
    });
  },

  async updateStageStatus(loteId: string, etapa: typeof EtapaProcesoValues[number], estado: typeof EtapaActualValues[number]) {
    const existing = await db.query.estado_etapa.findFirst({
      where: and(
        eq(estado_etapa.lote_id, loteId),
        eq(estado_etapa.etapa, etapa)
      )
    });

    if (existing) {
      return await db.update(estado_etapa)
        .set({ 
          estado, 
          fecha_inicio: estado === 'En_Proceso' ? new Date().toISOString() : undefined,
          fecha_final: estado === 'Completada' ? new Date().toISOString() : undefined,
          is_synced: false 
        })
        .where(eq(estado_etapa.id, existing.id))
        .returning();
    } else {
      return await db.insert(estado_etapa).values({
        id: uuidv4(),
        lote_id: loteId,
        etapa,
        estado,
        fecha_inicio: estado === 'En_Proceso' ? new Date().toISOString() : undefined,
        fecha_final: estado === 'Completada' ? new Date().toISOString() : undefined,
      }).returning();
    }
  },

  async getAssignedPersonnel(loteId: string) {
    return await db.query.asignacion_personal.findMany({
      where: eq(asignacion_personal.lote_id, loteId),
      with: {
        trabajador: true
      }
    });
  },

  async updateEstadoLote(loteId: string, estado: typeof EstadoLoteValues[number]) {
    return await db.update(lotes)
      .set({
        estado_lote: estado,
        is_synced: false,
        fecha_modificacion: new Date().toISOString()
      })
      .where(eq(lotes.id, loteId))
      .returning();
  }
};
