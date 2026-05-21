import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  StatusBar
} from 'react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { Theme } from '../theme';

const LotesScreen = () => {
  const { data: lotes } = useLiveQuery(db.query.lotes.findMany({
    with: { parcela: true, semilla: true }
  }));

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.primaryContainer} />
      
      {/* List Content with Header Integrated */}
      <FlatList
        data={lotes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.headerLabel}>MODULO 1</Text>
              <Text style={styles.title}>Trazabilidad</Text>
            </View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lotes Activos</Text>
              <View style={styles.divider} />
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No hay registros en el libro mayor.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { paddingBottom: Theme.spacing.md, paddingTop: Theme.spacing.md },
  headerLabel: { ...Theme.typography.label, letterSpacing: 2, fontSize: 10, marginBottom: Theme.spacing.xs },
  title: { ...Theme.typography.display, fontSize: 28, marginBottom: Theme.spacing.lg, color: Theme.colors.primary },
  sectionHeader: { marginTop: Theme.spacing.md, marginBottom: Theme.spacing.sm },
  sectionTitle: { ...Theme.typography.headline, fontSize: 18, color: Theme.colors.onSurfaceVariant },
  divider: { height: 2, backgroundColor: Theme.colors.surfaceContainerLow, marginTop: Theme.spacing.xs, width: 40 },
  list: { padding: Theme.spacing.lg },
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
