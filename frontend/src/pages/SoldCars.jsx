import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Search, 
  Filter, 
  RotateCcw, 
  Calendar, 
  FileText, 
  DollarSign, 
  User, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Building2, 
  Wallet, 
  Printer, 
  TrendingUp, 
  Layers, 
  Plus, 
  Sparkles, 
  X, 
  ChevronRight,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPKR, parsePakistaniPrice, getPriceHint } from '../utils/priceFormatter';
import { logoBase64 } from '../utils/logoBase64';

export default function SoldCars() {
  const { user, isAdmin, isSuperAdmin, canAccessAccounts } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [soldVehicles, setSoldVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'BUYBACKS' | 'RESOLD'

  // History Drawer State
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Buyback Modal State
  const [isBuybackModalOpen, setIsBuybackModalOpen] = useState(false);
  const [selectedVehicleForBuyback, setSelectedVehicleForBuyback] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [buybackFormData, setBuybackFormData] = useState({
    chassisNumber: '',
    regNumber: '',
    vehicleMaker: '',
    vehicleModel: '',
    year: '',
    color: '',
    sellerName: '',
    sellerPhone: '',
    sellerCnic: '',
    buybackPrice: '',
    askingPrice: '',
    paymentMethod: 'CASH',
    bankAccountId: '',
    mileage: '',
    conditionNotes: '',
    careOf: ''
  });

  useEffect(() => {
    fetchSoldCarsData();
    fetchBankCashAccounts();
  }, [selectedFilter]);

  const fetchSoldCarsData = async () => {
    setLoading(true);
    try {
      const res = await api.getSoldCars({ filter: selectedFilter, search: searchQuery });
      setSoldVehicles(res.soldVehicles || []);
      setStats(res.stats || null);
    } catch (err) {
      console.error('Failed to fetch sold cars:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankCashAccounts = async () => {
    try {
      const res = await api.getBankAndCashAccounts();
      setBankAccounts(res || []);
    } catch (err) {
      console.warn('Bank accounts fetch error:', err.message);
    }
  };

  const handleOpenVehicleHistory = async (vehicle) => {
    const chassis = vehicle.chassisNumber || vehicle.registrationNo || vehicle.vehicleKey;
    setIsHistoryDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const historyData = await api.getVehicleHistory(chassis);
      setSelectedVehicleHistory(historyData);
    } catch (err) {
      alert(err.message || 'Failed to load vehicle history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenBuybackModal = (vehicle) => {
    setSelectedVehicleForBuyback(vehicle);
    setBuybackFormData({
      chassisNumber: vehicle.chassisNumber || '',
      regNumber: vehicle.registrationNo || '',
      vehicleMaker: vehicle.vehicleMaker || '',
      vehicleModel: vehicle.vehicleModel || vehicle.vehicleName || '',
      year: vehicle.vehicleYear || '',
      color: vehicle.color || 'White',
      sellerName: vehicle.latestSale?.customerName || '',
      sellerPhone: vehicle.latestSale?.customerPhone || '',
      sellerCnic: vehicle.latestSale?.customerCnic || '',
      buybackPrice: '',
      askingPrice: '',
      paymentMethod: 'CASH',
      bankAccountId: '',
      mileage: '',
      conditionNotes: '',
      careOf: user?.name || 'AL Asr'
    });
    setIsBuybackModalOpen(true);
  };

  const handleSubmitBuyback = async (e) => {
    e.preventDefault();
    if (!buybackFormData.buybackPrice) {
      alert('Please enter the agreed buyback price.');
      return;
    }

    try {
      await api.recordVehicleBuyback(buybackFormData);
      setIsBuybackModalOpen(false);
      setSelectedVehicleForBuyback(null);
      fetchSoldCarsData();
      alert('Vehicle successfully bought back and added into Showroom Current Stock!');
    } catch (err) {
      alert(err.message || 'Failed to record buyback');
    }
  };

  const handlePrintHistory = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-glow">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>Sold Cars & Vehicle Lifecycle Registry</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-normal">
                  Live
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Every sold car identified from Sales Receipts with complete multi-owner & buyback history.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSoldCarsData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-mono border border-white/10 flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Registry</span>
        </button>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sold Cars */}
        <div className="glass-card rounded-2xl p-4 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyan-400 font-semibold tracking-wider uppercase">Total Cars Sold</span>
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-mono text-white tracking-tight">
              {stats?.totalSoldUnits || 0} <span className="text-xs font-normal text-slate-400">Units</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Unique chassis sold across sales receipts</p>
          </div>
        </div>

        {/* Lifetime Sales Volume */}
        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-400 font-semibold tracking-wider uppercase">Lifetime Sales Volume</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-mono text-emerald-300 tracking-tight">
              {formatPKR(stats?.totalLifetimeSalesVolume || 0)}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Gross sales generated across all cycles</p>
          </div>
        </div>

        {/* Buyback / Repurchased Units */}
        <div className="glass-card rounded-2xl p-4 border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-slate-900 to-slate-950 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-purple-400 font-semibold tracking-wider uppercase">Repurchased / Buybacks</span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-mono text-purple-300 tracking-tight">
              {stats?.buybackUnitsCount || 0} <span className="text-xs font-normal text-slate-400">Cars</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Bought back from previous buyers</p>
          </div>
        </div>

        {/* In Stock Buybacks */}
        <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-amber-400 font-semibold tracking-wider uppercase">In Showroom Stock</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-mono text-amber-300 tracking-tight">
              {stats?.inStockBuybacksCount || 0} <span className="text-xs font-normal text-slate-400">Available</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Returned cars ready for re-sale</p>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Chassis #, Plate #, Customer, Vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchSoldCarsData()}
              className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <button
            onClick={fetchSoldCarsData}
            className="px-3.5 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono border border-white/10"
          >
            Search
          </button>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Sold Cars' },
            { id: 'IN_STOCK', label: 'In Showroom (Buyback)' },
            { id: 'BUYBACKS', label: 'All Multi-Owner / Buybacks' },
            { id: 'RESOLD', label: 'Resold (2+ Cycles)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all whitespace-nowrap ${
                selectedFilter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-white/5 border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SOLD CARS TABLE */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Vehicle Specs / Identification</th>
                <th className="py-3 px-4">Latest Buyer / Customer</th>
                <th className="py-3 px-4">Sale Date & Mode</th>
                <th className="py-3 px-4 text-right">Latest Sale (PKR)</th>
                <th className="py-3 px-4 text-center">Lifecycle Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-mono">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading Sold Cars Registry...</span>
                    </div>
                  </td>
                </tr>
              ) : soldVehicles.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 font-mono">
                    No sold vehicles found matching your criteria.
                  </td>
                </tr>
              ) : (
                soldVehicles.map(vehicle => {
                  const isInStock = vehicle.status === 'BOUGHT_BACK_IN_STOCK';
                  const isResold = vehicle.status === 'RESOLD';

                  return (
                    <tr key={vehicle.vehicleKey} className="hover:bg-white/5 transition-colors">
                      {/* Vehicle Specs */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 rounded-xl bg-slate-800 text-cyan-400 border border-white/5 flex-shrink-0">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">
                              {vehicle.vehicleYear ? `${vehicle.vehicleYear} ` : ''}{vehicle.vehicleName}
                            </p>
                            <div className="flex items-center space-x-2 mt-0.5 text-[10px] font-mono">
                              <span className="text-cyan-400 font-semibold">
                                {vehicle.registrationNo ? `Plate: ${vehicle.registrationNo}` : 'Unregistered'}
                              </span>
                              {vehicle.chassisNumber && (
                                <span className="text-slate-400">
                                  Chassis: {vehicle.chassisNumber}
                                </span>
                              )}
                              {vehicle.color && (
                                <span className="text-slate-400">• {vehicle.color}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3.5 px-4 font-mono">
                        <p className="font-semibold text-white">{vehicle.latestSale?.customerName}</p>
                        <p className="text-[10px] text-slate-400">
                          {vehicle.latestSale?.customerPhone || 'No phone'} 
                          {vehicle.latestSale?.customerCnic ? ` • ${vehicle.latestSale?.customerCnic}` : ''}
                        </p>
                        <p className="text-[9px] text-slate-500">Salesman: {vehicle.latestSale?.salesman}</p>
                      </td>

                      {/* Sale Date & Payment Mode */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <p className="text-white">
                          {new Date(vehicle.latestSale?.date).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {vehicle.latestSale?.paymentMethod} ({vehicle.latestSale?.invoiceNumber})
                        </p>
                      </td>

                      {/* Latest Sale Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span className="text-emerald-400">
                          {formatPKR(vehicle.latestSale?.salePrice)}
                        </span>
                        {vehicle.totalSalesCount > 1 && (
                          <p className="text-[10px] text-purple-400 font-normal">
                            Total: {formatPKR(vehicle.totalLifetimeRevenue)}
                          </p>
                        )}
                      </td>

                      {/* Lifecycle Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            isInStock
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : isResold
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {vehicle.statusLabel}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                            {vehicle.totalSalesCount === 1 ? '1st Owner Sale' : `${vehicle.totalSalesCount} Ownership Cycles`}
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5 flex-wrap gap-y-1">
                          {/* View History */}
                          <button
                            onClick={() => handleOpenVehicleHistory(vehicle)}
                            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-mono transition-all flex items-center space-x-1"
                            title="View Lifecycle History"
                          >
                            <Eye className="w-3 h-3" />
                            <span>History</span>
                          </button>

                          {/* Buyback Action (If not currently in stock) */}
                          {!isInStock && (
                            <button
                              onClick={() => handleOpenBuybackModal(vehicle)}
                              className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-mono transition-all flex items-center space-x-1"
                              title="Buy Back into Showroom Stock"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Buyback</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: BUY BACK VEHICLE INTO SHOWROOM STOCK                               */}
      {/* ========================================================================= */}
      {isBuybackModalOpen && selectedVehicleForBuyback && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-purple-500/30 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Showroom Vehicle Buyback</h3>
              </div>
              <button onClick={() => setIsBuybackModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono mb-4">
              Record purchase from previous buyer and instantly add this car back into <strong className="text-cyan-400">Showroom Current Stock</strong>.
            </p>

            <form onSubmit={handleSubmitBuyback} className="space-y-4">
              {/* Vehicle specs banner */}
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-mono">
                <p className="font-bold text-white">
                  {selectedVehicleForBuyback.vehicleYear} {selectedVehicleForBuyback.vehicleName}
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Chassis: {selectedVehicleForBuyback.chassisNumber || 'N/A'} • Plate: {selectedVehicleForBuyback.registrationNo || 'Unregistered'}
                </p>
              </div>

              {/* Seller / Returnee Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Selling Customer *</label>
                  <input
                    type="text"
                    required
                    value={buybackFormData.sellerName}
                    onChange={(e) => setBuybackFormData({ ...buybackFormData, sellerName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={buybackFormData.sellerPhone}
                    onChange={(e) => setBuybackFormData({ ...buybackFormData, sellerPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Financials: Buyback Price & Asking Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Buyback Purchase Price (PKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 3100000"
                    value={buybackFormData.buybackPrice}
                    onChange={(e) => setBuybackFormData({ ...buybackFormData, buybackPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono font-bold"
                  />
                  {buybackFormData.buybackPrice && (
                    <p className="text-[10px] text-purple-400 font-mono mt-1">{getPriceHint(buybackFormData.buybackPrice)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">New Showroom Asking Price (PKR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 3400000"
                    value={buybackFormData.askingPrice}
                    onChange={(e) => setBuybackFormData({ ...buybackFormData, askingPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
                  />
                  {buybackFormData.askingPrice && (
                    <p className="text-[10px] text-cyan-400 font-mono mt-1">{getPriceHint(buybackFormData.askingPrice)}</p>
                  )}
                </div>
              </div>

              {/* Payment Mode & Bank selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={buybackFormData.paymentMethod}
                    onChange={(e) => setBuybackFormData({ ...buybackFormData, paymentMethod: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value="CASH">Cash in Hand Safe</option>
                    <option value="BANK">Corporate Bank Account</option>
                  </select>
                </div>

                {buybackFormData.paymentMethod === 'BANK' ? (
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Paid From Bank Account *</label>
                    <select
                      required
                      value={buybackFormData.bankAccountId}
                      onChange={(e) => setBuybackFormData({ ...buybackFormData, bankAccountId: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="">-- Select Bank Account --</option>
                      {bankAccounts.filter(a => a.subType === 'BANK').map(bank => (
                        <option key={bank.id} value={bank.id}>
                          {bank.bankName || bank.name} (Rs. {bank.currentBalance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Current Mileage (km)</label>
                    <input
                      type="number"
                      placeholder="e.g. 45000"
                      value={buybackFormData.mileage}
                      onChange={(e) => setBuybackFormData({ ...buybackFormData, mileage: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Condition Notes */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Return Condition / Inspection Notes</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Returned after 8 months usage, minor scratch on front bumper, original keys and smart card intact."
                  value={buybackFormData.conditionNotes}
                  onChange={(e) => setBuybackFormData({ ...buybackFormData, conditionNotes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsBuybackModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold font-mono text-xs rounded-xl shadow-lg shadow-purple-500/20"
                >
                  Confirm Buyback & Add to Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER / MODAL: COMPLETE VEHICLE LIFECYCLE & MULTI-OWNER HISTORY          */}
      {/* ========================================================================= */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-4xl border border-white/10 shadow-2xl my-8 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">
                      {selectedVehicleHistory?.vehicleName || 'Vehicle Lifecycle Timeline'}
                    </h3>
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-mono">
                      Chassis: {selectedVehicleHistory?.chassisNumber || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Complete multi-owner sales, buyback milestones, and realized dealership profitability.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintHistory}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print History</span>
                </button>
                <button onClick={() => setIsHistoryDrawerOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="overflow-y-auto flex-1 mt-4 space-y-6 pr-1">
              {historyLoading ? (
                <div className="py-16 text-center text-slate-400 font-mono">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading vehicle lifecycle timeline...</span>
                  </div>
                </div>
              ) : !selectedVehicleHistory ? (
                <div className="py-12 text-center text-slate-500 font-mono">
                  No records found for this vehicle.
                </div>
              ) : (
                <>
                  {/* Financial Summary Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Total Sales Cycles</span>
                      <p className="text-xl font-bold font-mono text-white mt-1">
                        {selectedVehicleHistory.financialSummary?.totalCycles || 0} Times Sold
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase">Cumulative Sales Revenue</span>
                      <p className="text-xl font-bold font-mono text-emerald-300 mt-1">
                        {formatPKR(selectedVehicleHistory.financialSummary?.totalSalesRevenue || 0)}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10">
                      <span className="text-[10px] font-mono text-purple-400 uppercase">Showroom Repurchases</span>
                      <p className="text-xl font-bold font-mono text-purple-300 mt-1">
                        {selectedVehicleHistory.financialSummary?.receivingLettersCount || (selectedVehicleHistory.isBuybackDetected ? 1 : 0)} Buybacks
                      </p>
                    </div>
                  </div>

                  {/* Visual Step-by-Step Chronological Timeline */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Chronological Ownership & Lifecycle Milestones</span>
                    </h4>

                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-purple-500 before:to-emerald-500">
                      {selectedVehicleHistory.timelineEvents?.map((event, index) => {
                        const isSale = event.type === 'SALE';
                        const isReceiving = event.type === 'BUYBACK_RECEIVING';

                        return (
                          <div key={event.id || index} className="relative group">
                            {/* Dot */}
                            <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                              isSale ? 'bg-cyan-400 shadow-glow' : 'bg-purple-400 shadow-glow'
                            }`}></div>

                            {/* Card */}
                            <div className={`p-4 rounded-2xl border transition-all ${
                              isSale 
                                ? 'bg-gradient-to-br from-cyan-950/20 via-slate-900 to-slate-950 border-cyan-500/20' 
                                : 'bg-gradient-to-br from-purple-950/20 via-slate-900 to-slate-950 border-purple-500/20'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    isSale ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  }`}>
                                    {isSale ? 'SALES RECEIPT' : 'BUYBACK / RETURN'}
                                  </span>
                                  <h5 className="font-bold text-white text-sm">{event.eventTitle}</h5>
                                </div>
                                <span className="text-[11px] font-mono text-slate-400">
                                  {new Date(event.date).toLocaleString()}
                                </span>
                              </div>

                              {isSale && (
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
                                  <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                                    <span className="text-[10px] text-slate-500">Customer:</span>
                                    <p className="font-semibold text-white truncate">{event.customerName}</p>
                                    <p className="text-[10px] text-slate-400">{event.customerPhone || 'No Phone'}</p>
                                  </div>

                                  <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                                    <span className="text-[10px] text-slate-500">Sale Price:</span>
                                    <p className="font-bold text-emerald-400">{formatPKR(event.salePrice)}</p>
                                    <p className="text-[10px] text-slate-400">Mode: {event.paymentMethod}</p>
                                  </div>

                                  <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                                    <span className="text-[10px] text-slate-500">Invoice Ref:</span>
                                    <p className="font-semibold text-cyan-400">{event.invoiceNumber}</p>
                                    <p className="text-[10px] text-slate-400">Status: {event.deliveryStatus}</p>
                                  </div>

                                  <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                                    <span className="text-[10px] text-slate-500">Sales Officer:</span>
                                    <p className="font-semibold text-white truncate">{event.salesman}</p>
                                  </div>
                                </div>
                              )}

                              {isReceiving && (
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                                  <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                                    <span className="text-[10px] text-slate-500">Received From:</span>
                                    <p className="font-semibold text-white">{event.ownerName}</p>
                                    <p className="text-[10px] text-slate-400">Receiver: {event.receiverName}</p>
                                  </div>

                                  <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                                    <span className="text-[10px] text-slate-500">Return Details:</span>
                                    <p className="font-semibold text-purple-300">Mileage: {event.mileage}</p>
                                    <p className="text-[10px] text-slate-400">Demand: {event.demandAmount}</p>
                                  </div>

                                  <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                                    <span className="text-[10px] text-slate-500">Documents & Keys:</span>
                                    <p className="text-[11px] text-white">Files: {event.fileStatus || 'N/A'}</p>
                                    <p className="text-[10px] text-slate-400">Keys: {event.keyStatus || 'N/A'}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
