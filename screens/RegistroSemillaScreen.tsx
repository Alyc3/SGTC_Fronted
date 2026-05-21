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
  ArrowRight, 
  ChevronDown, 
  FileUp, 
  CheckCircle2, 
  X,
  Info,
  Plus,
  Edit2,
  Circle,
  User,
  FileText
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Theme } from '../theme';
import { semillasService } from '../services';

const RegistroSemillaScreen = ({ navigation }: any) => {
  const [variedad, setVariedad] = useState('');
  const [paisOrigen, setPaisOrigen] = useState('');
  const [distribuidor, setDistribuidor] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo seleccionar el archivo.');
    }
  };

  const handleSave = async () => {
    if (!variedad) {
      Alert.alert('Error', 'La identificación botánica es necesaria.');
      return;
    }
    try {
      setLoading(true);
      await semillasService.create({ 
        variedad, 
        paisOrigen, 
        distribuidor, 
        anexo_creacion: new Date().toISOString(),
        anexo_ruta: selectedFile?.uri || null,
        anexo_tamano: selectedFile?.size || null,
      });
      Alert.alert('Éxito', 'Registro confirmado.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', 'Fallo en la persistencia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.primaryContainer} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerLabel}>MODULO 1</Text>
            <Text style={styles.title}>Registro de semillas</Text>
            <Text style={styles.headerDescription}>Documentación técnica y certificación de origen.</Text>
            <View style={styles.accentBar} />
          </View>

          <View style={styles.card}>
            <InputGroup label="Variedad / Tipo de café" value={variedad} onChange={setVariedad} placeholder="Seleccione variedad..." showIcons />
            <InputGroup label="País de Origen" value={paisOrigen} onChange={setPaisOrigen} placeholder="Región o país..." showChevron />
            <InputGroup label="Distribuidor Autorizado" value={distribuidor} onChange={setDistribuidor} placeholder="Entidad exportadora..." />
          </View>

          <Text style={styles.sectionTitleAlt}>Información Técnica</Text>
          <TouchableOpacity 
            style={[styles.dropzone, selectedFile && styles.dropzoneActive]} 
            activeOpacity={0.9}
            onPress={pickDocument}
          >
            {selectedFile ? (
              <View style={styles.fileInfo}>
                <FileText size={32} color={Theme.colors.secondary} />
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileSize}>{(selectedFile.size! / 1024).toFixed(2)} KB</Text>
              </View>
            ) : (
              <>
                <FileUp size={32} color={Theme.colors.primary} />
                <Text style={styles.dropzoneText}>Adjuntar archivo CSV</Text>
                <Text style={styles.dropzoneSubtext}>Toque para seleccionar</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.technicianSection}>
            <View style={styles.technicianIconContainer}><User size={20} color={Theme.colors.primary} /></View>
            <View>
              <Text style={styles.technicianLabel}>TECHNICIAN IN CHARGE</Text>
              <Text style={styles.technicianName}>Federico Valdez</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Procesando...' : 'Confirm Registration'}</Text>
            <ArrowRight size={20} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const InputGroup = ({ label, value, onChange, placeholder, showIcons, showChevron }: any) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor={Theme.colors.outline} value={value} onChangeText={onChange} />
      {(showIcons || showChevron) && (
        <View style={styles.inputActionIcons}>
          {showIcons && <><Plus size={16} color={Theme.colors.outline} style={{marginRight: 8}} /><Edit2 size={14} color={Theme.colors.outline} style={{marginRight: 8}} /></>}
          <ChevronDown size={18} color={Theme.colors.primary} />
        </View>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f3' },
  scrollContent: { padding: Theme.spacing.lg, paddingBottom: 40 },
  header: { marginBottom: Theme.spacing.xl },
  headerLabel: { ...Theme.typography.label, fontSize: 10, letterSpacing: 2, color: '#442a22' },
  title: { ...Theme.typography.display, fontSize: 32, fontWeight: '800', color: '#442a22', marginBottom: Theme.spacing.sm },
  headerDescription: { ...Theme.typography.body, fontSize: 14, color: '#504441', lineHeight: 20 },
  accentBar: { height: 4, backgroundColor: '#442a22', width: 60, marginTop: Theme.spacing.md, borderRadius: 2 },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: Theme.spacing.lg, elevation: 1 },
  inputGroup: { marginBottom: Theme.spacing.md },
  label: { ...Theme.typography.label, fontSize: 11, fontWeight: '500', color: '#504441', marginBottom: 6, textTransform: 'uppercase' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f6ece1', borderRadius: 12, paddingHorizontal: Theme.spacing.md },
  input: { ...Theme.typography.body, flex: 1, paddingVertical: 12, color: '#1f1b14' },
  inputActionIcons: { flexDirection: 'row', alignItems: 'center' },
  sectionTitleAlt: { ...Theme.typography.headline, fontSize: 18, fontWeight: '600', color: '#1f1b14', marginTop: Theme.spacing.lg, marginBottom: Theme.spacing.md },
  dropzone: { borderWidth: 1.5, borderColor: '#d4c3be', borderStyle: 'dashed', borderRadius: 24, padding: Theme.spacing.xl, alignItems: 'center', backgroundColor: 'rgba(58, 104, 67, 0.02)', marginBottom: Theme.spacing.lg },
  dropzoneActive: { borderColor: Theme.colors.secondary, backgroundColor: 'rgba(58, 104, 67, 0.05)', borderStyle: 'solid' },
  dropzoneText: { ...Theme.typography.headline, fontSize: 16, fontWeight: '600', color: '#442a22', marginTop: 8 },
  dropzoneSubtext: { ...Theme.typography.label, fontSize: 12, color: Theme.colors.outline, marginTop: 4 },
  fileInfo: { alignItems: 'center' },
  fileName: { ...Theme.typography.body, fontWeight: '700', color: Theme.colors.primary, marginTop: 8 },
  fileSize: { ...Theme.typography.label, fontSize: 12, color: Theme.colors.outline },
  technicianSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1e7dc', padding: Theme.spacing.lg, borderRadius: 20, marginBottom: Theme.spacing.xl },
  technicianIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', marginRight: Theme.spacing.md },
  technicianLabel: { ...Theme.typography.label, fontSize: 9, letterSpacing: 1.5, color: '#504441' },
  technicianName: { ...Theme.typography.body, fontSize: 15, fontWeight: '600', color: '#1f1b14' },
  primaryButton: { backgroundColor: '#442a22', paddingVertical: 18, borderRadius: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' }
});

export default RegistroSemillaScreen;
