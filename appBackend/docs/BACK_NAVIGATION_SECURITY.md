# Back Navigation Security Feature

## Overview

The back navigation security feature prevents users from accidentally navigating back to the login screen using the back button or swipe gestures without properly logging out. This ensures that authentication state is always properly destroyed when users exit the app, maintaining security and preventing unauthorized access.

## Key Features

### 1. Back Button Protection
- **Hardware Back Button**: Intercepts Android hardware back button presses
- **Confirmation Dialog**: Shows options for logout or exit app
- **Proper Logout**: Ensures authentication state is destroyed before navigation

### 2. Swipe Gesture Protection
- **Home Screen**: Disables iOS swipe back gesture to prevent going to login screen
- **Driver Dashboard**: Allows swipe back gesture to navigate to Home screen
- **Gesture Control**: Selective gesture control based on screen context
- **Platform Specific**: Handles both Android and iOS navigation patterns

### 3. Authentication State Management
- **Proper Logout**: Calls logout function to destroy auth state
- **Driver Status**: Sets driver status to offline before logout
- **Session Cleanup**: Ensures all sessions are properly terminated

## Implementation Details

### Frontend Implementation

#### 1. Home Screen Protection
```typescript
// appFrontend/src/screens/Home.tsx
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Handle back button press to prevent navigation to login screen
useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      // Show confirmation dialog when back button is pressed
      Alert.alert(
        'Exit App',
        'What would you like to do?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'default',
            onPress: async () => {
              try {
                // Properly logout and destroy auth state
                await logout();
                // Navigate to login screen after logout
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' as any }],
                });
              } catch (error) {
                console.error('Error during logout:', error);
                // Force close app if logout fails
                BackHandler.exitApp();
              }
            },
          },
          {
            text: 'Exit App',
            style: 'destructive',
            onPress: () => {
              // Force close the app
              BackHandler.exitApp();
            },
          },
        ],
        { cancelable: false }
      );
      return true; // Prevent default back behavior
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => subscription?.remove();
  }, [logout, navigation])
);
```

#### 2. Driver Dashboard Protection
```typescript
// appFrontend/src/screens/DriverDashboard.tsx
// Handle back button press to prevent navigation to login screen
useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      // Show confirmation dialog when back button is pressed
      Alert.alert(
        'Exit Driver Dashboard',
        'What would you like to do?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Go Offline & Logout',
            style: 'default',
            onPress: async () => {
              try {
                // Set driver offline first
                if (isOnline) {
                  await driverService.updateDriverStatus(false);
                }
                // Properly logout and destroy auth state
                await logout();
                // Navigate to login screen after logout
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' as any }],
                });
              } catch (error) {
                console.error('Error during logout:', error);
                // Force close app if logout fails
                BackHandler.exitApp();
              }
            },
          },
          {
            text: 'Exit App',
            style: 'destructive',
            onPress: () => {
              // Force close the app
              BackHandler.exitApp();
            },
          },
        ],
        { cancelable: false }
      );
      return true; // Prevent default back behavior
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => subscription?.remove();
  }, [logout, navigation, isOnline])
);
```

### Navigation Configuration

#### 1. Selective Swipe Back Gesture Control
```typescript
// appFrontend/src/navigation/AppNavigator.tsx
<Stack.Screen 
  name="Home" 
  component={Home}
  options={{
    gestureEnabled: false, // Disable swipe back gesture to prevent going to login
  }}
/>

<Stack.Screen 
  name="DriverDashboard" 
  component={DriverDashboard}
  options={{
    gestureEnabled: true, // Allow swipe back gesture to go to Home
  }}
/>
```

## User Experience Flow

### Scenario 1: User Presses Back Button on Home Screen
1. **Back Button Pressed**: User presses Android hardware back button
2. **Confirmation Dialog**: App shows dialog with options
3. **User Choice**: User selects logout or exit app
4. **Proper Logout**: If logout selected, auth state is destroyed
5. **Navigation**: User is properly redirected to login screen

### Scenario 2: User Swipes Back on iOS Home Screen
1. **Swipe Gesture**: User attempts to swipe back from edge on Home screen
2. **Gesture Blocked**: Swipe back gesture is disabled
3. **No Navigation**: User remains on Home screen
4. **Security Maintained**: Authentication state remains intact

### Scenario 3: Driver Swipes Back from Driver Dashboard
1. **Swipe Gesture**: Driver swipes back from edge on Driver Dashboard
2. **Gesture Allowed**: Swipe back gesture is enabled
3. **Navigation**: Driver navigates back to Home screen
4. **Normal Flow**: Standard navigation behavior maintained

### Scenario 4: Driver Presses Back Button on Driver Dashboard
1. **Back Button Pressed**: Driver presses back button on Driver Dashboard
2. **Normal Navigation**: Standard back navigation to Home screen
3. **No Confirmation**: No confirmation dialog needed
4. **Seamless Experience**: Smooth navigation between screens

## Security Benefits

### Authentication Security
- **State Protection**: Prevents unauthorized access to login screen
- **Session Management**: Ensures proper session termination
- **Token Cleanup**: Removes authentication tokens from storage

### Driver Status Security
- **Online Status**: Ensures driver goes offline before logout
- **Location Updates**: Stops location tracking when driver exits
- **Request Management**: Prevents accepting requests after logout

### Data Protection
- **User Data**: Clears user data from local storage
- **Session Data**: Removes session information
- **Device Info**: Clears device-specific data

## Error Handling

### Logout Failures
```typescript
try {
  // Properly logout and destroy auth state
  await logout();
  // Navigate to login screen after logout
  navigation.reset({
    index: 0,
    routes: [{ name: 'Login' as any }],
  });
} catch (error) {
  console.error('Error during logout:', error);
  // Force close app if logout fails
  BackHandler.exitApp();
}
```

### Driver Status Update Failures
```typescript
try {
  // Set driver offline first
  if (isOnline) {
    await driverService.updateDriverStatus(false);
  }
  // Continue with logout
} catch (error) {
  console.error('Error updating driver status:', error);
  // Continue with logout even if status update fails
}
```

## Platform Considerations

### Android
- **Hardware Back Button**: Intercepted and handled with confirmation dialog
- **Gesture Navigation**: Handled by navigation configuration
- **App Exit**: Uses `BackHandler.exitApp()` for force close

### iOS
- **Swipe Back Gesture**: Disabled via `gestureEnabled: false`
- **No Hardware Button**: No hardware back button to intercept
- **App Exit**: Uses `BackHandler.exitApp()` for force close

## Configuration

### Navigation Options
```typescript
const NAVIGATION_CONFIG = {
  DISABLE_GESTURES: true,        // Disable swipe back gestures
  SHOW_CONFIRMATION: true,       // Show confirmation dialog
  FORCE_LOGOUT: true,           // Force logout on back press
  EXIT_ON_FAILURE: true,        // Exit app if logout fails
};
```

### Screen Protection
```typescript
const PROTECTED_SCREENS = [
  'Home',              // Main home screen
  'DriverDashboard',   // Driver dashboard screen
  // Add other main screens as needed
];
```

## Testing

### Manual Testing
1. **Android Back Button**: Press back button on Home/DriverDashboard
2. **iOS Swipe Gesture**: Attempt to swipe back from edge
3. **Logout Flow**: Test logout option in confirmation dialog
4. **Exit Flow**: Test exit app option in confirmation dialog
5. **Error Handling**: Test with network issues during logout

### Automated Testing
```typescript
test('should show confirmation dialog on back press', async () => {
  // Mock back button press
  fireEvent.press(screen.getByTestId('back-button'));
  
  // Verify confirmation dialog appears
  expect(screen.getByText('Exit App')).toBeInTheDocument();
  expect(screen.getByText('Logout')).toBeInTheDocument();
  expect(screen.getByText('Exit App')).toBeInTheDocument();
});

test('should disable swipe back gesture', () => {
  // Verify gesture is disabled
  expect(screen.getByTestId('home-screen')).toHaveStyle({
    gestureEnabled: false
  });
});
```

## Monitoring

### Key Metrics
- **Back Button Presses**: Frequency of back button usage
- **Logout Success Rate**: Percentage of successful logouts
- **Exit App Usage**: How often users choose to exit app
- **Error Rates**: Frequency of logout failures

### Logging
```typescript
console.log('🔒 Back button pressed - showing confirmation dialog');
console.log('✅ User selected logout - destroying auth state');
console.log('❌ Logout failed - forcing app exit');
console.log('🚪 User selected exit app - closing application');
```

## Future Enhancements

### Planned Features
1. **Biometric Confirmation**: Use fingerprint/face ID for logout
2. **Auto-Logout Timer**: Automatic logout after inactivity
3. **Session Recovery**: Allow session recovery in certain cases
4. **Multi-Screen Protection**: Extend protection to other screens

### Integration Opportunities
1. **Analytics**: Track user navigation patterns
2. **Security Audits**: Monitor for security violations
3. **User Preferences**: Allow users to customize behavior
4. **Emergency Logout**: Quick logout for security situations

The back navigation security feature ensures that users cannot accidentally bypass the logout process, maintaining the integrity of the authentication system and protecting user data. 