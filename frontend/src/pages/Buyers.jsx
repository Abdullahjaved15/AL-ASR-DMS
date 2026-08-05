import React, { useState, useEffect } from 'react';
import { Users, Plus, Filter, Edit, Trash2, Phone, MapPin, DollarSign, UserCheck } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import BuyerDetailModal from '../components/BuyerDetailModal';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const leadStatuses = ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation', 'Deal Closed', 'Lost', 'Cancelled', 'Incomplete'];

export default function Buyers({ search, isAddModalOpen, setIsAddModalOpen }) {
  const { user, isAdmin } = useAuth();
  const [buyers, setBuyers] = useState([]);
  const [salesmenList, setSalesmenList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');

  // Modals state
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    vehicle: '',
    model: '',
    year: new Date().getFullYear(),
    color: 'Any',
    mileage: 0,
    budget: '',
    buyerName: '',
    buyerPhone: '',
    buyerCity: '',
    leadSource: 'Website',
    leadReference: '',
    assignedTo: '',
    leadStatus: 'New Lead',
    comments: ''
  });

  useEffect(() => {
    fetchBuyers();
    if (isAdmin) {
      fetchSalesmen();
    }
  }, [search, statusFilter, salesmanFilter]);

  const fetchBuyers = async () => {
    setLoading(true);
    try {
      const data = await api.getBuyers({
        search,
        leadStatus: statusFilter,
        assignedTo: salesmanFilter
      });
      setBuyers(data);
    } catch (err) {
      console.error('Failed to fetch buyers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesmen = async () => {
    try {
      const data = await api.getUsers();
      setSalesmenList(data.filter(u => u.role === 'SALESMAN' && u.status === 'ACTIVE'));
    } catch (err) {
      console.error('Failed to fetch salesmen:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle: '',
      model: '',
      year: new Date().getFullYear(),
      color: 'Any',
      mileage: 0,
      budget: '',
      buyerName: '',
      buyerPhone: '',
      buyerCity: '',
      leadSource: 'Website',
      leadReference: '',
      assignedTo: user?.id || '',
      leadStatus: 'New Lead',
      comments: ''
    });
  };

  const handleCreateBuyer = async (e) => {
    e.preventDefault();
    try {
      await api.createBuyer(formData);
      setIsAddModalOpen(false);
      resetForm();
      fetchBuyers();
    } catch (err) {
      alert(err.message || 'Failed to create buyer');
    }
  };

  const handleUpdateBuyer = async (e) => {
    e.preventDefault();
    try {
      await api.updateBuyer(selectedBuyer.id, formData);
      setIsEditModalOpen(false);
      setSelectedBuyer(null);
      fetchBuyers();
    } catch (err) {
      alert(err.message || 'Failed to update buyer');
    }
  };

  const handleDeleteBuyer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this buyer record?')) return;
    try {
      await api.deleteBuyer(id);
      fetchBuyers();
    } catch (err) {
      alert(err.message || 'Failed to delete buyer');
    }
  };

  const openEditModal = (buyer) => {
    setSelectedBuyer(buyer);
    setFormData({
      vehicle: buyer.vehicle,
      model: buyer.model,
      year: buyer.year,
      color: buyer.color,
      mileage: buyer.mileage,
      budget: buyer.budget,
      buyerName: buyer.buyerName,
      buyerPhone: buyer.buyerPhone,
      buyerCity: buyer.buyerCity,
      leadSource: buyer.leadSource,
      leadReference: buyer.leadReference || '',
      assignedTo: buyer.assignedTo || '',
      leadStatus: buyer.leadStatus,
    });
    setIsEditModalOpen(true);
  };

  const openDetailModal = (buyer) => {
    setSelectedBuyer(buyer);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Filter Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Filter Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Lead Statuses</option>
            {leadStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {isAdmin && (
            <select
              value={salesmanFilter}
              onChange={(e) => setSalesmanFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="">All Salesmen</option>
              {salesmenList.map(sm => <option key={sm.id} value={sm.id}>{sm.name}</option>)}
            </select>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-400">
            Showing <strong className="text-cyan-400">{buyers.length}</strong> buyer inquiry(ies)
          </span>
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Buyer Inquiry</span>
          </button>
        </div>
      </div>

      {/* Buyers Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Buyer Name & Contact</th>
                <th className="py-3.5 px-4">Vehicle Desired</th>
                <th className="py-3.5 px-4">Target Budget</th>
                <th className="py-3.5 px-4">Assigned Salesman</th>
                <th className="py-3.5 px-4">Lead Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {buyers.map((buyer) => (
                <tr key={buyer.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 cursor-pointer" onClick={() => openDetailModal(buyer)}>
                    <p className="font-extrabold text-white text-sm hover:text-cyan-400 transition-colors">{buyer.buyerName}</p>
                    <p className="text-[11px] text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      <span>{buyer.buyerPhone}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{buyer.buyerCity}</span>
                    </p>
                  </td>

                  <td className="py-4 px-4 cursor-pointer" onClick={() => openDetailModal(buyer)}>
                    <p className="font-semibold text-white hover:text-cyan-400 transition-colors">{buyer.vehicle} {buyer.model}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Target Year: {buyer.year} • Color: {buyer.color}
                    </p>
                  </td>

                  <td className="py-4 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                    Rs. {buyer.budget?.toLocaleString()}
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{buyer.assignedUser?.name || 'Unassigned'}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <StatusBadge status={buyer.leadStatus} />
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(buyer)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Edit buyer details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteBuyer(buyer.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {buyers.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No buyer inquiries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT BUYER MODAL */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-1">
              {isEditModalOpen ? 'Edit Buyer Lead' : 'New Buyer Inquiry Entry'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-6">
              Enter buyer requirements, budget, and contact info.
            </p>

            <form onSubmit={isEditModalOpen ? handleUpdateBuyer : handleCreateBuyer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Buyer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Harrison Forde"
                    value={formData.buyerName}
                    onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={formData.buyerPhone}
                    onChange={(e) => setFormData({ ...formData, buyerPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="Los Angeles"
                    value={formData.buyerCity}
                    onChange={(e) => setFormData({ ...formData, buyerCity: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Desired Vehicle Make *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Porsche"
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Model / Trim *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 911"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Target Budget (PKR / Rs.) *</label>
                  <input
                    type="number"
                    required
                    placeholder="20000000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Year Preference</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Lead Pipeline Status</label>
                  <select
                    value={formData.leadStatus}
                    onChange={(e) => setFormData({ ...formData, leadStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {leadStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Assign Lead To Salesman</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="">Unassigned</option>
                    {salesmenList.map(sm => (
                      <option key={sm.id} value={sm.id}>{sm.name} ({sm.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Comments / Inquiry Notes</label>
                <textarea
                  rows="2"
                  placeholder="Specific buyer requirements, financing state, trade-in details..."
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
                >
                  {isEditModalOpen ? 'Save Changes' : 'Save Buyer Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* BUYER COMPLETE DETAIL MODAL */}
      {isDetailModalOpen && selectedBuyer && (
        <BuyerDetailModal
          buyer={selectedBuyer}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={(b) => {
            setIsDetailModalOpen(false);
            openEditModal(b);
          }}
        />
      )}
    </div>
  );
}
