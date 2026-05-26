import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://auth-service-w3lo.onrender.com';

const authApi = axios.create({
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
