import React, { useState, useEffect } from 'react';
import { Building2, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, Printer, Search } from 'lucide-react';
import { api } from '../services/api';
import { logoBase64 } from '../utils/logoBase64';

export default function CentralVaultLedger() {
  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: 'INFLOW',
    amount: '',
    category: 'SALE',
    description: '',
    referenceNo: ''
  });

  useEffect(() => {
    fetchVault();
  }, []);

  const fetchVault = async () => {
    setLoading(true);
    try {
      const data = await api.getVaultSummary();
      setVault(data);
    } catch (err) {
      console.error('Failed to fetch vault summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid positive transaction amount.');
      return;
    }

    try {
      await api.recordVaultTransaction(formData);
      setIsModalOpen(false);
      setFormData({ type: 'INFLOW', amount: '', category: 'SALE', description: '', referenceNo: '' });
      fetchVault();
    } catch (err) {
      alert(err.message || 'Failed to record transaction');
    }
  };

  const exportVaultPDF = () => {
    const printWindow = window.open('', '_blank');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const txs = vault?.transactions || [];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL-ASR MOTORS - Central Vault Account Ledger (${todayStr})</title>
          <style>
            @page { size: portrait; margin: 6mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #0f172a; margin: 0; padding: 10px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 16px; font-weight: 900; color: #0f172a; }
            .subtitle { font-size: 9px; color: #475569; }
            .summary-box { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; text-align: center; }
            .box { border: 1.5px solid #0f172a; padding: 8px; border-radius: 4px; background: #f8fafc; }
            .box-lbl { font-size: 8px; text-transform: uppercase; font-weight: 800; color: #475569; }
            .box-val { font-size: 14px; font-weight: 900; font-family: monospace; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-top: 6px; }
            th { background: #0f172a; color: white; padding: 5px; font-size: 8px; text-transform: uppercase; text-align: left; }
            td { padding: 5px; border-bottom: 1px solid #cbd5e1; font-size: 8.5px; }
            .inflow { color: #16a34a; font-weight: bold; font-family: monospace; }
            .outflow { color: #dc2626; font-weight: bold; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${logoBase64}" style="height: 42px;" />
              <div>
                <div class="title">AL-ASR MOTORS — CENTRAL COMPANY VAULT LEDGER</div>
                <div class="subtitle">Main Account Cash Inflow & Outflow Ledger Statement • Generated: ${todayStr}</div>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <div class="box">
              <div class="box-lbl">Net Vault Balance</div>
              <div class="box-val" style="color: #0284c7;">PKR ${(vault?.balance || 0).toLocaleString()}</div>
            </div>
            <div class="box">
              <div class="box-lbl">Total Cash Inflows</div>
              <div class="box-val" style="color: #16a34a;">+PKR ${(vault?.totalInflow || 0).toLocaleString()}</div>
            </div>
            <div class="box">
              <div class="box-lbl">Total Cash Outflows</div>
              <div class="box-val" style="color: #dc2626;">-PKR ${(vault?.totalOutflow || 0).toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Category</th>
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
                  <td>${t.category}</td>
                  <td>${t.description}</td>
                  <td>${t.referenceNo || '-'}</td>
                  <td style="text-align: right;" class="${t.type === 'INFLOW' ? 'inflow' : 'outflow'}">
                    ${t.type === 'INFLOW' ? '+' : '-'}Rs. ${t.amount.toLocaleString()}
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

  const filteredTransactions = (vault?.transactions || []).filter(t => 
    (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.referenceNo || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            Central Company Vault (Main Account)
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Single central account ledger tracking all incoming vehicle sales/installments and outgoing expenses.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportVaultPDF}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Ledger PDF</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record Vault Entry</span>
          </button>
        </div>
      </div>

      {/* Main Account Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card rounded-2xl p-5 border border-purple-500/30 bg-purple-500/10">
          <p className="text-xs font-mono uppercase tracking-wider text-purple-300">Net Main Vault Balance</p>
          <h3 className="text-2xl font-extrabold text-white mt-1">
            Rs. {(vault?.balance || 0).toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400 font-mono mt-2">Current liquid cash in central account</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 bg-emerald-500/10">
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">Total Vault Inflows (+)</p>
          <h3 className="text-2xl font-extrabold text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-5 h-5" />
            Rs. {(vault?.totalInflow || 0).toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400 font-mono mt-2">Cumulative incoming payments & sales</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-rose-500/30 bg-rose-500/10">
          <p className="text-xs font-mono uppercase tracking-wider text-rose-400">Total Vault Outflows (-)</p>
          <h3 className="text-2xl font-extrabold text-rose-400 mt-1 flex items-center gap-1">
            <ArrowDownRight className="w-5 h-5" />
            Rs. {(vault?.totalOutflow || 0).toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400 font-mono mt-2">Cumulative outgoing expenses & payouts</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search vault transactions by description, category, or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Transactions Ledger Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Ref No.</th>
                <th className="py-3.5 px-4 text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      tx.type === 'INFLOW' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-cyan-400">{tx.category}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{tx.description}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{tx.referenceNo || '-'}</td>
                  <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${
                    tx.type === 'INFLOW' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.type === 'INFLOW' ? '+' : '-'}Rs. {tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))}

              {filteredTransactions.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No vault transactions found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md border border-purple-500/30 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Record Central Vault Entry</h3>
            <p className="text-xs text-slate-400 font-mono mb-5">
              Post deposit (Inflow) or expense withdrawal (Outflow) to the Main Company Vault.
            </p>

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Transaction Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'INFLOW' })}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      formData.type === 'INFLOW' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 border border-white/10'
                    }`}
                  >
                    + INFLOW (Deposit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'OUTFLOW' })}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      formData.type === 'OUTFLOW' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-900 text-slate-400 border border-white/10'
                    }`}
                  >
                    - OUTFLOW (Withdrawal)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="SALE">SALE (Vehicle Sale Deposit)</option>
                  <option value="INSTALLMENT">INSTALLMENT (Installment Collection)</option>
                  <option value="EXPENSE">EXPENSE (Showroom Operating Expense)</option>
                  <option value="REFURBISHMENT">REFURBISHMENT (Car Repair Expense)</option>
                  <option value="PAYOUT">PAYOUT (Vendor / Seller Payment)</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="Details about this deposit or expense..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Reference No.</label>
                <input
                  type="text"
                  placeholder="Invoice # / Receipt # / Voucher #"
                  value={formData.referenceNo}
                  onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/20"
                >
                  Post Vault Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
