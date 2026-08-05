import React, { useState, useEffect } from 'react';
import { Car, Plus, Search, Filter, Image as ImageIcon, Edit, Trash2, Eye, UserCheck, Phone, MapPin, Tag } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ImageDropzone from '../components/ImageDropzone';
import ImageViewerModal from '../components/ImageViewerModal';
import SellerDetailModal from '../components/SellerDetailModal';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const leadStatuses = ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation', 'Deal Closed', 'Lost', 'Cancelled', 'Incomplete'];

export default function Sellers({ search, isAddModalOpen, setIsAddModalOpen }) {
  const { user, isAdmin } = useAuth();
  const [sellers, setSellers] = useState([]);
  const [salesmenList, setSalesmenList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');

  // Modals state
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImagesModalOpen, setIsImagesModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    vehicle: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    mileage: 0,
    demandPrice: '',
    sellerName: '',
    sellerPhone: '',
    sellerCity: '',
    leadSource: 'Direct Call',
    leadReference: '',
    assignedTo: '',
    leadStatus: 'New Lead',
    comments: ''
  });

  useEffect(() => {
    fetchSellers();
    if (isAdmin) {
      fetchSalesmen();
    }
  }, [search, statusFilter, salesmanFilter]);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const data = await api.getSellers({
        search,
        leadStatus: statusFilter,
        assignedTo: salesmanFilter
      });
      setSellers(data);
    } catch (err) {
      console.error('Failed to fetch sellers:', err);
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
      color: '',
      mileage: 0,
      demandPrice: '',
      sellerName: '',
      sellerPhone: '',
      sellerCity: '',
      leadSource: 'Direct Call',
      leadReference: '',
      assignedTo: user?.id || '',
      leadStatus: 'New Lead',
      comments: ''
    });
  };

  const handleCreateSeller = async (e) => {
    e.preventDefault();
    try {
      await api.createSeller(formData);
      setIsAddModalOpen(false);
      resetForm();
      fetchSellers();
    } catch (err) {
      alert(err.message || 'Failed to create seller');
    }
  };

  const handleUpdateSeller = async (e) => {
    e.preventDefault();
    try {
      await api.updateSeller(selectedSeller.id, formData);
      setIsEditModalOpen(false);
      setSelectedSeller(null);
      fetchSellers();
    } catch (err) {
      alert(err.message || 'Failed to update seller');
    }
  };

  const handleDeleteSeller = async (id) => {
    if (!window.confirm('Are you sure you want to delete this seller record?')) return;
    try {
      await api.deleteSeller(id);
      fetchSellers();
    } catch (err) {
      alert(err.message || 'Failed to delete seller');
    }
  };

  const openEditModal = (seller) => {
    setSelectedSeller(seller);
    setFormData({
      vehicle: seller.vehicle,
      model: seller.model,
      year: seller.year,
      color: seller.color,
      mileage: seller.mileage,
      demandPrice: seller.demandPrice,
      sellerName: seller.sellerName,
      sellerPhone: seller.sellerPhone,
      sellerCity: seller.sellerCity,
      leadSource: seller.leadSource,
      leadReference: seller.leadReference || '',
      assignedTo: seller.assignedTo || '',
      leadStatus: seller.leadStatus,
      comments: seller.comments || ''
    });
    setIsEditModalOpen(true);
  };

  const openImagesModal = (seller) => {
    setSelectedSeller(seller);
    setIsImagesModalOpen(true);
  };

  const openDetailModal = (seller) => {
    setSelectedSeller(seller);
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
            Showing <strong className="text-cyan-400">{sellers.length}</strong> vehicle(s)
          </span>
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Seller Entry</span>
          </button>
        </div>
      </div>

      {/* Sellers Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Vehicle & Specs</th>
                <th className="py-3.5 px-4">Seller Contact</th>
                <th className="py-3.5 px-4">Demand Price</th>
                <th className="py-3.5 px-4">Assigned Salesman</th>
                <th className="py-3.5 px-4">Lead Status</th>
                <th className="py-3.5 px-4">Photos</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {sellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 cursor-pointer" onClick={() => openDetailModal(seller)}>
                    <div className="flex items-center space-x-3 group">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 group-hover:border-cyan-500/50 flex items-center justify-center text-cyan-400 font-mono font-bold transition-all">
                        {seller.vehicle?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-white text-sm group-hover:text-cyan-400 transition-colors">
                          {seller.vehicle} {seller.model}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {seller.year} • {seller.color} • {seller.mileage?.toLocaleString()} km
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 cursor-pointer" onClick={() => openDetailModal(seller)}>
                    <p className="font-semibold text-white hover:text-cyan-400 transition-colors">{seller.sellerName}</p>
                    <p className="text-[11px] text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      <span>{seller.sellerPhone}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{seller.sellerCity}</span>
                    </p>
                  </td>

                  <td className="py-4 px-4 font-mono font-extrabold text-cyan-400 text-sm">
                    Rs. {seller.demandPrice?.toLocaleString()}
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{seller.assignedUser?.name || 'Unassigned'}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <StatusBadge status={seller.leadStatus} />
                  </td>

                  <td className="py-4 px-4">
                    <button
                      onClick={() => openImagesModal(seller)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-white/10 text-cyan-400 rounded-lg font-mono text-[11px] flex items-center space-x-1.5 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{seller.images?.length || 0} photo(s)</span>
                    </button>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(seller)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Edit seller details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteSeller(seller.id)}
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

              {sellers.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No seller records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT SELLER MODAL */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-1">
              {isEditModalOpen ? 'Edit Seller Lead' : 'New Seller & Vehicle Entry'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-6">
              Enter vehicle parameters, seller contact info, and initial lead status.
            </p>

            <form onSubmit={isEditModalOpen ? handleUpdateSeller : handleCreateSeller} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Vehicle Make / Brand *</label>
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
                  <label className="block text-xs font-mono text-slate-400 mb-1">Car Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 911 Carrera S"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Model Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Agate Grey"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Mileage (km / miles)</label>
                  <input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Demand Price (PKR / Rs.) *</label>
                  <input
                    type="number"
                    required
                    placeholder="19800000"
                    value={formData.demandPrice}
                    onChange={(e) => setFormData({ ...formData, demandPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500 font-mono"
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Seller Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Robert Sterling"
                    value={formData.sellerName}
                    onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={formData.sellerPhone}
                    onChange={(e) => setFormData({ ...formData, sellerPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="Los Angeles"
                    value={formData.sellerCity}
                    onChange={(e) => setFormData({ ...formData, sellerCity: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
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
                <label className="block text-xs font-mono text-slate-400 mb-1">Comments / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Additional vehicle specs, condition details, service records..."
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
                  {isEditModalOpen ? 'Save Changes' : 'Save Seller Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SELLER & VEHICLE COMPLETE DETAIL MODAL */}
      {isDetailModalOpen && selectedSeller && (
        <SellerDetailModal
          seller={selectedSeller}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={(s) => {
            setIsDetailModalOpen(false);
            openEditModal(s);
          }}
          onImagesUpdated={fetchSellers}
        />
      )}

      {/* CATEGORIZED IMAGE GALLERY & LIGHTBOX MODAL */}
      {isImagesModalOpen && selectedSeller && (
        <ImageViewerModal
          seller={selectedSeller}
          onClose={() => setIsImagesModalOpen(false)}
          onImagesUpdated={fetchSellers}
        />
      )}
    </div>
  );
}
