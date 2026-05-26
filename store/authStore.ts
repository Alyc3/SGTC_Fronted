import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { authService } from '../services/auth-service';

interface AuthState {
  token: string | null;
  role: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

interface JWTPayload {
  sub: string;
  role: string;
  exp: number;
}

const formatErrorMessage = (detail: any): string => {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    // Manejar errores de validación de FastAPI (Pydantic) que vienen como lista de objetos
    return detail.map((err: any) => {
      const field = err.loc ? err.loc[err.loc.length - 1] : '';
      return `${field ? field + ': ' : ''}${err.msg || 'Error de validación'}`;
    }).join('\n');
  }
  if (typeof detail === 'object' && detail !== null) {
    return detail.msg || JSON.stringify(detail);
  }
  return 'Ocurrió un error inesperado';
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  userId: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ email, password });
      const token = response.access_token;

      if (token) {
        await SecureStore.setItemAsync('userToken', token);
        const decoded = jwtDecode<JWTPayload>(token);
        
        // Obtener el perfil real para asegurar el rol
        let realRole = decoded.role;
        try {
          const profile = await authService.getMe();
          // Intentar obtener rol de varias posibles llaves del backend
          realRole = profile.rol || profile.role || profile.role_name || decoded.role;
        } catch (profileError) {
          console.log('No se pudo obtener el perfil, usando rol del token', profileError);
        }
        
        set({
          token,
          role: realRole,
          userId: decoded.sub,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error('No se recibió un token de acceso.');
      }
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const errorMessage = detail ? formatErrorMessage(detail) : (error.message || 'Error al iniciar sesión');
      set({ error: errorMessage, isLoading: false, isAuthenticated: false });
      throw error;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
    set({
      token: null,
      role: null,
      userId: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        const decoded = jwtDecode<JWTPayload>(token);
        
        // Verificar si el token ha expirado
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          await SecureStore.deleteItemAsync('userToken');
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // Obtener el perfil real para asegurar el rol actualizado
        let realRole = decoded.role;
        try {
          const profile = await authService.getMe();
          realRole = profile.rol || profile.role || profile.role_name || decoded.role;
        } catch (profileError) {
          console.log('No se pudo obtener el perfil en restore, usando rol del token', profileError);
        }

        set({
          token,
          role: realRole,
          userId: decoded.sub,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      await SecureStore.deleteItemAsync('userToken');
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
