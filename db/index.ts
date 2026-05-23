import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema/index';

export const expoDb = openDatabaseSync('stgc_v2.db', { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });
