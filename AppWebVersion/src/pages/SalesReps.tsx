import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { salesRepService, type SalesRep } from '../api/salesReps';
import { branchService, type Branch } from '../api/branches';

export function SalesReps() {
  const navigate = useNavigate();
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesPage, setBranchesPage] = useState(1);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchState, setBranchState] = useState('');
  const [branchCountry, setBranchCountry] = useState('');
  const [branchPostalCode, setBranchPostalCode] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchEmail, setBranchEmail] = useState('');
  const [showBranchPanel, setShowBranchPanel] = useState(false);
  const [showRepPanel, setShowRepPanel] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [countryQuery, setCountryQuery] = useState('');
  const [showCodeMenu, setShowCodeMenu] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [pin, setPin] = useState('');
  const [repsPage, setRepsPage] = useState(1);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const PAGE_SIZE = 3;

  const load = async () => {
    try {
      setLoading(true);
      const [list, branchList] = await Promise.all([
        salesRepService.getSalesReps(),
        branchService.getBranches(),
      ]);
      setReps(list);
      setBranches(branchList);
      setBranchesPage(1);
      setRepsPage(1);
    } catch (e: any) {
      setToast({ type: 'error', message: e?.response?.data?.error || 'Failed to load sales reps' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const countryCodes = [
    '+1 (US/CA)','+44 (UK)','+233 (GH)','+234 (NG)','+254 (KE)','+27 (ZA)','+225 (CI)','+237 (CM)','+213 (DZ)','+20 (EG)','+212 (MA)','+971 (AE)','+966 (SA)','+974 (QA)','+965 (KW)','+973 (BH)','+92 (PK)','+94 (LK)','+880 (BD)','+62 (ID)','+60 (MY)','+65 (SG)','+66 (TH)','+84 (VN)','+63 (PH)','+81 (JP)','+82 (KR)','+852 (HK)','+886 (TW)','+55 (BR)','+52 (MX)','+54 (AR)','+57 (CO)','+56 (CL)','+51 (PE)','+505 (NI)','+502 (GT)','+503 (SV)','+58 (VE)','+590 (GP)','+226 (BF)','+229 (BJ)','+221 (SN)','+222 (MR)','+223 (ML)','+220 (GM)','+231 (LR)','+232 (SL)','+255 (TZ)','+256 (UG)','+250 (RW)','+265 (MW)','+267 (BW)','+264 (NA)','+260 (ZM)','+258 (MZ)'
  ];
  const filteredCodes = countryCodes.filter(c => c.toLowerCase().includes(countryQuery.toLowerCase()));

  const canCreate = firstName.trim() && lastName.trim() && phoneNumber.trim() && branchId.trim() && countryCode.trim() && pin.trim() && /^\d{4}$/.test(pin);

  const create = async () => {
    if (!canCreate || creating) return;
    try {
      setCreating(true);
      const fullPhone = `${countryCode.split(' ')[0]}${phoneNumber.trim()}`;
      await salesRepService.createSalesRep({ firstName: firstName.trim(), middleName: middleName.trim() || undefined, lastName: lastName.trim(), phoneNumber: fullPhone, branchId, pin: pin.trim() });
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setPhoneNumber('');
      setCountryCode('+1');
      setCountryQuery('');
      setBranchId('');
      setPin('');
      setToast({ type: 'success', message: 'Sales rep added' });
      setTimeout(() => setToast(null), 2500);
      await load();
    } catch (e: any) {
      setToast({ type: 'error', message: e?.response?.data?.error || 'Failed to add sales rep' });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setCreating(false);
    }
  };

  const createBranch = async () => {
    if (!branchName.trim() || creatingBranch) return;
    try {
      setCreatingBranch(true);
      await branchService.createBranch({
        name: branchName.trim(),
        address: branchAddress.trim() || undefined,
        city: branchCity.trim() || undefined,
        state: branchState.trim() || undefined,
        country: branchCountry.trim() || undefined,
        postalCode: branchPostalCode.trim() || undefined,
        phoneNumber: branchPhone.trim() || undefined,
        email: branchEmail.trim() || undefined,
      });
      setBranchName('');
      setBranchAddress('');
      setBranchCity('');
      setBranchState('');
      setBranchCountry('');
      setBranchPostalCode('');
      setBranchPhone('');
      setBranchEmail('');
      setToast({ type: 'success', message: 'Branch added' });
      setTimeout(() => setToast(null), 2500);
      await load();
      setShowBranchPanel(false);
    } catch (e: any) {
      setToast({ type: 'error', message: e?.response?.data?.error || 'Failed to add branch' });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setCreatingBranch(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await salesRepService.deleteSalesRep(id);
      setToast({ type: 'success', message: 'Sales rep removed' });
      setTimeout(() => setToast(null), 2000);
      await load();
    } catch (e: any) {
      setToast({ type: 'error', message: e?.response?.data?.error || 'Failed to remove sales rep' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-md text-sm ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
            <button onClick={() => setShowBranchPanel(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Branch</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Postal Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {branches.length === 0 ? (
                  <tr><td className="px-6 py-8 text-gray-500" colSpan={2}>No branches yet</td></tr>
                ) : (
                  branches.slice((branchesPage-1)*PAGE_SIZE, branchesPage*PAGE_SIZE).map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.address || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.city || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.state || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.country || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.postalCode || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.phoneNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.email || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Branches pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {(() => {
                const total = branches.length;
                const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
                const start = total === 0 ? 0 : (branchesPage - 1) * PAGE_SIZE + 1;
                const end = Math.min(branchesPage * PAGE_SIZE, total);
                return `Showing ${total === 0 ? 0 : start}-${end} of ${total} • Page ${branchesPage} of ${totalPages}`;
              })()}
            </p>
            {(() => {
              const totalPages = Math.max(1, Math.ceil(branches.length / PAGE_SIZE));
              const pages: number[] = [];
              for (let p = 1; p <= totalPages; p++) pages.push(p);
              return (
                <div className="flex items-center gap-2">
                  <button onClick={() => setBranchesPage(p => Math.max(1, p-1))} disabled={branchesPage<=1} className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50">Previous</button>
                  {pages.map(p => (
                    <button key={p} onClick={() => setBranchesPage(p)} className={`px-3 py-2 rounded-lg border text-sm ${p===branchesPage ? 'bg-blue-600 text-white border-blue-600' : ''}`}>{p}</button>
                  ))}
                  <button onClick={() => setBranchesPage(p => Math.min(totalPages, p+1))} disabled={branchesPage>=totalPages} className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50">Next</button>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Sales Representatives</h1>
            <button onClick={() => setShowRepPanel(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Sales Rep</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td className="px-6 py-4" colSpan={4}>Loading...</td></tr>
                ) : reps.length === 0 ? (
                  <tr><td className="px-6 py-8 text-gray-500" colSpan={4}>No sales reps yet</td></tr>
                ) : (
                  reps.slice((repsPage-1)*PAGE_SIZE, repsPage*PAGE_SIZE).map(rep => (
                    <tr key={rep.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rep.firstName} {rep.lastName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rep.phoneNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rep.branchName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Reps pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {(() => {
                const total = reps.length;
                const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
                const start = total === 0 ? 0 : (repsPage - 1) * PAGE_SIZE + 1;
                const end = Math.min(repsPage * PAGE_SIZE, total);
                return `Showing ${total === 0 ? 0 : start}-${end} of ${total} • Page ${repsPage} of ${totalPages}`;
              })()}
            </p>
            {(() => {
              const totalPages = Math.max(1, Math.ceil(reps.length / PAGE_SIZE));
              const pages: number[] = [];
              for (let p = 1; p <= totalPages; p++) pages.push(p);
              return (
                <div className="flex items-center gap-2">
                  <button onClick={() => setRepsPage(p => Math.max(1, p-1))} disabled={repsPage<=1} className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50">Previous</button>
                  {pages.map(p => (
                    <button key={p} onClick={() => setRepsPage(p)} className={`px-3 py-2 rounded-lg border text-sm ${p===repsPage ? 'bg-blue-600 text-white border-blue-600' : ''}`}>{p}</button>
                  ))}
                  <button onClick={() => setRepsPage(p => Math.min(totalPages, p+1))} disabled={repsPage>=totalPages} className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50">Next</button>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Slide-over panels */}
        {showBranchPanel && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowBranchPanel(false)} />
            <div className="absolute right-0 top-0 h-full w-full md:w-1/4 bg-white shadow-2xl border-l border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Branch</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name<span className="text-red-600"> *</span></label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={branchName} onChange={e => setBranchName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={branchAddress} onChange={e => setBranchAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={branchCity} onChange={e => setBranchCity(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={branchState} onChange={e => setBranchState(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={branchCountry} onChange={e => setBranchCountry(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={branchPostalCode} onChange={e => setBranchPostalCode(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={branchPhone} onChange={e => setBranchPhone(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={branchEmail} onChange={e => setBranchEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setShowBranchPanel(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                    <button onClick={createBranch} disabled={!branchName.trim() || creatingBranch} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">Save</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRepPanel && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowRepPanel(false)} />
            <div className="absolute right-0 top-0 h-full w-full md:w-1/4 bg-white shadow-2xl border-l border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Sales Rep</h2>
                {/* Row 1 */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name (optional)</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={middleName} onChange={e => setMiddleName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch<span className="text-red-600"> *</span></label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={branchId}
                      onChange={e => setBranchId(e.target.value)}
                    >
                      <option value="">Select a branch</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCodeMenu(v => !v)}
                        className="inline-flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm"
                        aria-haspopup="listbox"
                        aria-expanded={showCodeMenu}
                      >
                        <span className="font-medium mr-2">{countryCode}</span>
                        <svg className={`w-4 h-4 transition-transform ${showCodeMenu ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
                      </button>
                      {showCodeMenu && (
                        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                          <div className="p-2 border-b border-gray-100">
                            <input
                              autoFocus
                              className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Search country/code"
                              value={countryQuery}
                              onChange={e => setCountryQuery(e.target.value)}
                            />
                          </div>
                          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
                            {filteredCodes.map(code => {
                              const value = code.split(' ')[0];
                              const label = code;
                              const selected = value === countryCode;
                              return (
                                <li key={label}>
                                  <button
                                    type="button"
                                    onClick={() => { setCountryCode(value); setShowCodeMenu(false); }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selected ? 'bg-blue-50 text-blue-700' : 'text-gray-800'}`}
                                    role="option"
                                    aria-selected={selected}
                                  >
                                    {label}
                                  </button>
                                </li>
                              );
                            })}
                            {filteredCodes.length === 0 && (
                              <li className="px-3 py-2 text-sm text-gray-500">No results</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Phone number"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default PIN<span className="text-red-600"> *</span></label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="4-digit PIN"
                      type="password"
                      maxLength={4}
                      value={pin}
                      onChange={e => {
                        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                        if (value.length <= 4) {
                          setPin(value);
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Must be exactly 4 digits</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button onClick={() => setShowRepPanel(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button onClick={create} disabled={!canCreate || creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                    <Plus className="w-4 h-4 mr-1 inline" /> Add Rep
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Removed legacy "Your Sales Reps" section */}
      </div>
    </div>
  );
}


