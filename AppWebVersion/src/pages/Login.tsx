import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, X } from 'lucide-react';
import { CountryPicker } from '../components/CountryPicker';
import { PinInput } from '../components/PinInput';
import { DownloadAppModal, IncompleteRegistrationModal } from '../components/AlertModal';
import { checkUserExists, loginWithPin } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

interface Country {
  name: string;
  code: string;
  dial_code: string;
  flag: string;
}

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState('');
  const [detectingCountry, setDetectingCountry] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  // Auto-detect country on mount
  useEffect(() => {
    const detectCountry = () => {
      setDetectingCountry(true);
      // Simulate country detection
      setTimeout(() => {
        // Default to Gambia for this demo
        const defaultCountry: Country = {
          name: 'Gambia',
          code: 'GM',
          dial_code: '+220',
          flag: '🇬🇲'
        };
        setSelectedCountry(defaultCountry);
        setDetectingCountry(false);
      }, 1000);
    };

    detectCountry();
  }, []);
  
  // If previous navigation set a termination flag, show modal on mount
  useEffect(() => {
    try {
      if (localStorage.getItem('accountTerminated') === '1') {
        setShowDownloadModal(true);
        localStorage.removeItem('accountTerminated');
      }
    } catch {}
  }, []);

  const formatPhoneNumber = (number: string) => {
    return number.replace(/\D/g, '');
  };

  const validatePhoneNumber = (number: string) => {
    return number.length >= 7 && number.length <= 15;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneInput) {
      alert('Please enter your phone number');
      return;
    }

    const formattedNumber = formatPhoneNumber(phoneInput);
    
    if (!validatePhoneNumber(formattedNumber)) {
      alert('Please enter a valid phone number (7-15 digits)');
      return;
    }

    try {
      setLoading(true);
      
      const fullNumber = `${selectedCountry?.dial_code}${formattedNumber}`;
      console.log('Checking user for phone number:', fullNumber);
      
      // Check if user exists
      const userCheck = await checkUserExists(fullNumber);
      
      if (!userCheck.exists) {
        setLoading(false);
        setShowDownloadModal(true);
        return;
      }

      if (!userCheck.isRegistered) {
        setLoading(false);
        setShowIncompleteModal(true);
        return;
      }

      // User exists and is registered, show PIN input
      setLoading(false);
      setShowPinInput(true);
    } catch (error: any) {
      setLoading(false);
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('terminated') || msg.includes('deactivated') || msg.includes('disabled')) {
        setShowDownloadModal(true);
      } else {
        // For now, show a simple alert for API errors, but this could be improved with a modal
        alert(error.message || 'Login failed. Please try again.');
      }
    }
  };

  const handlePinComplete = async (pin: string) => {
    try {
      setLoading(true);
      setPinError('');
      
      const fullNumber = `${selectedCountry?.dial_code}${formatPhoneNumber(phoneInput)}`;
      console.log('Verifying PIN for:', fullNumber, 'PIN:', pin);
      
      // Call the API to verify PIN
      const response = await loginWithPin(fullNumber, pin);
      
      console.log('Login successful:', response);
      setLoading(false);
      
      // Store user data in auth context
      login({
        id: response.user.id,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        phoneNumber: response.user.phoneNumber
      });
      
      // Navigate to home on success
      navigate('/home');
    } catch (error: any) {
      console.error('PIN verification error:', error);
      setLoading(false);
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('terminated') || msg.includes('deactivated') || msg.includes('disabled')) {
        setShowDownloadModal(true);
        setPinError('');
      } else {
        setPinError(error.message || 'PIN verification failed. Please try again.');
      }
    }
  };

  const handleBackToPhone = () => {
    setShowPinInput(false);
    setPinError('');
  };


  if (showPinInput) {
    return (
      <PinInput
        onComplete={handlePinComplete}
        onBack={handleBackToPhone}
        loading={loading}
        error={pinError}
        title="Enter PIN"
        subtitle="Enter your 4-digit PIN to continue"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600">SNAP</h1>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Welcome Back!
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your phone number to continue
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handlePhoneSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCountryPickerOpen(true)}
                  className="flex items-center px-4 py-3 border-r border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {detectingCountry ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm text-gray-600">📍</span>
                    </div>
                  ) : selectedCountry ? (
                    <span className="text-lg mr-2">{selectedCountry.flag}</span>
                  ) : (
                    <Globe className="w-5 h-5 text-blue-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700 ml-2">
                    {selectedCountry?.dial_code || 'Select'}
                  </span>
                </button>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    const cleanText = e.target.value.replace(/\D/g, '');
                    setPhoneInput(cleanText);
                  }}
                  placeholder="Phone number"
                  className="flex-1 px-4 py-3 border-0 focus:ring-0 focus:outline-none text-lg"
                  maxLength={15}
                  disabled={loading}
                />
                {phoneInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput('');
                      setSelectedCountry(null);
                    }}
                    className="px-4 py-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              {detectingCountry && (
                <p className="mt-2 text-sm text-blue-600 text-center">
                  📍 Detecting your location...
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!phoneInput || !selectedCountry || loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Country Picker Modal */}
      <CountryPicker
        isOpen={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        onSelect={setSelectedCountry}
        selectedCountry={selectedCountry}
      />
      
      {/* Download App Modal */}
      <DownloadAppModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
      
      {/* Incomplete Registration Modal */}
      <IncompleteRegistrationModal
        isOpen={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
      />
      
    </div>
  );
}
