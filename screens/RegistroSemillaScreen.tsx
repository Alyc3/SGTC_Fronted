import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import {
  ArrowRight,
  ChevronDown,
  Plus,
  Edit2,
  User,
  Menu,
  Search,
  CircleUser,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme';
import { semillasService } from '../services';

const SelectInput = ({ label, value, options, onSelect, placeholder, showActions }: any) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.selectWrapper}
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.selectText, !value && { color: Theme.colors.onSurfaceVariant }]}>
          {value || placeholder}
        </Text>
        <View style={styles.selectIcons}>
          {showActions && (
            <View style={styles.actionIcons}>
              <Plus size={14} color={Theme.colors.onSurfaceVariant} style={styles.iconSpacing} />
              <Edit2 size={12} color={Theme.colors.onSurfaceVariant} style={styles.iconSpacing} />
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
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, value === item && styles.optionTextSelected]}>
                    {item}
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

const RegistroSemillaScreen = ({ navigation }: any) => {
  const [variedad, setVariedad] = useState('');
  const [paisOrigen, setPaisOrigen] = useState('');
  const [distribuidor, setDistribuidor] = useState('');
  const [metodoSecado, setMetodoSecado] = useState('');
  const [seleccion, setSeleccion] = useState('');
  const [olor, setOlor] = useState('');
  const [color, setColor] = useState('');
  const [integridad, setIntegridad] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!variedad) {
      Alert.alert('Error', 'La identificación botánica es necesaria.');
      return;
    }
    try {
      setLoading(true);
      await semillasService.create({
        id: Date.now().toString(),
        variedad,
        paisOrigen,
        distribuidor,
        metodoSecado,
        seleccion,
        olor,
        color,
        integridad,
        anexo_creacion: new Date().toISOString(),
      });
      Alert.alert('Éxito', 'Registro confirmado.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', 'Fallo en la persistencia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.background} />
      
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <View style={styles.navLeft}>
          <Menu size={24} color={Theme.colors.primary} />
          <Text style={styles.navLogo}>The Terroir Editorial</Text>
        </View>
        <View style={styles.navRight}>
          <Search size={24} color={Theme.colors.onSurfaceVariant} />
          <CircleUser size={24} color={Theme.colors.primary} />
        </View>
      </View>

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
            <Text style={styles.title}>Registro de semillas</Text>
            <Text style={styles.description}>
              Complete la identificación técnica para certificar el origen y calidad del lote.
            </Text>
          </View>

          {/* Form Sections */}
          <View style={styles.formCanvas}>
            
            {/* Botanical Identification */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Identificación Botánica</Text>
                <View style={styles.sectionLine} />
              </View>
              
              <SelectInput 
                label="Variedad / Tipo de café" 
                value={variedad} 
                options={['Caturra Amarillo', 'Geisha Panama Reserve', 'Bourbon Sidra', 'Typica Mejorado']}
                onSelect={setVariedad}
                placeholder="Seleccione variedad..."
                showActions
              />
              <SelectInput 
                label="Origen" 
                value={paisOrigen} 
                options={['Huila, Colombia', 'Valle Central, Costa Rica', 'Sidama, Ethiopia', 'Antigua, Guatemala']}
                onSelect={setPaisOrigen}
                placeholder="Seleccione origen..."
                showActions
              />
              <SelectInput 
                label="Distribuidor" 
                value={distribuidor} 
                options={['Global Estate Partners Ltd.', 'Origin Select Imports', 'Terroir Sourcing Collective']}
                onSelect={setDistribuidor}
                placeholder="Seleccione distribuidor..."
                showActions
              />
            </View>

            {/* Technical Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Información Técnica de la Semilla</Text>
                <View style={styles.sectionLine} />
              </View>

              <SelectInput 
                label="Método de secado" 
                value={metodoSecado} 
                options={['Al sol en patio', 'Camas africanas', 'Marquesinas', 'Mecánico', 'Mixto', 'Secado a la sombra']}
                onSelect={setMetodoSecado}
                placeholder="Seleccione el método..."
              />
              <SelectInput 
                label="Selección" 
                value={seleccion} 
                options={['Manual', 'Por flotación', 'Por mallas / Zarandas', 'Mecánica / Neumática', 'Óptica / Electrónica']}
                onSelect={setSeleccion}
                placeholder="Seleccione el tipo de selección..."
              />
              <SelectInput 
                label="Olor" 
                value={olor} 
                options={['Fresco', 'A tierra / Moho', 'Fermento / Avinagrado', 'Reposado / Rancio', 'A humo']}
                onSelect={setOlor}
                placeholder="Seleccione el perfil de olor..."
              />
              <SelectInput 
                label="Color" 
                value={color} 
                options={['Amarillo pajizo / Claro', 'Blanquecino / Hueso', 'Grisáceo / Opaco', 'Manchado / Moteado']}
                onSelect={setColor}
                placeholder="Seleccione el tono observado..."
              />
              <SelectInput 
                label="Integridad" 
                value={integridad} 
                options={['Intact o / Completo', 'Fisurado / Agrietado', 'Pelado / Trillado parcialmente', 'Aplastado / Machacado', 'Perforado / Brocado']}
                onSelect={setIntegridad}
                placeholder="Seleccione el estado de integridad..."
              />
            </View>

            {/* Metadata Footer */}
            <View style={styles.metadataFooter}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Creation Date</Text>
                <Text style={styles.metadataValue}>Oct 24, 2023 — 09:45 AM</Text>
              </View>
              <View style={styles.technicianBadge}>
                <View style={styles.technicianIcon}>
                  <User size={14} color={Theme.colors.onPrimaryFixed} />
                </View>
                <View>
                  <Text style={styles.technicianLabel}>Technician in Charge</Text>
                  <Text style={styles.technicianName}>Federico Valdez</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.primaryButton, loading && { opacity: 0.7 }]} 
                onPress={handleSave} 
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Procesando...' : 'Confirm Registration'}
                </Text>
                <ArrowRight size={20} color={Theme.colors.onSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 36,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: -1,
    marginBottom: 12,
  },
  description: {
    fontFamily: 'System',
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
    fontFamily: 'System',
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
    fontFamily: 'System',
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
    // Editorial shadow
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  selectText: {
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(68, 42, 34, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metadataValue: {
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(68, 42, 34, 0.5)',
    textTransform: 'uppercase',
  },
  technicianName: {
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onSecondary,
  },
  cancelButton: {
    backgroundColor: Theme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 24,
  },
  cancelButtonText: {
    fontFamily: 'System',
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
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  optionTextSelected: {
    fontWeight: '800',
    color: Theme.colors.primary,
  },
});

export default RegistroSemillaScreen;
