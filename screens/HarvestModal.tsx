// components/HarvestModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import {
  X, Users, User, Camera, ClipboardCheck, Calendar,
  CheckCircle, Lock, AlertCircle,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Theme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { asignacionPersonalService, cosechaService } from '../services/cosecha.service';
import { CustomAlert } from '../components/GlobalAlert';
const DateTimePicker = require('@react-native-community/datetimepicker').default;

// ─── Constantes ───────────────────────────────────────────────────────────────

const GRAIN_TYPES = ['Verde', 'Rojo', 'Variado'];

/** Valor exacto del rol en la BD / JWT */
const ROL_TECNICO = 'tecnico_sembrado';

/** Valor exacto del estado_lote cuando no hay cosecha aún */
const ESTADO_EN_PRODUCCION = 'en_produccion';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CosechaRegistrada {
  id: string;
  lote_id: string;
  responsable_id?: string;
  grados_brix: number;
  peso_kilos: number;
  calidad_cosecha?: string;
  tarifa_por_kilo?: number;
  imagen_evidencia_uri?: string;
  observaciones?: string;
  fecha_inicio: string;
  fecha_final?: string;
  duracion_horas?: number;
}

interface WorkerResumen {
  id: string;
  nombre: string;
  cantidad_cosechada: number;
  tipo_grano: string;
  pago_calculado: number;
}

interface HarvestModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loteId: string;
  harvestPersonnel: any[];
  assignedPersonnel: any[];
  rolesMap: Record<string, string>;
  navigation: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return 'media';
};

const getCalidadGeneral = (workers: { brix: number; tipoGrano: string }[]): 'alta' | 'media' | 'baja' => {
  const counts = { alta: 0, media: 0, baja: 0 };
  workers.forEach(w => { counts[getCalidadByCosecha(w.brix, w.tipoGrano)]++; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as 'alta' | 'media' | 'baja';
};

const getCalidadColor = (calidad?: string) => {
  switch (calidad?.toLowerCase()) {
    case 'alta':  return Theme.colors.primary;
    case 'media': return '#E6A817';
    case 'baja':  return Theme.colors.error;
    default:      return Theme.colors.outline;
  }
};

const getGrainColor = (tipo: string) => {
  switch (tipo) {
    case 'Rojo':    return { bg: '#FDECEA', text: '#C62828' };
    case 'Verde':   return { bg: '#E8F5E9', text: '#2E7D32' };
    case 'Variado': return { bg: '#FFF8E1', text: '#E65100' };
    default:        return { bg: Theme.colors.surfaceContainerLow, text: Theme.colors.onSurfaceVariant };
  }
};

const getInitials = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('');

// ─── Sub-componente: Vista de solo lectura ───────────────────────────────────
// Se usa en DOS casos:
//   1. Cosecha ya registrada → muestra datos reales
//   2. Lote en producción, usuario sin permiso → muestra estado vacío

interface HarvestReadOnlyViewProps {
  cosecha: CosechaRegistrada | null;   // null = sin cosecha aún
  workers: WorkerResumen[];
  isTecnico: boolean;                   // true = es técnico pero aún no hay cosecha (nunca debería llegar aquí, pero por si acaso)
  onClose: () => void;
}

const HarvestReadOnlyView = ({
  cosecha,
  workers,
  isTecnico,
  onClose,
}: HarvestReadOnlyViewProps) => {
  const hayDatos = cosecha !== null;
  const calidad = cosecha?.calidad_cosecha;
  const calidadColor = getCalidadColor(calidad);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.harvestModalOverlay}>
        <View style={styles.harvestModalCard}>

          {/* Header */}
          <View style={styles.harvestModalHeader}>
            <View>
              <Text style={[
                styles.harvestEyebrow,
                { color: hayDatos ? Theme.colors.primary : Theme.colors.outline },
              ]}>
                {hayDatos ? '✓ COSECHA REGISTRADA' : 'CIERRE DE FASE'}
              </Text>
              <Text style={styles.harvestModalTitle}>Cosechado Selectivo</Text>
            </View>
            <TouchableOpacity style={styles.harvestCloseButton} onPress={onClose}>
              <X size={20} color={Theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.harvestModalBody}
          >

            {/* Banner de estado */}
            {hayDatos ? (
              /* ── Cosecha registrada ── */
              <View style={styles.detailTopRow}>
                <View style={styles.registeredBadge}>
                  <CheckCircle size={13} color={Theme.colors.primary} />
                  <Text style={styles.registeredBadgeText}>Fase cerrada</Text>
                </View>
                {cosecha?.fecha_final && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Calendar size={13} color={Theme.colors.outline} />
                    <Text style={styles.detailDateText}>{cosecha.fecha_final}</Text>
                  </View>
                )}
              </View>
            ) : (
              /* ── Sin cosecha aún: usuario sin permiso ── */
              <View style={styles.lockedBanner}>
                <Lock size={15} color="#E6A817" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedBannerTitle}>Acceso restringido</Text>
                  <Text style={styles.lockedBannerSub}>
                    Solo el técnico asignado puede registrar la cosecha de este lote.
                  </Text>
                </View>
              </View>
            )}

            {/* Estado del lote cuando no hay cosecha */}
            {!hayDatos && (
              <View style={styles.estadoRow}>
                <AlertCircle size={14} color={Theme.colors.outline} />
                <Text style={styles.estadoLabel}>Estado del lote:</Text>
                <View style={styles.estadoBadge}>
                  <Text style={styles.estadoBadgeText}>{ESTADO_EN_PRODUCCION}</Text>
                </View>
              </View>
            )}

            {/* Métricas principales */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Grados Brix</Text>
                <Text style={[styles.metricValue, !hayDatos && styles.metricEmpty]}>
                  {hayDatos ? cosecha!.grados_brix : '—'}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Peso total</Text>
                <Text style={[styles.metricValue, !hayDatos && styles.metricEmpty]}>
                  {hayDatos ? `${cosecha!.peso_kilos.toFixed(1)} kg` : '—'}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Calidad</Text>
                <Text style={[
                  styles.metricValue,
                  hayDatos
                    ? { color: calidadColor, fontSize: 16 }
                    : styles.metricEmpty,
                ]}>
                  {hayDatos && calidad
                    ? calidad.charAt(0).toUpperCase() + calidad.slice(1)
                    : '—'}
                </Text>
              </View>
              {hayDatos && cosecha!.tarifa_por_kilo !== undefined && (
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Tarifa/kg</Text>
                  <Text style={[styles.metricValue, { color: Theme.colors.primary }]}>
                    ${cosecha!.tarifa_por_kilo.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Fecha si hay cosecha */}
            {hayDatos && cosecha!.fecha_final && (
              <View style={styles.harvestFieldRow}>
                <View style={styles.harvestFieldHalf}>
                  <Text style={styles.harvestLabel}>Fecha de cosecha</Text>
                  <View style={[styles.harvestInput, styles.readonlyField]}>
                    <Calendar size={14} color={Theme.colors.outline} />
                    <Text style={styles.readonlyText}>{cosecha!.fecha_final}</Text>
                  </View>
                </View>
                {cosecha!.duracion_horas && (
                  <View style={styles.harvestFieldHalf}>
                    <Text style={styles.harvestLabel}>Duración</Text>
                    <View style={[styles.harvestInput, styles.readonlyField]}>
                      <Text style={styles.readonlyText}>{cosecha!.duracion_horas} h</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={styles.divider} />

            {/* Trabajadores */}
            <View style={styles.harvestSectionHeader}>
              <Users size={15} color={Theme.colors.primary} />
              <Text style={styles.harvestSectionTitle}>Trabajadores</Text>
            </View>

            {!hayDatos ? (
              /* Sin cosecha: mostrar lista sin datos de producción */
              workers.length === 0 ? (
                <View style={styles.harvestEmptyWorkers}>
                  <Text style={styles.harvestEmptyTitle}>Sin trabajadores asignados</Text>
                </View>
              ) : (
                workers.map(w => (
                  <View key={w.id} style={[styles.harvestWorkerCard, styles.workerCardLocked]}>
                    <View style={styles.harvestWorkerHeader}>
                      <View style={styles.harvestWorkerAvatar}>
                        <Text style={styles.workerInitialsText}>{getInitials(w.nombre)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.harvestWorkerName}>{w.nombre}</Text>
                        <Text style={styles.harvestWorkerRole}>Recolector técnico</Text>
                      </View>
                      <Lock size={14} color={Theme.colors.outline} />
                    </View>
                    <View style={styles.workerStatsRow}>
                      {(['Cantidad', 'Tipo grano', 'Pago'] as const).map(label => (
                        <View key={label} style={styles.workerStatBox}>
                          <Text style={styles.workerStatLabel}>{label}</Text>
                          <Text style={[styles.workerStatValue, styles.metricEmpty]}>—</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )
            ) : (
              /* Con cosecha: mostrar datos reales */
              workers.length === 0 ? (
                <View style={styles.harvestEmptyWorkers}>
                  <Text style={styles.harvestEmptyTitle}>Sin datos de trabajadores</Text>
                </View>
              ) : (
                workers.map(w => {
                  const grainColor = getGrainColor(w.tipo_grano);
                  return (
                    <View key={w.id} style={styles.harvestWorkerCard}>
                      <View style={styles.harvestWorkerHeader}>
                        <View style={styles.harvestWorkerAvatar}>
                          <Text style={styles.workerInitialsText}>{getInitials(w.nombre)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.harvestWorkerName}>{w.nombre}</Text>
                          <Text style={styles.harvestWorkerRole}>Recolector técnico</Text>
                        </View>
                      </View>
                      <View style={styles.workerStatsRow}>
                        <View style={styles.workerStatBox}>
                          <Text style={styles.workerStatLabel}>Cantidad</Text>
                          <Text style={styles.workerStatValue}>{w.cantidad_cosechada.toFixed(1)} kg</Text>
                        </View>
                        <View style={styles.workerStatBox}>
                          <Text style={styles.workerStatLabel}>Tipo grano</Text>
                          <View style={[styles.grainBadge, { backgroundColor: grainColor.bg }]}>
                            <Text style={[styles.grainBadgeText, { color: grainColor.text }]}>
                              {w.tipo_grano}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.workerStatBox}>
                          <Text style={styles.workerStatLabel}>Pago</Text>
                          <Text style={[styles.workerStatValue, { color: Theme.colors.primary }]}>
                            ${w.pago_calculado.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )
            )}

            {/* Evidencia y observaciones (solo si hay cosecha) */}
            {hayDatos && (
              <>
                <View style={styles.divider} />

                {cosecha!.imagen_evidencia_uri ? (
                  <>
                    <View style={styles.harvestSectionHeader}>
                      <Camera size={15} color={Theme.colors.primary} />
                      <Text style={styles.harvestSectionTitle}>Evidencia</Text>
                    </View>
                    <View style={[styles.harvestInput, {
                      justifyContent: 'center',
                      backgroundColor: Theme.colors.secondaryContainer,
                    }]}>
                      <Text
                        numberOfLines={1}
                        style={{ color: Theme.colors.secondary, fontSize: 12, fontWeight: '600' }}
                      >
                        {cosecha!.imagen_evidencia_uri}
                      </Text>
                    </View>
                  </>
                ) : null}

                {cosecha!.observaciones ? (
                  <View style={styles.harvestField}>
                    <Text style={styles.harvestLabel}>Observaciones</Text>
                    <View style={[styles.harvestInput, styles.harvestTextarea, { justifyContent: 'flex-start', paddingTop: 14 }]}>
                      <Text style={{ color: Theme.colors.onSurface, fontSize: 14, lineHeight: 20 }}>
                        {cosecha!.observaciones}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </>
            )}

          </ScrollView>

          <View style={styles.harvestModalActions}>
            <TouchableOpacity style={[styles.harvestConfirmButton, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.harvestConfirmText}>Cerrar</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const HarvestModal = ({
  visible,
  onClose,
  onSuccess,
  loteId,
  harvestPersonnel,
  assignedPersonnel,
  rolesMap,
  navigation,
}: HarvestModalProps) => {

  // ── Usuario autenticado desde Zustand ──
  const { role, userId } = useAuthStore();

  // ── Estado de carga y datos ──
  const [loadingCosecha, setLoadingCosecha] = useState(false);
  const [cosechaExistente, setCosechaExistente] = useState<CosechaRegistrada | null>(null);
  const [workersRegistrados, setWorkersRegistrados] = useState<WorkerResumen[]>([]);
  const [modoResueltO, setModoResuelto] = useState<'loading' | 'form' | 'readonly_cosecha' | 'readonly_nopermiso'>('loading');

  // ── Estado del formulario ──
  const [harvestBrix, setHarvestBrix] = useState('');
  const [harvestEvidenceUri, setHarvestEvidenceUri] = useState('');
  const [harvestObservations, setHarvestObservations] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [harvestDuration, setHarvestDuration] = useState('');
const [workerHarvestData, setWorkerHarvestData] = useState(
  {} as Record<string, { cantidad: string; tipoGrano: string }>
);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // ── Resolución de modo al abrir ──────────────────────────────────────────
  useEffect(() => {
    if (!visible || !loteId) return;

    const resolver = async () => {
      setModoResuelto('loading');

      try {
        // 1. ¿Hay cosecha registrada?
        const cosecha = await cosechaService.getByLoteId(loteId);

        // Construir resumen de trabajadores (sirve para ambos modos de lectura)
        const resumen: WorkerResumen[] = harvestPersonnel.map((p, index) => ({
          id: p.id || p.trabajador_id || p.trabajador?.id || String(index),
          nombre: `${p.trabajador?.first_name || 'Trabajador'} ${p.trabajador?.last_name || ''}`.trim(),
          cantidad_cosechada: p.cantidad_cosechada ?? 0,
          tipo_grano: p.tipo_grano ?? 'Rojo',
          pago_calculado: p.pago_calculado ?? 0,
        }));
        setWorkersRegistrados(resumen);

        if (cosecha) {
          // Cosecha ya existe → solo lectura con datos, sin importar el rol
          setCosechaExistente(cosecha);
          setModoResuelto('readonly_cosecha');
          return;
        }

        // 2. Sin cosecha: verificar si el usuario es técnico asignado al lote
        //    El técnico está en asignacion_personal con etapa 'Cosechado' o cualquier etapa
        //    Lo identificamos: role === ROL_TECNICO Y tiene entrada en harvestPersonnel
        //    (harvestPersonnel ya viene filtrado por loteId desde el padre)
        //
        //    Nota: asignacion_personal.trabajador_id → personal.id (tabla local)
        //    userId del store → users.id (tabla remota)
        //    Para relacionarlos necesitamos que el padre pase el userId del técnico,
        //    o comparar por el responsable_id de la asignación si existe.
        //    La forma más directa disponible: role === ROL_TECNICO implica que
        //    el usuario logueado ES un técnico; verificamos que esté asignado
        //    buscando su userId en assignedPersonnel como responsable o en el lote.

        const esTecnico = role === ROL_TECNICO;

        if (!esTecnico) {
          // Otro rol (admin, capataz, etc.) → solo lectura con lote en producción
          setCosechaExistente(null);
          setModoResuelto('readonly_nopermiso');
          return;
        }

        // Es técnico: verificar que esté asignado específicamente a este lote.
        // Revisamos si hay alguna entrada en assignedPersonnel que mapee al userId actual.
        // Como el link personal.id ↔ users.id no está explícito en la BD local,
        // usamos la heurística: si role === ROL_TECNICO y hay harvestPersonnel en
        // este lote, asumimos que es el técnico del lote (un técnico solo gestiona
        // sus propios lotes en la UI). Si quieres validación estricta, pasa
        // `tecnicoUserId` como prop desde el padre.
        const hayPersonalAsignado = harvestPersonnel.length > 0 || assignedPersonnel.length > 0;

        if (!hayPersonalAsignado) {
          // Técnico pero sin asignación en este lote → sin permiso
          setCosechaExistente(null);
          setModoResuelto('readonly_nopermiso');
          return;
        }

        // Técnico asignado, sin cosecha → mostrar formulario
        setCosechaExistente(null);
        setModoResuelto('form');

      } catch (err) {
        console.error('HarvestModal resolver error:', err);
        setCosechaExistente(null);
        setModoResuelto('readonly_nopermiso');
      }
    };

    resolver();
  }, [visible, loteId, role]);

  // ── Reset ────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setHarvestBrix('');
    setHarvestEvidenceUri('');
    setHarvestObservations('');
    setHarvestDate(new Date().toISOString().slice(0, 10));
    setHarvestDuration('');
    setWorkerHarvestData({});
    setShowDatePicker(false);
    setSelectedDate(new Date());
    setCosechaExistente(null);
    setWorkersRegistrados([]);
    setModoResuelto('loading');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Render: loading ──────────────────────────────────────────────────────

  if (!visible) return null;

  if (modoResueltO === 'loading') {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
        <View style={[styles.harvestModalOverlay, styles.centerContent]}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      </Modal>
    );
  }

  // ── Render: solo lectura (cosecha existente O sin permiso) ───────────────

  if (modoResueltO === 'readonly_cosecha' || modoResueltO === 'readonly_nopermiso') {
    return (
      <HarvestReadOnlyView
        cosecha={cosechaExistente}
        workers={workersRegistrados}
        isTecnico={role === ROL_TECNICO}
        onClose={handleClose}
      />
    );
  }

  // ── Helpers del formulario ───────────────────────────────────────────────

  const updateWorkerHarvestData = (
  id: string,
  field: 'cantidad' | 'tipoGrano',
  value: string,
) => {
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
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setHarvestEvidenceUri(result.assets[0].uri);
      }
    } catch {
      CustomAlert.show('ERROR', 'Error', 'No se pudo seleccionar la imagen de evidencia.');
    }
  };

  const handleConfirmHarvest = async () => {
    // Validaciones
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

    const hasExceededLimit = harvestPersonnel.some((p, index) => {
      const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
      return Number(workerHarvestData[key]?.cantidad) > 100;
    });

    if (hasExceededLimit) {
      CustomAlert.show('ALERTA', 'Límite Excedido', 'Ningún trabajador puede registrar más de 100 kg.');
      return;
    }

    if (!harvestDate.trim()) {
      CustomAlert.show('ALERTA', 'Fecha Requerida', 'Selecciona la fecha de la cosecha.');
      return;
    }

    if (harvestPersonnel.length === 0) {
      CustomAlert.show('ALERTA', 'Sin Personal', 'No hay trabajadores asignados a la etapa de cosecha.');
      return;
    }

    const brixValue = parseFloat(harvestBrix);
    if (brixValue < 1 || brixValue > 30) {
      CustomAlert.show('ALERTA', 'Grados Brix Inválidos', 'Los grados Brix deben estar entre 1 y 30.');
      return;
    }

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
    const tarifaGeneral = pesoTotal > 0
      ? workersResumen.reduce((sum, w) => sum + w.tarifa * w.cantidad, 0) / pesoTotal
      : 0.25;

    const cosechaData = {
      id: `cosecha_${Date.now()}`,
      lote_id: loteId,
      // userId del store coincide con users.id = responsable_id en cosecha
      responsable_id: userId ?? '',
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
      handleClose();

      await Promise.all(
        harvestPersonnel.map((p, index) => {
          const key = p.id || p.trabajador_id || p.trabajador?.id || String(index);
          const resumen = workersResumen.find(w => w.key === key);
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
        onSuccess();
        navigation.navigate('Lotes');
      });
    } catch {
      CustomAlert.show('ERROR', 'Error', 'Fallo al guardar la cosecha.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render: formulario (técnico asignado, sin cosecha) ───────────────────

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.harvestModalOverlay}>
        <View style={styles.harvestModalCard}>

          <View style={styles.harvestModalHeader}>
            <View>
              <Text style={styles.harvestEyebrow}>CIERRE DE FASE</Text>
              <Text style={styles.harvestModalTitle}>Cosechado Selectivo</Text>
            </View>
            <TouchableOpacity style={styles.harvestCloseButton} onPress={handleClose}>
              <X size={20} color={Theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.harvestModalBody}>

            {/* Brix + Fecha */}
            <View style={styles.harvestFieldRow}>
              <View style={styles.harvestFieldHalf}>
                <Text style={styles.harvestLabel}>Grados Brix *</Text>
                <TextInput
                  style={styles.harvestInput}
                  value={harvestBrix}
                  onChangeText={(text) => { if (text.length <= 10) setHarvestBrix(text); }}
                  keyboardType="numeric"
                  placeholder="18.5"
                  maxLength={10}
                  placeholderTextColor={Theme.colors.outline}
                />
              </View>
              <View style={styles.harvestFieldHalf}>
                <Text style={styles.harvestLabel}>Fecha *</Text>
                <TouchableOpacity
                  style={[styles.harvestInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
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

            {/* Trabajadores */}
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
                        if (value.length <= 10) {
                          const numeric = parseFloat(value);
                          if (!isNaN(numeric) && numeric > 100) return;
                          updateWorkerHarvestData(key, 'cantidad', value);
                        }
                      }}
                      keyboardType="numeric"
                      placeholder="0.00 (máx. 100 kg)"
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
                            <Text style={[styles.grainOptionText, selected && styles.grainOptionTextActive]}>
                              {type}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}

            {/* Evidencia */}
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
              <View style={[styles.harvestInput, styles.evidenceInput, {
                justifyContent: 'center',
                backgroundColor: harvestEvidenceUri
                  ? Theme.colors.secondaryContainer
                  : Theme.colors.surfaceContainerHigh,
              }]}>
                <Text numberOfLines={1} style={{
                  color: harvestEvidenceUri ? Theme.colors.secondary : Theme.colors.outline,
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                  {harvestEvidenceUri || 'Sin imagen seleccionada'}
                </Text>
              </View>
            </View>

            {/* Observaciones */}
            <View style={styles.harvestField}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.harvestLabel}>Observaciones</Text>
                <Text style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: harvestObservations.trim().split(/\s+/).filter(Boolean).length >= 100
                    ? Theme.colors.error
                    : Theme.colors.outline,
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
            <TouchableOpacity style={styles.harvestCancelButton} onPress={handleClose}>
              <Text style={styles.harvestCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.harvestConfirmButton, loading && { opacity: 0.6 }]}
              onPress={handleConfirmHarvest}
              disabled={loading}
            >
              <ClipboardCheck size={16} color={Theme.colors.white} />
              <Text style={styles.harvestConfirmText}>Registrar cierre</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Overlay y card
  harvestModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 27, 20, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  centerContent: {
    alignItems: 'center',
  },
  harvestModalCard: {
    maxHeight: '88%',
    backgroundColor: Theme.colors.background,
    borderRadius: 28,
    overflow: 'hidden',
    ...Theme.shadows.ambient,
  },

  // Header
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

  // Body
  harvestModalBody: { padding: 22, gap: 16 },
  harvestField: { gap: 8 },
  harvestFieldRow: { flexDirection: 'row', gap: 12 },
  harvestFieldHalf: { flex: 1, gap: 8 },

  // Inputs
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

  // Sección
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

  // Trabajadores vacíos
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

  // Tarjeta trabajador
  harvestWorkerCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.surfaceContainerHigh,
  },
  workerCardLocked: {
    opacity: 0.7,
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
  workerInitialsText: {
    fontSize: 14,
    fontWeight: '900',
    color: Theme.colors.primary,
  },
  harvestWorkerName: { fontSize: 15, fontWeight: '900', color: Theme.colors.onSurface },
  harvestWorkerRole: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Stats trabajadores (vista detalle)
  workerStatsRow: { flexDirection: 'row', gap: 8 },
  workerStatBox: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceContainerHigh,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  workerStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workerStatValue: {
    fontSize: 13,
    fontWeight: '900',
    color: Theme.colors.onSurface,
  },

  // Grain selector (formulario)
  grainOptions: { flexDirection: 'row', gap: 8 },
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
  grainOptionText: { fontSize: 11, fontWeight: '800', color: Theme.colors.onSurfaceVariant },
  grainOptionTextActive: { color: Theme.colors.secondary },

  // Grain badge (vista detalle)
  grainBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    marginTop: 2,
  },
  grainBadgeText: { fontSize: 11, fontWeight: '800' },

  // Evidencia
  evidenceBox: {
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.surfaceContainerHigh,
  },
  evidenceTitle: { fontSize: 13, fontWeight: '800', color: Theme.colors.onSurfaceVariant },
  evidencePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
  },
  evidencePickerText: { fontSize: 12, fontWeight: '900', color: Theme.colors.white },
  evidenceInput: { width: '100%' },

  // Acciones
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
  harvestCancelText: { fontSize: 13, fontWeight: '900', color: Theme.colors.onSurfaceVariant },
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
  harvestConfirmText: { fontSize: 13, fontWeight: '900', color: Theme.colors.white },

  // ── Estilos exclusivos de la vista de solo lectura ──

  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  registeredBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  detailDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  lockedBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E65100',
    marginBottom: 2,
  },
  lockedBannerSub: {
    fontSize: 12,
    color: '#795548',
    lineHeight: 17,
  },
  estadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  estadoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.outline,
  },
  estadoBadge: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Theme.colors.surfaceContainerHigh,
  },
  estadoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.colors.onSurface,
  },
  metricEmpty: {
    color: Theme.colors.outline,
    fontSize: 18,
  },
  readonlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.surfaceContainerLow,
  },
  readonlyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.surfaceContainerHigh,
  },
});