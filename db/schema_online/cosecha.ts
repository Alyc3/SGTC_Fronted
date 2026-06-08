import { pgTable, text, boolean, timestamp, real } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { lotes } from './lotes';

export const cosecha = pgTable('cosecha', {
  id: text('id').primaryKey(),
  lote_id: text('lote_id').references(() => lotes.id).notNull(),
  responsable_id: text('responsable_id'),
  grados_brix: real('grados_brix').notNull(),
  peso_kilos: real('peso_kilos').notNull(),
  imagen_evidencia_uri: text('imagen_evidencia_uri'),
  observaciones: text('observaciones'),
  fecha_inicio: text('fecha_inicio').notNull(),
  calidad_cosecha: text('calidad_cosecha'),
  tarifa_por_kilo: real('tarifa_por_kilo'),
  fecha_final: text('fecha_final'),
  duracion_horas: real('duracion_horas'),
  fecha_creacion: timestamp('fecha_creacion').defaultNow().notNull(),
  fecha_modificacion: timestamp('fecha_modificacion').defaultNow().notNull(),
  is_synced: boolean('is_synced').default(false).notNull(),
});
