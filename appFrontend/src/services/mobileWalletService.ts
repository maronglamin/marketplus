export interface MobileWalletProvider {
  id: string;
  name: string;
  code: string;
  country: string;
  isActive: boolean;
}

export const mobileWalletProviders: MobileWalletProvider[] = [
  {
    id: 'wave_gambia',
    name: 'Wave Gambia LTD',
    code: 'WAVE_GMB',
    country: 'Gambia',
    isActive: true,
  },
  {
    id: 'aps_wallet_gambia',
    name: 'APS Wallet Gambia',
    code: 'APS_GMB',
    country: 'Gambia',
    isActive: true,
  },
  {
    id: 'mpesa_kenya',
    name: 'M-Pesa Kenya',
    code: 'MPESA_KEN',
    country: 'Kenya',
    isActive: true,
  },
  {
    id: 'airtel_money_kenya',
    name: 'Airtel Money Kenya',
    code: 'AIRTEL_KEN',
    country: 'Kenya',
    isActive: true,
  },
  {
    id: 'vodafone_cash_ghana',
    name: 'Vodafone Cash Ghana',
    code: 'VODAFONE_GHA',
    country: 'Ghana',
    isActive: true,
  },
  {
    id: 'mtn_momo_ghana',
    name: 'MTN Mobile Money Ghana',
    code: 'MTN_GHA',
    country: 'Ghana',
    isActive: true,
  },
  {
    id: 'orange_money_senegal',
    name: 'Orange Money Senegal',
    code: 'ORANGE_SEN',
    country: 'Senegal',
    isActive: true,
  },
  {
    id: 'wave_senegal',
    name: 'Wave Senegal',
    code: 'WAVE_SEN',
    country: 'Senegal',
    isActive: true,
  },
  {
    id: 'paypal_global',
    name: 'PayPal Global',
    code: 'PAYPAL_GLOBAL',
    country: 'Global',
    isActive: true,
  },
  {
    id: 'apple_pay_global',
    name: 'Apple Pay',
    code: 'APPLE_PAY',
    country: 'Global',
    isActive: true,
  },
  {
    id: 'google_pay_global',
    name: 'Google Pay',
    code: 'GOOGLE_PAY',
    country: 'Global',
    isActive: true,
  },
];

export const mobileWalletService = {
  // Get all active providers
  getActiveProviders: (): MobileWalletProvider[] => {
    return mobileWalletProviders.filter(provider => provider.isActive);
  },

  // Get provider by ID
  getProviderById: (id: string): MobileWalletProvider | undefined => {
    return mobileWalletProviders.find(provider => provider.id === id);
  },

  // Get provider by code
  getProviderByCode: (code: string): MobileWalletProvider | undefined => {
    return mobileWalletProviders.find(provider => provider.code === code);
  },

  // Add new provider (for future scaling)
  addProvider: (provider: Omit<MobileWalletProvider, 'id'>): MobileWalletProvider => {
    const newProvider: MobileWalletProvider = {
      ...provider,
      id: provider.code.toLowerCase().replace(/_/g, '_'),
    };
    mobileWalletProviders.push(newProvider);
    return newProvider;
  },

  // Update provider status
  updateProviderStatus: (id: string, isActive: boolean): boolean => {
    const provider = mobileWalletProviders.find(p => p.id === id);
    if (provider) {
      provider.isActive = isActive;
      return true;
    }
    return false;
  },
}; 