import { pgTable, text, boolean, timestamp, real } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { lotes } from './lotes';

export const asignacion_personal = pgTable('asignacion_personal', {
  id: text('id').primaryKey(),
  lote_id: text('lote_id').references(() => lotes.id).notNull(),
  etapa: text('etapa').notNull(),
  trabajador_id: text('trabajador_id').notNull(),
  tipo_grano: text('tipo_grano'),
  pago_calculado: real('pago_calculado'),
  fecha_asignacion: timestamp('fecha_asignacion').defaultNow(),
  fecha_jornada: text('fecha_jornada'),
  horas_trabajadas: real('horas_trabajadas'),
  cantidad_cosechada: real('cantidad_cosechada'),
  is_synced: boolean('is_synced').default(false).notNull(),
});
