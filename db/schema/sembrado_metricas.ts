import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { lotes } from './lotes';
import { users } from './users';
import { SubFaseSiembraValues } from './enums';

export const metricas_subetapa_sembrado = sqliteTable('metricas_subetapa_sembrado', {
  id: text('id').primaryKey(),
  lote_id: text('lote_id').references(() => lotes.id).notNull(),
  tecnico_id: text('tecnico_id').references(() => users.id).notNull(), 
  subfase: text('subfase', { enum: SubFaseSiembraValues }).notNull(),
  
  fecha_inicio: text('fecha_inicio').default(sql`CURRENT_TIMESTAMP`).notNull(),
  fecha_fin: text('fecha_fin'), 

  // --- 1. GERMINACIÓN ---
  tasa_germinacion: real('tasa_germinacion'),
  dias_emergencia: integer('dias_emergencia'),
  presencia_hongos: text('presencia_hongos'),

  // --- 2. VIVERO ---
  pares_hojas_verdaderas: integer('pares_hojas_verdaderas'),
  altura_plantula: real('altura_plantula'),
  vigor_radicular: text('vigor_radicular', { enum: ['Optimo', 'Aceptable', 'Deformado'] }),

  // --- 3. CRECIMIENTO ---
  indice_crecimiento: real('indice_crecimiento'),
  grosor_tallo: real('grosor_tallo'),
  formacion_bandolas: integer('formacion_bandolas'),
  incidencia_foliar: real('incidencia_foliar'),

  // --- 4. FLORACIÓN ---
  intensidad_floracion: text('intensidad_floracion', { enum: ['Escasa', 'Media', 'Abundante'] }),
  uniformidad_floracion: text('uniformidad_floracion', { enum: ['Homogenea', 'Dispareja'] }),
  estres_hidrico: text('estres_hidrico', { enum: ['Seco', 'Lluvia_ligera', 'Tormenta'] }),

  // --- 5. MADURACIÓN ---
  porcentaje_cuajado: real('porcentaje_cuajado'),
  homogeneidad_maduracion: text('homogeneidad_maduracion', { enum: ['Uniforme', 'Irregular'] }),
  incidencia_broca: real('incidencia_broca'),
  grados_brix: real('grados_brix'),

  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
});
