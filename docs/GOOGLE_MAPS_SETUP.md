# Google Maps & Places API Setup Guide

This guide will help you set up Google Maps and Places API for the ride-hailing feature.

## Prerequisites

1. Google Cloud Console account
2. Billing enabled on your Google Cloud project
3. Google Maps API key with proper restrictions

## Step 1: Enable Required APIs

In your Google Cloud Console, enable these APIs:

### Core Maps APIs:
- `maps-backend.googleapis.com`
- `maps-android-backend.googleapis.com`
- `maps-ios-backend.googleapis.com`

### Places APIs:
- `places-backend.googleapis.com`
- `places.googleapis.com`

### Geocoding APIs:
- `geocoding-backend.googleapis.com`
- `geolocation.googleapis.com`

### Directions APIs:
- `directions-backend.googleapis.com`
- `routes.googleapis.com`
- `distance-matrix-backend.googleapis.com`

## Step 2: Create API Keys

1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "API Key"
3. Create separate keys for Android and iOS (recommended for security)

## Step 3: Configure API Key Restrictions

### For Android API Key:
- **Restriction type**: "Android apps"
- **Package name**: `com.snap.app`
- **SHA-1 certificate fingerprint**: `A6:89:2A:2F:BE:E6:A9:95:DA:9D:2D:6E:B4:DE:EF:A5:8D:B6:31:A8`

### For iOS API Key:
- **Restriction type**: "iOS apps"
- **Bundle ID**: `com.snap.app`

### For Places API Key:
- **Restriction type**: "HTTP referrers (web sites)"
- **Or**: "None" (if using server-side API calls)

## Step 4: Update Configuration

Replace the placeholder values in `app.json`:

```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_ACTUAL_IOS_API_KEY"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ACTUAL_ANDROID_API_KEY"
        }
      }
    },
    "plugins": [
      [
        "react-native-maps",
        {
          "googleMapsApiKey": "YOUR_ACTUAL_ANDROID_API_KEY"
        }
      ]
    ],
    "extra": {
      "googlePlacesApiKey": "YOUR_ACTUAL_PLACES_API_KEY"
    }
  }
}
```

## Step 5: Test the Integration

1. Restart your development server: `npx expo start --clear`
2. Navigate to the RideRequest screen
3. Test location permissions and current location detection
4. Test destination search and suggestions

## Troubleshooting

### Common Issues:

1. **"RNMapsAirModule could not be found"**
   - Solution: Use `npx expo install react-native-maps` instead of npm install

2. **"Billing must be enabled"**
   - Solution: Enable billing in Google Cloud Console

3. **"API key not valid"**
   - Solution: Check API key restrictions and enabled APIs

4. **"Location permission denied"**
   - Solution: Check device settings and app permissions

### API Quotas and Pricing:

- **Free tier**: $200 monthly credit
- **Maps loads**: 28,500 per month (free)
- **Places API calls**: 1,000 per month (free)
- **Geocoding**: 2,500 per month (free)

## Security Best Practices

1. **Use separate API keys** for different platforms
2. **Enable API key restrictions** to limit usage to your app
3. **Monitor API usage** in Google Cloud Console
4. **Set up billing alerts** to avoid unexpected charges
5. **Use environment variables** for production deployments

## Next Steps

Once configured, the app will:
- ✅ Show current location on map load
- ✅ Display permission alerts if location access is denied
- ✅ Provide destination search with suggestions
- ✅ Show both pickup and destination markers on the map
- ✅ Calculate routes between locations (when implemented) 