import React, { useState, useEffect, useRef } from 'react';
import { 
  Landmark, 
  Wallet, 
  ArrowRightLeft, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  FileText, 
  Printer, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Car, 
  User, 
  Shield, 
  Layers, 
  RefreshCw, 
  CreditCard, 
  HelpCircle,
  Eye,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Receipt,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPKR, parsePakistaniPrice, getPriceHint, normalizePriceInput } from '../utils/priceFormatter';
import { logoBase64 } from '../utils/logoBase64';

export default function AccountsHub({ onNavigate }) {
  const { user, isSuperAdmin, isAccountsHead, isAccountant, canManageAccounts } = useAuth();

  // Active Tab: 'coa' | 'banks' | 'cheques' | 'installments' | 'audit' | 'chassis'
  const [activeTab, setActiveTab] = useState('coa');

  // Loading & Data states
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [accountsSummary, setAccountsSummary] = useState(null);
  const [bankAndCashAccounts, setBankAndCashAccounts] = useState([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Modal states
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedAccountLedger, setSelectedAccountLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerDateFilter, setLedgerDateFilter] = useState({ startDate: '', endDate: '' });

  // Security Cheques states
  const [cheques, setCheques] = useState([]);
  const [chequesStats, setChequesStats] = useState(null);
  const [selectedChequeStatus, setSelectedChequeStatus] = useState('ALL');
  const [isAddChequeModalOpen, setIsAddChequeModalOpen] = useState(false);
  const [isClearChequeModalOpen, setIsClearChequeModalOpen] = useState(false);
  const [selectedChequeToClear, setSelectedChequeToClear] = useState(null);
  const [clearingForm, setClearingForm] = useState({ bankAccountId: '', clearingDate: '', notes: '' });

  // Installments states
  const [installmentPlans, setInstallmentPlans] = useState([]);
  const [installmentStats, setInstallmentStats] = useState(null);
  const [selectedInstallmentPlan, setSelectedInstallmentPlan] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    itemId: '',
    paymentMethod: 'CASH',
    bankAccountId: '',
    paidAmount: '',
    paidDate: new Date().toISOString().slice(0, 10),
    receiptNumber: '',
    notes: ''
  });

  // Audit Trail & Day Book states
  const [auditTransactions, setAuditTransactions] = useState([]);
  const [auditAnalytics, setAuditAnalytics] = useState(null);
  const [auditTimeRange, setAuditTimeRange] = useState('TODAY');
  const [auditDateCustom, setAuditDateCustom] = useState({ startDate: '', endDate: '' });

  // Chassis Multi-Sale Tracker states
  const [chassisSearchInput, setChassisSearchInput] = useState('');
  const [chassisTrackerData, setChassisTrackerData] = useState(null);
  const [chassisLoading, setChassisLoading] = useState(false);

  // Forms data
  const [accountFormData, setAccountFormData] = useState({
    code: '',
    name: '',
    type: 'EXPENSE',
    subType: 'EXPENSE',
    bankName: '',
    accountNumber: '',
    branch: '',
    openingBalance: '',
    description: ''
  });

  const [transferFormData, setTransferFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    referenceNumber: '',
    notes: ''
  });

  const [chequeFormData, setChequeFormData] = useState({
    chequeNumber: '',
    type: 'ISSUED',
    bankAccountId: '',
    bankName: '',
    partyName: '',
    partyPhone: '',
    partyCnic: '',
    amount: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    chassisNumber: '',
    notes: ''
  });

  const [newPlanFormData, setNewPlanFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerCnic: '',
    vehicleName: '',
    registrationNo: '',
    chassisNumber: '',
    totalPrice: '',
    advanceAmount: '',
    totalInstallments: 12,
    installmentAmount: '',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // Edit Modals & Form States
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [selectedAccountToEdit, setSelectedAccountToEdit] = useState(null);
  const [editAccountFormData, setEditAccountFormData] = useState({
    code: '',
    name: '',
    type: 'EXPENSE',
    subType: 'EXPENSE',
    bankName: '',
    accountNumber: '',
    branch: '',
    openingBalance: '',
    currentBalance: '',
    description: '',
    isActive: true
  });

  const [isEditChequeModalOpen, setIsEditChequeModalOpen] = useState(false);
  const [selectedChequeToEdit, setSelectedChequeToEdit] = useState(null);
  const [editChequeFormData, setEditChequeFormData] = useState({
    chequeNumber: '',
    type: 'ISSUED',
    bankAccountId: '',
    bankName: '',
    partyName: '',
    partyPhone: '',
    partyCnic: '',
    amount: '',
    issueDate: '',
    dueDate: '',
    status: 'ISSUED',
    chassisNumber: '',
    notes: ''
  });

  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [selectedPlanToEdit, setSelectedPlanToEdit] = useState(null);
  const [editPlanFormData, setEditPlanFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerCnic: '',
    customerAddress: '',
    vehicleName: '',
    registrationNo: '',
    chassisNumber: '',
    totalPrice: '',
    advanceAmount: '',
    remainingAmount: '',
    status: 'ACTIVE',
    notes: ''
  });

  // Fetch initial data
  useEffect(() => {
    fetchAccountsData();
    fetchBankCashAccounts();
  }, []);

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === 'coa' || activeTab === 'banks') {
      fetchAccountsData();
    } else if (activeTab === 'cheques') {
      fetchChequesData();
    } else if (activeTab === 'installments') {
      fetchInstallmentsData();
    } else if (activeTab === 'audit') {
      fetchAuditTrailData();
    }
  }, [activeTab, selectedChequeStatus, auditTimeRange]);

  const fetchAccountsData = async () => {
    setLoading(true);
    try {
      const res = await api.getAccounts({ type: selectedTypeFilter, search: searchQuery });
      setAccounts(res.accounts || []);
      setAccountsSummary(res.summary || null);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankCashAccounts = async () => {
    try {
      const res = await api.getBankAndCashAccounts();
      setBankAndCashAccounts(res || []);
    } catch (err) {
      console.error('Failed to fetch bank/cash accounts:', err);
    }
  };

  const fetchChequesData = async () => {
    setLoading(true);
    try {
      const res = await api.getSecurityCheques({ status: selectedChequeStatus, search: searchQuery });
      setCheques(res.cheques || []);
      setChequesStats(res.stats || null);
    } catch (err) {
      console.error('Failed to fetch cheques:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallmentsData = async () => {
    setLoading(true);
    try {
      const res = await api.getInstallmentPlans({ search: searchQuery });
      setInstallmentPlans(res.plans || []);
      setInstallmentStats(res.stats || null);
    } catch (err) {
      console.error('Failed to fetch installments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditTrailData = async () => {
    setLoading(true);
    try {
      const params = { timeRange: auditTimeRange, search: searchQuery };
      if (auditTimeRange === 'CUSTOM' && auditDateCustom.startDate) {
        params.startDate = auditDateCustom.startDate;
        params.endDate = auditDateCustom.endDate;
      }
      const res = await api.getAuditTrail(params);
      setAuditTransactions(res.transactions || []);
      setAuditAnalytics(res.analytics || null);
    } catch (err) {
      console.error('Failed to fetch audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChassis = async (e) => {
    e?.preventDefault();
    if (!chassisSearchInput.trim()) return;
    setChassisLoading(true);
    try {
      const res = await api.getChassisMultiSaleTracker(chassisSearchInput.trim());
      setChassisTrackerData(res);
    } catch (err) {
      alert(err.message || 'Failed to search chassis tracker');
    } finally {
      setChassisLoading(false);
    }
  };

  const handleOpenLedger = async (account) => {
    setSelectedAccountLedger(account);
    setIsLedgerModalOpen(true);
    setLedgerLoading(true);
    try {
      const res = await api.getAccountLedger(account.id, ledgerDateFilter);
      setSelectedAccountLedger(res);
    } catch (err) {
      alert(err.message || 'Failed to load ledger statement');
    } finally {
      setLedgerLoading(false);
    }
  };

  const generateNextAccountCode = (type, subType, existingAccounts = []) => {
    const typePrefixMap = { 
      ASSET: '1', 
      LIABILITY: '2', 
      EQUITY: '3', 
      REVENUE: '4', 
      EXPENSE: '5' 
    };
    const prefix = typePrefixMap[type] || '1';
    const existingCodes = new Set(existingAccounts.map(a => String(a.code || '').trim()));
    
    let candidate = parseInt(`${prefix}001`, 10);
    if (type === 'ASSET') {
      if (subType === 'CASH') candidate = 1001;
      else if (subType === 'BANK') candidate = 1010;
      else if (subType === 'CUSTOMER') candidate = 1050;
      else if (subType === 'INVENTORY') candidate = 1100;
    } else if (type === 'LIABILITY') {
      if (subType === 'VENDOR') candidate = 2001;
      else if (subType === 'LOAN') candidate = 2050;
    }
    
    while (existingCodes.has(String(candidate))) {
      candidate++;
    }
    return String(candidate);
  };

  const openAddAccountModal = (defaultType = 'EXPENSE', defaultSubType = 'EXPENSE') => {
    const autoCode = generateNextAccountCode(defaultType, defaultSubType, accounts);
    setAccountFormData({
      code: autoCode,
      name: '',
      type: defaultType,
      subType: defaultSubType,
      bankName: '',
      accountNumber: '',
      branch: '',
      openingBalance: '',
      description: ''
    });
    setIsAddAccountModalOpen(true);
  };

  const handleAccountTypeChange = (newType) => {
    let newSubType = newType;
    if (newType === 'ASSET') newSubType = 'BANK';
    else if (newType === 'LIABILITY') newSubType = 'VENDOR';
    else if (newType === 'EXPENSE') newSubType = 'EXPENSE';
    else if (newType === 'REVENUE') newSubType = 'REVENUE';
    else if (newType === 'EQUITY') newSubType = 'CAPITAL';

    const newCode = generateNextAccountCode(newType, newSubType, accounts);
    setAccountFormData(prev => ({
      ...prev,
      type: newType,
      subType: newSubType,
      code: newCode
    }));
  };

  const handleAccountSubTypeChange = (newSubType) => {
    const newCode = generateNextAccountCode(accountFormData.type, newSubType, accounts);
    setAccountFormData(prev => ({
      ...prev,
      subType: newSubType,
      code: newCode
    }));
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await api.createAccount(accountFormData);
      setIsAddAccountModalOpen(false);
      setAccountFormData({
        code: '',
        name: '',
        type: 'EXPENSE',
        subType: 'EXPENSE',
        bankName: '',
        accountNumber: '',
        branch: '',
        openingBalance: '',
        description: ''
      });
      fetchAccountsData();
      fetchBankCashAccounts();
    } catch (err) {
      alert(err.message || 'Failed to create account');
    }
  };

  const handleTransferFunds = async (e) => {
    e.preventDefault();
    try {
      await api.transferFunds(transferFormData);
      setIsTransferModalOpen(false);
      setTransferFormData({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        referenceNumber: '',
        notes: ''
      });
      fetchAccountsData();
      fetchBankCashAccounts();
      alert('Funds transferred successfully!');
    } catch (err) {
      alert(err.message || 'Transfer failed');
    }
  };

  const handleCreateCheque = async (e) => {
    e.preventDefault();
    try {
      await api.createSecurityCheque(chequeFormData);
      setIsAddChequeModalOpen(false);
      setChequeFormData({
        chequeNumber: '',
        type: 'ISSUED',
        bankAccountId: '',
        bankName: '',
        partyName: '',
        partyPhone: '',
        partyCnic: '',
        amount: '',
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: '',
        chassisNumber: '',
        notes: ''
      });
      fetchChequesData();
      alert('Security cheque recorded successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create security cheque');
    }
  };

  const handleClearChequeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChequeToClear) return;
    try {
      await api.updateChequeStatus(selectedChequeToClear.id, {
        status: 'CLEARED',
        clearedBankAccountId: clearingForm.bankAccountId,
        clearingDate: clearingForm.clearingDate || new Date().toISOString().slice(0, 10),
        notes: clearingForm.notes
      });
      setIsClearChequeModalOpen(false);
      setSelectedChequeToClear(null);
      fetchChequesData();
      fetchAccountsData();
      fetchBankCashAccounts();
      alert('Security cheque marked as CLEARED and bank balance deducted!');
    } catch (err) {
      alert(err.message || 'Failed to clear cheque');
    }
  };

  const handleRecordInstallmentPayment = async (e) => {
    e.preventDefault();
    if (!selectedInstallmentPlan) return;
    try {
      await api.recordInstallmentPayment(selectedInstallmentPlan.id, paymentFormData);
      setIsPaymentModalOpen(false);
      setPaymentFormData({
        itemId: '',
        paymentMethod: 'CASH',
        bankAccountId: '',
        paidAmount: '',
        paidDate: new Date().toISOString().slice(0, 10),
        receiptNumber: '',
        notes: ''
      });
      // Refresh single plan & all plans
      const updated = await api.getInstallmentPlanById(selectedInstallmentPlan.id);
      setSelectedInstallmentPlan(updated);
      fetchInstallmentsData();
      fetchAccountsData();
      fetchBankCashAccounts();
      alert('Installment payment recorded and posted to ledgers!');
    } catch (err) {
      alert(err.message || 'Payment recording failed');
    }
  };

  const handleCreateInstallmentPlan = async (e) => {
    e.preventDefault();
    try {
      await api.createInstallmentPlan(newPlanFormData);
      setIsAddPlanModalOpen(false);
      setNewPlanFormData({
        customerName: '',
        customerPhone: '',
        customerCnic: '',
        vehicleName: '',
        registrationNo: '',
        chassisNumber: '',
        totalPrice: '',
        advanceAmount: '',
        totalInstallments: 12,
        installmentAmount: '',
        frequency: 'MONTHLY',
        startDate: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      fetchInstallmentsData();
      alert('Installment Plan created successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create plan');
    }
  };

  // --- EDIT & DELETE HANDLERS ---

  // 1. Account Edit & Delete
  const handleOpenEditAccount = (acc) => {
    setSelectedAccountToEdit(acc);
    setEditAccountFormData({
      code: acc.code || '',
      name: acc.name || '',
      type: acc.type || 'EXPENSE',
      subType: acc.subType || 'EXPENSE',
      bankName: acc.bankName || '',
      accountNumber: acc.accountNumber || '',
      branch: acc.branch || '',
      openingBalance: acc.openingBalance !== undefined ? acc.openingBalance : '',
      currentBalance: acc.currentBalance !== undefined ? acc.currentBalance : '',
      description: acc.description || '',
      isActive: acc.isActive !== undefined ? acc.isActive : true
    });
    setIsEditAccountModalOpen(true);
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (!selectedAccountToEdit) return;
    try {
      await api.updateAccount(selectedAccountToEdit.id, editAccountFormData);
      setIsEditAccountModalOpen(false);
      setSelectedAccountToEdit(null);
      fetchAccountsData();
      fetchBankCashAccounts();
      alert('Account updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update account');
    }
  };

  const handleDeleteAccount = async (acc) => {
    const isBank = acc.subType === 'BANK';
    const confirmPrompt = window.confirm(
      `Are you sure you want to delete ${isBank ? 'bank account' : 'account'} "${acc.name}" (${acc.code})?\n\nThis will remove it from the Chart of Accounts and safely clean up unposted associations.`
    );
    if (!confirmPrompt) return;

    try {
      await api.deleteAccount(acc.id);
      fetchAccountsData();
      fetchBankCashAccounts();
      alert(`${isBank ? 'Bank account' : 'Account'} deleted successfully!`);
    } catch (err) {
      alert(err.message || 'Failed to delete account');
    }
  };

  // 2. Cheque Edit & Delete
  const handleOpenEditCheque = (chq) => {
    setSelectedChequeToEdit(chq);
    setEditChequeFormData({
      chequeNumber: chq.chequeNumber || '',
      type: chq.type || 'ISSUED',
      bankAccountId: chq.bankAccountId || '',
      bankName: chq.bankName || '',
      partyName: chq.partyName || '',
      partyPhone: chq.partyPhone || '',
      partyCnic: chq.partyCnic || '',
      amount: chq.amount || '',
      issueDate: chq.issueDate ? new Date(chq.issueDate).toISOString().slice(0, 10) : '',
      dueDate: chq.dueDate ? new Date(chq.dueDate).toISOString().slice(0, 10) : '',
      status: chq.status || 'ISSUED',
      chassisNumber: chq.chassisNumber || '',
      notes: chq.notes || ''
    });
    setIsEditChequeModalOpen(true);
  };

  const handleUpdateCheque = async (e) => {
    e.preventDefault();
    if (!selectedChequeToEdit) return;
    try {
      await api.updateSecurityCheque(selectedChequeToEdit.id, editChequeFormData);
      setIsEditChequeModalOpen(false);
      setSelectedChequeToEdit(null);
      fetchChequesData();
      fetchAccountsData();
      fetchBankCashAccounts();
      alert('Security cheque updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update security cheque');
    }
  };

  const handleDeleteCheque = async (chq) => {
    if (!window.confirm(`Are you sure you want to delete Security Cheque #${chq.chequeNumber} for ${chq.partyName}?`)) return;
    try {
      await api.deleteSecurityCheque(chq.id);
      fetchChequesData();
      alert('Security cheque deleted successfully!');
    } catch (err) {
      alert(err.message || 'Failed to delete security cheque');
    }
  };

  // 3. Installment Plan Edit & Delete
  const handleOpenEditPlan = (plan) => {
    setSelectedPlanToEdit(plan);
    setEditPlanFormData({
      customerName: plan.customerName || '',
      customerPhone: plan.customerPhone || '',
      customerCnic: plan.customerCnic || '',
      customerAddress: plan.customerAddress || '',
      vehicleName: plan.vehicleName || '',
      registrationNo: plan.registrationNo || '',
      chassisNumber: plan.chassisNumber || '',
      totalPrice: plan.totalPrice !== undefined ? plan.totalPrice : '',
      advanceAmount: plan.advanceAmount !== undefined ? plan.advanceAmount : '',
      remainingAmount: plan.remainingAmount !== undefined ? plan.remainingAmount : '',
      status: plan.status || 'ACTIVE',
      notes: plan.notes || ''
    });
    setIsEditPlanModalOpen(true);
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlanToEdit) return;
    try {
      const res = await api.updateInstallmentPlan(selectedPlanToEdit.id, editPlanFormData);
      setIsEditPlanModalOpen(false);
      if (selectedInstallmentPlan?.id === selectedPlanToEdit.id) {
        setSelectedInstallmentPlan(res.plan || null);
      }
      setSelectedPlanToEdit(null);
      fetchInstallmentsData();
      alert('Installment plan updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update installment plan');
    }
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete Installment Plan ${plan.planNumber} for ${plan.customerName} (${plan.vehicleName})?\n\nThis will remove the payment schedule and unlink associated invoices.`)) return;
    try {
      await api.deleteInstallmentPlan(plan.id);
      if (selectedInstallmentPlan?.id === plan.id) {
        setSelectedInstallmentPlan(null);
      }
      fetchInstallmentsData();
      alert('Installment plan deleted successfully!');
    } catch (err) {
      alert(err.message || 'Failed to delete installment plan');
    }
  };

  const printLedgerStatement = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* TOP EXECUTIVE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash in Hand */}
        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-400 font-semibold tracking-wider uppercase">Cash in Hand Safe</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold font-mono text-white tracking-tight">
              {formatPKR(accountsSummary?.cashInHandBalance || 0)}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Live physical showroom liquidity</p>
          </div>
        </div>

        {/* Bank Balances */}
        <div className="glass-card rounded-2xl p-4 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyan-400 font-semibold tracking-wider uppercase">Total Bank Accounts</span>
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold font-mono text-white tracking-tight">
              {formatPKR(accountsSummary?.totalBankBalance || 0)}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Across all corporate bank accounts</p>
          </div>
        </div>

        {/* Total Liquidity */}
        <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-amber-400 font-semibold tracking-wider uppercase">Total Gross Liquidity</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold font-mono text-amber-300 tracking-tight">
              {formatPKR(accountsSummary?.totalLiquidity || 0)}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Cash Safe + Active Bank Funds</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="glass-card rounded-2xl p-4 border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-slate-900 to-slate-950 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-purple-400 font-semibold tracking-wider uppercase">Net Operating Position</span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold font-mono text-purple-300 tracking-tight">
              {formatPKR(accountsSummary?.netProfit || 0)}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Revenue vs Operating Expenses</p>
          </div>
        </div>
      </div>

      {/* ACTION TOOLBAR & TAB SWITCHER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto p-1 bg-slate-900/80 rounded-2xl border border-white/10 scrollbar-none">
          {[
            { id: 'coa', label: 'Chart of Accounts', icon: Layers },
            { id: 'banks', label: 'Banks & Cash in Hand', icon: Landmark },
            { id: 'cheques', label: 'Security Cheques', icon: CreditCard },
            { id: 'installments', label: 'Installments Plans', icon: Calendar },
            { id: 'audit', label: 'Audit Trail & Day Book', icon: FileText },
            { id: 'chassis', label: 'Chassis Double-Sale Tracker', icon: Car },
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setSearchQuery(''); }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end flex-wrap gap-y-2">
          {/* Quick link to Accounts Current Stock */}
          <button
            onClick={() => onNavigate ? onNavigate('accounts_stock') : (window.location.hash = '#accounts_stock')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
            title="View Accounts Current Stock, Purchase Costs and Valuation"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Accounts Stock</span>
          </button>

          {/* Quick link to Vouchers & Invoices */}
          <button
            onClick={() => onNavigate ? onNavigate('invoices') : (window.location.hash = '#invoices')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
            title="Create and manage Payment Vouchers, Sales & Booking Receipts"
          >
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
            <span>Invoices & Payment Vouchers</span>
          </button>

          {/* Transfer Funds Button */}
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold transition-all flex items-center space-x-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Funds</span>
          </button>

          {/* Add Account Button */}
          {canManageAccounts && activeTab === 'coa' && (
            <button
              onClick={() => openAddAccountModal('EXPENSE', 'EXPENSE')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-mono font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Account</span>
            </button>
          )}

          {/* Add Cheque Button */}
          {activeTab === 'cheques' && (
            <button
              onClick={() => setIsAddChequeModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black text-xs font-mono font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Security Cheque</span>
            </button>
          )}

          {/* Add Installment Plan Button */}
          {activeTab === 'installments' && (
            <button
              onClick={() => setIsAddPlanModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black text-xs font-mono font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Installment Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHART OF ACCOUNTS & LEDGERS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'coa' && (
        <div className="space-y-4">
          {/* Sub-Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code, account name, bank..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAccountsData()}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <button
                onClick={fetchAccountsData}
                className="px-3 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono border border-white/10"
              >
                Search
              </button>
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(type => (
                <button
                  key={type}
                  onClick={() => { setSelectedTypeFilter(type); }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                    selectedTypeFilter === type
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'bg-slate-900/60 text-slate-400 hover:bg-white/5 border border-white/5'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Accounts Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Account Title / Ledger</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Subtype / Bank Info</th>
                    <th className="py-3 px-4 text-right">Current Balance</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400 font-mono">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading Chart of Accounts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500 font-mono">
                        No accounts found matching your query.
                      </td>
                    </tr>
                  ) : (
                    accounts.map(acc => {
                      const isAsset = acc.type === 'ASSET';
                      const isExpense = acc.type === 'EXPENSE';
                      const isRevenue = acc.type === 'REVENUE';
                      const isLiability = acc.type === 'LIABILITY';

                      return (
                        <tr 
                          key={acc.id} 
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                          onClick={() => handleOpenLedger(acc)}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                            {acc.code}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div className="flex items-center space-x-2">
                              <span>{acc.name}</span>
                              {acc.isSystem && (
                                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] font-mono border border-white/5">
                                  SYSTEM
                                </span>
                              )}
                            </div>
                            {acc.description && (
                              <p className="text-[11px] text-slate-400 font-normal truncate max-w-md">{acc.description}</p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isAsset ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              isLiability ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                              isRevenue ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                              isExpense ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                              'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            }`}>
                              {acc.type}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            <p>{acc.subType || 'OTHER'}</p>
                            {acc.accountNumber && (
                              <p className="text-[10px] text-slate-500 truncate">{acc.bankName} - {acc.accountNumber}</p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                            <span className={acc.currentBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {formatPKR(acc.currentBalance)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenLedger(acc); }}
                                className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-mono transition-all flex items-center space-x-1"
                                title="View Ledger"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Ledger</span>
                              </button>
                              {canManageAccounts && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenEditAccount(acc); }}
                                    className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-all"
                                    title="Edit Account"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc); }}
                                    className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-all"
                                    title="Delete Account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BANK ACCOUNTS & CASH IN HAND                                       */}
      {/* ========================================================================= */}
      {activeTab === 'banks' && (
        <div className="space-y-6">
          {/* Header Description */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Bank Accounts & Showroom Cash Safe</h3>
              <p className="text-xs text-slate-400 font-mono">Transfer funds seamlessly between Cash in Hand and corporate bank accounts.</p>
            </div>
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Transfer Cash to Bank</span>
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.filter(a => a.subType === 'CASH' || a.subType === 'BANK').length === 0 && (
              <div className="col-span-full py-16 text-center glass-card rounded-2xl border border-white/10 bg-slate-900/40">
                <Building2 className="w-12 h-12 text-cyan-400/40 mx-auto mb-3" />
                <h4 className="text-white font-bold text-base">No Bank or Cash Accounts Yet</h4>
                <p className="text-xs text-slate-400 font-mono mt-1 max-w-md mx-auto">
                  Create your first bank account or showroom cash safe ledger to track balances and fund transfers.
                </p>
                {canManageAccounts && (
                  <button
                    onClick={() => openAddAccountModal('ASSET', 'BANK')}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-mono font-bold rounded-xl shadow-lg shadow-cyan-500/20 inline-flex items-center space-x-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Bank / Cash Account</span>
                  </button>
                )}
              </div>
            )}

            {/* Cash in Hand Big Card */}
            {accounts.filter(a => a.subType === 'CASH').map(cash => (
              <div key={cash.id} className="glass-card rounded-2xl p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{cash.name}</h4>
                      <p className="text-[10px] font-mono text-emerald-400">Account Code: {cash.code}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-mono font-bold">
                    CASH SAFE
                  </span>
                </div>

                <div className="mt-6 border-t border-white/10 pt-4">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Available Cash Balance</span>
                  <h3 className="text-2xl font-black font-mono text-emerald-300 mt-1">
                    {formatPKR(cash.currentBalance)}
                  </h3>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
                  <button
                    onClick={() => handleOpenLedger(cash)}
                    className="text-xs font-mono text-cyan-400 hover:underline flex items-center space-x-1"
                  >
                    <span>View Cash Transactions</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setTransferFormData({ ...transferFormData, fromAccountId: cash.id });
                      setIsTransferModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-mono hover:bg-emerald-500/30 transition-all"
                  >
                    Deposit to Bank
                  </button>
                </div>
              </div>
            ))}

            {/* Bank Accounts Cards */}
            {accounts.filter(a => a.subType === 'BANK').map(bank => (
              <div key={bank.id} className="glass-card rounded-2xl p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{bank.bankName || bank.name}</h4>
                      <p className="text-[10px] font-mono text-cyan-400">Account #{bank.code}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full text-[10px] font-mono">
                    BANK ACCOUNT
                  </span>
                </div>

                <div className="mt-3 space-y-1">
                  <p className="text-xs text-slate-300 font-mono truncate">{bank.name}</p>
                  <p className="text-[11px] font-mono text-slate-400 truncate">
                    IBAN/Acc: {bank.accountNumber || 'Not specified'}
                  </p>
                  {bank.branch && <p className="text-[10px] text-slate-500">Branch: {bank.branch}</p>}
                </div>

                <div className="mt-4 border-t border-white/10 pt-3">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Available Bank Balance</span>
                  <h3 className="text-2xl font-black font-mono text-cyan-300 mt-1">
                    {formatPKR(bank.currentBalance)}
                  </h3>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5 flex-wrap gap-2">
                  <button
                    onClick={() => handleOpenLedger(bank)}
                    className="text-xs font-mono text-cyan-400 hover:underline flex items-center space-x-1"
                  >
                    <span>Account Statement</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        setTransferFormData({ ...transferFormData, fromAccountId: bank.id });
                        setIsTransferModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-mono hover:bg-cyan-500/30 transition-all"
                    >
                      Transfer
                    </button>
                    {canManageAccounts && (
                      <>
                        <button
                          onClick={() => handleOpenEditAccount(bank)}
                          className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-all"
                          title="Edit Bank Account"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(bank)}
                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-all"
                          title="Delete Bank Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SECURITY CHEQUES MANAGEMENT                                        */}
      {/* ========================================================================= */}
      {activeTab === 'cheques' && (
        <div className="space-y-4">
          {/* Sub-Filters & Status Pills */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search cheque #, party name, chassis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchChequesData()}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <button
                onClick={fetchChequesData}
                className="px-3 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono border border-white/10"
              >
                Search
              </button>
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'ISSUED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'CANCELLED'].map(st => (
                <button
                  key={st}
                  onClick={() => setSelectedChequeStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                    selectedChequeStatus === st
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-slate-900/60 text-slate-400 hover:bg-white/5 border border-white/5'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Cheques Grid / Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Cheque Number</th>
                    <th className="py-3 px-4">Payee / Party Name</th>
                    <th className="py-3 px-4">Bank Account</th>
                    <th className="py-3 px-4">Due / Maturity Date</th>
                    <th className="py-3 px-4 text-right">Amount (PKR)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 font-mono">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading Security Cheques...</span>
                        </div>
                      </td>
                    </tr>
                  ) : cheques.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500 font-mono">
                        No security cheques recorded for this filter.
                      </td>
                    </tr>
                  ) : (
                    cheques.map(chq => {
                      const isCleared = chq.status === 'CLEARED';
                      const isIssued = chq.status === 'ISSUED';
                      const isBounced = chq.status === 'BOUNCED';

                      return (
                        <tr key={chq.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            {chq.chequeNumber}
                            {chq.chassisNumber && (
                              <p className="text-[10px] text-slate-400 font-normal">Chassis: {chq.chassisNumber}</p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-white">
                            <p>{chq.partyName}</p>
                            {chq.partyPhone && (
                              <p className="text-[10px] font-mono text-slate-400">{chq.partyPhone}</p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {chq.bankAccount ? chq.bankAccount.name : chq.bankName}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {new Date(chq.dueDate).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-white">
                            {formatPKR(chq.amount)}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              isCleared ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              isIssued ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                              isBounced ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                              'bg-slate-800 text-slate-400 border-white/10'
                            }`}>
                              {chq.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5 flex-wrap gap-y-1">
                              {!isCleared && (
                                <button
                                  onClick={() => {
                                    setSelectedChequeToClear(chq);
                                    setClearingForm({
                                      bankAccountId: chq.bankAccountId || '',
                                      clearingDate: new Date().toISOString().slice(0, 10),
                                      notes: ''
                                    });
                                    setIsClearChequeModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold rounded-lg text-xs transition-colors"
                                >
                                  Clear
                                </button>
                              )}
                              {isCleared && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  Cleared
                                </span>
                              )}
                              {canManageAccounts && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditCheque(chq)}
                                    className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-all"
                                    title="Edit Security Cheque"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCheque(chq)}
                                    className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-all"
                                    title="Delete Security Cheque"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INSTALLMENTS MANAGEMENT                                            */}
      {/* ========================================================================= */}
      {activeTab === 'installments' && (
        <div className="space-y-4">
          {/* Summary Pills */}
          {installmentStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card p-3 rounded-xl border border-white/10">
                <span className="text-[10px] font-mono text-slate-400">Total Portfolio</span>
                <p className="text-base font-bold font-mono text-white mt-0.5">{formatPKR(installmentStats.totalPortfolioValue)}</p>
              </div>
              <div className="glass-card p-3 rounded-xl border border-white/10">
                <span className="text-[10px] font-mono text-emerald-400">Advance Received</span>
                <p className="text-base font-bold font-mono text-emerald-300 mt-0.5">{formatPKR(installmentStats.totalAdvanceCollected)}</p>
              </div>
              <div className="glass-card p-3 rounded-xl border border-white/10">
                <span className="text-[10px] font-mono text-cyan-400">Installments Collected</span>
                <p className="text-base font-bold font-mono text-cyan-300 mt-0.5">{formatPKR(installmentStats.totalInstallmentsCollected)}</p>
              </div>
              <div className="glass-card p-3 rounded-xl border border-white/10">
                <span className="text-[10px] font-mono text-amber-400">Outstanding Balance</span>
                <p className="text-base font-bold font-mono text-amber-300 mt-0.5">{formatPKR(installmentStats.totalOutstandingRemaining)}</p>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer name, phone, CNIC, chassis, vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchInstallmentsData()}
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <button
              onClick={fetchInstallmentsData}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono border border-white/10"
            >
              Search
            </button>
          </div>

          {/* Installment Plans Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Plan #</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Vehicle / Chassis</th>
                    <th className="py-3 px-4 text-right">Total Price</th>
                    <th className="py-3 px-4 text-right">Remaining Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Schedule Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 font-mono">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading Installment Plans...</span>
                        </div>
                      </td>
                    </tr>
                  ) : installmentPlans.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500 font-mono">
                        No installment plans recorded yet.
                      </td>
                    </tr>
                  ) : (
                    installmentPlans.map(p => {
                      const isCompleted = p.status === 'COMPLETED';

                      return (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                            {p.planNumber}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-white">
                            <p>{p.customerName}</p>
                            <p className="text-[10px] font-mono text-slate-400">{p.customerPhone || 'No Phone'} • {p.customerCnic || ''}</p>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            <p className="font-semibold text-white">{p.vehicleName}</p>
                            <p className="text-[10px] text-slate-400">Chassis: {p.chassisNumber || 'N/A'}</p>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                            {formatPKR(p.totalPrice)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                            {formatPKR(p.remainingAmount)}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              isCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            }`}>
                              {p.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => setSelectedInstallmentPlan(p)}
                                className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-mono transition-all flex items-center space-x-1"
                                title="View Schedule"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>Schedule</span>
                              </button>
                              {canManageAccounts && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditPlan(p)}
                                    className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-all"
                                    title="Edit Installment Plan"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlan(p)}
                                    className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-all"
                                    title="Delete Installment Plan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FINANCIAL AUDIT TRAIL & REAL-TIME DAY BOOK                         */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['TODAY', 'THIS_MONTH', 'THIS_YEAR'].map(period => (
                <button
                  key={period}
                  onClick={() => setAuditTimeRange(period)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                    auditTimeRange === period
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'bg-slate-900/60 text-slate-400 hover:bg-white/5 border border-white/5'
                  }`}
                >
                  {period.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={printLedgerStatement}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Day Book Report</span>
            </button>
          </div>

          {/* Analytics Summary */}
          {auditAnalytics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="glass-card p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Total Inflow (Cash + Bank)</span>
                <h3 className="text-xl font-bold font-mono text-emerald-300 mt-1">
                  +{formatPKR(auditAnalytics.totalGrossInflow)}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Cash: {formatPKR(auditAnalytics.cash.inflow)} • Bank: {formatPKR(auditAnalytics.bank.inflow)}
                </p>
              </div>

              <div className="glass-card p-4 rounded-xl border border-rose-500/20 bg-rose-950/20">
                <span className="text-[10px] font-mono text-rose-400 font-bold uppercase">Total Outflow (Spent / Paid)</span>
                <h3 className="text-xl font-bold font-mono text-rose-300 mt-1">
                  -{formatPKR(auditAnalytics.totalGrossOutflow)}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Cash: {formatPKR(auditAnalytics.cash.outflow)} • Bank: {formatPKR(auditAnalytics.bank.outflow)}
                </p>
              </div>

              <div className="glass-card p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Net Period Change</span>
                <h3 className={`text-xl font-bold font-mono mt-1 ${auditAnalytics.netLiquidityChange >= 0 ? 'text-cyan-300' : 'text-rose-300'}`}>
                  {formatPKR(auditAnalytics.netLiquidityChange)}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Closing funds change in selected period</p>
              </div>
            </div>
          )}

          {/* Audit Transactions List */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Txn Number</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Financial Description</th>
                    <th className="py-3 px-4">Accounts Involved</th>
                    <th className="py-3 px-4 text-right">Amount (PKR)</th>
                    <th className="py-3 px-4 text-right">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 font-mono">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading Real-time Audit Trail...</span>
                        </div>
                      </td>
                    </tr>
                  ) : auditTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500 font-mono">
                        No financial events recorded in this timeframe.
                      </td>
                    </tr>
                  ) : (
                    auditTransactions.map(txn => {
                      return (
                        <tr key={txn.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                            {new Date(txn.date).toLocaleDateString()} {new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">
                            {txn.transactionNumber}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                              {txn.type}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-white font-medium max-w-xs truncate">
                            {txn.description}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                            {txn.entries.map(e => (
                              <div key={e.id} className="flex items-center space-x-1">
                                <span className={e.type === 'DEBIT' ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                                  {e.type === 'DEBIT' ? 'DR:' : 'CR:'}
                                </span>
                                <span className="truncate max-w-[150px]">{e.account?.name}</span>
                              </div>
                            ))}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                            {formatPKR(txn.amount)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                            {txn.createdByUser?.name || 'System'}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CHASSIS MULTI-SALE & DOUBLE-SALE TRACKER                           */}
      {/* ========================================================================= */}
      {activeTab === 'chassis' && (
        <div className="space-y-5">
          {/* Chassis Search Bar */}
          <div className="glass-card rounded-2xl p-5 border border-cyan-500/20 bg-slate-900/60">
            <h3 className="text-base font-bold text-white mb-1">Chassis Multi-Sale & Double-Sale Segregation Tracker</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Search any Chassis Number to segregate multiple sales of the same undelivered vehicle across time, view separate customer receipts, and track open dealership liabilities.
            </p>

            <form onSubmit={handleSearchChassis} className="flex items-center space-x-3">
              <div className="relative flex-1">
                <Car className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Enter Chassis Number (e.g. NZE141-908213)..."
                  value={chassisSearchInput}
                  onChange={(e) => setChassisSearchInput(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={chassisLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2"
              >
                {chassisLoading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Track Chassis Journey</span>
              </button>
            </form>
          </div>

          {/* Tracker Results */}
          {chassisTrackerData && (
            <div className="space-y-4">
              {/* Alert if Double Sale Detected */}
              {chassisTrackerData.isDoubleSaleDetected && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between text-amber-300">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-6 h-6 flex-shrink-0 animate-bounce text-amber-400" />
                    <div>
                      <h4 className="font-bold text-sm">Multiple Sales Detected on Single Chassis ({chassisTrackerData.chassisNumber})</h4>
                      <p className="text-xs text-amber-200/80">
                        This chassis has been sold to {chassisTrackerData.summary.totalSalesCount} different customers. Total funds received: {formatPKR(chassisTrackerData.summary.totalFundsCollected)}.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-mono font-bold">
                    DOUBLE SALE SEGREGATION ACTIVE
                  </span>
                </div>
              )}

              {/* Segregated Sales Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chassisTrackerData.salesCycles.map((cycle, idx) => {
                  const isUndelivered = cycle.deliveryStatus === 'UNDELIVERED';

                  return (
                    <div 
                      key={cycle.invoiceId} 
                      className={`glass-card rounded-2xl p-5 border ${
                        isUndelivered 
                          ? 'border-rose-500/40 bg-rose-950/20' 
                          : 'border-emerald-500/30 bg-emerald-950/20'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          SALE CYCLE #{cycle.saleCycleNumber} • {cycle.invoiceNumber}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          isUndelivered 
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' 
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        }`}>
                          {isUndelivered ? 'UNDELIVERED (OPEN LIABILITY)' : 'DELIVERED TO BUYER'}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Customer Name:</span>
                          <span className="font-bold text-white">{cycle.customerName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Phone / CNIC:</span>
                          <span className="font-mono text-slate-300">{cycle.customerPhone}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Transaction Date & Time:</span>
                          <span className="font-mono text-cyan-300">{new Date(cycle.date).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Total Agreed Price:</span>
                          <span className="font-mono font-bold text-white">{formatPKR(cycle.totalPrice)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Money Received:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatPKR(cycle.cashReceived + cycle.bankReceived)} ({cycle.paymentMethod})
                          </span>
                        </div>
                      </div>

                      {isUndelivered && (
                        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                          <strong>Dealership Liability Note:</strong> Payment was received and utilized by Al-Asr, but the physical car was re-allocated. Al-Asr owes this customer alternative stock, refund, or a security cheque.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / CREATE NEW ACCOUNT                                         */}
      {/* ========================================================================= */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-white/10 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Create New Ledger Account</h3>
              <button onClick={() => setIsAddAccountModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-mono text-slate-400">Account Code *</label>
                    <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Auto</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5001"
                      value={accountFormData.code}
                      onChange={(e) => setAccountFormData({ ...accountFormData, code: e.target.value })}
                      className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl pl-3 pr-8 py-2 text-sm text-cyan-300 font-bold focus:outline-none focus:border-cyan-400 font-mono shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const regenerated = generateNextAccountCode(accountFormData.type, accountFormData.subType, accounts);
                        setAccountFormData(prev => ({ ...prev, code: regenerated }));
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 p-1 transition-colors"
                      title="Regenerate next sequential code"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Auto-sequenced Chart of Accounts code
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Classification Type *</label>
                  <select
                    value={accountFormData.type}
                    onChange={(e) => handleAccountTypeChange(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="ASSET">ASSET (1xxx)</option>
                    <option value="LIABILITY">LIABILITY (2xxx)</option>
                    <option value="EQUITY">EQUITY (3xxx)</option>
                    <option value="REVENUE">REVENUE (4xxx)</option>
                    <option value="EXPENSE">EXPENSE (5xxx)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Prefix {accountFormData.type === 'ASSET' ? '1' : accountFormData.type === 'LIABILITY' ? '2' : accountFormData.type === 'EQUITY' ? '3' : accountFormData.type === 'REVENUE' ? '4' : '5'}xxx
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Account Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meezan Bank Showroom Account or Office Internet Expense"
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Sub-Type Category</label>
                <select
                  value={accountFormData.subType}
                  onChange={(e) => handleAccountSubTypeChange(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {accountFormData.type === 'ASSET' ? (
                    <>
                      <option value="BANK">Bank Account (1010+)</option>
                      <option value="CASH">Cash Account (1001+)</option>
                      <option value="CUSTOMER">Customer Receivable (1050+)</option>
                      <option value="INVENTORY">Inventory / Vehicle Stock (1100+)</option>
                      <option value="OTHER">Other Current / Fixed Asset</option>
                    </>
                  ) : accountFormData.type === 'LIABILITY' ? (
                    <>
                      <option value="VENDOR">Vendor / Supplier Payable (2001+)</option>
                      <option value="LOAN">Loans & Borrowings (2050+)</option>
                      <option value="OTHER">Other Current Liability</option>
                    </>
                  ) : accountFormData.type === 'EQUITY' ? (
                    <>
                      <option value="CAPITAL">Owner Capital / Equity (3001+)</option>
                      <option value="DRAWINGS">Owner Drawings</option>
                      <option value="OTHER">Retained Earnings / Reserves</option>
                    </>
                  ) : accountFormData.type === 'REVENUE' ? (
                    <>
                      <option value="REVENUE">Vehicle Sales Revenue (4001+)</option>
                      <option value="COMMISSION">Commission & Brokerage Income</option>
                      <option value="OTHER">Other Operational Income</option>
                    </>
                  ) : (
                    <>
                      <option value="EXPENSE">General Operating Expense (5001+)</option>
                      <option value="SALARY">Salaries & Payroll</option>
                      <option value="RENT">Showroom Rent & Utilities</option>
                      <option value="MAINTENANCE">Vehicle Repairs & Fuel</option>
                      <option value="MARKETING">Marketing & Advertising</option>
                      <option value="OTHER">Other Administrative Expense</option>
                    </>
                  )}
                </select>
              </div>

              {accountFormData.subType === 'BANK' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/20">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Meezan Bank"
                      value={accountFormData.bankName}
                      onChange={(e) => setAccountFormData({ ...accountFormData, bankName: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Account / IBAN #</label>
                    <input
                      type="text"
                      placeholder="PK89 MEZN..."
                      value={accountFormData.accountNumber}
                      onChange={(e) => setAccountFormData({ ...accountFormData, accountNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Opening Balance (PKR)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={accountFormData.openingBalance}
                  onChange={(e) => setAccountFormData({ ...accountFormData, openingBalance: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Description / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Details regarding this ledger..."
                  value={accountFormData.description}
                  onChange={(e) => setAccountFormData({ ...accountFormData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TRANSFER FUNDS (CASH TO BANK / BANK TO BANK)                     */}
      {/* ========================================================================= */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-cyan-500/30 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Transfer Funds</h3>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferFunds} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">From Source Account (Cash Safe / Bank) *</label>
                <select
                  required
                  value={transferFormData.fromAccountId}
                  onChange={(e) => setTransferFormData({ ...transferFormData, fromAccountId: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">-- Select Source Account --</option>
                  {bankAndCashAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.subType}] {acc.name} — Balance: Rs. {acc.currentBalance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">To Destination Account (Bank / Cash) *</label>
                <select
                  required
                  value={transferFormData.toAccountId}
                  onChange={(e) => setTransferFormData({ ...transferFormData, toAccountId: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">-- Select Destination Account --</option>
                  {bankAndCashAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.subType}] {acc.name} — Balance: Rs. {acc.currentBalance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Transfer Amount (PKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500000"
                    value={transferFormData.amount}
                    onChange={(e) => setTransferFormData({ ...transferFormData, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  {transferFormData.amount && (
                    <p className="text-[10px] text-cyan-400 font-mono mt-1">{getPriceHint(transferFormData.amount)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Transfer Date</label>
                  <input
                    type="date"
                    value={transferFormData.date}
                    onChange={(e) => setTransferFormData({ ...transferFormData, date: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Bank Deposit Slip / Ref #</label>
                <input
                  type="text"
                  placeholder="Slip # or Online Transfer Ref"
                  value={transferFormData.referenceNumber}
                  onChange={(e) => setTransferFormData({ ...transferFormData, referenceNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Transfer Remarks / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Cash deposited from showroom safe to Meezan Bank"
                  value={transferFormData.notes}
                  onChange={(e) => setTransferFormData({ ...transferFormData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RUNNING LEDGER STATEMENT & PRINT DRAWER                          */}
      {/* ========================================================================= */}
      {isLedgerModalOpen && selectedAccountLedger && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-4xl border border-white/10 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10 flex-shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-white">{selectedAccountLedger.account?.name || selectedAccountLedger.name}</h3>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-mono">
                    Code: {selectedAccountLedger.account?.code || selectedAccountLedger.code}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Type: {selectedAccountLedger.account?.type || selectedAccountLedger.type} • Subtype: {selectedAccountLedger.account?.subType || selectedAccountLedger.subType}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={printLedgerStatement}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ledger</span>
                </button>
                <button onClick={() => setIsLedgerModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Balances Summary Bar */}
            <div className="grid grid-cols-3 gap-3 py-3 border-b border-white/10 flex-shrink-0 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-[10px] font-mono text-slate-400">Total Debits</span>
                <p className="text-sm font-bold font-mono text-emerald-400">
                  {formatPKR(selectedAccountLedger.totalDebit || 0)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-[10px] font-mono text-slate-400">Total Credits</span>
                <p className="text-sm font-bold font-mono text-rose-400">
                  {formatPKR(selectedAccountLedger.totalCredit || 0)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-[10px] font-mono text-cyan-400">Closing Balance</span>
                <p className="text-sm font-bold font-mono text-white">
                  {formatPKR(selectedAccountLedger.closingBalance || selectedAccountLedger.currentBalance || 0)}
                </p>
              </div>
            </div>

            {/* Scrollable Entries List */}
            <div className="overflow-y-auto flex-1 mt-4 divide-y divide-white/5">
              {ledgerLoading ? (
                <div className="py-12 text-center text-slate-400 font-mono">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading ledger transactions...</span>
                  </div>
                </div>
              ) : selectedAccountLedger.entries?.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono">
                  No recorded transactions in this ledger yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-slate-400 font-mono text-[10px] uppercase border-b border-white/10">
                      <th className="py-2">Date & Time</th>
                      <th className="py-2">Txn / Ref #</th>
                      <th className="py-2">Particulars / Description</th>
                      <th className="py-2 text-right">Debit (In)</th>
                      <th className="py-2 text-right">Credit (Out)</th>
                      <th className="py-2 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedAccountLedger.entries?.map(entry => {
                      const isDebit = entry.entryType === 'DEBIT';
                      return (
                        <tr key={entry.id} className="hover:bg-white/5">
                          <td className="py-2.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 font-mono text-cyan-400 font-semibold whitespace-nowrap">
                            {entry.transactionNumber}
                          </td>
                          <td className="py-2.5 text-white">
                            <p className="font-medium">{entry.description}</p>
                            {entry.referenceNumber && (
                              <p className="text-[10px] font-mono text-slate-400">Ref: {entry.referenceNumber} {entry.chassisNumber ? `• Chassis: ${entry.chassisNumber}` : ''}</p>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                            {isDebit ? formatPKR(entry.amount) : '-'}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-rose-400">
                            {!isDebit ? formatPKR(entry.amount) : '-'}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-slate-200">
                            {formatPKR(entry.runningBalance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ISSUE SECURITY CHEQUE                                            */}
      {/* ========================================================================= */}
      {isAddChequeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-amber-500/30 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Issue Security Cheque</h3>
              <button onClick={() => setIsAddChequeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCheque} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Cheque Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 78912345"
                    value={chequeFormData.chequeNumber}
                    onChange={(e) => setChequeFormData({ ...chequeFormData, chequeNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Bank Account</label>
                  <select
                    value={chequeFormData.bankAccountId}
                    onChange={(e) => setChequeFormData({ ...chequeFormData, bankAccountId: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="">-- Select Bank Account --</option>
                    {bankAndCashAccounts.filter(a => a.subType === 'BANK').map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName || bank.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Payee / Party Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Person / Supplier whom Al-Asr owes money"
                  value={chequeFormData.partyName}
                  onChange={(e) => setChequeFormData({ ...chequeFormData, partyName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Party Phone</label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={chequeFormData.partyPhone}
                    onChange={(e) => setChequeFormData({ ...chequeFormData, partyPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Chassis Number</label>
                  <input
                    type="text"
                    placeholder="Linked vehicle chassis"
                    value={chequeFormData.chassisNumber}
                    onChange={(e) => setChequeFormData({ ...chequeFormData, chassisNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Cheque Amount (PKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1000000"
                    value={chequeFormData.amount}
                    onChange={(e) => setChequeFormData({ ...chequeFormData, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  {chequeFormData.amount && (
                    <p className="text-[10px] text-amber-400 font-mono mt-1">{getPriceHint(chequeFormData.amount)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Due / Maturity Date *</label>
                  <input
                    type="date"
                    required
                    value={chequeFormData.dueDate}
                    onChange={(e) => setChequeFormData({ ...chequeFormData, dueDate: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Reason / Security Terms</label>
                <textarea
                  rows="2"
                  placeholder="Security cheque handed over due to temporary insufficient bank funds..."
                  value={chequeFormData.notes}
                  onChange={(e) => setChequeFormData({ ...chequeFormData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddChequeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Record Security Cheque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CLEAR CHEQUE & BANK DEDUCTION                                    */}
      {/* ========================================================================= */}
      {isClearChequeModalOpen && selectedChequeToClear && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md border border-emerald-500/30 shadow-2xl my-8">
            <h3 className="text-lg font-bold text-white mb-1">Clear Security Cheque</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Marking this cheque as CLEARED will deduct {formatPKR(selectedChequeToClear.amount)} from the designated bank account.
            </p>

            <form onSubmit={handleClearChequeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Deduct from Bank Account *</label>
                <select
                  required
                  value={clearingForm.bankAccountId}
                  onChange={(e) => setClearingForm({ ...clearingForm, bankAccountId: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="">-- Select Bank Account --</option>
                  {bankAndCashAccounts.filter(a => a.subType === 'BANK').map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankName || bank.name} — Balance: Rs. {bank.currentBalance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Clearing Date</label>
                <input
                  type="date"
                  value={clearingForm.clearingDate}
                  onChange={(e) => setClearingForm({ ...clearingForm, clearingDate: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Clearing Notes / Bank Stamp</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared via clearing house"
                  value={clearingForm.notes}
                  onChange={(e) => setClearingForm({ ...clearingForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsClearChequeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Confirm Clearance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: INSTALLMENT SCHEDULE DRAWER & RECORD PAYMENT                      */}
      {/* ========================================================================= */}
      {selectedInstallmentPlan && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-4xl border border-white/10 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 flex-shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-white">Installment Schedule ({selectedInstallmentPlan.planNumber})</h3>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-mono">
                    {selectedInstallmentPlan.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Customer: {selectedInstallmentPlan.customerName} • Vehicle: {selectedInstallmentPlan.vehicleName} (Chassis: {selectedInstallmentPlan.chassisNumber || 'N/A'})
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {canManageAccounts && (
                  <>
                    <button
                      onClick={() => handleOpenEditPlan(selectedInstallmentPlan)}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-mono flex items-center space-x-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Plan</span>
                    </button>
                    <button
                      onClick={() => handleDeletePlan(selectedInstallmentPlan)}
                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-mono flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedInstallmentPlan(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-4 gap-3 py-3 border-b border-white/10 flex-shrink-0 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-[10px] font-mono text-slate-400">Total Agreed</span>
                <p className="font-bold font-mono text-white">{formatPKR(selectedInstallmentPlan.totalPrice)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-[10px] font-mono text-emerald-400">Advance Paid</span>
                <p className="font-bold font-mono text-emerald-400">{formatPKR(selectedInstallmentPlan.advanceAmount)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-[10px] font-mono text-amber-400">Remaining Balance</span>
                <p className="font-bold font-mono text-amber-400">{formatPKR(selectedInstallmentPlan.remainingAmount)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-[10px] font-mono text-cyan-400">Monthly Amount</span>
                <p className="font-bold font-mono text-cyan-400">{formatPKR(selectedInstallmentPlan.installmentAmount)}</p>
              </div>
            </div>

            {/* Schedule Items Table */}
            <div className="overflow-y-auto flex-1 mt-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-slate-400 font-mono text-[10px] uppercase border-b border-white/10">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3 text-right">Amount (PKR)</th>
                    <th className="py-2 px-3 text-right">Paid Amount</th>
                    <th className="py-2 px-3">Payment Date & Mode</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedInstallmentPlan.items?.map(item => {
                    const isPaid = item.status === 'PAID';
                    const isOverdue = !isPaid && new Date(item.dueDate) < new Date();

                    return (
                      <tr key={item.id} className="hover:bg-white/5">
                        <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                          {item.installmentNumber}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {formatPKR(item.amount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                          {item.paidAmount > 0 ? formatPKR(item.paidAmount) : '-'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                          {item.paidDate ? `${new Date(item.paidDate).toLocaleDateString()} (${item.paymentMethod})` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            isOverdue ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'DUE'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {!isPaid && (
                            <button
                              onClick={() => {
                                setPaymentFormData({
                                  itemId: item.id,
                                  paymentMethod: 'CASH',
                                  bankAccountId: '',
                                  paidAmount: item.amount - (item.paidAmount || 0),
                                  paidDate: new Date().toISOString().slice(0, 10),
                                  receiptNumber: `INST-${item.installmentNumber}-${Date.now().toString().slice(-4)}`,
                                  notes: ''
                                });
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold rounded-lg text-xs transition-colors"
                            >
                              Collect Payment
                            </button>
                          )}
                          {isPaid && (
                            <span className="text-[11px] font-mono text-emerald-400">
                              Receipt: {item.receiptNumber || 'PAID'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: RECORD INSTALLMENT PAYMENT MODAL                                 */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md border border-emerald-500/30 shadow-2xl my-8">
            <h3 className="text-lg font-bold text-white mb-1">Record Installment Payment</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Receive payment into Cash Safe or Bank Account. Automatically updates ledgers and reduces remaining plan balance.
            </p>

            <form onSubmit={handleRecordInstallmentPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Payment Method *</label>
                <select
                  value={paymentFormData.paymentMethod}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="CASH">Cash in Hand (Showroom Safe)</option>
                  <option value="BANK">Bank Account Transfer</option>
                </select>
              </div>

              {paymentFormData.paymentMethod === 'BANK' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Deposit into Bank Account *</label>
                  <select
                    required
                    value={paymentFormData.bankAccountId}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, bankAccountId: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="">-- Select Bank Account --</option>
                    {bankAndCashAccounts.filter(a => a.subType === 'BANK').map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName || bank.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Amount Paid (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={paymentFormData.paidAmount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paidAmount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  {paymentFormData.paidAmount && (
                    <p className="text-[10px] text-emerald-400 font-mono mt-1">{getPriceHint(paymentFormData.paidAmount)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentFormData.paidDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paidDate: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Receipt Number</label>
                <input
                  type="text"
                  placeholder="e.g. REC-INST-001"
                  value={paymentFormData.receiptNumber}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, receiptNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Installment payment notes"
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Confirm & Post Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: CREATE STANDALONE INSTALLMENT PLAN                               */}
      {/* ========================================================================= */}
      {isAddPlanModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-emerald-500/30 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Create New Installment Plan</h3>
              <button onClick={() => setIsAddPlanModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInstallmentPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Customer Full Name"
                  value={newPlanFormData.customerName}
                  onChange={(e) => setNewPlanFormData({ ...newPlanFormData, customerName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={newPlanFormData.customerPhone}
                    onChange={(e) => setNewPlanFormData({ ...newPlanFormData, customerPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Customer CNIC</label>
                  <input
                    type="text"
                    placeholder="35201-..."
                    value={newPlanFormData.customerCnic}
                    onChange={(e) => setNewPlanFormData({ ...newPlanFormData, customerCnic: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Vehicle Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota Corolla Altis"
                    value={newPlanFormData.vehicleName}
                    onChange={(e) => setNewPlanFormData({ ...newPlanFormData, vehicleName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Chassis Number</label>
                  <input
                    type="text"
                    placeholder="e.g. NZE141-908123"
                    value={newPlanFormData.chassisNumber}
                    onChange={(e) => setNewPlanFormData({ ...newPlanFormData, chassisNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Total Agreed Price (PKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 3500000"
                    value={newPlanFormData.totalPrice}
                    onChange={(e) => setNewPlanFormData({ ...newPlanFormData, totalPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Advance Downpayment</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000000"
                    value={newPlanFormData.advanceAmount}
                    onChange={(e) => setNewPlanFormData({ ...newPlanFormData, advanceAmount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Total Months / Installments *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="60"
                    value={newPlanFormData.totalInstallments}
                    onChange={(e) => setNewPlanFormData({ ...newPlanFormData, totalInstallments: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newPlanFormData.startDate}
                    onChange={(e) => setNewPlanFormData({ ...newPlanFormData, startDate: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Generate Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: EDIT ACCOUNT / BANK DETAILS                                      */}
      {/* ========================================================================= */}
      {isEditAccountModalOpen && selectedAccountToEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-white/10 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Edit Account</h3>
              </div>
              <button onClick={() => setIsEditAccountModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Account Code</label>
                  <input
                    type="text"
                    value={editAccountFormData.code}
                    onChange={(e) => setEditAccountFormData({ ...editAccountFormData, code: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Classification Type *</label>
                  <select
                    value={editAccountFormData.type}
                    onChange={(e) => setEditAccountFormData({ ...editAccountFormData, type: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="EQUITY">EQUITY</option>
                    <option value="REVENUE">REVENUE</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Account Title / Name *</label>
                <input
                  type="text"
                  required
                  value={editAccountFormData.name}
                  onChange={(e) => setEditAccountFormData({ ...editAccountFormData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Sub-Type</label>
                <select
                  value={editAccountFormData.subType}
                  onChange={(e) => setEditAccountFormData({ ...editAccountFormData, subType: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="EXPENSE">Expense Account</option>
                  <option value="BANK">Bank Account</option>
                  <option value="CASH">Cash Account</option>
                  <option value="CUSTOMER">Customer Receivable</option>
                  <option value="VENDOR">Vendor / Seller Payable</option>
                  <option value="CAPITAL">Capital / Equity</option>
                  <option value="OTHER">Other Ledger</option>
                </select>
              </div>

              {editAccountFormData.subType === 'BANK' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/20">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Meezan Bank"
                      value={editAccountFormData.bankName}
                      onChange={(e) => setEditAccountFormData({ ...editAccountFormData, bankName: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Account / IBAN #</label>
                    <input
                      type="text"
                      placeholder="PK89 MEZN..."
                      value={editAccountFormData.accountNumber}
                      onChange={(e) => setEditAccountFormData({ ...editAccountFormData, accountNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-mono text-slate-400 mb-1">Branch</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Boulevard Branch"
                      value={editAccountFormData.branch}
                      onChange={(e) => setEditAccountFormData({ ...editAccountFormData, branch: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Opening Balance (PKR)</label>
                  <input
                    type="number"
                    value={editAccountFormData.openingBalance}
                    onChange={(e) => setEditAccountFormData({ ...editAccountFormData, openingBalance: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Current Balance (PKR)</label>
                  <input
                    type="number"
                    value={editAccountFormData.currentBalance}
                    onChange={(e) => setEditAccountFormData({ ...editAccountFormData, currentBalance: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Description / Notes</label>
                <textarea
                  rows="2"
                  value={editAccountFormData.description}
                  onChange={(e) => setEditAccountFormData({ ...editAccountFormData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="accountIsActive"
                  checked={editAccountFormData.isActive}
                  onChange={(e) => setEditAccountFormData({ ...editAccountFormData, isActive: e.target.checked })}
                  className="rounded border-white/10 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="accountIsActive" className="text-xs font-mono text-slate-300">
                  Account is Active in Chart of Accounts
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditAccountModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 10: EDIT SECURITY CHEQUE                                            */}
      {/* ========================================================================= */}
      {isEditChequeModalOpen && selectedChequeToEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-amber-500/30 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Edit Security Cheque</h3>
              </div>
              <button onClick={() => setIsEditChequeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCheque} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Cheque Number *</label>
                  <input
                    type="text"
                    required
                    value={editChequeFormData.chequeNumber}
                    onChange={(e) => setEditChequeFormData({ ...editChequeFormData, chequeNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Bank Account</label>
                  <select
                    value={editChequeFormData.bankAccountId}
                    onChange={(e) => setEditChequeFormData({ ...editChequeFormData, bankAccountId: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="">-- Select Bank Account --</option>
                    {bankAndCashAccounts.filter(a => a.subType === 'BANK').map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName || bank.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Payee / Party Name *</label>
                <input
                  type="text"
                  required
                  value={editChequeFormData.partyName}
                  onChange={(e) => setEditChequeFormData({ ...editChequeFormData, partyName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Party Phone</label>
                  <input
                    type="text"
                    value={editChequeFormData.partyPhone}
                    onChange={(e) => setEditChequeFormData({ ...editChequeFormData, partyPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Chassis Number</label>
                  <input
                    type="text"
                    value={editChequeFormData.chassisNumber}
                    onChange={(e) => setEditChequeFormData({ ...editChequeFormData, chassisNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Cheque Amount (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={editChequeFormData.amount}
                    onChange={(e) => setEditChequeFormData({ ...editChequeFormData, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Due / Maturity Date *</label>
                  <input
                    type="date"
                    required
                    value={editChequeFormData.dueDate}
                    onChange={(e) => setEditChequeFormData({ ...editChequeFormData, dueDate: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Cheque Status</label>
                <select
                  value={editChequeFormData.status}
                  onChange={(e) => setEditChequeFormData({ ...editChequeFormData, status: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="ISSUED">ISSUED (Active Liability)</option>
                  <option value="PRESENTED">PRESENTED at Bank</option>
                  <option value="CLEARED">CLEARED (Settled)</option>
                  <option value="BOUNCED">BOUNCED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Reason / Security Notes</label>
                <textarea
                  rows="2"
                  value={editChequeFormData.notes}
                  onChange={(e) => setEditChequeFormData({ ...editChequeFormData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditChequeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 11: EDIT INSTALLMENT PLAN                                           */}
      {/* ========================================================================= */}
      {isEditPlanModalOpen && selectedPlanToEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-emerald-500/30 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Edit Installment Plan ({selectedPlanToEdit.planNumber})</h3>
              </div>
              <button onClick={() => setIsEditPlanModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={editPlanFormData.customerName}
                  onChange={(e) => setEditPlanFormData({ ...editPlanFormData, customerName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={editPlanFormData.customerPhone}
                    onChange={(e) => setEditPlanFormData({ ...editPlanFormData, customerPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Customer CNIC</label>
                  <input
                    type="text"
                    value={editPlanFormData.customerCnic}
                    onChange={(e) => setEditPlanFormData({ ...editPlanFormData, customerCnic: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Customer Address</label>
                <input
                  type="text"
                  value={editPlanFormData.customerAddress}
                  onChange={(e) => setEditPlanFormData({ ...editPlanFormData, customerAddress: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Vehicle Name *</label>
                  <input
                    type="text"
                    required
                    value={editPlanFormData.vehicleName}
                    onChange={(e) => setEditPlanFormData({ ...editPlanFormData, vehicleName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Chassis Number</label>
                  <input
                    type="text"
                    value={editPlanFormData.chassisNumber}
                    onChange={(e) => setEditPlanFormData({ ...editPlanFormData, chassisNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Total Agreed (PKR)</label>
                  <input
                    type="number"
                    value={editPlanFormData.totalPrice}
                    onChange={(e) => setEditPlanFormData({ ...editPlanFormData, totalPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Advance (PKR)</label>
                  <input
                    type="number"
                    value={editPlanFormData.advanceAmount}
                    onChange={(e) => setEditPlanFormData({ ...editPlanFormData, advanceAmount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Remaining (PKR)</label>
                  <input
                    type="number"
                    value={editPlanFormData.remainingAmount}
                    onChange={(e) => setEditPlanFormData({ ...editPlanFormData, remainingAmount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Plan Status</label>
                <select
                  value={editPlanFormData.status}
                  onChange={(e) => setEditPlanFormData({ ...editPlanFormData, status: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="ACTIVE">ACTIVE (In Progress)</option>
                  <option value="COMPLETED">COMPLETED (Fully Paid)</option>
                  <option value="DEFAULTED">DEFAULTED (Overdue / Defaulted)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Notes / Remarks</label>
                <textarea
                  rows="2"
                  value={editPlanFormData.notes}
                  onChange={(e) => setEditPlanFormData({ ...editPlanFormData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
