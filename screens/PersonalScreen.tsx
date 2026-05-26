import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  StatusBar
} from 'react-native';
import { 
  Plus, 
  UserPlus, 
  ChevronRight,
  ShieldCheck,
  User,
  BadgeCheck
} from 'lucide-react-native';
import { Theme } from '../theme';

const PersonalScreen = ({ navigation }: any) => {
  // Mock data for the list
  const workers = [
    { id: '1', name: 'Antonio García', role: 'CAPATAZ', active: true },
    { id: '2', name: 'María Rodríguez', role: 'GESTOR_INVENTARIO', active: true },
  ];

  const renderWorker = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.workerCard}
      onPress={() => {}}
    >
      <View style={styles.workerAvatar}>
        <User size={20} color={Theme.colors.primary} />
      </View>
      <View style={styles.workerInfo}>
        <Text style={styles.workerName}>{item.name}</Text>
        <View style={styles.roleBadge}>
          <ShieldCheck size={12} color={Theme.colors.secondary} />
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
      </View>
      <ChevronRight size={20} color={Theme.colors.outline} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerLabel}>ADMINISTRACIÓN</Text>
        <Text style={styles.title}>Personal</Text>
        <Text style={styles.description}>
          Gestione los colaboradores y sus roles de acceso dentro del ecosistema STGC.
        </Text>
        <View style={styles.accentBar} />
      </View>

      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        renderItem={renderWorker}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <UserPlus size={48} color={Theme.colors.surfaceVariant} />
            <Text style={styles.emptyText}>No hay colaboradores registrados</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('RegisterPersonal')}
        activeOpacity={0.8}
      >
        <Plus size={28} color={Theme.colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    padding: Theme.spacing.lg,
    paddingTop: 24,
  },
  headerLabel: {
    ...Theme.typography.labelSm,
    letterSpacing: 2,
    color: Theme.colors.primary,
  },
  title: {
    ...Theme.typography.display,
    fontSize: 32,
    marginTop: 4,
    color: Theme.colors.primary,
  },
  description: {
    ...Theme.typography.body,
    marginTop: Theme.spacing.sm,
    color: Theme.colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  accentBar: {
    height: 4,
    backgroundColor: Theme.colors.primary,
    width: 60,
    marginTop: Theme.spacing.md,
    borderRadius: 2,
  },
  listContent: {
    padding: Theme.spacing.lg,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    ...Theme.shadows.ambient,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    ...Theme.typography.label,
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  roleText: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    color: Theme.colors.secondary,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 16,
  },
  emptyText: {
    ...Theme.typography.body,
    color: Theme.colors.outline,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: Theme.colors.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.ambient,
    elevation: 8,
  },
});

export default PersonalScreen;
