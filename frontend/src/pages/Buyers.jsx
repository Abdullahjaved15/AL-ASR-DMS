import React, { useState, useEffect } from 'react';
import { Users, Plus, Filter, Edit, Trash2, Phone, MapPin, DollarSign, UserCheck, Eye, Printer, Building2, ClipboardCheck, FileText } from 'lucide-react';
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
    carCondition: 'Used',
    zeroMeterType: 'Cash',
    isBankCase: false,
    bankName: '',
    processingFees: 0,
    downpaymentPercent: 20,
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
      if (scope === 'mine' && user?.id) {
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
        filteredData = data.filter(b => b.assignedTo === user.id || b.createdBy === user.id);
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
      carCondition: 'Used',
      zeroMeterType: 'Cash',
      isBankCase: scope === 'bank_cases',
      bankName: '',
      processingFees: 0,
      downpaymentPercent: 20,
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
      carCondition: buyer.carCondition || 'Used',
      zeroMeterType: buyer.zeroMeterType || 'Cash',
      isBankCase: Boolean(buyer.isBankCase),
      bankName: buyer.bankName || '',
      processingFees: buyer.processingFees || 0,
      downpaymentPercent: buyer.downpaymentPercent || 20,
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
                <th>Condition</th>
                <th>Target Budget / Total Amount</th>
                <th>Bank Financing Breakdown</th>
                <th>Lead Shared By / Ref</th>
                <th>Assigned Salesman</th>
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
                  <td><strong>${b.carCondition || 'Used'}</strong> ${b.carCondition === 'Zero Meter' ? `(${b.zeroMeterType || 'Cash'})` : ''}</td>
                  <td><strong>Rs. ${b.budget?.toLocaleString()}</strong></td>
                  <td>
                    ${b.isBankCase 
                      ? `<div style="font-size:10px; line-height:1.4;">
                          <span class="badge bank-badge">BANK CASE (${b.bankName || 'Standard Bank'})</span><br/>
                          <strong>Downpayment (${b.downpaymentPercent || 0}%):</strong> Rs. ${(b.downpaymentAmount || 0).toLocaleString()}<br/>
                          <strong>Processing Fees:</strong> Rs. ${(b.processingFees || 0).toLocaleString()}<br/>
                          <strong style="color:#0284c7;">Bank Due Loan:</strong> Rs. ${(b.dueAmount || 0).toLocaleString()}
                         </div>` 
                      : `<span class="badge cash-badge">CASH SALE</span>`
                    }
                  </td>
                  <td><strong>${b.leadReference || b.leadSource || 'Direct'}</strong></td>
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
          {isAdmin && (
            <button
              onClick={() => { resetForm(); setIsAddModalOpen(true); }}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{scope === 'bank_cases' ? 'New Bank Case Entry' : 'New Buyer Entry'}</span>
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
        priceLabel="Target Budget Range"
      />

      {/* Buyers Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Buyer & Contact</th>
                <th className="py-3.5 px-4">Desired Vehicle</th>
                <th className="py-3.5 px-4">Condition</th>
                <th className="py-3.5 px-4">Financial Details</th>
                <th className="py-3.5 px-4">Type / Bank</th>
                <th className="py-3.5 px-4">Assigned Salesman</th>
                <th className="py-3.5 px-4">Lead Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent mb-2"></div>
                    <p className="font-mono">Loading buyer leads...</p>
                  </td>
                </tr>
              ) : buyers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-mono">
                    No buyer inquiries found matching your filters.
                  </td>
                </tr>
              ) : (
                buyers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((buyer) => (
                  <tr 
                    key={buyer.id} 
                    onClick={() => openDetailModal(buyer)}
                    className="hover:bg-cyan-500/5 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-4" onClick={() => openDetailModal(buyer)}>
                      <div className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">{buyer.buyerName}</div>
                      <div className="text-slate-400 font-mono text-[11px] flex items-center space-x-1 mt-0.5">
                        <span>{buyer.buyerPhone}</span>
                        <span>•</span>
                        <span>{buyer.buyerCity}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono" onClick={() => openDetailModal(buyer)}>
                      <div className="font-bold text-sky-400">{buyer.vehicle} {buyer.model}</div>
                      <div className="text-slate-400 text-[11px]">Year: {buyer.year} • Color: {buyer.color || 'Any'}</div>
                    </td>

                    <td className="py-4 px-4" onClick={() => openDetailModal(buyer)}>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] font-bold border border-white/10">
                        {buyer.carCondition || 'Used'} {buyer.carCondition === 'Zero Meter' ? `(${buyer.zeroMeterType || 'Cash'})` : ''}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono" onClick={() => openDetailModal(buyer)}>
                      {buyer.isBankCase && isAdmin ? (
                        <div className="space-y-0.5">
                          <div className="text-emerald-400 font-bold">Total: Rs. {(buyer.budget + (buyer.processingFees || 0))?.toLocaleString()}</div>
                          <div className="text-amber-300 text-[10px]">Down ({buyer.downpaymentPercent || 0}%): Rs. {(buyer.downpaymentAmount || 0).toLocaleString()}</div>
                          <div className="text-cyan-300 text-[10px] font-bold">Due: Rs. {(buyer.dueAmount || 0).toLocaleString()}</div>
                        </div>
                      ) : (
                        <div className="text-emerald-400 font-bold">Rs. {buyer.budget?.toLocaleString()}</div>
                      )}
                    </td>

                    <td className="py-4 px-4" onClick={() => openDetailModal(buyer)}>
                      {buyer.isBankCase && isAdmin ? (
                        <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] font-bold">
                          <Building2 className="w-3 h-3 text-sky-400" />
                          <span>{buyer.bankName || 'Bank Financing'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">Direct Buyer</span>
                      )}
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px]" onClick={() => openDetailModal(buyer)}>
                      {buyer.assignedUser ? (
                        <div className="text-slate-200">{buyer.assignedUser.name}</div>
                      ) : (
                        <span className="text-slate-500">Unassigned</span>
                      )}
                    </td>

                    <td className="py-4 px-4" onClick={() => openDetailModal(buyer)}>
                      <StatusBadge status={buyer.leadStatus} />
                    </td>

                    <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openDetailModal(buyer)}
                          className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 border border-white/10 text-slate-300 hover:text-cyan-400 font-mono text-[10px] flex items-center space-x-1 transition-all"
                          title="View full buyer inquiry details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {buyer.isBankCase && isAdmin && (
                          <button
                            onClick={() => { setSelectedBuyer(buyer); setIsChecklistModalOpen(true); }}
                            className="px-2 py-1 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1"
                            title="Bank Document Checklist"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Checklist</span>
                          </button>
                        )}

                        {(isAdmin || buyer.assignedTo === user?.id || buyer.createdBy === user?.id) && (
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
              {isEditModalOpen ? 'Edit Buyer Lead' : 'New Buyer Entry'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-6">
              Enter buyer requirements, budget, and bank financing details.
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
                    placeholder="+92 300 0000000"
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
                    placeholder="Lahore / Sahiwal"
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
                    placeholder="e.g. Toyota / Honda"
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
                    placeholder="e.g. Fortuner / Civic"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Vehicle Condition Selector */}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    {formData.isBankCase ? 'Total Amount (PKR / Rs.) *' : 'Target Budget (PKR / Rs.) *'}
                  </label>
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
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-sky-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-sky-400" />
                    <div>
                      <label className="text-xs font-bold text-white">Bank Case Financing Buyer</label>
                      <p className="text-[10px] text-slate-400">Enable bank loan financial calculations & document checklist</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isBankCase}
                    onChange={(e) => setFormData({ ...formData, isBankCase: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 bg-slate-800 text-sky-500 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                {formData.isBankCase && (
                  <div className="space-y-4 pt-2 border-t border-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-mono text-sky-300 mb-1">Bank Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Meezan Bank, HBL"
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          className="w-full bg-slate-950 border border-sky-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-amber-300 mb-1">Downpayment (%) *</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="20"
                          value={formData.downpaymentPercent}
                          onChange={(e) => setFormData({ ...formData, downpaymentPercent: e.target.value })}
                          className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-amber-300 focus:outline-none focus:border-amber-400 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-purple-300 mb-1">Processing Fees (PKR)</label>
                        <input
                          type="number"
                          placeholder="50000"
                          value={formData.processingFees}
                          onChange={(e) => setFormData({ ...formData, processingFees: e.target.value })}
                          className="w-full bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-sm text-purple-300 focus:outline-none focus:border-purple-400 font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Calculated Summary Box */}
                    {Boolean(formData.budget) && (
                      <div className="bg-slate-950/80 p-3.5 rounded-xl border border-sky-500/20 text-xs space-y-1.5 font-mono">
                        <div className="flex justify-between text-slate-300">
                          <span>Vehicle Target Budget / Price:</span>
                          <span className="font-bold text-white">Rs. {parseFloat(formData.budget || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-amber-300">
                          <span>Downpayment ({formData.downpaymentPercent || 0}% of Vehicle Price):</span>
                          <span className="font-bold">- Rs. {(parseFloat(formData.budget || 0) * ((parseFloat(formData.downpaymentPercent) || 0) / 100)).toLocaleString()}</span>
                        </div>
                        {Boolean(parseFloat(formData.processingFees)) && (
                          <div className="flex justify-between text-purple-300">
                            <span>Processing Fees (Added After Downpayment):</span>
                            <span>+ Rs. {parseFloat(formData.processingFees || 0).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-cyan-300 font-bold text-sm pt-1.5 border-t border-white/10">
                          <span>Calculated Due Amount (Bank Loan Balance + Fees):</span>
                          <span>Rs. {((parseFloat(formData.budget || 0) - (parseFloat(formData.budget || 0) * ((parseFloat(formData.downpaymentPercent) || 0) / 100))) + (parseFloat(formData.processingFees) || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
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
