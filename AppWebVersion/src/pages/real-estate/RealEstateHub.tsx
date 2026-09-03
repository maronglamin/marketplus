import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bed, Home, Building, Map, UserPlus, Bookmark, ChevronRight, Ship } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginPrompt } from '../../components/LoginPromptModal';
import { realEstateApi, type PropertyListingType } from '../../api/realEstateApi';

const STAY_TYPES: { type: PropertyListingType; title: string; subtitle: string; icon: React.ReactNode; color: string }[] = [
  { type: 'HOTEL', title: 'Hotels', subtitle: 'Book hotel stays', icon: <Bed className="w-7 h-7" />, color: 'text-violet-600 bg-violet-50' },
  { type: 'APARTMENT_RENTAL', title: 'Apartments', subtitle: 'Short & long-term rentals', icon: <Home className="w-7 h-7" />, color: 'text-sky-600 bg-sky-50' },
  { type: 'GUEST_HOUSE', title: 'Guest House & Lodge', subtitle: 'Guesthouses and lodges', icon: <Building className="w-7 h-7" />, color: 'text-pink-600 bg-pink-50' },
  { type: 'BOAT_TRIP', title: 'Leisure & Trips', subtitle: 'Boat trips and leisure', icon: <Ship className="w-7 h-7" />, color: 'text-cyan-600 bg-cyan-50' },
];

const BUY_TYPES: { type: PropertyListingType; title: string; subtitle: string; icon: React.ReactNode; color: string }[] = [
  { type: 'HOME_SALE', title: 'Home Sales', subtitle: 'Browse residential properties', icon: <Home className="w-7 h-7" />, color: 'text-emerald-600 bg-emerald-50' },
  { type: 'LAND_SALE', title: 'Land Sales', subtitle: 'Plots & development land', icon: <Map className="w-7 h-7" />, color: 'text-amber-600 bg-amber-50' },
];

export function RealEstateHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'all';
  const showStay = section === 'all' || section === 'stay';
  const showRealty = section === 'all' || section === 'realestate';
  const { isAuthenticated } = useAuth();
  const { promptLogin, loginModal } = useLoginPrompt();
  const [checkingAgent, setCheckingAgent] = useState(false);

  const title =
    section === 'stay' ? 'Stay & Accommodation' : section === 'realestate' ? 'Real Estate' : 'Stay & Real Estate';
  const subtitle =
    section === 'stay'
      ? 'Hotels, rentals, lodges & trips'
      : section === 'realestate'
        ? 'Homes & land for sale'
        : 'Stays, trips, homes & land';
  const partnerLabel =
    section === 'stay' ? 'Become a Hospitality Partner' : 'Become a Property Agent';

  const openAgentFlow = async () => {
    if (!isAuthenticated) { promptLogin('Login to register as a property agent.'); return; }
    setCheckingAgent(true);
    try {
      const data = await realEstateApi.getMyApplication();
      if (data?.agent || data?.application?.status === 'APPROVED') {
        navigate('/real-estate/manage-listings');
      } else {
        navigate(section === 'stay' ? '/real-estate/become-agent?section=stay' : '/real-estate/become-agent');
      }
    } catch {
      navigate(section === 'stay' ? '/real-estate/become-agent?section=stay' : '/real-estate/become-agent');
    } finally {
      setCheckingAgent(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title={title} subtitle={subtitle} backTo="/" />

      <div className="p-4 space-y-4">
        <button
          type="button"
          onClick={openAgentFlow}
          disabled={checkingAgent}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors text-left disabled:opacity-60"
        >
          {checkingAgent ? (
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <UserPlus className="w-5 h-5 text-violet-600 shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{partnerLabel}</p>
            <p className="text-xs text-gray-500">List and manage properties</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) { promptLogin('Login to view your reservations and inquiries.'); return; }
            navigate('/real-estate/my-reservations');
          }}
          className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700"
        >
          <Bookmark className="w-4 h-4" />
          My Reservations & Inquiries
        </button>

        {showStay && (
          <>
            <h2 className="text-base font-semibold text-gray-900 pt-2">Stay & Accommodation</h2>
            <div className="grid grid-cols-2 gap-3">
              {STAY_TYPES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => navigate(`/real-estate/browse/${item.type}?title=${encodeURIComponent(item.title)}`)}
                  className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-violet-300 transition-colors text-left"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${item.color}`}>
                    {item.icon}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {showRealty && (
          <>
            <h2 className={`text-base font-semibold text-gray-900 ${showStay ? 'pt-4' : 'pt-2'}`}>Real Estate</h2>
            <div className="grid grid-cols-2 gap-3">
              {BUY_TYPES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => navigate(`/real-estate/browse/${item.type}?title=${encodeURIComponent(item.title)}`)}
                  className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-violet-300 transition-colors text-left"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${item.color}`}>
                    {item.icon}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {loginModal}
    </div>
  );
}
