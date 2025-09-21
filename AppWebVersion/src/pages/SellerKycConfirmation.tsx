import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { kycService } from '../api/kyc';
import { kycDraft } from '../utils/kycDraft';
import { API_CONFIG } from '../config/api';

export function SellerKycConfirmation() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { businessData, addressData, verificationData } = location.state || {};
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getImageUrl = (image: string) => {
    if (!image) return '';
    if (image.startsWith('http')) return image;
    const base = API_CONFIG.BASE_URL.replace('/api', '');
    return `${base}${image.startsWith('/') ? image : `/${image}`}`;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await kycService.submitKyc({
        businessName: businessData.businessName,
        businessType: businessData.businessType,
        registrationNumber: businessData.registrationNumber,
        taxId: businessData.taxId,
        address: addressData.address,
        city: addressData.city,
        state: addressData.state,
        countries: addressData.countries,
        postalCode: addressData.postalCode,
        documentType: verificationData.idType,
        documentNumber: verificationData.idNumber,
        documentUrl: verificationData.idImage,
        documentExpiryDate: verificationData.idExpiryDate,
      } as any);
      kycDraft.clear();
      navigate('/seller');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Information</h1>
              <p className="text-gray-600 mt-1">Please verify all details are correct before submitting your KYC.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center text-sm text-gray-600">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                Step 4 of 4
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Business */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800 tracking-wide">Business Information</h2>
              </div>
              <div className="p-5">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Business Name</dt>
                    <dd className="text-sm text-gray-900">{businessData.businessName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Business Type</dt>
                    <dd className="text-sm text-gray-900">{businessData.businessType}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Registration Number</dt>
                    <dd className="text-sm text-gray-900">{businessData.registrationNumber || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Tax ID</dt>
                    <dd className="text-sm text-gray-900">{businessData.taxId || 'Not provided'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Address */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800 tracking-wide">Address Information</h2>
              </div>
              <div className="p-5">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Address</dt>
                    <dd className="text-sm text-gray-900">{addressData.address}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">City</dt>
                    <dd className="text-sm text-gray-900">{addressData.city}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">State/Province</dt>
                    <dd className="text-sm text-gray-900">{addressData.state || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Countries</dt>
                    <dd className="text-sm text-gray-900">{addressData.countries.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Postal Code</dt>
                    <dd className="text-sm text-gray-900">{addressData.postalCode || 'Not provided'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Verification */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800 tracking-wide">Verification Documents</h2>
              </div>
              <div className="p-5">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">ID Type</dt>
                    <dd className="text-sm text-gray-900">{verificationData.idType}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">ID Number</dt>
                    <dd className="text-sm text-gray-900 break-all">{verificationData.idNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Expiry Date</dt>
                    <dd className="text-sm text-gray-900">{verificationData.idExpiryDate}</dd>
                  </div>
                </dl>

                {verificationData.idImage && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">ID Document</p>
                    <img src={getImageUrl(verificationData.idImage)} alt="ID Document" className="h-40 rounded-lg border border-gray-200 object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">By submitting, you confirm the information provided is accurate and complete.</p>
              <button onClick={handleSubmit} disabled={submitting} className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit KYC Information'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


