import { db } from '../db';
import { lotes, asignacion_personal, cosecha } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as Location from 'expo-location';

export const cosechaService = {
    async create(data: typeof cosecha.$inferInsert) {
        return await db.insert(cosecha).values({ ...data, id: data.id ?? uuidv4() }).returning();
      },
}