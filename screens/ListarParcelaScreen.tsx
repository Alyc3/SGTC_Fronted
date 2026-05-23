import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  Plus,
  ChevronRight,
  Maximize2,
  Mountain,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { parcelasService } from '../services';

const ListarParcelaScreen = ({ navigation }: any) => {
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchParcelas();
  }, []);

  const fetchParcelas = async () => {
    try {
      setLoading(true);
      const data = await parcelasService.getAll();
      setParcelas(data);
    } catch (error) {
      console.error('Error fetching parcelas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredParcelas = parcelas.filter((p) =>
    p.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.ubicacion && p.ubicacion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalExtension = parcelas.reduce((acc, p) => acc + (p.hectareas || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.background} />
      
      {/* Header & Search Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.screenTitle}>Listado de Parcelas</Text>
        <View style={styles.searchWrapper}>
          <Search size={20} color={Theme.colors.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by code or zone..."
            placeholderTextColor={Theme.colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: Theme.colors.primary }]}>
            <Text style={styles.statLabel}>TOTAL EXTENSION</Text>
            <Text style={styles.statValue}>
              {totalExtension.toFixed(1)} <Text style={styles.statUnit}>ha</Text>
            </Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Theme.colors.secondary }]}>
            <Text style={styles.statLabel}>ACTIVE PARCELS</Text>
            <Text style={styles.statValue}>{parcelas.length}</Text>
          </View>
        </View>

        {/* Parcel Listing */}
        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.listContainer}>
            {filteredParcelas.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.parcelCard}
                onPress={() => navigation.navigate('GestionParcela', { id: item.id })}
              >
                <View style={styles.cardAccent} />
                <View style={styles.cardMain}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.parcelCode}>{item.codigo}</Text>
                    <View style={[styles.badge, { backgroundColor: Theme.colors.secondaryContainer }]}>
                      <Text style={[styles.badgeText, { color: Theme.colors.onSecondaryContainer }]}>
                        {item.tipoTerreno.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Maximize2 size={14} color={Theme.colors.outline} />
                      <Text style={styles.metaText}>{item.hectareas} ha</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Mountain size={14} color={Theme.colors.outline} />
                      <Text style={styles.metaText}>{item.tipoTerreno}</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={20} color={Theme.colors.outline} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('GestionParcela')}
      >
        <Plus size={32} color={Theme.colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  headerContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: 40,
    paddingBottom: Theme.spacing.md,
  },
  screenTitle: {
    ...Theme.typography.display,
    fontSize: 28,
    marginBottom: Theme.spacing.lg,
    color: Theme.colors.onSurface,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerHighest,
    borderRadius: Theme.roundness.xl,
    paddingHorizontal: Theme.spacing.md,
    height: 56,
  },
  searchIcon: {
    marginRight: Theme.spacing.sm,
  },
  searchInput: {
    ...Theme.typography.body,
    flex: 1,
    color: Theme.colors.onSurface,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: Theme.spacing.md,
    borderRadius: Theme.roundness.lg,
    borderLeftWidth: 4,
    ...Theme.shadows.ambient,
  },
  statLabel: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  statValue: {
    ...Theme.typography.headline,
    fontSize: 22,
    color: Theme.colors.onSurface,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    gap: Theme.spacing.md,
  },
  parcelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    padding: Theme.spacing.md,
    borderRadius: Theme.roundness.lg,
    ...Theme.shadows.ambient,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 0, // Hidden by default, showing on focus/active in web but here we can simulate or just keep it simple
  },
  cardMain: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  parcelCode: {
    ...Theme.typography.headline,
    fontSize: 18,
    color: Theme.colors.primary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.roundness.full,
  },
  badgeText: {
    ...Theme.typography.labelSm,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Theme.typography.labelSm,
    color: Theme.colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.ambient,
    elevation: 8,
    shadowOpacity: 0.3,
  },
});

export default ListarParcelaScreen;
