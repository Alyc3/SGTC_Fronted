# Sistema de Sincronización Robusta (Implementación)

Se ha implementado un sistema de sincronización integral que garantiza el funcionamiento Offline-First, maneja la conectividad inestable ("Internet Fantasma") y proporciona retroalimentación visual al usuario sin ser intrusivo.

## Cambios Realizados

### 1. Adaptación del Modelo de Datos (SQLite + Drizzle)
Se han actualizado los esquemas locales para incluir metadatos de sincronización obligatorios en las tablas principales (`parcelas`, `semillas`, `lotes`, `asignacion_personal`):
- **`sync_status`**: Enum con valores `['synced', 'pending', 'error']`. Permite identificar el estado exacto de cada registro.
- **`fecha_modificacion`**: Actúa como el `updated_at` para el control de versiones y conflictos.

### 2. Validación de Internet Real (`services/network.service.ts`)
Se implementó el método `verifyRealInternet()` que:
- Realiza una validación de hardware mediante `expo-network`.
- Realiza una petición `GET` ultra ligera al endpoint `/api/health` del backend con un **timeout de 4 segundos**.
- Esto previene el bloqueo de la aplicación cuando el dispositivo está conectado a una red WiFi sin salida real a internet (Portal cautivo o router caído).

### 3. Background Sync Worker (`services/sync.worker.ts`)
Se creó un servicio centralizado que coordina la sincronización:
- **`syncPendingData()`**: Flujo atómico que valida la red y dispara la sincronización modular de todas las entidades.
- **`cleanupSyncStates()`**: Sincroniza el nuevo campo `sync_status` con el campo legado `is_synced` para mantener la compatibilidad total con el código existente.

### 4. Interfaz de Usuario Resiliente (`components/SyncStatusIcon.tsx`)
Se creó un componente visual (icono de nube) integrado en la cabecera de la aplicación:
- **Estado Sincronizado (Nube azul)**: Todos los datos están al día.
- **Estado Pendiente (Nube con rayo)**: Hay cambios locales esperando red para subir.
- **Estado Offline (Nube tachada)**: Sin conexión real a internet detectada.
- **Acción Manual**: Al presionar el icono, se fuerza una sincronización inmediata con feedback visual (spinner).

### 5. Disparadores Automáticos (Triggers)
- **App Start/Resume**: La sincronización se dispara automáticamente al abrir la app o volver desde el segundo plano en `App.tsx`.
- **Integración Global**: El icono de estado realiza un polling ligero cada 20 segundos para asegurar que el usuario siempre conozca el estado de sus datos.

## Próximos Pasos (Recomendación)
1. **Generar Migraciones**: Ejecutar `npx drizzle-kit generate` para crear el archivo SQL con las nuevas columnas.
2. **Backend Health**: Asegurarse de que el backend FastAPI tenga el endpoint `GET /api/health` habilitado.
3. **Formularios**: Se recomienda que en futuras actualizaciones de formularios se utilice `syncWorker.syncPendingData()` inmediatamente después de guardar un registro para una sincronización instantánea.

---
*Este sistema garantiza que los datos de trazabilidad (Lotes, Semillas, Parcelas) se mantengan íntegros bajo cualquier condición de red.*
