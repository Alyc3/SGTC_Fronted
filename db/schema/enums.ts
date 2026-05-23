// Enums handled as text with type safety in Drizzle

export const TexturaSueloValues = ['Franco-Arenosa', 'Franco-Arcillosa'] as const;
export const OrientacionLaderaValues = ['NORTE', 'SUR'] as const;
export const TipoTerrenoValues = ['Irregular', 'Regular'] as const;
export const EstadoParcelaValues = ['Libre', 'EnProduccion'] as const;
export const TipoZona = ['Zona Alta','Zona Inclinada','Zona Baja','Zona Plana'] as const;
export const EstadoLoteValues = ['Creado', 'En Proceso', 'Completado'] as const;
export const CalidadFinalValues = ['Alta', 'Media', 'Baja'] as const;
export const RolTrabajadorValues = ['Capataz', 'Sembrador', 'Recolector', 'Clasificador'] as const;
export const EtapaProcesoValues = ['Sembrado', 'Cosechado', 'Despulpado', 'Secado', 'Tostado', 'Molido', 'Empaquetado', 'Transporte'] as const;
export const SubFaseSiembraValues = ['Germinacion', 'Vivero', 'Crecimiento', 'Floracion', 'Maduracion'] as const;
export const EtapaActualValues = ['Pendiente', 'En_Proceso', 'Completada'] as const;
export const EtapaLoteValues = ['Reservado', 'En_Produccion', 'Completada'] as const;
