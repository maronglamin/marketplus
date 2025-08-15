import { Request, Response } from 'express';
import { RiderService } from '../services/riderService';
import { authenticate } from '../middleware/auth';

export class RiderApplicationController {
  /**
   * Create a new rider application
   */
  static async createApplication(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Check if user already has an existing application
      const existingCheck = await RiderService.hasExistingApplication(userId);
      if (existingCheck.success && existingCheck.data.hasExisting) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending or approved rider application',
          data: existingCheck.data.application
        });
      }

      const applicationData = {
        userId,
        ...req.body
      };

      const result = await RiderService.createApplication(applicationData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Rider application submitted successfully',
        data: result.data
      });
    } catch (error) {
      console.error('Error in createApplication:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user's rider applications
   */
  static async getUserApplications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await RiderService.getApplicationsByUserId(userId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Error in getUserApplications:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get specific rider application by ID
   */
  static async getApplicationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await RiderService.getApplicationById(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      // Check if the application belongs to the authenticated user
      if (result.data.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Error in getApplicationById:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }



  /**
   * Add document to rider application
   */
  static async addDocument(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Verify the application belongs to the user
      const applicationResult = await RiderService.getApplicationById(applicationId);
      if (!applicationResult.success || applicationResult.data.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const documentData = req.body;
      const result = await RiderService.addDocument(applicationId, documentData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Document added successfully',
        data: result.data
      });
    } catch (error) {
      console.error('Error in addDocument:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Remove document from rider application
   */
  static async removeDocument(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await RiderService.removeDocument(documentId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Document removed successfully'
      });
    } catch (error) {
      console.error('Error in removeDocument:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Check if user has existing application
   */
  static async checkExistingApplication(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await RiderService.hasExistingApplication(userId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Error in checkExistingApplication:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
} 