import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { TexturaSueloValues, OrientacionLaderaValues, TipoTerrenoValues, EstadoParcelaValues } from './enums';

export const parcelas = sqliteTable('parcelas', {
  id: text('id').primaryKey(),
  nombre: text('nombre').unique().notNull(),
  hectareas: real('hectareas').notNull(),
  latitud: real('latitud'),
  longitud: real('longitud'),
  phSuelo: real('ph_suelo'),
  textura: text('textura', { enum: TexturaSueloValues }).notNull(),
  altitudMsnm: real('altitud_msnm'),
  cortinasRompevientos: integer('cortinas_rompevientos', { mode: 'boolean' }).default(false),
  orientacionLadera: text('orientacion_ladera', { enum: OrientacionLaderaValues }).notNull(),
  tipoTerreno: text('tipo_terreno', { enum: TipoTerrenoValues }).notNull(),
  tipoZona: text('tipo_zona'), // Store as JSON string
  estado: text('estado', { enum: EstadoParcelaValues }).default('Libre').notNull(),
  fecha_creacion: text('fecha_creacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
  sync_status: text('sync_status', { enum: ['synced', 'pending', 'error'] }).default('pending').notNull(),
});
