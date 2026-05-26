import { EXPO_PUBLIC_DATABASE_URL } from '@env';
import { 
  semillasSync, 
  parcelasSync, 
  personalSync,
  catalogoSync 
} from './online';
import { networkService } from './network.service';

/**
 * Orchestrator Sync Service
 * Coordina los servicios de sincronización modular de la carpeta /online
 */
export const syncService = {
  async syncWithRemote() {
    console.log('--- Iniciando Sincronización Modular (App -> Neon) ---');
    
    if (!EXPO_PUBLIC_DATABASE_URL) {
      console.error('Error: EXPO_PUBLIC_DATABASE_URL no definida');
      return;
    }

    if (!(await networkService.isOnline())) {
      console.log('--- Sincronización Cancelada: Sin conexión a internet ---');
      return;
    }

    try {
      // Ejecución secuencial de sincronizadores especializados
      await catalogoSync.sync();
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
