import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'

type RootStackParamList = {
  Home: undefined
  ProductDetail: { productId: string }
  Notifications: undefined
  SellerProfile: { sellerId: string }
  SellerDashboard: undefined
  AddProduct: undefined
  InterestManagement: undefined
}

type AddProductNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddProduct'>

export function AddProduct() {
  const navigation = useNavigation<AddProductNavigationProp>()
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: '',
  })
  const [images, setImages] = useState<string[]>([])

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageUpload = () => {
    // In a real app, this would open the camera or file picker
    const demoImages = [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df',
    ]
    if (images.length < demoImages.length) {
      setImages([...images, demoImages[images.length]])
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

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
          <Text style={styles.title}>Add New Product</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter product name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Product Images</Text>
            <View style={styles.imageGrid}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={handleImageUpload}
                >
                  <Ionicons name="camera" size={32} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.imageHint}>Add up to 5 images</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={formData.category}
              onChangeText={(value) => handleInputChange('category', value)}
              placeholder="Select a category"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.card, styles.halfWidth]}>
              <Text style={styles.label}>Price ($)</Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(value) => handleInputChange('price', value)}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={[styles.card, styles.halfWidth]}>
              <Text style={styles.label}>Stock</Text>
              <TextInput
                style={styles.input}
                value={formData.stock}
                onChangeText={(value) => handleInputChange('stock', value)}
                placeholder="0"
                keyboardType="number-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Enter product description"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.button, styles.submitButton]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
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
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
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
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    gap: 8,
  },
  submitButton: {
    backgroundColor: '#2563EB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}) 