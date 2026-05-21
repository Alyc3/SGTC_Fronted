import React, { useState } from 'react';
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
  StatusBar
} from 'react-native';
import {
  MapPin,
  Mountain,
  Compass,
  CheckCircle2,
  X
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { Theme } from '../theme';
import { parcelasService } from '../services';
import {
  TexturaSueloValues,
  OrientacionLaderaValues,
  TipoTerrenoValues
} from '../db/schema';

const GestionParcelaScreen = ({ navigation }: any) => {
  const [codigo, setCodigo] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [altitud, setAltitud] = useState('');
  const [phSuelo, setPhSuelo] = useState(6.5);
  const [tipoTerreno, setTipoTerreno] = useState<typeof TipoTerrenoValues[number]>('Irregular');
  const [orientacion, setOrientacion] = useState<typeof OrientacionLaderaValues[number]>('NORTE');
  const [textura, setTextura] = useState<typeof TexturaSueloValues[number]>('Franco-Arenosa');
  const [gpsLocation, setGpsLocation] = useState('Pendiente calibración');
  const [loading, setLoading] = useState(false);

  const handleGPS = () => {
    setGpsLocation('Lat: 4.5N, Lng: -75.9W');
    Alert.alert('GPS Calibrado', 'Ubicación capturada con éxito.');
  };

  const handleSave = async () => {
    if (!codigo || !hectareas || !altitud) {
      Alert.alert('Campos Incompletos', 'Por favor, complete el código, extensión y altitud.');
      return;
    }
    try {
      setLoading(true);
      await parcelasService.create({
        codigo,
        hectareas: parseFloat(hectareas),
        ubicacion: gpsLocation !== 'Pendiente calibración' ? gpsLocation : 'N/A',
        phSuelo,
        textura,
        altitudMsnm: parseInt(altitud, 10),
        orientacionLadera: orientacion,
        tipoTerreno,
        estado: 'Libre'
      });
      Alert.alert('Éxito', 'Parcela registrada.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', 'Fallo al guardar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.primaryContainer} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerLabel}>MODULO 1</Text>
            <Text style={styles.title}>Registro de Parcela</Text>
            <Text style={styles.headerDescription}>Definición topográfica y de suelo.</Text>
            <View style={styles.accentBar} />
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de Identificación</Text>
              <TextInput style={styles.input} placeholder="Ej. PAR-001" placeholderTextColor={Theme.colors.outline} value={codigo} onChangeText={setCodigo} autoCapitalize="characters" />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Theme.spacing.sm }]}>
                <Text style={styles.label}>Extensión (ha)</Text>
                <View style={styles.inputWithSuffix}>
                  <TextInput style={styles.inputNoBorder} placeholder="0.0" keyboardType="numeric" value={hectareas} onChangeText={setHectareas} />
                  <Text style={styles.suffix}>ha</Text>
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: Theme.spacing.sm }]}>
                <Text style={styles.label}>Altitud (msnm)</Text>
                <View style={styles.inputWithSuffix}>
                  <TextInput style={styles.inputNoBorder} placeholder="1800" keyboardType="numeric" value={altitud} onChangeText={setAltitud} />
                  <Text style={styles.suffix}>m</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitleAlt}>Geometría y Terreno</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Tipo de Terreno</Text>
            <View style={styles.toggleGroup}>
              {TipoTerrenoValues.map((tipo) => (
                <TouchableOpacity key={tipo} style={[styles.toggleButton, tipoTerreno === tipo && styles.toggleButtonActive]} onPress={() => setTipoTerreno(tipo)}>
                  <Text style={[styles.toggleText, tipoTerreno === tipo && styles.toggleTextActive]}>{tipo}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitleAlt}>Localización</Text>
          <View style={styles.gpsCard}>
            <View style={styles.gpsInfo}>
              <CheckCircle2 size={24} color={gpsLocation !== 'Pendiente calibración' ? Theme.colors.secondary : Theme.colors.outline} />
              <View style={{ marginLeft: Theme.spacing.sm }}>
                <Text style={styles.gpsStatus}>{gpsLocation !== 'Pendiente calibración' ? 'GPS Calibrado' : 'Sin Señal'}</Text>
                <Text style={styles.gpsCoords}>{gpsLocation}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.gpsButton} onPress={handleGPS}>
              <MapPin size={18} color={Theme.colors.primary} />
              <Text style={styles.gpsButtonText}>Calibrar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Guardando...' : 'Crear Nueva Parcela'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { padding: Theme.spacing.lg, paddingBottom: 40 },
  header: { marginBottom: Theme.spacing.md },
  headerLabel: { ...Theme.typography.label, fontSize: 10, letterSpacing: 2, color: Theme.colors.primary },
  title: { ...Theme.typography.display, fontSize: 32, lineHeight: 38, marginBottom: Theme.spacing.sm, color: Theme.colors.primary },
  headerDescription: { ...Theme.typography.body, fontSize: 14, color: Theme.colors.onSurfaceVariant, lineHeight: 20 },
  accentBar: { height: 4, backgroundColor: Theme.colors.primary, width: 60, marginTop: Theme.spacing.md, borderRadius: 2 },
  sectionTitleAlt: { ...Theme.typography.headline, fontSize: 20, color: Theme.colors.onSurface, marginBottom: Theme.spacing.sm, marginTop: Theme.spacing.lg },
  card: { backgroundColor: Theme.colors.surfaceContainerLow, borderRadius: Theme.roundness.lg, padding: Theme.spacing.lg, marginBottom: Theme.spacing.md },
  inputGroup: { marginBottom: Theme.spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...Theme.typography.label, fontSize: 11, color: Theme.colors.onSurfaceVariant, marginBottom: 6, textTransform: 'uppercase' },
  input: { ...Theme.typography.body, backgroundColor: Theme.colors.surfaceContainerLowest, borderRadius: Theme.roundness.md, padding: Theme.spacing.md, color: Theme.colors.onSurface, borderWidth: 1, borderColor: Theme.colors.outlineVariant },
  inputWithSuffix: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surfaceContainerLowest, borderRadius: Theme.roundness.md, paddingHorizontal: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.outlineVariant },
  inputNoBorder: { ...Theme.typography.body, flex: 1, paddingVertical: 12, color: Theme.colors.onSurface },
  suffix: { ...Theme.typography.body, color: Theme.colors.outline, marginLeft: 8 },
  toggleGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggleButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Theme.roundness.md, borderWidth: 1, borderColor: Theme.colors.outlineVariant },
  toggleButtonActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  toggleText: { ...Theme.typography.label, fontSize: 13, color: Theme.colors.onSurfaceVariant },
  toggleTextActive: { color: Theme.colors.onPrimary, fontWeight: '700' },
  gpsCard: { backgroundColor: Theme.colors.surfaceContainerLowest, borderRadius: Theme.roundness.lg, padding: Theme.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.xl, ...Theme.shadows.ambient },
  gpsInfo: { flexDirection: 'row', alignItems: 'center' },
  gpsStatus: { ...Theme.typography.body, fontSize: 14, fontWeight: '700', color: Theme.colors.onSurface },
  gpsCoords: { ...Theme.typography.label, fontSize: 12, color: Theme.colors.outline, marginTop: 2 },
  gpsButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surfaceContainerLow, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Theme.roundness.md, gap: 6 },
  gpsButtonText: { ...Theme.typography.label, fontWeight: '700', color: Theme.colors.primary },
  primaryButton: { backgroundColor: Theme.colors.primary, paddingVertical: 18, borderRadius: Theme.roundness.full, alignItems: 'center', ...Theme.shadows.ambient },
  primaryButtonText: { color: Theme.colors.onPrimary, fontSize: 16, fontWeight: '700' }
});

export default GestionParcelaScreen;
