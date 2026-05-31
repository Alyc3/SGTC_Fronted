import { db } from '../../db';
import { users } from '../../db/schema';
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
    const pending = await db.select().from(users).where(eq(users.is_synced, false));
    if (pending.length === 0) return;

    for (const record of pending) {
      try {
        await sql`
          INSERT INTO users (
            id, email, first_name, last_name, identifier, phone_number, 
            password_hash, role_id, status, suspended_from, suspended_until, session_token
          )
          VALUES (
            ${record.id}, ${record.email}, ${record.first_name}, ${record.last_name}, ${record.identifier}, ${record.phone_number}, 
            ${record.password_hash}, ${record.role_id}, ${record.status}, ${record.suspended_from}, ${record.suspended_until}, ${record.session_token}
          )
          ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            identifier = EXCLUDED.identifier,
            phone_number = EXCLUDED.phone_number,
            password_hash = EXCLUDED.password_hash,
            role_id = EXCLUDED.role_id,
            status = EXCLUDED.status,
            suspended_from = EXCLUDED.suspended_from,
            suspended_until = EXCLUDED.suspended_until,
            session_token = EXCLUDED.session_token
        `;

        await db.update(users).set({ is_synced: true }).where(eq(users.id, record.id));
      } catch (err) {
        console.error(`Sync error users ${record.id}:`, err);
      }
    }
  },

  async pull() {
    try {
      const remoteData = await sql`SELECT * FROM users`;
      for (const record of remoteData) {
        await db.insert(users).values({
          id: record.id,
          email: record.email,
          first_name: record.first_name,
          last_name: record.last_name,
          identifier: record.identifier,
          phone_number: record.phone_number,
          password_hash: record.password_hash,
          role_id: record.role_id,
          status: record.status,
          suspended_from: record.suspended_from ? new Date(record.suspended_from).toISOString() : null,
          suspended_until: record.suspended_until ? new Date(record.suspended_until).toISOString() : null,
          session_token: record.session_token,
          is_synced: true
        }).onConflictDoUpdate({
          target: users.id,
          set: {
            email: record.email,
            first_name: record.first_name,
            last_name: record.last_name,
            identifier: record.identifier,
            phone_number: record.phone_number,
            password_hash: record.password_hash,
            role_id: record.role_id,
            status: record.status,
            suspended_from: record.suspended_from ? new Date(record.suspended_from).toISOString() : null,
            suspended_until: record.suspended_until ? new Date(record.suspended_until).toISOString() : null,
            session_token: record.session_token,
            is_synced: true
          }
        });
      }
    } catch (err) {
      console.error(`Pull error users:`, err);
    }
  }
};
