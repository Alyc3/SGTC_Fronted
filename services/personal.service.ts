import { db } from '../db';
import { users, asignacion_personal } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const personalService = {
  async getAll() {
    return await db.query.users.findMany();
  },
  async create(data: typeof users.$inferInsert) {
    return await db.insert(users).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async update(id: string, data: Partial<typeof users.$inferInsert>) {
    return await db.update(users).set({ 
      ...data, 
      is_synced: false,
      fecha_modificacion: new Date().toISOString() 
    }).where(eq(users.id, id)).returning();
  },
  async delete(id: string) {
    return await db.delete(users).where(eq(users.id, id)).returning();
  },

  async validateCapatazAssignment(loteId: string, selectedIds: string[], hectareas: number) {
    // 1. Verificar si alguno de los seleccionados ya está asignado a CUALQUIER otro lote
    for (const id of selectedIds) {
      const globalAssignment = await db.query.asignacion_personal.findFirst({
        where: (asig, { eq, and, ne }) => and(
          eq(asig.trabajador_id, id),
          eq(asig.etapa, 'Administración' as any),
          // Si estamos actualizando, ignoramos la asignación al lote actual si ya existía
          ne(asig.lote_id, loteId)
        ),
        with: {
          lote: true,
          trabajador: true
        }
      });

      if (globalAssignment) {
        const workerName = `${globalAssignment.trabajador?.first_name || ''} ${globalAssignment.trabajador?.last_name || ''}`.trim();
        const loteCode = globalAssignment.lote?.codigo || 'Desconocido';
        return {
          valid: false,
          message: `El usuario ${workerName} ya está asignado al lote ${loteCode}. Un capataz solo puede ser responsable técnico de un lote a la vez.`
        };
      }
    }

    // 2. Obtener asignaciones actuales específicamente para ESTE lote
    const existingAssignments = await db.query.asignacion_personal.findMany({
      where: (asig, { eq, and }) => and(
        eq(asig.lote_id, loteId),
        eq(asig.etapa, 'Administración' as any)
      )
    });

    const existingIds = existingAssignments.map(a => a.trabajador_id);
    
    // 2. Verificar si alguno de los seleccionados ya está en la BD
    for (const id of selectedIds) {
      if (existingIds.includes(id)) {
        return { 
          valid: false, 
          message: 'Uno o más de los capataces seleccionados ya están vinculados a este lote. Por favor, desmarque los ya asignados.' 
        };
      }
    }

    // 3. Definir reglas de negocio (Mínimo y Máximo)
    let min = 1;
    let max = 1;

    if (hectareas > 10) {
      min = 2;
      max = 5;
    } else if (hectareas > 5) {
      min = 2;
      max = 2;
    }

    const totalProposed = existingIds.length + selectedIds.length;

    // Si el total propuesto es menor al mínimo
    if (totalProposed < min) {
      return {
        valid: false,
        message: `Restricción Técnica: Para un lote de ${hectareas} hectáreas, se requiere un MÍNIMO de ${min} capataz/ces responsable(s). Actualmente hay ${existingIds.length} y ha seleccionado ${selectedIds.length}.`
      };
    }

    // Si el total propuesto excede el máximo
    if (totalProposed > max) {
      return {
        valid: false,
        message: `Restricción Técnica: Para un lote de ${hectareas} hectáreas, el MÁXIMO permitido es de ${max} capataz/ces. El total resultante sería ${totalProposed}.`
      };
    }

    return { valid: true };
  },
  
  /**
   * Filtra una lista de trabajadores basándose en un término de búsqueda
   * Busca en: Nombre, Apellido, Identificación y Nombre de Rol
   */
  filterWorkers(workers: any[], rolesMap: Record<string, string>, term: string) {
    if (!term.trim()) return workers;
    
    const search = term.toLowerCase().trim();
    
    return workers.filter(w => {
      const firstName = (w.first_name || '').toLowerCase();
      const lastName = (w.last_name || '').toLowerCase();
      const identifier = (w.identifier || '').toLowerCase();
      const roleName = (rolesMap[w.role_id] || '').toLowerCase();
      
      return firstName.includes(search) || 
             lastName.includes(search) || 
             identifier.includes(search) || 
             roleName.includes(search);
    });
  }
};
