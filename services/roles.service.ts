import { authApi } from './auth-service';

export const rolesService = {
  /**
   * List all roles
   */
  async getAll() {
    const response = await authApi.get('/api/roles/');
    return response.data;
  },

  /**
   * Create a new role
   */
  async create(data: { name: string, description?: string }) {
    const response = await authApi.post('/api/roles/', data);
    return response.data;
  },

  /**
   * Update an existing role
   */
  async update(id: string, data: { name: string, description?: string }) {
    const response = await authApi.put(`/api/roles/${id}`, data);
    return response.data;
  },

  /**
   * Delete a role
   */
  async delete(id: string) {
    const response = await authApi.delete(`/api/roles/${id}`);
    return response.data;
  }
};
