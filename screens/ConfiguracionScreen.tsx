import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';

const ConfiguracionScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>SISTEMA</Text>
        <Text style={styles.title}>Configuración</Text>
        <Text style={styles.description}>Ajustes técnicos y estado del Monolito.</Text>
        <View style={styles.accentBar} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.lg,
  },
  header: {
    paddingTop: Theme.spacing.md,
  },
  headerLabel: {
    ...Theme.typography.label,
    fontSize: 10,
    letterSpacing: 2,
    color: Theme.colors.primary,
  },
  title: {
    ...Theme.typography.display,
    fontSize: 28,
    marginTop: 4,
    color: Theme.colors.primary,
  },
  description: {
    ...Theme.typography.body,
    marginTop: Theme.spacing.sm,
    color: Theme.colors.onSurfaceVariant,
  },
  accentBar: {
    height: 4,
    backgroundColor: Theme.colors.primary,
    width: 60,
    marginTop: Theme.spacing.md,
    borderRadius: 2,
  },
});

export default ConfiguracionScreen;
