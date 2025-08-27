import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { categoryService, type Category } from '../services/categoryService';

const { width: screenWidth } = Dimensions.get('window');

type ProductCategoryOptionsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'ProductCategoryOptions'>;

export function ProductCategoryOptions() {
  const navigation = useNavigation<ProductCategoryOptionsNavigationProp>();
  
  // Categories state
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const categories = await categoryService.getCategories();
      setCategoriesData(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategoriesData([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Function to map category names to icons (same as Home.tsx)
  const getCategoryIcon = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('phone') || name.includes('mobile') || name.includes('smartphone')) {
      return 'phone-portrait-outline';
    }
    if (name.includes('laptop') || name.includes('computer') || name.includes('pc')) {
      return 'laptop-outline';
    }
    if (name.includes('clothing') || name.includes('fashion') || name.includes('shirt') || name.includes('dress')) {
      return 'shirt-outline';
    }
    if (name.includes('home') || name.includes('furniture') || name.includes('house')) {
      return 'home-outline';
    }
    if (name.includes('car') || name.includes('vehicle') || name.includes('automotive')) {
      return 'car-outline';
    }
    if (name.includes('book') || name.includes('education') || name.includes('study')) {
      return 'library-outline';
    }
    if (name.includes('food') || name.includes('restaurant') || name.includes('meal')) {
      return 'restaurant-outline';
    }
    if (name.includes('sport') || name.includes('fitness') || name.includes('gym')) {
      return 'fitness-outline';
    }
    if (name.includes('beauty') || name.includes('cosmetic') || name.includes('makeup')) {
      return 'rose-outline';
    }
    if (name.includes('baby') || name.includes('child') || name.includes('toy')) {
      return 'happy-outline';
    }
    if (name.includes('pet') || name.includes('animal') || name.includes('dog') || name.includes('cat')) {
      return 'paw-outline';
    }
    if (name.includes('garden') || name.includes('plant') || name.includes('flower')) {
      return 'leaf-outline';
    }
    if (name.includes('music') || name.includes('instrument') || name.includes('audio')) {
      return 'musical-notes-outline';
    }
    if (name.includes('art') || name.includes('craft') || name.includes('creative')) {
      return 'color-palette-outline';
    }
    if (name.includes('jewelry') || name.includes('watch') || name.includes('accessory')) {
      return 'diamond-outline';
    }
    if (name.includes('tool') || name.includes('hardware') || name.includes('diy')) {
      return 'construct-outline';
    }
    if (name.includes('game') || name.includes('entertainment') || name.includes('toy')) {
      return 'game-controller-outline';
    }
    if (name.includes('health') || name.includes('medical') || name.includes('pharmacy')) {
      return 'medical-outline';
    }
    if (name.includes('office') || name.includes('business') || name.includes('work')) {
      return 'briefcase-outline';
    }
    
    // Default icon for unknown categories
    return 'cube-outline';
  };

  const handleCategoryPress = (category: Category) => {
    navigation.navigate('FeaturedByCategories', { 
      categoryId: category.id, 
      categoryName: category.name 
    });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Categories</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoadingCategories ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {categoriesData.map((category, index) => (
                <TouchableOpacity 
                  key={category.id} 
                  style={styles.categoryGridItem}
                  onPress={() => handleCategoryPress(category)}
                >
                  <View style={styles.categoryGridIcon}>
                    <Ionicons name={getCategoryIcon(category.name) as any} size={32} color="#3B82F6" />
                  </View>
                  <Text style={styles.categoryGridName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryGridItem: {
    width: (screenWidth - 48) / 3, // 3 columns with padding
    alignItems: 'center',
    marginBottom: 24,
  },
  categoryGridIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#F0F4FF',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryGridName: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
});
