import { api } from './api';

export interface RiderApplicationData {
  vehicleType: 'DRIVER' | 'MOTORCYCLE' | 'BICYCLE';
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

export interface RiderApplication {
  id: string;
  userId: string;
  vehicleType: 'DRIVER' | 'MOTORCYCLE' | 'BICYCLE';
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
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    uploadedAt: string;
  }>;
}

export interface RiderDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
}

export class RiderApplicationService {
  /**
   * Create a new rider application
   */
  static async createApplication(data: RiderApplicationData): Promise<{
    success: boolean;
    message?: string;
    data?: RiderApplication;
    error?: string;
  }> {
    try {
      const response = await api.post('/api/rider/applications', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating rider application:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create rider application'
      };
    }
  }

  /**
   * Get user's rider applications
   */
  static async getUserApplications(): Promise<{
    success: boolean;
    data?: RiderApplication[];
    error?: string;
  }> {
    try {
      const response = await api.get('/api/rider/applications');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching rider applications:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch rider applications'
      };
    }
  }

  /**
   * Get specific rider application by ID
   */
  static async getApplicationById(id: string): Promise<{
    success: boolean;
    data?: RiderApplication;
    error?: string;
  }> {
    try {
      const response = await api.get(`/api/rider/applications/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching rider application:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch rider application'
      };
    }
  }

  /**
   * Check if user has existing application
   */
  static async checkExistingApplication(): Promise<{
    success: boolean;
    data?: {
      hasExisting: boolean;
      application?: RiderApplication;
    };
    error?: string;
  }> {
    try {
      const response = await api.get('/api/rider/applications/check/existing');
      return response.data;
    } catch (error: any) {
      console.error('Error checking existing application:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check existing application'
      };
    }
  }

  /**
   * Add document to rider application
   */
  static async addDocument(
    applicationId: string,
    documentData: {
      documentType: string;
      fileName: string;
      fileUrl: string;
      fileSize?: number;
      mimeType?: string;
    }
  ): Promise<{
    success: boolean;
    message?: string;
    data?: RiderDocument;
    error?: string;
  }> {
    try {
      const response = await api.post(`/api/rider/applications/${applicationId}/documents`, documentData);
      return response.data;
    } catch (error: any) {
      console.error('Error adding document:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add document'
      };
    }
  }

  /**
   * Remove document from rider application
   */
  static async removeDocument(documentId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await api.delete(`/api/rider/documents/${documentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error removing document:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove document'
      };
    }
  }

  /**
   * Upload file to server and get URL
   */
  static async uploadFile(file: any, documentType: string): Promise<{
    success: boolean;
    data?: {
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      originalName: string;
    };
    error?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const response = await api.post('/api/rider-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to upload file'
        };
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to upload file'
      };
    }
  }

  /**
   * Upload multiple files to server
   */
  static async uploadMultipleFiles(files: any[], documentType: string): Promise<{
    success: boolean;
    data?: Array<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      originalName: string;
    }>;
    error?: string;
  }> {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('files', file);
      });
      formData.append('documentType', documentType);

      const response = await api.post('/api/rider-upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to upload files'
        };
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to upload files'
      };
    }
  }
} 