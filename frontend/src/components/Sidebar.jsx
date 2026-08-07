import React from 'react';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Handshake, 
  BarChart3, 
  UserCheck, 
  LogOut,
  Shield,
  Briefcase,
  Package,
  Receipt,
  Crown,
  Building2,
  FileCheck,
  Settings as SettingsIcon,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentTab, setCurrentTab, isMobileOpen, setIsMobileOpen }) {
  const { user, logout, isSuperAdmin, isAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'ALL' },
    { id: 'all_sellers', label: 'All Sellers Inventory', icon: Car, role: 'ALL' },
    { id: 'my_sellers', label: 'My Sellers Leads', icon: UserCheck, role: 'ALL' },
    { id: 'all_buyers', label: 'All Buyers Inquiries', icon: Users, role: 'ALL' },
    { id: 'my_buyers', label: 'My Buyers Leads', icon: Briefcase, role: 'ALL' },
    { id: 'bank_cases', label: 'Bank Cases & Cars', icon: Building2, role: 'ALL' },
    { id: 'receiving_letter', label: 'Receiving Letter', icon: FileCheck, role: 'ALL' },
    { id: 'deals', label: 'Closed Deals', icon: Handshake, role: 'ALL' },
    { id: 'collaboration', label: 'Collaboration Center', icon: Handshake, role: 'ALL' },
    { id: 'stock', label: 'Showroom Current Stock', icon: Package, role: 'ADMIN' },
    { id: 'invoices', label: 'Invoices & Vouchers', icon: Receipt, role: 'SUPER_ADMIN' },
    { id: 'users', label: 'User & Salesmen', icon: UserCheck, role: 'ADMIN' },
    { id: 'reports', label: 'Sales Reports', icon: BarChart3, role: 'ADMIN' },
    { id: 'settings', label: 'Account Settings', icon: SettingsIcon, role: 'ALL' },
  ];

  const visibleItems = navItems.filter(item => 
    item.role === 'ALL' || 
    (item.role === 'ADMIN' && isAdmin) || 
    (item.role === 'SUPER_ADMIN' && isSuperAdmin)
  );

  const handleNavClick = (id) => {
    setCurrentTab(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#051424]/95 border-r border-white/10 flex flex-col justify-between backdrop-blur-2xl z-50 transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 rounded-2xl bg-transparent flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="AL ASR MOTORS" className="w-full h-full object-contain filter drop-shadow-lg" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                AL ASR <span className="text-cyan-400 text-xs font-mono font-normal">MOTORS</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">Dealership Management</p>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Card */}
        <div className="px-3 py-3 border-b border-white/5 flex-shrink-0">
          <div className="glass-card rounded-xl p-2.5 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-xs">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <div className="flex items-center space-x-1 mt-0.5">
                {isSuperAdmin ? (
                  <span className="inline-flex items-center text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                    <Crown className="w-2.5 h-2.5 mr-1" /> SUPER ADMIN
                  </span>
                ) : isAdmin ? (
                  <span className="inline-flex items-center text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    <Shield className="w-2.5 h-2.5 mr-1" /> ADMIN
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    <Briefcase className="w-2.5 h-2.5 mr-1" /> SALESMAN
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items - Scrollable internal container */}
        <nav className="px-3 py-2 space-y-1 overflow-y-auto flex-1 min-h-0">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-cyan-400 rounded-r-full shadow-glow"></span>
                )}
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Footer - Always Pinned at Bottom */}
        <div className="p-3 border-t border-white/5 flex-shrink-0 bg-[#051424]">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all text-xs font-bold shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
