import { db } from '../db';
import { catalogo } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { neon } from '@neondatabase/serverless';
import { EXPO_PUBLIC_DATABASE_URL } from '@env';
import { networkService } from './network.service';

const sql = neon(EXPO_PUBLIC_DATABASE_URL);

export const catalogoService = {
  async getAll() {
    const localItems = await db.query.catalogo.findMany({
      where: eq(catalogo.activo, true),
      orderBy: (catalogo, { asc }) => [asc(catalogo.valor)]
    });

    let onlineItems: any[] = [];
    if (EXPO_PUBLIC_DATABASE_URL && await networkService.isOnline()) {
      try {
        onlineItems = await sql`SELECT * FROM catalogo WHERE activo = true ORDER BY valor ASC`;
      } catch (err) {
        console.error('Error fetching online catalogue:', err);
      }
    }

    // Fusionar con Doble Validación (ID y Contenido)
    const itemMap = new Map();
    const contentSet = new Set(); // Para evitar "Colombia" con 2 IDs distintos

    const addItem = (item: any) => {
      const cleanValue = (item.valor || '').trim().toLowerCase();
      const contentKey = `${item.categoria}_${cleanValue}`;

      if (!itemMap.has(item.id) && !contentSet.has(contentKey)) {
        itemMap.set(item.id, item);
        contentSet.add(contentKey);
      }
    };

    // Prioridad Local
    localItems.forEach(addItem);
    // Complemento Online
    onlineItems.forEach(addItem);

    return Array.from(itemMap.values()).sort((a, b) => a.valor.localeCompare(b.valor));
  },

  async getByCategoria(categoria: string) {
    const all = await this.getAll();
    return all.filter(item => item.categoria === categoria && item.activo);
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
