import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string };
  ShowInterest: { productId: string };
};

type ProductDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>;

export function ProductDetail() {
  const navigation = useNavigation<ProductDetailScreenNavigationProp>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const product = {
    id: '1',
    name: 'Wireless Noise Cancelling Headphones',
    price: 59.99,
    rating: 4.8,
    reviewCount: 124,
    description:
      'Experience premium sound quality with these wireless noise cancelling headphones. Perfect for music lovers and professionals alike.',
    features: [
      'Active Noise Cancellation',
      'Bluetooth 5.0 Connectivity',
      '30-hour Battery Life',
      'Comfortable Over-ear Design',
    ],
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df',
    ],
    seller: {
      name: 'AudioTech',
      rating: 4.7,
      products: 42,
      image:
        'https://images.unsplash.com/photo-1560250097-0b93528c311a',
    },
    stock: 15,
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Product Details"
        showBack
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.images[selectedImage] }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.imageDots}>
            {product.images.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.imageDot,
                  selectedImage === index && styles.imageDotActive,
                ]}
                onPress={() => setSelectedImage(index)}
              />
            ))}
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.ratingContainer}>
            <View style={styles.rating}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>{product.rating}</Text>
              <Text style={styles.reviewCount}>
                ({product.reviewCount} reviews)
              </Text>
            </View>
            <TouchableOpacity style={styles.heartButton}>
              <Ionicons name="heart-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>

          <View style={styles.sellerContainer}>
            <Image
              source={{ uri: product.seller.image }}
              style={styles.sellerImage}
            />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{product.seller.name}</Text>
              <View style={styles.sellerRating}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.sellerRatingText}>
                  {product.seller.rating}
                </Text>
                <Text style={styles.sellerProducts}>
                  {product.seller.products} products
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.viewSellerButton}>
              <Text style={styles.viewSellerText}>View</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            {product.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.deliveryContainer}>
            <View style={styles.deliveryItem}>
              <Ionicons name="car" size={20} color="#2563EB" />
              <Text style={styles.deliveryText}>Free Delivery</Text>
            </View>
            <View style={styles.deliveryItem}>
              <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
              <Text style={styles.deliveryText}>Secure Payment</Text>
            </View>
          </View>

          <View style={styles.quantityContainer}>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantity}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={incrementQuantity}
                disabled={quantity >= product.stock}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Price</Text>
              <Text style={styles.totalPrice}>
                ${(product.price * quantity).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Show Interest"
          variant="outline"
          icon={<Ionicons name="heart-outline" size={20} color="#2563EB" />}
          fullWidth
          onPress={() => navigation.navigate('ShowInterest', { productId: product.id })}
        />
        <Button
          label="Buy Now"
          icon={<Ionicons name="cart" size={20} color="#FFFFFF" />}
          fullWidth
          onPress={() => {
            // TODO: Implement buy now functionality
            console.log('Buy now pressed');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 300,
  },
  imageDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 4,
  },
  imageDotActive: {
    backgroundColor: '#FFFFFF',
  },
  details: {
    padding: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#374151',
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  heartButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 16,
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  sellerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sellerRatingText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
  },
  sellerProducts: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  viewSellerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewSellerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
  },
  deliveryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  quantityButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quantityButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  quantity: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#374151',
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
}); 