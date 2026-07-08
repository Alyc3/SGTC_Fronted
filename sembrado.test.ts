// validarBloqueCrecimiento.test.ts

jest.mock("./db", () => ({
  db: {
    query: { metricas_subetapa_sembrado: { findFirst: jest.fn() } },
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("./db/schema", () => ({
  metricas_subetapa_sembrado: {},
}));

import { validarBloqueCrecimiento } from "./utils/validarBloqueCrecimiento"; // ajusta el path real

describe("Registro de Métricas - Subetapa de Crecimiento (Pruebas Estructurales / Caja Blanca)", () => {
  // ============================================================
  // CP-01: fase distinta de "Crecimiento"
  // Camino: rama "No" del primer nodo -> sale del bloque
  // ============================================================
  test('CP-01: fase "Germinacion" -> el bloque de Crecimiento se ignora, no bloquea el guardado', () => {
    const datosPrueba = {
      indice_crecimiento: 1.2,
      grosor_tallo: 40,
      formacion_bandolas: 30,
      incidencia_foliar: 10,
    };

    const resultado = validarBloqueCrecimiento("Germinacion", datosPrueba);

    // Al ser una fase distinta, el sistema ignora el bloque y ejecuta la lógica restante
    expect(resultado).toBeNull();
  });

  // ============================================================
  // CP-02: índice de crecimiento inválido
  // Camino: primer nodo de decisión falla -> bloquea con su mensaje
  // ============================================================
  test("CP-02: índice_crecimiento fuera de rango (3.5 > 3.0) -> bloquea el guardado", () => {
    const datosPrueba = {
      indice_crecimiento: 3.5, // fuera de 0.1 - 3.0
      grosor_tallo: 40,
      formacion_bandolas: 30,
      incidencia_foliar: 10,
    };

    const resultado = validarBloqueCrecimiento("Crecimiento", datosPrueba);

    expect(resultado).toBe(
      "El índice de altura no corresponde a un rango válido de crecimiento",
    );
  });

  // ============================================================
  // CP-03: índice válido, grosor de tallo inválido
  // Camino: primer nodo pasa, segundo nodo falla -> bloquea con su mensaje
  // ============================================================
  test("CP-03: índice válido, grosor_tallo fuera de rango (90 > 80) -> bloquea el guardado", () => {
    const datosPrueba = {
      indice_crecimiento: 1.2,
      grosor_tallo: 90, // fuera de 5 - 80
      formacion_bandolas: 30,
      incidencia_foliar: 10,
    };

    const resultado = validarBloqueCrecimiento("Crecimiento", datosPrueba);

    expect(resultado).toBe(
      "El diámetro del tallo está fuera de los límites de medición estándar",
    );
  });

  // ============================================================
  // CP-04: número de bandolas en rango válido pero por encima del umbral óptimo
  // Camino: los 4 nodos de validación pasan (60 está dentro de 0-70) -> continúa el guardado
  // Nota: la alerta post-guardado "Exceso de Densidad Foliar" corresponde a
  // checkIncidenceAlerts, fuera del alcance de esta función (ver comentario abajo).
  // ============================================================
  test("CP-04: formacion_bandolas en 60 (válido, dentro de 0-70) -> NO bloquea el guardado", () => {
    const datosPrueba = {
      indice_crecimiento: 1.2,
      grosor_tallo: 40,
      formacion_bandolas: 60, // dentro de 0-70, aunque por encima del umbral óptimo de 50
      incidencia_foliar: 10,
    };

    const resultado = validarBloqueCrecimiento("Crecimiento", datosPrueba);

    // El bloque de validación estructural permite continuar; la alerta de
    // "Exceso de Densidad Foliar" es responsabilidad de checkIncidenceAlerts (no cubierto aquí)
    expect(resultado).toBeNull();
  });

  // ============================================================
  // CP-05: incidencia foliar en rango válido pero por encima del umbral óptimo
  // Camino: los 4 nodos de validación pasan (20 está dentro de 0-100) -> continúa el guardado
  // Nota: la alerta post-guardado "Incidencia Foliar Crítica" corresponde a
  // checkIncidenceAlerts, fuera del alcance de esta función (ver comentario abajo).
  // ============================================================
  test("CP-05: incidencia_foliar en 20% (válido, dentro de 0-100) -> NO bloquea el guardado", () => {
    const datosPrueba = {
      indice_crecimiento: 1.2,
      grosor_tallo: 40,
      formacion_bandolas: 30,
      incidencia_foliar: 20, // dentro de 0-100, aunque por encima del umbral óptimo de 15
    };

    const resultado = validarBloqueCrecimiento("Crecimiento", datosPrueba);

    // El bloque de validación estructural permite continuar; la alerta de
    // "Incidencia Foliar Crítica" es responsabilidad de checkIncidenceAlerts (no cubierto aquí)
    expect(resultado).toBeNull();
  });

  // ============================================================
  // CP-06: todos los valores dentro de rango válido (camino feliz completo)
  // Camino: los 4 nodos de validación pasan -> "Continuar con el guardado"
  // ============================================================
  test("CP-06: todos los campos en rango válido -> guardado exitoso sin bloqueo", () => {
    const datosPrueba = {
      indice_crecimiento: 1.2,
      grosor_tallo: 40,
      formacion_bandolas: 30,
      incidencia_foliar: 10,
    };

    const resultado = validarBloqueCrecimiento("Crecimiento", datosPrueba);

    expect(resultado).toBeNull();
  });
});