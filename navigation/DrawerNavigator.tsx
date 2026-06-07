import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { CustomDrawer } from './CustomDrawer';
import LotesScreen from '../screens/LotesScreen';
import PersonalScreen from '../screens/PersonalScreen';
import RegisterPersonalScreen from '../screens/RegisterPersonalScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import RegistroSemillaScreen from '../screens/RegistroSemillaScreen';
import InventarioSemillasScreen from '../screens/InventarioSemillasScreen';
import GestionParcelaScreen from '../screens/GestionParcelaScreen';
import ListarParcelaScreen from '../screens/ListarParcelaScreen';
import GestionLoteScreen from '../screens/GestionLoteScreen';
import ViewLoteScreen from '../screens/ViewLoteScreen';
import EtapaSembradosScreen from '../screens/EtapaSembradosScreen';
import AssignPersonalScreen from '../screens/AssignPersonalScreen';
import AssignCapatazScreen from '../screens/AssignCapatazScreen';
import DashboardScreen from '../screens/DashboardScreen';
import GestionRolesScreen from '../screens/GestionRolesScreen';
import { Theme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { SyncStatusIcon } from '../components/SyncStatusIcon';
import { 
  LayoutDashboard, 
  Boxes, 
  Map, 
  Sprout, 
  Flower,
  Users, 
  Settings,
  ShieldCheck
} from 'lucide-react-native';

const Drawer = createDrawerNavigator();

export const DrawerNavigator = () => {
  const roleRaw = useAuthStore((state) => state.role);
  
  const getCleanRole = () => {
    if (!roleRaw) return '';
    if (typeof roleRaw === 'string') return roleRaw;
    if (typeof roleRaw === 'object') return (roleRaw as any).name || (roleRaw as any).role || '';
    return String(roleRaw);
  };

  const role = getCleanRole().toUpperCase();
  const isTechnical = role.includes('TECNICO') || role.includes('ENCARGADO') || role.includes('TOSTADOR');

  // Definición de permisos por rol
  const canAccessLotes = true; // Acceso universal a lotes (filtrado internamente)
  const canAccessParcelas = ['ADMIN', 'CAPATAZ'].includes(role) && !isTechnical;
  const canAccessSemillas = ['ADMIN', 'GESTOR_INVENTARIO'].includes(role) && !isTechnical;
  const canAccessPersonal = ['ADMIN', 'CAPATAZ'].includes(role) && !isTechnical;
  const canAccessRoles = ['ADMIN'].includes(role);

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: true,
        headerRight: () => <SyncStatusIcon />,
        headerStyle: {
          backgroundColor: Theme.colors.primaryContainer,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: Theme.colors.onPrimary,
        headerTitleStyle: {
          ...Theme.typography.headline,
          fontSize: 18,
          fontWeight: '700',
          color: Theme.colors.onPrimary,
        },
        drawerType: 'slide',
        overlayColor: 'rgba(31, 27, 20, 0.4)',
        drawerActiveBackgroundColor: Theme.colors.surfaceContainerLow,
        drawerActiveTintColor: Theme.colors.primary,
        drawerInactiveTintColor: Theme.colors.onSurfaceVariant,
        
        drawerLabelStyle: {
          ...Theme.typography.body,
          fontSize: 14,
          fontWeight: '600',
          marginLeft: -4,
        },
      
        drawerItemStyle: {
          borderRadius: Theme.roundness.md,
          marginLeft: 4,
          marginRight: 12,
          marginVertical: 1,
          paddingHorizontal: 0,
        }
      }}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ 
          title: 'Inicio',
          drawerIcon: ({ color }) => <LayoutDashboard size={20} color={color} />
        }}
      />

      <Drawer.Screen 
        name="Lotes" 
        component={LotesScreen} 
        options={{ 
          title: 'Gestión de Lotes',
          drawerIcon: ({ color }) => <Boxes size={20} color={color} />,
          drawerItemStyle: canAccessLotes ? {} : { display: 'none' }
        }}
      />

      <Drawer.Screen 
        name="ListarParcela" 
        component={ListarParcelaScreen} 
        options={{ 
          title: 'Parcelas',
          drawerIcon: ({ color }) => <Map size={20} color={color} />,
          drawerItemStyle: canAccessParcelas ? {} : { display: 'none' }
        }}
      />

      <Drawer.Screen 
        name="GestionParcela" 
        component={GestionParcelaScreen} 
        options={{ 
          title: 'Gestionar Parcela',
          drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen 
        name="GestionLote" 
        component={GestionLoteScreen} 
        options={{ 
          title: 'Gestionar Lote',
          drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen 
        name="ViewLote" 
        component={ViewLoteScreen} 
        options={{ 
          title: 'Detalle de Lote',
          drawerItemStyle: { display: 'none' },
          headerShown: false
        }}
      />

      <Drawer.Screen 
        name="Configuracion" 
        component={ConfiguracionScreen} 
        options={{ 
          title: 'Configuración',
          drawerIcon: ({ color }) => <Settings size={20} color={color} />
        }}
      />

      <Drawer.Screen 
        name="EtapaSembrados" 
        component={EtapaSembradosScreen} 
        options={{ 
          title: 'Control de Sembrado',
          drawerIcon: ({ color }) => <Flower size={20} color={color} />,
          drawerItemStyle: isTechnical ? {} : { display: 'none' },
          headerShown: false
        }}
      />

      <Drawer.Screen 
        name="AssignCapataz" 
        component={AssignCapatazScreen} 
        options={{ 
          title: 'Asignar Capataz',
          drawerIcon: ({ color }) => <ShieldCheck size={20} color={color} />,
          drawerItemStyle: { display: 'none' }
        }}
      />
    </Drawer.Navigator>
  );
};
