import { pgTable, text, boolean, timestamp, real } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { parcelas } from './parcelas';
import { semillas } from './semillas';

export const lotes = pgTable('lotes', {
  id: text('id').primaryKey(),
  codigo: text('codigo').unique().notNull(),
  parcela_id: text('parcela_id').references(() => parcelas.id).notNull(),
  semilla_id: text('semilla_id').references(() => semillas.id).notNull(),
  zona_seleccionada: text('zona_seleccionada'),
  hectareas_lote: real('hectareas_lote'),
  variedad_cafe: text('variedad_cafe'),
  porcentaje_progreso: real('porcentaje_progreso').default(0),
  costo_total_mano_obra: real('costo_total_mano_obra').default(0),
  estado_lote: text('estado_lote').default('Creado').notNull(),
  calidad_final: text('calidad_final'),
  fecha_creacion: timestamp('fecha_creacion').defaultNow().notNull(),
  fecha_modificacion: timestamp('fecha_modificacion').defaultNow().notNull(),
  is_synced: boolean('is_synced').default(false).notNull(),
});
