import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Boxes,
  ChevronRight,
  History,
  Activity,
  UserPlus,
  RefreshCw,
  TrendingUp,
  Cloud,
  Users,
  Sprout,
  Map as MapIcon,
  AlertTriangle,
  FileText
} from 'lucide-react-native';
import { Theme } from '../theme';
import { dashboardService, ActivityItemData, personalService, rolesService } from '../services';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const ALLOWED_ROLES = [
  'ADMIN',
  'Gerente_General',
  'Capataz',
  'Sembrador',
  'Recolector',
  'Clasificador',
  'Técnico_Despulpado',
  'Encargado_Secado',
  'Tostador',
  'Gestor_Calidad',
  'Gestor_Calidad',
  'Controlador_Despacho',
  'Tecnico_Almacenamiento',
  'TECNICO_SEMBRADO'
];

// Normalizamos los roles para comparar sin problemas de mayúsculas, espacios o guiones bajos
const ALLOWED_ROLES_NORMALIZED = [
  ...ALLOWED_ROLES.map(r => r.trim().toLowerCase()),
  ...ALLOWED_ROLES.map(r => r.trim().toLowerCase().replace(/\s+/g, '_')),
  ...ALLOWED_ROLES.map(r => r.trim().toLowerCase().replace(/_/g, ' ')),
];

const DashboardScreen = ({ navigation }: any) => {
  const { role: userRoleRaw } = useAuthStore();
  
  const getCleanRole = () => {
    if (!userRoleRaw) return 'COLABORADOR';
    if (typeof userRoleRaw === 'string') return userRoleRaw;
    if (typeof userRoleRaw === 'object') return (userRoleRaw as any).name || (userRoleRaw as any).role || 'COLABORADOR';
    return String(userRoleRaw);
  };

  const currentRole = getCleanRole();
  const displayRole = currentRole.trim().toUpperCase().replace(/_/g, ' ');

  // Mapeo de roles técnicos a sus etapas correspondientes
  const getAssignedStageForTechnician = (role: string): string | null => {
    const r = role.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
    if (r.includes('tecnico_sembrado')) return 'Sembrado';
    if (r.includes('tecnico_agronomo')) return 'Cosechado';
    if (r.includes('tecnico_de_despulpado')) return 'Despulpado';
    if (r.includes('encargado_de_secado')) return 'Secado';
    if (r.includes('tostador')) return 'Tostado';
    return null;
  };

  const assignedStage = getAssignedStageForTechnician(currentRole);
  const isStrictTechnician = assignedStage !== null;

  const [stats, setStats] = useState({ activeLotsCount: 0, personalCount: 0 });
  const [activities, setActivities] = useState<ActivityItemData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [s, a, workersData, rolesData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity(),
        personalService.getAll(),
        rolesService.getAll().catch(error => {
          if (error.response?.status === 403) {
            console.log(`[Dashboard] El rol ${currentRole} no tiene permisos para ver roles remotos. Usando fallback local.`);
          } else {
            console.warn('Dashboard: No se pudieron obtener los roles de la API.', error.response?.status);
          }
          return [];
        })
      ]);

      // Calcular el conteo de personal filtrado por los roles permitidos
      const rolesArray = Array.isArray(rolesData) ? rolesData : (rolesData.roles || rolesData.data || []);
      const rolesMap: Record<string, string> = {};
      rolesArray.forEach((r: any) => {
        rolesMap[r.id] = (r.name || r.nombre || r.role_name || '').trim().toLowerCase();
      });

      const filteredCount = workersData.filter((w: any) => {
        const roleName = rolesMap[w.role_id];
        // Si no hay roles (error 403), mostramos el conteo total de trabajadores locales activos
        if (Object.keys(rolesMap).length === 0) return true;
        return roleName && ALLOWED_ROLES_NORMALIZED.includes(roleName);
      }).length;

      setStats({ ...s, personalCount: filteredCount });
      setActivities(a);
    } catch (error: any) {
      const isSessionError = error.message === 'SESSION_EXPIRED' || error.response?.status === 401;
      if (!isSessionError) {
        console.error('Error loading dashboard data:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [currentRole]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInMs = now.getTime() - then.getTime();
    const diffInMin = Math.floor(diffInMs / (1000 * 60));

    if (diffInMin < 1) return 'Ahora mismo';
    if (diffInMin < 60) return `Hace ${diffInMin} min`;
    const diffInHrs = Math.floor(diffInMin / 60);
    if (diffInHrs < 24) return `Hace ${diffInHrs} h`;
    return then.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeLabel}>BIENVENIDO, {displayRole}</Text>
          <Text style={styles.title}>Panel de Control</Text>
        </View>

        {/* Terrain Status Card (Featured) */}
        <TouchableOpacity style={styles.featuredCard} activeOpacity={0.9}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQF9N3etNOAjoGtBpCr-pDBS4ikWlmv8J96T4VisN8df5y93m7e0YRNmedXWEtsUN4GloGrijWvEd2RHVNnM_GYeyHfeIG8pIwfOp0Dk3F8jsfWTxbfl8sgckchbRElDtNvqkjVrxE16TUfBV1QtrIsOqnOSpFUi6BNxwKHDe0KwnaKcHF2BH-rtGj7G4XUYsBKOvU8VEmUjwfKL56sYyPUGQNIvL9egFSXvEjt4gqbZeByXXgM4pQ5DzsgqqElh2JllJzME5VU74' }}
            style={styles.featuredImage}
          />
          <View style={styles.featuredOverlay}>
            <View style={styles.statusBadge}>
              <Cloud size={14} color={Theme.colors.secondary} />
              <Text style={styles.statusBadgeText}>ESTADO DEL TERRENO</Text>
            </View>
            <Text style={styles.featuredTitle}>Actual: Óptimo</Text>
            <Text style={styles.featuredSubtitle}>Condiciones ideales para la cosecha</Text>
          </View>
        </TouchableOpacity>

        {/* Overview Stats (Vista General) */}
        {!isStrictTechnician && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vista General</Text>
            <View style={styles.statsRow}>
              <StatCard
                label="Lotes Activos"
                value={loading ? '...' : stats.activeLotsCount.toString()}
                icon={<Boxes size={20} color={Theme.colors.primary} />}
                onPress={() => navigation.navigate('Lotes')}
              />
              <StatCard
                label="Personal"
                value={loading ? '...' : stats.personalCount.toString()}
                icon={<Users size={20} color={Theme.colors.primary} />}
                onPress={() => navigation.navigate('Personal')}
              />
            </View>
          </View>
        )}

        {/* Quick Actions (Acciones Rápidas) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionsGrid}>
            {!isStrictTechnician && (
              <>
                <ActionCard
                  label="Semillas"
                  icon={<Sprout size={24} color={Theme.colors.onSecondaryContainer} />}
                  color={Theme.colors.secondary}
                  labelColor={Theme.colors.onPrimary}
                  onPress={() => navigation.navigate('InventarioSemillas')}
                />
                <ActionCard
                  label="Parcelas"
                  icon={<MapIcon size={24} color={Theme.colors.onSecondaryContainer} />}
                  color={Theme.colors.secondary}
                  labelColor={Theme.colors.onPrimary}
                  onPress={() => navigation.navigate('ListarParcela')}
                />
              </>
            )}
            
            <ActionCard
              label="Lotes"
              icon={<Boxes size={24} color={Theme.colors.onSecondaryContainer} />}
              color={Theme.colors.secondary}
              labelColor={Theme.colors.onPrimary}
              style={isStrictTechnician ? { width: width - Theme.spacing.md * 2 } : null}
              onPress={() => navigation.navigate('Lotes')}
            />

            {!isStrictTechnician && (
              <ActionCard
                label="Personal"
                icon={<Users size={24} color={Theme.colors.onSecondaryContainer} />}
                color={Theme.colors.secondary}
                labelColor={Theme.colors.onPrimary}
                onPress={() => navigation.navigate('Personal')}
              />
            )}
          </View>
        </View>

        {/* Recent Activity (Actividad Reciente) */}
        {!isStrictTechnician && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Actividad Reciente</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>Ver todo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.activityList}>
              {loading ? (
                <ActivityIndicator color={Theme.colors.primary} style={{ marginVertical: 20 }} />
              ) : activities.length > 0 ? (
                activities.map((item) => (
                  <ActivityItem
                    key={item.id}
                    icon={
                      item.type === 'LOT_UPDATE' ? <FileText size={18} color={Theme.colors.primary} /> :
                        item.type === 'NEW_PERSONAL' ? <UserPlus size={18} color={Theme.colors.primary} /> :
                          item.type === 'INCIDENT' ? <AlertTriangle size={18} color={Theme.colors.error} /> :
                            <RefreshCw size={18} color={Theme.colors.primary} />
                    }
                    title={item.title}
                    meta={`${getTimeAgo(item.timestamp)} • ${item.isSynced ? 'Sincronizado' : 'Local'}`}
                    isError={item.isError}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No hay actividad reciente registrada.</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>STGC Módulo de Trazabilidad © 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const StatCard = ({ label, value, icon, onPress }: any) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <View style={styles.statIconContainer}>{icon}</View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const ActionCard = ({ label, icon, color, labelColor, onPress }: any) => (
  <TouchableOpacity
    style={[styles.actionCard, { backgroundColor: color }]}
    onPress={onPress}
  >
    <View style={styles.actionIconContainer}>{icon}</View>
    <Text style={[styles.actionLabel, labelColor && { color: labelColor }]}>{label}</Text>
  </TouchableOpacity>
);

const ActivityItem = ({ icon, title, meta, isError }: any) => (
  <TouchableOpacity style={styles.activityCard}>
    <View style={[styles.activityIcon, isError && { backgroundColor: Theme.colors.errorContainer }]}>
      {icon}
    </View>
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityMeta}>{meta}</Text>
    </View>
    <ChevronRight size={16} color={Theme.colors.outline} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background
  },
  scrollContent: {
    padding: Theme.spacing.md,
    paddingBottom: 40
  },
  header: {
    marginBottom: Theme.spacing.lg,
    paddingHorizontal: 4
  },
  welcomeLabel: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: Theme.colors.onSurfaceVariant,
    marginBottom: 4
  },
  title: {
    ...Theme.typography.display,
    fontSize: 28,
    fontWeight: '800',
    color: Theme.colors.primary
  },
  featuredCard: {
    height: 200,
    borderRadius: Theme.roundness.xxl,
    overflow: 'hidden',
    marginBottom: Theme.spacing.xl,
    ...Theme.shadows.ambient,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Theme.spacing.lg,
    backgroundColor: 'rgba(68, 42, 34, 0.4)', // Overlay using primary color with alpha
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.roundness.full,
    marginBottom: 8,
    gap: 4
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.secondary,
    letterSpacing: 0.5
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.white,
  },
  featuredSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2
  },
  section: {
    marginBottom: Theme.spacing.xl
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md
  },
  sectionTitle: {
    ...Theme.typography.headline,
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    marginBottom: Theme.spacing.md
  },
  statsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: Theme.spacing.lg,
    borderRadius: Theme.roundness.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Theme.shadows.ambient
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Theme.roundness.md,
    backgroundColor: Theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.onSurface
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.onSurfaceVariant
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md
  },
  actionCard: {
    width: (width - Theme.spacing.md * 3) / 2,
    padding: Theme.spacing.lg,
    borderRadius: Theme.roundness.xl,
    alignItems: 'center',
    gap: 8,
    ...Theme.shadows.ambient
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.roundness.lg,
    backgroundColor: Theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.onSecondaryContainer
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.primary
  },
  activityList: {
    gap: Theme.spacing.sm
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: Theme.spacing.md,
    borderRadius: Theme.roundness.xl,
    ...Theme.shadows.ambient
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: Theme.roundness.md,
    backgroundColor: Theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  activityContent: {
    flex: 1
  },
  activityTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: Theme.colors.onSurface
  },
  activityMeta: {
    fontSize: 11,
    color: Theme.colors.outline,
    marginTop: 2
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.outline,
    letterSpacing: 1
  },
  emptyText: {
    textAlign: 'center',
    color: Theme.colors.outline,
    fontSize: 14,
    marginVertical: 24,
    fontStyle: 'italic'
  }
});

export default DashboardScreen;
