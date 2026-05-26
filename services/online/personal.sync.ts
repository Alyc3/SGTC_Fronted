import { db } from '../../db';
import { personal } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { EXPO_PUBLIC_DATABASE_URL } from '@env';

const sql = neon(EXPO_PUBLIC_DATABASE_URL);

export const personalSync = {
  async sync() {
    await this.push();
    await this.pull();
  },

  async push() {
    const pending = await db.select().from(personal).where(eq(personal.is_synced, false));
    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        await sql`
          INSERT INTO personal (id, identificacion, nombres, apellidos, telefono, rol, is_synced)
          VALUES (${record.id}, ${record.identificacion}, ${record.nombres}, ${record.apellidos}, ${record.telefono}, ${record.rol}, true)
          ON CONFLICT (id) DO UPDATE SET 
            identificacion = EXCLUDED.identificacion,
            nombres = EXCLUDED.nombres,
            apellidos = EXCLUDED.apellidos,
            telefono = EXCLUDED.telefono,
            rol = EXCLUDED.rol, 
            is_synced = true
        `;

        await db.update(personal).set({ is_synced: true }).where(eq(personal.id, record.id));
      } catch (err) {
        console.error(`Sync error personal ${record.id}:`, err);
      }
    }
  },

  async pull() {
    try {
      const remoteData = await sql`SELECT * FROM personal`;
      for (const record of remoteData) {
        await db.insert(personal).values({
          id: record.id,
          identificacion: record.identificacion,
          nombres: record.nombres,
          apellidos: record.apellidos,
          telefono: record.telefono,
          rol: record.rol,
          activo: record.activo,
          is_synced: true
        }).onConflictDoUpdate({
          target: personal.id,
          set: {
            identificacion: record.identificacion,
            nombres: record.nombres,
            apellidos: record.apellidos,
            telefono: record.telefono,
            rol: record.rol,
            activo: record.activo,
            is_synced: true
          }
        });
      }
    } catch (err) {
      console.error(`Pull error personal:`, err);
    }
  }
};
