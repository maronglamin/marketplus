import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

export const MONTHLY_DEVICE_LIMIT_PER_USER = 3;
export const MONTHLY_USER_LIMIT_PER_DEVICE = 3;

export type DeviceLoginErrorCode =
  | 'USER_MONTHLY_DEVICE_LIMIT'
  | 'DEVICE_MONTHLY_USER_LIMIT'
  | 'DEVICE_LOCK_VIOLATION'
  | 'DEVICE_REQUIRED';

export class DeviceLoginError extends Error {
  readonly code: DeviceLoginErrorCode;

  constructor(
    readonly code: DeviceLoginErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DeviceLoginError';
  }
}

export type DeviceLimitInfo = {
  deviceId: string;
  fingerprint?: string | null;
  hardwareId?: string | null;
};

export function getDeviceGroupKey(input: DeviceLimitInfo): string {
  return (input.hardwareId?.trim() || input.fingerprint?.trim() || input.deviceId).trim();
}

export function getCurrentYearMonth(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function isSamePhysicalDevice(
  input: DeviceLimitInfo,
  locked: { deviceId: string; fingerprint: string | null; hardwareId: string | null },
): boolean {
  if (locked.hardwareId && input.hardwareId) {
    return locked.hardwareId === input.hardwareId;
  }
  if (locked.fingerprint && input.fingerprint) {
    return locked.fingerprint === input.fingerprint;
  }
  return locked.deviceId === input.deviceId;
}

export async function assertDeviceLoginAllowed(
  user: User,
  input: DeviceLimitInfo,
): Promise<void> {
  if (!input.deviceId) {
    throw new DeviceLoginError('DEVICE_REQUIRED', 'Device information is required to sign in.');
  }

  const deviceGroupKey = getDeviceGroupKey(input);
  const yearMonth = getCurrentYearMonth();
  const monthLabel = formatMonthLabel(yearMonth);

  if (user.deviceLockEnabled && user.lockedDeviceId) {
    const lockedDevice = await prisma.device.findFirst({
      where: { id: user.lockedDeviceId, userId: user.id },
    });

    if (lockedDevice && !isSamePhysicalDevice(input, lockedDevice)) {
      throw new DeviceLoginError(
        'DEVICE_LOCK_VIOLATION',
        'This account only works on one phone or tablet. Open SNAP on your usual device. To use a new device, go to Account settings on your usual device and turn off device lock.',
      );
    }
  }

  const existingUserDevice = await prisma.userMonthlyDevice.findUnique({
    where: {
      userId_deviceGroupKey_yearMonth: {
        userId: user.id,
        deviceGroupKey,
        yearMonth,
      },
    },
  });

  if (!existingUserDevice) {
    const userDeviceCount = await prisma.userMonthlyDevice.count({
      where: { userId: user.id, yearMonth },
    });

    if (userDeviceCount >= MONTHLY_DEVICE_LIMIT_PER_USER) {
      throw new DeviceLoginError(
        'USER_MONTHLY_DEVICE_LIMIT',
        `You have reached the limit of ${MONTHLY_DEVICE_LIMIT_PER_USER} devices for ${monthLabel}. Sign in from a device you have already used this month, or try again next month.`,
      );
    }
  }

  const existingDeviceUser = await prisma.deviceMonthlyUser.findUnique({
    where: {
      deviceGroupKey_userId_yearMonth: {
        deviceGroupKey,
        userId: user.id,
        yearMonth,
      },
    },
  });

  if (!existingDeviceUser) {
    const deviceUserCount = await prisma.deviceMonthlyUser.count({
      where: { deviceGroupKey, yearMonth },
    });

    if (deviceUserCount >= MONTHLY_USER_LIMIT_PER_DEVICE) {
      throw new DeviceLoginError(
        'DEVICE_MONTHLY_USER_LIMIT',
        `This device has reached its monthly limit of ${MONTHLY_USER_LIMIT_PER_DEVICE} SNAP accounts for ${monthLabel}. Use a different device, or try again next month.`,
      );
    }
  }
}

export async function recordDeviceLogin(userId: string, input: DeviceLimitInfo): Promise<void> {
  const deviceGroupKey = getDeviceGroupKey(input);
  const yearMonth = getCurrentYearMonth();
  const now = new Date();

  await prisma.userMonthlyDevice.upsert({
    where: {
      userId_deviceGroupKey_yearMonth: { userId, deviceGroupKey, yearMonth },
    },
    update: { lastLoginAt: now },
    create: { userId, deviceGroupKey, yearMonth, firstLoginAt: now, lastLoginAt: now },
  });

  await prisma.deviceMonthlyUser.upsert({
    where: {
      deviceGroupKey_userId_yearMonth: { deviceGroupKey, userId, yearMonth },
    },
    update: { lastLoginAt: now },
    create: { deviceGroupKey, userId, yearMonth, firstLoginAt: now, lastLoginAt: now },
  });
}
