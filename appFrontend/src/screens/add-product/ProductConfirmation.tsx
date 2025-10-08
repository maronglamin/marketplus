import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@components/Button';
import { api } from '@services/api';
import { uploadService } from '@services/uploadService';
import { SuccessModal } from '../../components/SuccessModal';

// Add this at the top of the file to check API configuration
console.log('API Base URL:', api.defaults.baseURL);

type RootStackParamList = {
  Home: undefined;
  ProductBasicInfo: undefined;
  ProductImages: undefined;
  ProductPricing: undefined;
  ProductCondition: undefined;
  ProductDescription: undefined;
  ProductConfirmation: undefined;
  ProductListing: undefined;
};

type ProductConfirmationNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductConfirmation'>;

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ProductAttribute {
  key: string;
  value: string;
  unit?: string;
  isFilterable?: boolean;
}

interface ProductImage {
  uri: string;
  isPrimary: boolean;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
}

interface Product {
  title: string;
  category: string; // This is the category ID
  images: ProductImage[];
  price: number;
  currency: string;
  quantity: number;
  condition: string;
  description?: string;
  features?: string[];
  attributes?: ProductAttribute[];
  locationId?: string;
}

interface ProductConfirmationProps {
  onSubmit: (product: Product) => Promise<void>;
  product: Product;
}

interface ProductData {
  title: string;
  description?: string;
  price: number;
  currencyCode: string;
  quantity: number;
  categoryId: string;
  condition: 'NEW' | 'EXCELLENT' | 'VERY_GOOD' | 'REFURBISHED';
  locationId?: string; // optional; backend will assign default
  status: 'ACTIVE';  // Default status for new products
  images: {
    imageUrl: string;
    isPrimary: boolean;
    width?: number;
    height?: number;
    size?: number;
    format?: string;
  }[];
  attributes: ProductAttribute[];
  metadata: {
    features: string[];
    // Add any other metadata fields that might be useful
    createdAt: string;
    updatedAt: string;
  };
}

interface ApiError {
  response?: {
    data: {
      message?: string;
    };
  };
  request?: any;
  message?: string;
}

const getConditionLabel = (condition: string) => {
  const conditions: { [key: string]: string } = {
    'new': 'New',
    'like-new': 'Like New',
    'good': 'Good',
    'fair': 'Fair',
    'poor': 'Poor',
  };
  return conditions[condition] || condition;
};

export function ProductConfirmation({ onSubmit, product }: ProductConfirmationProps) {
  const navigation = useNavigation<ProductConfirmationNavigationProp>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'preparing' | 'uploading' | 'creating'>('preparing');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [categoryName, setCategoryName] = useState<string>('');
  const [loadingCategory, setLoadingCategory] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchCategoryName();
  }, [product.category]);

  const fetchCategoryName = async () => {
    if (!product.category) {
      setCategoryName('Uncategorized');
      setLoadingCategory(false);
      return;
    }

    try {
      setLoadingCategory(true);
      const response = await api.get('/api/products/categories');
      const categories: Category[] = response.data;
      const category = categories.find(cat => cat.id === product.category);
      setCategoryName(category?.name || 'Uncategorized');
    } catch (error) {
      console.error('Error fetching category name:', error);
      setCategoryName('Uncategorized');
    } finally {
      setLoadingCategory(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setCurrentStep('preparing');
      setUploadProgress(0);

      // Prepare the product data
      console.log('Preparing product data...');
      const productData: ProductData = {
        title: product.title,
        description: product.description,
        price: product.price,
        currencyCode: product.currency,
        quantity: product.quantity,
        categoryId: product.category || '',
        condition: product.condition as 'NEW' | 'EXCELLENT' | 'VERY_GOOD' | 'REFURBISHED',
        status: 'ACTIVE',
        images: product.images.map((image: ProductImage, index: number) => ({
          imageUrl: image.uri, // We'll update this after upload
          isPrimary: index === 0,
          width: image.width,
          height: image.height,
          size: image.size,
          format: image.format,
        })),
        attributes: product.attributes?.map((attr: ProductAttribute) => ({
          key: attr.key,
          value: attr.value,
          unit: attr.unit,
          isFilterable: attr.isFilterable || false,
        })) || [],
        metadata: {
          features: product.features || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      // Upload images in parallel with progress tracking
      setCurrentStep('uploading');
      console.log('Starting image uploads...');
      const uploadedImages = await Promise.all(
        product.images.map(async (image, index) => {
          try {
            console.log(`Attempting to upload image ${index + 1}...`);
            const imageUrl = await uploadService.uploadImage(image.uri);

            console.log(`Image ${index + 1} upload successful:`, imageUrl);
            return {
              imageUrl: imageUrl,
              isPrimary: index === 0,
              width: image.width,
              height: image.height,
              size: image.size,
              format: image.format,
            };
          } catch (error: unknown) {
            console.error(`Error uploading image ${index}:`, error);
            const axiosError = error as ApiError;
            if (axiosError.response) {
              console.error('Error response:', axiosError.response.data);
            }
            throw new Error(`Failed to upload image ${index + 1}. Please try again.`);
          }
        })
      );

      // Update product data with uploaded image URLs
      productData.images = uploadedImages;

      // Create product
      setCurrentStep('creating');
      console.log('Creating product with data:', JSON.stringify(productData, null, 2));
      
      const response = await api.post('/api/products', productData, {
        timeout: 60000, // 1 minute timeout for product creation
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('Product creation response:', response.status);

      if (response.status === 201) {
        setShowSuccessModal(true);
      }
    } catch (error: unknown) {
      console.error('Error creating product:', error);
      let errorMessage = 'Failed to create product. Please try again.';
      
      const apiError = error as ApiError;
      if (apiError.response) {
        console.error('Error response:', apiError.response.data);
        errorMessage = apiError.response.data.message || errorMessage;
      } else if (apiError.request) {
        console.error('No response received:', apiError.request);
        errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
      } else {
        console.error('Error message:', apiError.message);
        errorMessage = apiError.message || errorMessage;
      }
      
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
      setCurrentStep('preparing');
      setUploadProgress(0);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Replace the current screen with ProductListing to prevent going back to confirmation
    navigation.replace('ProductListing' as any);
  };

  const getLoadingText = () => {
    switch (currentStep) {
      case 'preparing':
        return 'Preparing product data...';
      case 'uploading':
        return `Uploading images... ${Math.round(uploadProgress)}%`;
      case 'creating':
        return 'Creating product...';
      default:
        return 'Processing...';
    }
  };

  const primaryImage = product.images.find(img => img.isPrimary)?.uri || product.images[0]?.uri;

  const renderImageItem = ({ item, index }: { item: { uri: string; isPrimary: boolean }; index: number }) => (
    <View style={[styles.imageContainer, { width: windowWidth }]}>
      <Image
        source={{ uri: item.uri }}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );

  const renderPaginationDots = () => {
    return (
      <View style={styles.paginationContainer}>
        {product.images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentImageIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
        translucent
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.title}>Confirm Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageSection}>
            <FlatList
              ref={flatListRef}
              data={product.images}
              renderItem={renderImageItem}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(
                  event.nativeEvent.contentOffset.x / windowWidth
                );
                setCurrentImageIndex(newIndex);
              }}
            />
            {renderPaginationDots()}
          </View>

          <View style={styles.detailsContainer}>
            <Text style={styles.productTitle}>{product.title}</Text>
            <Text style={styles.price}>
              {product.currency} {product.price.toFixed(2)}
            </Text>

            <View style={styles.gridContainer}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Category</Text>
                {loadingCategory ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Text style={styles.gridValue}>{categoryName}</Text>
                )}
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Condition</Text>
                <Text style={styles.gridValue}>{getConditionLabel(product.condition)}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Price</Text>
                <Text style={styles.gridValue}>{product.currency} {product.price.toFixed(2)}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Quantity</Text>
                <Text style={styles.gridValue}>{product.quantity}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Security & Trust</Text>
              <View style={styles.securityItem}>
                <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
                <Text style={styles.securityText}>Secure Payment</Text>
              </View>
              <View style={styles.securityItem}>
                <Ionicons name="lock-closed" size={20} color="#2563EB" />
                <Text style={styles.securityText}>Buyer Protection</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={isSubmitting ? getLoadingText() : "Submit"}
            onPress={handleSubmit}
            style={styles.submitButton}
            disabled={isSubmitting}
            icon={isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : undefined}
          />
        </View>
      </View>

      <SuccessModal
        visible={showSuccessModal}
        message="Product has been created successfully!"
        onClose={handleSuccessModalClose}
      />
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
  },
  contentContainer: {
    flexGrow: 1,
  },
  imageSection: {
    position: 'relative',
    height: 300,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  imageContainer: {
    height: 300,
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    paddingHorizontal: 8,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gridItem: {
    width: '50%',
    padding: 8,
  },
  gridLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
}); 