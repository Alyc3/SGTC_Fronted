import * as SecureStore from "expo-secure-store";
import { db } from "../db";
import { users } from "../db/schema";

const OFFLINE_AUTH_CACHE_KEY = "offlineAuthCache";
const OFFLINE_AUTH_SESSION_KEY = "offlineAuthSession";

type AnyRecord = Record<string, any>;

interface OfflineAuthCache {
  users: AnyRecord[];
  roles: AnyRecord[];
  permissionsByRole: Record<string, string[]>;
  updatedAt: string | null;
}

interface OfflineSession {
  userId: string;
  email: string;
  role: string;
  userName: string | null;
  permissions: string[];
  authMode: "offline";
  restoredAt: string;
}

const emptyCache = (): OfflineAuthCache => ({
  users: [],
  roles: [],
  permissionsByRole: {},
  updatedAt: null,
});

const normalizeText = (value: any) => String(value ?? "").trim();

const normalizeKey = (value: any) => normalizeText(value).toLowerCase();

const extractFullName = (record: AnyRecord) => {
  const fullName = normalizeText(record.full_name || record.fullName);
  if (fullName) return fullName;

  const firstName = normalizeText(record.first_name || record.firstName);
  const lastName = normalizeText(record.last_name || record.lastName);
  return `${firstName} ${lastName}`.trim() || null;
};

const extractPermissions = (role: AnyRecord): string[] => {
  const rawPermissions =
    role.permissions || role.permisos || role.role_permissions || [];

  if (!Array.isArray(rawPermissions)) {
    return [];
  }

  return rawPermissions
    .map((permission: any) => {
      if (typeof permission === "string") return permission;
      return (
        permission?.name ||
        permission?.nombre ||
        permission?.permission ||
        permission?.code ||
        permission?.slug ||
        ""
      );
    })
    .map(normalizeText)
    .filter(Boolean);
};

const resolveRoleName = (role: AnyRecord, fallback: string) => {
  return (
    normalizeText(
      role.name || role.nombre || role.role_name || role.title || fallback,
    ) || fallback
  );
};

const mapUsersForCache = (records: AnyRecord[]) =>
  records.map((record) => ({
    id: normalizeText(record.id),
    email: normalizeText(record.email),
    first_name: record.first_name ?? record.firstName ?? null,
    last_name: record.last_name ?? record.lastName ?? null,
    identifier: record.identifier ?? null,
    phone_number: record.phone_number ?? record.phoneNumber ?? null,
    password_hash: normalizeText(record.password_hash || record.passwordHash),
    role_id: normalizeText(record.role_id || record.roleId || record.role?.id),
    status: normalizeText(record.status || "ACTIVO"),
    suspended_from: record.suspended_from ?? record.suspendedFrom ?? null,
    suspended_until: record.suspended_until ?? record.suspendedUntil ?? null,
    session_token: record.session_token ?? record.sessionToken ?? null,
    userName: extractFullName(record),
  }));

const buildPermissionsByRole = (roles: AnyRecord[]) => {
  const permissionsByRole: Record<string, string[]> = {};

  roles.forEach((role) => {
    const roleId = normalizeText(
      role.id || role.role_id || role.roleId || role.name || role.nombre,
    );
    if (!roleId) {
      return;
    }

    const permissions = extractPermissions(role);
    if (permissions.length > 0) {
      permissionsByRole[roleId] = permissions;
    }

    const roleName = resolveRoleName(role, roleId);
    if (roleName && roleName !== roleId && permissions.length > 0) {
      permissionsByRole[roleName] = permissions;
      permissionsByRole[normalizeKey(roleName)] = permissions;
    }

    permissionsByRole[normalizeKey(roleId)] = permissions;
  });

  return permissionsByRole;
};

const getStoredCache = async (): Promise<OfflineAuthCache> => {
  try {
    const raw = await SecureStore.getItemAsync(OFFLINE_AUTH_CACHE_KEY);
    if (!raw) return emptyCache();

    const parsed = JSON.parse(raw) as Partial<OfflineAuthCache>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
      permissionsByRole: parsed.permissionsByRole || {},
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return emptyCache();
  }
};

const saveCache = async (patch: Partial<OfflineAuthCache>) => {
  const current = await getStoredCache();
  const next: OfflineAuthCache = {
    ...current,
    ...patch,
    users: patch.users ? patch.users : current.users,
    roles: patch.roles ? patch.roles : current.roles,
    permissionsByRole: patch.permissionsByRole
      ? patch.permissionsByRole
      : current.permissionsByRole,
    updatedAt: patch.updatedAt ?? current.updatedAt,
  };

  await SecureStore.setItemAsync(OFFLINE_AUTH_CACHE_KEY, JSON.stringify(next));
  return next;
};

const buildRoleRecords = (usersList: AnyRecord[], cachedRoles: AnyRecord[]) => {
  if (cachedRoles.length > 0) {
    return cachedRoles;
  }

  const roleMap = new Map<string, AnyRecord>();

  usersList.forEach((user) => {
    const roleId = normalizeText(
      user.role_id || user.roleId || user.role?.id || user.role,
    );
    if (!roleId || roleMap.has(roleId)) {
      return;
    }

    roleMap.set(roleId, {
      id: roleId,
      name: roleId,
      permissions: [],
    });
  });

  return Array.from(roleMap.values());
};

const isSessionActive = (user: AnyRecord) => {
  const status = normalizeKey(user.status || "ACTIVO");
  if (status && status !== "activo") {
    return false;
  }

  const suspendedUntil = user.suspended_until || user.suspendedUntil;
  if (!suspendedUntil) {
    return true;
  }

  const suspendedDate = new Date(suspendedUntil);
  if (Number.isNaN(suspendedDate.getTime())) {
    return true;
  }

  return suspendedDate.getTime() <= Date.now();
};

const isPasswordMatch = (inputPassword: string, storedPassword: string) => {
  return normalizeText(inputPassword) === normalizeText(storedPassword);
};

const buildSession = (
  user: AnyRecord,
  roleName: string,
  permissions: string[],
): OfflineSession => ({
  userId: normalizeText(user.id),
  email: normalizeText(user.email),
  role: roleName,
  userName: extractFullName(user),
  permissions,
  authMode: "offline",
  restoredAt: new Date().toISOString(),
});

export const offlineAuthService = {
  async cacheUsers(remoteUsers: AnyRecord[]) {
    const usersCache = mapUsersForCache(
      Array.isArray(remoteUsers) ? remoteUsers : [],
    );
    await saveCache({
      users: usersCache,
      updatedAt: new Date().toISOString(),
    });
    return usersCache;
  },

  async cacheRoles(remoteRoles: AnyRecord[]) {
    const rolesCache = Array.isArray(remoteRoles) ? remoteRoles : [];
    await saveCache({
      roles: rolesCache,
      permissionsByRole: buildPermissionsByRole(rolesCache),
      updatedAt: new Date().toISOString(),
    });
    return rolesCache;
  },

  async getAllUsers() {
    const cache = await getStoredCache();
    if (cache.users.length > 0) {
      return cache.users.map((user) => ({ ...user }));
    }

    const rows = await db.query.users.findMany();
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      identifier: row.identifier,
      phone_number: row.phone_number,
      role_id: row.role_id,
      status: row.status,
      userName: extractFullName(row as AnyRecord),
    }));
  },

  async getAllRoles() {
    const cache = await getStoredCache();
    return buildRoleRecords(cache.users, cache.roles).map((role) => ({
      ...role,
    }));
  },

  async getPermissionsByRole(roleIdOrName: string) {
    const cache = await getStoredCache();
    const key = normalizeText(roleIdOrName);
    return (
      cache.permissionsByRole[key] ||
      cache.permissionsByRole[normalizeKey(key)] ||
      []
    );
  },

  async login(data: { email: string; password: string }) {
    const email = normalizeKey(data.email);
    const password = normalizeText(data.password);

    const localUser = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.email, email),
    });

    if (!localUser) {
      throw new Error(
        "El correo no existe en la base local para acceso offline.",
      );
    }

    if (!isSessionActive(localUser as AnyRecord)) {
      throw new Error("La cuenta local está inactiva o suspendida.");
    }

    if (!isPasswordMatch(password, localUser.password_hash)) {
      throw new Error("La contraseña es incorrecta.");
    }

    const roles = await this.getAllRoles();
    const roleId = normalizeText(localUser.role_id);
    const matchedRole = roles.find((role) => {
      const currentRoleId = normalizeText(
        role.id || role.role_id || role.roleId || role.name || role.nombre,
      );
      const currentRoleName = normalizeText(
        role.name || role.nombre || role.role_name,
      );
      return (
        currentRoleId === roleId ||
        normalizeKey(currentRoleName) === normalizeKey(roleId)
      );
    });

    const roleName = matchedRole
      ? normalizeText(
          matchedRole.name ||
            matchedRole.nombre ||
            matchedRole.role_name ||
            matchedRole.id,
        )
      : roleId;
    const permissions = await this.getPermissionsByRole(roleId).catch(() => []);
    const session = buildSession(
      localUser as AnyRecord,
      roleName || roleId,
      permissions,
    );

    await this.saveSession(session);

    return {
      offline: true,
      mode: "offline",
      access_token: null,
      token: null,
      user: {
        id: localUser.id,
        email: localUser.email,
        first_name: localUser.first_name,
        last_name: localUser.last_name,
        role_id: localUser.role_id,
        status: localUser.status,
      },
      role: session.role,
      userId: session.userId,
      userName: session.userName,
      permissions: session.permissions,
    };
  },

  async saveSession(session: OfflineSession) {
    await SecureStore.setItemAsync(
      OFFLINE_AUTH_SESSION_KEY,
      JSON.stringify(session),
    );
  },

  async restoreSession() {
    try {
      const raw = await SecureStore.getItemAsync(OFFLINE_AUTH_SESSION_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as OfflineSession;
      if (!parsed.userId || !parsed.role) return null;

      return parsed;
    } catch {
      return null;
    }
  },

  async clearSession() {
    await SecureStore.deleteItemAsync(OFFLINE_AUTH_SESSION_KEY);
  },

  async refreshCacheFromUsersAndRoles(
    remoteUsers: AnyRecord[],
    remoteRoles: AnyRecord[],
  ) {
    const usersCache = mapUsersForCache(
      Array.isArray(remoteUsers) ? remoteUsers : [],
    );
    const rolesCache = Array.isArray(remoteRoles) ? remoteRoles : [];

    await saveCache({
      users: usersCache,
      roles: rolesCache,
      permissionsByRole: buildPermissionsByRole(rolesCache),
      updatedAt: new Date().toISOString(),
    });
  },
};
