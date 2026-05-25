import { db } from '../db';
import { catalogo } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const catalogoService = {
  async getAll() {
    return await db.query.catalogo.findMany({
      where: eq(catalogo.activo, true),
      orderBy: (catalogo, { asc }) => [asc(catalogo.valor)]
    });
  },

  async getByCategoria(categoria: string) {
    return await db.query.catalogo.findMany({
      where: and(
        eq(catalogo.categoria, categoria),
        eq(catalogo.activo, true)
      ),
      orderBy: (catalogo, { asc }) => [asc(catalogo.valor)]
    });
  },

  async validateNewItem(categoria: string, valor: string): Promise<{ isValid: boolean; error?: string }> {
    const cleanValue = valor.trim();
    
    if (!cleanValue) {
      return { isValid: false, error: 'El valor no puede estar vacío.' };
    }

    // Validación de caracteres (solo letras, espacios y el slash para el origen)
    if (categoria === 'PAIS_ORIGEN') {
      const regexOrigen = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+\/[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      if (!regexOrigen.test(cleanValue)) {
        return { isValid: false, error: 'Formato inválido. Debe ser exactamente CIUDAD/PAIS (solo letras).' };
      }
    } else {
      const regexGeneral = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      if (!regexGeneral.test(cleanValue)) {
        return { isValid: false, error: 'No se permiten números ni caracteres especiales.' };
      }
    }

    // Verificar duplicados ignorando mayúsculas y minúsculas
    const existingItems = await this.getByCategoria(categoria);
    const isDuplicate = existingItems.some(item => item.valor.toLowerCase() === cleanValue.toLowerCase());

    if (isDuplicate) {
      return { isValid: false, error: 'Ya existe un registro con este valor en el catálogo.' };
    }

    return { isValid: true };
  },

  async create(data: typeof catalogo.$inferInsert) {
    const id = data.id || uuidv4();
    return await db.insert(catalogo).values({ ...data, id }).returning();
  },

  async update(id: string, data: Partial<typeof catalogo.$inferInsert>) {
    return await db.update(catalogo)
      .set({ ...data, is_synced: false, fecha_modificacion: new Date().toISOString() })
      .where(eq(catalogo.id, id))
      .returning();
  },

  async delete(id: string) {
    // Soft delete preferred for lookup tables
    return await db.update(catalogo)
      .set({ activo: false, is_synced: false, fecha_modificacion: new Date().toISOString() })
      .where(eq(catalogo.id, id))
      .returning();
  }
};
