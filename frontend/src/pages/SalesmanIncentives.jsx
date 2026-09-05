import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Search, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Car, 
  User, 
  ChevronRight, 
  CheckCircle2, 
  FileText, 
  Eye, 
  Filter, 
  Layers, 
  Sparkles,
  Phone,
  ShieldCheck,
  RefreshCw,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPKR, parsePakistaniPrice, formatPKRShort } from '../utils/priceFormatter';

export default function SalesmanIncentives({ onNavigate }) {
  const { isSuperAdmin, isAccountsHead } = useAuth();
  const [salesmen, setSalesmen] = useState([]);
  const [overallStats, setOverallStats] = useState({
    totalSalesmenCount: 0,
    totalVehiclesSold: 0,
    totalSalesVolume: 0,
    totalCommissionEarned: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSalesmanFilter, setSelectedSalesmanFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Selected salesman for drill-down modal
  const [selectedSalesmanDetails, setSelectedSalesmanDetails] = useState(null);

  useEffect(() => {
    fetchSalesmanIncentives();
  }, [search, selectedSalesmanFilter, startDate, endDate]);

  const fetchSalesmanIncentives = async () => {
    setLoading(true);
    try {
      const res = await api.getSalesmanIncentives({
        search,
        salesman: selectedSalesmanFilter !== 'ALL' ? selectedSalesmanFilter : '',
        startDate,
        endDate
      });
      if (res) {
        setSalesmen(res.salesmen || []);
        setOverallStats(res.overallStats || {});
        // If drilldown modal is open, refresh its data
        if (selectedSalesmanDetails) {
          const updated = (res.salesmen || []).find(s => s.salesmanName === selectedSalesmanDetails.salesmanName);
          if (updated) setSelectedSalesmanDetails(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch salesman incentives:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Salesman Incentives & Performance <span className="text-sm font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">سیلز مین مراعات</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Track sold vehicles, gross dealership sales volume, and earned incentives per salesman
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSalesmanIncentives}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Sales Executives</span>
            <User className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{overallStats.totalSalesmenCount || salesmen.length}</p>
          <p className="text-[10px] text-slate-500">Salesmen with closed sales receipts</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Sold Vehicles</span>
            <Car className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">{overallStats.totalVehiclesSold || 0} Cars</p>
          <p className="text-[10px] text-slate-500">Total finalized sales receipts</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Sales Volume</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400 font-mono">
            PKR {((overallStats.totalSalesVolume || 0) / 100000).toFixed(2)} Lac
          </p>
          <p className="text-[10px] text-slate-500">Gross deal amounts closed</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Commission Earned</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 font-mono">
            PKR {((overallStats.totalCommissionEarned || 0) / 1000).toFixed(1)} K
          </p>
          <p className="text-[10px] text-slate-500">Showroom / consignment commission</p>
        </div>
      </div>

      {/* Filter Rail & Search */}
      <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Salesman Name, Car Model, Reg #, Buyer, Seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-slate-400 text-[11px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-slate-400 text-[11px]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none"
            />
          </div>

          {(startDate || endDate || search) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); }}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Salesmen Performance Cards Grid */}
      {loading ? (
        <div className="glass-card p-12 text-center text-slate-400 text-xs font-mono rounded-xl border border-white/5">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading Salesman Performance & Incentives...
        </div>
      ) : salesmen.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400 text-xs rounded-xl border border-white/5">
          <Award className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="font-bold text-slate-300">No Salesman records found</p>
          <p className="text-[11px] text-slate-500 mt-1">
            When creating Sales Receipts, attribute them to a Salesman to see performance statistics here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {salesmen.map((s, idx) => (
            <div
              key={idx}
              className="glass-card rounded-2xl border border-white/10 hover:border-amber-500/40 transition-all p-5 space-y-4 relative overflow-hidden group shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/30 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-lg shadow-inner">
                    {s.salesmanName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                      {s.salesmanName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                        {s.role}
                      </span>
                      {s.email && <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{s.email}</span>}
                    </div>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  <span>{s.totalVehiclesSold} Sold</span>
                </span>
              </div>

              {/* Volume & Commission Breakdown */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/60 rounded-xl border border-white/5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Sales Volume</span>
                  <span className="font-mono font-bold text-white text-sm">
                    PKR {(s.totalSalesVolume / 100000).toFixed(2)} Lac
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Total Commission</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    PKR {s.totalCommissionEarned.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Vehicle Types Breakdown Badges */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Showroom Cars: <strong className="text-slate-200">{s.showroomSalesCount}</strong></span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Consignment: <strong className="text-slate-200">{s.consignmentSalesCount}</strong></span>
                </span>
              </div>

              {/* Drill-down Button */}
              <button
                type="button"
                onClick={() => setSelectedSalesmanDetails(s)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500/20 via-slate-800 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-500/20 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Eye className="w-4 h-4" />
                <span>View All Sold Cars ({s.soldVehicles.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* DRILL-DOWN MODAL: ALL CARS SOLD BY SELECTED SALESMAN */}
      {selectedSalesmanDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b192c] border border-amber-500/40 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-base shadow-inner">
                  {selectedSalesmanDetails.salesmanName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{selectedSalesmanDetails.salesmanName}</span>
                    <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {selectedSalesmanDetails.totalVehiclesSold} Total Cars Sold
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Showing complete vehicle sales history and earned commission details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSalesmanDetails(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Summary Banner */}
            <div className="p-4 bg-slate-950/80 border-b border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-medium">Total Vehicles Sold</span>
                <span className="font-mono font-bold text-white text-base mt-0.5 block">{selectedSalesmanDetails.totalVehiclesSold}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-medium">Total Sales Volume</span>
                <span className="font-mono font-bold text-cyan-400 text-base mt-0.5 block">
                  PKR {(selectedSalesmanDetails.totalSalesVolume / 100000).toFixed(2)} Lac
                </span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-medium">Total Commission</span>
                <span className="font-mono font-bold text-emerald-400 text-base mt-0.5 block">
                  PKR {selectedSalesmanDetails.totalCommissionEarned.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-medium">Consignment Sales</span>
                <span className="font-mono font-bold text-amber-400 text-base mt-0.5 block">{selectedSalesmanDetails.consignmentSalesCount} Cars</span>
              </div>
            </div>

            {/* Sold Cars Table */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Date & Receipt #</th>
                      <th className="p-3.5">Vehicle Details</th>
                      <th className="p-3.5">Registration & Chassis</th>
                      <th className="p-3.5">Type & Mode</th>
                      <th className="p-3.5">Buyer</th>
                      <th className="p-3.5">Seller</th>
                      <th className="p-3.5 text-right">Deal Price</th>
                      <th className="p-3.5 text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {selectedSalesmanDetails.soldVehicles.map((v, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 font-mono">
                          <div className="text-white font-bold">{v.invoiceNumber}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(v.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="text-white font-bold">{v.vehicleMaker} {v.vehicleModel}</div>
                          <div className="text-[10px] text-slate-400">{v.carYear || ''} {v.color ? `• ${v.color}` : ''}</div>
                        </td>

                        <td className="p-3.5 font-mono">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                            {v.registrationNo || 'UNREGISTERED'}
                          </span>
                          {v.chassisNumber && (
                            <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[130px]">
                              Ch: {v.chassisNumber}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5">
                          {v.isCustomerVehicle ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                              🚗 Customer-Owned (Consignment)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                              🏢 Showroom Stock
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">{v.buyerName || 'N/A'}</div>
                          {v.buyerPhone && <div className="text-[10px] font-mono text-slate-400">{v.buyerPhone}</div>}
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">{v.sellerName || 'N/A'}</div>
                          {v.sellerPhone && <div className="text-[10px] font-mono text-slate-400">{v.sellerPhone}</div>}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-white">
                          PKR {v.price ? v.price.toLocaleString() : '0'}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                          {v.commissionAmount > 0 ? `PKR ${v.commissionAmount.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900/80 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSalesmanDetails(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
