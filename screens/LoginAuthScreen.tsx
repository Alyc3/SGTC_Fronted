import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Theme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { CustomAlert } from '../components/GlobalAlert';

const LoginAuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    if (!email.trim() || !password.trim()) {
      CustomAlert.show('ALERTA', 'Campos Incompletos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      // Obtenemos el error ya formateado (string) desde el store
      const formattedError = (useAuthStore.getState().error || '').toLowerCase();
      const status = err.response?.status;

      // 1. Caso: Cuenta no encontrada o formato de correo inválido
      if (status === 404 || formattedError.includes('no existe') || formattedError.includes('valid email')) {
        CustomAlert.show('ERROR', 'Correo Incorrecto', 'El correo electrónico es incorrecto.');
      } 
      // 2. Caso: Error de contraseña o validaciones múltiples (401 o 422)
      else if (status === 401 || status === 422) {
        const hasPwdErr = formattedError.includes('password') || formattedError.includes('contraseña');
        const hasEmailErr = formattedError.includes('email') || formattedError.includes('correo');

        if (hasEmailErr && hasPwdErr) {
          CustomAlert.show('ERROR', 'Campos Incorrectos', 'Ambos campos están incorrectos.');
        } else if (hasPwdErr) {
          CustomAlert.show('ERROR', 'Contraseña Incorrecta', 'La contraseña es incorrecta.');
        } else if (hasEmailErr) {
          CustomAlert.show('ERROR', 'Correo Incorrecto', 'El correo electrónico es incorrecto.');
        } else {
          // Fallback para 401/422 genérico
          CustomAlert.show('ERROR', 'Campos Incorrectos', 'Ambos campos están incorrectos.');
        }
      } 
      // 3. Otros errores inesperados
      else {
        CustomAlert.show('ERROR', 'Error de Autenticación', useAuthStore.getState().error || 'Ocurrió un error inesperado.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* Header Image */}
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVK7ZICCaI33JACB3wsHFm58EfZH_dkbHJGlDy3yLPTT3siuvzuulOMAY2j6gnVdz0Qvo7Td0oVZTNlARpqhkiYUYlj3ZgfnK8A6sZhN00iec5KiCGVPWGjtUsusT6mfpaqXqckRuQV8VjpvAW1MOtf5-u89ptmj0g7vzK1_KMbQ5_yigvUzPrL3c1nWP---xnJsA6RQEGn_1yt2L5McvhpWKK3ONB9LueN1af_iSMy_wpoI0PozcgvmpE_C41hLGkvhscL_7rZ6HH' }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View style={styles.content}>
            {/* Branding */}
            <Text style={styles.brandSubtitle}>Est. 2026</Text>
            <Text style={styles.brandTitle}>Tierra Fertil</Text>
            <Text style={styles.tagline}>
              Un recorrido desde la tierra hasta la taza.
            </Text>

            {/* Form Header */}
            <View style={styles.formHeader}>
              <Text style={styles.welcomeText}>Bienvenido</Text>
              <Text style={styles.subText}>Ingresa tus credenciales para tener acceso al sistema.</Text>
            </View>

            {/* Mensaje de Error Visual */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electronico</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="email@ejemplo.com"
                  placeholderTextColor={Theme.colors.outline}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) clearError();
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Contraseña</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Olvidaste la contraseña?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Theme.colors.outline}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) clearError();
                  }}
                  secureTextEntry={!isPasswordVisible}
                />
                <TouchableOpacity 
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  style={styles.iconButton}
                >
                  <Text style={styles.toggleText}>{isPasswordVisible ? 'Ocultar' : 'Mostrar'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
              onPress={handleLogin} 
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Theme.colors.onPrimary} />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesion</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Nuevo tecnico? </Text>
              <TouchableOpacity>
                <Text style={styles.requestLink}>Pide acceso</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  heroImage: {
    width: '100%',
    height: 240,
  },
  content: {
    padding: 24,
    marginTop: -20,
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
  },
  brandSubtitle: {
    fontSize: 12,
    color: Theme.colors.secondary,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontSize: 28,
    color: Theme.colors.primary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  tagline: {
    fontSize: 14,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  formHeader: {
    marginTop: 32,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  subText: {
    fontSize: 14,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.3)',
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.onSurface,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.outline,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  forgotLink: {
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  iconButton: {
    padding: 8,
  },
  toggleText: {
    fontSize: 12,
    color: Theme.colors.outline,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: Theme.colors.primary,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    paddingBottom: 20,
  },
  footerText: {
    color: Theme.colors.onSurfaceVariant,
  },
  requestLink: {
    color: Theme.colors.secondary,
    fontWeight: 'bold',
  },
});

export default LoginAuthScreen;
