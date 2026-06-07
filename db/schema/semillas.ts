import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { catalogo } from './catalogo';

export const semillas = sqliteTable('semillas', {
  id: text('id').primaryKey(),
  variedad_id: text('variedad_id').references(() => catalogo.id).notNull(),
  pais_origen_id: text('pais_origen_id').references(() => catalogo.id),
  distribuidor_id: text('distribuidor_id').references(() => catalogo.id),
  metodo_secado_id: text('metodo_secado_id').references(() => catalogo.id),
  seleccion_id: text('seleccion_id').references(() => catalogo.id),
  olor_id: text('olor_id').references(() => catalogo.id),
  color_id: text('color_id').references(() => catalogo.id),
  integridad_id: text('integridad_id').references(() => catalogo.id),
  anexo_ruta: text('anexo_ruta'),
  anexo_tamano: integer('anexo_tamano'),
  anexo_creacion: text('anexo_creacion'),
  fecha_creacion: text('fecha_creacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(), // Use true instead of 1
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(), // Use false instead of 0
  sync_status: text('sync_status', { enum: ['synced', 'pending', 'error'] }).default('pending').notNull(),
});
