import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
// Location functionality removed - using WebView approach instead

export function LocationTest() {
  const [locationData, setLocationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLocation = async () => {
    try {
      setLoading(true);
      console.log('🧪 Starting location test...');

      // Simulate location test
      setTimeout(() => {
        const mockResult = {
          coords: {
            latitude: 13.4432 + (Math.random() - 0.5) * 0.01,
            longitude: -16.5919 + (Math.random() - 0.5) * 0.01,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          address: [
            {
              street: 'Mock Street',
              city: 'Banjul',
              region: 'Gambia',
              country: 'Gambia',
              postalCode: '0000',
              name: 'Mock Location',
            }
          ],
          timestamp: Date.now(),
        };

        setLocationData(mockResult);
        console.log('✅ Mock location test completed:', mockResult);
        setLoading(false);
      }, 2000);

    } catch (error) {
      console.error('❌ Location test error:', error);
      Alert.alert('Error', `Location test failed: ${error}`);
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