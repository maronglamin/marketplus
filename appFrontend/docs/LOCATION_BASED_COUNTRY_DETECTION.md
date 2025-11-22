# Location-Based Country Detection

## Overview

The SNAP now automatically detects the user's country based on their current location using Google's Geocoding API. This feature helps users by pre-selecting their country code when entering their phone number, making the login process more convenient.

## How It Works

### 1. Location Detection Flow

1. **Permission Request**: The app requests location permissions from the user
2. **GPS Coordinates**: Gets the user's current GPS coordinates using `expo-location`
3. **Reverse Geocoding**: Uses Google Geocoding API to convert coordinates to country information
4. **Country Matching**: Matches the detected country with our supported country list
5. **Fallback**: If location detection fails, falls back to device locale detection

### 2. Implementation Details

#### Location Service (`utils/locationService.ts`)

```typescript
export const getUserCountryFromLocation = async (): Promise<CountryInfo | null> => {
  // Request location permissions
  // Get GPS coordinates
  // Reverse geocode to country
  // Return country information
}
```

#### Login Screen Integration

- **Auto-detection**: Automatically detects country on app launch
- **Visual Feedback**: Shows loading indicator during detection
- **User Control**: Users can manually select a different country
- **Status Messages**: Displays whether country was auto-detected or manually selected

### 3. User Experience

#### Visual Indicators

- **📍 Detecting**: Shows when location detection is in progress
- **✅ Auto-detected**: Shows when country was automatically detected
- **🌍 Selected**: Shows when user manually selected a country

#### User Flow

1. User opens the login screen
2. App automatically detects their location and sets country code
3. User sees visual confirmation of detected country
4. User can tap the country flag to select a different country
5. User enters their phone number (without country code)
6. App combines country code + phone number for login

### 4. Privacy & Permissions

- **Location Permission**: App requests foreground location access
- **User Control**: Users can deny location permission
- **Fallback**: Works without location permission using device locale
- **Data Usage**: Only uses location for country detection, not stored

### 5. Error Handling

- **Permission Denied**: Falls back to device locale detection
- **Network Issues**: Falls back to device locale detection
- **API Errors**: Falls back to device locale detection
- **No Results**: Falls back to device locale detection

### 6. Configuration

#### Required API Keys

The feature requires a Google Places API key configured in `app.json`:

```json
{
  "expo": {
    "extra": {
      "googlePlacesApiKey": "YOUR_API_KEY"
    }
  }
}
```

#### Permissions

Add location permissions to `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs access to location to automatically detect your country for phone number input."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

## Benefits

1. **Improved UX**: Users don't need to manually select their country
2. **Faster Login**: Reduces friction in the phone number input process
3. **Accuracy**: More accurate than device locale detection
4. **Flexibility**: Users can still manually select a different country
5. **Fallback Support**: Works even when location is not available

## Technical Notes

- Uses `expo-location` for GPS coordinates
- Uses Google Geocoding API for reverse geocoding
- Implements proper error handling and fallbacks
- Provides visual feedback during detection process
- Maintains user privacy by only using location for country detection
