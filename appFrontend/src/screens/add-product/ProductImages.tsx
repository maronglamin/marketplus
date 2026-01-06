import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Vibration,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@components/Button';
import { uploadService } from '../../services/uploadService';

type RootStackParamList = {
  ProductBasicInfo: undefined;
  ProductImages: undefined;
  ProductPricing: undefined;
  ProductCondition: undefined;
  ProductDescription: undefined;
  ProductConfirmation: undefined;
};

type ProductImagesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductImages'>;

interface ProductImagesProps {
  onNext: (images: Array<{ uri: string; isPrimary: boolean }>) => void;
  initialImages?: Array<{ uri: string; isPrimary: boolean }>;
}

export function ProductImages({ onNext, initialImages }: ProductImagesProps) {
  const navigation = useNavigation<ProductImagesNavigationProp>();
  const [images, setImages] = useState<Array<{ uri: string; isPrimary: boolean }>>(
    initialImages || []
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We use your photo library so you can choose product photos to list your item. Access is requested only when you tap “Add Image” and is not used in the background.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = {
          uri: result.assets[0].uri,
          isPrimary: images.length === 0, // First image is primary by default
        };
        setImages([...images, newImage]);
        setError(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];
    if (imageToRemove.uri.startsWith('http')) {
      try {
        await uploadService.deleteImage(imageToRemove.uri);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
    setImages(images.filter((_, i) => i !== index));
    if (images.length === 1) {
      setError('At least one image is required');
    }
  };

  const setPrimaryImage = (index: number) => {
    setImages(images.map((img, i) => ({
      ...img,
      isPrimary: i === index
    })));
  };

  const handleNext = () => {
    if (images.length === 0) {
      setError('Please add at least one product image');
      Vibration.vibrate(100);
      return;
    }
    onNext(images);
    navigation.navigate('ProductPricing');
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
          <Text style={styles.title}>Product Images</Text>
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
            <View style={[styles.progressStep, styles.activeStep]}>
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

          <View style={[styles.card, error && styles.errorCard]}>
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
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            <Text style={styles.imageHint}>Add up to 5 images. First image will be the primary image.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Next"
            onPress={handleNext}
            style={styles.nextButton}
            disabled={isUploading}
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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