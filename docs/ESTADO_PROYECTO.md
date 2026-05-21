# Manual de Arquitectura: Sistema STGC (Trazabilidad de Café)

## 1. Visión General
El sistema STGC es una aplicación móvil diseñada para operar en condiciones extremas de campo. Utiliza una arquitectura de **Monolito Autónomo**, lo que significa que no depende de un backend externo para validar sus reglas de negocio ni para su persistencia inmediata.

---

## 2. Stack Tecnológico (Versiones de Producción)
- **Framework:** Expo SDK 54 (React Native 0.81.5, React 19.1.0).
- **ORM:** Drizzle ORM v0.45.2 (Driver nativo para Expo SQLite).
- **Base de Datos Local:** SQLite (vía `expo-sqlite`).
- **Base de Datos Remota:** Neon DB (PostgreSQL) vía protocolo HTTP (Serverless Driver).
- **Seguridad:** Inyección de entorno con `react-native-dotenv`.

---

## 3. Arquitectura de Datos

### 3.1. Modelo de Datos (Esquema Modular)
Ubicado en `db/schema/`, el modelo se divide en:
- **`semillas`**: Catálogo de variedades y origen.
- **`parcelas`**: Unidades geográficas con metadatos de suelo y ubicación.
- **`lotes`**: Unidades de producción activas vinculando parcelas y semillas.
- **`personal`**: Registro de trabajadores y roles (Capataz, Recolector, etc.).
- **`asignacion_personal`**: Gestión de mano de obra por lote y etapa.
- **`estado_etapa`**: Trazabilidad granular (Sembrado -> Cosechado -> etc.).

### 3.2. Reactividad (Live Queries)
La App utiliza **Live Queries** de Drizzle. Esto permite que cualquier cambio en la base de datos SQLite (ya sea por una acción del usuario o un proceso de fondo) se refleje instantáneamente en la UI sin necesidad de estados manuales redundantes o recargas de pantalla.

---

## 4. Estrategia de Sincronización
El `syncService` gestiona la integridad entre el dispositivo y la nube:

1.  **Detección:** Escanea registros con `is_synced: false`.
2.  **Upsert (Idempotencia):** Utiliza consultas `INSERT ... ON CONFLICT DO UPDATE` en Neon DB. Esto permite reintentar la sincronización sin crear duplicados y actualizando la información más reciente.
3.  **Confirmación:** Una vez que Neon confirma el HTTP 200, el registro local se marca como sincronizado.

---

## 5. Configuración y Seguridad
- **Archivos SQL:** Se inyectan en el binario mediante `babel-plugin-inline-import`.
- **Variables de Entorno:** La `DATABASE_URL` debe estar en un archivo `.env` en la raíz (no incluido en Git).
- **TypeScript:** Soporte total para variables de entorno y tipos de esquema en `types.d.ts`.

---

## 6. Comandos de Mantenimiento
- **Generar Migraciones:** `npm run db:generate`.
- **Limpiar y Ejecutar:** `npx expo start --clear`.
- **Prerrequisitos:** Tener una instancia de Neon DB con las tablas inicializadas (ver script de inicialización en el historial de desarrollo).

---

## 7. Mejores Prácticas Aplicadas
- **Cero Bordes (UI):** Diseño basado en profundidad tonal.
- **UUIDs Universales:** Previene colisiones de datos entre múltiples dispositivos.
- **Separación de Lógica:** La UI solo consume servicios, no conoce la implementación SQL.
