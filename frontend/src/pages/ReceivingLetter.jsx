import React, { useState, useEffect } from 'react';
import { FileCheck, Plus, Search, Printer, Edit, Trash2, Car, User, Calendar, Clock, FileText, CheckCircle2, Camera, Image as ImageIcon, Upload, Eye, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logoBase64 } from '../utils/logoBase64';
import { formatPKR, parsePakistaniPrice, getPriceHint, normalizePriceInput, formatPKRShort } from '../utils/priceFormatter';

export default function ReceivingLetterPage() {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Image Upload & Gallery Modal States
  const [selectedFilesForUpload, setSelectedFilesForUpload] = useState([]);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedLetterForMedia, setSelectedLetterForMedia] = useState(null);
  const [mediaActiveTab, setMediaActiveTab] = useState('gallery'); // 'gallery' | 'upload'
  const [directUploadFiles, setDirectUploadFiles] = useState([]);
  const [uploadingDirectImages, setUploadingDirectImages] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const getCurrentTimeFormatted = () => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    receivingTime: getCurrentTimeFormatted(),
    vehicleName: '',
    modelYear: '',
    chassisNumber: '',
    regNumber: '',
    color: '',
    mileage: '',
    demandAmount: '',
    fullFinalAmount: '',
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
        vehicleName: `${s.vehicle || ''} ${s.model || ''}`.trim(),
        modelYear: s.year ? String(s.year) : '',
        regNumber: s.numberPlate || '',
        color: s.color || '',
        mileage: s.mileage ? `${s.mileage} km` : '',
        demandAmount: formatPKRShort(s.demandPrice) || '',
        fullFinalAmount: formatPKRShort(s.demandPrice) || '',
        ownerName: s.sellerName || '',
        chassisNumber: prev.chassisNumber || '',
        fileStatus: 'Complete Original File',
        keyStatus: '2 Keys (Master + Spare)',
        smartCardStatus: 'Smart Card Available'
      }));
    }
  };

  const resetForm = () => {
    setEditingLetter(null);
    setSelectedFilesForUpload([]);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      receivingTime: getCurrentTimeFormatted(),
      vehicleName: '',
      modelYear: '',
      chassisNumber: '',
      regNumber: '',
      color: '',
      mileage: '',
      demandAmount: '',
      fullFinalAmount: '',
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
    setSelectedFilesForUpload([]);
    setFormData({
      date: rl.date ? new Date(rl.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      receivingTime: rl.receivingTime || getCurrentTimeFormatted(),
      vehicleName: rl.vehicleName || '',
      modelYear: rl.modelYear ? String(rl.modelYear) : '',
      chassisNumber: rl.chassisNumber || '',
      regNumber: rl.regNumber || '',
      color: rl.color || '',
      mileage: rl.mileage || '',
      demandAmount: formatPKRShort(rl.demandAmount || rl.fullFinalAmount) || '',
      fullFinalAmount: formatPKRShort(rl.demandAmount || rl.fullFinalAmount) || '',
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

  const handleFileSelection = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFilesForUpload(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeSelectedFile = (index) => {
    setSelectedFilesForUpload(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveLetter = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const rawDemand = formData.demandAmount || formData.fullFinalAmount;
      const normalizedDemand = (rawDemand !== '' && rawDemand !== null && rawDemand !== undefined)
        ? normalizePriceInput(rawDemand)
        : '';
      const payload = {
        ...formData,
        demandAmount: normalizedDemand,
        fullFinalAmount: normalizedDemand
      };

      let savedLetter = null;
      if (editingLetter) {
        savedLetter = await api.updateReceivingLetter(editingLetter.id, payload);
        if (selectedFilesForUpload.length > 0) {
          await api.uploadReceivingLetterImages(editingLetter.id, selectedFilesForUpload);
        }
      } else {
        savedLetter = await api.createReceivingLetter(payload);
        if (selectedFilesForUpload.length > 0 && savedLetter?.id) {
          await api.uploadReceivingLetterImages(savedLetter.id, selectedFilesForUpload);
        }
      }

      setIsAddModalOpen(false);
      resetForm();
      fetchLetters();

      if (!editingLetter && savedLetter) {
        exportReceivingLetterPDF(savedLetter);
      }
    } catch (err) {
      alert(err.message || 'Failed to save receiving letter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLetter = async (id, refNum) => {
    if (!window.confirm(`Are you sure you want to delete Receiving Letter (${refNum})?`)) return;
    try {
      await api.deleteReceivingLetter(id);
      fetchLetters();
    } catch (err) {
      alert(err.message || 'Failed to delete receiving letter');
    }
  };

  // Open Media Gallery Modal
  const openMediaModal = (letter) => {
    setSelectedLetterForMedia(letter);
    setMediaActiveTab('gallery');
    setDirectUploadFiles([]);
    setLightboxIndex(null);
    setIsImageModalOpen(true);
  };

  const handleDirectUploadImages = async () => {
    if (!selectedLetterForMedia || directUploadFiles.length === 0) return;
    setUploadingDirectImages(true);
    try {
      await api.uploadReceivingLetterImages(selectedLetterForMedia.id, directUploadFiles);
      setDirectUploadFiles([]);
      setMediaActiveTab('gallery');
      // Refresh single letter details & full list
      const refreshed = await api.getReceivingLetterById(selectedLetterForMedia.id);
      setSelectedLetterForMedia(refreshed);
      fetchLetters();
    } catch (err) {
      alert(err.message || 'Failed to upload pictures');
    } finally {
      setUploadingDirectImages(false);
    }
  };

  const handleDeletePicture = async (imageId) => {
    if (!selectedLetterForMedia) return;
    if (!window.confirm('Delete this picture from receiving letter?')) return;
    try {
      await api.deleteReceivingLetterImage(selectedLetterForMedia.id, imageId);
      const refreshed = await api.getReceivingLetterById(selectedLetterForMedia.id);
      setSelectedLetterForMedia(refreshed);
      fetchLetters();
    } catch (err) {
      alert(err.message || 'Failed to delete picture');
    }
  };

  // Official Printable Receiving Letter PDF Document
  const exportReceivingLetterPDF = (letter) => {
    const printWindow = window.open('', '_blank');
    const todayStr = new Date(letter.date || letter.createdAt).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const effectiveDemand = letter.demandAmount || letter.fullFinalAmount || '';
    const formattedDemand = effectiveDemand 
      ? (String(effectiveDemand).toLowerCase().includes('rs') || String(effectiveDemand).includes('pkr') 
          ? effectiveDemand 
          : 'Rs. ' + Number(String(effectiveDemand).replace(/[^0-9.]/g, '') || 0).toLocaleString()) 
      : 'N/A';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS — Receiving Letter (${letter.letterNumber})</title>
          <style>
            @page { size: portrait; margin: 8mm 10mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; margin: 0; color: #0f172a; background: #ffffff; font-size: 11px; line-height: 1.4; }
            .container { padding: 15px; border: 2px solid #0f172a; border-radius: 8px; position: relative; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
            .logo-cell { width: 180px; vertical-align: middle; }
            .title-cell { text-align: center; vertical-align: middle; }
            .ref-cell { width: 200px; text-align: right; vertical-align: middle; font-family: monospace; font-size: 11px; }
            .company-name { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: 1px; }
            .company-sub { font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-top: 2px; }
            .doc-title { text-align: center; font-size: 16px; font-weight: 900; background: #0f172a; color: #ffffff; padding: 6px; border-radius: 4px; margin: 12px 0 15px 0; text-transform: uppercase; letter-spacing: 1px; }
            .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .grid-table td { padding: 8px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
            .label { font-weight: 700; color: #475569; font-size: 10px; text-transform: uppercase; margin-bottom: 2px; }
            .val { font-size: 12px; font-weight: 700; color: #0f172a; }
            .notes-box { border: 1.5px solid #0f172a; border-radius: 6px; padding: 10px; margin-top: 15px; background: #f8fafc; min-height: 80px; }
            .signatures { margin-top: 45px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sig-box { width: 220px; text-align: center; border-top: 1.5px solid #0f172a; padding-top: 5px; font-weight: 700; font-size: 11px; }
            .footer-text { margin-top: 30px; text-align: center; font-size: 9px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <table class="header-table">
              <tr>
                <td class="logo-cell">
                  <img src="${logoBase64}" style="height: 55px; width: auto; object-fit: contain;" />
                </td>
                <td class="title-cell">
                  <div class="company-name">AL-ASR MOTORS</div>
                  <div class="company-sub">Showroom & Dealership Management</div>
                </td>
                <td class="ref-cell">
                  <strong>Ref:</strong> <span style="color: #0284c7; font-weight: bold;">${letter.letterNumber}</span><br/>
                  <strong>Date:</strong> ${todayStr}<br/>
                  <strong>Receiving Time:</strong> <span style="color: #047857; font-weight: bold;">${letter.receivingTime || 'N/A'}</span>
                </td>
              </tr>
            </table>

            <div class="doc-title">VEHICLE RECEIVING LETTER</div>            <table class="grid-table">
              <tr>
                <td style="width: 50%;">
                  <div class="label">Date & Time Received</div>
                  <div class="val">${new Date(letter.date || letter.createdAt).toLocaleDateString()} ${letter.receivingTime ? '• at ' + letter.receivingTime : ''}</div>
                </td>
                <td style="width: 50%;">
                  <div class="label">Vehicle Name & Make</div>
                  <div class="val" style="color: #0284c7; font-size: 14px; font-weight: 800;">${letter.vehicleName}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div class="label">Model Year (ماڈل سال)</div>
                  <div class="val" style="font-family: monospace; font-weight: bold; color: #0284c7;">${letter.modelYear || 'N/A'}</div>
                </td>
                <td>
                  <div class="label">Registration Number (Reg#)</div>
                  <div class="val" style="font-family: monospace; color: #b45309; font-weight: bold;">${letter.regNumber || 'N/A'}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div class="label">Chassis Number (Ch#)</div>
                  <div class="val" style="font-family: monospace;">${letter.chassisNumber || 'N/A'}</div>
                </td>
                <td>
                  <div class="label">Vehicle Color</div>
                  <div class="val">${letter.color || 'N/A'}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div class="label">Vehicle Mileage</div>
                  <div class="val" style="font-family: monospace; color: #0284c7; font-weight: bold;">${letter.mileage ? letter.mileage + (String(letter.mileage).toLowerCase().includes('km') ? '' : ' KM') : 'N/A'}</div>
                </td>
                <td>
                  <div class="label">Vehicle Demand (PKR)</div>
                  <div class="val" style="color: #047857; font-size: 14px; font-weight: 800;">${formattedDemand}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div class="label">Owner Name (Vehicle Handover By)</div>
                  <div class="val">${letter.ownerName}</div>
                </td>
                <td>
                  <div class="label">Receiver Name (AL-ASR Representative)</div>
                  <div class="val" style="color: #047857;">${letter.receiverName}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div class="label">Registration File Status</div>
                  <div class="val">${letter.fileStatus || 'N/A'}</div>
                </td>
                <td>
                  <div class="label">Vehicle Keys Status</div>
                  <div class="val">${letter.keyStatus || 'N/A'}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div class="label">Smart Card Status</div>
                  <div class="val">${letter.smartCardStatus || 'N/A'}</div>
                </td>
                <td>
                  <div class="label">Any Other Accessory</div>
                  <div class="val">${letter.anyOtherAccessory || 'N/A'}</div>
                </td>
              </tr>
            </table>

            <div style="margin-top: 15px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 10px; font-weight: bold; color: #047857; text-transform: uppercase; margin-bottom: 3px;">Vehicle Condition Notes & Specific Observations:</div>
              <div style="font-size: 11px; color: #1e293b; min-height: 28px;">${letter.notes || 'Vehicle received in inspected condition with all above documents and accessories verified.'}</div>
            </div>

            <div class="sig-grid">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-title">Vehicle Owner Signature</div>
                <div class="sig-name">${letter.ownerName}</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-title">AL ASR MOTORS Authorized Receiver</div>
                <div class="sig-name">${letter.receiverName}</div>
              </div>
            </div>

            <div class="footer">
              AL ASR MOTORS • Receiving Letter Document Ref: ${letter.letterNumber} • Printed on ${new Date().toLocaleDateString()}
            </div>
          </body>
        </html>
      `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-2">
            <FileCheck className="w-3.5 h-3.5" />
            <span>Receiving Letter & Inspection Protocol</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Receiving Letters (وصولی لیٹر)</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Official vehicle receiving receipts, physical condition records, file & key checklists.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Receiving Letter</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Letter Ref #, Vehicle Make, Model Year, Reg #, Chassis #, Owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
        />
      </div>

      {/* Letters Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Letter Ref / Date</th>
                <th className="py-3.5 px-4">Vehicle Details</th>
                <th className="py-3.5 px-4">Mileage & Demand</th>
                <th className="py-3.5 px-4">Handed Over By</th>
                <th className="py-3.5 px-4">Received By</th>
                <th className="py-3.5 px-4">Checklist (File/Key)</th>
                <th className="py-3.5 px-4">Pictures</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {letters.map((rl) => {
                const effectiveDemand = rl.demandAmount || rl.fullFinalAmount || '';
                const imgCount = rl.images?.length || 0;

                return (
                  <tr key={rl.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-mono">
                      <p className="font-bold text-emerald-400">{rl.letterNumber}</p>
                      <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5 text-cyan-400 inline flex-shrink-0" />
                        <span>{new Date(rl.date || rl.createdAt).toLocaleDateString()} {rl.receivingTime ? '• ' + rl.receivingTime : ''}</span>
                      </p>
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-extrabold text-white text-sm">
                        {rl.vehicleName} {rl.modelYear ? <span className="text-cyan-400 font-mono font-bold">({rl.modelYear})</span> : ''}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Reg: <span className="text-amber-300 font-bold">{rl.regNumber || 'N/A'}</span> • Color: {rl.color || 'N/A'}
                      </p>
                      {rl.chassisNumber && (
                        <p className="text-[10px] text-slate-500 font-mono">Chassis: {rl.chassisNumber}</p>
                      )}
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <p className="text-xs font-bold text-cyan-300">
                        {rl.mileage ? `${rl.mileage}${String(rl.mileage).toLowerCase().includes('km') ? '' : ' KM'}` : '—'}
                      </p>
                      <p className="text-[11px] font-bold text-emerald-400 mt-0.5">
                        {effectiveDemand ? formatPKR(effectiveDemand) : '—'}
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

                    {/* Pictures column */}
                    <td className="py-4 px-4 font-mono">
                      <button
                        onClick={() => openMediaModal(rl)}
                        className={`px-2.5 py-1.5 rounded-lg border font-mono text-[11px] flex items-center space-x-1 transition-all ${
                          imgCount > 0
                            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-white/10'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        <span>Photos ({imgCount})</span>
                      </button>
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
                );
              })}

              {letters.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No vehicle receiving letters found. Click "New Receiving Letter" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT RECEIVING LETTER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-5 sm:p-6 w-full max-w-4xl border border-white/10 shadow-2xl my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {editingLetter ? `Edit Receiving Letter (${editingLetter.letterNumber})` : 'Create Vehicle Receiving Letter'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">AL-ASR MOTORS • Vehicle Handover & Physical Inspection Receipt</p>
                </div>
              </div>
              <button
                onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick fill selector from current seller stock */}
            {sellers.length > 0 && !editingLetter && (
              <div className="mb-3 p-2.5 bg-slate-900/90 rounded-xl border border-white/10 flex items-center space-x-2.5 flex-shrink-0">
                <Car className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-mono flex-shrink-0">Quick Fill from Inventory:</span>
                <select
                  onChange={(e) => handleSelectSellerQuickFill(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">Select vehicle to auto-populate...</option>
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.vehicle} {s.model} {s.year ? `(${s.year})` : ''} - Plate: {s.numberPlate || 'No Plate'} - Owner: {s.sellerName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Form Body - Smoothly Scrollable with fixed footer */}
            <form onSubmit={handleSaveLetter} className="overflow-y-auto flex-1 pr-1 space-y-4">
              {/* Section 1: Basic & Receiving Info */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-mono text-emerald-400 tracking-wider font-bold border-b border-white/5 pb-1">
                  1. Receiving Details & Staff Assignment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Date Received *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-mono text-emerald-400 font-bold">Receiving Time *</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, receivingTime: getCurrentTimeFormatted() })}
                        className="text-[10px] font-mono text-cyan-400 hover:text-white underline"
                      >
                        Set Now
                      </button>
                    </div>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. 03:45 PM"
                        value={formData.receivingTime}
                        onChange={(e) => setFormData({ ...formData, receivingTime: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Receiver Name (Staff) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Staff / Receiver Name"
                      value={formData.receiverName}
                      onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Vehicle Specs & Financials */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-mono text-cyan-400 tracking-wider font-bold border-b border-white/5 pb-1">
                  2. Vehicle Specifications & Pricing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Vehicle Name / Make *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Toyota Civic, Honda City"
                      value={formData.vehicleName}
                      onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-cyan-400 font-bold mb-1">Model Year (ماڈل سال) *</label>
                    <input
                      type="text"
                      placeholder="e.g. 2022, 2024, 2018"
                      value={formData.modelYear}
                      onChange={(e) => setFormData({ ...formData, modelYear: e.target.value })}
                      className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Reg # (Number Plate)</label>
                    <input
                      type="text"
                      placeholder="e.g. LEC-1234 / Applied For"
                      value={formData.regNumber}
                      onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Color</label>
                    <input
                      type="text"
                      placeholder="e.g. White, Black, Silver"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Chassis Number (Ch#)</label>
                    <input
                      type="text"
                      placeholder="e.g. CH-992810"
                      value={formData.chassisNumber}
                      onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Mileage (KM)</label>
                    <input
                      type="text"
                      placeholder="e.g. 45,000 km"
                      value={formData.mileage}
                      onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono font-semibold focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono text-emerald-400 font-bold mb-1">Demand Amount (PKR / Rs.) *</label>
                    <input
                      type="text"
                      placeholder="e.g. 40 lac, 1.5 crore, 4500000"
                      value={formData.demandAmount || formData.fullFinalAmount}
                      onChange={(e) => setFormData({ ...formData, demandAmount: e.target.value, fullFinalAmount: e.target.value })}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400"
                    />
                    {Boolean(formData.demandAmount || formData.fullFinalAmount) && Boolean(getPriceHint(formData.demandAmount || formData.fullFinalAmount)) && (
                      <div className="mt-1 px-2.5 py-0.5 bg-emerald-950/70 border border-emerald-500/30 rounded text-[11px] font-mono text-emerald-300 flex items-center justify-between">
                        <span>{getPriceHint(formData.demandAmount || formData.fullFinalAmount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-mono text-slate-400 mb-1">Owner / Seller Name (Vehicle Handover By) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Ahmad"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Document & Accessory Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-mono text-amber-400 tracking-wider font-bold border-b border-white/5 pb-1">
                  3. Document & Accessory Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">File Status</label>
                    <input
                      type="text"
                      placeholder="e.g. Complete Original File / Duplicate"
                      value={formData.fileStatus}
                      onChange={(e) => setFormData({ ...formData, fileStatus: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Key Status</label>
                    <input
                      type="text"
                      placeholder="e.g. 2 Keys (Master + Spare) / 1 Key"
                      value={formData.keyStatus}
                      onChange={(e) => setFormData({ ...formData, keyStatus: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Smart Card Status</label>
                    <input
                      type="text"
                      placeholder="e.g. Smart Card Available / Handed Over"
                      value={formData.smartCardStatus}
                      onChange={(e) => setFormData({ ...formData, smartCardStatus: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-mono text-slate-400 mb-1">Any Other Accessory</label>
                    <input
                      type="text"
                      placeholder="e.g. Spare Wheel, Jack, Toolkit, Floor Mats, Navigation SD"
                      value={formData.anyOtherAccessory}
                      onChange={(e) => setFormData({ ...formData, anyOtherAccessory: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Notes & Condition Observations */}
              <div>
                <label className="block text-xs font-mono text-emerald-400 font-bold mb-1">
                  Notes / Details Section (Appears at bottom of letter)
                </label>
                <textarea
                  rows="2"
                  placeholder="Enter any additional vehicle condition details, inspection observations, scratch marks, or special handover instructions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                ></textarea>
              </div>

              {/* Section 5: Image Uploads */}
              <div className="pt-2 border-t border-white/10">
                <label className="block text-xs font-mono text-amber-400 font-bold mb-1">
                  Attach Vehicle & Document Pictures (Optional)
                </label>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-3 bg-slate-900/60 hover:bg-slate-900 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelection}
                    id="receiving-letter-photo-input"
                    className="hidden"
                  />
                  <label htmlFor="receiving-letter-photo-input" className="cursor-pointer flex flex-col items-center justify-center py-1.5 space-y-1">
                    <Upload className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-mono text-slate-300 font-bold">Click or drag photos of vehicle, keys, smart card, or scanned letter</span>
                    <span className="text-[10px] text-slate-500 font-mono">Supports JPG, PNG, WEBP files</span>
                  </label>
                </div>

                {selectedFilesForUpload.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFilesForUpload.map((file, idx) => (
                      <div key={idx} className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2.5 py-1 rounded-lg border border-white/10 flex items-center space-x-1.5">
                        <ImageIcon className="w-3 h-3 text-cyan-400" />
                        <span className="truncate max-w-[140px]">{file.name}</span>
                        <button type="button" onClick={() => removeSelectedFile(idx)} className="text-rose-400 hover:text-rose-300 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Action Footer - Always visible and accessible */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10 flex-shrink-0 bg-slate-950/80 p-2 rounded-xl">
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
                  <span>{submitting ? 'Saving Letter...' : (editingLetter ? 'Update & Save Changes' : 'Save & Print Receiving Letter')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PICTURE GALLERY & UPLOAD MODAL FOR RECEIVING LETTER */}
      {isImageModalOpen && selectedLetterForMedia && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-4xl border border-white/10 shadow-2xl my-8 relative flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full font-mono text-xs font-bold">
                    Ref: {selectedLetterForMedia.letterNumber}
                  </span>
                  <span className="text-xs text-slate-300 font-mono font-bold">Vehicle: {selectedLetterForMedia.vehicleName}</span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">Receiving Letter Media Attachments</h3>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10 gap-1">
                  <button
                    type="button"
                    onClick={() => setMediaActiveTab('gallery')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center space-x-1.5 ${
                      mediaActiveTab === 'gallery'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Gallery ({selectedLetterForMedia.images?.length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMediaActiveTab('upload')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center space-x-1.5 ${
                      mediaActiveTab === 'upload'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Gallery View Tab */}
            {mediaActiveTab === 'gallery' && (
              <div className="py-4 overflow-y-auto flex-1">
                {(!selectedLetterForMedia.images || selectedLetterForMedia.images.length === 0) ? (
                  <div className="py-16 text-center text-slate-400 font-mono text-xs">
                    <Camera className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p>No photos attached to this receiving letter yet.</p>
                    <button
                      onClick={() => setMediaActiveTab('upload')}
                      className="mt-3 px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl font-mono text-xs hover:bg-amber-500/30 transition-all inline-flex items-center space-x-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photos Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedLetterForMedia.images.map((img, idx) => (
                      <div key={img.id} className="group relative bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-lg">
                        <img
                          src={img.imageUrl}
                          alt="Receiving letter attachment"
                          className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => setLightboxIndex(idx)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end justify-between">
                          <button
                            type="button"
                            onClick={() => setLightboxIndex(idx)}
                            className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black"
                            title="View Fullscreen"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePicture(img.id)}
                            className="p-1.5 bg-rose-500/80 backdrop-blur-md rounded-lg text-white hover:bg-rose-600"
                            title="Delete Picture"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Direct Upload Tab */}
            {mediaActiveTab === 'upload' && (
              <div className="py-6 space-y-4 flex-1">
                <div className="border-2 border-dashed border-cyan-500/40 rounded-2xl p-8 bg-slate-900/60 hover:bg-slate-900 text-center transition-all">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    id="direct-receiving-photo-upload"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setDirectUploadFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  <label htmlFor="direct-receiving-photo-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                    <Upload className="w-10 h-10 text-cyan-400 mb-1" />
                    <span className="text-sm font-mono text-white font-bold">Select photos of vehicle, keys, or receiving letter document</span>
                    <span className="text-xs text-slate-400 font-mono">You can select multiple image files at once</span>
                  </label>
                </div>

                {directUploadFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-mono text-slate-300 font-bold">Selected Files to Upload ({directUploadFiles.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {directUploadFiles.map((file, idx) => (
                        <div key={idx} className="bg-slate-800 text-slate-200 text-xs font-mono px-3 py-1.5 rounded-xl border border-white/10 flex items-center space-x-2">
                          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="truncate max-w-[180px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setDirectUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleDirectUploadImages}
                        disabled={uploadingDirectImages}
                        className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{uploadingDirectImages ? 'Uploading Pictures...' : 'Upload Pictures Now'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX PREVIEW */}
      {lightboxIndex !== null && selectedLetterForMedia?.images?.[lightboxIndex] && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[100] p-4">
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => setLightboxIndex(prev => prev > 0 ? prev - 1 : selectedLetterForMedia.images.length - 1)}
            className="absolute left-4 p-3 bg-white/10 rounded-full text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center">
            <img
              src={selectedLetterForMedia.images[lightboxIndex].imageUrl}
              alt="Fullscreen receiving letter preview"
              className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
            />
            <div className="mt-4 flex items-center space-x-4">
              <a
                href={selectedLetterForMedia.images[lightboxIndex].imageUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-mono rounded-xl border border-white/10 hover:bg-slate-700 flex items-center space-x-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Resolution</span>
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLightboxIndex(prev => prev < selectedLetterForMedia.images.length - 1 ? prev + 1 : 0)}
            className="absolute right-4 p-3 bg-white/10 rounded-full text-white hover:bg-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
