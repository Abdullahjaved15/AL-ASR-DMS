import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Trash2, 
  DollarSign, 
  Receipt, 
  Search, 
  Filter, 
  RefreshCw, 
  Landmark, 
  Wallet, 
  ArrowUpRight, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatPKR } from '../utils/priceFormatter';

export default function Notifications({ onNavigate }) {
  const { user, isAccountsHead, isSuperAdmin, canAccessAccounts } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, UNREAD, SALES, BOOKING

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15s poll
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
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

  const handleDeleteNotification = async (id) => {
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
    return `${diffDays}d ago (${date.toLocaleDateString()})`;
  };

  // Filtered Notifications
  const filteredNotifications = notifications.filter(n => {
    // Search query filter
    const q = search.toLowerCase();
    const matchesSearch = !search || 
      n.title?.toLowerCase().includes(q) || 
      n.message?.toLowerCase().includes(q) ||
      n.referenceId?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Category filter
    if (activeFilter === 'UNREAD') {
      return !n.isRead && (!n.readBy || !n.readBy.includes(user?.id));
    }
    if (activeFilter === 'SALES') {
      return n.type === 'SALES_RECEIPT' || n.title?.includes('Sales');
    }
    if (activeFilter === 'BOOKING') {
      return n.type === 'BOOKING_RECEIPT' || n.title?.includes('Booking');
    }
    return true;
  });

  // Calculation Metrics
  const totalInflowNotifs = notifications.length;
  const salesCount = notifications.filter(n => n.type === 'SALES_RECEIPT' || n.title?.includes('Sales')).length;
  const bookingCount = notifications.filter(n => n.type === 'BOOKING_RECEIPT' || n.title?.includes('Booking')).length;
  const totalInflowAmount = notifications.reduce((sum, n) => sum + (Number(n.amount) || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-[#0a2342]/90 to-slate-900/90 p-6 rounded-2xl border border-cyan-500/20 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                Financial Inflow Notifications
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-xs font-bold border border-rose-500/30 animate-pulse">
                    {unreadCount} Unread
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Real-Time Inflow Alerts for Accounts Head & Super Admin • Auto-posts on Receipts
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          )}

          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-all flex items-center space-x-1.5"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Alerts */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 bg-slate-900/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Alerts</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">{totalInflowNotifs}</p>
          <p className="text-[11px] text-slate-400 mt-1">Receipts & Inflow Events</p>
        </div>

        {/* Card 2: Unread Alerts */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 bg-slate-900/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Unread Pending</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 font-mono ${unreadCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {unreadCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Requiring Review</p>
        </div>

        {/* Card 3: Sales Receipts Inflows */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 bg-slate-900/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Sales Inflows</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">{salesCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Vehicle Sales Receipts</p>
        </div>

        {/* Card 4: Booking Receipts Inflows */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 bg-slate-900/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Booking Inflows</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-400 mt-2 font-mono">{bookingCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Advance Booking Deposits</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-white/10">
        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'ALL'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Alerts ({notifications.length})
          </button>

          <button
            onClick={() => setActiveFilter('UNREAD')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeFilter === 'UNREAD'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-900/60 text-amber-200 text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('SALES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'SALES'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Sales Receipts ({salesCount})
          </button>

          <button
            onClick={() => setActiveFilter('BOOKING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'BOOKING'
                ? 'bg-blue-500 text-black shadow-lg shadow-blue-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Booking Receipts ({bookingCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search receipt, chassis, buyer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* Notifications Cards Feed */}
      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <div className="py-20 text-center text-slate-400 font-mono">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p>Loading notification feed...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 text-center glass-card rounded-2xl border border-white/10 bg-slate-900/40">
            <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto mb-3" />
            <p className="text-white font-bold text-base">All Caught Up!</p>
            <p className="text-xs text-slate-400 font-mono mt-1">No notifications match your current filter.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isUnread = !notif.isRead && (!notif.readBy || !notif.readBy.includes(user?.id));
            const isSales = notif.type === 'SALES_RECEIPT' || notif.title?.includes('Sales');
            const isBooking = notif.type === 'BOOKING_RECEIPT' || notif.title?.includes('Booking');

            return (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative group ${
                  isUnread
                    ? 'bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-500/5 hover:border-cyan-400'
                    : 'bg-slate-950/60 border-white/5 hover:border-white/15 opacity-85 hover:opacity-100'
                }`}
              >
                {/* Left Indicator bar for unread */}
                {isUnread && (
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-r-full shadow-glow"></div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start space-x-3.5 flex-1">
                    {/* Icon Badge */}
                    <div className={`p-3 rounded-xl flex-shrink-0 mt-0.5 ${
                      isSales
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isBooking
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      <DollarSign className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                          {notif.title}
                        </span>

                        {isUnread ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                            NEW INFLOW
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px]">
                            READ
                          </span>
                        )}

                        {notif.referenceId && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 font-mono text-[10px] border border-cyan-500/20">
                            Ref: {notif.referenceId}
                          </span>
                        )}
                      </div>

                      {/* Main Detailed Message */}
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                        {notif.message}
                      </p>

                      {/* Footer Metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatTimeAgo(notif.createdAt)}</span>
                        </span>

                        {notif.amount && (
                          <span className="text-emerald-400 font-bold">
                            Amount: {formatPKR(notif.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Read</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notif.id);
                      }}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
