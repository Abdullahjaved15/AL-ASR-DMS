import React, { useState, useEffect } from 'react';
import { Users, Plus, Filter, Edit, Trash2, Phone, MapPin, DollarSign, UserCheck, Eye, Printer, Building2, ClipboardCheck } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import BuyerDetailModal from '../components/BuyerDetailModal';
import BankChecklistModal from '../components/BankChecklistModal';
import FilterBar from '../components/FilterBar';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logoBase64 } from '../utils/logoBase64';

const leadStatuses = ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation', 'Deal Closed', 'Lost', 'Cancelled', 'Incomplete'];

export default function Buyers({ search, isAddModalOpen, setIsAddModalOpen, scope = 'all' }) {
  const { user, isAdmin } = useAuth();
  const [buyers, setBuyers] = useState([]);
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
    assignedTo: '',
    isBankCase: ''
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
      assignedTo: '',
      isBankCase: ''
    });
  };

  // Modals state
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    vehicle: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    mileage: 0,
    budget: '',
    isBankCase: false,
    bankName: '',
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
  }, [search, filters, scope]);

  const fetchBuyers = async () => {
    setLoading(true);
    try {
      const activeFilters = { ...filters };
      if (scope === 'mine' && user?.id && !isAdmin) {
        activeFilters.assignedTo = user.id;
      }
      if (scope === 'bank_cases') {
        activeFilters.isBankCase = 'true';
      }
      const data = await api.getBuyers({
        search,
        ...activeFilters
      });
      let filteredData = data;
      if (scope === 'mine' && user?.id) {
        const mine = data.filter(b => b.assignedTo === user.id || b.createdBy === user.id);
        filteredData = (isAdmin && mine.length === 0) ? data : mine;
      }
      if (scope === 'bank_cases') {
        filteredData = filteredData.filter(b => b.isBankCase);
      }
      setBuyers(filteredData);
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
      isBankCase: scope === 'bank_cases',
      bankName: '',
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
      isBankCase: Boolean(buyer.isBankCase),
      bankName: buyer.bankName || '',
      buyerName: buyer.buyerName,
      buyerPhone: buyer.buyerPhone,
      buyerCity: buyer.buyerCity,
      leadSource: buyer.leadSource,
      leadReference: buyer.leadReference || '',
      assignedTo: buyer.assignedTo || '',
      leadStatus: buyer.leadStatus,
      comments: buyer.comments || ''
    });
    setIsEditModalOpen(true);
  };

  const openDetailModal = (buyer) => {
    setSelectedBuyer(buyer);
    setIsDetailModalOpen(true);
  };

  const openChecklistModal = (buyer) => {
    setSelectedBuyer(buyer);
    setIsChecklistModalOpen(true);
  };

  const exportBuyersPDF = () => {
    const printWindow = window.open('', '_blank');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const totalBudget = buyers.reduce((acc, b) => acc + (b.budget || 0), 0);
    const bankCasesCount = buyers.filter(b => b.isBankCase).length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS - Filtered Buyer Inquiries Report (${todayStr})</title>
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
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; font-family: monospace; }
            .bank-badge { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }
            .cash-badge { background: #dcfce7; color: #15803d; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-box">
              <img src="${logoBase64}" alt="AL ASR MOTORS Logo" style="height: 90px; width: auto; object-fit: contain;" />
              <div>
                <div class="title">AL ASR MOTORS - Buyer Inquiries & Leads Report</div>
                <div class="subtitle">Filtered Buyers Export • Generated: ${todayStr}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px; font-weight: bold; color: #0284c7;">Main Showroom Floor</div>
              <div style="font-size: 10px; color: #64748b;">Sahiwal, Pakistan</div>
            </div>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="stat-label">Total Filtered Inquiries</div>
              <div class="stat-val">${buyers.length} Leads</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Bank Finance Cases</div>
              <div class="stat-val">${bankCasesCount} Cases</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Combined Target Budget</div>
              <div class="stat-val">Rs. ${totalBudget.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Buyer Name & Contact</th>
                <th>City</th>
                <th>Desired Vehicle Specs</th>
                <th>Target Budget (PKR)</th>
                <th>Payment / Financing</th>
                <th>Salesman</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${buyers.map((b, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${b.buyerName}</strong><br/><span style="color:#64748b; font-size:10px;">${b.buyerPhone}</span></td>
                  <td>${b.buyerCity}</td>
                  <td><strong>${b.vehicle} ${b.model}</strong> (${b.year})</td>
                  <td><strong>Rs. ${b.budget?.toLocaleString()}</strong></td>
                  <td>
                    ${b.isBankCase 
                      ? `<span class="badge bank-badge">BANK CASE (${b.bankName || 'Standard Bank'})</span>` 
                      : `<span class="badge cash-badge">CASH SALE</span>`
                    }
                  </td>
                  <td>${b.assignedUser?.name || 'Unassigned'}</td>
                  <td>${b.leadStatus}</td>
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
            {scope === 'bank_cases' && <Building2 className="w-6 h-6 text-sky-400" />}
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {scope === 'bank_cases' ? 'Bank Financing Cases & Cars' : 'Buyer Inquiries & Leads'}
            </h2>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Showing <strong className="text-cyan-400">{buyers.length}</strong> matching {scope === 'bank_cases' ? 'bank financing case(s)' : 'buyer inquiry(ies)'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportBuyersPDF}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold rounded-xl text-xs shadow-lg transition-all flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{scope === 'bank_cases' ? 'New Bank Case Entry' : 'New Buyer Entry'}</span>
          </button>
        </div>
      </div>

      {/* Simultaneous Multi-Field Filter Bar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        resetFilters={resetFilters}
        salesmenList={salesmenList}
        isAdmin={isAdmin}
        priceLabel="Budget Range"
      />

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
              {buyers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((buyer) => (
                <tr key={buyer.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 cursor-pointer" onClick={() => openDetailModal(buyer)}>
                    <div className="flex items-center space-x-2">
                      <p className="font-extrabold text-white text-sm hover:text-cyan-400 transition-colors">{buyer.buyerName}</p>
                      {buyer.isBankCase ? (
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono text-[10px] font-bold flex items-center space-x-1">
                          <Building2 className="w-3 h-3" />
                          <span>BANK CASE</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px]">
                          CASH
                        </span>
                      )}
                    </div>
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
                    {buyer.isBankCase && buyer.bankName && (
                      <p className="text-[10px] text-sky-400 font-mono mt-0.5">
                        Bank: {buyer.bankName}
                      </p>
                    )}
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
                      {buyer.isBankCase && (
                        <button
                          onClick={() => openChecklistModal(buyer)}
                          className="px-2.5 py-1 bg-sky-900/60 hover:bg-sky-800 border border-sky-500/40 text-sky-300 rounded-lg font-mono text-[11px] flex items-center space-x-1.5 transition-colors shadow-sm"
                          title="Open 12-item Bank Case Checklist"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 text-sky-400" />
                          <span>Checklist</span>
                        </button>
                      )}

                      {(isAdmin || buyer.assignedTo === user?.id || buyer.createdBy === user?.id) ? (
                        <>
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
                        </>
                      ) : (
                        <button
                          onClick={() => openDetailModal(buyer)}
                          className="px-2 py-1 rounded-lg bg-slate-800/80 border border-white/10 text-slate-400 font-mono text-[10px] hover:text-cyan-400 flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Only</span>
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

        {/* Table Pagination Footer */}
        {buyers.length > 0 && (
          <div className="p-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-slate-400 bg-slate-900/40">
            <div>
              Showing <strong className="text-cyan-400">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-cyan-400">{Math.min(currentPage * pageSize, buyers.length)}</strong> of{' '}
              <strong className="text-white">{buyers.length}</strong> buyer inquiries
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
                Page {currentPage} of {Math.ceil(buyers.length / pageSize) || 1}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(buyers.length / pageSize) || 1))}
                disabled={currentPage === (Math.ceil(buyers.length / pageSize) || 1)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
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

              {/* Bank Case Financing Option */}
              <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    <div>
                      <label className="text-xs font-bold text-white">Bank Case Financing Buyer</label>
                      <p className="text-[10px] text-slate-400">Is this buyer purchasing via bank financing / car loan?</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isBankCase}
                    onChange={(e) => setFormData({ ...formData, isBankCase: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-slate-800 text-sky-500 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                {formData.isBankCase && (
                  <div>
                    <label className="block text-xs font-mono text-sky-300 mb-1">Bank Name / Institution *</label>
                    <input
                      type="text"
                      placeholder="e.g. Meezan Bank, Bank Alfalah, HBL"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full bg-slate-950 border border-sky-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400 font-mono"
                    />
                  </div>
                )}
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

      {/* BANK CASE REQUIREMENT CHECKLIST MODAL */}
      {isChecklistModalOpen && selectedBuyer && (
        <BankChecklistModal
          buyer={selectedBuyer}
          onClose={() => setIsChecklistModalOpen(false)}
          onChecklistSaved={fetchBuyers}
        />
      )}
    </div>
  );
}
