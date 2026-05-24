import { pgTable, text, boolean, timestamp, integer, doublePrecision } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const catalogo = pgTable('catalogo', {
  id: text('id').primaryKey(),
  categoria: text('categoria').notNull(),
  valor: text('valor').notNull(),
  activo: boolean('activo').default(true).notNull(),
  origen_local: boolean('origen_local').default(false).notNull(),
  fecha_creacion: timestamp('fecha_creacion').defaultNow().notNull(),
  fecha_modificacion: timestamp('fecha_modificacion').defaultNow().notNull(),
  is_synced: boolean('is_synced').default(false).notNull(),
});
