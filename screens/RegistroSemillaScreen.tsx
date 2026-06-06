import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
  BackHandler,
} from 'react-native';
import {
  ArrowRight,
  ChevronDown,
  Plus,
  Edit2,
  User,
  ChevronRight,
  Search,
  CircleUser,
  Trash2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme';
import { semillasService, catalogoService } from '../services';
import { v4 as uuidv4 } from 'uuid';
import { CustomAlert } from '../components/GlobalAlert';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

const SelectInput = ({ label, value, options, onSelect, onAddNew, placeholder, showActions, loading, readOnly }: any) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt: any) => opt.id === value);

  const displayOptions = readOnly 
    ? options 
    : [...options, { id: 'ADD_NEW', valor: `+ Agregar nuevo ${label.toLowerCase()}...`, isSpecial: true }];

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectWrapper, readOnly && { backgroundColor: Theme.colors.surfaceContainerLow }]}
        activeOpacity={0.7}
        onPress={() => !loading && !readOnly && setModalVisible(true)}
        disabled={loading || readOnly}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Theme.colors.primary} />
        ) : (
          <Text style={[styles.selectText, !value && { color: Theme.colors.onSurfaceVariant }]}>
            {selectedOption ? selectedOption.valor : placeholder}
          </Text>
        )}
        <View style={styles.selectIcons}>
          {!readOnly && showActions && (
            <View style={styles.actionIcons}>
            </View>
          )}
          <ChevronDown size={20} color={Theme.colors.onSurfaceVariant} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={displayOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    if (item.id === 'ADD_NEW') {
                      setModalVisible(false);
                      onAddNew();
                    } else {
                      onSelect(item.id);
                      setModalVisible(false);
                    }
                  }}
                >
                  <Text style={[
                    styles.optionText, 
                    value === item.id && styles.optionTextSelected,
                    item.isSpecial && { color: Theme.colors.primary, fontWeight: '700', fontStyle: 'italic' }
                  ]}>
                    {item.valor}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const RegistroSemillaScreen = ({ navigation, route }: any) => {
  const { userName } = useAuthStore();
  const seedId = route.params?.id;
  const readOnly = route.params?.readOnly ?? false;
  const isEditing = !!seedId;

  // Control de gestos y botón físico de atrás
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('InventarioSemillas');
        return true; // Bloquea la acción por defecto
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
        // Capturamos cualquier intento de volver (gesto, botón o dispatch)
        if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
          e.preventDefault();
          navigation.navigate('InventarioSemillas');
        }
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [navigation])
  );

  const [variedadId, setVariedadId] = useState('');
  const [paisOrigenId, setPaisOrigenId] = useState('');
  const [distribuidorId, setDistribuidorId] = useState('');
  const [metodoSecadoId, setMetodoSecadoId] = useState('');
  const [seleccionId, setSeleccionId] = useState('');
  const [olorId, setOlorId] = useState('');
  const [colorId, setColorId] = useState('');
  const [integridadId, setIntegridadId] = useState('');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState({ created: '', updated: '' });
  
  const resetForm = () => {
    setVariedadId('');
    setPaisOrigenId('');
    setDistribuidorId('');
    setMetodoSecadoId('');
    setSeleccionId('');
    setOlorId('');
    setColorId('');
    setIntegridadId('');
    setMetadata({ created: '', updated: '' });
  };

  // Catalog options state
  const [options, setOptions] = useState({
    variedades: [],
    paises: [],
    distribuidores: [],
    metodosSecado: [],
    selecciones: [],
    olores: [],
    colores: [],
    integridades: []
  });
  const [loadingOptions, setLoadingOptions] = useState(true);

  // New Catalog Item Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newVal, setNewVal] = useState('');
  const [activeCategory, setActiveCategory] = useState({ key: '', label: '' });

  useEffect(() => {
    loadCatalogs().then(() => {
      if (seedId) {
        loadSeedData();
      } else {
        resetForm();
      }
    });
    navigation.setOptions({
      title: readOnly ? 'Visualizar Semilla' : isEditing ? 'Actualizar Semilla' : 'Nueva Semilla'
    });
  }, [seedId, isEditing, readOnly]);

  const loadCatalogs = async () => {
    try {
      setLoadingOptions(true);
      const [v, p, d, ms, s, o, c, i] = await Promise.all([
        catalogoService.getByCategoria('VARIEDAD_CAFE'),
        catalogoService.getByCategoria('PAIS_ORIGEN'),
        catalogoService.getByCategoria('DISTRIBUIDOR'),
        catalogoService.getByCategoria('METODO_SECADO'),
        catalogoService.getByCategoria('SELECCION'),
        catalogoService.getByCategoria('OLOR'),
        catalogoService.getByCategoria('COLOR'),
        catalogoService.getByCategoria('INTEGRIDAD')
      ]);

      setOptions({
        variedades: v,
        paises: p,
        distribuidores: d,
        metodosSecado: ms,
        selecciones: s,
        olores: o,
        colores: c,
        integridades: i
      } as any);
    } catch (error) {
      console.error('Error loading catalogs:', error);
      CustomAlert.show('ERROR', 'Error', 'No se pudieron cargar las opciones del catálogo.');
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadSeedData = async () => {
    try {
      setLoading(true);
      const seed = await semillasService.getById(seedId);
      if (seed) {
        setVariedadId(seed.variedad_id);
        setPaisOrigenId(seed.pais_origen_id || '');
        setDistribuidorId(seed.distribuidor_id || '');
        setMetodoSecadoId(seed.metodo_secado_id || '');
        setSeleccionId(seed.seleccion_id || '');
        setOlorId(seed.olor_id || '');
        setColorId(seed.color_id || '');
        setIntegridadId(seed.integridad_id || '');
        setMetadata({
          created: seed.fecha_creacion || (seed as any).anexo_creacion || '',
          updated: seed.fecha_modificacion || ''
        });
      }
    } catch (error) {
      CustomAlert.show('ERROR', 'Error', 'No se pudo cargar la información de la semilla.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleAddNew = (key: string, label: string) => {
    setActiveCategory({ key, label });
    setNewVal('');
    setAddModalVisible(true);
  };

  const saveNewCatalogItem = async () => {
    if (!newVal.trim()) return;
    
    if (newVal.trim().length > 30) {
      CustomAlert.show('ALERTA', 'Límite excedido', 'El nombre no puede superar los 30 caracteres.');
      return;
    }

    const keyMap: any = {
      'VARIEDAD_CAFE': 'variedades',
      'PAIS_ORIGEN': 'paises',
      'DISTRIBUIDOR': 'distribuidores',
      'METODO_SECADO': 'metodosSecado',
      'SELECCION': 'selecciones',
      'OLOR': 'olores',
      'COLOR': 'colores',
      'INTEGRIDAD': 'integridades'
    };

    const currentCategoryOptions = (options as any)[keyMap[activeCategory.key]] || [];
    const isDuplicate = currentCategoryOptions.some(
      (opt: any) => opt.valor.toLowerCase().trim() === newVal.toLowerCase().trim()
    );

    if (isDuplicate) {
      CustomAlert.show('ALERTA', 'Elemento Duplicado', `El/la ${activeCategory.label.toLowerCase()} "${newVal.trim()}" ya existe.`);
      return;
    }

    try {
      setLoadingOptions(true);
      
      const validation = await catalogoService.validateNewItem(activeCategory.key, newVal);
      if (!validation.isValid) {
        CustomAlert.show('ERROR', 'Error de validación', validation.error || 'Valor inválido');
        setLoadingOptions(false);
        return;
      }

      const newItem = await catalogoService.create({
        id: uuidv4(),
        categoria: activeCategory.key,
        valor: newVal.trim(),
        activo: true,
        origen_local: true,
        is_synced: false
      });
      
      await loadCatalogs();
      
      // Auto-select the new item
      const setterMap: any = {
        'VARIEDAD_CAFE': setVariedadId,
        'PAIS_ORIGEN': setPaisOrigenId,
        'DISTRIBUIDOR': setDistribuidorId,
        'METODO_SECADO': setMetodoSecadoId,
        'SELECCION': setSeleccionId,
        'OLOR': setOlorId,
        'COLOR': setColorId,
        'INTEGRIDAD': setIntegridadId
      };
      
      if (setterMap[activeCategory.key]) {
        setterMap[activeCategory.key](newItem[0].id);
      }
      
      setAddModalVisible(false);
      CustomAlert.show('SUCCESS', 'Éxito', `${activeCategory.label} agregado correctamente.`);
    } catch (error) {
      CustomAlert.show('ERROR', 'Error', 'No se pudo agregar el elemento al catálogo.');
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleSave = async () => {
    const data = {
      variedad_id: variedadId,
      pais_origen_id: paisOrigenId,
      distribuidor_id: distribuidorId,
      metodo_secado_id: metodoSecadoId,
      seleccion_id: seleccionId,
      olor_id: olorId,
      color_id: colorId,
      integridad_id: integridadId,
    };

    if (!semillasService.validate(data)) {
      CustomAlert.show('ALERTA', 'Campos Requeridos', 'Todos los campos marcados con * son obligatorios.');
      return;
    }

    const processSave = async () => {
      try {
        setLoading(true);
        const finalData = {
          ...data,
          pais_origen_id: data.pais_origen_id || null,
          distribuidor_id: data.distribuidor_id || null,
          metodo_secado_id: data.metodo_secado_id || null,
          seleccion_id: data.seleccion_id || null,
          olor_id: data.olor_id || null,
          color_id: data.color_id || null,
          integridad_id: data.integridad_id || null,
        };

        if (isEditing) {
          await semillasService.update(seedId, { ...finalData, fecha_modificacion: new Date().toISOString() });
          CustomAlert.show('SUCCESS', 'Éxito', 'Semilla actualizada correctamente.');
        } else {
          const now = new Date().toISOString();
          await semillasService.create({ 
            ...finalData, 
            id: uuidv4(), 
            fecha_creacion: now,
            fecha_modificacion: now,
            anexo_creacion: now 
          } as any);
          CustomAlert.show('SUCCESS', 'Éxito', 'Registro confirmado exitosamente.');
        }
        resetForm();
        navigation.navigate('InventarioSemillas');
      } catch (error) {
        console.error('Save error:', error);
        CustomAlert.show('ERROR', 'Error', 'Fallo en la persistencia de datos.');
      } finally {
        setLoading(false);
      }
    };

    if (isEditing) {
      CustomAlert.show(
        'ALERTA',
        'Confirmar Actualización',
        '¿Desea guardar los cambios realizados en esta semilla?',
        processSave,
        'ACTUALIZAR',
        () => {},
        'CANCELAR'
      );
    } else {
      processSave();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.background} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.title}>
              {readOnly ? 'Visualización' : isEditing ? 'Actualización' : 'Registro'} de semillas
            </Text>
            <Text style={styles.description}>
              Complete la identificación técnica para certificar el origen y calidad del lote.
            </Text>
          </View>

          {/* Form Canvas */}
          <View style={styles.formCanvas}>
            
            {/* Botanical Identification */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Identificación Botánica</Text>
                <View style={styles.sectionLine} />
              </View>
              
              <SelectInput 
                label="Variedad / Tipo de café *" 
                value={variedadId} 
                options={options.variedades}
                onSelect={setVariedadId}
                onAddNew={() => handleAddNew('VARIEDAD_CAFE', 'Variedad')}
                placeholder="Seleccione variedad..."
                showActions
                loading={loadingOptions}
                readOnly={readOnly}
              />
              <SelectInput 
                label="Origen *" 
                value={paisOrigenId} 
                options={options.paises}
                onSelect={setPaisOrigenId}
                onAddNew={() => handleAddNew('PAIS_ORIGEN', 'Origen')}
                placeholder="Seleccione origen..."
                showActions
                loading={loadingOptions}
                readOnly={readOnly}
              />
              <SelectInput 
                label="Distribuidor *" 
                value={distribuidorId} 
                options={options.distribuidores}
                onSelect={setDistribuidorId}
                onAddNew={() => handleAddNew('DISTRIBUIDOR', 'Distribuidor')}
                placeholder="Seleccione distribuidor..."
                showActions
                loading={loadingOptions}
                readOnly={readOnly}
              />
            </View>

            {/* Technical Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Información Técnica de la Semilla</Text>
                <View style={styles.sectionLine} />
              </View>

              <SelectInput 
                label="Método de secado *" 
                value={metodoSecadoId} 
                options={options.metodosSecado}
                onSelect={setMetodoSecadoId}
                onAddNew={() => handleAddNew('METODO_SECADO', 'Método de secado')}
                placeholder="Seleccione el método..."
                loading={loadingOptions}
                readOnly={readOnly}
              />
              <SelectInput 
                label="Selección *" 
                value={seleccionId} 
                options={options.selecciones}
                onSelect={setSeleccionId}
                onAddNew={() => handleAddNew('SELECCION', 'Selección')}
                placeholder="Seleccione el tipo de selección..."
                loading={loadingOptions}
                readOnly={readOnly}
              />
              <SelectInput 
                label="Olor *" 
                value={olorId} 
                options={options.olores}
                onSelect={setOlorId}
                onAddNew={() => handleAddNew('OLOR', 'Olor')}
                placeholder="Seleccione el perfil de olor..."
                loading={loadingOptions}
                readOnly={readOnly}
              />
              <SelectInput 
                label="Color *" 
                value={colorId} 
                options={options.colores}
                onSelect={setColorId}
                onAddNew={() => handleAddNew('COLOR', 'Color')}
                placeholder="Seleccione el tono observado..."
                loading={loadingOptions}
                readOnly={readOnly}
              />
              <SelectInput 
                label="Integridad *" 
                value={integridadId} 
                options={options.integridades}
                onSelect={setIntegridadId}
                onAddNew={() => handleAddNew('INTEGRIDAD', 'Integridad')}
                placeholder="Seleccione el estado de integridad..."
                loading={loadingOptions}
                readOnly={readOnly}
              />
            </View>

            {/* Metadata Footer */}
            <View style={styles.metadataFooter}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>FECHA DE CREACIÓN</Text>
                <Text style={styles.metadataValue}>{formatDate(metadata.created)}</Text>
              </View>
              {metadata.updated ? (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>ÚLTIMA MODIFICACIÓN</Text>
                  <Text style={styles.metadataValue}>{formatDate(metadata.updated)}</Text>
                </View>
              ) : null}
              <View style={styles.technicianBadge}>
                <View style={styles.technicianIcon}>
                  <User size={14} color={Theme.colors.onPrimaryFixed} />
                </View>
                <View>
                  <Text style={styles.technicianLabel}>Técnico a cargo</Text>
                  <Text style={styles.technicianName}>{userName || 'Técnico Autenticado'}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {!readOnly && (
                <TouchableOpacity 
                  style={[styles.primaryButton, loading && { opacity: 0.7 }]} 
                  onPress={handleSave} 
                  disabled={loading}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? 'Procesando...' : isEditing ? 'Guardar Cambios' : 'Crear Semilla'}
                  </Text>
                  <ArrowRight size={20} color={Theme.colors.onSecondary} />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  resetForm();
                  navigation.navigate('InventarioSemillas');
                }}
              >
                <Text style={styles.cancelButtonText}>{readOnly ? 'Volver' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal for adding new catalog item */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.addModalOverlay}>
          <View style={styles.addModalContent}>
            <Text style={styles.addModalTitle}>Nuevo/a {activeCategory.label}</Text>
            <TextInput
              style={styles.addInput}
              placeholder={`Nombre de ${activeCategory.label.toLowerCase()}...`}
              value={newVal}
              onChangeText={setNewVal}
              maxLength={30}
              autoFocus
            />
            <View style={styles.addModalActions}>
              <TouchableOpacity 
                style={styles.addCancelBtn} 
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.addCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addSaveBtn} 
                onPress={saveNewCatalogItem}
              >
                <Text style={styles.addSaveBtnText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  topNav: {
    height: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.outlineVariant,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLogo: {
    ...Theme.typography.display,
    fontSize: 18,
    fontWeight: '900',
    color: Theme.colors.primary,
    letterSpacing: -0.5,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scrollContent: {
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 24,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  heroSection: {
    marginBottom: 48,
  },
  title: {
    ...Theme.typography.display,
    fontSize: 36,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: -1,
    marginBottom: 12,
  },
  description: {
    ...Theme.typography.body,
    fontSize: 16,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 24,
  },
  formCanvas: {
    gap: 48,
  },
  section: {
    gap: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.colors.outlineVariant,
    marginLeft: 16,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    ...Theme.typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  selectText: {
    ...Theme.typography.body,
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  selectIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSpacing: {
    marginRight: 8,
  },
  metadataFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.outlineVariant,
    gap: 16,
    flexWrap: 'wrap',
  },
  metadataItem: {
    gap: 4,
  },
  metadataLabel: {
    ...Theme.typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(68, 42, 34, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metadataValue: {
    ...Theme.typography.label,
    fontSize: 14,
    fontWeight: '900',
    color: Theme.colors.onSurface,
  },
  technicianBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(241, 231, 220, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  technicianIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  technicianLabel: {
    ...Theme.typography.labelSm,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(68, 42, 34, 0.5)',
    textTransform: 'uppercase',
  },
  technicianName: {
    ...Theme.typography.label,
    fontSize: 14,
    fontWeight: '900',
    color: Theme.colors.onSurface,
  },
  actionButtons: {
    gap: 16,
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    borderRadius: 24,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryButtonText: {
    ...Theme.typography.label,
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onSecondary,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Theme.colors.error,
  },
  deleteButtonText: {
    ...Theme.typography.label,
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.error,
  },
  cancelButton: {
    backgroundColor: Theme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 24,
  },
  cancelButtonText: {
    ...Theme.typography.label,
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onSurface,
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
    backgroundColor: Theme.colors.background,
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    ...Theme.typography.label,
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.primary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.outlineVariant,
  },
  optionText: {
    ...Theme.typography.label,
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  optionTextSelected: {
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  addModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  addModalContent: {
    backgroundColor: Theme.colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  addModalTitle: {
    ...Theme.typography.headline,
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.primary,
    marginBottom: 20,
  },
  addInput: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Theme.colors.onSurface,
    marginBottom: 24,
  },
  addModalActions: {
    flexDirection: 'row',
    gap: 16,
  },
  addCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceContainerHigh,
  },
  addCancelBtnText: {
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  addSaveBtn: {
    flex: 2,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: Theme.colors.primary,
  },
  addSaveBtnText: {
    fontWeight: '700',
    color: Theme.colors.white,
  },
});

export default RegistroSemillaScreen;
