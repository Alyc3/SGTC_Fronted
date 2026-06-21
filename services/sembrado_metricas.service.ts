import { db } from '../db';
import { metricas_subetapa_sembrado } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const sembradoMetricasService = {
  /**
   * Filtra el texto ingresado para permitir únicamente números enteros del 0 al 100.
   */
  filtrarTasaGerminacion(value: string): string {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean === '') return '';
    const num = parseInt(clean, 10);
    if (isNaN(num)) return '';
    if (num > 100) return '100';
    return num.toString();
  },

  /**
   * Valida si la tasa de germinación es un número entero entre 0 y 100.
   */
  validarTasaGerminacion(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 && num <= 100;
  },

  /**
   * Verifica si la tasa de germinación es menor al 80%.
   */
  esTasaGerminacionCritica(tasa: any): boolean {
    if (tasa === undefined || tasa === null || tasa === '') return false;
    const num = Number(tasa);
    return !isNaN(num) && num < 80;
  },

  /**
   * Filtra el texto ingresado para permitir únicamente números enteros de días de emergencia/surgimiento (máximo 90).
   */
  filtrarDiasEmergencia(value: string): string {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean === '') return '';
    const num = parseInt(clean, 10);
    if (isNaN(num)) return '';
    if (num > 90) return '90';
    return num.toString();
  },

  /**
   * Valida si los días de emergencia/surgimiento es un número entero entre 1 y 90.
   */
  validarDiasEmergencia(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return Number.isInteger(num) && num >= 1 && num <= 90;
  },

  /**
   * Verifica si los días de emergencia/surgimiento superan los 75 días (de 76 a 90).
   */
  esSurgimientoRetrasado(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 75 && num <= 90;
  },

  /**
   * Filtra el texto ingresado para permitir únicamente números enteros de hojas verdaderas (máximo 10).
   */
  filtrarHojasVerdaderas(value: string): string {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean === '') return '';
    const num = parseInt(clean, 10);
    if (isNaN(num)) return '';
    if (num > 10) return '10';
    return num.toString();
  },

  /**
   * Valida si la cantidad de hojas verdaderas es un número entero entre 1 y 10.
   */
  validarHojasVerdaderas(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return Number.isInteger(num) && num >= 1 && num <= 10;
  },

  /**
   * Verifica si las hojas verdaderas son menores a 2.
   */
  esHojasVerdaderasJoven(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num < 2;
  },

  /**
   * Verifica si las hojas verdaderas son mayores a 8 (9 o 10).
   */
  esHojasVerdaderasPasada(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 8;
  },

  /**
   * Filtra el texto ingresado para permitir únicamente números decimales o enteros.
   */
  filtrarAlturaPlantula(value: string): string {
    let clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    return clean;
  },

  /**
   * Valida si la altura es un número decimal o entero en un rango estricto de 5 a 50 cm.
   */
  validarAlturaPlantula(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num >= 5 && num <= 50;
  },

  /**
   * Verifica si la altura es menor a 15 cm.
   */
  esAlturaMuyCorta(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num < 15;
  },

  /**
   * Verifica si la altura es mayor a 35 cm.
   */
  esAlturaMuyLarga(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 35;
  },

  /**
   * Filtra el texto ingresado para permitir únicamente números decimales o enteros (índice de crecimiento).
   */
  filtrarIndiceCrecimiento(value: string): string {
    let clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    return clean;
  },

  /**
   * Valida si el índice de crecimiento es un número decimal o entero en un rango de 0.10 a 3.00 m.
   */
  validarIndiceCrecimiento(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num >= 0.10 && num <= 3.00;
  },

  /**
   * Verifica si el índice de crecimiento indica enanismo (menor a 0.50 m).
   */
  esIndiceEnanismo(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num < 0.50;
  },

  /**
   * Verifica si el índice de crecimiento es excesivo (mayor a 2.20 m).
   */
  esIndiceExcesivo(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 2.20;
  },

  /**
   * Filtra el texto ingresado para permitir únicamente números decimales o enteros (grosor del tallo).
   */
  filtrarGrosorTallo(value: string): string {
    let clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    return clean;
  },

  /**
   * Valida si el grosor del tallo es un número decimal o entero en un rango de 5 a 80 mm.
   */
  validarGrosorTallo(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num >= 5 && num <= 80;
  },

  /**
   * Verifica si el grosor del tallo es inferior a 10 mm (raquítico).
   */
  esTalloRaquitico(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num < 10;
  },

  /**
   * Verifica si el grosor del tallo es superior a 60 mm (desproporcionado).
   */
  esTalloDesproporcionado(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 60;
  },

  /**
   * Filtra el texto ingresado para permitir únicamente números enteros (bandolas).
   */
  filtrarBandolas(value: string): string {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean === '') return '';
    const num = parseInt(clean, 10);
    if (isNaN(num)) return '';
    if (num > 70) return '70';
    return num.toString();
  },

  /**
   * Valida si la cantidad de bandolas es un número entero entre 0 y 70.
   */
  validarBandolas(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 && num <= 70;
  },

  /**
   * Verifica si la cantidad de bandolas es inferior a 10.
   */
  esBandolasDeficiente(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num < 10;
  },

  /**
   * Verifica si la cantidad de bandolas es superior a 50 (exceso de densidad).
   */
  esBandolasExcesivo(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 50;
  },

  /**
   * Filtra el texto ingresado para permitir únicamente números decimales o enteros (incidencia foliar).
   */
  filtrarIncidenciaFoliar(value: string): string {
    let clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 100) return '100';
    return clean;
  },

  /**
   * Valida si el porcentaje de incidencia foliar es un número decimal o entero entre 0 y 100.
   */
  validarIncidenciaFoliar(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  },

  /**
   * Verifica si la incidencia foliar supera el 15.00% (ataque severo).
   */
  esIncidenciaFoliarSevera(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 15.00;
  },

  /**
   * Verifica si la incidencia foliar está entre 10.00% y 15.00% (moderada).
   */
  esIncidenciaFoliarModerada(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 10.00 && num <= 15.00;
  },

  /**
   * Filtra el texto ingresado para permitir únicamente números decimales o enteros (porcentaje de cuajado).
   */
  filtrarPorcentajeCuajado(value: string): string {
    let clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 100) return '100';
    return clean;
  },

  /**
   * Valida si el porcentaje de cuajado es un número decimal o entero entre 0 y 100.
   */
  validarPorcentajeCuajado(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  },

  /**
   * Verifica si el porcentaje de cuajado es menor al 60.00% (baja eficiencia).
   */
  esCuajadoBajo(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num < 60.00;
  },

  /**
   * Filtra el texto ingresado para permitir únicamente números decimales o enteros (incidencia de broca).
   */
  filtrarIncidenciaBroca(value: string): string {
    let clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 100) return '100';
    return clean;
  },

  /**
   * Valida si el porcentaje de incidencia de broca es un número decimal o entero entre 0 y 100.
   */
  validarIncidenciaBroca(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  },

  /**
   * Verifica si la incidencia de broca es mayor al 3.00% y menor o igual a 5.00%.
   */
  esBrocaCritica(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 3.00 && num <= 5.00;
  },

  /**
   * Verifica si la incidencia de broca es mayor al 5.00%.
   */
  esBrocaSuperCritica(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 5.00;
  },

  /**
   * Filtra el texto ingresado para permitir únicamente números decimales o enteros (grados brix).
   */
  filtrarGradosBrix(value: string): string {
    let clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 30.0) return '30.0';
    return clean;
  },

  /**
   * Valida si el valor de grados brix es un número decimal o entero entre 0.0 y 30.0.
   */
  validarGradosBrix(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num >= 0.0 && num <= 30.0;
  },

  /**
   * Verifica si los grados brix indican baja concentración (menor a 14.0).
   */
  esBrixBajo(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num < 14.0;
  },

  /**
   * Verifica si los grados brix indican maduración acelerada (mayor a 22.0).
   */
  esBrixAlto(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 22.0;
  },

  /**
   * Get metrics for a specific lot and sub-phase
   */
  async getMetricas(loteId: string, subfase: any) {
    try {
      const result = await db.query.metricas_subetapa_sembrado.findFirst({
        where: and(
          eq(metricas_subetapa_sembrado.lote_id, loteId),
          eq(metricas_subetapa_sembrado.subfase, subfase)
        ),
        orderBy: (metricas, { desc }) => [desc(metricas.fecha_inicio)],
      });
      return result || null;
    } catch (error) {
      console.error('Error fetching sembrado metrics:', error);
      return null;
    }
  },

  /**
   * Save or update metrics for a sub-phase
   */
  async saveMetricas(data: any) {
    try {
      const { lote_id, subfase, tecnico_id, id: metricId } = data;
      
      let returnData;

      if (metricId) {
        // Explicitly update existing record
        returnData = await db.update(metricas_subetapa_sembrado)
          .set({
            ...data,
            is_synced: false,
          })
          .where(eq(metricas_subetapa_sembrado.id, metricId))
          .returning();
      } else {
        // Check if an open record already exists for this sub-phase
        const existing = await this.getMetricas(lote_id, subfase);

        if (existing && !existing.fecha_fin) {
          // Update existing open record
          returnData = await db.update(metricas_subetapa_sembrado)
            .set({
              ...data,
              is_synced: false,
            })
            .where(eq(metricas_subetapa_sembrado.id, existing.id))
            .returning();
        } else {
          // Create new record
          const { id: _, ...insertData } = data; // quitamos ID potencial por si venía de un mock
          const id = uuidv4();
          returnData = await db.insert(metricas_subetapa_sembrado).values({
            ...insertData,
            id,
            fecha_inicio: data.fecha_inicio || new Date().toISOString(),
            is_synced: false,
          }).returning();
        }
      }
      return returnData[0];
    } catch (error) {
      console.error('Error saving sembrado metrics:', error);
      throw error;
    }
  },

  /**
   * Close a sub-phase by setting the end date
   */
  async closeSubfase(loteId: string, subfase: any) {
    try {
      const existing = await this.getMetricas(loteId, subfase);
      if (existing && !existing.fecha_fin) {
        await db.update(metricas_subetapa_sembrado)
          .set({
            fecha_fin: new Date().toISOString(),
            is_synced: false,
          })
          .where(eq(metricas_subetapa_sembrado.id, existing.id));
      }
    } catch (error) {
      console.error('Error closing sub-phase:', error);
    }
  }
};
