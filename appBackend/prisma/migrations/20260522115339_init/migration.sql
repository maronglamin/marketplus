-- CreateEnum
CREATE TYPE "RentalRequestStatus" AS ENUM ('PENDING_QUOTE', 'QUOTED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'PAID');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('CUSTOMER', 'DRIVER');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'MANAGER', 'SUPPORT');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('ADD', 'EDIT', 'VIEW', 'DELETE', 'EXPORT');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('DASHBOARD', 'USERS', 'USERS_SNAP_USERS', 'USERS_KYC_APPROVAL', 'PRODUCTS', 'PRODUCTS_CATEGORIES', 'ORDERS', 'SETTLEMENTS', 'SETTLEMENTS_REQUESTS', 'SETTLEMENTS_SHEET', 'SETTLEMENTS_CUMULATIVE_ENTRIES', 'JOURNALS', 'JOURNALS_STRIPE_PAYMENT_REPORT', 'JOURNALS_SNAP_FEE_REPORT', 'JOURNALS_AUDIT_REPORT', 'SYSTEM_CONFIG', 'SYSTEM_CONFIG_ROLES', 'SYSTEM_CONFIG_OPERATOR_ENTITY', 'SYSTEM_CONFIG_SYSTEM_OPERATOR', 'SYSTEM_CONFIG_SETTLEMENT_GROUP', 'SYSTEM_CONFIG_PAYMENT_GATEWAYS', 'ECOMMERCE', 'ECOMMERCE_SALES_OUTLETS', 'ECOMMERCE_BRANCH_DETAILS', 'ECOMMERCE_PRINCIPAL_BUSINESS', 'SNAP_RIDE', 'SNAP_RIDE_RIDER_APPLICATIONS', 'SNAP_RIDE_DRIVER_MANAGEMENT', 'SNAP_RIDE_RIDE_MANAGEMENT', 'SNAP_RIDE_ANALYTICS', 'SNAP_RIDE_RIDE_SERVICE', 'SNAP_RIDE_RIDE_SERVICE_TIERS', 'SNAP_RENTAL', 'SNAP_RENTAL_REQUEST', 'ANALYTICS', 'ANALYTICS_REVENUE', 'AUTHENTICATION', 'AUTHENTICATION_DEVICE_AUTHENTICATION');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'EXCELLENT', 'VERY_GOOD', 'REFURBISHED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SOLD', 'PENDING');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('INDIVIDUAL', 'SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'CORPORATION', 'LLC');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE', 'BUSINESS_REGISTRATION', 'TAX_CERTIFICATE', 'CAR_INTERIOR_PHOTO', 'CAR_EXTERIOR_PHOTO');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLOCKED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('CRYPTO', 'MOBILE_MONEY', 'DIGITAL_WALLET');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_MONEY', 'CRYPTO', 'DIGITAL_WALLET');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('BANK_TRANSFER', 'WALLET_TRANSFER', 'ECOMMERCE', 'RIDES');

-- CreateEnum
CREATE TYPE "SettlementChannel" AS ENUM ('ECOMMERCE', 'RIDES', 'RENTALS');

-- CreateEnum
CREATE TYPE "OrderInterestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED_TO_ORDER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED', 'SETTLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'COMPLETED', 'AUTHORIZED');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('STANDARD', 'EXPRESS', 'SAME_DAY', 'NEXT_DAY', 'PICKUP', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('ORIGINAL', 'FEE', 'SERVICE_FEE');

-- CreateEnum
CREATE TYPE "RiderVehicleType" AS ENUM ('DRIVER', 'MOTORCYCLE', 'BICYCLE');

-- CreateEnum
CREATE TYPE "RiderApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'ARRIVING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('OFFLINE', 'ONLINE', 'BUSY', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RideType" AS ENUM ('STANDARD', 'PREMIUM', 'POOL', 'DELIVERY');

-- CreateEnum
CREATE TYPE "RidePaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE_MONEY', 'WALLET');

-- CreateEnum
CREATE TYPE "DistanceUnit" AS ENUM ('KILOMETER', 'MILE', 'METER');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AppService" AS ENUM ('ECOMMERCE', 'RIDES', 'RENTAL');

-- CreateEnum
CREATE TYPE "TwilioMessageType" AS ENUM ('OTP', 'PIN', 'COMBINED', 'OTHER');

-- CreateEnum
CREATE TYPE "SalesRepStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
    "mfaBackupCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "operatorEntityId" TEXT NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "permission" "Permission" NOT NULL,
    "isGranted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "operator_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "pin" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DeliveryAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGatewayServiceProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "PaymentGatewayServiceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "osVersion" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "lastLogoutAt" TIMESTAMP(3),

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTP" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "originalCode" TEXT,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "categoryId" TEXT,
    "condition" "ProductCondition" NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT true,
    "featuredUntil" TIMESTAMP(3),
    "metadata" JSONB,
    "salesRepId" TEXT,
    "branchId" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER,
    "format" TEXT,
    "altText" TEXT,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdBy" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "region" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unit" TEXT,
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTranslation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDeliveryOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "deliveryType" "DeliveryType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "estimatedDays" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDeliveryOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerKyc" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "country" TEXT[],
    "documentExpiryDate" TIMESTAMP(3),
    "statusChangedBy" TEXT,
    "statusChangedAt" TIMESTAMP(3),

    CONSTRAINT "SellerKyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "sellerKycId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "branchCode" TEXT,
    "swiftCode" TEXT,
    "iban" TEXT,
    "currency" VARCHAR(3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "sellerKycId" TEXT NOT NULL,
    "walletType" "WalletType" NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "account" TEXT NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "provider" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "type" "SettlementType" NOT NULL,
    "reference" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "walletId" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "includedOrderIds" JSONB,
    "netAmountBeforeFees" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviceFeesDeducted" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "channel" "SettlementChannel" NOT NULL DEFAULT 'ECOMMERCE',
    "includedRideIds" JSONB,
    "totalRidesCount" INTEGER NOT NULL DEFAULT 0,
    "includedRentalIds" JSONB,
    "totalRentalsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_views" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_order_interests" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "originalPrice" DECIMAL(10,2) NOT NULL,
    "discountPrice" DECIMAL(10,2),
    "currencyCode" VARCHAR(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "OrderInterestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "preferredDeliveryDate" TIMESTAMP(3),
    "deliveryAddress" TEXT,
    "contactPhone" TEXT,
    "paymentMethod" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "product_order_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productSnapshot" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalTransaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "customerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "gatewayProvider" TEXT NOT NULL,
    "gatewayTransactionId" TEXT,
    "paymentReference" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "gatewayChargeFees" DECIMAL(10,2),
    "paidThroughGateway" BOOLEAN NOT NULL DEFAULT false,
    "gatewayResponse" JSONB,
    "gatewayRequest" JSONB,
    "status" "TransactionStatus" NOT NULL,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appTransactionId" TEXT NOT NULL,
    "processedAmount" DECIMAL(10,2),
    "transactionType" "TransactionType" NOT NULL DEFAULT 'ORIGINAL',
    "appService" "AppService" NOT NULL DEFAULT 'ECOMMERCE',
    "rideRequestId" TEXT,
    "rentalRequestId" TEXT,

    CONSTRAINT "ExternalTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UCP" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DECIMAL(10,4) NOT NULL,
    "description" TEXT,
    "serviceType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "UCP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleType" "RiderVehicleType" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "dateOfBirth" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "insuranceNumber" TEXT,
    "insuranceExpiry" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "experience" TEXT,
    "availability" TEXT,
    "status" "RiderApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rider_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_documents" (
    "id" TEXT NOT NULL,
    "riderApplicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rider_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_requests" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "driverId" TEXT,
    "riderApplicationId" TEXT,
    "rideServiceId" TEXT NOT NULL,
    "status" "RentalRequestStatus" NOT NULL DEFAULT 'PENDING_QUOTE',
    "rentalSettlementStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "pickupAddress" TEXT NOT NULL,
    "pickupLocation" JSONB,
    "pickupLatitude" DOUBLE PRECISION,
    "pickupLongitude" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "proposedPrice" DECIMAL(10,2),
    "agreedPrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'GMD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chatMeta" JSONB,

    CONSTRAINT "rental_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_messages" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riderApplicationId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "status" "DriverStatus" NOT NULL DEFAULT 'OFFLINE',
    "currentLocation" JSONB,
    "lastLocationUpdate" TIMESTAMP(3),
    "totalRides" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "vehicleInfo" JSONB,
    "documents" JSONB,
    "preferences" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rideServiceId" TEXT,
    "updatedBy" TEXT,
    "isRentalType" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_locations" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_requests" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "driverId" TEXT,
    "pickupLocation" JSONB NOT NULL,
    "destinationLocation" JSONB NOT NULL,
    "rideType" "RideType" NOT NULL DEFAULT 'STANDARD',
    "estimatedDistance" DOUBLE PRECISION,
    "estimatedDuration" INTEGER,
    "estimatedPrice" DECIMAL(10,2) NOT NULL,
    "actualPrice" DECIMAL(10,2),
    "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
    "paymentMethod" "RidePaymentMethod" NOT NULL DEFAULT 'CASH',
    "customerNotes" TEXT,
    "driverNotes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rideServiceId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GMD',
    "currencySymbol" TEXT NOT NULL DEFAULT 'D',

    CONSTRAINT "ride_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rides" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "rideRequestId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "pickupLocation" JSONB NOT NULL,
    "destinationLocation" JSONB NOT NULL,
    "actualPickupLocation" JSONB,
    "actualDropoffLocation" JSONB,
    "rideType" "RideType" NOT NULL DEFAULT 'STANDARD',
    "distance" DOUBLE PRECISION,
    "duration" INTEGER,
    "baseFare" DECIMAL(10,2) NOT NULL,
    "distanceFare" DECIMAL(10,2) NOT NULL,
    "timeFare" DECIMAL(10,2) NOT NULL,
    "surgeFare" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalFare" DECIMAL(10,2) NOT NULL,
    "driverEarnings" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "RidePaymentMethod" NOT NULL DEFAULT 'CASH',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
    "customerRating" INTEGER,
    "driverRating" INTEGER,
    "customerReview" TEXT,
    "driverReview" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "route" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rideServiceId" TEXT,
    "settlementStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_tokens" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_locations" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_earnings" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_services" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleType" "RiderVehicleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "distanceUnit" "DistanceUnit" NOT NULL DEFAULT 'KILOMETER',
    "baseDistance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "maxDistance" DOUBLE PRECISION,
    "baseFare" DECIMAL(10,2) NOT NULL,
    "perKmRate" DECIMAL(10,2) NOT NULL,
    "perMinuteRate" DECIMAL(10,2) NOT NULL,
    "minimumFare" DECIMAL(10,2) NOT NULL,
    "maximumFare" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'GMD',
    "currencySymbol" TEXT NOT NULL DEFAULT 'D',
    "surgeMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "maxSurgeMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 3.0,
    "platformFeePercentage" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
    "driverEarningsPercentage" DECIMAL(5,4) NOT NULL DEFAULT 0.85,
    "nightFareMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.2,
    "weekendFareMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.1,
    "cancellationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cancellationTimeLimit" INTEGER NOT NULL DEFAULT 300,
    "features" JSONB,
    "restrictions" JSONB,
    "estimatedPickupTime" INTEGER NOT NULL DEFAULT 5,
    "maxWaitTime" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "isRentalType" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ride_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shippingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "billingAddress" TEXT,
    "paymentMethod" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "shippingMethod" TEXT,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "sellerNotes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "deliveryCurrency" VARCHAR(3),
    "salesRepId" TEXT,
    "branchId" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twilio_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "to" TEXT NOT NULL,
    "from" TEXT,
    "messagingServiceSid" TEXT,
    "messageBody" TEXT NOT NULL,
    "messageType" "TwilioMessageType" NOT NULL DEFAULT 'OTHER',
    "twilioSid" TEXT,
    "twilioStatus" TEXT,
    "segments" INTEGER,
    "price" DECIMAL(10,4),
    "priceUnit" TEXT,
    "currencyCode" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "environment" TEXT,
    "apiRequest" JSONB,
    "apiResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twilio_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "parentSellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRep" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentSellerId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" "SalesRepStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRepSettlement" (
    "id" TEXT NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "parentSellerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRepSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_entityType_permission_key" ON "role_permissions"("roleId", "entityType", "permission");

-- CreateIndex
CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_updatedAt_idx" ON "User"("updatedAt");

-- CreateIndex
CREATE INDEX "DeliveryAddress_userId_idx" ON "DeliveryAddress"("userId");

-- CreateIndex
CREATE INDEX "DeliveryAddress_isDefault_idx" ON "DeliveryAddress"("isDefault");

-- CreateIndex
CREATE INDEX "DeliveryAddress_isDeleted_idx" ON "DeliveryAddress"("isDeleted");

-- CreateIndex
CREATE INDEX "DeliveryAddress_createdAt_idx" ON "DeliveryAddress"("createdAt");

-- CreateIndex
CREATE INDEX "DeliveryAddress_updatedAt_idx" ON "DeliveryAddress"("updatedAt");

-- CreateIndex
CREATE INDEX "PaymentGatewayServiceProvider_countryCode_idx" ON "PaymentGatewayServiceProvider"("countryCode");

-- CreateIndex
CREATE INDEX "PaymentGatewayServiceProvider_currencyCode_idx" ON "PaymentGatewayServiceProvider"("currencyCode");

-- CreateIndex
CREATE INDEX "PaymentGatewayServiceProvider_type_idx" ON "PaymentGatewayServiceProvider"("type");

-- CreateIndex
CREATE INDEX "PaymentGatewayServiceProvider_isActive_idx" ON "PaymentGatewayServiceProvider"("isActive");

-- CreateIndex
CREATE INDEX "PaymentGatewayServiceProvider_createdAt_idx" ON "PaymentGatewayServiceProvider"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentGatewayServiceProvider_updatedAt_idx" ON "PaymentGatewayServiceProvider"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayServiceProvider_name_countryCode_key" ON "PaymentGatewayServiceProvider"("name", "countryCode");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "Device_deviceId_idx" ON "Device"("deviceId");

-- CreateIndex
CREATE INDEX "Device_phoneNumber_idx" ON "Device"("phoneNumber");

-- CreateIndex
CREATE INDEX "Device_isVerified_idx" ON "Device"("isVerified");

-- CreateIndex
CREATE INDEX "Device_lastLoginAt_idx" ON "Device"("lastLoginAt");

-- CreateIndex
CREATE INDEX "Device_lastLogoutAt_idx" ON "Device"("lastLogoutAt");

-- CreateIndex
CREATE INDEX "Device_createdAt_idx" ON "Device"("createdAt");

-- CreateIndex
CREATE INDEX "Device_updatedAt_idx" ON "Device"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_deviceId_key" ON "Device"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_deviceId_idx" ON "Session"("deviceId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");

-- CreateIndex
CREATE INDEX "Session_updatedAt_idx" ON "Session"("updatedAt");

-- CreateIndex
CREATE INDEX "OTP_phoneNumber_idx" ON "OTP"("phoneNumber");

-- CreateIndex
CREATE INDEX "OTP_code_idx" ON "OTP"("code");

-- CreateIndex
CREATE INDEX "OTP_type_idx" ON "OTP"("type");

-- CreateIndex
CREATE INDEX "OTP_expiresAt_idx" ON "OTP"("expiresAt");

-- CreateIndex
CREATE INDEX "OTP_isUsed_idx" ON "OTP"("isUsed");

-- CreateIndex
CREATE INDEX "OTP_createdAt_idx" ON "OTP"("createdAt");

-- CreateIndex
CREATE INDEX "Product_sellerId_idx" ON "Product"("sellerId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_locationId_idx" ON "Product"("locationId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_updatedAt_idx" ON "Product"("updatedAt");

-- CreateIndex
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");

-- CreateIndex
CREATE INDEX "Product_rating_idx" ON "Product"("rating");

-- CreateIndex
CREATE INDEX "Product_salesRepId_idx" ON "Product"("salesRepId");

-- CreateIndex
CREATE INDEX "Product_branchId_idx" ON "Product"("branchId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- CreateIndex
CREATE INDEX "Location_countryCode_idx" ON "Location"("countryCode");

-- CreateIndex
CREATE INDEX "Location_isActive_idx" ON "Location"("isActive");

-- CreateIndex
CREATE INDEX "Location_latitude_longitude_idx" ON "Location"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "ProductAttribute_productId_idx" ON "ProductAttribute"("productId");

-- CreateIndex
CREATE INDEX "ProductAttribute_key_idx" ON "ProductAttribute"("key");

-- CreateIndex
CREATE INDEX "ProductAttribute_isFilterable_idx" ON "ProductAttribute"("isFilterable");

-- CreateIndex
CREATE INDEX "ProductTranslation_locale_idx" ON "ProductTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTranslation_productId_locale_key" ON "ProductTranslation"("productId", "locale");

-- CreateIndex
CREATE INDEX "ProductDeliveryOption_productId_idx" ON "ProductDeliveryOption"("productId");

-- CreateIndex
CREATE INDEX "ProductDeliveryOption_deliveryType_idx" ON "ProductDeliveryOption"("deliveryType");

-- CreateIndex
CREATE INDEX "ProductDeliveryOption_isActive_idx" ON "ProductDeliveryOption"("isActive");

-- CreateIndex
CREATE INDEX "ProductDeliveryOption_isDefault_idx" ON "ProductDeliveryOption"("isDefault");

-- CreateIndex
CREATE INDEX "CategoryTranslation_locale_idx" ON "CategoryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "SellerKyc_userId_key" ON "SellerKyc"("userId");

-- CreateIndex
CREATE INDEX "SellerKyc_userId_idx" ON "SellerKyc"("userId");

-- CreateIndex
CREATE INDEX "SellerKyc_status_idx" ON "SellerKyc"("status");

-- CreateIndex
CREATE INDEX "SellerKyc_documentNumber_idx" ON "SellerKyc"("documentNumber");

-- CreateIndex
CREATE INDEX "SellerKyc_businessName_idx" ON "SellerKyc"("businessName");

-- CreateIndex
CREATE INDEX "BankAccount_sellerKycId_idx" ON "BankAccount"("sellerKycId");

-- CreateIndex
CREATE INDEX "BankAccount_accountNumber_idx" ON "BankAccount"("accountNumber");

-- CreateIndex
CREATE INDEX "BankAccount_status_idx" ON "BankAccount"("status");

-- CreateIndex
CREATE INDEX "Wallet_sellerKycId_idx" ON "Wallet"("sellerKycId");

-- CreateIndex
CREATE INDEX "Wallet_walletAddress_idx" ON "Wallet"("walletAddress");

-- CreateIndex
CREATE INDEX "Wallet_account_idx" ON "Wallet"("account");

-- CreateIndex
CREATE INDEX "Wallet_status_idx" ON "Wallet"("status");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "PaymentMethod_type_idx" ON "PaymentMethod"("type");

-- CreateIndex
CREATE INDEX "PaymentMethod_status_idx" ON "PaymentMethod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_reference_key" ON "Settlement"("reference");

-- CreateIndex
CREATE INDEX "Settlement_userId_idx" ON "Settlement"("userId");

-- CreateIndex
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");

-- CreateIndex
CREATE INDEX "Settlement_reference_idx" ON "Settlement"("reference");

-- CreateIndex
CREATE INDEX "Settlement_createdAt_idx" ON "Settlement"("createdAt");

-- CreateIndex
CREATE INDEX "Settlement_currency_idx" ON "Settlement"("currency");

-- CreateIndex
CREATE INDEX "Settlement_channel_idx" ON "Settlement"("channel");

-- CreateIndex
CREATE INDEX "product_views_productId_idx" ON "product_views"("productId");

-- CreateIndex
CREATE INDEX "product_views_userId_idx" ON "product_views"("userId");

-- CreateIndex
CREATE INDEX "product_views_viewedAt_idx" ON "product_views"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_views_productId_userId_deviceId_key" ON "product_views"("productId", "userId", "deviceId");

-- CreateIndex
CREATE INDEX "product_order_interests_productId_idx" ON "product_order_interests"("productId");

-- CreateIndex
CREATE INDEX "product_order_interests_userId_idx" ON "product_order_interests"("userId");

-- CreateIndex
CREATE INDEX "product_order_interests_status_idx" ON "product_order_interests"("status");

-- CreateIndex
CREATE INDEX "product_order_interests_paymentStatus_idx" ON "product_order_interests"("paymentStatus");

-- CreateIndex
CREATE INDEX "product_order_interests_createdAt_idx" ON "product_order_interests"("createdAt");

-- CreateIndex
CREATE INDEX "product_order_interests_expiresAt_idx" ON "product_order_interests"("expiresAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_status_idx" ON "order_items"("status");

-- CreateIndex
CREATE INDEX "ExternalTransaction_orderId_idx" ON "ExternalTransaction"("orderId");

-- CreateIndex
CREATE INDEX "ExternalTransaction_rideRequestId_idx" ON "ExternalTransaction"("rideRequestId");

-- CreateIndex
CREATE INDEX "ExternalTransaction_rentalRequestId_idx" ON "ExternalTransaction"("rentalRequestId");

-- CreateIndex
CREATE INDEX "ExternalTransaction_customerId_idx" ON "ExternalTransaction"("customerId");

-- CreateIndex
CREATE INDEX "ExternalTransaction_sellerId_idx" ON "ExternalTransaction"("sellerId");

-- CreateIndex
CREATE INDEX "ExternalTransaction_paymentMethodId_idx" ON "ExternalTransaction"("paymentMethodId");

-- CreateIndex
CREATE INDEX "ExternalTransaction_gatewayProvider_idx" ON "ExternalTransaction"("gatewayProvider");

-- CreateIndex
CREATE INDEX "ExternalTransaction_gatewayTransactionId_idx" ON "ExternalTransaction"("gatewayTransactionId");

-- CreateIndex
CREATE INDEX "ExternalTransaction_paymentReference_idx" ON "ExternalTransaction"("paymentReference");

-- CreateIndex
CREATE INDEX "ExternalTransaction_appTransactionId_idx" ON "ExternalTransaction"("appTransactionId");

-- CreateIndex
CREATE INDEX "ExternalTransaction_appService_idx" ON "ExternalTransaction"("appService");

-- CreateIndex
CREATE INDEX "ExternalTransaction_transactionType_idx" ON "ExternalTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "ExternalTransaction_status_idx" ON "ExternalTransaction"("status");

-- CreateIndex
CREATE INDEX "ExternalTransaction_processedAt_idx" ON "ExternalTransaction"("processedAt");

-- CreateIndex
CREATE INDEX "ExternalTransaction_createdAt_idx" ON "ExternalTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "ExternalTransaction_updatedAt_idx" ON "ExternalTransaction"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UCP_name_key" ON "UCP"("name");

-- CreateIndex
CREATE INDEX "UCP_name_idx" ON "UCP"("name");

-- CreateIndex
CREATE INDEX "UCP_serviceType_idx" ON "UCP"("serviceType");

-- CreateIndex
CREATE INDEX "UCP_isActive_idx" ON "UCP"("isActive");

-- CreateIndex
CREATE INDEX "UCP_createdAt_idx" ON "UCP"("createdAt");

-- CreateIndex
CREATE INDEX "UCP_updatedAt_idx" ON "UCP"("updatedAt");

-- CreateIndex
CREATE INDEX "rider_applications_userId_idx" ON "rider_applications"("userId");

-- CreateIndex
CREATE INDEX "rider_applications_vehicleType_idx" ON "rider_applications"("vehicleType");

-- CreateIndex
CREATE INDEX "rider_applications_status_idx" ON "rider_applications"("status");

-- CreateIndex
CREATE INDEX "rider_applications_licenseNumber_idx" ON "rider_applications"("licenseNumber");

-- CreateIndex
CREATE INDEX "rider_applications_vehiclePlate_idx" ON "rider_applications"("vehiclePlate");

-- CreateIndex
CREATE INDEX "rider_applications_createdAt_idx" ON "rider_applications"("createdAt");

-- CreateIndex
CREATE INDEX "rider_applications_updatedAt_idx" ON "rider_applications"("updatedAt");

-- CreateIndex
CREATE INDEX "rider_documents_riderApplicationId_idx" ON "rider_documents"("riderApplicationId");

-- CreateIndex
CREATE INDEX "rider_documents_documentType_idx" ON "rider_documents"("documentType");

-- CreateIndex
CREATE INDEX "rider_documents_uploadedAt_idx" ON "rider_documents"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "rental_requests_requestId_key" ON "rental_requests"("requestId");

-- CreateIndex
CREATE INDEX "rental_requests_customerId_idx" ON "rental_requests"("customerId");

-- CreateIndex
CREATE INDEX "rental_requests_driverId_idx" ON "rental_requests"("driverId");

-- CreateIndex
CREATE INDEX "rental_requests_rideServiceId_idx" ON "rental_requests"("rideServiceId");

-- CreateIndex
CREATE INDEX "rental_requests_createdAt_idx" ON "rental_requests"("createdAt");

-- CreateIndex
CREATE INDEX "rental_messages_rentalId_idx" ON "rental_messages"("rentalId");

-- CreateIndex
CREATE INDEX "rental_messages_senderId_idx" ON "rental_messages"("senderId");

-- CreateIndex
CREATE INDEX "rental_messages_createdAt_idx" ON "rental_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_riderApplicationId_key" ON "drivers"("riderApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_driverId_key" ON "drivers"("driverId");

-- CreateIndex
CREATE INDEX "drivers_userId_idx" ON "drivers"("userId");

-- CreateIndex
CREATE INDEX "drivers_driverId_idx" ON "drivers"("driverId");

-- CreateIndex
CREATE INDEX "drivers_rideServiceId_idx" ON "drivers"("rideServiceId");

-- CreateIndex
CREATE INDEX "drivers_isOnline_idx" ON "drivers"("isOnline");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_isActive_idx" ON "drivers"("isActive");

-- CreateIndex
CREATE INDEX "drivers_isRentalType_idx" ON "drivers"("isRentalType");

-- CreateIndex
CREATE INDEX "drivers_createdAt_idx" ON "drivers"("createdAt");

-- CreateIndex
CREATE INDEX "drivers_updatedBy_idx" ON "drivers"("updatedBy");

-- CreateIndex
CREATE INDEX "driver_locations_driverId_idx" ON "driver_locations"("driverId");

-- CreateIndex
CREATE INDEX "driver_locations_timestamp_idx" ON "driver_locations"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ride_requests_requestId_key" ON "ride_requests"("requestId");

-- CreateIndex
CREATE INDEX "ride_requests_customerId_idx" ON "ride_requests"("customerId");

-- CreateIndex
CREATE INDEX "ride_requests_driverId_idx" ON "ride_requests"("driverId");

-- CreateIndex
CREATE INDEX "ride_requests_status_idx" ON "ride_requests"("status");

-- CreateIndex
CREATE INDEX "ride_requests_requestedAt_idx" ON "ride_requests"("requestedAt");

-- CreateIndex
CREATE INDEX "ride_requests_expiresAt_idx" ON "ride_requests"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "rides_rideId_key" ON "rides"("rideId");

-- CreateIndex
CREATE UNIQUE INDEX "rides_rideRequestId_key" ON "rides"("rideRequestId");

-- CreateIndex
CREATE INDEX "rides_rideId_idx" ON "rides"("rideId");

-- CreateIndex
CREATE INDEX "rides_driverId_idx" ON "rides"("driverId");

-- CreateIndex
CREATE INDEX "rides_customerId_idx" ON "rides"("customerId");

-- CreateIndex
CREATE INDEX "rides_status_idx" ON "rides"("status");

-- CreateIndex
CREATE INDEX "rides_paymentStatus_idx" ON "rides"("paymentStatus");

-- CreateIndex
CREATE INDEX "rides_settlementStatus_idx" ON "rides"("settlementStatus");

-- CreateIndex
CREATE INDEX "rides_startedAt_idx" ON "rides"("startedAt");

-- CreateIndex
CREATE INDEX "rides_completedAt_idx" ON "rides"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ride_tokens_rideId_key" ON "ride_tokens"("rideId");

-- CreateIndex
CREATE UNIQUE INDEX "ride_tokens_token_key" ON "ride_tokens"("token");

-- CreateIndex
CREATE INDEX "ride_tokens_token_idx" ON "ride_tokens"("token");

-- CreateIndex
CREATE INDEX "ride_tokens_isUsed_idx" ON "ride_tokens"("isUsed");

-- CreateIndex
CREATE INDEX "ride_tokens_expiresAt_idx" ON "ride_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "ride_locations_rideId_idx" ON "ride_locations"("rideId");

-- CreateIndex
CREATE INDEX "ride_locations_timestamp_idx" ON "ride_locations"("timestamp");

-- CreateIndex
CREATE INDEX "driver_earnings_driverId_idx" ON "driver_earnings"("driverId");

-- CreateIndex
CREATE INDEX "driver_earnings_rideId_idx" ON "driver_earnings"("rideId");

-- CreateIndex
CREATE INDEX "driver_earnings_type_idx" ON "driver_earnings"("type");

-- CreateIndex
CREATE INDEX "driver_earnings_createdAt_idx" ON "driver_earnings"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ride_services_serviceId_key" ON "ride_services"("serviceId");

-- CreateIndex
CREATE INDEX "ride_services_serviceId_idx" ON "ride_services"("serviceId");

-- CreateIndex
CREATE INDEX "ride_services_vehicleType_idx" ON "ride_services"("vehicleType");

-- CreateIndex
CREATE INDEX "ride_services_isActive_idx" ON "ride_services"("isActive");

-- CreateIndex
CREATE INDEX "ride_services_isDefault_idx" ON "ride_services"("isDefault");

-- CreateIndex
CREATE INDEX "ride_services_isRentalType_idx" ON "ride_services"("isRentalType");

-- CreateIndex
CREATE INDEX "ride_services_currency_idx" ON "ride_services"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_idx" ON "orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "orders_salesRepId_idx" ON "orders"("salesRepId");

-- CreateIndex
CREATE INDEX "orders_branchId_idx" ON "orders"("branchId");

-- CreateIndex
CREATE INDEX "orders_sellerId_idx" ON "orders"("sellerId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "twilio_notifications_to_idx" ON "twilio_notifications"("to");

-- CreateIndex
CREATE INDEX "twilio_notifications_twilioSid_idx" ON "twilio_notifications"("twilioSid");

-- CreateIndex
CREATE INDEX "twilio_notifications_messageType_idx" ON "twilio_notifications"("messageType");

-- CreateIndex
CREATE INDEX "twilio_notifications_createdAt_idx" ON "twilio_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "Branch_parentSellerId_idx" ON "Branch"("parentSellerId");

-- CreateIndex
CREATE INDEX "Branch_isActive_idx" ON "Branch"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SalesRep_userId_key" ON "SalesRep"("userId");

-- CreateIndex
CREATE INDEX "SalesRep_userId_idx" ON "SalesRep"("userId");

-- CreateIndex
CREATE INDEX "SalesRep_parentSellerId_idx" ON "SalesRep"("parentSellerId");

-- CreateIndex
CREATE INDEX "SalesRep_branchId_idx" ON "SalesRep"("branchId");

-- CreateIndex
CREATE INDEX "SalesRep_status_idx" ON "SalesRep"("status");

-- CreateIndex
CREATE INDEX "SalesRepSettlement_salesRepId_idx" ON "SalesRepSettlement"("salesRepId");

-- CreateIndex
CREATE INDEX "SalesRepSettlement_parentSellerId_idx" ON "SalesRepSettlement"("parentSellerId");

-- CreateIndex
CREATE INDEX "SalesRepSettlement_status_idx" ON "SalesRepSettlement"("status");

-- CreateIndex
CREATE INDEX "SalesRepSettlement_requestedAt_idx" ON "SalesRepSettlement"("requestedAt");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_operatorEntityId_fkey" FOREIGN KEY ("operatorEntityId") REFERENCES "operator_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_entities" ADD CONSTRAINT "operator_entities_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAddress" ADD CONSTRAINT "DeliveryAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDeliveryOption" ADD CONSTRAINT "ProductDeliveryOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerKyc" ADD CONSTRAINT "SellerKyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_sellerKycId_fkey" FOREIGN KEY ("sellerKycId") REFERENCES "SellerKyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_sellerKycId_fkey" FOREIGN KEY ("sellerKycId") REFERENCES "SellerKyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_order_interests" ADD CONSTRAINT "product_order_interests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_order_interests" ADD CONSTRAINT "product_order_interests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTransaction" ADD CONSTRAINT "ExternalTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTransaction" ADD CONSTRAINT "ExternalTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTransaction" ADD CONSTRAINT "ExternalTransaction_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTransaction" ADD CONSTRAINT "ExternalTransaction_rentalRequestId_fkey" FOREIGN KEY ("rentalRequestId") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTransaction" ADD CONSTRAINT "ExternalTransaction_rideRequestId_fkey" FOREIGN KEY ("rideRequestId") REFERENCES "ride_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTransaction" ADD CONSTRAINT "ExternalTransaction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_applications" ADD CONSTRAINT "rider_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_documents" ADD CONSTRAINT "rider_documents_riderApplicationId_fkey" FOREIGN KEY ("riderApplicationId") REFERENCES "rider_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_rideServiceId_fkey" FOREIGN KEY ("rideServiceId") REFERENCES "ride_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_riderApplicationId_fkey" FOREIGN KEY ("riderApplicationId") REFERENCES "rider_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_messages" ADD CONSTRAINT "rental_messages_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_messages" ADD CONSTRAINT "rental_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_rideServiceId_fkey" FOREIGN KEY ("rideServiceId") REFERENCES "ride_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_riderApplicationId_fkey" FOREIGN KEY ("riderApplicationId") REFERENCES "rider_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_rideServiceId_fkey" FOREIGN KEY ("rideServiceId") REFERENCES "ride_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_rideRequestId_fkey" FOREIGN KEY ("rideRequestId") REFERENCES "ride_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_rideServiceId_fkey" FOREIGN KEY ("rideServiceId") REFERENCES "ride_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_tokens" ADD CONSTRAINT "ride_tokens_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_locations" ADD CONSTRAINT "ride_locations_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twilio_notifications" ADD CONSTRAINT "twilio_notifications_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twilio_notifications" ADD CONSTRAINT "twilio_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_parentSellerId_fkey" FOREIGN KEY ("parentSellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_parentSellerId_fkey" FOREIGN KEY ("parentSellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRepSettlement" ADD CONSTRAINT "SalesRepSettlement_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRepSettlement" ADD CONSTRAINT "SalesRepSettlement_parentSellerId_fkey" FOREIGN KEY ("parentSellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
