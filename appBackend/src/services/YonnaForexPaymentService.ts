import axios from 'axios';
import * as crypto from 'crypto';

export interface YonnaForexPaymentRequest {
  amount: number;
  phone: string;
  currency: string;
  fee: number;
  transactionId: string;
  countryCode: string;
  description?: string;
  orderId?: string;
}

export interface YonnaForexPaymentResponse {
  success: boolean;
  transactionId: string;
  paymentUrl?: string;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
  error?: string;
}

export interface YonnaForexConfig {
  baseUrl: string;
  secretKey: string;
  clientId: string;
}

export interface YonnaForexRequestData {
  client_id: string;
  data: any;
  timestamp: number;
  signature?: string;
}

export class YonnaForexPaymentService {
  private config: YonnaForexConfig;

  constructor(config: YonnaForexConfig) {
    this.config = config;
  }

  /**
   * Process payment through Yonna Forex
   */
  async processPayment(paymentRequest: YonnaForexPaymentRequest): Promise<YonnaForexPaymentResponse> {
    try {
      const { amount, phone, currency, fee, transactionId, countryCode, description } = paymentRequest;

      // Generate timestamp
      const timestamp = Math.floor(Date.now() / 1000);

      // Prepare the data object for HMAC signature (matching working example format)
      const dataObject = {
        amount,
        phone: `${countryCode}${phone}`,
        transactionId: transactionId || `YF_${timestamp}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        description: '', // Always empty as per working example
        fee,
        currency
      };

      // Prepare the request payload structure
      const requestData: YonnaForexRequestData = {
        client_id: this.config.clientId,
        data: dataObject,
        timestamp
      };

      // Create signature using the correct method: Client ID|Timestamp|Data Object
      const dataString = JSON.stringify(dataObject);
      const stringToSign = `${this.config.clientId}|${timestamp}|${dataString}`;
      const signature = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(stringToSign)
        .digest('hex');

      // Add signature to the payload
      requestData.signature = signature;

      // Debug logging
      console.log('Yonna Forex String to Sign:', stringToSign);
      console.log('Yonna Forex Request Payload:', JSON.stringify(requestData, null, 2));
      console.log('Yonna Forex Signature:', signature);

      // Prepare request headers
      const response = await axios.post(this.config.baseUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      });

      console.log('Yonna Forex Response Status:', response.status);
      console.log('Yonna Forex Response Data:', response.data);

      // Handle API errors
      if (response.status === 401) {
        const errorMsg = response.data?.error || 'Authentication failed';
        console.error('Yonna Forex API Error:', errorMsg);
        
        if (errorMsg.includes('Invalid signature')) {
          return {
            success: false,
            transactionId: paymentRequest.transactionId,
            status: 'failed',
            error: 'Invalid API credentials. Please contact support.',
            message: 'Payment service configuration error'
          };
        } else if (errorMsg.includes('Missing parameters')) {
          return {
            success: false,
            transactionId: paymentRequest.transactionId,
            status: 'failed',
            error: 'API format error. Please contact support.',
            message: 'Payment service configuration error'
          };
        }
      }

      // Parse response based on Yonna Forex API structure
      if (response.status === 200) {
        return {
          success: true,
          transactionId,
          status: 'completed',
          message: 'Payment processed successfully'
        };
      } else {
        return {
          success: false,
          transactionId,
          status: 'failed',
          error: 'Payment processing failed',
          message: response.data?.message || 'Unknown error occurred'
        };
      }

    } catch (error: any) {
      console.error('Yonna Forex payment error:', error);
      
      return {
        success: false,
        transactionId: paymentRequest.transactionId,
        status: 'failed',
        error: error.message || 'Payment processing failed',
        message: 'Unable to process payment at this time'
      };
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId: string): Promise<YonnaForexPaymentResponse> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Prepare the request payload structure
      const dataObject = { transactionId };
      const requestData: YonnaForexRequestData = {
        client_id: this.config.clientId,
        data: dataObject,
        timestamp
      };

      // Create signature using the correct method: Client ID|Timestamp|Data Object
      const dataString = JSON.stringify(dataObject);
      const stringToSign = `${this.config.clientId}|${timestamp}|${dataString}`;
      const signature = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(stringToSign)
        .digest('hex');

      // Add signature to the payload
      requestData.signature = signature;
      
      const response = await axios.post(`${this.config.baseUrl}/verify`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      if (response.status === 200) {
        return {
          success: true,
          transactionId,
          status: response.data?.status || 'completed',
          message: 'Payment verified successfully'
        };
      } else {
        return {
          success: false,
          transactionId,
          status: 'failed',
          error: 'Payment verification failed'
        };
      }

    } catch (error: any) {
      console.error('Yonna Forex verification error:', error);
      
      return {
        success: false,
        transactionId,
        status: 'failed',
        error: error.message || 'Payment verification failed'
      };
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(transactionId: string): Promise<YonnaForexPaymentResponse> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Prepare the request payload structure
      const dataObject = { transactionId };
      const requestData: YonnaForexRequestData = {
        client_id: this.config.clientId,
        data: dataObject,
        timestamp
      };

      // Create signature using the correct method: Client ID|Timestamp|Data Object
      const dataString = JSON.stringify(dataObject);
      const stringToSign = `${this.config.clientId}|${timestamp}|${dataString}`;
      const signature = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(stringToSign)
        .digest('hex');

      // Add signature to the payload
      requestData.signature = signature;
      
      const response = await axios.post(`${this.config.baseUrl}/status`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      if (response.status === 200) {
        return {
          success: true,
          transactionId,
          status: response.data?.status || 'pending',
          message: 'Status retrieved successfully'
        };
      } else {
        return {
          success: false,
          transactionId,
          status: 'failed',
          error: 'Unable to retrieve payment status'
        };
      }

    } catch (error: any) {
      console.error('Yonna Forex status check error:', error);
      
      return {
        success: false,
        transactionId,
        status: 'failed',
        error: error.message || 'Unable to retrieve payment status'
      };
    }
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `YF_${timestamp}_${random}`.toUpperCase();
  }
}

export default YonnaForexPaymentService;
