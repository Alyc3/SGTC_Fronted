import { db } from '../../db';
import { personal } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '@env';

const sql = neon(DATABASE_URL);

export const personalSync = {
  async sync() {
    const pending = await db.select().from(personal).where(eq(personal.is_synced, false));
    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        await sql`
          INSERT INTO personal (id, identificacion, nombres, apellidos, telefono, rol, is_synced)
          VALUES (${record.id}, ${record.identificacion}, ${record.nombres}, ${record.apellidos}, ${record.telefono}, ${record.rol}, true)
          ON CONFLICT (id) DO UPDATE SET rol = EXCLUDED.rol, is_synced = true
        `;

        await db.update(personal).set({ is_synced: true }).where(eq(personal.id, record.id));
      } catch (err) {
        console.error(`Sync error personal ${record.id}:`, err);
      }
    }
  }
};
