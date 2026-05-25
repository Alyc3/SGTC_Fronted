import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { RefreshCw, CloudOff, CloudSync } from 'lucide-react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { semillas, parcelas, lotes } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { syncService } from '../services/sync.service';
import { Theme } from '../theme';
import { CustomAlert } from './GlobalAlert';

export const SyncButton = () => {
  const [syncing, setSyncing] = useState(false);

  // Contar registros pendientes en tiempo real
  const { data: pendingSemillas } = useLiveQuery(
    db.select({ count: sql<number>`count(*)` }).from(semillas).where(eq(semillas.is_synced, false))
  );
  const { data: pendingParcelas } = useLiveQuery(
    db.select({ count: sql<number>`count(*)` }).from(parcelas).where(eq(parcelas.is_synced, false))
  );
  const { data: pendingLotes } = useLiveQuery(
    db.select({ count: sql<number>`count(*)` }).from(lotes).where(eq(lotes.is_synced, false))
  );

  const totalPending = (pendingSemillas?.[0]?.count || 0) + 
                       (pendingParcelas?.[0]?.count || 0) + 
                       (pendingLotes?.[0]?.count || 0);

  const handleSync = async () => {
    if (totalPending === 0) {
      CustomAlert.show('ALERTA', 'Todo al día', 'No hay datos pendientes de sincronizar.');
      return;
    }

    try {
      setSyncing(true);
      await syncService.syncWithRemote();
      CustomAlert.show('SUCCESS', 'Éxito', 'Sincronización con la nube completada.');
    } catch (error) {
      CustomAlert.show('ERROR', 'Error', 'Fallo al conectar con Neon DB. Verifique su conexión.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        {totalPending > 0 ? (
          <View style={styles.statusRow}>
            <CloudSync size={16} color={Theme.colors.primary} />
            <Text style={styles.pendingText}>{totalPending} registros pendientes</Text>
          </View>
        ) : (
          <View style={styles.statusRow}>
            <CloudOff size={16} color={Theme.colors.outline} />
            <Text style={styles.syncedText}>Datos sincronizados</Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[
          styles.syncButton, 
          syncing && styles.disabledButton,
          totalPending === 0 && !syncing && styles.idleButton
        ]} 
        onPress={handleSync}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator color={Theme.colors.onPrimary} size="small" />
        ) : (
          <>
            <RefreshCw size={18} color={Theme.colors.onPrimary} />
            <Text style={styles.syncButtonText}>Sincronizar ahora</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: Theme.roundness.lg,
    marginTop: Theme.spacing.sm,
  },
  infoContainer: {
    marginBottom: Theme.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingText: {
    ...Theme.typography.label,
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  syncedText: {
    ...Theme.typography.label,
    fontSize: 12,
    color: Theme.colors.outline,
  },
  syncButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.roundness.full,
    gap: 8,
    ...Theme.shadows.ambient,
  },
  idleButton: {
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: Theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});
