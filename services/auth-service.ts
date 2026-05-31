import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://auth-service-w3lo.onrender.com';

export const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token a las peticiones
authApi.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores 401 (No autorizado / Sesión expirada)
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // No cerrar sesión si el error viene del propio login
      if (error.config.url.includes('/api/auth/login')) {
        return Promise.reject(error);
      }

      try {
        // Importación dinámica para evitar dependencia circular
        const { useAuthStore } = require('../store/authStore');
        const { CustomAlert } = require('../components/GlobalAlert');

        const { logout } = useAuthStore.getState();
        await logout();

        CustomAlert.show(
          'ERROR',
          'Sesión Caducada',
          'Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente.'
        );
      } catch (logoutError) {
        console.error('Error al manejar el cierre de sesión por 401:', logoutError);
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  /**
   * Iniciar sesión
   */
  async login(data: any) {
    const response = await authApi.post('/api/auth/login', data);
    return response.data;
  },

  /**
   * Registrar nuevo usuario
   */
  async register(data: any) {
    const response = await authApi.post('/api/auth/register', data);
    return response.data;
  },

  /**
   * Obtener perfil actual
   */
  async getMe() {
    const response = await authApi.get('/api/auth/me');
    return response.data;
  },

  /**
   * Recuperar contraseña (envío de correo)
   */
  async recoverPassword(email: string) {
    const response = await authApi.post('/api/auth/password-recovery', { email });
    return response.data;
  },

  /**
   * Restablecer contraseña con token
   */
  async resetPassword(data: any) {
    const response = await authApi.post('/api/auth/reset-password', data);
    return response.data;
  },
};
