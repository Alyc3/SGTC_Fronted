import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Switch,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  User,
  IdCard,
  Eye,
  EyeOff,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { CustomAlert } from '../components/GlobalAlert';
import { rolesService } from '../services/roles.service';
import { personalService } from '../services/personal.service';
import { v4 as uuidv4 } from 'uuid';

const RegisterPersonalScreen = ({ navigation }: any) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<any>(null);
  const [isActive, setIsActive] = useState(true);
  
  // Nuevos estados para tipo de documento
  const [documentType, setDocumentType] = useState('Cedula');
  const [isDocTypeModalVisible, setIsDocTypeModalVisible] = useState(false);

  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  // Limpiar identificador si cambia el tipo de documento
  useEffect(() => {
    setIdentifier('');
  }, [documentType]);

  const fetchRoles = async () => {
    try {
      setIsRolesLoading(true);
      const data = await rolesService.getAll();
      
      // Extraemos el array real, sin importar cómo lo envuelva la API
      const rolesArray = Array.isArray(data) ? data : (data.roles || data.data || []);
      
      setAvailableRoles(rolesArray);
    } catch (error: any) {
      const isSessionError = error.message === 'SESSION_EXPIRED' || error.response?.status === 401;
      if (!isSessionError) {
        console.error('Error fetching roles:', error);
        CustomAlert.show('ERROR', 'Error', 'No se pudieron cargar los roles.');
      }
    } finally {
      setIsRolesLoading(false);
    }
  };

  // Manejadores con validación
  const handleFirstNameChange = (text: string) => {
    const filtered = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (filtered.length <= 30) {
      setFirstName(filtered);
    }
  };

  const handleLastNameChange = (text: string) => {
    const filtered = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (filtered.length <= 30) {
      setLastName(filtered);
    }
  };

  const handleIdentifierChange = (text: string) => {
    if (documentType === 'Cedula') {
      const filtered = text.replace(/[^0-9]/g, '');
      if (filtered.length <= 10) {
        setIdentifier(filtered);
      }
    } else {
      const filtered = text.replace(/[^a-zA-Z0-9]/g, '');
      if (filtered.length <= 8) {
        setIdentifier(filtered);
      }
    }
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password || !role || !identifier) {
      CustomAlert.show('ALERTA', 'Campos Incompletos', 'Por favor, complete todos los campos obligatorios.');
      return;
    }
    
    try {
      await personalService.create({
        id: uuidv4(),
        email,
        first_name: firstName,
        last_name: lastName,
        identifier,
        phone_number: phoneNumber,
        password_hash: password,
        role_id: role.id,
        status: isActive ? 'ACTIVO' : 'INACTIVO',
        is_synced: false
      });

      CustomAlert.show('SUCCESS', 'Éxito', 'Colaborador registrado correctamente.', () => {
        navigation.goBack();
      });
    } catch (error) {
      console.error('Error registering personnel:', error);
      CustomAlert.show('ERROR', 'Error', 'No se pudo registrar el personal localmente.');
    }
  };

  const docTypes = [
    { label: 'Cédula', value: 'Cedula' },
    { label: 'Pasaporte', value: 'Pasaporte' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color={Theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Title Section */}
          <View style={styles.header}>
            <Text style={styles.contextText}>ADMINISTRACIÓN DE PROPIEDAD</Text>
            <Text style={styles.mainTitle}>Registro de Personal</Text>
            <Text style={styles.description}>
              Ingrese la información detallada para habilitar las credenciales de un nuevo colaborador en el sistema del predio.
            </Text>
          </View>

          {/* Section 1: Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <User size={20} color={Theme.colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Información Personal</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Antonio"
                  placeholderTextColor={Theme.colors.outline}
                  value={firstName}
                  onChangeText={handleFirstNameChange}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. García"
                  placeholderTextColor={Theme.colors.outline}
                  value={lastName}
                  onChangeText={handleLastNameChange}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de Documento</Text>
              <TouchableOpacity 
                style={styles.inputWrapper} 
                activeOpacity={0.7}
                onPress={() => setIsDocTypeModalVisible(true)}
              >
                <Text style={styles.input}>
                  {documentType === 'Cedula' ? 'Cédula' : 'Pasaporte'}
                </Text>
                <ChevronDown size={20} color={Theme.colors.outline} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Identifier ({documentType === 'Cedula' ? 'Cédula' : 'Pasaporte'})</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={documentType === 'Cedula' ? "Ej. 0102030405" : "Ej. A1234567"}
                  placeholderTextColor={Theme.colors.outline}
                  keyboardType={documentType === 'Cedula' ? 'numeric' : 'default'}
                  value={identifier}
                  onChangeText={handleIdentifierChange}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. +503 1234 5678"
                  placeholderTextColor={Theme.colors.outline}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            </View>
          </View>

          {/* Section 2: Credentials and Role */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <IdCard size={20} color={Theme.colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Credenciales y Rol</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={Theme.colors.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Theme.colors.outline}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color={Theme.colors.outline} />
                  ) : (
                    <Eye size={20} color={Theme.colors.outline} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role Name</Text>
              <TouchableOpacity 
                style={styles.inputWrapper} 
                activeOpacity={0.7}
                onPress={() => setIsRoleModalVisible(true)}
              >
                <Text style={[styles.input, !role && { color: Theme.colors.outline }]}>
                  {role?.name || 'Seleccione un rol'}
                </Text>
                <ChevronDown size={20} color={Theme.colors.outline} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusInfo}>
              <View style={styles.statusIconWrapper}>
                <CheckCircle2 size={24} color={Theme.colors.secondary} />
              </View>
              <View>
                <Text style={styles.statusLabel}>Estado del Registro</Text>
                <Text style={styles.statusValue}>{isActive ? 'ACTIVO' : 'INACTIVO'}</Text>
              </View>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: Theme.colors.surfaceVariant, true: Theme.colors.secondary }}
              thumbColor={Platform.OS === 'ios' ? undefined : Theme.colors.white}
            />
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>Registrar Colaborador</Text>
            <View style={styles.buttonIconContainer}>
              <ArrowRight size={20} color={Theme.colors.white} />
            </View>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Document Type Selection Modal */}
      <Modal
        visible={isDocTypeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDocTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tipo de Documento</Text>
              <TouchableOpacity onPress={() => setIsDocTypeModalVisible(false)}>
                <Text style={styles.closeText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={docTypes}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setDocumentType(item.value);
                    setIsDocTypeModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  {documentType === item.value && (
                    <CheckCircle2 size={20} color={Theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Role Selection Modal */}
      <Modal
        visible={isRoleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Rol</Text>
              <TouchableOpacity onPress={() => setIsRoleModalVisible(false)}>
                <Text style={styles.closeText}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            {isRolesLoading ? (
              <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginVertical: 40 }} />
            ) : (
              <FlatList
                data={availableRoles}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setRole(item);
                      setIsRoleModalVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemText}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.modalItemDescription}>{item.description}</Text>
                      )}
                    </View>
                    {role?.id === item.id && (
                      <CheckCircle2 size={20} color={Theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={[styles.description, { textAlign: 'center', marginVertical: 20 }]}>
                    No hay roles disponibles.
                  </Text>
                }
              />
            )}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  topBarTitle: {
    ...Theme.typography.label,
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  iconButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 24,
    marginBottom: 32,
  },
  contextText: {
    ...Theme.typography.labelSm,
    letterSpacing: 2,
    color: Theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  mainTitle: {
    ...Theme.typography.display,
    fontSize: 32,
    color: Theme.colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
  },
  description: {
    ...Theme.typography.body,
    fontSize: 14,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    ...Theme.typography.headline,
    fontSize: 18,
    color: Theme.colors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.outlineVariant,
    marginBottom: 20,
    opacity: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...Theme.typography.labelSm,
    color: Theme.colors.onSurfaceVariant,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: 24,
    paddingHorizontal: 20,
    height: 52,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    flex: 1,
    ...Theme.typography.body,
    fontSize: 15,
    color: Theme.colors.onSurface,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceContainerHigh,
    padding: 20,
    borderRadius: 20,
    marginBottom: 32,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(58, 104, 67, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusLabel: {
    ...Theme.typography.labelSm,
    color: Theme.colors.onSurfaceVariant,
  },
  statusValue: {
    ...Theme.typography.label,
    color: Theme.colors.secondary,
    fontWeight: '700',
  },
  registerButton: {
    backgroundColor: Theme.colors.primary,
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonText: {
    ...Theme.typography.label,
    fontSize: 16,
    color: Theme.colors.white,
    fontWeight: '700',
  },
  buttonIconContainer: {
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 27, 20, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  closeText: {
    ...Theme.typography.label,
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
    ...Theme.typography.label,
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  modalItemDescription: {
    ...Theme.typography.labelSm,
    color: Theme.colors.outline,
    marginTop: 4,
  },
});

export default RegisterPersonalScreen;
