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
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
  Plus, 
  UserPlus, 
  ChevronRight,
  ShieldCheck,
  User,
  Search,
  Edit2,
  X,
  Mail,
  Phone,
  IdCard,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { personalService } from '../services/personal.service';
import { rolesService } from '../services/roles.service';
import { CustomAlert } from '../components/GlobalAlert';
import { useAuthStore } from '../store/authStore';

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
  const { role: userRoleRaw } = useAuthStore();
  
  const getCleanRole = () => {
    if (!userRoleRaw) return 'COLABORADOR';
    if (typeof userRoleRaw === 'string') return userRoleRaw;
    if (typeof userRoleRaw === 'object') return (userRoleRaw as any).name || (userRoleRaw as any).role || 'COLABORADOR';
    return String(userRoleRaw);
  };

  const currentRole = getCleanRole();
  const displayRole = currentRole.trim().toUpperCase().replace(/_/g, ' ');

  const [workers, setWorkers] = useState<any[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para el modal de detalle
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  const fetchWorkersAndRoles = useCallback(async () => {
    try {
      setLoading(true);
      
      const workersData = await personalService.getAll();
      
      let rolesData: any = [];
      try {
        rolesData = await rolesService.getAll();
      } catch (roleError: any) {
        if (roleError.response?.status === 403) {
          console.log(`[Personal] El rol ${currentRole} no tiene permisos para ver roles remotos.`);
        } else {
          console.warn('No se pudieron obtener los roles de la API. Mostrando IDs.', roleError);
        }
      }

      const rolesArray = Array.isArray(rolesData) ? rolesData : (rolesData.roles || rolesData.data || []);

      const newRolesMap: Record<string, string> = {};
      rolesArray.forEach((r: any) => {
        newRolesMap[r.id] = r.name || r.nombre || r.role_name || r.id;
      });
      setRolesMap(newRolesMap);

      // Filtrar trabajadores según los roles permitidos
      const filteredWorkersData = workersData.filter((w: any) => {
        const roleName = newRolesMap[w.role_id];
        
        // Si no pudimos cargar los roles (mapa vacío), permitimos ver a todos para no dejar la pantalla en blanco
        if (Object.keys(newRolesMap).length === 0) return true;

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
      setSearchTerm('');
      fetchWorkersAndRoles();
    }, [fetchWorkersAndRoles])
  );

  // Efecto para filtrar la lista cuando cambia el término de búsqueda
  React.useEffect(() => {
    const filtered = personalService.filterWorkers(workers, rolesMap, searchTerm);
    setFilteredWorkers(filtered);
  }, [searchTerm, workers, rolesMap]);

  const renderDetailModal = () => {
    if (!selectedWorker) return null;
    const roleName = rolesMap[selectedWorker.role_id] || selectedWorker.role_id || 'TRABAJADOR';
    const isActive = selectedWorker.status === 'ACTIVO';

    return (
      <Modal
        visible={isDetailVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ficha del Colaborador</Text>
              <TouchableOpacity onPress={() => setIsDetailVisible(false)}>
                <X size={24} color={Theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailHero}>
                <View style={styles.detailAvatar}>
                  <User size={40} color={Theme.colors.primary} />
                </View>
                <Text style={styles.detailName}>
                  {`${selectedWorker.first_name || ''} ${selectedWorker.last_name || ''}`}
                </Text>
                <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusBadgeText}>{selectedWorker.status}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <DetailItem icon={<ShieldCheck size={20} />} label="Rol de Acceso" value={roleName} />
                <DetailItem icon={<IdCard size={20} />} label="Identificación" value={selectedWorker.identifier || 'No registrada'} />
                <DetailItem icon={<Mail size={20} />} label="Correo Electrónico" value={selectedWorker.email} />
                <DetailItem icon={<Phone size={20} />} label="Teléfono" value={selectedWorker.phone_number || 'No registrado'} />
              </View>

              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsDetailVisible(false)}
              >
                <Text style={styles.closeButtonText}>Cerrar Vista</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderWorker = ({ item }: any) => {
    const roleName = rolesMap[item.role_id] || item.role_id || 'TRABAJADOR';
    const isActive = item.status === 'ACTIVO';

    return (
      <View style={[styles.workerCard, !isActive && styles.workerCardInactive]}>
        <TouchableOpacity 
          style={styles.workerMainInfo}
          onPress={() => {
            setSearchTerm('');
            setSelectedWorker(item);
            setIsDetailVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.workerAvatar}>
            <User size={20} color={isActive ? Theme.colors.primary : Theme.colors.outline} />
          </View>
          <View style={styles.workerInfo}>
            <Text style={[styles.workerName, !isActive && { color: Theme.colors.outline }]}>
              {`${item.first_name || ''} ${item.last_name || ''}`}
            </Text>
            <View style={styles.roleBadge}>
              <ShieldCheck size={12} color={isActive ? Theme.colors.secondary : Theme.colors.outline} />
              <Text style={[styles.roleText, !isActive && { color: Theme.colors.outline }]}>{roleName}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionIcon} 
            onPress={() => {
              setSearchTerm('');
              navigation.navigate('RegisterPersonal', { worker: item });
            }}
          >
            <Edit2 size={18} color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerLabel}>{displayRole}</Text>
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

      {renderDetailModal()}
    </View>
  );
};

const DetailItem = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <View style={styles.detailItem}>
    <View style={styles.detailIconContainer}>
      {React.cloneElement(icon, { color: Theme.colors.primary })}
    </View>
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

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
  workerCardInactive: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    opacity: 0.8,
  },
  workerMainInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    padding: 8,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 27, 20, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Theme.colors.background,
    borderRadius: 32,
    padding: 24,
    maxHeight: '80%',
    ...Theme.shadows.ambient,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    ...Theme.typography.headline,
    fontSize: 18,
    color: Theme.colors.primary,
  },
  detailHero: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Theme.colors.white,
  },
  detailName: {
    ...Theme.typography.display,
    fontSize: 24,
    textAlign: 'center',
    color: Theme.colors.onSurface,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusActive: {
    backgroundColor: Theme.colors.secondaryContainer,
  },
  statusInactive: {
    backgroundColor: Theme.colors.errorContainer,
  },
  statusBadgeText: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  detailSection: {
    gap: 20,
    marginBottom: 32,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    ...Theme.typography.labelSm,
    color: Theme.colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailValue: {
    ...Theme.typography.body,
    fontSize: 16,
    color: Theme.colors.onSurface,
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: Theme.colors.surfaceContainerHigh,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    ...Theme.typography.label,
    color: Theme.colors.primary,
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
