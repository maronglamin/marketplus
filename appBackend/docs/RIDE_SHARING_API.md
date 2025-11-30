# Ride-Sharing API Documentation

## Overview

This document describes the API endpoints for the Uber-like ride-sharing system. All endpoints require authentication using JWT tokens.

**Base URL:** `https://api.cloudnexus.biz:3000/api`

**Authentication:** Bearer token in Authorization header
```
Authorization: Bearer <jwt_token>
```

---

## Driver Endpoints

### 1. Get Driver Profile

**Endpoint:** `GET /driver/profile`

**Description:** Retrieve the current driver's profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "driverId": "DRIVER_123456",
    "isOnline": false,
    "status": "OFFLINE",
    "currentLocation": {
      "latitude": 13.4432,
      "longitude": -16.5919,
      "address": "Current Location"
    },
    "lastLocationUpdate": "2024-01-15T10:30:00Z",
    "totalRides": 127,
    "totalEarnings": 2450.75,
    "rating": 4.8,
    "ratingCount": 45,
    "vehicleInfo": {
      "model": "Toyota Camry",
      "plate": "ABC123",
      "color": "White",
      "year": 2020
    },
    "isVerified": true,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+220123456789"
    },
    "riderApplication": {
      "vehicleModel": "Toyota Camry",
      "vehiclePlate": "ABC123",
      "licenseNumber": "LIC123456"
    }
  }
}
```

**Error Response:**
```json
{
  "error": "Driver not found"
}
```

---

### 2. Update Driver Status

**Endpoint:** `POST /driver/status`

**Description:** Update driver's online/offline status.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "isOnline": true,
  "location": {
    "latitude": 13.4432,
    "longitude": -16.5919,
    "address": "123 Main Street, Banjul, The Gambia"
  }
}
```

**Required Fields:**
- `isOnline` (boolean): Whether driver should be online or offline

**Optional Fields (Required when going online):**
- `location` (object): Current driver location
  - `latitude` (number): Driver's latitude
  - `longitude` (number): Driver's longitude
  - `address` (string, optional): Human-readable address

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isOnline": true,
    "status": "ONLINE",
    "lastLocationUpdate": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response:**
```json
{
  "error": "isOnline must be a boolean"
}
```

---

### 3. Update Driver Location

**Endpoint:** `POST /driver/location`

**Description:** Update driver's current location.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "latitude": 13.4432,
  "longitude": -16.5919,
  "address": "Banjul International Airport",
  "accuracy": 10.5,
  "speed": 25.0,
  "heading": 180.0
}
```

**Required Fields:**
- `latitude` (number): Driver's latitude
- `longitude` (number): Driver's longitude

**Optional Fields:**
- `address` (string): Human-readable address
- `accuracy` (number): GPS accuracy in meters
- `speed` (number): Current speed in km/h
- `heading` (number): Direction in degrees

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "currentLocation": {
      "latitude": 13.4432,
      "longitude": -16.5919,
      "address": "Banjul International Airport",
      "accuracy": 10.5,
      "speed": 25.0,
      "heading": 180.0
    },
    "lastLocationUpdate": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response:**
```json
{
  "error": "Latitude and longitude are required"
}
```

---

### 4. Get Nearby Ride Requests

**Endpoint:** `GET /driver/nearby-requests`

**Description:** Get ride requests within a specified radius of the driver's location.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `radius` (number, optional): Search radius in kilometers (default: 5)

**Example:** `GET /driver/nearby-requests?radius=3`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "requestId": "RIDE_1705312200000_abc123def",
      "customerId": "uuid",
      "pickupLocation": {
        "latitude": 13.4432,
        "longitude": -16.5919,
        "address": "Banjul International Airport"
      },
      "destinationLocation": {
        "latitude": 13.4532,
        "longitude": -16.6019,
        "address": "Kairaba Avenue, Serrekunda"
      },
      "estimatedDistance": 12.5,
      "estimatedDuration": 18,
      "estimatedPrice": 15.50,
      "rideType": "STANDARD",
      "customerNotes": "Please arrive at Terminal 1",
      "requestedAt": "2024-01-15T10:30:00Z",
      "expiresAt": "2024-01-15T10:32:00Z",
      "customer": {
        "firstName": "John",
        "lastName": "Smith",
        "phoneNumber": "+220123456789",
        "rating": 4.8
      }
    }
  ]
}
```

**Error Response:**
```json
{
  "error": "Driver location not available"
}
```

---

### 5. Accept Ride Request

**Endpoint:** `POST /driver/accept-request/{requestId}`

**Description:** Accept a ride request and create a ride.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `requestId` (string): The ID of the ride request to accept

**Response:**
```json
{
  "success": true,
  "data": {
    "request": {
      "id": "uuid",
      "status": "ACCEPTED",
      "driverId": "uuid",
      "acceptedAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "ride": {
      "id": "uuid",
      "rideId": "RIDE_1705312200000_xyz789",
      "rideRequestId": "uuid",
      "driverId": "uuid",
      "customerId": "uuid",
      "pickupLocation": {
        "latitude": 13.4432,
        "longitude": -16.5919,
        "address": "Banjul International Airport"
      },
      "destinationLocation": {
        "latitude": 13.4532,
        "longitude": -16.6019,
        "address": "Kairaba Avenue, Serrekunda"
      },
      "rideType": "STANDARD",
      "baseFare": 2.50,
      "distanceFare": 15.00,
      "timeFare": 2.70,
      "surgeFare": 0.00,
      "totalFare": 20.20,
      "driverEarnings": 16.16,
      "platformFee": 4.04,
      "paymentMethod": "CASH",
      "paymentStatus": "PENDING",
      "status": "ACCEPTED",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Error Response:**
```json
{
  "error": "Ride request not available or expired"
}
```

---

### 6. Reject Ride Request

**Endpoint:** `POST /driver/reject-request/{requestId}`

**Description:** Reject a ride request.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `requestId` (string): The ID of the ride request to reject

**Request Body:**
```json
{
  "reason": "Too far from current location"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CANCELLED",
    "cancelledAt": "2024-01-15T10:30:00Z",
    "cancelledBy": "driver",
    "cancellationReason": "Too far from current location",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 7. Get Driver Statistics

**Endpoint:** `GET /driver/stats`

**Description:** Get driver's performance statistics and earnings.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRides": 127,
    "totalEarnings": 2450.75,
    "rating": 4.8,
    "onlineHours": 156,
    "todayEarnings": 45.50,
    "weeklyEarnings": 320.25,
    "monthlyEarnings": 1250.80
  }
}
```

---

### 8. Get Active Ride

**Endpoint:** `GET /driver/active-ride`

**Description:** Get the driver's currently active ride.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "rideId": "RIDE_1705312200000_xyz789",
    "driverId": "uuid",
    "customerId": "uuid",
    "pickupLocation": {
      "latitude": 13.4432,
      "longitude": -16.5919,
      "address": "Banjul International Airport"
    },
    "destinationLocation": {
      "latitude": 13.4532,
      "longitude": -16.6019,
      "address": "Kairaba Avenue, Serrekunda"
    },
    "rideType": "STANDARD",
    "totalFare": 20.20,
    "driverEarnings": 16.16,
    "paymentMethod": "CASH",
    "paymentStatus": "PENDING",
    "status": "IN_PROGRESS",
    "startedAt": "2024-01-15T10:35:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "customer": {
      "firstName": "John",
      "lastName": "Smith",
      "phoneNumber": "+220123456789"
    },
    "rideRequest": {
      "requestId": "RIDE_1705312200000_abc123def",
      "estimatedDistance": 12.5,
      "estimatedDuration": 18,
      "estimatedPrice": 15.50
    }
  }
}
```

**Response (No Active Ride):**
```json
{
  "success": true,
  "data": null
}
```

---

### 9. Update Ride Status

**Endpoint:** `POST /driver/ride/{rideId}/status`

**Description:** Update the status of an active ride.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `rideId` (string): The ID of the ride to update

**Request Body:**
```json
{
  "status": "IN_PROGRESS"
}
```

**Valid Status Values:**
- `ARRIVING` - Driver is on the way to pickup
- `ARRIVED` - Driver has arrived at pickup location
- `IN_PROGRESS` - Ride has started
- `COMPLETED` - Ride has been completed
- `CANCELLED` - Ride has been cancelled

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "rideId": "RIDE_1705312200000_xyz789",
    "status": "IN_PROGRESS",
    "startedAt": "2024-01-15T10:35:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

---

### 10. Add Ride Location Update

**Endpoint:** `POST /driver/ride/{rideId}/location`

**Description:** Add a location update for an active ride.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `rideId` (string): The ID of the ride

**Request Body:**
```json
{
  "latitude": 13.4432,
  "longitude": -16.5919,
  "accuracy": 10.5,
  "speed": 25.0,
  "heading": 180.0
}
```

**Required Fields:**
- `latitude` (number): Current latitude
- `longitude` (number): Current longitude

**Optional Fields:**
- `accuracy` (number): GPS accuracy in meters
- `speed` (number): Current speed in km/h
- `heading` (number): Direction in degrees

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "rideId": "uuid",
    "latitude": 13.4432,
    "longitude": -16.5919,
    "accuracy": 10.5,
    "speed": 25.0,
    "heading": 180.0,
    "timestamp": "2024-01-15T10:35:00Z"
  }
}
```

---

### 11. Rate Ride

**Endpoint:** `POST /driver/ride/{rideId}/rate`

**Description:** Rate a completed ride (driver rating customer).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `rideId` (string): The ID of the ride to rate

**Request Body:**
```json
{
  "rating": 5,
  "review": "Great customer, very polite and on time"
}
```

**Required Fields:**
- `rating` (number): Rating from 1 to 5

**Optional Fields:**
- `review` (string): Written review

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "rideId": "RIDE_1705312200000_xyz789",
    "driverRating": 5,
    "driverReview": "Great customer, very polite and on time",
    "updatedAt": "2024-01-15T10:40:00Z"
  }
}
```

---

## Ride Request Endpoints

### 1. Create Ride Request

**Endpoint:** `POST /ride-requests`

**Description:** Create a new ride request.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
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
    "address": "Kairaba Avenue, Serrekunda"
  },
  "rideType": "STANDARD",
  "paymentMethod": "CASH",
  "customerNotes": "Please arrive at Terminal 1"
}
```

**Required Fields:**
- `pickupLocation` (object): Pickup location with latitude, longitude, and address
- `destinationLocation` (object): Destination location with latitude, longitude, and address

**Optional Fields:**
- `rideType` (string): Type of ride (STANDARD, PREMIUM, POOL, DELIVERY) - default: STANDARD
- `paymentMethod` (string): Payment method (CASH, CARD, MOBILE_MONEY, WALLET) - default: CASH
- `customerNotes` (string): Additional notes for the driver

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "requestId": "RIDE_1705312200000_abc123def",
    "estimatedDistance": 12.5,
    "estimatedDuration": 18,
    "estimatedPrice": 15.50,
    "status": "REQUESTED",
    "expiresAt": "2024-01-15T10:32:00Z",
    "requestedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response:**
```json
{
  "error": "Pickup and destination locations are required"
}
```

---

### 2. Get Ride Request

**Endpoint:** `GET /ride-requests/{requestId}`

**Description:** Get details of a specific ride request.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `requestId` (string): The ID of the ride request

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "requestId": "RIDE_1705312200000_abc123def",
    "customerId": "uuid",
    "driverId": "uuid",
    "pickupLocation": {
      "latitude": 13.4432,
      "longitude": -16.5919,
      "address": "Banjul International Airport"
    },
    "destinationLocation": {
      "latitude": 13.4532,
      "longitude": -16.6019,
      "address": "Kairaba Avenue, Serrekunda"
    },
    "rideType": "STANDARD",
    "estimatedDistance": 12.5,
    "estimatedDuration": 18,
    "estimatedPrice": 15.50,
    "status": "ACCEPTED",
    "paymentMethod": "CASH",
    "customerNotes": "Please arrive at Terminal 1",
    "requestedAt": "2024-01-15T10:30:00Z",
    "acceptedAt": "2024-01-15T10:31:00Z",
    "expiresAt": "2024-01-15T10:32:00Z",
    "customer": {
      "firstName": "John",
      "lastName": "Smith",
      "phoneNumber": "+220123456789"
    },
    "driver": {
      "user": {
        "firstName": "Mike",
        "lastName": "Johnson",
        "phoneNumber": "+220987654321"
      }
    },
    "ride": {
      "id": "uuid",
      "rideId": "RIDE_1705312200000_xyz789",
      "status": "IN_PROGRESS",
      "totalFare": 20.20,
      "driverEarnings": 16.16
    }
  }
}
```

**Error Response:**
```json
{
  "error": "Forbidden"
}
```

---

### 3. Get Customer Ride History

**Endpoint:** `GET /ride-requests/customer/history`

**Description:** Get the current customer's ride history.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `limit` (number, optional): Number of rides to return (default: 10)

**Example:** `GET /ride-requests/customer/history?limit=20`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "requestId": "RIDE_1705312200000_abc123def",
      "customerId": "uuid",
      "driverId": "uuid",
      "pickupLocation": {
        "latitude": 13.4432,
        "longitude": -16.5919,
        "address": "Banjul International Airport"
      },
      "destinationLocation": {
        "latitude": 13.4532,
        "longitude": -16.6019,
        "address": "Kairaba Avenue, Serrekunda"
      },
      "rideType": "STANDARD",
      "estimatedDistance": 12.5,
      "estimatedDuration": 18,
      "estimatedPrice": 15.50,
      "actualPrice": 20.20,
      "status": "COMPLETED",
      "paymentMethod": "CASH",
      "requestedAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:48:00Z",
      "driver": {
        "user": {
          "firstName": "Mike",
          "lastName": "Johnson",
          "phoneNumber": "+220987654321"
        }
      },
      "ride": {
        "id": "uuid",
        "rideId": "RIDE_1705312200000_xyz789",
        "status": "COMPLETED",
        "totalFare": 20.20,
        "customerRating": 5,
        "driverRating": 5
      }
    }
  ]
}
```

---

### 4. Cancel Ride Request

**Endpoint:** `POST /ride-requests/{requestId}/cancel`

**Description:** Cancel a ride request.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `requestId` (string): The ID of the ride request to cancel

**Request Body:**
```json
{
  "reason": "Changed my mind"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CANCELLED",
    "cancelledAt": "2024-01-15T10:31:00Z",
    "cancelledBy": "customer",
    "cancellationReason": "Changed my mind",
    "updatedAt": "2024-01-15T10:31:00Z"
  }
}
```

**Error Response:**
```json
{
  "error": "Cannot cancel ride request in current status"
}
```

---

### 5. Update Ride Status (Customer)

**Endpoint:** `POST /ride-requests/ride/{rideId}/status`

**Description:** Update ride status from customer side.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `rideId` (string): The ID of the ride

**Request Body:**
```json
{
  "status": "CANCELLED"
}
```

**Valid Status Values:**
- `CANCELLED` - Customer cancels the ride

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "rideId": "RIDE_1705312200000_xyz789",
    "status": "CANCELLED",
    "cancelledAt": "2024-01-15T10:35:00Z",
    "cancelledBy": "customer",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

---

### 6. Rate Ride (Customer)

**Endpoint:** `POST /ride-requests/ride/{rideId}/rate`

**Description:** Rate a completed ride (customer rating driver).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `rideId` (string): The ID of the ride to rate

**Request Body:**
```json
{
  "rating": 5,
  "review": "Excellent driver, very professional and safe"
}
```

**Required Fields:**
- `rating` (number): Rating from 1 to 5

**Optional Fields:**
- `review` (string): Written review

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "rideId": "RIDE_1705312200000_xyz789",
    "customerRating": 5,
    "customerReview": "Excellent driver, very professional and safe",
    "updatedAt": "2024-01-15T10:40:00Z"
  }
}
```

---

## Data Models

### Ride Status Enum
```typescript
enum RideStatus {
  REQUESTED    // Ride request created, waiting for driver
  ACCEPTED     // Driver accepted the request
  ARRIVING     // Driver is on the way to pickup
  ARRIVED      // Driver has arrived at pickup location
  IN_PROGRESS  // Ride has started
  COMPLETED    // Ride has been completed
  CANCELLED    // Ride has been cancelled
  EXPIRED      // Ride request expired without acceptance
}
```

### Driver Status Enum
```typescript
enum DriverStatus {
  OFFLINE     // Driver is offline
  ONLINE      // Driver is online and available
  BUSY        // Driver is on a ride
  SUSPENDED   // Driver account is suspended
}
```

### Ride Type Enum
```typescript
enum RideType {
  STANDARD    // Standard ride
  PREMIUM     // Premium ride (luxury vehicle)
  POOL        // Shared ride
  DELIVERY    // Delivery service
}
```

### Payment Method Enum
```typescript
enum RidePaymentMethod {
  CASH           // Cash payment
  CARD           // Credit/Debit card
  MOBILE_MONEY   // Mobile money
  WALLET         // Digital wallet
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

---

## Rate Limiting

- **Driver endpoints:** 100 requests per minute
- **Ride request endpoints:** 50 requests per minute
- **Location updates:** 10 requests per second

---

## WebSocket Events (Future Implementation)

The following WebSocket events will be implemented for real-time updates:

### Driver Events
- `driver.status.updated` - Driver status changed
- `driver.location.updated` - Driver location updated
- `ride.request.received` - New ride request received
- `ride.status.updated` - Ride status changed

### Customer Events
- `ride.request.created` - Ride request created
- `ride.request.accepted` - Ride request accepted by driver
- `ride.status.updated` - Ride status changed
- `driver.location.updated` - Driver location updated during ride

---

## Testing

### Test Ride Request Creation
```bash
curl -X POST https://api.cloudnexus.biz:3000/api/ride-requests \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": {
      "latitude": 13.4432,
      "longitude": -16.5919,
      "address": "Banjul International Airport"
    },
    "destinationLocation": {
      "latitude": 13.4532,
      "longitude": -16.6019,
      "address": "Kairaba Avenue, Serrekunda"
    },
    "rideType": "STANDARD",
    "paymentMethod": "CASH"
  }'
```

### Test Driver Status Update
```bash
curl -X POST https://api.cloudnexus.biz:3000/api/driver/status \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"isOnline": true}'
```

---

## Support

For API support and questions, please contact the development team or refer to the internal documentation. 