import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Mail, X } from 'lucide-react';
import { CountryPicker } from '../components/CountryPicker';
import { PinInput } from '../components/PinInput';
import { DownloadAppModal, IncompleteRegistrationModal } from '../components/AlertModal';
import {
  initiateLogin,
  loginWithPin,
  setPin,
  verifyOtp,
  type AuthMethod,
} from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

interface Country {
  name: string;
  code: string;
  dial_code: string;
  flag: string;
}

type Step = 'identifier' | 'otp' | 'setPin' | 'confirmPin' | 'loginPin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    () => (localStorage.getItem('lastAuthMethod') as AuthMethod) || 'email'
  );
  const [step, setStep] = useState<Step>('identifier');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectingCountry, setDetectingCountry] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [pendingPin, setPendingPin] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (authMethod !== 'phone') return;
    setDetectingCountry(true);
    const timer = setTimeout(() => {
      setSelectedCountry({
        name: 'Gambia',
        code: 'GM',
        dial_code: '+220',
        flag: '🇬🇲',
      });
      setDetectingCountry(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [authMethod]);

  useEffect(() => {
    try {
      if (localStorage.getItem('accountTerminated') === '1') {
        setShowDownloadModal(true);
        localStorage.removeItem('accountTerminated');
      }
    } catch {}
  }, []);

  const fullPhoneNumber = () => {
    const dial = selectedCountry?.dial_code || '';
    const normalizedDial = dial.startsWith('+') ? dial : `+${dial.replace(/\D/g, '')}`;
    return `${normalizedDial}${phoneInput.replace(/\D/g, '')}`;
  };

  const finishLogin = (user: any) => {
    login({
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      email: user.email || undefined,
    });
    navigate('/home');
  };

  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);

      if (authMethod === 'email') {
        const email = emailInput.trim().toLowerCase();
        if (!EMAIL_RE.test(email)) {
          setError('Please enter a valid email address');
          return;
        }

        const result = await initiateLogin({ method: 'email', email });
        if (result.requiresPin && result.isRegistered) {
          setVerifiedUser(result.user);
          setStep('loginPin');
          return;
        }
        setStep('otp');
        return;
      }

      const digits = phoneInput.replace(/\D/g, '');
      if (!selectedCountry || digits.length < 7 || digits.length > 15) {
        setError('Please enter a valid phone number');
        return;
      }

      const phoneNumber = fullPhoneNumber();
      const result = await initiateLogin({ method: 'phone', phoneNumber });
      if (result.requiresPin && result.isRegistered) {
        setVerifiedUser(result.user);
        setStep('loginPin');
        return;
      }
      setStep('otp');
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('terminated') || msg.includes('deactivated') || msg.includes('disabled')) {
        setShowDownloadModal(true);
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpComplete = async (code: string) => {
    setError('');
    try {
      setLoading(true);
      const email = emailInput.trim().toLowerCase();
      const phoneNumber = authMethod === 'phone' ? fullPhoneNumber() : undefined;
      const response = await verifyOtp({
        method: authMethod,
        email: authMethod === 'email' ? email : undefined,
        phoneNumber,
        code,
      });

      const user = response.user;
      const registered = Boolean(
        user?.firstName?.trim() && user?.lastName?.trim()
      );

      if (!registered || response.requiresRegistration) {
        setShowIncompleteModal(true);
        setStep('identifier');
        return;
      }

      setVerifiedUser(user);

      if (response.requiresPinSetup || !user?.hasPin) {
        setStep('setPin');
        return;
      }

      finishLogin(user);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPinComplete = (pin: string) => {
    setPendingPin(pin);
    setError('');
    setStep('confirmPin');
  };

  const handleConfirmPinComplete = async (pin: string) => {
    if (pin !== pendingPin) {
      setError('PINs do not match. Please try again.');
      setStep('setPin');
      setPendingPin('');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await setPin(pin);
      if (verifiedUser) {
        finishLogin({ ...verifiedUser, hasPin: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set PIN.');
      setStep('setPin');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginPinComplete = async (pin: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await loginWithPin(
        {
          email: authMethod === 'email' ? emailInput.trim().toLowerCase() : undefined,
          phoneNumber: authMethod === 'phone' ? fullPhoneNumber() : undefined,
        },
        pin
      );
      finishLogin(response.user);
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('terminated') || msg.includes('deactivated') || msg.includes('disabled')) {
        setShowDownloadModal(true);
      } else {
        setError(err.message || 'PIN verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMethod = () => {
    const next = authMethod === 'email' ? 'phone' : 'email';
    const previous = localStorage.getItem('lastAuthMethod') as AuthMethod | null;
    if (previous && previous !== next) {
      const ok = window.confirm(
        `You previously chose ${previous} sign-in. Continue with ${next}? Your account will stay the same.`
      );
      if (!ok) return;
    }
    setAuthMethod(next);
    setError('');
    setStep('identifier');
  };

  if (step === 'otp') {
    const destination =
      authMethod === 'email' ? emailInput.trim().toLowerCase() : fullPhoneNumber();
    return (
      <>
        <PinInput
          length={6}
          secure={false}
          title="Enter Verification Code"
          subtitle={`We've sent a verification code to ${destination}`}
          onComplete={handleOtpComplete}
          onBack={() => {
            setStep('identifier');
            setError('');
          }}
          loading={loading}
          error={error}
        />
        <DownloadAppModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} />
        <IncompleteRegistrationModal
          isOpen={showIncompleteModal}
          onClose={() => setShowIncompleteModal(false)}
        />
      </>
    );
  }

  if (step === 'setPin') {
    return (
      <PinInput
        title="Create a PIN"
        subtitle="Choose a 4-digit PIN to secure your account"
        onComplete={handleSetPinComplete}
        onBack={() => setStep('otp')}
        loading={loading}
        error={error}
      />
    );
  }

  if (step === 'confirmPin') {
    return (
      <PinInput
        title="Confirm PIN"
        subtitle="Enter your PIN again to confirm"
        onComplete={handleConfirmPinComplete}
        onBack={() => {
          setPendingPin('');
          setStep('setPin');
        }}
        loading={loading}
        error={error}
      />
    );
  }

  if (step === 'loginPin') {
    return (
      <PinInput
        title="Enter PIN"
        subtitle="Enter your 4-digit PIN to continue"
        onComplete={handleLoginPinComplete}
        onBack={() => {
          setStep('identifier');
          setError('');
        }}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600">SNAP</h1>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">Welcome Back!</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {authMethod === 'email'
            ? "Enter your email and we'll send a 6-digit code. No password needed."
            : 'Enter your phone number to continue'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleIdentifierSubmit}>
            {authMethod === 'email' ? (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <div className="flex items-center px-4 py-3 border-r border-gray-300 bg-gray-50">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 px-4 py-3 border-0 focus:ring-0 focus:outline-none text-lg"
                    autoCapitalize="none"
                    autoComplete="email"
                    disabled={loading}
                  />
                  {emailInput ? (
                    <button
                      type="button"
                      onClick={() => setEmailInput('')}
                      className="px-4 py-3 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCountryPickerOpen(true)}
                    className="flex items-center px-4 py-3 border-r border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {detectingCountry ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
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
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Phone number"
                    className="flex-1 px-4 py-3 border-0 focus:ring-0 focus:outline-none text-lg"
                    maxLength={15}
                    disabled={loading}
                  />
                  {phoneInput ? (
                    <button
                      type="button"
                      onClick={() => setPhoneInput('')}
                      className="px-4 py-3 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {error ? (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                loading ||
                (authMethod === 'email' ? !emailInput : !phoneInput || !selectedCountry)
              }
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Verifying...
                </div>
              ) : (
                'Continue'
              )}
            </button>

            <button
              type="button"
              onClick={switchMethod}
              className="mt-4 w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-500"
            >
              {authMethod === 'email' ? 'Use phone number instead' : 'Use email instead'}
            </button>
          </form>
        </div>
      </div>

      <CountryPicker
        isOpen={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        onSelect={setSelectedCountry}
        selectedCountry={selectedCountry}
      />
      <DownloadAppModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} />
      <IncompleteRegistrationModal
        isOpen={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
      />
    </div>
  );
}
