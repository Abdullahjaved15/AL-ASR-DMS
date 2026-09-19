import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Download, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  MapPin, 
  Tag, 
  Car, 
  UserCheck,
  TrendingUp,
  TrendingDown,
  Receipt,
  Layers,
  Landmark,
  Eye,
  RefreshCw,
  Sparkles,
  Info,
  Printer,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logoBase64 } from '../utils/logoBase64';
import { formatPKR, parsePakistaniPrice, getPriceHint, normalizePriceInput, formatPKRShort } from '../utils/priceFormatter';

export default function AccountsStock({ onNavigate }) {
  const { user, isAdmin, isSuperAdmin, isAccountsHead, canManageAccounts } = useAuth();
  const [stockList, setStockList] = useState([]);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [stats, setStats] = useState({ 
    totalUnits: 0, 
    totalValuation: 0, 
    totalPurchaseValuation: 0,
    projectedProfit: 0,
    availableUnits: 0, 
    reservedUnits: 0, 
    atCustomerUnits: 0, 
    soldUnits: 0,
    avgPrice: 0,
    avgPurchasePrice: 0
  });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
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
    regNumber: '',
    chassisNumber: '',
    ledgerAccountId: ''
  });

  useEffect(() => {
    fetchStock();
    fetchCoaAccounts();
  }, [search, statusFilter]);

  const fetchCoaAccounts = async () => {
    try {
      const res = await api.getAccounts();
      setCoaAccounts(res?.accounts || []);
    } catch (err) {
      console.error('Failed to fetch COA accounts in AccountsStock:', err);
    }
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      const data = await api.getAccountsStock({ search, status: statusFilter });
      if (data) {
        setStockList(data.stock || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error('Failed to fetch accounts stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const cleanStockPayload = (data) => ({
    ...data,
    askingPrice: data.askingPrice !== '' && data.askingPrice !== null && data.askingPrice !== undefined ? normalizePriceInput(data.askingPrice) : '',
    purchasePrice: data.purchasePrice !== '' && data.purchasePrice !== null && data.purchasePrice !== undefined ? normalizePriceInput(data.purchasePrice) : '',
    mileage: data.mileage ? parseInt(data.mileage, 10) || 0 : 0,
    ledgerAccountId: data.ledgerAccountId || null
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createAccountsStockItem(cleanStockPayload(formData));
      setIsAddModalOpen(false);
      resetForm();
      fetchStock();
      fetchCoaAccounts();
    } catch (err) {
      alert(err.message || 'Failed to add accounts stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedStock) return;
    setSubmitting(true);
    try {
      await api.updateAccountsStockItem(selectedStock.id, cleanStockPayload(formData));
      setIsEditModalOpen(false);
      setSelectedStock(null);
      resetForm();
      fetchStock();
      fetchCoaAccounts();
    } catch (err) {
      alert(err.message || 'Failed to update stock entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this accounts stock entry?')) return;
    try {
      await api.deleteAccountsStockItem(id);
      fetchStock();
    } catch (err) {
      alert(err.message || 'Failed to delete stock entry');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to DELETE ALL records from Accounts Current Stock? This will NOT affect Showroom stock.')) return;
    try {
      await api.clearAllAccountsStock();
      fetchStock();
    } catch (err) {
      alert(err.message || 'Failed to clear accounts stock');
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
      askingPrice: formatPKRShort(item.askingPrice) || '',
      purchasePrice: formatPKRShort(item.purchasePrice) || '',
      status: item.status || 'AVAILABLE',
      location: item.location || 'Main Showroom',
      notes: item.notes || '',
      careOf: item.careOf || 'AL Asr',
      regNumber: item.regNumber || '',
      chassisNumber: item.chassisNumber || '',
      ledgerAccountId: item.ledgerAccountId || ''
    });
    setIsEditModalOpen(true);
  };

  const openDetailsModal = (item) => {
    setSelectedStock(item);
    setIsDetailsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
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
      regNumber: '',
      chassisNumber: '',
      ledgerAccountId: ''
    });
  };

  // Daily Printable PDF Exporter with AL ASR Logo & Smart Fit-To-Page Engine (Showroom Stock Style, All Bold)
  const exportAccountsStockPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups in your browser to print.');
      return;
    }
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const totalCount = stockList.length;

    // Smart default: If total <= 35, fit all on 1 page! Otherwise default to 30
    const defaultPageSize = totalCount <= 35 ? Math.max(1, totalCount) : 30;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS - Accounts Current Stock (${todayStr})</title>
          <style>
            @media print {
              @page { size: landscape; margin: 4mm 6mm; }
              body { padding: 0 !important; background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              .sheet { page-break-after: always; break-after: page; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; padding: 2px; }
              .sheet:last-child { page-break-after: auto; break-after: auto; }
            }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; margin: 0; color: #0f172a; background: #f8fafc; font-size: 8.5px; line-height: 1.15; font-weight: 800; }
            .sheet {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              margin: 0 auto 16px auto;
              max-width: 297mm;
              padding: 12px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.06);
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              min-height: 195mm;
            }
            @media print {
              .sheet { border: none; border-radius: 0; margin: 0; max-width: none; padding: 0; box-shadow: none; min-height: 0; }
            }
            .no-print-bar {
              position: sticky;
              top: 0;
              z-index: 1000;
              background: #0f172a;
              color: white;
              padding: 8px 16px;
              border-radius: 8px;
              max-width: 297mm;
              margin: 0 auto 12px auto;
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.2);
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 12px;
            }
            .btn-action {
              background: #1e293b;
              color: #38bdf8;
              border: 1px solid #38bdf8;
              padding: 5px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              font-size: 11px;
              display: inline-flex;
              align-items: center;
              gap: 4px;
              transition: all 0.2s;
            }
            .btn-action:hover, .btn-action.active {
              background: #0284c7;
              color: white;
              border-color: #0284c7;
            }
            .btn-print {
              background: #0284c7;
              color: white;
              border: none;
              padding: 6px 18px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 800;
              font-size: 12px;
              display: inline-flex;
              align-items: center;
              gap: 6px;
            }
            .btn-print:hover { background: #0369a1; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #0284c7; padding-bottom: 4px; margin-bottom: 4px; }
            .logo-box { display: flex; align-items: center; gap: 8px; }
            .title { font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.3px; }
            .subtitle { font-size: 8px; color: #64748b; font-family: monospace; font-weight: 800; }
            .stats-inline { display: flex; gap: 10px; font-size: 8px; background: #f8fafc; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
            .stat-item { font-weight: 800; color: #334155; }
            .stat-item strong { color: #0284c7; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 2px; border: 1.5px solid #0f172a; font-size: 8.5px; font-weight: 800; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 4px 5px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; border: 1px solid #334155; }
            td { padding: 3.5px 5px; border: 1px solid #64748b; font-size: 8.5px; font-weight: 800; vertical-align: middle; color: #0f172a; }
            td * { font-size: 8.5px !important; font-weight: 800 !important; color: #0f172a !important; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 6px; text-align: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 3px; font-weight: 800; }
          </style>
        </head>
        <body>
          <div class="no-print no-print-bar">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: 900; color: #38bdf8;">AL ASR MOTORS</span>
              <span style="color: #94a3b8;">• Layout Controls (${totalCount} Units)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button class="btn-action ${defaultPageSize >= totalCount ? 'active' : ''}" onclick="applyPageSize(${Math.max(1, totalCount)})">📄 Fit to 1 Page (${totalCount} rows)</button>
              <button class="btn-action ${defaultPageSize === 25 ? 'active' : ''}" onclick="applyPageSize(25)">📑 25 / Page</button>
              <button class="btn-action ${defaultPageSize === 35 ? 'active' : ''}" onclick="applyPageSize(35)">📑 35 / Page</button>
              <button class="btn-print" onclick="window.print()">🖨️ Print Document</button>
            </div>
          </div>

          <div id="sheets-container"></div>

          <script>
            const stockData = ${JSON.stringify(stockList)};
            const statsData = ${JSON.stringify(stats)};
            const todayStr = "${todayStr}";
            const logoBase64 = "${logoBase64}";

            function parsePrice(val) {
              if (!val) return 0;
              const s = String(val).toLowerCase().replace(/,/g, '').trim();
              if (s.includes('crore') || s.includes('cr')) {
                const num = parseFloat(s.replace(/[^0-9.]/g, ''));
                return isNaN(num) ? 0 : Math.round(num * 10000000);
              }
              if (s.includes('lac') || s.includes('lakh') || s.includes('lacs')) {
                const num = parseFloat(s.replace(/[^0-9.]/g, ''));
                return isNaN(num) ? 0 : Math.round(num * 100000);
              }
              const num = parseFloat(s.replace(/[^0-9.]/g, ''));
              return isNaN(num) ? 0 : Math.round(num);
            }

            function formatPKR(val) {
              if (val === null || val === undefined || val === '') return 'Rs. 0';
              const num = typeof val === 'number' ? val : parseFloat(val);
              if (isNaN(num)) return String(val);
              return 'Rs. ' + num.toLocaleString();
            }

            function applyPageSize(size) {
              const container = document.getElementById('sheets-container');
              const pageChunks = [];
              for (let i = 0; i < stockData.length; i += size) {
                pageChunks.push(stockData.slice(i, i + size));
              }
              if (pageChunks.length === 0) pageChunks.push([]);
              const totalPages = pageChunks.length;

              // Update active button styling in toolbar
              document.querySelectorAll('.btn-action').forEach(b => b.classList.remove('active'));
              if (size >= stockData.length) {
                document.querySelectorAll('.btn-action')[0]?.classList.add('active');
              } else if (size === 25) {
                document.querySelectorAll('.btn-action')[1]?.classList.add('active');
              } else if (size === 35) {
                document.querySelectorAll('.btn-action')[2]?.classList.add('active');
              }

              container.innerHTML = pageChunks.map((chunk, pageIdx) => {
                const startIdx = pageIdx * size;
                return \`
                  <div class="sheet">
                    <div>
                      <div class="header">
                        <div class="logo-box">
                          <img src="\${logoBase64}" alt="AL ASR MOTORS" style="height: 36px; width: auto; object-fit: contain;" />
                          <div>
                            <div class="title">AL ASR MOTORS — ACCOUNTS CURRENT STOCK & VALUATION</div>
                            <div class="subtitle">Official Accounts & Financial Inventory Ledger • Generated: \${todayStr} • Sahiwal, Pakistan</div>
                          </div>
                        </div>
                        <div class="stats-inline">
                          <div class="stat-item">Total Units: <strong>\${statsData.totalUnits || stockData.length}</strong></div>
                          <div class="stat-item">Cost Value: <strong>Rs. \${(statsData.totalPurchaseValuation || 0).toLocaleString()}</strong></div>
                          <div class="stat-item">Asking Valuation: <strong>Rs. \${(statsData.totalValuation || 0).toLocaleString()}</strong></div>
                          <div class="stat-item">Projected Margin: <strong>Rs. \${(statsData.projectedProfit || 0).toLocaleString()}</strong></div>
                          <div class="stat-item" style="color: #0284c7;">Sheet <strong>\${pageIdx + 1} of \${totalPages}</strong></div>
                        </div>
                      </div>

                      <table>
                        <thead>
                          <tr>
                            <th style="width: 25px;">#</th>
                            <th>Vehicle & Model Specs</th>
                            <th style="width: 45px;">Year</th>
                            <th style="width: 55px;">Color</th>
                            <th style="width: 65px;">Mileage</th>
                            <th style="width: 85px;">Reg / Plate #</th>
                            <th style="width: 105px;">Purchase Cost (PKR)</th>
                            <th style="width: 105px;">Asking Demand (PKR)</th>
                            <th style="width: 95px;">Projected Margin</th>
                            <th style="width: 65px;">Care Of</th>
                            <th style="width: 70px;">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          \${chunk.length === 0 ? \`
                            <tr>
                              <td colspan="11" style="text-align: center; padding: 20px; color: #64748b; font-weight: 800;">No accounts stock records found.</td>
                            </tr>
                          \` : chunk.map((item, idx) => {
                            const globalIdx = startIdx + idx + 1;
                            const cost = parsePrice(item.purchasePrice);
                            const asking = parsePrice(item.askingPrice);
                            const margin = (asking > 0 && cost > 0) ? (asking - cost) : 0;
                            return \`
                            <tr>
                              <td><strong>\${globalIdx}</strong></td>
                              <td><strong>\${item.vehicle || ''} \${item.model || ''}</strong></td>
                              <td><strong>\${item.year || 'N/A'}</strong></td>
                              <td><strong>\${item.color || 'N/A'}</strong></td>
                              <td><strong>\${item.mileage ? item.mileage.toLocaleString() + ' km' : '0 km'}</strong></td>
                              <td><strong>\${item.regNumber || 'UNREGISTERED'}</strong></td>
                              <td><strong>\${cost > 0 ? formatPKR(cost) : 'N/A'}</strong></td>
                              <td><strong>\${asking > 0 ? formatPKR(asking) : 'N/A'}</strong></td>
                              <td><strong>\${margin !== 0 ? (margin > 0 ? '+' + formatPKR(margin) : '-' + formatPKR(Math.abs(margin))) : '-'}</strong></td>
                              <td><strong>\${item.careOf || 'AL Asr'}</strong></td>
                              <td><strong>\${item.status || 'AVAILABLE'}</strong></td>
                            </tr>
                            \`;
                          }).join('')}
                        </tbody>
                      </table>
                    </div>

                    <div class="footer">
                      AL ASR MOTORS Dealership Executive System • Sheet \${pageIdx + 1} of \${totalPages} • Showing records \${chunk.length > 0 ? startIdx + 1 : 0} to \${startIdx + chunk.length} of \${stockData.length}
                    </div>
                  </div>
                \`;
              }).join('');
            }

            // Initial Render
            applyPageSize(${defaultPageSize});

            // Automatically trigger system print dialog
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 font-mono text-[10px] uppercase font-bold border border-cyan-500/30 flex items-center space-x-1">
              <Landmark className="w-3 h-3" />
              <span>Accounts & Finance Inventory</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold border border-amber-500/30">
              Valuation & Cost Tracking
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 flex items-center space-x-2">
            <span>Accounts Current Stock</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Complete vehicle inventory with purchase cost, asking demand, profit margins, and live financial valuation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate ? onNavigate('invoices') : (window.location.hash = '#invoices')}
            className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 text-amber-400 font-bold font-mono text-xs rounded-xl flex items-center space-x-1.5 transition-all shadow-sm"
            title="Go to Payment Vouchers & Invoices"
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>Vouchers & Invoices</span>
          </button>

          <button
            onClick={exportAccountsStockPDF}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-400 font-bold font-mono text-xs rounded-xl flex items-center space-x-2 transition-all shadow-sm"
            title="Print or Export Accounts Current Stock Document"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ Print Accounts Stock</span>
          </button>

          {stockList.length > 0 && canManageAccounts && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold font-mono text-xs rounded-xl flex items-center space-x-1.5 transition-all shadow-sm"
              title="Delete all accounts current stock records"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Clear Accounts Stock</span>
            </button>
          )}

          {canManageAccounts && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Accounts Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Stock Units */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Stock Units</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{stats.totalUnits || 0} Units</h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Available: <span className="text-emerald-400 font-bold">{stats.availableUnits || 0}</span> • Res: <span className="text-amber-400 font-bold">{stats.reservedUnits || 0}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Total Purchase / Cost Valuation */}
        <div className="glass-card p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90">Total Purchase Cost</p>
            <h3 className="text-xl font-extrabold text-amber-300 mt-1">
              Rs. {(stats.totalPurchaseValuation || 0).toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Avg Cost: Rs. {(stats.avgPurchasePrice || 0).toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Asking / Market Valuation */}
        <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400/90">Asking / Market Value</p>
            <h3 className="text-xl font-extrabold text-emerald-400 mt-1">
              Rs. {(stats.totalValuation || 0).toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Avg Demand: Rs. {(stats.avgPrice || 0).toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Projected Gross Profit Margin */}
        <div className="glass-card p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-blue-400/90">Projected Margin</p>
            <h3 className={`text-xl font-extrabold mt-1 ${(stats.projectedProfit || 0) >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {(stats.projectedProfit || 0) >= 0 ? '+' : ''}Rs. {(stats.projectedProfit || 0).toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Spread: {stats.totalPurchaseValuation > 0 ? ((stats.projectedProfit / stats.totalPurchaseValuation) * 100).toFixed(1) + '%' : '0%'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Status Distribution */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">At Customer / Reserved</p>
            <h3 className="text-2xl font-extrabold text-sky-400 mt-1">
              {(stats.atCustomerUnits || 0) + (stats.reservedUnits || 0)} Units
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Customer: <span className="text-sky-300 font-bold">{stats.atCustomerUnits || 0}</span> • Sold: <span className="text-rose-400 font-bold">{stats.soldUnits || 0}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search make, model, plate, care of..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {['', 'AVAILABLE', 'RESERVED', 'At Customer', 'SOLD'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                statusFilter === st
                  ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {st ? (st === 'At Customer' ? 'AT CUSTOMER' : st) : 'ALL STOCK'}
            </button>
          ))}
          <button
            onClick={fetchStock}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Accounts Current Stock Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Vehicle & Specs</th>
                <th className="py-3.5 px-4">Plate / Reg #</th>
                <th className="py-3.5 px-4">Purchase Cost (PKR)</th>
                <th className="py-3.5 px-4">Asking Demand (PKR)</th>
                <th className="py-3.5 px-4">Projected Margin</th>
                <th className="py-3.5 px-4">Care Of</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {stockList.map((item) => {
                const cost = parsePakistaniPrice(item.purchasePrice);
                const asking = parsePakistaniPrice(item.askingPrice);
                const margin = (asking > 0 && cost > 0) ? (asking - cost) : 0;
                const marginPct = (cost > 0 && margin !== 0) ? ((margin / cost) * 100).toFixed(1) : null;

                return (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    {/* Vehicle & Specs */}
                    <td className="py-4 px-4 font-semibold text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono font-bold">
                          {item.vehicle?.substring(0, 2).toUpperCase() || 'CR'}
                        </div>
                        <div>
                          <p className="font-extrabold text-white text-sm">{item.vehicle} {item.model}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {item.year} • {item.color} • {item.mileage ? item.mileage.toLocaleString() + ' km' : '0 km'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Plate / Reg # */}
                    <td className="py-4 px-4 font-mono">
                      <span className="text-cyan-400 font-bold bg-slate-900 px-2 py-1 rounded-lg border border-white/10 text-xs">
                        {item.regNumber || 'UNREGISTERED'}
                      </span>
                    </td>

                    {/* Purchase Cost */}
                    <td className="py-4 px-4 font-mono">
                      {cost > 0 ? (
                        <div>
                          <p className="font-extrabold text-amber-300 text-sm">{formatPKR(cost)}</p>
                          <p className="text-[10px] text-slate-500">Acquisition Cost</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic font-mono text-[11px]">Not Entered</span>
                      )}
                    </td>

                    {/* Asking Demand */}
                    <td className="py-4 px-4 font-mono">
                      {asking > 0 ? (
                        <div>
                          <p className="font-extrabold text-emerald-400 text-sm">{formatPKR(asking)}</p>
                          <p className="text-[10px] text-slate-500">Floor Demand</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic font-mono text-[11px]">N/A</span>
                      )}
                    </td>

                    {/* Projected Margin */}
                    <td className="py-4 px-4 font-mono">
                      {cost > 0 && asking > 0 ? (
                        <div>
                          <p className={`font-bold text-xs ${margin >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                            {margin >= 0 ? '+' : ''}{formatPKR(margin)}
                          </p>
                          {marginPct && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${margin >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {margin >= 0 ? '+' : ''}{marginPct}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-xs">-</span>
                      )}
                    </td>

                    {/* Care Of */}
                    <td className="py-4 px-4 font-mono">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {item.careOf || 'AL Asr'}
                      </span>
                    </td>

                    {/* Stock Status */}
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                        item.status === 'AVAILABLE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : (item.status === 'At Customer' || item.status === 'AT_CUSTOMER')
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                          : item.status === 'RESERVED'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-4 font-mono text-slate-400 text-xs">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        <span>{item.location || 'Main Showroom'}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openDetailsModal(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                          title="View financial breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canManageAccounts && (
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
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {stockList.length === 0 && !loading && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No accounts stock entries found matching the filter criteria.
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
          <div className="glass-modal rounded-3xl p-6 w-full max-w-xl border border-white/10 shadow-2xl my-8 bg-slate-950">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Package className="w-5 h-5 text-cyan-400" />
                  <span>{isEditModalOpen ? 'Edit Accounts Stock Vehicle' : 'Add New Accounts Stock Vehicle'}</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Enter vehicle specifications, purchase cost, asking demand, and care of details.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Model / Variant *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Corolla Altis Grande, Civic RS"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Model Year</label>
                  <input
                    type="text"
                    placeholder="2024"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Exterior Color</label>
                  <input
                    type="text"
                    placeholder="White, Black, Silver..."
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Mileage (km)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Purchased From Party Ledger (Chart of Accounts) */}
              <div className="p-3.5 bg-cyan-500/5 rounded-2xl border border-cyan-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono text-cyan-300 font-bold">
                    Purchased From (Chart of Accounts Ledger)
                  </label>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                    Auto-posts payable liability to ledger
                  </span>
                </div>
                <select
                  value={formData.ledgerAccountId || ''}
                  onChange={(e) => {
                    const selectedAcc = coaAccounts.find(a => a.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      ledgerAccountId: e.target.value,
                      careOf: selectedAcc ? selectedAcc.name : formData.careOf
                    });
                  }}
                  className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono font-semibold"
                >
                  <option value="">-- None / Manual Cash Purchase --</option>
                  {coaAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} ({acc.subType || acc.type}) — Balance: Rs. {acc.currentBalance.toLocaleString()}
                    </option>
                  ))}
                </select>
                {formData.ledgerAccountId && formData.purchasePrice && (
                  <p className="text-[11px] text-emerald-400 font-mono">
                    ✓ Will automatically post <strong>Rs. {formData.purchasePrice}</strong> into this ledger as payable.
                  </p>
                )}
              </div>

              {/* Price Fields with hints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-3.5 rounded-2xl border border-white/5">
                <div>
                  <label className="block text-xs font-mono text-amber-400 font-bold mb-1">
                    Purchase / Cost Price (PKR)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., 65 Lacs or 6500000"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400 font-mono"
                  />
                  {formData.purchasePrice && (
                    <p className="text-[10px] text-amber-400/90 font-mono mt-1">
                      Hint: {getPriceHint(formData.purchasePrice)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono text-emerald-400 font-bold mb-1">
                    Asking / Demand Price (PKR)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., 72 Lacs or 7200000"
                    value={formData.askingPrice}
                    onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-400 font-mono"
                  />
                  {formData.askingPrice && (
                    <p className="text-[10px] text-emerald-400/90 font-mono mt-1">
                      Hint: {getPriceHint(formData.askingPrice)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Reg / Plate #</label>
                  <input
                    type="text"
                    placeholder="E.g., LEA-2024-9988"
                    value={formData.regNumber}
                    onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Chassis #</label>
                  <input
                    type="text"
                    placeholder="Chassis Number"
                    value={formData.chassisNumber}
                    onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Care Of / Seller</label>
                  <input
                    type="text"
                    placeholder="AL Asr / Seller Name"
                    value={formData.careOf}
                    onChange={(e) => setFormData({ ...formData, careOf: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Stock Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="At Customer">AT CUSTOMER</option>
                    <option value="SOLD">SOLD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="Main Showroom Floor / Warehouse / Sahiwal"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Accounts & Financial Notes</label>
                <textarea
                  rows="2"
                  placeholder="Purchase terms, owner details, repair / touchup expense records..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-mono font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isEditModalOpen ? 'Update Stock Entry' : 'Add to Accounts Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {isDetailsModalOpen && selectedStock && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-white/10 shadow-2xl bg-slate-950">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 font-mono text-[10px] uppercase font-bold border border-cyan-500/30">
                  Accounts Vehicle Breakdown
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {selectedStock.vehicle} {selectedStock.model} ({selectedStock.year})
                </h3>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-white/5">
                <div>
                  <p className="text-[10px] text-slate-400 font-mono uppercase">Acquisition / Cost Price</p>
                  <p className="text-lg font-extrabold text-amber-300 font-mono">
                    {selectedStock.purchasePrice ? formatPKR(selectedStock.purchasePrice) : 'Not Recorded'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-mono uppercase">Floor / Asking Demand</p>
                  <p className="text-lg font-extrabold text-emerald-400 font-mono">
                    {selectedStock.askingPrice ? formatPKR(selectedStock.askingPrice) : 'Not Set'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px] block">Reg #</span>
                  <span className="text-cyan-400 font-bold">{selectedStock.regNumber || 'UNREGISTERED'}</span>
                </div>
                <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px] block">Color</span>
                  <span className="text-white font-bold">{selectedStock.color || 'White'}</span>
                </div>
                <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px] block">Mileage</span>
                  <span className="text-white font-bold">{selectedStock.mileage ? selectedStock.mileage.toLocaleString() + ' km' : '0 km'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px] block">Care Of</span>
                  <span className="text-white font-bold">{selectedStock.careOf || 'AL Asr'}</span>
                </div>
                <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px] block">Location</span>
                  <span className="text-white font-bold">{selectedStock.location || 'Main Showroom'}</span>
                </div>
              </div>

              {selectedStock.notes && (
                <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 text-xs">
                  <span className="text-slate-500 text-[10px] font-mono block mb-1">Notes & Financial History</span>
                  <p className="text-slate-300 font-mono">{selectedStock.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    if (onNavigate) onNavigate('invoices');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center space-x-1.5"
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  <span>Create Payment Voucher</span>
                </button>

                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
