import { pgTable, text, boolean, timestamp, real } from 'drizzle-orm/pg-core';
import { lotes } from './lotes';

export const estado_etapa = pgTable('estado_etapa', {
  id: text('id').primaryKey(),
  lote_id: text('lote_id').references(() => lotes.id).notNull(),
  etapa: text('etapa').notNull(),
  estado: text('estado').default('Pendiente').notNull(),
  fecha_inicio: text('fecha_inicio'),
  fecha_final: text('fecha_final'),
  duracion_calculada: real('duracion_calculada'),
  sub_fase_siembra: text('sub_fase_siembra'),
  is_synced: boolean('is_synced').default(false).notNull(),
});
