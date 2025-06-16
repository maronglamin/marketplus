import getApi from '../api/config';
import axios, { AxiosProgressEvent } from 'axios';

const MAX_RETRIES = 3;
const UPLOAD_TIMEOUT = 30000; // Reduced from 60s to 30s for faster timeout
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for better progress tracking

export const uploadService = {
  async uploadImage(imageUri: string): Promise<string> {
    let lastError: Error | unknown;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Attempting to upload image (attempt ${attempt}/${MAX_RETRIES})`);
        
        // Create form data
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'upload.jpg'
        } as any);

        // Get API instance with increased timeout
        const api = await getApi();
        const response = await api.post('/upload', formData, {
          timeout: UPLOAD_TIMEOUT,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              console.log(`Upload progress: ${percentCompleted}%`);
            }
          },
          maxContentLength: 5 * 1024 * 1024, // 5MB max
          maxBodyLength: 5 * 1024 * 1024, // 5MB max
        });

        if (!response.data || !response.data.url) {
          throw new Error('Invalid response from server');
        }

        console.log('Image upload successful:', response.data.url);
        return response.data.url;
      } catch (error) {
        lastError = error;
        console.error(`Error uploading image (attempt ${attempt}/${MAX_RETRIES}):`, error);
        
        // If it's not the last attempt, wait before retrying
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          console.log(`Retrying upload in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries failed, throw the last error
    const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
    throw new Error(`Failed to upload image after ${MAX_RETRIES} attempts: ${errorMessage}`);
  },

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const api = await getApi();
      await api.delete(`/upload?url=${encodeURIComponent(imageUrl)}`, {
        timeout: 10000, // 10 seconds for delete
      });
      console.log('Image deleted successfully:', imageUrl);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }
}; 