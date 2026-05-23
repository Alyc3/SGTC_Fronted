import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { CustomDrawer } from './CustomDrawer';
import LotesScreen from '../screens/LotesScreen';
import PersonalScreen from '../screens/PersonalScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import RegistroSemillaScreen from '../screens/RegistroSemillaScreen';
import InventarioSemillasScreen from '../screens/InventarioSemillasScreen';
import GestionParcelaScreen from '../screens/GestionParcelaScreen';
import ListarParcelaScreen from '../screens/ListarParcelaScreen';
import DashboardScreen from '../screens/DashboardScreen';
import { Theme } from '../theme';
import { 
  LayoutDashboard, 
  Boxes, 
  Map, 
  List,
  Sprout, 
  PlusCircle, 
  Users, 
  Settings 
} from 'lucide-react-native';

const Drawer = createDrawerNavigator();

export const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Theme.colors.primaryContainer, // Fondo café Espresso Medio
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: Theme.colors.onPrimary, // Texto e iconos claros (Blanco)
        headerTitleStyle: {
          ...Theme.typography.headline,
          fontSize: 18,
          fontWeight: '700',
          color: Theme.colors.onPrimary, // Blanco explícito
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
          drawerIcon: ({ color }) => <Boxes size={20} color={color} />
        }}
      />
      <Drawer.Screen 
        name="ListarParcela" 
        component={ListarParcelaScreen} 
        options={{ 
          title: 'Listado de Parcelas',
          drawerIcon: ({ color }) => <List size={20} color={color} />
        }}
      />
      <Drawer.Screen 
        name="GestionParcela" 
        component={GestionParcelaScreen} 
        options={{ 
          title: 'Nueva Parcela',
          drawerIcon: ({ color }) => <Map size={20} color={color} />
        }}
      />
      <Drawer.Screen 
        name="InventarioSemillas" 
        component={InventarioSemillasScreen} 
        options={{ 
          title: 'Inventario Semillas',
          drawerIcon: ({ color }) => <Sprout size={20} color={color} />
        }}
      />
      <Drawer.Screen 
        name="RegistroSemilla" 
        component={RegistroSemillaScreen} 
        options={{ 
          title: 'Nueva Semilla',
          drawerIcon: ({ color }) => <PlusCircle size={20} color={color} />
        }}
      />
      <Drawer.Screen 
        name="Personal" 
        component={PersonalScreen} 
        options={{ 
          title: 'Personal',
          drawerIcon: ({ color }) => <Users size={20} color={color} />
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
    </Drawer.Navigator>
  );
};
