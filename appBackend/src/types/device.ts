export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  isVerified?: boolean;
  lastLoginAt?: Date;
} 