import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { db, expoDb } from './db';
import migrations from './db/migrations/migrations';
import { DrawerNavigator } from './navigation/DrawerNavigator'; 
import LoginAuthScreen from './screens/LoginAuthScreen';
import { Theme } from './theme';
import { seedService } from './services';
import { GlobalAlert } from './components/GlobalAlert';
import { useAuthStore } from './store/authStore';
import { AppState, AppStateStatus } from 'react-native';
import { syncWorker } from './services/sync.worker';

// Import mandatory for gesture handler
import 'react-native-gesture-handler';

export default function App() {
  // Activate Drizzle Studio (only works in dev mode)
  useDrizzleStudio(expoDb);

  const { success, error } = useMigrations(db, migrations);
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();

  React.useEffect(() => {
    restoreSession();

    // Disparador: Sincronización al iniciar o volver del segundo plano
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncWorker.syncPendingData();
      }
    });

    // Sincronización inmediata al montar si está autenticado
    if (isAuthenticated) {
      syncWorker.syncPendingData();
    }

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (success) {
      seedService.initCatalogo();
    }
  }, [success]);

  if (error) console.error('Migration error:', error);

  if (!success || isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isAuthenticated ? (
          <DrawerNavigator />
        ) : (
          <LoginAuthScreen />
        )}
      </NavigationContainer>
      <GlobalAlert />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
});
