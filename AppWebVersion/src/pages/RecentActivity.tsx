import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Receipt, ChevronRight, RefreshCw } from 'lucide-react';
import { salesRepService } from '../api/salesReps';

interface ActivityItem {
  id: string;
  type: 'product' | 'order';
  createdAt: string;
  rep: { id: string; userId: string; name: string } | null;
  data: any;
}

export function RecentActivity() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async (cursor?: string) => {
    try {
      if (cursor) setLoadingMore(true); else setLoading(true);
      setError(null);
      const res = await salesRepService.getRecentActivity({ limit: 20, cursor });
      if (cursor) {
        setItems((prev) => [...prev, ...res.items]);
      } else {
        setItems(res.items);
      }
      setNextCursor(res.nextCursor);
    } catch (e: any) {
      setError(e?.message || 'Failed to load recent activity');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  if (loading && !items.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Recent Activity</h1>
            </div>
          </div>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading recent activity...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Recent Activity</h1>
            </div>
            <button onClick={() => loadPage()} className="flex items-center text-blue-600 hover:text-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center mb-6">
            <p className="text-red-600 mb-3">{error}</p>
            <button onClick={() => loadPage()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-3">
            {items.map((activity) => (
              <div key={activity.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                  activity.type === 'product' ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  {activity.type === 'product' ? (
                    <Package className="w-4 h-4 text-white" />
                  ) : (
                    <Receipt className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.type === 'product'
                      ? `${activity.data?.title || 'Product'} by ${activity.rep?.name || 'Unknown Rep'}`
                      : `Order #${activity.data?.orderNumber || ''} - ${activity.data?.productTitle || 'Product'} by ${activity.rep?.name || 'Unknown Rep'}`}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(activity.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: activity.data?.currencyCode || 'USD' }).format(activity.data?.amount || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center">
            {nextCursor ? (
              <button
                onClick={() => loadPage(nextCursor || undefined)}
                disabled={loadingMore}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            ) : (
              <span className="text-sm text-gray-500">No more activity</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecentActivity;


