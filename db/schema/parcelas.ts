import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { TexturaSueloValues, OrientacionLaderaValues, TipoTerrenoValues, EstadoParcelaValues } from './enums';

export const parcelas = sqliteTable('parcelas', {
  id: text('id').primaryKey(),
  codigo: text('codigo').unique().notNull(),
  hectareas: real('hectareas').notNull(),
  ubicacion: text('ubicacion'),
  phSuelo: real('phSuelo'),
  textura: text('textura', { enum: TexturaSueloValues }).notNull(),
  altitudMsnm: integer('altitudMsnm'),
  cortinasRompevientos: integer('cortinasRompevientos'),
  orientacionLadera: text('orientacionLadera', { enum: OrientacionLaderaValues }).notNull(),
  tipoTerreno: text('tipoTerreno', { enum: TipoTerrenoValues }).notNull(),
  tipoZona: text('tipoZona'), // Store as JSON string
  estado: text('estado', { enum: EstadoParcelaValues }).default('Libre').notNull(),
  fecha_creacion: text('fecha_creacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
});
