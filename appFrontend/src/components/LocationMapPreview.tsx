import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMapView, type GoogleMapViewRef, type MapLocation } from './GoogleMapView';
import { isValidMapCoordinates } from '../utils/mapCoordinates';

export interface LocationMapPreviewProps {
  location: MapLocation;
  city?: string;
  height?: number;
  accent?: string;
  showDirections?: boolean;
}

export function LocationMapPreview({
  location,
  city,
  height = 180,
  accent = '#7C3AED',
  showDirections = true,
}: LocationMapPreviewProps) {
  const mapRef = useRef<GoogleMapViewRef>(null);

  if (!isValidMapCoordinates(location.latitude, location.longitude)) {
    return null;
  }

  const openInMaps = () => {
    const label = encodeURIComponent(location.address || 'Location');
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${location.latitude},${location.longitude}`,
      android: `geo:${location.latitude},${location.longitude}?q=${location.latitude},${location.longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.mapWrap, { height }]}>
        <GoogleMapView
          ref={mapRef}
          currentLocation={location}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.footer}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={16} color={accent} />
          <Text style={styles.addressText} numberOfLines={2}>
            {location.address}{city ? `, ${city}` : ''}
          </Text>
        </View>
        {showDirections && (
          <TouchableOpacity style={[styles.directionsBtn, { borderColor: accent }]} onPress={openInMaps}>
            <Ionicons name="navigate" size={16} color={accent} />
            <Text style={[styles.directionsText, { color: accent }]}>Get directions</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mapWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  footer: {
    padding: 12,
    gap: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  directionsText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
