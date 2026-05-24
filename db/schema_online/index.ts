import { pgTable, text, integer, doublePrecision, boolean, timestamp, foreignKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Note: We use text for enums for simplicity and matching the SQLite behavior
// during synchronization.

export const parcelas = pgTable('parcelas', {
  id: text('id').primaryKey(),
  nombre: text('nombre').unique().notNull(),
  hectareas: doublePrecision('hectareas').notNull(),
  latitud: doublePrecision('latitud'),
  longitud: doublePrecision('longitud'),
  ph_suelo: doublePrecision('ph_suelo'),
  textura: text('textura').notNull(),
  altitud_msnm: doublePrecision('altitud_msnm'),
  cortinas_rompevientos: boolean('cortinas_rompevientos').default(false),
  orientacion_ladera: text('orientacion_ladera').notNull(),
  tipo_terreno: text('tipo_terreno').notNull(),
  tipo_zona: text('tipo_zona'), // JSON string
  estado: text('estado').default('Libre').notNull(),
  fecha_creacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow().notNull(),
  fecha_modificacion: timestamp('fecha_modificacion', { withTimezone: true }).defaultNow().notNull(),
  is_synced: boolean('is_synced').default(false).notNull(),
});

export const semillas = pgTable('semillas', {
  id: text('id').primaryKey(),
  variedad: text('variedad').notNull(),
  pais_origen: text('pais_origen'),
  distribuidor: text('distribuidor'),
  metodo_secado: text('metodo_secado'),
  seleccion: text('seleccion'),
  olor: text('olor'),
  color: text('color'),
  integridad: text('integridad'),
  anexo_ruta: text('anexo_ruta'),
  anexo_tamano: integer('anexo_tamano'),
  anexo_creacion: text('anexo_creacion'),
  is_synced: boolean('is_synced').default(false).notNull()
});

export const lotes = pgTable('lotes', {
  id: text('id').primaryKey(),
  codigo: text('codigo').unique().notNull(),
  parcela_id: text('parcela_id').references(() => parcelas.id).notNull(),
  semilla_id: text('semilla_id').references(() => semillas.id).notNull(),
  zona_seleccionada: text('zona_seleccionada'),
  hectareas_lote: doublePrecision('hectareas_lote'),
  variedad_cafe: text('variedad_cafe'),
  porcentaje_progreso: doublePrecision('porcentaje_progreso').default(0),
  costo_total_mano_obra: doublePrecision('costo_total_mano_obra').default(0),
  estado_lote: text('estado_lote').default('Creado').notNull(),
  calidad_final: text('calidad_final'),
  fecha_creacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow().notNull(),
  fecha_modificacion: timestamp('fecha_modificacion', { withTimezone: true }).defaultNow().notNull(),
  is_synced: boolean('is_synced').default(false).notNull(),
});

export const personal = pgTable('personal', {
  id: text('id').primaryKey(),
  identificacion: text('identificacion').unique().notNull(),
  nombres: text('nombres').notNull(),
  apellidos: text('apellidos').notNull(),
  telefono: text('telefono'),
  rol: text('rol').notNull(),
  fecha_creacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow().notNull(),
  fecha_modificacion: timestamp('fecha_modificacion', { withTimezone: true }).defaultNow().notNull(),
  is_synced: boolean('is_synced').default(false).notNull(),
});

export const asignacion_personal = pgTable('asignacion_personal', {
  id: text('id').primaryKey(),
  lote_id: text('lote_id').references(() => lotes.id).notNull(),
  etapa: text('etapa').notNull(),
  trabajador_id: text('trabajador_id').references(() => personal.id).notNull(),
  tipo_grano: text('tipo_grano'),
  pago_calculado: doublePrecision('pago_calculado'),
  fecha_asignacion: timestamp('fecha_asignacion', { withTimezone: true }).defaultNow(),
  fecha_jornada: text('fecha_jornada'),
  horas_trabajadas: doublePrecision('horas_trabajadas'),
  cantidad_cosechada: doublePrecision('cantidad_cosechada'),
  is_synced: boolean('is_synced').default(false).notNull(),
});

export const estado_etapa = pgTable('estado_etapa', {
  id: text('id').primaryKey(),
  lote_id: text('lote_id').references(() => lotes.id).notNull(),
  etapa: text('etapa').notNull(),
  estado: text('estado').default('Pendiente').notNull(),
  fecha_inicio: text('fecha_inicio'),
  fecha_final: text('fecha_final'),
  duracion_calculada: doublePrecision('duracion_calculada'),
  sub_fase_siembra: text('sub_fase_siembra'),
  is_synced: boolean('is_synced').default(false).notNull(),
});
