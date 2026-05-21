import { db } from '../db';
import {
  lotes,
  estado_etapa,
  asignacion_personal,
  SubFaseSiembraValues,
  EtapaActualValues,
  EtapaProcesoValues
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const lotesService = {
  async getAll() {
    return await db.query.lotes.findMany({
      with: {
        parcela: true,
        semilla: true,
      }
    });
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
    return await db.update(lotes).set({
      ...data,
      is_synced: false,
      fecha_modificacion: new Date().toISOString()
    }).where(eq(lotes.id, id)).returning();
  },

  async delete(id: string) {
    return await db.delete(lotes).where(eq(lotes.id, id)).returning();
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
  }
};
