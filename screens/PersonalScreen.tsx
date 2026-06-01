import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
  Plus, 
  UserPlus, 
  ChevronRight,
  ShieldCheck,
  User,
  Search,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { personalService } from '../services/personal.service';
import { rolesService } from '../services/roles.service';

const ALLOWED_ROLES = [
  'ADMIN',
  'Gerente General',
  'Capataz',
  'Sembrador',
  'Recolector',
  'Clasificador',
  'Técnico de Despulpado',
  'Encargado de Secado',
  'Tostador',
  'Gestor de Calidad',
  'Gestores de Calidad',
  'Controlador Despacho',
  'Técnico de Almacenamiento',
  'Tecnico_Sembrado'
];

const ALLOWED_ROLES_NORMALIZED = [
  ...ALLOWED_ROLES.map(r => r.trim().toLowerCase()),
  ...ALLOWED_ROLES.map(r => r.trim().toLowerCase().replace(/\s+/g, '_')),
  ...ALLOWED_ROLES.map(r => r.trim().toLowerCase().replace(/_/g, ' ')),
];

const PersonalScreen = ({ navigation }: any) => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchWorkersAndRoles = useCallback(async () => {
    try {
      setLoading(true);
      
      const workersData = await personalService.getAll();
      
      let rolesData: any = [];
      try {
        rolesData = await rolesService.getAll();
      } catch (roleError) {
        console.warn('No se pudieron obtener los roles de la API. Mostrando IDs.', roleError);
      }

      const rolesArray = Array.isArray(rolesData) ? rolesData : (rolesData.roles || rolesData.data || []);

      const newRolesMap: Record<string, string> = {};
      rolesArray.forEach((r: any) => {
        newRolesMap[r.id] = r.name || r.nombre || r.role_name || r.id;
      });
      setRolesMap(newRolesMap);

      // Filtrar trabajadores según los roles permitidos
      const filteredWorkersData = workersData.filter((w: any) => {
        const roleName = newRolesMap[w.role_id] || w.role_id;
        if (!roleName) return false; 
        const cleanName = roleName.trim().toLowerCase();
        return ALLOWED_ROLES_NORMALIZED.includes(cleanName);
      });

      setWorkers(filteredWorkersData);
      setFilteredWorkers(filteredWorkersData);
    } catch (error: any) {
      const isSessionError = error.message === 'SESSION_EXPIRED' || error.response?.status === 401;
      if (!isSessionError) {
        console.error('Error fetching workers:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWorkersAndRoles();
    }, [fetchWorkersAndRoles])
  );

  // Efecto para filtrar la lista cuando cambia el término de búsqueda
  React.useEffect(() => {
    const filtered = personalService.filterWorkers(workers, rolesMap, searchTerm);
    setFilteredWorkers(filtered);
  }, [searchTerm, workers, rolesMap]);

  const renderWorker = ({ item }: any) => {
    const roleName = rolesMap[item.role_id] || item.role_id || 'TRABAJADOR';

    return (
      <TouchableOpacity 
        style={styles.workerCard}
        onPress={() => {}}
      >
        <View style={styles.workerAvatar}>
          <User size={20} color={Theme.colors.primary} />
        </View>
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>{`${item.first_name || ''} ${item.last_name || ''}`}</Text>
          <View style={styles.roleBadge}>
            <ShieldCheck size={12} color={Theme.colors.secondary} />
            <Text style={styles.roleText}>{roleName}</Text>
          </View>
          <Text style={styles.identifierText}>{item.identifier || 'Sin ID'}</Text>
        </View>
        <ChevronRight size={20} color={Theme.colors.outline} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerLabel}>ADMINISTRACIÓN</Text>
        <Text style={styles.title}>{`Personal (${filteredWorkers.length})`}</Text>
        <Text style={styles.description}>
          Gestione los colaboradores y sus roles de acceso dentro del ecosistema STGC.
        </Text>
        <View style={styles.accentBar} />
      </View>

      {/* Barra de Búsqueda */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search size={20} color={Theme.colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, ID o rol..."
            placeholderTextColor={Theme.colors.outline}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredWorkers}
          keyExtractor={(item) => item.id}
          renderItem={renderWorker}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <UserPlus size={48} color={Theme.colors.surfaceVariant} />
              <Text style={styles.emptyText}>
                {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No hay colaboradores registrados con los roles solicitados'}
              </Text>
            </View>
          }
        />
      )}

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
  searchContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    ...Theme.typography.body,
    fontSize: 14,
    color: Theme.colors.onSurface,
  },
  listContent: {
    padding: Theme.spacing.lg,
    paddingBottom: 100,
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
  identifierText: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    color: Theme.colors.outline,
    marginTop: 2,
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
