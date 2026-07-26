import { db } from '../db';
import { parcelas, lotes, asignacion_personal } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as Location from 'expo-location';

export const parcelasService = {
  async getAll() {
    return await db.query.parcelas.findMany();
  },
  
  /**
   * Registra la asignación de un trabajador a un lote específico para una etapa.
   * Se guarda localmente y se marca como pendiente para sincronización.
   */
  async asignarPersonal(loteId: string, trabajadorId: string, etapa: any) {
    // 1. Verificar si ya existe esta asignación exacta para evitar duplicados
    const existing = await db.query.asignacion_personal.findFirst({
      where: (asig, { eq, and }) => and(
        eq(asig.lote_id, loteId),
        eq(asig.trabajador_id, trabajadorId),
        eq(asig.etapa, etapa)
      )
    });

    if (existing) {
      return [existing]; // Ya existe, retornamos el registro actual sin duplicar
    }

    // 2. Si no existe, insertar nueva asignación
    return await db.insert(asignacion_personal).values({
      id: uuidv4(),
      lote_id: loteId,
      trabajador_id: trabajadorId,
      etapa: etapa,
      fechaAsignacion: new Date().toISOString(),
      is_synced: false,
      sync_status: 'pending',
      fecha_modificacion: new Date().toISOString()
    }).returning();
  },

  async hasAsignacion(loteId: string, trabajadorId: string, etapa: any) {
    const existing = await db.query.asignacion_personal.findFirst({
      where: (asig, { eq, and }) => and(
        eq(asig.lote_id, loteId),
        eq(asig.trabajador_id, trabajadorId),
        eq(asig.etapa, etapa)
      )
    });

    return !!existing;
  },

  async desasignarPersonal(loteId: string, trabajadorId: string, etapa: any) {
    // 1. Buscar el registro exacto para asegurar un borrado infalible por ID primario
    const existing = await db.query.asignacion_personal.findFirst({
      where: (asig, { eq, and }) => and(
        eq(asig.lote_id, loteId),
        eq(asig.trabajador_id, trabajadorId),
        eq(asig.etapa, etapa)
      )
    });

    if (existing) {
      return await db.delete(asignacion_personal)
        .where(eq(asignacion_personal.id, existing.id))
        .returning();
    }
    
    return [];
  },

  /**
   * Elimina todas las asignaciones de una etapa y lote específicos que correspondan 
   * a ciertos IDs de trabajadores (útil para barrer roles específicos).
   */
  async limpiarAsignacionesEspecificas(loteId: string, etapa: any, trabajadorIds: string[]) {
    if (trabajadorIds.length === 0) return;
    
    return await db.delete(asignacion_personal).where(
      and(
        eq(asignacion_personal.lote_id, loteId),
        eq(asignacion_personal.etapa, etapa),
        inArray(asignacion_personal.trabajador_id, trabajadorIds)
      )
    ).returning();
  },

  async countCapatacesAsignados(loteId: string) {
    const asignaciones = await db.query.asignacion_personal.findMany({
      where: (asig, { eq, and }) => and(
        eq(asig.lote_id, loteId),
        eq(asig.etapa, 'Administración')
      )
    });
    return asignaciones.length;
  },

  async isCapatazYaAsignado(loteId: string, trabajadorId: string) {
    const existing = await db.query.asignacion_personal.findFirst({
      where: (asig, { eq, and }) => and(
        eq(asig.lote_id, loteId),
        eq(asig.trabajador_id, trabajadorId),
        eq(asig.etapa, 'Administración')
      )
    });
    return !!existing;
  },

  async getById(id: string) {
    return await db.query.parcelas.findFirst({
      where: eq(parcelas.id, id),
      with: { 
        lotes: { 
          with: { semilla: true } 
        } 
      }
    });
  },
  async getLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permiso de ubicación denegado');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude || 0
      };
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      throw error;
    }
  },
  async create(data: typeof parcelas.$inferInsert) {
    return await db.insert(parcelas).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async update(id: string, data: Partial<typeof parcelas.$inferInsert>) {
    return await db.update(parcelas).set({ 
      ...data, 
      is_synced: false,
      sync_status: 'pending',
      fecha_modificacion: new Date().toISOString() 
    }).where(eq(parcelas.id, id)).returning();
  },
  async delete(id: string) {
    const productionLots = await db.query.lotes.findMany({
      where: (lotes, { eq, and }) => and(
        eq(lotes.parcela_id, id),
        eq(lotes.estado_lote, 'En_Produccion')
      )
    });

    if (productionLots.length > 0) {
      const lotCodes = productionLots.map(l => l.codigo).join(', ');
      throw new Error(`No se puede dar de baja o eliminar la parcela ya que tiene: el lote ${lotCodes} en estado En Producción.`);
    }

    return await db.delete(parcelas).where(eq(parcelas.id, id)).returning();
  },
  async deleteLote(id: string) {
    const lot = await db.query.lotes.findFirst({
      where: eq(lotes.id, id)
    });

    if (lot?.estado_lote === 'En_Produccion') {
      throw new Error('No se puede dar de baja un lote que está en producción.');
    }

    return await db.delete(lotes).where(eq(lotes.id, id)).returning();
  },
  async getLoteById(id: string) {
    return await db.query.lotes.findFirst({
      where: eq(lotes.id, id),
      with: { semilla: true }
    });
  },
  async createLote(data: typeof lotes.$inferInsert) {
    return await db.insert(lotes).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async updateLote(id: string, data: Partial<typeof lotes.$inferInsert>) {
    return await db.update(lotes).set({ 
      ...data, 
      is_synced: false,
      sync_status: 'pending',
      fecha_modificacion: new Date().toISOString() 
    }).where(eq(lotes.id, id)).returning();
  },
  async checkNombreUnico(nombre: string, excludeId?: string) {
    const existing = await db.query.parcelas.findFirst({
      where: (parcelas, { eq, and, ne }) => {
        const baseFilter = eq(parcelas.nombre, nombre);
        return excludeId ? and(baseFilter, ne(parcelas.id, excludeId)) : baseFilter;
      }
    });
    return !existing;
  },
  validate(data: { nombre?: string, hectareas?: string | number | null, altitud?: string | number | null }) {
    const errors: Record<string, string> = {};

    if (data.nombre !== undefined) {
      if (!data.nombre || data.nombre.trim() === '') {
        errors.nombre = 'El nombre de la parcela es obligatorio.';
      } else if (data.nombre.length < 3) {
        errors.nombre = 'El nombre debe tener al menos 3 caracteres.';
      } else if (data.nombre.length > 50) {
        errors.nombre = 'El nombre no puede exceder los 50 caracteres.';
      }
    }

    if (data.hectareas !== undefined) {
      const strVal = data.hectareas?.toString();
      if (!strVal || strVal.trim() === '') {
        errors.hectareas = 'El campo hectáreas es obligatorio.';
      } else if (/[^0-9.]/.test(strVal)) {
        errors.hectareas = 'Solo se permiten números.';
      } else {
        const val = parseFloat(strVal);
        if (isNaN(val)) {
          errors.hectareas = 'Debe ser un número válido.';
        } else if (val < 1) {
          errors.hectareas = 'El mínimo es 1 hectárea.';
        } else if (val > 100) {
          errors.hectareas = 'El máximo permitido es 100 hectáreas.';
        }
      }
    }

    if (data.altitud !== undefined) {
      const strVal = data.altitud?.toString() ?? '';
      if (!strVal || strVal.trim() === '') {
        errors.altitud = 'La altitud es obligatoria.';
      }
    }

    // New mandatory checks for terrain fields
    if ((data as any).tipoTerreno === undefined || (data as any).tipoTerreno === '') {
      errors.tipoTerreno = 'El tipo de terreno es obligatorio.';
    }
    if ((data as any).orientacionLadera === undefined || (data as any).orientacionLadera === '') {
      errors.orientacionLadera = 'La orientación es obligatoria.';
    }
    if ((data as any).textura === undefined || (data as any).textura === '') {
      errors.textura = 'La textura del suelo es obligatoria.';
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }
};
