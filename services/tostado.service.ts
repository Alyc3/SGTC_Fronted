import { db } from '../db';
import { tostado } from '../db/schema'; // Importa desde tu index de schemas
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const tostadoService = {
    async create(data: typeof tostado.$inferInsert) {
        const result = await db.insert(tostado).values({
            ...data,
            id: data.id ?? uuidv4()
        }).returning();
        return result;
    },

    async update(id: string, data: Partial<typeof tostado.$inferInsert>) {
        return await db
            .update(tostado)
            .set({
                ...data,
                is_synced: false,
                sync_status: 'pending',
                fecha_modificacion: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(tostado.id, id))
            .returning();
    },

    async getByLoteId(loteId: string): Promise<any | null> {
        const result = await db
            .select()
            .from(tostado)
            .where(eq(tostado.lote_id, loteId))
            .limit(1);

        return result.length > 0 ? result[0] : null;
    },
};