import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Search, Filter, Printer, Trash2, DollarSign, Car, User, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logoBase64 } from '../utils/logoBase64';

export default function Invoices() {
  const { isSuperAdmin } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ totalInvoices: 0, totalSalesVolume: 0, totalCommissionEarned: 0, grandTotalValue: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerCity: '',
    carVehicle: '',
    carModel: '',
    carYear: new Date().getFullYear(),
    carRegNumber: '',
    chassisNumber: '',
    engineNumber: '',
    saleAmount: '',
    commissionPercent: '2.0',
    paymentStatus: 'PAID',
    remarks: ''
  });

  useEffect(() => {
    fetchInvoices();
  }, [search]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoices({ search });
      if (data) {
        setInvoices(data.invoices || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerCity: '',
      carVehicle: '',
      carModel: '',
      carYear: new Date().getFullYear(),
      carRegNumber: '',
      chassisNumber: '',
      engineNumber: '',
      saleAmount: '',
      commissionPercent: '2.0',
      paymentStatus: 'PAID',
      remarks: ''
    });
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createInvoice(formData);
      setIsAddModalOpen(false);
      resetForm();
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Failed to create sales invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (id, invNum) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invNum}?`)) return;
    try {
      await api.deleteInvoice(id);
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Failed to delete invoice');
    }
  };

  const exportInvoicePDF = (inv) => {
    const printWindow = window.open('', '_blank');
    const createdDate = new Date(inv.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS - Official Sales Voucher (${inv.invoiceNumber})</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #0f172a; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0284c7; padding-bottom: 20px; margin-bottom: 25px; }
            .logo-box { display: flex; align-items: center; gap: 20px; }
            .title { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; }
            .subtitle { font-size: 13px; color: #0284c7; font-weight: bold; margin-top: 4px; }
            .inv-badge { background: #0f172a; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-align: right; }
            .inv-num { font-size: 16px; font-weight: bold; font-family: monospace; }
            .inv-date { font-size: 11px; color: #94a3b8; margin-top: 4px; }
            
            .grid-2 { display: flex; gap: 20px; margin-bottom: 25px; }
            .card-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
            .box-title { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; }
            .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
            .info-label { color: #64748b; }
            .info-val { font-weight: bold; color: #0f172a; }

            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            
            .total-table { width: 320px; margin-left: auto; margin-bottom: 30px; border-collapse: collapse; }
            .total-table td { padding: 8px 12px; font-size: 13px; }
            .grand-total { background: #0284c7; color: #ffffff; font-weight: bold; font-size: 16px; }

            .terms { background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; font-size: 11px; color: #475569; margin-bottom: 40px; }
            
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-box { width: 200px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; font-weight: bold; color: #475569; }

            .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-box">
              <img src="${logoBase64}" alt="AL ASR MOTORS Logo" style="height: 95px; width: auto; object-fit: contain;" />
              <div>
                <div class="title">AL ASR MOTORS</div>
                <div class="subtitle">OFFICIAL VEHICLE SALES INVOICE & VOUCHER</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Showroom Floor • Sahiwal, Pakistan</div>
              </div>
            </div>
            <div class="inv-badge">
              <div class="inv-num">${inv.invoiceNumber}</div>
              <div class="inv-date">Issued: ${createdDate}</div>
              <div style="margin-top: 6px; font-size: 10px; background: #22c55e; color: #000; padding: 2px 6px; border-radius: 4px; display: inline-block; font-weight: bold;">
                STATUS: ${inv.paymentStatus}
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="card-box">
              <div class="box-title">Customer / Buyer Details</div>
              <div class="info-row">
                <span class="info-label">Customer Name:</span>
                <span class="info-val">${inv.customerName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone Number:</span>
                <span class="info-val">${inv.customerPhone || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">City / Address:</span>
                <span class="info-val">${inv.customerCity || 'N/A'}</span>
              </div>
            </div>

            <div class="card-box">
              <div class="box-title">Vehicle Specifications</div>
              <div class="info-row">
                <span class="info-label">Vehicle Make & Model:</span>
                <span class="info-val">${inv.carVehicle} ${inv.carModel} (${inv.carYear})</span>
              </div>
              <div class="info-row">
                <span class="info-label">Registration / Number Plate:</span>
                <span class="info-val" style="color:#0284c7;">${inv.carRegNumber || 'UNREGISTERED'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Chassis / Engine #:</span>
                <span class="info-val">${inv.chassisNumber || 'N/A'} / ${inv.engineNumber || 'N/A'}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Vehicle Specs</th>
                <th style="text-align: right;">Sale Price (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Vehicle Purchase Sale Amount</strong></td>
                <td>${inv.carVehicle} ${inv.carModel} (${inv.carYear}) • Reg: ${inv.carRegNumber || 'N/A'}</td>
                <td style="text-align: right; font-weight: bold;">Rs. ${inv.saleAmount?.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <table class="total-table">
            <tr>
              <td>Car Sale Amount:</td>
              <td style="text-align: right; font-weight: bold;">Rs. ${inv.saleAmount?.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Commission (${inv.commissionPercent || 0}%):</td>
              <td style="text-align: right; font-weight: bold; color: #0284c7;">Rs. ${inv.commissionAmount?.toLocaleString()}</td>
            </tr>
            <tr class="grand-total">
              <td>Grand Total Amount:</td>
              <td style="text-align: right;">Rs. ${inv.totalAmount?.toLocaleString()}</td>
            </tr>
          </table>

          ${inv.remarks ? `
            <div style="margin-bottom: 20px; font-size: 12px;">
              <strong>Remarks / Sales Terms:</strong> ${inv.remarks}
            </div>
          ` : ''}

          <div class="terms">
            <strong>Terms & Conditions:</strong> Vehicles sold are inspected and delivered upon full payment clearance. This document serves as the official transaction voucher for AL ASR MOTORS.
          </div>

          <div class="signatures">
            <div class="sig-box">Customer Signature</div>
            <div class="sig-box">Sales Executive Signature</div>
            <div class="sig-box">Authorized Super Admin Stamp</div>
          </div>

          <div class="footer">
            AL ASR MOTORS • Official Sales Voucher System • Generated by Super Admin: ${inv.createdByUser?.name || 'Super Admin'}
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

  // Auto-calculated values for form preview
  const numericSale = parseFloat(formData.saleAmount) || 0;
  const numericCommPercent = parseFloat(formData.commissionPercent) || 0;
  const computedCommission = (numericSale * numericCommPercent) / 100;
  const computedGrandTotal = numericSale + computedCommission;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Super Admin Sales Invoices & Vouchers</h2>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Create, manage, and print official car sales vouchers and commission calculations.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Sales Invoice</span>
        </button>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-1">
          <p className="text-[11px] font-mono text-slate-400 uppercase">Total Sales Invoices</p>
          <p className="text-2xl font-extrabold text-white font-mono">{stats.totalInvoices || 0} Vouchers</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-1">
          <p className="text-[11px] font-mono text-slate-400 uppercase">Total Vehicle Sales Volume</p>
          <p className="text-2xl font-extrabold text-cyan-400 font-mono">Rs. {(stats.totalSalesVolume || 0).toLocaleString()}</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-1">
          <p className="text-[11px] font-mono text-slate-400 uppercase">Total Commission Earned</p>
          <p className="text-2xl font-extrabold text-amber-400 font-mono">Rs. {(stats.totalCommissionEarned || 0).toLocaleString()}</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-1">
          <p className="text-[11px] font-mono text-slate-400 uppercase">Grand Invoice Revenue</p>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">Rs. {(stats.grandTotalValue || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="glass-card rounded-2xl p-3 border border-white/10 flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search by Invoice #, Customer Name, Phone, Car Make/Model, Reg Number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none font-mono"
        />
      </div>

      {/* Saved Invoices Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Invoice # & Date</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Car Sales Specs</th>
                <th className="py-3.5 px-4">Car Sale Amount</th>
                <th className="py-3.5 px-4">Commission (%)</th>
                <th className="py-3.5 px-4">Grand Total</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-mono">
                    <p className="font-bold text-amber-400">{inv.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </td>

                  <td className="py-4 px-4">
                    <p className="font-extrabold text-white text-sm">{inv.customerName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{inv.customerPhone || 'N/A'} • {inv.customerCity || 'N/A'}</p>
                  </td>

                  <td className="py-4 px-4">
                    <p className="font-semibold text-white">{inv.carVehicle} {inv.carModel} ({inv.carYear})</p>
                    {inv.carRegNumber && (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold mt-0.5">
                        {inv.carRegNumber}
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 font-mono font-extrabold text-cyan-400 text-sm">
                    Rs. {inv.saleAmount?.toLocaleString()}
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-200">
                    <p className="font-bold text-amber-300">{inv.commissionPercent}%</p>
                    <p className="text-[10px] text-slate-400">Rs. {inv.commissionAmount?.toLocaleString()}</p>
                  </td>

                  <td className="py-4 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                    Rs. {inv.totalAmount?.toLocaleString()}
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => exportInvoicePDF(inv)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-[11px] flex items-center space-x-1 transition-all"
                        title="Print official sales voucher PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Voucher</span>
                      </button>

                      <button
                        onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {invoices.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No saved invoices found. Click "New Sales Invoice" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SALES INVOICE / VOUCHER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-3xl border border-white/10 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center space-x-2">
                <Receipt className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-bold text-white">Create Car Sales Invoice & Voucher</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              {/* Customer Information */}
              <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3">
                <h4 className="text-xs uppercase font-mono text-cyan-400 font-bold tracking-wider">1. Customer Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Customer Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Ali"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+92 300 1234567"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">City / Location</label>
                    <input
                      type="text"
                      placeholder="Sahiwal"
                      value={formData.customerCity}
                      onChange={(e) => setFormData({ ...formData, customerCity: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Specifications */}
              <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3">
                <h4 className="text-xs uppercase font-mono text-amber-400 font-bold tracking-wider">2. Vehicle Car Sales Specifications</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Car Make / Brand *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Honda"
                      value={formData.carVehicle}
                      onChange={(e) => setFormData({ ...formData, carVehicle: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Car Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Civic Oriel"
                      value={formData.carModel}
                      onChange={(e) => setFormData({ ...formData, carModel: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Model Year</label>
                    <input
                      type="number"
                      value={formData.carYear}
                      onChange={(e) => setFormData({ ...formData, carYear: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Number Plate (Reg #)</label>
                    <input
                      type="text"
                      placeholder="e.g. LEC-1234"
                      value={formData.carRegNumber}
                      onChange={(e) => setFormData({ ...formData, carRegNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Chassis Number</label>
                    <input
                      type="text"
                      placeholder="e.g. CH-99201"
                      value={formData.chassisNumber}
                      onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Engine Number</label>
                    <input
                      type="text"
                      placeholder="e.g. ENG-8810"
                      value={formData.engineNumber}
                      onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3 bg-slate-950/60">
                <h4 className="text-xs uppercase font-mono text-emerald-400 font-bold tracking-wider">3. Sale Amount & Commission Calculation</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Car Sale Amount (PKR) *</label>
                    <input
                      type="number"
                      required
                      placeholder="3500000"
                      value={formData.saleAmount}
                      onChange={(e) => setFormData({ ...formData, saleAmount: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-base text-cyan-400 font-mono font-extrabold focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="2.0"
                      value={formData.commissionPercent}
                      onChange={(e) => setFormData({ ...formData, commissionPercent: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-base text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Calculated Commission</label>
                    <div className="w-full bg-slate-900/80 border border-amber-500/30 rounded-xl px-3 py-2 text-base text-amber-300 font-mono font-bold">
                      Rs. {computedCommission.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex justify-between items-center font-mono">
                  <span className="text-xs text-slate-300 font-bold">Total Invoice Voucher Amount:</span>
                  <span className="text-lg text-emerald-400 font-extrabold">Rs. {computedGrandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Invoice Remarks & Sales Terms</label>
                <textarea
                  rows="2"
                  placeholder="Payment terms, delivery condition, accessories included..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>{submitting ? 'Creating...' : 'Save & Issue Voucher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
