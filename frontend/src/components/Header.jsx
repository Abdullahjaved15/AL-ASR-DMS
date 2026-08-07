import React, { useState, useEffect } from 'react';
import { Search, Plus, Car, UserPlus, Handshake, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ currentTab, search, setSearch, onOpenModal, onToggleMobileMenu }) {
const { user, isAdmin, logout } = useAuth();
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const titles = {
    dashboard: 'Executive Overview',
    all_sellers: 'All Sellers Inventory',
    my_sellers: 'My Sellers Leads',
    all_buyers: 'All Buyers Inquiries',
    my_buyers: 'My Buyers Leads',
    sellers: 'Vehicle Inventory & Sellers',
    buyers: 'Buyer Inquiries & Leads',
    deals: 'Completed Transactions & Profit',
    collaboration: '50-50% Commission Collaboration Center',
    stock: 'Showroom Current Stock Floor',
    users: 'Salesmen & Account Management',
    reports: 'Performance Analytics & Exports'
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="min-h-20 border-b border-white/5 bg-[#051424]/90 backdrop-blur-xl px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Hamburger Menu Toggle Button for Mobile */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-white/10 text-cyan-400 hover:bg-slate-800 transition-colors"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="AL ASR Logo" className="w-16 h-16 object-contain filter drop-shadow-lg" />
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">{titles[currentTab] || 'Dashboard'}</h2>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">{currentDate} • AL ASR Motors Hub</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Global Search Bar */}
        <div className="relative flex-1 sm:w-64 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search seller, buyer, car..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
          />
        </div>

        {/* Quick Action Buttons (Admin Only) */}
        {isAdmin && (
          <>
            {(currentTab === 'all_sellers' || currentTab === 'my_sellers' || currentTab === 'sellers' || currentTab === 'dashboard') && (
              <button
                onClick={() => onOpenModal('seller')}
                className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Seller</span>
              </button>
            )}

            {(currentTab === 'all_buyers' || currentTab === 'my_buyers' || currentTab === 'buyers' || currentTab === 'dashboard') && (
              <button
                onClick={() => onOpenModal('buyer')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-white/10 rounded-xl text-xs transition-all flex items-center space-x-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Add Buyer</span>
              </button>
            )}

            {(currentTab === 'deals' || currentTab === 'dashboard') && (
              <button
                onClick={() => onOpenModal('deal')}
                className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-semibold rounded-xl text-xs transition-all flex items-center space-x-1.5"
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>Close Deal</span>
              </button>
            )}
          </>
        )}

        <button
          onClick={logout}
          className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
