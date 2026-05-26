import { db } from '../db';
import { lotes, personal, parcelas, estado_etapa } from '../db/schema';
import { eq, desc, ne, sql, and } from 'drizzle-orm';

export interface DashboardStats {
  activeLotsCount: number;
  personalCount: number;
}

export interface ActivityItemData {
  id: string;
  type: 'LOT_UPDATE' | 'NEW_PERSONAL' | 'INCIDENT' | 'SYNC';
  title: string;
  subtitle: string;
  timestamp: string;
  isSynced: boolean;
  isError?: boolean;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const activeLots = await db.select({ count: sql<number>`count(*)` })
      .from(lotes)
      .where(ne(lotes.estado_lote, 'Completada'));
    
    const activePersonal = await db.select({ count: sql<number>`count(*)` })
      .from(personal)
      .where(eq(personal.activo, true));

    return {
      activeLotsCount: activeLots[0]?.count || 0,
      personalCount: activePersonal[0]?.count || 0,
    };
  },

  async getRecentActivity(limit = 5): Promise<ActivityItemData[]> {
    const activities: ActivityItemData[] = [];

    // 1. Fetch recent lot updates
    const recentLots = await db.query.lotes.findMany({
      orderBy: [desc(lotes.fecha_modificacion)],
      limit: limit,
    });

    recentLots.forEach(lot => {
      activities.push({
        id: `lot-${lot.id}`,
        type: 'LOT_UPDATE',
        title: `Lote ${lot.codigo} Actualizado`,
        subtitle: `Estado: ${lot.estado_lote.replace('_', ' ')}`,
        timestamp: lot.fecha_modificacion,
        isSynced: !!lot.is_synced,
      });
    });

    // 2. Fetch recent personal additions
    const recentPersonal = await db.query.personal.findMany({
      orderBy: [desc(personal.fecha_creacion)],
      limit: limit,
    });

    recentPersonal.forEach(person => {
      activities.push({
        id: `person-${person.id}`,
        type: 'NEW_PERSONAL',
        title: `Nuevo Personal: ${person.nombres} ${person.apellidos.charAt(0)}.`,
        subtitle: `Rol: ${person.rol}`,
        timestamp: person.fecha_creacion,
        isSynced: !!person.is_synced,
      });
    });

    // Sort all and take top
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
};
