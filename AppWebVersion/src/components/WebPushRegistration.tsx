import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { registerWebPush, unregisterWebPush } from '../services/webPushService';

/**
 * Best-effort web push registration after login (same pattern as directPay / 7a-side).
 */
export function WebPushRegistration() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user?.id) {
      return;
    }

    void registerWebPush(user.id).catch(() => {
      /* Push registration must not block app usage */
    });
  }, [isLoading, user?.id]);

  useEffect(() => {
    if (!isLoading && !user) {
      void unregisterWebPush();
    }
  }, [isLoading, user]);

  return null;
}
