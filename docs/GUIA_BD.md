# Manual de Gestión Evolutiva de la Base de Datos

Este documento define como realizar cambios en el esquema de la base de datos (SQLite + Drizzle ORM), garantizando la integridad de los datos en producción y la escalabilidad del sistema.

---

## 1. La Regla Principal:
**NUNCA** modifique manualmente los archivos SQL dentro de la carpeta `db/migrations/` ni edite la base de datos directamente con herramientas externas una vez que el sistema esté operativo. Cualquier cambio debe nacer desde el código TypeScript.

---

## 2. Flujo de Trabajo para Cambios en el Esquema

Cuando necesite agregar una tabla, una columna o cambiar un tipo de dato, siga estrictamente estos pasos:

### Paso A: Modificar el Esquema TypeScript
Vaya a la carpeta `db/schema/` y realice las modificaciones necesarias en los archivos `.ts`.
*   *Ejemplo:* Añadir la columna `observaciones` a la tabla de parcelas en `db/schema/parcelas.ts`.

### Paso B: Generar la Migración con Nombre
Ejecute el siguiente comando para crear un archivo SQL incremental con un nombre semántico (reemplace `mi_cambio` por algo descriptivo):

```bash
npm run db:generate:named -- --name=mi_cambio
```
*   **Correcto:** `add_observaciones_to_parcelas`
*   **Incorrecto:** `cambio1`, `fix`, `test`

### Paso C: Verificación del Archivo SQL
Revise que en `db/migrations/` se haya creado un nuevo archivo (ej. `0001_mi_cambio.sql`). Drizzle Kit es muy preciso, pero siempre es buena práctica verificar que la instrucción SQL generada coincida con su intención.

### Paso D: Despliegue Automático
Inicie la aplicación normalmente:
```bash
npx expo start
```
El hook `useMigrations` configurado en `App.tsx` detectará el nuevo archivo y lo aplicará en el dispositivo del usuario en milisegundos.

---

## 3. Casos Comunes y Ejemplos

### Agregar una nueva Columna
Simplemente añádala en el archivo del esquema y genere la migración.
```typescript
// db/schema/parcelas.ts
export const parcelas = sqliteTable('parcelas', {
  // ...
  humedad: real('humedad'),
});
```

### Agregar una nueva Tabla
1. Cree el archivo `db/schema/mi_nueva_tabla.ts`.
2. Regístrelo y expórtelo en `db/schema/index.ts`.
3. Genere la migración con `db:generate:named`.

### Renombrar una Columna
Drizzle Kit le preguntará en la terminal si ha renombrado la columna o si ha borrado una y creado otra. **Lea atentamente la terminal** y elija la opción de renombrado para no perder los datos existentes en esa columna.

---

## 4. Resolución de Problemas

### La migración falló en el arranque
Si ve un error de "Migration error" en la pantalla de carga de la App:
1. Revise los logs en la terminal de Metro.
2. Si el error es de sintaxis (muy raro), corrija el SQL generado.
3. Si el error es por un cambio incompatible (ej. cambiar un campo de NULL a NOT NULL cuando ya hay datos nulos), deberá establecer un valor por defecto (default) en el esquema para esos registros antiguos.

---

## 5. Resumen de Comandos
- `npm run db:generate`: Genera migración (nombre aleatorio).
- `npm run db:generate:named -- --name=nombre`: Genera migración con nombre personalizado.
- `npx drizzle-kit studio`: Abre la interfaz visual para ver los datos locales.
