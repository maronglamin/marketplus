import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

type ApprovalCheckResult = {
  isApproved: boolean;
};

type UseApprovalRedirectOptions = {
  enabled: boolean;
  checkApproval: () => Promise<ApprovalCheckResult>;
  onApproved: () => void;
  title?: string;
  message?: string;
  pollIntervalMs?: number;
};

export function useApprovalRedirect({
  enabled,
  checkApproval,
  onApproved,
  title = 'Application Approved',
  message = 'Your application has been approved. Opening your dashboard…',
  pollIntervalMs = 8000,
}: UseApprovalRedirectOptions) {
  const redirectedRef = useRef(false);

  const handleApproved = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    Alert.alert(title, message);
    onApproved();
  }, [message, onApproved, title]);

  const poll = useCallback(async () => {
    if (!enabled || redirectedRef.current) return;
    try {
      const result = await checkApproval();
      if (result.isApproved) {
        handleApproved();
      }
    } catch {
      // ignore polling errors
    }
  }, [checkApproval, enabled, handleApproved]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      void poll();
      const interval = setInterval(() => {
        void poll();
      }, pollIntervalMs);
      return () => clearInterval(interval);
    }, [enabled, poll, pollIntervalMs]),
  );

  useEffect(() => {
    redirectedRef.current = false;
  }, [enabled]);
}
