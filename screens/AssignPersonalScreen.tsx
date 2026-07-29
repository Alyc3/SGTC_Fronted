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
  ActivityIndicator,
  BackHandler,
  Modal,
  Animated,
  Platform,
  TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  Layers,
  ChevronUp,
  X
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

const { width, height } = Dimensions.get('window');

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
  const isEditMode = route.params?.isEditMode || false;
  const isCapatazAssignment = (a: any) => a.etapa === 'Administración';
  
  const getCleanRole = () => {
    if (!userRoleRaw) return 'COLABORADOR';
    if (typeof userRoleRaw === 'string') return userRoleRaw;
    if (typeof userRoleRaw === 'object') return (userRoleRaw as any).name || (userRoleRaw as any).role || 'COLABORADOR';
    return String(userRoleRaw);
  };

  const currentRole = getCleanRole();
  const normalizedUserRole = currentRole.trim().toLowerCase().replace(/\s+/g, '_');
  const isAuthorized = normalizedUserRole === 'gerente_general' || normalizedUserRole === 'capataz' || normalizedUserRole === 'admin';
  const displayRole = currentRole.trim().toUpperCase().replace(/_/g, ' ');

  const [lotes, setLotes] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [selectedLote, setSelectedLote] = useState<any>(route.params?.lote || null);
  const [selectedEtapa, setSelectedEtapa] = useState<string>(
  route.params?.etapa || EtapaProcesoValues.find(e => e !== 'Administración') || EtapaProcesoValues[0]
);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);
  const [initialSelectedIds, setInitialSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Control de gestos y botón físico de atrás
  useFocusEffect(
    useCallback(() => {
      // Verificar autorización primero
      if (!isAuthorized) {
        CustomAlert.show('ALERTA', 'Acceso Denegado', 'No tienes permisos para asignar personal.', () => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Lotes');
          }
        });
        return;
      }

      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Lotes');
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
            navigation.navigate('Lotes');
          }
        }
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [navigation, isAuthorized])
  );

  const fetchData = useCallback(async () => {
    if (!isAuthorized) return;
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
      
      // Inicialización inmediata de la selección (Crucial para que se vea seleccionado al cargar)
      if (route.params?.isEditMode) {
        const currentStageIds = Array.from(new Set(assignmentsData
          .filter((a: any) => a.etapa === selectedEtapa || isCapatazAssignment(a)) // 👈 incluir capataz
          .map((a: any) => a.trabajador_id || a.trabajador?.id)));

        setSelectedPersonnel(currentStageIds);
        setInitialSelectedIds(currentStageIds);
      }

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
  }, [selectedLote, selectedEtapa, isAuthorized]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sincronizar selección cuando cambia la etapa MANUALMENTE en el carrusel
  useEffect(() => {
  if (existingAssignments.length > 0) {
    if (isEditMode) {
      const currentStageIds = Array.from(new Set(existingAssignments
        .filter((a: any) => a.etapa === selectedEtapa || isCapatazAssignment(a)) // 👈 incluir capataz
        .map((a: any) => a.trabajador_id || a.trabajador?.id)));

      setSelectedPersonnel(currentStageIds);
      setInitialSelectedIds(currentStageIds);
    } else {
      setSelectedPersonnel([]);
    }
  }
}, [selectedEtapa]); // Escuchamos solo el cambio de etapa

  const filteredPersonnel = useMemo(() => {
    if (!searchText.trim()) return personnel;
    const q = searchText.trim().toLowerCase();
    return personnel.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
    );
  }, [personnel, searchText]);

  const alreadyAssignedIds = useMemo(() => {
  return new Set(
    existingAssignments
      .filter(a => a.etapa === selectedEtapa || isCapatazAssignment(a)) // 👈
      .map(a => a.trabajador_id || a.trabajador?.id)
  );
}, [existingAssignments, selectedEtapa]);

  const assignedInOtherStagesIds = useMemo(() => {
  return new Set(
    existingAssignments
      .filter(a => a.etapa !== selectedEtapa && !isCapatazAssignment(a)) // 👈 excluir capataz de "otra etapa"
      .map(a => a.trabajador_id || a.trabajador?.id)
  );
}, [existingAssignments, selectedEtapa]);

  const togglePersonnelSelection = (id: string) => {
    // Si NO estamos en modo edición y ya está asignado, bloqueamos la selección
    if (!isEditMode && (alreadyAssignedIds.has(id) || assignedInOtherStagesIds.has(id))) return;

    const worker = personnel.find(p => p.id === id);
    const roleNameRaw = rolesMap[worker?.role_id] || '';
    
    // Normalización robusta para comparación (quitar acentos, espacios y pasar a minúsculas)
    const normalize = (str: string) => 
      str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');

    const roleName = normalize(roleNameRaw);
    const isTechnicalRole = roleName === 'tecnico_sembrado' || roleName === 'tecnico_agronomo';
    const isAlreadySelected = selectedPersonnel.includes(id);

    // BLOQUEO ESTRICTO: Si el usuario intenta SELECCIONAR un técnico (isAdding)
    if (isTechnicalRole && !isAlreadySelected) {
      // Buscamos si YA hay algún técnico en la lista de seleccionados
      const existingTechnicalId = selectedPersonnel.find(pId => {
        const p = personnel.find(w => w.id === pId);
        const rName = normalize(rolesMap[p?.role_id] || '');
        return rName === 'tecnico_sembrado' || rName === 'tecnico_agronomo';
      });

      if (existingTechnicalId) {
        CustomAlert.show(
          'ALERTA', 
          'Límite de Técnicos', 
          'Solo se permite un Técnico Responsable por fase. Desmarque al técnico actual si desea asignar a uno diferente.'
        );
        return; // Detenemos la selección inmediatamente
      }
    }

    // Si pasa las validaciones, procedemos con el toggle
    setSelectedPersonnel(prev =>
      isAlreadySelected
        ? prev.filter(pId => pId !== id)
        : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!isAuthorized) {
      CustomAlert.show('ALERTA', 'Acceso Denegado', 'No tienes permisos para realizar esta acción.');
      return;
    }

    // NUEVO: evita guardar con una etapa inválida
    if (!selectedEtapa || selectedEtapa === 'Administración') {
      CustomAlert.show('ALERTA', 'Etapa inválida', 'Debe seleccionar una etapa de trabajo válida antes de asignar.');
      return;
    }

    if (!selectedLote || (selectedPersonnel.length === 0 && !isEditMode)) {
      CustomAlert.show('ALERTA', 'Incompleto', 'Por favor seleccione un lote y al menos un trabajador.');
      return;
    }

    try {
      setLoading(true);

      const normalize = (str: string) =>
        str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');

      const isCapatazWorker = (workerId: string) => {
        const worker = personnel.find(p => p.id === workerId);
        const roleName = normalize(rolesMap[worker?.role_id] || '');
        return roleName === 'capataz';
      };

      // El capataz siempre se registra como global (etapa 'Administración'),
      // sin importar qué etapa esté seleccionada en el carrusel.
      const getEtapaParaAsignar = (workerId: string) =>
        isCapatazWorker(workerId) ? 'Administración' : selectedEtapa;

      const idsToAssign = isEditMode
        ? selectedPersonnel.filter(id => !initialSelectedIds.includes(id))
        : selectedPersonnel;

      for (const workerId of idsToAssign) {
        // Si es capataz, no aplican las validaciones de "asignado en otra etapa":
        // su asignación es intencionalmente global.
        if (isCapatazWorker(workerId)) continue;

        if (assignedInOtherStagesIds.has(workerId)) {
          const worker = personnel.find(p => p.id === workerId);
          const workerName = worker ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() : 'El trabajador';
          CustomAlert.show(
            'ALERTA',
            'Asignación Repetida',
            `${workerName} ya está asignado en otra etapa de este lote. Debe finalizar o liberar esa asignación antes de volver a usarlo.`
          );
          return;
        }

        const alreadyAssigned = await parcelasService.hasAsignacion(selectedLote.id, workerId, getEtapaParaAsignar(workerId) as any);
        if (alreadyAssigned) {
          CustomAlert.show('ALERTA', 'Asignación Duplicada', 'El trabajador ya está asignado a esta etapa y lote.');
          return;
        }
      }

      // 1. Identificar si estamos asignando un técnico en la selección actual
      const tecnicoSeleccionado = selectedPersonnel.find(pId => {
        const p = personnel.find(w => w.id === pId);
        const rName = normalize(rolesMap[p?.role_id] || '');
        return rName === 'tecnico_sembrado' || rName === 'tecnico_agronomo';
      });

      if (isEditMode) {
        // MODO EDICIÓN: Estrategia de Reemplazo Total para Técnicos y Diff para el resto

        // A. Si hay un técnico seleccionado, barremos CUALQUIER técnico previo de la BD
        // para asegurar el reemplazo, sin importar IDs.
        if (tecnicoSeleccionado) {
          const idsTecnicosPosibles = personnel
            .filter(p => {
              const rName = normalize(rolesMap[p.role_id] || '');
              return rName === 'tecnico_sembrado' || rName === 'tecnico_agronomo';
            })
            .map(p => p.id);

          await parcelasService.limpiarAsignacionesEspecificas(selectedLote.id, selectedEtapa, idsTecnicosPosibles);
        }

        // B. Calcular bajas (trabajadores que estaban y ya no están)
        const toRemove = initialSelectedIds.filter(id => !selectedPersonnel.includes(id));
        for (const workerId of toRemove) {
          await parcelasService.desasignarPersonal(selectedLote.id, workerId, selectedEtapa as any);
        }

        // C. Insertar únicamente los nuevos seleccionados para no recrear asignaciones existentes
        for (const workerId of idsToAssign) {
          await parcelasService.asignarPersonal(selectedLote.id, workerId, getEtapaParaAsignar(workerId) as any);
        }

      } else {
        // MODO NORMAL: Barrer técnicos previos si se está agregando uno nuevo
        if (tecnicoSeleccionado) {
          const idsTecnicosPosibles = personnel
            .filter(p => {
              const rName = normalize(rolesMap[p.role_id] || '');
              return rName === 'tecnico_sembrado' || rName === 'tecnico_agronomo';
            })
            .map(p => p.id);

          await parcelasService.limpiarAsignacionesEspecificas(selectedLote.id, selectedEtapa, idsTecnicosPosibles);
        }

        for (const workerId of idsToAssign) {
          await parcelasService.asignarPersonal(selectedLote.id, workerId, getEtapaParaAsignar(workerId) as any);
        }
      }

      // Disparar sincronización silenciosa en segundo plano
      syncWorker.syncPendingData();

      CustomAlert.show('SUCCESS', 'Asignación Actualizada', 'Los cambios en la cuadrilla han sido guardados exitosamente.', () => {
        if (!isEditMode) setSelectedPersonnel([]);
        fetchData();
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Lotes');
        }
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
    const isAssignedInOtherStage = assignedInOtherStagesIds.has(item.id);
    const roleName = rolesMap[item.role_id] || item.role_id || 'TRABAJADOR';

    // En modo edición, el "sombreado" no bloquea si el usuario está en la lista de seleccionados actual
    const shouldShade = !isEditMode && (isAlreadyAssigned || isAssignedInOtherStage);

    return (
      <TouchableOpacity
        style={[
          styles.personnelCard,
          isSelected && { backgroundColor: Theme.colors.primaryFixed },
          shouldShade && { opacity: 0.6, backgroundColor: Theme.colors.surfaceContainerHighest }
        ]}
        onPress={() => !shouldShade && togglePersonnelSelection(item.id)}
        activeOpacity={shouldShade ? 1 : 0.7}
        disabled={shouldShade}
      >
        <View style={styles.personnelAvatar}>
          <User size={20} color={shouldShade ? Theme.colors.outline : Theme.colors.primary} />
        </View>
        <View style={styles.personnelInfo}>
          <Text style={[styles.personnelName, shouldShade && { color: Theme.colors.onSurfaceVariant }]}>{`${item.first_name} ${item.last_name}`}</Text>
          <View style={styles.roleRow}>
            <ShieldCheck size={12} color={shouldShade ? Theme.colors.outline : Theme.colors.secondary} />
            <Text style={[styles.roleText, shouldShade && { color: Theme.colors.onSurfaceVariant }]}>{roleName}</Text>
          </View>
        </View>
        {shouldShade ? (
          <View style={{ alignItems: 'center' }}>
            <ShieldCheck size={24} color={Theme.colors.secondary} />
            <Text style={{ fontSize: 8, color: Theme.colors.secondary, fontWeight: '700' }}>
              {isAssignedInOtherStage ? 'EN OTRA ETAPA' : 'ASIGNADO'}
            </Text>
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
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Lotes');
            }
          }}
        >
          <ArrowLeft size={24} color={Theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>{displayRole}</Text>
        <Text style={styles.title}>Asignación de Personal</Text>
        <Text style={styles.subtitle}>Configure el equipo de trabajo para la etapa actual.</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Personnel Selection Trigger Button */}
        <View style={styles.triggerContainer}>
          <TouchableOpacity 
            style={styles.triggerButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.triggerIconWrapper}>
              <Users size={20} color={Theme.colors.primary} />
            </View>
            <View style={styles.triggerInfo}>
              <Text style={styles.triggerTitle}>Personal Asignado</Text>
              <Text style={styles.triggerSubtitle}>
                {selectedPersonnel.length === 0 
                  ? 'Toca para asignar trabajadores' 
                  : `${selectedPersonnel.length} trabajador(es) seleccionado(s)`}
              </Text>
            </View>
            <ChevronUp size={24} color={Theme.colors.outline} />
          </TouchableOpacity>
        </View>

        {/* Selected Personnel Preview */}
        {selectedPersonnel.length > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewHeader}>Resumen de Cuadrilla</Text>
            {selectedPersonnel.map(id => {
              const worker = personnel.find(p => p.id === id);
              if (!worker) return null;
              const roleName = rolesMap[worker.role_id] || worker.role_id || 'TRABAJADOR';
              return (
                <View key={worker.id} style={styles.previewCard}>
                  <View style={styles.previewAvatar}>
                    <User size={16} color={Theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.previewName}>{`${worker.first_name} ${worker.last_name}`}</Text>
                    <Text style={styles.previewRole}>{roleName}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Sheet Modal for Personnel Selection */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setModalVisible(false); setSearchText(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Seleccionar Personal</Text>
                <Text style={styles.sheetSubtitle}>Para etapa: {selectedEtapa}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={Theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Buscar por nombre..."
                placeholderTextColor={Theme.colors.onSurfaceVariant}
                style={{
                  backgroundColor: Theme.colors.surfaceContainerHighest,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 14,
                  color: Theme.colors.onSurface,
                }}
              />
            </View>

            <FlatList
              data={filteredPersonnel}
              renderItem={renderPersonnelItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.sheetListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Users size={48} color={Theme.colors.surfaceVariant} />
                  <Text style={styles.emptyText}>No hay personal registrado para esta etapa.</Text>
                </View>
              }
            />

            <View style={styles.sheetFooter}>
               <TouchableOpacity 
                style={styles.sheetConfirmButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.sheetConfirmText}>Listo ({selectedPersonnel.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button / Assignment Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.assignButton, !isAuthorized && { opacity: 0.5 }]}
          onPress={handleAssign}
          disabled={loading || !isAuthorized}
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
  scrollContent: {
    paddingBottom: 120,
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
    zIndex: 10,
  },
  assignButton: {
    borderRadius: Theme.roundness.xl,
    overflow: 'hidden',
    ...Theme.shadows.ambient,
    elevation: 10,
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
  // New Styles for Bottom Sheet and Triggers
  triggerContainer: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerHighest,
    padding: 16,
    borderRadius: Theme.roundness.xl,
    borderWidth: 1,
    borderColor: Theme.colors.primary + '20',
  },
  triggerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: Theme.roundness.lg,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  triggerInfo: {
    flex: 1,
  },
  triggerTitle: {
    ...Theme.typography.headline,
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  triggerSubtitle: {
    ...Theme.typography.label,
    fontSize: 12,
    color: Theme.colors.secondary,
  },
  previewContainer: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
  previewHeader: {
    ...Theme.typography.labelSm,
    letterSpacing: 1.5,
    color: Theme.colors.outline,
    marginBottom: 12,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 12,
    borderRadius: Theme.roundness.lg,
    marginBottom: 8,
  },
  previewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewName: {
    ...Theme.typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  previewRole: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    color: Theme.colors.outline,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(31, 27, 20, 0.6)',
  },
  bottomSheet: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.75, // Ocupa el 75% de la pantalla
    ...Theme.shadows.ambient,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Theme.colors.surfaceVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.surfaceContainerHigh,
  },
  sheetTitle: {
    ...Theme.typography.headline,
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  sheetSubtitle: {
    ...Theme.typography.labelSm,
    fontSize: 12,
    color: Theme.colors.secondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 20,
  },
  sheetListContent: {
    padding: 24,
    paddingBottom: 40,
  },
  sheetFooter: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.surfaceContainerHigh,
    backgroundColor: Theme.colors.background,
  },
  sheetConfirmButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: Theme.roundness.xl,
    alignItems: 'center',
  },
  sheetConfirmText: {
    ...Theme.typography.headline,
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
});

export default AssignPersonalScreen;
