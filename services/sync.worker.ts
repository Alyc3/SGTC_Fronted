import { db } from '../db';
import { parcelas, semillas, lotes, asignacion_personal } from '../db/schema';
import { eq } from 'drizzle-orm';
import { networkService } from './network.service';
import { semillasSync, parcelasSync, personalSync, catalogoSync, asignacionPersonalSync } from './online';

/**
 * SyncWorker: Centraliza la lógica de sincronización en segundo plano.
 * Maneja la validación de red real y la actualización de estados de sincronización.
 */
export const syncWorker = {
  /**
   * Ejecuta el flujo de sincronización de datos pendientes de forma atómica.
   */
  async syncPendingData() {
    // 1. Validar internet real (Anti Internet Fantasma)
    const hasRealInternet = await networkService.verifyRealInternet();
    if (!hasRealInternet) {
      console.log('[syncWorker] Sin conexión real a internet. Abortando sync silenciosamente.');
      return false;
    }

    console.log('[syncWorker] Iniciando sincronización de datos pendientes...');

    try {
      // 2. Ejecutar sincronización modular existente (Push/Pull)
      await catalogoSync.sync();
      await semillasSync.sync();
      await parcelasSync.sync();
      await parcelasSync.syncLotes();
      await personalSync.sync();
      await asignacionPersonalSync.sync();

      // 3. Verificación adicional de estados 'pending' o 'error' locales
      await this.cleanupSyncStates();

      console.log('[syncWorker] Sincronización completada con éxito.');
      return true;
    } catch (error) {
      console.error('[syncWorker] Error durante la sincronización:', error);
      return false;
    }
  },

  /**
   * Asegura que los registros locales reflejen el estado correcto después de un ciclo de sync.
   */
  async cleanupSyncStates() {
    const tables = [
      { schema: parcelas, name: 'parcelas' },
      { schema: semillas, name: 'semillas' },
      { schema: lotes, name: 'lotes' },
      { schema: asignacion_personal, name: 'asignacion_personal' }
    ];

    for (const table of tables) {
      // Sincronizar sync_status con is_synced para mantener compatibilidad
      await db.update(table.schema)
        .set({ sync_status: 'synced' })
        .where(eq((table.schema as any).is_synced, true));
        
      await db.update(table.schema)
        .set({ sync_status: 'pending' })
        .where(eq((table.schema as any).is_synced, false));
    }
  }
};
