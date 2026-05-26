import { catalogoService } from './catalogo.service';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { catalogo } from '../db/schema';

const INITIAL_CATALOGO = [
  // Variedades de Café
  { categoria: 'VARIEDAD_CAFE', valor: 'Caturra Amarillo' },
  { categoria: 'VARIEDAD_CAFE', valor: 'Geisha Panama Reserve' },
  { categoria: 'VARIEDAD_CAFE', valor: 'Bourbon Sidra' },
  { categoria: 'VARIEDAD_CAFE', valor: 'Typica Mejorado' },

  // Países de Origen
  { categoria: 'PAIS_ORIGEN', valor: 'Huila, Colombia' },
  { categoria: 'PAIS_ORIGEN', valor: 'Valle Central, Costa Rica' },
  { categoria: 'PAIS_ORIGEN', valor: 'Sidama, Ethiopia' },
  { categoria: 'PAIS_ORIGEN', valor: 'Antigua, Guatemala' },

  // Distribuidores
  { categoria: 'DISTRIBUIDOR', valor: 'Global Estate Partners Ltd.' },
  { categoria: 'DISTRIBUIDOR', valor: 'Origin Select Imports' },
  { categoria: 'DISTRIBUIDOR', valor: 'Terroir Sourcing Collective' },

  // Métodos de Secado
  { categoria: 'METODO_SECADO', valor: 'Al sol en patio' },
  { categoria: 'METODO_SECADO', valor: 'Camas africanas' },
  { categoria: 'METODO_SECADO', valor: 'Marquesinas' },
  { categoria: 'METODO_SECADO', valor: 'Mecánico' },
  { categoria: 'METODO_SECADO', valor: 'Mixto' },
  { categoria: 'METODO_SECADO', valor: 'Secado a la sombra' },

  // Selección
  { categoria: 'SELECCION', valor: 'Manual' },
  { categoria: 'SELECCION', valor: 'Por flotación' },
  { categoria: 'SELECCION', valor: 'Por mallas / Zarandas' },
  { categoria: 'SELECCION', valor: 'Mecánica / Neumática' },
  { categoria: 'SELECCION', valor: 'Óptica / Electrónica' },

  // Olor
  { categoria: 'OLOR', valor: 'Fresco' },
  { categoria: 'OLOR', valor: 'A tierra / Moho' },
  { categoria: 'OLOR', valor: 'Fermento / Avinagrado' },
  { categoria: 'OLOR', valor: 'Reposado / Rancio' },
  { categoria: 'OLOR', valor: 'A humo' },

  // Color
  { categoria: 'COLOR', valor: 'Amarillo pajizo / Claro' },
  { categoria: 'COLOR', valor: 'Blanquecino / Hueso' },
  { categoria: 'COLOR', valor: 'Grisáceo / Opaco' },
  { categoria: 'COLOR', valor: 'Manchado / Moteado' },

  // Integridad
  { categoria: 'INTEGRIDAD', valor: 'Intacto / Completo' },
  { categoria: 'INTEGRIDAD', valor: 'Fisurado / Agrietado' },
  { categoria: 'INTEGRIDAD', valor: 'Pelado / Trillado parcialmente' },
  { categoria: 'INTEGRIDAD', valor: 'Aplastado / Machacado' },
  { categoria: 'INTEGRIDAD', valor: 'Perforado / Brocado' },
];

export const seedService = {
  // Función para generar un ID determinista basado en el contenido
  generateDeterministicId(categoria: string, valor: string) {
    const combined = `${categoria}_${valor}`.toLowerCase().replace(/\s+/g, '_');
    // Simple cleaning to avoid special chars in ID
    return combined.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, '');
  },

  async initCatalogo() {
    try {
      // 1. Verificar si ya hay datos locales en el catálogo para no duplicar
      const existingLocal = await db.query.catalogo.findMany();
      
      if (existingLocal.length > 0) {
        console.log('--- El catálogo local ya contiene datos. Omitiendo seed inicial. ---');
        return;
      }

      console.log('--- Iniciando Auto-poblado de Catálogo (Seed Determinista) ---');
      
      // 2. Insertar los valores iniciales
      for (const item of INITIAL_CATALOGO) {
        const deterministicId = this.generateDeterministicId(item.categoria, item.valor);
        await catalogoService.create({
          id: deterministicId,
          categoria: item.categoria,
          valor: item.valor,
          activo: true,
          origen_local: true,
          is_synced: false
        });
      }

      console.log(`--- Seed completado: ${INITIAL_CATALOGO.length} registros creados con IDs estables. ---`);
    } catch (error) {
      console.error('Error durante el seed del catálogo:', error);
    }
  }
};
