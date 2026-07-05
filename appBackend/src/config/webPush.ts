import webpush from 'web-push';

const WEB_PUSH_SUBJECT =
  process.env.WEB_PUSH_SUBJECT?.trim() || 'mailto:support@cloudnexus.biz';
const WEB_PUSH_PUBLIC = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() || '';
const WEB_PUSH_PRIVATE = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() || '';

let webPushConfigured = false;

if (WEB_PUSH_PUBLIC && WEB_PUSH_PRIVATE) {
  try {
    webpush.setVapidDetails(WEB_PUSH_SUBJECT, WEB_PUSH_PUBLIC, WEB_PUSH_PRIVATE);
    webPushConfigured = true;
  } catch (error) {
    console.warn('[web-push] VAPID init failed:', error);
  }
} else if (WEB_PUSH_PUBLIC && !WEB_PUSH_PRIVATE) {
  console.warn(
    '[web-push] WEB_PUSH_VAPID_PUBLIC_KEY is set but WEB_PUSH_VAPID_PRIVATE_KEY is missing. Browsers can subscribe, but web push cannot be sent until the private key is configured.',
  );
} else if (!WEB_PUSH_PUBLIC && WEB_PUSH_PRIVATE) {
  console.warn(
    '[web-push] WEB_PUSH_VAPID_PRIVATE_KEY is set but WEB_PUSH_VAPID_PUBLIC_KEY is missing — web push is disabled.',
  );
}

export function isWebPushConfigured(): boolean {
  return webPushConfigured;
}

/** Public key for PushManager.subscribe (browser). Does not require the private key. */
export function getVapidPublicKeyForClient(): string | null {
  return WEB_PUSH_PUBLIC.length > 0 ? WEB_PUSH_PUBLIC : null;
}

export { webpush };
