// Enums handled as text with type safety in Drizzle
//Enums para lote
export const EstadoLoteValues = ['Creado', 'Reservado', 'En_Produccion', 'Completada'] as const;
//Enum para Parcela
export const TexturaSueloValues = ['Franco-Arenosa', 'Franco-Arcillosa'] as const;
export const OrientacionLaderaValues = ['NORTE', 'SUR'] as const;
export const TipoTerrenoValues = ['Irregular', 'Regular'] as const;
export const EstadoParcelaValues = ['Libre', 'EnProduccion'] as const;
export const TipoZona = ['Zona Alta','Zona Inclinada','Zona Baja','Zona Plana'] as const;
//Enum para Sembrado
export const SubFaseSiembraValues = ['Germinacion', 'Vivero', 'Crecimiento', 'Floracion', 'Maduracion'] as const;
//Enum para Cosechado
//Enum para Despulpado
//Enum para Secado
//Enum para Tostado
//Enum para Molido
//Enum para Empaquetado
//Enum para Trasnporte
//Enum para Incidencias
//Enum para Calidad
export const CalidadFinalValues = ['Alta', 'Media', 'Baja'] as const;
//Enum para Etapa
export const EtapaActualValues = ['Pendiente', 'En_Proceso', 'Completada'] as const;
//Enum para Trabajador
export const EtapaProcesoValues = ['Administración', 'Sembrado', 'Cosechado', 'Despulpado', 'Secado', 'Tostado', 'Molido', 'Empaquetado', 'Transporte'] as const;

// Enum para Presencia de Hongos en Sembrado
export const PresenciaHongosValues = ['Ninguna', 'Baja', 'Moderada'] as const;
