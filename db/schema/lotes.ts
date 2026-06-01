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
  variedadCafe: text('variedad_cafe'),
  porcentajeProgreso: real('porcentaje_progreso').default(0),
  costoTotalManoObra: real('costo_total_mano_obra').default(0),
  estado_lote: text('estado_lote', { enum: EstadoLoteValues }).default('Creado').notNull(),
  calidadFinal: text('calidad_final', { enum: CalidadFinalValues }),
  fecha_creacion: text('fecha_creacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
  sync_status: text('sync_status', { enum: ['synced', 'pending', 'error'] }).default('pending').notNull(),
});
