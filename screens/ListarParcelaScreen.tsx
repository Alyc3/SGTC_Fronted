import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search,
  Plus,
  ChevronRight,
  Maximize2,
  Mountain,
  Trash2,
  Boxes,
  Edit,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { parcelasService } from '../services';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { CustomAlert } from '../components/GlobalAlert';

const ListarParcelaScreen = ({ navigation }: any) => {
  // Control de gestos y botón físico de atrás
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Dashboard');
        }
        return true; 
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
        if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
          e.preventDefault();
          if (navigation.canGoBack()) {
            navigation.dispatch(e.data.action);
          } else {
            navigation.navigate('Dashboard');
          }
        }
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [navigation])
  );

  const { data: parcelasRaw } = useLiveQuery(db.query.parcelas.findMany({
    with: { lotes: true }
  }));
  const [searchQuery, setSearchQuery] = useState('');

  const parcelas = parcelasRaw || [];
  const loading = !parcelasRaw;

  const handleDelete = (id: string, nombre: string) => {
    const parcela = parcelas.find(p => p.id === id);
    if (!parcela) return;

    // 1. Verificar si hay lotes en producción
    const lotesEnProduccion = (parcela.lotes || []).filter((l: any) => l.estado_lote === 'En_Produccion');
    
    if (lotesEnProduccion.length > 0) {
      CustomAlert.show(
        'ALERTA',
        'Restricción de Baja',
        `No se puede eliminar la parcela "${nombre}" porque tiene lotes en producción activa. Finalice los ciclos de cosecha antes de eliminar la parcela.`
      );
      return;
    }

    // 2. Si no hay en producción, pero tiene otros lotes (Completados o Reservados)
    const tieneLotes = (parcela.lotes || []).length > 0;
    const lotesInfo = (parcela.lotes || []).map((l: any) => l.codigo).join(', ');
    
    const mensaje = tieneLotes 
      ? `La parcela "${nombre}" tiene los siguientes lotes registrados: ${lotesInfo}. ¿Está seguro que desea eliminar la parcela y toda su trazabilidad asociada?`
      : `¿Está seguro que desea eliminar la parcela "${nombre}"? Esta acción no se puede deshacer.`;

    CustomAlert.show(
      'ALERTA',
      'Confirmar Eliminación',
      mensaje,
      async () => {
        try {
          await parcelasService.delete(id);
        } catch (error: any) {
          CustomAlert.show('ERROR', 'Error', error.message || 'No se pudo eliminar la parcela.');
        }
      },
      'ELIMINAR',
      () => {},
      'CANCELAR'
    );
  };

  const filteredParcelas = parcelas.filter((p) =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tipoTerreno.toLowerCase().includes(searchQuery.toLowerCase())
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
            placeholder="Buscar por nombre o zona..."
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
                onPress={() => navigation.navigate('GestionParcela', { id: item.id, readOnly: true })}
              >
                <View style={styles.cardAccent} />
                <View style={styles.cardMain}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.parcelCode}>{item.nombre}</Text>
                      <View style={[styles.badge, { backgroundColor: Theme.colors.secondaryContainer }]}>
                        <Text style={[styles.badgeText, { color: Theme.colors.onSecondaryContainer }]}>
                          {item.tipoTerreno.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('GestionParcela', { id: item.id })}
                        style={styles.actionButton}
                      >
                        <Edit size={20} color={Theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(item.id, item.nombre)}
                        style={styles.actionButton}
                      >
                        <Trash2 size={20} color={Theme.colors.error} />
                      </TouchableOpacity>
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
                    <View style={styles.metaItem}>
                      <Boxes size={14} color={Theme.colors.outline} />
                      <Text style={styles.metaText}>{item.lotes?.length || 0} Lotes</Text>
                    </View>
                  </View>

                  {item.lotes && item.lotes.length > 0 ? (
                    <Text style={styles.lotesSummary} numberOfLines={1}>
                      {item.lotes.map((l: any) => `LOT-${l.codigo}`).join(', ')}
                    </Text>
                  ) : null}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  cardHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
    marginRight: 8,
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
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  actionButton: {
    padding: 6,
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
  lotesSummary: {
    ...Theme.typography.labelSm,
    color: Theme.colors.outline,
    fontSize: 10,
    marginTop: 8,
    fontStyle: 'italic',
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
