import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import {
  ArrowLeft,
  Users,
  Sprout,
  CheckCircle2,
  Circle,
  ArrowRight,
  User,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react-native';
import { Theme } from '../theme';
import { lotesService } from '../services/lotes.service';
import { personalService } from '../services/personal.service';
import { EtapaProcesoValues } from '../db/schema/enums';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const AssignPersonalScreen = ({ navigation, route }: any) => {
  const [lotes, setLotes] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [selectedLote, setSelectedLote] = useState<any>(route.params?.lote || null);
  const [selectedEtapa, setSelectedEtapa] = useState<string>(EtapaProcesoValues[0]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'LOTE' | 'ETAPA'>('LOTE');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [lotesData, personnelData] = await Promise.all([
        lotesService.getAll(),
        personalService.getAll()
      ]);
      setLotes(lotesData);
      setPersonnel(personnelData);
      
      // If we don't have a lote from params, pick the first one from DB
      if (!selectedLote && lotesData.length > 0) {
        setSelectedLote(lotesData[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePersonnelSelection = (id: string) => {
    setSelectedPersonnel(prev =>
      prev.includes(id)
        ? prev.filter(pId => pId !== id)
        : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!selectedLote || selectedPersonnel.length === 0) {
      Alert.alert('Incompleto', 'Por favor seleccione un lote y al menos un trabajador.');
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        selectedPersonnel.map(workerId =>
          lotesService.asignarPersonal(selectedLote.id, workerId, selectedEtapa as any)
        )
      );
      Alert.alert('Éxito', 'Personal asignado correctamente.');
      setSelectedPersonnel([]);
    } catch (error) {
      console.error('Error assigning personnel:', error);
      Alert.alert('Error', 'No se pudo realizar la asignación.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'LOTE' | 'ETAPA') => {
    setModalType(type);
    setModalVisible(true);
  };

  const renderPersonnelItem = ({ item }: { item: any }) => {
    const isSelected = selectedPersonnel.includes(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.personnelCard,
          isSelected && { backgroundColor: Theme.colors.primaryFixed }
        ]}
        onPress={() => togglePersonnelSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.personnelAvatar}>
          <User size={20} color={Theme.colors.primary} />
        </View>
        <View style={styles.personnelInfo}>
          <Text style={styles.personnelName}>{`${item.first_name} ${item.last_name}`}</Text>
          <View style={styles.roleRow}>
            <ShieldCheck size={12} color={Theme.colors.secondary} />
            <Text style={styles.roleText}>{item.role_id || 'TRABAJADOR'}</Text>
          </View>
        </View>
        {isSelected ? (
          <CheckCircle2 size={24} color={Theme.colors.primary} />
        ) : (
          <Circle size={24} color={Theme.colors.outlineVariant} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading && lotes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('ViewLote', { lote: selectedLote })}
        >
          <ArrowLeft size={24} color={Theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>GESTIÓN DE CAMPO</Text>
        <Text style={styles.title}>Asignación de Personal</Text>
        <Text style={styles.subtitle}>Configure el equipo de trabajo para la etapa actual.</Text>
      </View>

      <View style={styles.content}>
        {/* Selection Area */}
        <View style={styles.selectionContainer}>
          <TouchableOpacity 
            style={styles.selector}
            onPress={() => openModal('LOTE')}
          >
            <View style={styles.selectorIcon}>
              <Sprout size={20} color={Theme.colors.primary} />
            </View>
            <View style={styles.selectorTextContent}>
              <Text style={styles.selectorLabel}>Lote Seleccionado</Text>
              <Text style={styles.selectorValue}>
                {selectedLote ? selectedLote.codigo : 'Seleccionar Lote'}
              </Text>
            </View>
            <ArrowRight size={20} color={Theme.colors.outline} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.selector}
            onPress={() => openModal('ETAPA')}
          >
            <View style={styles.selectorIcon}>
              <Layers size={20} color={Theme.colors.primary} />
            </View>
            <View style={styles.selectorTextContent}>
              <Text style={styles.selectorLabel}>Etapa de Trabajo</Text>
              <Text style={styles.selectorValue}>{selectedEtapa}</Text>
            </View>
            <ArrowRight size={20} color={Theme.colors.outline} />
          </TouchableOpacity>
        </View>

        {/* Personnel List Section */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Seleccionar Personal</Text>
          <Text style={styles.listCounter}>{selectedPersonnel.length} seleccionados</Text>
        </View>

        <FlatList
          data={personnel}
          renderItem={renderPersonnelItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={Theme.colors.surfaceVariant} />
              <Text style={styles.emptyText}>No hay personal registrado.</Text>
            </View>
          }
        />
      </View>

      {/* Floating Action Button / Assignment Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.assignButton}
          onPress={handleAssign}
          disabled={loading}
        >
          <LinearGradient
            colors={[Theme.colors.primary, Theme.colors.primaryContainer]}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.assignButtonText}>Confirmar Asignación</Text>
            {loading ? (
              <ActivityIndicator size="small" color={Theme.colors.onPrimary} />
            ) : (
              <CheckCircle2 size={20} color={Theme.colors.onPrimary} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'LOTE' ? 'Seleccionar Lote' : 'Seleccionar Etapa'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={modalType === 'LOTE' ? lotes : EtapaProcesoValues}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    if (modalType === 'LOTE') {
                      setSelectedLote(item);
                    } else {
                      setSelectedEtapa(item);
                    }
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {modalType === 'LOTE' ? item.codigo : item}
                  </Text>
                  {(modalType === 'LOTE' ? selectedLote?.id === item.id : selectedEtapa === item) && (
                    <CheckCircle2 size={20} color={Theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => (modalType === 'LOTE' ? item.id : index.toString())}
            />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Theme.colors.background,
  },
  backButton: {
    padding: 4,
    marginBottom: Theme.spacing.md,
    alignSelf: 'flex-start',
  },
  headerLabel: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.primary,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.primary,
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: 'Public Sans',
    fontSize: 14,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  selectionContainer: {
    paddingHorizontal: Theme.spacing.lg,
    gap: 12,
    marginBottom: Theme.spacing.xl,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 16,
    borderRadius: Theme.roundness.xl,
    gap: 16,
  },
  selectorIcon: {
    width: 44,
    height: 44,
    borderRadius: Theme.roundness.lg,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorTextContent: {
    flex: 1,
  },
  selectorLabel: {
    fontFamily: 'Public Sans',
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectorValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    marginTop: 2,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  listTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  listCounter: {
    fontFamily: 'Public Sans',
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.secondary,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: 100,
  },
  personnelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: Theme.roundness.xl,
    marginBottom: 12,
    ...Theme.shadows.ambient,
  },
  personnelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  personnelInfo: {
    flex: 1,
  },
  personnelName: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  roleText: {
    fontFamily: 'Public Sans',
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.secondary,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 16,
  },
  emptyText: {
    fontFamily: 'Public Sans',
    color: Theme.colors.outline,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Theme.spacing.lg,
    backgroundColor: 'transparent',
  },
  assignButton: {
    borderRadius: Theme.roundness.xl,
    overflow: 'hidden',
    ...Theme.shadows.ambient,
    elevation: 5,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  assignButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 27, 20, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: Theme.roundness.xxl,
    borderTopRightRadius: Theme.roundness.xxl,
    maxHeight: '70%',
    padding: Theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  modalTitle: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  closeText: {
    fontFamily: 'Public Sans',
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.surfaceContainer,
  },
  modalItemText: {
    fontFamily: 'Public Sans',
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
});

export default AssignPersonalScreen;
