import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  SectionList, 
  StyleSheet, 
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { asignacion_personal } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Theme } from '../theme';
import { Trash2, Edit, Search, Eye, Archive, Plus, Info, MapPin, Layers, ShieldCheck } from 'lucide-react-native';
import { lotesService, parcelasService } from '../services';
import { useNavigation } from '@react-navigation/native';
import { CustomAlert } from '../components/GlobalAlert';
import { useAuthStore } from '../store/authStore';

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
  const navigation = useNavigation<any>();
  const role = useAuthStore((state) => state.role);
  
  // Normalización ultra-robusta del rol para evitar fallos si el rol es un objeto o null
  const getCleanRole = () => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    if (typeof role === 'object') return (role as any).name || (role as any).role || '';
    return String(role);
  };

  const userRole = getCleanRole().trim().toLowerCase().replace(/_/g, ' ');
  const canAssignCapataz = userRole === 'admin' || userRole === 'gerente general';

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
  const isProduccion = item.estado_lote === 'En_Produccion';

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => onView(item)}
      style={styles.premiumCard}
    >
      <View style={styles.cardFlex}>
        {/* Left: Image Placeholder/Thumbnail - More compact */}
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
              {/* Status above code */}
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, alignSelf: 'flex-start', marginBottom: 4 }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                  {item.estado_lote.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.lotCode}>{item.codigo}</Text>
              <Text style={styles.lotVariety}>{item.semilla?.variedad?.valor || 'Sin variedad'}</Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>
              {item.hectareas_lote} Hectáreas
            </Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                onEdit(item.id, item.parcela_id, isProduccion);
              }} 
              style={[styles.actionBtn, isProduccion && { opacity: 0.5 }]}
            >
              <Edit size={16} color={isProduccion ? Theme.colors.outline : Theme.colors.onSurfaceVariant} />
              <Text style={[styles.actionBtnText, { color: isProduccion ? Theme.colors.outline : Theme.colors.onSurfaceVariant }]}>
                {isProduccion ? 'BLOQUEADO' : 'MODIFICAR'}
              </Text>
            </TouchableOpacity>

            {canAssignCapataz && (
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('AssignCapataz', { lote: item });
                }} 
                style={styles.actionBtn}
              >
                <ShieldCheck size={16} color={Theme.colors.secondary} />
                <Text style={[styles.actionBtnText, { color: Theme.colors.secondary }]}>
                  CAPATAZ
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                onDelete(item.id, item.codigo, isProduccion);
              }} 
              style={[styles.archiveBtn, isProduccion && { opacity: 0.5 }]}
            >
              <Archive size={14} color={isProduccion ? Theme.colors.outline : Theme.colors.outline} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const LotesScreen = () => {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const userId = useAuthStore((state) => state.role === 'string' ? state.userId : (state as any).userId);
  const role = useAuthStore((state) => state.role);

  // Normalización ultra-robusta del rol
  const getCleanRole = () => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    if (typeof role === 'object') return (role as any).name || (role as any).role || '';
    return String(role);
  };
  const userRole = getCleanRole().trim().toLowerCase().replace(/_/g, ' ');
  const isAdminOrManager = userRole === 'admin' || userRole === 'gerente general';
  
  const { data: lotes = [] } = useLiveQuery(db.query.lotes.findMany({
    with: { 
      parcela: true, 
      semilla: {
        with: { variedad: true }
      } 
    }
  }));

  // Obtener asignaciones para el usuario actual (solo si no es admin/manager)
  const { data: userAssignments = [] } = useLiveQuery(
    db.query.asignacion_personal.findMany({
      where: userId ? eq(asignacion_personal.trabajador_id, userId) : undefined
    }),
    [userId]
  );

  const sections = useMemo(() => {
    // 1. Filtrado por Rol y Asignación
    let filteredByAssignment = lotes;
    if (!isAdminOrManager) {
      const assignedLotIds = userAssignments.map(a => a.lote_id);
      filteredByAssignment = lotes.filter(l => assignedLotIds.includes(l.id));
    }

    // 2. Filtrado por Búsqueda
    const filtered = filteredByAssignment.filter(l => 
      l.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.semilla as any)?.variedad?.valor?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = filtered.reduce((acc: any[], lot: any) => {
      const parcelaNombre = lot.parcela?.nombre || 'General';
      const section = acc.find(s => s.title === parcelaNombre);
      if (section) {
        section.data.push(lot);
      } else {
        acc.push({ title: parcelaNombre, data: [lot] });
      }
      return acc;
    }, []);

    return grouped.sort((a, b) => a.title.localeCompare(b.title));
  }, [lotes, userAssignments, isAdminOrManager, searchQuery]);

  const stats = {
    total: lotes.length,
    produccion: lotes.filter(l => l.estado_lote === 'En_Produccion').length,
    hectareas: lotes.reduce((sum, l) => sum + (l.hectareas_lote || 0), 0).toFixed(1)
  };

  const handleDelete = (id: string, codigo: string, isProduccion: boolean) => {
    if (isProduccion) {
      CustomAlert.show('ALERTA', 'Acción Denegada', 'No se puede dar de baja un lote que está en producción.');
      return;
    }

    CustomAlert.show(
      'ALERTA',
      'Archivar Lote',
      `¿Desea archivar el lote técnico ${codigo} del libro mayor?`,
      async () => {
        try {
          await lotesService.delete(id);
          CustomAlert.show('SUCCESS', 'Registro Archivado', 'El lote ha sido movido al histórico.');
        } catch (error: any) {
          CustomAlert.show('ERROR', 'Error', error.message || 'No se pudo procesar la solicitud.');
        }
      },
      'ARCHIVAR',
      () => {},
      'CANCELAR'
    );
  };

  const handleEdit = (id: string, parcelaId: string, isProduccion: boolean) => {
    if (isProduccion) {
      CustomAlert.show('ALERTA', 'Lote en Producción', 'Los lotes en producción no pueden ser modificados para garantizar la integridad de la trazabilidad.');
      return;
    }
    navigation.navigate('GestionLote', { id, parcelaId });
  };

  const handleView = (item: any) => {
    navigation.navigate('ViewLote', { lote: item });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LoteCard 
            item={item} 
            onDelete={handleDelete} 
            onEdit={handleEdit}
            onView={handleView}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <MapPin size={14} color={Theme.colors.primary} />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
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
            {isAdminOrManager && (
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
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Info size={48} color={Theme.colors.outlineVariant} />
            <Text style={styles.empty}>
              {!isAdminOrManager 
                ? "No tiene lotes asignados bajo su responsabilidad." 
                : "No hay registros coincidentes."}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Theme.colors.background 
  },
  listContent: { 
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: 0.5,
  },
  topLabel: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '900',
    color: Theme.colors.primary,
    letterSpacing: -1,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerHigh,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 13,
    color: Theme.colors.onSurface,
  },
  statsScroll: {
    marginHorizontal: -16,
    marginBottom: 4,
  },
  statsContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    minWidth: 100,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Theme.colors.primary,
  },
  premiumCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 195, 190, 0.1)',
    ...Theme.shadows.ambient,
    shadowOpacity: 0.02,
    elevation: 1,
  },
  cardFlex: {
    flexDirection: 'row',
  },
  cardImageContainer: {
    width: 60,
    height: 120,
    backgroundColor: Theme.colors.surfaceContainerHighest,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(68, 42, 34, 0.05)',
  },
  cardContent: {
    flex: 1,
    padding: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  lotCode: {
    fontSize: 14,
    fontWeight: '900',
    color: Theme.colors.primary,
  },
  lotVariety: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    marginTop: 0,
  },
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardMeta: {
    marginBottom: 6,
  },
  metaText: {
    fontSize: 10,
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 195, 190, 0.2)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionBtnText: {
    fontSize: 8,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: 0.5,
  },
  archiveBtn: {
    marginLeft: 'auto',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  empty: {
    fontSize: 13,
    color: Theme.colors.outline,
    fontStyle: 'italic',
    textAlign: 'center',
  }
});

export default LotesScreen;
