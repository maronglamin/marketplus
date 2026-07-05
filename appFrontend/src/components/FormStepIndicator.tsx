import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FormStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
  accentColor?: string;
}

export function FormStepIndicator({
  currentStep,
  totalSteps,
  labels,
  accentColor = '#0EA5E9',
}: FormStepIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const step = index + 1;
          const isActive = step === currentStep;
          const isComplete = step < currentStep;
          return (
            <React.Fragment key={step}>
              <View
                style={[
                  styles.dot,
                  isComplete && { backgroundColor: accentColor, borderColor: accentColor },
                  isActive && { backgroundColor: accentColor, borderColor: accentColor },
                ]}
              >
                {isComplete ? (
                  <Text style={styles.dotCheck}>✓</Text>
                ) : (
                  <Text style={[styles.dotText, (isActive || isComplete) && styles.dotTextActive]}>
                    {step}
                  </Text>
                )}
              </View>
              {step < totalSteps && (
                <View
                  style={[
                    styles.line,
                    step < currentStep && { backgroundColor: accentColor },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <Text style={styles.label}>
        Step {currentStep} of {totalSteps}: {labels[currentStep - 1]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  dotTextActive: { color: '#FFFFFF' },
  dotCheck: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
    maxWidth: 48,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
});
