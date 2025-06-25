import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Vibration,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@components/Button';
import { Select } from '@components/Select';

type RootStackParamList = {
  ProductBasicInfo: undefined;
  ProductImages: undefined;
  ProductPricing: undefined;
  ProductCondition: undefined;
  ProductDescription: undefined;
  ProductConfirmation: undefined;
};

type ProductConditionNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductCondition'>;

interface ProductConditionProps {
  onNext: (condition: string) => void;
  initialCondition?: string;
}

const CONDITIONS = [
  { label: 'New', value: 'NEW' },
  { label: 'Excellent', value: 'EXCELLENT' },
  { label: 'Very Good', value: 'VERY_GOOD' },
  { label: 'Refurbished', value: 'REFURBISHED' },
];

export function ProductCondition({ onNext, initialCondition }: ProductConditionProps) {
  const navigation = useNavigation<ProductConditionNavigationProp>();
  const [condition, setCondition] = useState(initialCondition || '');
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (!condition) {
      setError('Please select a condition');
      Vibration.vibrate(100);
      return;
    }

    onNext(condition);
    navigation.navigate('ProductDescription');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
        translucent
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.title}>Product Condition</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <Text style={styles.progressNumber}>1</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <Text style={styles.progressNumber}>2</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <Text style={styles.progressNumber}>3</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={[styles.progressStep, styles.activeStep]}>
              <Text style={styles.progressNumber}>4</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <Text style={styles.progressNumber}>5</Text>
            </View>
          </View>

          <View style={[styles.card, error && styles.errorCard]}>
            <Text style={styles.label}>Condition</Text>
            <Select
              label="Select Condition"
              value={condition}
              onValueChange={(value: string | string[]) => {
                if (typeof value === 'string') {
                  setCondition(value);
                  setError(null);
                }
              }}
              items={CONDITIONS}
              style={styles.conditionSelect}
            />
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            <View style={styles.conditionDescriptions}>
              {CONDITIONS.map((item) => (
                <View key={item.value} style={styles.conditionItem}>
                  <Text style={styles.conditionLabel}>{item.label}</Text>
                  <Text style={styles.conditionDescription}>
                    {getConditionDescription(item.value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Next"
            onPress={handleNext}
            style={styles.nextButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getConditionDescription(condition: string): string {
  switch (condition) {
    case 'NEW':
      return 'Brand new, unused item in original packaging with all accessories included';
    case 'EXCELLENT':
      return 'Like new condition, may have been used once or twice, no visible wear or damage';
    case 'VERY_GOOD':
      return 'Used but well-maintained, minor wear that does not affect functionality';
    case 'REFURBISHED':
      return 'Professionally restored to like-new condition, fully tested and guaranteed';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStep: {
    backgroundColor: '#2563EB',
  },
  progressNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  conditionSelect: {
    marginBottom: 16,
  },
  conditionDescriptions: {
    marginTop: 16,
  },
  conditionItem: {
    marginBottom: 16,
  },
  conditionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  conditionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    width: '100%',
  },
  errorCard: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 8,
  },
}); 