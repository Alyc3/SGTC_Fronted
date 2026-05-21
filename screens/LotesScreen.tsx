import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { lotes as lotesSchema } from '../db/schema';
import { syncService } from '../services/sync.service';
import { Theme } from '../theme';

const LotesScreen = () => {
  const { data: lotes } = useLiveQuery(db.query.lotes.findMany({
    with: { parcela: true, semilla: true }
  }));
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await syncService.syncWithRemote();
      Alert.alert('Éxito', 'Sincronización completada');
    } catch (error) {
      Alert.alert('Error', 'Falló la sincronización');
    } finally {
      setSyncing(false);
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardSideAccent} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.codigo}>LOT-{item.codigo}</Text>
          <View style={[styles.badge, { backgroundColor: item.is_synced ? Theme.colors.secondaryContainer : Theme.colors.surfaceContainerLow }]}>
            <Text style={[styles.badgeText, { color: item.is_synced ? Theme.colors.onSecondaryContainer : Theme.colors.onSurfaceVariant }]}>
              {item.is_synced ? 'SINC' : 'PEND'}
            </Text>
          </View>
        </View>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Parcela</Text>
            <Text style={styles.detailValue}>{item.parcela?.codigo}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Variedad</Text>
            <Text style={styles.detailValue}>{item.semilla?.variedad}</Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: item.estado_lote === 'Completado' ? '100%' : '35%' }]} />
          </View>
          <Text style={styles.statusText}>{item.estado_lote}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.background} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>EL TERROIR EDITORIAL</Text>
          <Text style={styles.title}>Trazabilidad</Text>
        </View>
        <TouchableOpacity style={[styles.syncButton, syncing && styles.disabledButton]} onPress={handleSync} disabled={syncing}>
          {syncing ? <ActivityIndicator color={Theme.colors.onPrimary} size="small" /> : <Text style={styles.syncButtonText}>Sync</Text>}
        </TouchableOpacity>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lotes Activos</Text>
        <View style={styles.divider} />
      </View>
      <FlatList
        data={lotes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No hay registros en el libro mayor.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.xl, paddingBottom: Theme.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerLabel: { ...Theme.typography.label, letterSpacing: 2, fontSize: 10, marginBottom: Theme.spacing.xs },
  title: { ...Theme.typography.display, fontSize: 28 },
  syncButton: { backgroundColor: Theme.colors.primary, paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.sm, borderRadius: Theme.roundness.full, ...Theme.shadows.ambient },
  disabledButton: { opacity: 0.6 },
  syncButtonText: { color: Theme.colors.onPrimary, fontWeight: '700', fontSize: 14 },
  sectionHeader: { paddingHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.md, marginBottom: Theme.spacing.sm },
  sectionTitle: { ...Theme.typography.headline, fontSize: 18, color: Theme.colors.onSurfaceVariant },
  divider: { height: 2, backgroundColor: Theme.colors.surfaceContainerLow, marginTop: Theme.spacing.xs, width: 40 },
  list: { padding: Theme.spacing.md },
  card: { backgroundColor: Theme.colors.surfaceContainerLowest, borderRadius: Theme.roundness.md, marginBottom: Theme.spacing.md, flexDirection: 'row', overflow: 'hidden', ...Theme.shadows.ambient },
  cardSideAccent: { width: 6, backgroundColor: Theme.colors.primary },
  cardContent: { flex: 1, padding: Theme.spacing.md, paddingLeft: Theme.spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.md },
  codigo: { ...Theme.typography.headline, color: Theme.colors.primary, fontSize: 20 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Theme.roundness.sm },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  detailsGrid: { flexDirection: 'row', marginBottom: Theme.spacing.md },
  detailItem: { flex: 1 },
  detailLabel: { ...Theme.typography.label, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  detailValue: { ...Theme.typography.body, fontSize: 14, fontWeight: '600' },
  statusContainer: { marginTop: Theme.spacing.sm },
  progressBarBackground: { height: 4, backgroundColor: Theme.colors.surfaceContainerLow, borderRadius: 2, marginBottom: Theme.spacing.xs },
  progressBarFill: { height: 4, backgroundColor: Theme.colors.secondary, borderRadius: 2 },
  statusText: { ...Theme.typography.label, fontSize: 11, color: Theme.colors.secondary, textAlign: 'right' },
  empty: { ...Theme.typography.body, textAlign: 'center', marginTop: 50, color: Theme.colors.onSurfaceVariant, fontStyle: 'italic' }
});

export default LotesScreen;
