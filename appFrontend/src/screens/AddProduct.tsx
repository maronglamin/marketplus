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
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Select } from '@components/Select'
import { Button } from '@components/Button'
import { uploadService } from '../services/uploadService'

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

type ProductCondition = 'NEW' | 'USED'
type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'PENDING'

interface ProductFormData {
  title: string
  description: string
  price: string
  currencyCode: string
  quantity: string
  categoryId: string
  condition: ProductCondition
  locationId: string
  status: ProductStatus
  attributes: Array<{ key: string; value: string; unit?: string }>
}

export function AddProduct() {
  const navigation = useNavigation<AddProductNavigationProp>()
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    price: '',
    currencyCode: 'USD',
    quantity: '',
    categoryId: '',
    condition: 'NEW',
    locationId: '',
    status: 'ACTIVE',
    attributes: [],
  })
  const [images, setImages] = useState<Array<{ uri: string; isPrimary: boolean }>>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (name: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload product images!',
          [{ text: 'OK' }]
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
        exif: false,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = {
          uri: result.assets[0].uri,
          isPrimary: images.length === 0, // First image is primary by default
        }
        setImages([...images, newImage])
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to select image. Please try again.')
    }
  }

  const removeImage = async (index: number) => {
    const imageToRemove = images[index]
    if (imageToRemove.uri.startsWith('http')) {
      try {
        await uploadService.deleteImage(imageToRemove.uri)
      } catch (error) {
        console.error('Error deleting image:', error)
      }
    }
    setImages(images.filter((_, i) => i !== index))
  }

  const setPrimaryImage = (index: number) => {
    setImages(images.map((img, i) => ({
      ...img,
      isPrimary: i === index
    })))
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)

      // Upload images first
      const uploadedImages = await Promise.all(
        images.map(async (image) => {
          if (image.uri.startsWith('file://')) {
            const url = await uploadService.uploadImage(image.uri)
            return { imageUrl: url, isPrimary: image.isPrimary }
          }
          return { imageUrl: image.uri, isPrimary: image.isPrimary }
        })
      )

      // Prepare product data
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        images: uploadedImages,
      }

      // TODO: Submit product data to API
      console.log('Submitting product:', productData)

      Alert.alert(
        'Success',
        'Product has been added successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } catch (error) {
      console.error('Error submitting product:', error)
      Alert.alert(
        'Error',
        'Failed to add product. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a product title')
      return false
    }
    if (!formData.price.trim()) {
      Alert.alert('Error', 'Please enter a product price')
      return false
    }
    if (!formData.quantity.trim()) {
      Alert.alert('Error', 'Please enter product quantity')
      return false
    }
    if (!formData.categoryId) {
      Alert.alert('Error', 'Please select a category')
      return false
    }
    if (images.length === 0) {
      Alert.alert('Error', 'Please add at least one product image')
      return false
    }
    return true
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
            <Text style={styles.label}>Product Images</Text>
            <View style={styles.imageGrid}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: image.uri }} style={styles.image} />
                  <View style={styles.imageOverlay}>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    {!image.isPrimary && (
                      <TouchableOpacity
                        style={styles.setPrimaryButton}
                        onPress={() => setPrimaryImage(index)}
                      >
                        <Text style={styles.setPrimaryText}>Set as Primary</Text>
                      </TouchableOpacity>
                    )}
                    {image.isPrimary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryText}>Primary</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={handleImageUpload}
                >
                  <Ionicons name="camera" size={32} color="#9CA3AF" />
                  <Text style={styles.addImageText}>Add Image</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.imageHint}>Add up to 5 images. First image will be the primary image.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Product Title</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              placeholder="Enter product title"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Category</Text>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => handleInputChange('categoryId', value)}
              items={[
                { label: 'Electronics', value: 'electronics' },
                { label: 'Fashion', value: 'fashion' },
                { label: 'Home & Garden', value: 'home-garden' },
                // Add more categories based on your schema
              ]}
              placeholder="Select a category"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.card, styles.halfWidth]}>
              <Text style={styles.label}>Price</Text>
              <View style={styles.priceInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInputField]}
                  value={formData.price}
                  onChangeText={(value) => handleInputChange('price', value)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={[styles.card, styles.halfWidth]}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                value={formData.quantity}
                onChangeText={(value) => handleInputChange('quantity', value)}
                placeholder="0"
                keyboardType="number-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Condition</Text>
            <Select
              value={formData.condition}
              onValueChange={(value) => handleInputChange('condition', value as ProductCondition)}
              items={[
                { label: 'New', value: 'NEW' },
                { label: 'Used', value: 'USED' },
              ]}
            />
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
          <Button
            label={isSubmitting ? "Adding Product..." : "Add Product"}
            onPress={handleSubmit}
            style={styles.submitButton}
            disabled={isSubmitting}
          />
          {isSubmitting && (
            <ActivityIndicator 
              size="small" 
              color="#FFFFFF" 
              style={styles.spinner} 
            />
          )}
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
    backgroundColor: '#FFFFFF',
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
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    padding: 4,
  },
  removeImageButton: {
    alignSelf: 'flex-end',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPrimaryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'center',
  },
  setPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  primaryBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
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
    backgroundColor: '#F9FAFB',
  },
  addImageText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  imageHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#374151',
    paddingHorizontal: 12,
  },
  priceInputField: {
    flex: 1,
    borderWidth: 0,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    width: '100%',
  },
  spinner: {
    position: 'absolute',
  },
}) 