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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes - no authentication required */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
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
          
          <Route path="/products" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <Products />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/categories" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <Categories />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/product/:id" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <ProductDetail />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/seller" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <SellerDashboard />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
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
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1 pb-16">
                  <SellerAddProduct />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
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
          
          <Route path="/products/popular" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <PopularProducts />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/products/new" element={
            <ProtectedRoute>
              <div className="flex flex-col w-full min-h-screen bg-gray-50">
                <Header />
                <main className="flex-1">
                  <NewArrivals />
                </main>
                <BottomNavigation />
              </div>
            </ProtectedRoute>
          } />
          
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
