import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { rideService } from '../services/rideService';

export interface MapLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RouteData {
  overview_polyline?: {
    points: string;
  };
  legs?: Array<{
    duration: { text: string };
    distance: { text: string };
  }>;
  safetyFeatures?: {
    safetyScore?: number;
    recommendedSpeed?: number;
    trafficConditions?: string;
  };
}

export interface GoogleMapViewProps {
  currentLocation: MapLocation | null;
  destination?: MapLocation;
  routeData?: RouteData;
  mode?: 'customer' | 'driver';
  isOnline?: boolean;
  onMapReady?: () => void;
  onLocationUpdate?: (location: MapLocation) => void;
  onLocationError?: (error: string) => void;
  style?: any;
  // Real-time ride tracking props
  rideId?: string;
  driverLocation?: MapLocation | null;
  rideStatus?: string;
  estimatedArrival?: number | null;
}

export interface GoogleMapViewRef {
  updateDestination: (destination: MapLocation, routeData?: RouteData) => void;
  centerMap: (location: MapLocation) => void;
  showRoute: (pickup: MapLocation, destination: MapLocation, routeData?: RouteData) => void;
  getCurrentLocation: () => void;
  addRequestMarker: (request: any, index: number) => void;
  clearRequestMarkers: () => void;
  addDriverMarkers: (drivers: any[]) => void;
  clearDriverMarkers: () => void;
  highlightRoute: (pickup: MapLocation, destination: MapLocation, routeData?: RouteData) => void;
  clearRoute: () => void;
  // Real-time ride tracking methods
  updateDriverLocation: (location: MapLocation) => void;
  updateRideStatus: (status: string, estimatedArrival?: number) => void;
}

export const GoogleMapView = forwardRef<GoogleMapViewRef, GoogleMapViewProps>(
  ({ 
    currentLocation, 
    destination,
    routeData,
    mode = 'customer',
    isOnline = false,
    onMapReady,
    onLocationUpdate,
    onLocationError,
    style 
  }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isLocationLoading, setIsLocationLoading] = useState(false);

    // Get location using React Native
    const getReactNativeLocation = async () => {
      try {
        console.log('📍 Getting location via React Native...');
        setIsLocationLoading(true);
        
        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission denied');
        }

        // Get current position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        // Get the actual address using reverse geocoding
        const address = await rideService.reverseGeocode(
          location.coords.latitude,
          location.coords.longitude
        );

        const newLocation: MapLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: address
        };

        console.log('📍 React Native location obtained:', newLocation);
        
        // Update WebView with React Native location
        if (webViewRef.current) {
          const message = {
            type: 'updateLocationFromReactNative',
            location: newLocation
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }

        onLocationUpdate?.(newLocation);
        setIsLocationLoading(false);
        
      } catch (error) {
        console.error('❌ React Native location error:', error);
        setIsLocationLoading(false);
        onLocationError?.(error instanceof Error ? error.message : 'Location access failed');
      }
    };

    // Get location on component mount
    useEffect(() => {
      // Show map immediately with default location
      // Location will be updated when available
    }, []);

    useImperativeHandle(ref, () => ({
      updateDestination: (destination: MapLocation, routeData?: RouteData) => {
        if (webViewRef.current) {
          const message = {
            type: 'updateDestination',
            destination: { lat: destination.latitude, lng: destination.longitude },
            routeData
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      centerMap: (location: MapLocation) => {
        if (webViewRef.current) {
          const message = {
            type: 'centerMap',
            location: { lat: location.latitude, lng: location.longitude }
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      showRoute: (pickup: MapLocation, destination: MapLocation, routeData?: RouteData) => {
        if (webViewRef.current) {
          const message = {
            type: 'showRoute',
            pickup: { lat: pickup.latitude, lng: pickup.longitude },
            destination: { lat: destination.latitude, lng: destination.longitude },
            routeData
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      getCurrentLocation: () => {
        getReactNativeLocation();
      },
      addRequestMarker: (request: any, index: number) => {
        if (webViewRef.current) {
          const message = {
            type: 'addRequestMarker',
            request: {
              id: request.id,
              pickup: { lat: request.pickupLocation.latitude, lng: request.pickupLocation.longitude },
              destination: { lat: request.destinationLocation.latitude, lng: request.destinationLocation.longitude },
              customerName: request.customerName,
              price: request.price,
              distance: request.distance,
              duration: request.duration,
              index: index
            }
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      clearRequestMarkers: () => {
        if (webViewRef.current) {
          const message = {
            type: 'clearRequestMarkers'
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      addDriverMarkers: (drivers: any[]) => {
        if (webViewRef.current) {
          const message = {
            type: 'addDriverMarkers',
            drivers: drivers
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      clearDriverMarkers: () => {
        if (webViewRef.current) {
          const message = {
            type: 'clearDriverMarkers'
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      highlightRoute: (pickup: MapLocation, destination: MapLocation, routeData?: RouteData) => {
        if (webViewRef.current) {
          const message = {
            type: 'highlightRoute',
            pickup: { lat: pickup.latitude, lng: pickup.longitude },
            destination: { lat: destination.latitude, lng: destination.longitude },
            routeData
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      clearRoute: () => {
        if (webViewRef.current) {
          const message = {
            type: 'clearRoute'
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      updateDriverLocation: (location: MapLocation) => {
        if (webViewRef.current) {
          const message = {
            type: 'updateDriverLocation',
            location: { lat: location.latitude, lng: location.longitude }
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      updateRideStatus: (status: string, estimatedArrival?: number) => {
        if (webViewRef.current) {
          const message = {
            type: 'updateRideStatus',
            status,
            estimatedArrival
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      }
    }));

    const generateMapHTML = () => {
      const initialLocation = currentLocation 
        ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
        : { lat: 13.4432, lng: -16.5919 }; // Default to Banjul, Gambia

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
          <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyB9jq9xYp3R1NXHZEdQdaPI3TF3H0xRfxo&libraries=geometry"></script>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              overflow: hidden;
              position: fixed;
              width: 100%;
              height: 100%;
              touch-action: manipulation;
              -webkit-touch-callout: none;
              -webkit-user-select: none;
              -khtml-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
            }
            #map { 
              width: 100%; 
              height: 100vh; 
              position: absolute;
              top: 0;
              left: 0;
              pointer-events: auto;
              touch-action: pan-x pan-y;
              -webkit-touch-callout: none;
              -webkit-user-select: none;
              -khtml-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
            }
            .status-indicator {
              pointer-events: none;
              position: absolute;
              top: 20px;
              left: 20px;
              background: ${isOnline ? '#3B82F6' : '#EF4444'};
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
              z-index: 1000;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            .driver-marker {
              pointer-events: none;
              position: absolute;
              width: 50px;
              height: 50px;
              background: #1E3A8A;
              border-radius: 50%;
              border: 4px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 24px;
              z-index: 1000;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            .location-loading {
              pointer-events: none;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 16px 24px;
              border-radius: 12px;
              font-size: 14px;
              z-index: 1000;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          ${mode === 'driver' ? `<div class="status-indicator">${isOnline ? 'online' : 'offline'}</div>` : ''}
          ${mode === 'driver' ? '<div class="driver-marker" style="top: 50%; left: 50%; transform: translate(-50%, -50%);">🚗</div>' : ''}
          <div id="locationLoading" class="location-loading" style="display: none;">
            Getting your location...
          </div>
          
          <script>
            let map;
            let currentMarker;
            let destinationMarker;
            let pickupMarker;
            let routePath;
            let animatedPath;
            let animationInterval;
            let animationFrameId;
            let currentLocation = { lat: ${initialLocation.lat}, lng: ${initialLocation.lng} };
            let requestMarkers = [];
            let requestInfoWindows = [];
            let isUserInteracting = false;
            let lastInteractionTime = 0;
            const INTERACTION_COOLDOWN_MS = 2000;
            // Message queue to buffer RN messages before map is ready (Android WebView timing fix)
            const pendingMessages = [];
            let isMapReady = false;

            function stopAnimationFrame() {
              if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
              }
            }

            function startAnimationFrame(stepFn, stepEveryMs) {
              stopAnimationFrame();
              let lastTs = 0;
              const tick = (ts) => {
                if (!lastTs) lastTs = ts;
                const elapsed = ts - lastTs;
                if (elapsed >= stepEveryMs) {
                  stepFn();
                  lastTs = ts;
                }
                animationFrameId = requestAnimationFrame(tick);
              };
              animationFrameId = requestAnimationFrame(tick);
            }

            function markInteraction() {
              isUserInteracting = true;
              lastInteractionTime = Date.now();
              setTimeout(() => {
                isUserInteracting = false;
              }, INTERACTION_COOLDOWN_MS);
            }

            function interactionActive() {
              return isUserInteracting || (Date.now() - lastInteractionTime) < INTERACTION_COOLDOWN_MS;
            }

            function safeFitBounds(bounds) {
              if (interactionActive()) {
                console.log('⏭️ Skipping fitBounds during user interaction');
                return;
              }
              map.fitBounds(bounds);
            }

            function safeSetCenter(location) {
              if (interactionActive()) {
                console.log('⏭️ Skipping setCenter during user interaction');
                return;
              }
              map.setCenter(location);
            }
            
            // Simple polyline decoder fallback for Android
            function decodePolyline(polyline) {
              try {
                console.log('🔍 Attempting to decode polyline:', polyline.substring(0, 50) + '...');
                
                // Try using Google's geometry library first
                if (typeof google.maps.geometry !== 'undefined' && typeof google.maps.geometry.encoding !== 'undefined') {
                  console.log('✅ Using Google geometry library');
                  const result = google.maps.geometry.encoding.decodePath(polyline);
                  console.log('✅ Google library decoded', result.length, 'points');
                  return result;
                }
                
                // Fallback simple decoder for basic cases
                console.log('⚠️ Using fallback polyline decoder');
                const points = [];
                let index = 0, len = polyline.length;
                let lat = 0, lng = 0;
                
                while (index < len) {
                  let shift = 0, result = 0;
                  
                  do {
                    let b = polyline.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                  } while (result >= 0x20);
                  
                  let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
                  lat += dlat;
                  
                  shift = 0;
                  result = 0;
                  
                  do {
                    let b = polyline.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                  } while (result >= 0x20);
                  
                  let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
                  lng += dlng;
                  
                  points.push({ lat: lat / 1E5, lng: lng / 1E5 });
                }
                
                console.log('✅ Fallback decoder created', points.length, 'points');
                return points;
              } catch (error) {
                console.error('❌ Error in fallback polyline decoder:', error);
                console.error('❌ Polyline that failed:', polyline.substring(0, 100));
                return null;
              }
            }
            
            function initMap() {
              map = new google.maps.Map(document.getElementById('map'), {
                zoom: 15,
                center: currentLocation,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                  },
                  {
                    featureType: 'transit',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                  },
                  {
                    featureType: 'landscape',
                    elementType: 'geometry',
                    stylers: [{ color: '#f5f5f5' }]
                  },
                  {
                    featureType: 'road',
                    elementType: 'geometry',
                    stylers: [{ color: '#ffffff' }]
                  },
                  {
                    featureType: 'road',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#7c7c7c' }]
                  },
                  {
                    featureType: 'road',
                    elementType: 'labels.text.stroke',
                    stylers: [{ color: '#ffffff' }]
                  },
                  {
                    featureType: 'water',
                    elementType: 'geometry',
                    stylers: [{ color: '#e9e9e9' }]
                  },
                  {
                    featureType: 'administrative',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#444444' }]
                  }
                ],
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                gestureHandling: 'greedy',
                draggable: true,
                scrollwheel: false,
                disableDoubleClickZoom: false,
                clickableIcons: true,
                keyboardShortcuts: false,
                tilt: 0,
                heading: 0,
                mapTypeControlOptions: {
                  style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
                },
                zoomControlOptions: {
                  position: google.maps.ControlPosition.RIGHT_TOP
                }
              });
              
              // Add current location marker
              currentMarker = new google.maps.Marker({
                position: currentLocation,
                map: map,
                title: 'Your Location',
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#FFFFFF"/></svg>'),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                }
              });
              
              // Add map click listener to test interactivity
              map.addListener('click', function(event) {
                console.log('🗺️ Map clicked at:', event.latLng.lat(), event.latLng.lng());
              });
              
              // Add map drag listener to test panning
              map.addListener('dragstart', function() {
                markInteraction();
                console.log('🖐️ Drag started');
              });
              map.addListener('drag', function() {
                markInteraction();
              });
              map.addListener('dragend', function() {
                markInteraction();
                console.log('🗺️ Map dragged to center:', map.getCenter().lat(), map.getCenter().lng());
              });
              map.addListener('idle', function() {
                lastInteractionTime = Date.now();
              });
              
              // Add zoom listener to test zooming
              map.addListener('zoom_changed', function() {
                console.log('🗺️ Map zoomed to:', map.getZoom());
              });
              
              // Listen for messages from React Native
              window.addEventListener('message', function(event) {
                try {
                  const data = JSON.parse(event.data);
                  handleMapMessage(data);
                } catch (error) {
                  console.error('Error parsing message:', error);
                }
              });
              
              // Notify React Native that map is ready
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'mapReady'
                }));
              }

              // Mark ready and drain any pending messages that arrived before init
              isMapReady = true;
              if (pendingMessages.length > 0) {
                try {
                  pendingMessages.splice(0).forEach((msg) => handleMapMessage(msg));
                } catch (err) {
                  console.error('❌ Error draining pending messages:', err);
                }
              }
            }
            
            function updateDestination(destination, routeData) {
              // Remove existing destination marker and routes
              if (destinationMarker) {
                destinationMarker.setMap(null);
              }
              if (routePath) {
                routePath.setMap(null);
              }
              if (animatedPath) {
                animatedPath.setMap(null);
              }
              if (animationInterval) {
                clearInterval(animationInterval);
              }
              stopAnimationFrame();
              
              // Add destination marker
              destinationMarker = new google.maps.Marker({
                position: destination,
                map: map,
                title: 'Destination',
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#FFFFFF"/></svg>'),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                }
              });
              
              // Draw route
              if (routeData && routeData.overview_polyline && routeData.overview_polyline.points) {
                try {
                  const routePoints = decodePolyline(routeData.overview_polyline.points);
                  
                  // Draw static route
                  routePath = new google.maps.Polyline({
                    path: routePoints,
                    geodesic: true,
                    strokeColor: '#3B82F6',
                    strokeOpacity: 0.6,
                    strokeWeight: 4
                  });
                  routePath.setMap(map);
                  
                  // Create animated path
                  createAnimatedPath(routePoints);
                } catch (error) {
                  console.error('Error drawing route:', error);
                  drawDirectRoute(destination);
                }
              } else {
                drawDirectRoute(destination);
              }
              
              // Fit map to show both markers
              const bounds = new google.maps.LatLngBounds();
              bounds.extend(currentMarker.getPosition());
              bounds.extend(destination);
              safeFitBounds(bounds);
            }
            
            function showRoute(pickup, destination, routeData) {
              console.log('🗺️ showRoute called with:', { pickup, destination, routeData });
              console.log('📍 Pickup coordinates:', pickup.lat, pickup.lng);
              console.log('📍 Destination coordinates:', destination.lat, destination.lng);
              
              // Clear existing markers and routes
              if (destinationMarker) destinationMarker.setMap(null);
              if (pickupMarker) pickupMarker.setMap(null);
              if (routePath) routePath.setMap(null);
              if (animatedPath) animatedPath.setMap(null);
              if (animationInterval) clearInterval(animationInterval);
              stopAnimationFrame();
              
              // Add current location marker (blue) - ALWAYS SHOW
              pickupMarker = new google.maps.Marker({
                position: pickup,
                map: map,
                title: 'Current Location',
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#FFFFFF"/></svg>'),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                }
              });
              console.log('✅ Current location marker added');
              
              // Add destination marker (red) - ALWAYS SHOW
              destinationMarker = new google.maps.Marker({
                position: destination,
                map: map,
                title: 'Destination',
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#FFFFFF"/></svg>'),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                }
              });
              console.log('✅ Destination marker added');
              
              // Use actual road route if available, otherwise use direct route
              if (routeData && routeData.overview_polyline && routeData.overview_polyline.points) {
                console.log('✅ Using actual road route with polyline');
                console.log('🗺️ Polyline data:', routeData.overview_polyline.points.substring(0, 100) + '...');
                try {
                  // Check if geometry library is available
                  if (typeof google.maps.geometry === 'undefined' || typeof google.maps.geometry.encoding === 'undefined') {
                    console.warn('⚠️ Geometry library not available, using direct route');
                    drawDirectRoute(pickup, destination);
                    return;
                  }
                  
                  // Decode the polyline to get actual road route points
                  const routePoints = decodePolyline(routeData.overview_polyline.points);
                  console.log('🗺️ Decoded route points:', routePoints.length);
                  
                  // Validate route points
                  if (!routePoints || routePoints.length === 0) {
                    console.warn('⚠️ No valid route points decoded, using direct route');
                    drawDirectRoute(pickup, destination);
                    return;
                  }
                  
                  // Draw static blue polyline following actual roads (NO ANIMATION)
                  routePath = new google.maps.Polyline({
                    path: routePoints,
                    geodesic: true,
                    strokeColor: '#3B82F6',
                    strokeOpacity: 0.8,
                    strokeWeight: 5
                  });
                  routePath.setMap(map);
                  console.log('✅ Road route polyline drawn');
                  
                  // Fit map to show the entire route
                  const bounds = new google.maps.LatLngBounds();
                  routePoints.forEach(point => bounds.extend(point));
              safeFitBounds(bounds);
                  console.log('✅ Map fitted to route bounds');
                  
                } catch (error) {
                  console.error('❌ Error drawing road route:', error);
                  console.log('Falling back to direct route due to error:', error.message);
                  // Fallback to direct route
                  drawDirectRoute(pickup, destination);
                }
              } else {
                console.log('⚠️ No polyline data available, using direct route');
                console.log('Route data structure:', routeData);
                // No route data available, use direct route
                drawDirectRoute(pickup, destination);
              }
            }
            
            function createAnimatedPath(routePoints) {
              console.log('🎬 Creating animated path with', routePoints.length, 'points');
              
              // Clear any existing animation
              if (animationInterval) {
                clearInterval(animationInterval);
              }
              stopAnimationFrame();
              if (animatedPath) {
                animatedPath.setMap(null);
              }
              
              // Create animated polyline with Android-optimized settings
              animatedPath = new google.maps.Polyline({
                path: [],
                geodesic: true,
                strokeColor: '#10B981',
                strokeOpacity: 1.0,
                strokeWeight: 6,
                icons: [{
                  icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 3, // Reduced scale for better performance
                    strokeColor: '#FFFFFF',
                    strokeWeight: 1
                  },
                  offset: '50%',
                  repeat: '100px' // Increased repeat distance
                }]
              });
              animatedPath.setMap(map);
              
              // Android-optimized animation with reduced frequency using requestAnimationFrame
              let currentIndex = 0;
              const animationSpeed = 100; // ms per step
              const stepSize = Math.max(1, Math.floor(routePoints.length / 50)); // Limit to 50 steps max
              
              console.log('🎬 Starting Android-optimized rAF animation with speed:', animationSpeed, 'ms per step, step size:', stepSize);
              
              startAnimationFrame(() => {
                if (currentIndex <= routePoints.length) {
                  const currentPath = routePoints.slice(0, currentIndex);
                  animatedPath.setPath(currentPath);
                  currentIndex += stepSize;
                } else {
                  console.log('🎬 Animation complete, restarting');
                  setTimeout(() => {
                    currentIndex = 0;
                    animatedPath.setPath([]);
                  }, 2000);
                }
              }, animationSpeed);
            }
            

            
            function drawDirectRoute(pickup, destination) {
              console.log('📏 Drawing direct route from pickup to destination');
              console.log('📍 Direct route points:', pickup, destination);
              
              // Create direct route points
              const directPoints = [pickup, destination];
              
              // Draw static blue polyline (NO ANIMATION)
              routePath = new google.maps.Polyline({
                path: directPoints,
                geodesic: true,
                strokeColor: '#3B82F6',
                strokeOpacity: 0.8,
                strokeWeight: 5
              });
              routePath.setMap(map);
              console.log('✅ Direct route polyline drawn');
              
              // Fit map to show both markers
              const bounds = new google.maps.LatLngBounds();
              bounds.extend(pickup);
              bounds.extend(destination);
              safeFitBounds(bounds);
              console.log('✅ Map fitted to direct route bounds');
            }
            
            function clearRequestMarkers() {
              // Clear all request markers
              requestMarkers.forEach(marker => {
                marker.setMap(null);
              });
              requestInfoWindows.forEach(infoWindow => {
                infoWindow.close();
              });
              requestMarkers = [];
              requestInfoWindows = [];
            }
            
            function addRequestMarker(request, index) {
              // Create marker for request pickup location
              const marker = new google.maps.Marker({
                position: request.pickup,
                map: map,
                title: \`Request \${index + 1}\`,
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(\`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="\${getMarkerColor(index)}" stroke="#FFFFFF" stroke-width="2"/><text x="12" y="16" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="bold">\${index + 1}</text></svg>\`),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                },
                animation: google.maps.Animation.DROP
              });
              
              // Create info window for the marker
              const infoWindow = new google.maps.InfoWindow({
                content: \`
                  <div style="padding: 8px; min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; color: #1E3A8A; font-size: 14px;">\${request.customerName}</h3>
                    <p style="margin: 4px 0; color: #64748B; font-size: 12px;"><strong>Pickup:</strong> \${request.pickup.address || 'Location'}</p>
                    <p style="margin: 4px 0; color: #64748B; font-size: 12px;"><strong>Distance:</strong> \${request.distance}</p>
                    <p style="margin: 4px 0; color: #64748B; font-size: 12px;"><strong>Price:</strong> \${request.price}</p>
                    <p style="margin: 4px 0; color: #10B981; font-size: 12px; font-weight: bold;">Request #\${index + 1}</p>
                  </div>
                \`
              });
              
              // Add click listener to marker
              marker.addListener('click', () => {
                infoWindow.open(map, marker);
              });
              
              // Store marker and info window
              requestMarkers.push(marker);
              requestInfoWindows.push(infoWindow);
              
              // Add pulse animation
              setTimeout(() => {
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => {
                  marker.setAnimation(null);
                }, 2000);
              }, 1000);
            }
            
            function getMarkerColor(index) {
              const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
              return colors[index % colors.length];
            }
            
            let driverMarkers = [];
            let driverInfoWindows = [];
            
            function addDriverMarkers(drivers) {
              console.log('🚗 Adding driver markers:', drivers);
              
              // Clear existing driver markers
              clearDriverMarkers();
              
              drivers.forEach((driver, index) => {
                if (driver.currentLocation) {
                  const position = {
                    lat: driver.currentLocation.latitude,
                    lng: driver.currentLocation.longitude
                  };
                  
                  // Create driver marker with better visibility
                  const marker = new google.maps.Marker({
                    position: position,
                    map: map,
                    title: driver.user.firstName + ' ' + driver.user.lastName,
                    icon: {
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#10B981" stroke="#FFFFFF" stroke-width="3"/><circle cx="12" cy="12" r="6" fill="#FFFFFF"/><text x="12" y="16" text-anchor="middle" fill="#10B981" font-size="10" font-weight="bold">🚗</text></svg>'),
                      scaledSize: new google.maps.Size(48, 48),
                      anchor: new google.maps.Point(24, 24)
                    }
                  });
                  
                  // Create info window with minimal driver information
                  let infoContent = '<div style="padding: 12px; font-family: Arial, sans-serif; max-width: 300px;">' +
                    '<h3 style="margin: 0 0 8px 0; color: #1F2937; font-size: 16px;">' + driver.user.firstName + ' ' + driver.user.lastName + '</h3>';
                  
                  // Add distance
                  infoContent += '<p style="margin: 0 0 6px 0; color: #6B7280; font-size: 14px;">📍 Distance: ' + driver.distance.toFixed(1) + ' km</p>';
                  
                  // Add vehicle information from rider application if available
                  if (driver.riderApplication) {
                    infoContent += '<div style="border-top: 1px solid #E5E7EB; margin: 8px 0; padding-top: 8px;">' +
                      '<h4 style="margin: 0 0 6px 0; color: #374151; font-size: 14px;">Vehicle Details</h4>' +
                      '<p style="margin: 0 0 4px 0; color: #6B7280; font-size: 13px;">🚗 ' + driver.riderApplication.vehicleModel + '</p>' +
                      '<p style="margin: 0 0 4px 0; color: #6B7280; font-size: 13px;">🔢 Plate: ' + driver.riderApplication.vehiclePlate + '</p>';
                    
                    // Add driver location name from driver_locations table
                    if (driver.driverLocation && driver.driverLocation.address) {
                      infoContent += '<p style="margin: 0 0 4px 0; color: #6B7280; font-size: 13px;">📍 Location: ' + driver.driverLocation.address + '</p>';
                    }
                    
                    // Add verification status
                    infoContent += '<p style="margin: 0 0 4px 0; color: #10B981; font-size: 13px; font-weight: 600;">✅ Verified Driver</p>';
                  } else if (driver.vehicleInfo) {
                    // Fallback to vehicleInfo if riderApplication is not available
                    infoContent += '<p style="margin: 0 0 4px 0; color: #6B7280; font-size: 13px;">🚗 Vehicle: ' + driver.vehicleInfo.model + ' (' + driver.vehicleInfo.color + ')</p>';
                  }
                  
                  infoContent += '</div>';
                  
                  const infoWindow = new google.maps.InfoWindow({
                    content: infoContent
                  });
                  
                  // Add click listener
                  marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                  });
                  
                  driverMarkers.push(marker);
                  driverInfoWindows.push(infoWindow);
                }
              });
            }
            
            function clearDriverMarkers() {
              driverMarkers.forEach(marker => marker.setMap(null));
              driverInfoWindows.forEach(infoWindow => infoWindow.close());
              driverMarkers = [];
              driverInfoWindows = [];
            }
            
            function highlightRoute(pickup, destination, routeData) {
              console.log('🎯 Highlighting route:', { pickup, destination, routeData });
              console.log('🎯 Route data structure:', JSON.stringify(routeData, null, 2));
              
              // Clear existing route
              clearRoute();
              
              // Add pickup marker (car icon for current location)
              const pickupMarker = new google.maps.Marker({
                position: pickup,
                map: map,
                title: 'Current Location',
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" fill="#3B82F6"/></svg>'),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                }
              });
              
              // Add destination marker
              const destMarker = new google.maps.Marker({
                position: destination,
                map: map,
                title: 'Destination',
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#FFFFFF"/></svg>'),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                }
              });
              
              // Draw route with enhanced animation
              if (routeData && routeData.overview_polyline && routeData.overview_polyline.points) {
                console.log('🎯 Found polyline data:', routeData.overview_polyline.points.substring(0, 100) + '...');
                try {
                  // Check if geometry library is available
                  if (typeof google.maps.geometry === 'undefined' || typeof google.maps.geometry.encoding === 'undefined') {
                    console.warn('⚠️ Geometry library not available, using direct route');
                    drawAnimatedDirectRoute(pickup, destination);
                    return;
                  }
                  
                  console.log('🎯 Decoding polyline...');
                  const routePoints = decodePolyline(routeData.overview_polyline.points);
                  console.log('🎯 Decoded route points:', routePoints ? routePoints.length : 'null');
                  
                  // Validate route points
                  if (!routePoints || routePoints.length === 0) {
                    console.warn('⚠️ No valid route points decoded, using direct route');
                    drawAnimatedDirectRoute(pickup, destination);
                    return;
                  }
                  
                  // Create static route line
                  const staticRoute = new google.maps.Polyline({
                    path: routePoints,
                    geodesic: true,
                    strokeColor: '#3B82F6',
                    strokeOpacity: 0.3,
                    strokeWeight: 8
                  });
                  staticRoute.setMap(map);
                  
                  // Create Android-optimized animated polyline
                  const animatedPolyline = new google.maps.Polyline({
                    path: [],
                    geodesic: true,
                    strokeColor: '#3B82F6',
                    strokeOpacity: 1.0,
                    strokeWeight: 6,
                    icons: [{
                      icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 2, // Smaller arrow for better performance
                        strokeColor: '#3B82F6',
                        fillColor: '#3B82F6'
                      },
                      offset: '50%',
                      repeat: '120px' // Less frequent arrows
                    }]
                  });
                  
                  animatedPolyline.setMap(map);
                  
                  // Store reference for clearing later
                  window.currentAnimatedPolyline = animatedPolyline;
                  window.currentStaticRoute = staticRoute;
                  
                  // Android-optimized continuous animation
                  let i = 0;
                  const stepSize = Math.max(1, Math.floor(routePoints.length / 30)); // Limit steps for performance
                  console.log('🎯 Starting animation with', routePoints.length, 'points, step size:', stepSize);
                  
                  // rAF-based route animation
                  startAnimationFrame(() => {
                    if (i < routePoints.length) {
                      const currentPath = routePoints.slice(0, i + stepSize);
                      animatedPolyline.setPath(currentPath);
                      i += stepSize;
                    } else {
                      console.log('🎯 Animation completed, restarting...');
                      setTimeout(() => {
                        animatedPolyline.setPath([]);
                        i = 0;
                      }, 2000);
                    }
                  }, 80);
                  
                  // Fit map to show the entire route with padding
                  const bounds = new google.maps.LatLngBounds();
                  routePoints.forEach(point => bounds.extend(point));
                  bounds.extend(pickup);
                  bounds.extend(destination);
                  
                  // Add padding for better view
                  safeFitBounds(bounds);
                  
                  // Add some zoom padding
                  setTimeout(() => {
                    const currentZoom = map.getZoom();
                    if (currentZoom > 15) {
                      map.setZoom(currentZoom - 1);
                    }
                  }, 100);
                  
                } catch (error) {
                  console.error('Error highlighting route:', error);
                  // Fallback to direct line with animation
                  drawAnimatedDirectRoute(pickup, destination);
                }
              } else {
                console.log('⚠️ No polyline data found in routeData, checking alternative structures...');
                
                // Check if routeData has a different structure
                if (routeData && routeData.routes && routeData.routes.length > 0) {
                  console.log('🎯 Found routes array, using first route');
                  const firstRoute = routeData.routes[0];
                  if (firstRoute.overview_polyline && firstRoute.overview_polyline.points) {
                    console.log('🎯 Using polyline from first route');
                    // Recursively call highlightRoute with the first route
                    highlightRoute(pickup, destination, firstRoute);
                    return;
                  }
                }
                
                // Check if routeData has legs with polyline
                if (routeData && routeData.legs && routeData.legs.length > 0) {
                  console.log('🎯 Found legs array, checking for polyline');
                  const leg = routeData.legs[0];
                  if (leg.polyline && leg.polyline.points) {
                    console.log('🎯 Using polyline from leg');
                    // Create a routeData structure with the leg's polyline
                    const routeWithPolyline = {
                      overview_polyline: leg.polyline
                    };
                    highlightRoute(pickup, destination, routeWithPolyline);
                    return;
                  }
                }
                
                console.log('⚠️ No polyline data found, using direct route');
                // Direct route with animation
                drawAnimatedDirectRoute(pickup, destination);
              }
            }
            
            function drawAnimatedDirectRoute(pickup, destination) {
              // Create static direct route
              const staticDirectRoute = new google.maps.Polyline({
                path: [pickup, destination],
                geodesic: true,
                strokeColor: '#3B82F6',
                strokeOpacity: 0.3,
                strokeWeight: 8
              });
              staticDirectRoute.setMap(map);
              
              // Create Android-optimized animated direct route
              const animatedDirectRoute = new google.maps.Polyline({
                path: [],
                geodesic: true,
                strokeColor: '#3B82F6',
                strokeOpacity: 1.0,
                strokeWeight: 6,
                icons: [{
                  icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 2, // Smaller arrow for better performance
                    strokeColor: '#3B82F6',
                    fillColor: '#3B82F6'
                  },
                  offset: '50%',
                  repeat: '120px' // Less frequent arrows
                }]
              });
              animatedDirectRoute.setMap(map);
              
              window.currentAnimatedPolyline = animatedDirectRoute;
              window.currentStaticRoute = staticDirectRoute;
              
              // Android-optimized direct route animation
              let progress = 0;
              const steps = 25; // Reduced steps for better performance
              // rAF-based direct route animation
              startAnimationFrame(() => {
                const newPath = [];
                for (let i = 0; i <= progress; i++) {
                  const ratio = i / steps;
                  const lat = pickup.lat + (destination.lat - pickup.lat) * ratio;
                  const lng = pickup.lng + (destination.lng - pickup.lng) * ratio;
                  newPath.push({ lat, lng });
                }
                animatedDirectRoute.setPath(newPath);
                progress++;
                if (progress > steps) {
                  setTimeout(() => {
                    progress = 0;
                  }, 2000);
                }
              }, 100);
            }
            
            function clearRoute() {
              // Clear any existing route elements
              if (routePath) {
                routePath.setMap(null);
              }
              if (window.currentAnimatedPolyline) {
                window.currentAnimatedPolyline.setMap(null);
                window.currentAnimatedPolyline = null;
              }
              if (window.currentStaticRoute) {
                window.currentStaticRoute.setMap(null);
                window.currentStaticRoute = null;
              }
              if (animationInterval) {
                clearInterval(animationInterval);
              }
              stopAnimationFrame();
            }
            
            // Real-time ride tracking functions
            let driverMarker = null;
            let rideStatusInfoWindow = null;
            
            function updateDriverLocation(location) {
              console.log('🚗 Updating driver location:', location);
              
              if (!driverMarker) {
                // Create driver marker if it doesn't exist
                driverMarker = new google.maps.Marker({
                  position: location,
                  map: map,
                  title: 'Driver',
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#10B981" stroke="#FFFFFF" stroke-width="3"/><circle cx="12" cy="12" r="6" fill="#FFFFFF"/><text x="12" y="16" text-anchor="middle" fill="#10B981" font-size="10" font-weight="bold">🚗</text></svg>'),
                    scaledSize: new google.maps.Size(48, 48),
                    anchor: new google.maps.Point(24, 24)
                  }
                });
              } else {
                // Update existing marker position
                driverMarker.setPosition(location);
              }
              
              // Center map on driver location if this is the first update
              if (!map.getBounds()) {
                map.setCenter(location);
                map.setZoom(15);
              }
            }
            
            function updateRideStatus(status, estimatedArrival) {
              console.log('📱 Updating ride status:', status, 'ETA:', estimatedArrival);
              
              // Remove existing status info window
              if (rideStatusInfoWindow) {
                rideStatusInfoWindow.close();
              }
              
              // Create status info window
              let statusText = '';
              let statusColor = '#3B82F6';
              
              switch (status) {
                case 'ACCEPTED':
                  statusText = 'Driver is on the way';
                  statusColor = '#10B981';
                  break;
                case 'ARRIVING':
                  statusText = 'Driver is arriving';
                  statusColor = '#F59E0B';
                  break;
                case 'ARRIVED':
                  statusText = 'Driver has arrived';
                  statusColor = '#EF4444';
                  break;
                case 'IN_PROGRESS':
                  statusText = 'Ride in progress';
                  statusColor = '#8B5CF6';
                  break;
                case 'COMPLETED':
                  statusText = 'Ride completed';
                  statusColor = '#059669';
                  break;
                default:
                  statusText = 'Unknown status';
                  statusColor = '#6B7280';
              }
              
              const statusContent = \`
                <div style="padding: 16px; font-family: Arial, sans-serif; max-width: 300px; text-align: center;">
                  <div style="background: \${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; margin-bottom: 12px; font-weight: bold;">
                    \${statusText}
                  </div>
                  \${estimatedArrival ? \`<p style="margin: 0; color: #6B7280; font-size: 14px;">ETA: \${estimatedArrival} minutes</p>\` : ''}
                </div>
              \`;
              
              rideStatusInfoWindow = new google.maps.InfoWindow({
                content: statusContent,
                position: map.getCenter()
              });
              
              rideStatusInfoWindow.open(map);
              
              // Auto-close after 5 seconds
              setTimeout(() => {
                if (rideStatusInfoWindow) {
                  rideStatusInfoWindow.close();
                }
              }, 5000);
            }
            
            function handleMapMessage(data) {
              console.log('🗺️ Handling map message:', data);
              switch (data.type) {
                case 'updateDestination':
                  updateDestination(data.destination, data.routeData);
                  break;
                case 'centerMap':
                  map.setCenter(data.location);
                  map.setZoom(15);
                  break;
                case 'showRoute':
                  showRoute(data.pickup, data.destination, data.routeData);
                  break;
                case 'addRequestMarker':
                  addRequestMarker(data.request, data.request.index);
                  break;
                case 'clearRequestMarkers':
                  clearRequestMarkers();
                  break;
                case 'addDriverMarkers':
                  addDriverMarkers(data.drivers);
                  break;
                case 'clearDriverMarkers':
                  clearDriverMarkers();
                  break;
                case 'highlightRoute':
                  highlightRoute(data.pickup, data.destination, data.routeData);
                  break;
                case 'clearRoute':
                  clearRoute();
                  break;
                case 'updateDriverLocation':
                  updateDriverLocation(data.location);
                  break;
                case 'updateRideStatus':
                  updateRideStatus(data.status, data.estimatedArrival);
                  break;
                case 'updateLocationFromReactNative':
                  // Update location from React Native
                  const newLocation = data.location;
                  currentLocation = { lat: newLocation.latitude, lng: newLocation.longitude };
                  
                  if (currentMarker) {
                    currentMarker.setPosition(currentLocation);
                  }
                  
                safeSetCenter(currentLocation);
                  map.setZoom(15);
                  break;
              }
            }
            
            // Initialize map when Google Maps API is loaded
            if (typeof google !== 'undefined') {
              initMap();
            } else {
              window.addEventListener('load', initMap);
            }
            
            // Ensure map is interactive on Android and attach robust message listeners
            document.addEventListener('DOMContentLoaded', function() {
              // Force touch events to work properly on Android
              const mapElement = document.getElementById('map');
              if (mapElement) {
                mapElement.style.touchAction = 'pan-x pan-y';
                mapElement.style.webkitTouchCallout = 'none';
                mapElement.style.webkitUserSelect = 'none';
                mapElement.style.userSelect = 'none';
                
                // Ensure the map container is properly sized
                mapElement.style.width = '100%';
                mapElement.style.height = '100%';
                mapElement.style.position = 'absolute';
                mapElement.style.top = '0';
                mapElement.style.left = '0';
                // Force GPU compositing for smoother animations on Android WebView
                mapElement.style.transform = 'translateZ(0)';
                mapElement.style.willChange = 'transform';
                mapElement.style.contain = 'layout paint size';

                // Mark interaction on pointer/touch to avoid forced recentering
                mapElement.addEventListener('pointerdown', markInteraction, { passive: true });
                mapElement.addEventListener('pointerup', markInteraction, { passive: true });
                mapElement.addEventListener('touchstart', markInteraction, { passive: true });
                mapElement.addEventListener('touchend', markInteraction, { passive: true });
              }

              // Add dual listeners for messages (Android sometimes dispatches on document)
              function onAnyMessage(event) {
                try {
                  const raw = event && (event.data !== undefined ? event.data : event);
                  const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
                  if (!payload || typeof payload !== 'object') return;
                  if (!isMapReady) {
                    pendingMessages.push(payload);
                  } else {
                    handleMapMessage(payload);
                  }
                } catch (e) {
                  console.error('❌ Error parsing incoming message:', e);
                }
              }
              window.addEventListener('message', onAnyMessage);
              document.addEventListener('message', onAnyMessage);
            });
          </script>
        </body>
        </html>
      `;
    };

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        console.log('📨 Received message from WebView:', data);
        
        if (data.type === 'mapReady') {
          onMapReady?.();
        }
        
        // Pass all messages to the internal handler
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`handleMapMessage(${JSON.stringify(data)}); true;`);
        }
      } catch (error) {
        console.error('Error parsing WebView message:', error);
      }
    };

    if (!currentLocation && isLocationLoading) {
      return (
        <View style={[styles.loadingContainer, style]}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Getting your location...</Text>
          <Text style={styles.loadingSubtext}>Please wait</Text>
        </View>
      );
    }

    return (
      <WebView
        ref={webViewRef}
        style={[styles.map, style]}
        source={{ html: generateMapHTML() }}
        onMessage={handleMessage}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        geolocationEnabled={true}
        allowsProtectedMedia={true}
        mixedContentMode="compatibility"
        originWhitelist={['*']}
        androidLayerType="hardware"
        overScrollMode="never"
        nestedScrollEnabled={false}
        javaScriptCanOpenWindowsAutomatically
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        dataDetectorTypes={[]}
        onLoadStart={() => {
          console.log('🗺️ WebView loading started');
        }}
        onLoadEnd={() => {
          console.log('🗺️ WebView loading completed');
        }}
      />
    );
  }
);

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3B82F6',
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
}); 