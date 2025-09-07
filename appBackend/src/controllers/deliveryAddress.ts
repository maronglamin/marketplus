import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    deviceId: string;
  };
}

// Get all delivery addresses for a user
export const getUserDeliveryAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const addresses = await prisma.deliveryAddress.findMany({
      where: { 
        userId,
        isDeleted: false
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    logger.info('Retrieved delivery addresses for user:', { userId, count: addresses.length });

    res.json({
      addresses,
      count: addresses.length
    });
  } catch (error) {
    logger.error('Error getting delivery addresses:', error);
    res.status(500).json({ 
      message: 'Failed to get delivery addresses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new delivery address
export const createDeliveryAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { address, city, state, postalCode, country, label, isDefault } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate required fields
    if (!address || !city || !state || !country) {
      return res.status(400).json({ 
        message: 'Address, city, state, and country are required' 
      });
    }

    // If this is set as default, unset other default addresses
    if (isDefault) {
      await prisma.deliveryAddress.updateMany({
        where: { 
          userId,
          isDefault: true,
          isDeleted: false
        },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.deliveryAddress.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode?.trim() || null,
        country: country.trim(),
        label: label?.trim() || null,
        isDefault: isDefault || false,
        updatedAt: new Date(),
      }
    });

    logger.info('Created delivery address:', { userId, addressId: newAddress.id });

    res.status(201).json({
      message: 'Delivery address created successfully',
      address: newAddress
    });
  } catch (error) {
    logger.error('Error creating delivery address:', error);
    res.status(500).json({ 
      message: 'Failed to create delivery address',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update a delivery address
export const updateDeliveryAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { addressId } = req.params;
    const { address, city, state, postalCode, country, label, isDefault } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!addressId) {
      return res.status(400).json({ message: 'Address ID is required' });
    }

    // Validate required fields
    if (!address || !city || !state || !country) {
      return res.status(400).json({ 
        message: 'Address, city, state, and country are required' 
      });
    }

    // Check if address exists and belongs to user
    const existingAddress = await prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId
      }
    });

    if (!existingAddress) {
      return res.status(404).json({ message: 'Delivery address not found' });
    }

    // If this is set as default, unset other default addresses
    if (isDefault) {
      await prisma.deliveryAddress.updateMany({
        where: { 
          userId,
          isDefault: true,
          isDeleted: false,
          id: { not: addressId }
        },
        data: { isDefault: false }
      });
    }

    const updatedAddress = await prisma.deliveryAddress.update({
      where: { id: addressId },
      data: {
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode?.trim() || null,
        country: country.trim(),
        label: label?.trim() || null,
        isDefault: isDefault || false
      }
    });

    logger.info('Updated delivery address:', { userId, addressId });

    res.json({
      message: 'Delivery address updated successfully',
      address: updatedAddress
    });
  } catch (error) {
    logger.error('Error updating delivery address:', error);
    res.status(500).json({ 
      message: 'Failed to update delivery address',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a delivery address
export const deleteDeliveryAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { addressId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!addressId) {
      return res.status(400).json({ message: 'Address ID is required' });
    }

    // Check if address exists and belongs to user
    const existingAddress = await prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId
      }
    });

    if (!existingAddress) {
      return res.status(404).json({ message: 'Delivery address not found' });
    }

    await prisma.deliveryAddress.update({
      where: { id: addressId },
      data: { isDeleted: true }
    });

    logger.info('Deleted delivery address:', { userId, addressId });

    res.json({
      message: 'Delivery address deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting delivery address:', error);
    res.status(500).json({ 
      message: 'Failed to delete delivery address',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Set default delivery address
export const setDefaultDeliveryAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { addressId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!addressId) {
      return res.status(400).json({ message: 'Address ID is required' });
    }

    // Check if address exists and belongs to user
    const existingAddress = await prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId
      }
    });

    if (!existingAddress) {
      return res.status(404).json({ message: 'Delivery address not found' });
    }

    // Unset all default addresses for this user
    await prisma.deliveryAddress.updateMany({
      where: { 
        userId,
        isDefault: true,
        isDeleted: false
      },
      data: { isDefault: false }
    });

    // Set the specified address as default
    const updatedAddress = await prisma.deliveryAddress.update({
      where: { id: addressId },
      data: { isDefault: true }
    });

    logger.info('Set default delivery address:', { userId, addressId });

    res.json({
      message: 'Default delivery address set successfully',
      address: updatedAddress
    });
  } catch (error) {
    logger.error('Error setting default delivery address:', error);
    res.status(500).json({ 
      message: 'Failed to set default delivery address',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 