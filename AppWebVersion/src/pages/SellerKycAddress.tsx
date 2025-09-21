import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { kycDraft } from '../utils/kycDraft';

interface ExistingKycData {
  address?: string;
  city?: string;
  state?: string;
  country?: string[];
  postalCode?: string;
  rejectionReason?: string;
}

interface AddressData {
  address: string;
  city: string;
  state: string;
  countries: string[];
  postalCode: string;
}

export function SellerKycAddress() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { businessData, existingData }: { businessData: any; existingData?: ExistingKycData } = location.state || {};

  const [formData, setFormData] = useState<AddressData>({
    address: '',
    city: '',
    state: '',
    countries: [],
    postalCode: '',
  });
  const [errors, setErrors] = useState({ address: '', city: '', countries: '' });

  useEffect(() => {
    const draft = kycDraft.load();
    if (draft.addressData) {
      setFormData({ ...formData, ...draft.addressData });
    } else if (existingData) {
      setFormData({
        address: existingData.address || '',
        city: existingData.city || '',
        state: existingData.state || '',
        countries: Array.isArray(existingData.country) ? existingData.country : [],
        postalCode: existingData.postalCode || '',
      });
    }
  }, [existingData]);

  const validate = () => {
    const next = { address: '', city: '', countries: '' };
    let ok = true;
    if (!formData.address.trim()) { next.address = 'Address is required'; ok = false; }
    if (!formData.city.trim()) { next.city = 'City is required'; ok = false; }
    if (formData.countries.length === 0) { next.countries = 'At least one country is required'; ok = false; }
    setErrors(next);
    return ok;
  };

  const handleNext = () => {
    if (!validate()) return;
    kycDraft.save({ addressData: formData });
    navigate('/seller/kyc/verification', { state: { businessData, addressData: formData, existingData } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Address Information</h1>
          <p className="text-gray-600 mb-6">Where is your business located?</p>

          {existingData?.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
              <p className="text-red-700 text-sm">{existingData.rejectionReason}</p>
            </div>
          )}

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.address ? 'border-red-300' : 'border-gray-300'}`}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter your street address"
              />
              {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.city ? 'border-red-300' : 'border-gray-300'}`}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter your city"
              />
              {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State/Province (Optional)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Enter your state or province"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Countries</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.countries ? 'border-red-300' : 'border-gray-300'}`}
                value={formData.countries.join(', ')}
                onChange={(e) => setFormData({ ...formData, countries: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="Enter country codes (e.g., US, GH)"
              />
              {errors.countries && <p className="text-xs text-red-600 mt-1">{errors.countries}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code (Optional)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Enter your postal code"
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


