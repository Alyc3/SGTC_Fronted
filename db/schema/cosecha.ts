import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { lotes } from './lotes';
import { users } from './users';

export const cosecha = sqliteTable('cosecha', {
  id: text('id').primaryKey(),
  lote_id: text('lote_id').references(() => lotes.id).notNull(),
  responsable_id: text('responsable_id').references(() => users.id),
  grados_brix: real('grados_brix').notNull(),
  peso_kilos: real('peso_kilos').notNull(),
  imagen_evidencia_uri: text('imagen_evidencia_uri'),
  observaciones: text('observaciones'),
  fecha_inicio: text('fecha_inicio').notNull(),
  calidad_cosecha: text('calidad_cosecha', {
    enum: ['alta', 'media', 'baja']
  }),
  tarifa_por_kilo: real('tarifa_por_kilo'),
  fecha_final: text('fecha_final'),
  duracion_horas: real('duracion_horas'),
  fecha_creacion: text('fecha_creacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
  sync_status: text('sync_status', { enum: ['synced', 'pending', 'error'] }).default('pending').notNull(),
});
