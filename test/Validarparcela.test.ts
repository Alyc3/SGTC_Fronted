// Mockeamos las dependencias externas que "validate()" ni siquiera usa,
// pero que Jest igual carga porque están en el mismo archivo (parcelas.service.ts).
jest.mock('../db', () => ({
  db: {
    query: {
      parcelas: { findFirst: jest.fn(), findMany: jest.fn() },
      lotes: { findFirst: jest.fn(), findMany: jest.fn() },
      asignacion_personal: { findFirst: jest.fn(), findMany: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../db/schema', () => ({
  parcelas: {},
  lotes: {},
  asignacion_personal: {},
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));


jest.mock('../services/parcelas.service', () => {
  const real = jest.requireActual('../services/parcelas.service');
  return {
    parcelasService: {
      validate: real.parcelasService.validate, // función REAL, sin mockear
      checkNombreUnico: jest.fn(),             // esta sí simulada
    },
  };
});

import { validarParcela, DatosParcela } from './Validarparcela';
import { parcelasService } from '../services/parcelas.service';

describe('Debug: validate() real (sin mockear)', () => {
  test('TC-205 con validate() real: nombre "Pa" + hectareas 1000', async () => {
    const datosPrueba: DatosParcela = {
      nombre: 'Pa',
      hectareas: '1000',
      altitud: '1829',
      tipoTerreno: 'Regular',
      selectedZonas: [],
      orientacion: 'Norte',
      textura: 'Franco',
    };

    (parcelasService.checkNombreUnico as jest.Mock).mockResolvedValue(true);

    const resultado = await validarParcela(datosPrueba, undefined);

    console.log('Resultado con validate() REAL:', JSON.stringify(resultado, null, 2));

    expect(resultado.tipo).toBe('CON_ERRORES_FORMATO');
  });

});