-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('EMAIL', 'PHONE');

-- AlterTable User
ALTER TABLE "User" ADD COLUMN     "email" TEXT,
ADD COLUMN     "preferredAuthMethod" "AuthMethod",
ADD COLUMN     "mergedIntoUserId" TEXT,
ADD COLUMN     "deviceLockEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedDeviceId" TEXT;

ALTER TABLE "User" ALTER COLUMN "phoneNumber" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "pin" DROP NOT NULL;

UPDATE "User" SET "preferredAuthMethod" = 'PHONE' WHERE "phoneNumber" IS NOT NULL AND "preferredAuthMethod" IS NULL;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");

-- AlterTable Device
ALTER TABLE "Device" ALTER COLUMN "phoneNumber" DROP NOT NULL;
ALTER TABLE "Device" ADD COLUMN     "fingerprint" TEXT;
ALTER TABLE "Device" ADD COLUMN     "hardwareId" TEXT;

-- AlterTable OTP
ALTER TABLE "OTP" ADD COLUMN     "identifier" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OTP" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'PHONE';

UPDATE "OTP" SET "identifier" = "phoneNumber" WHERE "identifier" = '';

CREATE INDEX "OTP_identifier_idx" ON "OTP"("identifier");
CREATE INDEX "OTP_channel_idx" ON "OTP"("channel");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lockedDeviceId_fkey" FOREIGN KEY ("lockedDeviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UserMonthlyDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceGroupKey" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "firstLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMonthlyDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceMonthlyUser" (
    "id" TEXT NOT NULL,
    "deviceGroupKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "firstLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceMonthlyUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserMonthlyDevice_userId_deviceGroupKey_yearMonth_key" ON "UserMonthlyDevice"("userId", "deviceGroupKey", "yearMonth");
CREATE INDEX "UserMonthlyDevice_userId_yearMonth_idx" ON "UserMonthlyDevice"("userId", "yearMonth");

CREATE UNIQUE INDEX "DeviceMonthlyUser_deviceGroupKey_userId_yearMonth_key" ON "DeviceMonthlyUser"("deviceGroupKey", "userId", "yearMonth");
CREATE INDEX "DeviceMonthlyUser_deviceGroupKey_yearMonth_idx" ON "DeviceMonthlyUser"("deviceGroupKey", "yearMonth");

ALTER TABLE "UserMonthlyDevice" ADD CONSTRAINT "UserMonthlyDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
