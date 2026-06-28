import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { offlineAuthService } from "./offline-auth.service";
import { hashPassword } from "./crypto.helper";

const API_URL = "https://auth-service-w3lo.onrender.com";

export const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para añadir el token a las peticiones
authApi.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync("userToken");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        // Si el token ya expiró localmente, ni siquiera enviamos la petición
        if (decoded.exp && decoded.exp < currentTime) {
          const { CustomAlert } = require("../components/GlobalAlert");
          const { useAuthStore } = require("../store/authStore");

          // Mostramos la alerta PRIMERO, y el logout ocurre solo cuando el usuario acepta
          CustomAlert.show(
            "ERROR",
            "Sesión Caducada",
            "Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente.",
            async () => {
              await useAuthStore.getState().logout();
              console.warn(
                "Sesión caducada aceptada. Usuario redirigido a login.",
              );
            },
          );

          // Cancelamos la petición devolviendo un error controlado
          return Promise.reject(new Error("SESSION_EXPIRED"));
        }
      } catch (e) {
        console.error("Error decodificando token en interceptor:", e);
      }

      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para manejar errores 401 (No autorizado / Sesión expirada)
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si la respuesta es 401
    if (error.response?.status === 401) {
      const originalRequest = error.config;

      // No cerrar sesión si el error viene del propio login
      if (originalRequest.url.includes("/api/auth/login")) {
        return Promise.reject(error);
      }

      try {
        const { useAuthStore } = require("../store/authStore");
        const { CustomAlert } = require("../components/GlobalAlert");
        const authStore = useAuthStore.getState();

        if (authStore.isAuthenticated) {
          // Solo lanzamos la alerta si no hay una ya visible (para evitar duplicados)
          CustomAlert.show(
            "ERROR",
            "Sesión Caducada",
            "Tu sesión ha expirado o es inválida. Por favor, inicia sesión nuevamente.",
            async () => {
              await authStore.logout();
              console.log(
                "401 detectado y aceptado. Usuario redirigido a login.",
              );
            },
          );
        } else {
          // Aseguramos que el token se limpie si falló por 401 sin estar autenticado
          await authStore.logout();
        }
      } catch (logoutError) {
        console.error("Error crítico en interceptor 401:", logoutError);
      }
    }
    return Promise.reject(error);
  },
);

export const authService = {
  /**
   * Iniciar sesión
   */
  async login(data: any) {
    const response = await authApi.post("/api/auth/login", data);
    const responseData = response.data;

    let remoteUserId: string | null = null;
    let remoteUserRole: string | null = null;

    if (responseData.access_token) {
      try {
        const decoded: any = jwtDecode(responseData.access_token);
        remoteUserId = decoded.sub;
        remoteUserRole = decoded.role;
      } catch (e) {
        console.error("[auth-service] No se pudo decodificar el token:", e);
      }
    }

    if (remoteUserId) {
      try {
        const { db } = require("../db");
        const { users } = require("../db/schema");
        const { eq } = require("drizzle-orm");

        const passwordToStore = await hashPassword(data.password); // o el hash con expo-crypto

        const localUserExists = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.id, remoteUserId),
        });

        if (localUserExists) {
          await db
            .update(users)
            .set({
              email: data.email,
              password_hash: passwordToStore,
              // role_id si lo necesitas mapear desde remoteUserRole
            })
            .where(eq(users.id, remoteUserId));
        } else {
          await db.insert(users).values({
            id: remoteUserId,
            email: data.email,
            password_hash: passwordToStore,
            status: "ACTIVO",
          });
        }

        console.log(
          `[Offline Auth] Credenciales locales actualizadas para: ${data.email}`,
        );
      } catch (dbError) {
        console.error(
          "Error al guardar las credenciales locales para uso offline:",
          dbError,
        );
      }
    } else {
      console.warn(
        "[auth-service] No se pudo obtener el ID del usuario desde el token.",
      );
    }

    return responseData;
  },

  /**
   * Registrar nuevo usuario
   */
  async register(data: any) {
    const response = await authApi.post("/api/auth/register", data);
    return response.data;
  },

  /**
   * Obtener perfil actual
   */
  async getMe() {
    const response = await authApi.get("/api/auth/me");
    return response.data;
  },

  /**
   * Recuperar contraseña (envío de correo)
   */
  async recoverPassword(email: string) {
    const response = await authApi.post("/api/auth/password-recovery", {
      email,
    });
    return response.data;
  },

  /**
   * Restablecer contraseña con token
   */
  async resetPassword(data: any) {
    const response = await authApi.post("/api/auth/reset-password", data);
    return response.data;
  },

  /**
   * List all users
   */
  async getAllUsers() {
    try {
      const response = await authApi.get("/api/users/");
      const usersData = Array.isArray(response.data)
        ? response.data
        : response.data.users || response.data.data || [];
      await offlineAuthService.cacheUsers(usersData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log(
          "[authService] Acceso restringido (403): Tu rol actual no permite listar todos los usuarios del sistema remoto.",
        );
      } else {
        console.warn(
          "authService.getAllUsers: No se pudieron obtener los usuarios de la API.",
          error.response?.status || error.message,
        );
      }
      return []; // Devolvemos array vacío para evitar romper procesos de sincronización o UI
    }
  },
};
