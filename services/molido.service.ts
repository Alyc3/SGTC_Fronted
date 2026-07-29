import { db } from '../db';
import { molido } from '../db/schema'; // Importa desde tu index de schemas
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const molidoService = {
    async create(data: typeof molido.$inferInsert) {
        const result = await db.insert(molido).values({
            ...data,
            id: data.id ?? uuidv4()
        }).returning();
        return result;
    },

    async update(id: string, data: Partial<typeof molido.$inferInsert>) {
        return await db
            .update(molido)
            .set({
                ...data,
                is_synced: false,
                sync_status: 'pending',
                fecha_modificacion: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(molido.id, id))
            .returning();
    },

    async getByLoteId(loteId: string): Promise<any | null> {
        const result = await db
            .select()
            .from(molido)
            .where(eq(molido.lote_id, loteId))
            .limit(1);

        return result.length > 0 ? result[0] : null;
    },
};