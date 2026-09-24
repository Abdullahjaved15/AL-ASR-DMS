import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Car, 
  UserCheck, 
  ShoppingBag, 
  Phone, 
  CreditCard, 
  MapPin, 
  Calendar, 
  DollarSign, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Layers, 
  RefreshCw,
  Clock,
  Printer,
  Wallet,
  Receipt,
  AlertTriangle,
  X,
  ShieldCheck,
  TrendingUp,
  Landmark
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPKR, parsePakistaniPrice } from '../utils/priceFormatter';

export default function CustomerHistory({ onNavigate }) {
  const { isSuperAdmin, canAccessAccounts } = useAuth();
  const [activeTab, setActiveTab] = useState('BUYERS'); // 'BUYERS' or 'SELLERS'
  const [buyers, setBuyers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [stats, setStats] = useState({ totalUniqueBuyers: 0, totalUniqueSellers: 0, totalPurchasesRecorded: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [recoveryFilter, setRecoveryFilter] = useState('ALL'); // 'ALL', 'PENDING_RECOVERY', 'FULLY_CLEARED'

  // Track expanded cards and their active inner sub-tabs
  const [expandedKeys, setExpandedKeys] = useState({});
  const [customerSubTabs, setCustomerSubTabs] = useState({}); // { [customerKey]: 'MONEY_TRAIL' | 'VEHICLES' | 'BOOKINGS' }

  // Printable Statement Modal State
  const [printCustomer, setPrintCustomer] = useState(null);

  useEffect(() => {
    fetchCustomerHistory();
  }, [search]);

  const fetchCustomerHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomerTradeHistory({ search, type: activeTab });
      if (res) {
        setBuyers(res.buyers || []);
        setSellers(res.sellers || []);
        setStats(res.stats || {});
      }
    } catch (err) {
      console.error('Failed to fetch customer history:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (key) => {
    setExpandedKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    // Default sub tab to MONEY_TRAIL if not set
    if (!customerSubTabs[key]) {
      setCustomerSubTabs(prev => ({
        ...prev,
        [key]: 'MONEY_TRAIL'
      }));
    }
  };

  const setSubTab = (key, tab) => {
    setCustomerSubTabs(prev => ({
      ...prev,
      [key]: tab
    }));
  };

  // Filter buyers based on recovery filter pill
  const filteredBuyers = buyers.filter(b => {
    if (recoveryFilter === 'PENDING_RECOVERY') {
      return (b.totalPendingBalance || 0) > 0 || (b.activeRecoveryCasesCount || 0) > 0;
    }
    if (recoveryFilter === 'FULLY_CLEARED') {
      return (b.totalPendingBalance || 0) === 0 && (b.totalVehiclesBought || 0) > 0;
    }
    return true;
  });

  // Calculate overall financial overview
  const totalLifetimeBuyerVolume = buyers.reduce((sum, b) => sum + (b.totalSpent || 0), 0);
  const totalLifetimePaid = buyers.reduce((sum, b) => sum + (b.totalPaidToDate || 0), 0);
  const totalLifetimePending = buyers.reduce((sum, b) => sum + (b.totalPendingBalance || 0), 0);
  const totalActiveRecoveryCases = buyers.reduce((sum, b) => sum + (b.activeRecoveryCasesCount || 0), 0);

  const handlePrintStatement = (customer) => {
    setPrintCustomer(customer);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400 border border-cyan-500/30">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Customer & Trade History <span className="text-sm font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">کسٹمر مالیاتی ٹریل و لیجر</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Complete chronological money trail, booking advances, sales receipts, and all-time recovery payments linked by customer phone & CNIC
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCustomerHistory}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Unique Buyers (خریدار)</span>
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{stats.totalUniqueBuyers || buyers.length}</p>
          <p className="text-[10px] text-slate-500">Tracked by verified phone numbers</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Money Collected to Date</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            PKR {(totalLifetimePaid / 100000).toFixed(2)} Lac
          </p>
          <p className="text-[10px] text-slate-500">Booking token + Downpayment + Recoveries</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Pending Recovery Balance</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 font-mono">
            PKR {(totalLifetimePending / 100000).toFixed(2)} Lac
          </p>
          <p className="text-[10px] text-slate-500">
            Across {totalActiveRecoveryCases} active recovery {totalActiveRecoveryCases === 1 ? 'deal' : 'deals'}
          </p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Unique Sellers (فروخت کنندگان)</span>
            <UserCheck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 font-mono">{stats.totalUniqueSellers || sellers.length}</p>
          <p className="text-[10px] text-slate-500">Showroom inventory & consignments</p>
        </div>
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="glass-card p-4 rounded-xl border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
          {/* Main Mode Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('BUYERS')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'BUYERS'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>🛒 Buyer Payment Trails (خریداروں کا لیجر)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/30 text-cyan-200">
                {buyers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('SELLERS')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SELLERS'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>🚗 Seller Trade History (فروخت کنندگان کی ہسٹری)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/30 text-emerald-200">
                {sellers.length}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Phone Number, CNIC, Name, Vehicle, Receipt #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Sub-Filters for Buyers */}
        {activeTab === 'BUYERS' && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium text-[11px]">Filter Customers:</span>
              <button
                onClick={() => setRecoveryFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  recoveryFilter === 'ALL'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-900/40 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                All Buyers ({buyers.length})
              </button>

              <button
                onClick={() => setRecoveryFilter('PENDING_RECOVERY')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  recoveryFilter === 'PENDING_RECOVERY'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-900/40 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Pending Recovery ({buyers.filter(b => (b.totalPendingBalance || 0) > 0).length})</span>
              </button>

              <button
                onClick={() => setRecoveryFilter('FULLY_CLEARED')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  recoveryFilter === 'FULLY_CLEARED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900/40 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Fully Cleared / Zero Balance</span>
              </button>
            </div>

            <span className="font-mono text-cyan-400 font-bold text-xs">
              Showing {filteredBuyers.length} matching buyer records
            </span>
          </div>
        )}
      </div>

      {/* CONTENT: BUYERS TAB */}
      {activeTab === 'BUYERS' && (
        <div className="space-y-4">
          {loading ? (
            <div className="glass-card p-12 text-center text-slate-400 text-xs font-mono rounded-xl border border-white/5">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading Buyer Financial History & Trail...
            </div>
          ) : filteredBuyers.length === 0 ? (
            <div className="glass-card p-12 text-center text-slate-400 text-xs rounded-xl border border-white/5">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="font-bold text-slate-300">No Buyer purchase records found matching your filter</p>
              <p className="text-[11px] text-slate-500 mt-1">Issue a Booking or Sales Receipt to start tracking customer money trails.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBuyers.map((b, idx) => {
                const isExpanded = Boolean(expandedKeys[b.customerKey || idx]);
                const currentSubTab = customerSubTabs[b.customerKey || idx] || 'MONEY_TRAIL';
                const hasPending = (b.totalPendingBalance || 0) > 0;

                return (
                  <div
                    key={b.customerKey || idx}
                    className={`glass-card rounded-2xl border transition-all overflow-hidden shadow-lg ${
                      hasPending 
                        ? 'border-rose-500/30 hover:border-rose-500/50 bg-rose-950/5' 
                        : 'border-white/10 hover:border-cyan-500/30'
                    }`}
                  >
                    {/* Buyer Summary Card Header */}
                    <div
                      onClick={() => toggleExpand(b.customerKey || idx)}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-lg shadow-inner ${
                          hasPending
                            ? 'bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border-rose-500/40 text-rose-300'
                            : 'bg-gradient-to-tr from-cyan-500/20 to-blue-500/30 border-cyan-500/40 text-cyan-300'
                        }`}>
                          {b.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-white">{b.name}</h3>
                            {b.fatherName && <span className="text-xs text-slate-400">s/o {b.fatherName}</span>}
                            {hasPending ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Pending Recovery: PKR {b.totalPendingBalance.toLocaleString()}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Account Cleared</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1.5">
                            {b.phone ? (
                              <span className="flex items-center gap-1.5 font-mono text-cyan-300 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                <Phone className="w-3 h-3 text-cyan-400" />
                                {b.phone}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">No phone recorded</span>
                            )}

                            {b.cnic && (
                              <span className="flex items-center gap-1.5 font-mono text-slate-300 bg-slate-900/60 px-2 py-0.5 rounded border border-white/5">
                                <CreditCard className="w-3 h-3 text-slate-400" />
                                {b.cnic}
                              </span>
                            )}

                            {b.address && (
                              <span className="flex items-center gap-1.5 text-slate-400 truncate max-w-xs">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {b.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right KPI Summary & Statement Print Button */}
                      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-5 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5">
                        <div className="text-left lg:text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Lifetime Business</span>
                          <span className="text-sm font-bold text-white font-mono">
                            PKR {(b.totalSpent / 100000).toFixed(2)} Lac
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {b.totalVehiclesBought} {b.totalVehiclesBought === 1 ? 'Car' : 'Cars'} Bought
                          </span>
                        </div>

                        <div className="text-left lg:text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Total Paid to Date</span>
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            PKR {(b.totalPaidToDate / 100000).toFixed(2)} Lac
                          </span>
                          <span className="text-[10px] text-emerald-400/70 block">
                            {b.moneyTrail.length} payment events
                          </span>
                        </div>

                        {hasPending && (
                          <div className="text-left lg:text-right">
                            <span className="text-[10px] text-rose-400 block font-medium">Pending Balance</span>
                            <span className="text-sm font-bold text-rose-400 font-mono">
                              PKR {b.totalPendingBalance.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-rose-400/80 block">
                              {b.activeRecoveryCasesCount} pending recovery
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintStatement(b);
                            }}
                            title="Print Customer Payment Ledger & Statement"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer transition-all"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Statement</span>
                          </button>

                          <button
                            type="button"
                            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-white/10"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Inner Container with Multi-View Tabs */}
                    {isExpanded && (
                      <div className="border-t border-white/10 bg-slate-950/80 p-5 space-y-5 animate-in fade-in duration-200">
                        {/* Sub Navigation Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSubTab(b.customerKey || idx, 'MONEY_TRAIL')}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                currentSubTab === 'MONEY_TRAIL'
                                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5'
                              }`}
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>💰 All-Time Money Trail ({b.moneyTrail.length})</span>
                            </button>

                            <button
                              onClick={() => setSubTab(b.customerKey || idx, 'VEHICLES')}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                currentSubTab === 'VEHICLES'
                                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5'
                              }`}
                            >
                              <Car className="w-3.5 h-3.5" />
                              <span>🚗 Purchased Vehicles & Recovery Breakdown ({b.purchasedVehicles.length})</span>
                            </button>

                            {b.bookingHistory && b.bookingHistory.length > 0 && (
                              <button
                                onClick={() => setSubTab(b.customerKey || idx, 'BOOKINGS')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                  currentSubTab === 'BOOKINGS'
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>📋 Bookings ({b.bookingHistory.length})</span>
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => handlePrintStatement(b)}
                            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Full Customer Ledger</span>
                          </button>
                        </div>

                        {/* SUB-TAB 1: ALL-TIME CHRONOLOGICAL MONEY TRAIL */}
                        {currentSubTab === 'MONEY_TRAIL' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                                <Wallet className="w-3.5 h-3.5" />
                                <span>Complete Money Inflow & Trail Timeline (ہر رقم کی تاریخی تفصیل)</span>
                              </h4>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Total Paid: <strong className="text-emerald-400">PKR {b.totalPaidToDate ? b.totalPaidToDate.toLocaleString() : '0'}</strong>
                              </span>
                            </div>

                            {b.moneyTrail.length === 0 ? (
                              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-slate-500 text-xs italic">
                                No payment inflows recorded yet for this customer.
                              </div>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-white/10">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-white/10">
                                    <tr>
                                      <th className="p-3">Payment Date</th>
                                      <th className="p-3">Transaction Type</th>
                                      <th className="p-3">Receipt / Voucher #</th>
                                      <th className="p-3">Vehicle Reference</th>
                                      <th className="p-3">Payment Mode & Account</th>
                                      <th className="p-3">Handled / Received By</th>
                                      <th className="p-3 text-right">Inflow Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
                                    {b.moneyTrail.map((m, mIdx) => {
                                      const isRecovery = m.type === 'RECOVERY_PAYMENT';
                                      const isBooking = m.type === 'BOOKING_ADVANCE';
                                      const isSale = m.type === 'SALES_DOWNPAYMENT';
                                      const isRefund = m.type === 'REFUND_VOUCHER';
                                      const isTradeIn = m.type === 'TRADE_IN_EXCHANGE';

                                      return (
                                        <tr key={mIdx} className="hover:bg-white/[0.02]">
                                          <td className="p-3">
                                            <div className="text-white font-bold">
                                              {new Date(m.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                              {new Date(m.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                          </td>

                                          <td className="p-3">
                                            {isRecovery && (
                                              <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 w-fit">
                                                <TrendingUp className="w-3 h-3" />
                                                <span>Recovery Installment</span>
                                              </span>
                                            )}
                                            {isSale && (
                                              <span className="px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 w-fit">
                                                <Receipt className="w-3 h-3" />
                                                <span>Sales Downpayment</span>
                                              </span>
                                            )}
                                            {isBooking && (
                                              <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 w-fit">
                                                <Clock className="w-3 h-3" />
                                                <span>Booking Advance (بیعانہ)</span>
                                              </span>
                                            )}
                                            {isTradeIn && (
                                              <span className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 w-fit">
                                                <Car className="w-3 h-3" />
                                                <span>Trade-In Exchange</span>
                                              </span>
                                            )}
                                            {isRefund && (
                                              <span className="px-2 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 w-fit">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span>Refund Outflow</span>
                                              </span>
                                            )}
                                          </td>

                                          <td className="p-3">
                                            <div className="text-white font-bold">{m.receiptNumber}</div>
                                            {m.notes && (
                                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={m.notes}>
                                                {m.notes}
                                              </div>
                                            )}
                                          </td>

                                          <td className="p-3 font-sans">
                                            <div className="text-white font-bold">{m.vehicle || 'N/A'}</div>
                                            <div className="text-[10px] font-mono text-slate-400">
                                              {m.registrationNo ? `Reg: ${m.registrationNo}` : ''}
                                              {m.chassisNumber ? ` • Ch: ${m.chassisNumber}` : ''}
                                            </div>
                                          </td>

                                          <td className="p-3">
                                            <div className="flex items-center gap-1.5">
                                              {m.paymentMethod === 'BANK' ? (
                                                <Landmark className="w-3 h-3 text-cyan-400" />
                                              ) : (
                                                <Wallet className="w-3 h-3 text-emerald-400" />
                                              )}
                                              <span className="text-white font-bold">{m.paymentMethod}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-sans">
                                              {m.accountName || (m.paymentMethod === 'BANK' ? 'Bank Account' : 'Showroom Safe Cash')}
                                            </div>
                                          </td>

                                          <td className="p-3 font-sans">
                                            <span className="text-slate-300 font-medium">{m.salesmanName || 'Staff'}</span>
                                          </td>

                                          <td className={`p-3 text-right text-sm font-bold ${
                                            isRefund ? 'text-rose-400' : 'text-emerald-400'
                                          }`}>
                                            {isRefund ? '-' : '+'} PKR {Math.abs(m.amount).toLocaleString()}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {/* SUB-TAB 2: PURCHASED VEHICLES & RECOVERY BREAKDOWN */}
                        {currentSubTab === 'VEHICLES' && (
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                              <Car className="w-3.5 h-3.5" />
                              <span>Purchased Cars & Recovery Balance Tracking ({b.purchasedVehicles.length})</span>
                            </h4>

                            {b.purchasedVehicles.length === 0 ? (
                              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-slate-500 text-xs italic">
                                No vehicle purchases recorded yet. Check booking history.
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {b.purchasedVehicles.map((car, cIdx) => {
                                  const isCarPending = (car.remainingAmount || 0) > 0;
                                  return (
                                    <div
                                      key={cIdx}
                                      className="rounded-xl border border-white/10 bg-slate-900/70 p-4 space-y-4 shadow-sm"
                                    >
                                      {/* Car Header & Financial Overview */}
                                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h5 className="text-sm font-bold text-white">
                                              {car.vehicleMaker} {car.vehicleModel} ({car.carYear || 'N/A'})
                                            </h5>
                                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono text-[11px] font-bold">
                                              {car.registrationNo || 'UNREGISTERED'}
                                            </span>
                                            {isCarPending ? (
                                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span>Recovery Pending: PKR {car.remainingAmount.toLocaleString()}</span>
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>Fully Recovered & Settled</span>
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                                            <span>Receipt: <strong>#{car.invoiceNumber}</strong></span>
                                            <span>Date: {new Date(car.date).toLocaleDateString()}</span>
                                            {car.chassisNumber && <span>Chassis: {car.chassisNumber}</span>}
                                            {car.color && <span>Color: {car.color}</span>}
                                          </div>
                                        </div>

                                        {/* Financial Chips */}
                                        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                                          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/5 text-right">
                                            <span className="text-[10px] text-slate-500 block">Agreed Price</span>
                                            <span className="text-white font-bold">PKR {car.price ? car.price.toLocaleString() : '0'}</span>
                                          </div>
                                          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/5 text-right">
                                            <span className="text-[10px] text-slate-500 block">Advance Inflow</span>
                                            <span className="text-cyan-400 font-bold">PKR {car.advanceAmount ? car.advanceAmount.toLocaleString() : '0'}</span>
                                          </div>
                                          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/5 text-right">
                                            <span className="text-[10px] text-slate-500 block">Recovered Paid</span>
                                            <span className="text-emerald-400 font-bold">PKR {car.recoveredAmount ? car.recoveredAmount.toLocaleString() : '0'}</span>
                                          </div>
                                          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/5 text-right">
                                            <span className="text-[10px] text-slate-500 block">Remaining</span>
                                            <span className={`font-bold ${isCarPending ? 'text-rose-400' : 'text-slate-400'}`}>
                                              PKR {car.remainingAmount ? car.remainingAmount.toLocaleString() : '0'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Recovery Payments Table for this specific Car */}
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Incremental Recovery Payments Made on this Vehicle ({car.recoveryPayments ? car.recoveryPayments.length : 0})</span>
                                          </span>
                                          {car.recoveryPromiseDate && isCarPending && (
                                            <span className="text-amber-400 font-mono text-[11px] font-bold">
                                              Promised Clearance Date: {car.recoveryPromiseDate}
                                            </span>
                                          )}
                                        </div>

                                        {!car.recoveryPayments || car.recoveryPayments.length === 0 ? (
                                          <div className="p-3 rounded-lg bg-slate-950/60 border border-white/5 text-slate-500 text-xs italic">
                                            {isCarPending
                                              ? 'No recovery installments paid yet. Remaining balance is pending collection.'
                                              : 'Full amount was paid at the time of sale receipt issuance.'}
                                          </div>
                                        ) : (
                                          <div className="overflow-x-auto rounded-lg border border-white/5">
                                            <table className="w-full text-left text-xs font-mono">
                                              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-white/5">
                                                <tr>
                                                  <th className="p-2.5">Date</th>
                                                  <th className="p-2.5">Receipt #</th>
                                                  <th className="p-2.5">Payment Method & Account</th>
                                                  <th className="p-2.5">Received From</th>
                                                  <th className="p-2.5">Notes</th>
                                                  <th className="p-2.5 text-right">Recovered Amount</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-white/5 text-slate-300">
                                                {car.recoveryPayments.map((rp, rpIdx) => (
                                                  <tr key={rpIdx} className="hover:bg-white/[0.02]">
                                                    <td className="p-2.5 text-white">
                                                      {new Date(rp.paymentDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-2.5 font-bold text-cyan-300">
                                                      {rp.receiptNumber || 'RCV-N/A'}
                                                    </td>
                                                    <td className="p-2.5">
                                                      <span className="text-white font-bold">{rp.paymentMethod}</span>
                                                      <span className="text-slate-400 block text-[10px]">{rp.accountName}</span>
                                                    </td>
                                                    <td className="p-2.5 font-sans text-slate-300">
                                                      {rp.receivedFrom || b.name}
                                                    </td>
                                                    <td className="p-2.5 font-sans text-slate-400 text-[11px]">
                                                      {rp.notes || 'Recovery installment'}
                                                    </td>
                                                    <td className="p-2.5 text-right font-bold text-emerald-400 text-sm">
                                                      + PKR {rp.amount ? rp.amount.toLocaleString() : '0'}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* SUB-TAB 3: BOOKINGS HISTORY */}
                        {currentSubTab === 'BOOKINGS' && b.bookingHistory && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Booking & Token Advance History ({b.bookingHistory.length})</span>
                            </h4>

                            <div className="overflow-x-auto rounded-xl border border-white/10">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-white/10">
                                  <tr>
                                    <th className="p-3">Booking # & Date</th>
                                    <th className="p-3">Vehicle Booked</th>
                                    <th className="p-3">Reg # / Chassis</th>
                                    <th className="p-3">Salesman</th>
                                    <th className="p-3">Advance Paid (پیشگی رقم)</th>
                                    <th className="p-3">Total Agreed Price</th>
                                    <th className="p-3 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-300">
                                  {b.bookingHistory.map((bk, bIdx) => (
                                    <tr key={bIdx} className="hover:bg-white/[0.02]">
                                      <td className="p-3 font-mono">
                                        <div className="text-white font-bold">{bk.bookingNumber}</div>
                                        <div className="text-[10px] text-slate-400">
                                          {new Date(bk.date).toLocaleDateString()}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <div className="text-white font-bold">{bk.vehicleMaker} {bk.vehicleModel}</div>
                                        <div className="text-[10px] text-slate-400">{bk.carYear || ''}</div>
                                      </td>
                                      <td className="p-3 font-mono">
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-white/10">
                                          {bk.registrationNo || 'UNREGISTERED'}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        <span className="text-slate-300">{bk.salesmanName || 'Staff'}</span>
                                      </td>
                                      <td className="p-3 font-mono font-bold text-amber-400">
                                        PKR {bk.advanceAmount ? bk.advanceAmount.toLocaleString() : '0'}
                                      </td>
                                      <td className="p-3 font-mono text-slate-300">
                                        PKR {bk.totalPrice ? bk.totalPrice.toLocaleString() : '0'}
                                      </td>
                                      <td className="p-3 text-right font-mono">
                                        {bk.bookingStatus === 'CANCELLED' ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                            ❌ Cancelled & Refunded
                                          </span>
                                        ) : (bk.bookingStatus === 'CONVERTED_TO_SALE' || bk.linkedSaleNumber) ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>Sold (#{bk.linkedSaleNumber || 'Finalized'})</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                                            <Clock className="w-3 h-3" />
                                            <span>Active Booking</span>
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENT: SELLERS TAB */}
      {activeTab === 'SELLERS' && (
        <div className="space-y-4">
          {loading ? (
            <div className="glass-card p-12 text-center text-slate-400 text-xs font-mono rounded-xl border border-white/5">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading Seller Trade History...
            </div>
          ) : sellers.length === 0 ? (
            <div className="glass-card p-12 text-center text-slate-400 text-xs rounded-xl border border-white/5">
              <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="font-bold text-slate-300">No Seller trade history found</p>
              <p className="text-[11px] text-slate-500 mt-1">Issue a Sales Receipt with seller info to record seller history.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sellers.map((s, idx) => {
                const isExpanded = Boolean(expandedKeys[s.customerKey || idx]);
                return (
                  <div
                    key={s.customerKey || idx}
                    className="glass-card rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all overflow-hidden shadow-lg"
                  >
                    {/* Seller Summary Row */}
                    <div
                      onClick={() => toggleExpand(s.customerKey || idx)}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-lg shadow-inner">
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{s.name}</h3>
                            {s.fatherName && <span className="text-xs text-slate-400">s/o {s.fatherName}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                            {s.phone && (
                              <span className="flex items-center gap-1 font-mono text-slate-300">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                {s.phone}
                              </span>
                            )}
                            {s.cnic && (
                              <span className="flex items-center gap-1 font-mono text-slate-400">
                                <CreditCard className="w-3 h-3 text-slate-500" />
                                {s.cnic}
                              </span>
                            )}
                            {s.address && (
                              <span className="flex items-center gap-1 text-slate-400 truncate max-w-xs">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {s.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Stats & Expand Chevron */}
                      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Cars Sold at Showroom</span>
                          <span className="text-base font-bold text-emerald-400 font-mono">
                            {s.totalVehiclesSold} {s.totalVehiclesSold === 1 ? 'Vehicle' : 'Vehicles'}
                          </span>
                        </div>

                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Total Trade Volume</span>
                          <span className="text-base font-bold text-white font-mono">
                            PKR {(s.totalVolume / 100000).toFixed(2)} Lac
                          </span>
                        </div>

                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Consignment vs Direct</span>
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            {s.consignmentCount} Consign / {s.directShowroomCount} Direct
                          </span>
                        </div>

                        <button
                          type="button"
                          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-white/10"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Sold Vehicles Table */}
                    {isExpanded && (
                      <div className="border-t border-white/10 bg-slate-950/60 p-5 space-y-3 animate-in fade-in duration-200">
                        <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                          <Car className="w-3.5 h-3.5" />
                          <span>Vehicles Sold by {s.name} at AL-ASR Dealership ({s.soldVehicles.length})</span>
                        </h4>

                        <div className="overflow-x-auto rounded-xl border border-white/10">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-white/10">
                              <tr>
                                <th className="p-3">Receipt # & Date</th>
                                <th className="p-3">Vehicle Details</th>
                                <th className="p-3">Reg # & Chassis</th>
                                <th className="p-3">Sale Type / Mode</th>
                                <th className="p-3">Buyer (خریدار)</th>
                                <th className="p-3">Salesman</th>
                                <th className="p-3 text-right">Sold Amount</th>
                                <th className="p-3 text-right">Commission</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                              {s.soldVehicles.map((car, cIdx) => (
                                <tr key={cIdx} className="hover:bg-white/[0.02]">
                                  <td className="p-3 font-mono">
                                    <div className="text-white font-bold">{car.invoiceNumber}</div>
                                    <div className="text-[10px] text-slate-400">
                                      {new Date(car.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="text-white font-bold">{car.vehicleMaker} {car.vehicleModel}</div>
                                    <div className="text-[10px] text-slate-400">{car.carYear || ''} {car.color ? `• ${car.color}` : ''}</div>
                                  </td>
                                  <td className="p-3 font-mono">
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                                      {car.registrationNo || 'UNREGISTERED'}
                                    </span>
                                    {car.chassisNumber && (
                                      <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[130px]">
                                        Ch: {car.chassisNumber}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {car.isCustomerVehicle ? (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                        🚗 Customer-Owned (Consignment)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                                        🏢 Showroom Direct
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="font-semibold text-slate-200">{car.buyerName}</div>
                                    {car.buyerPhone && <div className="text-[10px] font-mono text-slate-400">{car.buyerPhone}</div>}
                                  </td>
                                  <td className="p-3">
                                    <span className="text-slate-300 font-medium">{car.salesmanName || 'Showroom Staff'}</span>
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-white text-sm">
                                    PKR {car.price ? car.price.toLocaleString() : '0'}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                    {car.commissionAmount > 0 ? `PKR ${car.commissionAmount.toLocaleString()}` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PRINTABLE STATEMENT MODAL (کسٹمر لیجر پرنٹ) */}
      {printCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 relative max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none print:max-h-none">
            {/* Modal Actions (Hidden in Print) */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-600" />
                <h3 className="text-lg font-bold text-slate-800">Customer Account Statement / Financial Trail</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Statement</span>
                </button>
                <button
                  onClick={() => setPrintCustomer(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Printable Statement Header */}
            <div className="border-b pb-4 text-center space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">AL-ASR MOTORS & DEALERSHIP</h2>
              <p className="text-xs text-slate-500 font-medium">Main Showroom, G.T. Road • Phone: +92-300-1234567 • Customer Account Statement</p>
              <div className="inline-block px-3 py-1 rounded bg-slate-100 border text-xs font-bold text-slate-700 uppercase tracking-widest mt-2">
                Customer Financial Ledger & Payment Trail
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Customer Name:</span>
                <span className="text-sm font-bold text-slate-900">{printCustomer.name}</span>
                {printCustomer.fatherName && <span className="text-[11px] text-slate-500 block">s/o {printCustomer.fatherName}</span>}
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Contact Phone:</span>
                <span className="font-mono font-bold text-slate-900">{printCustomer.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">CNIC #:</span>
                <span className="font-mono text-slate-900">{printCustomer.cnic || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Account Status:</span>
                <span className={`font-bold ${
                  (printCustomer.totalPendingBalance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {(printCustomer.totalPendingBalance || 0) > 0 
                    ? `Pending PKR ${printCustomer.totalPendingBalance.toLocaleString()}` 
                    : 'CLEARED (Zero Balance)'}
                </span>
              </div>
            </div>

            {/* Financial Totals Summary Bar */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs p-3 rounded-xl bg-slate-100 font-mono">
              <div>
                <span className="text-slate-500 block">Total Lifetime Business:</span>
                <strong className="text-slate-900 text-sm">PKR {printCustomer.totalSpent ? printCustomer.totalSpent.toLocaleString() : '0'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Total Paid to Date:</span>
                <strong className="text-emerald-700 text-sm">PKR {printCustomer.totalPaidToDate ? printCustomer.totalPaidToDate.toLocaleString() : '0'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Remaining Pending Balance:</span>
                <strong className="text-rose-600 text-sm">PKR {printCustomer.totalPendingBalance ? printCustomer.totalPendingBalance.toLocaleString() : '0'}</strong>
              </div>
            </div>

            {/* Complete Chronological Transactions Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Chronological Money Inflow & Payment Trail
              </h4>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Receipt #</th>
                    <th className="p-2.5">Vehicle</th>
                    <th className="p-2.5">Mode / Account</th>
                    <th className="p-2.5 text-right">Inflow Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-mono text-[11px]">
                  {printCustomer.moneyTrail.map((m, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        {new Date(m.date).toLocaleDateString()}
                      </td>
                      <td className="p-2.5 font-bold">
                        {m.typeLabel || m.type}
                      </td>
                      <td className="p-2.5">
                        {m.receiptNumber}
                      </td>
                      <td className="p-2.5 font-sans">
                        {m.vehicle}
                        {m.registrationNo ? ` (${m.registrationNo})` : ''}
                      </td>
                      <td className="p-2.5">
                        {m.paymentMethod} {m.accountName ? `• ${m.accountName}` : ''}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        PKR {Math.abs(m.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature & Verification Footer */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold">Customer Signature</p>
                <p className="text-[10px] text-slate-400">Accepted & Verified</p>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold">Authorized Showroom Signature & Stamp</p>
                <p className="text-[10px] text-slate-400">AL-ASR Motors & Management</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
