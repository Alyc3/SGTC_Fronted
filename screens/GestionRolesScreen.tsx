import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  ShieldCheck,
  Edit2,
  Trash2,
  ArrowRight,
  List,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { CustomAlert } from '../components/GlobalAlert';
import { rolesService } from '../services/roles.service';

const GestionRolesScreen = ({ navigation }: any) => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await rolesService.getAll();
      setRoles(data);
    } catch (error: any) {
      const isSessionError = error.message === 'SESSION_EXPIRED' || error.response?.status === 401;
      if (!isSessionError) {
        console.error('Error fetching roles:', error);
        CustomAlert.show('ERROR', 'Error', 'No se pudieron cargar los roles.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      CustomAlert.show('ALERTA', 'Campos Incompletos', 'El nombre del rol es obligatorio.');
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        await rolesService.update(editingId, { name, description });
        CustomAlert.show('SUCCESS', 'Éxito', 'Rol actualizado correctamente.');
      } else {
        await rolesService.create({ name, description });
        CustomAlert.show('SUCCESS', 'Éxito', 'Rol creado correctamente.');
      }
      resetForm();
      fetchRoles();
    } catch (error: any) {
      console.error('Error saving role:', error);
      const msg = error.response?.data?.detail || 'No se pudo guardar el rol.';
      CustomAlert.show('ERROR', 'Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (role: any) => {
    setEditingId(role.id);
    setName(role.name);
    setDescription(role.description || '');
  };

  const handleDelete = (id: string, roleName: string) => {
    CustomAlert.show(
      'ALERTA',
      'Eliminar Rol',
      `¿Está seguro que desea eliminar el rol ${roleName}?`,
      async () => {
        try {
          setLoading(true);
          await rolesService.delete(id);
          CustomAlert.show('SUCCESS', 'Éxito', 'Rol eliminado correctamente.');
          if (editingId === id) resetForm();
          fetchRoles();
        } catch (error: any) {
          console.error('Error deleting role:', error);
          const status = error.response?.status;
          const msg = status === 400 
            ? 'No se puede eliminar un rol con usuarios asociados.' 
            : 'Error al eliminar el rol.';
          CustomAlert.show('ERROR', 'No Permitido', msg);
        } finally {
          setLoading(false);
        }
      },
      'ELIMINAR',
      () => {},
      'CANCELAR'
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color={Theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Title Section */}
          <View style={styles.header}>
            <Text style={styles.contextText}>CONFIGURACIÓN DEL SISTEMA</Text>
            <Text style={styles.mainTitle}>Gestión de Roles</Text>
            <Text style={styles.description}>
              Administre los roles del sistema y sus descripciones para controlar el acceso a los diferentes módulos.
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <ShieldCheck size={20} color={Theme.colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>
                {editingId ? 'Editar Rol' : 'Nuevo Rol'}
              </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre del Rol *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. GESTOR_INVENTARIO"
                  placeholderTextColor={Theme.colors.outline}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Descripción de responsabilidades..."
                  placeholderTextColor={Theme.colors.outline}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>

            {/* Action Button */}
            <View style={styles.actionRow}>
              {editingId && (
                <TouchableOpacity 
                  style={[styles.cancelButton]} 
                  onPress={resetForm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.registerButton, editingId && { flex: 2 }]} 
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.registerButtonText}>
                  {loading ? 'Procesando...' : editingId ? 'Actualizar Rol' : 'Crear Rol'}
                </Text>
                <View style={styles.buttonIconContainer}>
                  <ArrowRight size={20} color={Theme.colors.white} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* List Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <List size={20} color={Theme.colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Roles Registrados</Text>
            </View>
            <View style={styles.divider} />

            {roles.map((role) => (
              <View key={role.id} style={styles.roleCard}>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleName}>{role.name}</Text>
                  {role.description ? (
                    <Text style={styles.roleDescription}>{role.description}</Text>
                  ) : null}
                </View>
                <View style={styles.roleActions}>
                  <TouchableOpacity 
                    style={styles.iconActionBtn} 
                    onPress={() => handleEdit(role)}
                  >
                    <Edit2 size={18} color={Theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconActionBtn} 
                    onPress={() => handleDelete(role.id, role.name)}
                  >
                    <Trash2 size={18} color={Theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            {roles.length === 0 && !loading && (
              <Text style={styles.emptyText}>No hay roles registrados.</Text>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  iconButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 12,
    marginBottom: 32,
  },
  contextText: {
    ...Theme.typography.labelSm,
    letterSpacing: 2,
    color: Theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  mainTitle: {
    ...Theme.typography.display,
    fontSize: 32,
    color: Theme.colors.primary,
  },
  description: {
    ...Theme.typography.body,
    fontSize: 14,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    ...Theme.typography.headline,
    fontSize: 18,
    color: Theme.colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.outlineVariant,
    marginBottom: 20,
    opacity: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...Theme.typography.labelSm,
    color: Theme.colors.onSurfaceVariant,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: 24,
    paddingHorizontal: 20,
    height: 52,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    flex: 1,
    ...Theme.typography.body,
    fontSize: 15,
    color: Theme.colors.onSurface,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  registerButton: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonText: {
    ...Theme.typography.label,
    fontSize: 16,
    color: Theme.colors.white,
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceContainerHighest,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...Theme.typography.label,
    fontSize: 16,
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '700',
  },
  buttonIconContainer: {
    marginLeft: 12,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceContainerHigh,
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
  },
  roleInfo: {
    flex: 1,
    marginRight: 12,
  },
  roleName: {
    ...Theme.typography.label,
    color: Theme.colors.secondary,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  roleDescription: {
    ...Theme.typography.body,
    color: Theme.colors.onSurfaceVariant,
    fontSize: 13,
    marginTop: 4,
  },
  roleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconActionBtn: {
    padding: 8,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: 12,
  },
  emptyText: {
    ...Theme.typography.body,
    textAlign: 'center',
    color: Theme.colors.outline,
    marginTop: 20,
    fontStyle: 'italic',
  }
});

export default GestionRolesScreen;
