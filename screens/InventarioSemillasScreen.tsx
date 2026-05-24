import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  StatusBar,
  ScrollView
} from 'react-native';
import { 
  Search, 
  ChevronRight, 
  Plus,
  Leaf,
  Globe2,
  Truck,
  CalendarDays,
  ShieldCheck,
  Edit,
} from 'lucide-react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { Theme } from '../theme';

const InventarioSemillasScreen = ({ navigation }: any) => {
  const { data: semillas } = useLiveQuery(db.query.semillas.findMany({
    with: {
      variedad: true,
      pais_origen: true,
      distribuidor: true,
    },
    orderBy: (semillas, { desc }) => [desc(semillas.anexo_creacion)]
  }));

  const renderItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9}
      onPress={() => navigation.navigate('RegistroSemilla', { id: item.id, readOnly: true })}
    >
      
      <View style={styles.cardMain}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <View style={styles.iconCircle}>
              <Leaf size={16} color={Theme.colors.secondary} />
            </View>
            <View>
              <Text style={styles.cardCategory}>PATRIMONIO GENÉTICO</Text>
              <Text style={styles.cardTitle}>{item.variedad?.valor || 'Sin nombre'}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('RegistroSemilla', { id: item.id })}
              style={styles.actionIconButton}
            >
              <Edit size={18} color={Theme.colors.onPrimary} />
            </TouchableOpacity>
            <View style={[styles.badge, item.is_synced ? styles.badgeSynced : styles.badgePending]}>
              <ShieldCheck size={10} color={item.is_synced ? Theme.colors.onPrimary : Theme.colors.primary} style={{marginRight: 4}} />
              <Text style={[styles.badgeText, { color: item.is_synced ? Theme.colors.onPrimary : Theme.colors.primary }]}>
                {item.is_synced ? 'NUBE' : 'LOCAL'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.detailLabelRow}>
              <Globe2 size={16} color="rgba(255,255,255,0.85)" />
              <Text style={styles.detailLabel}>ORIGEN</Text>
            </View>
            <Text style={styles.detailValue} numberOfLines={1}>{item.pais_origen?.valor || 'Desconocido'}</Text>
          </View>

          <View style={styles.gridItem}>
            <View style={styles.detailLabelRow}>
              <Truck size={16} color="rgba(255,255,255,0.85)" />
              <Text style={styles.detailLabel}>PROVEEDOR</Text>
            </View>
            <Text style={styles.detailValue} numberOfLines={1}>{item.distribuidor?.valor || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateContainer}>
            <CalendarDays size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.dateText}>
              {item.anexo_creacion ? new Date(item.anexo_creacion).toLocaleDateString('es-ES') : 'Sin fecha'}
            </Text>
          </View>
          <View style={styles.arrowCircle}>
            <ChevronRight size={20} color={Theme.colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.primaryContainer} />
      
      <FlatList
        data={semillas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>Semillas registradas</Text>
              </View>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => navigation.navigate('RegistroSemilla')}
              >
                <Plus size={24} color={Theme.colors.onPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={20} color={Theme.colors.outline} style={styles.searchIcon} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Buscar variedad u origen..." 
                placeholderTextColor={Theme.colors.outline} 
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Leaf size={64} color={Theme.colors.surfaceContainerLow} strokeWidth={1} />
            <Text style={styles.emptyText}>No hay semillas registradas.</Text>
            <Text style={styles.emptySubtext}>Inicie un nuevo registro de patrimonio.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLabel: { ...Theme.typography.label, fontSize: 10, letterSpacing: 2, color: Theme.colors.primary },
  title: { ...Theme.typography.display, fontSize: 28, color: Theme.colors.primary, marginTop: 4 },
  addButton: { 
    backgroundColor: Theme.colors.primary, 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    justifyContent: 'center', 
    alignItems: 'center',
    ...Theme.shadows.ambient,
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Theme.colors.surfaceContainerLow, 
    borderRadius: 12, 
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { ...Theme.typography.body, flex: 1, paddingVertical: 12, fontSize: 15 },
  list: { paddingBottom: 40 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  card: { 
    backgroundColor: Theme.colors.onSecondaryContainer,
    borderRadius: 20, 
    marginHorizontal: 20, 
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.secondary,
    ...Theme.shadows.ambient,
  },
  cardMain: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)', // Semi-transparent for dark bg
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCategory: {
    ...Theme.typography.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Theme.colors.secondaryContainer, // Light green on dark green
    fontWeight: '700',
  },
  cardTitle: {
    ...Theme.typography.headline,
    fontSize: 18,
    color: Theme.colors.onPrimary, // White text
    marginTop: -2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSynced: {
    backgroundColor: 'rgba(255,255,255,0.2)', // Light translucent
  },
  badgePending: {
    backgroundColor: Theme.colors.surfaceContainerLow,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)', // White divider
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  detailLabel: {
    ...Theme.typography.label,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)', // Slightly brighter for better contrast
    letterSpacing: 0.5,
  },
  detailValue: {
    ...Theme.typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.onPrimary, // White text
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    ...Theme.typography.label,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)', // Brighter for better contrast
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Theme.colors.onPrimary, // White circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    gap: 16,
  },
  emptyText: {
    ...Theme.typography.headline,
    fontSize: 20,
    color: Theme.colors.onSurfaceVariant,
  },
  emptySubtext: {
    ...Theme.typography.body,
    color: Theme.colors.outline,
    textAlign: 'center',
  }
});

export default InventarioSemillasScreen;
