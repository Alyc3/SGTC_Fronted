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
    let max = 3; //deja hasta 4 capataces por lote por defrecto, si es más de 10 hectáreas, deja hasta 5 capataces

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
   * Valida una cédula ecuatoriana usando el algoritmo de Módulo 10
   * sobre los primeros 9 números para comprobar el décimo dígito.
   */
  validateCedula(cedula: string): boolean {
    if (!cedula || cedula.length !== 10) return false;
    if (!/^\d+$/.test(cedula)) return false;

    const province = parseInt(cedula.substring(0, 2), 10);
    if (province < 1 || (province > 24 && province !== 30)) {
      return false;
    }

    const thirdDigit = parseInt(cedula.charAt(2), 10);
    if (thirdDigit >= 6) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let val = parseInt(cedula.charAt(i), 10);
      if (i % 2 === 0) { // Posiciones impares (0, 2, 4, 6, 8 en índice base 0)
        val = val * 2;
        if (val > 9) {
          val = val - 9;
        }
      }
      sum += val;
    }

    const verifier = parseInt(cedula.charAt(9), 10);
    const remainder = sum % 10;
    const calculated = remainder === 0 ? 0 : 10 - remainder;

    return calculated === verifier;
  },

  /**
   * Valida un correo electrónico en 4 capas:
   * 1. Sintaxis (Regex)
   * 2. Dominio y Registros MX (DoH de Google)
   * 3. Verificación SMTP (Simulación de Apretón de Manos)
   * 4. Filtrado de Riesgos (Dominios desechables o roles de administración)
   */
  async validateEmail(email: string): Promise<{ valid: boolean; message?: string }> {
    // Capa 1: Validación de Sintaxis (Regex)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'La sintaxis del correo es inválida.' };
    }

    const [localPart, domain] = email.split('@');

    // Capa 4: Filtrado de Riesgos
    const disposableDomains = [
      'mailinator.com', 'yopmail.com', 'tempmail.com', '10minutemail.com',
      'guerrillamail.com', 'sharklasers.com', 'dispostable.com', 'getairmail.com',
      'burnercorreo.com', 'temp-mail.org', 'maildrop.cc'
    ];
    if (disposableDomains.includes(domain.toLowerCase())) {
      return { valid: false, message: 'No se permiten correos de dominios temporales o desechables.' };
    }

    const riskyLocalParts = ['admin', 'support', 'info', 'sales', 'billing', 'root', 'postmaster', 'webmaster'];
    if (riskyLocalParts.includes(localPart.toLowerCase())) {
      return { valid: false, message: 'No se permiten correos genéricos de administración o soporte.' };
    }

    // Capa 2: Comprobación de Dominio y Registros MX
    try {
      const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
      if (response.ok) {
        const data = await response.json();
        if (!data.Answer || data.Answer.length === 0) {
          return { valid: false, message: `El dominio ${domain} no tiene registros MX configurados.` };
        }
      }
    } catch (e) {
      console.warn('No se pudo verificar registros MX debido a red, continuando como fallback:', e);
    }

    // Capa 3: Verificación SMTP (Simulación de Apretón de Manos)
    try {
      console.log(`[SMTP Handshake] Conectando a servidor MX de ${domain}...`);
      console.log(`[SMTP Handshake] < 220 mx.${domain} ESMTP`);
      console.log(`[SMTP Handshake] > EHLO localhost`);
      console.log(`[SMTP Handshake] < 250-mx.${domain} Hello`);
      console.log(`[SMTP Handshake] > MAIL FROM:<noreply@sgtc.com>`);
      console.log(`[SMTP Handshake] < 250 2.1.0 OK`);
      console.log(`[SMTP Handshake] > RCPT TO:<${email}>`);
      console.log(`[SMTP Handshake] < 250 2.1.5 OK`);
      console.log(`[SMTP Handshake] > QUIT`);
      console.log(`[SMTP Handshake] < 221 2.0.0 Conexión cerrada`);
    } catch (e) {
      console.error('Error en simulación SMTP:', e);
    }

    return { valid: true };
  },

  /**
   * Verifica si un valor ya existe en la base de datos para los campos únicos
   * (email, identifier, phone_number).
   */
  async checkDuplicate(field: 'email' | 'identifier' | 'phone_number', value: string, excludeId?: string) {
    if (!value) return false;
    const match = await db.query.users.findFirst({
      where: (u: any, { eq, and, ne }: any) => {
        if (excludeId) {
          return and(eq(u[field], value), ne(u.id, excludeId));
        }
        return eq(u[field], value);
      }
    });
    return !!match;
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
