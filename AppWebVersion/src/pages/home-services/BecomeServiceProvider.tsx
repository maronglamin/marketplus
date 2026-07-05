import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { FormStepIndicator } from '../../components/FormStepIndicator';
import { LocationPickerField } from '../../components/LocationPickerField';
import type { MapLocationWithCity } from '../../services/mapLocationService';
import { useAuth } from '../../contexts/AuthContext';
import { homeServicesApi } from '../../api/homeServicesApi';
import { useApprovalRedirect } from '../../hooks/useApprovalRedirect';

const STEPS = ['Personal Info', 'Location', 'About You'];

export function BecomeServiceProvider() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [isApprovedProvider, setIsApprovedProvider] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState<MapLocationWithCity | null>(null);
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');

  useEffect(() => {
    homeServicesApi.getMyApplication()
      .then((appData) => {
        if (appData?.provider) {
          setIsApprovedProvider(true);
          setApplicationStatus('APPROVED');
        } else if (appData?.application) {
          setApplicationStatus(appData.application.status);
          const app = appData.application;
          setFirstName(app.firstName || user?.firstName || '');
          setLastName(app.lastName || user?.lastName || '');
          setPhone(app.phoneNumber || user?.phoneNumber || '');
          setEmail(app.email || '');
          if (app.latitude != null && app.longitude != null) {
            setLocation({
              latitude: app.latitude,
              longitude: app.longitude,
              address: app.address || '',
              city: app.city || '',
            });
          }
          setBio(app.bio || '');
          setExperience(app.experience || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const isApproved = isApprovedProvider || applicationStatus === 'APPROVED';

  useEffect(() => {
    if (isApproved) {
      navigate('/home-services/dashboard', { replace: true });
    }
  }, [isApproved, navigate]);

  useApprovalRedirect({
    enabled: !isApprovedProvider && (applicationStatus === 'PENDING' || applicationStatus === 'APPROVED'),
    checkApproval: async () => {
      const data = await homeServicesApi.getMyApplication();
      if (data?.provider || data?.application?.status === 'APPROVED') {
        setIsApprovedProvider(true);
        setApplicationStatus('APPROVED');
        return { isApproved: true };
      }
      return { isApproved: false };
    },
    onApproved: () => navigate('/home-services/dashboard', { replace: true }),
  });

  const validateStep = (s: number): boolean => {
    if (s === 1 && (!firstName.trim() || !lastName.trim() || !phone.trim())) {
      setError('Please enter first name, last name, and phone number.');
      return false;
    }
    if (s === 2 && (!location?.latitude || !location?.longitude || !location.address?.trim() || !location.city?.trim())) {
      setError('Please pin your business address on the map.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) return;
    if (!location) return;
    try {
      setSubmitting(true);
      await homeServicesApi.applyAsProvider({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim(),
        email: email.trim() || undefined,
        address: location.address.trim(),
        city: location.city.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        bio: bio.trim() || undefined,
        experience: experience.trim() || undefined,
      });
      setApplicationStatus('PENDING');
      alert('Your application has been submitted. After approval, add your services and availability from your dashboard.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const formDisabled = applicationStatus === 'PENDING' || isApprovedProvider || applicationStatus === 'APPROVED';

  if (loading || isApproved) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Opening your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title="Become a Provider" subtitle="Register your professional services" backTo="/home-services" />
      {!formDisabled && <FormStepIndicator steps={STEPS} currentStep={step} />}

      <div className="p-4 space-y-4">
        {applicationStatus === 'PENDING' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="font-semibold text-amber-800">Application Pending</p>
            <p className="text-sm text-amber-700 mt-1">
              We are reviewing your application. After approval, add services and availability from your dashboard.
            </p>
          </div>
        )}
        {applicationStatus === 'REJECTED' && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="font-semibold text-red-800">Application Rejected</p>
            <p className="text-sm text-red-700 mt-1">You may update and resubmit below</p>
          </div>
        )}

        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        {!formDisabled && (
          <>
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Tell us about yourself</h2>
                  <p className="text-sm text-gray-500 mt-1">We&apos;ll use this to set up your provider profile.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name *" value={firstName} onChange={setFirstName} />
                  <Field label="Last Name *" value={lastName} onChange={setLastName} />
                </div>
                <Field label="Phone *" value={phone} onChange={setPhone} type="tel" />
                <Field label="Email" value={email} onChange={setEmail} type="email" />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Where are you based?</h2>
                  <p className="text-sm text-gray-500 mt-1">Customers will see your service area on the map.</p>
                </div>
                <LocationPickerField value={location} onChange={setLocation} label="Business Address" accent="bg-sky-500" />
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900">About you</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    After approval, you&apos;ll add your services and availability from your dashboard.
                  </p>
                </div>
                <TextArea label="Bio" value={bio} onChange={setBio} />
                <TextArea label="Experience" value={experience} onChange={setExperience} />
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sm text-gray-600 space-y-1">
                  <p className="font-semibold text-sky-900">Review</p>
                  <p>{firstName} {lastName}</p>
                  <p>{phone}</p>
                  <p>{location?.address}, {location?.city}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700">
                  Back
                </button>
              )}
              {step < STEPS.length ? (
                <button
                  type="button"
                  onClick={() => { if (validateStep(step)) setStep((s) => s + 1); }}
                  className="flex-1 py-3 bg-sky-500 text-white font-semibold rounded-xl"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-sky-500 text-white font-semibold rounded-xl disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
    </div>
  );
}
