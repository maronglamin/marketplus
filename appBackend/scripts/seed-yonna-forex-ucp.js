#!/usr/bin/env node

/**
 * Seed Yonna Forex UCP Configuration
 * 
 * This script adds the service_fee_yonna_wallet UCP configuration to the database.
 * Run with: node scripts/seed-yonna-forex-ucp.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedYonnaForexUCP() {
  console.log('🌱 Seeding Yonna Forex UCP Configuration...');
  
  try {
    // Check if the UCP configuration already exists
    const existingUCP = await prisma.uCP.findFirst({
      where: {
        name: 'service_fee_yonna_wallet'
      }
    });

    if (existingUCP) {
      console.log('✅ UCP configuration for Yonna Forex already exists');
      console.log('Current configuration:', {
        name: existingUCP.name,
        value: existingUCP.value,
        description: existingUCP.description,
        isActive: existingUCP.isActive
      });
      return;
    }

    // Create the UCP configuration
    const ucpConfig = await prisma.uCP.create({
      data: {
        name: 'service_fee_yonna_wallet',
        value: 0.03, // 3% service fee for Yonna Forex wallet payments
        description: 'Service fee percentage for Yonna Forex wallet payment gateway transactions',
        serviceType: 'payment_gateway',
        isActive: true,
        metadata: {
          gateway: 'yonna_forex',
          feeType: 'percentage',
          minAmount: 0,
          maxAmount: null,
          currency: 'GMD'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Yonna Forex UCP configuration created successfully!');
    console.log('Configuration details:', {
      id: ucpConfig.id,
      name: ucpConfig.name,
      value: `${(ucpConfig.value * 100).toFixed(1)}%`,
      description: ucpConfig.description,
      serviceType: ucpConfig.serviceType,
      isActive: ucpConfig.isActive,
      metadata: ucpConfig.metadata
    });

    console.log('\n📋 Service Fee Details:');
    console.log('- Gateway: Yonna Forex');
    console.log('- Fee Type: Percentage');
    console.log('- Fee Rate: 3.0%');
    console.log('- Currency: GMD (Gambian Dalasi)');
    console.log('- Min Amount: No minimum');
    console.log('- Max Amount: No maximum');

  } catch (error) {
    console.error('❌ Error seeding Yonna Forex UCP configuration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedYonnaForexUCP();

