# Manual de Arquitectura: Sistema STGC

## 1. Visión General
El sistema STGC es una aplicación móvil diseñada para operar en condiciones de campo bajo una arquitectura de **Monolito Autónomo**.

---

## 2. Stack Tecnológico
- **Framework:** Expo SDK 54 (React Native 0.81.5).
- **Navegación:** React Navigation 7 (Drawer).
- **ORM:** Drizzle ORM v0.45.2.
- **Base de Datos:** SQLite local + Neon DB (Cloud) vía HTTP.
- **Iconografía:** Lucide React Native.

---

## 3. Arquitectura del Proyecto

### 📂 `/navigation`
- **`CustomDrawer.tsx`**: Sidebar personalizado con estética premium "MODULO 1".
- **`DrawerNavigator.tsx`**: Gestión centralizada de rutas. **Pantalla inicial: Dashboard.**

### 📂 `/components`
- **`SyncButton.tsx`**: Componente de sincronización con indicadores en tiempo real.

### 📂 `/screens`
- **`DashboardScreen.tsx`**: Centro de control con métricas en tiempo real.
- **`LotesScreen.tsx`**: Gestión de lotes con Live Queries.
- **`GestionParcelaScreen.tsx`**: Registro topográfico y geológico avanzado.
- **`InventarioSemillasScreen.tsx`**: Listado reactivo de semillas con diseño "Green Edition".
- **`RegistroSemillaScreen.tsx`**: Formulario de alta con validación técnica y subida de CSV.

### 📂 `/services` (Lógica Modular)
- **`semillas.service.ts`**, **`parcelas.service.ts`**, etc.: Servicios CRUD locales.
- **`/online` (Motor de Sincronización):**
    - **`semillas.sync.ts`**, **`parcelas.sync.ts`**, etc.: Sincronizadores especializados por entidad.
    - **`index.ts`**: Agregador de lógica remota.
- **`sync.service.ts`**: Orquestador principal que coordina los módulos de `/online`.

---

## 4. Características de Producción
- **Live Queries:** La UI se sincroniza automáticamente con la DB en tiempo real.
- **Fidelidad Visual:** Réplica exacta de prototipos Stitch (The Terroir Editorial).
- **Subida de Archivos:** Soporte para adjuntar documentación técnica en CSV.
- **Arquitectura Limpia:** Servicios especializados y desacoplados por entidad.
