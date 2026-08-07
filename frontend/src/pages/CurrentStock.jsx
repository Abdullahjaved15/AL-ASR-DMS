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

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createStockItem(formData);
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
      await api.updateStockItem(selectedStock.id, formData);
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
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS - Showroom Daily Stock Report (${todayStr})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #1e293b; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-box { display: flex; items-center; gap: 15px; }
            .title { font-size: 22px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 12px; color: #64748b; font-family: monospace; }
            .stats { display: flex; gap: 15px; margin-bottom: 20px; }
            .stat-box { flex: 1; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .stat-val { font-size: 18px; font-weight: bold; color: #0284c7; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            tr:nth-child(even) { background: #f8fafc; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .badge-available { background: #dcfce7; color: #15803d; }
            .badge-reserved { background: #fef3c7; color: #b45309; }
            .badge-care { background: #e0f2fe; color: #0369a1; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-box">
              <img src="${logoBase64}" alt="AL ASR MOTORS Logo" style="height: 105px; width: auto; object-fit: contain;" />
              <div>
                <div class="title">AL ASR MOTORS - Showroom Daily Stock</div>
                <div class="subtitle">Official Inventory Management Report • Generated: ${todayStr}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px; font-weight: bold; color: #0284c7;">Main Showroom Floor</div>
              <div style="font-size: 10px; color: #64748b;">Sahiwal, Pakistan</div>
            </div>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="stat-label">Total Vehicles on Floor</div>
              <div class="stat-val">${stats.totalUnits || 0} Units</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Available Vehicles</div>
              <div class="stat-val">${stats.availableUnits || 0} Units</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Showroom Stock Valuation</div>
              <div class="stat-val">Rs. ${(stats.totalValuation || 0).toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Vehicle & Model Specs</th>
                <th>Year</th>
                <th>Color</th>
                <th>Mileage</th>
                <th>Asking Price (PKR)</th>
                <th>Care Of</th>
                <th>Reg #</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${stockList.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${item.vehicle} ${item.model}</strong></td>
                  <td>${item.year}</td>
                  <td>${item.color}</td>
                  <td>${item.mileage ? item.mileage.toLocaleString() + ' km' : '0 km'}</td>
                  <td><strong>Rs. ${item.askingPrice?.toLocaleString()}</strong></td>
                  <td><span class="badge badge-care">${item.careOf || 'AL Asr'}</span></td>
                  <td>${item.regNumber || '-'}</td>
                  <td><span class="badge ${item.status === 'AVAILABLE' ? 'badge-available' : 'badge-reserved'}">${item.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Report generated by AL ASR Motors Executive System • Confidential Internal Showroom Document
          </div>

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
                        <p className="text-[11px] text-slate-400 font-mono">{item.notes || 'Main Showroom Floor'}</p>
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
                  <label className="block text-xs font-mono text-slate-400 mb-1">Vehicle Make / Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Toyota, Honda, Hyundai"
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Model Variant *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Corolla Altis 1.6"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Model Year *</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Color *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Super White, Black"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Mileage (KM) *</label>
                  <input
                    type="number"
                    required
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Asking Price (PKR) *</label>
                  <input
                    type="number"
                    required
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
