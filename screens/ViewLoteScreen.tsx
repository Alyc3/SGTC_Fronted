import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
  type ImageStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Coffee,
  Ruler,
  UserPlus,
  PlayCircle,
  PauseCircle,
  Leaf,
  Sprout,
  TreeDeciduous,
  Flower,
  Tractor,
  Droplets,
  Thermometer,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../theme';

const { width } = Dimensions.get('window');

const ViewLoteScreen = ({ navigation, route }: any) => {
  const lote = route.params?.lote;
  const [isProcessing, setIsProcessing] = useState(lote?.estado_lote === 'En_Produccion');

  const toggleProcess = () => {
    setIsProcessing(!isProcessing);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={Theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle de Lote</Text>
        </View>
        <View style={styles.headerRight}>
          
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAelyaGPFqgo6iuixC76-00IAp9mxQf8xTYz1-v24kppIzTL4OQYI99su0wwxP6weZschuRe422yrd9Vv6e2_kxTQwMubPXcOqrFayQfBEtVC1JEnmH0U6fFN9stSUk4FUfN1LytuszG1TJdorjF8sS3dJ2Kb24fdZZJ_jKxztprMXB53r5IecWIscj8GtSbTTM3VghCxaeeWDkNVnq0nogvTWJOTIOGglvtCDIIT02a2BMBi5a4aSTvpapGJDruilqUVIoZ1FuJaQv' }}
              style={styles.profileImage}
            />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLeT97l2perQsk7Nk1LKPjsi4uqe9Owj0ERazr1D4SyFLe-2Nfh8nGvheBQjVG5qf5y54ZfaJgKlFad83ajjRFZZJY_1dfXa1B9ty27z5-rKjp7QzwdJfgeH-M0B7A6bG09zio7lK0mMQQI_M99OjcRnfDBj_pWkenrHySkF5MlSIvrFflqgtJmXZFN5xiCLFAOSXJVkVDT5EnV--UmPs0z5LRJhvEQR_9NSB_hgcEXLIFpfm5a4yNPspQ-BPAkOZs5oZgsbOkHElY' }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(68, 42, 34, 0.9)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View>
                <Text style={styles.heroLabel}>Ubicación Actual</Text>
                <Text style={styles.heroTitle}>{lote?.parcela?.nombre || 'Ladera Norte'}</Text>
                <View style={[styles.statusBadge, { marginTop: 8, alignSelf: 'flex-start' }]}>
                  <View style={[styles.statusDot, isProcessing && { backgroundColor: Theme.colors.secondary }]} />
                  <Text style={styles.statusText}>{isProcessing ? 'EN PRODUCCIÓN' : 'RESERVADO'}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Bento Grid */}
        <View style={styles.bentoGrid}>
          {/* Variety Card */}
          <View style={styles.bentoCardLarge}>
            <Coffee size={40} color={Theme.colors.secondary} />
            <View style={styles.bentoCardContent}>
              <Text style={styles.bentoCardLabel}>Variedad de Café</Text>
              <Text style={styles.bentoCardTitle}>{lote?.semilla?.variedad?.valor || 'Geisha Premium'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.asignacionButton}
              onPress={() => navigation.navigate('AssignPersonal', { lote })}
            >
              <UserPlus size={20} color={Theme.colors.onPrimary} />
              <Text style={styles.asignacionButtonText}>Asignación de Personal</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bentoRow}>
            {/* Extension Card */}
            <View style={styles.bentoCardSmall}>
              <Ruler size={40} color={Theme.colors.tertiary} />
              <View>
                <Text style={styles.bentoCardLabel}>Extensión</Text>
                <Text style={styles.bentoCardTitle}>{lote?.hectareas_lote || '2.5'} Hectáreas</Text>
              </View>
            </View>

            {/* Responsible Card */}
            <View style={styles.bentoCardSmall}>
              <Text style={styles.bentoCardLabel}>Capataz Asignado</Text>
              <View style={styles.foremanContainer}>
                <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDv2g-xrsu21YGt2y2-OAntwQyVC01-BYnvYtEhc8aonoF3XK8RdlZ2ECIOADH4FfEksAdMh1KvW3HQmDZ_ILARuVZhrODNqlnP1yY2Bye4xf8NdQScmMxB0rdSM7Fu0LYt4NSeS08Xv2ASIR3yJDFH4U7FXFj3EKluPOtwLQZi7QVRMHYDmGyzAs36Y7pp6fPXO33WqrTGsXnoSyMrG29qeyUnCxfOgt8ui863EuvqQd7_WoFZxY2eOCYdszVRc0gLUBJvSi7AA1Y9' }}
                  style={styles.foremanImage as ImageStyle}
                />
                <View>
                  <Text style={styles.foremanName}>Mateo Rivera</Text>
                  <Text style={styles.foremanRole}>Especialista Senior</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Process Control Section */}
        <View style={styles.processSection}>
          <View style={styles.processHeader}>
            <Text style={styles.processTitle}>Control de Proceso</Text>
          </View>

          {/* Timeline Stepper */}
          <View style={styles.timelineContainer}>
            <View style={styles.timelineTrack}>
              <View 
                style={[
                  styles.timelineFill, 
                  { width: isProcessing ? '50%' : '25%' }
                ]} 
              />
            </View>
            <View style={styles.timelineNodes}>
              <TimelineStep 
                icon={<Leaf size={14} color={Theme.colors.onSecondary} />} 
                label="Germinación" 
                active={true} 
              />
              <TimelineStep 
                icon={<Sprout size={14} color={Theme.colors.onSecondary} />} 
                label="Vivero" 
                active={true} 
              />
              <TimelineStep 
                icon={<TreeDeciduous size={14} color={isProcessing ? Theme.colors.onSecondary : Theme.colors.onSurfaceVariant} />} 
                label="Crecimiento" 
                active={isProcessing} 
              />
              <TimelineStep 
                icon={<Flower size={14} color={Theme.colors.onSurfaceVariant} />} 
                label="Floración" 
                active={false} 
              />
              <TimelineStep 
                icon={<Tractor size={14} color={Theme.colors.onSurfaceVariant} />} 
                label="Maduración" 
                active={false} 
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.processButton, isProcessing && { backgroundColor: Theme.colors.tertiary }, { marginTop: 24, width: '100%', justifyContent: 'center' }]} 
            onPress={toggleProcess}
          >
            {isProcessing ? (
              <PauseCircle size={24} color={Theme.colors.onPrimary} />
            ) : (
              <PlayCircle size={24} color={Theme.colors.onPrimary} />
            )}
            <Text style={styles.processButtonText}>
              {isProcessing ? 'Detener Proceso' : 'Iniciar Proceso'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const TimelineStep = ({ icon, label, active }: any) => (
  <View style={styles.stepContainer}>
    <View style={[
      styles.stepNode, 
      active ? styles.stepNodeActive : styles.stepNodeInactive,
      active && label === "Crecimiento" && styles.stepNodeScale
    ]}>
      {icon}
    </View>
    <Text style={[
      styles.stepLabel, 
      active ? { color: Theme.colors.secondary } : { color: Theme.colors.onSurfaceVariant }
    ]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Theme.colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loteId: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: 2,
  },
  profileImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Theme.colors.primaryFixed,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },
  heroSection: {
    height: 400,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroLabel: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.onPrimaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  heroTitle: {
    fontFamily: 'System',
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.white,
    marginTop: 4,
  },
  heroSubtitle: {
    fontFamily: 'System',
    fontSize: 14,
    color: Theme.colors.surfaceContainerHigh,
    opacity: 0.9,
  },
  statusBadge: {
    backgroundColor: Theme.colors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.secondary,
  },
  statusText: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onSecondaryContainer,
    letterSpacing: 1,
  },
  bentoGrid: {
    gap: 16,
    marginBottom: 24,
  },
  bentoCardLarge: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 32,
    borderRadius: 24,
    minHeight: 160,
    justifyContent: 'space-between',
    ...Theme.shadows.ambient,
  },
  bentoCardContent: {
    marginTop: 16,
  },
  bentoCardLabel: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  bentoCardTitle: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.onSurface,
    marginTop: 4,
  },
  asignacionButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  asignacionButtonText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  bentoCardSmall: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 24,
    borderRadius: 24,
    minHeight: 160,
    justifyContent: 'space-between',
    ...Theme.shadows.ambient,
  },
  foremanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  foremanImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  } as ImageStyle,
  foremanName: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  foremanRole: {
    fontFamily: 'System',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
  },
  processSection: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  processHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  processTitle: {
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  processButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  processButtonText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
  timelineContainer: {
    paddingVertical: 16,
  },
  timelineTrack: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: Theme.colors.secondaryContainer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    backgroundColor: Theme.colors.secondary,
  },
  timelineNodes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepContainer: {
    alignItems: 'center',
    gap: 12,
    width: (width - 48 - 48) / 5, // Approximate width for 5 steps
  },
  stepNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepNodeActive: {
    backgroundColor: Theme.colors.secondary,
  },
  stepNodeInactive: {
    backgroundColor: Theme.colors.surfaceContainerHighest,
  },
  stepNodeScale: {
    transform: [{ scale: 1.25 }],
  },
  stepLabel: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 24,
    borderRadius: 16,
    borderLeftWidth: 4,
    ...Theme.shadows.ambient,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  analyticsLabel: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  analyticsValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  analyticsValue: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.onSurface,
  },
  analyticsTrend: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.secondary,
  },
  analyticsStatus: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.tertiary,
  },
});

export default ViewLoteScreen;
