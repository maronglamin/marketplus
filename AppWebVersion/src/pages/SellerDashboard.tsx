import React, { useState, useEffect, useRef } from 'react';
import { Plus, Eye, ShoppingCart, Star, Edit, Trash2, Package, AlertTriangle, CheckCircle2, Clock, RefreshCw, Shield, History, ArrowRight, BarChart3, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { kycService, type SellerKycResponse } from '../api/kyc';
import { salesRepService, type SalesRep } from '../api/salesReps';
import { sellerService } from '../api/seller';
import { API_CONFIG } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  price: string;
  rating: number;
  image: string;
  views: number;
  orderCount: number;
  stock: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

// Removed unused mockProducts

export function SellerDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState<SellerKycResponse | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);
  const [salesRep, setSalesRep] = useState<SalesRep | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingOrders: 0,
    totalOrders: 0,
    totalRevenue: 0,
    revenueCurrency: 'USD',
    hasOtherCurrencies: false,
    salesReps: 0,
  });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [productsTotal, setProductsTotal] = useState(0);
  const PAGE_SIZE = 9;
  const [refreshingKyc, setRefreshingKyc] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const isSalesRep = !!(salesRep && salesRep.status === 'ACTIVE');
  const isSalesRepSuspended = salesRep?.status === 'SUSPENDED';

  // Normalize KYC status to be robust against casing/whitespace differences from API
  const kycStatus = ((kyc?.status || '') as string).toString().trim().toUpperCase();
  // Only allow access when KYC (own or parent's when sales rep) is APPROVED
  const canAccessDashboard = kycStatus === 'APPROVED';

  const getImageUrl = (image: string) => {
    if (!image) return 'https://via.placeholder.com/64?text=No+Image';
    if (image.startsWith('http')) return image;
    const base = API_CONFIG.BASE_URL.replace('/api', '');
    return `${base}${image.startsWith('/') ? image : `/${image}`}`;
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currencySymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      CHF: 'CHF',
      CNY: '¥',
      INR: '₹',
      BRL: 'R$',
      MXN: '$',
      KRW: '₩',
      SGD: 'S$',
      HKD: 'HK$',
      NZD: 'NZ$',
    };
    return currencySymbols[currencyCode] || currencyCode;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    const initialize = async () => {
      try {
        setLoading(true);
        setKycError(null);
        // Check if user is a Sales Rep and handle inherited KYC access
        let rep: SalesRep | null = null;
        try {
          rep = await salesRepService.getSalesRepByUser();
        } catch (err: any) {
          // Not a sales rep or API returned 404; proceed to check own KYC
          rep = null;
        }

        if (rep && rep.status === 'ACTIVE') {
          setSalesRep(rep);
          // Fetch parent seller's KYC to determine access
          try {
            const parentKyc = await kycService.getKycStatusByUser(rep.parentSellerId);
            setKyc(parentKyc);
          } catch (err: any) {
            if (err?.response?.status === 404) {
              setKyc(null);
            } else if (err?.response?.status === 401) {
              setKycError('Please log in to continue');
            } else {
              setKycError('Failed to check parent seller verification. Please try again later.');
            }
          }
        } else {
          // Not a rep; check user's own KYC
          const res = await kycService.getKycStatus();
          setKyc(res);
        }
        // If approved (or sales rep inherited), load real stats
        let statsData;
        try {
          statsData = await sellerService.getSellerStats();
          console.log('✅ Stats API call successful:', statsData);
        } catch (error) {
          console.error('❌ Stats API call failed:', error);
          // Set default values if API fails
          statsData = {
            totalProducts: 0,
            activeProducts: 0,
            totalSales: 0,
            pendingOrders: 0,
            totalRevenue: 0,
            revenueCurrency: 'USD',
            hasOtherCurrencies: false
          };
        }
        
        // Use totalOrders if backend provides it; otherwise compute from endpoint
        let totalOrders = statsData.totalOrders ?? (statsData.pendingOrders + statsData.totalSales);
        
        // Load sales reps count
        let salesRepsCount = 0;
        try {
          const salesRepsData = await salesRepService.getSalesReps();
          salesRepsCount = salesRepsData.length;
        } catch (error) {
          console.log('No sales reps found or error loading sales reps');
        }
        
        setStats({
          totalProducts: statsData.totalProducts,
          pendingOrders: statsData.pendingOrders,
          totalOrders,
          totalRevenue: statsData.totalRevenue,
          revenueCurrency: statsData.revenueCurrency || 'USD',
          hasOtherCurrencies: !!statsData.hasOtherCurrencies,
          salesReps: salesRepsCount,
        });

        // Load first page of seller products for table
        try {
          setLoadingProducts(true);
          const productsRes = await sellerService.getSellerProducts(1, PAGE_SIZE);
          const mapped = productsRes.products.map((p: any) => ({
            id: p.id,
            name: p.title,
            price: `${p.currencyCode} ${Number(p.price).toFixed(2)}`,
            rating: 0,
            image: getImageUrl(p.images?.[0]?.imageUrl || ''),
            views: p.views || 0,
            orderCount: p.orderCount || 0,
            stock: p.quantity,
            status: (p.status || 'inactive').toLowerCase(),
            createdAt: p.createdAt?.slice(0, 10) || '',
          }));
          setProducts(mapped);
          setProductsPage(productsRes.page);
          setHasMoreProducts(productsRes.hasMore);
          setProductsTotal(productsRes.total);
        } catch (err) {
          console.log('Failed to load products for dashboard table, continuing with empty list');
          setProducts([]);
          setProductsPage(1);
          setHasMoreProducts(false);
          setProductsTotal(0);
        } finally {
          setLoadingProducts(false);
        }
      } catch (e: any) {
        // 404 = no KYC record
        if (e?.response?.status === 404) {
          setKyc(null);
        } else if (e?.response?.status === 401) {
          setKycError('Please log in to continue');
        } else {
          setKycError('Failed to check seller status. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [isAuthenticated]);

  // Handle click outside to close header menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };

    if (headerMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [headerMenuOpen]);

  const refreshKycStatus = async () => {
    try {
      setRefreshingKyc(true);
      if (isSalesRep && salesRep?.parentSellerId) {
        const res = await kycService.getKycStatusByUser(salesRep.parentSellerId);
        setKyc(res);
      } else {
        const res = await kycService.getKycStatus();
        setKyc(res);
      }
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setKyc(null);
      } else if (e?.response?.status === 401) {
        setKycError('Please log in to continue');
      } else {
        setKycError('Failed to refresh status. Please try again later.');
      }
    } finally {
      setRefreshingKyc(false);
    }
  };

  const toggleProductStatus = (productId: string) => {
    setProducts(products.map(product => 
      product.id === productId 
        ? { ...product, status: product.status === 'active' ? 'inactive' : 'active' }
        : product
    ));
  };

  const deleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(product => product.id !== productId));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Centered Login Prompt Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setShowLoginModal(false); navigate('/'); }} />
            <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Login Required</h4>
              <p className="text-sm text-gray-600 mb-6">
                Please log in to access the seller dashboard.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => { setShowLoginModal(false); navigate('/'); }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowLoginModal(false); navigate('/login'); }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If Sales Rep account is suspended, show Suspended UI
  if (isSalesRepSuspended) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-red-100">
            <div className="flex items-start">
              <div className="p-3 bg-red-50 rounded-lg mr-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">Account Suspended</h2>
                <p className="text-gray-700 mt-2">Your account has been suspended. Please contact support for more information.</p>
                <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-start">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <Info className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-900">
                        You cannot access the dashboard while your account is suspended. Contact support for assistance.
                      </p>
                      <p className="text-sm text-slate-900 font-semibold mt-3">Contact Support:</p>
                      <p className="text-sm text-slate-700">
                        Email: <a href="mailto:customercare@cloudnexus.biz" className="underline text-blue-700">customercare@cloudnexus.biz</a>
                      </p>
                      <p className="text-sm text-slate-700">
                        Phone: <a href="tel:+2206738885" className="underline text-blue-700">+220 673 8885</a>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <a href="mailto:customercare@cloudnexus.biz" className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Contact Support
                  </a>
                  <Link to="/home" className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    Go Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle auth/other errors
  if (kycError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-red-100">
            <div className="flex items-start">
              <div className="p-2 bg-red-50 rounded-lg mr-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unable to access Seller Dashboard</h2>
                <p className="text-red-700 mt-1">{kycError}</p>
                <div className="mt-4 flex gap-3">
                  <button onClick={refreshKycStatus} disabled={refreshingKyc} className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshingKyc ? 'animate-spin' : ''}`} />
                    Retry
                  </button>
                  <Link to="/home" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Go Home</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no KYC record
  if (!kyc) {
    if (isSalesRep) {
      // Sales reps shouldn't see "Become a Seller" – they inherit parent KYC
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-10">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-yellow-100">
              <div className="flex items-start">
                <div className="p-2 bg-yellow-50 rounded-lg mr-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Access Restricted</h2>
                  <p className="text-gray-700 mt-1">We could not verify your parent seller’s status. Please refresh or contact support.</p>
                  <div className="mt-4 flex gap-3">
                    <button disabled className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Status
                    </button>
                    <Link to="/home" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Go Home</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // Non-reps: show Become a Seller prompt and link to KYC form
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-blue-50 rounded-lg mr-3">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Become a Seller</h1>
            </div>
            <p className="text-gray-700 mb-6">Complete your seller verification to start listing products and making sales.</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-1 mb-6">
              <li>Provide business details and registration information</li>
              <li>Confirm your business location and contact details</li>
              <li>Upload required documents and banking information</li>
            </ul>
            <div className="flex gap-3">
              <Link to="/seller/kyc" className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Get Started</Link>
              <button disabled className="px-5 py-3 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed inline-flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If KYC pending
  if (kycStatus === 'PENDING') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-yellow-100">
            <div className="flex items-start">
              <div className="p-3 bg-yellow-50 rounded-lg mr-3">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">Verification in Progress</h2>
                <p className="text-gray-700 mt-2">Your seller verification is being reviewed. We'll notify you once it's approved.</p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Step 1</p>
                    <p className="text-sm font-medium text-gray-800">Business Details</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Step 2</p>
                    <p className="text-sm font-medium text-gray-800">Address & Contact</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Step 3</p>
                    <p className="text-sm font-medium text-gray-800">Documents & Bank</p>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button disabled className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </button>
                  <Link to="/home" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Go Home</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If suspended
  if (kycStatus === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-red-100">
            <div className="flex items-start">
              <div className="p-3 bg-red-50 rounded-lg mr-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">Account Suspended</h2>
                <p className="text-gray-700 mt-2">Your seller account has been suspended. Please contact support for more information.</p>

                {/* Info box similar to mobile implementation */}
                <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-start">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <Info className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-900">
                        You cannot submit a new verification while your account is suspended. Contact support for assistance.
                      </p>
                      <p className="text-sm text-slate-900 font-semibold mt-3">Contact Support:</p>
                      <p className="text-sm text-slate-700">
                        Email: <a href="mailto:customercare@cloudnexus.biz" className="underline text-blue-700">customercare@cloudnexus.biz</a>
                      </p>
                      <p className="text-sm text-slate-700">
                        Phone: <a href="tel:+2206738885" className="underline text-blue-700">+220 673 8885</a>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <a href="mailto:customercare@cloudnexus.biz" className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Contact Support
                  </a>
                  <Link to="/home" className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    Go Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If rejected
  if (kycStatus === 'REJECTED') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-red-100">
            <div className="flex items-start">
              <div className="p-3 bg-red-50 rounded-lg mr-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">Verification Rejected</h2>
                <p className="text-gray-700 mt-2">{kyc.rejectionReason || 'Please review and update your information.'}</p>
                <div className="mt-6 flex gap-3">
                  <Link to="/seller/kyc" className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update Verification</Link>
                  <button disabled className="px-5 py-3 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed inline-flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </button>
                  <Link to="/home" className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Go Home</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Approved — show dashboard (guarded)
  if (!canAccessDashboard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-yellow-100">
            <div className="flex items-start">
              <div className="p-2 bg-yellow-50 rounded-lg mr-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Access Restricted</h2>
                <p className="text-gray-700 mt-1">Your seller account is not approved yet. Please check your verification status.</p>
                <div className="mt-4 flex gap-3">
                  <button disabled className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </button>
                  <Link to="/home" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Go Home</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{isSalesRep ? 'Sales Rep Dashboard' : 'Seller Dashboard'}</h1>
              <p className="text-gray-600">{isSalesRep ? 'Track your branch sales and performance' : 'Manage your products and track your sales'}</p>
            </div>
            <div className="relative" ref={headerMenuRef}>
              {headerMenuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-10" style={{ minWidth: '200px' }}>
                  <button
                    onClick={() => { 
                      console.log('Add Product clicked');
                      setHeaderMenuOpen(false); 
                      navigate('/seller/add-product'); 
                    }}
                    className="w-full px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 text-left flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </button>
                  <button
                    onClick={() => { 
                      console.log('Add Sales Rep clicked');
                      setHeaderMenuOpen(false); 
                      navigate('/seller/sales-reps'); 
                    }}
                    className="w-full px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 text-left border-t border-gray-200 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Sales Rep
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  console.log('Button clicked, current state:', headerMenuOpen);
                  setHeaderMenuOpen((v) => !v);
                }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Product
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
            </div>
          </div>

          {/* Removed Total Views card per requirement */}

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>

          <Link
            to="/reports"
            className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] group relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Sales Reps</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.salesReps || 0}</p>
                </div>
              </div>
              <div className="flex items-center text-purple-600 group-hover:text-purple-700 transition-colors">
                <BarChart3 className="w-5 h-5 mr-2" />
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            <div className="absolute bottom-2 left-2">
              <p className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors">view salesreps report</p>
            </div>
          </Link>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getCurrencySymbol(stats.revenueCurrency)} {stats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.revenueCurrency} {stats.hasOtherCurrencies ? '(Latest TNX)' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your Products</h2>
            <Link
              to="/transactions"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors group"
            >
              <History className="w-4 h-4 mr-2" />
              Transaction History
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/seller/product/${product.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          className="h-12 w-12 rounded-lg object-cover"
                          src={product.image}
                          alt={product.name}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.createdAt}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.views}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.orderCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {(() => {
                const start = (productsPage - 1) * PAGE_SIZE + 1;
                const end = Math.min(productsPage * PAGE_SIZE, productsTotal);
                const totalPages = Math.max(1, Math.ceil(productsTotal / PAGE_SIZE));
                return `Showing ${productsTotal === 0 ? 0 : start}-${end} of ${productsTotal} • Page ${productsPage} of ${totalPages}`;
              })()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (productsPage <= 1) return;
                  setLoadingProducts(true);
                  const prevPage = productsPage - 1;
                  const res = await sellerService.getSellerProducts(prevPage, PAGE_SIZE);
                  const mapped = res.products.map((p: any) => ({
                    id: p.id,
                    name: p.title,
                    price: `${p.currencyCode} ${Number(p.price).toFixed(2)}`,
                    rating: 0,
                    image: getImageUrl(p.images?.[0]?.imageUrl || ''),
                    views: p.views || 0,
                    orderCount: p.orderCount || 0,
                    stock: p.quantity,
                    status: (p.status || 'inactive').toLowerCase(),
                    createdAt: p.createdAt?.slice(0, 10) || '',
                  }));
                  setProducts(mapped);
                  setProductsPage(res.page);
                  setHasMoreProducts(res.hasMore);
                  setProductsTotal(res.total);
                  setLoadingProducts(false);
                }}
                disabled={productsPage <= 1 || loadingProducts}
                className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
              >
                Previous
              </button>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(productsTotal / PAGE_SIZE));
                const maxVisiblePages = 4;
                
                // If total pages is 4 or less, show all pages
                if (totalPages <= maxVisiblePages) {
                  const pages: number[] = [];
                  for (let p = 1; p <= totalPages; p++) pages.push(p);
                  return (
                    <div className="flex items-center gap-1">
                      {pages.map((p) => (
                        <button
                          key={p}
                          onClick={async () => {
                            if (loadingProducts || p === productsPage) return;
                            setLoadingProducts(true);
                            const res = await sellerService.getSellerProducts(p, PAGE_SIZE);
                            const mapped = res.products.map((pr: any) => ({
                              id: pr.id,
                              name: pr.title,
                              price: `${pr.currencyCode} ${Number(pr.price).toFixed(2)}`,
                              rating: 0,
                              image: getImageUrl(pr.images?.[0]?.imageUrl || ''),
                              views: pr.views || 0,
                              orderCount: pr.orderCount || 0,
                              stock: pr.quantity,
                              status: (pr.status || 'inactive').toLowerCase(),
                              createdAt: pr.createdAt?.slice(0, 10) || '',
                            }));
                            setProducts(mapped);
                            setProductsPage(res.page);
                            setHasMoreProducts(res.hasMore);
                            setProductsTotal(res.total);
                            setLoadingProducts(false);
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm ${p === productsPage ? 'bg-blue-600 text-white border-blue-600' : ''}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  );
                }

                // For more than 4 pages, show dynamic pagination
                let startPage: number;
                let endPage: number;
                let showStartEllipsis = false;
                let showEndEllipsis = false;

                if (productsPage <= 3) {
                  // Show first 4 pages
                  startPage = 1;
                  endPage = 4;
                  showEndEllipsis = totalPages > 4;
                } else if (productsPage >= totalPages - 2) {
                  // Show last 4 pages
                  startPage = totalPages - 3;
                  endPage = totalPages;
                  showStartEllipsis = totalPages > 4;
                } else {
                  // Show current page in the middle
                  startPage = productsPage - 1;
                  endPage = productsPage + 2;
                  showStartEllipsis = true;
                  showEndEllipsis = true;
                }

                const pages: number[] = [];
                for (let p = startPage; p <= endPage; p++) pages.push(p);

                return (
                  <div className="flex items-center gap-1">
                    {/* First page */}
                      <button
                        onClick={async () => {
                        if (loadingProducts || 1 === productsPage) return;
                          setLoadingProducts(true);
                          const res = await sellerService.getSellerProducts(1, PAGE_SIZE);
                          const mapped = res.products.map((p: any) => ({
                            id: p.id,
                            name: p.title,
                            price: `${p.currencyCode} ${Number(p.price).toFixed(2)}`,
                            rating: 0,
                            image: getImageUrl(p.images?.[0]?.imageUrl || ''),
                            views: p.views || 0,
                            orderCount: p.orderCount || 0,
                            stock: p.quantity,
                            status: (p.status || 'inactive').toLowerCase(),
                            createdAt: p.createdAt?.slice(0, 10) || '',
                          }));
                          setProducts(mapped);
                          setProductsPage(res.page);
                          setHasMoreProducts(res.hasMore);
                          setProductsTotal(res.total);
                          setLoadingProducts(false);
                        }}
                      className={`px-3 py-2 rounded-lg border text-sm ${1 === productsPage ? 'bg-blue-600 text-white border-blue-600' : ''}`}
                      >
                        1
                      </button>

                    {/* Start ellipsis */}
                    {showStartEllipsis && (
                      <>
                        <span className="px-2 text-sm text-gray-500">…</span>
                      </>
                    )}

                    {/* Middle pages */}
                    {pages.filter(p => p !== 1 && p !== totalPages).map((p) => (
                      <button
                        key={p}
                        onClick={async () => {
                          if (loadingProducts || p === productsPage) return;
                          setLoadingProducts(true);
                          const res = await sellerService.getSellerProducts(p, PAGE_SIZE);
                          const mapped = res.products.map((pr: any) => ({
                            id: pr.id,
                            name: pr.title,
                            price: `${pr.currencyCode} ${Number(pr.price).toFixed(2)}`,
                            rating: 0,
                            image: getImageUrl(pr.images?.[0]?.imageUrl || ''),
                            views: pr.views || 0,
                            orderCount: pr.orderCount || 0,
                            stock: pr.quantity,
                            status: (pr.status || 'inactive').toLowerCase(),
                            createdAt: pr.createdAt?.slice(0, 10) || '',
                          }));
                          setProducts(mapped);
                          setProductsPage(res.page);
                          setHasMoreProducts(res.hasMore);
                          setProductsTotal(res.total);
                          setLoadingProducts(false);
                        }}
                        className={`px-3 py-2 rounded-lg border text-sm ${p === productsPage ? 'bg-blue-600 text-white border-blue-600' : ''}`}
                      >
                        {p}
                      </button>
                    ))}

                    {/* End ellipsis */}
                    {showEndEllipsis && (
                      <>
                        <span className="px-2 text-sm text-gray-500">…</span>
                      </>
                    )}

                    {/* Last page */}
                    {totalPages > 1 && (
                      <button
                        onClick={async () => {
                          if (loadingProducts || totalPages === productsPage) return;
                          setLoadingProducts(true);
                          const res = await sellerService.getSellerProducts(totalPages, PAGE_SIZE);
                          const mapped = res.products.map((p: any) => ({
                            id: p.id,
                            name: p.title,
                            price: `${p.currencyCode} ${Number(p.price).toFixed(2)}`,
                            rating: 0,
                            image: getImageUrl(p.images?.[0]?.imageUrl || ''),
                            views: p.views || 0,
                            orderCount: p.orderCount || 0,
                            stock: p.quantity,
                            status: (p.status || 'inactive').toLowerCase(),
                            createdAt: p.createdAt?.slice(0, 10) || '',
                          }));
                          setProducts(mapped);
                          setProductsPage(res.page);
                          setHasMoreProducts(res.hasMore);
                          setProductsTotal(res.total);
                          setLoadingProducts(false);
                        }}
                        className={`px-3 py-2 rounded-lg border text-sm ${totalPages === productsPage ? 'bg-blue-600 text-white border-blue-600' : ''}`}
                      >
                        {totalPages}
                      </button>
                    )}
                  </div>
                );
              })()}
              <button
                onClick={async () => {
                  if (!hasMoreProducts) return;
                  setLoadingProducts(true);
                  const nextPage = productsPage + 1;
                  const res = await sellerService.getSellerProducts(nextPage, PAGE_SIZE);
                  const mapped = res.products.map((p: any) => ({
                    id: p.id,
                    name: p.title,
                    price: `${p.currencyCode} ${Number(p.price).toFixed(2)}`,
                    rating: 0,
                    image: getImageUrl(p.images?.[0]?.imageUrl || ''),
                    views: p.views || 0,
                    orderCount: p.orderCount || 0,
                    stock: p.quantity,
                    status: (p.status || 'inactive').toLowerCase(),
                    createdAt: p.createdAt?.slice(0, 10) || '',
                  }));
                  setProducts(mapped);
                  setProductsPage(res.page);
                  setHasMoreProducts(res.hasMore);
                  setProductsTotal(res.total);
                  setLoadingProducts(false);
                }}
                disabled={!hasMoreProducts || loadingProducts}
                className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-500 mb-4">Start selling by adding your first product</p>
            <Link
              to="/seller/add-product"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Product
            </Link>
          </div>
        )}
      </div>

      {/* Floating Action Button with menu */}
      <div className="fixed bottom-20 right-6 z-30">
        {fabOpen && (
          <div className="mb-3 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => { setFabOpen(false); navigate('/seller/add-product'); }}
              className="w-full px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 text-left"
            >
              Add Product
            </button>
            <button
              onClick={() => { setFabOpen(false); navigate('/seller/sales-reps'); }}
              className="w-full px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 text-left border-t border-gray-200"
            >
              Add Sales Rep
            </button>
          </div>
        )}
        <button
          onClick={() => setFabOpen((v) => !v)}
          className="bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 transition-colors w-14 h-14 flex items-center justify-center"
          aria-label="Quick actions"
        >
          <Plus className={`w-6 h-6 transition-transform ${fabOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>
    </div>
  );
}
