import { pgTable, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { catalogo } from './catalogo';

export const semillas = pgTable('semillas', {
  id: text('id').primaryKey(),
  variedad_id: text('variedad_id').references(() => catalogo.id).notNull(),
  pais_origen_id: text('pais_origen_id').references(() => catalogo.id),
  distribuidor_id: text('distribuidor_id').references(() => catalogo.id),
  metodo_secado_id: text('metodo_secado_id').references(() => catalogo.id),
  seleccion_id: text('seleccion_id').references(() => catalogo.id),
  olor_id: text('olor_id').references(() => catalogo.id),
  color_id: text('color_id').references(() => catalogo.id),
  integridad_id: text('integridad_id').references(() => catalogo.id),
  anexo_ruta: text('anexo_ruta'),
  anexo_tamano: integer('anexo_tamano'),
  anexo_creacion: text('anexo_creacion'),
  fecha_creacion: timestamp('fecha_creacion').defaultNow().notNull(),
  fecha_modificacion: timestamp('fecha_modificacion').defaultNow().notNull(),
  activo: boolean('activo').default(true).notNull(),
  is_synced: boolean('is_synced').default(false).notNull()
});
