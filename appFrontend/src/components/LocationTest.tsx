import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';

export function LocationTest() {
  const [locationData, setLocationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLocation = async () => {
    try {
      setLoading(true);
      console.log('🧪 Starting location test...');

      // Check permission
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      console.log('📋 Existing permission status:', existingStatus);

      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('📋 New permission status:', status);
        
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location permission is required');
          return;
        }
      }

      // Get current position
      console.log('📍 Requesting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log('📍 Location obtained:', location);

      // Get address
      console.log('🏠 Requesting address...');
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      console.log('🏠 Address response:', addressResponse);

      const result = {
        coords: location.coords,
        address: addressResponse,
        timestamp: location.timestamp,
      };

      setLocationData(result);
      console.log('✅ Location test completed:', result);

    } catch (error) {
      console.error('❌ Location test error:', error);
      Alert.alert('Error', `Location test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={testLocation}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Test Location'}
        </Text>
      </TouchableOpacity>

      {locationData && (
        <ScrollView style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Location Data:</Text>
          <Text style={styles.resultText}>
            {JSON.stringify(locationData, null, 2)}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
  },
}); 