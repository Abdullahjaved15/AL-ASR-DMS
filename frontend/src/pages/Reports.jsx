import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Download, Calendar, Filter, Award, TrendingUp, 
  Clock, Printer, Building2, Search, CheckCircle2, AlertCircle, 
  DollarSign, Car, User, ShieldCheck, Wallet, ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { logoBase64 } from '../utils/logoBase64';
import { formatPKR, parsePakistaniPrice } from '../utils/priceFormatter';

const dateRanges = ['Today', 'Yesterday', 'This Week', 'This Month', 'All Time', 'Custom'];
const bankCaseStatuses = [
  { id: 'ALL', label: 'All Statuses' },
  { id: 'Confirmed', label: 'Confirmed Cases' },
  { id: 'Not Confirmed', label: 'Not Confirmed Cases' },
  { id: 'In Progress', label: 'In Progress' },
  { id: 'Disbursed', label: 'Disbursed' },
  { id: 'Rejected', label: 'Rejected' }
];

export default function Reports({ defaultTab = 'salesmen' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Common date filters
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Salesmen Report states
  const [reportData, setReportData] = useState([]);
  const [loadingSalesmen, setLoadingSalesmen] = useState(true);

  // Bank Cases Report states
  const [bankCasesData, setBankCasesData] = useState({
    stats: {
      totalCases: 0,
      confirmedCount: 0,
      notConfirmedCount: 0,
      inProgressCount: 0,
      totalBudget: 0,
      totalDownpayment: 0,
      totalProcessingFees: 0,
      totalDueAmount: 0
    },
    bankSummary: [],
    availableBanks: [],
    cases: []
  });
  const [bankStatusFilter, setBankStatusFilter] = useState('ALL');
  const [selectedBank, setSelectedBank] = useState('ALL');
  const [bankSearch, setBankSearch] = useState('');
  const [loadingBankCases, setLoadingBankCases] = useState(false);

  useEffect(() => {
    if (activeTab === 'salesmen') {
      fetchSalesmenReports();
    } else {
      fetchBankCasesReports();
    }
  }, [activeTab, selectedRange, startDate, endDate, bankStatusFilter, selectedBank, bankSearch]);

  const fetchSalesmenReports = async () => {
    setLoadingSalesmen(true);
    try {
      const data = await api.getSalesmenReports({
        range: selectedRange,
        startDate,
        endDate
      });
      setReportData(data.reports || []);
    } catch (err) {
      console.error('Failed to fetch salesmen reports:', err);
    } finally {
      setLoadingSalesmen(false);
    }
  };

  const fetchBankCasesReports = async () => {
    setLoadingBankCases(true);
    try {
      const data = await api.getBankCasesReport({
        range: selectedRange,
        startDate,
        endDate,
        status: bankStatusFilter,
        bankName: selectedBank,
        search: bankSearch
      });
      if (data) {
        setBankCasesData(data);
      }
    } catch (err) {
      console.error('Failed to fetch bank cases report:', err);
    } finally {
      setLoadingBankCases(false);
    }
  };

  // Salesmen Export
  const handleExportCSV = () => {
    const url = api.getExportCSVUrl({
      range: selectedRange,
      startDate,
      endDate
    });
    window.open(url, '_blank');
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const totalAssigned = reportData.reduce((sum, r) => sum + r.totalLeads, 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS - Sales Executive Performance Report (${selectedRange})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #1e293b; background: #ffffff; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-box { display: flex; align-items: center; gap: 15px; }
            .title { font-size: 20px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 11px; color: #64748b; font-family: monospace; }
            .stats { display: flex; gap: 15px; margin-bottom: 20px; }
            .stat-box { flex: 1; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .stat-val { font-size: 16px; font-weight: bold; color: #0284c7; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            tr:nth-child(even) { background: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .badge-conv { background: #dcfce7; color: #15803d; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-box">
              <img src="${logoBase64}" alt="AL ASR MOTORS Logo" style="height: 60px; width: auto; object-fit: contain;" />
              <div>
                <div class="title">AL ASR MOTORS - Sales Performance Report</div>
                <div class="subtitle">Reporting Period: ${selectedRange} • Generated: ${todayStr}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: #0284c7;">AL ASR Motors Executive Board</div>
              <div style="font-size: 10px; color: #64748b;">Sahiwal, Pakistan</div>
            </div>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="stat-label">Active Sales Staff</div>
              <div class="stat-val">${reportData.length} Agents</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Assigned Leads</div>
              <div class="stat-val">${totalAssigned} Leads</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Closed Revenue (PKR)</div>
              <div class="stat-val">Rs. ${reportData.reduce((sum, r) => sum + r.totalRevenue, 0).toLocaleString()}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Closed Deals Profit (PKR)</div>
              <div class="stat-val">Rs. ${reportData.reduce((sum, r) => sum + r.totalProfit, 0).toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Sales Agent</th>
                <th>Assigned Leads</th>
                <th>Deals Closed</th>
                <th>Active Leads</th>
                <th>Follow Ups</th>
                <th>Revenue (PKR)</th>
                <th>Conversion Rate</th>
                <th>Avg Turnaround</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(sm => `
                <tr>
                  <td><strong>${sm.salesmanName}</strong><br/><span style="color: #64748b; font-size: 9px;">${sm.email}</span></td>
                  <td>${sm.totalLeads}</td>
                  <td style="color: #15803d; font-weight: bold;">${sm.dealsClosed}</td>
                  <td>${sm.activeLeads}</td>
                  <td>${sm.pendingLeads}</td>
                  <td style="font-weight: bold;">Rs. ${sm.totalRevenue.toLocaleString()}</td>
                  <td><span class="badge badge-conv">${sm.conversionRate}</span></td>
                  <td>${sm.avgDealTime}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            AL ASR MOTORS Executive Report • Confidential • Generated automatically
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Bank Cases Export
  const handleExportBankCasesCSV = () => {
    const url = api.getExportBankCasesCSVUrl({
      range: selectedRange,
      startDate,
      endDate,
      status: bankStatusFilter,
      bankName: selectedBank,
      search: bankSearch
    });
    window.open(url, '_blank');
  };

  const handleExportBankCasesPDF = () => {
    const printWindow = window.open('', '_blank');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const { stats, bankSummary, cases } = bankCasesData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS - Bank Financing & Ledger Cases Report (${selectedRange})</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; padding: 15px; color: #0f172a; background: #ffffff; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 15px; }
            .logo-box { display: flex; align-items: center; gap: 15px; }
            .title { font-size: 20px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 11px; color: #64748b; font-family: monospace; }
            .stats { display: flex; gap: 10px; margin-bottom: 15px; }
            .stat-box { flex: 1; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; }
            .stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .stat-val { font-size: 15px; font-weight: bold; color: #0284c7; margin-top: 3px; }
            .bank-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
            .bank-chip { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 7px 8px; font-size: 9px; text-transform: uppercase; }
            td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; vertical-align: top; }
            tr:nth-child(even) { background: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
            .badge-confirmed { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-box">
              <img src="${logoBase64}" alt="AL ASR MOTORS Logo" style="height: 50px; width: auto; object-fit: contain;" />
              <div>
                <div class="title">AL-ASR MOTORS — Bank Financing & Cases Ledger Report</div>
                <div class="subtitle">Filter: ${bankStatusFilter} | Period: ${selectedRange} | Generated: ${todayStr}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; font-weight: bold; color: #0284c7;">AL ASR Motors Accounts & Financing Dept</div>
              <div style="font-size: 9px; color: #64748b;">Sahiwal, Pakistan</div>
            </div>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="stat-label">Total Bank Cases</div>
              <div class="stat-val">${stats.totalCases} <span style="font-size: 10px; color: #15803d;">(${stats.confirmedCount} Confirmed)</span></div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Vehicle Valuation</div>
              <div class="stat-val" style="color: #0f172a;">Rs. ${Number(stats.totalBudget || 0).toLocaleString()}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Downpayment Given</div>
              <div class="stat-val" style="color: #15803d;">Rs. ${Number(stats.totalDownpayment || 0).toLocaleString()}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Processing Fees</div>
              <div class="stat-val" style="color: #0284c7;">Rs. ${Number(stats.totalProcessingFees || 0).toLocaleString()}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Remaining Bank Due</div>
              <div class="stat-val" style="color: #b45309;">Rs. ${Number(stats.totalDueAmount || 0).toLocaleString()}</div>
            </div>
          </div>

          ${bankSummary.length > 0 ? `
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: bold; color: #475569; margin-bottom: 4px; text-transform: uppercase;">Bank-by-Bank Capital Summary:</div>
              <div class="bank-grid">
                ${bankSummary.map(b => `
                  <div class="bank-chip">
                    <strong>${b.bankName}:</strong> ${b.count} cases (${b.confirmedCount} conf) • <strong>Total: Rs. ${Number(b.totalBudget).toLocaleString()}</strong> (Downpayment: Rs. ${Number(b.totalDownpayment).toLocaleString()})
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th>Case # & Status</th>
                <th>Client Name & Contact</th>
                <th>Financing Bank</th>
                <th>Vehicle Details</th>
                <th>Vehicle Price (PKR)</th>
                <th>Downpayment Paid (Given)</th>
                <th>Processing Fee</th>
                <th>Bank Due / Balance</th>
                <th>Assigned Officer</th>
              </tr>
            </thead>
            <tbody>
              ${cases.map(c => `
                <tr>
                  <td>
                    <strong>${c.bankCaseNo || 'N/A'}</strong><br/>
                    <span class="badge ${c.bankCaseStatus === 'Confirmed' ? 'badge-confirmed' : 'badge-pending'}">${c.bankCaseStatus || 'Not Confirmed'}</span>
                  </td>
                  <td>
                    <strong>${c.buyerName}</strong><br/>
                    <span style="color: #64748b; font-size: 9px;">${c.buyerPhone || '-'} • ${c.buyerCity || '-'}</span>
                  </td>
                  <td style="font-weight: bold; color: #0284c7;">${c.bankName || 'Unspecified'}</td>
                  <td>${c.year || ''} ${c.vehicle} ${c.model}</td>
                  <td style="font-weight: bold;">Rs. ${Number(c.budget || 0).toLocaleString()}</td>
                  <td style="color: #15803d; font-weight: bold;">
                    Rs. ${Number(c.downpaymentAmount || 0).toLocaleString()}
                    ${c.downpaymentPercent ? ` (${c.downpaymentPercent}%)` : ''}
                  </td>
                  <td style="color: #0284c7;">Rs. ${Number(c.processingFees || 0).toLocaleString()}</td>
                  <td style="color: #b45309; font-weight: bold;">Rs. ${Number(c.dueAmount || (Number(c.budget || 0) - Number(c.downpaymentAmount || 0) + Number(c.processingFees || 0))).toLocaleString()}</td>
                  <td>${c.assignedUser?.name || 'Unassigned'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            AL ASR MOTORS • Official Bank Cases & Financing Statement • Page 1 of 1
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const { stats, bankSummary, availableBanks, cases } = bankCasesData;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black shadow-lg shadow-cyan-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Executive Reports & Analytics</h2>
              <p className="text-xs font-mono text-slate-400">
                Financial performance, salesmen productivity, and bank financing ledger reports.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 gap-1.5 shadow-inner">
          <button
            onClick={() => setActiveTab('salesmen')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'salesmen'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Salesmen Performance</span>
          </button>

          <button
            onClick={() => setActiveTab('bank_cases')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'bank_cases'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Bank Cases & Financing Report</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Global Actions Header */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Period:</span>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10 gap-1">
            {dateRanges.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  selectedRange === range
                    ? (activeTab === 'bank_cases' ? 'bg-emerald-500 text-black font-bold shadow-sm' : 'bg-cyan-500 text-black font-bold shadow-sm')
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {selectedRange === 'Custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1 text-xs text-white font-mono"
              />
              <span className="text-slate-500 font-mono text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1 text-xs text-white font-mono"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={activeTab === 'salesmen' ? handleExportPDF : handleExportBankCasesPDF}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-cyan-400 font-bold font-mono text-xs rounded-xl flex items-center space-x-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Export Printable PDF</span>
          </button>

          <button
            onClick={activeTab === 'salesmen' ? handleExportCSV : handleExportBankCasesCSV}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SALESMEN PERFORMANCE REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'salesmen' && (
        <div className="space-y-6">
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/10">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Active Sales Agents</p>
                <h3 className="text-xl font-extrabold text-white mt-0.5">{reportData.length}</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/10">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Assigned Leads</p>
                <h3 className="text-xl font-extrabold text-cyan-400 mt-0.5">
                  {reportData.reduce((sum, r) => sum + r.totalLeads, 0)}
                </h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/10">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Closed Revenue (PKR)</p>
                <h3 className="text-xl font-extrabold text-emerald-400 mt-0.5">
                  Rs. {reportData.reduce((sum, r) => sum + (parsePakistaniPrice(r.totalRevenue) || 0), 0).toLocaleString()}
                </h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/10">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Top Lead Handler</p>
                <h3 className="text-sm font-extrabold text-amber-400 mt-0.5 truncate max-w-[150px]">
                  {reportData[0]?.salesmanName || 'N/A'}
                </h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Salesman Comparative Performance Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Salesmen Performance Comparison (AL ASR)</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Comparing conversion rates, closed PKR volume, average deal turnaround time, and active leads for period [{selectedRange}].
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Sales Agent</th>
                    <th className="py-3.5 px-4">Total Assigned Leads</th>
                    <th className="py-3.5 px-4">Deals Closed</th>
                    <th className="py-3.5 px-4">Active Leads</th>
                    <th className="py-3.5 px-4">Follow Ups</th>
                    <th className="py-3.5 px-4">Closed Revenue (PKR)</th>
                    <th className="py-3.5 px-4">Conversion Rate</th>
                    <th className="py-3.5 px-4">Avg Deal Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {reportData.map((sm) => (
                    <tr key={sm.salesmanId} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-semibold text-white">
                        <p className="text-sm font-bold text-white">{sm.salesmanName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{sm.email}</p>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-white text-sm">
                        {sm.totalLeads}
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-emerald-400 text-sm">
                        {sm.dealsClosed}
                      </td>

                      <td className="py-4 px-4 font-mono text-cyan-400">
                        {sm.activeLeads}
                      </td>

                      <td className="py-4 px-4 font-mono text-amber-400">
                        {sm.pendingLeads}
                      </td>

                      <td className="py-4 px-4 font-mono font-extrabold text-cyan-400 text-sm">
                        {formatPKR(sm.totalRevenue)}
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-mono font-bold">
                          {sm.conversionRate}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-300">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{sm.avgDealTime}</span>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {reportData.length === 0 && !loadingSalesmen && (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-500 font-mono text-xs">
                        No salesmen performance records found for selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BANK CASES & FINANCING REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'bank_cases' && (
        <div className="space-y-6">
          {/* Bank Cases Filters Toolbar */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 text-xs font-mono text-slate-400 mr-1">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <span>Filters:</span>
              </div>

              {/* Status Filter (Confirmed vs Not Confirmed vs All) */}
              <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10 gap-1">
                {bankCaseStatuses.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setBankStatusFilter(st.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                      bankStatusFilter === st.id
                        ? (st.id === 'Confirmed' ? 'bg-emerald-500 text-black font-bold' : st.id === 'Not Confirmed' ? 'bg-amber-500 text-black font-bold' : 'bg-cyan-500 text-black font-bold')
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Bank Selector */}
              {availableBanks.length > 0 && (
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="ALL">All Financing Banks</option>
                  {availableBanks.map((b, i) => (
                    <option key={i} value={b}>{b}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Keyword Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Client, Phone, Vehicle, Case #..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Financial KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Bank Cases</p>
                <h3 className="text-2xl font-black text-white mt-1">{stats.totalCases}</h3>
              </div>
              <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-white/5 text-[11px] font-mono">
                <span className="text-emerald-400 font-bold">{stats.confirmedCount} Confirmed</span>
                <span>•</span>
                <span className="text-amber-400">{stats.notConfirmedCount} Pending</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Downpayment Paid</p>
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-xl font-extrabold text-emerald-400 mt-1">
                  Rs. {Number(stats.totalDownpayment || 0).toLocaleString()}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-white/5">
                Total money given by clients
              </p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-cyan-500/20 bg-cyan-500/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">Processing Fees</p>
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-xl font-extrabold text-cyan-300 mt-1">
                  Rs. {Number(stats.totalProcessingFees || 0).toLocaleString()}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-white/5">
                Bank & case documentation charges
              </p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">Bank Due Balance</p>
                  <Building2 className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-xl font-extrabold text-amber-300 mt-1">
                  Rs. {Number(stats.totalDueAmount || 0).toLocaleString()}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-white/5">
                Total amount financed / pending
              </p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Vehicle Volume</p>
                  <Car className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-xl font-extrabold text-white mt-1">
                  Rs. {Number(stats.totalBudget || 0).toLocaleString()}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-white/5">
                Aggregate car budgets
              </p>
            </div>
          </div>

          {/* Bank Capital Distribution Cards */}
          {bankSummary.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Financing Breakdown by Bank (Where Capital is Deposited)</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">{bankSummary.length} Partner Banks</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bankSummary.map((b, i) => (
                  <div key={i} className="bg-slate-900/80 p-3.5 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-cyan-300 text-sm">{b.bankName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/10">
                        {b.count} cases ({b.confirmedCount} conf)
                      </span>
                    </div>

                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex justify-between text-slate-300">
                        <span>Downpayment Given:</span>
                        <strong className="text-emerald-400">Rs. {Number(b.totalDownpayment).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Bank Due Balance:</span>
                        <strong className="text-amber-400">Rs. {Number(b.totalDueAmount).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-white/5">
                        <span>Total Vehicle Valuation:</span>
                        <strong className="text-white">Rs. {Number(b.totalBudget).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Bank Cases Financial Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-white">Bank Cases Financial Details & Client Ledger</h3>
                <p className="text-xs text-slate-400 font-mono">
                  All individual bank case entries showing buyer downpayment given, bank assigned, processing fees, and due amounts.
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-900 border border-white/10 rounded-xl text-xs font-mono text-emerald-400 font-bold">
                Showing {cases.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Case # & Status</th>
                    <th className="py-3.5 px-4">Client / Buyer</th>
                    <th className="py-3.5 px-4">Financing Bank</th>
                    <th className="py-3.5 px-4">Vehicle Demanded</th>
                    <th className="py-3.5 px-4">Total Price (PKR)</th>
                    <th className="py-3.5 px-4">Downpayment Given (PKR)</th>
                    <th className="py-3.5 px-4">Processing Fee</th>
                    <th className="py-3.5 px-4">Remaining Bank Due</th>
                    <th className="py-3.5 px-4">Officer & Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {cases.map((c) => {
                    const budget = Number(c.budget) || 0;
                    const downAmount = Number(c.downpaymentAmount) || 0;
                    const fee = Number(c.processingFees) || 0;
                    const due = Number(c.dueAmount) || (budget - downAmount + fee);

                    return (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        {/* Case # & Status */}
                        <td className="py-4 px-4 font-mono">
                          <p className="font-bold text-white text-sm">{c.bankCaseNo || 'N/A'}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 border ${
                            c.bankCaseStatus === 'Confirmed'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : c.bankCaseStatus === 'Not Confirmed'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          }`}>
                            {c.bankCaseStatus || 'Not Confirmed'}
                          </span>
                        </td>

                        {/* Client / Buyer */}
                        <td className="py-4 px-4 font-semibold text-white">
                          <p className="text-sm font-bold text-white">{c.buyerName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {c.buyerPhone || 'No Phone'} • {c.buyerCity || 'City N/A'}
                          </p>
                        </td>

                        {/* Financing Bank */}
                        <td className="py-4 px-4 font-mono">
                          <span className="font-extrabold text-cyan-400 text-xs bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                            {c.bankName || 'Unspecified'}
                          </span>
                        </td>

                        {/* Vehicle Demanded */}
                        <td className="py-4 px-4">
                          <p className="font-bold text-white">{c.year || ''} {c.vehicle} {c.model}</p>
                          {c.color && <p className="text-[10px] text-slate-400 font-mono">Color: {c.color}</p>}
                        </td>

                        {/* Total Car Price */}
                        <td className="py-4 px-4 font-mono font-bold text-white text-sm">
                          Rs. {budget.toLocaleString()}
                        </td>

                        {/* Downpayment Given */}
                        <td className="py-4 px-4 font-mono">
                          <p className="font-extrabold text-emerald-400 text-sm">
                            Rs. {downAmount.toLocaleString()}
                          </p>
                          {c.downpaymentPercent > 0 && (
                            <p className="text-[10px] text-emerald-300/80 font-bold">
                              ({c.downpaymentPercent}% given)
                            </p>
                          )}
                        </td>

                        {/* Processing Fee */}
                        <td className="py-4 px-4 font-mono text-cyan-300 font-bold">
                          {fee > 0 ? `Rs. ${fee.toLocaleString()}` : '—'}
                        </td>

                        {/* Remaining Bank Due */}
                        <td className="py-4 px-4 font-mono font-extrabold text-amber-300 text-sm">
                          Rs. {due.toLocaleString()}
                        </td>

                        {/* Officer & Date */}
                        <td className="py-4 px-4 font-mono text-slate-400 text-[11px]">
                          <p className="text-slate-200">{c.assignedUser?.name || 'Unassigned'}</p>
                          <p className="text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</p>
                        </td>
                      </tr>
                    );
                  })}

                  {cases.length === 0 && !loadingBankCases && (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-500 font-mono text-xs">
                        No bank financing records found matching the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
