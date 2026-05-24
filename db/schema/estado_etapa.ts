import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { lotes } from './lotes';
import { EtapaProcesoValues, EtapaActualValues, SubFaseSiembraValues } from './enums';

export const estado_etapa = sqliteTable('estado_etapa', {
  id: text('id').primaryKey(),
  lote_id: text('lote_id').references(() => lotes.id).notNull(),
  etapa: text('etapa', { enum: EtapaProcesoValues }).notNull(),
  estado: text('estado', { enum: EtapaActualValues }).default('Pendiente').notNull(),
  fecha_inicio: text('fecha_inicio'),
  fecha_final: text('fecha_final'),
  duracion_calculada: real('duracion_calculada'),
  subFaseSiembra: text('sub_fase_siembra', { enum: SubFaseSiembraValues }),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
});
