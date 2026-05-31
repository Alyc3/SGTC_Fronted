import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  first_name: text('first_name'),
  last_name: text('last_name'),
  identifier: text('identifier').unique(),
  phone_number: text('phone_number').unique(),
  password_hash: text('password_hash').notNull(),
  role_id: text('role_id').notNull(),
  status: text('status').default('ACTIVO').notNull(),
  suspended_from: text('suspended_from'),
  suspended_until: text('suspended_until'),
  session_token: text('session_token').unique(),
  
  // Campos locales de sincronización y auditoría
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
  fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
