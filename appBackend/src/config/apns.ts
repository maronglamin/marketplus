import apn from '@parse/node-apn';

const APNS_KEY_ID = process.env.APNS_KEY_ID?.trim() || '';
const APNS_TEAM_ID = process.env.APNS_TEAM_ID?.trim() || '';
const APNS_BUNDLE_ID =
  process.env.APNS_BUNDLE_ID?.trim() || 'biz.cloudnexus.snap.app';
const APNS_PRIVATE_KEY = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';

let apnsProvider: apn.Provider | null = null;

if (APNS_KEY_ID && APNS_TEAM_ID && APNS_PRIVATE_KEY) {
  try {
    apnsProvider = new apn.Provider({
      token: {
        key: APNS_PRIVATE_KEY,
        keyId: APNS_KEY_ID,
        teamId: APNS_TEAM_ID,
      },
      production: process.env.APNS_PRODUCTION === 'true',
    });
  } catch (error) {
    console.warn('[apns] Provider init failed:', error);
  }
} else if (APNS_KEY_ID || APNS_TEAM_ID || APNS_PRIVATE_KEY) {
  console.warn(
    '[apns] APNS_KEY_ID, APNS_TEAM_ID, and APNS_PRIVATE_KEY must all be set for direct iOS push.',
  );
}

export function isApnsConfigured(): boolean {
  return apnsProvider !== null;
}

export function getApnsBundleId(): string {
  return APNS_BUNDLE_ID;
}

export async function sendApnsNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; invalidToken: boolean }> {
  if (!apnsProvider) {
    console.log('[apns] Not configured, skipping iOS push send');
    return { success: false, invalidToken: false };
  }

  const note = new apn.Notification();
  note.expiry = Math.floor(Date.now() / 1000) + 3600;
  note.badge = 1;
  note.sound = 'default';
  note.topic = APNS_BUNDLE_ID;
  note.alert = { title, body };
  if (data && Object.keys(data).length > 0) {
    note.payload = data;
  }

  try {
    const result = await apnsProvider.send(note, deviceToken);
    const failed = result.failed || [];
    if (failed.length > 0) {
      const reason = failed[0]?.response?.reason || failed[0]?.status;
      const invalidToken =
        reason === 'BadDeviceToken' ||
        reason === 'Unregistered' ||
        reason === 'DeviceTokenNotForTopic';
      console.error('[apns] Send failed:', reason, deviceToken.slice(0, 12));
      return { success: false, invalidToken };
    }
    return { success: true, invalidToken: false };
  } catch (error) {
    console.error('[apns] Send error:', error);
    return { success: false, invalidToken: false };
  }
}
