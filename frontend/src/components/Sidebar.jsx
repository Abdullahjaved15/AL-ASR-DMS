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
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentTab, setCurrentTab, isMobileOpen, setIsMobileOpen }) {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'ALL' },
    { id: 'sellers', label: 'Sellers & Inventory', icon: Car, role: 'ALL' },
    { id: 'buyers', label: 'Buyers Inquiries', icon: Users, role: 'ALL' },
    { id: 'deals', label: 'Closed Deals', icon: Handshake, role: 'ALL' },
    { id: 'users', label: 'User & Salesmen', icon: UserCheck, role: 'ADMIN' },
    { id: 'reports', label: 'Sales Reports', icon: BarChart3, role: 'ADMIN' },
  ];

  const visibleItems = navItems.filter(item => item.role === 'ALL' || (item.role === 'ADMIN' && isAdmin));

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
        <div>
          {/* Brand Logo Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
                <Car className="w-6 h-6 text-black font-bold" />
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
          <div className="px-4 py-4 border-b border-white/5">
            <div className="glass-card rounded-xl p-3 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-sm">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <div className="flex items-center space-x-1 mt-0.5">
                  {isAdmin ? (
                    <span className="inline-flex items-center text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                      <Shield className="w-2.5 h-2.5 mr-1" /> ADMIN
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      <Briefcase className="w-2.5 h-2.5 mr-1" /> SALESMAN
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-cyan-400 rounded-r-full shadow-glow"></span>
                  )}
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout Footer */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
