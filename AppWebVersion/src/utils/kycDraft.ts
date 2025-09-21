type KycDraft = {
  businessData?: any;
  addressData?: any;
  verificationData?: any;
};

const STORAGE_KEY = 'seller_kyc_draft_v1';

export const kycDraft = {
  load(): KycDraft {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as KycDraft;
    } catch {
      return {};
    }
  },
  save(partial: KycDraft) {
    const current = kycDraft.load();
    const next = { ...current, ...partial };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
  clear() {
    sessionStorage.removeItem(STORAGE_KEY);
  },
};


