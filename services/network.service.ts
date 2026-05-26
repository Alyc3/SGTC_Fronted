/**
 * Servicio para verificar la conectividad a internet de forma ligera.
 * Se utiliza un "ping" via fetch para asegurar que el internet es alcanzable,
 * evitando bloqueos de los drivers de base de datos cuando la red está inestable.
 */
export const networkService = {
  async isOnline(): Promise<boolean> {
    try {
      // Usamos un timeout corto de 2 segundos para no bloquear la UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      // Usar un endpoint confiable que responde a peticiones GET/HEAD
      // Google's generate_204 es el estándar para verificar conectividad
      const response = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.status === 204 || response.ok;
    } catch (error) {
      console.log('[networkService] Sin conexión a internet o timeout alcanzado.');
      return false;
    }
  }
};
