import { sembradoMetricasService } from './sembradoMetricasService';

export interface Metrics {
  tasa_germinacion: number;
  dias_emergencia: number;
  presencia_hongos: string;
}

export interface Alerta {
  title: string;
  msg: string;
}

export function getAlertasGerminacion(metrics: Metrics): Alerta[] {
  const alertsToShow: Alerta[] = [];

  // 1. Tasa de germinación crítica
  if (sembradoMetricasService.esTasaGerminacionCritica(metrics.tasa_germinacion)) {
    alertsToShow.push({
      title: 'Baja Tasa de Germinación',
      msg: 'El porcentaje de germiniacion menor al 80% nos indica problemas de viabilidad de la semilla o mal manejo de humedad/temperatura.'
    });
  }

  // 2. Surgimiento retrasado (> 75 a 90 días)
  if (sembradoMetricasService.esSurgimientoRetrasado(metrics.dias_emergencia)) {
    alertsToShow.push({
      title: 'Surgimiento Retrasado',
      msg: 'Pasarse de los 75 dias es sinónimo de pérdidas por hongos o debilidad estructural en la planta'
    });
  }

  // 3. Presencia de hongos
  if (metrics.presencia_hongos && metrics.presencia_hongos !== 'Ninguna') {
    alertsToShow.push({
      title: 'Presencia de Hongos',
      msg: `Se ha detectado una presencia ${metrics.presencia_hongos.toLowerCase()} de hongos. Se recomienda aplicar tratamiento fungicida preventivo.`
    });
  }

  return alertsToShow;
}