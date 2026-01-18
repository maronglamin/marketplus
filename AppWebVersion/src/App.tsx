import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { ProductDetail } from './pages/ProductDetail';
import { SellerDashboard } from './pages/SellerDashboard';
import { SellerKycForm } from './pages/SellerKycForm';
import { SellerKycBusiness } from './pages/SellerKycBusiness';
import { SellerKycAddress } from './pages/SellerKycAddress';
import { SellerKycVerification } from './pages/SellerKycVerification';
import { SellerKycConfirmation } from './pages/SellerKycConfirmation';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/Home';
import { PopularProducts } from './pages/PopularProducts';
import { NewArrivals } from './pages/NewArrivals';
import { ShowInterest } from './pages/ShowInterest';
import { PlaceOrder } from './pages/PlaceOrder';
import { SellerProductDetail } from './pages/SellerProductDetail';
import { SellerAddProduct } from './pages/SellerAddProduct';
import { SalesReps } from './pages/SalesReps';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Orders } from './pages/Orders';
import { ShoppingCart } from './pages/ShoppingCart';
import { RevenueDetails } from './pages/RevenueDetails';
import { TransactionHistory } from './pages/TransactionHistory';
import { TransactionCurrencyOverview } from './pages/TransactionCurrencyOverview';
import { TransactionDetail } from './pages/TransactionDetail';
import { SettlementRequest } from './pages/SettlementRequest';
import { SettlementDetail } from './pages/SettlementDetail';
import { SettlementHistory } from './pages/SettlementHistory';
import { ReportsScreen } from './pages/ReportsScreen';
import { RepOrderReport } from './pages/RepOrderReport';
import { RepProductReport } from './pages/RepProductReport';
import RecentActivity from './pages/RecentActivity';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes - no authentication required */}
          <Route
            path="/"
            element={
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <Home />
                </main>
                <BottomNavigation />
              </div>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/transactions" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <TransactionCurrencyOverview />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/transactions/:currency" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <TransactionHistory />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />
          
          {/* Public ecommerce browsing routes */}
          <Route
            path="/products"
            element={
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <Products />
                </main>
                <BottomNavigation />
              </div>
            }
          />
          <Route
            path="/categories"
            element={
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <Categories />
                </main>
                <BottomNavigation />
              </div>
            }
          />
          <Route
            path="/product/:id"
            element={
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <ProductDetail />
                </main>
                <BottomNavigation />
              </div>
            }
          />
          
          <Route path="/seller" element={
            <div className="flex flex-col w-full min-h-screen bg-gray-50">
              <Header />
              <main className="flex-1 pb-16">
                <SellerDashboard />
              </main>
              <BottomNavigation />
            </div>
          } />

          <Route path="/seller/sales-reps" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <SalesReps />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/seller/add-product" element={
            <div className="flex flex-col w-full min-h-screen bg-gray-50">
              <Header />
              <main className="flex-1 pb-16">
                <SellerAddProduct />
              </main>
              <BottomNavigation />
            </div>
          } />

          <Route path="/seller/kyc" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <SellerKycForm />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/seller/kyc/business" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <SellerKycBusiness />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/seller/kyc/address" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <SellerKycAddress />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/seller/kyc/verification" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <SellerKycVerification />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/seller/kyc/confirm" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <SellerKycConfirmation />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />
          
          <Route
            path="/products/popular"
            element={
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <PopularProducts />
                </main>
                <BottomNavigation />
              </div>
            }
          />
          
          <Route
            path="/products/new"
            element={
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <NewArrivals />
                </main>
                <BottomNavigation />
              </div>
            }
          />
          
          <Route path="/product/:productId/interest" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <ShowInterest />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/product/:productId/order" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <PlaceOrder />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          {/* Protected routes - require authentication */}
          <Route path="/home" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <Home />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/seller/product/:productId" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <SellerProductDetail />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/orders" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <Orders />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/shopping-cart" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <ShoppingCart />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          {/* Debug route */}
          <Route path="/transactions-debug" element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Transactions Debug</h1>
                <p className="text-gray-600 mb-4">This route is working!</p>
                <p className="text-sm text-gray-500">Current path: {window.location.pathname}</p>
              </div>
            </div>
          } />

          {/* Revenue and Transaction Routes */}
          <Route path="/revenue-details" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <RevenueDetails />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/transaction-detail/:transactionId" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <TransactionDetail />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          {/* Settlement Routes */}
          <Route path="/settlement-request" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <SettlementRequest />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/settlement-detail/:settlementId" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <SettlementDetail />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          <Route path="/settlement-history" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <SettlementHistory />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          {/* Reports Screen Route */}
          <Route path="/reports" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <ReportsScreen />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          {/* Rep Order Report Route */}
          <Route path="/rep-order-report" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <RepOrderReport />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          {/* Rep Product Report Route */}
          <Route path="/rep-product-report" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <RepProductReport />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          {/* Recent Activity Route */}
          <Route path="/recent-activity" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <RecentActivity />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />

          {/* Catch-all route for debugging */}
          <Route path="*" element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                <p className="text-sm text-gray-500">Current path: {window.location.pathname}</p>
              </div>
            </div>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
