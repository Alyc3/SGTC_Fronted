import React, { useState } from 'react';
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
} from 'react-native';
import {
  ArrowLeft,
  MoreVertical,
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

const RegisterPersonalScreen = ({ navigation }: any) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleRegister = () => {
    if (!firstName || !lastName || !email || !password || !role) {
      CustomAlert.show('ALERTA', 'Campos Incompletos', 'Por favor, complete todos los campos obligatorios.');
      return;
    }
    // Lógica de registro aquí
    CustomAlert.show('SUCCESS', 'Éxito', 'Colaborador registrado correctamente.', () => {
      navigation.goBack();
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color={Theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Personnel Ledger</Text>
        <TouchableOpacity style={styles.iconButton}>
          <MoreVertical size={24} color={Theme.colors.onSurface} />
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
                  onChangeText={setFirstName}
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
                  onChangeText={setLastName}
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
              <TouchableOpacity style={styles.inputWrapper} activeOpacity={0.7}>
                <Text style={[styles.input, !role && { color: Theme.colors.outline }]}>
                  {role || 'Seleccione un rol'}
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif', // Simulando serif elegante
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
});

export default RegisterPersonalScreen;
