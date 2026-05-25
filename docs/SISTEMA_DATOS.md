# Guía Técnica: Arquitectura de Datos y Sincronización (SGTC)

Este documento explica la infraestructura de datos del Sistema de Gestión de Trazabilidad de Café (SGTC), detallando la convivencia entre la base de datos local (Offline) y la nube (Online), así como el funcionamiento del Catálogo Dinámico.

---

## 1. Arquitectura de Base de Datos Dual

El sistema opera bajo un modelo **Offline-First**, lo que permite trabajar en zonas sin cobertura de red y sincronizar los datos cuando la conexión sea estable.

| Atributo | Base de Datos Local (Offline) | Base de Datos Online (Nube) |
| :--- | :--- | :--- |
| **Tecnología** | SQLite (vía Expo SQLite) | PostgreSQL (vía Neon.tech) |
| **ORM** | Drizzle ORM | Drizzle ORM |
| **Propósito** | Almacenamiento inmediato y UI fluida. | Respaldo centralizado y persistencia. |
| **Ubicación** | Memoria interna del dispositivo. | Cloud (AWS/Google Cloud vía Neon). |

---

## 2. Estrategia de Sincronización

La sincronización es **unidireccional incremental (Push)**: los datos viajan del dispositivo móvil hacia la nube.

### 2.1 El mecanismo `is_synced`
Todas las tablas principales (`parcelas`, `lotes`, `semillas`, `personal`, `catalogo`) incluyen una columna booleana llamada `is_synced`.

1.  **Estado Inicial:** Al crear o editar un registro localmente, `is_synced` se establece en `false`.
2.  **Detección:** El servicio de sincronización busca todos los registros con `is_synced = false`.
3.  **Transferencia (Upsert):** El sistema envía los datos a Neon usando la lógica `ON CONFLICT DO UPDATE`. Si el registro no existe, se inserta; si existe, se actualiza (garantizando que la nube siempre tenga la última versión).
4.  **Confirmación:** Solo si Neon responde con éxito, el dispositivo móvil marca `is_synced = true`.

### 2.2 Orden de Sincronía
Para evitar errores de claves foráneas, el orquestador (`sync.service.ts`) sigue este orden:
1.  **Catálogo:** Asegura que existan las variedades, orígenes, etc.
2.  **Semillas y Personal:** Datos maestros necesarios para los lotes.
3.  **Parcelas:** Ubicaciones geográficas.
4.  **Lotes:** Registros operativos que dependen de todo lo anterior.

---

## 3. Tabla de Catálogo (Lookup Table)

La tabla `catalogo` es el motor que alimenta los selectores dinámicos de la aplicación.

### 3.1 ¿Para qué se utiliza?
En lugar de tener listas fijas en el código (hardcoded), el sistema consulta la tabla `catalogo` para llenar los desplegables de:
*   Variedades de Café (Geisha, Caturra, etc.)
*   Países de Origen (Colombia, Costa Rica, etc.)
*   Métodos de Secado, Selección, Olor, Color, etc.

### 3.2 Alimentación Dinámica
El sistema permite el **"Auto-poblado"**:
*   **Seeding Inicial:** La primera vez que se abre la app, se carga una lista base de opciones.
*   **En Caliente:** Desde la pantalla de Registro de Semillas, el usuario puede seleccionar **"+ Agregar nuevo..."**. Esto inserta un nuevo registro en la tabla `catalogo` local, el cual se sincronizará con la nube en el próximo ciclo.

---

## 4. Sincronización de Esquemas (Estructura)

Para que la sincronización de datos no falle, las tablas en el móvil y en Neon deben ser idénticas.

### 4.1 Mantenimiento de Estructura
Drizzle Kit gestiona la paridad estructural mediante dos configuraciones:

1.  **Cambio en TypeScript:** Se modifica el archivo en `db/schema/*.ts`.
2.  **Push Local:** `npx drizzle-kit generate` crea las migraciones SQL para que la app móvil se actualice sola al iniciar.
3.  **Push Online:** `npx drizzle-kit push --config=drizzle.online.config.ts` actualiza la estructura de Neon inmediatamente para que coincida con el código.

---

## 5. Gestión de Bajas (Soft Delete)

El sistema no utiliza comandos `DELETE` físicos para los datos principales. En su lugar, usa la columna `activo` (booleano).
*   **Valor 1 (True):** Registro visible y operativo.
*   **Valor 0 (False):** Registro "dado de baja". No aparece en listados pero permanece en la base de datos para no romper el historial de trazabilidad de los lotes antiguos.

---

## 6. Resumen de Comandos de Datos

| Comando | Acción |
| :--- | :--- |
| `npm run db:generate` | Crea archivos de migración local (.sql). |
| `npm run db:push:online` | Sincroniza la estructura con la base de datos Neon. |
| `npx drizzle-kit studio` | Explora los datos de la base de datos local. |
