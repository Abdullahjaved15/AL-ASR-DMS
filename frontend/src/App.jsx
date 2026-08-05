import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sellers from './pages/Sellers';
import Buyers from './pages/Buyers';
import Deals from './pages/Deals';
import Users from './pages/Users';
import Reports from './pages/Reports';

function MainLayout() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global Modal trigger states
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#051424] flex items-center justify-center text-cyan-400 font-mono">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Initializing AL ASR MOTORS Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleOpenModal = (type) => {
    if (type === 'seller') {
      setCurrentTab('sellers');
      setIsSellerModalOpen(true);
    } else if (type === 'buyer') {
      setCurrentTab('buyers');
      setIsBuyerModalOpen(true);
    } else if (type === 'deal') {
      setCurrentTab('deals');
      setIsDealModalOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#051424]">
      {/* Sidebar Navigation Rail */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          search={search}
          setSearch={setSearch}
          onOpenModal={handleOpenModal}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenModal={handleOpenModal}
            />
          )}

          {currentTab === 'sellers' && (
            <Sellers
              search={search}
              isAddModalOpen={isSellerModalOpen}
              setIsAddModalOpen={setIsSellerModalOpen}
            />
          )}

          {currentTab === 'buyers' && (
            <Buyers
              search={search}
              isAddModalOpen={isBuyerModalOpen}
              setIsAddModalOpen={setIsBuyerModalOpen}
            />
          )}

          {currentTab === 'deals' && (
            <Deals
              search={search}
              isAddModalOpen={isDealModalOpen}
              setIsAddModalOpen={setIsDealModalOpen}
            />
          )}

          {currentTab === 'users' && <Users />}

          {currentTab === 'reports' && <Reports />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
