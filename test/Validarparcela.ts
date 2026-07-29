import { parcelasService } from '../services/parcelas.service';

export interface DatosParcela {
  nombre: string;
  hectareas: string;
  altitud: string;
  tipoTerreno: string;
  selectedZonas: string[];
  orientacion: string;
  textura: string;
}

export type ResultadoValidacion =
  | { tipo: 'CAMPOS_FALTANTES'; missingFields: string[] }
  | { tipo: 'ALTITUD_CRITICA'; mensaje: string; erroresFormato: Record<string, string> }
  | { tipo: 'NOMBRE_DUPLICADO'; erroresFormato: Record<string, string> }
  | { tipo: 'CON_ERRORES_FORMATO'; erroresFormato: Record<string, string> }
  | { tipo: 'OK' };

export async function validarParcela(
  datos: DatosParcela,
  parcelId: string | undefined,
): Promise<ResultadoValidacion> {
  const { nombre, hectareas, altitud, tipoTerreno, selectedZonas, orientacion, textura } = datos;

  const missingFields: string[] = [];
  if (!nombre) missingFields.push('Nombre de Parcela');
  if (!hectareas) missingFields.push('Hectáreas');
  if (!altitud) missingFields.push('Altitud (Calibre GPS)');
  if (tipoTerreno === 'Irregular' && selectedZonas.length === 0) {
    missingFields.push('Clasificación de Zonas');
  }

  if (missingFields.length > 0) {
    return { tipo: 'CAMPOS_FALTANTES', missingFields };
  }

  const validationErrors = parcelasService.validate({
    nombre,
    hectareas,
    altitud,
    tipoTerreno,
    orientacionLadera: orientacion,
    textura,
  } as any);

  const erroresFormato: Record<string, string> = {};
  let hasErrors = false;

  if (validationErrors) {
    if (validationErrors.nombre) erroresFormato.nombre = validationErrors.nombre;
    if (validationErrors.hectareas) erroresFormato.hectareas = validationErrors.hectareas;
    if (validationErrors.altitud) {
      return { tipo: 'ALTITUD_CRITICA', mensaje: validationErrors.altitud, erroresFormato };
    }
    hasErrors = true;
  }

  if (nombre && !erroresFormato.nombre) {
    try {
      const esNombreUnico = await parcelasService.checkNombreUnico(nombre, parcelId);
      if (!esNombreUnico) {
        erroresFormato.nombre = 'Este nombre de parcela ya existe.';
        hasErrors = true;
      }
    } catch (e) {
      // no bloquea el guardado si falla la verificación
    }
  }

  if (hasErrors) {
    return erroresFormato.nombre === 'Este nombre de parcela ya existe.'
      ? { tipo: 'NOMBRE_DUPLICADO', erroresFormato }
      : { tipo: 'CON_ERRORES_FORMATO', erroresFormato };
  }

  return { tipo: 'OK' };
}