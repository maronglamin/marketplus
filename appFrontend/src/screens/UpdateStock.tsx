import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { productService } from '../services/productService';
import { SuccessModal } from '../components/SuccessModal';

type UpdateStockNavigationProp = NativeStackNavigationProp<AppStackParamList, 'UpdateStock'>;
type UpdateStockRouteProp = RouteProp<AppStackParamList, 'UpdateStock'>;

export function UpdateStock() {
  const navigation = useNavigation<UpdateStockNavigationProp>();
  const route = useRoute<UpdateStockRouteProp>();
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);
  const [additionalQuantity, setAdditionalQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadCurrentQuantity();
  }, []);

  const loadCurrentQuantity = async () => {
    try {
      setLoading(true);
      const response = await productService.getSellerProducts(1);
      const product = response.products.find(p => p.id === route.params.productId);
      if (product) {
        setCurrentQuantity(product.quantity);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = () => {
    setAdditionalQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    setAdditionalQuantity(prev => Math.max(0, prev - 1));
  };

  const handleUpdateStock = async () => {
    if (additionalQuantity <= 0) {
      Alert.alert('Error', 'Please add at least 1 item to update stock');
      return;
    }

    try {
      setLoading(true);
      const newQuantity = currentQuantity + additionalQuantity;
      await productService.updateProduct(route.params.productId, { quantity: newQuantity });
      
      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Error', 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Navigate to ProductListing and reset the stack to prevent going back to UpdateStock
    navigation.reset({
      index: 1,
      routes: [
        { name: 'SellerDashboard' },
        { name: 'ProductListing' }
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
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
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Update Stock</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.currentStockContainer}>
            <Text style={styles.label}>Current Stock</Text>
            <Text style={styles.currentStock}>{currentQuantity}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Additional Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.quantityButton, additionalQuantity === 0 && styles.disabledButton]}
                onPress={handleDecrement}
                disabled={additionalQuantity === 0}
              >
                <Ionicons name="remove" size={24} color={additionalQuantity === 0 ? "#9CA3AF" : "#2563EB"} />
              </TouchableOpacity>
              <View style={styles.quantityDisplay}>
                <Text style={styles.quantityText}>{additionalQuantity}</Text>
              </View>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={handleIncrement}
              >
                <Ionicons name="add" size={24} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.summaryContainer}>
            <Text style={styles.label}>New Total Stock</Text>
            <Text style={styles.newTotal}>
              {currentQuantity + additionalQuantity}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.updateButton, (loading || additionalQuantity === 0) && styles.disabledButton]}
            onPress={handleUpdateStock}
            disabled={loading || additionalQuantity === 0}
          >
            {loading ? (
              <Text style={styles.updateButtonText}>Updating...</Text>
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>Update Stock</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={showSuccessModal}
        message="Stock updated successfully!"
        onClose={handleSuccessModalClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  currentStockContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  currentStock: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  inputContainer: {
    marginBottom: 24,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
  },
  quantityButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quantityDisplay: {
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  quantityText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
  },
  newTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 