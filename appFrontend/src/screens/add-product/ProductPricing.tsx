import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Vibration,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@components/Button';
import { WorldCurrencyPicker } from '@components/WorldCurrencyPicker';
import * as Localization from 'expo-localization';

type RootStackParamList = {
  ProductBasicInfo: undefined;
  ProductImages: undefined;
  ProductPricing: undefined;
  ProductCondition: undefined;
  ProductDescription: undefined;
  ProductConfirmation: undefined;
};

type ProductPricingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductPricing'>;

interface ProductPricingProps {
  onNext: (price: number, currency: string, quantity: number) => void;
  initialPrice?: number;
  initialCurrency?: string;
  initialQuantity?: number;
}

export function ProductPricing({ onNext, initialPrice, initialCurrency, initialQuantity }: ProductPricingProps) {
  const navigation = useNavigation<ProductPricingNavigationProp>();
  const [price, setPrice] = useState(initialPrice?.toString() || '');
  const [currency, setCurrency] = useState(initialCurrency || '');
  const [quantity, setQuantity] = useState(initialQuantity?.toString() || '');
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const priceNum = parseFloat(price);
    const quantityNum = parseInt(quantity, 10);

    if (!price || price.trim() === '' || isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price');
      Vibration.vibrate(100);
      return;
    }

    if (!currency || currency.trim() === '') {
      setError('Please select a currency');
      Vibration.vibrate(100);
      return;
    }

    if (!quantity || quantity.trim() === '' || isNaN(quantityNum) || quantityNum <= 0) {
      setError('Please enter a valid quantity');
      Vibration.vibrate(100);
      return;
    }

    onNext(priceNum, currency, quantityNum);
    navigation.navigate('ProductCondition');
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
          <Text style={styles.title}>Product Pricing</Text>
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
            <View style={[styles.progressStep, styles.activeStep]}>
              <Text style={styles.progressNumber}>3</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <Text style={styles.progressNumber}>4</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <Text style={styles.progressNumber}>5</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price</Text>
              <TextInput
                style={[styles.input, error && styles.errorInput]}
                value={price}
                onChangeText={(text) => {
                  setPrice(text);
                  if (error) {
                    setError(null);
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="e.g., 29.99"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Currency</Text>
              <WorldCurrencyPicker
                value={currency}
                onChange={(selectedCurrency) => {
                  setCurrency(selectedCurrency);
                  if (error) {
                    setError(null);
                  }
                }}
                style={styles.currencyPicker}
                label=""
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={[styles.input, error && styles.errorInput]}
                value={quantity}
                onChangeText={(text) => {
                  setQuantity(text);
                  if (error) {
                    setError(null);
                  }
                }}
                keyboardType="number-pad"
                placeholder="e.g., 10"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  currencyPicker: {
    marginBottom: 0,
  },
  errorInput: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
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
}); 