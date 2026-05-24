import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  DrawerContentScrollView, 
  DrawerItemList,
  DrawerContentComponentProps 
} from '@react-navigation/drawer';
import { Theme } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SyncButton } from '../components/SyncButton';
import { LogOut } from 'lucide-react-native';

export const CustomDrawer = (props: DrawerContentComponentProps) => {
  return (
    <View style={styles.container}>
      {/* Header Premium - Ajustado para ser más esbelto */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.brandContainer}>
          <Text style={styles.headerLabel}>MODULO 1</Text>
          <Text style={styles.headerTitle}>STGC</Text>
          <View style={styles.brandAccent} />
        </View>
      </SafeAreaView>

      {/* Menú de Navegación - Contenedor con scroll limpio */}
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={styles.drawerList}
        showsVerticalScrollIndicator={false}
      >
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Footer - Más compacto */}
      <View style={styles.footer}>
        <SyncButton />
        
        <View style={styles.footerActions}>
          <View>
            <Text style={styles.versionText}>v1.0.0 Grupo 1</Text>
            <Text style={styles.legalText}>STGC Modulo de Trazabilidad ©</Text>
          </View>
          
          <TouchableOpacity style={styles.logoutButton}>
            <LogOut size={16} color={Theme.colors.error} />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: Theme.colors.surface,
  },
  brandContainer: {
    marginBottom: 4,
  },
  headerLabel: {
    ...Theme.typography.label,
    fontSize: 9,
    letterSpacing: 4,
    color: Theme.colors.primary,
    opacity: 0.8,
  },
  headerTitle: {
    ...Theme.typography.display,
    fontSize: 28,
    marginTop: -2,
    color: Theme.colors.primary,
  },
  brandAccent: {
    height: 2,
    width: 20,
    backgroundColor: Theme.colors.secondary,
    marginTop: 4,
    borderRadius: 2,
  },
  headerSubtitle: {
    ...Theme.typography.label,
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: 8,
  },
  drawerList: {
    paddingTop: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: Theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.surfaceContainerLow,
  },
  footerActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  versionText: {
    ...Theme.typography.label,
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  legalText: {
    ...Theme.typography.label,
    fontSize: 9,
    color: Theme.colors.outline,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    ...Theme.typography.body,
    fontSize: 12,
    color: Theme.colors.error,
    fontWeight: '700',
  },
});
