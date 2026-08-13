import React, { useState, useEffect } from 'react';
import { FileCheck, Plus, Search, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function SecurityChequeManager() {
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    chequeNumber: '',
    bankName: '',
    accountHolder: '',
    type: 'RECEIVED',
    amount: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  useEffect(() => {
    fetchCheques();
  }, [search, statusFilter]);

  const fetchCheques = async () => {
    setLoading(true);
    try {
      const data = await api.getSecurityCheques({ search, status: statusFilter });
      setCheques(data);
    } catch (err) {
      console.error('Failed to fetch security cheques:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCheque = async (e) => {
    e.preventDefault();
    try {
      await api.createSecurityCheque(formData);
      setIsModalOpen(false);
      setFormData({
        chequeNumber: '', bankName: '', accountHolder: '', type: 'RECEIVED', amount: '',
        issueDate: new Date().toISOString().slice(0, 10), dueDate: new Date().toISOString().slice(0, 10), notes: ''
      });
      fetchCheques();
    } catch (err) {
      alert(err.message || 'Failed to record security cheque');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.updateChequeStatus(id, newStatus);
      fetchCheques();
    } catch (err) {
      alert(err.message || 'Failed to update cheque status');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-purple-400" />
            Security Cheques Management
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Record issued & received security cheques, track due dates, clearance, and bounce statuses.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Cheque</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cheque number, bank name, account holder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
        >
          <option value="">All Cheque Statuses</option>
          <option value="ISSUED">ISSUED / PENDING</option>
          <option value="CLEARED">CLEARED</option>
          <option value="BOUNCED">BOUNCED</option>
          <option value="RETURNED">RETURNED</option>
        </select>
      </div>

      {/* Cheques Ledger Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Cheque # & Bank Details</th>
                <th className="py-3.5 px-4">Account Holder</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Issue & Due Date</th>
                <th className="py-3.5 px-4 text-right">Amount (PKR)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {cheques.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-extrabold text-white font-mono text-sm">{c.chequeNumber}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.bankName}</p>
                  </td>

                  <td className="py-4 px-4 font-semibold text-white">
                    {c.accountHolder}
                  </td>

                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      c.type === 'RECEIVED' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                      {c.type}
                    </span>
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-300">
                    <div>Issued: {new Date(c.issueDate).toLocaleDateString()}</div>
                    <div className="text-amber-400 font-bold">Due: {new Date(c.dueDate).toLocaleDateString()}</div>
                  </td>

                  <td className="py-4 px-4 text-right font-mono font-extrabold text-cyan-400 text-sm">
                    Rs. {c.amount?.toLocaleString()}
                  </td>

                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                      c.status === 'CLEARED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      c.status === 'BOUNCED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      c.status === 'RETURNED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {c.status}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusUpdate(c.id, e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="ISSUED">ISSUED</option>
                      <option value="CLEARED">CLEARED</option>
                      <option value="BOUNCED">BOUNCED</option>
                      <option value="RETURNED">RETURNED</option>
                    </select>
                  </td>
                </tr>
              ))}

              {cheques.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No security cheques recorded matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SECURITY CHEQUE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md border border-purple-500/30 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Record Security Cheque</h3>
            <p className="text-xs text-slate-400 font-mono mb-5">
              Enter cheque details, bank name, account holder, and clearance due date.
            </p>

            <form onSubmit={handleCreateCheque} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Cheque Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'RECEIVED' })}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      formData.type === 'RECEIVED' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-400 border border-white/10'
                    }`}
                  >
                    RECEIVED (From Buyer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'ISSUED' })}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      formData.type === 'ISSUED' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-900 text-slate-400 border border-white/10'
                    }`}
                  >
                    ISSUED (To Vendor/Seller)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Cheque Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CHQ-9842104"
                  value={formData.chequeNumber}
                  onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meezan Bank / HBL / Allied Bank"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full name on cheque"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Due / Clearance Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
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
                  Save Security Cheque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
