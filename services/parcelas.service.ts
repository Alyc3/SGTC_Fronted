import { db } from '../db';
import { parcelas } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as Location from 'expo-location';

export const parcelasService = {
  async getAll() {
    return await db.query.parcelas.findMany();
  },
  async getLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permiso de ubicación denegado');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude || 0
      };
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      throw error;
    }
  },
  async create(data: typeof parcelas.$inferInsert) {
    return await db.insert(parcelas).values({ ...data, id: data.id ?? uuidv4() }).returning();
  },
  async update(id: string, data: Partial<typeof parcelas.$inferInsert>) {
    return await db.update(parcelas).set({ 
      ...data, 
      is_synced: false,
      fecha_modificacion: new Date().toISOString() 
    }).where(eq(parcelas.id, id)).returning();
  },
  async delete(id: string) {
    return await db.delete(parcelas).where(eq(parcelas.id, id)).returning();
  },
  validate(data: { hectareas?: string | number | null }) {
    if (data.hectareas === undefined || data.hectareas === null || data.hectareas === '') {
      return 'El campo hectáreas es obligatorio.';
    }
    
    const strVal = data.hectareas.toString();
    const val = parseFloat(strVal);
    
    if (isNaN(val)) {
      return 'Debe ser un número válido.';
    }

    // Validación de 1 a 3 dígitos (parte entera)
    const integerPart = Math.floor(Math.abs(val)).toString();
    if (integerPart.length > 3) {
      return 'Es el máximo de hectáreas configuradas.';
    }

    if (val < 1) {
      return 'El mínimo es 1 hectárea.';
    }

    if (val > 100) {
      return 'Es el máximo de hectáreas configuradas.';
    }

    return null;
  }
};
