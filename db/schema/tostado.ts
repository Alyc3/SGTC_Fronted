import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { lotes } from './lotes';
import { users } from './users';

export const tostado = sqliteTable('tostado', {
    id: text('id').primaryKey(),
    lote_id: text('lote_id').references(() => lotes.id).notNull(),
    responsable_id: text('responsable_id').references(() => users.id),
    duracion: integer('duracion').notNull(),
    temperatura: real('temperatura').notNull(),
    olor: text('olor', {
        enum: ['frutas', 'chocolate']
    }).notNull(),
    imagen_evidencia_uri: text('imagen_evidencia_uri').notNull(),
    fecha_inicio: text('fecha_inicio').notNull(),
    fecha_final: text('fecha_final'),
    fecha_creacion: text('fecha_creacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
    fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
    is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
    sync_status: text('sync_status', { enum: ['synced', 'pending', 'error'] }).default('pending').notNull(),
});