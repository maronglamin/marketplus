# Driver Location Flow Documentation

## Overview

When a driver goes online, their current location is automatically stored in the database to enable ride request matching and real-time tracking. This document explains the complete location flow.

## Location Flow Architecture

```
Driver Dashboard → Location Service → Backend API → Database
```

### 1. Location Acquisition
- **React Native Location**: Uses `expo-location` for GPS coordinates
- **Reverse Geocoding**: Converts GPS coordinates to human-readable addresses
- **Real-time Updates**: Continuous location tracking when online
- **Fallback Handling**: Address resolution and error handling

### 2. Location Storage
- **Current Location**: Stored in `drivers.currentLocation` (JSON field)
- **Smart History Management**: Updates existing records within 5 minutes, creates new ones after
- **Throttled Updates**: Prevents excessive API calls with intelligent throttling
- **Automatic Updates**: Location updated when going online and during rides

## Implementation Details

### Reverse Geocoding Integration

The system now uses Google's Geocoding API to convert GPS coordinates into human-readable addresses:

```typescript
// Reverse geocoding service method
async reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`
  );
  
  const data = await response.json();
  if (data.status === 'OK' && data.results.length > 0) {
    return data.results[0].formatted_address;
  }
  return 'Current Location'; // Fallback
}
```

**Benefits:**
- **Real Addresses**: Shows actual street names and landmarks
- **User-Friendly**: Drivers see meaningful location names
- **Professional**: Enhances the app's user experience
- **Fallback Handling**: Graceful degradation when API is unavailable

### Smart Location Update System

The system now implements intelligent location management to optimize performance and provide accurate customer experience:

#### 1. Smart History Management
```typescript
// Updates existing records within 5 minutes, creates new ones after
const recentLocation = await prisma.driverLocation.findFirst({
  where: {
    driverId: driver.id,
    timestamp: {
      gte: new Date(Date.now() - 5 * 60 * 1000) // Within last 5 minutes
    }
  }
});

if (recentLocation) {
  // Update existing record
  await prisma.driverLocation.update({
    where: { id: recentLocation.id },
    data: { /* updated location data */ }
  });
} else {
  // Create new record
  await prisma.driverLocation.create({
    data: { /* new location data */ }
  });
}
```

#### 2. Intelligent Throttling
```typescript
// Smart location update with throttling
async smartUpdateDriverLocation(userId: string, location: DriverLocation, forceUpdate: boolean = false) {
  // Check if driver is online
  if (!driver.isOnline) {
    return driver; // Skip update if offline
  }

  // Throttle updates (30 seconds for normal, 0 for forced)
  const updateInterval = forceUpdate ? 0 : 30000;
  if (timeSinceLastUpdate < updateInterval) {
    return driver; // Skip if too soon
  }

  // Check if location changed significantly (>50 meters)
  if (distance < 0.05) {
    return driver; // Skip if change too small
  }

  // Update location
  return await this.updateDriverLocation(userId, location);
}
```

#### 3. Automatic Updates
- **30-second intervals**: Automatic location updates when online
- **Distance-based filtering**: Only updates if location changed >50 meters
- **Force updates**: Immediate updates when going online or during rides
- **Battery optimization**: Reduces unnecessary API calls

### Backend Changes

#### 1. Updated Driver Service
```typescript
// Enhanced updateDriverStatus method
async updateDriverStatus(userId: string, isOnline: boolean, currentLocation?: DriverLocation) {
  // Update driver status
  const updatedDriver = await prisma.driver.update({
    where: { userId },
    data: {
      isOnline,
      status,
      lastLocationUpdate: new Date(),
      currentLocation: currentLocation // Store current location
    }
  });

  // Store in location history when going online
  if (isOnline && currentLocation) {
    await prisma.driverLocation.create({
      data: {
        driverId: driver.id,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        address: currentLocation.address,
        accuracy: currentLocation.accuracy,
        speed: currentLocation.speed,
        heading: currentLocation.heading
      }
    });
  }
}
```

#### 2. Updated API Route
```typescript
// Enhanced status endpoint
router.post('/status', async (req: AuthRequest, res) => {
  const { isOnline, location } = req.body;
  
  // Location required when going online
  if (isOnline && !location) {
    return res.status(400).json({ error: 'Location is required when going online' });
  }

  const updatedDriver = await driverService.updateDriverStatus(userId, isOnline, location);
  res.json({ success: true, data: updatedDriver });
});
```

### Frontend Changes

#### 1. Enhanced Online Toggle
```typescript
const handleOnlineToggle = async (value: boolean) => {
  // Location required when going online
  if (value && !currentLocation) {
    Alert.alert('Location Required', 'Please wait for location to load before going online.');
    return;
  }

  // Prepare location data with real address
  const locationData = value && currentLocation ? {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    address: currentLocation.address // Now contains real address from reverse geocoding
  } : undefined;

  await driverService.updateDriverStatus(value, locationData);
};
```

#### 2. Smart Real-time Location Updates
```typescript
const handleLocationUpdate = async (location: MapLocation) => {
  // Get the actual address using reverse geocoding
  const address = await rideService.reverseGeocode(
    location.latitude,
    location.longitude
  );

  const updatedLocation: MapLocation = {
    ...location,
    address: address
  };

  setCurrentLocation(updatedLocation);
  
  // Only update API when online with smart throttling
  if (isOnline) {
    await driverService.smartUpdateDriverLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      address: address
    });
  }
};

// Automatic location updates every 30 seconds when online
useEffect(() => {
  let locationInterval: number | null = null;

  if (isOnline && currentLocation) {
    locationInterval = setInterval(async () => {
      if (mapRef.current) {
        mapRef.current.getCurrentLocation();
      }
    }, 30000); // 30 seconds
  }

  return () => {
    if (locationInterval) {
      clearInterval(locationInterval);
    }
  };
}, [isOnline, currentLocation]);
```

## Database Schema

### Driver Table
```sql
-- Current location stored as JSON
currentLocation JSON? -- {latitude, longitude, address, accuracy, speed, heading}
lastLocationUpdate DateTime?
```

### Driver Location History
```sql
-- Location tracking history
CREATE TABLE driver_locations (
  id UUID PRIMARY KEY,
  driverId UUID REFERENCES drivers(id),
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  address TEXT,
  accuracy FLOAT,
  speed FLOAT,
  heading FLOAT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Update Driver Status (Enhanced)
```http
POST /api/driver/status
Content-Type: application/json
Authorization: Bearer <token>

{
  "isOnline": true,
  "location": {
    "latitude": 13.4432,
    "longitude": -16.5919,
    "address": "Current Location"
  }
}
```

### Update Driver Location
```http
POST /api/driver/location
Content-Type: application/json
Authorization: Bearer <token>

{
  "latitude": 13.4432,
  "longitude": -16.5919,
  "address": "Updated Location"
}
```

## Location Flow Scenarios

### 1. Driver Goes Online
1. **Location Check**: Verify current location is available
2. **Status Update**: Set driver status to ONLINE
3. **Location Storage**: Store current location in database
4. **History Entry**: Create location history record
5. **Request Matching**: Enable nearby ride request matching

### 2. Driver Goes Offline
1. **Status Update**: Set driver status to OFFLINE
2. **Request Clearing**: Clear pending ride requests
3. **Location Pause**: Stop real-time location updates

### 3. Real-time Location Updates
1. **GPS Tracking**: Continuous location monitoring
2. **API Updates**: Send location updates to backend
3. **History Logging**: Log location in history table
4. **Request Matching**: Update nearby ride requests

## Error Handling

### Location Permission Denied
```typescript
if (status !== 'granted') {
  Alert.alert('Location Required', 'Please enable location services to go online.');
  return;
}
```

### Location Unavailable
```typescript
if (value && !currentLocation) {
  Alert.alert('Location Required', 'Please wait for location to load before going online.');
  return;
}
```

### API Errors
```typescript
try {
  await driverService.updateDriverStatus(value, locationData);
} catch (error) {
  Alert.alert('Error', 'Failed to update status. Please try again.');
}
```

## Performance Considerations

### Location Update Frequency
- **Online Status**: Location stored when going online
- **Real-time Updates**: Location updated every 30 seconds when online
- **Ride Active**: Location updated every 10 seconds during rides

### Database Optimization
- **Indexes**: Location queries indexed for performance
- **History Cleanup**: Old location records cleaned up periodically
- **JSON Storage**: Current location stored as JSON for flexibility

## Security Considerations

### Location Privacy
- **User Consent**: Location permission explicitly requested
- **Data Encryption**: Location data encrypted in transit
- **Access Control**: Only driver can update their own location

### API Security
- **Authentication**: All location endpoints require valid JWT
- **Validation**: Location coordinates validated on server
- **Rate Limiting**: Location update endpoints rate limited

## Testing

### Manual Testing
1. **Permission Test**: Test location permission flow
2. **Online Flow**: Test going online with location
3. **Real-time Updates**: Test continuous location updates
4. **Offline Flow**: Test going offline

### API Testing
```bash
# Test going online with location
curl -X POST https://api.cloudnexus.biz:3000/api/driver/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isOnline": true,
    "location": {
      "latitude": 13.4432,
      "longitude": -16.5919,
      "address": "Test Location"
    }
  }'
```

## Monitoring

### Key Metrics
- **Location Accuracy**: Monitor GPS accuracy levels
- **Update Frequency**: Track location update success rate
- **API Performance**: Monitor location endpoint response times
- **Error Rates**: Track location-related errors

### Logging
```typescript
console.log('📍 Driver location updated:', {
  driverId: userId,
  latitude: location.latitude,
  longitude: location.longitude,
  timestamp: new Date()
});
```

## Future Enhancements

### Planned Features
1. **Geofencing**: Define driver service areas
2. **Location Analytics**: Analyze driver movement patterns
3. **Battery Optimization**: Optimize location update frequency
4. **Offline Support**: Cache location when offline

### Integration Points
1. **Ride Matching**: Use location for optimal ride assignment
2. **ETA Calculation**: Real-time ETA based on current location
3. **Route Optimization**: Suggest optimal routes to drivers
4. **Safety Features**: Emergency location tracking 