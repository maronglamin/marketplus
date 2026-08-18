# SNAP Consumer API

**Server:** `marketplus/appBackend`  
**Base URL (production):** `https://api.cloudnexus.biz`  
**Base URL (local):** `http://localhost:3000`  
**JSON prefix:** `/api`  
**Auth:** `Authorization: Bearer <consumer JWT>` unless marked public  
**Health:** `GET /api/health` → `{ status, timestamp, uptime }`

This is the public/consumer API used by the SNAP mobile app and web client. Operator endpoints live in [snap-admin Admin API](../../snap-admin/docs/ADMIN_API.md).

Typical success envelope: `{ success: true, data: … }`. Errors: `{ success: false, message: … }` or `{ error: … }` with the appropriate HTTP status.

---

## Conventions

| Item | Detail |
|------|--------|
| Content-Type | `application/json` (multipart for uploads) |
| Auth header | `Authorization: Bearer <token>` |
| Consumer JWT TTL | 7 days (`JWT_EXPIRES_IN`) |
| Webhooks | No consumer JWT; verified with gateway secrets |
| Duplicate mounts | Some routers are mounted both on `app.ts` and nested under `/api` via `routes/index.ts`. Both stacks are active. |

**Static / non-JSON**

| Method | Path | Notes |
|--------|------|--------|
| GET | `/uploads/*` | Uploaded files |
| GET | `/public/*` | Static assets |
| GET | `/payments/wave/success` | Wave redirect landing |
| GET | `/payments/wave/error` | Wave redirect landing |

---

## Auth — `/api/auth`

Public unless noted.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/send-sms` | | Test SMS |
| POST | `/initiate-login` | | Start phone OTP login |
| POST | `/verify-otp` | | Verify OTP; register if new |
| POST | `/register` | | Complete registration |
| POST | `/login` | | PIN login (mobile; device info) |
| POST | `/request-new-pin` | | Request PIN reset OTP |
| POST | `/check-user` | | Web: does phone exist |
| POST | `/login-web` | | Web PIN login (no device) |
| POST | `/resend-otp` | | Resend OTP |
| POST | `/logout` | JWT | Invalidate session |
| POST | `/change-pin` | JWT | Change PIN |
| POST | `/complete-pin-reset` | JWT | Finish PIN reset |

---

## Users — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/test` | | Ping |
| GET | `/me` | JWT | Current user |
| GET | `/profile` | JWT | Profile |
| GET | `/deletion-eligibility` | JWT | Account deletion checks |
| POST | `/terminate` | JWT | Request account termination |
| POST | `/profile/photo` | JWT | Upload profile photo (multipart) |
| DELETE | `/profile/photo` | JWT | Remove profile photo |
| POST | `/fcm-token` | JWT | Register Android FCM token |
| DELETE | `/fcm-token` | JWT | Remove FCM token |
| GET | `/web-push/public-key` | | VAPID public key |

---

## Ecommerce — products, orders, KYC, sales, branches

### `/api/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | | Product categories |
| GET | `/featured` | optional | Featured products |
| GET | `/popular` | optional | Popular products |
| GET | `/customer` | optional | Customer catalog |
| GET | `/seller` | JWT | Seller’s listings |
| GET | `/seller/stats` | JWT | Seller stats |
| GET | `/seller/revenue` | JWT | Seller revenue |
| GET | `/seller/:productId` | JWT | Seller product detail |
| GET | `/:productId` | optional | Public product detail |
| POST | `/` | JWT | Create product |
| PATCH | `/:productId` | JWT | Update product |
| POST | `/:productId/view` | JWT | Record view |
| POST | `/:productId/interest` | JWT | Express interest |
| GET | `/:productId/interest/check` | JWT | Has interest |
| POST | `/:productId/order` | JWT | Order from product |
| GET | `/:productId/delivery-options` | | Delivery options |
| POST | `/:productId/delivery-options` | JWT | Add delivery option |
| DELETE | `/:productId/delivery-options/:optionId` | JWT | Remove option |
| GET | `/interests/user` | JWT | Interests as seller |
| GET | `/interests/chat-list` | JWT | Interest chats |
| GET | `/interests/customer` | JWT | Interests as customer |
| GET | `/interests/:interestId` | JWT | Interest thread |
| PATCH | `/interests/:interestId/status` | JWT | Update interest status |
| POST | `/interests/:interestId/messages` | JWT | Send interest message |

### `/api/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Create order |
| GET | `/my-orders` | JWT | Seller orders |
| GET | `/customer-orders` | JWT | Customer orders |
| GET | `/:orderId` | JWT | Order detail |
| PATCH | `/:orderId/status` | JWT | Update status |
| PATCH | `/:orderId/delivery-pricing` | JWT | Delivery price |
| PATCH | `/:orderId/authorize` | JWT | Authorize order |
| PATCH | `/:orderId/product-price` | JWT | Adjust product price |
| PATCH | `/:orderId/discount` | JWT | Apply discount |
| GET | `/product/:productId/count` | JWT | Order count for product |
| GET | `/seller/transaction/:transactionId` | JWT | Seller transaction |
| GET | `/seller/transactions/:currency` | JWT | Seller txs by currency |
| GET | `/sales-rep-orders/:salesRepId` | JWT | Sales-rep orders |

### `/api/seller-kyc`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | Own KYC |
| GET | `/by-user/:userId` | JWT | KYC by user |
| POST | `/submit` | JWT | Submit KYC |

### `/api/sales-reps`

CRUD plus `GET /:salesRepId/stats`, `GET /:salesRepId/analytics`, `GET /analytics/parent`, `GET /activity/recent`, settlement `POST /settlement/request`, `GET /settlement/history`, `GET /settlement/:settlementId`, `PUT /settlement/:settlementId/cancel`.

### `/api/branches`

`GET /`, `GET /:branchId`, `POST /`, `PUT /:branchId`, `DELETE /:branchId`, `GET /:branchId/stats`.

### `/api/delivery-addresses`

`GET /`, `POST /`, `PUT /:addressId`, `DELETE /:addressId`, `PATCH /:addressId/default`.

---

## Payments

### Stripe — `/api/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-payment-intent` | JWT | Create PaymentIntent |
| POST | `/confirm-payment` | JWT | Confirm |
| POST | `/create-payment-method` | JWT | Create method |
| POST | `/attach-payment-method` | JWT | Attach to customer |
| GET | `/customer/:customerId/payment-methods` | JWT | List methods |
| DELETE | `/payment-method/:paymentMethodId` | JWT | Detach |
| GET | `/payment-intent/:paymentIntentId` | JWT | Intent status |
| POST | `/payment-success` | JWT | Mark Stripe success |
| POST | `/bulk-payment-success` | JWT | Bulk Stripe success |
| POST | `/bulk-external-success` | JWT | Bulk external success |
| POST | `/external-success` | JWT | Single external success |

Yonna routes are also nested under `/api/payments` in addition to the dedicated prefix below.

### Yonna Forex — `/api/payments/yonna-forex`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/process` | JWT | Start Yonna payment |
| POST | `/verify` | JWT | Verify |
| GET | `/status/:transactionId` | JWT | Status |
| GET | `/currencies` | | Supported currencies |
| GET | `/check-transactions/:orderId` | JWT | Txns for order |
| POST | `/webhook` | secret | Gateway webhook |
| GET | `/webhook/status` | | Webhook debug |
| POST/GET | `/test-webhook` | | Dev-only test |

### Wave Gambia — `/api/payments/wave-gambia`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/process` | JWT | Create Wave checkout |
| GET | `/sessions/:id` | JWT | Session |
| POST | `/sessions/:id/expire` | JWT | Expire session |
| POST | `/sessions/:id/refund` | JWT | Refund |
| GET | `/currencies` | | Currencies |
| GET | `/check-transactions/:orderId` | JWT | Txns for order |
| POST | `/webhook` | secret | Gateway webhook (raw body) |

### Saved methods — `/api/payment-methods`

`GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` (JWT).

### Gateway catalog — `/api/payment-gateway-service-providers`

CRUD for which gateways are offered in-app.

---

## Settlements — `/api/settlements`

All JWT.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/available-revenue` | Ecommerce available |
| GET | `/available-ride-earnings` | Ride earnings |
| GET | `/available-rental-earnings` | Rental earnings |
| GET | `/available-home-service-earnings` | Home-service earnings |
| GET | `/available-real-estate-earnings` | Real-estate earnings |
| GET | `/bank-accounts` | Bank accounts |
| POST | `/bank-accounts` | Add bank account |
| GET | `/wallets` | Wallets |
| POST | `/wallets` | Add wallet |
| POST | `/request` | Create settlement request |
| POST | `/request/sales-rep/:salesRepId` | Request as sales rep |
| GET | `/history` | History |
| GET | `/:settlementId` | Detail |

---

## Uploads and notifications

### `/api/upload`

`POST /` — authenticated file upload.

### `/api/rider-upload`

`POST /`, `POST /multiple`, `DELETE /:filename` — rider/driver KYC images.

### `/api/notifications`

`GET /web-push/public-key`, `POST /fcm-token`, `DELETE /fcm-token`, `GET /fcm-tokens/:userId`, `POST /test`.

### `/api/twilio`

`POST /status-callback` — Twilio delivery receipts.

---

## Ride sharing

### Rider applications — `/api/rider`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/applications` | JWT | Apply as driver |
| GET | `/applications` | JWT | Own applications |
| GET | `/applications/:id` | JWT | Detail |
| GET | `/applications/check/existing` | JWT | Existing application |
| POST | `/applications/:applicationId/documents` | JWT | Add document |
| DELETE | `/documents/:documentId` | JWT | Remove document |

Admin approval is in snap-admin, not here.

### Driver — `/api/driver`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/location/update` | JWT | Update location |
| GET | `/location/current` | JWT | Current location |
| GET | `/rides/history` | JWT | Driver ride history |
| GET | `/rides/active` | JWT | Active ride |
| PUT / POST | `/status` | JWT | Online / offline |
| GET | `/profile` | JWT | Driver profile |
| GET | `/:driverId/vehicle-images` | | Vehicle images |
| GET | `/user/:userId/vehicle-images` | | Images by user |
| GET | `/rental/:serviceId/available` | | Available rental drivers |
| GET | `/rental/:serviceId` | | Rental drivers for service |
| GET | `/rental/verified` | | Verified rental drivers |
| GET | `/stats` | JWT | Stats |
| GET | `/earnings` | JWT | Earnings |
| GET | `/settlements/available` | JWT | Available to settle |
| GET | `/settlements` | JWT | Settlement list |
| GET | `/settlements/:settlementId` | JWT | Settlement detail |
| POST | `/settlements/request` | JWT | Request payout |

### Ride services — `/api/ride-services`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | | Active services |
| GET | `/rental` | | Rental services |
| GET | `/with-online-drivers` | | Services with online drivers |
| GET | `/surge-multiplier` | | Current surge |
| GET | `/time-status` | | Time-of-day status |
| POST | `/calculate-fare` | | Quote fare |
| GET | `/default/:vehicleType` | | Default service |
| GET | `/:serviceId` | | Service detail |
| POST | `/` | JWT | Create service (limited) |

### Ride requests — `/api/ride-requests`

Mounted twice (`rideRequest.ts` and `rideRequests.ts`). Combined surface:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Create request |
| GET | `/customer/active` | JWT | Active customer requests |
| GET | `/customer/all` | JWT | All customer requests |
| GET | `/customer/history` | JWT | History |
| GET | `/nearby-drivers` | | Nearby drivers |
| GET | `/nearby-requests` | | Nearby open requests |
| GET | `/online-drivers/map` | | Map pins |
| GET | `/:requestId` | JWT | Detail |
| POST | `/:requestId/cancel` | JWT | Cancel |
| POST | `/:requestId/accept` | JWT | Driver accept |
| POST | `/:requestId/process-payment` | JWT | Pay for ride |
| POST | `/:requestId/rate` | JWT | Rate |
| POST | `/direct-driver` | JWT | Request a specific driver |

### Ride history — `/api/ride-history`

All JWT: `GET /driver`, `GET /customer`, `GET /customer/recent-destinations`, `POST /rides/:rideId/generate-token`, `GET /customer/active-tokens`, `POST /rides/:rideId/start`, `GET /rides/:rideId`, `POST /rides/:rideId/complete`, `POST /rides/:rideId/cancel`.

---

## Vehicle rentals

### `/api/rentals` and `/api/rental-requests` (same router)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Create rental request |
| PATCH | `/:rentalId/accept` | JWT | Driver accept |
| PATCH | `/:rentalId/reject` | JWT | Driver reject |
| PATCH | `/:rentalId/quote` | JWT | Driver quote |
| PATCH | `/:rentalId/update-agreed-price` | JWT | Update agreed price |
| GET | `/customer/:customerId` | JWT | Customer list |
| GET | `/driver/me` | JWT | Driver’s rentals |
| GET | `/:rentalId` | JWT | Detail |
| PATCH | `/:rentalId/customer/accept` | JWT | Customer accept quote |
| PATCH | `/:rentalId/customer/reject` | JWT | Customer reject quote |
| GET | `/:rentalId/payment-status` | JWT | Payment status |
| POST | `/:rentalId/payment` | JWT | Pay |

### `/api/rental-messages`

`POST /:rentalId/messages`, `GET /:rentalId/messages`, `PATCH /:rentalId/messages/read`, `GET /:rentalId/messages/unread`, `GET /notifications/all`.

---

## Home / professional services

Public lists and bookings hide providers whose subscription is required but not in `GRACE | ACTIVE | PAST_DUE`.

### `/api/service-providers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | | Public provider list |
| GET | `/:id` | | Public profile |
| GET | `/:id/available-slots` | | Availability |
| POST | `/apply` | JWT | Apply (PENDING) |
| GET | `/application/me` | JWT | Own application + profile |
| PATCH | `/profile` | JWT | Update provider profile |
| POST | `/applications/:id/approve` | JWT | **Disabled (403)** — use snap-admin |
| GET | `/offerings/mine` | JWT | Own offerings |
| POST | `/offerings` | JWT | Create offering |
| PATCH | `/offerings/:offeringId` | JWT | Update offering |
| DELETE | `/offerings/:offeringId` | JWT | Delete offering |
| GET | `/schedule/mine` | JWT | Weekly schedule |
| PUT | `/schedule` | JWT | Set schedule |
| GET | `/blocked-slots/mine` | JWT | Blocked slots |
| POST | `/blocked-slots` | JWT | Block a slot |
| DELETE | `/blocked-slots/:id` | JWT | Unblock |

### `/api/service-bookings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | | Service categories |
| POST | `/` | JWT | Create booking |
| GET | `/mine` | JWT | Customer bookings |
| GET | `/provider/mine` | JWT | Provider bookings |
| GET | `/:id` | JWT | Detail |
| PATCH | `/:id/quote` | JWT | Provider quote |
| PATCH | `/:id/accept` | JWT | Accept |
| PATCH | `/:id/reject` | JWT | Reject |
| PATCH | `/:id/complete` | JWT | Complete |
| GET | `/:id/messages` | JWT | Thread |
| POST | `/:id/messages` | JWT | Send message |
| POST | `/:id/payment` | JWT | Pay |

---

## Real estate

### `/api/property-agents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/apply` | JWT | Apply (KYC documents required) |
| GET | `/application/me` | JWT | Own application |
| POST | `/applications/:id/approve` | JWT | **Disabled (403)** — use snap-admin |

### `/api/property-listings`

Listing types: `HOTEL`, `APARTMENT_RENTAL`, `GUEST_HOUSE`, `BOAT_TRIP`, `HOME_SALE`, `LAND_SALE`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search` | | Search |
| GET | `/featured` | | Featured |
| GET | `/` | | Browse |
| GET | `/agent/mine` | JWT | Agent’s listings |
| GET | `/:id` | | Detail |
| GET | `/:id/availability` | | Availability |
| POST | `/` | JWT | Create |
| PATCH | `/:id` | JWT | Update |
| POST | `/:id/publish` | JWT | Publish |
| DELETE | `/:id` | JWT | Delete |
| GET | `/:id/room-types` | | Room types |
| POST | `/:id/room-types` | JWT | Add room type |
| PATCH | `/:id/room-types/:roomTypeId` | JWT | Update room type |
| DELETE | `/:id/room-types/:roomTypeId` | JWT | Delete room type |
| GET | `/:id/blocked-dates` | JWT | Blocked dates |
| POST | `/:id/blocked-dates` | JWT | Block dates |
| DELETE | `/:id/blocked-dates/:blockId` | JWT | Unblock |

### `/api/property-bookings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/inquiries` | JWT | Create inquiry |
| GET | `/inquiries/mine` | JWT | My inquiries |
| GET | `/inquiries/:id` | JWT | Inquiry detail |
| PATCH | `/inquiries/:id/status` | JWT | Update inquiry |
| POST | `/inquiries/:id/payment` | JWT | Pay inquiry fee |
| GET | `/agent/mine` | JWT | Agent inbox (inquiries + reservations) |
| POST | `/` | JWT | Create reservation |
| GET | `/mine` | JWT | My reservations |
| GET | `/:id` | JWT | Reservation detail |
| PATCH | `/:id/status` | JWT | Update reservation |
| POST | `/:id/payment` | JWT | Pay reservation |

---

## Provider / agent subscriptions — `/api/provider-subscriptions`

All JWT. `vertical` query must be `HOME_SERVICES` or `REAL_ESTATE`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/plans?vertical=` | Active plans for the vertical |
| GET | `/me?vertical=` | Snapshot: settings, subscription status, grace remaining |
| POST | `/pay` | Start / complete payment for a plan |

**`POST /pay` body**

```json
{
  "planId": "<uuid>",
  "paymentMethodId": "wave | yonna | stripe | test-payment | simulate",
  "paymentIntentId": "<optional Stripe PI>"
}
```

Caller must already be an approved `ServiceProvider` or `PropertyAgent` for that vertical. Test methods require `NODE_ENV=development` or `ALLOW_TEST_PAYMENTS=true`.

Wave/Yonna/Stripe webhooks call `activateFromPayment` when the gateway reports success (`TransactionType.SUBSCRIPTION`).

---

## App version — `/api/app`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/version` | | Latest / min supported iOS & Android, store URLs, mandatory flag |

Values come from `APP_VERSION_*` and `APP_STORE_URL_*` env vars.

---

## Realtime

Socket.IO runs on the same consumer API process (port 3000). Clients use it for ride location, rental/service chat, and similar live updates. Consumer JWT is required to join authenticated rooms.

---

## Error notes

| Status | Typical meaning |
|--------|-----------------|
| 400 | Validation (missing `vertical`, `planId`, etc.) |
| 401 | Missing or expired consumer JWT |
| 403 | Not a provider/agent; test payments disabled; consumer approve endpoints |
| 404 | Plan, booking, or listing not found |
| 429 | Rate limit |
| 500 | Unhandled server error |

Provider/agent **approvals, plan CRUD, and settlement processing** are not on this API. Use snap-admin.
