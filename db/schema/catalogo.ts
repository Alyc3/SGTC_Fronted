import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const catalogo = sqliteTable('catalogo', {
  id: text('id').primaryKey(),
  categoria: text('categoria').notNull(), // e.g., 'VARIEDAD_CAFE', 'PAIS_ORIGEN'
  valor: text('valor').notNull(),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  origen_local: integer('origen_local', { mode: 'boolean' }).default(false).notNull(),
  fecha_creacion: text('fecha_creacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
});
