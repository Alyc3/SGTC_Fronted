// Enums handled as text with type safety in Drizzle
//Enums para lote
export const EstadoLoteValues = ['Reservado', 'En_Produccion', 'Completada'] as const;
//Enum para Parcela
export const TexturaSueloValues = ['Franco-Arenosa', 'Franco-Arcillosa'] as const;
export const OrientacionLaderaValues = ['NORTE', 'SUR'] as const;
export const TipoTerrenoValues = ['Irregular', 'Regular'] as const;
export const EstadoParcelaValues = ['Libre', 'EnProduccion'] as const;
export const TipoZona = ['Zona Alta','Zona Inclinada','Zona Baja','Zona Plana'] as const;
//Enum para Semilla
export const MetodoSecadoValues = ['Al_sol_en_patio', 'Camas_africanas', 'Marquesinas', 'Mecánico', 'Mixto','Secado_a_la_sombra'] as const;
export const MetodoSeleccionValues = ['Manual', 'Por_flotación', 'Por_mallas', 'Mecánica', 'Óptica'] as const;
export const OlorValues = ['Fresco', 'A_tierra', 'Fermento', 'Reposado', 'A_humo'] as const;
export const ColorValues = ['Amarillo_pajizo', 'Blanquecino', 'Grisáceo', 'Manchado'] as const;
export const IntegridadValues = ['Intacto', 'Fisurado', 'Pelado', 'Aplastado', 'Perforado'] as const;
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
export const RolTrabajadorValues = ['Capataz', 'Sembrador', 'Recolector', 'Clasificador'] as const;
export const EtapaProcesoValues = ['Sembrado', 'Cosechado', 'Despulpado', 'Secado', 'Tostado', 'Molido', 'Empaquetado', 'Transporte'] as const;

