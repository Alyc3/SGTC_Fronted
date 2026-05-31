import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { lotes } from './lotes';
import { users } from './users';
import { EtapaProcesoValues } from './enums';

export const asignacion_personal = sqliteTable('asignacion_personal', {
  id: text('id').primaryKey(),
  lote_id: text('lote_id').references(() => lotes.id).notNull(),
  etapa: text('etapa', { enum: EtapaProcesoValues }).notNull(),
  trabajador_id: text('trabajador_id').references(() => users.id).notNull(),
  tipo_grano: text('tipo_grano'),
  pago_calculado: real('pago_calculado'),
  fechaAsignacion: text('fecha_asignacion').default(sql`CURRENT_TIMESTAMP`),
  fecha_jornada: text('fecha_jornada'),
  horasTrabajadas: real('horas_trabajadas'),
  cantidad_cosechada: real('cantidad_cosechada'),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
});
