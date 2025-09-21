import { getApi } from './config';

export const uploadService = {
  async uploadImage(file: File): Promise<string> {
    const api = getApi();
    const formData = new FormData();
    formData.append('file', file);
    // Mobile app uses '/upload' (singular)
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!res.data || !res.data.url) {
      throw new Error('Invalid upload response');
    }
    return res.data.url as string;
  },
};


