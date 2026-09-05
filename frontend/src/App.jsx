import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataCacheProvider } from './context/DataCacheContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sellers from './pages/Sellers';
import Buyers from './pages/Buyers';
import Deals from './pages/Deals';
import Users from './pages/Users';
import Reports from './pages/Reports';
import CollaborationCenter from './pages/CollaborationCenter';
import CurrentStock from './pages/CurrentStock';
import AccountsStock from './pages/AccountsStock';
import SoldCars from './pages/SoldCars';
import Invoices from './pages/Invoices';
import AccountsHub from './pages/AccountsHub';
import Notifications from './pages/Notifications';
import ReceivingLetter from './pages/ReceivingLetter';
import IncentiveApprovalSheet from './pages/IncentiveApprovalSheet';
import Attendance from './pages/Attendance';
import Approvals from './pages/Approvals';
import Settings from './pages/Settings';
import SalesmanIncentives from './pages/SalesmanIncentives';
import CustomerHistory from './pages/CustomerHistory';

function MainLayout() {
  const { user, isAdmin, isSuperAdmin, canAccessAccounts, loading } = useAuth();
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
      setCurrentTab('my_sellers');
      setIsSellerModalOpen(true);
    } else if (type === 'buyer') {
      setCurrentTab('my_buyers');
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
          onNavigate={(tab) => setCurrentTab(tab)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className={currentTab === 'dashboard' ? 'block' : 'hidden'}>
            <Dashboard
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenModal={handleOpenModal}
            />
          </div>

          <div className={(currentTab === 'all_sellers' || currentTab === 'sellers') ? 'block' : 'hidden'}>
            <Sellers
              scope="all"
              search={search}
              isAddModalOpen={isSellerModalOpen}
              setIsAddModalOpen={setIsSellerModalOpen}
            />
          </div>

          <div className={currentTab === 'my_sellers' ? 'block' : 'hidden'}>
            <Sellers
              scope="mine"
              search={search}
              isAddModalOpen={isSellerModalOpen}
              setIsAddModalOpen={setIsSellerModalOpen}
            />
          </div>

          <div className={currentTab === 'commercial_sellers' ? 'block' : 'hidden'}>
            <Sellers
              scope="commercial"
              search={search}
              isAddModalOpen={isSellerModalOpen}
              setIsAddModalOpen={setIsSellerModalOpen}
            />
          </div>

          <div className={(currentTab === 'all_buyers' || currentTab === 'buyers') ? 'block' : 'hidden'}>
            <Buyers
              scope="all"
              search={search}
              isAddModalOpen={isBuyerModalOpen}
              setIsAddModalOpen={setIsBuyerModalOpen}
            />
          </div>

          <div className={currentTab === 'my_buyers' ? 'block' : 'hidden'}>
            <Buyers
              scope="mine"
              search={search}
              isAddModalOpen={isBuyerModalOpen}
              setIsAddModalOpen={setIsBuyerModalOpen}
            />
          </div>

          <div className={currentTab === 'commercial_buyers' ? 'block' : 'hidden'}>
            <Buyers
              scope="commercial"
              search={search}
              isAddModalOpen={isBuyerModalOpen}
              setIsAddModalOpen={setIsBuyerModalOpen}
            />
          </div>

          <div className={(currentTab === 'bank_cases' && isAdmin) ? 'block' : 'hidden'}>
            <Buyers
              scope="bank_cases"
              search={search}
              isAddModalOpen={isBuyerModalOpen}
              setIsAddModalOpen={setIsBuyerModalOpen}
            />
          </div>

          <div className={currentTab === 'receiving_letter' ? 'block' : 'hidden'}>
            <ReceivingLetter />
          </div>

          <div className={currentTab === 'incentive_approval' ? 'block' : 'hidden'}>
            <IncentiveApprovalSheet />
          </div>

          <div className={(currentTab === 'attendance' && isAdmin) ? 'block' : 'hidden'}>
            <Attendance />
          </div>

          <div className={currentTab === 'deals' ? 'block' : 'hidden'}>
            <Deals
              search={search}
              isAddModalOpen={isDealModalOpen}
              setIsAddModalOpen={setIsDealModalOpen}
            />
          </div>

          <div className={currentTab === 'collaboration' ? 'block' : 'hidden'}>
            <CollaborationCenter />
          </div>

          <div className={currentTab === 'stock' ? 'block' : 'hidden'}>
            <CurrentStock />
          </div>

          <div className={currentTab === 'sold_cars' ? 'block' : 'hidden'}>
            <SoldCars />
          </div>

          <div className={(currentTab === 'accounts' && canAccessAccounts) ? 'block' : 'hidden'}>
            <AccountsHub initialTab="coa" onNavigate={(tab) => setCurrentTab(tab)} />
          </div>

          <div className={(currentTab === 'audit_trail' && canAccessAccounts) ? 'block' : 'hidden'}>
            <AccountsHub initialTab="audit" onNavigate={(tab) => setCurrentTab(tab)} />
          </div>

          <div className={(currentTab === 'accounts_stock' && canAccessAccounts) ? 'block' : 'hidden'}>
            <AccountsStock onNavigate={(tab) => setCurrentTab(tab)} />
          </div>

          <div className={(currentTab === 'invoices' && canAccessAccounts) ? 'block' : 'hidden'}>
            <Invoices onNavigate={(tab) => setCurrentTab(tab)} />
          </div>

          <div className={currentTab === 'salesman_incentives' ? 'block' : 'hidden'}>
            <SalesmanIncentives onNavigate={(tab) => setCurrentTab(tab)} />
          </div>

          <div className={currentTab === 'customer_history' ? 'block' : 'hidden'}>
            <CustomerHistory onNavigate={(tab) => setCurrentTab(tab)} />
          </div>

          <div className={currentTab === 'notifications' ? 'block' : 'hidden'}>
            <Notifications onNavigate={(tab) => setCurrentTab(tab)} />
          </div>

          <div className={(currentTab === 'approvals' && isAdmin) ? 'block' : 'hidden'}>
            <Approvals />
          </div>

          <div className={currentTab === 'users' ? 'block' : 'hidden'}>
            <Users />
          </div>

          <div className={((currentTab === 'reports' || currentTab === 'bank_cases_report') && isAdmin) ? 'block' : 'hidden'}>
            <Reports defaultTab={currentTab === 'bank_cases_report' ? 'bank_cases' : 'salesmen'} />
          </div>

          <div className={currentTab === 'settings' ? 'block' : 'hidden'}>
            <Settings />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataCacheProvider>
        <MainLayout />
      </DataCacheProvider>
    </AuthProvider>
  );
}
