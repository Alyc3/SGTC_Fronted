import { db } from '../db';
import { semillas, lotes } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { neon } from '@neondatabase/serverless';
import { networkService } from './network.service';

const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

export const semillasService = {
  async getAll() {
    // 1. Obtener semillas locales con relaciones completas
    const localSeeds = await db.query.semillas.findMany({
      where: eq(semillas.activo, true),
      with: {
        variedad: true,
        pais_origen: true,
      }
    });

    // 2. Obtener semillas online con JOINs para variedad y país
    let onlineSeeds: any[] = [];
    const dbUrl = process.env.EXPO_PUBLIC_DATABASE_URL;
    if (dbUrl && await networkService.isOnline()) {
      try {
        onlineSeeds = await sql`
          SELECT s.*, 
                 v.valor as variedad_nombre,
                 p.valor as pais_nombre
          FROM semillas s 
          LEFT JOIN catalogo v ON s.variedad_id = v.id 
          LEFT JOIN catalogo p ON s.pais_origen_id = p.id
          WHERE s.activo = true
        `;
      } catch (err) {
        console.error('Error fetching online seeds:', err);
      }
    }

    // 3. Fusionar y Normalizar con Doble Deduplicación (ID y Atributos Técnicos)
    const seedMap = new Map();
    const technicalKeySet = new Set(); // Para evitar duplicados con diferente ID
    
    const addSeedToMap = (s: any, isLocal: boolean) => {
      const varietyName = s.variedad?.valor || s.variedad_nombre || 'Desconocida';
      const countryName = s.pais_origen?.valor || s.pais_nombre || 'Desconocido';
      
      // Creamos una clave técnica basada en contenido: "Variedad_Pais"
      const technicalKey = `${varietyName}_${countryName}`.toLowerCase();

      // Solo agregamos si no existe el ID Y no existe la clave técnica
      if (!seedMap.has(s.id) && !technicalKeySet.has(technicalKey)) {
        seedMap.set(s.id, {
          ...s,
          variedadNombre: varietyName,
          paisNombre: countryName,
          origenDatos: isLocal ? 'Local' : 'Online'
        });
        technicalKeySet.add(technicalKey);
      }
    };

    // Procesar Locales primero (tienen prioridad)
    localSeeds.forEach(s => addSeedToMap(s, true));

    // Procesar Online después
    onlineSeeds.forEach(s => addSeedToMap(s, false));

    return Array.from(seedMap.values());
  },
  async getById(id: string) {
    return await db.query.semillas.findFirst({
      where: eq(semillas.id, id)
    });
  },
  async hasTechnicalDuplicate(data: typeof semillas.$inferInsert, excludeId?: string) {
    const existing = await db.query.semillas.findFirst({
      where: (seed, { eq, and, ne }) => {
        const baseFilter = and(
          eq(seed.variedad_id, data.variedad_id),
          eq(seed.pais_origen_id, data.pais_origen_id),
          eq(seed.distribuidor_id, data.distribuidor_id),
          eq(seed.metodo_secado_id, data.metodo_secado_id),
          eq(seed.seleccion_id, data.seleccion_id),
          eq(seed.olor_id, data.olor_id),
          eq(seed.color_id, data.color_id),
          eq(seed.integridad_id, data.integridad_id)
        );

        return excludeId ? and(baseFilter, ne(seed.id, excludeId)) : baseFilter;
      }
    });

    return !!existing;
  },
  async create(data: typeof semillas.$inferInsert) {
    return await db.insert(semillas).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async update(id: string, data: Partial<typeof semillas.$inferInsert>) {
    return await db.update(semillas).set({ 
      ...data, 
      is_synced: false,
      fecha_modificacion: new Date().toISOString() 
    }).where(eq(semillas.id, id)).returning();
  },
  async delete(id: string) {
    const linkedLot = await db.query.lotes.findFirst({
      where: eq(lotes.semilla_id, id)
    });

    if (linkedLot) {
      throw new Error('No se puede dar de baja una semilla que ya está registrada en un lote.');
    }

    // Soft delete (dar de baja)
    return await db.update(semillas)
      .set({ 
        activo: false, 
        is_synced: false, 
        fecha_modificacion: new Date().toISOString() 
      })
      .where(eq(semillas.id, id))
      .returning();
  },
  validate(data: any) {
    const fields = [
      'variedad_id', 
      'pais_origen_id', 
      'distribuidor_id', 
      'metodo_secado_id', 
      'seleccion_id', 
      'olor_id', 
      'color_id', 
      'integridad_id'
    ];
    return fields.every(field => !!data[field]);
  },
  search(data: any[], query: string) {
    if (!query || query.trim() === '') return data;
    const s = query.toLowerCase().trim();
    return data.filter(item => 
      item.variedad?.valor?.toLowerCase().includes(s) ||
      item.pais_origen?.valor?.toLowerCase().includes(s) ||
      item.distribuidor?.valor?.toLowerCase().includes(s) ||
      item.color?.valor?.toLowerCase().includes(s) ||
      item.olor?.valor?.toLowerCase().includes(s) ||
      item.metodo_secado?.valor?.toLowerCase().includes(s) ||
      item.seleccion?.valor?.toLowerCase().includes(s) ||
      item.integridad?.valor?.toLowerCase().includes(s)
    );
  }
};
