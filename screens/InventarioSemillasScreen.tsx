import React, { useState } from 'react';
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
  Trash2,
} from 'lucide-react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { Theme } from '../theme';
import { semillasService } from '../services';
import { CustomAlert } from '../components/GlobalAlert';
import { Alert } from 'react-native';

const InventarioSemillasScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: rawSemillas } = useLiveQuery(db.query.semillas.findMany({
    where: (fields, { eq }) => eq(fields.activo, true),
    with: {
      variedad: true,
      pais_origen: true,
      distribuidor: true,
      color: true,
      olor: true,
      metodo_secado: true,
      seleccion: true,
      integridad: true,
    },
    orderBy: (semillas, { desc }) => [desc(semillas.anexo_creacion)]
  }));

  const semillas = semillasService.search(rawSemillas || [], searchQuery);

  const handleDelete = (id: string, nombre: string) => {
    Alert.alert(
      'Dar de baja',
      `¿Está seguro que desea dar de baja la semilla "${nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await semillasService.delete(id);
              CustomAlert.show('SUCCESS', 'Éxito', 'Semilla dada de baja correctamente.');
            } catch (error) {
              CustomAlert.show('ERROR', 'Error', 'No se pudo procesar la baja.');
            }
          } 
        }
      ]
    );
  };

  const renderItem = ({ item }: any) => {
    const isUpdated = item.fecha_modificacion && item.fecha_modificacion !== item.fecha_creacion && item.fecha_modificacion !== item.anexo_creacion;
    const iconColor = Theme.colors.secondary;
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.9}
        onPress={() => navigation.navigate('RegistroSemilla', { id: item.id, readOnly: true })}
      >
        
        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <View style={styles.leftInfo}>
              {/* Local/Cloud Badge above Category */}
              <View style={[styles.miniBadge, item.is_synced ? styles.badgeSynced : styles.badgePending]}>
                <ShieldCheck size={10} color={item.is_synced ? Theme.colors.onPrimary : Theme.colors.primary} />
                <Text style={[styles.miniBadgeText, { color: item.is_synced ? Theme.colors.onPrimary : Theme.colors.primary }]}>
                  {item.is_synced ? 'NUBE' : 'LOCAL'}
                </Text>
              </View>
              
              <Text style={styles.cardCategory}>PATRIMONIO GENÉTICO</Text>
              
              {/* Title and Variety Icon next to each other */}
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{item.variedad?.valor || 'Sin nombre'}</Text>
                <View style={styles.varietyIconWrapper}>
                  <Leaf size={14} color={iconColor} />
                </View>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={() => navigation.navigate('RegistroSemilla', { id: item.id })}
                style={styles.actionIconButton}
              >
                <Edit size={18} color={Theme.colors.onPrimary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleDelete(item.id, item.variedad?.valor || '')}
                style={[styles.actionIconButton, { backgroundColor: 'rgba(186, 26, 26, 0.2)' }]}
              >
                <Trash2 size={18} color={Theme.colors.onSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={styles.detailLabelRow}>
                <Globe2 size={16} color={iconColor} />
                <Text style={styles.detailLabel}>ORIGEN</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>{item.pais_origen?.valor || 'Desconocido'}</Text>
            </View>

            <View style={styles.gridItem}>
              <View style={styles.detailLabelRow}>
                <Truck size={16} color={iconColor} />
                <Text style={styles.detailLabel}>PROVEEDOR</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>{item.distribuidor?.valor || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.dateContainer}>
              <CalendarDays size={16} color={iconColor} />
              <Text style={styles.dateText}>
                {isUpdated ? 'MOD: ' : 'CREADO: '}
                {new Date(isUpdated ? item.fecha_modificacion : (item.fecha_creacion || item.anexo_creacion)).toLocaleDateString('es-ES')}
              </Text>
            </View>
            <View style={styles.arrowCircle}>
              <ChevronRight size={20} color={Theme.colors.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
            </View>
            <View style={styles.searchContainer}>
              <Search size={20} color={Theme.colors.outline} style={styles.searchIcon} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Buscar por cualquier campo..." 
                placeholderTextColor={Theme.colors.outline} 
                value={searchQuery}
                onChangeText={setSearchQuery}
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

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('RegistroSemilla')}
        activeOpacity={0.8}
      >
        <Plus size={28} color={Theme.colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { ...Theme.typography.display, fontSize: 28, color: Theme.colors.primary, marginTop: 4 },
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
  list: { paddingBottom: 100 },
  
  // Floating Action Button
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: Theme.colors.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.ambient,
    elevation: 8,
  },

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
    borderRadius: 24, 
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
  leftInfo: {
    flex: 1,
  },
  miniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 4,
  },
  miniBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeSynced: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgePending: {
    backgroundColor: Theme.colors.surfaceContainerLow,
  },
  cardCategory: {
    ...Theme.typography.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Theme.colors.secondaryContainer,
    fontWeight: '800',
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...Theme.typography.headline,
    fontSize: 18,
    color: Theme.colors.onPrimary,
  },
  varietyIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    gap: 6,
    marginBottom: 4,
  },
  detailLabel: {
    ...Theme.typography.label,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  detailValue: {
    ...Theme.typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
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
    gap: 8,
  },
  dateText: {
    ...Theme.typography.label,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Theme.colors.onPrimary,
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
