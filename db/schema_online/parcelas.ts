import { pgTable, text, boolean, timestamp, integer, real } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { TexturaSueloValues, OrientacionLaderaValues, TipoTerrenoValues, EstadoParcelaValues } from '../db/schema/enums';
import { lotes } from './lotes';

export const parcelas = pgTable('parcelas', {
  id: text('id').primaryKey(),
  nombre: text('nombre').unique().notNull(),
  hectareas: real('hectareas').notNull(),
  latitud: real('latitud'),
  longitud: real('longitud'),
  ph_suelo: real('ph_suelo'),
  textura: text('textura').notNull(),
  altitud_msnm: real('altitud_msnm'),
  cortinas_rompevientos: boolean('cortinas_rompevientos').default(false),
  orientacion_ladera: text('orientacion_ladera').notNull(),
  tipo_terreno: text('tipo_terreno').notNull(),
  tipo_zona: text('tipo_zona'), // Store as JSON string
  estado: text('estado').default('Libre').notNull(),
  fecha_creacion: timestamp('fecha_creacion').defaultNow().notNull(),
  fecha_modificacion: timestamp('fecha_modificacion').defaultNow().notNull(),
  activo: boolean('activo').default(true).notNull(),
  is_synced: boolean('is_synced').default(false).notNull(),
});
