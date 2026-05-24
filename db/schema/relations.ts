import { relations } from 'drizzle-orm';
import { parcelas } from './parcelas';
import { lotes } from './lotes';
import { semillas } from './semillas';
import { catalogo } from './catalogo';

export const parcelasRelations = relations(parcelas, ({ many }) => ({
  lotes: many(lotes),
}));

export const lotesRelations = relations(lotes, ({ one }) => ({
  parcela: one(parcelas, {
    fields: [lotes.parcela_id],
    references: [parcelas.id],
  }),
  semilla: one(semillas, {
    fields: [lotes.semilla_id],
    references: [semillas.id],
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
