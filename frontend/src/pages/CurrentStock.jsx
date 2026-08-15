import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, Edit, Trash2, Download, ShieldAlert, CheckCircle, Clock, DollarSign, MapPin, Tag, Car, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logoBase64 } from '../utils/logoBase64';

export default function CurrentStock() {
  const { user, isAdmin } = useAuth();
  const [stockList, setStockList] = useState([]);
  const [stats, setStats] = useState({ totalUnits: 0, totalValuation: 0, availableUnits: 0, reservedUnits: 0, avgPrice: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vehicle: '',
    model: '',
    year: String(new Date().getFullYear()),
    color: 'White',
    mileage: 0,
    askingPrice: '',
    purchasePrice: '',
    status: 'AVAILABLE',
    location: 'Main Showroom',
    notes: '',
    careOf: 'AL Asr',
    regNumber: ''
  });

  useEffect(() => {
    fetchStock();
  }, [search, statusFilter, isAdmin]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const data = await api.getCurrentStock({ search, status: statusFilter });
      if (data) {
        setStockList(data.stock || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error('Failed to fetch showroom stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const cleanStockPayload = (data) => ({
    ...data,
    askingPrice: data.askingPrice ? parseFloat(data.askingPrice) || 0 : 0,
    purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) || null : null,
    mileage: data.mileage ? parseInt(data.mileage, 10) || 0 : 0
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createStockItem(cleanStockPayload(formData));
      setIsAddModalOpen(false);
      resetForm();
      fetchStock();
    } catch (err) {
      alert(err.message || 'Failed to add showroom stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedStock) return;
    setSubmitting(true);
    try {
      await api.updateStockItem(selectedStock.id, cleanStockPayload(formData));
      setIsEditModalOpen(false);
      setSelectedStock(null);
      resetForm();
      fetchStock();
    } catch (err) {
      alert(err.message || 'Failed to update stock entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this showroom stock entry?')) return;
    try {
      await api.deleteStockItem(id);
      fetchStock();
    } catch (err) {
      alert(err.message || 'Failed to delete stock entry');
    }
  };

  const openEditModal = (item) => {
    setSelectedStock(item);
    setFormData({
      vehicle: item.vehicle || '',
      model: item.model || '',
      year: item.year || new Date().getFullYear(),
      color: item.color || 'White',
      mileage: item.mileage || 0,
      askingPrice: item.askingPrice || '',
      purchasePrice: item.purchasePrice || '',
      status: item.status || 'AVAILABLE',
      location: item.location || 'Main Showroom',
      notes: item.notes || '',
      careOf: item.careOf || 'AL Asr',
      regNumber: item.regNumber || ''
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      vehicle: '',
      model: '',
      year: new Date().getFullYear(),
      color: 'White',
      mileage: 0,
      askingPrice: '',
      purchasePrice: '',
      status: 'AVAILABLE',
      location: 'Main Showroom',
      notes: '',
      careOf: 'AL Asr',
      regNumber: ''
    });
  };

  // Daily Printable PDF Exporter with AL ASR Logo
  const exportStockPDF = () => {
    const printWindow = window.open('', '_blank');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

    const pageSize = 25;
    const pageChunks = [];
    for (let i = 0; i < stockList.length; i += pageSize) {
      pageChunks.push(stockList.slice(i, i + pageSize));
    }
    if (pageChunks.length === 0) pageChunks.push([]);
    const totalPages = pageChunks.length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS - Showroom Current Stock (${todayStr})</title>
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
            .badge-available { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-reserved { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-care { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: bold; }
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
                        <div class="title">AL ASR MOTORS — SHOWROOM CURRENT STOCK</div>
                        <div class="subtitle">Official Floor Stock Inventory • Generated: ${todayStr} • Sahiwal, Pakistan</div>
                      </div>
                    </div>
                    <div class="stats-inline">
                      <div class="stat-item">Total Units: <strong>${stats.totalUnits || stockList.length}</strong></div>
                      <div class="stat-item">Available: <strong>${stats.availableUnits || 0}</strong></div>
                      <div class="stat-item">Valuation: <strong>Rs. ${(stats.totalValuation || 0).toLocaleString()}</strong></div>
                      <div class="stat-item" style="color: #0284c7;">Sheet <strong>${pageIdx + 1} of ${totalPages}</strong></div>
                    </div>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th style="width: 25px;">#</th>
                        <th>Vehicle & Model Specs</th>
                        <th style="width: 50px;">Year</th>
                        <th style="width: 65px;">Color</th>
                        <th style="width: 75px;">Mileage</th>
                        <th style="width: 95px;">Asking Price (PKR)</th>
                        <th style="width: 65px;">Care Of</th>
                        <th style="width: 100px;">Reg / Plate #</th>
                        <th style="width: 65px;">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${chunk.length === 0 ? `
                        <tr>
                          <td colspan="9" style="text-align: center; padding: 20px; color: #64748b;">No stock records found.</td>
                        </tr>
                      ` : chunk.map((item, idx) => {
                        const globalIdx = startIdx + idx + 1;
                        return `
                        <tr>
                          <td><strong>${globalIdx}</strong></td>
                          <td><strong>${item.vehicle || ''} ${item.model || ''}</strong></td>
                          <td>${item.year || 'N/A'}</td>
                          <td>${item.color || 'N/A'}</td>
                          <td>${item.mileage ? item.mileage.toLocaleString() + ' km' : '0 km'}</td>
                          <td><strong style="color: #0f172a;">Rs. ${(item.askingPrice || 0).toLocaleString()}</strong></td>
                          <td><span class="badge badge-care">${item.careOf || 'AL Asr'}</span></td>
                          <td><strong style="color: #0284c7; font-family: monospace;">${item.regNumber || 'UNREGISTERED'}</strong></td>
                          <td><span class="badge ${item.status === 'AVAILABLE' ? 'badge-available' : 'badge-reserved'}">${item.status}</span></td>
                        </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>

                <div class="footer">
                  AL ASR MOTORS Dealership Executive System • Sheet ${pageIdx + 1} of ${totalPages} • Showing records ${chunk.length > 0 ? startIdx + 1 : 0} to ${startIdx + chunk.length} of ${stockList.length} (25 entries per sheet)
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
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-mono text-[10px] uppercase font-bold border border-amber-500/30">
            Showroom Floor Stock
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Showroom Current Stock</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Browse vehicles currently available on the showroom floor. Export daily printable stock reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportStockPDF}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-cyan-400 font-bold font-mono text-xs rounded-xl flex items-center space-x-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>📄 Export Daily Stock PDF</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Showroom Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Showroom Vehicles</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{stats.totalUnits || 0} Units</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Available Stock Units</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.availableUnits || 0} Units</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Stock Valuation</p>
            <h3 className="text-xl font-extrabold text-cyan-400 mt-1">
              Rs. {(stats.totalValuation || 0).toLocaleString()}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Reserved Vehicles</p>
            <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{stats.reservedUnits || 0} Units</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search make, model, color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {['', 'AVAILABLE', 'RESERVED', 'SOLD'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                statusFilter === st
                  ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {st || 'ALL STOCK'}
            </button>
          ))}
        </div>
      </div>

      {/* Current Stock Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Vehicle & Model Specs</th>
                <th className="py-3.5 px-4">Year & Specs</th>
                <th className="py-3.5 px-4">Asking Price (PKR)</th>
                <th className="py-3.5 px-4">Care Of</th>
                <th className="py-3.5 px-4">Reg #</th>
                <th className="py-3.5 px-4">Showroom Status</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {stockList.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-semibold text-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-amber-400 font-mono font-bold">
                        {item.vehicle?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-white text-sm">{item.vehicle} {item.model}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {item.notes && !item.notes.includes('Imported from') ? item.notes : 'Showroom Floor Inventory'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-300">
                    <p className="font-bold text-white">{item.year}</p>
                    <p className="text-[11px] text-slate-400">{item.color} • {item.mileage ? item.mileage.toLocaleString() + ' km' : '0 km'}</p>
                  </td>

                  <td className="py-4 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                    Rs. {item.askingPrice?.toLocaleString()}
                  </td>

                  <td className="py-4 px-4 font-mono">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {item.careOf || 'AL Asr'}
                    </span>
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-300 text-xs font-bold">
                    {item.regNumber || '-'}
                  </td>

                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                      item.status === 'AVAILABLE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : item.status === 'RESERVED'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-400 text-xs">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{item.location}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit stock entry"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Delete stock entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] border border-white/10">
                          View Only
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {stockList.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No showroom stock entries found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT STOCK MODAL */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-white/10 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-1">
              {isEditModalOpen ? 'Edit Showroom Stock Vehicle' : 'Add New Showroom Stock Vehicle'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-5">
              Enter showroom floor vehicle specs, color, mileage, asking price, and care of manager.
            </p>

            <form onSubmit={isEditModalOpen ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Vehicle Make / Brand</label>
                  <input
                    type="text"
                    placeholder="E.g., Toyota, Honda, Hyundai"
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Model Variant</label>
                  <input
                    type="text"
                    placeholder="E.g., Corolla Altis 1.6"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Model Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2022 or 2022/23"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="E.g., Super White, Black"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Mileage (KM)</label>
                  <input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Asking Price (PKR)</label>
                  <input
                    type="number"
                    placeholder="E.g., 7500000"
                    value={formData.askingPrice}
                    onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Care Of / Manager</label>
                  <input
                    type="text"
                    placeholder="E.g., Umair Sab, Imran Sab, AL Asr"
                    value={formData.careOf}
                    onChange={(e) => setFormData({ ...formData, careOf: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Registration #</label>
                  <input
                    type="text"
                    placeholder="E.g., ATG 081, BCF-016"
                    value={formData.regNumber}
                    onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Showroom Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="SOLD">SOLD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Floor Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Stock Details / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Additional showroom vehicle notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-mono text-xs hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (isEditModalOpen ? 'Save Stock Changes' : 'Add Stock Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
