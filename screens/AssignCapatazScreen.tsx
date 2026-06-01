import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Layout,
  CheckCircle2,
  Circle,
  Users,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { lotesService } from '../services/lotes.service';
import { personalService } from '../services/personal.service';
import { rolesService } from '../services/roles.service';
import { parcelasService } from '../services/parcelas.service';
import { syncWorker } from '../services/sync.worker';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomAlert } from '../components/GlobalAlert';

const { width } = Dimensions.get('window');

const AssignCapatazScreen = ({ navigation, route }: any) => {
  const [lotes, setLotes] = useState<any[]>([]);
  const [capataces, setCapataces] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [selectedLote, setSelectedLote] = useState<any>(route.params?.lote || null);
  const [selectedCapataz, setSelectedCapataz] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  const headerFade = React.useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [lotesData, personnelData, rolesData] = await Promise.all([
        lotesService.getAll(),
        personalService.getAll(),
        rolesService.getAll().catch(() => [])
      ]);

      const rolesArray = Array.isArray(rolesData) ? rolesData : (rolesData.roles || rolesData.data || []);
      const newRolesMap: Record<string, string> = {};
      rolesArray.forEach((r: any) => {
        newRolesMap[r.id] = r.name || r.nombre || r.role_name || r.id;
      });
      setRolesMap(newRolesMap);

      const filteredCapataces = personnelData.filter((w: any) => {
        const roleName = (newRolesMap[w.role_id] || w.role_id || '').trim().toLowerCase();
        const cleanRole = roleName.replace(/_/g, ' ');
        return cleanRole.includes('capataz');
      });

      setLotes(lotesData);
      setCapataces(filteredCapataces);

      if (!selectedLote && lotesData.length > 0) {
        setSelectedLote(lotesData[0]);
      }

      Animated.timing(headerFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error('Error fetching data for AssignCapataz:', error);
      CustomAlert.show('ERROR', 'Error', 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [selectedLote]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleAssign = async () => {
    if (!selectedLote || !selectedCapataz) {
      CustomAlert.show('ALERTA', 'Selección Incompleta', 'Por favor seleccione un lote y el capataz responsable.');
      return;
    }

    try {
      setIsAssigning(true);
      await parcelasService.asignarPersonal(selectedLote.id, selectedCapataz, 'Administración');
      syncWorker.syncPendingData();
      CustomAlert.show('SUCCESS', 'Asignación Exitosa', 'El Capataz ha sido vinculado al lote correctamente.', () => {
        navigation.goBack();
      });
    } catch (error) {
      console.error('Error assigning capataz:', error);
      CustomAlert.show('ERROR', 'Fallo de Registro', 'No se pudo procesar la vinculación.');
    } finally {
      setIsAssigning(false);
    }
  };

  const renderCapatazItem = ({ item }: { item: any }) => {
    const isSelected = selectedCapataz === item.id;
    const roleName = rolesMap[item.role_id] || 'CAPATAZ';
    const fullName = `${item.first_name || item.firstName || ''} ${item.last_name || item.lastName || ''}`.trim();

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && { backgroundColor: Theme.colors.primaryFixed }
        ]}
        onPress={() => setSelectedCapataz(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[Theme.colors.surfaceContainerHigh, Theme.colors.surfaceVariant]}
            style={styles.avatarGradient}
          >
            <User size={24} color={Theme.colors.primary} />
          </LinearGradient>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{fullName || 'Colaborador sin nombre'}</Text>
          <View style={styles.badge}>
            <ShieldCheck size={12} color={Theme.colors.secondary} />
            <Text style={styles.badgeText}>{roleName}</Text>
          </View>
        </View>

        {isSelected ? (
          <CheckCircle2 size={26} color={Theme.colors.primary} />
        ) : (
          <Circle size={26} color={Theme.colors.outlineVariant} />
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <Animated.View style={{ opacity: headerFade }}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={Theme.colors.onSurface} />
        </TouchableOpacity>
        
        <Text style={styles.overline}>LIBRO DE GESTIÓN</Text>
        <Text style={styles.title}>Vinculación de Capataz</Text>
        <Text style={styles.description}>
          Asigne un responsable técnico para supervisar los procesos de este lote.
        </Text>
        <View style={styles.accentBar} />
      </View>

      <View style={styles.listHeaderSection}>
        <Text style={styles.sectionTitle}>Lote en Operación</Text>
        <View style={styles.loteCard}>
          <View style={styles.loteIconContainer}>
            <Layout size={24} color={Theme.colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.loteLabel}>IDENTIFICADOR ÚNICO</Text>
            <Text style={styles.loteCode}>{selectedLote?.codigo || 'Sin Lote'}</Text>
          </View>
        </View>

        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>Responsables Disponibles</Text>
          <Text style={styles.listCounter}>{capataces.length} perfiles</Text>
        </View>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loaderText}>Cargando Capataces...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <FlatList
        data={capataces}
        renderItem={renderCapatazItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Users size={64} color={Theme.colors.surfaceVariant} />
            <Text style={styles.emptyText}>No se encontraron capataces registrados.</Text>
          </View>
        }
      />

      {/* Footer / Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.mainButton}
          onPress={handleAssign}
          disabled={isAssigning}
        >
          <LinearGradient
            colors={[Theme.colors.primary, Theme.colors.primaryContainer]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isAssigning ? (
              <ActivityIndicator color={Theme.colors.onPrimary} />
            ) : (
              <>
                <Text style={styles.buttonText}>Confirmar Vinculación</Text>
                <CheckCircle2 size={20} color={Theme.colors.onPrimary} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    gap: 16,
  },
  loaderText: {
    ...Theme.typography.label,
    color: Theme.colors.primary,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Theme.shadows.ambient,
  },
  overline: {
    ...Theme.typography.labelSm,
    letterSpacing: 2,
    color: Theme.colors.secondary,
    fontWeight: '800',
  },
  title: {
    ...Theme.typography.display,
    fontSize: 32,
    color: Theme.colors.primary,
    marginTop: 8,
  },
  description: {
    ...Theme.typography.body,
    fontSize: 14,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 12,
    lineHeight: 22,
  },
  accentBar: {
    width: 64,
    height: 4,
    backgroundColor: Theme.colors.primary,
    borderRadius: 2,
    marginTop: 24,
  },
  listHeaderSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...Theme.typography.headline,
    fontSize: 18,
    color: Theme.colors.onSurface,
    marginBottom: 8,
  },
  listCounter: {
    ...Theme.typography.labelSm,
    color: Theme.colors.outline,
  },
  loteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 20,
    borderRadius: Theme.roundness.xxl,
    gap: 16,
    ...Theme.shadows.ambient,
  },
  loteIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loteLabel: {
    ...Theme.typography.labelSm,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Theme.colors.outline,
  },
  loteCode: {
    ...Theme.typography.headline,
    fontSize: 22,
    color: Theme.colors.onSurface,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 150,
    paddingHorizontal: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    ...Theme.shadows.ambient,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginRight: 16,
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  nameText: {
    ...Theme.typography.label,
    fontSize: 17,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  badgeText: {
    ...Theme.typography.labelSm,
    fontSize: 10,
    color: Theme.colors.secondary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 16,
  },
  emptyText: {
    ...Theme.typography.body,
    textAlign: 'center',
    color: Theme.colors.outline,
    paddingHorizontal: 32,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(255, 248, 243, 0.95)',
  },
  mainButton: {
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    ...Theme.shadows.ambient,
    elevation: 6,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    ...Theme.typography.label,
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.onPrimary,
  },
});

export default AssignCapatazScreen;
