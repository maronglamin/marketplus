import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AssetImage {
  id: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
}

interface ImageSlideshowModalProps {
  visible: boolean;
  onClose: () => void;
  images: AssetImage[];
  title?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function ImageSlideshowModal({ visible, onClose, images, title = 'Asset Images' }: ImageSlideshowModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    setCurrentIndex(index);
  };

  const getDocumentTypeLabel = (documentType: string) => {
    switch (documentType) {
      case 'CAR_INTERIOR_PHOTO':
        return 'Interior';
      case 'CAR_EXTERIOR_PHOTO':
        return 'Exterior';
      case 'VEHICLE_REGISTRATION':
        return 'Registration';
      default:
        return documentType.replace('_', ' ');
    }
  };

  if (!visible || images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Image Counter */}
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {currentIndex + 1} of {images.length}
          </Text>
        </View>

        {/* Image Slideshow */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {images.map((image, index) => (
            <View key={image.id} style={styles.imageContainer}>
              <Image
                source={{ uri: image.fileUrl }}
                style={styles.image}
                resizeMode="contain"
              />
              <View style={styles.imageInfo}>
                <Text style={styles.imageType}>{getDocumentTypeLabel(image.documentType)}</Text>
                <Text style={styles.imageName}>{image.fileName}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Dots Indicator */}
        {images.length > 1 && (
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  counterContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  counterText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight - 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: screenWidth - 32,
    height: screenHeight - 280,
  },
  imageInfo: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
  },
  imageType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  imageName: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666666',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
  },
});
