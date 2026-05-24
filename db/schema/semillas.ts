import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const semillas = sqliteTable('semillas', {
  id: text('id').primaryKey(),
  variedad: text('variedad').notNull(),
  paisOrigen: text('pais_origen'),
  distribuidor: text('distribuidor'),
  metodoSecado: text('metodo_secado'),
  seleccion: text('seleccion'),
  olor: text('olor'),
  color: text('color'),
  integridad: text('integridad'),
  anexo_ruta: text('anexo_ruta'),
  anexo_tamano: integer('anexo_tamano'),
  anexo_creacion: text('anexo_creacion'),
  is_synced: integer('is_synced', { mode: 'boolean' }).default(false).notNull()
});
