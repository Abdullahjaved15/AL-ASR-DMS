import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet, 
  Search, 
  Printer, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  User, 
  Car, 
  Calendar, 
  FileText, 
  History, 
  Building2, 
  ArrowUpRight, 
  X, 
  ShieldCheck, 
  RefreshCw,
  Eye,
  CreditCard,
  ChevronRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../context/AutoRefreshContext';
import { logoBase64 } from '../utils/logoBase64';
import { 
  formatPKR, 
  parsePakistaniPrice, 
  getPriceHint, 
  normalizePriceInput, 
  formatPKRShort, 
  numberToWordsPKR, 
  getCurrentFormattedTime, 
  getCurrentDayName 
} from '../utils/priceFormatter';

export default function RecoveryCases({ onNavigate }) {
  const { user, isAccountsHead, isSuperAdmin, isAccountant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({
    totalPendingRecovery: 0,
    totalRecoveredAmount: 0,
    activeRecoveryCount: 0,
    overdueRecoveryCount: 0,
    totalRecoveryCases: 0
  });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING_RECOVERY, PARTIALLY_RECOVERED, FULLY_RECOVERED, OVERDUE

  // Payment Modal State
  const [selectedCaseForPayment, setSelectedCaseForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'CASH', // CASH, BANK_TRANSFER
    bankAccountId: '',
    referenceNo: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');

  // History Drawer State
  const [selectedCaseForHistory, setSelectedCaseForHistory] = useState(null);
  const [casePayments, setCasePayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Print Mode State
  const [isPrintingList, setIsPrintingList] = useState(false);
  const printAreaRef = useRef(null);

  useEffect(() => {
    fetchRecoveryCases();
    fetchBankAccounts();
  }, [statusFilter]);

  // Listen to auto refresh
  useAutoRefresh(() => {
    fetchRecoveryCases();
  });

  const fetchRecoveryCases = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      const res = await api.getRecoveryCases(params);
      if (res.success) {
        setCases(res.data || []);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch recovery cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await api.getBankAndCashAccounts();
      if (res.success && res.data) {
        const banks = res.data.filter(acc => acc.subType === 'BANK' || acc.accountType === 'BANK');
        setBankAccounts(banks);
      }
    } catch (err) {
      console.error('Failed to fetch bank accounts:', err);
    }
  };

  const handleOpenPaymentModal = (recoveryCase) => {
    setSelectedCaseForPayment(recoveryCase);
    setPaymentForm({
      amount: '',
      paymentMethod: 'CASH',
      bankAccountId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
      referenceNo: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setPaymentError('');
    setPaymentSuccess('');
  };

  const handleClosePaymentModal = () => {
    setSelectedCaseForPayment(null);
    setPaymentError('');
    setPaymentSuccess('');
  };

  const handleOpenHistory = async (recoveryCase) => {
    setSelectedCaseForHistory(recoveryCase);
    setLoadingHistory(true);
    try {
      const res = await api.getRecoveryPayments(recoveryCase.id);
      if (res.success) {
        setCasePayments(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load recovery payments:', err);
      setCasePayments([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseHistory = () => {
    setSelectedCaseForHistory(null);
    setCasePayments([]);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCaseForPayment) return;

    const rawAmount = parsePakistaniPrice(paymentForm.amount);
    if (!rawAmount || isNaN(rawAmount) || rawAmount <= 0) {
      setPaymentError('Please enter a valid recovery amount.');
      return;
    }

    const currentRemaining = Number(selectedCaseForPayment.remainingBalance || 0);
    if (rawAmount > currentRemaining) {
      setPaymentError(`Recovery amount cannot exceed remaining balance of ${formatPKR(currentRemaining)}.`);
      return;
    }

    if (paymentForm.paymentMethod === 'BANK_TRANSFER' && !paymentForm.bankAccountId) {
      setPaymentError('Please select a destination Bank Account.');
      return;
    }

    setSubmittingPayment(true);
    setPaymentError('');
    setPaymentSuccess('');

    try {
      const payload = {
        amount: rawAmount,
        paymentMethod: paymentForm.paymentMethod,
        bankAccountId: paymentForm.paymentMethod === 'BANK_TRANSFER' ? paymentForm.bankAccountId : undefined,
        referenceNo: paymentForm.referenceNo,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes
      };

      const res = await api.recordRecoveryPayment(selectedCaseForPayment.id, payload);
      if (res.success) {
        const remaining = res.invoice?.remainingBalance || 0;
        const msg = remaining <= 0 
          ? `✓ Full recovery completed! Invoice #${res.invoice?.invoiceNumber} is now fully paid.`
          : `✓ Tranche of ${formatPKR(rawAmount)} recorded! Remaining balance: ${formatPKR(remaining)} (Case remains active).`;
        setPaymentSuccess(msg);
        
        setTimeout(() => {
          handleClosePaymentModal();
          fetchRecoveryCases();
        }, 1500);
      } else {
        setPaymentError(res.message || 'Failed to record recovery payment.');
      }
    } catch (err) {
      console.error('Payment submission failed:', err);
      setPaymentError(err.message || 'Error occurred while processing payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePrintRecoverySheet = () => {
    window.print();
  };

  // Filter cases client-side for search query
  const filteredCases = cases.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const invNo = (c.invoiceNumber || '').toLowerCase();
    const custName = (c.customerName || '').toLowerCase();
    const custPhone = (c.customerPhone || '').toLowerCase();
    const car = `${c.carMake || ''} ${c.carModel || ''} ${c.carYear || ''} ${c.registrationNumber || ''} ${c.chassisNumber || ''}`.toLowerCase();
    return invNo.includes(q) || custName.includes(q) || custPhone.includes(q) || car.includes(q);
  });

  const isOverdue = (promiseDate, status) => {
    if (!promiseDate || status === 'FULLY_RECOVERED') return false;
    const pDate = new Date(promiseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pDate < today;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Printable Area - Only active on @media print */}
      <div className="hidden print:block font-serif text-black p-4">
        <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
          <div className="flex items-center space-x-3">
            {logoBase64 ? (
              <img src={logoBase64} alt="AL ASR MOTORS" className="h-16 w-auto object-contain" />
            ) : (
              <h1 className="text-2xl font-bold uppercase tracking-wider">AL ASR MOTORS</h1>
            )}
            <div>
              <h2 className="text-xl font-bold">AL ASR MOTORS</h2>
              <p className="text-xs text-gray-700">Premium Automobile Dealership & Recovery Registry</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-bold uppercase text-red-700">CUSTOMER RECOVERY SHEET</h3>
            <p className="text-xs">Generated: {new Date().toLocaleDateString('en-GB')} at {getCurrentFormattedTime()}</p>
            <p className="text-xs">Total Outstanding: <span className="font-bold">{formatPKR(stats.totalPendingRecovery)}</span></p>
          </div>
        </div>

        <table className="w-full text-xs border-collapse border border-gray-400 mb-6">
          <thead>
            <tr className="bg-gray-100 text-gray-900 border-b border-gray-400">
              <th className="border border-gray-400 p-2 text-left">Sr#</th>
              <th className="border border-gray-400 p-2 text-left">Invoice #</th>
              <th className="border border-gray-400 p-2 text-left">Customer Name & Contact</th>
              <th className="border border-gray-400 p-2 text-left">Vehicle Details</th>
              <th className="border border-gray-400 p-2 text-right">Total Deal</th>
              <th className="border border-gray-400 p-2 text-right">Received</th>
              <th className="border border-gray-400 p-2 text-right font-bold text-red-700">Balance Due</th>
              <th className="border border-gray-400 p-2 text-center">Promise Date</th>
              <th className="border border-gray-400 p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.map((item, idx) => (
              <tr key={item.id} className="border-b border-gray-300">
                <td className="border border-gray-400 p-2 text-center">{idx + 1}</td>
                <td className="border border-gray-400 p-2 font-mono font-bold">{item.invoiceNumber}</td>
                <td className="border border-gray-400 p-2">
                  <div className="font-bold">{item.customerName}</div>
                  <div className="text-[10px] text-gray-600">{item.customerPhone} {item.customerCity ? `(${item.customerCity})` : ''}</div>
                </td>
                <td className="border border-gray-400 p-2">
                  <div>{item.carMake} {item.carModel} ({item.carYear || '-'})</div>
                  <div className="text-[10px] text-gray-600">Reg: {item.registrationNumber || 'Applied For'} | Ch: {item.chassisNumber || '-'}</div>
                </td>
                <td className="border border-gray-400 p-2 text-right">{formatPKR(item.totalAmount)}</td>
                <td className="border border-gray-400 p-2 text-right text-emerald-700">{formatPKR(item.advancePaid || 0)}</td>
                <td className="border border-gray-400 p-2 text-right font-bold text-red-700">{formatPKR(item.remainingBalance || 0)}</td>
                <td className="border border-gray-400 p-2 text-center">
                  {item.recoveryPromiseDate ? new Date(item.recoveryPromiseDate).toLocaleDateString('en-GB') : 'Not Set'}
                </td>
                <td className="border border-gray-400 p-2 text-center font-bold">
                  {item.recoveryStatus === 'FULLY_RECOVERED' ? 'RECOVERED' : (item.recoveryStatus === 'PARTIALLY_RECOVERED' ? 'PARTIAL' : 'PENDING')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center text-xs mt-12 pt-6 border-t border-gray-400">
          <div className="text-center w-40">
            <div className="border-t border-gray-600 pt-1">Prepared By / Accountant</div>
          </div>
          <div className="text-center w-40">
            <div className="border-t border-gray-600 pt-1">Accounts Head</div>
          </div>
          <div className="text-center w-40">
            <div className="border-t border-gray-600 pt-1">Managing Director / CEO</div>
          </div>
        </div>
      </div>

      {/* Main Screen Content */}
      <div className="print:hidden space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-700/60 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-400">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
                  Recovery Cases Management
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono">
                    ادھار و وصولی لسٹ
                  </span>
                </h1>
                <p className="text-sm text-slate-300">
                  Track pending customer recovery amounts, log multi-tranche partial payments, and deposit funds to Safe or Bank.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 relative z-10">
            <button
              onClick={handlePrintRecoverySheet}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-600 shadow-md hover:shadow-lg transition-all text-sm font-semibold"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print Recovery List</span>
            </button>
            <button
              onClick={fetchRecoveryCases}
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all text-sm font-semibold"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Outstanding Recovery */}
          <div className="bg-slate-900/90 border border-amber-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/60 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/80 mb-1">
                  Total Outstanding Balance
                </p>
                <h3 className="text-2xl font-black text-amber-300 font-mono">
                  {formatPKR(stats.totalPendingRecovery || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Across {stats.activeRecoveryCount || 0} active recovery cases
                </p>
              </div>
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
              <div 
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ 
                  width: stats.totalRecoveryCases > 0 
                    ? `${Math.min(100, (stats.activeRecoveryCount / stats.totalRecoveryCases) * 100)}%` 
                    : '0%' 
                }}
              ></div>
            </div>
          </div>

          {/* Total Amount Recovered */}
          <div className="bg-slate-900/90 border border-emerald-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/60 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80 mb-1">
                  Total Amount Recovered
                </p>
                <h3 className="text-2xl font-black text-emerald-300 font-mono">
                  {formatPKR(stats.totalRecoveredAmount || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Deposited into Cash Safe & Banks
                </p>
              </div>
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>

          {/* Active Cases Count */}
          <div className="bg-slate-900/90 border border-blue-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-blue-500/60 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/80 mb-1">
                  Active Recovery Cases
                </p>
                <h3 className="text-2xl font-black text-blue-300 font-mono">
                  {stats.activeRecoveryCount || 0} <span className="text-sm font-normal text-slate-400">Deals</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pending / Partial recovery in progress
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
              <div 
                className="bg-blue-400 h-full rounded-full transition-all duration-500"
                style={{ width: '60%' }}
              ></div>
            </div>
          </div>

          {/* Overdue Cases Count */}
          <div className="bg-slate-900/90 border border-rose-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-rose-500/60 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-400/80 mb-1">
                  Overdue Promises
                </p>
                <h3 className="text-2xl font-black text-rose-400 font-mono">
                  {stats.overdueRecoveryCount || 0} <span className="text-sm font-normal text-slate-400">Cases</span>
                </h3>
                <p className="text-xs text-rose-400/80 mt-1">
                  Past promised recovery date
                </p>
              </div>
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 group-hover:scale-110 transition-transform">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
              <div 
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: stats.overdueRecoveryCount > 0 ? '100%' : '0%' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, phone, car, invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {[
              { id: 'ALL', label: 'All Cases' },
              { id: 'PENDING_RECOVERY', label: 'Pending' },
              { id: 'PARTIALLY_RECOVERED', label: 'Partial Recovery' },
              { id: 'FULLY_RECOVERED', label: 'Fully Recovered' },
              { id: 'OVERDUE', label: 'Overdue' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recovery Cases Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Sales Receipt</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Vehicle Details</th>
                  <th className="py-3.5 px-4 text-right">Deal Financials</th>
                  <th className="py-3.5 px-4 text-center">Recovery Progress</th>
                  <th className="py-3.5 px-4 text-center">Promise Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Loading recovery cases...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Wallet className="w-10 h-10 text-slate-600" />
                        <p className="text-base font-semibold text-slate-300">No recovery cases found</p>
                        <p className="text-xs text-slate-500">
                          {search ? 'Try adjusting your search criteria' : 'Create a Sales Receipt with "Recovery Case" enabled to track pending balances.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCases.map(item => {
                    const total = Number(item.totalAmount || 0);
                    const received = Number(item.advancePaid || 0);
                    const remaining = Number(item.remainingBalance || 0);
                    const pct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;
                    const overdue = isOverdue(item.recoveryPromiseDate, item.recoveryStatus);

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                        {/* Sales Receipt */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            {item.invoiceNumber}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {new Date(item.createdAt).toLocaleDateString('en-GB')}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {item.customerName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {item.customerPhone || 'No Phone'}
                            {item.customerCity ? ` • ${item.customerCity}` : ''}
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-slate-400" />
                            {item.carMake} {item.carModel} {item.carYear ? `(${item.carYear})` : ''}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            Reg: <span className="text-slate-300">{item.registrationNumber || 'Applied For'}</span>
                            {item.chassisNumber ? ` • Ch: ${item.chassisNumber.slice(-6)}` : ''}
                          </div>
                        </td>

                        {/* Financials */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono text-xs text-slate-400">
                            Total: <span className="text-slate-200 font-medium">{formatPKR(total)}</span>
                          </div>
                          <div className="font-mono text-xs text-emerald-400">
                            Received: <span>{formatPKR(received)}</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-amber-400 mt-0.5">
                            Due: {formatPKR(remaining)}
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-3.5 px-4">
                          <div className="w-36 mx-auto">
                            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                              <span>{pct}% paid</span>
                              <span>{remaining === 0 ? 'Settled' : 'Open'}</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  pct >= 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-indigo-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Promise Date */}
                        <td className="py-3.5 px-4 text-center">
                          {item.recoveryPromiseDate ? (
                            <div>
                              <div className={`text-xs font-mono font-medium ${overdue ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                                {new Date(item.recoveryPromiseDate).toLocaleDateString('en-GB')}
                              </div>
                              {overdue && (
                                <span className="inline-block mt-0.5 px-2 py-0.2 text-[10px] rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  Overdue
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">Not Specified</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {item.recoveryStatus === 'FULLY_RECOVERED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Fully Recovered
                            </span>
                          ) : item.recoveryStatus === 'PARTIALLY_RECOVERED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              <Clock className="w-3 h-3" /> Partial Recovery
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <AlertCircle className="w-3 h-3" /> Pending Recovery
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {remaining > 0 && (
                              <button
                                onClick={() => handleOpenPaymentModal(item)}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
                                title="Collect recovery amount (Cash or Bank)"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Add Recovery</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenHistory(item)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all text-xs"
                              title="View partial recovery payments history"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            {onNavigate && (
                              <button
                                onClick={() => onNavigate('invoices')}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all text-xs"
                                title="Go to Invoices module"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
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
      </div>

      {/* ======================================================== */}
      {/* ADD RECOVERY AMOUNT MODAL */}
      {/* ======================================================== */}
      {selectedCaseForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-800 to-indigo-950 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Record Recovery Amount</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Invoice #{selectedCaseForPayment.invoiceNumber} • {selectedCaseForPayment.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Financial Status Summary */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Deal</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">
                    {formatPKR(selectedCaseForPayment.totalAmount)}
                  </p>
                </div>
                <div className="border-x border-slate-700">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Received So Far</p>
                  <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                    {formatPKR(selectedCaseForPayment.advancePaid || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-amber-400 uppercase font-semibold">Remaining Due</p>
                  <p className="text-base font-black text-amber-300 font-mono mt-0.5">
                    {formatPKR(selectedCaseForPayment.remainingBalance || 0)}
                  </p>
                </div>
              </div>

              {/* Alert Feedback */}
              {paymentError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}
              {paymentSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentSuccess}</span>
                </div>
              )}

              <form id="recoveryPaymentForm" onSubmit={handlePaymentSubmit} className="space-y-4">
                {/* Recovery Amount Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Amount to Receive (PKR) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 1000000 or 10 lac"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  {/* Price Hint */}
                  {paymentForm.amount && (
                    <div className="mt-1 flex items-center justify-between text-xs font-mono text-emerald-400 px-1">
                      <span>Parsed: {formatPKR(parsePakistaniPrice(paymentForm.amount) || 0)}</span>
                      <span className="text-slate-400 italic">
                        {numberToWordsPKR(parsePakistaniPrice(paymentForm.amount) || 0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Deposit Destination / Payment Method <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: 'CASH' })}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border font-semibold text-xs transition-all ${
                        paymentForm.paymentMethod === 'CASH'
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-750'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Cash Safe (1001)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: 'BANK_TRANSFER' })}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border font-semibold text-xs transition-all ${
                        paymentForm.paymentMethod === 'BANK_TRANSFER'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-750'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Bank Transfer</span>
                    </button>
                  </div>
                </div>

                {/* Bank Account Selector (If Bank Transfer) */}
                {paymentForm.paymentMethod === 'BANK_TRANSFER' && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Select Bank Account <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={paymentForm.bankAccountId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bankAccountId: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="">-- Choose Bank Account --</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.accountCode} - {b.accountName} {b.accountNumber ? `(${b.accountNumber})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Payment Date & Reference */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Ref # / Cheque / Slip #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TR-99824"
                      value={paymentForm.referenceNo}
                      onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                {/* Notes / Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Recovery Notes & Remarks
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. 1st Tranche received via Cash Safe..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  ></textarea>
                </div>

                {/* Dynamic Outcome Preview */}
                {(() => {
                  const enteredAmt = parsePakistaniPrice(paymentForm.amount) || 0;
                  const currentRem = Number(selectedCaseForPayment.remainingBalance || 0);
                  const afterPaymentRemaining = Math.max(0, currentRem - enteredAmt);

                  if (enteredAmt <= 0) return null;

                  return (
                    <div className="p-3.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-300">
                        <span>Current Remaining:</span>
                        <span className="font-mono">{formatPKR(currentRem)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>After This Payment:</span>
                        <span className="font-mono font-bold">-{formatPKR(enteredAmt)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-slate-700 pt-1 text-amber-300">
                        <span>New Balance Due:</span>
                        <span className="font-mono">{formatPKR(afterPaymentRemaining)}</span>
                      </div>
                      <div className="pt-1 text-[11px] text-slate-400 italic">
                        {afterPaymentRemaining === 0 ? (
                          <span className="text-emerald-400 font-semibold">
                            ✓ This will fully settle the deal. Status will change to FULLY_RECOVERED.
                          </span>
                        ) : (
                          <span className="text-blue-400 font-semibold">
                            ℹ Deal will stay active in PARTIALLY_RECOVERED status with {formatPKR(afterPaymentRemaining)} due.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-4 bg-slate-800/80 border-t border-slate-700">
              <button
                type="button"
                onClick={handleClosePaymentModal}
                disabled={submittingPayment}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="recoveryPaymentForm"
                disabled={submittingPayment}
                className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all"
              >
                {submittingPayment ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Receive Amount</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RECOVERY HISTORY DRAWER / MODAL */}
      {/* ======================================================== */}
      {selectedCaseForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-800 to-indigo-950 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Recovery Payments Log</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Invoice #{selectedCaseForHistory.invoiceNumber} • {selectedCaseForHistory.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseHistory}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {loadingHistory ? (
                <div className="text-center py-10 text-slate-400">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span>Loading payment tranches...</span>
                </div>
              ) : casePayments.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No recovery payments recorded yet</p>
                  <p className="text-xs text-slate-500">
                    Use "+ Add Recovery" to log cash or bank payments for this deal.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {casePayments.map((p, idx) => (
                    <div key={p.id} className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[11px] font-mono font-bold">
                            Tranche #{idx + 1}
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            {new Date(p.paymentDate).toLocaleDateString('en-GB')}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            {p.paymentMethod === 'CASH' ? 'Cash Safe' : 'Bank Transfer'}
                          </span>
                        </div>
                        {p.bankAccount && (
                          <div className="text-xs text-slate-400">
                            Bank: <span className="text-slate-300">{p.bankAccount.accountName}</span>
                          </div>
                        )}
                        {(p.receiptNumber || p.referenceNo) && (
                          <div className="text-xs text-slate-400">
                            Ref / Receipt #: <span className="font-mono text-slate-300">{p.receiptNumber || p.referenceNo}</span>
                          </div>
                        )}
                        {p.notes && (
                          <p className="text-xs text-slate-400 italic">"{p.notes}"</p>
                        )}
                        {p.receivedBy && (
                          <div className="text-[11px] text-slate-500">
                            Logged by: {p.receivedBy.name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Amount</p>
                        <p className="text-lg font-black text-emerald-400 font-mono">
                          +{formatPKR(p.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 bg-slate-800/80 border-t border-slate-700">
              <button
                onClick={handleCloseHistory}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
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
