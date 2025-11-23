import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { api } from './api';

export interface AppVersionResponse {
  latest: { ios: string | null; android: string | null };
  minSupported: { ios: string | null; android: string | null };
  mandatory: boolean;
  message: string | null;
  storeUrl: { ios: string | null; android: string | null };
  requireExact?: boolean;
  updatedAt: string;
}

export interface UpdateCheckResult {
  shouldPrompt: boolean;
  mandatory: boolean;
  message?: string;
  storeUrl?: string;
  latestVersion?: string;
  currentVersion: string;
}

function normalizeVersion(version: string): number[] {
  return version
    .split('.')
    .map((v) => parseInt(v, 10))
    .filter((n) => !Number.isNaN(n));
}

function compareVersions(a: string, b: string): number {
  const aa = normalizeVersion(a);
  const bb = normalizeVersion(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const ai = aa[i] ?? 0;
    const bi = bb[i] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
  const currentVersion =
    Application.nativeApplicationVersion ||
    Application.applicationVersion ||
    '0.0.0';

  try {
    // Backend endpoint is optional; if missing, fail silently (no prompt)
    const { data } = await api.get<AppVersionResponse>('/api/app/version');
    const latest = (data.latest?.[platform] || '').trim();
    const minSupported = (data.minSupported?.[platform] || '').trim();
    const storeUrl = data.storeUrl?.[platform] || undefined;
    const message = data.message || undefined;
    const mandatoryFlag = data.mandatory === true;
    const requireExact = data.requireExact === true;

    let shouldPrompt = false;
    let mandatory = false;

    if (minSupported) {
      if (compareVersions(currentVersion, minSupported) < 0) {
        shouldPrompt = true;
        mandatory = true;
      }
    }

    if (!shouldPrompt && latest) {
      if (requireExact) {
        if (compareVersions(currentVersion, latest) !== 0) {
          shouldPrompt = true;
          mandatory = mandatoryFlag;
        }
      } else {
        if (compareVersions(currentVersion, latest) < 0) {
          shouldPrompt = true;
          mandatory = mandatoryFlag;
        }
      }
    }

    return {
      shouldPrompt,
      mandatory,
      message,
      storeUrl,
      latestVersion: latest || undefined,
      currentVersion,
    };
  } catch {
    return {
      shouldPrompt: false,
      mandatory: false,
      currentVersion,
    };
  }
}


