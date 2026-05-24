# Guía de Sincronización de Esquemas (Local vs Online)

Este documento detalla el procedimiento para mantener la estructura de la base de datos local (SQLite/Expo) y la remota (PostgreSQL/Neon) perfectamente sincronizadas.

---

## 1. Arquitectura de Datos
El sistema utiliza **Drizzle ORM** como fuente única de verdad. Las definiciones en `db/schema/` controlan tanto la app móvil como el servidor en la nube.

| Componente | Entorno | Dialecto | Herramienta de Cambio |
| :--- | :--- | :--- | :--- |
| **Base Local** | Dispositivo Móvil | SQLite | `drizzle-kit generate` |
| **Base Online** | Neon Cloud | PostgreSQL | `drizzle-kit push` |

---

## 2. Configuración de Archivos
Para manejar ambos entornos, el proyecto cuenta con dos configuraciones de Drizzle:

1.  **`drizzle.config.ts`**: Configuración para SQLite (Entorno Offline).
2.  **`drizzle.online.config.ts`**: Configuración para PostgreSQL (Entorno Online). Utiliza la variable `DATABASE_URL` de tu archivo `.env`.

---

## 3. Flujo de Trabajo para Cambios Estructurales

Siga estos pasos cada vez que modifique un archivo en `db/schema/`:

### Paso 1: Actualizar el Esquema Local (Móvil)
Genera los archivos de migración SQL que la app aplicará al iniciar.
```bash
npx drizzle-kit generate --config=drizzle.config.ts
```

### Paso 2: Sincronizar el Esquema Online (Neon)
Aplica los cambios directamente a la base de datos de Neon para que las columnas coincidan con el nuevo código TypeScript.
```bash
npx drizzle-kit push --config=drizzle.online.config.ts
```
> **Nota:** El comando `push` es ideal para entornos de desarrollo/prototipado rápido como Neon, ya que sincroniza el esquema sin necesidad de gestionar archivos de migración SQL intermedios en la nube.

---

## 4. Consideraciones de Compatibilidad
Para asegurar que la sincronización de datos (servicios `.sync.ts`) no falle, siga estas reglas al definir esquemas:

*   **Booleanos:** Use `integer('nombre', { mode: 'boolean' })` en los esquemas. Drizzle lo mapeará como 0/1 en SQLite y como `boolean` (true/false) en PostgreSQL automáticamente.
*   **Enums:** Mantenga los enums como `text` con validaciones de TypeScript (definidos en `enums.ts`). Esto evita conflictos entre los tipos `ENUM` de Postgres y el texto simple de SQLite.
*   **IDs:** Use siempre `text('id').primaryKey()` con UUIDs generados en la app (`uuidv4()`). Esto garantiza que no haya colisiones de ID cuando múltiples dispositivos suban datos a Neon.

---

## 5. Resumen de Comandos Útiles

| Acción | Comando |
| :--- | :--- |
| Generar migración local | `npm run db:generate` |
| Sincronizar esquema online | `npx drizzle-kit push --config=drizzle.online.config.ts` |
| Ver datos locales | `npx drizzle-kit studio --config=drizzle.config.ts` |
| Ver datos en Neon | `npx drizzle-kit studio --config=drizzle.online.config.ts` |

---

## 6. Resolución de Conflictos
Si Neon tiene cambios que no están en tu código local, `drizzle-kit push` te advertirá. Generalmente, deberás aceptar la sincronización para que Neon se adapte a tu código TypeScript actual. **Precaución:** Cambios destructivos (como borrar columnas) en Neon pedirán confirmación explícita en la terminal.
