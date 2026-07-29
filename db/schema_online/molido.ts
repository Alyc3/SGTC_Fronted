import { pgTable, text, boolean, timestamp, real } from 'drizzle-orm/pg-core';
import { lotes } from './lotes';

export const molido = pgTable('molido', {
    id: text('id').primaryKey(),
    lote_id: text('lote_id').references(() => lotes.id).notNull(),
    responsable_id: text('responsable_id'),
    granulometria: text('granulometria'),
    temperatura: real('temperatura'),
    imagen_evidencia_uri: text('imagen_evidencia_uri'),
    fecha_inicio: text('fecha_inicio').notNull(),
    fecha_final: text('fecha_final'),
    fecha_creacion: timestamp('fecha_creacion').defaultNow().notNull(),
    fecha_modificacion: timestamp('fecha_modificacion').defaultNow().notNull(),
    is_synced: boolean('is_synced').default(false).notNull(),
});