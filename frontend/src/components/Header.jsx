import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Car, 
  UserPlus, 
  Handshake, 
  Menu, 
  LogOut, 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Trash2, 
  DollarSign, 
  Receipt, 
  Calendar, 
  Sparkles, 
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatPKR } from '../utils/priceFormatter';

export default function Header({ currentTab, search, setSearch, onOpenModal, onToggleMobileMenu, onNavigate }) {
  const { user, isAdmin, isAccountsHead, isSuperAdmin, canAccessAccounts, logout } = useAuth();
  const [localSearch, setLocalSearch] = useState(search);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notificationDropdownRef = useRef(null);

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

  // Fetch notifications on mount and set polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // 20s live poll
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err.message);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark read:', err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err.message);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchNotifications();
    } catch (err) {
      console.warn('Failed to delete notification:', err.message);
    }
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const titles = {
    dashboard: 'Executive Overview',
    notifications: 'Inflow & Receipts Notifications Feed',
    all_sellers: 'All Sellers Inventory',
    my_sellers: 'My Sellers Leads',
    commercial_sellers: 'Commercial Vehicle Sellers Inventory',
    all_buyers: 'All Buyers Inquiries',
    my_buyers: 'My Buyers Leads',
    commercial_buyers: 'Commercial Vehicle Buyers Inquiries',
    bank_cases: 'Bank Financing Cases & Cars',
    bank_cases_report: 'Bank Financing & Cases Financial Report',
    receiving_letter: 'Vehicle Receiving Letters',
    attendance: 'Employee Attendance Register',
    sellers: 'Vehicle Inventory & Sellers',
    buyers: 'Buyer Inquiries & Leads',
    deals: 'Completed Transactions & Profit',
    collaboration: '50-50% Commission Collaboration Center',
    stock: 'Showroom Current Stock Floor',
    sold_cars: 'Sold Cars & Buyback Lifecycle Registry',
    salesman_incentives: 'Salesman Incentives & Commissions',
    customer_history: 'Buyer & Seller Trade History Registry',
    accounts: 'Accounts & Finance Hub',
    invoices: 'Invoices & Financial Vouchers',
    approvals: 'Super Admin Approval Requests',
    users: 'Salesmen & Account Management',
    reports: 'Performance Analytics & Exports',
    settings: 'Account Settings'
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
            {(currentTab === 'all_sellers' || currentTab === 'my_sellers' || currentTab === 'commercial_sellers' || currentTab === 'sellers' || currentTab === 'dashboard') && (
              <button
                onClick={() => onOpenModal('seller')}
                className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{currentTab === 'commercial_sellers' ? 'Add Commercial Seller' : 'Add Seller'}</span>
              </button>
            )}

            {(currentTab === 'all_buyers' || currentTab === 'my_buyers' || currentTab === 'commercial_buyers' || currentTab === 'buyers' || currentTab === 'dashboard') && (
              <button
                onClick={() => onOpenModal('buyer')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-white/10 rounded-xl text-xs transition-all flex items-center space-x-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentTab === 'commercial_buyers' ? 'Add Commercial Buyer' : 'Add Buyer'}</span>
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

        {/* NOTIFICATION BELL WITH UNREAD BADGE COUNT */}
        <div className="relative" ref={notificationDropdownRef}>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className={`p-2.5 rounded-xl border transition-all relative ${
              unreadCount > 0 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shadow-glow' 
                : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
            }`}
            title="Inflow & Financial Notifications"
          >
            {unreadCount > 0 ? (
              <BellRing className="w-4 h-4 animate-bounce" />
            ) : (
              <Bell className="w-4 h-4" />
            )}

            {/* Glowing Badge Count */}
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-mono font-bold flex items-center justify-center shadow-lg shadow-rose-500/40 animate-pulse border border-white/20">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION DROPDOWN PANEL */}
          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-modal rounded-2xl shadow-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl z-50 overflow-hidden text-xs">
              {/* Header */}
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">Inflow & Receipt Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                      {unreadCount} New
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center space-x-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 font-mono">
                    <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p>No new financial notifications.</p>
                  </div>
                ) : (
                  notifications.map(notif => {
                    const isUnread = !notif.isRead && (!notif.readBy || !notif.readBy.includes(user?.id));
                    const isSales = notif.type === 'SALES_RECEIPT' || notif.title.includes('Sales');
                    const isBooking = notif.type === 'BOOKING_RECEIPT' || notif.title.includes('Booking');

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkAsRead(notif.id)}
                        className={`p-3.5 hover:bg-white/5 transition-colors cursor-pointer relative group ${
                          isUnread ? 'bg-cyan-500/5' : 'opacity-80'
                        }`}
                      >
                        {/* Unread indicator dot */}
                        {isUnread && (
                          <span className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-glow"></span>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-2.5">
                            <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                              isSales ? 'bg-emerald-500/20 text-emerald-400' :
                              isBooking ? 'bg-cyan-500/20 text-cyan-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              <DollarSign className="w-3.5 h-3.5" />
                            </div>

                            <div>
                              <p className="font-bold text-white text-[12px] leading-snug">{notif.title}</p>
                              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                              <span className="text-[10px] font-mono text-slate-500 mt-1.5 inline-block">
                                {formatTimeAgo(notif.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {isUnread && (
                              <button
                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                className="p-1 text-slate-400 hover:text-emerald-400 rounded bg-slate-800"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDeleteNotification(notif.id, e)}
                              className="p-1 text-slate-400 hover:text-rose-400 rounded bg-slate-800"
                              title="Delete notification"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer - View All */}
              <div className="p-2.5 border-t border-white/10 bg-slate-900/90 text-center">
                <button
                  onClick={() => {
                    setIsNotificationOpen(false);
                    if (onNavigate) onNavigate('notifications');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all border border-cyan-500/20 shadow-sm"
                >
                  <span>Open Full Notifications Center</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
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
