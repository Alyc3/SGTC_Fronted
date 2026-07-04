import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { authService } from "../auth-service";
import { rolesService } from "../roles.service";

export const personalSync = {
  async sync() {
    await this.push();
    await this.pull();
  },

  async push() {
    const pending = await db
      .select()
      .from(users)
      .where(eq(users.is_synced, false));
    if (pending.length === 0) return;

    // 1. Obtener los roles disponibles para mapear el ID al Nombre
    const rolesMap: Record<string, string> = {};
    try {
      const rolesData = await rolesService.getAll();
      const rolesArray = Array.isArray(rolesData)
        ? rolesData
        : rolesData.roles || rolesData.data || [];
      rolesArray.forEach((r: any) => {
        rolesMap[r.id] = r.name || r.nombre || r.role_name;
      });
    } catch (e) {
      console.warn(
        "[personalSync] No se pudieron cargar los roles para el mapeo:",
        e,
      );
    }

    for (const record of pending) {
      try {
        // 2. Buscar el nombre del rol usando el ID almacenado localmente
        const roleName = rolesMap[record.role_id] || "TRABAJADOR";

        // 3. Enviar el registro con todos los nombres de campos posibles para evitar errores 422
        await authService.register({
          email: record.email,
          password: record.password_hash,
          first_name: record.first_name,
          last_name: record.last_name,
          firstName: record.first_name,
          lastName: record.last_name,
          identifier: record.identifier,
          phone_number: record.phone_number,
          phoneNumber: record.phone_number,
          role_id: record.role_id,
          roleId: record.role_id,
          role_name: roleName, // CAMPO REQUERIDO POR FASTAPI
          roleName: roleName,
          status: record.status,
        });

        await db
          .update(users)
          .set({ is_synced: true })
          .where(eq(users.id, record.id));
        console.log(
          `Usuario ${record.email} sincronizado exitosamente vía API.`,
        );
      } catch (err: any) {
        if (err.response?.status === 400 || err.response?.status === 409) {
          await db
            .update(users)
            .set({ is_synced: true })
            .where(eq(users.id, record.id));
          console.log(
            `Usuario ${record.email} ya existía en el remoto. Marcado como sincronizado.`,
          );
        } else if (err.response?.status === 422) {
          console.error(
            `Error de validación (422) para ${record.email}:`,
            JSON.stringify(err.response.data.detail, null, 2),
          );
        } else {
          console.error(
            `Error de sincronización para usuario ${record.email}:`,
            err.message || err,
          );
        }
      }
    }
  },

  async pull() {
    try {
      const remoteData = await authService.getAllUsers();
      // Si la respuesta fue 403, authService.getAllUsers() devuelve [] y ya logueó la advertencia
      const usersList = Array.isArray(remoteData)
        ? remoteData
        : remoteData.users || remoteData.data || [];

      if (usersList.length === 0) {
        // Podría ser un 403 o simplemente que no hay usuarios, el servicio ya manejó el log
        return;
      }

      for (const record of usersList) {
        // Mapeo robusto del role_id y otros campos según el esquema de producción
        const currentRoleId =
          record.role_id ||
          record.roleId ||
          (record.role && record.role.id) ||
          "TRABAJADOR";

        const existingLocalUser = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.id, record.id),
        });

        const resolvedPasswordHash =
          existingLocalUser?.password_hash &&
          existingLocalUser.password_hash !== "API_NO_PASSWORD"
            ? existingLocalUser.password_hash // <- esta rama necesita que YA exista un hash válido en SQLite
            : record.password_hash || record.passwordHash || "API_NO_PASSWORD";

        // Estructura de datos común para insertar y actualizar
        const userData = {
          id: record.id,
          email: record.email,
          first_name: record.first_name || record.firstName || null,
          last_name: record.last_name || record.lastName || null,
          identifier: record.identifier || null,
          phone_number: record.phone_number || record.phoneNumber || null,
          password_hash: resolvedPasswordHash,
          role_id: currentRoleId,
          status: record.status || "ACTIVO",
          suspended_from:
            record.suspended_from || record.suspendedFrom
              ? new Date(
                  record.suspended_from || record.suspendedFrom,
                ).toISOString()
              : null,
          suspended_until:
            record.suspended_until || record.suspendedUntil
              ? new Date(
                  record.suspended_until || record.suspendedUntil,
                ).toISOString()
              : null,
          session_token: record.session_token || record.sessionToken || null,
          is_synced: true,
        };

        try {
          await db.insert(users).values(userData).onConflictDoUpdate({
            target: users.id, // Primero intentamos por ID (el más común)
            set: userData,
          });
        } catch (insertErr: any) {
          // Si falla por una restricción de unicidad (email, identifier o phone_number), intentamos actualizar por esos campos
          if (insertErr.message?.includes("UNIQUE constraint failed")) {
            console.log(
              `[personalSync] Conflicto de unicidad detectado para ${record.email}. Reintentando actualización manual.`,
            );

            // Intentar actualizar por email como llave secundaria confiable
            await db
              .update(users)
              .set(userData)
              .where(eq(users.email, record.email));
          } else {
            throw insertErr;
          }
        }
      }
    } catch (err) {
      console.error(`Pull error users:`, err);
    }
  },
};
