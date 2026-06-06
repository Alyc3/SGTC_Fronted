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

const ViewLoteScreen = ({ navigation, route }: any) => {
  const lote = route.params?.lote;
  const role = useAuthStore((state) => state.role);

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
  const canAssignCapataz = userRole === 'admin' || userRole === 'gerente general';

  const [assignedPersonnel, setAssignedPersonnel] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Usuarios asignados a esta etapa específica
    const stagePersonnel = assignedPersonnel.filter(p => p.etapa === title);

    return (
      <View key={title} style={[
        styles.stageCard, 
        isActive && styles.stageCardActive,
        !isEnabled && { opacity: 0.5 }
      ]}>
        <View style={styles.stageHeader}>
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

        <Text style={styles.stageDescription}>
          {isCompleted ? 'Etapa finalizada exitosamente.' : isActive ? 'Etapa en ejecución actual.' : 'Esperando inicio de fase.'}
        </Text>

        {/* Lista de Personal Asignado a esta Etapa */}
        {stagePersonnel.length > 0 && (
          <View style={styles.stagePersonnelList}>
            <Users size={12} color={Theme.colors.outline} />
            <Text style={styles.stagePersonnelText}>
              {stagePersonnel.map(p => `${p.trabajador?.first_name}`).join(', ')}
            </Text>
          </View>
        )}
        
        <View style={styles.stageFooter}>
          {isEnabled && status === 'Pendiente' && (
            <TouchableOpacity 
              style={styles.startStageButton}
              onPress={() => handleStartStage(title)}
            >
              <Rocket size={14} color={Theme.colors.white} />
              <Text style={styles.startStageText}>Iniciar {title}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.addPersonnelMiniButton, !isEnabled && { backgroundColor: Theme.colors.surfaceVariant }]}
            onPress={() => isEnabled && navigation.navigate('AssignPersonal', { lote, etapa: title })}
            disabled={!isEnabled}
          >
            <UserPlus size={14} color={isEnabled ? Theme.colors.onSecondaryContainer : Theme.colors.outline} />
            <Text style={[styles.addPersonnelMiniText, !isEnabled && { color: Theme.colors.outline }]}>Agregar Personal</Text>
          </TouchableOpacity>
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
            {assignedPersonnel
              .filter(p => {
                const rName = (rolesMap[p.trabajador?.role_id] || '').toLowerCase();
                return rName === 'capataz' || p.etapa === 'Administración';
              })
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
            <Text style={styles.progressPct}>GESTIÓN SECUENCIAL</Text>
          </View>
          
          <View style={styles.stagesList}>
            {EtapaProcesoValues
              .filter(etapa => etapa !== 'Administración')
              .map((etapa, index) => renderStageCard(etapa, index))}
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
  sectionHeaderRow: {

    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'baseline',
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
});

export default ViewLoteScreen;
