import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseInitialized = false;

const getFirebaseCredentials = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();

  if (!projectId || !privateKey || !clientEmail) {
    return null;
  }

  return {
    projectId,
    privateKey: privateKey.replace(/\\n/g, '\n'),
    clientEmail,
  };
};

const credentials = getFirebaseCredentials();

if (credentials && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    firebaseInitialized = true;
  } catch (error) {
    console.warn('[firebase] Init failed — push notifications disabled:', error);
  }
} else if (!credentials) {
  console.warn(
    '[firebase] FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, or FIREBASE_CLIENT_EMAIL not set — push notifications disabled'
  );
}

export function isFirebaseConfigured(): boolean {
  return firebaseInitialized;
}

export const auth = firebaseInitialized ? admin.auth() : null;
export const messaging = firebaseInitialized ? admin.messaging() : null;
export const storage = firebaseInitialized ? admin.storage() : null;
