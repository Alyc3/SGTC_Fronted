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
  StatusBar,
  ImageBackground
} from 'react-native';
import {
  MapPin,
  Mountain,
  Menu,
  User,
  ChevronDown,
  Info
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { Theme } from '../theme';
import { parcelasService } from '../services';
import {
  TipoTerrenoValues,
  OrientacionLaderaValues,
  TexturaSueloValues,
  TipoZona
} from '../db/schema';

const GestionParcelaScreen = ({ navigation }: any) => {
  const [codigo, setCodigo] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [altitud, setAltitud] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [errorHectareas, setErrorHectareas] = useState('');
  const [phSuelo, setPhSuelo] = useState(6.5);
  const [tipoTerreno, setTipoTerreno] = useState<typeof TipoTerrenoValues[number]>('Irregular');
  const [orientacion, setOrientacion] = useState<typeof OrientacionLaderaValues[number]>('NORTE');
  const [textura, setTextura] = useState<typeof TexturaSueloValues[number]>('Franco-Arenosa');
  const [cortinasRompevientos, setCortinasRompevientos] = useState(false);
  const [selectedZonas, setSelectedZonas] = useState<string[]>([]);
  const [gpsLocation, setGpsLocation] = useState('Pendiente calibración');
  const [loading, setLoading] = useState(false);

  const toggleZona = (zona: string) => {
    setSelectedZonas(prev => 
      prev.includes(zona) 
        ? prev.filter(z => z !== zona) 
        : [...prev, zona]
    );
  };

  const handleGPS = async () => {
    try {
      setLoading(true);
      const coords = await parcelasService.getLocation();
      setAltitud(coords.altitude.toFixed(2));
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      setGpsLocation('Calibración exitosa');
      Alert.alert('GPS Calibrado', `Ubicación: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}\nAltitud: ${coords.altitude.toFixed(2)} msnm`);
    } catch (error: any) {
      Alert.alert('Error GPS', error.message || 'No se pudo obtener la ubicación.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setErrorHectareas('');
    
    if (!codigo || !hectareas || !altitud) {
      Alert.alert('Campos Incompletos', 'Por favor, complete el código, extensión y altitud.');
      return;
    }

    const hectareasError = parcelasService.validate({ hectareas });
    if (hectareasError) {
      setErrorHectareas(hectareasError);
      return;
    }

    try {
      setLoading(true);
      await parcelasService.create({
        codigo,
        hectareas: parseFloat(hectareas),
        latitud: latitude,
        longitud: longitude,
        phSuelo,
        textura,
        cortinasRompevientos,
        altitudMsnm: parseFloat(altitud),
        orientacionLadera: orientacion,
        tipoTerreno,
        tipoZona: JSON.stringify(selectedZonas),
        estado: 'Libre'
      });
      Alert.alert('Éxito', 'Parcela registrada.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', 'Fallo al guardar.');
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, value, onChangeText, placeholder, keyboardType, suffix, error }: any) => (
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.background} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>Registro de Parcela</Text>

          {/* Geological Profile Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Mountain size={20} color={Theme.colors.primary} />
              <Text style={styles.cardTitle}>GEOLOGICAL PROFILE</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>FREE STATUS</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <InputField
                label="ID de Parcela"
                value={codigo}
                onChangeText={setCodigo}
                placeholder="PAR-001"
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Theme.spacing.sm }}>
                  <InputField
                    label="Hectáreas"
                    value={hectareas}
                    onChangeText={(text: string) => {
                      setHectareas(text);
                      if (errorHectareas) setErrorHectareas('');
                    }}
                    placeholder="0.0"
                    keyboardType="numeric"
                    suffix="ha"
                    error={errorHectareas}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Theme.spacing.sm }}>
                  <InputField
                    label="Altitud"
                    value={altitud}
                    onChangeText={setAltitud}
                    placeholder="1800"
                    keyboardType="numeric"
                    suffix="meters"
                  />
                </View>
              </View>

              {/* Terrain Geometry (Segmented Control) */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>Tipo de Terreno</Text>
                <View style={styles.segmentedControl}>
                  {TipoTerrenoValues.map((tipo) => (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.segmentButton,
                        tipoTerreno === tipo && styles.segmentButtonActive
                      ]}
                      onPress={() => setTipoTerreno(tipo)}
                    >
                      <Text style={[
                        styles.segmentText,
                        tipoTerreno === tipo && styles.segmentTextActive
                      ]}>{tipo.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* TIPO ZONA (Visible only if Irregular) */}
              {tipoTerreno === 'Irregular' && (
                <View style={styles.section}>
                  <Text style={styles.inputLabel}>Clasificación de Zonas</Text>
                  <View style={styles.chipGroup}>
                    {TipoZona.map((zona) => {
                      const isSelected = selectedZonas.includes(zona);
                      return (
                        <TouchableOpacity
                          key={zona}
                          style={[
                            styles.chip,
                            isSelected && styles.chipActive
                          ]}
                          onPress={() => toggleZona(zona)}
                        >
                          <Text style={[
                            styles.chipText,
                            isSelected && styles.chipTextActive
                          ]}>{zona}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* PH Slider */}
              <View style={styles.section}>
                <View style={styles.rowHeader}>
                  <Text style={styles.inputLabel}>Nivel de PH</Text>
                  <Text style={styles.phValue}>{phSuelo.toFixed(1)}</Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0}
                  maximumValue={14}
                  step={0.1}
                  value={phSuelo}
                  onValueChange={setPhSuelo}
                  minimumTrackTintColor={Theme.colors.primary}
                  maximumTrackTintColor={Theme.colors.outlineVariant}
                  thumbTintColor={Theme.colors.primary}
                />
                <View style={styles.row}>
                  <Text style={styles.sliderLabel}>Acidic</Text>
                  <Text style={styles.sliderLabel}>Optimal</Text>
                  <Text style={styles.sliderLabel}>Alkaline</Text>
                </View>
              </View>

              {/* Slope Orientation (Directional Buttons) */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>Orientacion de Ladera</Text>
                <View style={styles.directionalGroup}>
                  {OrientacionLaderaValues.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.directionButton,
                        orientacion === opt && styles.directionButtonActive
                      ]}
                      onPress={() => setOrientacion(opt)}
                    >
                      <Text style={[
                        styles.directionText,
                        orientacion === opt && styles.directionTextActive
                      ]}>{opt.charAt(0)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Soil Texture (Segmented Control) */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>Textura del Suelo</Text>
                <View style={styles.segmentedControl}>
                  {TexturaSueloValues.map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.segmentButton,
                        textura === val && styles.segmentButtonActive
                      ]}
                      onPress={() => setTextura(val)}
                    >
                      <Text style={[
                        styles.segmentText,
                        textura === val && styles.segmentTextActive
                      ]}>{val}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Cortinas Rompevientos (Switch/Toggle) */}
              <View style={[styles.section, styles.rowBetween]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Cortinas Rompevientos</Text>
                  <Text style={styles.helperText}>Existencia de barreras naturales.</Text>
                </View>
                <TouchableOpacity 
                  style={[
                    styles.switchTrack,
                    cortinasRompevientos && styles.switchTrackActive
                  ]}
                  onPress={() => setCortinasRompevientos(!cortinasRompevientos)}
                >
                  <View style={[
                    styles.switchThumb,
                    cortinasRompevientos && styles.switchThumbActive
                  ]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* GPS Overlay on Placeholder Image */}
            <View style={styles.imagePlaceholder}>
              <View style={styles.imageOverlay}>
                <View style={styles.gpsRow}>
                  <TouchableOpacity 
                    style={[
                      styles.gpsStatusButton, 
                      gpsLocation !== 'Pendiente calibración' && styles.gpsStatusButtonActive
                    ]}
                  >
                    <View style={[
                      styles.statusDot, 
                      { backgroundColor: gpsLocation !== 'Pendiente calibración' ? '#4CAF50' : '#FFC107' }
                    ]} />
                    <Text style={styles.gpsStatusText}>
                      {gpsLocation !== 'Pendiente calibración' ? 'GPS Calibrado' : 'Calibracion P.'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.calibrateButton} onPress={handleGPS}>
                    <MapPin size={16} color={Theme.colors.white} />
                    <Text style={styles.calibrateText}>Calibrate GPS</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.gpsCoordsText}>{gpsLocation}</Text>
              </View>
            </View>
          </View>

          {/* Secondary Action Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Lotes')}
          >
            <Text style={styles.secondaryButtonText}>Agregar Lote</Text>
          </TouchableOpacity>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && { opacity: 0.4 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'GUARDANDO...' : 'Crear Nueva Parcela'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
  },
  headerTitle: {
    ...Theme.typography.labelSm,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.primary,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.ambient,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  screenTitle: {
    ...Theme.typography.display,
    fontSize: 28,
    marginBottom: Theme.spacing.xl,
    color: Theme.colors.primary,
  },
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.roundness.xxl,
    overflow: 'hidden',
    ...Theme.shadows.ambient,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.outlineVariant,
  },
  cardTitle: {
    ...Theme.typography.label,
    flex: 1,
    marginLeft: Theme.spacing.sm,
    letterSpacing: 1,
  },
  statusBadge: {
    backgroundColor: Theme.colors.secondaryContainer,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.roundness.full,
  },
  statusText: {
    ...Theme.typography.labelSm,
    color: Theme.colors.onSecondaryContainer,
    fontSize: 10,
  },
  cardBody: {
    padding: Theme.spacing.lg,
  },
  inputContainer: {
    marginBottom: Theme.spacing.md,
  },
  inputLabel: {
    ...Theme.typography.labelSm,
    marginBottom: 8,
    color: Theme.colors.onSurfaceVariant,
  },
  inputWrapper: {
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
    borderRadius: Theme.roundness.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    height: 48,
  },
  inputWrapperError: {
    borderColor: Theme.colors.error,
  },
  errorText: {
    ...Theme.typography.labelSm,
    color: Theme.colors.error,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  input: {
    ...Theme.typography.body,
    flex: 1,
    color: Theme.colors.onSurface,
  },
  inputSuffix: {
    ...Theme.typography.labelSm,
    color: Theme.colors.outline,
    marginLeft: Theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  section: {
    marginTop: Theme.spacing.lg,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceContainerHighest,
    borderRadius: Theme.roundness.md,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Theme.roundness.sm,
  },
  segmentButtonActive: {
    backgroundColor: Theme.colors.primary,
  },
  segmentText: {
    ...Theme.typography.labelSm,
    color: Theme.colors.onSurfaceVariant,
  },
  segmentTextActive: {
    color: Theme.colors.white,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Theme.colors.surfaceContainerHighest,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.roundness.full,
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: Theme.colors.secondaryContainer,
    borderColor: Theme.colors.secondary,
  },
  chipText: {
    ...Theme.typography.labelSm,
    color: Theme.colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: Theme.colors.onSecondaryContainer,
    fontWeight: '700',
  },
  helperText: {
    ...Theme.typography.labelSm,
    color: Theme.colors.outline,
    fontSize: 10,
    fontWeight: '400',
  },
  switchTrack: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: Theme.colors.surfaceContainerHighest,
    padding: 2,
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
  },
  switchTrackActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.colors.outline,
  },
  switchThumbActive: {
    backgroundColor: Theme.colors.white,
    transform: [{ translateX: 22 }],
  },
  phValue: {
    ...Theme.typography.headline,
    fontSize: 20,
    color: Theme.colors.primary,
  },
  sliderLabel: {
    ...Theme.typography.labelSm,
    color: Theme.colors.outline,
    fontSize: 10,
  },
  directionalGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  directionButton: {
    width: 48,
    height: 48,
    backgroundColor: Theme.colors.surfaceContainerHighest,
    borderRadius: Theme.roundness.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionButtonActive: {
    backgroundColor: Theme.colors.primary,
  },
  directionText: {
    ...Theme.typography.label,
    color: Theme.colors.onSurfaceVariant,
  },
  directionTextActive: {
    color: Theme.colors.white,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
    borderRadius: Theme.roundness.md,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
  },
  dropdownText: {
    ...Theme.typography.body,
    color: Theme.colors.onSurface,
  },
  imagePlaceholder: {
    height: 180,
    backgroundColor: '#A1887F', // Earthy tone instead of actual image
    marginTop: Theme.spacing.lg,
  },
  imageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: Theme.spacing.lg,
    justifyContent: 'flex-end',
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 8,
    borderRadius: Theme.roundness.full,
  },
  gpsStatusButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  gpsStatusText: {
    ...Theme.typography.labelSm,
    color: Theme.colors.white,
    fontSize: 10,
  },
  calibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 8,
    borderRadius: Theme.roundness.full,
    gap: 6,
  },
  calibrateText: {
    ...Theme.typography.labelSm,
    color: Theme.colors.white,
    fontWeight: '700',
  },
  gpsCoordsText: {
    ...Theme.typography.labelSm,
    color: Theme.colors.white,
    opacity: 0.8,
    marginTop: 8,
    fontSize: 10,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 20,
    borderRadius: Theme.roundness.xxl,
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
    ...Theme.shadows.ambient,
  },
  primaryButtonText: {
    ...Theme.typography.body,
    color: Theme.colors.white,
    fontWeight: '800',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: Theme.colors.background,
    paddingVertical: 12,
    borderRadius: Theme.roundness.xxl,
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.primaryContainer,
  },
  secondaryButtonText: {
    ...Theme.typography.label,
    color: Theme.colors.primary,
    fontWeight: '700',
  },
});

export default GestionParcelaScreen;
