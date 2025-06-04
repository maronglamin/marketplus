import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';

type HomeNavigationProp = NativeStackNavigationProp<AppStackParamList, 'Home'>;

export function Home() {
  const navigation = useNavigation<HomeNavigationProp>();
  const route = useRoute();

  const categories = [
    { id: '1', name: 'Electronics', icon: '📱' },
    { id: '2', name: 'Fashion', icon: '👕' },
    { id: '3', name: 'Home', icon: '🏠' },
    { id: '4', name: 'Beauty', icon: '💄' },
    { id: '5', name: 'Sports', icon: '⚽' },
    { id: '6', name: 'Groceries', icon: '🛒' },
  ];

  const featuredProducts = [
    {
      id: '1',
      name: 'Wireless Headphones',
      price: 59.99,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
      seller: 'AudioTech',
      stock: 15,
    },
    {
      id: '2',
      name: 'Smart Watch',
      price: 129.99,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
      seller: 'TechGadgets',
      stock: 8,
    },
    {
      id: '3',
      name: 'Leather Wallet',
      price: 39.99,
      image: 'https://images.unsplash.com/photo-1627123424574-724758594e93',
      seller: 'LeatherCrafts',
      stock: 22,
    },
    {
      id: '4',
      name: 'Stainless Steel Water Bottle',
      price: 24.99,
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8',
      seller: 'EcoFriendly',
      stock: 3,
    },
  ];

  const popularSellers = [
    {
      id: '1',
      name: 'TechGadgets',
      rating: 4.8,
      products: 42,
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
    },
    {
      id: '2',
      name: 'LeatherCrafts',
      rating: 4.5,
      products: 28,
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
    },
    {
      id: '3',
      name: 'EcoFriendly',
      rating: 4.7,
      products: 36,
      image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857',
    },
  ];

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleTabPress = (tab: string) => {
    switch (tab) {
      case 'home':
        // Already on home
        break;
      case 'orders':
        // TODO: Implement orders screen
        break;
      case 'interests':
        navigation.navigate('InterestManagement');
        break;
      case 'account':
        navigation.navigate('SellerDashboard');
        break;
    }
  };

  const isActiveTab = (tab: string) => {
    return route.name.toLowerCase() === tab;
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.mainContent}>
          {/* Fixed Header */}
          <View style={styles.fixedHeader}>
            <View style={styles.headerIcons}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Notifications')}
                style={styles.iconButton}
              >
                <Ionicons name="notifications-outline" size={24} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('AccountSettings')}
                style={styles.iconButton}
              >
                <Ionicons name="person-outline" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Hello, Modou Lamin!</Text>
              <Text style={styles.welcomeSubtitle}>
                Find amazing products from sellers.
              </Text>
            </View>

            <View style={styles.categoriesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((category) => (
                  <View key={category.id} style={styles.categoryItem}>
                    <View style={styles.categoryIcon}>
                      <Text style={styles.categoryEmoji}>{category.icon}</Text>
                    </View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Featured Products</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllButton}>See All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.productsGrid}>
                {featuredProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.productCard}
                    onPress={() => handleProductPress(product.id)}
                  >
                    <View style={styles.productImageContainer}>
                      <Image
                        source={{ uri: product.image }}
                        style={styles.productImage}
                      />
                      <TouchableOpacity style={styles.favoriteButton}>
                        <Ionicons name="heart-outline" size={20} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <View style={styles.productDetails}>
                        <Text style={styles.productPrice}>
                          ${product.price.toFixed(2)}
                        </Text>
                        <Text style={styles.sellerName}>{product.seller}</Text>
                      </View>
                      <View style={styles.stockContainer}>
                        <Text
                          style={[
                            styles.stockText,
                            {
                              color:
                                product.stock > 10
                                  ? '#059669'
                                  : product.stock > 0
                                  ? '#D97706'
                                  : '#DC2626',
                            },
                          ]}
                        >
                          {product.stock > 10
                            ? 'In Stock'
                            : product.stock > 0
                            ? `Only ${product.stock} left`
                            : 'Out of Stock'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular Sellers</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllButton}>See All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sellersList}>
                {popularSellers.map((seller) => (
                  <TouchableOpacity key={seller.id} style={styles.sellerCard}>
                    <Image
                      source={{ uri: seller.image }}
                      style={styles.sellerImage}
                    />
                    <View style={styles.sellerInfo}>
                      <Text style={styles.sellerName}>{seller.name}</Text>
                      <View style={styles.sellerStats}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.sellerRating}>
                          {seller.rating.toFixed(1)}
                        </Text>
                        <Text style={styles.sellerProducts}>
                          {seller.products} products
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Fixed Bottom Navigation */}
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('home') && styles.activeNavItem]}
              onPress={() => handleTabPress('home')}
            >
              <Ionicons
                name={isActiveTab('home') ? 'home' : 'home-outline'}
                size={24}
                color={isActiveTab('home') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('home') && styles.activeNavText,
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('orders') && styles.activeNavItem]}
              onPress={() => handleTabPress('orders')}
            >
              <Ionicons
                name={isActiveTab('orders') ? 'bag' : 'bag-outline'}
                size={24}
                color={isActiveTab('orders') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('orders') && styles.activeNavText,
                ]}
              >
                Orders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.navItem,
                isActiveTab('interestmanagement') && styles.activeNavItem,
              ]}
              onPress={() => handleTabPress('interests')}
            >
              <Ionicons
                name={
                  isActiveTab('interestmanagement')
                    ? 'heart'
                    : 'heart-outline'
                }
                size={24}
                color={isActiveTab('interestmanagement') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('interestmanagement') && styles.activeNavText,
                ]}
              >
                Interests
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.navItem,
                isActiveTab('accountsettings') && styles.activeNavItem,
              ]}
              onPress={() => handleTabPress('account')}
            >
              <Ionicons
                name={
                  isActiveTab('accountsettings')
                    ? 'person'
                    : 'person-outline'
                }
                size={24}
                color={isActiveTab('accountsettings') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('accountsettings') && styles.activeNavText,
                ]}
              >
                Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  mainContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  fixedHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#EFF6FF',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 12,
    color: '#374151',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  productCard: {
    width: '50%',
    padding: 8,
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
  },
  productInfo: {
    padding: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  sellerName: {
    fontSize: 12,
    color: '#6B7280',
  },
  stockContainer: {
    marginTop: 8,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sellersList: {
    paddingHorizontal: 16,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sellerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sellerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sellerRating: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  sellerProducts: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    // Add any active state styles if needed
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeNavText: {
    color: '#2563EB',
  },
});
