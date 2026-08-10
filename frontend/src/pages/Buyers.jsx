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

const formatDateStr = (dateVal) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

export default function Buyers({ search, isAddModalOpen, setIsAddModalOpen, scope = 'all' }) {
  const { user, isAdmin } = useAuth();
  const [buyers, setBuyers] = useState([]);
  const [salesmenList, setSalesmenList] = useState([]);
  const [teamList, setTeamList] = useState([]);
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
    isBankCase: '',
    caseNo: ''
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
      isBankCase: '',
      caseNo: ''
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
    year: String(new Date().getFullYear()),
    color: '',
    mileage: 0,
    budget: '',
    carCondition: 'Used',
    zeroMeterType: 'Cash',
    isBankCase: false,
    bankName: '',
    bankCaseStatus: 'Not Confirmed',
    processingFees: 0,
    downpaymentPercent: 20,
    buyerName: '',
    buyerPhone: '',
    buyerCity: '',
    leadSource: 'Website',
    leadReference: '',
    leadReferredBy: '',
    assignedTo: '',
    leadStatus: 'New Lead',
    comments: ''
  });

  useEffect(() => {
    fetchBuyers();
    fetchTeamMembers();
  }, [search, filters, scope]);

  const fetchBuyers = async () => {
    setLoading(true);
    try {
      const activeFilters = { ...filters };
      if (scope === 'mine' && user?.id) {
        activeFilters.assignedTo = user.id;
      } else if (scope === 'all') {
        delete activeFilters.assignedTo;
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
        const cleanUserName = user?.name ? user.name.replace(/^(mr\.|ma'am|mrs\.)\s+/i, '').toLowerCase().trim() : '';
        const mine = data.filter(b => 
          b.assignedTo === user.id || 
          b.createdBy === user.id || 
          (cleanUserName && b.leadReference?.toLowerCase().includes(cleanUserName)) ||
          (cleanUserName && b.leadReferredBy?.toLowerCase().includes(cleanUserName))
        );
        filteredData = mine.length > 0 ? mine : data;
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

  const fetchTeamMembers = async () => {
    try {
      const data = await api.getUsers();
      const activeUsers = data.filter(u => u.status === 'ACTIVE');
      setTeamList(activeUsers);
      setSalesmenList(activeUsers.filter(u => u.role === 'SALESMAN'));
    } catch (err) {
      console.error('Failed to fetch team members:', err);
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
      bankCaseStatus: 'Not Confirmed',
      processingFees: 0,
      downpaymentPercent: 20,
      buyerName: '',
      buyerPhone: '',
      buyerCity: '',
      leadSource: 'Website',
      leadReference: '',
      leadReferredBy: '',
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
      vehicle: buyer.vehicle || '',
      model: buyer.model || '',
      year: buyer.year || '',
      color: buyer.color || '',
      mileage: buyer.mileage || 0,
      budget: buyer.budget || '',
      carCondition: buyer.carCondition || 'Used',
      zeroMeterType: buyer.zeroMeterType || 'Cash',
      isBankCase: Boolean(buyer.isBankCase),
      bankName: buyer.bankName || '',
      bankCaseStatus: buyer.bankCaseStatus || 'Not Confirmed',
      processingFees: buyer.processingFees || 0,
      downpaymentPercent: buyer.downpaymentPercent || 20,
      buyerName: buyer.buyerName || '',
      buyerPhone: buyer.buyerPhone || '',
      buyerCity: buyer.buyerCity || '',
      leadSource: buyer.leadSource || 'Website',
      leadReference: buyer.leadReference || '',
      leadReferredBy: buyer.leadReferredBy || '',
      assignedTo: buyer.assignedTo || '',
      leadStatus: buyer.leadStatus || 'New Lead',
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

  useEffect(() => {
    if (isAddModalOpen) {
      resetForm();
    }
  }, [isAddModalOpen, scope]);

  // Bank Case Auto-Generated Sequential Case Number starting from 1
  const bankCasesOrdered = React.useMemo(() => {
    return [...buyers]
      .filter(b => b.isBankCase)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [buyers]);

  const getBankCaseNo = (buyerId) => {
    const idx = bankCasesOrdered.findIndex(b => b.id === buyerId);
    if (idx === -1) return null;
    return idx + 1; // 1, 2, 3...
  };

  // Client-side filtering for global search and explicit Case Number filter
  const displayBuyers = React.useMemo(() => {
    let result = buyers;

    const q = (search || '').toLowerCase().trim();
    const caseQuery = (filters.caseNo || '').toString().toLowerCase().trim();
    const searchCaseNo = (caseQuery || q).replace(/^(case\s*#?|case-?)/i, '').trim();

    if (searchCaseNo || q) {
      result = result.filter(b => {
        const caseNo = b.isBankCase ? getBankCaseNo(b.id) : null;
        
        let matchCase = false;
        if (searchCaseNo && caseNo !== null) {
          matchCase = (
            caseNo.toString() === searchCaseNo ||
            `case #${caseNo}`.toLowerCase().includes(searchCaseNo) ||
            `case ${caseNo}`.toLowerCase().includes(searchCaseNo)
          );
        }

        if (filters.caseNo && !matchCase) {
          return false;
        }

        if (!q) return true;

        const matchText = (
          b.buyerName?.toLowerCase().includes(q) ||
          b.buyerPhone?.includes(q) ||
          b.buyerCity?.toLowerCase().includes(q) ||
          b.vehicle?.toLowerCase().includes(q) ||
          b.model?.toLowerCase().includes(q) ||
          b.bankName?.toLowerCase().includes(q) ||
          b.leadStatus?.toLowerCase().includes(q)
        );

        return matchCase || matchText;
      });
    }

    return result;
  }, [buyers, search, filters.caseNo, bankCasesOrdered]);

  const exportBuyersPDF = () => {
    const printWindow = window.open('', '_blank');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const totalValuation = displayBuyers.reduce((acc, b) => acc + (b.budget || 0), 0);

    const pageSize = 25;
    const pageChunks = [];
    for (let i = 0; i < displayBuyers.length; i += pageSize) {
      pageChunks.push(displayBuyers.slice(i, i + pageSize));
    }
    if (pageChunks.length === 0) pageChunks.push([]);
    const totalPages = pageChunks.length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS - Buyer Inquiries Report (${todayStr})</title>
          <style>
            @page { size: portrait; margin: 4mm 6mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; margin: 0; color: #0f172a; background: #ffffff; font-size: 8.5px; line-height: 1.15; }
            .sheet {
              page-break-after: always;
              break-after: page;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 2px;
            }
            .sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #0284c7; padding-bottom: 4px; margin-bottom: 4px; }
            .logo-box { display: flex; align-items: center; gap: 8px; }
            .title { font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.3px; }
            .subtitle { font-size: 8px; color: #64748b; font-family: monospace; }
            .stats-inline { display: flex; gap: 10px; font-size: 8px; background: #f8fafc; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
            .stat-item { font-weight: 600; color: #334155; }
            .stat-item strong { color: #0284c7; font-weight: 800; }
            table { width: 100%; border-collapse: collapse; margin-top: 2px; border: 1px solid #64748b; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 3.5px 5px; font-size: 8px; font-weight: 700; text-transform: uppercase; border: 1px solid #334155; }
            td { padding: 3px 5px; border: 1px solid #94a3b8; font-size: 8.5px; vertical-align: middle; }
            tr:nth-child(even) { background: #f8fafc; }
            .badge { display: inline-block; padding: 1px 4px; border-radius: 3px; font-size: 7.5px; font-weight: 700; }
            .bank-badge { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; font-weight: bold; }
            .cash-badge { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .footer { margin-top: 6px; text-align: center; font-size: 7.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 3px; }
          </style>
        </head>
        <body>
          ${pageChunks.map((chunk, pageIdx) => {
            const startIdx = pageIdx * pageSize;
            return `
              <div class="sheet">
                <div>
                  <div class="header">
                    <div class="logo-box">
                      <img src="${logoBase64}" alt="AL ASR MOTORS" style="height: 36px; width: auto; object-fit: contain;" />
                      <div>
                        <div class="title">AL ASR MOTORS — BUYER INQUIRIES & BANK CASES</div>
                        <div class="subtitle">Filtered Buyer Export • Generated: ${todayStr} • Sahiwal, Pakistan</div>
                      </div>
                    </div>
                    <div class="stats-inline">
                      <div class="stat-item">Total Buyers: <strong>${displayBuyers.length} Leads</strong></div>
                      <div class="stat-item">Total Budget: <strong>Rs. ${totalValuation.toLocaleString()}</strong></div>
                      <div class="stat-item" style="color: #0284c7;">Sheet <strong>${pageIdx + 1} of ${totalPages}</strong></div>
                    </div>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th style="width: 25px;">#</th>
                        <th style="width: 70px;">Date</th>
                        <th>Buyer Name & Contact</th>
                        <th>Desired Vehicle Specs</th>
                        <th style="width: 90px;">Budget (PKR)</th>
                        <th>Financing / Bank Case #</th>
                        <th>Assigned Salesman</th>
                        <th style="width: 65px;">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${chunk.length === 0 ? `
                        <tr>
                          <td colspan="8" style="text-align: center; padding: 20px; color: #64748b;">No buyer records found.</td>
                        </tr>
                      ` : chunk.map((b, idx) => {
                        const globalIdx = startIdx + idx + 1;
                        const caseNo = b.isBankCase ? getBankCaseNo(b.id) : null;
                        return `
                        <tr>
                          <td><strong>${globalIdx}</strong></td>
                          <td style="color:#0284c7; font-family:monospace; font-weight:600;">${formatDateStr(b.createdAt)}</td>
                          <td><strong>${b.buyerName}</strong><br/><span style="color:#64748b; font-size:7.5px;">${b.buyerPhone || ''} ${b.buyerCity ? '• ' + b.buyerCity : ''}</span></td>
                          <td><strong>${b.vehicle} ${b.model}</strong> (${b.year})<br/><span style="color:#64748b; font-size:7.5px;">${b.carCondition || 'Used'} ${b.carCondition === 'Zero Meter' ? `(${b.zeroMeterType || 'Cash'})` : ''}</span></td>
                          <td><strong style="color:#0f172a;">Rs. ${b.budget?.toLocaleString()}</strong></td>
                          <td>
                            ${b.isBankCase 
                              ? `<span class="badge bank-badge">CASE #${caseNo || globalIdx} • ${b.bankName || 'Bank Case'}</span>` 
                              : `<span class="badge cash-badge">CASH SALE</span>`
                            }
                          </td>
                          <td>${b.assignedUser?.name || 'Unassigned'}</td>
                          <td><strong>${b.leadStatus}</strong></td>
                        </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>

                <div class="footer">
                  AL ASR MOTORS Customer Care & Sales • Sheet ${pageIdx + 1} of ${totalPages} • Showing records ${chunk.length > 0 ? startIdx + 1 : 0} to ${startIdx + chunk.length} of ${displayBuyers.length} (25 entries per sheet)
                </div>
              </div>
            `;
          }).join('')}

          <script>
            window.onload = function() { window.print(); };
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
            Showing <strong className="text-cyan-400">{displayBuyers.length}</strong> matching {scope === 'bank_cases' ? 'bank financing case(s)' : 'buyer inquiry(ies)'}
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
                <th className="py-3.5 px-4">Lead Assign Date</th>
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
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent mb-2"></div>
                    <p className="font-mono">Loading buyer leads...</p>
                  </td>
                </tr>
              ) : displayBuyers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-mono">
                    No buyer inquiries found matching your filters.
                  </td>
                </tr>
              ) : (
                displayBuyers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((buyer) => (
                  <tr 
                    key={buyer.id} 
                    onClick={() => openDetailModal(buyer)}
                    className="hover:bg-cyan-500/5 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-4 font-mono font-bold text-cyan-400 text-xs whitespace-nowrap">
                      {formatDateStr(buyer.createdAt)}
                    </td>
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
                      {buyer.isBankCase ? (
                        <div className="flex flex-col space-y-1">
                          {buyer.bankCaseStatus === 'Confirmed' && (buyer.bankCaseNo || getBankCaseNo(buyer.id)) ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-extrabold w-fit">
                              <Building2 className="w-3 h-3 text-emerald-400" />
                              <span>Case #{buyer.bankCaseNo || getBankCaseNo(buyer.id)} • CONFIRMED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold w-fit">
                              <Building2 className="w-3 h-3 text-amber-400" />
                              <span>Not Confirmed (HOLD)</span>
                            </span>
                          )}
                          <span className="text-slate-300 text-[11px] font-semibold">{buyer.bankName || 'Bank Financing'}</span>
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
          <div className="glass-modal rounded-3xl w-full max-w-2xl border border-white/10 shadow-2xl my-auto max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="p-6 pb-4 border-b border-white/10 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-0.5">
                  {isEditModalOpen ? 'Edit Buyer Lead' : (formData.isBankCase ? 'New Bank Financing Case Entry' : 'New Buyer Entry')}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Enter buyer requirements, budget, and bank financing details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={isEditModalOpen ? handleUpdateBuyer : handleCreateBuyer} className="p-6 overflow-y-auto space-y-4 max-h-[calc(90vh-85px)] custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Buyer Name</label>
                  <input
                    type="text"
                    placeholder="Harrison Forde"
                    value={formData.buyerName}
                    onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+92 300 0000000"
                    value={formData.buyerPhone}
                    onChange={(e) => setFormData({ ...formData, buyerPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Lahore / Sahiwal"
                    value={formData.buyerCity}
                    onChange={(e) => setFormData({ ...formData, buyerCity: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Desired Vehicle Make</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota / Honda"
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Model / Trim</label>
                  <input
                    type="text"
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
                  <label className="block text-xs font-mono text-cyan-400 font-bold mb-1">Vehicle Condition</label>
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
                    <label className="block text-xs font-mono text-emerald-400 font-bold mb-1">Zero Meter Payment Option</label>
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
                    {formData.isBankCase ? 'Total Amount (PKR / Rs.)' : 'Target Budget (PKR / Rs.)'}
                  </label>
                  <input
                    type="number"
                    placeholder="20000000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Year Preference</label>
                  <input
                    type="text"
                    placeholder="e.g. 2022 or 2022/23"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono text-sky-300 mb-1">Bank Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Meezan Bank, HBL"
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          className="w-full bg-slate-950 border border-sky-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-amber-300 font-bold mb-1">Bank Case Confirmation Status</label>
                        <select
                          value={formData.bankCaseStatus}
                          onChange={(e) => setFormData({ ...formData, bankCaseStatus: e.target.value })}
                          className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400 font-mono"
                        >
                          <option value="Not Confirmed">Not Confirmed (HOLD)</option>
                          <option value="Confirmed">Confirmed (Assign Case #)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono text-amber-300 mb-1">Downpayment (%)</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-sky-400 font-bold mb-1">Lead Referred By (Team Member)</label>
                  <select
                    value={formData.leadReferredBy}
                    onChange={(e) => setFormData({ ...formData, leadReferredBy: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="">Direct / None</option>
                    {teamList.map(member => (
                      <option key={member.id} value={member.name}>
                        {member.name} ({member.role ? member.role.replace('_', ' ') : 'USER'})
                      </option>
                    ))}
                  </select>
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
              </div>

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
