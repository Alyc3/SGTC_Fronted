import React, { useState, useEffect, useCallback } from 'react';
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
  ImageBackground,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Boxes,
  ChevronDown,
  Info,
  Leaf,
  LayoutGrid,
  Mountain,
  Sprout,
  CheckCircle2,
  ArrowDownRight,
  Droplets,
  UtilityPole,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { parcelasService, semillasService, lotesService } from '../services';
import { EstadoLoteValues } from '../db/schema';
import { CustomAlert } from '../components/GlobalAlert';

const { width } = Dimensions.get('window');

const LotCard = ({ index, lot, updateLot, semillas, styles }: any) => {
  const onVariedadSelect = (semilla: any) => {
    updateLot(index, { 
      semilla_id: semilla.id, 
      variedadCafe: semilla.variedadNombre 
    });
  };

  return (
    <View style={styles.lotCard}>
      <View style={styles.lotCardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.lotNumberBadge}>
            <Text style={styles.lotNumberText}>#{index + 1}</Text>
          </View>
          {lot.zona_seleccionada && (
            <View style={{ backgroundColor: Theme.colors.secondaryContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Theme.colors.onSecondaryContainer }}>
                {lot.zona_seleccionada}
              </Text>
            </View>
          )}
        </View>
        <Sprout size={20} color={Theme.colors.outline} />
      </View>

      <View style={styles.lotCardBody}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabelUpper}>SEMILLA SELECCIONADA</Text>
          <TouchableOpacity style={styles.selectInput}>
            <Text style={styles.selectInputText}>
              {lot.variedadCafe ? `${lot.variedadCafe} (ID: ${lot.semilla_id?.slice(0, 4)})` : 'Seleccionar Semilla...'}
            </Text>
            <ChevronDown size={16} color={Theme.colors.onSurface} />
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.miniPicker}>
            {semillas.map((s: any) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.miniPickerItem, lot.semilla_id === s.id && styles.miniPickerItemActive]}
                onPress={() => onVariedadSelect(s)}
              >
                <View>
                  <Text style={[styles.miniPickerText, lot.semilla_id === s.id && styles.miniPickerTextActive]}>
                    {s.variedadNombre}
                  </Text>
                  <Text style={[styles.helperText, { fontSize: 8 }, lot.semilla_id === s.id && { color: Theme.colors.onSecondaryContainer }]}>
                    {s.paisNombre} - {s.id.slice(0, 4)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabelUpper}>SUPERFICIE (HA)</Text>
          <View style={styles.hectareasInputWrapper}>
            <TextInput
              style={[styles.bottomBorderInput, { flex: 1 }]}
              value={lot.hectareas}
              onChangeText={(val) => updateLot(index, { hectareas: val })}
              placeholder="0.0"
              keyboardType="numeric"
            />
            <Text style={styles.haSuffix}>HA</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const GestionLoteScreen = ({ navigation, route }: any) => {
  const { parcelaId, id: loteId } = route.params || {};
  const isEditing = !!loteId;

  // Control de gestos y botón físico de atrás
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
        // Capturamos cualquier intento de volver (gesto, botón o dispatch)
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
    }, [navigation, parcelaId])
  );

  const [tipoParcela, setTipoParcela] = useState<'Regular' | 'Irregular'>('Regular');
  const [numLotes, setNumLotes] = useState(1);
  const [lotesData, setLotesData] = useState<any[]>([{ codigo: '', semilla_id: '', variedadCafe: '', hectareas: '' }]);
  const [semillas, setSemillas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [parcela, setParcela] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
    navigation.setOptions({
      headerShown: false,
    });
  }, [loteId, parcelaId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Reset state for new parcel/lote context
      setNumLotes(1);
      setLotesData([{ codigo: '', semilla_id: '', variedadCafe: '', hectareas: '' }]);
      setTipoParcela('Regular');
      setParcela(null);

      const seeds = await lotesService.getSeeds();
      setSemillas(seeds);

      if (parcelaId) {
        const p = await lotesService.getParcelInfo(parcelaId);
        setParcela(p);
        if (p?.tipoTerreno) {
          setTipoParcela(p.tipoTerreno as any);
        }
        
        if (!isEditing && p?.tipoTerreno === 'Irregular') {
          const zonas = p.tipoZona ? JSON.parse(p.tipoZona) : [];
          if (zonas.length > 0) {
            setNumLotes(zonas.length);
            setLotesData(zonas.map((z: string) => ({
              codigo: '', semilla_id: '', variedadCafe: '', hectareas: '', zona_seleccionada: z
            })));
          }
        }
      }

      if (isEditing) {
        const lote = await parcelasService.getLoteById(loteId);
        if (lote) {
          setLotesData([{
            codigo: lote.codigo,
            semilla_id: lote.semilla_id,
            variedadCafe: lote.variedadCafe,
            hectareas: lote.hectareas_lote?.toString() || '',
            zona_seleccionada: lote.zona_seleccionada || ''
          }]);
        }
      }
    } catch (error) {
      CustomAlert.show('ERROR', 'Error de Carga', 'Fallo al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  const updateLot = (index: number, newData: any) => {
    const updated = [...lotesData];
    updated[index] = { ...updated[index], ...newData };
    setLotesData(updated);
  };

  const handleNumLotesChange = (val: string) => {
    const count = Math.min(Math.max(parseInt(val) || 1, 1), 10);
    setNumLotes(count);
    
    setLotesData(prev => {
      const next = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          next.push({ codigo: '', semilla_id: '', variedadCafe: '', hectareas: '' });
        }
      } else {
        return next.slice(0, count);
      }
      return next;
    });
  };

  const handleSave = async () => {
    // 1. Validación de campos obligatorios
    for (const lot of lotesData) {
      if (!lot.hectareas || !lot.semilla_id) {
        CustomAlert.show('ALERTA', 'Campos Incompletos', 'Por favor rellene todos los campos en cada lote.');
        return;
      }
    }

    // 2. Validación de Superficie (Mínimo 1ha y Límite de Parcela)
    let totalNuevasHa = 0;
    for (let i = 0; i < lotesData.length; i++) {
      const ha = parseFloat(lotesData[i].hectareas);
      if (isNaN(ha) || ha < 1) {
        CustomAlert.show('ERROR', 'Superficie Inválida', `El lote #${i + 1} debe tener al menos 1 hectárea.`);
        return;
      }
      totalNuevasHa += ha;
    }

    if (parcela) {
      // Calcular área ocupada por otros lotes (excluyendo el actual si se está editando)
      const areaOcupada = (parcela.lotes || [])
        .filter((l: any) => l.id !== loteId)
        .reduce((sum: number, l: any) => sum + (l.hectareas_lote || 0), 0);
      
      const areaTotalResultante = areaOcupada + totalNuevasHa;

      if (areaTotalResultante > parcela.hectareas) {
        CustomAlert.show(
          'ERROR',
          'Capacidad Excedida',
          `La superficie total (${areaTotalResultante.toFixed(1)}ha) superaría el límite de la parcela (${parcela.hectareas}ha).`
        );
        return;
      }
    }

    try {
      setLoading(true);
      
      for (let i = 0; i < lotesData.length; i++) {
        const lot = lotesData[i];
        // Generate code on save
        const generatedCode = lotesService.generateLotCode(parcela.nombre, lot.variedadCafe);
        const finalCode = lotesData.length > 1 ? `${generatedCode}-${(i+1).toString().padStart(2, '0')}` : generatedCode;

        const data: any = {
          id: isEditing ? loteId : `lote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          codigo: finalCode,
          parcela_id: parcelaId,
          semilla_id: lot.semilla_id,
          hectareas_lote: parseFloat(lot.hectareas),
          variedadCafe: lot.variedadCafe,
          estado_lote: 'Reservado' as any, // Estado por defecto solicitado
        };

        if (lot.zona_seleccionada) {
          data.zona_seleccionada = lot.zona_seleccionada;
        }

        if (isEditing) {
          await parcelasService.updateLote(loteId, data);
        } else {
          await parcelasService.createLote(data);
        }
      }
      
      CustomAlert.show('SUCCESS', 'Éxito', isEditing ? 'Lote actualizado correctamente.' : `${numLotes} lote(s) registrado(s).`, () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Lotes');
        }
      });
    } catch (error) {
      CustomAlert.show('ERROR', 'Fallo al Guardar', 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <ImageBackground
          source={{ uri: 'https://lh3.googleusercontent.com/aida/ADBb0uiSJz-MBXAtRMoF8X6cQnMSbSSWediMgicf6BK880FATqG9Qh-Waf9hAt5d4UICP1GkJvWW8c3y8aHMT1Dy5SzSAQxYi2TZv2ttffhYjki-gHQYYQ9cH3kLESPzaq1_Ie1QbdKsy6id_cK6hR63DFDV0eyldSRvVSjYL-JHx43Z4ewQeIC6heETYeg52zH1LbD2QR-dwCS8VC77FeikTk3Xmn-ijEmFDMqtB4zvS7NXxLj3Od4Ef3AVlkY' }}
          style={styles.hero}
        >
          <View style={styles.heroOverlay}>
            <TouchableOpacity 
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Lotes');
                }
              }} 
              style={styles.backButton}
            >
              <ChevronDown size={28} color={Theme.colors.white} style={{ transform: [{ rotate: '90deg' }] }} />
            </TouchableOpacity>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{isEditing ? 'Editar Lote' : 'Creación de Lote'}</Text>
              <Text style={styles.heroSubtitle}>REGISTRO TÉCNICO DE UNIDADES DE PRODUCCIÓN AGRÍCOLA</Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.content}>
          <View style={styles.sidebar}>
            <View style={styles.sidebarCard}>
              <Text style={styles.sidebarTitle}>Tipo de Parcela</Text>
              <View style={styles.toggleGroup}>
                <View
                  style={[styles.toggleButton, styles.toggleButtonActive, { justifyContent: 'center' }]}
                >
                  <Text style={[styles.toggleText, styles.toggleTextActive]}>{tipoParcela.toUpperCase()}</Text>
                  <View style={{ width: 10 }} />
                  {tipoParcela === 'Regular' ? (
                    <LayoutGrid size={20} color={Theme.colors.white} />
                  ) : (
                    <Mountain size={20} color={Theme.colors.white} />
                  )}
                </View>
              </View>

              <View style={styles.summaryArea}>
                <View style={styles.summaryHeader}>
                  <Info size={14} color={Theme.colors.secondary} />
                  <Text style={styles.summaryHeaderText}>RESUMEN DE PARCELA</Text>
                </View>
                <Text style={styles.summaryValue}>{parcela?.hectareas || '0.0'} ha</Text>
                <Text style={styles.summaryLabel}>Área Total Calculada</Text>
              </View>
            </View>
          </View>

          <View style={styles.mainArea}>
            {/* Existing Lots Section */}
            {parcela?.lotes && parcela.lotes.length > 0 && !isEditing && (
              <View style={styles.existingLotsContainer}>
                <Text style={styles.sectionTitle}>Lotes Existentes</Text>
                <Text style={styles.sectionSubtitle}>Unidades de producción actualmente registradas en esta parcela.</Text>
                
                <View style={styles.existingLotsList}>
                  {parcela.lotes.map((lote: any, idx: number) => (
                    <TouchableOpacity 
                      key={lote.id || idx} 
                      style={styles.existingLotCard}
                      onPress={() => navigation.navigate('GestionLote', { parcelaId: parcela.id, id: lote.id })}
                    >
                      <View style={styles.existingLotHeader}>
                        <Text style={styles.existingLotCode}>{lote.codigo}</Text>
                        <View style={[styles.statusBadgeSmall, lote.estado_lote === 'En_Produccion' && { backgroundColor: Theme.colors.secondaryContainer }]}>
                          <Text style={[styles.statusTextSmall, lote.estado_lote === 'En_Produccion' && { color: Theme.colors.secondary }]}>
                            {lote.estado_lote.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.existingLotDetails}>
                        <View style={styles.detailItem}>
                          <Sprout size={14} color={Theme.colors.outline} />
                          <Text style={styles.detailText}>{lote.variedadCafe || 'No especificada'}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <LayoutGrid size={14} color={Theme.colors.outline} />
                          <Text style={styles.detailText}>{lote.hectareas_lote} ha</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.divider} />
              </View>
            )}

            <View style={styles.configHeader}>
              <Text style={styles.sectionTitle}>Configuración de Lotes</Text>
              <Text style={styles.sectionSubtitle}>
                {tipoParcela === 'Regular' 
                  ? 'Define las especificaciones técnicas para cada unidad.' 
                  : 'Complete la información para cada zona topográfica de la parcela.'}
              </Text>
              
              {!isEditing && tipoParcela === 'Regular' && (
                <View style={styles.unitCounterContainer}>
                  <Text style={styles.unitLabel}>Número de Lotes (1-10):</Text>
                  <View style={styles.unitCounter}>
                    <TouchableOpacity onPress={() => handleNumLotesChange((numLotes - 1).toString())}>
                       <Text style={styles.counterBtn}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.unitInput}
                      value={numLotes.toString()}
                      onChangeText={handleNumLotesChange}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity onPress={() => handleNumLotesChange((numLotes + 1).toString())}>
                       <Text style={styles.counterBtn}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {lotesData.map((lot, idx) => (
              <LotCard
                key={idx}
                index={idx}
                lot={lot}
                updateLot={updateLot}
                semillas={semillas}
                styles={styles}
              />
            ))}
          </View>
        </View>

        {/* Extra Space for FAB */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Confirmation FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.fabText}>
            {loading ? 'PROCESANDO...' : isEditing ? 'Confirmar y Actualizar' : 'Confirmar y Crear Lotes'}
          </Text>
          <CheckCircle2 size={24} color={Theme.colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    height: 260,
    width: '100%',
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(68, 42, 34, 0.6)', // Gradient simulation
    padding: 24,
    justifyContent: 'space-between',
  },
  backButton: {
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    width: 40,
    height: 40,
  },
  heroContent: {
    marginBottom: 20,
  },
  heroTitle: {
    ...Theme.typography.display,
    fontSize: 36,
    fontWeight: '900',
    color: Theme.colors.white,
    letterSpacing: -1,
  },
  heroSubtitle: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    marginTop: 4,
  },
  content: {
    padding: 24,
    marginTop: -20,
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  sidebar: {
    marginBottom: 24,
  },
  sidebarCard: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 24,
    borderRadius: 24,
  },
  sidebarTitle: {
    ...Theme.typography.headline,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: Theme.colors.onSurface,
  },
  toggleGroup: {
    gap: 12,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceContainerHighest,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  toggleButtonActive: {
    backgroundColor: Theme.colors.primary,
  },
  toggleText: {
    ...Theme.typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.onSurfaceVariant,
  },
  toggleTextActive: {
    color: Theme.colors.white,
  },
  summaryArea: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(130, 116, 112, 0.1)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryHeaderText: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.secondary,
    letterSpacing: 1,
  },
  summaryValue: {
    ...Theme.typography.display,
    fontSize: 28,
    fontWeight: '800',
    color: Theme.colors.onSurface,
  },
  summaryLabel: {
    ...Theme.typography.body,
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
  },
  mainArea: {
    flex: 1,
  },
  configHeader: {
    marginBottom: 24,
  },
  unitCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  sectionTitle: {
    ...Theme.typography.headline,
    fontSize: 22,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  sectionSubtitle: {
    ...Theme.typography.body,
    fontSize: 14,
    color: Theme.colors.onSurfaceVariant,
  },
  unitCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 12,
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.onSurfaceVariant,
  },
  unitInput: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.primary,
    textAlign: 'center',
    padding: 0,
    width: 32,
  },
  counterBtn: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.colors.primary,
    paddingHorizontal: 8,
  },
  lotCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 24,
    borderRadius: 24,
    ...Theme.shadows.ambient,
    marginBottom: 16,
  },
  lotCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  lotNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.onTertiaryContainer,
  },
  lotCardBody: {
    gap: 20,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabelUpper: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  bottomBorderInput: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.outlineVariant,
    paddingVertical: 8,
    ...Theme.typography.body,
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.outlineVariant,
    paddingVertical: 8,
  },
  selectInputText: {
    ...Theme.typography.body,
    fontSize: 16,
    fontWeight: '500',
    color: Theme.colors.onSurface,
  },
  miniPicker: {
    marginTop: 8,
  },
  miniPickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Theme.colors.surfaceContainerLow,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
  },
  miniPickerItemActive: {
    backgroundColor: Theme.colors.secondaryContainer,
    borderColor: Theme.colors.secondary,
  },
  miniPickerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.onSurfaceVariant,
  },
  miniPickerTextActive: {
    color: Theme.colors.onSecondaryContainer,
  },
  hectareasInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.outlineVariant,
  },
  haSuffix: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.outline,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    left: 24,
    right: 24,
  },
  fab: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 40,
    gap: 12,
    ...Theme.shadows.ambient,
    shadowOpacity: 0.3,
    elevation: 8,
  },
  fabText: {
    color: Theme.colors.white,
    ...Theme.typography.label,
    fontSize: 18,
    fontWeight: '800',
  },
  existingLotsContainer: {
    marginBottom: 32,
  },
  existingLotsList: {
    marginTop: 16,
    gap: 12,
  },
  existingLotCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
  },
  existingLotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  existingLotCode: {
    ...Theme.typography.label,
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  statusBadgeSmall: {
    backgroundColor: Theme.colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextSmall: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  existingLotDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    ...Theme.typography.label,
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.outlineVariant,
    marginTop: 24,
    opacity: 0.5,
  },
});

export default GestionLoteScreen;
