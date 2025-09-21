import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { kycService, type SellerKycResponse } from '../api/kyc';

export function SellerKycForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState<SellerKycResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await kycService.getKycStatus();
        setKyc(res);
      } catch (e: any) {
        // If 404, no KYC yet — allow user to start
        if (e?.response?.status === 404) {
          setKyc(null);
        } else if (e?.response?.status === 401) {
          setError('Please log in to continue');
        } else {
          setError('Failed to check KYC status. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Checking your seller status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // If KYC exists and is not rejected, redirect user to dashboard
  if (kyc && (kyc.status === 'APPROVED' || kyc.status === 'PENDING')) {
    navigate('/seller');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Become a Seller</h1>
          </div>

          {kyc?.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
              <div>
                <p className="text-red-700 font-medium">Verification Rejected</p>
                <p className="text-red-700 text-sm">{kyc.rejectionReason || 'Please review and update your information.'}</p>
              </div>
            </div>
          )}

          <p className="text-gray-700 mb-4">
            To start selling on our platform, you need to complete seller verification.
          </p>

          <div className="space-y-3 text-gray-700 mb-6">
            <p>• Provide business details and registration information</p>
            <p>• Confirm your business location and contact details</p>
            <p>• Upload required documents and banking information</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/seller/kyc/business"
              state={{ existingData: kyc || undefined }}
              className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {kyc?.status === 'REJECTED' ? 'Update Verification' : 'Start Verification'}
            </Link>
            <Link to="/seller" className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


