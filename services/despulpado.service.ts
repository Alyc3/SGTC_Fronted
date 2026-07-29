import { db } from '../db';
import { despulpado } from '../db/schema';
import { eq,sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const despulpadoService = {
  async create(data: typeof despulpado.$inferInsert) {
    // 1. Guardado local (Offline-First)
    const result = await db.insert(despulpado).values({ 
      ...data, 
      id: data.id ?? uuidv4() 
    }).returning();

    // 2. Reporte de Auditoría Asíncrono (No bloquea la UI)
    /*const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
    const internalKey = process.env.INTERNAL_API_KEY || '';

    fetch(`${apiUrl}/api/internal/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Key': internalKey,
      },
      body: JSON.stringify({
        user_id: userId,
        action: 'REGISTRO_DESPULPADO',
        endpoint: '/api/procesamiento/despulpado',
        ip_address: 'mobile-app', // En móvil no tenemos IP pública fácil, se maneja como cliente
      })
    }).catch(err => console.log('Auditoría diferida (posible modo offline):', err.message));*/

    return result;
  },

  async update(id: string, data: Partial<typeof despulpado.$inferInsert>) {
    return await db
      .update(despulpado)
      .set({
        ...data,
        is_synced: false,
        sync_status: 'pending',
        fecha_modificacion: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(despulpado.id, id))
      .returning();
  },

  async getByLoteId(loteId: string): Promise<any | null> {
    const result = await db
      .select()
      .from(despulpado)
      .where(eq(despulpado.lote_id, loteId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  },


};