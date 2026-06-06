import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import {
  ArrowLeft,
  Users,
  Sprout,
  CheckCircle2,
  Circle,
  ArrowRight,
  User,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react-native';
import { Theme } from '../theme';
import { lotesService } from '../services/lotes.service';
import { personalService } from '../services/personal.service';
import { rolesService } from '../services/roles.service';
import { parcelasService } from '../services/parcelas.service';
import { syncWorker } from '../services/sync.worker';
import { EtapaProcesoValues } from '../db/schema/enums';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomAlert } from '../components/GlobalAlert';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const ALLOWED_ROLES = [
  'ADMIN',
  'Gerente General',
  'Capataz',
  'Sembrador',
  'Recolector',
  'Clasificador',
  'Técnico de Despulpado',
  'Encargado de Secado',
  'Tostador',
  'Gestor de Calidad',
  'Gestores de Calidad',
  'Controlador Despacho',
  'Técnico de Almacenamiento',
  'Técnicos de Almacenamiento',
  'TECNICO_SEMBRADO',
  'TECNICO_AGRONOMO',
  'Técnico Agrónomo',
  'Técnico Sembrado'
];

const ALLOWED_ROLES_NORMALIZED = [
  ...ALLOWED_ROLES.map(r => r.trim().toLowerCase()),
  ...ALLOWED_ROLES.map(r => r.trim().toLowerCase().replace(/\s+/g, '_')),
  ...ALLOWED_ROLES.map(r => r.trim().toLowerCase().replace(/_/g, ' ')),
];

const AssignPersonalScreen = ({ navigation, route }: any) => {
  const { role: userRoleRaw } = useAuthStore();
  
  const getCleanRole = () => {
    if (!userRoleRaw) return 'COLABORADOR';
    if (typeof userRoleRaw === 'string') return userRoleRaw;
    if (typeof userRoleRaw === 'object') return (userRoleRaw as any).name || (userRoleRaw as any).role || 'COLABORADOR';
    return String(userRoleRaw);
  };

  const currentRole = getCleanRole();
  const displayRole = currentRole.trim().toUpperCase().replace(/_/g, ' ');

  const [lotes, setLotes] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [selectedLote, setSelectedLote] = useState<any>(route.params?.lote || null);
  const [selectedEtapa, setSelectedEtapa] = useState<string>(route.params?.etapa || EtapaProcesoValues[0]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [lotesData, personnelData, rolesData, assignmentsData] = await Promise.all([
        lotesService.getAll(),
        personalService.getAll(),
        rolesService.getAll().catch(() => []),
        selectedLote ? lotesService.getAssignedPersonnel(selectedLote.id) : Promise.resolve([])
      ]);

      // Mapeo de roles
      const rolesArray = Array.isArray(rolesData) ? rolesData : (rolesData.roles || rolesData.data || []);
      const newRolesMap: Record<string, string> = {};
      rolesArray.forEach((r: any) => {
        newRolesMap[r.id] = r.name || r.nombre || r.role_name || r.id;
      });
      setRolesMap(newRolesMap);

      // Filtrar personal igual que en la pantalla principal para consistencia
      const filteredPersonnel = personnelData.filter((w: any) => {
        const roleName = newRolesMap[w.role_id] || w.role_id;
        if (!roleName) return false;
        const cleanName = roleName.trim().toLowerCase();
        return ALLOWED_ROLES_NORMALIZED.includes(cleanName);
      });

      setLotes(lotesData);
      setPersonnel(filteredPersonnel);
      setExistingAssignments(assignmentsData);
      
      // If we don't have a lote from params, pick the first one from DB
      if (!selectedLote && lotesData.length > 0) {
        setSelectedLote(lotesData[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      CustomAlert.show('ERROR', 'Error', 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Limpiar selección cuando cambia la etapa para evitar errores de asignación
  useEffect(() => {
    setSelectedPersonnel([]);
  }, [selectedEtapa]);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(worker => {
      const roleNameRaw = rolesMap[worker.role_id] || '';
      const roleName = roleNameRaw.trim().toLowerCase().replace(/\s+/g, '_');
      
      if (selectedEtapa === 'Sembrado') {
        // Para Sembrado: Sembrador o Técnico Sembrado
        return roleName === 'sembrador' || roleName === 'tecnico_sembrado' || roleName === 'técnico_sembrado';
      }
      
      if (selectedEtapa === 'Cosechado') {
        // Para Cosechado: Recolector, Clasificador o Técnico Agrónomo
        return roleName === 'recolector' || roleName === 'clasificador' || roleName === 'tecnico_agronomo' || roleName === 'técnico_agrónomo';
      }
      
      // Para otras etapas, mostrar todo el personal permitido por defecto
      return true;
    });
  }, [personnel, selectedEtapa, rolesMap]);

  const alreadyAssignedIds = useMemo(() => {
    return new Set(
      existingAssignments
        .filter(a => a.etapa === selectedEtapa)
        .map(a => a.trabajador_id || a.trabajador?.id)
    );
  }, [existingAssignments, selectedEtapa]);

  const togglePersonnelSelection = (id: string) => {
    if (alreadyAssignedIds.has(id)) return; // No permitir seleccionar si ya está asignado

    const worker = personnel.find(p => p.id === id);
    const roleNameRaw = rolesMap[worker?.role_id] || '';
    
    // Normalización robusta para comparación (quitar acentos, espacios y pasar a minúsculas)
    const normalize = (str: string) => 
      str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');

    const roleName = normalize(roleNameRaw);
    
    // Restricción para etapa de 'Sembrado': Solo un 'Tecnico de Sembrado'
    if (selectedEtapa === 'Sembrado' && roleName === 'tecnico_sembrado' && !selectedPersonnel.includes(id)) {
      const alreadyHasTecnico = selectedPersonnel.some(pId => {
        const p = personnel.find(w => w.id === pId);
        const rName = normalize(rolesMap[p?.role_id] || '');
        return rName === 'tecnico_sembrado';
      });

      // Incluir también los que ya están en DB en la validación
      const alreadyHasTecnicoInDB = Array.from(alreadyAssignedIds).some(pId => {
        const p = personnel.find(w => w.id === pId);
        const rName = normalize(rolesMap[p?.role_id] || '');
        return rName === 'tecnico_sembrado';
      });

      if (alreadyHasTecnico || alreadyHasTecnicoInDB) {
        CustomAlert.show('ALERTA', 'Límite Excedido', 'Solo se puede asignar un Técnico de Sembrado para esta etapa.');
        return;
      }
    }

    // Restricción para etapa de 'Cosechado': Solo un 'Tecnico Agronomo' (Interpretando el límite técnico)
    if (selectedEtapa === 'Cosechado' && roleName === 'tecnico_agronomo' && !selectedPersonnel.includes(id)) {
      const alreadyHasTecnico = selectedPersonnel.some(pId => {
        const p = personnel.find(w => w.id === pId);
        const rName = normalize(rolesMap[p?.role_id] || '');
        return rName === 'tecnico_agronomo';
      });

      const alreadyHasTecnicoInDB = Array.from(alreadyAssignedIds).some(pId => {
        const p = personnel.find(w => w.id === pId);
        const rName = normalize(rolesMap[p?.role_id] || '');
        return rName === 'tecnico_agronomo';
      });

      if (alreadyHasTecnico || alreadyHasTecnicoInDB) {
        CustomAlert.show('ALERTA', 'Límite Excedido', 'Solo se puede asignar un Técnico Agrónomo para esta etapa.');
        return;
      }
    }

    setSelectedPersonnel(prev =>
      prev.includes(id)
        ? prev.filter(pId => pId !== id)
        : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!selectedLote || selectedPersonnel.length === 0) {
      CustomAlert.show('ALERTA', 'Incompleto', 'Por favor seleccione un lote y al menos un trabajador.');
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        selectedPersonnel.map(workerId =>
          parcelasService.asignarPersonal(selectedLote.id, workerId, selectedEtapa as any)
        )
      );
      
      // Disparar sincronización silenciosa en segundo plano
      syncWorker.syncPendingData();
      
      CustomAlert.show('SUCCESS', 'Asignación Correcta', 'El personal ha sido asignado al lote exitosamente.', () => {
        setSelectedPersonnel([]);
        fetchData(); // Recargar datos para sombrear los nuevos asignados
      });
    } catch (error) {
      console.error('Error assigning personnel:', error);
      CustomAlert.show('ERROR', 'Error', 'No se pudo realizar la asignación.');
    } finally {
      setLoading(false);
    }
  };


  const renderPersonnelItem = ({ item }: { item: any }) => {
    const isSelected = selectedPersonnel.includes(item.id);
    const isAlreadyAssigned = alreadyAssignedIds.has(item.id);
    const roleName = rolesMap[item.role_id] || item.role_id || 'TRABAJADOR';

    return (
      <TouchableOpacity
        style={[
          styles.personnelCard,
          isSelected && { backgroundColor: Theme.colors.primaryFixed },
          isAlreadyAssigned && { opacity: 0.6, backgroundColor: Theme.colors.surfaceContainerHighest }
        ]}
        onPress={() => !isAlreadyAssigned && togglePersonnelSelection(item.id)}
        activeOpacity={isAlreadyAssigned ? 1 : 0.7}
        disabled={isAlreadyAssigned}
      >
        <View style={styles.personnelAvatar}>
          <User size={20} color={isAlreadyAssigned ? Theme.colors.outline : Theme.colors.primary} />
        </View>
        <View style={styles.personnelInfo}>
          <Text style={[styles.personnelName, isAlreadyAssigned && { color: Theme.colors.onSurfaceVariant }]}>{`${item.first_name} ${item.last_name}`}</Text>
          <View style={styles.roleRow}>
            <ShieldCheck size={12} color={isAlreadyAssigned ? Theme.colors.outline : Theme.colors.secondary} />
            <Text style={[styles.roleText, isAlreadyAssigned && { color: Theme.colors.onSurfaceVariant }]}>{roleName}</Text>
          </View>
        </View>
        {isAlreadyAssigned ? (
          <View style={{ alignItems: 'center' }}>
            <ShieldCheck size={24} color={Theme.colors.secondary} />
            <Text style={{ fontSize: 8, color: Theme.colors.secondary, fontWeight: '700' }}>ASIGNADO</Text>
          </View>
        ) : isSelected ? (
          <CheckCircle2 size={24} color={Theme.colors.primary} />
        ) : (
          <Circle size={24} color={Theme.colors.outlineVariant} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading && lotes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('ViewLote', { lote: selectedLote })}
        >
          <ArrowLeft size={24} color={Theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>{displayRole}</Text>
        <Text style={styles.title}>Asignación de Personal</Text>
        <Text style={styles.subtitle}>Configure el equipo de trabajo para la etapa actual.</Text>
      </View>

      <View style={styles.content}>
        {/* Static Lote Info */}
        <View style={styles.staticLoteContainer}>
          <View style={styles.loteInfoContent}>
            <View style={styles.loteIconWrapper}>
              <Sprout size={24} color={Theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.staticLoteLabel}>Lote Seleccionado</Text>
              <Text style={styles.staticLoteValue}>{selectedLote?.codigo || 'Sin Código'}</Text>
            </View>
          </View>
          <View style={styles.loteHectareasBadge}>
            <Text style={styles.hectareasText}>{selectedLote?.hectareas_lote || '0'} Ha</Text>
          </View>
        </View>

        {/* Phase Selector (Horizontal Card Radio Group) */}
        <View style={styles.phaseSelectorContainer}>
          <Text style={styles.phaseSelectorTitle}>Etapa de Trabajo</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.phasesScrollContent}
          >
            {EtapaProcesoValues.filter(e => e !== 'Administración').map((etapa) => {
              const isSelected = selectedEtapa === etapa;
              return (
                <TouchableOpacity
                  key={etapa}
                  style={[
                    styles.phaseCard,
                    isSelected && styles.phaseCardSelected
                  ]}
                  onPress={() => setSelectedEtapa(etapa)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.phaseIconContainer,
                    isSelected && styles.phaseIconContainerSelected
                  ]}>
                    {etapa === 'Sembrado' ? (
                      <Sprout size={20} color={isSelected ? Theme.colors.onPrimary : Theme.colors.primary} />
                    ) : (
                      <Layers size={20} color={isSelected ? Theme.colors.onPrimary : Theme.colors.primary} />
                    )}
                  </View>
                  <Text style={[
                    styles.phaseText,
                    isSelected && styles.phaseTextSelected
                  ]}>
                    {etapa}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedCheck}>
                      <CheckCircle2 size={12} color={Theme.colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Personnel List Section */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Seleccionar Personal</Text>
          <Text style={styles.listCounter}>{selectedPersonnel.length} seleccionados</Text>
        </View>

        <FlatList
          data={filteredPersonnel}
          renderItem={renderPersonnelItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={Theme.colors.surfaceVariant} />
              <Text style={styles.emptyText}>No hay personal registrado.</Text>
            </View>
          }
        />
      </View>

      {/* Floating Action Button / Assignment Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.assignButton}
          onPress={handleAssign}
          disabled={loading}
        >
          <LinearGradient
            colors={[Theme.colors.primary, Theme.colors.primaryContainer]}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.assignButtonText}>Confirmar Asignación</Text>
            {loading ? (
              <ActivityIndicator size="small" color={Theme.colors.onPrimary} />
            ) : (
              <CheckCircle2 size={20} color={Theme.colors.onPrimary} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Theme.colors.background,
  },
  backButton: {
    padding: 4,
    marginBottom: Theme.spacing.md,
    alignSelf: 'flex-start',
  },
  headerLabel: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.primary,
    marginBottom: 4,
  },
  title: {
    ...Theme.typography.display,
    fontSize: 25,
    fontWeight: '800',
    color: Theme.colors.primary,
    lineHeight: 38,
  },
  subtitle: {
    ...Theme.typography.body,
    fontSize: 14,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  staticLoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceContainerLow,
    marginHorizontal: Theme.spacing.lg,
    padding: 16,
    borderRadius: Theme.roundness.xl,
    marginBottom: Theme.spacing.lg,
  },
  loteInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loteIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: Theme.roundness.lg,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staticLoteLabel: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  staticLoteValue: {
    ...Theme.typography.headline,
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  loteHectareasBadge: {
    backgroundColor: Theme.colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  hectareasText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.onSecondaryContainer,
  },
  phaseSelectorContainer: {
    marginBottom: Theme.spacing.xl,
  },
  phaseSelectorTitle: {
    ...Theme.typography.headline,
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: 12,
  },
  phasesScrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    gap: 12,
    paddingBottom: 4,
  },
  phaseCard: {
    width: 100,
    height: 100,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.roundness.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.ambient,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  phaseCardSelected: {
    backgroundColor: Theme.colors.primaryContainer,
    borderColor: Theme.colors.primary,
  },
  phaseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseIconContainerSelected: {
    backgroundColor: Theme.colors.primary,
  },
  phaseText: {
    ...Theme.typography.label,
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  phaseTextSelected: {
    color: Theme.colors.primary,
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  listTitle: {
    ...Theme.typography.headline,
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  listCounter: {
    ...Theme.typography.label,
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.secondary,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: 100,
  },
  personnelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: Theme.roundness.xl,
    marginBottom: 12,
    ...Theme.shadows.ambient,
  },
  personnelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  personnelInfo: {
    flex: 1,
  },
  personnelName: {
    ...Theme.typography.headline,
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  roleText: {
    ...Theme.typography.label,
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.secondary,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 16,
  },
  emptyText: {
    ...Theme.typography.body,
    color: Theme.colors.outline,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Theme.spacing.lg,
    backgroundColor: 'transparent',
  },
  assignButton: {
    borderRadius: Theme.roundness.xl,
    overflow: 'hidden',
    ...Theme.shadows.ambient,
    elevation: 5,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  assignButtonText: {
    ...Theme.typography.headline,
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
});

export default AssignPersonalScreen;
