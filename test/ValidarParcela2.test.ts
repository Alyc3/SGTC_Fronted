jest.mock('../services/parcelas.service', () => ({
  parcelasService: {
    validate: jest.fn(),
    checkNombreUnico: jest.fn(),
  },
}));

import { validarParcela, DatosParcela } from './Validarparcela';
import { parcelasService } from '../services/parcelas.service';

describe('Registro de Parcela (Pruebas Estructurales / Caja Blanca - Cobertura de Caminos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // TC-203 | Cobertura de Caminos | Registro de nueva parcela | Negativo | Alta
  // Camino: I -> 1 -> 2 -> 3 -> 5 -> 6 -> 7 -> 8 -> 9(No) -> 11 -> 12(No)
  //         -> 18(Si) -> 19 -> 20(Si) -> 21 -> 23(Si) -> F
  //
  // Precondiciones:
  //   1. El método handleSave() está disponible.
  //   2. Parcela con nombre "ParcelaA" ya registrada en el sistema.
  //   3. Tener instalado Jest.
  // Datos de entrada: nombre "ParcelaA", hectarea: 4, altitud: 1829, tipoTerreno: Regular
  // Resultado esperado: retorna "Este nombre de parcela ya existe". La ejecución finaliza.
  // ==========================================================================
  test('CP5: nombre "ParcelaA" ya registrado -> bloquea el guardado', async () => {
    const datosPrueba: DatosParcela = {
      nombre: 'ParcelaA',
      hectareas: '4',
      altitud: '1829',
      tipoTerreno: 'Regular',
      selectedZonas: [],
      orientacion: 'Norte',
      textura: 'Franco',
    };

    // Nodo 12(No): sin errores de formato
    (parcelasService.validate as jest.Mock).mockReturnValue(null);
    // Nodo 20(Si): checkNombreUnico devuelve false porque "ParcelaA" ya existe
    (parcelasService.checkNombreUnico as jest.Mock).mockResolvedValue(false);

    const resultado = await validarParcela(datosPrueba, undefined);
    //console.log('Resultado de la validación:', resultado.erroresFormato.nombre);
    expect(resultado.tipo).toBe('NOMBRE_DUPLICADO');
    if (resultado.tipo === 'NOMBRE_DUPLICADO') {
      expect(resultado.erroresFormato.nombre).toBe('Este nombre de parcela ya existe.');
    }
    expect(parcelasService.checkNombreUnico).toHaveBeenCalledWith('ParcelaA', undefined);
  });


// ==========================================================================
  // TC-204 | Cobertura de Caminos | Registro de nueva parcela | Válido | Alta
  // Camino: I -> 1 -> 2 -> 3 -> 5 -> 6 -> 7 -> 8 -> 9(No) -> 11 -> 12(No)
  //         -> 18(Si) -> 19 -> 20(No) -> 22 -> 23(No) -> F
  //
  // Precondiciones:
  //   1. El método handleSave() está disponible.
  //   2. Tener instalado Jest.
  // Datos de entrada: nombre "ParcelaB", hectarea: 4, altitud: 1829, tipoTerreno: Regular
  // Resultado esperado: "Nombre único -> guardado exitoso sin bloqueo". La ejecución finaliza.
  // ==========================================================================
  test('CP6: nombre "ParcelaB" único -> guardado exitoso sin bloqueo', async () => {
    const datosPrueba: DatosParcela = {
      nombre: 'ParcelaB',
      hectareas: '4',
      altitud: '1829',
      tipoTerreno: 'Regular',
      selectedZonas: [],
      orientacion: 'Norte',
      textura: 'Franco',
    };

    // Nodo 12(No): sin errores de formato
    (parcelasService.validate as jest.Mock).mockReturnValue(null);
    // Nodo 20(No): checkNombreUnico devuelve true porque "ParcelaB" es único
    (parcelasService.checkNombreUnico as jest.Mock).mockResolvedValue(true);

    const resultado = await validarParcela(datosPrueba, undefined);
    console.log('Resultado de la validación:', resultado);
    expect(resultado.tipo).toBe('OK');
    expect(parcelasService.checkNombreUnico).toHaveBeenCalledWith('ParcelaB', undefined);
  });

    // ==========================================================================
  // TC-205 | Cobertura de Caminos | Registro de nueva parcela | Negativo | Alta
  // Camino real (confirmado contra parcelasService.validate()):
  // I -> 1 -> 2 -> 3 -> 5 -> 6 -> 7 -> 8 -> 9(No) -> 11 -> 12(Si)
  //   -> 13 -> 14 -> 15(No) -> 17 -> 18(No) -> 23(Si) -> F
  //
  // Precondiciones:
  //   1. El método handleSave() está disponible.
  //   2. Tener instalado Jest.
  // Datos de entrada: nombre "Pa", hectarea: 1000, altitud: 1829, tipoTerreno: Regular
  // Resultado esperado: mensajes de error de validación para nombre y hectáreas.
  //   La ejecución finaliza (return por hasErrors).
  //
  // NOTA sobre el camino: "Pa" tiene 2 caracteres (mínimo 3) y 1000 hectáreas
  // excede el máximo (100), así que validate() marca AMBOS campos con error.
  // Como validationErrors.nombre existe, el nodo 18 (nombre && !validationErrors?.nombre)
  // da falso -> 18(No). El flujo nunca entra al bloque 19-20-21-22 (no revisa unicidad)
  // y va directo a 23, donde hasErrors (seteado en el nodo 17) corta la ejecución.
  // ==========================================================================
  test('CP7: nombre muy corto y hectáreas fuera de límite -> bloquea por errores de formato', async () => {
    const datosPrueba: DatosParcela = {
      nombre: 'Pa',
      hectareas: '1000',
      altitud: '1829',
      tipoTerreno: 'Regular',
      selectedZonas: [],
      orientacion: 'Norte',
      textura: 'Franco',
    };

    // Nodo 12(Si): el servicio reporta error en nombre (< 3 caracteres) y hectareas (> 100)
    (parcelasService.validate as jest.Mock).mockReturnValue({
      nombre: 'El nombre debe tener al menos 3 caracteres.',
      hectareas: 'El máximo permitido es 100 hectáreas.',
    });

    const resultado = await validarParcela(datosPrueba, undefined);

    expect(resultado.tipo).toBe('CON_ERRORES_FORMATO');
    if (resultado.tipo === 'CON_ERRORES_FORMATO') {
      expect(resultado.erroresFormato.nombre).toBe('El nombre debe tener al menos 3 caracteres.');
      expect(resultado.erroresFormato.hectareas).toBe('El máximo permitido es 100 hectáreas.');
    }
    // Nodo 18(No): al existir error de nombre, NUNCA debe revisar unicidad (nodo 19)
    expect(parcelasService.checkNombreUnico).not.toHaveBeenCalled();
  });

  
});