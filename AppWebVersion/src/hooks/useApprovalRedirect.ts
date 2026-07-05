import { useCallback, useEffect, useRef } from 'react';

type ApprovalCheckResult = {
  isApproved: boolean;
};

type UseApprovalRedirectOptions = {
  enabled: boolean;
  checkApproval: () => Promise<ApprovalCheckResult>;
  onApproved: () => void;
  pollIntervalMs?: number;
};

export function useApprovalRedirect({
  enabled,
  checkApproval,
  onApproved,
  pollIntervalMs = 8000,
}: UseApprovalRedirectOptions) {
  const redirectedRef = useRef(false);

  const handleApproved = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    onApproved();
  }, [onApproved]);

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

  useEffect(() => {
    if (!enabled) return undefined;
    void poll();
    const interval = setInterval(() => {
      void poll();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, poll, pollIntervalMs]);

  useEffect(() => {
    redirectedRef.current = false;
  }, [enabled]);
}
