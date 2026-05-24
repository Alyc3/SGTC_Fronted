# Plan de Implementación: Tabla de Búsqueda Dinámica (Catálogo)

## 1. Objetivo
Crear una nueva tabla `catalogo` que actuará como tabla de búsqueda centralizada (Lookup Table) para poblar los selectores dinámicos en la interfaz de usuario, y refactorizar la tabla `semillas` para usar claves foráneas (FKs) que apunten a este catálogo, mejorando la integridad y escalabilidad de los datos.

## 2. Alcance e Impacto
- **Nuevo Esquema:** Creación de la tabla `catalogo` en la base de datos local y remota.
- **Refactorización de Esquema:** Actualización de la tabla `semillas` para reemplazar múltiples campos de texto con claves foráneas.
- **Servicios:** Creación de `catalogo.service.ts` (CRUD local) y `catalogo.sync.ts` (Sincronización con Neon).
- **Interfaz de Usuario:** Modificación de `RegistroSemillaScreen.tsx` para cargar las opciones de los `SelectInput` desde la base de datos de manera asíncrona.
- **Migración de Datos:** Los datos existentes (si los hay) requerirán migración o re-siembra (seeding) inicial del catálogo.

## 3. Solución Propuesta

### 3.1. Nuevo Esquema `catalogo`
Archivo: `db/schema/catalogo.ts`
- `id` (Text/UUID) - Primary Key.
- `categoria` (Text) - Indexado (ej. 'VARIEDAD_CAFE', 'PAIS_ORIGEN', 'METODO_SECADO').
- `valor` (Text) - El valor a mostrar (ej. 'Geisha Panama Reserve').
- `activo` (Integer/Boolean) - Default true.
- `origen_local` (Integer/Boolean) - Para rastrear si fue creado offline (útil para la sincronización).
- `is_synced` (Integer/Boolean) - Bandera de sincronización estándar.

### 3.2. Actualización del Esquema `semillas`
Archivo: `db/schema/semillas.ts`
Los campos de texto actuales serán reemplazados por FKs:
- `variedad_id` references `catalogo.id`
- `pais_origen_id` references `catalogo.id`
- `distribuidor_id` references `catalogo.id`
- `metodo_secado_id` references `catalogo.id`
- `seleccion_id` references `catalogo.id`
- `olor_id` references `catalogo.id`
- `color_id` references `catalogo.id`
- `integridad_id` references `catalogo.id`

### 3.3. Relaciones
Archivo: `db/schema/relations.ts`
Se definirán las relaciones de Drizzle donde una `semilla` tiene múltiples relaciones `one` hacia el `catalogo` por cada uno de sus campos, y el `catalogo` tiene relaciones `many` hacia `semillas`.

### 3.4. Servicios de Sincronización
- **Local:** `services/catalogo.service.ts` para obtener valores por categoría (`getByCategoria(cat: string)`).
- **Online:** `services/online/catalogo.sync.ts` con lógica de upsert bidireccional, similar a `parcelas.sync.ts`.

## 4. Plan de Implementación por Fases

### Fase 1: Estructura de Datos
1. Crear el esquema local `catalogo.ts`.
2. Crear el esquema online equivalente en `db/schema_online/`.
3. Actualizar `semillas.ts` y `db/schema_online/semillas.ts` con las claves foráneas.
4. Actualizar `db/schema/relations.ts`.
5. Ejecutar generación de migraciones (`drizzle-kit generate` y `drizzle-kit push`).

### Fase 2: Servicios
1. Implementar `services/catalogo.service.ts` con las funciones de consulta.
2. Implementar `services/online/catalogo.sync.ts`.
3. Agregar el sincronizador de catálogo al orquestador `sync.service.ts` (debe ejecutarse ANTES que el sincronizador de semillas).

### Fase 3: Integración en la Interfaz (UI)
1. Actualizar `RegistroSemillaScreen.tsx` para cargar las opciones del catálogo usando un `useEffect`.
2. Cambiar la lógica del estado de los inputs para que guarden el `id` (del catálogo) en lugar del valor de texto en la tabla de semillas.
3. Asegurar que si el dispositivo está offline, los catálogos se lean de la tabla local.

## 5. Estrategia de Migración y Rollback
Debido a que cambiamos el tipo de columnas en `semillas` (de texto a ID/Referencia), los datos existentes de semillas podrían invalidarse. Si el entorno ya está en producción, se requerirá un script de inicialización (`seed.ts`) que vuelque las opciones estáticas (que actualmente están hardcodeadas o en `enums.ts`) dentro de la tabla `catalogo` y luego migre los registros existentes de `semillas` emparejando los textos con los nuevos IDs. Dado el estado temprano del proyecto, sugerimos un reset de la tabla `semillas` si los datos actuales son solo de prueba.