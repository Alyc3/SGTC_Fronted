import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import { Theme } from '../theme';

export interface WizardStep {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'pending';
}

interface SembradoWizardProps {
  steps: WizardStep[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  children: React.ReactNode;
  isNextDisabled?: boolean;
}

export const SembradoWizard: React.FC<SembradoWizardProps> = ({
  steps,
  currentStepIndex,
  onStepChange,
  children,
  isNextDisabled = false,
}) => {
  return (
    <View style={styles.container}>
      {/* Steps Progress Indicator */}
      <View style={styles.progressContainer}>
        {/* Horizontal Line behind circles */}
        <View style={styles.progressLineBackground} />
        <View 
          style={[
            styles.progressLineActive, 
            { width: `${(Math.max(0, steps.findIndex(s => s.status === 'active' || s.status === 'pending') - 1) / (steps.length - 1)) * 100}%` }
          ]} 
        />
        
        <View style={styles.stepsRow}>
          {steps.map((step, index) => {
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'active';
            const isSelected = index === currentStepIndex;

            return (
              <TouchableOpacity
                key={step.id}
                style={styles.stepItem}
                onPress={() => {
                  // Only allow clicking steps that are active or completed or if previous is finished
                  const prevFinished = index === 0 || steps[index - 1].status === 'completed';
                  if (step.status !== 'pending' || prevFinished) {
                    onStepChange(index);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                  isSelected && styles.circleSelected,
                ]}>
                  {isCompleted ? (
                    <Check size={16} color="white" strokeWidth={3} />
                  ) : (
                    <Text style={[
                      styles.circleText,
                      isActive && { color: Theme.colors.terroirBrown },
                      isSelected && { color: 'white' }
                    ]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.stepLabel,
                  isSelected && styles.stepLabelSelected,
                  isCompleted && styles.stepLabelCompleted
                ]} numberOfLines={1}>
                  {step.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Wizard Content */}
      <View style={styles.contentContainer}>
        {children}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationRow}>
        <TouchableOpacity
          style={[styles.navButton, styles.prevButton, currentStepIndex === 0 && styles.buttonDisabled]}
          onPress={() => currentStepIndex > 0 && onStepChange(currentStepIndex - 1)}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft size={16} color={currentStepIndex === 0 ? '#9CA3AF' : Theme.colors.terroirBrown} />
          <Text style={[styles.navButtonText, styles.prevButtonText, currentStepIndex === 0 && { color: '#9CA3AF' }]}>
            ANTERIOR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton, 
            styles.nextButton, 
            isNextDisabled && styles.buttonDisabled
          ]}
          onPress={() => !isNextDisabled && onStepChange(currentStepIndex + 1)}
          disabled={isNextDisabled}
        >
          <Text style={[
            styles.navButtonText, 
            styles.nextButtonText,
            isNextDisabled && { color: '#9CA3AF' }
          ]}>
            SIGUIENTE
          </Text>
          <ChevronRight size={16} color={isNextDisabled ? '#9CA3AF' : 'white'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    position: 'relative',
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    ...Theme.shadows.ambient,
    elevation: 2,
  },
  progressLineBackground: {
    position: 'absolute',
    top: 36,
    left: 24,
    right: 24,
    height: 3,
    backgroundColor: '#E5E7EB',
    zIndex: 1,
  },
  progressLineActive: {
    position: 'absolute',
    top: 36,
    left: 24,
    height: 3,
    backgroundColor: Theme.colors.terroirGreen,
    zIndex: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  circleCompleted: {
    backgroundColor: Theme.colors.terroirGreen,
    borderColor: Theme.colors.terroirGreen,
  },
  circleActive: {
    backgroundColor: 'white',
    borderColor: Theme.colors.terroirBrown,
    borderWidth: 2.5,
  },
  circleSelected: {
    backgroundColor: Theme.colors.terroirBrown,
    borderColor: Theme.colors.terroirBrown,
  },
  circleText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  stepLabel: {
    fontFamily: 'Manrope',
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.terroirGray,
  },
  stepLabelSelected: {
    color: Theme.colors.terroirBrown,
    fontWeight: '800',
  },
  stepLabelCompleted: {
    color: Theme.colors.terroirGreen,
  },
  contentContainer: {
    flex: 1,
    marginBottom: 20,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  navButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Theme.shadows.ambient,
    elevation: 2,
  },
  prevButton: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: Theme.colors.terroirBrown,
  },
  prevButtonText: {
    color: Theme.colors.terroirBrown,
  },
  nextButton: {
    backgroundColor: Theme.colors.terroirBrown,
  },
  nextButtonText: {
    color: 'white',
  },
  navButtonText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  buttonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    elevation: 0,
    shadowOpacity: 0,
  },
});
