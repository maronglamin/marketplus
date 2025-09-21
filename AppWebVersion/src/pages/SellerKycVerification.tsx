import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { uploadService } from '../api/upload';
import { API_CONFIG } from '../config/api';
import { kycDraft } from '../utils/kycDraft';

export function SellerKycVerification() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { businessData, addressData, existingData } = location.state || {};

  const [formData, setFormData] = useState({
    idType: '',
    idNumber: '',
    idExpiryDate: '',
    idImageUrl: '' as string,
  });
  const [errors, setErrors] = useState({ idType: '', idNumber: '', idExpiryDate: '', idImageUrl: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const draft = kycDraft.load();
    if (draft.verificationData) {
      setFormData({ ...formData, ...draft.verificationData });
    } else if (existingData) {
      setFormData({
        idType: existingData.documentType || '',
        idNumber: existingData.documentNumber || '',
        idExpiryDate: existingData.documentExpiryDate || '',
        idImageUrl: existingData.documentUrl || '',
      });
    }
  }, [existingData]);

  const getImageUrl = (image: string) => {
    if (!image) return '';
    if (image.startsWith('http')) return image;
    // BASE_URL likely contains /api; serve static files from host without /api
    const base = API_CONFIG.BASE_URL.replace('/api', '');
    return `${base}${image.startsWith('/') ? image : `/${image}`}`;
  };

  const validate = () => {
    const next = { idType: '', idNumber: '', idExpiryDate: '', idImageUrl: '' };
    let ok = true;
    if (!formData.idType) { next.idType = 'ID Type is required'; ok = false; }
    if (!formData.idNumber.trim()) { next.idNumber = 'ID Number is required'; ok = false; }
    if (!formData.idExpiryDate.trim()) { next.idExpiryDate = 'Expiry Date is required'; ok = false; }
    if (!formData.idImageUrl) { next.idImageUrl = 'ID Document is required'; ok = false; }
    setErrors(next);
    return ok;
  };

  const handleNext = () => {
    if (!validate()) return;
    kycDraft.save({ verificationData: {
      idType: formData.idType,
      idNumber: formData.idNumber,
      idExpiryDate: formData.idExpiryDate,
      idImageUrl: formData.idImageUrl,
    } });
    navigate('/seller/kyc/confirm', { state: { businessData, addressData, verificationData: {
      idType: formData.idType,
      idNumber: formData.idNumber,
      idExpiryDate: formData.idExpiryDate,
      idImage: formData.idImageUrl,
    } } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Verification Documents</h1>
          <p className="text-gray-600 mb-6">Verify your identity</p>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
              <select
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.idType ? 'border-red-300' : 'border-gray-300'}`}
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
              >
                <option value="">Select ID Type</option>
                <option value="NATIONAL_ID">National ID</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
                <option value="BUSINESS_REGISTRATION">Business Registration</option>
                <option value="TAX_CERTIFICATE">Tax Certificate</option>
              </select>
              {errors.idType && <p className="text-xs text-red-600 mt-1">{errors.idType}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.idNumber ? 'border-red-300' : 'border-gray-300'}`}
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                placeholder="Enter your ID number"
              />
              {errors.idNumber && <p className="text-xs text-red-600 mt-1">{errors.idNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.idExpiryDate ? 'border-red-300' : 'border-gray-300'}`}
                value={formData.idExpiryDate}
                onChange={(e) => setFormData({ ...formData, idExpiryDate: e.target.value })}
              />
              {errors.idExpiryDate && <p className="text-xs text-red-600 mt-1">{errors.idExpiryDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Document</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple={false}
                  disabled={!!formData.idImageUrl || uploading}
                  onChange={async (e) => {
                    if (!e.target.files || e.target.files.length === 0) return;
                    const file = e.target.files[0];
                    try {
                      setUploading(true);
                      const url = await uploadService.uploadImage(file);
                      setFormData(prev => ({ ...prev, idImageUrl: url }));
                      // Clear any previous error
                      if (errors.idImageUrl) {
                        setErrors(prev => ({ ...prev, idImageUrl: '' }));
                      }
                    } catch (err) {
                      setErrors(prev => ({ ...prev, idImageUrl: 'Failed to upload image. Please try again.' }));
                    } finally {
                      setUploading(false);
                    }
                  }}
                  className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
              </div>
              {formData.idImageUrl && (
                <div className="mt-2">
                  <img src={getImageUrl(formData.idImageUrl)} alt="Uploaded ID" className="h-32 rounded border border-gray-200 object-cover" />
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-green-700">Image uploaded</p>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, idImageUrl: '' }))}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
              {errors.idImageUrl && <p className="text-xs text-red-600 mt-1">{errors.idImageUrl}</p>}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={handleNext} className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Next</button>
            <button onClick={() => navigate('/seller/kyc')} className="px-5 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}


