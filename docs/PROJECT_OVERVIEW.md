# SNAP (Marketplus) — Project Overview

**Product name:** SNAP  
**Company:** CloudNexus  
**Document date:** 18 August 2026  
**Repos:**

| Repo | Path | Role |
|------|------|------|
| **marketplus** | `/Users/mac/cody/CloudNexus/marketplus` | Consumer mobile app, consumer web app, and public API |
| **snap-admin** | `/Users/mac/cody/CloudNexus/snap-admin` | Operator admin panel and admin API |

This document describes the SNAP marketplace as a whole: product verticals, architecture, how the two repos share data, provider/agent subscriptions, and store-release status.

Companion API references:

- [Consumer API](API.md) — `marketplus/appBackend`
- [Admin API](../../snap-admin/docs/ADMIN_API.md) — `snap-admin/backend`

---

## 1. What SNAP is

SNAP is a multi-sided marketplace for The Gambia. Consumers use one app (and a matching web client) to:

1. **Buy and sell products** (ecommerce, including principal businesses, branches, and sales reps)
2. **Book rides** (ride sharing with drivers, surge pricing, ride tokens)
3. **Rent vehicles** (driver-quoted rentals with in-app messaging)
4. **Book home and professional services** (plumbers, electricians, and other providers)
5. **Browse and book real estate** (hotels, apartments, guest houses, boat trips, home/land sales)

Operators use **snap-admin** to approve KYC, moderate listings, configure ride services, process settlements, and set subscription plans for service providers and property agents.

---

## 2. System map

```
┌─────────────────────┐     ┌──────────────────────┐
│  SNAP Mobile        │     │  SNAP Web            │
│  appFrontend        │     │  AppWebVersion       │
│  Expo / RN 0.79     │     │  React CRA :8000     │
│  iOS + Android      │     │  snap.cloudnexus.biz │
└──────────┬──────────┘     └──────────┬───────────┘
           │  JWT (consumer)           │
           └────────────┬──────────────┘
                        ▼
           ┌────────────────────────┐
           │  Consumer API          │
           │  appBackend :3000      │
           │  api.cloudnexus.biz    │
           └────────────┬───────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │  PostgreSQL `snap`     │  ← shared database
           └────────────┬───────────┘
                        ▲
           ┌────────────┴───────────┐
           │  Admin API             │
           │  snap-admin/backend    │
           │  :3001                 │
           └────────────┬───────────┘
                        │  JWT (admin + MFA)
                        ▼
           ┌────────────────────────┐
           │  SNAP Admin            │
           │  admin-panel Next.js   │
           │  snap-admin.cloudnexus.biz
           └────────────────────────┘
```

**Production URLs**

| Surface | URL |
|---------|-----|
| Consumer API | `https://api.cloudnexus.biz` |
| Consumer web | `https://snap.cloudnexus.biz` |
| Admin panel | `https://snap-admin.cloudnexus.biz` |

Consumer and admin APIs are **separate Express servers** with **separate JWT secrets and auth models**. They share one PostgreSQL database (`snap`). Schema changes must be kept in sync in both Prisma schemas. Do **not** run `prisma db push` from snap-admin if its schema is behind marketplus — that can drop columns.

---

## 3. Repositories and tech stack

### 3.1 marketplus

| Folder | Purpose |
|--------|---------|
| `appFrontend/` | React Native / Expo mobile app (iOS + Android) |
| `appBackend/` | Express + Prisma consumer API, Socket.IO, payment webhooks |
| `AppWebVersion/` | React (CRA) web client mirroring mobile features |
| `docs/` | Project documentation |
| `server/` | Optional LAN WebSocket discovery helper (port 3001) |

| Layer | Stack |
|-------|--------|
| Mobile | Expo SDK `~53.0.27`, React Native `0.79.6`, React `19.0.0`, React Navigation v7, Stripe RN `0.45.0` |
| Web | React `^18.2.0`, react-scripts `5.0.1`, react-router-dom `^6`, Tailwind CSS |
| Backend | Express `^4.18.2`, Prisma `5.22.0`, PostgreSQL, JWT, Twilio, Stripe, Firebase Admin (Android FCM), APNs (iOS), Socket.IO |

### 3.2 snap-admin

| Folder | Purpose |
|--------|---------|
| `admin-panel/` | Next.js 15 App Router operator UI |
| `backend/` | Express 5 + Prisma 6 admin API |
| `docs/` | Admin, RBAC, MFA, settlements, security |

| Layer | Stack |
|-------|--------|
| Admin UI | Next.js `15.4.11`, React `19.1.0`, TanStack Query, Zustand, Tailwind |
| Admin API | Express `^5.1.0`, Prisma `^6.14.0`, JWT (30m sliding), TOTP MFA (speakeasy) |

### 3.3 Local ports

| Service | Port |
|---------|------|
| Consumer API (`appBackend`) | **3000** |
| Consumer web (`AppWebVersion`) | **8000** |
| Expo Metro (`appFrontend`) | **8081** |
| Admin API (`snap-admin/backend`) | **3001** |
| Admin UI (`snap-admin/admin-panel`) | **3000** (Next.js default; do not run alongside consumer API on the same host without changing a port) |
| PostgreSQL | **5432** |

---

## 4. Product verticals

### 4.1 Ecommerce

Consumers browse products, express interest, chat with sellers, and place orders. Sellers complete KYC, list products, set delivery options, and request settlements. Principal businesses can have branches and sales reps.

**Consumer API prefixes:** `/api/products`, `/api/orders`, `/api/seller-kyc`, `/api/sales-reps`, `/api/branches`, `/api/delivery-addresses`

**Admin:** SNAP Users, Sellers KYC, Products, Categories, Orders, Principal Business, Sales Outlets, Settlements.

### 4.2 SNAP Ride

Customers request rides; verified drivers go online, accept nearby requests, and complete trips. Fares use configured ride services plus optional surge. Ride tokens confirm start/complete.

**Consumer API prefixes:** `/api/ride-requests`, `/api/ride-services`, `/api/ride-history`, `/api/driver`, `/api/rider`

**Admin:** Driver KYC, Driver Management, Ride Journal, Ride Service, Ride Service Tiers, Ride Analytics.

### 4.3 SNAP Rental

Customers request a vehicle rental; the driver quotes a price; the customer accepts and pays. In-app messaging is on `/api/rental-messages`.

**Consumer API prefixes:** `/api/rentals`, `/api/rental-requests` (alias), `/api/rental-messages`

**Admin:** SNAP Rental → Request journal.

### 4.4 SNAP Home / Professional Services

Users apply to become providers. Admin approves the application. After approval the provider can create offerings, set a schedule, and receive bookings. A **subscription** may be required (see §6).

**Consumer API prefixes:** `/api/service-providers`, `/api/service-bookings`, `/api/provider-subscriptions`

**Admin:** Provider Applications, Providers, Service Bookings, Service Categories, Subscription Plans.

### 4.5 SNAP Real Estate

Users apply to become property agents (KYC-heavy). Admin approves. Agents list properties (`HOTEL`, `APARTMENT_RENTAL`, `GUEST_HOUSE`, `BOAT_TRIP`, `HOME_SALE`, `LAND_SALE`) and handle inquiries and reservations. A **subscription** may be required (see §6).

**Consumer API prefixes:** `/api/property-agents`, `/api/property-listings`, `/api/property-bookings`, `/api/provider-subscriptions`

**Admin:** Agent Applications, Property Agents, Property Listings, Property Bookings, Subscription Plans.

---

## 5. Authentication and identity

### 5.1 Consumers (marketplus)

Phone OTP via Twilio → PIN setup / PIN login → JWT bearer token (`Authorization: Bearer …`). Default JWT lifetime is **7 days**.

Web clients use `/api/auth/login-web` and `/api/auth/check-user` (no device metadata required). Mobile uses `/api/auth/initiate-login`, `/verify-otp`, `/register`, `/login`.

Approvals for drivers, sellers (KYC), service providers, and property agents are **admin-only**. Consumer approve endpoints return **403**.

### 5.2 Operators (snap-admin)

Username/email + password → mandatory TOTP MFA (or backup code) → JWT. Default lifetime is **30 minutes**, renewed via `x-token` on each authenticated request.

RBAC: `Admin` → `OperatorEntity` → `Role` → `RolePermission` with actions `ADD`, `EDIT`, `VIEW`, `DELETE`, `EXPORT` over ~51 `EntityType` values.

---

## 6. Provider and agent subscriptions

Home/professional providers and real-estate agents can be billed a recurring platform fee. Plans and settings are configured in snap-admin; payments happen in the consumer app.

### 6.1 Behaviour

1. Admin **approves** a provider or agent application.
2. A subscription in status **`GRACE`** is created immediately. The person can operate during the grace period (default **7 days**, configurable).
3. They pick a plan (**MONTHLY / QUARTERLY / SEMI_ANNUAL / YEARLY**) and pay via Wave, Yonna Forex, Stripe, or a test method in development.
4. Successful payment moves the subscription to **`ACTIVE`**.
5. If unpaid after grace, status becomes **`PAST_DUE`** then **`SUSPENDED`**. Suspended profiles are hidden from public lists and cannot take new work.
6. Admin `isActive` on the provider/agent profile is a **manual visibility switch**, independent of billing status.

Verticals are stored as `HOME_SERVICES` and `REAL_ESTATE`. Settings (`isRequired`, `gracePeriodDays`) and plans are per vertical.

An hourly job on the consumer API backfills missing GRACE rows and expires unpaid subscriptions.

### 6.2 Where it is configured

| Surface | Location |
|---------|----------|
| Admin UI | SNAP Home Services → Subscription Plans; SNAP Real Estate → Subscription Plans |
| Admin API | `/api/home-services/subscription-settings`, `/subscription-plans`; same under `/api/real-estate/` |
| Consumer pay | Mobile: `ProviderSubscriptionPay`, `AgentSubscriptionPay`; Web: `/home-services/subscription`, `/real-estate/subscription` |
| Consumer API | `GET /api/provider-subscriptions/plans`, `GET /me`, `POST /pay` |

---

## 7. Payments and settlements

### 7.1 Payment gateways

| Gateway | Consumer prefix | Notes |
|---------|-----------------|-------|
| **Stripe** | `/api/payments` | Cards / Google Pay |
| **Yonna Forex** | `/api/payments/yonna-forex` | Local rails; webhook `POST …/webhook` |
| **Wave Gambia** | `/api/payments/wave-gambia` | Checkout sessions; webhook `POST …/webhook` |
| **Test** | `paymentMethodId: test-payment` or `simulate` | Enabled in development unless `ALLOW_TEST_PAYMENTS=false` |

Saved payment methods live at `/api/payment-methods`. Gateway metadata is configurable in admin (`SYSTEM_CONFIG_PAYMENT_GATEWAYS`).

### 7.2 Settlements

Earners (sellers, drivers, rental drivers, providers, agents) request payouts to a bank account or wallet.

**Consumer:** `/api/settlements` (available revenue by vertical, bank/wallet CRUD, request, history). Drivers also have `/api/driver/settlements`.

**Admin:** Settlement Request, Settlement Sheet, Cumulative Entries, Settlement Group.

---

## 8. Store release status

### 8.1 Android — submitted to Google Play Open Testing

Android builds of SNAP **have been submitted to Google Play Store Open Testing** (internal/open test track, not production). Testers with access can install from the Play Store Open Testing track.

| Field | Value |
|-------|-------|
| Play / display name | **SNAP** |
| Application ID / package | `biz.cloudnexus.snap.app` |
| Current `versionName` in repo | **1.0.6** (`appFrontend/app.config.ts`, `android/app/build.gradle`) |
| Current `versionCode` in repo | **20** |
| npm `package.json` version | `1.0.2` (lags native; do not use as the store version) |
| Artifact | Android App Bundle (`.aab`) |
| Signing | Play App Signing; local **upload key** (`upload-keystore.jks`, alias `upload`) |
| Min / target SDK | minSdk **24**, compile/target **35** |
| NDK | **27.1.12297006** (16 KB page-size alignment required by Play) |
| EAS project ID | `04ad20e1-cff1-4422-a7b3-bdb123420968` |

**How a release AAB is produced** (from `appFrontend`):

```bash
npm run android:bundle
# or: cd android && NODE_ENV=production ./gradlew clean :app:bundleRelease
```

Output: `appFrontend/android/app/build/outputs/bundle/release/app-release.aab`

Upload-key reset procedure (new machine / lost key): `appFrontend/PLAYSTORE_UPLOAD_KEY_RESET.md`.

### 8.2 iOS — App Store build is **not ready**

An App Store / TestFlight build is **not ready** on the current development MacBook.

**Reason:** SNAP already has an Apple Developer account, App ID, and signing credentials. Those **existing Apple Developer credentials and certification keys must be installed on this new MacBook** before a signed iOS archive can be produced. Until the certificates, provisioning profiles, and (if used) `.p8` APNs key are available locally, Xcode / EAS cannot sign a store build.

| Field | Value (when signing is restored) |
|-------|----------------------------------|
| Bundle identifier | `biz.cloudnexus.snap.app` |
| Current `buildNumber` in repo | **16** |
| Display name | SNAP |
| APNs bundle ID (backend) | `biz.cloudnexus.snap.app` |

**To unblock iOS store builds**

1. Export the existing distribution certificate + private key (or download from Apple Developer after restoring access) and install them in Keychain on this MacBook.
2. Install the App Store / Ad Hoc provisioning profile for `biz.cloudnexus.snap.app`.
3. Copy the APNs Auth Key (`.p8`) used by `appBackend` (`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`) if it is not already on this machine.
4. Confirm Xcode signs with the same team that owns the App ID.
5. Then archive and submit to TestFlight / App Store.

Do **not** create a new App ID or a second Apple Developer account for SNAP; reuse the existing credentials.

---

## 9. Environment variables (summary)

### 9.1 Consumer API (`appBackend/.env`)

Required for startup: `DATABASE_URL`, `JWT_SECRET` (≥32 chars), `PORT`.

Also used in production: Twilio, Stripe, Firebase (Android push), APNs (iOS push), VAPID (web push), Yonna Forex, Wave, `PUBLIC_BASE_URL` / `API_BASE_URL`, CORS, optional app-version gates (`APP_VERSION_LATEST_*`, store URLs).

### 9.2 Mobile (`appFrontend`)

`EXPO_PUBLIC_API_URL` (default `https://api.cloudnexus.biz`), `EXPO_PUBLIC_ALLOW_TEST_PAYMENTS`. Maps / Stripe publishable keys are in `app.config.ts` extras.

### 9.3 Admin API (`snap-admin/backend/.env`)

`DATABASE_URL` (same `snap` database), `PORT=3001`, `JWT_SECRET`, `JWT_EXPIRES_IN`, CORS, `IMAGE_SERVER_URL`.

### 9.4 Admin UI (`admin-panel/.env.local`)

`NEXT_PUBLIC_API_URL=http://localhost:3001/api` (must include `/api`).

---

## 10. Division of responsibility

| Concern | marketplus | snap-admin |
|---------|------------|------------|
| Consumer login, OTP, PIN | Yes | No |
| Admin login + MFA | No | Yes |
| Apply as provider / agent / driver / seller | Yes | No |
| Approve / reject applications | No (403) | Yes |
| Public browse, book, pay | Yes | No |
| Subscription plan config | No | Yes |
| Subscription payment | Yes | View payment history only |
| Settlement **request** | Yes | Review / process |
| Ride service / surge config | Limited | Yes |
| Product / listing moderation | Seller self-serve | Admin status / KYC |

---

## 11. Related docs in this repo

| Doc | Topic |
|-----|--------|
| [API.md](API.md) | Full consumer API catalog |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local startup |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Older architecture notes (ecommerce-era) |
| [FUNCTIONAL.md](FUNCTIONAL.md) | Functional specs |
| [BUSINESS.md](BUSINESS.md) | Business model |
| [YONNA_FOREX_INTEGRATION.md](YONNA_FOREX_INTEGRATION.md) | Yonna payments |
| [RIDE_SHARING_API_ENDPOINTS.md](RIDE_SHARING_API_ENDPOINTS.md) | Ride API (historical) |
| [SURGE_PRICING_OVERVIEW.md](SURGE_PRICING_OVERVIEW.md) | Surge pricing |
| `appFrontend/PLAYSTORE_UPLOAD_KEY_RESET.md` | Play upload key reset |
