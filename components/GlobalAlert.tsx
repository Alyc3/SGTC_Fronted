import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react-native';
import { Theme } from '../theme';

const { width } = Dimensions.get('window');

export type AlertType = 'SUCCESS' | 'ERROR' | 'ALERTA';

interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
}

// Singleton controller to trigger alerts globally
let alertRef: any = null;

export const CustomAlert = {
  show: (type: AlertType, title: string, message: string) => {
    alertRef?.show(type, title, message);
  },
};

export const GlobalAlert = () => {
  const [state, setState] = useState<AlertState>({
    visible: false,
    type: 'SUCCESS',
    title: '',
    message: '',
  });

  const translateY = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  const show = useCallback((type: AlertType, title: string, message: string) => {
    setState({ visible: true, type, title, message });

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: Platform.OS === 'ios' ? 60 : 40,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 4 seconds
    setTimeout(hide, 4000);
  }, [translateY, opacity]);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setState(prev => ({ ...prev, visible: false }));
    });
  }, [translateY, opacity]);

  useEffect(() => {
    alertRef = { show };
    return () => {
      alertRef = null;
    };
  }, [show]);

  if (!state.visible) return null;

  const getTheme = () => {
    switch (state.type) {
      case 'SUCCESS':
        return {
          color: Theme.colors.success,
          Icon: CheckCircle,
          bg: Theme.colors.secondaryContainer,
        };
      case 'ERROR':
        return {
          color: Theme.colors.error,
          Icon: XCircle,
          bg: Theme.colors.errorContainer,
        };
      case 'ALERTA':
      default:
        return {
          color: Theme.colors.primary,
          Icon: AlertTriangle,
          bg: Theme.colors.surfaceContainerHigh,
        };
    }
  };

  const { color, Icon, bg } = getTheme();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: Theme.colors.surfaceContainerLowest,
          borderColor: bg,
        },
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={styles.iconContainer}>
        <Icon size={24} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: Theme.colors.onSurface }]}>{state.title.toUpperCase()}</Text>
        <Text style={[styles.message, { color: Theme.colors.onSurfaceVariant }]}>{state.message}</Text>
      </View>
      <TouchableOpacity onPress={hide} style={styles.closeButton}>
        <X size={18} color={Theme.colors.outline} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    borderRadius: Theme.roundness.lg,
    padding: Theme.spacing.md,
    ...Theme.shadows.ambient,
    borderWidth: 1,
    elevation: 10,
    minHeight: 70,
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  iconContainer: {
    marginRight: Theme.spacing.md,
    marginLeft: Theme.spacing.xs,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...Theme.typography.label,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  message: {
    ...Theme.typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    padding: Theme.spacing.xs,
  },
});
