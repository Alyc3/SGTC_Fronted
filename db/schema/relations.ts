import { relations } from 'drizzle-orm';
import { parcelas } from './parcelas';
import { lotes } from './lotes';
import { semillas } from './semillas';

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
