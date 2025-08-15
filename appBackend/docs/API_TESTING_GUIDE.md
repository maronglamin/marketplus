# Ride-Sharing API Testing Guide

## Prerequisites

1. **Backend Server Running**
   ```bash
   cd appBackend
   npm run dev
   ```

2. **Database Setup**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. **JWT Token**
   - Get a valid JWT token from your authentication system
   - Replace `<jwt_token>` in all examples below

---

## 🧪 Testing with cURL

### 1. Driver Profile

**Get Driver Profile**
```bash
curl -X GET http://localhost:3000/api/driver/profile \
  -H "Authorization: Bearer <jwt_token>"
```

### 2. Driver Status Management

**Go Online**
```bash
curl -X POST http://localhost:3000/api/driver/status \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"isOnline": true}'
```

**Go Offline**
```bash
curl -X POST http://localhost:3000/api/driver/status \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"isOnline": false}'
```

### 3. Location Updates

**Update Driver Location**
```bash
curl -X POST http://localhost:3000/api/driver/location \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 13.4432,
    "longitude": -16.5919,
    "address": "Banjul International Airport",
    "accuracy": 10.5,
    "speed": 25.0,
    "heading": 180.0
  }'
```

### 4. Ride Requests

**Create Ride Request (Customer)**
```bash
curl -X POST http://localhost:3000/api/ride-requests \
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
    "paymentMethod": "CASH",
    "customerNotes": "Please arrive at Terminal 1"
  }'
```

**Get Nearby Requests (Driver)**
```bash
curl -X GET "http://localhost:3000/api/driver/nearby-requests?radius=5" \
  -H "Authorization: Bearer <jwt_token>"
```

**Accept Ride Request (Driver)**
```bash
curl -X POST http://localhost:3000/api/driver/accept-request/<request_id> \
  -H "Authorization: Bearer <jwt_token>"
```

**Reject Ride Request (Driver)**
```bash
curl -X POST http://localhost:3000/api/driver/reject-request/<request_id> \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Too far from current location"}'
```

### 5. Ride Management

**Get Active Ride (Driver)**
```bash
curl -X GET http://localhost:3000/api/driver/active-ride \
  -H "Authorization: Bearer <jwt_token>"
```

**Update Ride Status**
```bash
curl -X POST http://localhost:3000/api/driver/ride/<ride_id>/status \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

**Add Ride Location Update**
```bash
curl -X POST http://localhost:3000/api/driver/ride/<ride_id>/location \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 13.4432,
    "longitude": -16.5919,
    "accuracy": 10.5,
    "speed": 25.0,
    "heading": 180.0
  }'
```

### 6. Ratings and Reviews

**Rate Ride (Driver)**
```bash
curl -X POST http://localhost:3000/api/driver/ride/<ride_id>/rate \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "review": "Great customer, very polite and on time"
  }'
```

**Rate Ride (Customer)**
```bash
curl -X POST http://localhost:3000/api/ride-requests/ride/<ride_id>/rate \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "review": "Excellent driver, very professional and safe"
  }'
```

### 7. Statistics and History

**Get Driver Statistics**
```bash
curl -X GET http://localhost:3000/api/driver/stats \
  -H "Authorization: Bearer <jwt_token>"
```

**Get Customer Ride History**
```bash
curl -X GET "http://localhost:3000/api/ride-requests/customer/history?limit=10" \
  -H "Authorization: Bearer <jwt_token>"
```

---

## 📱 Testing with Postman

### Postman Collection

Create a new collection in Postman and import the following requests:

#### Environment Variables
```
BASE_URL: http://localhost:3000/api
JWT_TOKEN: <your_jwt_token>
```

#### 1. Driver Profile
```
GET {{BASE_URL}}/driver/profile
Headers:
  Authorization: Bearer {{JWT_TOKEN}}
```

#### 2. Update Driver Status
```
POST {{BASE_URL}}/driver/status
Headers:
  Authorization: Bearer {{JWT_TOKEN}}
  Content-Type: application/json
Body (raw JSON):
{
  "isOnline": true
}
```

#### 3. Update Driver Location
```
POST {{BASE_URL}}/driver/location
Headers:
  Authorization: Bearer {{JWT_TOKEN}}
  Content-Type: application/json
Body (raw JSON):
{
  "latitude": 13.4432,
  "longitude": -16.5919,
  "address": "Banjul International Airport",
  "accuracy": 10.5,
  "speed": 25.0,
  "heading": 180.0
}
```

#### 4. Create Ride Request
```
POST {{BASE_URL}}/ride-requests
Headers:
  Authorization: Bearer {{JWT_TOKEN}}
  Content-Type: application/json
Body (raw JSON):
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

#### 5. Get Nearby Requests
```
GET {{BASE_URL}}/driver/nearby-requests?radius=5
Headers:
  Authorization: Bearer {{JWT_TOKEN}}
```

#### 6. Accept Ride Request
```
POST {{BASE_URL}}/driver/accept-request/{{request_id}}
Headers:
  Authorization: Bearer {{JWT_TOKEN}}
```

#### 7. Update Ride Status
```
POST {{BASE_URL}}/driver/ride/{{ride_id}}/status
Headers:
  Authorization: Bearer {{JWT_TOKEN}}
  Content-Type: application/json
Body (raw JSON):
{
  "status": "IN_PROGRESS"
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Complete Ride Flow

1. **Driver goes online**
   ```bash
   curl -X POST http://localhost:3000/api/driver/status \
     -H "Authorization: Bearer <driver_token>" \
     -H "Content-Type: application/json" \
     -d '{"isOnline": true}'
   ```

2. **Customer creates ride request**
   ```bash
   curl -X POST http://localhost:3000/api/ride-requests \
     -H "Authorization: Bearer <customer_token>" \
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

3. **Driver gets nearby requests**
   ```bash
   curl -X GET "http://localhost:3000/api/driver/nearby-requests?radius=5" \
     -H "Authorization: Bearer <driver_token>"
   ```

4. **Driver accepts request**
   ```bash
   curl -X POST http://localhost:3000/api/driver/accept-request/<request_id> \
     -H "Authorization: Bearer <driver_token>"
   ```

5. **Driver updates ride status**
   ```bash
   curl -X POST http://localhost:3000/api/driver/ride/<ride_id>/status \
     -H "Authorization: Bearer <driver_token>" \
     -H "Content-Type: application/json" \
     -d '{"status": "IN_PROGRESS"}'
   ```

6. **Driver completes ride**
   ```bash
   curl -X POST http://localhost:3000/api/driver/ride/<ride_id>/status \
     -H "Authorization: Bearer <driver_token>" \
     -H "Content-Type: application/json" \
     -d '{"status": "COMPLETED"}'
   ```

7. **Both parties rate the ride**
   ```bash
   # Driver rates customer
   curl -X POST http://localhost:3000/api/driver/ride/<ride_id>/rate \
     -H "Authorization: Bearer <driver_token>" \
     -H "Content-Type: application/json" \
     -d '{"rating": 5, "review": "Great customer!"}'
   
   # Customer rates driver
   curl -X POST http://localhost:3000/api/ride-requests/ride/<ride_id>/rate \
     -H "Authorization: Bearer <customer_token>" \
     -H "Content-Type: application/json" \
     -d '{"rating": 5, "review": "Excellent driver!"}'
   ```

### Scenario 2: Error Handling

1. **Invalid token**
   ```bash
   curl -X GET http://localhost:3000/api/driver/profile \
     -H "Authorization: Bearer invalid_token"
   ```

2. **Missing required fields**
   ```bash
   curl -X POST http://localhost:3000/api/ride-requests \
     -H "Authorization: Bearer <jwt_token>" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

3. **Invalid ride status**
   ```bash
   curl -X POST http://localhost:3000/api/driver/ride/<ride_id>/status \
     -H "Authorization: Bearer <jwt_token>" \
     -H "Content-Type: application/json" \
     -d '{"status": "INVALID_STATUS"}'
   ```

---

## 🔍 Response Validation

### Expected Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Expected Error Response
```json
{
  "error": "Error message here"
}
```

### Common Validation Points

1. **Status Codes**
   - 200: Success
   - 400: Bad Request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 500: Internal Server Error

2. **Data Types**
   - Coordinates: decimal numbers
   - Prices: decimal numbers with 2 decimal places
   - Timestamps: ISO 8601 format
   - IDs: UUID format

3. **Required Fields**
   - All location objects must have latitude and longitude
   - All requests must include Authorization header
   - Status updates must include valid status values

---

## 🐛 Debugging Tips

1. **Check Server Logs**
   ```bash
   # In backend directory
   npm run dev
   # Watch console for error messages
   ```

2. **Validate JWT Token**
   ```bash
   # Decode JWT token at jwt.io
   # Check expiration time
   # Verify payload structure
   ```

3. **Database Queries**
   ```bash
   # Check database directly
   npx prisma studio
   ```

4. **Network Issues**
   ```bash
   # Test server connectivity
   curl -I http://localhost:3000/api/health
   ```

---

## 📊 Performance Testing

### Load Testing with Apache Bench

```bash
# Test driver status endpoint
ab -n 100 -c 10 -H "Authorization: Bearer <jwt_token>" \
   -H "Content-Type: application/json" \
   -p status.json \
   http://localhost:3000/api/driver/status

# Test location updates
ab -n 1000 -c 50 -H "Authorization: Bearer <jwt_token>" \
   -H "Content-Type: application/json" \
   -p location.json \
   http://localhost:3000/api/driver/location
```

### Stress Testing

```bash
# Test concurrent ride requests
for i in {1..50}; do
  curl -X POST http://localhost:3000/api/ride-requests \
    -H "Authorization: Bearer <jwt_token>" \
    -H "Content-Type: application/json" \
    -d '{
      "pickupLocation": {
        "latitude": 13.4432,
        "longitude": -16.5919,
        "address": "Test Location"
      },
      "destinationLocation": {
        "latitude": 13.4532,
        "longitude": -16.6019,
        "address": "Test Destination"
      }
    }' &
done
wait
``` 