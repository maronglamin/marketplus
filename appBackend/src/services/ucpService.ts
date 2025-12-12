import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UCPServiceFeeConfig {
  name: string;
  value: number; // Percentage as decimal (e.g., 0.05 for 5%)
  description?: string;
  serviceType?: string;
  metadata?: any;
}

export class UCPService {
  /**
   * Get service fee configuration for a specific payment gateway
   */
  static async getServiceFeeConfig(gatewayProvider: string): Promise<UCPServiceFeeConfig | null> {
    try {
      const key = gatewayProvider.toLowerCase();
      // Support common provider aliases so we don't depend on an exact key
      const candidates: string[] = (() => {
        if (key.includes('stripe')) {
          return ['stripe'];
        }
        if (key.includes('wave')) {
          // Try multiple Wave variants
          return ['wave_wallet', 'wave_gambia', 'wave'];
        }
        if (key.includes('yonna') || key.includes('aps')) {
          // Try multiple Yonna variants
          return ['yonna_wallet', 'yonna', 'yonna_forex', 'yonna_forex_wallet', 'aps'];
        }
        // Fallback to given key
        return [key];
      })();

      let found: any = null;
      for (const candidate of candidates) {
        const name = `service_fee_${candidate}`;
        const ucp = await prisma.uCP.findFirst({
          where: {
            name,
            isActive: true,
            serviceType: 'payment_gateway'
          }
        });
        if (ucp) {
          found = ucp;
          break;
        }
      }

      if (!found) {
        console.log(`No service fee configuration found for gateway: ${gatewayProvider} (tried: ${candidates.join(', ')})`);
        return null;
      }

      return {
        name: found.name,
        value: Number(found.value),
        description: found.description || undefined,
        serviceType: found.serviceType || undefined,
        metadata: found.metadata as any
      };
    } catch (error) {
      console.error('Error getting service fee config:', error);
      return null;
    }
  }

  /**
   * Calculate service fee amount based on gateway provider and transaction amount
   */
  static async calculateServiceFee(
    gatewayProvider: string, 
    amount: number, 
    currency: string = 'USD'
  ): Promise<{ serviceFeeAmount: number; serviceFeePercentage: number; config: UCPServiceFeeConfig | null }> {
    try {
      const config = await this.getServiceFeeConfig(gatewayProvider);
      
      if (!config) {
        console.log(`No service fee configuration found for ${gatewayProvider}, returning 0 fee`);
        return {
          serviceFeeAmount: 0,
          serviceFeePercentage: 0,
          config: null
        };
      }

      const serviceFeeAmount = amount * config.value;
      const serviceFeePercentage = config.value * 100; // Convert to percentage for display

      console.log(`Service fee calculation for ${gatewayProvider}:`, {
        amount,
        currency,
        serviceFeePercentage: `${serviceFeePercentage}%`,
        serviceFeeAmount,
        config: config.name
      });

      return {
        serviceFeeAmount,
        serviceFeePercentage,
        config
      };
    } catch (error) {
      console.error('Error calculating service fee:', error);
      return {
        serviceFeeAmount: 0,
        serviceFeePercentage: 0,
        config: null
      };
    }
  }

  /**
   * Get all active UCP configurations
   */
  static async getAllActiveConfigs(): Promise<UCPServiceFeeConfig[]> {
    try {
      const ucps = await prisma.uCP.findMany({
        where: {
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return ucps.map(ucp => ({
        name: ucp.name,
        value: Number(ucp.value),
        description: ucp.description || undefined,
        serviceType: ucp.serviceType || undefined,
        metadata: ucp.metadata as any
      }));
    } catch (error) {
      console.error('Error getting all UCP configs:', error);
      return [];
    }
  }

  /**
   * Update service fee configuration
   */
  static async updateServiceFeeConfig(
    gatewayProvider: string, 
    newValue: number, 
    description?: string
  ): Promise<UCPServiceFeeConfig | null> {
    try {
      const ucpName = `service_fee_${gatewayProvider.toLowerCase()}`;
      
      const updatedUcp = await prisma.uCP.upsert({
        where: { name: ucpName },
        update: {
          value: newValue,
          description: description,
          updatedAt: new Date()
        },
        create: {
          name: ucpName,
          value: newValue,
          description: description,
          serviceType: 'payment_gateway',
          isActive: true,
          metadata: {
            gateway: gatewayProvider.toLowerCase(),
            feeType: 'percentage',
            minAmount: 0,
            maxAmount: null,
            currency: 'USD'
          }
        }
      });

      return {
        name: updatedUcp.name,
        value: Number(updatedUcp.value),
        description: updatedUcp.description || undefined,
        serviceType: updatedUcp.serviceType || undefined,
        metadata: updatedUcp.metadata as any
      };
    } catch (error) {
      console.error('Error updating service fee config:', error);
      return null;
    }
  }

  /**
   * Disable service fee configuration
   */
  static async disableServiceFeeConfig(gatewayProvider: string): Promise<boolean> {
    try {
      const ucpName = `service_fee_${gatewayProvider.toLowerCase()}`;
      
      await prisma.uCP.update({
        where: { name: ucpName },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('Error disabling service fee config:', error);
      return false;
    }
  }
}

export default UCPService; 