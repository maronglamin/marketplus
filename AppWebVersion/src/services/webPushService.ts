import getApi from '../api/config';

const PUSH_SW_URL = '/push-sw.js';
const WEB_PUSH_SUBSCRIPTION_KEY = 'snapWebPushSubscription';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function fetchWebPushPublicKey(): Promise<string | null> {
  const fromEnv = String(process.env.REACT_APP_WEB_PUSH_VAPID_PUBLIC_KEY || '').trim();
  if (fromEnv) return fromEnv;

  try {
    const api = getApi();
    const response = await api.get('/users/web-push/public-key');
    return response.data?.publicKey || null;
  } catch (error) {
    console.warn('[web-push] Could not load VAPID public key from API', error);
    return null;
  }
}

async function saveSubscriptionToBackend(userId: string, subscription: PushSubscription): Promise<void> {
  const api = getApi();
  const token = JSON.stringify(subscription.toJSON());
  await api.post('/users/fcm-token', {
    token,
    userId,
    deviceType: 'web',
  });
  localStorage.setItem(WEB_PUSH_SUBSCRIPTION_KEY, token);
}

export async function unregisterWebPush(): Promise<void> {
  const stored = localStorage.getItem(WEB_PUSH_SUBSCRIPTION_KEY);
  if (!stored) return;

  try {
    const api = getApi();
    await api.delete('/users/fcm-token', { data: { token: stored } });
  } catch (error) {
    console.warn('[web-push] Failed to remove subscription from backend', error);
  } finally {
    localStorage.removeItem(WEB_PUSH_SUBSCRIPTION_KEY);
  }
}

/**
 * Register browser web push for the signed-in user (directPay / 7a-side pattern).
 */
export async function registerWebPush(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return;
  }

  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const secure =
    typeof window.isSecureContext === 'boolean'
      ? window.isSecureContext
      : window.location.protocol === 'https:';
  if (!secure && !isLocalhost) {
    console.warn('[web-push] Web Push requires HTTPS in production.');
    return;
  }

  const publicKey = await fetchWebPushPublicKey();
  if (!publicKey) {
    console.warn('[web-push] No VAPID public key configured on server.');
    return;
  }

  try {
    await navigator.serviceWorker.register(PUSH_SW_URL, { scope: '/' });
    const registration = await navigator.serviceWorker.ready;

    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer.slice(
          applicationServerKey.byteOffset,
          applicationServerKey.byteOffset + applicationServerKey.byteLength,
        ) as ArrayBuffer,
      }));

    await saveSubscriptionToBackend(userId, subscription);
  } catch (error) {
    console.warn('[web-push] subscribe/register failed', error);
  }
}
