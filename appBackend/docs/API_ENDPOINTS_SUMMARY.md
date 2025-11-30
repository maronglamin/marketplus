# Ride-Sharing API Endpoints - Quick Reference

## Base URL
```
https://api.cloudnexus.biz:3000/api
```

## Authentication
```
Authorization: Bearer <jwt_token>
```

---

## 🚗 Driver Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/driver/profile` | Get driver profile |
| `POST` | `/driver/status` | Update online/offline status |
| `POST` | `/driver/location` | Update driver location |
| `POST` | `/driver/smart-location` | Smart update driver location (throttled) |
| `GET` | `/driver/nearby-requests` | Get nearby ride requests |
| `POST` | `/driver/accept-request/{id}` | Accept ride request |
| `POST` | `/driver/reject-request/{id}` | Reject ride request |
| `GET` | `/driver/stats` | Get driver statistics |
| `GET` | `/driver/active-ride` | Get current active ride |
| `POST` | `/driver/ride/{id}/status` | Update ride status |
| `POST` | `/driver/ride/{id}/location` | Add ride location update |
| `POST` | `/driver/ride/{id}/rate` | Rate ride (driver → customer) |

---

## 🚖 Ride Request Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ride-requests` | Create ride request |
| `GET` | `/ride-requests/{id}` | Get ride request details |
| `GET` | `/ride-requests/customer/history` | Get customer ride history |
| `POST` | `/ride-requests/{id}/cancel` | Cancel ride request |
| `POST` | `/ride-requests/ride/{id}/status` | Update ride status (customer) |
| `POST` | `/ride-requests/ride/{id}/rate` | Rate ride (customer → driver) |

---

## 📊 Status Enums

### Ride Status
- `REQUESTED` - Request created, waiting for driver
- `ACCEPTED` - Driver accepted request
- `ARRIVING` - Driver en route to pickup
- `ARRIVED` - Driver arrived at pickup
- `IN_PROGRESS` - Ride in progress
- `COMPLETED` - Ride completed
- `CANCELLED` - Ride cancelled
- `EXPIRED` - Request expired

### Driver Status
- `OFFLINE` - Driver offline
- `ONLINE` - Driver online and available
- `BUSY` - Driver on a ride
- `SUSPENDED` - Driver suspended

### Ride Type
- `STANDARD` - Standard ride
- `PREMIUM` - Premium ride
- `POOL` - Shared ride
- `DELIVERY` - Delivery service

### Payment Method
- `CASH` - Cash payment
- `CARD` - Credit/Debit card
- `MOBILE_MONEY` - Mobile money
- `WALLET` - Digital wallet

---

## 🔑 Key Request Examples

### Create Ride Request
```json
POST /ride-requests
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
  "paymentMethod": "CASH"
}
```

### Update Driver Status
```json
POST /driver/status
{
  "isOnline": true,
  "location": {
    "latitude": 13.4432,
    "longitude": -16.5919,
    "address": "123 Main Street, Banjul, The Gambia"
  }
}
```

### Update Driver Location
```json
POST /driver/location
{
  "latitude": 13.4432,
  "longitude": -16.5919,
  "address": "Current Location"
}
```

### Smart Update Driver Location (Throttled)
```json
POST /driver/smart-location
{
  "location": {
    "latitude": 13.4432,
    "longitude": -16.5919,
    "address": "123 Main Street, Banjul, The Gambia"
  },
  "forceUpdate": false
}
```

### Accept Ride Request
```json
POST /driver/accept-request/{requestId}
```

### Rate Ride
```json
POST /driver/ride/{rideId}/rate
{
  "rating": 5,
  "review": "Great service!"
}
```

---

## 🔐 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/initiate-login` | Initiate login with phone number |
| `POST` | `/auth/verify-otp` | Verify OTP and complete login |
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login with PIN |
| `POST` | `/auth/logout` | Logout user (auto-sets driver status to offline) |
| `POST` | `/auth/change-pin` | Change user PIN |

---

## 📈 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

---

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 📝 Notes

- All endpoints require JWT authentication
- Location coordinates use decimal degrees
- Distances are in kilometers
- Durations are in minutes
- Prices are in decimal format (e.g., 15.50)
- Timestamps are in ISO 8601 format
- Request IDs are auto-generated with format: `RIDE_{timestamp}_{random}` 