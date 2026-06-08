import { pgTable, text, boolean, timestamp, real, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { lotes } from './lotes';

export const metricas_subetapa_sembrado = pgTable('metricas_subetapa_sembrado', {
  id: text('id').primaryKey(),
  lote_id: text('lote_id').references(() => lotes.id).notNull(),
  tecnico_id: text('tecnico_id').notNull(), 
  subfase: text('subfase').notNull(),
  
  fecha_inicio: timestamp('fecha_inicio').defaultNow().notNull(),
  fecha_fin: timestamp('fecha_fin'), 

  // --- 1. GERMINACIÓN ---
  tasa_germinacion: real('tasa_germinacion'),
  dias_emergencia: integer('dias_emergencia'),
  presencia_hongos: text('presencia_hongos'),

  // --- 2. VIVERO ---
  pares_hojas_verdaderas: integer('pares_hojas_verdaderas'),
  altura_plantula: real('altura_plantula'),
  vigor_radicular: text('vigor_radicular'),

  // --- 3. CRECIMIENTO ---
  indice_crecimiento: real('indice_crecimiento'),
  grosor_tallo: real('grosor_tallo'),
  formacion_bandolas: integer('formacion_bandolas'),
  incidencia_foliar: real('incidencia_foliar'),

  // --- 4. FLORACIÓN ---
  intensidad_floracion: text('intensidad_floracion'),
  uniformidad_floracion: text('uniformidad_floracion'),
  estres_hidrico: text('estres_hidrico'),

  // --- 5. MADURACIÓN ---
  porcentaje_cuajado: real('porcentaje_cuajado'),
  homogeneidad_maduracion: text('homogeneidad_maduracion'),
  incidencia_broca: real('incidencia_broca'),
  grados_brix: real('grados_brix'),

  is_synced: boolean('is_synced').default(false).notNull(),
});
