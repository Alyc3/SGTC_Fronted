import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { RolTrabajadorValues } from './enums';

export const personal = sqliteTable('personal', {
  id: text('id').primaryKey(),
  identificacion: text('identificacion').unique().notNull(),
  nombres: text('nombres').notNull(),
  apellidos: text('apellidos').notNull(),
  telefono: text('telefono'),
  rol: text('rol', { enum: RolTrabajadorValues }).notNull(),
  fecha_creacion: text('fecha_creacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
});
