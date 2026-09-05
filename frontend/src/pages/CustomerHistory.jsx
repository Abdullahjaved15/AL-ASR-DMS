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
  Clock
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

  // Track which customer card is expanded
  const [expandedKeys, setExpandedKeys] = useState({});

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
                Trade & Customer History <span className="text-sm font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">کسٹمر و گاڑیوں کی ہسٹری</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Complete historical record of all cars bought by buyers and all cars sold by sellers at AL-ASR Showroom
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
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Unique Buyers (خریدار)</span>
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{stats.totalUniqueBuyers || buyers.length}</p>
          <p className="text-[10px] text-slate-500">Customers who purchased vehicles</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Unique Sellers (فروخت کنندگان)</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">{stats.totalUniqueSellers || sellers.length}</p>
          <p className="text-[10px] text-slate-500">Owners who sold cars to/through showroom</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Vehicle Trades Recorded</span>
            <Car className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 font-mono">{stats.totalPurchasesRecorded || 0} Deals</p>
          <p className="text-[10px] text-slate-500">Lifetime showroom transactions</p>
        </div>
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="glass-card p-4 rounded-xl border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
          {/* Main Mode Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('BUYERS')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'BUYERS'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>🛒 Buyer Purchase History (خریداروں کی ہسٹری)</span>
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

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'BUYERS' ? 'Buyer' : 'Seller'} Name, Phone, CNIC, Vehicle...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center justify-between">
          <span>
            {activeTab === 'BUYERS' 
              ? 'Showing all buyers and the cars they bought from AL-ASR Dealership'
              : 'Showing all sellers and the cars they sold to or through AL-ASR Dealership'}
          </span>
          <span className="font-mono text-cyan-400 font-bold">
            {activeTab === 'BUYERS' ? buyers.length : sellers.length} records found
          </span>
        </div>
      </div>

      {/* CONTENT: BUYERS TAB */}
      {activeTab === 'BUYERS' && (
        <div className="space-y-4">
          {loading ? (
            <div className="glass-card p-12 text-center text-slate-400 text-xs font-mono rounded-xl border border-white/5">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading Buyer History...
            </div>
          ) : buyers.length === 0 ? (
            <div className="glass-card p-12 text-center text-slate-400 text-xs rounded-xl border border-white/5">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="font-bold text-slate-300">No Buyer purchase history found</p>
              <p className="text-[11px] text-slate-500 mt-1">Issue a Sales Receipt to a buyer to record their history.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {buyers.map((b, idx) => {
                const isExpanded = Boolean(expandedKeys[b.customerKey || idx]);
                return (
                  <div
                    key={idx}
                    className="glass-card rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all overflow-hidden shadow-lg"
                  >
                    {/* Buyer Summary Row */}
                    <div
                      onClick={() => toggleExpand(b.customerKey || idx)}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-lg shadow-inner">
                          {b.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{b.name}</h3>
                            {b.fatherName && <span className="text-xs text-slate-400">s/o {b.fatherName}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                            {b.phone && (
                              <span className="flex items-center gap-1 font-mono text-slate-300">
                                <Phone className="w-3 h-3 text-cyan-400" />
                                {b.phone}
                              </span>
                            )}
                            {b.cnic && (
                              <span className="flex items-center gap-1 font-mono text-slate-400">
                                <CreditCard className="w-3 h-3 text-slate-500" />
                                {b.cnic}
                              </span>
                            )}
                            {b.address && (
                              <span className="flex items-center gap-1 text-slate-400 truncate max-w-xs">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {b.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Stats & Expand Chevron */}
                      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Cars Purchased</span>
                          <span className="text-base font-bold text-cyan-400 font-mono">
                            {b.totalVehiclesBought} {b.totalVehiclesBought === 1 ? 'Vehicle' : 'Vehicles'}
                          </span>
                        </div>

                        {b.bookingHistory && b.bookingHistory.length > 0 && (
                          <div className="text-left md:text-right">
                            <span className="text-[10px] text-slate-400 block font-medium">Bookings Made</span>
                            <span className="text-base font-bold text-amber-400 font-mono">
                              {b.bookingHistory.length} {b.bookingHistory.length === 1 ? 'Booking' : 'Bookings'}
                            </span>
                          </div>
                        )}

                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Total Spent</span>
                          <span className="text-base font-bold text-emerald-400 font-mono">
                            PKR {(b.totalSpent / 100000).toFixed(2)} Lac
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

                    {/* Expandable Details Container */}
                    {isExpanded && (
                      <div className="border-t border-white/10 bg-slate-950/60 p-5 space-y-6 animate-in fade-in duration-200">
                        {/* Section 1: Purchased Vehicles */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                            <Car className="w-3.5 h-3.5" />
                            <span>Vehicles Bought by {b.name} from AL-ASR Dealership ({b.purchasedVehicles.length})</span>
                          </h4>

                          {b.purchasedVehicles.length === 0 ? (
                            <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-slate-500 text-xs italic">
                              No completed vehicle purchases yet. Check booking history below.
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-white/10">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-white/10">
                                  <tr>
                                    <th className="p-3">Receipt # & Date</th>
                                    <th className="p-3">Vehicle Details</th>
                                    <th className="p-3">Reg # & Chassis</th>
                                    <th className="p-3">Seller / Source</th>
                                    <th className="p-3">Salesman</th>
                                    <th className="p-3">Payment & Delivery</th>
                                    <th className="p-3 text-right">Purchase Price</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-300">
                                  {b.purchasedVehicles.map((car, cIdx) => (
                                    <tr key={cIdx} className="hover:bg-white/[0.02]">
                                      <td className="p-3 font-mono">
                                        <div className="text-white font-bold">{car.invoiceNumber}</div>
                                        <div className="text-[10px] text-slate-400">
                                          {new Date(car.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </div>
                                        {car.linkedBookingNumber && (
                                          <div className="mt-1">
                                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                              🔗 Booking: {car.linkedBookingNumber} (Adv: PKR {car.advanceAmount ? car.advanceAmount.toLocaleString() : '0'})
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        <div className="text-white font-bold">{car.vehicleMaker} {car.vehicleModel}</div>
                                        <div className="text-[10px] text-slate-400">{car.carYear || ''} {car.color ? `• ${car.color}` : ''}</div>
                                      </td>
                                      <td className="p-3 font-mono">
                                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                                          {car.registrationNo || 'UNREGISTERED'}
                                        </span>
                                        {car.chassisNumber && (
                                          <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[130px]">
                                            Ch: {car.chassisNumber}
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        <div className="font-semibold text-slate-200">{car.sellerName}</div>
                                        {car.isCustomerVehicle ? (
                                          <span className="text-[10px] text-amber-300 font-mono">Customer Consignment</span>
                                        ) : (
                                          <span className="text-[10px] text-blue-300 font-mono">Showroom Inventory</span>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        <span className="text-slate-300 font-medium">{car.salesmanName || 'Showroom Staff'}</span>
                                      </td>
                                      <td className="p-3">
                                        <div className="text-slate-300 font-mono font-bold">{car.paymentMethod}</div>
                                        <div className="text-[10px] text-emerald-400 font-bold">{car.deliveryStatus}</div>
                                      </td>
                                      <td className="p-3 text-right font-mono font-bold text-emerald-400 text-sm">
                                        PKR {car.price ? car.price.toLocaleString() : '0'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Section 2: Booking & Advance Receipts History */}
                        {b.bookingHistory && b.bookingHistory.length > 0 && (
                          <div className="space-y-3 pt-3 border-t border-white/5">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Booking & Advance History (بکنگ اور ایڈوانس ہسٹری) ({b.bookingHistory.length})</span>
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
                                    <th className="p-3 text-right">Lifecycle Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-300">
                                  {b.bookingHistory.map((bk, bIdx) => (
                                    <tr key={bIdx} className="hover:bg-white/[0.02]">
                                      <td className="p-3 font-mono">
                                        <div className="text-white font-bold flex items-center gap-1.5">
                                          <span>{bk.bookingNumber}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          {new Date(bk.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
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
                                        {bk.chassisNumber && (
                                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                                            Ch: {bk.chassisNumber}
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        <span className="text-slate-300">{bk.salesmanName || 'Showroom Staff'}</span>
                                      </td>
                                      <td className="p-3 font-mono font-bold text-amber-400">
                                        PKR {bk.advanceAmount ? bk.advanceAmount.toLocaleString() : '0'}
                                      </td>
                                      <td className="p-3 font-mono text-slate-300">
                                        PKR {bk.totalPrice ? bk.totalPrice.toLocaleString() : '0'}
                                      </td>
                                      <td className="p-3 text-right font-mono">
                                        {bk.bookingStatus === 'CANCELLED' ? (
                                          <div className="flex flex-col items-end gap-0.5">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                              <span>❌ Cancelled & Refunded</span>
                                            </span>
                                            {bk.linkedVoucherNumber && (
                                              <span className="text-[10px] text-amber-400 font-bold">
                                                Refund Voucher: #{bk.linkedVoucherNumber}
                                              </span>
                                            )}
                                            {bk.cancellationReason && (
                                              <span className="text-[9px] text-slate-400 max-w-[140px] truncate text-right">
                                                {bk.cancellationReason}
                                              </span>
                                            )}
                                          </div>
                                        ) : (bk.bookingStatus === 'CONVERTED_TO_SALE' || bk.linkedSaleNumber) ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>Sold (#{bk.linkedSaleNumber || 'Finalized'})</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
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
              Loading Seller History...
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
                    key={idx}
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
    </div>
  );
}
