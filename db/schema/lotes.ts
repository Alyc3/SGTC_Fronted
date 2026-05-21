import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { parcelas } from './parcelas';
import { semillas } from './semillas';
import { EstadoLoteValues, CalidadFinalValues } from './enums';

export const lotes = sqliteTable('lotes', {
  id: text('id').primaryKey(),
  codigo: text('codigo').unique().notNull(),
  parcela_id: text('parcela_id').references(() => parcelas.id).notNull(),
  semilla_id: text('semilla_id').references(() => semillas.id).notNull(),
  zona_seleccionada: text('zona_seleccionada'),
  hectareas_lote: real('hectareas_lote'),
  variedadCafe: text('variedadCafe'),
  porcentajeProgreso: real('porcentajeProgreso').default(0),
  costoTotalManoObra: real('costoTotalManoObra').default(0),
  estado_lote: text('estado_lote', { enum: EstadoLoteValues }).default('Creado').notNull(),
  calidadFinal: text('calidadFinal', { enum: CalidadFinalValues }),
  fecha_creacion: text('fecha_creacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
});

export const lotesRelations = relations(lotes, ({ one }) => ({
  parcela: one(parcelas, {
    fields: [lotes.parcela_id],
    references: [parcelas.id],
  }),
  semilla: one(semillas, {
    fields: [lotes.semilla_id],
    references: [semillas.id],
  }),
}));
