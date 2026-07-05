import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Droplets, Sparkles, Flame, Zap, Building, Dumbbell, Wrench,
  Briefcase, Calendar, ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginPrompt } from '../../components/LoginPromptModal';
import { homeServicesApi, type ServiceCategory } from '../../api/homeServicesApi';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  plumbing: <Droplets className="w-7 h-7 text-sky-500" />,
  cleaning: <Sparkles className="w-7 h-7 text-sky-500" />,
  welding: <Flame className="w-7 h-7 text-sky-500" />,
  electrical: <Zap className="w-7 h-7 text-sky-500" />,
  'architectural-design': <Building className="w-7 h-7 text-sky-500" />,
  'fitness-coaching': <Dumbbell className="w-7 h-7 text-sky-500" />,
};

export function HomeServicesHub() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { promptLogin, loginModal } = useLoginPrompt();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeServicesApi.getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title="Home & Professional Services" subtitle="Book trusted trades & coaches" backTo="/" />

      <div className="p-4 space-y-4">
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) { promptLogin('Login to register as a service provider.'); return; }
            navigate('/home-services/become-provider');
          }}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors text-left"
        >
          <Briefcase className="w-5 h-5 text-sky-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Become a Service Provider</p>
            <p className="text-xs text-gray-500">Register and offer your skills</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) { promptLogin('Login to view your service bookings.'); return; }
            navigate('/home-services/my-bookings');
          }}
          className="flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          <Calendar className="w-4 h-4" />
          My Service Bookings
        </button>

        <h2 className="text-base font-semibold text-gray-900 pt-2">Choose a Service</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/home-services/categories/${cat.id}?name=${encodeURIComponent(cat.name)}`}
                className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mb-3">
                  {CATEGORY_ICONS[cat.slug] || <Wrench className="w-7 h-7 text-sky-500" />}
                </div>
                <p className="text-sm font-semibold text-gray-900">{cat.name}</p>
                {cat.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cat.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
      {loginModal}
    </div>
  );
}
