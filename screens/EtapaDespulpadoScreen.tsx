import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image as RNImage,
  BackHandler,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  CheckCircle2,
  Camera,
  ClipboardCheck,
  Play,
  Edit2,
  Lock,
  AlertCircle,
  Droplets,
  Wind,
} from 'lucide-react-native';

import { Theme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { lotesService } from '../services/lotes.service';
// Asumimos que has creado despulpadoService con los mismos métodos que cosechaService
import { despulpadoService } from '../services/despulpado.service'; 
import { CustomAlert } from '../components/GlobalAlert';

// ─── Constantes ─────────────────

const PROCESO_TYPES = [
  { label: 'Lavado', value: 'lavado' as const },
  { label: 'Honey', value: 'honey' as const },
  { label: 'Natural', value: 'natural' as const }
];

const OLOR_TYPES = [
  { label: 'Fruta fresca', value: 'fruta_fresca' as const },
  { label: 'Vinagre', value: 'vinagre' as const },
  { label: 'Podrido', value: 'podrido' as const }
];

const ROL_TECNICO = 'TECNICO_DESPULPADO'; 
const ESTADO_EN_PRODUCCION = 'en_produccion';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// ─── Pantalla principal ────────────────────────────────────────────────────────

const EtapaDespulpadoScreen = ({ navigation, route }: any) => {
  const lote = route.params?.lote;
  const assignedPersonnel = route.params?.assignedPersonnel || [];
  const { role, userId } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Estados de visualización
  const [modo, setModo] = useState<'loading' | 'form' | 'readonly_despulpado' | 'readonly_nopermiso'>('loading');
  const [despulpadoExistente, setDespulpadoExistente] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  // Form state
  /*const [tipoProceso, setTipoProceso] = useState<string>('');
  const [olorPercibido, setOlorPercibido] = useState<string>('');*/
  const [tipoProceso, setTipoProceso] = useState<'lavado' | 'honey' | 'natural' | null>(null);
  const [olorPercibido, setOlorPercibido] = useState<'fruta_fresca' | 'vinagre' | 'podrido' | null>(null);
  const [evidenceUri, setEvidenceUri] = useState('');
  const [fechaInicio, setFechaInicio] = useState<string | null>(null);

  // ── Botón físico / gesto atrás → volver a ViewLote ──
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

  const fetchData = useCallback(async () => {
    if (!lote?.id) return;
    try {
      setLoading(true);
      const despulpado = await despulpadoService.getByLoteId(lote.id);

      if (despulpado) {
        setDespulpadoExistente(despulpado);
        setModo('readonly_despulpado');
        setFechaInicio(despulpado.fecha_inicio || null);
        return;
      }

      // Validar si es el técnico correcto (ajusta esta validación según cómo manejes los roles en tu app)
      const esTecnico = role === ROL_TECNICO || role === 'ADMIN'; 
      
      if (!esTecnico) {
        setDespulpadoExistente(null);
        setModo('readonly_nopermiso');
        return;
      }

      setDespulpadoExistente(null);
      setModo('form');
    } catch (error) {
      console.error('Error fetching despulpado:', error);
      setModo('readonly_nopermiso');
    } finally {
      setLoading(false);
    }
  }, [lote?.id, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Helpers de formulario ──────────────────────────────────────────────────

  const handlePickEvidence = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        if (asset.size !== undefined && asset.size > MAX_IMAGE_SIZE_BYTES) {
          const maxSizeReadable = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(1);
          const fileSizeReadable = (asset.size / (1024 * 1024)).toFixed(2);
          CustomAlert.show('ALERTA', 'Imagen demasiado pesada', `El archivo seleccionado pesa ${fileSizeReadable} MB. El máximo permitido es ${maxSizeReadable} MB.`);
          return;
        }
        setEvidenceUri(asset.uri);
      }
    } catch {
      CustomAlert.show('ERROR', 'Error', 'No se pudo seleccionar la imagen de evidencia.');
    }
  };

  // ── INICIAR ────────────────────

  const handleIniciar = () => {
    CustomAlert.show(
      'ALERTA',
      'Iniciar Despulpado',
      '¿Estás seguro de iniciar el proceso de despulpado?',
      async () => {
        try {
          await lotesService.updateStageStatus(lote.id, 'Despulpado', 'En_Proceso');
          setFechaInicio(new Date().toISOString());
        } catch (error) {
          CustomAlert.show('ERROR', 'Error', 'No se pudo iniciar la etapa de despulpado.');
        }
      },
      'ACEPTAR',
      () => {},
      'CANCELAR'
    );
  };

  // ── FINALIZAR / GUARDAR ─

  const validarFormulario = (): string | null => {
    if (!tipoProceso) return 'Selecciona el tipo de proceso a realizar.';
    if (!olorPercibido) return 'Selecciona el olor percibido de la masa despulpada.';
    if (!evidenceUri && !despulpadoExistente?.imagen_evidencia_uri) {
      return 'Debes adjuntar una imagen de evidencia de la integridad del grano.';
    }
    return null;
  };

  const handleFinalizar = () => {
    const errorMsg = validarFormulario();
    if (errorMsg) {
      CustomAlert.show('ALERTA', 'Datos Incompletos', errorMsg);
      return;
    }

    CustomAlert.show(
      'ALERTA',
      'Cerrar Fase',
      '¿Estás seguro de finalizar y registrar el despulpado?',
      async () => {
        await handleConfirmDespulpado();
      },
      'ACEPTAR',
      () => {},
      'CANCELAR'
    );
  };
  
  const handleConfirmDespulpado = async () => {
    const esEdicion = !!despulpadoExistente?.id;

    const despulpadoData = {
      id: esEdicion ? despulpadoExistente.id : `despulpado_${Date.now()}`,
      lote_id: lote.id,
      responsable_id: userId ?? '',
      tipo_proceso: tipoProceso as 'lavado' | 'honey' | 'natural', 
      olor_percibido: olorPercibido as 'fruta_fresca' | 'vinagre' | 'podrido',
      imagen_evidencia_uri: evidenceUri || despulpadoExistente?.imagen_evidencia_uri,
      fecha_inicio: fechaInicio || despulpadoExistente?.fecha_inicio || new Date().toISOString(),
      fecha_final: new Date().toISOString(),
    };

    try {
      setSaving(true);

      if (esEdicion) {
        const { id, ...updateData } = despulpadoData;
        await despulpadoService.update(despulpadoExistente.id, updateData);
      } else {
        await despulpadoService.create(despulpadoData);
      }

      await lotesService.updateStageStatus(lote.id, 'Despulpado', 'Completada');

      CustomAlert.show('SUCCESS', 'Éxito', esEdicion ? 'Despulpado actualizado correctamente.' : 'Despulpado registrado correctamente.', () => {
        navigation.navigate('ViewLote', { lote });
      });
      
      await fetchData();
      setEditMode(false);
    } catch {
      CustomAlert.show('ERROR', 'Error', 'Fallo al guardar el registro de despulpado.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = () => {
    setTipoProceso(despulpadoExistente?.tipo_proceso);
    setOlorPercibido(despulpadoExistente?.olor_percibido);
    setEvidenceUri(despulpadoExistente?.imagen_evidencia_uri ?? '');
    setFechaInicio(despulpadoExistente?.fecha_inicio ?? null);
    setEditMode(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.terroirBrown} />
      </View>
    );
  }

  const hayDatos = modo === 'readonly_despulpado';
  const sinPermiso = modo === 'readonly_nopermiso';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.terroirBeige} />

      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.navigate('ViewLote', { lote })} style={styles.backButton}>
          <ArrowLeft size={24} color={Theme.colors.terroirBrown} />
        </TouchableOpacity>
        <CheckCircle2 size={24} color={Theme.colors.terroirBrown} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            <Text style={styles.labelCaps}>LOTE ID: {lote?.codigo || '—'}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.labelCaps}>VARIEDAD: {lote?.variedadCafe || '—'}</Text>
          </View>
          <Text style={styles.displayTitle}>Despulpado</Text>
          <Text style={styles.subtitle}>
            Determine el tipo de procesamiento post-cosecha y verifique olfativamente la calidad de la masa despulpada.
          </Text>
        </View>

        <View style={styles.timelineHeader}>
          <ClipboardCheck size={16} color={Theme.colors.terroirBrown} />
          <Text style={styles.timelineHeaderText}>CIERRE DE FASE</Text>
        </View>

        <View style={styles.timelineCard}>
          <View style={styles.phaseHeaderRow}>
            <View>
              <Text style={[
                styles.phaseTitle,
                hayDatos ? { color: Theme.colors.terroirGreen } : { color: Theme.colors.terroirBrown },
              ]}>
                Despulpado
              </Text>
              {hayDatos && <Text style={styles.activeTag}>FASE CERRADA</Text>}
              {!hayDatos && !sinPermiso && <Text style={styles.activeTag}>EN PROCESO</Text>}
            </View>

            {hayDatos && (role === ROL_TECNICO || role === 'ADMIN') && !editMode && (
              <TouchableOpacity style={styles.editPhaseBtn} onPress={handleEditar}>
                <Edit2 size={14} color={Theme.colors.terroirBrown} />
                <Text style={styles.editPhaseText}>EDITAR</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Caso: sin permiso */}
          {sinPermiso && (
            <View style={[styles.metricsCard, styles.cardWhiteDashed]}>
              <View style={styles.lockedBanner}>
                <Lock size={15} color="#E6A817" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedBannerTitle}>Acceso restringido</Text>
                  <Text style={styles.lockedBannerSub}>
                    Solo el técnico asignado a la fase de Despulpado puede registrar esta información.
                  </Text>
                </View>
              </View>
              <View style={styles.estadoRow}>
                <AlertCircle size={14} color={Theme.colors.terroirGray} />
                <Text style={styles.estadoLabel}>Estado del lote:</Text>
                <View style={styles.estadoBadge}>
                  <Text style={styles.estadoBadgeText}>{ESTADO_EN_PRODUCCION}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Caso: Formulario / Lectura */}
          {(hayDatos || modo === 'form') && (
            <View style={[
              styles.metricsCard,
              hayDatos ? styles.cardBeige : styles.cardGreenLight,
            ]}>
              {/* Fechas con botones INICIAR */}
              <View style={styles.datesGrid}>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateLabel}>Inicio de fase*</Text>
                  {hayDatos && !editMode ? (
                    <View style={styles.dateDisplay}>
                      <Text style={styles.dateText}>{despulpadoExistente?.fecha_inicio?.split('T')[0] || '—'}</Text>
                    </View>
                  ) : fechaInicio ? (
                    <View style={styles.dateDisplay}>
                      <Text style={styles.dateText}>{fechaInicio.split('T')[0]}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.dateButton} onPress={handleIniciar}>
                      <Play size={12} color={Theme.colors.terroirBrown} fill={Theme.colors.terroirBrown} />
                      <Text style={styles.dateButtonText}>INICIAR</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* TIPO DE PROCESO */}
              <View style={styles.metricInputGroup}>
                <View style={styles.sectionInlineHeader}>
                  <Droplets size={14} color={Theme.colors.terroirBrown} />
                  <Text style={styles.standardLabel}>TIPO DE PROCESO*</Text>
                </View>

                <View style={styles.optionsGrid}>
                  {PROCESO_TYPES.map(type => {
                    const selected = (hayDatos && !editMode ? despulpadoExistente?.tipo_proceso : tipoProceso) === type.value;
                    const isReadOnly = hayDatos && !editMode;

                    return (
                      <TouchableOpacity
                        key={type.value}
                        disabled={isReadOnly}
                        style={[
                          styles.optionButton,
                          selected && styles.optionButtonActive,
                          isReadOnly && !selected && { opacity: 0.5 }
                        ]}
                        onPress={() => setTipoProceso(type.value)}
                      >
                        <Text style={[styles.optionButtonText, selected && styles.optionButtonTextActive]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* OLOR PERCIBIDO */}
              <View style={styles.metricInputGroup}>
                <View style={styles.sectionInlineHeader}>
                  <Wind size={14} color={Theme.colors.terroirBrown} />
                  <Text style={styles.standardLabel}>OLOR PERCIBIDO*</Text>
                </View>

                <View style={styles.optionsGrid}>
                  {OLOR_TYPES.map(type => {
                    const currentVal = hayDatos && !editMode ? despulpadoExistente?.olor_percibido : olorPercibido;
                    const selected = currentVal === type.value;
                    const isReadOnly = hayDatos && !editMode;
                    const isWarning = type.value === 'vinagre' || type.value === 'podrido';

                    return (
                      <TouchableOpacity
                        key={type.value}
                        disabled={isReadOnly}
                        style={[
                          styles.optionButton,
                          selected && !isWarning && styles.optionButtonActive,
                          selected && isWarning && styles.optionButtonWarning,
                          isReadOnly && !selected && { opacity: 0.5 }
                        ]}
                        onPress={() => setOlorPercibido(type.value)}
                      >
                        <Text style={[
                          styles.optionButtonText, 
                          selected && !isWarning && styles.optionButtonTextActive,
                          selected && isWarning && styles.optionButtonTextWarning
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* EVIDENCIA VISUAL */}
              <View style={styles.metricInputGroup}>
                <View style={styles.sectionInlineHeader}>
                  <Camera size={14} color={Theme.colors.terroirBrown} />
                  <Text style={styles.standardLabel}>EVIDENCIA VISUAL*</Text>
                </View>
                {hayDatos && !editMode ? (
                  despulpadoExistente?.imagen_evidencia_uri ? (
                    <TouchableOpacity onPress={() => setPreviewVisible(true)} activeOpacity={0.85}>
                      <RNImage
                        source={{ uri: despulpadoExistente.imagen_evidencia_uri }}
                        style={styles.evidenceImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.inputDisabled}>
                      <Text numberOfLines={1} style={styles.evidenceReadonlyText}>
                        Sin imagen registrada
                      </Text>
                    </View>
                  )
                ) : (
                  <View>
                    {evidenceUri ? (
                      <TouchableOpacity onPress={() => setPreviewVisible(true)} activeOpacity={0.85}>
                        <RNImage
                          source={{ uri: evidenceUri }}
                          style={styles.evidenceImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.evidencePickerButton} onPress={handlePickEvidence}>
                      <Camera size={15} color="white" />
                      <Text style={styles.evidencePickerText}>
                        {evidenceUri ? 'Cambiar imagen' : 'Seleccionar imagen de la masa'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Modal de preview a pantalla completa */}
              <Modal
                visible={previewVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewVisible(false)}
              >
                <TouchableOpacity
                  style={styles.previewOverlay}
                  activeOpacity={1}
                  onPress={() => setPreviewVisible(false)}
                >
                  <RNImage
                    source={{ uri: hayDatos && !editMode ? despulpadoExistente?.imagen_evidencia_uri : evidenceUri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </Modal>

              {/* Botón GUARDAR / FINALIZAR */}
              {(modo === 'form' || editMode) && fechaInicio !== null && (
                <TouchableOpacity
                  style={[styles.actionButton, !fechaInicio && !hayDatos && styles.btnDisabled]}
                  onPress={handleFinalizar}
                  disabled={saving || (!fechaInicio && !hayDatos)}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.actionButtonText}>
                      {hayDatos ? 'GUARDAR ACTUALIZACIÓN' : 'REGISTRAR CIERRE'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.terroirBeige },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.terroirBeige },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backButton: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 24 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  labelCaps: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '800', color: Theme.colors.terroirBrown, textTransform: 'uppercase', letterSpacing: 2 },
  dot: { color: '#D1D5DB' },
  displayTitle: { fontFamily: 'Manrope', fontSize: 30, fontWeight: '800', color: Theme.colors.terroirBrown, marginBottom: 12 },
  subtitle: { fontFamily: 'Manrope', fontSize: 14, color: Theme.colors.terroirGray, lineHeight: 22 },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  timelineHeaderText: { fontFamily: 'Manrope', fontSize: 11, fontWeight: '800', color: Theme.colors.terroirGray, letterSpacing: 2 },
  timelineCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  phaseHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  phaseTitle: { fontFamily: 'Manrope', fontSize: 18, fontWeight: '800' },
  activeTag: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '800', color: Theme.colors.terroirGreen, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  editPhaseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(93, 58, 44, 0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  editPhaseText: { fontFamily: 'Manrope', fontSize: 9, fontWeight: '800', color: Theme.colors.terroirBrown, letterSpacing: 1 },
  metricsCard: { marginTop: 12, borderRadius: 16, padding: 16, gap: 20 },
  cardBeige: { backgroundColor: Theme.colors.terroirBeige },
  cardGreenLight: { backgroundColor: Theme.colors.terroirGreenLight, borderWidth: 1, borderColor: 'rgba(62, 102, 65, 0.1)' },
  cardWhiteDashed: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', gap: 12 },
  datesGrid: { flexDirection: 'row', gap: 8 },
  dateInputGroup: { flex: 1 },
  dateLabel: { fontFamily: 'Manrope', fontSize: 9, fontWeight: '800', color: Theme.colors.terroirGray, marginBottom: 4, textTransform: 'uppercase' },
  dateDisplay: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  dateText: { fontSize: 10, fontFamily: 'Manrope', fontWeight: '700', color: Theme.colors.terroirText },
  dateButton: { backgroundColor: 'white', borderWidth: 1, borderColor: Theme.colors.terroirBrown, borderRadius: 8, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dateButtonText: { fontSize: 9, fontFamily: 'Manrope', fontWeight: '800', color: Theme.colors.terroirBrown, letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.4, borderColor: '#E5E7EB' },
  metricInputGroup: { gap: 8 },
  standardLabel: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '800', color: Theme.colors.terroirBrown, marginLeft: 2, letterSpacing: 1 },
  sectionInlineHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  optionsGrid: { flexDirection: 'row', gap: 8 },
  optionButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  optionButtonActive: { backgroundColor: 'rgba(62, 102, 65, 0.1)', borderColor: Theme.colors.terroirGreen },
  optionButtonWarning: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  optionButtonText: { fontSize: 11, fontWeight: '800', color: Theme.colors.terroirGray },
  optionButtonTextActive: { color: Theme.colors.terroirGreen },
  optionButtonTextWarning: { color: '#EF4444' },
  evidencePickerText: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '800', color: 'white' },
  lockedBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FFE082' },
  lockedBannerTitle: { fontFamily: 'Manrope', fontSize: 13, fontWeight: '900', color: '#E65100', marginBottom: 2 },
  lockedBannerSub: { fontFamily: 'Manrope', fontSize: 12, color: '#795548', lineHeight: 17 },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  estadoLabel: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '700', color: Theme.colors.terroirGray },
  estadoBadge: { backgroundColor: '#F9FAFB', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#E5E7EB' },
  estadoBadgeText: { fontFamily: 'Manrope', fontSize: 11, fontWeight: '800', color: Theme.colors.terroirGray, letterSpacing: 0.5 },
  actionButton: { width: '100%', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: Theme.colors.terroirGreen, shadowColor: Theme.colors.terroirGreen, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  actionButtonText: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '800', color: 'white', letterSpacing: 1 },
  evidenceReadonlyText: { fontFamily: 'Manrope', fontSize: 12, color: Theme.colors.terroirGray },
  evidencePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.terroirBrown, height: 48, borderRadius: 12, gap: 8 },
  evidenceImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 10, backgroundColor: '#F3F4F6' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '100%' },
  inputDisabled: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6', borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
});

export default EtapaDespulpadoScreen;