import { PrismaClient, RiderVehicleType, RiderApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateRiderApplicationData {
  userId: string;
  vehicleType: RiderVehicleType;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber: string;
  dateOfBirth?: string;
  address: string;
  city: string;
  licenseNumber: string;
  licenseExpiry: string;
  vehicleModel: string;
  vehiclePlate: string;
  insuranceNumber?: string;
  insuranceExpiry?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  experience?: string;
  availability?: string;
  documents?: Array<{
    documentType: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }>;
}



export class RiderService {
  /**
   * Create a new rider application
   */
  static async createApplication(data: CreateRiderApplicationData) {
    try {
      const application = await prisma.riderApplication.create({
        data: {
          userId: data.userId,
          vehicleType: data.vehicleType,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phoneNumber: data.phoneNumber,
          dateOfBirth: data.dateOfBirth,
          address: data.address,
          city: data.city,
          licenseNumber: data.licenseNumber,
          licenseExpiry: data.licenseExpiry,
          vehicleModel: data.vehicleModel,
          vehiclePlate: data.vehiclePlate,
          insuranceNumber: data.insuranceNumber,
          insuranceExpiry: data.insuranceExpiry,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
          experience: data.experience,
          availability: data.availability,
          documents: {
            create: data.documents || []
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          },
          documents: true
        }
      });

      return {
        success: true,
        data: application
      };
    } catch (error) {
      console.error('Error creating rider application:', error);
      console.error('Application data received:', data);
      return {
        success: false,
        error: `Failed to create rider application: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get rider application by ID
   */
  static async getApplicationById(id: string) {
    try {
      const application = await prisma.riderApplication.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          },
          documents: true
        }
      });

      if (!application) {
        return {
          success: false,
          error: 'Rider application not found'
        };
      }

      return {
        success: true,
        data: application
      };
    } catch (error) {
      console.error('Error fetching rider application:', error);
      return {
        success: false,
        error: 'Failed to fetch rider application'
      };
    }
  }

  /**
   * Get rider applications by user ID
   */
  static async getApplicationsByUserId(userId: string) {
    try {
      const applications = await prisma.riderApplication.findMany({
        where: { userId },
        include: {
          documents: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return {
        success: true,
        data: applications
      };
    } catch (error) {
      console.error('Error fetching rider applications:', error);
      return {
        success: false,
        error: 'Failed to fetch rider applications'
      };
    }
  }



  /**
   * Check if user has existing application
   */
  static async hasExistingApplication(userId: string) {
    try {
      const existingApplication = await prisma.riderApplication.findFirst({
        where: {
          userId,
          status: {
            in: ['PENDING', 'UNDER_REVIEW', 'APPROVED']
          }
        }
      });

      return {
        success: true,
        data: {
          hasExisting: !!existingApplication,
          application: existingApplication
        }
      };
    } catch (error) {
      console.error('Error checking existing application:', error);
      return {
        success: false,
        error: 'Failed to check existing application'
      };
    }
  }

  /**
   * Add document to rider application
   */
  static async addDocument(riderApplicationId: string, documentData: {
    documentType: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }) {
    try {
      const document = await prisma.riderDocument.create({
        data: {
          riderApplicationId,
          ...documentData
        }
      });

      return {
        success: true,
        data: document
      };
    } catch (error) {
      console.error('Error adding document:', error);
      return {
        success: false,
        error: 'Failed to add document'
      };
    }
  }

  /**
   * Remove document from rider application
   */
  static async removeDocument(documentId: string) {
    try {
      await prisma.riderDocument.delete({
        where: { id: documentId }
      });

      return {
        success: true
      };
    } catch (error) {
      console.error('Error removing document:', error);
      return {
        success: false,
        error: 'Failed to remove document'
      };
    }
  }
} 