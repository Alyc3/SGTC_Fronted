import { DATABASE_URL } from '@env';
import { 
  semillasSync, 
  parcelasSync, 
  personalSync 
} from './online';

/**
 * Orchestrator Sync Service
 * Coordina los servicios de sincronización modular de la carpeta /online
 */
export const syncService = {
  async syncWithRemote() {
    console.log('--- Iniciando Sincronización Modular (App -> Neon) ---');
    
    if (!DATABASE_URL) {
      console.error('Error: DATABASE_URL no definida');
      return;
    }

    try {
      // Ejecución secuencial de sincronizadores especializados
      await semillasSync.sync();
      await parcelasSync.sync();
      await parcelasSync.syncLotes();
      await personalSync.sync();

      console.log('--- Sincronización Modular Completada ---');
    } catch (error) {
      console.error('Error en Sincronización Modular:', error);
      throw error;
    }
  }
};
