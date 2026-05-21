import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar
} from 'react-native';
import { 
  Boxes, 
  ChevronRight,
  History,
  Activity,
  UserPlus,
  RefreshCw,
  TrendingUp,
  Cloud,
  Users
} from 'lucide-react-native';
import { Theme } from '../theme';

const DashboardScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.primaryContainer} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Editorial - Reducido el padding superior ya que el Navigator ya tiene su header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>MODULO 1</Text>
          <Text style={styles.title}>Dashboard Principal</Text>
          <Text style={styles.headerDescription}>
            Vista general del patrimonio cafetero y control de operaciones en tiempo real.
          </Text>
          <View style={styles.accentBar} />
        </View>

        {/* Status Widget */}
        <View style={styles.statusWidget}>
          <View style={styles.statusInfo}>
            <View style={styles.statusIconContainer}>
              <Cloud size={24} color={Theme.colors.secondary} />
            </View>
            <View>
              <Text style={styles.statusLabel}>ESTADO ACTUAL</Text>
              <Text style={styles.statusValue}>ÓPTIMO</Text>
            </View>
          </View>
          <View style={styles.syncBadge}>
            <RefreshCw size={12} color={Theme.colors.onSurfaceVariant} />
            <Text style={styles.syncText}>Sincronizado</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Lotes')}
          >
            <Boxes size={24} color={Theme.colors.primary} />
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Lotes Activos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Personal')}
          >
            <Users size={24} color={Theme.colors.primary} />
            <Text style={styles.statNumber}>45</Text>
            <Text style={styles.statLabel}>Personal</Text>
          </TouchableOpacity>
        </View>

        {/* Activity List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <History size={18} color={Theme.colors.primary} />
            <Text style={styles.sectionTitle}>Actividad Reciente</Text>
          </View>

          <View style={styles.activityList}>
            <ActivityItem 
              icon={<Activity size={18} color={Theme.colors.primary} />}
              title="Lote #084 Actualizado"
              meta="Hace 5 min • Sincronizado"
            />
            <ActivityItem 
              icon={<UserPlus size={18} color={Theme.colors.primary} />}
              title="Nuevo Operador: Juan P."
              meta="Hace 12 min • Sincronizado"
            />
          </View>
        </View>

        <View style={styles.inspirationCard}>
          <Text style={styles.inspirationQuote}>"La pureza nace en la semilla"</Text>
          <Text style={styles.inspirationSub}>STGC Modulo de Trazabilidad © 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const ActivityItem = ({ icon, title, meta }: any) => (
  <TouchableOpacity style={styles.activityCard}>
    <View style={styles.activityIcon}>{icon}</View>
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityMeta}>{meta}</Text>
    </View>
    <ChevronRight size={16} color={Theme.colors.outline} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { padding: Theme.spacing.lg, paddingBottom: 40 },
  header: { marginBottom: Theme.spacing.lg }, // Reducido de XL a LG
  headerLabel: { ...Theme.typography.label, fontSize: 10, letterSpacing: 2, color: Theme.colors.primary, marginBottom: 4 },
  title: { ...Theme.typography.display, fontSize: 28, marginBottom: 8, color: Theme.colors.primary },
  headerDescription: { ...Theme.typography.body, fontSize: 14, color: Theme.colors.onSurfaceVariant, lineHeight: 20 },
  accentBar: { height: 4, backgroundColor: Theme.colors.primary, width: 60, marginTop: Theme.spacing.lg, borderRadius: 2 },
  statusWidget: { backgroundColor: Theme.colors.surfaceContainerLow, borderRadius: Theme.roundness.lg, padding: Theme.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.lg },
  statusInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIconContainer: { backgroundColor: Theme.colors.surfaceContainerLowest, padding: 10, borderRadius: Theme.roundness.md },
  statusLabel: { ...Theme.typography.label, fontSize: 9, letterSpacing: 1, color: Theme.colors.outline },
  statusValue: { ...Theme.typography.headline, fontSize: 18, color: Theme.colors.secondary },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Theme.roundness.sm },
  syncText: { ...Theme.typography.label, fontSize: 10, color: Theme.colors.onSurfaceVariant },
  statsGrid: { flexDirection: 'row', gap: Theme.spacing.md, marginBottom: Theme.spacing.xl },
  statCard: { flex: 1, backgroundColor: Theme.colors.surfaceContainerLowest, padding: Theme.spacing.lg, borderRadius: Theme.roundness.xxl, ...Theme.shadows.ambient },
  statNumber: { ...Theme.typography.display, fontSize: 32, marginTop: 8, color: Theme.colors.primary },
  statLabel: { ...Theme.typography.label, fontSize: 12, color: Theme.colors.onSurfaceVariant, marginTop: 4 },
  section: { marginBottom: Theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Theme.spacing.md },
  sectionTitle: { ...Theme.typography.headline, fontSize: 18, color: Theme.colors.onSurface },
  activityList: { gap: Theme.spacing.sm },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surfaceContainerLowest, padding: Theme.spacing.md, borderRadius: Theme.roundness.lg, ...Theme.shadows.ambient },
  activityIcon: { width: 40, height: 40, borderRadius: Theme.roundness.md, backgroundColor: Theme.colors.surfaceContainerLow, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityContent: { flex: 1 },
  activityTitle: { ...Theme.typography.body, fontWeight: '700', fontSize: 14, color: Theme.colors.onSurface },
  activityMeta: { ...Theme.typography.label, fontSize: 11, color: Theme.colors.outline, marginTop: 2 },
  inspirationCard: { backgroundColor: Theme.colors.primary, padding: 32, borderRadius: Theme.roundness.xxl, alignItems: 'center', marginTop: Theme.spacing.md },
  inspirationQuote: { ...Theme.typography.display, fontSize: 20, color: Theme.colors.onPrimary, fontStyle: 'italic', textAlign: 'center' },
  inspirationSub: { ...Theme.typography.label, fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 16, letterSpacing: 2 }
});

export default DashboardScreen;
