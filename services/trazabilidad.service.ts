import { db } from '../db';
import { 
  semillas, parcelas, lotes, personal, 
  asignacion_personal, estado_etapa,
  SubFaseSiembraValues, EtapaActualValues, EtapaProcesoValues
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const trazabilidadService = {
  async getSemillas() {
    return await db.query.semillas.findMany();
  },
  async createSemilla(data: typeof semillas.$inferInsert) {
    return await db.insert(semillas).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async updateSemilla(id: string, data: Partial<typeof semillas.$inferInsert>) {
    return await db.update(semillas).set({ ...data, is_synced: false }).where(eq(semillas.id, id)).returning();
  },

  async getParcelas() {
    return await db.query.parcelas.findMany();
  },
  async createParcela(data: typeof parcelas.$inferInsert) {
    return await db.insert(parcelas).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async updateParcela(id: string, data: Partial<typeof parcelas.$inferInsert>) {
    return await db.update(parcelas).set({ 
      ...data, 
      is_synced: false,
      fecha_modificacion: new Date().toISOString() 
    }).where(eq(parcelas.id, id)).returning();
  },

  async getLotes() {
    return await db.query.lotes.findMany({
      with: {
        parcela: true,
        semilla: true,
      }
    });
  },
  async createLote(data: typeof lotes.$inferInsert) {
    const id = data.id ?? uuidv4();
    await db.insert(lotes).values({ ...data, id });
    await db.insert(estado_etapa).values({
      id: uuidv4(),
      lote_id: id,
      etapa: 'Sembrado',
      subFaseSiembra: 'Germinacion',
      estado: 'Pendiente',
    });
    return id;
  },

  async getPersonal() {
    return await db.query.personal.findMany();
  },
  async createPersonal(data: typeof personal.$inferInsert) {
    return await db.insert(personal).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },

  async asignarPersonal(loteId: string, trabajadorId: string, etapa: typeof EtapaProcesoValues[number], extras?: Partial<typeof asignacion_personal.$inferInsert>) {
    return await db.insert(asignacion_personal).values({
      id: uuidv4(),
      lote_id: loteId,
      trabajador_id: trabajadorId,
      etapa: etapa,
      ...extras
    }).returning();
  },

  async gestionarEtapaSembrado(loteId: string, subFase: typeof SubFaseSiembraValues[number], estado: typeof EtapaActualValues[number]) {
    const existing = await db.query.estado_etapa.findFirst({
      where: and(eq(estado_etapa.lote_id, loteId), eq(estado_etapa.etapa, 'Sembrado'))
    });

    if (existing) {
      return await db.update(estado_etapa).set({ subFaseSiembra: subFase, estado, is_synced: false }).where(eq(estado_etapa.id, existing.id)).returning();
    }
    return await db.insert(estado_etapa).values({ id: uuidv4(), lote_id: loteId, etapa: 'Sembrado', subFaseSiembra: subFase, estado }).returning();
  }
};
