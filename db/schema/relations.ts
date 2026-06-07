import { relations } from 'drizzle-orm';
import { parcelas } from './parcelas';
import { lotes } from './lotes';
import { semillas } from './semillas';
import { catalogo } from './catalogo';
import { asignacion_personal } from './asignacion_personal';
import { users } from './users';
import { cosecha } from './cosecha';

export const parcelasRelations = relations(parcelas, ({ many }) => ({
  lotes: many(lotes),
}));

export const lotesRelations = relations(lotes, ({ one, many }) => ({
  parcela: one(parcelas, {
    fields: [lotes.parcela_id],
    references: [parcelas.id],
  }),
  semilla: one(semillas, {
    fields: [lotes.semilla_id],
    references: [semillas.id],
  }),
  asignaciones: many(asignacion_personal),
  cosechas: many(cosecha),
}));

export const asignacion_personalRelations = relations(asignacion_personal, ({ one }) => ({
  lote: one(lotes, {
    fields: [asignacion_personal.lote_id],
    references: [lotes.id],
  }),
  trabajador: one(users, {
    fields: [asignacion_personal.trabajador_id],
    references: [users.id],
  }),
}));

export const cosechaRelations = relations(cosecha, ({ one }) => ({
  lote: one(lotes, {
    fields: [cosecha.lote_id],
    references: [lotes.id],
  }),
  responsable: one(users, {
    fields: [cosecha.responsable_id],
    references: [users.id],
  }),
}));

export const semillasRelations = relations(semillas, ({ one }) => ({
  variedad: one(catalogo, { fields: [semillas.variedad_id], references: [catalogo.id] }),
  pais_origen: one(catalogo, { fields: [semillas.pais_origen_id], references: [catalogo.id] }),
  distribuidor: one(catalogo, { fields: [semillas.distribuidor_id], references: [catalogo.id] }),
  metodo_secado: one(catalogo, { fields: [semillas.metodo_secado_id], references: [catalogo.id] }),
  seleccion: one(catalogo, { fields: [semillas.seleccion_id], references: [catalogo.id] }),
  olor: one(catalogo, { fields: [semillas.olor_id], references: [catalogo.id] }),
  color: one(catalogo, { fields: [semillas.color_id], references: [catalogo.id] }),
  integridad: one(catalogo, { fields: [semillas.integridad_id], references: [catalogo.id] }),
}));

export const catalogoRelations = relations(catalogo, ({ many }) => ({
  semillas_variedad: many(semillas, { relationName: 'variedad' }),
  // Add other many relations if needed for reverse lookup
}));
