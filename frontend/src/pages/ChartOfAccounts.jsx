import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, ArrowUpRight, ArrowDownRight, Printer, Eye, Building2, DollarSign, Wallet, FileText } from 'lucide-react';
import { api } from '../services/api';
import { logoBase64 } from '../utils/logoBase64';

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState(''); // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE

  // Modals
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountLedgerData, setAccountLedgerData] = useState(null);

  // Form states
  const [headForm, setHeadForm] = useState({
    accountName: '',
    accountType: 'EXPENSE',
    accountCode: '',
    description: ''
  });

  const [txForm, setTxForm] = useState({
    accountHeadId: '',
    type: 'OUTWARD',
    amount: '',
    description: '',
    referenceNo: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, [search, selectedType]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.getChartOfAccounts({ search, accountType: selectedType });
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch Chart of Accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHead = async (e) => {
    e.preventDefault();
    try {
      await api.createAccountHead(headForm);
      setIsAddHeadModalOpen(false);
      setHeadForm({ accountName: '', accountType: 'EXPENSE', accountCode: '', description: '' });
      fetchAccounts();
    } catch (err) {
      alert(err.message || 'Failed to create account head');
    }
  };

  const handleRecordTransaction = async (e) => {
    e.preventDefault();
    if (!txForm.accountHeadId || !txForm.amount) {
      alert('Account Head and Amount are required.');
      return;
    }

    try {
      await api.recordAccountTransaction(txForm);
      setIsTxModalOpen(false);
      setTxForm({ accountHeadId: '', type: 'OUTWARD', amount: '', description: '', referenceNo: '' });
      fetchAccounts();
    } catch (err) {
      alert(err.message || 'Failed to record transaction');
    }
  };

  const openLedgerModal = async (acc) => {
    setSelectedAccount(acc);
    try {
      const data = await api.getAccountLedger(acc.id);
      setAccountLedgerData(data);
      setIsLedgerModalOpen(true);
    } catch (err) {
      alert(err.message || 'Failed to fetch account ledger');
    }
  };

  const exportAccountLedgerPDF = () => {
    if (!accountLedgerData) return;
    const printWindow = window.open('', '_blank');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const acc = accountLedgerData;
    const txs = acc.transactions || [];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL-ASR MOTORS - Account Ledger Statement: ${acc.accountName} (${todayStr})</title>
          <style>
            @page { size: portrait; margin: 6mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #0f172a; margin: 0; padding: 10px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 15px; font-weight: 900; color: #0f172a; }
            .subtitle { font-size: 9px; color: #475569; }
            .acc-card { border: 1.5px solid #0f172a; padding: 8px; border-radius: 4px; background: #f8fafc; margin-bottom: 12px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-top: 6px; }
            th { background: #0f172a; color: white; padding: 5px; font-size: 8px; text-transform: uppercase; text-align: left; }
            td { padding: 5px; border-bottom: 1px solid #cbd5e1; font-size: 8.5px; }
            .inward { color: #16a34a; font-weight: bold; font-family: monospace; }
            .outward { color: #dc2626; font-weight: bold; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${logoBase64}" style="height: 40px;" />
              <div>
                <div class="title">AL-ASR MOTORS — ACCOUNT HEAD LEDGER STATEMENT</div>
                <div class="subtitle">Official Statement for [${acc.accountCode}] ${acc.accountName} • ${todayStr}</div>
              </div>
            </div>
          </div>

          <div class="acc-card">
            <div>
              <strong>Account Head:</strong> ${acc.accountName} (${acc.accountType})<br/>
              <span style="color: #64748b;">Code: ${acc.accountCode} • ${acc.description || 'No description'}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 8px; text-transform: uppercase; color: #64748b;">Current Balance</span><br/>
              <strong style="font-size: 13px; font-family: monospace; color: #0284c7;">PKR ${(acc.currentBalance || 0).toLocaleString()}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Description</th>
                <th>Ref #</th>
                <th style="text-align: right;">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              ${txs.map(t => `
                <tr>
                  <td>${new Date(t.createdAt).toLocaleString()}</td>
                  <td><strong>${t.type}</strong></td>
                  <td>${t.description}</td>
                  <td>${t.referenceNo || '-'}</td>
                  <td style="text-align: right;" class="${t.type === 'INWARD' ? 'inward' : 'outward'}">
                    ${t.type === 'INWARD' ? '+' : '-'}Rs. ${t.amount.toLocaleString()}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const openTxModalForAccount = (acc) => {
    setTxForm({
      accountHeadId: acc.id,
      type: acc.accountType === 'EXPENSE' ? 'OUTWARD' : 'INWARD',
      amount: '',
      description: '',
      referenceNo: ''
    });
    setIsTxModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Chart of Accounts & Expense Ledgers
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Open custom account heads (e.g. Media Team Expenses, Showroom Rent, Petty Cash), post cash inward/outward, and print statement ledgers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsTxModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all"
          >
            <DollarSign className="w-4 h-4" />
            <span>Record Cash Entry</span>
          </button>

          <button
            onClick={() => setIsAddHeadModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Open New Account Head</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-purple-500/30 bg-purple-500/10">
          <p className="text-xs font-mono uppercase tracking-wider text-purple-300">Total Account Heads</p>
          <h3 className="text-xl font-extrabold text-white mt-1">{accounts.length} Accounts</h3>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-rose-500/30 bg-rose-500/10">
          <p className="text-xs font-mono uppercase tracking-wider text-rose-400">Expense Ledgers</p>
          <h3 className="text-xl font-extrabold text-rose-400 mt-1">
            {accounts.filter(a => a.accountType === 'EXPENSE').length} Ledgers
          </h3>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-cyan-500/30 bg-cyan-500/10">
          <p className="text-xs font-mono uppercase tracking-wider text-cyan-400">Asset Accounts</p>
          <h3 className="text-xl font-extrabold text-cyan-400 mt-1">
            {accounts.filter(a => a.accountType === 'ASSET').length} Accounts
          </h3>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/10">
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">Revenue Accounts</p>
          <h3 className="text-xl font-extrabold text-emerald-400 mt-1">
            {accounts.filter(a => a.accountType === 'REVENUE').length} Accounts
          </h3>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex overflow-x-auto border-b border-white/10 bg-slate-900/60 p-1.5 gap-1.5 rounded-xl text-xs font-mono w-full sm:w-auto">
          {[
            { id: '', label: 'ALL ACCOUNTS' },
            { id: 'EXPENSE', label: '💸 EXPENSE LEDGERS' },
            { id: 'ASSET', label: '🏦 ASSETS' },
            { id: 'LIABILITY', label: '🤝 LIABILITIES' },
            { id: 'REVENUE', label: '📈 REVENUE' },
            { id: 'EQUITY', label: '🏛️ EQUITY' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedType === tab.id
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search account name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Accounts Directory Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Account Head Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-right">Current Ledger Balance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-purple-400">{acc.accountCode}</td>

                  <td className="py-3.5 px-4">
                    <p className="font-extrabold text-white">{acc.accountName}</p>
                    {acc.isSystemAccount && (
                      <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">SYSTEM ACCOUNT</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      acc.accountType === 'EXPENSE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      acc.accountType === 'ASSET' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                      acc.accountType === 'REVENUE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                      {acc.accountType}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{acc.description || 'N/A'}</td>

                  <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm text-cyan-400">
                    Rs. {(acc.currentBalance || 0).toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openTxModalForAccount(acc)}
                        className="px-2 py-1 rounded bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30 text-[10.5px] font-mono font-bold"
                        title="Record Payment Entry"
                      >
                        + Post Entry
                      </button>

                      <button
                        onClick={() => openLedgerModal(acc)}
                        className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 text-[10.5px] font-mono flex items-center space-x-1"
                        title="View Full Ledger Statement"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Ledger</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {accounts.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No account heads found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OPEN NEW ACCOUNT HEAD MODAL */}
      {isAddHeadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md border border-purple-500/30 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Open New Account Head</h3>
            <p className="text-xs text-slate-400 font-mono mb-5">
              Add custom sub-account ledger (e.g. Media Team Expenses, Petty Cash, Petrol & Fuel).
            </p>

            <form onSubmit={handleCreateHead} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Account Head Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Media Team Expenses"
                  value={headForm.accountName}
                  onChange={(e) => setHeadForm({ ...headForm, accountName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Account Type *</label>
                <select
                  value={headForm.accountType}
                  onChange={(e) => setHeadForm({ ...headForm, accountType: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value="EXPENSE">EXPENSE (e.g. Media Expenses, Rent, Utilities, Fuel)</option>
                  <option value="ASSET">ASSET (e.g. Bank Account, Cash in Hand, Receivables)</option>
                  <option value="LIABILITY">LIABILITY (e.g. Vendor Payables, Advances)</option>
                  <option value="REVENUE">REVENUE (e.g. Vehicle Sales, Commission)</option>
                  <option value="EQUITY">EQUITY (Owner Capital)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Account Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 5005 (Auto-generated if empty)"
                  value={headForm.accountCode}
                  onChange={(e) => setHeadForm({ ...headForm, accountCode: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Account Description</label>
                <textarea
                  rows="2"
                  placeholder="Purpose of this account head..."
                  value={headForm.description}
                  onChange={(e) => setHeadForm({ ...headForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddHeadModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/20"
                >
                  Open Account Head
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD CASH ENTRY MODAL */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md border border-purple-500/30 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Record Cash Inward / Outward Entry</h3>
            <p className="text-xs text-slate-400 font-mono mb-5">
              Post payment entry directly to an Account Head and Central Vault.
            </p>

            <form onSubmit={handleRecordAccountTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Select Account Head *</label>
                <select
                  required
                  value={txForm.accountHeadId}
                  onChange={(e) => setTxForm({ ...txForm, accountHeadId: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value="">-- Choose Account Head --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.accountCode}] {a.accountName} ({a.accountType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Payment Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'OUTWARD' })}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      txForm.type === 'OUTWARD' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-900 text-slate-400 border border-white/10'
                    }`}
                  >
                    - OUTWARD (Expense / Payment)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'INWARD' })}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      txForm.type === 'INWARD' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 border border-white/10'
                    }`}
                  >
                    + INWARD (Deposit / Income)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Transaction Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Social media advertising budget payment for August"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Reference No.</label>
                <input
                  type="text"
                  placeholder="Receipt # / Voucher #"
                  value={txForm.referenceNo}
                  onChange={(e) => setTxForm({ ...txForm, referenceNo: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/20"
                >
                  Post Payment Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACCOUNT LEDGER STATEMENT MODAL */}
      {isLedgerModalOpen && accountLedgerData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-2xl border border-purple-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  [{accountLedgerData.accountCode}] {accountLedgerData.accountName} — Ledger Statement
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Category: {accountLedgerData.accountType} • Balance: <span className="text-cyan-400 font-bold">Rs. {(accountLedgerData.currentBalance || 0).toLocaleString()}</span>
                </p>
              </div>

              <button
                onClick={exportAccountLedgerPDF}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Ledger PDF</span>
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {accountLedgerData.transactions?.map((t) => (
                <div key={t.id} className="p-3 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="font-bold text-white">{t.description}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(t.createdAt).toLocaleString()} • Ref: {t.referenceNo || 'N/A'}
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${t.type === 'INWARD' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.type === 'INWARD' ? '+' : '-'}Rs. {t.amount?.toLocaleString()}
                  </span>
                </div>
              ))}

              {(!accountLedgerData.transactions || accountLedgerData.transactions.length === 0) && (
                <div className="text-center py-10 text-slate-500 font-mono text-xs">
                  No payment entries posted to this account head yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsLedgerModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-mono font-bold"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
