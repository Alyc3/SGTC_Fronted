import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { TexturaSueloValues, OrientacionLaderaValues, TipoTerrenoValues, EstadoParcelaValues } from './enums';
import { lotes } from './lotes';

export const parcelas = sqliteTable('parcelas', {
  id: text('id').primaryKey(),
  nombre: text('nombreParcela').unique().notNull(),
  hectareas: real('hectareas').notNull(),
  latitud: real('latitud'),
  longitud: real('longitud'),
  phSuelo: real('phSuelo'),
  textura: text('textura', { enum: TexturaSueloValues }).notNull(),
  altitudMsnm: real('altitudMsnm'),
  cortinasRompevientos: integer('cortinasRompevientos', { mode: 'boolean' }).default(false),
  orientacionLadera: text('orientacionLadera', { enum: OrientacionLaderaValues }).notNull(),
  tipoTerreno: text('tipoTerreno', { enum: TipoTerrenoValues }).notNull(),
  tipoZona: text('tipoZona'), // Store as JSON string
  estado: text('estado', { enum: EstadoParcelaValues }).default('Libre').notNull(),
  fecha_creacion: text('fecha_creacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  fecha_modificacion: text('fecha_modificacion').default(sql`CURRENT_TIMESTAMP`).notNull(),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull(),
});

export const parcelasRelations = relations(parcelas, ({ many }) => ({
  lotes: many(lotes),
}));
