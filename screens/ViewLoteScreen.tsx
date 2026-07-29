import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Animated,
  BackHandler,
} from 'react-native';
import {
  ArrowLeft,
  ShieldCheck,
  User,
  Sprout,
  Calendar,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Map,
  Users,
  Eye,
  FlaskConical,
  Mountain,
  Ruler,
  Rocket,
  ClipboardCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../theme';
import { lotesService } from '../services/lotes.service';
import { rolesService } from '../services/roles.service';
import { syncWorker } from '../services/sync.worker';
import { CustomAlert } from '../components/GlobalAlert';
import { EtapaProcesoValues } from '../db/schema/enums';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const SubFaseTimeline = ({ subFaseActual, isProduccion, stageStatus, stages, loteId }: {
  subFaseActual: string,
  isProduccion: boolean,
  stageStatus: string,
  stages: any[],
  loteId: string
}) => {
  const subFases = ['Germinacion', 'Vivero', 'Crecimiento', 'Floracion', 'Maduracion'];
  const [actualSubPhase, setActualSubPhase] = useState(subFaseActual);

  useEffect(() => {
    const sembradoStage = stages.find(s => s.etapa === 'Sembrado');
    let baseFase = sembradoStage?.subFaseSiembra || subFaseActual;

    // 2. Comprobamos la BD directamente si no estamos seguros, o para asegurar la última activa
    import('../services/sembrado_metricas.service').then(({ sembradoMetricasService }) => {
      Promise.all(
        subFases.map(phase => sembradoMetricasService.getMetricas(loteId, phase))
      ).then(results => {
        let furthest = baseFase;
        let furthestIndex = subFases.indexOf(baseFase);

        results.forEach((res, index) => {
          if (res && res.fecha_inicio) {
            if (index > furthestIndex) {
              furthest = subFases[index];
              furthestIndex = index;
            }
          }
        });
        setActualSubPhase(furthest);
      });
    });
  }, [stages, loteId, subFaseActual]);

  const currentIndex = subFases.indexOf(actualSubPhase);
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
      <Text style={styles.subFaseText}>{isCompleted ? 'COMPLETADA' : actualSubPhase.toUpperCase()}</Text>
    </View>
  );
};

const ViewLoteScreen = ({ navigation, route }: any) => {
  const lote = route.params?.lote;
  const { role, userId } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
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
    }, [navigation])
  );

  const getCleanRole = () => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    if (typeof role === 'object') return (role as any).name || (role as any).role || '';
    return String(role);
  };

  const userRole = getCleanRole().trim().toLowerCase().replace(/_/g, ' ');
  const isAdminOrManager = userRole === 'admin' || userRole === 'gerente general';
  const isCapataz = userRole.includes('capataz');
  const isCapatazOrManager = isAdminOrManager || isCapataz;
  const canAssignCapataz = isAdminOrManager;
  const canAssign = isCapatazOrManager;
    

  const getAssignedStageForTechnician = (role: string): string | null => {
    const r = role.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
    if (r.includes('tecnico_sembrado')) return 'Sembrado';
    if (r.includes('tecnico_agronomo')) return 'Cosechado';
    if (r.includes('tecnico_de_despulpado')) return 'Despulpado';
    if (r.includes('encargado_de_secado')) return 'Secado';
    if (r.includes('tostador')) return 'Tostado';
    return null;
  };

  const assignedStage = getAssignedStageForTechnician(userRole);
  const isStrictTechnician = !isAdminOrManager && assignedStage !== null;

    // ─── Estado (solo lo que le pertenece a esta pantalla) ───────────────────
    const [assignedPersonnel, setAssignedPersonnel] = useState<any[]>([]);
    const [expandedWorkers, setExpandedWorkers] = useState<Record<string, boolean>>({});
    const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
    const [stages, setStages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true); // ← único estado de cosecha que queda
    const capatazAsignado = assignedPersonnel.some(p =>
  (rolesMap[p.trabajador?.role_id] || '').toLowerCase() === 'capataz'
);

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
        lotesService.getStages(lote.id),
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
    // Iniciar cualquier etapa (incluida Cosechado) solo cambia el estado a En_Proceso.
    // El formulario de fin de cosecha se llena aparte, con el botón "Terminar",
    // que solo ve el técnico_agrónomo (ver canFillHarvest).
    try {
      await lotesService.updateStageStatus(lote.id, etapa as any, 'En_Proceso');
      syncWorker.syncPendingData();
      fetchData();
      CustomAlert.show('SUCCESS', 'Etapa Iniciada', `Se ha marcado la etapa ${etapa} como En Proceso.`);
    } catch (error) {
      CustomAlert.show('ERROR', 'Error', 'No se pudo iniciar la etapa.');
    }
  }; // Fin de handleStartStage

  const ROLE_ID_CLASIFICADOR = '4777c479-e907-4d81-bf19-9a6c2c963bc0';
  const ROLE_ID_RECOLECTOR = '54982b58-db99-4c80-809f-8e3fde952743';
  const ROLES_COSECHA_IDS = [ROLE_ID_CLASIFICADOR, ROLE_ID_RECOLECTOR];
  const ROLE_ID_TECNICO_COSECHA = 'b289b63e-5169-42fe-8ec3-75dec868f5ce';

  const harvestPersonnel = assignedPersonnel.filter(
    p => p.etapa === 'Cosechado' && ROLES_COSECHA_IDS.includes(p.trabajador?.role_id)
  );


  const openHarvestModal = () => {
    navigation.navigate('EtapaCosecha', { lote, harvestPersonnel, assignedPersonnel });
  };// ← simplificado

  const openPulpingModal = () => {
    const cosechaStage = stages.find(s => s.etapa === 'Cosechado');
    const estadoCosecha = cosechaStage?.estado || 'Pendiente';
    if (estadoCosecha == 'Completada') {
      navigation.navigate('EtapaDespulpado', { lote, assignedPersonnel });
    } else {
      CustomAlert.show(
        'ERROR',
        'Etapa Previa Incompleta',
        'Por favor, complete la etapa de Cosechado antes de iniciar el Despulpado.'
      );
      return;
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

  // Mapeo de colores para estados
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completada':
      case 'Completado':
        return '#3a6843'; // Plantation Green
      case 'En_Proceso':
      case 'En_Produccion':
      case 'En producción':
        return '#E67E22'; // Orange
      case 'Pendiente':
      case 'Reservado':
      case 'Creado':
      default:
        return '#827470'; // Gray
    }
  };

  const renderStageCard = (title: string, index: number) => {
    if (title === 'Administración') return null;

    const stageInfo = stages.find(s => s.etapa === title);
    const status = stageInfo?.estado || 'Pendiente';

    let isEnabled = title === 'Sembrado';
    if (!isEnabled && index > 0) {
      const prevStage = stages.find(s => s.etapa === EtapaProcesoValues[index - 1]);
      isEnabled = prevStage?.estado === 'Completada';
    }

    const isActive = status === 'En_Proceso';
    const isCompleted = status === 'Completada';
    const isPending = status === 'Pendiente';

    const statusColor = getStatusColor(status);

    // El capataz se asigna una sola vez con etapa 'Administración' y aplica a TODAS las etapas del lote
    // Un capataz aplica a TODAS las etapas del lote sin importar en qué etapa quedó
    // registrada su fila (Administración, Sembrado, etc.). Solo el resto del personal
    // se filtra estrictamente por la etapa exacta.
    const stagePersonnelRaw = assignedPersonnel.filter(p => {
      const roleName = (rolesMap[p.trabajador?.role_id] || '').toLowerCase();
      const isCapatazRole = roleName.includes('capataz');
      return p.etapa === title || isCapatazRole;
    });
    const stagePersonnel = getUniquePersonnel(stagePersonnelRaw);

    const capataz = stagePersonnel.find(p => (rolesMap[p.trabajador?.role_id] || '').toLowerCase().includes('capataz'));
    const otherWorkers = stagePersonnel.filter(p => p !== capataz);

    const isAssignedTechnical = stagePersonnel.some(t => t.trabajador?.id === userId);

    /*const canStartCosechado = title === 'Cosechado'
      ? (isAdminOrManager || isCapataz)
      : true;*/

    //const canStart = isAssignedTechnical && isEnabled && status === 'Pendiente' && canStartCosechado;

    // Cosechado, Despulpado, Tostado, Molido: solo el capataz asignado (o admin/gerente) puede INICIAR la etapa.
    // El técnico_agrónomo, despulpado no inicia, solo llena el formulario de fin de cosecha.
    const canStartRestrictedStages = (title === 'Cosechado' || title === 'Despulpado' || title === 'Tostado' || title === 'Molido')
      ? (isAdminOrManager || isCapataz)
      : true;
    // Cosechado, Despulpado: solo el capataz asignado (o admin/gerente) puede INICIAR la etapa.//
    const canStart = (isAdminOrManager || isAssignedTechnical) && isEnabled && status === 'Pendiente' && canStartRestrictedStages;

    // Cosechado: quién puede llenar el formulario de fin de cosecha ("Terminar").
    // Solo el técnico_agrónomo asignado a esta etapa, o admin/gerente. El capataz NO llena.
    const canFillHarvest = isAdminOrManager || (assignedStage === 'Cosechado' && isAssignedTechnical);
    const canFillPulping = isAdminOrManager || (assignedStage === 'Despulpado' && isAssignedTechnical); // Despulpado
    const canFillRoast = isAdminOrManager || (assignedStage === 'Tostado' && isAssignedTechnical); //Tostado
    const canFillMill = isAdminOrManager || (assignedStage === 'Molido' && isAssignedTechnical); //Molido
    //const canStart = isAssignedTechnical && isEnabled && status === 'Pendiente';

    return (
      <View key={title} style={[
        styles.stageCard,
        isEnabled && !isActive && !isCompleted && { backgroundColor: Theme.colors.secondaryContainer + '40' },
        isActive && styles.stageCardActive,
        !isEnabled && { opacity: 0.5 },
      ]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (title === 'Sembrado') {
              navigation.navigate('EtapaSembrados', { lote, readOnly: userRole.includes('capataz') });
            }
          }}
        >
          <View style={styles.stageHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.stageTitleRow}>
                <Text style={[styles.stageTitle, isActive && { color: Theme.colors.primary }]}>{title}</Text>
                {isCompleted && <CheckCircle2 size={16} color={statusColor} />}
                {isActive && <Activity size={16} color={statusColor} />}
                {isPending && isEnabled && <Clock size={16} color={statusColor} />}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <View style={[styles.statusDot, { backgroundColor: statusColor, width: 8, height: 8 }]} />
                <Text style={[styles.stageDate, { color: statusColor, fontWeight: '800' }]}>
                  {status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              {stageInfo?.fecha_inicio && (
                <Text style={[styles.stageDate, { marginTop: 2 }]}>
                  {isCompleted ? `Fin: ${new Date(stageInfo.fecha_final).toLocaleDateString()}` : `Inicio: ${new Date(stageInfo.fecha_inicio).toLocaleDateString()}`}
                </Text>
              )}
            </View>

            {title === 'Sembrado' && (
              <SubFaseTimeline
                subFaseActual={stageInfo?.subFaseSiembra || 'Germinacion'}
                isProduccion={lote?.estado_lote === 'En_Produccion'}
                stageStatus={status}
                stages={stages}
                loteId={lote.id}
              />
            )}
          </View>
        </TouchableOpacity>

        {capataz && (
          <View style={styles.personnelGroupItem}>
            <ShieldCheck size={14} color={Theme.colors.secondary} />
            <Text style={styles.operationalStaffText}>
              Capataz: {capataz.trabajador?.first_name} {capataz.trabajador?.last_name}
            </Text>
          </View>
        )}

        {otherWorkers.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.personnelGroupItem, { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }]}
              onPress={() => setExpandedWorkers(prev => ({ ...prev, [title]: !prev[title] }))}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Users size={14} color={Theme.colors.outline} />
                <Text style={styles.operationalStaffText}>Equipo ({otherWorkers.length})</Text>
              </View>
              {expandedWorkers[title]
                ? <ChevronUp size={14} color={Theme.colors.outline} />
                : <ChevronDown size={14} color={Theme.colors.outline} />}
            </TouchableOpacity>

            {expandedWorkers[title] && (
              <View style={{ marginTop: 8, paddingLeft: 12 }}>
                {otherWorkers.map(p => (
                  <Text key={p.id} style={styles.operationalStaffText}>
                    • {p.trabajador?.first_name} {p.trabajador?.last_name}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.stageFooter}>
          {canStart && (
            <TouchableOpacity style={styles.startStageButton} onPress={() => handleStartStage(title)}>
              <Rocket size={14} color={Theme.colors.white} />
              <Text style={styles.startStageText}>Iniciar {title}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.stageActionsRow}>
            {title === 'Cosechado' && isActive && canFillHarvest && (
              <TouchableOpacity style={styles.finishHarvestButton} onPress={openHarvestModal}>
                <ClipboardCheck size={14} color={Theme.colors.white} />
                <Text style={styles.startStageText}>Terminar</Text>
              </TouchableOpacity>
            )}

            {title === 'Cosechado' && isActive && !canFillHarvest && isCapataz && (
              <TouchableOpacity
                style={styles.monitorStageButton}
                onPress={() => navigation.navigate('EtapaCosecha', { lote, harvestPersonnel, assignedPersonnel, readOnly: true })}
              >
                <Eye size={14} color={Theme.colors.white} />
                <Text style={styles.monitorStageText}>Monitorear</Text>
              </TouchableOpacity>
            )}

            {title === 'Cosechado' && isCompleted && (
              <TouchableOpacity
                style={styles.monitorStageButton}
                onPress={() => navigation.navigate('EtapaCosecha', { lote, readOnly: userRole.includes('capataz') })}
              >
                <Eye size={14} color={Theme.colors.white} />
                <Text style={styles.monitorStageText}>Monitorear</Text>
              </TouchableOpacity>
            )}

            {title === 'Sembrado' && (status === 'En_Proceso' || status === 'Completada') && (
              <TouchableOpacity
                style={styles.monitorStageButton}
                onPress={() => navigation.navigate('EtapaSembrados', { lote, readOnly: userRole.includes('capataz') })}
              >
                <Eye size={14} color={Theme.colors.white} />
                <Text style={styles.monitorStageText}>Monitorear</Text>
              </TouchableOpacity>
            )}

            {/* LÓGICA PARA DESPULPADO */}
            {title === 'Despulpado' && isActive && canFillPulping && (
              <TouchableOpacity
                style={styles.finishHarvestButton} // Se reusa el estilo
                onPress={() => navigation.navigate('EtapaDespulpado', { lote, assignedPersonnel })}
              >
                <ClipboardCheck size={14} color={Theme.colors.white} />
                <Text style={styles.startStageText}>Terminar</Text>
              </TouchableOpacity>
            )}

            {title === 'Despulpado' && isActive && !canFillPulping && isCapataz && (
              <TouchableOpacity
                style={styles.monitorStageButton}
                onPress={() => navigation.navigate('EtapaDespulpado', { lote, assignedPersonnel, readOnly: true })}
              >
                <Eye size={14} color={Theme.colors.white} />
                <Text style={styles.monitorStageText}>Monitorear</Text>
              </TouchableOpacity>
            )}

            {title === 'Despulpado' && isCompleted && (
              <TouchableOpacity
                style={styles.monitorStageButton}
                onPress={() => navigation.navigate('EtapaDespulpado', { lote, assignedPersonnel, readOnly: userRole.includes('capataz') })}
              >
                <Eye size={14} color={Theme.colors.white} />
                <Text style={styles.monitorStageText}>Monitorear</Text>
              </TouchableOpacity>
            )}
            {/* --- LÓGICA PARA TOSTADO --- */}
            {title === 'Tostado' && isActive && canFillRoast && (
              <TouchableOpacity style={styles.finishHarvestButton} onPress={() => navigation.navigate('EtapaTostado', { lote, assignedPersonnel })}>
                <ClipboardCheck size={14} color={Theme.colors.white} /><Text style={styles.startStageText}>Terminar</Text>
              </TouchableOpacity>
            )}
            {title === 'Tostado' && isActive && !canFillRoast && isCapataz && (
              <TouchableOpacity style={styles.monitorStageButton} onPress={() => navigation.navigate('EtapaTostado', { lote, assignedPersonnel, readOnly: true })}>
                <Eye size={14} color={Theme.colors.white} /><Text style={styles.monitorStageText}>Monitorear</Text>
              </TouchableOpacity>
            )}
            {title === 'Tostado' && isCompleted && (
              <TouchableOpacity style={styles.monitorStageButton} onPress={() => navigation.navigate('EtapaTostado', { lote, assignedPersonnel, readOnly: userRole.includes('capataz') })}>
                <Eye size={14} color={Theme.colors.white} /><Text style={styles.monitorStageText}>Monitorear</Text>
              </TouchableOpacity>
            )}

            {/* --- LÓGICA PARA MOLIDO --- */}
            {title === 'Molido' && isActive && canFillMill && (
              <TouchableOpacity style={styles.finishHarvestButton} onPress={() => navigation.navigate('EtapaMolido', { lote, assignedPersonnel })}>
                <ClipboardCheck size={14} color={Theme.colors.white} /><Text style={styles.startStageText}>Terminar</Text>
              </TouchableOpacity>
            )}
            {title === 'Molido' && isActive && !canFillMill && isCapataz && (
              <TouchableOpacity style={styles.monitorStageButton} onPress={() => navigation.navigate('EtapaMolido', { lote, assignedPersonnel, readOnly: true })}>
                <Eye size={14} color={Theme.colors.white} /><Text style={styles.monitorStageText}>Monitorear</Text>
              </TouchableOpacity>
            )}
            {title === 'Molido' && isCompleted && (
              <TouchableOpacity style={styles.monitorStageButton} onPress={() => navigation.navigate('EtapaMolido', { lote, assignedPersonnel, readOnly: userRole.includes('capataz') })}>
                <Eye size={14} color={Theme.colors.white} /><Text style={styles.monitorStageText}>Monitorear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
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
                  { backgroundColor: Theme.colors.tertiary },
              { backgroundColor: getStatusColor(lote?.estado_lote || 'Reservado') }
            ]} />
            <Text style={[styles.stickyStatusText, { color: getStatusColor(lote?.estado_lote || 'Reservado') }]}>
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
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Lotes');
            }}
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
                    styles.bgTertiary,
                { backgroundColor: getStatusColor(lote?.estado_lote || 'Reservado') }
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
            {canAssignCapataz && !capatazAsignado && (
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
              {getUniquePersonnel(assignedPersonnel.filter(p => {
                const rName = (rolesMap[p.trabajador?.role_id] || '').toLowerCase();
                const esCapataz = rName === 'capataz' || p.etapa === 'Administración';
                return esCapataz && !!p.trabajador?.first_name; // 👈 exige que el join haya resuelto
              })).map((p, idx) => (
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
              ))}
              {assignedPersonnel.filter(p => {
                const rName = (rolesMap[p.trabajador?.role_id] || '').toLowerCase();
                return (rName === 'capataz' || p.etapa === 'Administración') && !!p.trabajador?.first_name;
              }).length === 0 && (
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
              <Text style={styles.progressPct}>
                {isStrictTechnician ? 'VISTA TÉCNICA' : 'GESTIÓN SECUENCIAL'}
              </Text>

            </View>
          </View>

          {canAssign && (
            <TouchableOpacity
              style={styles.mainActionBtn}
              onPress={() => navigation.navigate('AssignPersonal', { lote })}
            >
              <Users size={16} color={Theme.colors.white} />
              <Text style={styles.mainActionBtnText}>ASIGNACIÓN PERSONAL</Text>
            </TouchableOpacity>
          )}

          <View style={styles.stagesList}>
            {EtapaProcesoValues
              .map((etapa, originalIndex) => ({ etapa, originalIndex }))
              .filter(({ etapa }) => {
                if (etapa === 'Administración') return false;
                if (isStrictTechnician) return etapa === assignedStage;
                return true;
              })
              .map(({ etapa, originalIndex }) => renderStageCard(etapa, originalIndex))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBranding}>STGC DIGITAL ARCHIVE SERIES</Text>
          <Text style={styles.footerLegal}>VERIFICACIÓN CIENTÍFICA DE ORIGEN • 2026</Text>
        </View>
      </Animated.ScrollView>


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
    top: 0, left: 0, right: 0,
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
    width: 6, height: 6, borderRadius: 3,
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
    width: 48, height: 48, borderRadius: 24,
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
    width: 80, height: 5,
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
    fontSize: 10, fontWeight: '900', color: Theme.colors.white,
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
    fontSize: 10, color: Theme.colors.white, fontWeight: '600',
  },
  heroCodeText: {
    ...Theme.typography.display,
    fontSize: 22, color: Theme.colors.white, lineHeight: 42,
  },
  heroMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
  },
  heroLocationText: {
    fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500',
  },
  sectionPadding: {
    paddingHorizontal: 24, marginTop: 40,
  },
  sectionLabel: {
    ...Theme.typography.labelSm,
    letterSpacing: 2,
    color: Theme.colors.outline,
    fontWeight: '700',
    marginBottom: 20,
  },
  sensorsGrid: { gap: 12 },
  sensorRow: { flexDirection: 'row', gap: 12 },
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
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  sensorLabel: {
    fontSize: 10, fontWeight: '700',
    color: Theme.colors.outline, textTransform: 'uppercase',
  },
  sensorValue: {
    fontSize: 18, fontWeight: '800', color: Theme.colors.onSurface,
  },
  assignTechnicalButton: {
    marginTop: 20, borderRadius: 20, overflow: 'hidden', ...Theme.shadows.ambient,
  },
  assignTechnicalGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 16, gap: 10,
  },
  assignTechnicalText: {
    fontSize: 14, fontWeight: '800', color: Theme.colors.white,
  },
  foremanList: { gap: 12 },
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
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Theme.colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center',
  },
  foremanName: {
    ...Theme.typography.headline, fontSize: 18, color: Theme.colors.onSurface,
  },
  foremanRole: {
    fontSize: 12, color: Theme.colors.onSurfaceVariant, marginTop: 2,
  },
  verifiedIcon: {
    backgroundColor: Theme.colors.secondaryContainer,
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressPct: {
    fontSize: 12, fontWeight: '900',
    color: Theme.colors.secondary, letterSpacing: 1,
  },
  stagesList: { gap: 12 },
  stageCard: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 24, borderRadius: 28,
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  stageTitle: {
    ...Theme.typography.headline, fontSize: 18, color: Theme.colors.outline,
  },
  stageDate: {
    fontSize: 10, fontWeight: '700', color: Theme.colors.outline,
  },
  stageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  mainActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 16, gap: 8, marginBottom: 20, elevation: 2,
  },
  mainActionBtnText: {
    fontSize: 12, fontWeight: '900',
    color: Theme.colors.white, letterSpacing: 0.5,
  },
  startStageButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, gap: 6,
  },
  finishHarvestButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Theme.colors.secondary,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, gap: 6,
  },
  startStageText: {
    fontSize: 11, fontWeight: '800', color: Theme.colors.white,
  },
  monitorStageButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, gap: 6,
  },
  monitorStageText: {
    fontSize: 11, fontWeight: '800', color: Theme.colors.white,
  },
  simulateHarvestButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Theme.colors.secondaryContainer,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12, gap: 6,
  },
  simulateHarvestText: {
    fontSize: 10, fontWeight: '900',
    color: Theme.colors.secondary, letterSpacing: 0.3,
  },
  personnelGroupItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Theme.colors.surfaceContainerHighest,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, alignSelf: 'flex-start',
  },
  operationalStaffText: {
    fontSize: 11, color: Theme.colors.onSurfaceVariant, fontWeight: '600',
  },
  stageActionsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  footer: {
    paddingTop: 80, paddingBottom: 40, alignItems: 'center', gap: 12,
  },
  footerBranding: {
    fontSize: 11, fontWeight: '900', letterSpacing: 5, color: Theme.colors.outline,
  },
  footerLegal: {
    fontSize: 8, fontWeight: '600', color: Theme.colors.outlineVariant,
  },
  miniTimeline: {
    alignItems: 'flex-end', gap: 4,
  },
  dotsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  timelineDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: Theme.colors.terroirBrown, width: 8, height: 8, borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: Theme.colors.terroirGreen,
  },
  timelineConnector: {
    width: 8, height: 1, backgroundColor: '#E5E7EB',
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
  },
});

export default ViewLoteScreen;
