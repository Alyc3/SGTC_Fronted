export const sembradoMetricasService = {
  validarTasaGerminacion(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 && num <= 100;
  },

  esTasaGerminacionCritica(tasa: any): boolean {
    if (tasa === undefined || tasa === null || tasa === '') return false;
    const num = Number(tasa);
    return !isNaN(num) && num < 80;
  },

  validarDiasEmergencia(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return Number.isInteger(num) && num >= 1 && num <= 90;
  },

  // Asumido según comentario: "Pasarse de los 75 dias..."
  esSurgimientoRetrasado(dias: any): boolean {
    if (dias === undefined || dias === null || dias === '') return false;
    const num = Number(dias);
    return !isNaN(num) && num > 75;
  }
};