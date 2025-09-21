import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { sellerService } from '../api/seller';
import { API_CONFIG } from '../config/api';

export function SellerProductDetail() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [quantity, setQuantity] = useState<number>(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const getImageUrl = (image: string) => {
    if (!image) return 'https://via.placeholder.com/400x300?text=No+Image';
    if (image.startsWith('http')) return image;
    const base = API_CONFIG.BASE_URL.replace('/api', '');
    return `${base}${image.startsWith('/') ? image : `/${image}`}`;
  };

  const load = async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await sellerService.getSellerProductById(productId);
      setProduct(res);
      setQuantity(res.quantity ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [productId]);

  const updateStock = async () => {
    if (!productId) return;
    try {
      setUpdating(true);
      await sellerService.updateSellerProductStock(productId, quantity);
      await load();
      setToast({ type: 'success', message: 'Stock updated successfully' });
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to update stock';
      setToast({ type: 'error', message: msg });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Product not found or access denied.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-md text-sm ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <img src={getImageUrl(product.images?.[0]?.imageUrl || '')} alt={product.title} className="w-full h-80 object-cover rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.title}</h1>
              <p className="text-2xl font-bold text-blue-600 mb-4">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currencyCode }).format(product.price)}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium text-gray-900">{product.status}</p>
                </div>
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium text-gray-900">{product.category?.name || 'Uncategorized'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Views</p>
                  <p className="font-medium text-gray-900">{product.views}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">{new Date(product.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-500 text-sm mb-1">Stock Quantity</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={updateStock}
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center"
                  >
                    {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 
                    <span className="ml-2">Update</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-sm mb-1">Description</p>
                <p className="text-gray-800 text-sm">{product.description || 'No description provided.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


