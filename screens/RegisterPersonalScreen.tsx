import React, { useState, useEffect, useCallback } from 'react';
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
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  User,
  IdCard,
  Eye,
  EyeOff,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Save,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { CustomAlert } from '../components/GlobalAlert';
import { rolesService } from '../services/roles.service';
import { personalService } from '../services/personal.service';
import { useAuthStore } from '../store/authStore';
import { v4 as uuidv4 } from 'uuid';

const RegisterPersonalScreen = ({ navigation, route }: any) => {
  const { role: userRoleRaw } = useAuthStore();

  // Control de gestos y botón físico de atrás
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Personal');
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
            navigation.navigate('Personal');
          }
        }
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [navigation])
  );
  
  const getCleanRole = () => {
    if (!userRoleRaw) return 'COLABORADOR';
    if (typeof userRoleRaw === 'string') return userRoleRaw;
    if (typeof userRoleRaw === 'object') return (userRoleRaw as any).name || (userRoleRaw as any).role || 'COLABORADOR';
    return String(userRoleRaw);
  };

  const currentRole = getCleanRole();
  const displayRole = currentRole.trim().toUpperCase().replace(/_/g, ' ');
  const isCapatazUser = currentRole.trim().toUpperCase() === 'CAPATAZ';

  const editWorker = route.params?.worker;
  const isEditMode = !!editWorker;

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

  // Cargar datos si estamos en modo edición
  useEffect(() => {
    if (editWorker) {
      setFirstName(editWorker.first_name || '');
      setLastName(editWorker.last_name || '');
      setEmail(editWorker.email || '');
      setIdentifier(editWorker.identifier || '');
      setPhoneNumber(editWorker.phone_number || '');
      setIsActive(editWorker.status === 'ACTIVO');
      // Nota: No precargamos el password por seguridad
    }
  }, [editWorker]);

  // Vincular el rol una vez que la lista de roles esté cargada
  useEffect(() => {
    if (editWorker && availableRoles.length > 0) {
      const foundRole = availableRoles.find(r => r.id === editWorker.role_id);
      if (foundRole) setRole(foundRole);
    }
  }, [editWorker, availableRoles]);

  // Limpiar identificador si cambia el tipo de documento (solo si no estamos cargando datos iniciales)
  useEffect(() => {
    if (!editWorker) {
      setIdentifier('');
    }
  }, [documentType]);

  const fetchRoles = async () => {
    try {
      setIsRolesLoading(true);
      const data = await rolesService.getAll();
      let rolesArray = Array.isArray(data) ? data : (data.roles || data.data || []);
      
      // Fallback si no hay roles (error 403 o red)
      if (rolesArray.length === 0) {
        rolesArray = [
          { id: 'TRABAJADOR', name: 'Trabajador', description: 'Personal operativo de campo' },
          { id: 'CAPATAZ', name: 'Capataz', description: 'Supervisor de cuadrilla' }
        ];
      }
      
      setAvailableRoles(rolesArray);
    } catch (error: any) {
      const isSessionError = error.message === 'SESSION_EXPIRED' || error.response?.status === 401;
      if (!isSessionError) {
        console.error('Error fetching roles:', error);
        // Fallback en error
        setAvailableRoles([
          { id: 'TRABAJADOR', name: 'Trabajador', description: 'Personal operativo de campo' },
          { id: 'CAPATAZ', name: 'Capataz', description: 'Supervisor de cuadrilla' }
        ]);
      }
    } finally {
      setIsRolesLoading(false);
    }
  };

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

  const clearFields = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setIdentifier('');
    setPhoneNumber('');
    setPassword('');
    setRole(null);
    setIsActive(true);
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || (!isEditMode && !password) || !role || !identifier) {
      CustomAlert.show('ALERTA', 'Campos Incompletos', 'Por favor, complete todos los campos obligatorios.');
      return;
    }
    
    try {
      if (isEditMode) {
        await personalService.update(editWorker.id, {
          email,
          first_name: firstName,
          last_name: lastName,
          identifier,
          phone_number: phoneNumber,
          password_hash: password || editWorker.password_hash, // Mantener anterior si no se cambia
          role_id: role.id,
          status: isActive ? 'ACTIVO' : 'INACTIVO',
        });
      } else {
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
      }

      CustomAlert.show('SUCCESS', 'Éxito', isEditMode ? 'Información actualizada correctamente.' : 'Colaborador registrado correctamente.', () => {
        clearFields();
        navigation.goBack();
      });
    } catch (error) {
      console.error('Error saving personnel:', error);
      CustomAlert.show('ERROR', 'Error', 'No se pudo guardar la información.');
    }
  };

  const docTypes = [
    { label: 'Cédula', value: 'Cedula' },
    { label: 'Pasaporte', value: 'Pasaporte' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Personal');
          }
        }} style={styles.iconButton}>
          <ArrowLeft size={24} color={Theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{isEditMode ? 'Editar Perfil' : 'Nuevo Registro'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.contextText}>{displayRole}</Text>
            <Text style={styles.mainTitle}>{isEditMode ? 'Actualizar Personal' : 'Registro de Personal'}</Text>
            <Text style={styles.description}>
              {isEditMode 
                ? 'Modifique los campos necesarios para actualizar la ficha técnica del colaborador.' 
                : 'Ingrese la información detallada para habilitar las credenciales de un nuevo colaborador.'}
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
              <Text style={styles.label}>Nombres</Text>
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
              <Text style={styles.label}>Apellidos</Text>
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
                style={[styles.inputWrapper, isEditMode && { backgroundColor: Theme.colors.surfaceContainerLow }]} 
                activeOpacity={0.7}
                onPress={() => !isEditMode && setIsDocTypeModalVisible(true)}
                disabled={isEditMode}
              >
                <Text style={[styles.input, isEditMode && { color: Theme.colors.outline }]}>
                  {documentType === 'Cedula' ? 'Cédula' : 'Pasaporte'}
                </Text>
                {!isEditMode && <ChevronDown size={20} color={Theme.colors.outline} />}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Identificación ({documentType === 'Cedula' ? 'Cédula' : 'Pasaporte'})</Text>
              <View style={[styles.inputWrapper, isEditMode && { backgroundColor: Theme.colors.surfaceContainerLow }]}>
                <TextInput
                  style={[styles.input, isEditMode && { color: Theme.colors.outline }]}
                  placeholder={documentType === 'Cedula' ? "Ej. 0102030405" : "Ej. A1234567"}
                  placeholderTextColor={Theme.colors.outline}
                  keyboardType={documentType === 'Cedula' ? 'numeric' : 'default'}
                  value={identifier}
                  onChangeText={handleIdentifierChange}
                  editable={!isEditMode}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <View style={[styles.inputWrapper, (isEditMode && isCapatazUser) && { backgroundColor: Theme.colors.surfaceContainerLow }]}>
                <TextInput
                  style={[styles.input, (isEditMode && isCapatazUser) && { color: Theme.colors.outline }]}
                  placeholder="Ej. 0985369858"
                  placeholderTextColor={Theme.colors.outline}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  editable={!isEditMode || !isCapatazUser}
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
              <Text style={styles.label}>Correo Electrónico</Text>
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
              <Text style={styles.label}>{isEditMode ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</Text>
              <View style={[styles.inputWrapper, (isEditMode && isCapatazUser) && { backgroundColor: Theme.colors.surfaceContainerLow }]}>
                <TextInput
                  style={[styles.input, (isEditMode && isCapatazUser) && { color: Theme.colors.outline }]}
                  placeholder="••••••••"
                  placeholderTextColor={Theme.colors.outline}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isEditMode || !isCapatazUser}
                />
                {!isCapatazUser && (
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color={Theme.colors.outline} />
                    ) : (
                      <Eye size={20} color={Theme.colors.outline} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rol de Acceso</Text>
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
          <View style={[styles.statusCard, (isEditMode && isCapatazUser) && { opacity: 0.7 }]}>
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
              disabled={isEditMode && isCapatazUser}
            />
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>
              {isEditMode ? 'Guardar Cambios' : 'Registrar Colaborador'}
            </Text>
            <View style={styles.buttonIconContainer}>
              {isEditMode ? (
                <Save size={20} color={Theme.colors.white} />
              ) : (
                <ArrowRight size={20} color={Theme.colors.white} />
              )}
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
    ...Theme.typography.headline,
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
