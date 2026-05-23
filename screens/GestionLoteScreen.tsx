import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {
  Boxes,
  ChevronDown,
  Info,
  Leaf,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { parcelasService, semillasService } from '../services';
import { db } from '../db';
import { lotes, EstadoLoteValues } from '../db/schema';
import { eq } from 'drizzle-orm';

const InputField = ({ label, value, onChangeText, placeholder, keyboardType, suffix, error, styles }: any) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Theme.colors.outline}
        keyboardType={keyboardType}
      />
      {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const GestionLoteScreen = ({ navigation, route }: any) => {
  const { parcelaId, id: loteId } = route.params || {};
  const isEditing = !!loteId;

  const [codigo, setCodigo] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [variedadCafe, setVariedadCafe] = useState('');
  const [semillaId, setSemillaId] = useState('');
  const [estado, setEstado] = useState<typeof EstadoLoteValues[number]>('Reservado');
  const [semillas, setSemillas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
    navigation.setOptions({
      title: isEditing ? 'Editar Lote' : 'Nuevo Lote'
    });
  }, [loteId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Load seeds for selection
      const seeds = await semillasService.getAll();
      setSemillas(seeds);

      if (isEditing) {
        const lote = await parcelasService.getLoteById(loteId);
        if (lote) {
          setCodigo(lote.codigo);
          setHectareas(lote.hectareas_lote?.toString() || '');
          setVariedadCafe(lote.variedadCafe || '');
          setSemillaId(lote.semilla_id);
          setEstado(lote.estado_lote as any);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Fallo al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!codigo || !hectareas || !semillaId) {
      Alert.alert('Incompleto', 'Por favor rellene los campos obligatorios.');
      return;
    }

    try {
      setLoading(true);
      const data = {
        codigo,
        parcela_id: parcelaId,
        semilla_id: semillaId,
        hectareas_lote: parseFloat(hectareas),
        variedadCafe: variedadCafe,
        estado_lote: estado,
      };

      if (isEditing) {
        await parcelasService.updateLote(loteId, data);
        Alert.alert('Éxito', 'Lote actualizado.');
      } else {
        await parcelasService.createLote(data);
        Alert.alert('Éxito', 'Lote registrado.');
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Fallo al guardar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Boxes size={24} color={Theme.colors.primary} />
            <Text style={styles.title}>{isEditing ? 'Editar Lote' : 'Configurar Lote'}</Text>
          </View>

          <View style={styles.card}>
            <InputField
              label="Código de Lote"
              value={codigo}
              onChangeText={setCodigo}
              placeholder="Ej: L-001"
              styles={styles}
            />

            <InputField
              label="Hectáreas"
              value={hectareas}
              onChangeText={setHectareas}
              placeholder="0.0"
              keyboardType="numeric"
              suffix="ha"
              styles={styles}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Semilla / Variedad</Text>
              <View style={styles.pickerWrapper}>
                {semillas.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.pickerItem, semillaId === s.id && styles.pickerItemActive]}
                    onPress={() => {
                      setSemillaId(s.id);
                      setVariedadCafe(s.variedad);
                    }}
                  >
                    <Leaf size={14} color={semillaId === s.id ? Theme.colors.white : Theme.colors.outline} />
                    <Text style={[styles.pickerText, semillaId === s.id && styles.pickerTextActive]}>
                      {s.variedad}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Estado del Lote</Text>
              <View style={styles.segmentedControl}>
                {EstadoLoteValues.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.segmentButton, estado === v && styles.segmentButtonActive]}
                    onPress={() => setEstado(v as any)}
                  >
                    <Text style={[styles.segmentText, estado === v && styles.segmentTextActive]}>
                      {v.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'PROCESANDO...' : isEditing ? 'ACTUALIZAR LOTE' : 'CREAR LOTE'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { padding: Theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Theme.spacing.xl },
  title: { ...Theme.typography.display, fontSize: 24, color: Theme.colors.primary },
  card: { backgroundColor: Theme.colors.white, borderRadius: Theme.roundness.xl, padding: Theme.spacing.lg, ...Theme.shadows.ambient },
  inputContainer: { marginBottom: Theme.spacing.md },
  inputLabel: { ...Theme.typography.labelSm, marginBottom: 8, color: Theme.colors.onSurfaceVariant },
  inputWrapper: { backgroundColor: Theme.colors.white, borderWidth: 1, borderColor: Theme.colors.outlineVariant, borderRadius: Theme.roundness.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Theme.spacing.md, height: 48 },
  input: { ...Theme.typography.body, flex: 1, color: Theme.colors.onSurface },
  inputSuffix: { ...Theme.typography.labelSm, color: Theme.colors.outline, marginLeft: Theme.spacing.sm },
  errorText: { ...Theme.typography.labelSm, color: Theme.colors.error, fontSize: 10, marginTop: 4 },
  pickerWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Theme.roundness.full, borderWidth: 1, borderColor: Theme.colors.outlineVariant, backgroundColor: Theme.colors.surfaceContainerLowest },
  pickerItemActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  pickerText: { ...Theme.typography.labelSm, color: Theme.colors.onSurfaceVariant },
  pickerTextActive: { color: Theme.colors.white, fontWeight: '700' },
  segmentedControl: { flexDirection: 'row', backgroundColor: Theme.colors.surfaceContainerHighest, borderRadius: Theme.roundness.md, padding: 4 },
  segmentButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Theme.roundness.sm },
  segmentButtonActive: { backgroundColor: Theme.colors.primary },
  segmentText: { ...Theme.typography.labelSm, color: Theme.colors.onSurfaceVariant, fontSize: 10 },
  segmentTextActive: { color: Theme.colors.white },
  primaryButton: { backgroundColor: Theme.colors.primary, paddingVertical: 18, borderRadius: Theme.roundness.xxl, alignItems: 'center', marginTop: Theme.spacing.xl, ...Theme.shadows.ambient },
  primaryButtonText: { ...Theme.typography.body, color: Theme.colors.white, fontWeight: '800', letterSpacing: 1 },
});

export default GestionLoteScreen;
