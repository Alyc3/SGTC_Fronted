import { getAlertasGerminacion, Metrics } from './germinacionAlertas';

describe('getAlertasGerminacion - Casos de prueba CP1 a CP8', () => {

  test('CP1: Ninguna condición de alerta presente -> No mostrar ninguna alerta', () => {
    const metrics: Metrics = { tasa_germinacion: 85, dias_emergencia: 40, presencia_hongos: 'Ninguna' };
    const alertas = getAlertasGerminacion(metrics);
    expect(alertas).toHaveLength(0);
  });

    test('CP2: Solo baja germinación -> Solo Alerta de germinación', () => {
    const metrics: Metrics = { tasa_germinacion: 70, dias_emergencia: 40, presencia_hongos: 'Ninguna' };
    const alertas = getAlertasGerminacion(metrics);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].title).toBe('Baja Tasa de Germinación');
  });
  
  test('CP3: Solo surgimiento retrasado -> Solo Alerta de surgimiento', () => {
    const metrics: Metrics = { tasa_germinacion: 85, dias_emergencia: 80, presencia_hongos: 'Ninguna' };
    const alertas = getAlertasGerminacion(metrics);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].title).toBe('Surgimiento Retrasado');
  });


  test('CP4: Solo presencia de hongos -> Solo Alerta de hongos', () => {
    const metrics: Metrics = { tasa_germinacion: 85, dias_emergencia: 40, presencia_hongos: 'Moderada' };
    const alertas = getAlertasGerminacion(metrics);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].title).toBe('Presencia de Hongos');
  });

 
  test('CP5: Baja germinación y surgimiento retrasado -> Ambas alertas', () => {
    const metrics: Metrics = { tasa_germinacion: 70, dias_emergencia: 80, presencia_hongos: 'Ninguna' };
    const alertas = getAlertasGerminacion(metrics);
    expect(alertas).toHaveLength(2);
    expect(alertas.map(a => a.title)).toEqual(
      expect.arrayContaining(['Baja Tasa de Germinación', 'Surgimiento Retrasado'])
    );
  });

  
    
  test('CP6: Baja germinación y presencia de hongos -> Ambas alertas', () => {
    const metrics: Metrics = { tasa_germinacion: 70, dias_emergencia: 40, presencia_hongos: 'Moderada' };
    const alertas = getAlertasGerminacion(metrics);
    expect(alertas).toHaveLength(2);
    expect(alertas.map(a => a.title)).toEqual(
      expect.arrayContaining(['Baja Tasa de Germinación', 'Presencia de Hongos'])
    );
  });



  
 test('CP7: Surgimiento retrasado y presencia de hongos -> Ambas alertas', () => {
    const metrics: Metrics = { tasa_germinacion: 85, dias_emergencia: 80, presencia_hongos: 'Moderada' };
    const alertas = getAlertasGerminacion(metrics);
    expect(alertas).toHaveLength(2);
    expect(alertas.map(a => a.title)).toEqual(
      expect.arrayContaining(['Surgimiento Retrasado', 'Presencia de Hongos'])
    );
  });

  

  test('CP8: Todas las condiciones presentes -> Mostrar todas las alertas', () => {
    const metrics: Metrics = { tasa_germinacion: 70, dias_emergencia: 80, presencia_hongos: 'Moderada' };
    const alertas = getAlertasGerminacion(metrics);
    expect(alertas).toHaveLength(3);
    expect(alertas.map(a => a.title)).toEqual(
      expect.arrayContaining(['Baja Tasa de Germinación', 'Surgimiento Retrasado', 'Presencia de Hongos'])
    );
  });
});