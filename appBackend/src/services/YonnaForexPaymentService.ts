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
  appTransactionId?: string;
}

export interface YonnaForexPaymentResponse {
  success: boolean;
  transactionId: string;
  paymentUrl?: string;
  paymentHtml?: string;
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
      const { amount, phone, currency, fee, transactionId, countryCode, appTransactionId } = paymentRequest;

      // Normalize phone to include country code exactly once
      const trimmedPhone = (phone || '').replace(/\s+/g, '');
      const trimmedCode = (countryCode || '').replace(/\s+/g, '');
      let fullPhone = trimmedPhone;
      if (trimmedPhone.startsWith('+')) {
        fullPhone = trimmedPhone;
      } else if (trimmedPhone.startsWith(trimmedCode.replace(/^\+/, ''))) {
        fullPhone = trimmedCode.startsWith('+') ? `+${trimmedPhone}`.replace(/^\+\+/, '+') : `+${trimmedPhone}`;
      } else if (trimmedCode) {
        const cc = trimmedCode.startsWith('+') ? trimmedCode : `+${trimmedCode}`;
        fullPhone = `${cc}${trimmedPhone}`;
      } else {
        // Fallback: ensure plus
        fullPhone = trimmedPhone.startsWith('+') ? trimmedPhone : `+${trimmedPhone}`;
      }

      // Generate timestamp
      const timestamp = Math.floor(Date.now() / 1000);

      // Prepare the data object for HMAC signature (matching working example format)
      const dataObject = {
        amount,
        phone: fullPhone,
        transactionId: transactionId || `YF_${timestamp}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        description: '', // Always empty as per working example
        fee,
        currency,
        appTransactionId: appTransactionId
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
        const errorMsg = (response.data?.error || response.data?.message || 'Authentication failed') as string;
        console.error('Yonna Forex API Error:', errorMsg);
        
        if (errorMsg.includes('Invalid signature')) {
          return {
            success: false,
            transactionId: paymentRequest.transactionId,
            status: 'failed',
            error: 'Invalid API credentials. Please contact support.',
            message: 'Payment service configuration error'
          };
        } else if (errorMsg.toLowerCase().includes('invalid client')) {
          return {
            success: false,
            transactionId: paymentRequest.transactionId,
            status: 'failed',
            error: 'Invalid client credentials (client_id). Verify YONNA_FOREX_CLIENT_ID.',
            message: 'Payment service authentication failed'
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

      // Parse response. Yonna returns an HTML page containing the QR screen.
      if (response.status === 200) {
        const contentType = response.headers['content-type'] || '';
        if (typeof response.data === 'string' && contentType.includes('text/html')) {
          // Try to extract a mobile deeplink/URL from the HTML for app redirect
          const html: string = response.data;
          let deeplinkUrl: string | undefined;
          // Pattern 1a: var link = "https://.../corporate?payload=...";
          const varLinkMatch = html.match(/var\s+link\s*=\s*"([^"]+)"/);
          if (varLinkMatch && varLinkMatch[1]) {
            deeplinkUrl = varLinkMatch[1];
          } else {
            // Pattern 1b: var link = 'https://.../corporate?payload=...';
            const varLinkMatchSingle = html.match(/var\s+link\s*=\s*'([^']+)'/);
            if (varLinkMatchSingle && varLinkMatchSingle[1]) {
              deeplinkUrl = varLinkMatchSingle[1];
            } else {
              // Pattern 2: any https URL to /corporate?...
              const urlMatch = html.match(/https?:\/\/[^"']+\/corporate\?[^"']+/);
              if (urlMatch && urlMatch[0]) {
                deeplinkUrl = urlMatch[0];
              }
            }
          }
          return {
            success: true,
            transactionId,
            status: 'pending',
            message: 'Scan the QR code to complete payment',
            paymentHtml: html,
            ...(deeplinkUrl ? { paymentUrl: deeplinkUrl } : {})
          };
        }

        return {
          success: true,
          transactionId,
          status: 'pending',
          message: 'Payment initiated. Awaiting customer confirmation'
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
      const apiError = error?.response?.data || error?.message || error;
      console.error('Yonna Forex payment error:', apiError);
      
      return {
        success: false,
        transactionId: paymentRequest.transactionId,
        status: 'failed',
        error: (apiError?.error || apiError?.message || String(apiError) || 'Payment processing failed'),
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
      
      // Some environments expose initiate at /corporate/app, but verify/status at /corporate
      const baseForVerify = this.config.baseUrl.replace(/\/app\/?$/, '');
      const verifyUrl = `${baseForVerify}/verify`;
      const response = await axios.post(verifyUrl, requestData, {
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
      console.error('Yonna Forex verification error:', {
        url: this.config.baseUrl,
        derivedUrl: this.config.baseUrl.replace(/\/app\/?$/, '') + '/verify',
        error: error.response?.data || error.message
      });
      
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
      
      const baseForStatus = this.config.baseUrl.replace(/\/app\/?$/, '');
      const statusUrl = `${baseForStatus}/status`;
      const response = await axios.post(statusUrl, requestData, {
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
      console.error('Yonna Forex status check error:', {
        url: this.config.baseUrl,
        derivedUrl: this.config.baseUrl.replace(/\/app\/?$/, '') + '/status',
        error: error.response?.data || error.message
      });
      
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
