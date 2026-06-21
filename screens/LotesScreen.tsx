import React, { useState, useMemo, useCallback } from 'react';
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
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { asignacion_personal } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Theme } from '../theme';
import { Trash2, Edit, Search, Eye, Archive, Plus, Info, MapPin, Layers, ShieldCheck, CheckCircle2, Clock, ChevronDown, ChevronUp, User, Users, Sprout, Filter, X } from 'lucide-react-native';
import { lotesService, parcelasService, rolesService } from '../services';
import { useNavigation } from '@react-navigation/native';
import { CustomAlert } from '../components/GlobalAlert';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const ETAPAS = ['Sembrado', 'Cosechado', 'Despulpado', 'Secado', 'Tostado', 'Empaquetado', 'Transporte'];
const ESTADOS = [
  { label: 'Reservado', value: 'Reservado' },
  { label: 'En producción', value: 'En_Produccion' },
  { label: 'Completado', value: 'Completada' }
];

const FilterChip = ({ label, active, onPress, onClear }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    style={[
      styles.filterChip, 
      active && { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary }
    ]}
  >
    <Text style={[styles.filterChipText, active && { color: Theme.colors.onPrimary }]}>
      {label}
    </Text>
    {active && onClear && (
      <TouchableOpacity onPress={onClear} style={{ marginLeft: 4 }}>
        <X size={12} color={Theme.colors.onPrimary} />
      </TouchableOpacity>
    )}
  </TouchableOpacity>
);

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

const LoteCard = ({ item, onDelete, onEdit, onView, rolesMap }: any) => {
  const navigation = useNavigation<any>();
  const role = useAuthStore((state) => state.role);
  const [showWorkers, setShowWorkers] = useState(false);
  
  // Normalización ultra-robusta del rol para evitar fallos si el rol es un objeto o null
  const getCleanRole = () => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    if (typeof role === 'object') return (role as any).name || (role as any).role || '';
    return String(role);
  };

  const userRole = getCleanRole().trim().toLowerCase().replace(/_/g, ' ');
  const isCapataz = userRole.includes('capataz');
  const isAdminOrManager = (userRole === 'admin' || userRole === 'gerente general' || isCapataz || userRole.includes('tecnico'));
  const canAssign = (userRole === 'admin' || userRole === 'gerente general' || isCapataz);

  // Filtrar asignaciones
  const asignaciones = item.asignaciones || [];
  const capatacesAsignados = asignaciones.filter((a: any) => {
    const roleName = (rolesMap[a.trabajador?.role_id] || '').toLowerCase();
    return roleName.includes('capataz');
  });

  const trabajadoresAsignados = asignaciones.filter((a: any) => {
    const roleName = (rolesMap[a.trabajador?.role_id] || '').toLowerCase();
    return !roleName.includes('capataz');
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'En_Produccion':
        return { bg: '#E67E22', text: '#ffffff' }; // Orange for En Produccion
      case 'Completada':
        return { bg: '#3a6843', text: '#ffffff' }; // Green for Completada
      case 'Reservado':
      default:
        return { bg: '#827470', text: '#ffffff' }; // Gray for Reservado
    }
  };

  const statusStyle = getStatusStyle(item.estado_lote);
  const isProduccion = item.estado_lote === 'En_Produccion';

  // Verificar si hay una etapa de Sembrado activa para el bloqueo de Capataz
  const isSembradoActive = item.estados_etapas?.some((e: any) => 
    e.etapa === 'Sembrado' && e.estado === 'En_Proceso'
  );

  const handlePress = () => {
    // Si es capataz y la etapa activa es Sembrado, se pasa flag de solo lectura
    const readOnly = isCapataz && isSembradoActive;
    onView(item, readOnly);
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={handlePress}
      style={styles.premiumCard}
    >
      <View style={styles.cardFlex}>
        {/* Left: Thumbnail Section */}
        <View style={styles.cardImageContainer}>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBcfuG7uzT2CHmYiUp7XJSeemG84u-VwAPvB4Abwe8FW6a68cQ3Lv6SWkZeDt6cuUCqgyJpKQKLaPBfmLlk3kHwTjyBjjaroxRHjZR2dTvPNsCERxZ6uwyTG8m9lZNqJAUTpcREAO4apD6RsRjXbO6tWOWJJLAJgvFvXdajoi-wyb7gcOc8VMx2wChz2lO3MU3E2ZimeUUPTbdUloNqk9r961v-MGdCdE4t_q2N5KIYPclHdf1uU-q_zYUjyrtIq82sSNmEjuI2t0Wv' }} 
            style={styles.cardImage}
          />
          <View style={styles.cardImageOverlay} />
          {isSembradoActive && (
            <View style={styles.stageIndicator}>
              <Sprout size={10} color={Theme.colors.onPrimary} />
            </View>
          )}
        </View>

        {/* Right: Content Section */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, alignSelf: 'flex-start', marginBottom: 4 }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                  {item.estado_lote.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.lotCode}>{item.codigo}</Text>
              <Text style={styles.lotVariety}>{item.semilla?.variedad?.valor || 'Sin variedad'}</Text>
            </View>
            <TouchableOpacity onPress={handlePress} style={styles.viewIcon}>
              <Eye size={20} color={Theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>{item.hectareas_lote} Hectáreas</Text>
          </View>

          {/* Sección de Responsable Técnico */}
          <View style={styles.technicalSection}>
            <View style={styles.technicalHeader}>
              <ShieldCheck size={12} color={Theme.colors.secondary} />
              <Text style={styles.technicalLabel}>RESPONSABLE TÉCNICO</Text>
            </View>
            {capatacesAsignados.length > 0 ? (
              capatacesAsignados.map((a: any) => (
                <Text key={a.id} style={styles.capatazName} numberOfLines={1}>
                  • {a.trabajador?.first_name} {a.trabajador?.last_name}
                </Text>
              ))
            ) : (
              <Text style={styles.noCapataz}>Sin responsable asignado</Text>
            )}
          </View>

          {/* Sección de Trabajadores con Dropdown */}
          <View style={styles.workersSection}>
            <TouchableOpacity 
              style={styles.workersHeader} 
              onPress={() => setShowWorkers(!showWorkers)}
              activeOpacity={0.7}
            >
              <Users size={12} color={Theme.colors.primary} />
              <Text style={styles.workersLabel}>TRABAJADORES ({trabajadoresAsignados.length})</Text>
              {trabajadoresAsignados.length > 0 && (
                showWorkers ? <ChevronUp size={12} color={Theme.colors.outline} /> : <ChevronDown size={12} color={Theme.colors.outline} />
              )}
            </TouchableOpacity>
            
            {showWorkers && trabajadoresAsignados.length > 0 && (
              <View style={styles.workersList}>
                {trabajadoresAsignados.map((a: any) => (
                  <View key={a.id} style={styles.workerItem}>
                    <User size={10} color={Theme.colors.outline} />
                    <Text style={styles.workerName}>{a.trabajador?.first_name} {a.trabajador?.last_name}</Text>
                  </View>
                ))}
              </View>
            )}
            {!showWorkers && trabajadoresAsignados.length > 0 && (
              <Text style={styles.helperText}>Toca para ver equipo</Text>
            )}
            {trabajadoresAsignados.length === 0 && (
              <Text style={styles.noCapataz}>Sin personal asignado</Text>
            )}
          </View>

          <View style={styles.cardActions}>
            {canAssign && (
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('AssignPersonal', { lote: item });
                }} 
                style={styles.mainActionBtn}
              >
                <Users size={16} color={Theme.colors.onPrimary} />
                <Text style={styles.mainActionBtnText}>ASIGNACIÓN PERSONAL</Text>
              </TouchableOpacity>
            )}

            <View style={styles.secondaryActions}>
              {isAdminOrManager && (
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit(item.id, item.parcela_id, isProduccion);
                  }} 
                  style={[styles.smallActionBtn, isProduccion && { opacity: 0.5 }]}
                  disabled={isProduccion}
                >
                  <Edit size={16} color={Theme.colors.primary} />
                </TouchableOpacity>
              )}
              {isAdminOrManager && (
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete(item.id, item.codigo, isProduccion);
                  }} 
                  style={[styles.smallActionBtn, isProduccion && { opacity: 0.5 }]}
                  disabled={isProduccion}
                >
                  <Archive size={16} color={Theme.colors.outline} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const LotesScreen = () => {
  const navigation = useNavigation<any>();

  // Manejo robusto del botón "Atrás" (Hardware y Gestos)
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

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterEtapa, setFilterEtapa] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterVariedad, setFilterVariedad] = useState('');
  const [filterCapataz, setFilterCapataz] = useState('');
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  
  // Selectores reactivos
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);

  // Normalización ultra-robusta del rol
  const getCleanRole = useCallback(() => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    if (typeof role === 'object') return (role as any).name || (role as any).role || '';
    return String(role);
  }, [role]);

  const userRole = getCleanRole().trim().toLowerCase().replace(/_/g, ' ');
  
  // Solo los administradores de nivel superior ven TODO el inventario sin filtros
  const isSuperUser = (userRole === 'admin' || userRole === 'gerente general');
  
  // Capataces y Técnicos tienen permisos para gestionar los lotes que VEN
  const isAdminOrManager = isSuperUser || userRole.includes('capataz') || userRole.includes('tecnico') || userRole.includes('técnico');
  
  const fetchRoles = useCallback(async () => {
    try {
      const rolesData = await rolesService.getAll();
      const rolesArray = Array.isArray(rolesData) ? rolesData : (rolesData.roles || rolesData.data || []);
      const newRolesMap: Record<string, string> = {};
      rolesArray.forEach((r: any) => {
        newRolesMap[r.id] = (r.name || r.nombre || r.role_name || '').trim().toLowerCase();
      });
      setRolesMap(newRolesMap);
    } catch (e) {
      console.warn('[LotesScreen] No se pudieron cargar los roles:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRoles();
    }, [fetchRoles])
  );

  // Query global de lotes (filtrada luego en memoria por rendimiento y reactividad)
  const { data: lotes = [] } = useLiveQuery(db.query.lotes.findMany({
    with: { 
      parcela: true, 
      estados_etapas: true,
      semilla: {
        with: { variedad: true }
      },
      asignaciones: {
        with: {
          trabajador: true
        }
      }
    }
  }));

  const sections = useMemo(() => {
    // 1. Filtrado usando el servicio (incluye lógica de permisos)
    const filtered = lotesService.filterLotes(
      lotes || [],
      {
        search: searchQuery,
        etapa: filterEtapa,
        estado: filterEstado,
        variedad: filterVariedad,
        capataz: filterCapataz
      },
      {
        userId,
        isSuperUser
      }
    );

    // 2. Agrupación por Parcelas
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
  }, [lotes, userId, isSuperUser, searchQuery, filterEtapa, filterEstado, filterVariedad, filterCapataz]);

  const stats = {
    total: lotes.length,
    produccion: lotes.filter(l => l.estado_lote === 'En_Produccion').length,
    hectareas: lotes.reduce((sum, l) => sum + (l.hectareas_lote || 0), 0).toFixed(1)
  };

  const clearFilters = () => {
    setFilterEtapa('');
    setFilterEstado('');
    setFilterVariedad('');
    setFilterCapataz('');
    setSearchQuery('');
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

  const handleView = (item: any, readOnly: boolean = false) => {
    navigation.navigate('ViewLote', { lote: item, readOnly });
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
            rolesMap={rolesMap}
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
            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <Search size={20} color={Theme.colors.outline} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Código o variedad..."
                  placeholderTextColor={Theme.colors.outline}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {(searchQuery !== '' || filterEtapa !== '' || filterEstado !== '' || filterVariedad !== '' || filterCapataz !== '') && (
                  <TouchableOpacity onPress={clearFilters}>
                    <X size={18} color={Theme.colors.outline} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity 
                style={[styles.filterToggle, showFilters && { backgroundColor: Theme.colors.primaryContainer }]} 
                onPress={() => setShowFilters(!showFilters)}
              >
                <Filter size={20} color={showFilters ? Theme.colors.primary : Theme.colors.outline} />
              </TouchableOpacity>
            </View>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <View style={styles.filtersPanel}>
                <Text style={styles.filterGroupLabel}>ETAPA ACTUAL</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {ETAPAS.map(etapa => (
                    <FilterChip 
                      key={etapa} 
                      label={etapa} 
                      active={filterEtapa === etapa} 
                      onPress={() => setFilterEtapa(filterEtapa === etapa ? '' : etapa)} 
                    />
                  ))}
                </ScrollView>

                <Text style={styles.filterGroupLabel}>ESTADO DEL LOTE</Text>
                <View style={styles.filterRow}>
                  {ESTADOS.map(estado => (
                    <FilterChip 
                      key={estado.value} 
                      label={estado.label} 
                      active={filterEstado === estado.value} 
                      onPress={() => setFilterEstado(filterEstado === estado.value ? '' : estado.value)} 
                    />
                  ))}
                </View>

                <View style={styles.extraFiltersRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.filterGroupLabel}>VARIEDAD</Text>
                    <TextInput
                      style={styles.filterInput}
                      placeholder="Ej: Geisha..."
                      value={filterVariedad}
                      onChangeText={setFilterVariedad}
                    />
                  </View>
                  {isSuperUser && (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filterGroupLabel}>CAPATAZ</Text>
                      <TextInput
                        style={styles.filterInput}
                        placeholder="Nombre..."
                        value={filterCapataz}
                        onChangeText={setFilterCapataz}
                      />
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Stats Scroll */}
            { (typeof isAdminOrManager !== "undefined" && isAdminOrManager) && (
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
              {! (typeof isAdminOrManager !== "undefined" && isAdminOrManager) 
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
    ...Theme.typography.labelSm,
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    ...Theme.typography.display,
    fontSize: 24,
    fontWeight: '900',
    color: Theme.colors.primary,
    letterSpacing: -1,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerHigh,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  filterToggle: {
    width: 44,
    height: 44,
    backgroundColor: Theme.colors.surfaceContainerHigh,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersPanel: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 195, 190, 0.1)',
  },
  filterGroupLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.outline,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  filterScroll: {
    marginHorizontal: -4,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Theme.colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(212, 195, 190, 0.2)',
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.onSurfaceVariant,
  },
  extraFiltersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterInput: {
    backgroundColor: Theme.colors.surfaceContainerHighest,
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 10,
    fontSize: 12,
    color: Theme.colors.onSurface,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    ...Theme.typography.body,
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
  viewIcon: {
    padding: 4,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 8,
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
    marginBottom: 8,
  },
  metaText: {
    fontSize: 10,
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  stageIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Theme.colors.primary,
    borderRadius: 6,
    padding: 2,
  },
  technicalSection: {
    marginTop: 4,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 195, 190, 0.1)',
  },
  technicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  technicalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.secondary,
    letterSpacing: 0.5,
  },
  workersSection: {
    marginBottom: 12,
  },
  workersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  workersLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: 0.5,
  },
  workersList: {
    marginTop: 4,
    gap: 4,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
  },
  workerName: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.onSurface,
  },
  capatazName: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    lineHeight: 14,
    paddingLeft: 4,
  },
  noCapataz: {
    fontSize: 10,
    color: Theme.colors.outline,
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  emptyText: {
    fontSize: 10,
    color: Theme.colors.outline,
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  helperText: {
    fontSize: 9,
    color: Theme.colors.secondary,
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 195, 190, 0.2)',
  },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    elevation: 2,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  mainActionBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: Theme.colors.onPrimary,
    letterSpacing: 0.5,
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallActionBtn: {
    padding: 6,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 6,
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
