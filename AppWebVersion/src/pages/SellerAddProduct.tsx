import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Star } from 'lucide-react';
import { sellerService } from '../api/seller';
import { uploadService } from '../api/upload';
import { categoryService, type Category } from '../api/products';
import { API_CONFIG } from '../config/api';

type ImageItem = { url: string; isPrimary: boolean };

export function SellerAddProduct() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [currencyQuery, setCurrencyQuery] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [condition, setCondition] = useState<string>('NEW');
  // Status is always ACTIVE on creation per requirement
  const currencies = [
    'USD','EUR','GBP','GHS','NGN','KES','ZAR','XOF','XAF','CAD','AUD','NZD','JPY','CNY','INR','AED','SAR','QAR','KWD','BHD','PKR','LKR','BDT','IDR','MYR','SGD','THB','VND','PHP','KRW','HKD','TWD','BRL','ARS','CLP','COP','PEN','MXN','CRC','GTQ','HNL','NIO','PAB','DOP','HTG','JMD','TTD','XCD','BBD','BSD','GYD','SRD','UYU','PYG','BOB','VES','GIP','MAD','EGP','TND','DZD','TRY','ILS','RUB','UAH','PLN','HUF','CZK','RON','BGN','CHF','NOK','SEK','DKK','ISK','HRK','RSD','GEL','AZN','KZT','UZS','TJS','TMT','AFN','IRR','IQD','JOD','LYD','OMR','YER','ETB','ZMW','UGX','RWF','BIF','TZS','MZN','AOA','NAD','BWP','SZL','LSL','MWK','GMD','SLL','LRD','SOS','SDG','XOF','XAF','XPF'
  ];
  const filteredCurrencies = currencies.filter(c => c.toLowerCase().includes(currencyQuery.toLowerCase()));
  const [images, setImages] = useState<ImageItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const getImageUrl = (image: string) => {
    if (!image) return 'https://via.placeholder.com/200?text=No+Image';
    if (image.startsWith('http')) return image;
    const base = API_CONFIG.BASE_URL.replace('/api', '');
    return `${base}${image.startsWith('/') ? image : `/${image}`}`;
  };

  useEffect(() => {
    const loadCategories = async () => {
      const data = await categoryService.getCategories();
      setCategories(data);
    };
    loadCategories();
  }, []);

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const file = files[0];
      const url = await uploadService.uploadImage(file);
      const normalized = getImageUrl(url);
      setImages(prev => {
        const next = [...prev, { url: normalized, isPrimary: prev.length === 0 }];
        return next.slice(0, 5);
      });
      e.target.value = '';
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to upload image' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some(i => i.isPrimary)) next[0].isPrimary = true;
      return next;
    });
  };

  const makePrimary = (index: number) => {
    setImages(prev => prev.map((img, i) => ({ ...img, isPrimary: i === index })));
  };

  const canSubmit =
    title.trim().length > 0 &&
    price > 0 &&
    quantity > 0 &&
    !!condition &&
    !!currencyCode &&
    !!categoryId &&
    images.length > 0;

  // On Android, the soft keyboard "Next" key can cause focus jumps and scroll bouncing.
  // We intercept Enter/Next and blur the input so users press "Done" to proceed.
  const handleEnterOrNextKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        currencyCode: currencyCode.trim().toUpperCase(),
        quantity: Number(quantity),
        categoryId: categoryId || null,
        condition,
        status: 'ACTIVE',
        images: images.map(img => ({
          imageUrl: img.url.replace(API_CONFIG.BASE_URL.replace('/api', ''), ''),
          isPrimary: img.isPrimary,
          width: 0,
          height: 0,
          size: 0,
          format: 'image'
        })),
        attributes: [],
        metadata: {}
      };
      const created = await sellerService.createProduct(payload);
      setToast({ type: 'success', message: 'Product created successfully' });
      setTimeout(() => setToast(null), 2000);
      navigate(`/seller`);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to create product';
      setToast({ type: 'error', message: msg });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSubmitting(false);
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

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Save Product
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name<span className="text-red-600"> *</span></label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter product name"
                value={title}
                onChange={e => setTitle(e.target.value)}
                enterKeyHint="done"
                onKeyDown={handleEnterOrNextKey}
              />

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category<span className="text-red-600"> *</span></label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price<span className="text-red-600"> *</span></label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    enterKeyHint="done"
                    onKeyDown={handleEnterOrNextKey}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency<span className="text-red-600"> *</span></label>
                  <div className="space-y-2">
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="Search currency code (e.g., USD)"
                      value={currencyQuery}
                      onChange={e => setCurrencyQuery(e.target.value)}
                      enterKeyHint="done"
                      onKeyDown={handleEnterOrNextKey}
                    />
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      value={currencyCode}
                      onChange={e => setCurrencyCode(e.target.value)}
                      size={6}
                    >
                      {filteredCurrencies.map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock<span className="text-red-600"> *</span></label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    enterKeyHint="done"
                    onKeyDown={handleEnterOrNextKey}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition<span className="text-red-600"> *</span></label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                  >
                    <option value="NEW">New</option>
                    <option value="VERY_GOOD">Very Good</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="REFURBISHED">Refurbished</option>
                  </select>
                </div>
              </div>

              {/* Status removed; defaults to ACTIVE on backend payload */}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                    <img src={img.url} alt="Product" className="w-full h-full object-cover" />
                    {img.isPrimary && (
                      <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded inline-flex items-center">
                        <Star className="w-3 h-3 mr-1" /> Primary
                      </span>
                    )}
                    <button
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                      onClick={() => removeImage(idx)}
                      aria-label="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {!img.isPrimary && (
                      <button
                        className="absolute bottom-1 left-1 bg-gray-900/70 text-white text-[10px] px-2 py-0.5 rounded"
                        onClick={() => makePrimary(idx)}
                      >
                        Make primary
                      </button>
                    )}
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50">
                    <input type="file" className="hidden" accept="image/*" onChange={onFileSelect} />
                    <Plus className="w-6 h-6 text-gray-400" />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">Add up to 5 images. First image is used as primary.</p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              placeholder="Enter product description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


