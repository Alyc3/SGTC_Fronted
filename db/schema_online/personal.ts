import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const personal = pgTable('personal', {
  id: text('id').primaryKey(),
  identificacion: text('identificacion').unique().notNull(),
  nombres: text('nombres').notNull(),
  apellidos: text('apellidos').notNull(),
  telefono: text('telefono'),
  rol: text('rol').notNull(),
  fecha_creacion: timestamp('fecha_creacion').defaultNow().notNull(),
  fecha_modificacion: timestamp('fecha_modificacion').defaultNow().notNull(),
  activo: boolean('activo').default(true).notNull(),
  is_synced: boolean('is_synced').default(false).notNull(),
});
