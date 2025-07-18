import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Get all active payment gateway service providers
export const getPaymentGatewayServiceProviders = async (req: Request, res: Response) => {
  try {
    const { type, countryCode, currencyCode } = req.query;

    const whereClause: any = {
      isActive: true
    };

    // Add filters if provided
    if (type) {
      whereClause.type = type;
    }
    if (countryCode) {
      whereClause.countryCode = countryCode;
    }
    if (currencyCode) {
      whereClause.currencyCode = currencyCode;
    }

    const providers = await prisma.paymentGatewayServiceProvider.findMany({
      where: whereClause,
      orderBy: [
        { name: 'asc' }
      ]
    });

    logger.info('Retrieved payment gateway service providers:', { 
      count: providers.length,
      filters: { type, countryCode, currencyCode }
    });

    res.json({
      providers,
      count: providers.length
    });
  } catch (error) {
    logger.error('Error getting payment gateway service providers:', error);
    res.status(500).json({ 
      message: 'Failed to get payment gateway service providers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get payment gateway service provider by ID
export const getPaymentGatewayServiceProviderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Provider ID is required' });
    }

    const provider = await prisma.paymentGatewayServiceProvider.findUnique({
      where: { id }
    });

    if (!provider) {
      return res.status(404).json({ message: 'Payment gateway service provider not found' });
    }

    logger.info('Retrieved payment gateway service provider:', { id });

    res.json({
      provider
    });
  } catch (error) {
    logger.error('Error getting payment gateway service provider:', error);
    res.status(500).json({ 
      message: 'Failed to get payment gateway service provider',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new payment gateway service provider (Admin only)
export const createPaymentGatewayServiceProvider = async (req: Request, res: Response) => {
  try {
    const { name, type, countryCode, currencyCode, logoUrl, description, metadata } = req.body;

    // Validate required fields
    if (!name || !type || !countryCode || !currencyCode) {
      return res.status(400).json({ 
        message: 'Name, type, countryCode, and currencyCode are required' 
      });
    }

    const newProvider = await prisma.paymentGatewayServiceProvider.create({
      data: {
        name: name.trim(),
        type: type.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        currencyCode: currencyCode.trim().toUpperCase(),
        logoUrl: logoUrl?.trim() || null,
        description: description?.trim() || null,
        metadata: metadata || null
      }
    });

    logger.info('Created payment gateway service provider:', { 
      id: newProvider.id,
      name: newProvider.name
    });

    res.status(201).json({
      message: 'Payment gateway service provider created successfully',
      provider: newProvider
    });
  } catch (error) {
    logger.error('Error creating payment gateway service provider:', error);
    res.status(500).json({ 
      message: 'Failed to create payment gateway service provider',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update a payment gateway service provider (Admin only)
export const updatePaymentGatewayServiceProvider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, countryCode, currencyCode, logoUrl, description, metadata, isActive } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Provider ID is required' });
    }

    // Check if provider exists
    const existingProvider = await prisma.paymentGatewayServiceProvider.findUnique({
      where: { id }
    });

    if (!existingProvider) {
      return res.status(404).json({ message: 'Payment gateway service provider not found' });
    }

    const updatedProvider = await prisma.paymentGatewayServiceProvider.update({
      where: { id },
      data: {
        name: name?.trim() || undefined,
        type: type?.trim() || undefined,
        countryCode: countryCode?.trim().toUpperCase() || undefined,
        currencyCode: currencyCode?.trim().toUpperCase() || undefined,
        logoUrl: logoUrl?.trim() || undefined,
        description: description?.trim() || undefined,
        metadata: metadata || undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    logger.info('Updated payment gateway service provider:', { id });

    res.json({
      message: 'Payment gateway service provider updated successfully',
      provider: updatedProvider
    });
  } catch (error) {
    logger.error('Error updating payment gateway service provider:', error);
    res.status(500).json({ 
      message: 'Failed to update payment gateway service provider',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a payment gateway service provider (Admin only)
export const deletePaymentGatewayServiceProvider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Provider ID is required' });
    }

    // Check if provider exists
    const existingProvider = await prisma.paymentGatewayServiceProvider.findUnique({
      where: { id }
    });

    if (!existingProvider) {
      return res.status(404).json({ message: 'Payment gateway service provider not found' });
    }

    await prisma.paymentGatewayServiceProvider.delete({
      where: { id }
    });

    logger.info('Deleted payment gateway service provider:', { id });

    res.json({
      message: 'Payment gateway service provider deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting payment gateway service provider:', error);
    res.status(500).json({ 
      message: 'Failed to delete payment gateway service provider',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 