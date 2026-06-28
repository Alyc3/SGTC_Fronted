import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { authService } from "../services/auth-service";
import { networkService } from "../services/network.service";
import { offlineAuthService } from "../services/offline-auth.service";

interface AuthState {
  token: string | null;
  role: string | null;
  userId: string | null;
  userName: string | null;
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
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // Manejar errores de validación de FastAPI (Pydantic) que vienen como lista de objetos
    return detail
      .map((err: any) => {
        const field = err.loc ? err.loc[err.loc.length - 1] : "";
        return `${field ? field + ": " : ""}${err.msg || "Error de validación"}`;
      })
      .join("\n");
  }
  if (typeof detail === "object" && detail !== null) {
    return detail.msg || JSON.stringify(detail);
  }
  return "Ocurrió un error inesperado";
};

export const useAuthStore = create<AuthState>((set: any) => ({
  token: null,
  role: null,
  userId: null,
  userName: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    let offlineLoginAttempted = false;
    try {
      const hasRealInternet = await networkService.verifyRealInternet();

      if (hasRealInternet) {
        const response = await authService.login({ email, password });
        const token = response.access_token;

        if (!token) {
          throw new Error("No se recibió un token de acceso.");
        }

        await SecureStore.setItemAsync("userToken", token);
        const decoded = jwtDecode<JWTPayload>(token);

        let realRole: string = decoded.role;
        let realName: string = "";
        try {
          const profile = await authService.getMe();
          const roleValue =
            profile.rol || profile.role || profile.role_name || decoded.role;

          if (roleValue && typeof roleValue === "object") {
            realRole = roleValue.name || roleValue.role || decoded.role;
          } else {
            realRole = roleValue || decoded.role;
          }

          if (profile.first_name || profile.last_name) {
            realName =
              `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
          } else if (profile.full_name) {
            realName = profile.full_name;
          }
        } catch (profileError) {
          console.log(
            "No se pudo obtener el perfil, usando rol del token",
            profileError,
          );
        }

        await offlineAuthService.saveSession({
          userId: decoded.sub,
          email,
          role: String(realRole),
          userName: realName || null,
          permissions: Array.isArray((response as any).permissions)
            ? (response as any).permissions
            : [],
          authMode: "offline",
          restoredAt: new Date().toISOString(),
        });

        set({
          token,
          role: String(realRole),
          userId: decoded.sub,
          userName: realName || null,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      offlineLoginAttempted = true;
      const offlineResponse = await offlineAuthService.login({
        email,
        password,
      });
      set({
        token: null,
        role: offlineResponse.role,
        userId: offlineResponse.userId,
        userName: offlineResponse.userName,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const isConnectionProblem =
        !error.response ||
        error.code === "ECONNABORTED" ||
        String(error.message || "")
          .toLowerCase()
          .includes("network");

      if (isConnectionProblem && !offlineLoginAttempted) {
        try {
          offlineLoginAttempted = true;
          const offlineResponse = await offlineAuthService.login({
            email,
            password,
          });
          set({
            token: null,
            role: offlineResponse.role,
            userId: offlineResponse.userId,
            userName: offlineResponse.userName,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        } catch (offlineError: any) {
          const offlineMessage =
            offlineError?.message || "No fue posible iniciar sesión offline.";
          set({
            error: offlineMessage,
            isLoading: false,
            isAuthenticated: false,
          });
          throw offlineError;
        }
      }

      const detail = error.response?.data?.detail;
      const errorMessage = detail
        ? formatErrorMessage(detail)
        : error.message || "Error al iniciar sesión";
      set({ error: errorMessage, isLoading: false, isAuthenticated: false });
      throw error;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("userToken");
    await offlineAuthService.clearSession();
    set({
      token: null,
      role: null,
      userId: null,
      userName: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (token) {
        const decoded = jwtDecode<JWTPayload>(token);

        // Verificar si el token ha expirado
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          await SecureStore.deleteItemAsync("userToken");
          const offlineSession = await offlineAuthService.restoreSession();
          if (offlineSession) {
            set({
              token: null,
              role: offlineSession.role,
              userId: offlineSession.userId,
              userName: offlineSession.userName,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }

          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // Obtener el perfil real para asegurar el rol actualizado y nombre
        let realRole: string = decoded.role;
        let realName: string = "";
        try {
          const profile = await authService.getMe();
          const roleValue =
            profile.rol || profile.role || profile.role_name || decoded.role;

          if (roleValue && typeof roleValue === "object") {
            realRole = roleValue.name || roleValue.role || decoded.role;
          } else {
            realRole = roleValue || decoded.role;
          }

          // Obtener nombre completo
          if (profile.first_name || profile.last_name) {
            realName =
              `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
          } else if (profile.full_name) {
            realName = profile.full_name;
          }
        } catch (profileError) {
          console.log(
            "No se pudo obtener el perfil en restore, usando rol del token",
            profileError,
          );
        }

        set({
          token,
          role: String(realRole),
          userId: decoded.sub,
          userName: realName || null,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      } else {
        const offlineSession = await offlineAuthService.restoreSession();
        if (offlineSession) {
          set({
            token: null,
            role: offlineSession.role,
            userId: offlineSession.userId,
            userName: offlineSession.userName,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }

        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      await SecureStore.deleteItemAsync("userToken");
      const offlineSession = await offlineAuthService.restoreSession();
      if (offlineSession) {
        set({
          token: null,
          role: offlineSession.role,
          userId: offlineSession.userId,
          userName: offlineSession.userName,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
