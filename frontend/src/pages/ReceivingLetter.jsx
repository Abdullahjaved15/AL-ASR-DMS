import React, { useState, useEffect } from 'react';
import { FileCheck, Plus, Search, Printer, Edit, Trash2, Car, User, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logoBase64 } from '../utils/logoBase64';

export default function ReceivingLetterPage() {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    vehicleName: '',
    chassisNumber: '',
    regNumber: '',
    color: '',
    ownerName: '',
    receiverName: user?.name || '',
    fileStatus: 'Complete Original File',
    keyStatus: '2 Keys (Master + Spare)',
    smartCardStatus: 'Smart Card Available',
    anyOtherAccessory: 'Spare Wheel, Jack, Toolkit, Floor Mats',
    notes: ''
  });

  useEffect(() => {
    fetchLetters();
    fetchSellersList();
  }, [search]);

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const data = await api.getReceivingLetters({ search });
      setLetters(data || []);
    } catch (err) {
      console.error('Failed to fetch receiving letters:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSellersList = async () => {
    try {
      const data = await api.getSellers();
      setSellers(data || []);
    } catch (err) {
      console.error('Failed to fetch sellers list for quick fill:', err);
    }
  };

  const handleSelectSellerQuickFill = (sellerId) => {
    const s = sellers.find(item => item.id === sellerId);
    if (s) {
      setFormData(prev => ({
        ...prev,
        vehicleName: `${s.vehicle} ${s.model}`,
        regNumber: s.numberPlate || '',
        color: s.color || '',
        ownerName: s.sellerName || '',
        chassisNumber: prev.chassisNumber || ''
      }));
    }
  };

  const resetForm = () => {
    setEditingLetter(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      vehicleName: '',
      chassisNumber: '',
      regNumber: '',
      color: '',
      ownerName: '',
      receiverName: user?.name || '',
      fileStatus: 'Complete Original File',
      keyStatus: '2 Keys (Master + Spare)',
      smartCardStatus: 'Smart Card Available',
      anyOtherAccessory: 'Spare Wheel, Jack, Toolkit, Floor Mats',
      notes: ''
    });
  };

  const handleEditClick = (rl) => {
    setEditingLetter(rl);
    setFormData({
      date: rl.date ? new Date(rl.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      vehicleName: rl.vehicleName || '',
      chassisNumber: rl.chassisNumber || '',
      regNumber: rl.regNumber || '',
      color: rl.color || '',
      ownerName: rl.ownerName || '',
      receiverName: rl.receiverName || user?.name || '',
      fileStatus: rl.fileStatus || 'Complete Original File',
      keyStatus: rl.keyStatus || '2 Keys (Master + Spare)',
      smartCardStatus: rl.smartCardStatus || 'Smart Card Available',
      anyOtherAccessory: rl.anyOtherAccessory || 'Spare Wheel, Jack, Toolkit, Floor Mats',
      notes: rl.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSaveLetter = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingLetter) {
        await api.updateReceivingLetter(editingLetter.id, formData);
        setIsAddModalOpen(false);
        resetForm();
        fetchLetters();
      } else {
        const newLetter = await api.createReceivingLetter(formData);
        setIsAddModalOpen(false);
        resetForm();
        fetchLetters();
        exportReceivingLetterPDF(newLetter);
      }
    } catch (err) {
      alert(err.message || 'Failed to save receiving letter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLetter = async (id, num) => {
    if (!window.confirm(`Are you sure you want to delete Receiving Letter ${num}?`)) return;
    try {
      await api.deleteReceivingLetter(id);
      fetchLetters();
    } catch (err) {
      alert(err.message || 'Failed to delete receiving letter');
    }
  };

  const exportReceivingLetterPDF = (rl) => {
    const printWindow = window.open('', '_blank');
    const letterDate = new Date(rl.date || rl.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receiving Letter – Al-Asr Motors (${rl.letterNumber || ''})</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #000000; background: #ffffff; line-height: 1.4; }
            
            .header-box { border: 2px solid #333333; border-radius: 40px; padding: 12px 25px; margin-bottom: 25px; display: flex; align-items: center; justify-content: space-between; }
            .logo-wrap { display: flex; align-items: center; gap: 15px; }
            .company-name { font-size: 28px; font-weight: 900; letter-spacing: 1px; color: #000; }
            .company-sub { font-size: 11px; font-style: italic; color: #333; margin-top: 2px; }

            .doc-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #000; text-decoration: underline; }

            table.rec-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1.5px solid #000; }
            table.rec-table td { padding: 8px 12px; border: 1px solid #000; font-size: 13px; vertical-align: middle; }
            table.rec-table tr td:first-child { font-weight: bold; width: 35%; background-color: #f9f9f9; }

            .notes-box { border: 1.5px solid #000; border-radius: 6px; padding: 12px 15px; margin-bottom: 40px; background: #fafafa; }
            .notes-title { font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; text-decoration: underline; }
            .notes-content { font-size: 12px; white-space: pre-wrap; word-wrap: break-word; color: #111; min-height: 40px; }

            .sig-section { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 30px; }
            .sig-line { width: 180px; border-top: 1px solid #000; text-align: left; padding-top: 5px; font-size: 13px; font-weight: bold; }

            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header-box" style="border: 2px solid #0f172a; border-radius: 16px; padding: 15px 25px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; background: linear-gradient(to right, #f8fafc, #ffffff);">
            <div class="logo-wrap" style="display: flex; align-items: center; gap: 18px;">
              <img src="${logoBase64}" alt="AL-ASR MOTORS" style="height: 85px; width: auto; object-fit: contain;" />
              <div>
                <div class="company-name" style="font-size: 28px; font-weight: 900; letter-spacing: 1px; color: #0f172a;">AL-ASR <span style="color: #0284c7;">MOTORS</span></div>
                <div style="font-size: 13px; font-weight: bold; color: #0284c7; margin-top: 2px;">OFFICIAL VEHICLE RECEIVING LETTER • گاڑی وصولی لیٹر</div>
                <div class="company-sub" style="font-size: 11px; color: #475569; margin-top: 2px;">Toyota, Honda, Suzuki, Hyundai, Mitsubishi • All kinds of luxury & commercial vehicles</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Main GT Road / City Center, Sahiwal, Pakistan • Phone: +92 300 1234567</div>
              </div>
            </div>
            <div style="text-align: right; background: #0f172a; color: #ffffff; padding: 12px 18px; border-radius: 10px; min-width: 170px;">
              <div style="font-size: 14px; font-weight: 800; color: #38bdf8; text-transform: uppercase;">RECEIVING LETTER</div>
              <div style="font-size: 12px; font-weight: bold; font-family: monospace; color: #f8fafc; margin-top: 3px;">Ref: ${rl.letterNumber || 'RL-DOC'}</div>
              <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">Date: ${letterDate}</div>
            </div>
          </div>

          <div class="doc-title">Receiving Letter – Al-Asr Motors.</div>

          <table class="rec-table">
            <tr>
              <td>Date:</td>
              <td>${letterDate}</td>
            </tr>
            <tr>
              <td>Vehicle Name:</td>
              <td><strong>${rl.vehicleName || ''}</strong></td>
            </tr>
            <tr>
              <td>Ch# (Chassis Number):</td>
              <td>${rl.chassisNumber || 'N/A'}</td>
            </tr>
            <tr>
              <td>Reg # (Registration Number):</td>
              <td><strong>${rl.regNumber || 'Unregistered'}</strong></td>
            </tr>
            <tr>
              <td>Color:</td>
              <td>${rl.color || 'N/A'}</td>
            </tr>
            <tr>
              <td>Owner Name:</td>
              <td><strong>${rl.ownerName || ''}</strong></td>
            </tr>
            <tr>
              <td>Receiver Name:</td>
              <td><strong>${rl.receiverName || ''}</strong></td>
            </tr>
            <tr>
              <td>File:</td>
              <td>${rl.fileStatus || 'N/A'}</td>
            </tr>
            <tr>
              <td>Key:</td>
              <td>${rl.keyStatus || 'N/A'}</td>
            </tr>
            <tr>
              <td>Smart Card:</td>
              <td>${rl.smartCardStatus || 'N/A'}</td>
            </tr>
            <tr>
              <td>Any Other Accessory:</td>
              <td>${rl.anyOtherAccessory || 'N/A'}</td>
            </tr>
          </table>

          <div class="notes-box">
            <div class="notes-title">Additional Notes & Detail Section:</div>
            <div class="notes-content">${rl.notes || 'No extra notes recorded.'}</div>
          </div>

          <div class="sig-section">
            <div class="sig-line">
              X Owner
            </div>
            <div class="sig-line">
              X Receiver
            </div>
          </div>

          <div class="footer">
            AL-ASR MOTORS • Official Vehicle Receiving Document • Generated by ${rl.createdByUser?.name || 'Staff'}
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
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Vehicle Receiving Letters</h2>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Fill receiving details, generate vehicle handover reports, and export official AL-ASR Receiving Letters.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Receiving Letter</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card rounded-2xl p-3 border border-white/10 flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search receiving letters by Vehicle, Owner Name, Receiver Name, Reg #, Chassis #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none font-mono"
        />
      </div>

      {/* Data Table of Receiving Letters */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Ref # & Date</th>
                <th className="py-3.5 px-4">Vehicle Details</th>
                <th className="py-3.5 px-4">Owner Name</th>
                <th className="py-3.5 px-4">Receiver Name</th>
                <th className="py-3.5 px-4">File / Key / Smart Card</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {letters.map((rl) => (
                <tr key={rl.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-mono">
                    <p className="font-bold text-emerald-400">{rl.letterNumber}</p>
                    <p className="text-[10px] text-slate-400">{new Date(rl.date || rl.createdAt).toLocaleDateString()}</p>
                  </td>

                  <td className="py-4 px-4">
                    <p className="font-extrabold text-white text-sm">{rl.vehicleName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Reg: <span className="text-amber-300 font-bold">{rl.regNumber || 'N/A'}</span> • Color: {rl.color || 'N/A'}
                    </p>
                  </td>

                  <td className="py-4 px-4 font-semibold text-white">
                    {rl.ownerName}
                  </td>

                  <td className="py-4 px-4 font-semibold text-cyan-400">
                    {rl.receiverName}
                  </td>

                  <td className="py-4 px-4 font-mono text-[11px] text-slate-300">
                    <p>File: <span className="text-slate-200">{rl.fileStatus || 'N/A'}</span></p>
                    <p>Key: <span className="text-slate-200">{rl.keyStatus || 'N/A'}</span></p>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditClick(rl)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono text-[11px] flex items-center space-x-1 transition-all"
                        title="Edit receiving letter details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => exportReceivingLetterPDF(rl)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] flex items-center space-x-1 transition-all"
                        title="Print & Export official Receiving Letter PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Export PDF</span>
                      </button>

                      <button
                        onClick={() => handleDeleteLetter(rl.id, rl.letterNumber)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete receiving letter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {letters.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No receiving letters found. Click "New Receiving Letter" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT RECEIVING LETTER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-3xl border border-white/10 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-6 h-6 text-emerald-400" />
                <h3 className="text-xl font-bold text-white">
                  {editingLetter ? `Edit Receiving Letter (${editingLetter.letterNumber})` : 'Create Receiving Letter – AL-ASR MOTORS'}
                </h3>
              </div>
              <button
                onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Quick fill selector from current seller stock */}
            {sellers.length > 0 && !editingLetter && (
              <div className="mb-4 p-3 bg-slate-900/90 rounded-2xl border border-white/10 flex items-center space-x-3">
                <Car className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-mono flex-shrink-0">Quick Fill from Inventory:</span>
                <select
                  onChange={(e) => handleSelectSellerQuickFill(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
                >
                  <option value="">Select vehicle to auto-populate...</option>
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.vehicle} {s.model} ({s.numberPlate || 'No Plate'}) - Owner: {s.sellerName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleSaveLetter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Vehicle Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota Civic Oriel"
                    value={formData.vehicleName}
                    onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Ch# (Chassis Number)</label>
                  <input
                    type="text"
                    placeholder="e.g. CH-992810"
                    value={formData.chassisNumber}
                    onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Reg # (Registration Number)</label>
                  <input
                    type="text"
                    placeholder="e.g. LEC-1234"
                    value={formData.regNumber}
                    onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Black / White / Silver"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Ahmad"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Receiver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Staff / Receiver Name"
                    value={formData.receiverName}
                    onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-cyan-300 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">File Status</label>
                  <input
                    type="text"
                    placeholder="e.g. Original Complete File / Duplicate"
                    value={formData.fileStatus}
                    onChange={(e) => setFormData({ ...formData, fileStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Key Status</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 Keys / 1 Key / Remote Key"
                    value={formData.keyStatus}
                    onChange={(e) => setFormData({ ...formData, keyStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Smart Card Status</label>
                  <input
                    type="text"
                    placeholder="e.g. Handed Over / Yes / No"
                    value={formData.smartCardStatus}
                    onChange={(e) => setFormData({ ...formData, smartCardStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Any Other Accessory</label>
                  <input
                    type="text"
                    placeholder="e.g. Spare Wheel, Jack, Toolkit, Navigation, Audio"
                    value={formData.anyOtherAccessory}
                    onChange={(e) => setFormData({ ...formData, anyOtherAccessory: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes / Detail Section at the end */}
              <div>
                <label className="block text-xs font-mono text-emerald-400 font-bold mb-1">
                  Notes / Details Section (Appears at the bottom of letter)
                </label>
                <textarea
                  rows="3"
                  placeholder="Enter any additional vehicle condition details, inspection observations, scratch marks, or special handover instructions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    {submitting ? 'Saving...' : editingLetter ? 'Update Receiving Letter' : 'Save & Print Receiving Letter'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
