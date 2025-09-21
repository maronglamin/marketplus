import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { kycDraft } from '../utils/kycDraft';

interface ExistingKycData {
  businessName?: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;
  rejectionReason?: string;
}

export function SellerKycBusiness() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const existingData: ExistingKycData | undefined = location.state?.existingData;

  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    registrationNumber: '',
    taxId: '',
  });
  const [errors, setErrors] = useState({
    businessName: '',
    businessType: '',
    registrationNumber: '',
  });

  useEffect(() => {
    const draft = kycDraft.load();
    if (draft.businessData) {
      setFormData({ ...formData, ...draft.businessData });
    } else if (existingData) {
      setFormData({
        businessName: existingData.businessName || '',
        businessType: existingData.businessType || '',
        registrationNumber: existingData.registrationNumber || '',
        taxId: existingData.taxId || '',
      });
    }
  }, [existingData]);

  const validate = () => {
    const next = { businessName: '', businessType: '', registrationNumber: '' };
    let ok = true;
    if (!formData.businessName.trim()) { next.businessName = 'Business name is required'; ok = false; }
    if (!formData.businessType) { next.businessType = 'Business type is required'; ok = false; }
    if (!formData.registrationNumber.trim()) { next.registrationNumber = 'Registration number is required'; ok = false; }
    setErrors(next);
    return ok;
  };

  const handleNext = () => {
    if (!validate()) return;
    kycDraft.save({ businessData: formData });
    navigate('/seller/kyc/address', { state: { businessData: formData, existingData } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Business Information</h1>
          <p className="text-gray-600 mb-6">Tell us about your business</p>

          {existingData?.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 font-medium">Previous Submission Rejected</p>
              <p className="text-red-700 text-sm">{existingData.rejectionReason}</p>
            </div>
          )}

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.businessName ? 'border-red-300' : 'border-gray-300'}`}
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Enter your business name"
              />
              {errors.businessName && <p className="text-xs text-red-600 mt-1">{errors.businessName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
              <select
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.businessType ? 'border-red-300' : 'border-gray-300'}`}
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
              >
                <option value="">Select type</option>
                <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="CORPORATION">Corporation</option>
                <option value="LLC">Limited Liability Company</option>
              </select>
              {errors.businessType && <p className="text-xs text-red-600 mt-1">{errors.businessType}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.registrationNumber ? 'border-red-300' : 'border-gray-300'}`}
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                placeholder="Enter your registration number"
              />
              {errors.registrationNumber && <p className="text-xs text-red-600 mt-1">{errors.registrationNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (Optional)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="Enter your tax ID"
              />
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


