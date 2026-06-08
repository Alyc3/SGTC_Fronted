import { 
  semillasSync, 
  parcelasSync, 
  personalSync,
  catalogoSync,
  asignacionPersonalSync
} from './online';
import { networkService } from './network.service';

export const syncService = {
  async syncWithRemote() {
    console.log('--- Iniciando Sincronización Modular (App -> Neon) ---');
    
    const dbUrl = process.env.EXPO_PUBLIC_DATABASE_URL;
    
    if (!dbUrl) {
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
      await asignacionPersonalSync.sync();

      console.log('--- Sincronización Modular Completada ---');
    } catch (error) {
      console.error('Error en Sincronización Modular:', error);
      throw error;
    }
  }
};
