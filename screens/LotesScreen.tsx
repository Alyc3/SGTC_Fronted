import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  StatusBar,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { Theme } from '../theme';
import { Trash2, Edit, Search, Eye, Archive, Plus, Info, MapPin } from 'lucide-react-native';
import { parcelasService } from '../services';
import { useNavigation } from '@react-navigation/native';
import { CustomAlert } from '../components/GlobalAlert';

const { width } = Dimensions.get('window');

const StatCard = ({ label, value, type = 'normal' }: any) => (
  <View style={[
    styles.statCard, 
    type === 'active' && { backgroundColor: Theme.colors.secondaryContainer }
  ]}>
    <Text style={[
      styles.statLabel,
      type === 'active' && { color: Theme.colors.onSecondaryContainer }
    ]}>{label.toUpperCase()}</Text>
    <Text style={[
      styles.statValue,
      type === 'active' && { color: Theme.colors.onSecondaryContainer }
    ]}>{value}</Text>
  </View>
);

const LoteCard = ({ item, onDelete, onEdit, onView }: any) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'En_Produccion':
        return { bg: Theme.colors.secondaryContainer, text: Theme.colors.onSecondaryContainer };
      case 'Completada':
        return { bg: Theme.colors.surfaceContainerHigh, text: Theme.colors.onSurfaceVariant };
      case 'Reservado':
      default:
        return { bg: Theme.colors.tertiaryFixed, text: Theme.colors.onTertiaryFixedVariant };
    }
  };

  const statusStyle = getStatusStyle(item.estado_lote);

  return (
    <View style={styles.premiumCard}>
      <View style={styles.cardFlex}>
        {/* Left: Image Placeholder/Thumbnail */}
        <View style={styles.cardImageContainer}>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBcfuG7uzT2CHmYiUp7XJSeemG84u-VwAPvB4Abwe8FW6a68cQ3Lv6SWkZeDt6cuUCqgyJpKQKLaPBfmLlk3kHwTjyBjjaroxRHjZR2dTvPNsCERxZ6uwyTG8m9lZNqJAUTpcREAO4apD6RsRjXbO6tWOWJJLAJgvFvXdajoi-wyb7gcOc8VMx2wChz2lO3MU3E2ZimeUUPTbdUloNqk9r961v-MGdCdE4t_q2N5KIYPclHdf1uU-q_zYUjyrtIq82sSNmEjuI2t0Wv' }} 
            style={styles.cardImage}
          />
          <View style={styles.cardImageOverlay} />
        </View>

        {/* Right: Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.lotCode}>{item.codigo}</Text>
              <Text style={styles.lotVariety}>{item.semilla?.variedadNombre || 'Sin Variedad'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {item.estado_lote.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>
              {item.hectareas_lote} Hectáreas • {item.parcela?.nombre || 'General'}
            </Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => onView(item)} style={styles.actionBtn}>
              <Eye size={16} color={Theme.colors.primary} />
              <Text style={styles.actionBtnText}>VISUALIZAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onEdit(item.id, item.parcela_id)} style={styles.actionBtn}>
              <Edit size={16} color={Theme.colors.onSurfaceVariant} />
              <Text style={[styles.actionBtnText, { color: Theme.colors.onSurfaceVariant }]}>MODIFICAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item.id, item.codigo)} style={styles.archiveBtn}>
              <Archive size={16} color={Theme.colors.outline} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const LotesScreen = () => {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: lotes = [] } = useLiveQuery(db.query.lotes.findMany({
    with: { parcela: true, semilla: true }
  }));

  const filteredLotes = lotes.filter(l => 
    l.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.semilla?.variedadNombre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: lotes.length,
    produccion: lotes.filter(l => l.estado_lote === 'En_Produccion').length,
    hectareas: lotes.reduce((sum, l) => sum + (l.hectareas_lote || 0), 0).toFixed(1)
  };

  const handleDelete = (id: string, codigo: string) => {
    Alert.alert(
      'Archivar Lote',
      `¿Desea archivar el lote técnico ${codigo} del libro mayor?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Archivar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await parcelasService.deleteLote(id);
              CustomAlert.show('SUCCESS', 'Registro Archivado', 'El lote ha sido movido al histórico.');
            } catch (error) {
              CustomAlert.show('ERROR', 'Error', 'No se pudo procesar la solicitud.');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (id: string, parcelaId: string) => {
    navigation.navigate('GestionLote', { id, parcelaId });
  };

  const handleView = (item: any) => {
    // Logic for visualization
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <FlatList
        data={filteredLotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LoteCard 
            item={item} 
            onDelete={handleDelete} 
            onEdit={handleEdit}
            onView={handleView}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.topLabel}>ARCHIVO DE FINCAS</Text>
            <Text style={styles.title}>Inventario de Lotes</Text>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Search size={20} color={Theme.colors.outline} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por código o nombre..."
                placeholderTextColor={Theme.colors.outline}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Stats Scroll */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.statsScroll}
              contentContainerStyle={styles.statsContent}
            >
              <StatCard label="Total Lotes" value={stats.total} />
              <StatCard label="Producción" value={stats.produccion} type="active" />
              <StatCard label="Hectáreas" value={stats.hectareas} />
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Info size={48} color={Theme.colors.outlineVariant} />
            <Text style={styles.empty}>No hay registros coincidentes.</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => CustomAlert.show('ALERTA', 'Nueva Creación', 'Inicie desde la pantalla de Parcela para vincular el lote.')}
      >
        <Plus size={28} color={Theme.colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Theme.colors.background 
  },
  listContent: { 
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
  },
  topLabel: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'System',
    fontSize: 32,
    fontWeight: '900',
    color: Theme.colors.primary,
    letterSpacing: -1,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerHigh,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  statsScroll: {
    marginHorizontal: -24,
    marginBottom: 8,
  },
  statsContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 14,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Theme.colors.primary,
  },
  premiumCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    ...Theme.shadows.ambient,
    shadowOpacity: 0.03,
    elevation: 2,
  },
  cardFlex: {
    flexDirection: 'row',
  },
  cardImageContainer: {
    width: 100,
    height: '100%',
    backgroundColor: Theme.colors.surfaceContainerHighest,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(68, 42, 34, 0.1)',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lotCode: {
    fontSize: 18,
    fontWeight: '900',
    color: Theme.colors.primary,
  },
  lotVariety: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardMeta: {
    marginBottom: 16,
  },
  metaText: {
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 195, 190, 0.2)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: 1,
  },
  archiveBtn: {
    marginLeft: 'auto',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.ambient,
    elevation: 8,
    shadowOpacity: 0.3,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 16,
  },
  empty: {
    fontSize: 14,
    color: Theme.colors.outline,
    fontStyle: 'italic',
  }
});

export default LotesScreen;
