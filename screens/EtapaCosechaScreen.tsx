import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Camera,
  Users,
  User,
  ClipboardCheck,
  Play,
  Square,
  Edit2,
  Lock,
  AlertCircle,
} from 'lucide-react-native';
const DateTimePicker = require('@react-native-community/datetimepicker').default;

import { Theme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { asignacionPersonalService, cosechaService } from '../services/cosecha.service';
import { CustomAlert } from '../components/GlobalAlert';

// ─── Constantes (mismas reglas que el HarvestModal original) ─────────────────

const GRAIN_TYPES = ['Verde', 'Rojo', 'Variado'];
const ROL_TECNICO = 'TECNICO_AGRONOMO';
const ESTADO_EN_PRODUCCION = 'en_produccion';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 * 1024;

const getTarifaByGrano = (tipoGrano: string): number => {
  switch (tipoGrano) {
    case 'Rojo': return 0.30;
    case 'Verde': return 0.20;
    case 'Variado': return 0.25;
    default: return 0.25;
  }
};

const getCalidadByCosecha = (brix: number, tipoGrano: string): 'alta' | 'media' | 'baja' => {
  if (brix >= 18 && tipoGrano === 'Rojo') return 'alta';
  if (brix >= 14 && brix <= 17) return 'media';
  if (brix < 14 || tipoGrano === 'Verde') return 'baja';
  return 'media';
};

const getCalidadGeneral = (workers: { brix: number; tipoGrano: string }[]): 'alta' | 'media' | 'baja' => {
  const counts = { alta: 0, media: 0, baja: 0 };
  workers.forEach(w => { counts[getCalidadByCosecha(w.brix, w.tipoGrano)]++; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as 'alta' | 'media' | 'baja';
};

const getInitials = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('');

// ─── Pantalla principal ────────────────────────────────────────────────────────
// Reemplaza al HarvestModal: misma lógica de negocio, pero presentada como
// pantalla completa con el mismo lenguaje visual que EtapaSembradosScreen.

const EtapaCosechaScreen = ({ navigation, route }: any) => {
  const lote = route.params?.lote;
  const harvestPersonnel = route.params?.harvestPersonnel || [];
  const assignedPersonnel = route.params?.assignedPersonnel || [];
  const { role, userId } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 'form' = técnico asignado puede registrar; 'readonly_cosecha' = ya existe;
  // 'readonly_nopermiso' = sin permiso / sin asignación
  const [modo, setModo] = useState<'loading' | 'form' | 'readonly_cosecha' | 'readonly_nopermiso'>('loading');
  const [cosechaExistente, setCosechaExistente] = useState<any>(null);
  const [workersRegistrados, setWorkersRegistrados] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [harvestBrix, setHarvestBrix] = useState('');
  const [harvestEvidenceUri, setHarvestEvidenceUri] = useState('');
  const [harvestObservations, setHarvestObservations] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [harvestDuration, setHarvestDuration] = useState('');
  const [fechaInicio, setFechaInicio] = useState<string | null>(null);
  const [workerHarvestData, setWorkerHarvestData] = useState(
    {} as Record<string, { cantidad: string; tipoGrano: string }>
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ── Botón físico / gesto atrás → volver a ViewLote (igual que Sembrado) ──
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
      const cosecha = await cosechaService.getByLoteId(lote.id);

      const resumen = harvestPersonnel.map((p: any, index: number) => ({
        id: p.id || p.trabajador_id || p.trabajador?.id || String(index),
        nombre: `${p.trabajador?.first_name || 'Trabajador'} ${p.trabajador?.last_name || ''}`.trim(),
        cantidad_cosechada: p.cantidad_cosechada ?? 0,
        tipo_grano: p.tipo_grano ?? 'Rojo',
        pago_calculado: p.pago_calculado ?? 0,
      }));
      setWorkersRegistrados(resumen);

      if (cosecha) {
        setCosechaExistente(cosecha);
        setModo('readonly_cosecha');
        setFechaInicio(cosecha.fecha_inicio || null);
        return;
      }

      const esTecnico = role === ROL_TECNICO;
      const hayPersonalAsignado = harvestPersonnel.length > 0 || assignedPersonnel.length > 0;

      if (!esTecnico || !hayPersonalAsignado) {
        setCosechaExistente(null);
        setModo('readonly_nopermiso');
        return;
      }

      setCosechaExistente(null);
      setModo('form');
    } catch (error) {
      console.error('Error fetching cosecha:', error);
      setModo('readonly_nopermiso');
    } finally {
      setLoading(false);
    }
  }, [lote?.id, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Helpers de formulario ──────────────────────────────────────────────────

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

  const handlePickHarvestEvidence = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (asset.size !== undefined && asset.size > MAX_IMAGE_SIZE_BYTES) {
          const maxSizeReadable = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024 * 1024)).toFixed(1);
          const fileSizeReadable = (asset.size / (1024 * 1024 * 1024)).toFixed(2);
          CustomAlert.show('ALERTA', 'Imagen demasiado pesada', `El archivo seleccionado pesa ${fileSizeReadable} GB. El máximo permitido es ${maxSizeReadable} GB.`);
          return;
        }
        setHarvestEvidenceUri(asset.uri);
      }
    } catch {
      CustomAlert.show('ERROR', 'Error', 'No se pudo seleccionar la imagen de evidencia.');
    }
  };

  // ── INICIAR (igual que handleConfirmStart de Sembrado) ────────────────────

  const handleIniciar = () => {
    CustomAlert.show(
      'ALERTA',
      'Iniciar Cosecha',
      '¿Estás seguro de iniciar el registro de la cosecha?',
      () => {
        setFechaInicio(new Date().toISOString());
      },
      'ACEPTAR',
      () => {},
      'CANCELAR'
    );
  };

  // ── FINALIZAR / GUARDAR (igual que handleConfirmEnd + handleConfirmHarvest) ─

  const validarFormulario = (): string | null => {
    if (!harvestBrix.trim() || Number.isNaN(Number(harvestBrix))) {
      return 'Ingresa un valor numérico para Grados Brix.';
    }
    const brixValue = parseFloat(harvestBrix);
    if (brixValue < 0.1 || brixValue > 50) {
      return 'Los grados Brix deben estar entre 0.1 y 50.';
    }
    if (harvestPersonnel.length === 0) {
      return 'No hay trabajadores asignados a la etapa de cosecha.';
    }
    const hasInvalidWorkerAmount = harvestPersonnel.some((p: any, index: number) => {
      const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
      const amount = workerHarvestData[key]?.cantidad;
      return !amount || Number.isNaN(Number(amount)) || Number(amount) <= 0;
    });
    if (hasInvalidWorkerAmount) return 'Ingresa la cantidad recolectada para cada trabajador.';

    const hasExceededLimit = harvestPersonnel.some((p: any, index: number) => {
      const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
      return Number(workerHarvestData[key]?.cantidad) > 100;
    });
    if (hasExceededLimit) return 'Ningún trabajador puede registrar más de 100 kg.';

    if (!harvestDate.trim()) return 'Selecciona la fecha de la cosecha.';
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
      'Finalizar Cosecha',
      '¿Estás seguro de finalizar y registrar la cosecha?',
      async () => {
        await handleConfirmHarvest();
      },
      'ACEPTAR',
      () => {},
      'CANCELAR'
    );
  };

  const handleConfirmHarvest = async () => {
    const brix = parseFloat(harvestBrix);
    const workersResumen = harvestPersonnel.map((p: any, index: number) => {
      const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
      const data = workerHarvestData[key];
      const tipoGrano = data?.tipoGrano || 'Rojo';
      const cantidad = parseFloat(data?.cantidad || '0');
      const tarifa = getTarifaByGrano(tipoGrano);
      const calidad = getCalidadByCosecha(brix, tipoGrano);
      return { key, tipoGrano, cantidad, tarifa, calidad };
    });

    const pesoTotal = workersResumen.reduce((sum: number, w: any) => sum + w.cantidad, 0);
    const calidadGeneral = getCalidadGeneral(workersResumen.map((w: any) => ({ brix, tipoGrano: w.tipoGrano })));
    const tarifaGeneral = pesoTotal > 0
      ? workersResumen.reduce((sum: number, w: any) => sum + w.tarifa * w.cantidad, 0) / pesoTotal
      : 0.25;

    const cosechaData = {
      id: `cosecha_${Date.now()}`,
      lote_id: lote.id,
      responsable_id: userId ?? '',
      grados_brix: brix,
      peso_kilos: pesoTotal,
      calidad_cosecha: calidadGeneral,
      tarifa_por_kilo: parseFloat(tarifaGeneral.toFixed(2)),
      imagen_evidencia_uri: harvestEvidenceUri,
      observaciones: harvestObservations,
      fecha_inicio: fechaInicio || new Date().toISOString(),
      fecha_final: harvestDate,
      duracion_horas: harvestDuration ? parseFloat(harvestDuration) : undefined,
    };

    try {
      setSaving(true);

      await Promise.all(
        harvestPersonnel.map((p: any, index: number) => {
          const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
          const resumen = workersResumen.find((w: any) => w.key === key);
          if (!resumen) return Promise.resolve();
          const pagoCalculado = parseFloat((resumen.cantidad * resumen.tarifa).toFixed(2));
          return asignacionPersonalService.updateCosecha(p.id, {
            cantidad_cosechada: resumen.cantidad,
            tipo_grano: resumen.tipoGrano,
            pago_calculado: pagoCalculado,
          });
        })
      );

      await cosechaService.create(cosechaData);

      CustomAlert.show('SUCCESS', 'Éxito', 'Cosecha registrada correctamente.', () => {
        navigation.navigate('ViewLote', { lote });
      });
      await fetchData();
      setEditMode(false);
    } catch {
      CustomAlert.show('ERROR', 'Error', 'Fallo al guardar la cosecha.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.terroirBrown} />
      </View>
    );
  }

  const hayDatos = modo === 'readonly_cosecha';
  const sinPermiso = modo === 'readonly_nopermiso';
  const calidad = cosechaExistente?.calidad_cosecha;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.terroirBeige} />

      {/* NavBar — idéntico patrón al de EtapaSembradosScreen */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.navigate('ViewLote', { lote })} style={styles.backButton}>
          <ArrowLeft size={24} color={Theme.colors.terroirBrown} />
        </TouchableOpacity>
        <CheckCircle2 size={24} color={Theme.colors.terroirBrown} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header — mismo patrón visual que Sembrado */}
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            <Text style={styles.labelCaps}>LOTE ID: {lote?.codigo || '—'}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.labelCaps}>VARIEDAD: {lote?.variedadCafe || '—'}</Text>
          </View>
          <Text style={styles.displayTitle}>Cosechado Selectivo</Text>
          <Text style={styles.subtitle}>
            Registro del cierre de cosecha: calidad del grano, peso recolectado por trabajador y evidencia fotográfica.
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
                Cosechado
              </Text>
              {hayDatos && <Text style={styles.activeTag}>FASE CERRADA</Text>}
              {!hayDatos && !sinPermiso && <Text style={styles.activeTag}>EN PROCESO</Text>}
            </View>

            {/* Botón Editar — solo si ya existe cosecha y el usuario es el técnico */}
            {hayDatos && role === ROL_TECNICO && !editMode && (
              <TouchableOpacity style={styles.editPhaseBtn} onPress={() => setEditMode(true)}>
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
                    Solo el técnico asignado puede registrar la cosecha de este lote.
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

          {/* Caso: cosecha registrada (solo lectura, salvo modo edición) o formulario activo */}
          {(hayDatos || modo === 'form') && (
            <View style={[
              styles.metricsCard,
              hayDatos ? styles.cardBeige : styles.cardGreenLight,
            ]}>
              {/* Fechas con botones INICIAR / FINALIZAR */}
              <View style={styles.datesGrid}>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateLabel}>INICIO</Text>
                  {hayDatos && !editMode ? (
                    <View style={styles.dateDisplay}>
                      <Text style={styles.dateText}>{cosechaExistente?.fecha_inicio?.split('T')[0] || '—'}</Text>
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

                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateLabel}>FECHA DE CIERRE *</Text>
                  {hayDatos && !editMode ? (
                    <View style={styles.dateDisplay}>
                      <Text style={styles.dateText}>{cosechaExistente?.fecha_final || '—'}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.dateDisplay, !fechaInicio && styles.btnDisabled]}
                      onPress={() => fechaInicio && setShowDatePicker(true)}
                      disabled={!fechaInicio}
                    >
                      <Text style={styles.dateText}>{harvestDate}</Text>
                      <Calendar size={14} color={Theme.colors.terroirBrown} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

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

              {/* Grados Brix */}
              <View style={styles.metricInputGroup}>
                <Text style={styles.standardLabel}>GRADOS BRIX*</Text>
                <View style={[styles.standardInputWrapper, (hayDatos && !editMode) && styles.inputDisabled]}>
                  <TextInput
                    style={styles.standardInput}
                    keyboardType="numeric"
                    value={hayDatos && !editMode ? String(cosechaExistente?.grados_brix ?? '') : harvestBrix}
                    onChangeText={(text) => {
                      if (text.length > 10) return;
                      if (text !== '' && !/^\d*\.?\d*$/.test(text)) return;
                      const numeric = parseFloat(text);
                      if (!isNaN(numeric) && numeric > 50) return;
                      setHarvestBrix(text);
                    }}
                    editable={!hayDatos || editMode}
                    placeholder="18.5"
                    placeholderTextColor={Theme.colors.terroirGray}
                  />
                </View>
              </View>

              {/* Trabajadores */}
              <View style={styles.metricInputGroup}>
                <View style={styles.sectionInlineHeader}>
                  <Users size={14} color={Theme.colors.terroirBrown} />
                  <Text style={styles.standardLabel}>TRABAJADORES ASIGNADOS*</Text>
                </View>

                {harvestPersonnel.length === 0 ? (
                  <Text style={styles.emptyText}>Sin personal asignado en Cosechado</Text>
                ) : (
                  harvestPersonnel.map((p: any, index: number) => {
                    const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
                    const workerName = `${p.trabajador?.first_name || 'Trabajador'} ${p.trabajador?.last_name || ''}`.trim();
                    const workerData = workerHarvestData[key] || { cantidad: '', tipoGrano: 'Rojo' };
                    const registrado = workersRegistrados.find((w: any) => w.id === key);
                    const soloLectura = hayDatos && !editMode;

                    return (
                      <View key={key} style={styles.workerCard}>
                        <View style={styles.workerHeaderRow}>
                          <View style={styles.workerAvatar}>
                            {soloLectura ? (
                              <Text style={styles.workerInitials}>{getInitials(workerName)}</Text>
                            ) : (
                              <User size={16} color={Theme.colors.terroirBrown} />
                            )}
                          </View>
                          <Text style={styles.workerName}>{workerName}</Text>
                        </View>

                        {soloLectura ? (
                          <View style={styles.workerStatsRow}>
                            <Text style={styles.workerStatText}>
                              {registrado?.cantidad_cosechada?.toFixed?.(1) ?? '0.0'} kg · {registrado?.tipo_grano ?? '—'}
                            </Text>
                            <Text style={styles.workerStatPago}>
                              ${registrado?.pago_calculado?.toFixed?.(2) ?? '0.00'}
                            </Text>
                          </View>
                        ) : (
                          <>
                            <TextInput
                              style={styles.workerInput}
                              value={workerData.cantidad}
                              onChangeText={(value) => {
                                if (value.length <= 10) {
                                  const numeric = parseFloat(value);
                                  if (!isNaN(numeric) && numeric > 100) return;
                                  updateWorkerHarvestData(key, 'cantidad', value);
                                }
                              }}
                              keyboardType="numeric"
                              placeholder="Cantidad recolectada (kg, máx. 100)"
                              placeholderTextColor={Theme.colors.terroirGray}
                            />
                            <View style={styles.grainOptions}>
                              {GRAIN_TYPES.map(type => {
                                const selected = workerData.tipoGrano === type;
                                return (
                                  <TouchableOpacity
                                    key={type}
                                    style={[styles.grainOption, selected && styles.grainOptionActive]}
                                    onPress={() => updateWorkerHarvestData(key, 'tipoGrano', type)}
                                  >
                                    <Text style={[styles.grainOptionText, selected && styles.grainOptionTextActive]}>
                                      {type}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              {/* Evidencia */}
              <View style={styles.metricInputGroup}>
                <View style={styles.sectionInlineHeader}>
                  <Camera size={14} color={Theme.colors.terroirBrown} />
                  <Text style={styles.standardLabel}>EVIDENCIA</Text>
                </View>
                {hayDatos && !editMode ? (
                  <View style={[styles.standardInputWrapper, styles.inputDisabled]}>
                    <Text numberOfLines={1} style={styles.evidenceReadonlyText}>
                      {cosechaExistente?.imagen_evidencia_uri || 'Sin imagen registrada'}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.evidencePickerButton} onPress={handlePickHarvestEvidence}>
                    <Camera size={15} color="white" />
                    <Text style={styles.evidencePickerText}>
                      {harvestEvidenceUri ? 'Cambiar imagen' : 'Seleccionar imagen'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Observaciones */}
              <View style={styles.metricInputGroup}>
                <Text style={styles.standardLabel}>OBSERVACIONES</Text>
                <View style={[styles.standardInputWrapper, styles.textareaWrapper, (hayDatos && !editMode) && styles.inputDisabled]}>
                  <TextInput
                    style={[styles.standardInput, styles.textarea]}
                    value={hayDatos && !editMode ? (cosechaExistente?.observaciones || '') : harvestObservations}
                    onChangeText={(text) => {
                      const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
                      if (wordCount <= 100) setHarvestObservations(text);
                    }}
                    editable={!hayDatos || editMode}
                    multiline
                    textAlignVertical="top"
                    placeholder="Notas técnicas de madurez, selección o incidencias..."
                    placeholderTextColor={Theme.colors.terroirGray}
                  />
                </View>
              </View>

              {/* Botón GUARDAR / FINALIZAR — visible si hay formulario activo o estamos editando */}
              {(modo === 'form' || editMode) && fechaInicio !== null || (modo === 'form' && !fechaInicio) ? null : null}
              {(modo === 'form' || editMode) && (
                <TouchableOpacity
                  style={[styles.actionButton, !fechaInicio && !hayDatos && styles.btnDisabled]}
                  onPress={handleFinalizar}
                  disabled={saving || (!fechaInicio && !hayDatos)}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.actionButtonText}>
                      {hayDatos ? 'GUARDAR ACTUALIZACIÓN' : 'GUARDAR AVANCE'}
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
  metricsCard: { marginTop: 12, borderRadius: 16, padding: 16, gap: 16 },
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
  standardInputWrapper: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48 },
  standardInput: { flex: 1, fontFamily: 'Manrope', fontSize: 13, fontWeight: '700', color: Theme.colors.terroirBrown },
  textareaWrapper: { height: 104, alignItems: 'flex-start', paddingTop: 12 },
  textarea: { textAlignVertical: 'top', height: '100%' },
  inputDisabled: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  sectionInlineHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  emptyText: { fontFamily: 'Manrope', fontSize: 12, color: Theme.colors.terroirGray, fontStyle: 'italic' },
  workerCard: { backgroundColor: 'white', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  workerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  workerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(93, 58, 44, 0.08)', justifyContent: 'center', alignItems: 'center' },
  workerInitials: { fontSize: 11, fontWeight: '800', color: Theme.colors.terroirBrown },
  workerName: { fontFamily: 'Manrope', fontSize: 13, fontWeight: '800', color: Theme.colors.terroirBrown, flex: 1 },
  workerStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workerStatText: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '700', color: Theme.colors.terroirText },
  workerStatPago: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '800', color: Theme.colors.terroirGreen },
  workerInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, height: 40, paddingHorizontal: 12, fontFamily: 'Manrope', fontSize: 12, fontWeight: '600', color: Theme.colors.terroirBrown },
  grainOptions: { flexDirection: 'row', gap: 6 },
  grainOption: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  grainOptionActive: { backgroundColor: 'rgba(62, 102, 65, 0.1)', borderColor: Theme.colors.terroirGreen },
  grainOptionText: { fontSize: 10, fontWeight: '800', color: Theme.colors.terroirGray },
  grainOptionTextActive: { color: Theme.colors.terroirGreen },
  evidenceReadonlyText: { fontFamily: 'Manrope', fontSize: 12, color: Theme.colors.terroirGray },
  evidencePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.terroirBrown, height: 44, borderRadius: 12, gap: 8 },
  evidencePickerText: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '800', color: 'white' },
  lockedBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FFE082' },
  lockedBannerTitle: { fontFamily: 'Manrope', fontSize: 13, fontWeight: '900', color: '#E65100', marginBottom: 2 },
  lockedBannerSub: { fontFamily: 'Manrope', fontSize: 12, color: '#795548', lineHeight: 17 },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  estadoLabel: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '700', color: Theme.colors.terroirGray },
  estadoBadge: { backgroundColor: '#F9FAFB', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#E5E7EB' },
  estadoBadgeText: { fontFamily: 'Manrope', fontSize: 11, fontWeight: '800', color: Theme.colors.terroirGray, letterSpacing: 0.5 },
  actionButton: { width: '100%', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4, backgroundColor: Theme.colors.terroirGreen, shadowColor: Theme.colors.terroirGreen, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  actionButtonText: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '800', color: 'white', letterSpacing: 1 },
});

export default EtapaCosechaScreen;