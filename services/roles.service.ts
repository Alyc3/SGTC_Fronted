import { authApi } from "./auth-service";
import { offlineAuthService } from "./offline-auth.service";

export const rolesService = {
  /**
   * List all roles
   */
  async getAll() {
    try {
      const response = await authApi.get("/api/roles/");
      const rolesData = Array.isArray(response.data)
        ? response.data
        : response.data.roles || response.data.data || [];
      await offlineAuthService.cacheRoles(rolesData);
      return response.data;
    } catch (error: any) {
      try {
        const localRoles = await offlineAuthService.getAllRoles();
        if (localRoles.length > 0) {
          console.log(
            "[rolesService] Usando roles locales cacheados porque la API no estuvo disponible.",
          );
          return localRoles;
        }
      } catch (localError) {
        console.warn(
          "rolesService.getAll: No se pudieron obtener los roles locales.",
          localError,
        );
      }

      if (error.response?.status === 403) {
        console.log(
          "[rolesService] Acceso restringido (403): El rol actual no tiene permisos para listar roles remotos. Usando datos locales.",
        );
      } else {
        console.warn(
          "rolesService.getAll: No se pudieron obtener los roles.",
          error.response?.status || error.message,
        );
      }
      return []; // Devolvemos un array vacío para evitar romper la UI
    }
  },

  /**
   * Create a new role
   */
  async create(data: { name: string; description?: string }) {
    const response = await authApi.post("/api/roles/", data);
    return response.data;
  },

  /**
   * Update an existing role
   */
  async update(id: string, data: { name: string; description?: string }) {
    const response = await authApi.put(`/api/roles/${id}`, data);
    return response.data;
  },

  /**
   * Delete a role
   */
  async delete(id: string) {
    const response = await authApi.delete(`/api/roles/${id}`);
    return response.data;
  },
};
