import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
  Animated,
  ActivityIndicator,
  BackHandler,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Layout,
  Sprout,
  Calendar,
  Layers,
  Activity,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Map,
  Users,
  UserPlus,
  Eye,
  Droplets,
  Thermometer,
  Sun,
  Wind,
  History,
  Info,
  FlaskConical,
  Mountain,
  Ruler,
  Rocket,
  Edit2,
  X,
  Camera,
  ClipboardCheck,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { Theme } from '../theme';
import { lotesService } from '../services/lotes.service';
import { rolesService } from '../services/roles.service';
import { cosechaService } from '../services/cosecha.service';
import { syncWorker } from '../services/sync.worker';
import { CustomAlert } from '../components/GlobalAlert';
import { EtapaProcesoValues } from '../db/schema/enums';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
const DateTimePicker = require('@react-native-community/datetimepicker');

const { width } = Dimensions.get('window');
const GRAIN_TYPES = ['Verde', 'Rojo', 'Variado'];

const SubFaseTimeline = ({ subFaseActual, isProduccion, stageStatus }: { subFaseActual: string, isProduccion: boolean, stageStatus: string }) => {
  const subFases = ['Germinacion', 'Vivero', 'Crecimiento', 'Floracion', 'Maduracion'];
  const currentIndex = subFases.indexOf(subFaseActual);
  const isCompleted = stageStatus === 'Completada';

  if (!isProduccion && currentIndex <= 0 && !isCompleted) return null;

  return (
    <View style={styles.miniTimeline}>
      <View style={styles.dotsRow}>
        {subFases.map((f, i) => {
          const isPast = isCompleted || i < currentIndex;
          const isCurrent = !isCompleted && i === currentIndex;
          return (
            <React.Fragment key={f}>
              <View style={[
                styles.timelineDot,
                isPast && styles.dotCompleted,
                isCurrent && styles.dotActive,
              ]} />
              {i < subFases.length - 1 && (
                <View style={[
                  styles.timelineConnector,
                  (i < currentIndex || isCompleted) && styles.connectorCompleted
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <Text style={styles.subFaseText}>{isCompleted ? 'COMPLETADA' : subFaseActual.toUpperCase()}</Text>
    </View>
  );
};

const ViewLoteScreen = ({ navigation, route }: any) => {
  const lote = route.params?.lote;
  const { role, userId } = useAuthStore();

  // Control de gestos y botón físico de atrás
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Lotes');
        return true; // Bloquea la acción por defecto
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
        // Capturamos cualquier intento de volver (gesto, botón o dispatch)
        if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
          e.preventDefault();
          navigation.navigate('Lotes');
        }
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [navigation])
  );
  
  // Normalización ultra-robusta del rol
  const getCleanRole = () => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    if (typeof role === 'object') return (role as any).name || (role as any).role || '';
    return String(role);
  };

  const userRole = getCleanRole().trim().toLowerCase().replace(/_/g, ' ');
  const isAdminOrManager = userRole === 'admin' || userRole === 'gerente general';
  const canAssignCapataz =  (typeof isAdminOrManager !== "undefined" && isAdminOrManager);

  // Mapeo de roles técnicos a sus etapas correspondientes
  const getAssignedStageForTechnician = (role: string): string | null => {
    const r = role.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
    if (r.includes('tecnico_sembrado')) return 'Sembrado';
    if (r.includes('tecnico_agronomo')) return 'Cosechado';
    if (r.includes('tecnico_de_despulpado')) return 'Despulpado';
    if (r.includes('encargado_de_secado')) return 'Secado';
    if (r.includes('tostador')) return 'Tostado';
    return null;
  };

  const assignedStage = (typeof getAssignedStageForTechnician === "function" ? getAssignedStageForTechnician(userRole) : null);
  const isStrictTechnician = ! (typeof isAdminOrManager !== "undefined" && isAdminOrManager) && assignedStage !== null;

  const [assignedPersonnel, setAssignedPersonnel] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [harvestModalVisible, setHarvestModalVisible] = useState(false);
  const [harvestBrix, setHarvestBrix] = useState('');
  const [harvestEvidenceUri, setHarvestEvidenceUri] = useState('');
  const [harvestObservations, setHarvestObservations] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [harvestDuration, setHarvestDuration] = useState('');
  const [workerHarvestData, setWorkerHarvestData] = useState<Record<string, { cantidad: string; tipoGrano: string }>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date()); 

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const fetchData = useCallback(async () => {
    if (!lote?.id) return;
    try {
      setLoading(true);
      const [personnelData, rolesData, stagesData] = await Promise.all([
        lotesService.getAssignedPersonnel(lote.id),
        rolesService.getAll().catch(() => []),
        lotesService.getStages(lote.id)
      ]);

      const rolesArray = Array.isArray(rolesData) ? rolesData : (rolesData.roles || rolesData.data || []);
      const newRolesMap: Record<string, string> = {};
      rolesArray.forEach((r: any) => {
        newRolesMap[r.id] = (r.name || r.nombre || r.role_name || '').trim().toLowerCase();
      });
      setRolesMap(newRolesMap);
      setAssignedPersonnel(personnelData);
      setStages(stagesData);
    } catch (error) {
      console.error('Error fetching lote details:', error);
    } finally {
      setLoading(false);
    }
  }, [lote?.id]);

  // Función para obtener una lista única de trabajadores por ID (Accesible en toda la pantalla)
  const getUniquePersonnel = useCallback((list: any[]) => {
    const seen = new Set();
    return list.filter(p => {
      const id = p.trabajador?.id || p.trabajador_id || p.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleStartStage = async (etapa: string) => {
    try {
      await lotesService.updateStageStatus(lote.id, etapa as any, 'En_Proceso');
      syncWorker.syncPendingData();
      fetchData();
      CustomAlert.show('SUCCESS', 'Etapa Iniciada', `Se ha marcado la etapa ${etapa} como En Proceso.`);
    } catch (error) {
      console.error('Error starting stage:', error);
      CustomAlert.show('ERROR', 'Error', 'No se pudo iniciar la etapa.');
    }
  };

  const harvestPersonnel = assignedPersonnel.filter(p => p.etapa === 'Cosechado');

  const openHarvestModal = () => {
    const initialData: Record<string, { cantidad: string; tipoGrano: string }> = {};
    harvestPersonnel.forEach((p, index) => {
      const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
      initialData[key] = workerHarvestData[key] || { cantidad: '', tipoGrano: 'Rojo' };
    });
    setWorkerHarvestData(initialData);
    setHarvestModalVisible(true);
  };

  const updateWorkerHarvestData = (id: string, field: 'cantidad' | 'tipoGrano', value: string) => {
    setWorkerHarvestData(prev => ({
      ...prev,
      [id]: {
        cantidad: prev[id]?.cantidad || '',
        tipoGrano: prev[id]?.tipoGrano || 'Rojo',
        [field]: value,
      },
    }));
  };

  const handleConfirmHarvest = async () => {  // ← async
  if (!harvestBrix.trim() || Number.isNaN(Number(harvestBrix))) {
    CustomAlert.show('ALERTA', 'Dato Requerido', 'Ingresa un valor numérico para Grados Brix.');
    return;
  }

  const hasInvalidWorkerAmount = harvestPersonnel.some((p, index) => {
    const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
    const amount = workerHarvestData[key]?.cantidad;
    return !amount || Number.isNaN(Number(amount)) || Number(amount) <= 0;
  });

  if (harvestPersonnel.length > 0 && hasInvalidWorkerAmount) {
    CustomAlert.show('ALERTA', 'Cantidad Requerida', 'Ingresa la cantidad recolectada para cada trabajador.');
    return;
  
  }

  if (!harvestDate.trim()) {
  CustomAlert.show('ALERTA', 'Fecha Requerida', 'Selecciona la fecha de la cosecha.');
  return;
}

// Validar imagen de evidencia
if (!harvestEvidenceUri.trim()) {
  CustomAlert.show('ALERTA', 'Evidencia Requerida', 'Debes seleccionar una imagen de evidencia de la cosecha.');
  return;
}

// Validar que haya al menos un trabajador asignado
if (harvestPersonnel.length === 0) {
  CustomAlert.show('ALERTA', 'Sin Personal', 'No hay trabajadores asignados a la etapa de cosecha.');
  return;
}

// Validar grados Brix en rango razonable
const brixValue = parseFloat(harvestBrix);
if (brixValue < 1 || brixValue > 30) {
  CustomAlert.show('ALERTA', 'Grados Brix Inválidos', 'Los grados Brix deben estar entre 1 y 30.');
  return;
}

  const getTarifaByGrano = (tipoGrano: string): number => {
  switch (tipoGrano) {
    case 'Rojo':    return 0.30;
    case 'Verde':   return 0.20;
    case 'Variado': return 0.25;
    default:        return 0.25;
  }
};

const getCalidadByCosecha = (brix: number, tipoGrano: string): 'alta' | 'media' | 'baja' => {
  if (brix >= 18 && tipoGrano === 'Rojo') return 'alta';
  if (brix >= 14 && brix <= 17) return 'media';
  if (brix < 14 || tipoGrano === 'Verde') return 'baja';
  // Variado con brix >= 18 → media (mezcla)
  return 'media';
};

// Calidad general de la cosecha = la más frecuente entre los trabajadores
const getCalidadGeneral = (
  workers: { brix: number; tipoGrano: string }[]
): 'alta' | 'media' | 'baja' => {
  const counts = { alta: 0, media: 0, baja: 0 };
  workers.forEach(w => { counts[getCalidadByCosecha(w.brix, w.tipoGrano)]++; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as 'alta' | 'media' | 'baja';
};

const brix = parseFloat(harvestBrix);

const workersResumen = harvestPersonnel.map((p, index) => {
  const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
  const data = workerHarvestData[key];
  const tipoGrano = data?.tipoGrano || 'Rojo';
  const cantidad = parseFloat(data?.cantidad || '0');
  const tarifa = getTarifaByGrano(tipoGrano);
  const calidad = getCalidadByCosecha(brix, tipoGrano);

  return { key, tipoGrano, cantidad, tarifa, calidad };
});

const pesoTotal = workersResumen.reduce((sum, w) => sum + w.cantidad, 0);
const calidadGeneral = getCalidadGeneral(
  workersResumen.map(w => ({ brix, tipoGrano: w.tipoGrano }))
);

// Tarifa general = promedio ponderado por peso
const tarifaGeneral = pesoTotal > 0
  ? workersResumen.reduce((sum, w) => sum + w.tarifa * w.cantidad, 0) / pesoTotal
  : 0.25;
  
    const cosechaData = {
    id: `cosecha_${Date.now()}`,
    lote_id: lote.id,
    responsable_id: assignedPersonnel.find(p => {
      const rName = (rolesMap[p.trabajador?.role_id] || '').toLowerCase();
      return rName === 'capataz' || p.etapa === 'Administración';
    })?.trabajador_id ?? '',
    grados_brix: brix,
    peso_kilos: pesoTotal,
    calidad_cosecha: calidadGeneral,         
    tarifa_por_kilo: parseFloat(tarifaGeneral.toFixed(2)), 
    imagen_evidencia_uri: harvestEvidenceUri,
    observaciones: harvestObservations,
    fecha_inicio: new Date().toISOString(),
    fecha_final: harvestDate,
    duracion_horas: harvestDuration ? parseFloat(harvestDuration) : undefined,
  };

  try {
    setLoading(true);
    setHarvestModalVisible(false);

    await cosechaService.create(cosechaData);  // ← await dentro del try

    CustomAlert.show('SUCCESS', 'Éxito', 'Cosecha registrada correctamente.', () => {
      navigation.navigate('Lotes');
    });
  } catch (error) {
    CustomAlert.show('ERROR', 'Error', 'Fallo al guardar la cosecha.');
  } finally {
    setLoading(false);
  }
};

  const handlePickHarvestEvidence = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setHarvestEvidenceUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting harvest evidence:', error);
      CustomAlert.show('ERROR', 'Error', 'No se pudo seleccionar la imagen de evidencia.');
    }
  };

  const renderSensor = (icon: any, label: string, value: string, color: string) => (
    <View style={styles.sensorCard}>
      <View style={[styles.sensorIconContainer, { backgroundColor: color + '15' }]}>
        {React.cloneElement(icon, { color: color, size: 18 })}
      </View>
      <View>
        <Text style={styles.sensorLabel}>{label}</Text>
        <Text style={styles.sensorValue}>{value}</Text>
      </View>
    </View>
  );

  const renderHarvestModal = () => (
    <Modal
      visible={harvestModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setHarvestModalVisible(false)}
    >
      <View style={styles.harvestModalOverlay}>
        <View style={styles.harvestModalCard}>
          <View style={styles.harvestModalHeader}>
            <View>
              <Text style={styles.harvestEyebrow}>CIERRE DE FASE</Text>
              <Text style={styles.harvestModalTitle}>Cosechado Selectivo</Text>
            </View>
            <TouchableOpacity style={styles.harvestCloseButton} onPress={() => setHarvestModalVisible(false)}>
              <X size={20} color={Theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.harvestModalBody}>
            <View style={styles.harvestFieldRow}>
              <View style={styles.harvestFieldHalf}>
                <Text style={styles.harvestLabel}>Grados Brix *</Text>
                <TextInput
                  style={styles.harvestInput}
                  value={harvestBrix}
                  onChangeText={(text) => {
                    if (text.length <= 10) setHarvestBrix(text);
                  }}
                  keyboardType="numeric"
                  placeholder="18.5"
                  maxLength={10}
                  placeholderTextColor={Theme.colors.outline}
                />
              </View>
              <View style={styles.harvestFieldHalf}>
                <Text style={styles.harvestLabel}>Fecha *</Text>
                <TouchableOpacity
                  style={[styles.harvestInput, { 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: Theme.colors.onSurface, fontSize: 14, fontWeight: '600' }}>
                    {harvestDate}
                  </Text>
                  <Calendar size={18} color={Theme.colors.primary} />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="calendar"
                    maximumDate={new Date()}
                    onChange={(event: any, date: Date | undefined) => {
                      setShowDatePicker(false);
                      if (event.type === 'set' && date) {
                        setSelectedDate(date);
                        setHarvestDate(date.toISOString().slice(0, 10));
                      }
                    }}
                  />
                )}
              </View>
            </View>

            <View style={styles.harvestSectionHeader}>
              <Users size={16} color={Theme.colors.primary} />
              <Text style={styles.harvestSectionTitle}>Trabajadores asignados *</Text>
            </View>

            {harvestPersonnel.length === 0 ? (
              <View style={styles.harvestEmptyWorkers}>
                <Text style={styles.harvestEmptyTitle}>Sin personal en Cosechado</Text> 
              </View>
            ) : (
              harvestPersonnel.map((p, index) => {
                const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
                const workerName = `${p.trabajador?.first_name || 'Trabajador'} ${p.trabajador?.last_name || ''}`.trim();
                const workerData = workerHarvestData[key] || { cantidad: '', tipoGrano: 'Rojo' };

                return (
                  <View key={key} style={styles.harvestWorkerCard}>
                    <View style={styles.harvestWorkerHeader}>
                      <View style={styles.harvestWorkerAvatar}>
                        <User size={18} color={Theme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.harvestWorkerName}>{workerName}</Text>
                        <Text style={styles.harvestWorkerRole}>Recolector técnico</Text>
                      </View>
                    </View>

                    <Text style={styles.harvestLabel}>Cantidad recolectada (kg) *</Text>
                    <TextInput
                      style={styles.harvestInput}
                      value={workerData.cantidad}
                      onChangeText={(value) => {
                        if (value.length <= 10) updateWorkerHarvestData(key, 'cantidad', value);
                      }}
                      keyboardType="numeric"
                      placeholder="0.00"
                      maxLength={10}
                      placeholderTextColor={Theme.colors.outline}
                    />

                    <Text style={[styles.harvestLabel, { marginTop: 12 }]}>Tipo de grano *</Text>
                    <View style={styles.grainOptions}>
                      {GRAIN_TYPES.map(type => {
                        const selected = workerData.tipoGrano === type;
                        return (
                          <TouchableOpacity
                            key={type}
                            style={[styles.grainOption, selected && styles.grainOptionActive]}
                            onPress={() => updateWorkerHarvestData(key, 'tipoGrano', type)}
                          >
                            <Text style={[styles.grainOptionText, selected && styles.grainOptionTextActive]}>{type}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}

            <View style={styles.harvestSectionHeader}>
              <Camera size={16} color={Theme.colors.primary} />
              <Text style={styles.harvestSectionTitle}>Evidencia</Text>
            </View>

            <View style={styles.evidenceBox}>
              <Camera size={26} color={Theme.colors.outline} />
              <Text style={styles.evidenceTitle}>Imagen de cosecha selectiva</Text>

              <TouchableOpacity style={styles.evidencePickerButton} onPress={handlePickHarvestEvidence}>
                <Camera size={15} color={Theme.colors.white} />
                <Text style={styles.evidencePickerText}>
                  {harvestEvidenceUri ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </Text>
              </TouchableOpacity>

              {/* URI — solo lectura, se llena automáticamente */}
              <View style={[
                styles.harvestInput, 
                styles.evidenceInput, 
                { 
                  justifyContent: 'center',
                  backgroundColor: harvestEvidenceUri 
                    ? Theme.colors.secondaryContainer  // verde suave cuando hay imagen
                    : Theme.colors.surfaceContainerHigh, // gris cuando está vacío
                }
              ]}>
                <Text 
                  numberOfLines={1} 
                  style={{ 
                    color: harvestEvidenceUri ? Theme.colors.secondary : Theme.colors.outline,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {harvestEvidenceUri || 'Sin imagen seleccionada'}
                </Text>
              </View>
            </View>

            <View style={styles.harvestField}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.harvestLabel}>Observaciones</Text>
                <Text style={{ 
                  fontSize: 10, 
                  fontWeight: '700',
                  color: harvestObservations.trim().split(/\s+/).filter(Boolean).length >= 100 
                    ? Theme.colors.error 
                    : Theme.colors.outline 
                }}>
                  {harvestObservations.trim() === '' ? 0 : harvestObservations.trim().split(/\s+/).filter(Boolean).length}/100 palabras
                </Text>
              </View>
              <TextInput
                style={[styles.harvestInput, styles.harvestTextarea]}
                value={harvestObservations}
                onChangeText={(text) => {
                  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
                  if (wordCount <= 100) setHarvestObservations(text);
                }}
                multiline
                textAlignVertical="top"
                placeholder="Notas técnicas de madurez, selección o incidencias..."
                placeholderTextColor={Theme.colors.outline}
              />
            </View>
          </ScrollView>

          <View style={styles.harvestModalActions}>
            <TouchableOpacity style={styles.harvestCancelButton} onPress={() => setHarvestModalVisible(false)}>
              <Text style={styles.harvestCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.harvestConfirmButton} onPress={handleConfirmHarvest}>
              <ClipboardCheck size={16} color={Theme.colors.white} />
              <Text style={styles.harvestConfirmText}>Registrar cierre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderStageCard = (title: string, index: number) => {
    if (title === 'Administración') return null;

    const stageInfo = stages.find(s => s.etapa === title);
    const status = stageInfo?.estado || 'Pendiente';
    
    // Lógica de habilitación: Sembrado siempre, las demás si la anterior está Completada
    let isEnabled = title === 'Sembrado';
    if (!isEnabled && index > 0) {
      const prevStage = stages.find(s => s.etapa === EtapaProcesoValues[index - 1]);
      isEnabled = prevStage?.estado === 'Completada';
    }

    const isActive = status === 'En_Proceso';
    const isCompleted = status === 'Completada';

    // Usuarios asignados a esta etapa específica, separados por rol y eliminando duplicados visuales
    const stagePersonnelRaw = assignedPersonnel.filter(p => p.etapa === title);
    const stagePersonnel = getUniquePersonnel(stagePersonnelRaw);

    const technicalStaff = stagePersonnel.filter(p => {

      const rName = (rolesMap[p.trabajador?.role_id] || '').toLowerCase();
      return rName.includes('tecnico') || rName.includes('técnico');
    });
    const operationalStaff = stagePersonnel.filter(p => {
      const rName = (rolesMap[p.trabajador?.role_id] || '').toLowerCase();
      return !rName.includes('tecnico') && !rName.includes('técnico');
    });

    const isAssignedTechnical = technicalStaff.some(t => t.trabajador?.id === userId);
    const canStart = isAssignedTechnical && isEnabled && status === 'Pendiente';

    return (
      <TouchableOpacity 
        key={title} 
        activeOpacity={title === 'Sembrado' ? 0.9 : 1}
        onPress={() => {
          if (title === 'Sembrado') {
            navigation.navigate('EtapaSembrados', { lote });
          }
        }}
        style={[
          styles.stageCard, 
          isActive && styles.stageCardActive,
          !isEnabled && { opacity: 0.5 }
        ]}
      >
        <View style={styles.stageHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.stageTitleRow}>
              <Text style={[styles.stageTitle, isActive && { color: Theme.colors.primary }]}>{title}</Text>
              {isCompleted && <CheckCircle2 size={16} color={Theme.colors.secondary} />}
              {isActive && <Activity size={16} color={Theme.colors.primary} />}
            </View>
            {stageInfo?.fecha_inicio && (
              <Text style={styles.stageDate}>
                {isCompleted ? `Fin: ${new Date(stageInfo.fecha_final).toLocaleDateString()}` : `Inicio: ${new Date(stageInfo.fecha_inicio).toLocaleDateString()}`}
              </Text>
            )}
          </View>
          
          {title === 'Sembrado' && (
            <SubFaseTimeline 
              subFaseActual={stageInfo?.subFaseSiembra || 'Germinacion'} 
              isProduccion={lote?.estado_lote === 'En_Produccion'} 
              stageStatus={status}
            />
          )}
        </View>

        <Text style={styles.stageDescription}>
          {isCompleted ? 'Etapa finalizada exitosamente.' : isActive ? 'Etapa en ejecución actual.' : 'Esperando inicio de fase.'}
        </Text>

        {/* Separación de Personal: Técnico vs Equipo */}
        <View style={styles.personnelGroups}>
          {technicalStaff.length > 0 && (
            <View style={styles.personnelGroupItem}>
              <ShieldCheck size={14} color={Theme.colors.secondary} />
              <Text style={styles.technicalStaffText}>
                RESPONSABLE: {technicalStaff.map(p => `${p.trabajador?.first_name} ${p.trabajador?.last_name}`).join(', ')}
              </Text>
            </View>
          )}
          {operationalStaff.length > 0 && (
            <View style={styles.personnelGroupItem}>
              <Users size={14} color={Theme.colors.outline} />
              <Text style={styles.operationalStaffText}>
                EQUIPO: {operationalStaff.map(p => `${p.trabajador?.first_name}`).join(', ')}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.stageFooter}>
          {canStart && (
            <TouchableOpacity 
              style={styles.startStageButton}
              onPress={() => handleStartStage(title)}
            >
              <Rocket size={14} color={Theme.colors.white} />
              <Text style={styles.startStageText}>Iniciar {title}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.stageActionsRow}>
            {title === 'Cosechado' && isActive && (
              <TouchableOpacity 
                style={styles.finishHarvestButton}
                onPress={openHarvestModal}
              >
                <ClipboardCheck size={14} color={Theme.colors.white} />
                <Text style={styles.startStageText}>Terminar</Text>
              </TouchableOpacity>
            )}

            {status === 'Pendiente' && stagePersonnel.length > 0 && !isStrictTechnician && (
              <TouchableOpacity 
                style={[styles.editPersonnelButton, !isEnabled && { opacity: 0.5 }]}
                onPress={() => isEnabled && navigation.navigate('AssignPersonal', { lote, etapa: title, isEditMode: true })}
                disabled={!isEnabled}
              >
                <Edit2 size={14} color={Theme.colors.primary} />
              </TouchableOpacity>
            )}

            {!isStrictTechnician && (
              <TouchableOpacity 
                style={[styles.addPersonnelMiniButton, !isEnabled && { backgroundColor: Theme.colors.surfaceVariant }]}
                onPress={() => isEnabled && navigation.navigate('AssignPersonal', { lote, etapa: title })}
                disabled={!isEnabled}
              >
                <UserPlus size={14} color={isEnabled ? Theme.colors.onSecondaryContainer : Theme.colors.outline} />
                <Text style={[styles.addPersonnelMiniText, !isEnabled && { color: Theme.colors.outline }]}>Personal</Text>
              </TouchableOpacity>
            )}

            {title === 'Sembrado' && (status === 'En_Proceso' || status === 'Completada') && (
              <TouchableOpacity 
                style={styles.monitorStageButton}
                onPress={() => navigation.navigate('EtapaSembrados', { lote })}
              >
                <Eye size={14} color={Theme.colors.white} />
                <Text style={styles.monitorStageText}>Monitorear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickyContent}>
          <Text style={styles.stickyCode}>{lote?.codigo || 'LOTE-C01'}</Text>
          <View style={styles.stickyStatus}>
            <View style={[
              styles.statusDot, 
              lote?.estado_lote === 'En_Produccion' ? { backgroundColor: Theme.colors.secondary } : 
              lote?.estado_lote === 'Completada' ? { backgroundColor: Theme.colors.primary } :
              { backgroundColor: Theme.colors.tertiary }
            ]} />
            <Text style={styles.stickyStatusText}>
              {(lote?.estado_lote || 'RESERVADO').replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <View style={styles.topSection}>
          <TouchableOpacity 
            style={styles.circleBackButton}
            onPress={() => navigation.navigate('Lotes')}
          >
            <ArrowLeft size={24} color={Theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.displayTitle}>Información de Lote</Text>
          <View style={styles.accentLine} />
        </View>

        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={['rgba(109, 209, 196, 0)', 'rgba(31, 27, 20, 0.4)', 'rgba(31, 27, 20, 0.95)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroBadgeRow}>
              <View style={[
                styles.heroStatusBadge, 
                lote?.estado_lote === 'En_Produccion' ? styles.bgSuccess : 
                lote?.estado_lote === 'Completada' ? { backgroundColor: Theme.colors.primary } :
                styles.bgTertiary
              ]}>
                <Text style={styles.heroStatusText}>
                  {(lote?.estado_lote || 'RESERVADO').replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <View style={styles.heroGlassBadge}>
                <Calendar size={12} color={Theme.colors.white} />
                <Text style={styles.heroDateText}>Ciclo: May-Ago 2026</Text>
              </View>
            </View>
            <Text style={styles.heroCodeText}>{lote?.codigo || 'LT-COFFEE-092'}</Text>
            <View style={styles.heroMetaRow}>
              <Map size={16} color={Theme.colors.white} />
              <Text style={styles.heroLocationText}>{lote?.parcela?.nombre || 'Ubicación Desconocida'}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.sectionPadding}>
          <Text style={styles.sectionLabel}>TELEMETRÍA TÉCNICA</Text>
          <View style={styles.sensorsGrid}>
            <View style={styles.sensorRow}>
              {renderSensor(<Ruler />, 'Extensión', `${lote?.hectareas_lote || '0'} Ha`, Theme.colors.primary)}
              {renderSensor(
                <Mountain />, 
                'Terreno', 
                lote?.parcela?.tipo_terreno === 'Irregular' 
                  ? `Irr. (${lote?.zona_seleccionada || 'S/Z'})` 
                  : (lote?.parcela?.tipo_terreno || 'Regular'), 
                Theme.colors.secondary
              )}
            </View>
            <View style={styles.sensorRow}>
              {renderSensor(<FlaskConical />, 'PH Suelo', '6.5 pH', Theme.colors.tertiary)}
              {renderSensor(<Sprout />, 'Semilla', lote?.semilla?.variedad?.valor || lote?.variedadCafe || 'S/S', Theme.colors.secondary)}
            </View>
          </View>

          {canAssignCapataz && (
            <TouchableOpacity 
              style={styles.assignTechnicalButton}
              onPress={() => navigation.navigate('AssignCapataz', { lote })}
            >
              <LinearGradient
                colors={[Theme.colors.secondary, '#22502d']}
                style={styles.assignTechnicalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <ShieldCheck size={18} color={Theme.colors.white} />
                <Text style={styles.assignTechnicalText}>Asignar Capataz</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionPadding}>
          <Text style={styles.sectionLabel}>RESPONSABLE TÉCNICO</Text>
          <View style={styles.foremanList}>
            {getUniquePersonnel(assignedPersonnel
              .filter(p => {
                const rName = (rolesMap[p.trabajador?.role_id] || '').toLowerCase();
                return rName === 'capataz' || p.etapa === 'Administración';
              }))
              .map((p, idx) => (
                <View key={p.id || idx} style={styles.foremanCard}>
                  <View style={styles.foremanAvatar}>
                    <User size={28} color={Theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foremanName}>{`${p.trabajador?.first_name} ${p.trabajador?.last_name}`}</Text>
                    <Text style={styles.foremanRole}>Capataz Responsable</Text>
                  </View>
                  <View style={styles.verifiedIcon}>
                    <ShieldCheck size={18} color={Theme.colors.secondary} />
                  </View>
                </View>
              ))
            }
            {assignedPersonnel.filter(p => (rolesMap[p.trabajador?.role_id] || '').toLowerCase() === 'capataz' || p.etapa === 'Administración').length === 0 && (
              <View style={styles.foremanCard}>
                <View style={styles.foremanAvatar}>
                  <User size={28} color={Theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foremanName}>Sin Asignar</Text>
                  <Text style={styles.foremanRole}>Pendiente de vinculación</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionPadding}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>CONTROL DE ETAPAS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={styles.progressPct}>{isStrictTechnician ? 'VISTA TÉCNICA' : 'GESTIÓN SECUENCIAL'}</Text>
              <TouchableOpacity style={styles.simulateHarvestButton} onPress={openHarvestModal}>
                <ClipboardCheck size={13} color={Theme.colors.secondary} />
                <Text style={styles.simulateHarvestText}>Simular cosecha</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.stagesList}>
            {EtapaProcesoValues
              .filter(etapa => {
                if (etapa === 'Administración') return false;
                if (isStrictTechnician) return etapa === assignedStage;
                return true;
              })
              .map((etapa, index) => renderStageCard(etapa, index))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBranding}>STGC DIGITAL ARCHIVE SERIES</Text>
          <Text style={styles.footerLegal}>VERIFICACIÓN CIENTÍFICA DE ORIGEN • 2026</Text>
        </View>
      </Animated.ScrollView>
      {renderHarvestModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(255, 248, 243, 0.95)',
    zIndex: 1000,
    justifyContent: 'flex-end',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.surfaceContainerHigh,
  },
  stickyContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  stickyCode: {
    ...Theme.typography.label,
    fontSize: 14,
    letterSpacing: 2,
    color: Theme.colors.primary,
    fontWeight: '800',
  },
  stickyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stickyStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.onSurfaceVariant,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 10,
  },
  circleBackButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    ...Theme.shadows.ambient,
  },
  displayTitle: {
    ...Theme.typography.display,
    fontSize: 25,
    color: Theme.colors.primary,
    marginTop: 1,
  },
  accentLine: {
    width: 80,
    height: 5,
    backgroundColor: Theme.colors.primary,
    marginTop: 15,
    borderRadius: 4,
  },
  heroWrapper: {
    marginHorizontal: 24,
    height: 150,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: Theme.colors.primary,
    ...Theme.shadows.ambient,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 32,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  heroStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  bgSuccess: { backgroundColor: Theme.colors.secondary },
  bgTertiary: { backgroundColor: Theme.colors.tertiary },
  heroStatusText: {
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.white,
  },
  heroGlassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  heroDateText: {
    fontSize: 10,
    color: Theme.colors.white,
    fontWeight: '600',
  },
  heroCodeText: {
    ...Theme.typography.display,
    fontSize: 22,
    color: Theme.colors.white,
    lineHeight: 42,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  heroLocationText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  sectionPadding: {
    paddingHorizontal: 24,
    marginTop: 40,
  },
  sectionLabel: {
    ...Theme.typography.labelSm,
    letterSpacing: 2,
    color: Theme.colors.outline,
    fontWeight: '700',
    marginBottom: 20,
  },
  sensorsGrid: {
    gap: 12,
  },
  sensorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sensorCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 20,
    borderRadius: 24,
    gap: 12,
    ...Theme.shadows.ambient,
  },
  sensorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sensorLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.outline,
    textTransform: 'uppercase',
  },
  sensorValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.onSurface,
  },
  assignTechnicalButton: {
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    ...Theme.shadows.ambient,
  },
  assignTechnicalGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  assignTechnicalText: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.white,
  },
  foremanList: {
    gap: 12,
  },
  foremanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 20,
    borderRadius: 28,
    gap: 16,
    ...Theme.shadows.ambient,
  },
  foremanAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stagePersonnelList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: Theme.colors.surfaceContainerHighest,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  stagePersonnelText: {
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  personnelGroups: {
    marginTop: 12,
    gap: 8,
  },
  personnelGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.surfaceContainerHighest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  technicalStaffText: {
    fontSize: 11,
    color: Theme.colors.secondary,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  operationalStaffText: {
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  stageActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editPersonnelButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.primary + '20',
  },
  monitorStageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  monitorStageText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.white,
  },
  foremanName: {
    ...Theme.typography.headline,
    fontSize: 18,
    color: Theme.colors.onSurface,
  },
  foremanRole: {
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  verifiedIcon: {
    backgroundColor: Theme.colors.secondaryContainer,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '900',
    color: Theme.colors.secondary,
    letterSpacing: 1,
  },
  stagesList: {
    gap: 12,
  },
  stageCard: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 24,
    borderRadius: 28,
  },
  stageCardActive: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderLeftWidth: 6,
    borderLeftColor: Theme.colors.primary,
    ...Theme.shadows.ambient,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageTitle: {
    ...Theme.typography.headline,
    fontSize: 18,
    color: Theme.colors.outline,
  },
  stageDate: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.outline,
  },
  stageDescription: {
    fontSize: 13,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  stageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  startStageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  finishHarvestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  startStageText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.white,
  },
  addPersonnelMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addPersonnelMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.onSecondaryContainer,
  },
  simulateHarvestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  simulateHarvestText: {
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.secondary,
    letterSpacing: 0.3,
  },
  harvestModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 27, 20, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  harvestModalCard: {
    maxHeight: '88%',
    backgroundColor: Theme.colors.background,
    borderRadius: 28,
    overflow: 'hidden',
    ...Theme.shadows.ambient,
  },
  harvestModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.surfaceContainerHigh,
  },
  harvestEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    color: Theme.colors.secondary,
  },
  harvestModalTitle: {
    ...Theme.typography.headline,
    fontSize: 21,
    color: Theme.colors.primary,
    marginTop: 4,
  },
  harvestCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  harvestModalBody: {
    padding: 22,
    gap: 16,
  },
  harvestField: {
    gap: 8,
  },
  harvestFieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  harvestFieldHalf: {
    flex: 1,
    gap: 8,
  },
  harvestLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  harvestInput: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Theme.colors.surfaceContainerHigh,
    paddingHorizontal: 14,
    color: Theme.colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  harvestTextarea: {
    minHeight: 104,
    paddingTop: 14,
    lineHeight: 20,
  },
  harvestSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  harvestSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: Theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  harvestEmptyWorkers: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.surfaceContainerHigh,
  },
  harvestEmptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Theme.colors.onSurface,
  },
  harvestEmptyText: {
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },
  harvestWorkerCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.surfaceContainerHigh,
  },
  harvestWorkerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  harvestWorkerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  harvestWorkerName: {
    fontSize: 15,
    fontWeight: '900',
    color: Theme.colors.onSurface,
  },
  harvestWorkerRole: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  grainOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  grainOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Theme.colors.surfaceContainerHigh,
  },
  grainOptionActive: {
    backgroundColor: Theme.colors.secondaryContainer,
    borderColor: Theme.colors.secondary,
  },
  grainOptionText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.onSurfaceVariant,
  },
  grainOptionTextActive: {
    color: Theme.colors.secondary,
  },
  evidenceBox: {
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.surfaceContainerHigh,
  },
  evidenceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.onSurfaceVariant,
  },
  evidencePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
  },
  evidencePickerText: {
    fontSize: 12,
    fontWeight: '900',
    color: Theme.colors.white,
  },
  evidenceInput: {
    width: '100%',
  },
  harvestModalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.surfaceContainerHigh,
    backgroundColor: Theme.colors.background,
  },
  harvestCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  harvestCancelText: {
    fontSize: 13,
    fontWeight: '900',
    color: Theme.colors.onSurfaceVariant,
  },
  harvestConfirmButton: {
    flex: 1.35,
    height: 48,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  harvestConfirmText: {
    fontSize: 13,
    fontWeight: '900',
    color: Theme.colors.white,
  },
  footer: {
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 12,
  },
  footerBranding: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 5,
    color: Theme.colors.outline,
  },
  footerLegal: {
    fontSize: 8,
    fontWeight: '600',
    color: Theme.colors.outlineVariant,
  },
  mainFab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    ...Theme.shadows.ambient,
    elevation: 10,
    zIndex: 2000,
  },
  fabPause: {},
  fabPlay: {},
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniTimeline: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: Theme.colors.terroirBrown,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: Theme.colors.terroirGreen,
  },
  timelineConnector: {
    width: 8,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  connectorCompleted: {
    backgroundColor: Theme.colors.terroirGreen,
  },
  subFaseText: {
    fontSize: 7,
    fontFamily: 'Manrope',
    fontWeight: '800',
    color: Theme.colors.terroirGray,
    letterSpacing: 0.5,
  }
});

export default ViewLoteScreen;
