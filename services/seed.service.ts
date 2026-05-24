import { catalogoService } from './catalogo.service';
import { v4 as uuidv4 } from 'uuid';

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
  async initCatalogo() {
    try {
      // 1. Verificar si ya hay datos en el catálogo para no duplicar
      const existing = await catalogoService.getAll();
      
      if (existing.length > 0) {
        console.log('--- El catálogo ya contiene datos. Omitiendo seed. ---');
        return;
      }

      console.log('--- Iniciando Auto-poblado de Catálogo (Seed) ---');
      
      // 2. Insertar los valores iniciales
      for (const item of INITIAL_CATALOGO) {
        await catalogoService.create({
          id: uuidv4(),
          categoria: item.categoria,
          valor: item.valor,
          activo: true,
          origen_local: true,
          is_synced: false
        });
      }

      console.log(`--- Seed completado: ${INITIAL_CATALOGO.length} registros creados. ---`);
    } catch (error) {
      console.error('Error durante el seed del catálogo:', error);
    }
  }
};
