import React, { useState, useEffect } from 'react';
import { Handshake, Plus, Search, Filter, UserCheck, Car, DollarSign, Award, CheckCircle, XCircle, Trash2, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../utils/priceFormatter';

export default function CollaborationCenter() {
  const { user, isAdmin } = useAuth();
  const [collaborations, setCollaborations] = useState([]);
  const [stats, setStats] = useState({ totalCollaborations: 0, activeCollaborations: 0, completedCollaborations: 0 });
  const [loading, setLoading] = useState(true);

  const [sellersList, setSellersList] = useState([]);
  const [buyersList, setBuyersList] = useState([]);
  const [salesmenList, setSalesmenList] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadType, setLeadType] = useState('seller'); // 'seller' | 'buyer'
  const [formData, setFormData] = useState({
    sellerId: '',
    buyerId: '',
    partnerSalesmanId: '',
    splitPercentage: 50,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [collabRes, sellersRes, buyersRes, usersRes] = await Promise.all([
        api.getCollaborations(),
        api.getSellers(),
        api.getBuyers(),
        api.getUsers()
      ]);

      if (collabRes) {
        setCollaborations(collabRes.collaborations || []);
        setStats(collabRes.stats || {});
      }

      if (sellersRes) setSellersList(sellersRes);
      if (buyersRes) setBuyersList(buyersRes);
      if (usersRes) {
        const activeSalesmen = usersRes.filter(u => u.role === 'SALESMAN' && u.status === 'ACTIVE' && u.id !== user?.id);
        setSalesmenList(activeSalesmen);
      }
    } catch (err) {
      console.error('Failed to load collaboration center data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollaboration = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        sellerId: leadType === 'seller' ? formData.sellerId : null,
        buyerId: leadType === 'buyer' ? formData.buyerId : null,
        partnerSalesmanId: formData.partnerSalesmanId,
        splitPercentage: 50,
        notes: formData.notes
      };

      await api.createCollaboration(payload);
      setIsModalOpen(false);
      setFormData({ sellerId: '', buyerId: '', partnerSalesmanId: '', splitPercentage: 50, notes: '' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to initiate collaboration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateCollaborationStatus(id, { status: newStatus });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this collaboration agreement?')) return;
    try {
      await api.deleteCollaboration(id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete collaboration');
    }
  };

  const filteredCollaborations = collaborations.filter(c => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    const primaryName = c.primarySalesman?.name?.toLowerCase() || '';
    const partnerName = c.partnerSalesman?.name?.toLowerCase() || '';
    const vehicleName = (c.seller?.vehicle || c.buyer?.vehicle || '').toLowerCase();
    const matchesSearch = !searchTerm || primaryName.includes(searchLower) || partnerName.includes(searchLower) || vehicleName.includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 font-mono text-[10px] uppercase font-bold border border-cyan-500/30">
              50-50 Split Hub
            </span>
            {isAdmin && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-mono text-[10px] uppercase font-bold border border-amber-500/30">
                Admin Oversight Mode
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Collaboration Center</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Partner with fellow sales agents on high-value seller & buyer leads. Share deals & split commissions 50-50.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-2xl text-xs shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New 50-50 Collaboration</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Joint Deals</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{stats.totalCollaborations || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <Handshake className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Active 50-50% Agreements</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.activeCollaborations || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Completed Split Deals</p>
            <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{stats.completedCollaborations || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search agent name or vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                statusFilter === st
                  ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Collaborations Cards / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCollaborations.map((collab) => {
          const leadObj = collab.seller || collab.buyer;
          const leadKind = collab.seller ? 'Seller Record' : 'Buyer Inquiry';
          const priceValue = collab.seller ? collab.seller.demandPrice : collab.buyer?.budget;

          return (
            <div key={collab.id} className="glass-card p-5 rounded-2xl border border-white/10 space-y-4 hover:border-cyan-500/30 transition-all">
              {/* Card Header: Agents Pair & Status */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/30">
                    50-50 Split
                  </span>
                  <span className="text-xs font-mono text-slate-400">{leadKind}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={collab.status}
                    onChange={(e) => handleStatusChange(collab.id, e.target.value)}
                    className="bg-slate-900 border border-white/10 text-xs font-mono text-white rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>

                  {(isAdmin || collab.primarySalesmanId === user?.id) && (
                    <button
                      onClick={() => handleDelete(collab.id)}
                      className="p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Cancel agreement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Partner Agents Visual Connection */}
              <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-white/5 font-mono text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    {collab.primarySalesman?.name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">{collab.primarySalesman?.name}</p>
                    <p className="text-[10px] text-slate-500">Initiator (50%)</p>
                  </div>
                </div>

                <div className="flex items-center text-cyan-400 font-bold space-x-1">
                  <Handshake className="w-4 h-4" />
                  <ArrowRight className="w-3 h-3" />
                </div>

                <div className="flex items-center space-x-2 text-right">
                  <div>
                    <p className="font-bold text-emerald-400 text-xs">{collab.partnerSalesman?.name}</p>
                    <p className="text-[10px] text-slate-500">Partner (50%)</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {collab.partnerSalesman?.name?.charAt(0) || 'S'}
                  </div>
                </div>
              </div>

              {/* Associated Lead Details */}
              {leadObj && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white flex items-center space-x-1.5">
                      <Car className="w-4 h-4 text-cyan-400" />
                      <span>{leadObj.vehicle} {leadObj.model} ({leadObj.year})</span>
                    </p>
                    <p className="text-xs font-mono font-extrabold text-emerald-400">
                      {formatPKR(priceValue)}
                    </p>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400">
                    Client: {collab.seller?.sellerName || collab.buyer?.buyerName} • City: {collab.seller?.sellerCity || collab.buyer?.buyerCity}
                  </p>
                </div>
              )}

              {collab.notes && (
                <p className="text-xs text-slate-400 bg-slate-900/40 p-2.5 rounded-xl font-mono text-[11px] border border-white/5">
                  <MessageSquare className="w-3 h-3 text-cyan-400 inline mr-1.5" />
                  {collab.notes}
                </p>
              )}
            </div>
          );
        })}

        {filteredCollaborations.length === 0 && !loading && (
          <div className="col-span-full glass-card p-12 text-center text-slate-500 font-mono text-xs rounded-2xl border border-white/10">
            No active 50-50 collaboration agreements found. Click "+ New 50-50 Collaboration" to partner with a teammate!
          </div>
        )}
      </div>

      {/* CREATE COLLABORATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-white/10 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-1">Initiate 50-50% Commission Collaboration</h3>
            <p className="text-xs text-slate-400 font-mono mb-5">
              Select a seller or buyer lead and pick a partner sales agent to split the 50-50 commission.
            </p>

            <form onSubmit={handleCreateCollaboration} className="space-y-4">
              {/* Lead Type Switcher */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Choose Lead Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setLeadType('seller'); setFormData(p => ({ ...p, buyerId: '' })); }}
                    className={`py-2 text-xs font-mono font-bold rounded-xl border transition-all ${
                      leadType === 'seller'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500'
                        : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    🚗 Seller Vehicle Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLeadType('buyer'); setFormData(p => ({ ...p, sellerId: '' })); }}
                    className={`py-2 text-xs font-mono font-bold rounded-xl border transition-all ${
                      leadType === 'buyer'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    👤 Buyer Inquiry Lead
                  </button>
                </div>
              </div>

              {/* Select Seller or Buyer */}
              {leadType === 'seller' ? (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Select Seller Vehicle *</label>
                  <select
                    required
                    value={formData.sellerId}
                    onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  >
                    <option value="">-- Choose Seller Inventory Item --</option>
                    {sellersList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.vehicle} {s.model} ({s.year}) - {formatPKR(s.demandPrice)} ({s.sellerName})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Select Buyer Inquiry *</label>
                  <select
                    required
                    value={formData.buyerId}
                    onChange={(e) => setFormData({ ...formData, buyerId: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  >
                    <option value="">-- Choose Buyer Inquiry Item --</option>
                    {buyersList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.vehicle} {b.model} ({b.year}) - Budget: {formatPKR(b.budget)} ({b.buyerName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Select Partner Salesman */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Partner Sales Agent *</label>
                <select
                  required
                  value={formData.partnerSalesmanId}
                  onChange={(e) => setFormData({ ...formData, partnerSalesmanId: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                >
                  <option value="">-- Choose Partner Sales Agent --</option>
                  {salesmenList.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.name} ({sm.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fixed 50-50 Split Badge */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">Commission Split Ratio:</span>
                <span className="text-cyan-400 font-extrabold px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/30">
                  50% / 50% Equal Partner Split
                </span>
              </div>

              {/* Agreement Notes */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Collaboration Notes / Remarks</label>
                <textarea
                  rows="2"
                  placeholder="E.g., Shared lead details, client meeting arrangements..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
                ></textarea>
              </div>

              {/* Modal Controls */}
              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-mono text-xs hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Submit 50-50% Agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
