import React, { useState, useEffect } from 'react';
import { DollarSign, Package, Calendar, AlertTriangle, TrendingUp, CreditCard, ShieldAlert, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function AccountsDashboard({ setCurrentTab }) {
  const [metrics, setMetrics] = useState({
    todaysSale: 0,
    totalStockValuation: 0,
    pendingInstallments: 0,
    currentReservations: 0,
    totalVaultBalance: 0,
    defaultersCount: 0
  });
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountsDashboard();
  }, []);

  const fetchAccountsDashboard = async () => {
    setLoading(true);
    try {
      const [vaultRes, defaultersRes, stockRes, dealsRes] = await Promise.all([
        api.getVaultSummary().catch(() => null),
        api.getDefaulterAlerts().catch(() => []),
        api.getSellers().catch(() => []),
        api.getDeals().catch(() => [])
      ]);

      const todayStr = new Date().toISOString().slice(0, 10);
      const todaysSale = (dealsRes || []).filter(d => d.closingDate?.slice(0, 10) === todayStr).reduce((sum, d) => sum + d.dealPrice, 0);

      const availableStock = (stockRes || []).filter(s => s.leadStatus !== 'Deal Closed');
      const totalStockValuation = availableStock.reduce((sum, s) => sum + (s.demandPrice || 0), 0);
      const currentReservations = availableStock.filter(s => s.stockStatus === 'Reserved').length;

      const pendingInstallments = (defaultersRes || []).reduce((sum, d) => sum + d.amount, 0);

      setMetrics({
        todaysSale,
        totalStockValuation,
        pendingInstallments,
        currentReservations,
        totalVaultBalance: vaultRes?.balance || 0,
        defaultersCount: (defaultersRes || []).length
      });
      setDefaulters(defaultersRes || []);
    } catch (err) {
      console.error('Failed to fetch accounts dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-purple-500/20">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🏦 Accounts Department Dashboard
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-mono">FINANCIAL CONTROL</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time financial summary: Today's sales, stock valuation, pending installments, and defaulter alerts.
          </p>
        </div>
        <button
          onClick={fetchAccountsDashboard}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Financials</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Today's Sales */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">Today's Sales (PKR)</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                Rs. {metrics.todaysSale.toLocaleString()}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-3">Recorded vehicle sales issued today</p>
        </div>

        {/* Total Stock Valuation */}
        <div className="glass-card rounded-2xl p-5 border border-cyan-500/30 bg-cyan-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-cyan-400">Total Stock Valuation</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                Rs. {metrics.totalStockValuation.toLocaleString()}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-3">Valuation of active available showroom inventory</p>
        </div>

        {/* Central Vault Balance */}
        <div className="glass-card rounded-2xl p-5 border border-purple-500/30 bg-purple-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-purple-300">Central Company Vault</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                Rs. {metrics.totalVaultBalance.toLocaleString()}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-3">One Main Account central liquid cash balance</p>
        </div>

        {/* Pending Installments Overdue */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-amber-400">Pending Installment Amount</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                Rs. {metrics.pendingInstallments.toLocaleString()}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-3">{metrics.defaultersCount} overdue installment alert(s)</p>
        </div>

        {/* Current Vehicle Reservations */}
        <div className="glass-card rounded-2xl p-5 border border-sky-500/30 bg-sky-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-sky-400">Reserved Vehicles</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {metrics.currentReservations} Units
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-3">Vehicles currently booked / on token reservation</p>
        </div>

        {/* Defaulter Alerts Counter */}
        <div className="glass-card rounded-2xl p-5 border border-rose-500/30 bg-rose-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-rose-400">Defaulter Notifications</p>
              <h3 className="text-2xl font-extrabold text-rose-400 mt-1">
                {metrics.defaultersCount} Alert(s)
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-3">Overdue installment payment reminders</p>
        </div>
      </div>

      {/* Quick Navigation Shortcuts & Defaulter Alert Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">⚡ Accounts Operational Shortcuts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setCurrentTab && setCurrentTab('invoices')}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 rounded-xl text-left transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-white group-hover:text-cyan-400">Issue Sale Receipt / Voucher</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Delivery Letter, PV, Sales Receipt</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-cyan-400" />
            </button>

            <button
              onClick={() => setCurrentTab && setCurrentTab('installment_management')}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-amber-500/30 rounded-xl text-left transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-white group-hover:text-amber-400">Installments & Defaulters</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Collect payment & send reminders</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </button>

            <button
              onClick={() => setCurrentTab && setCurrentTab('central_vault')}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-purple-500/30 rounded-xl text-left transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-white group-hover:text-purple-300">Central Company Vault</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">One Main Account cash transactions</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-purple-400" />
            </button>

            <button
              onClick={() => setCurrentTab && setCurrentTab('financial_statements')}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 rounded-xl text-left transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-white group-hover:text-emerald-400">Financial Statements</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Balance Sheet & Income Statement PDF</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Defaulter Alert Panel */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Overdue Installment Reminders ({defaulters.length})
              </h3>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar">
              {defaulters.map((d, idx) => (
                <div key={d.id || idx} className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">{d.plan?.customer?.customerName || 'Customer'} — <span className="font-mono text-rose-300">Installment #{d.installmentNo}</span></p>
                    <p className="text-[10px] text-slate-400 font-mono">{d.plan?.vehicleDetails} • Due: {new Date(d.dueDate).toLocaleDateString()}</p>
                  </div>
                  <span className="font-mono font-bold text-rose-400 bg-rose-500/20 px-2 py-1 rounded">
                    Rs. {d.amount?.toLocaleString()}
                  </span>
                </div>
              ))}

              {defaulters.length === 0 && !loading && (
                <div className="text-center py-8 text-slate-500 font-mono text-xs">
                  ✨ No overdue installment defaulters at present.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
