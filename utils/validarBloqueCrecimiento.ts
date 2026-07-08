import { sembradoMetricasService } from "../services/sembrado_metricas.service";

export const validarBloqueCrecimiento = (
  phaseId: string,
  phaseMetrics: any,
): string | null => {
  if (phaseId !== "Crecimiento") {
    return null;
  }

  if (
    phaseMetrics.indice_crecimiento !== undefined &&
    phaseMetrics.indice_crecimiento !== null &&
    phaseMetrics.indice_crecimiento !== "" &&
    !sembradoMetricasService.validarIndiceCrecimiento(
      phaseMetrics.indice_crecimiento,
    )
  ) {
    return "El índice de altura no corresponde a un rango válido de crecimiento";
  }

  if (
    phaseMetrics.grosor_tallo !== undefined &&
    phaseMetrics.grosor_tallo !== null &&
    phaseMetrics.grosor_tallo !== "" &&
    !sembradoMetricasService.validarGrosorTallo(phaseMetrics.grosor_tallo)
  ) {
    return "El diámetro del tallo está fuera de los límites de medición estándar";
  }

  if (
    phaseMetrics.formacion_bandolas !== undefined &&
    phaseMetrics.formacion_bandolas !== null &&
    phaseMetrics.formacion_bandolas !== "" &&
    !sembradoMetricasService.validarBandolas(phaseMetrics.formacion_bandolas)
  ) {
    return "La formación de bandolas no corresponde a un rango válido de crecimiento";
  }

  if (
    phaseMetrics.incidencia_foliar !== undefined &&
    phaseMetrics.incidencia_foliar !== null &&
    phaseMetrics.incidencia_foliar !== "" &&
    !sembradoMetricasService.validarIncidenciaFoliar(
      phaseMetrics.incidencia_foliar,
    )
  ) {
    return "El porcentaje de incidencia foliar debe ser un valor real entre 0 y 100";
  }

  return null;
};
