import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the API base URL
const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.40.48';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

export interface DeliveryOption {
  id?: string;
  deliveryType: 'STANDARD' | 'EXPRESS' | 'SAME_DAY' | 'NEXT_DAY' | 'PICKUP' | 'INTERNATIONAL';
  name: string;
  description?: string;
  price: number;
  currencyCode: string;
  estimatedDays: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

class DeliveryOptionsService {
  private baseURL = `${API_URL}/api/products`;

  // Get auth headers
  private async getAuthHeaders() {
    try {
      const token = await AsyncStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {};
    }
  }

  // Get delivery options for a product
  async getDeliveryOptions(productId: string): Promise<DeliveryOption[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${this.baseURL}/${productId}/delivery-options`, { headers });
      return response.data;
    } catch (error) {
      console.error('Error fetching delivery options:', error);
      throw error;
    }
  }

  // Create or update delivery options for a product
  async updateDeliveryOptions(productId: string, deliveryOptions: DeliveryOption[]): Promise<DeliveryOption[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post(`${this.baseURL}/${productId}/delivery-options`, {
        deliveryOptions
      }, { headers });
      return response.data;
    } catch (error) {
      console.error('Error updating delivery options:', error);
      throw error;
    }
  }

  // Delete a specific delivery option
  async deleteDeliveryOption(productId: string, optionId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      await axios.delete(`${this.baseURL}/${productId}/delivery-options/${optionId}`, { headers });
    } catch (error) {
      console.error('Error deleting delivery option:', error);
      throw error;
    }
  }

  // Get delivery type labels
  getDeliveryTypeLabels() {
    return {
      STANDARD: 'Standard Delivery',
      EXPRESS: 'Express Delivery',
      SAME_DAY: 'Same Day Delivery',
      NEXT_DAY: 'Next Day Delivery',
      PICKUP: 'Pickup',
      INTERNATIONAL: 'International Delivery',
    };
  }

  // Get popular currencies
  getPopularCurrencies(): Currency[] {
    return [
      // Major World Currencies
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
      { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
      { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
      { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
      { code: 'THB', name: 'Thai Baht', symbol: '฿' },
      { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
      { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
      { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
      { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
      { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
      { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
      { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
      { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
      { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
      { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
      { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK' },
      { code: 'BWP', name: 'Botswana Pula', symbol: 'P' },
      { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$' },
      { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨' },
      { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
      { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
      { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
      { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨' },
      { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K' },
      { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
      { code: 'LAK', name: 'Lao Kip', symbol: '₭' },
      { code: 'MNT', name: 'Mongolian Tugrik', symbol: '₮' },
      { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
      { code: 'UZS', name: 'Uzbekistani Som', symbol: "so'm" },
      { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼' },
      { code: 'GEL', name: 'Georgian Lari', symbol: '₾' },
      { code: 'AMD', name: 'Armenian Dram', symbol: '֏' },
      { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br' },
      { code: 'MDL', name: 'Moldovan Leu', symbol: 'L' },
      { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
      { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин' },
      { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn' },
      { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
      { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
      { code: 'ALL', name: 'Albanian Lek', symbol: 'L' },
      { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден' },
      { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM' },
      { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr' },
      { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
      { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD' },
      { code: 'LBP', name: 'Lebanese Pound', symbol: 'L£' },
      { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
      { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
      { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
      { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD' },
      { code: 'OMR', name: 'Omani Rial', symbol: 'OR' },
      { code: 'YER', name: 'Yemeni Rial', symbol: '﷼' },
      { code: 'IRR', name: 'Iranian Rial', symbol: '﷼' },
      { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د' },
      { code: 'AFN', name: 'Afghan Afghani', symbol: '؋' },
      { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'ЅM' },
      { code: 'TMT', name: 'Turkmenistan Manat', symbol: 'T' },
      { code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'с' },
      { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA' },
      { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA' },
      { code: 'XPF', name: 'CFP Franc', symbol: '₣' },
      { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
      { code: 'COP', name: 'Colombian Peso', symbol: '$' },
      { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
      { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
      { code: 'UYU', name: 'Uruguayan Peso', symbol: '$' },
      { code: 'PYG', name: 'Paraguayan Guaraní', symbol: '₲' },
      { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs' },
      { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q' },
      { code: 'HNL', name: 'Honduran Lempira', symbol: 'L' },
      { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$' },
      { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡' },
      { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.' },
      { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$' },
      { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$' },
      { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$' },
      { code: 'BBD', name: 'Barbadian Dollar', symbol: 'Bds$' },
      { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$' },
      { code: 'GYD', name: 'Guyanese Dollar', symbol: 'G$' },
      { code: 'SRD', name: 'Surinamese Dollar', symbol: '$' },
      { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$' },
      { code: 'WST', name: 'Samoan Tālā', symbol: 'T' },
      { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$' },
      { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'VT' },
      { code: 'SBD', name: 'Solomon Islands Dollar', symbol: 'SI$' },
      { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K' },
      { code: 'KID', name: 'Kiribati Dollar', symbol: '$' },
      { code: 'TVD', name: 'Tuvaluan Dollar', symbol: '$' },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
      // Additional African Currencies
      { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
      { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت' },
      { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.' },
      { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج' },
      { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د' },
      { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س.' },
      { code: 'SOS', name: 'Somali Shilling', symbol: 'Sh' },
      { code: 'DJF', name: 'Djiboutian Franc', symbol: 'Fdj' },
      { code: 'ERN', name: 'Eritrean Nakfa', symbol: 'Nfk' },
      { code: 'SSP', name: 'South Sudanese Pound', symbol: 'SSP' },
      { code: 'CDF', name: 'Congolese Franc', symbol: 'FC' },
      { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw' },
      { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu' },
      { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK' },
      { code: 'ZWL', name: 'Zimbabwean Dollar', symbol: 'Z$' },
      { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT' },
      { code: 'SZL', name: 'Swazi Lilangeni', symbol: 'L' },
      { code: 'LSL', name: 'Lesotho Loti', symbol: 'L' },
      { code: 'STD', name: 'São Tomé and Príncipe Dobra', symbol: 'Db' },
      { code: 'CVE', name: 'Cape Verdean Escudo', symbol: 'Esc' },
      { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D' },
      { code: 'GNF', name: 'Guinean Franc', symbol: 'FG' },
      { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le' },
      { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$' },
      // Additional Asian Currencies
      { code: 'MOP', name: 'Macanese Pataca', symbol: 'MOP$' },
      { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
    ];
  }

  // Search currencies by name or code
  searchCurrencies(query: string): Currency[] {
    const currencies = this.getPopularCurrencies();
    const lowerQuery = query.toLowerCase();
    return currencies.filter(currency => 
      currency.name.toLowerCase().includes(lowerQuery) ||
      currency.code.toLowerCase().includes(lowerQuery) ||
      currency.symbol.toLowerCase().includes(lowerQuery)
    );
  }

  // Get currency by code
  getCurrencyByCode(code: string): Currency | undefined {
    return this.getPopularCurrencies().find(currency => currency.code === code);
  }

  // Get default delivery options template
  getDefaultDeliveryOptions(): DeliveryOption[] {
    return [
      {
        deliveryType: 'STANDARD',
        name: 'Standard Delivery',
        description: 'Regular delivery within 3-5 business days',
        price: 5.00,
        currencyCode: 'USD',
        estimatedDays: 5,
        isDefault: true,
        isActive: true,
      },
      {
        deliveryType: 'EXPRESS',
        name: 'Express Delivery',
        description: 'Fast delivery within 1-2 business days',
        price: 15.00,
        currencyCode: 'USD',
        estimatedDays: 2,
        isDefault: false,
        isActive: true,
      },
    ];
  }
}

export const deliveryOptionsService = new DeliveryOptionsService(); 