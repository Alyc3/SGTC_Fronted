import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Image,
  TextInput,
  Switch,
  Platform,
  Modal,
  BackHandler,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Check,
  Flower,
  History,
  Thermometer,
  Droplets,
  CloudRain,
  Save,
  CheckCircle2,
  Info,
  ChevronDown,
  TrendingUp,
  Sun,
  Timer,
  Play,
  Square,
  Edit2,
  FileText,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { lotesService } from '../services/lotes.service';
import { sembradoMetricasService } from '../services/sembrado_metricas.service';
import { CustomAlert } from '../components/GlobalAlert';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const EtapaSembradosScreen = ({ navigation, route }: any) => {
  const lote = route.params?.lote;
  const readOnly = route.params?.readOnly || false;
  const userId = useAuthStore((state) => state.userId);
  const userRoleRaw = useAuthStore((state) => state.role);
  
  const getCleanRole = () => {
    if (!userRoleRaw) return '';
    if (typeof userRoleRaw === 'string') return userRoleRaw;
    if (typeof userRoleRaw === 'object') return (userRoleRaw as any).name || (userRoleRaw as any).role || '';
    return String(userRoleRaw);
  };

  const userRole = getCleanRole().trim().toLowerCase().replace(/_/g, ' ');
  const isTecnicoSembrado = !readOnly && (userRole.includes('tecnico sembrado') || userRole.includes('técnico de sembrado') || userRole === 'tecnico_sembrado');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaveLoading] = useState(false);
  const [currentSubFase, setCurrentSubFase] = useState<string>('Floracion'); // Default from prototype
  const [stagesData, setStagesData] = useState<any[]>([]);
  // metricsForm stores the current UI state (editable)
  const [metricsForm, setMetricsForm] = useState<Record<string, any>>({});
  // dbMetrics stores the EXACT state fetched from the DB (used for locking)
  const [dbMetrics, setDbMetrics] = useState<Record<string, any>>({});
  const [editModes, setEditModes] = useState<Record<string, boolean>>({});
  const [hasSembradoPersonnel, setHasSembradoPersonnel] = useState<boolean>(false);
  
  // Modal for selects
  const [pickerModal, setPickerModal] = useState<{ visible: boolean; field: string; options: string[]; title: string }>({
    visible: false,
    field: '',
    options: [],
    title: '',
  });

  const hasUnsavedChanges = (phaseId: string) => {
    const current = metricsForm[phaseId] || {};
    const saved = dbMetrics[phaseId] || {};
    
    const fieldsToCompare: string[] = [];
    switch (phaseId) {
      case 'Germinacion': fieldsToCompare.push('tasa_germinacion', 'dias_emergencia', 'presencia_hongos'); break;
      case 'Vivero': fieldsToCompare.push('pares_hojas_verdaderas', 'altura_plantula', 'vigor_radicular'); break;
      case 'Crecimiento': fieldsToCompare.push('indice_crecimiento', 'grosor_tallo', 'formacion_bandolas', 'incidencia_foliar'); break;
      case 'Floracion': fieldsToCompare.push('intensidad_floracion', 'uniformidad_floracion', 'estres_hidrico'); break;
      case 'Maduracion': fieldsToCompare.push('porcentaje_cuajado', 'homogeneidad_maduracion', 'incidencia_broca', 'grados_brix'); break;
    }

    return fieldsToCompare.some(field => {
      const curVal = current[field] === undefined || current[field] === null ? '' : String(current[field]);
      const savVal = saved[field] === undefined || saved[field] === null ? '' : String(saved[field]);
      return curVal !== savVal;
    });
  };

  const checkIncidenceAlerts = (phaseId: string, metrics: any) => {
    if (phaseId === 'Germinacion' && metrics.presencia_hongos && metrics.presencia_hongos !== 'Ninguna') {
      CustomAlert.show('ALERTA', 'Presencia de Hongos', `Se ha detectado una presencia ${metrics.presencia_hongos.toLowerCase()} de hongos. Se recomienda aplicar tratamiento fungicida preventivo.`);
    }
    if (phaseId === 'Crecimiento' && metrics.incidencia_foliar && parseFloat(metrics.incidencia_foliar) > 10.0) {
      CustomAlert.show('ALERTA', 'Alta Incidencia Foliar', 'La incidencia foliar supera el 10%. Revise el estado nutricional y sanitario de las hojas.');
    }
    if (phaseId === 'Maduracion' && metrics.incidencia_broca && parseFloat(metrics.incidencia_broca) > 5.0) {
      CustomAlert.show('ALERTA', 'Incidencia de Broca Crítica', 'La incidencia de Broca es superior al 5.0%. Se requiere la creación de una incidencia técnica obligatoria.');
    }
  };

  // Control de gestos y botón físico de atrás
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('ViewLote', { lote });
        return true; 
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
        if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
          e.preventDefault();
          navigation.navigate('ViewLote', { lote });
        }
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [navigation, lote])
  );

  const subFases = [
    { id: 'Germinacion', label: 'Germinación', icon: <Check size={20} color="white" /> },
    { id: 'Vivero', label: 'Vivero', icon: <Check size={20} color="white" /> },
    { id: 'Crecimiento', label: 'Crecimiento', icon: <Check size={20} color="white" /> },
    { id: 'Floracion', label: 'Floración', icon: <Sun size={20} color={Theme.colors.terroirBrown} /> },
    { id: 'Maduracion', label: 'Maduración', icon: <Timer size={20} color={Theme.colors.terroirGray} /> },
  ];

  const fetchData = useCallback(async () => {
    if (!lote?.id) return;
    try {
      setLoading(true);
      const [data, personnel] = await Promise.all([
        lotesService.getStages(lote.id),
        lotesService.getAssignedPersonnel(lote.id)
      ]);
      
      const sembradoStage = data.find(s => s.etapa === 'Sembrado');
      const isPersonnelAssigned = personnel.some(p => p.etapa === 'Sembrado');
      // Store this flag to block starting the phase
      setHasSembradoPersonnel(isPersonnelAssigned);

      let subfase = 'Germinacion';
      if (sembradoStage?.subFaseSiembra) {
        subfase = sembradoStage.subFaseSiembra;
        setCurrentSubFase(subfase);
      }

      // Fetch metrics for all sub-phases to pre-fill the timeline
      const allMetrics: Record<string, any> = {};
      const allDbMetrics: Record<string, any> = {};
      for (const phase of subFases) {
        const metrics = await sembradoMetricasService.getMetricas(lote.id, phase.id);
        if (metrics) {
          allMetrics[phase.id] = metrics;
          allDbMetrics[phase.id] = metrics; // Snapshot of what is actually saved
        }
      }
      setMetricsForm(allMetrics);
      setDbMetrics(allDbMetrics);
      setStagesData(data);
    } catch (error) {
      console.error('Error fetching stage data:', error);
    } finally {
      setLoading(false);
    }
  }, [lote?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateField = (phaseId: string, field: string, value: string) => {
    // Permitir vacío para borrar campos
    setMetricsForm((prev) => ({
      ...prev,
      [phaseId]: {
        ...(prev[phaseId] || {}),
        [field]: value === 'Seleccionar...' ? '' : value,
      },
    }));
  };

  const handleConfirmStart = (phaseId: string, phaseLabel: string) => {
    // Validar asignación de personal antes de iniciar cualquier fase de sembrado
    if (!hasSembradoPersonnel) {
      CustomAlert.show(
        'ALERTA', 
        'Personal No Asignado', 
        'No se puede iniciar el proceso de sembrado. Solicite a un Capataz que asigne el personal técnico y operativo a la etapa de Sembrado en este lote.'
      );
      return;
    }

    // Validar que la fase anterior esté finalizada
    const phaseIndex = subFases.findIndex(f => f.id === phaseId);
    if (phaseIndex > 0) {
      const prevPhaseId = subFases[phaseIndex - 1].id;
      const prevMetrics = metricsForm[prevPhaseId];
      if (!prevMetrics?.fecha_fin) {
        CustomAlert.show(
          'ALERTA', 
          'Acción Requerida', 
          `Debe finalizar la etapa de ${subFases[phaseIndex - 1].label.toLowerCase()} antes de iniciar la siguiente.`
        );
        return;
      }
    }

    CustomAlert.show(
      'ALERTA',
      'Iniciar Fase',
      `¿Estás seguro de iniciar la etapa de ${phaseLabel.toLowerCase()}?`,
      async () => {
        const now = new Date().toISOString();
        // Update local state first for instant UI feedback
        setMetricsForm((prev) => ({
          ...prev,
          [phaseId]: { ...(prev[phaseId] || {}), fecha_inicio: now }
        }));
        // Auto-save to DB and keep edit mode open
        await handleSavePhase(phaseId, now, null, true);
      },
      'ACEPTAR',
      () => {},
      'CANCELAR'
    );
  };

  const handleConfirmEnd = (phaseId: string, phaseLabel: string) => {
    if (hasUnsavedChanges(phaseId)) {
      CustomAlert.show('ALERTA', 'Cambios Pendientes', 'Debe guardar los cambios realizados antes de finalizar la sub-fase.');
      return;
    }

    const phaseMetrics = metricsForm[phaseId] || {};
    
    // Validar que todos los campos estén llenos antes de finalizar
    const errorMsg = validateForm(phaseId, phaseMetrics);
    if (errorMsg) {
      CustomAlert.show('ALERTA', 'Datos Incompletos', `Para finalizar esta fase debe completar todos los registros técnicos: \n\n${errorMsg}`);
      return;
    }

    CustomAlert.show(
      'ALERTA',
      'Finalizar Fase',
      `¿Estás seguro de finalizar la etapa de ${phaseLabel.toLowerCase()}?`,
      async () => {
        const now = new Date().toISOString();
        // Update local state first
        setMetricsForm((prev) => ({
          ...prev,
          [phaseId]: { ...(prev[phaseId] || {}), fecha_fin: now }
        }));
        // Auto-save to DB and lock
        await handleSavePhase(phaseId, null, now, false);
      },
      'ACEPTAR',
      () => {},
      'CANCELAR'
    );
  };

  const validateForm = (phaseId: string, data: any) => {
    switch (phaseId) {
      case 'Germinacion':
        if (data.tasa_germinacion === undefined || data.tasa_germinacion === '' || parseFloat(data.tasa_germinacion) < 0 || parseFloat(data.tasa_germinacion) > 100) 
           return 'La tasa de germinación debe estar entre 0.0 y 100.0%';
        if (!data.dias_emergencia || parseInt(data.dias_emergencia) < 1 || parseInt(data.dias_emergencia) > 120)
           return 'Los días de emergencia deben estar entre 1 y 120';
        if (!data.presencia_hongos || data.presencia_hongos === 'Seleccionar...')
           return 'Debe registrar la presencia de hongos';
        break;
      case 'Vivero':
        if (data.pares_hojas_verdaderas === undefined || data.pares_hojas_verdaderas === '' || parseInt(data.pares_hojas_verdaderas) < 0 || parseInt(data.pares_hojas_verdaderas) > 15)
           return 'Los pares de hojas verdaderas deben estar entre 0 y 15';
        if (!data.altura_plantula || parseFloat(data.altura_plantula) < 0.1)
           return 'La altura de la plántula debe ser al menos 0.1 cm';
        if (!data.vigor_radicular || data.vigor_radicular === 'Seleccionar...')
           return 'El vigor radicular es obligatorio';
        break;
      case 'Crecimiento':
        if (!data.indice_crecimiento || parseFloat(data.indice_crecimiento) < 0.1 || parseFloat(data.indice_crecimiento) > 4.0)
           return 'El índice de crecimiento debe estar entre 0.1 y 4.0 m';
        if (!data.grosor_tallo || parseFloat(data.grosor_tallo) < 0.1)
           return 'El grosor del tallo debe ser al menos 0.1 mm';
        if (data.formacion_bandolas === undefined || data.formacion_bandolas === '' || parseInt(data.formacion_bandolas) < 0)
           return 'La formación de bandolas no puede ser negativa';
        if (data.incidencia_foliar === undefined || data.incidencia_foliar === '' || parseFloat(data.incidencia_foliar) < 0 || parseFloat(data.incidencia_foliar) > 100)
           return 'La incidencia foliar debe estar entre 0.0 y 100.0%';
        break;
      case 'Floracion':
        if (!data.intensidad_floracion || data.intensidad_floracion === 'Seleccionar...')
           return 'La intensidad de floración es obligatoria';
        if (!data.uniformidad_floracion || data.uniformidad_floracion === 'Seleccionar...')
           return 'La uniformidad es obligatoria';
        if (!data.estres_hidrico || data.estres_hidrico === 'Seleccionar...')
           return 'El estrés hídrico post-floración es obligatorio';
        break;
      case 'Maduracion':
        if (data.porcentaje_cuajado === undefined || data.porcentaje_cuajado === '' || parseFloat(data.porcentaje_cuajado) < 0 || parseFloat(data.porcentaje_cuajado) > 100)
           return 'El porcentaje de cuajado debe estar entre 0.0 y 100.0%';
        if (!data.homogeneidad_maduracion || data.homogeneidad_maduracion === 'Seleccionar...')
           return 'La homogeneidad de maduración es obligatoria';
        if (data.incidencia_broca === undefined || data.incidencia_broca === '' || parseFloat(data.incidencia_broca) < 0 || parseFloat(data.incidencia_broca) > 100)
           return 'La incidencia de broca debe estar entre 0.0 y 100.0%';
        if (data.grados_brix === undefined || data.grados_brix === '' || parseFloat(data.grados_brix) < 1.0)
           return 'Los grados Brix prematuros son obligatorios';
        break;
    }
    return null;
  };

  const handleSavePhase = async (phaseId: string, customStart?: string | null, customEnd?: string | null, keepEditMode: boolean = false) => {
    if (readOnly) return;
    const phaseMetrics = { ...(metricsForm[phaseId] || {}) };
    
    // VALIDACIÓN ESTRICTA: Solo requerimos todos los datos llenos si estamos FINALIZANDO la fase.
    if (customEnd) {
      const errorMsg = validateForm(phaseId, phaseMetrics);
      if (errorMsg) {
        CustomAlert.show('ALERTA', 'Datos Incompletos', errorMsg);
        return;
      }
    }

    // Regla de Negocio: Broca > 5.0% (Validamos siempre que se intente guardar o finalizar)
    if (phaseId === 'Maduracion' && phaseMetrics.incidencia_broca && parseFloat(phaseMetrics.incidencia_broca) > 5.0) {
      CustomAlert.show(
        'ALERTA', 
        'Alerta de Plaga', 
        'La incidencia de Broca es superior al 5.0%. Se requiere la creación de una incidencia técnica obligatoria.'
      );
    }

    try {
      setSaveLoading(true);
      
      // 1. Manejo de transición de fases
      if (customEnd) {
        const currentIndex = subFases.findIndex(f => f.id === phaseId);
        if (currentIndex < subFases.length - 1) {
          // Avanzar a la siguiente sub-fase en la BD
          const nextPhaseId = subFases[currentIndex + 1].id;
          await lotesService.gestionarEtapaSembrado(lote.id, nextPhaseId as any, 'En_Proceso');
        } else {
          // Si es la última sub-fase, completar toda la etapa de Sembrado
          await lotesService.updateStageStatus(lote.id, 'Sembrado', 'Completada');
        }
      } else if (phaseId === currentSubFase) {
        // Si solo se está guardando o iniciando la fase actual
        await lotesService.gestionarEtapaSembrado(lote.id, phaseId as any, 'En_Proceso');
      }

      // 2. Especial logic: If Germinacion starts, lot status -> En_Produccion
      if (phaseId === 'Germinacion' && customStart) {
        await lotesService.updateEstadoLote(lote.id, 'En_Produccion');
      }
      
      // 3. Prepare data for DB
      if (customStart) phaseMetrics.fecha_inicio = customStart;
      if (customEnd) phaseMetrics.fecha_fin = customEnd;

      // 4. Save quality metrics for this specific phase
      const savedMetrics = await sembradoMetricasService.saveMetricas({
        ...phaseMetrics, 
        lote_id: lote.id,
        subfase: phaseId,
        tecnico_id: userId || 'UNKNOWN_TECH',
      });

      // Update local state with the returned DB metrics
      if (savedMetrics) {
        setMetricsForm((prev) => ({
          ...prev,
          [phaseId]: savedMetrics
        }));
        setDbMetrics((prev) => ({
          ...prev,
          [phaseId]: savedMetrics
        }));
      }

      if (!customStart && !customEnd) {
        CustomAlert.show('SUCCESS', 'Avance Guardado', `Los datos de la fase de ${phaseId} han sido actualizados.`);
        checkIncidenceAlerts(phaseId, phaseMetrics);
      } else if (customEnd) {
        checkIncidenceAlerts(phaseId, phaseMetrics);
      }
      
      await fetchData(); 
      setEditModes(prev => ({ ...prev, [phaseId]: keepEditMode }));
      
    } catch (error) {
      console.error('Error saving metrics:', error);
      CustomAlert.show('ERROR', 'Error', 'No se pudieron guardar los cambios.');
    } finally {
      setSaveLoading(false);
    }
  };

  const getPhaseStatus = (phaseId: string) => {
    // Si la etapa completa está finalizada, todas las subfases son 'completed'
    const sembradoStage = stagesData.find(s => s.etapa === 'Sembrado');
    if (sembradoStage?.estado === 'Completada') return 'completed';

    const currentIndex = subFases.findIndex(f => f.id === currentSubFase);
    const phaseIndex = subFases.findIndex(f => f.id === phaseId);
    
    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'active';
    return 'pending';
  };

  const openPicker = (phaseId: string, field: string, options: string[], title: string) => {
    setPickerModal({ visible: true, field: `${phaseId}.${field}`, options, title });
  };

  const selectOption = (option: string) => {
    const [phaseId, field] = pickerModal.field.split('.');
    handleUpdateField(phaseId, field, option);
    setPickerModal({ ...pickerModal, visible: false, field: '', options: [], title: '' });
  };

  const handleGenerateReport = () => {
    CustomAlert.show('SUCCESS', 'Informe Generado', 'Se ha compilado el historial técnico de sembrado en un documento digital (PDF).');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.terroirBrown} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.terroirBeige} />
      
      {/* Custom NavBar to match prototype background */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.navigate('ViewLote', { lote })} style={styles.backButton}>
          <ArrowLeft size={24} color={Theme.colors.terroirBrown} />
        </TouchableOpacity>
        <CheckCircle2 size={24} color={Theme.colors.terroirBrown} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            <Text style={styles.labelCaps}>LOTE ID: {lote?.codigo || 'ET-892'}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.labelCaps}>VARIEDAD: {lote?.variedadCafe || 'GEISHA'}</Text>
          </View>
          <Text style={styles.displayTitle}>Control de Sembrado</Text>
          <Text style={styles.subtitle}>
            Monitoreo preciso del ciclo de vida del cultivo. Gestione las transiciones de etapa y verifique los estándares de calidad en cada fase.
          </Text>
        </View>

        {/* Timeline Section */}
        <View style={styles.timelineCard}>
           <View style={styles.timelineHeader}>
             <TrendingUp size={16} color={Theme.colors.terroirBrown} />
             <Text style={styles.timelineHeaderText}>GESTIÓN DEL CICLO DE VIDA</Text>
           </View>

           {subFases.map((phase, index) => {
             const status = getPhaseStatus(phase.id);
             const isLast = index === subFases.length - 1;
             const phaseMetrics = metricsForm[phase.id] || {};
             // isPhaseGloballyLocked indicates the phase has been fully completed AND we are not explicitly editing it.
             // If a phase only has a start date, it is 'active' and thus NOT fully locked, 
             // allowing users to see the save button and do incremental saves.
             const hasDbRecord = !!phaseMetrics.id;
             const isCompletedInDB = !!(dbMetrics[phase.id]?.fecha_fin);
             const isEditing = !!editModes[phase.id];
             
             // A phase is only globally locked if it's completed and we're not editing.
             // Field-level locking (for partial saves) is handled inside `renderPhaseMetrics`.
             const isPhaseGloballyLocked = isCompletedInDB && !isEditing;
             const isReadOnly = !isTecnicoSembrado || status === 'pending' || isPhaseGloballyLocked;

             // Bloqueo de botones de fase futura
             const prevPhaseFinished = index === 0 || (metricsForm[subFases[index - 1].id]?.fecha_fin);
             const canInteractWithPhase = isTecnicoSembrado && status !== 'pending' && prevPhaseFinished;

             return (
               <View key={phase.id} style={styles.phaseRow}>
                 {/* Visual indicator (line and circle) */}
                 <View style={styles.indicatorContainer}>
                   <View style={[
                     styles.circle, 
                     status === 'completed' && styles.circleCompleted,
                     status === 'active' && styles.circleActive,
                     status === 'pending' && styles.circlePending,
                     !prevPhaseFinished && { opacity: 0.5 }
                   ]}>
                     {status === 'completed' ? <Check size={20} color="white" strokeWidth={3} /> : phase.icon}
                   </View>
                   {!isLast && <View style={styles.line} />}
                 </View>

                 {/* Phase Content */}
                 <View style={[styles.phaseContent, !canInteractWithPhase && status !== 'completed' && { opacity: 0.6 }]}>
                   <View style={styles.phaseHeaderRow}>
                     <View>
                        <Text style={[
                          styles.phaseTitle,
                          status === 'completed' && { color: Theme.colors.terroirGreen },
                          status === 'active' && { color: Theme.colors.terroirBrown },
                          status === 'pending' && { color: Theme.colors.terroirGray }
                        ]}>
                          {phase.label}
                        </Text>
                        
                        {status === 'active' && (
                          <Text style={styles.activeTag}>EN PROCESO</Text>
                        )}
                     </View>

                     {/* Edit Button */}
                     {isTecnicoSembrado && hasDbRecord && !editModes[phase.id] && status !== 'pending' && (
                       <TouchableOpacity 
                         style={styles.editPhaseBtn}
                         onPress={() => setEditModes(prev => ({ ...prev, [phase.id]: true }))}
                       >
                         <Edit2 size={14} color={Theme.colors.terroirBrown} />
                         <Text style={styles.editPhaseText}>EDITAR</Text>
                       </TouchableOpacity>
                     )}
                   </View>

                   {/* Metrics Card */}
                   <View style={[
                     styles.metricsCard,
                     status === 'completed' && styles.cardBeige,
                     status === 'active' && styles.cardGreenLight,
                     status === 'pending' && styles.cardWhiteDashed
                   ]}>
                     {/* Dates with Buttons */}
                     <View style={styles.datesGrid}>
                       <View style={styles.dateInputGroup}>
                         <Text style={styles.dateLabel}>INICIO</Text>
                         {phaseMetrics.fecha_inicio ? (
                           <View style={styles.dateDisplay}>
                             <Text style={styles.dateText}>{phaseMetrics.fecha_inicio.split('T')[0]}</Text>
                           </View>
                         ) : (
                           isTecnicoSembrado && (
                             <TouchableOpacity 
                               style={[styles.dateButton, !canInteractWithPhase && styles.btnDisabled]} 
                               onPress={() => handleConfirmStart(phase.id, phase.label)}
                               disabled={!canInteractWithPhase}
                             >
                               <Play size={12} color={Theme.colors.terroirBrown} fill={Theme.colors.terroirBrown} />
                               <Text style={styles.dateButtonText}>INICIAR</Text>
                             </TouchableOpacity>
                           )
                         )}
                       </View>

                       <View style={styles.dateInputGroup}>
                         <Text style={styles.dateLabel}>{status === 'active' ? 'FINAL (EST.)' : 'FINAL'}</Text>
                         {phaseMetrics.fecha_fin ? (
                           <View style={styles.dateDisplay}>
                             <Text style={styles.dateText}>{phaseMetrics.fecha_fin.split('T')[0]}</Text>
                           </View>
                         ) : (
                           isTecnicoSembrado && (
                             <TouchableOpacity 
                               style={[styles.dateButton, (!phaseMetrics.fecha_inicio || !canInteractWithPhase) && styles.btnDisabled]} 
                               onPress={() => handleConfirmEnd(phase.id, phase.label)}
                               disabled={!phaseMetrics.fecha_inicio || !canInteractWithPhase}
                             >
                               <Square size={12} color={Theme.colors.terroirBrown} fill={Theme.colors.terroirBrown} />
                               <Text style={styles.dateButtonText}>FINALIZAR</Text>
                             </TouchableOpacity>
                           )
                         )}
                       </View>
                     </View>

                     {/* Phase Specific Metrics */}
                     {renderPhaseMetrics(phase.id, phaseMetrics, status, isPhaseGloballyLocked, editModes[phase.id])}

                     {/* Action Button - Only show if not locked or explicitly editing */}
                     {isTecnicoSembrado && canInteractWithPhase && phaseMetrics.fecha_inicio && (!isPhaseGloballyLocked || editModes[phase.id]) && (
                       <TouchableOpacity 
                         style={[
                           styles.actionButton,
                           status === 'completed' && styles.btnCompleted,
                           status === 'active' && styles.btnActive,
                         ]}
                         onPress={() => handleSavePhase(phase.id)}
                         disabled={saving}
                       >
                         {saving ? (
                           <ActivityIndicator size="small" color="white" />
                         ) : (
                           <Text style={styles.actionButtonText}>
                             {status === 'completed' ? 'GUARDAR ACTUALIZACIÓN' : 'GUARDAR AVANCE'}
                           </Text>
                         )}
                       </TouchableOpacity>
                     )}
                   </View>
                 </View>
               </View>
             );
           })}
        </View>

        <View style={styles.reportSection}>
           <TouchableOpacity style={styles.reportButton} onPress={handleGenerateReport}>
             <FileText size={20} color="white" />
             <Text style={styles.reportButtonText}>GENERAR INFORME TÉCNICO</Text>
           </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Picker Modal */}
      <Modal
        visible={pickerModal.visible}
        transparent={true}
        animationType="fade"
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setPickerModal({ ...pickerModal, visible: false })}
        >
          <View style={styles.modalContent}>
            {pickerModal.options.map((opt) => (
              <TouchableOpacity 
                key={opt} 
                style={styles.optionItem}
                onPress={() => selectOption(opt)}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );

  function renderPhaseMetrics(phaseId: string, metrics: any, status: string, isPhaseGloballyLocked: boolean, isEditing: boolean) {
    const isFieldReadOnly = (fieldName: string) => {
      // 1. Si la fase ni siquiera ha empezado, no se puede editar nada
      if (readOnly || status === 'pending') return true;

      // 2. Bloqueo si no se ha iniciado la fase (botón INICIAR no presionado)
      if (status === 'active' && !metrics.fecha_inicio && !isEditing) return true;
      
      // 3. Si estamos explícitamente en modo edición (botón EDITAR presionado), todo es editable
      if (isEditing) return false;
      
      // 4. Bloqueo a nivel de campo BASADO EN LA BD:
      const dbSavedPhase = dbMetrics[phaseId] || {};
      const savedValue = dbSavedPhase[fieldName];
      
      if (savedValue !== undefined && savedValue !== null && savedValue !== '') {
        return true; 
      }

      return false;
    };

    switch (phaseId) {
      case 'Germinacion':
        return (
          <View style={styles.metricsList}>
            <MetricRow label="Tasa germinación (%)" value={metrics.tasa_germinacion} onChange={(v: string) => handleUpdateField(phaseId, 'tasa_germinacion', v)} isReadOnly={isFieldReadOnly('tasa_germinacion')} />
            <MetricRow label="Emergencia (días)" value={metrics.dias_emergencia} onChange={(v: string) => handleUpdateField(phaseId, 'dias_emergencia', v)} isReadOnly={isFieldReadOnly('dias_emergencia')} />
            <MetricSelect 
              label="Hongos" 
              value={metrics.presencia_hongos || 'Seleccionar...'} 
              onPress={() => openPicker(phaseId, 'presencia_hongos', ['Ninguna', 'Baja', 'Moderada'], 'PRESENCIA DE HONGOS')}
              isReadOnly={isFieldReadOnly('presencia_hongos')}
            />
          </View>
        );
      case 'Vivero':
        return (
          <View style={styles.metricsList}>
            <MetricRow label="Hojas verdaderas" value={metrics.pares_hojas_verdaderas} onChange={(v: string) => handleUpdateField(phaseId, 'pares_hojas_verdaderas', v)} isReadOnly={isFieldReadOnly('pares_hojas_verdaderas')} />
            <MetricRow label="Altura (cm)" value={metrics.altura_plantula} onChange={(v: string) => handleUpdateField(phaseId, 'altura_plantula', v)} isReadOnly={isFieldReadOnly('altura_plantula')} />
            <MetricSelect 
              label="Vigor radicular" 
              value={metrics.vigor_radicular || 'Seleccionar...'} 
              onPress={() => openPicker(phaseId, 'vigor_radicular', ['Óptimo', 'Bueno', 'Regular'], 'VIGOR RADICULAR')}
              isReadOnly={isFieldReadOnly('vigor_radicular')}
              highlight={true}
            />
          </View>
        );
      case 'Crecimiento':
        return (
          <View style={styles.metricsList}>
            <MetricRow label="Índice Altura (m)" value={metrics.indice_crecimiento} onChange={(v: string) => handleUpdateField(phaseId, 'indice_crecimiento', v)} isReadOnly={isFieldReadOnly('indice_crecimiento')} />
            <MetricRow label="Grosor tallo (mm)" value={metrics.grosor_tallo} onChange={(v: string) => handleUpdateField(phaseId, 'grosor_tallo', v)} isReadOnly={isFieldReadOnly('grosor_tallo')} />
            <MetricRow label="Bandolas" value={metrics.formacion_bandolas} onChange={(v: string) => handleUpdateField(phaseId, 'formacion_bandolas', v)} isReadOnly={isFieldReadOnly('formacion_bandolas')} />
            <MetricRow label="Incidencia foliar (%)" value={metrics.incidencia_foliar} onChange={(v: string) => handleUpdateField(phaseId, 'incidencia_foliar', v)} isReadOnly={isFieldReadOnly('incidencia_foliar')} color="#EA580C" />
          </View>
        );
      case 'Floracion':
        return (
          <View style={styles.metricsList}>
            <MetricSelect 
              label="Intensidad de Floración" 
              value={metrics.intensidad_floracion || 'Seleccionar...'} 
              onPress={() => openPicker(phaseId, 'intensidad_floracion', ['Abundante', 'Media', 'Escasa'], 'INTENSIDAD DE FLORACIÓN')}
              isReadOnly={isFieldReadOnly('intensidad_floracion')}
            />
            <MetricSelect 
              label="Uniformidad" 
              value={metrics.uniformidad_floracion || 'Seleccionar...'} 
              onPress={() => openPicker(phaseId, 'uniformidad_floracion', ['Homogénea', 'Irregular'], 'UNIFORMIDAD')}
              isReadOnly={isFieldReadOnly('uniformidad_floracion')}
            />
            <MetricSelect 
              label="Estrés Hídrico Post-Floración" 
              value={metrics.estres_hidrico || 'Seleccionar...'} 
              onPress={() => openPicker(phaseId, 'estres_hidrico', ['Seco (Ideal)', 'Lluvia ligera', 'Tormenta (Pérdida)'], 'ESTRÉS HÍDRICO')}
              isReadOnly={isFieldReadOnly('estres_hidrico')}
              highlight={true}
            />
          </View>
        );
      case 'Maduracion':
        return (
          <View style={styles.metricsList}>
            <MetricRow label="Porcentaje de Cuajado (%)" value={metrics.porcentaje_cuajado} onChange={(v: string) => handleUpdateField(phaseId, 'porcentaje_cuajado', v)} isReadOnly={isFieldReadOnly('porcentaje_cuajado')} />
            <MetricSelect 
              label="Homogeneidad de Maduración" 
              value={metrics.homogeneidad_maduracion || 'Seleccionar...'} 
              onPress={() => openPicker(phaseId, 'homogeneidad_maduracion', ['Uniforme', 'Irregular'], 'HOMOGENEIDAD DE MADURACIÓN')}
              isReadOnly={isFieldReadOnly('homogeneidad_maduracion')}
            />
            <MetricRow label="Incidencia de Broca (%)" value={metrics.incidencia_broca} onChange={(v: string) => handleUpdateField(phaseId, 'incidencia_broca', v)} isReadOnly={isFieldReadOnly('incidencia_broca')} color="#EA580C" />
            <MetricRow label="Grados Brix Prematuros" value={metrics.grados_brix} onChange={(v: string) => handleUpdateField(phaseId, 'grados_brix', v)} isReadOnly={isFieldReadOnly('grados_brix')} />
          </View>
        );
      default:
        return null;
    }
  }
};

const MetricRow = ({ label, value, onChange, isReadOnly, color }: any) => (
  <View style={styles.metricInputGroup}>
    <Text style={styles.standardLabel}>{label.toUpperCase()}</Text>
    <View style={[styles.standardInputWrapper, isReadOnly && styles.inputDisabled]}>
      <TextInput
        style={[
          styles.standardInput, 
          color && { color, fontWeight: '700' },
          isReadOnly && { color: '#9CA3AF' }
        ]}
        keyboardType="numeric"
        value={value?.toString() || ''}
        onChangeText={onChange}
        editable={!isReadOnly}
        placeholder="0.00"
      />
    </View>
  </View>
);

const MetricSelect = ({ label, value, onPress, isReadOnly, highlight }: any) => (
  <View style={styles.metricInputGroup}>
    <Text style={styles.standardLabel}>{label.toUpperCase()}</Text>
    <TouchableOpacity 
      onPress={onPress} 
      disabled={isReadOnly} 
      style={[styles.selectWrapper, isReadOnly && styles.inputDisabled]}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.selectText, 
        value === 'Seleccionar...' && { color: '#9CA3AF' },
        highlight && !isReadOnly && value !== 'Seleccionar...' && { color: Theme.colors.terroirGreen, fontWeight: '700' },
        isReadOnly && { color: '#9CA3AF' }
      ]}>
        {value}
      </Text>
      <ChevronDown size={20} color={Theme.colors.onSurfaceVariant} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.terroirBeige,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.terroirBeige,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  labelCaps: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.terroirBrown,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  dot: {
    color: '#D1D5DB',
  },
  displayTitle: {
    fontFamily: 'Manrope',
    fontSize: 30,
    fontWeight: '800',
    color: Theme.colors.terroirBrown,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: Theme.colors.terroirGray,
    lineHeight: 22,
  },
  timelineCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  timelineHeaderText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.terroirGray,
    letterSpacing: 2,
  },
  phaseRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  indicatorContainer: {
    alignItems: 'center',
    width: 40,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  circleCompleted: {
    backgroundColor: Theme.colors.terroirGreen,
  },
  circleActive: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: Theme.colors.terroirBrown,
  },
  circlePending: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  line: {
    position: 'absolute',
    top: 40,
    bottom: -40,
    left: 19.5,
    width: 1,
    backgroundColor: '#E5E7EB',
    zIndex: 0,
  },
  phaseContent: {
    flex: 1,
  },
  phaseTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '800',
  },
  activeTag: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.terroirGreen,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  phaseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editPhaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(93, 58, 44, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editPhaseText: {
    fontFamily: 'Manrope',
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.terroirBrown,
    letterSpacing: 1,
  },
  metricsCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
  },
  cardBeige: {
    backgroundColor: Theme.colors.terroirBeige,
  },
  cardGreenLight: {
    backgroundColor: Theme.colors.terroirGreenLight,
    borderWidth: 1,
    borderColor: 'rgba(62, 102, 65, 0.1)',
  },
  cardWhiteDashed: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  dateDisplay: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  dateText: {
    fontSize: 10,
    fontFamily: 'Manrope',
    fontWeight: '700',
    color: Theme.colors.terroirText,
  },
  timeText: {
    fontSize: 9,
    fontFamily: 'Manrope',
    color: Theme.colors.terroirGray,
  },
  dateButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Theme.colors.terroirBrown,
    borderRadius: 8,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dateButtonText: {
    fontSize: 9,
    fontFamily: 'Manrope',
    fontWeight: '800',
    color: Theme.colors.terroirBrown,
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.4,
    borderColor: '#E5E7EB',
  },
  datesGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateLabel: {
    fontFamily: 'Manrope',
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.terroirGray,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricsList: {
    gap: 16,
  },
  metricInputGroup: {
    marginBottom: 4,
  },
  standardLabel: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.terroirGray,
    marginBottom: 8,
    marginLeft: 2,
    letterSpacing: 1,
  },
  standardInputWrapper: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  standardInput: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.terroirText,
  },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    height: 52,
    ...Theme.shadows.ambient,
    elevation: 1,
  },
  selectText: {
    ...Theme.typography.body,
    fontSize: 14,
    color: Theme.colors.onSurface,
    fontFamily: 'Manrope',
    fontWeight: '700',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
    elevation: 0,
  },
  actionButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...Theme.shadows.ambient,
  },
  btnCompleted: {
    backgroundColor: Theme.colors.terroirGreen,
    opacity: 0.9,
  },
  btnActive: {
    backgroundColor: Theme.colors.terroirGreen,
    shadowColor: Theme.colors.terroirGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPending: {
    borderWidth: 1,
    borderColor: Theme.colors.terroirBrown,
  },
  actionButtonText: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
    ...Theme.shadows.ambient,
  },
  modalTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.terroirBrown,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: Theme.colors.terroirText,
    fontWeight: '600',
  },
  reportSection: {
    marginTop: 20,
    paddingHorizontal: 4,
  },
  reportButton: {
    backgroundColor: Theme.colors.terroirBrown,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 20,
    ...Theme.shadows.ambient,
  },
  reportButtonText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
});

export default EtapaSembradosScreen;
