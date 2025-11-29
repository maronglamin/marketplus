import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Select } from '@components/Select';
import { Button } from '@components/Button';
import { api } from '../../services/api';

type RootStackParamList = {
  ProductBasicInfo: undefined;
  ProductImages: undefined;
  ProductPricing: undefined;
  ProductCondition: undefined;
  ProductDescription: undefined;
  ProductConfirmation: undefined;
};

type ProductBasicInfoNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductBasicInfo'>;

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ProductBasicInfoProps {
  onNext: (title: string, category: string) => void;
  initialTitle?: string;
  initialCategory?: string;
}

export function ProductBasicInfo({ onNext, initialTitle = '', initialCategory = '' }: ProductBasicInfoProps) {
  const navigation = useNavigation<ProductBasicInfoNavigationProp>();
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState(initialCategory);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/products/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!title.trim()) {
      setError('Please enter a title');
      Vibration.vibrate(100);
      return;
    }

    if (!category) {
      setError('Please select a category');
      Vibration.vibrate(100);
      return;
    }

    onNext(title.trim(), category);
    navigation.navigate('ProductImages');
  };

  const categoryItems = categories.map(cat => ({
    label: cat.name,
    value: cat.id
  }));

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
          <Text style={styles.title}>Basic Information</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, styles.activeStep]}>
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
            <View style={styles.progressStep}>
              <Text style={styles.progressNumber}>4</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <Text style={styles.progressNumber}>5</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={[styles.card, error && styles.errorCard]}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput
                style={[styles.input, error && styles.errorInput]}
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (error) {
                    setError(null);
                  }
                }}
                placeholder="Enter product title"
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
            </View>

            <View style={[styles.card, error && styles.errorCard]}>
              <Text style={styles.label}>Category</Text>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingText}>Loading categories...</Text>
                </View>
              ) : (
                <Select
                  label="Select Category"
                  value={category}
                  onValueChange={(value: string | string[]) => {
                    const newValue = Array.isArray(value) ? value[0] : value;
                    setCategory(newValue);
                    if (error) {
                      setError(null);
                    }
                  }}
                  items={categoryItems}
                />
              )}
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Next"
            onPress={handleNext}
            style={styles.nextButton}
            disabled={loading}
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
  formContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  errorInput: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
}); 