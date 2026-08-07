import React, { useState, useEffect } from 'react';
import { Car, Plus, Search, Filter, Image as ImageIcon, Edit, Trash2, Eye, UserCheck, Phone, MapPin, Tag, Printer, ShieldAlert } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ImageDropzone from '../components/ImageDropzone';
import ImageViewerModal from '../components/ImageViewerModal';
import SellerDetailModal from '../components/SellerDetailModal';
import FilterBar from '../components/FilterBar';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logoBase64 } from '../utils/logoBase64';

const leadStatuses = ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation', 'Deal Closed', 'Lost', 'Cancelled', 'Incomplete'];

export default function Sellers({ search, isAddModalOpen, setIsAddModalOpen, scope = 'all' }) {
  const { user, isAdmin } = useAuth();
  const [sellers, setSellers] = useState([]);
  const [salesmenList, setSalesmenList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Multi-Filters state
  const [filters, setFilters] = useState({
    vehicle: '',
    model: '',
    minYear: '',
    maxYear: '',
    minPrice: '',
    maxPrice: '',
    city: '',
    leadStatus: '',
    assignedTo: ''
  });

  // UI Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filters, scope]);

  const resetFilters = () => {
    setFilters({
      vehicle: '',
      model: '',
      minYear: '',
      maxYear: '',
      minPrice: '',
      maxPrice: '',
      city: '',
      leadStatus: '',
      assignedTo: ''
    });
  };

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
    numberPlate: '',
    demandPrice: '',
    carCondition: 'Used',
    zeroMeterType: 'Cash',
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
  }, [search, filters, scope]);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const activeFilters = { ...filters };
      if (scope === 'mine' && user?.id) {
        activeFilters.assignedTo = user.id;
      } else if (scope === 'all') {
        delete activeFilters.assignedTo;
      }
      const data = await api.getSellers({
        search,
        ...activeFilters
      });
      let filteredData = data;
      if (scope === 'mine' && user?.id) {
        const cleanUserName = user?.name ? user.name.replace(/^(mr\.|ma'am|mrs\.)\s+/i, '').toLowerCase().trim() : '';
        const mine = data.filter(s => 
          s.assignedTo === user.id || 
          s.createdBy === user.id || 
          (cleanUserName && s.leadReference?.toLowerCase().includes(cleanUserName))
        );
        filteredData = mine.length > 0 ? mine : data;
      }
      setSellers(filteredData);
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
      color: 'White',
      mileage: 0,
      numberPlate: '',
      demandPrice: '',
      carCondition: 'Used',
      zeroMeterType: 'Cash',
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
      numberPlate: seller.numberPlate || '',
      demandPrice: seller.demandPrice,
      carCondition: seller.carCondition || 'Used',
      zeroMeterType: seller.zeroMeterType || 'Cash',
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

  const exportSellersPDF = () => {
    const printWindow = window.open('', '_blank');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const totalValuation = sellers.reduce((acc, s) => acc + (s.demandPrice || 0), 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS - Filtered Vehicle Inventory Report (${todayStr})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #1e293b; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-box { display: flex; align-items: center; gap: 15px; }
            .title { font-size: 22px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 12px; color: #64748b; font-family: monospace; }
            .stats { display: flex; gap: 15px; margin-bottom: 20px; }
            .stat-box { flex: 1; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .stat-val { font-size: 18px; font-weight: bold; color: #0284c7; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 9px; font-size: 10px; text-transform: uppercase; }
            td { padding: 9px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            tr:nth-child(even) { background: #f8fafc; }
            .plate-tag { display: inline-block; padding: 2px 6px; background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; border-radius: 4px; font-size: 10px; font-weight: bold; font-family: monospace; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-box">
              <img src="${logoBase64}" alt="AL ASR MOTORS Logo" style="height: 90px; width: auto; object-fit: contain;" />
              <div>
                <div class="title">AL ASR MOTORS - Showroom Vehicle Inventory</div>
                <div class="subtitle">Filtered Stock Export • Generated: ${todayStr}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px; font-weight: bold; color: #0284c7;">Main Showroom Floor</div>
              <div style="font-size: 10px; color: #64748b;">Sahiwal, Pakistan</div>
            </div>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="stat-label">Total Filtered Vehicles</div>
              <div class="stat-val">${sellers.length} Units</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Combined Valuation</div>
              <div class="stat-val">Rs. ${totalValuation.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Lead Date</th>
                <th>Vehicle & Specs</th>
                <th>Reg / Plate #</th>
                <th>Condition</th>
                <th>Seller Name & Contact</th>
                <th>City</th>
                <th>Demand Price (PKR)</th>
                <th>Lead Shared By / Ref</th>
                <th>Assigned Salesman</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${sellers.map((s, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong style="color:#0284c7; font-family:monospace;">${new Date(s.createdAt).toLocaleDateString()}</strong></td>
                  <td><strong>${s.vehicle} ${s.model}</strong> (${s.year})<br/><span style="color:#64748b; font-size:10px;">Color: ${s.color || 'N/A'}</span></td>
                  <td>${s.numberPlate ? `<span class="plate-tag">${s.numberPlate}</span>` : '<span style="color:#94a3b8;">Unregistered</span>'}</td>
                  <td><strong>${s.carCondition || 'Used'}</strong> ${s.carCondition === 'Zero Meter' ? `(${s.zeroMeterType || 'Cash'})` : ''}</td>
                  <td><strong>${s.sellerName}</strong><br/><span style="color:#64748b; font-size:10px;">${s.sellerPhone}</span></td>
                  <td>${s.sellerCity}</td>
                  <td><strong>Rs. ${s.demandPrice?.toLocaleString()}</strong></td>
                  <td><strong>${s.leadReference || s.leadSource || 'Direct'}</strong></td>
                  <td>${s.assignedUser?.name || 'Unassigned'}</td>
                  <td>${s.leadStatus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Confidential Document • AL ASR MOTORS Dealership Management System • ${todayStr}
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar with Count and Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {scope === 'mine' ? 'My Sellers Leads' : 'All Sellers Inventory'}
            </h2>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Showing <strong className="text-cyan-400">{sellers.length}</strong> matching seller lead vehicle(s)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportSellersPDF}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold rounded-xl text-xs shadow-lg transition-all flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Export PDF</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => { resetForm(); setIsAddModalOpen(true); }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Seller Registration</span>
            </button>
          )}
        </div>
      </div>

      {/* Simultaneous Multi-Field Filter Bar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        resetFilters={resetFilters}
        salesmenList={salesmenList}
        isAdmin={isAdmin}
        priceLabel="Demand Price Range"
      />

      {/* Sellers Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Lead Date</th>
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
              {sellers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((seller) => (
                <tr 
                  key={seller.id} 
                  onClick={() => openDetailModal(seller)}
                  className="hover:bg-cyan-500/5 cursor-pointer transition-colors group"
                >
                  <td className="py-4 px-4 font-mono font-bold text-cyan-400 text-xs whitespace-nowrap">
                    {new Date(seller.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 group-hover:border-cyan-500/50 flex items-center justify-center text-cyan-400 font-mono font-bold transition-all">
                        {seller.vehicle?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-extrabold text-white text-sm group-hover:text-cyan-400 transition-colors">
                            {seller.vehicle} {seller.model}
                          </p>
                          {seller.numberPlate ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold">
                              {seller.numberPlate}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono text-[9px]">
                              UNREG
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {seller.year} • {seller.color} • {seller.mileage?.toLocaleString()} km
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <p className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{seller.sellerName}</p>
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

                  <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openImagesModal(seller)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-white/10 text-cyan-400 rounded-lg font-mono text-[11px] flex items-center space-x-1.5 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{seller.images?.length || 0} photo(s)</span>
                    </button>
                  </td>

                  <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openDetailModal(seller)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 border border-white/10 text-slate-300 hover:text-cyan-400 font-mono text-[10px] flex items-center space-x-1 transition-all"
                        title="View full vehicle seller details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      {(isAdmin || seller.assignedTo === user?.id || seller.createdBy === user?.id) && (
                        <>
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
                        </>
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

        {/* Table Pagination Footer */}
        {sellers.length > 0 && (
          <div className="p-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-slate-400 bg-slate-900/40">
            <div>
              Showing <strong className="text-cyan-400">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-cyan-400">{Math.min(currentPage * pageSize, sellers.length)}</strong> of{' '}
              <strong className="text-white">{sellers.length}</strong> seller entries
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
              >
                Previous
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-cyan-400 font-bold">
                Page {currentPage} of {Math.ceil(sellers.length / pageSize) || 1}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(sellers.length / pageSize) || 1))}
                disabled={currentPage === (Math.ceil(sellers.length / pageSize) || 1)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                  <label className="block text-xs font-mono text-slate-400 mb-1">Number Plate (Reg #)</label>
                  <input
                    type="text"
                    placeholder="e.g. LEC-1234"
                    value={formData.numberPlate}
                    onChange={(e) => setFormData({ ...formData, numberPlate: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
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
                  <label className="block text-xs font-mono text-slate-400 mb-1">Mileage (km)</label>
                  <input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                <div>
                  <label className="block text-xs font-mono text-cyan-400 font-bold mb-1">Vehicle Condition *</label>
                  <select
                    value={formData.carCondition}
                    onChange={(e) => setFormData({ ...formData, carCondition: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="Used">Used Car</option>
                    <option value="Zero Meter">Zero Meter (Brand New)</option>
                  </select>
                </div>

                {formData.carCondition === 'Zero Meter' && (
                  <div>
                    <label className="block text-xs font-mono text-emerald-400 font-bold mb-1">Zero Meter Payment Option *</label>
                    <select
                      value={formData.zeroMeterType}
                      onChange={(e) => setFormData({ ...formData, zeroMeterType: e.target.value })}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-sm text-emerald-300 focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="Cash">Cash (Immediate Ready Stock)</option>
                      <option value="Booking">Booking (Advance Booking)</option>
                    </select>
                  </div>
                )}
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
