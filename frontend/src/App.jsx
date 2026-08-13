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
import Invoices from './pages/Invoices';
import ReceivingLetter from './pages/ReceivingLetter';
import Settings from './pages/Settings';
import AccountsDashboard from './pages/AccountsDashboard';
import CentralVaultLedger from './pages/CentralVaultLedger';
import CustomerManagement from './pages/CustomerManagement';
import InstallmentManagement from './pages/InstallmentManagement';
import SecurityChequeManager from './pages/SecurityChequeManager';
import FinancialStatements from './pages/FinancialStatements';
import ChartOfAccounts from './pages/ChartOfAccounts';

function MainLayout() {
  const { user, isAdmin, loading } = useAuth();
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

          <div className={currentTab === 'invoices' ? 'block' : 'hidden'}>
            <Invoices />
          </div>

          <div className={currentTab === 'users' ? 'block' : 'hidden'}>
            <Users />
          </div>

          <div className={currentTab === 'reports' ? 'block' : 'hidden'}>
            <Reports />
          </div>

          <div className={currentTab === 'accounts_dashboard' ? 'block' : 'hidden'}>
            <AccountsDashboard setCurrentTab={setCurrentTab} />
          </div>

          <div className={currentTab === 'chart_of_accounts' ? 'block' : 'hidden'}>
            <ChartOfAccounts />
          </div>

          <div className={currentTab === 'central_vault' ? 'block' : 'hidden'}>
            <CentralVaultLedger />
          </div>

          <div className={currentTab === 'customer_management' ? 'block' : 'hidden'}>
            <CustomerManagement />
          </div>

          <div className={currentTab === 'installment_management' ? 'block' : 'hidden'}>
            <InstallmentManagement />
          </div>

          <div className={currentTab === 'security_cheques' ? 'block' : 'hidden'}>
            <SecurityChequeManager />
          </div>

          <div className={currentTab === 'financial_statements' ? 'block' : 'hidden'}>
            <FinancialStatements />
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
