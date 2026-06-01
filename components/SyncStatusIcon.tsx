import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Cloud, CloudOff, CloudLightning } from 'lucide-react-native';
import { Theme } from '../theme';
import { networkService } from '../services/network.service';
import { syncWorker } from '../services/sync.worker';
import { db } from '../db';
import { parcelas, semillas, lotes, asignacion_personal } from '../db/schema';
import { eq, or } from 'drizzle-orm';

/**
 * SyncStatusIcon: Componente visual que refleja el estado de la sincronización en tiempo real.
 * Permite disparo manual de la sincronización.
 */
export const SyncStatusIcon = () => {
  const [status, setStatus] = useState<'synced' | 'pending' | 'offline'>('synced');
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * Verifica si hay registros locales pendientes de sincronizar
   */
  const checkPendingData = async () => {
    try {
      const tables = [parcelas, semillas, lotes, asignacion_personal];
      let hasPending = false;
      
      for (const table of tables) {
        const pendingCount = await db.select().from(table as any).where(eq((table as any).is_synced, false)).limit(1);
        if (pendingCount.length > 0) {
          hasPending = true;
          break;
        }
      }
      return hasPending;
    } catch (e) {
      return false;
    }
  };

  /**
   * Actualiza el estado visual del componente
   */
  const updateVisualStatus = async () => {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      setStatus('offline');
      return;
    }

    const hasPending = await checkPendingData();
    setStatus(hasPending ? 'pending' : 'synced');
  };

  useEffect(() => {
    updateVisualStatus();
    
    // Polling ligero para actualizar el icono cada 20 segundos
    const interval = setInterval(updateVisualStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Maneja el clic manual para sincronizar
   */
  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    try {
      await syncWorker.syncPendingData();
      await updateVisualStatus();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isSyncing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <TouchableOpacity 
      onPress={handleManualSync} 
      style={styles.container} 
      activeOpacity={0.7}
      accessibilityLabel="Estado de sincronización"
    >
      {status === 'synced' && (
        <Cloud size={24} color={Theme.colors.primary} />
      )}
      {status === 'pending' && (
        <CloudLightning size={24} color={Theme.colors.secondary} />
      )}
      {status === 'offline' && (
        <CloudOff size={24} color={Theme.colors.outline} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
