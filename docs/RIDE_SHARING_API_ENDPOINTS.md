# 🚗 Ride-Sharing API Endpoints Documentation

## Overview
This document provides comprehensive documentation for all ride-sharing API endpoints, including CRUD operations, authentication requirements, request/response formats, and usage examples.

## Table of Contents
- [Authentication](#authentication)
- [Ride Requests](#ride-requests)
- [Ride Services](#ride-services)
- [Driver Management](#driver-management)
- [Ride Management](#ride-management)
- [Error Handling](#error-handling)

---

## Authentication

All endpoints require authentication using Bearer token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

---

## Ride Requests

### 1. Create Ride Request
**POST** `/api/ride-requests`

Creates a new ride request from a customer.

#### Request Body
```json
{
  "pickupLocation": {
    "latitude": 13.4432,
    "longitude": -16.5919,
    "address": "Banjul International Airport"
  },
  "destinationLocation": {
    "latitude": 13.4532,
    "longitude": -16.6019,
    "address": "City Center"
  },
  "rideType": "STANDARD",
  "paymentMethod": "CASH",
  "customerNotes": "Please arrive at terminal 2"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Ride request created successfully",
  "data": {
    "id": "uuid",
    "requestId": "RIDE_001",
    "estimatedDistance": 2.5,
    "estimatedDuration": 15,
    "estimatedPrice": 12.50,
    "status": "REQUESTED",
    "expiresAt": "2024-01-15T10:30:00Z",
    "requestedAt": "2024-01-15T10:28:00Z"
  }
}
```

### 2. Get Ride Request by ID
**GET** `/api/ride-requests/:requestId`

Retrieves a specific ride request by its request ID.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "requestId": "RIDE_001",
    "customerId": "customer-uuid",
    "driverId": null,
    "pickupLocation": {
      "latitude": 13.4432,
      "longitude": -16.5919,
      "address": "Banjul International Airport"
    },
    "destinationLocation": {
      "latitude": 13.4532,
      "longitude": -16.6019,
      "address": "City Center"
    },
    "rideType": "STANDARD",
    "estimatedDistance": 2.5,
    "estimatedDuration": 15,
    "estimatedPrice": 12.50,
    "status": "REQUESTED",
    "paymentMethod": "CASH",
    "customerNotes": "Please arrive at terminal 2",
    "requestedAt": "2024-01-15T10:28:00Z",
    "expiresAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Get Customer's Active Ride Requests
**GET** `/api/ride-requests/customer/active`

Retrieves all active ride requests for the authenticated customer.

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "requestId": "RIDE_001",
      "status": "REQUESTED",
      "pickupLocation": {...},
      "destinationLocation": {...},
      "estimatedPrice": 12.50,
      "requestedAt": "2024-01-15T10:28:00Z"
    }
  ]
}
```

### 4. Get All Customer Ride Requests
**GET** `/api/ride-requests/customer/all`

Retrieves all ride requests (including completed, cancelled) for the authenticated customer.

#### Query Parameters
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page
- `status` (optional): Filter by status

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "requests": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### 5. Accept Ride Request
**POST** `/api/ride-requests/:requestId/accept`

Allows a driver to accept a ride request.

#### Request Body
```json
{
  "driverId": "driver-uuid"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Ride request accepted successfully",
  "data": {
    "id": "uuid",
    "requestId": "RIDE_001",
    "status": "ACCEPTED",
    "acceptedAt": "2024-01-15T10:29:00Z",
    "driverId": "driver-uuid"
  }
}
```

### 6. Cancel Ride Request
**POST** `/api/ride-requests/:requestId/cancel`

Cancels a ride request (can be done by customer or driver).

#### Request Body
```json
{
  "cancelledBy": "customer",
  "cancellationReason": "Changed plans"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Ride request cancelled successfully",
  "data": {
    "id": "uuid",
    "requestId": "RIDE_001",
    "status": "CANCELLED",
    "cancelledAt": "2024-01-15T10:29:00Z",
    "cancelledBy": "customer",
    "cancellationReason": "Changed plans"
  }
}
```

### 7. Get Nearby Ride Requests (for Drivers)
**GET** `/api/ride-requests/nearby-requests`

Retrieves nearby ride requests for drivers based on location and service type.

#### Query Parameters
- `latitude` (required): Driver's latitude
- `longitude` (required): Driver's longitude
- `maxDistance` (optional): Maximum distance in km (default: 5)

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "requestId": "RIDE_001",
      "customer": {
        "firstName": "John",
        "lastName": "Doe",
        "rating": 4.8
      },
      "pickupLocation": {
        "latitude": 13.4432,
        "longitude": -16.5919,
        "address": "Banjul International Airport"
      },
      "destinationLocation": {
        "latitude": 13.4532,
        "longitude": -16.6019,
        "address": "City Center"
      },
      "estimatedDistance": 2.5,
      "estimatedDuration": 15,
      "estimatedPrice": 12.50,
      "rideService": {
        "name": "Standard Ride",
        "currencySymbol": "$"
      },
      "distanceFromDriver": 1.2
    }
  ]
}
```

### 8. Get Nearby Drivers (for Customers)
**GET** `/api/ride-requests/nearby-drivers`

Retrieves nearby online drivers for customers.

#### Query Parameters
- `latitude` (required): Customer's latitude
- `longitude` (required): Customer's longitude
- `maxDistance` (optional): Maximum distance in km (default: 5)

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "driver-uuid",
      "driverId": "DRIVER_001",
      "currentLocation": {
        "latitude": 13.4432,
        "longitude": -16.5919,
        "address": "Near Airport"
      },
      "rating": 4.8,
      "vehicleInfo": {
        "model": "Toyota Camry",
        "plate": "ABC123",
        "color": "White"
      },
      "distanceFromCustomer": 1.2
    }
  ]
}
```

### 9. Get Online Drivers for Map
**GET** `/api/ride-requests/online-drivers/map`

Retrieves online drivers for map display with minimal data.

#### Query Parameters
- `latitude` (required): Center latitude
- `longitude` (required): Center longitude
- `maxDistance` (optional): Maximum distance in km (default: 10)

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "driver-uuid",
      "latitude": 13.4432,
      "longitude": -16.5919,
      "driverId": "DRIVER_001",
      "rating": 4.8,
      "vehicleType": "DRIVER"
    }
  ]
}
```

---

## Ride Services

### 1. Get All Active Ride Services
**GET** `/api/ride-services`

Retrieves all active ride service configurations.

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "service-uuid",
      "serviceId": "STANDARD_RIDE",
      "name": "Standard Ride",
      "description": "Regular car service",
      "vehicleType": "DRIVER",
      "isActive": true,
      "baseFare": 5.00,
      "perKmRate": 2.50,
      "perMinuteRate": 0.30,
      "currency": "USD",
      "currencySymbol": "$"
    }
  ]
}
```

### 2. Get Ride Service by ID
**GET** `/api/ride-services/:serviceId`

Retrieves a specific ride service configuration.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "service-uuid",
    "serviceId": "STANDARD_RIDE",
    "name": "Standard Ride",
    "description": "Regular car service",
    "vehicleType": "DRIVER",
    "isActive": true,
    "baseFare": 5.00,
    "perKmRate": 2.50,
    "perMinuteRate": 0.30,
    "currency": "USD",
    "currencySymbol": "$",
    "surgeMultiplier": 1.5,
    "nightMultiplier": 1.2,
    "weekendMultiplier": 1.1
  }
}
```

### 3. Get Default Service by Vehicle Type
**GET** `/api/ride-services/default/:vehicleType`

Retrieves the default service configuration for a specific vehicle type.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "service-uuid",
    "serviceId": "STANDARD_RIDE",
    "name": "Standard Ride",
    "vehicleType": "DRIVER",
    "baseFare": 5.00,
    "perKmRate": 2.50
  }
}
```

### 4. Calculate Fare
**POST** `/api/ride-services/calculate-fare`

Calculates fare for a ride based on distance, duration, and service type.

#### Request Body
```json
{
  "serviceId": "STANDARD_RIDE",
  "distance": 5.2,
  "duration": 15,
  "latitude": 13.4432,
  "longitude": -16.5919
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "baseFare": 5.00,
    "distanceFare": 13.00,
    "timeFare": 4.50,
    "surgeFare": 3.38,
    "totalFare": 25.88,
    "breakdown": {
      "base": 5.00,
      "distance": 13.00,
      "time": 4.50,
      "surge": 3.38
    }
  }
}
```

### 5. Get Surge Multiplier
**GET** `/api/ride-services/surge-multiplier`

Gets the current surge multiplier for a location.

#### Query Parameters
- `latitude` (required): Location latitude
- `longitude` (required): Location longitude
- `radius` (optional): Search radius in km (default: 5)

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "surgeMultiplier": 1.5,
    "reason": "High demand in this area"
  }
}
```

### 6. Get Services with Online Drivers
**GET** `/api/ride-services/with-online-drivers`

Retrieves ride services that have online drivers nearby.

#### Query Parameters
- `latitude` (required): Driver's latitude
- `longitude` (required): Driver's longitude
- `radius` (optional): Search radius in km (default: 5)

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "service-uuid",
      "serviceId": "STANDARD_RIDE",
      "name": "Standard Ride",
      "vehicleType": "DRIVER",
      "onlineDriversCount": 3,
      "baseFare": 5.00,
      "perKmRate": 2.50
    }
  ]
}
```

---

## Driver Management

### 1. Get Driver Profile
**GET** `/api/driver/profile`

Retrieves the authenticated driver's profile information.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "driver-uuid",
    "driverId": "DRIVER_001",
    "isOnline": true,
    "status": "ONLINE",
    "currentLocation": {
      "latitude": 13.4432,
      "longitude": -16.5919,
      "address": "Near Airport"
    },
    "totalRides": 150,
    "totalEarnings": 2500.00,
    "rating": 4.8,
    "ratingCount": 120,
    "vehicleInfo": {
      "model": "Toyota Camry",
      "plate": "ABC123",
      "color": "White",
      "year": 2020
    }
  }
}
```

### 2. Update Driver Status
**POST** `/api/driver/status`

Updates driver's online/offline status.

#### Request Body
```json
{
  "isOnline": true,
  "location": {
    "latitude": 13.4432,
    "longitude": -16.5919,
    "address": "Near Airport"
  }
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Driver status updated successfully",
  "data": {
    "isOnline": true,
    "status": "ONLINE",
    "currentLocation": {
      "latitude": 13.4432,
      "longitude": -16.5919,
      "address": "Near Airport"
    }
  }
}
```

### 3. Update Driver Location
**POST** `/api/driver/location`

Updates driver's current location.

#### Request Body
```json
{
  "latitude": 13.4432,
  "longitude": -16.5919,
  "address": "Near Airport",
  "accuracy": 10,
  "speed": 25,
  "heading": 90
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Driver location updated successfully"
}
```

### 4. Smart Update Driver Location
**POST** `/api/driver/smart-location`

Updates driver location with smart throttling and validation.

#### Request Body
```json
{
  "location": {
    "latitude": 13.4432,
    "longitude": -16.5919,
    "address": "Near Airport"
  },
  "forceUpdate": false
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "updated": true,
    "reason": "Location changed significantly"
  }
}
```

### 5. Get Driver Statistics
**GET** `/api/driver/stats`

Retrieves driver's statistics and earnings.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "totalRides": 150,
    "totalEarnings": 2500.00,
    "rating": 4.8,
    "onlineHours": 45,
    "todayEarnings": 85.50,
    "weeklyEarnings": 420.00,
    "monthlyEarnings": 1800.00
  }
}
```

### 6. Get Active Ride
**GET** `/api/driver/active-ride`

Retrieves driver's currently active ride.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "ride-uuid",
    "rideId": "RIDE_001",
    "customer": {
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+220123456789"
    },
    "pickupLocation": {...},
    "destinationLocation": {...},
    "status": "IN_PROGRESS",
    "totalFare": 25.88
  }
}
```

---

## Ride Management

### 1. Update Ride Status
**POST** `/api/driver/ride/:rideId/status`

Updates the status of an active ride.

#### Request Body
```json
{
  "status": "ARRIVED"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Ride status updated successfully",
  "data": {
    "id": "ride-uuid",
    "status": "ARRIVED",
    "arrivedAt": "2024-01-15T10:35:00Z"
  }
}
```

### 2. Add Ride Location Update
**POST** `/api/driver/ride/:rideId/location`

Adds a location update for an active ride.

#### Request Body
```json
{
  "latitude": 13.4432,
  "longitude": -16.5919,
  "accuracy": 10,
  "speed": 25,
  "heading": 90
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Location update added successfully"
}
```

### 3. Rate Ride
**POST** `/api/driver/ride/:rideId/rate`

Allows driver to rate a completed ride.

#### Request Body
```json
{
  "rating": 5,
  "review": "Great customer, very polite"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Ride rated successfully"
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource already exists)
- `422` - Validation Error (invalid data format)
- `500` - Internal Server Error

### Example Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Pickup and destination locations are required",
  "error": "VALIDATION_ERROR"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid token",
  "error": "AUTHENTICATION_ERROR"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Ride request not found",
  "error": "NOT_FOUND"
}
```

---

## Rate Limiting

- **General endpoints**: 100 requests per minute
- **Location updates**: 60 requests per minute
- **Authentication endpoints**: 10 requests per minute

---

## WebSocket Events (Future Implementation)

### Real-time Updates
- `ride_request_created` - New ride request available
- `ride_request_accepted` - Request accepted by driver
- `ride_status_updated` - Ride status changed
- `driver_location_updated` - Driver location changed
- `ride_completed` - Ride completed

---

## Testing

### Test Ride Request IDs
- `RIDE_TEST_001` - Standard ride request
- `RIDE_TEST_002` - Premium ride request
- `RIDE_TEST_003` - Pool ride request

### Test Driver IDs
- `DRIVER_TEST_001` - Online driver
- `DRIVER_TEST_002` - Busy driver
- `DRIVER_TEST_003` - Offline driver

---

## Version History

- **v1.0.0** - Initial implementation
- **v1.1.0** - Added notification sounds and haptic feedback
- **v1.2.0** - Enhanced accept request with ride record creation
- **v1.3.0** - Added surge pricing and dynamic service filtering

---

## Support

For API support and questions:
- Email: api-support@marketplace.com
- Documentation: https://docs.marketplace.com/api
- Status Page: https://status.marketplace.com 