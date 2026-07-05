import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { FormStepIndicator } from '../../components/FormStepIndicator';
import { LocationPickerField } from '../../components/LocationPickerField';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { useAuth } from '../../contexts/AuthContext';
import { realEstateApi, type PropertyListingType } from '../../api/realEstateApi';
import type { MapLocationWithCity } from '../../services/mapLocationService';
import { ID_TYPES, isAddressProofRecent, uploadDocumentFile } from '../../utils/propertyFormHelpers';
import { useApprovalRedirect } from '../../hooks/useApprovalRedirect';

const STEPS = ['Personal Info', 'Specializations', 'Location', 'Legal & ID', 'Proof of Address', 'Banking', 'About You', 'Review'];

const SPECIALIZATION_OPTIONS: { value: PropertyListingType; label: string }[] = [
  { value: 'HOTEL', label: 'Hotels' },
  { value: 'APARTMENT_RENTAL', label: 'Apartments' },
  { value: 'HOME_SALE', label: 'Homes for Sale' },
  { value: 'LAND_SALE', label: 'Land for Sale' },
];

export function BecomePropertyAgent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [isApprovedAgent, setIsApprovedAgent] = useState(false);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [location, setLocation] = useState<MapLocationWithCity | null>(null);
  const [specializationTypes, setSpecializationTypes] = useState<PropertyListingType[]>([]);
  const [bio, setBio] = useState('');

  const [idType, setIdType] = useState<'PASSPORT' | 'DRIVERS_LICENSE'>('PASSPORT');
  const [idNumber, setIdNumber] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('');
  const [businessRegistrationDocUrl, setBusinessRegistrationDocUrl] = useState('');
  const [taxIdentificationNumber, setTaxIdentificationNumber] = useState('');

  const [addressProofUrl, setAddressProofUrl] = useState('');
  const [addressProofDate, setAddressProofDate] = useState('');

  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');

  useEffect(() => {
    realEstateApi.getMyApplication()
      .then((data) => {
        if (data?.agent || data?.application?.status === 'APPROVED') {
          setIsApprovedAgent(true);
          setApplicationStatus('APPROVED');
          navigate('/real-estate/manage-listings', { replace: true });
          return;
        }
        if (data?.application) {
          setApplicationStatus(data.application.status);
          const app = data.application;
          setFirstName(app.firstName || user?.firstName || '');
          setLastName(app.lastName || user?.lastName || '');
          setPhoneNumber(app.phoneNumber || user?.phoneNumber || '');
          setEmail(app.email || '');
          setCompanyName(app.companyName || '');
          setLicenseNumber(app.licenseNumber || '');
          if (app.latitude != null && app.longitude != null) {
            setLocation({
              latitude: app.latitude,
              longitude: app.longitude,
              address: app.address || '',
              city: app.city || '',
            });
          }
          setSpecializationTypes(app.specializationTypes || []);
          setBio(app.bio || '');
          setIdType(app.idType || 'PASSPORT');
          setIdNumber(app.idNumber || '');
          setIdDocumentUrl(app.idDocumentUrl || '');
          setBusinessRegistrationNumber(app.businessRegistrationNumber || '');
          setBusinessRegistrationDocUrl(app.businessRegistrationDocUrl || '');
          setTaxIdentificationNumber(app.taxIdentificationNumber || '');
          setAddressProofUrl(app.addressProofUrl || '');
          setAddressProofDate(app.addressProofDate ? app.addressProofDate.slice(0, 10) : '');
          const banking = app.bankingInfo || {};
          setBankName(banking.bankName || '');
          setAccountName(banking.accountName || '');
          setAccountNumber(banking.accountNumber || '');
          setBankBranch(banking.bankBranch || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate, user]);

  useApprovalRedirect({
    enabled: !isApprovedAgent && (applicationStatus === 'PENDING' || applicationStatus === 'APPROVED'),
    checkApproval: async () => {
      const data = await realEstateApi.getMyApplication();
      if (data?.agent || data?.application?.status === 'APPROVED') {
        setIsApprovedAgent(true);
        setApplicationStatus('APPROVED');
        return { isApproved: true };
      }
      return { isApproved: false };
    },
    onApproved: () => navigate('/real-estate/manage-listings', { replace: true }),
  });

  const toggleSpecialization = (type: PropertyListingType) => {
    setSpecializationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadDocumentFile(file);
      setter(url);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    setError('');
    switch (currentStep) {
      case 1:
        if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
          setError('Please complete personal information.');
          return false;
        }
        break;
      case 2:
        if (specializationTypes.length === 0) {
          setError('Select at least one property specialization.');
          return false;
        }
        break;
      case 3:
        if (!location?.latitude || !location?.longitude || !location.address?.trim() || !location.city?.trim()) {
          setError('Pin your business address on the map and enter the city.');
          return false;
        }
        break;
      case 4:
        if (!idNumber.trim() || !idDocumentUrl || !businessRegistrationNumber.trim() || !businessRegistrationDocUrl) {
          setError('Please complete legal & ID documents.');
          return false;
        }
        break;
      case 5:
        if (!addressProofUrl || !addressProofDate || !isAddressProofRecent(addressProofDate)) {
          setError('Address proof must be dated within the last 6 months.');
          return false;
        }
        break;
      case 6:
        if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
          setError('Please complete banking information.');
          return false;
        }
        break;
      default:
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleSubmit = async () => {
    for (let i = 1; i <= 6; i++) {
      if (!validateStep(i)) return;
    }
    if (!location) return;

    try {
      setSubmitting(true);
      setError('');
      await realEstateApi.applyAsAgent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || undefined,
        companyName: companyName.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        address: location.address.trim(),
        city: location.city.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        specializationTypes,
        bio: bio.trim() || undefined,
        idType,
        idNumber: idNumber.trim(),
        idDocumentUrl,
        businessRegistrationNumber: businessRegistrationNumber.trim(),
        businessRegistrationDocUrl,
        taxIdentificationNumber: taxIdentificationNumber.trim() || undefined,
        addressProofUrl,
        addressProofDate,
        bankingInfo: {
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          bankBranch: bankBranch.trim() || undefined,
        },
      });
      setApplicationStatus('PENDING');
      alert('Application submitted successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const formDisabled = applicationStatus === 'PENDING' || applicationStatus === 'APPROVED' || isApprovedAgent;

  if (loading || isApprovedAgent || applicationStatus === 'APPROVED') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Opening your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title="Become a Property Agent" subtitle="Register to list properties" backTo="/real-estate" />
      {!formDisabled && <FormStepIndicator steps={STEPS} currentStep={step} accent="bg-violet-500" />}

      <div className="p-4 space-y-4">
        {applicationStatus === 'PENDING' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="font-semibold text-amber-800">Application Pending Review</p>
          </div>
        )}
        {applicationStatus === 'REJECTED' && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="font-semibold text-red-800">Application Rejected — you may resubmit</p>
          </div>
        )}
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        {!formDisabled && (
          <>
            {step === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name *" value={firstName} onChange={setFirstName} />
                  <Field label="Last Name *" value={lastName} onChange={setLastName} />
                </div>
                <Field label="Phone *" value={phoneNumber} onChange={setPhoneNumber} />
                <Field label="Email" value={email} onChange={setEmail} />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">What types of properties do you represent? Select all that apply.</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleSpecialization(opt.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border ${
                        specializationTypes.includes(opt.value)
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 3 && (
              <LocationPickerField
                value={location}
                onChange={setLocation}
                label="Business Address"
                accent="bg-violet-600"
              />
            )}
            {step === 4 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Type *</label>
                  <select value={idType} onChange={(e) => setIdType(e.target.value as typeof idType)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                    {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <Field label="ID Number *" value={idNumber} onChange={setIdNumber} />
                <UploadField label="ID Document *" url={idDocumentUrl} onUpload={(e) => handleUpload(e, setIdDocumentUrl)} uploading={uploading} />
                <Field label="Business Registration Number *" value={businessRegistrationNumber} onChange={setBusinessRegistrationNumber} />
                <UploadField label="Business Registration Document *" url={businessRegistrationDocUrl} onUpload={(e) => handleUpload(e, setBusinessRegistrationDocUrl)} uploading={uploading} />
                <Field label="Tax ID (optional)" value={taxIdentificationNumber} onChange={setTaxIdentificationNumber} />
              </div>
            )}
            {step === 5 && (
              <div className="space-y-3">
                <UploadField label="Address Proof *" url={addressProofUrl} onUpload={(e) => handleUpload(e, setAddressProofUrl)} uploading={uploading} />
                <DateField
                  label="Document Date * (within 6 months)"
                  value={addressProofDate}
                  onChange={setAddressProofDate}
                />
              </div>
            )}
            {step === 6 && (
              <div className="space-y-3">
                <Field label="Bank Name *" value={bankName} onChange={setBankName} />
                <Field label="Account Name *" value={accountName} onChange={setAccountName} />
                <Field label="Account Number *" value={accountNumber} onChange={setAccountNumber} />
                <Field label="Bank Branch" value={bankBranch} onChange={setBankBranch} />
              </div>
            )}
            {step === 7 && (
              <div className="space-y-3">
                <Field label="Company Name" value={companyName} onChange={setCompanyName} />
                <Field label="License Number" value={licenseNumber} onChange={setLicenseNumber} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" placeholder="Tell us about your experience..." />
                </div>
              </div>
            )}
            {step === 8 && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm space-y-1">
                  <p className="font-semibold">Review</p>
                  <p>{firstName} {lastName} · {phoneNumber}</p>
                  <p>Specializations: {specializationTypes.map((t) => SPECIALIZATION_OPTIONS.find((o) => o.value === t)?.label).join(', ')}</p>
                  {location && <p>{location.address}, {location.city}</p>}
                  <p>ID: {idType} · {idNumber}</p>
                  <p>Bank: {bankName} · {accountNumber}</p>
                </div>
                {location && <LocationMapPreview location={location} city={location.city} showDirections={false} />}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="flex-1 py-3 border border-gray-300 rounded-xl">Back</button>
              )}
              {step < STEPS.length ? (
                <button type="button" onClick={handleNext} className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl">Next</button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={submitting || uploading} className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl disabled:opacity-60">
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

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={toInputDate(sixMonthsAgo)}
        max={toInputDate(today)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
      />
      <p className="text-xs text-gray-500 mt-1">Must be dated within the last 6 months.</p>
    </div>
  );
}

function UploadField({ label, url, onUpload, uploading }: { label: string; url: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; uploading: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {url && <p className="text-xs text-green-600 mb-1">Uploaded ✓</p>}
      <input type="file" accept="image/*,.pdf" onChange={onUpload} disabled={uploading} className="text-sm" />
    </div>
  );
}
