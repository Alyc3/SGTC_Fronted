import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react-native';
import { Theme } from '../theme';

const { width, height } = Dimensions.get('window');

export type AlertType = 'SUCCESS' | 'ERROR' | 'ALERTA';

interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
}

// Singleton controller
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

  const scale = React.useRef(new Animated.Value(0.9)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  const show = useCallback((type: AlertType, title: string, message: string) => {
    setState({ visible: true, type, title, message });

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setState(prev => ({ ...prev, visible: false }));
    });
  }, [scale, opacity]);

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
          color: Theme.colors.secondary,
          Icon: CheckCircle2,
        };
      case 'ERROR':
        return {
          color: Theme.colors.error,
          Icon: XCircle,
        };
      case 'ALERTA':
      default:
        return {
          color: Theme.colors.primary,
          Icon: AlertCircle,
        };
    }
  };

  const { color, Icon } = getTheme();

  return (
    <Modal
      transparent
      visible={state.visible}
      animationType="none"
      onRequestClose={hide}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: color + '15' }]}>
              <Icon size={28} color={color} />
            </View>
            <TouchableOpacity onPress={hide} style={styles.closeBtn}>
              <X size={20} color={Theme.colors.outline} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{state.title}</Text>
            <Text style={styles.message}>{state.message}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: color }]} 
            onPress={hide}
          >
            <Text style={styles.actionButtonText}>
              {state.type === 'SUCCESS' ? 'ENTENDIDO' : 'ACEPTAR'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 27, 20, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Theme.colors.white,
    borderRadius: 28,
    padding: 24,
    ...Theme.shadows.ambient,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    marginBottom: 28,
  },
  title: {
    ...Theme.typography.headline,
    fontSize: 20,
    color: Theme.colors.onSurface,
    marginBottom: 8,
  },
  message: {
    ...Theme.typography.body,
    fontSize: 15,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 22,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    ...Theme.typography.label,
    color: Theme.colors.white,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
