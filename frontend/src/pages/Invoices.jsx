import React, { useState, useEffect, useRef } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  DollarSign, 
  Car, 
  User, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  Lock, 
  ChevronRight, 
  AlertCircle,
  Eye,
  Edit3,
  Camera,
  Upload,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logoBase64 } from '../utils/logoBase64';

const CameraCaptureWidget = ({ label, currentPhoto, onPhotoCaptured, onPhotoRemoved }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);

  const compressDataUrl = (dataUrl, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } });
      setStream(s);
      setIsCameraActive(true);
    } catch (err) {
      alert('Unable to access camera: ' + err.message);
    }
  };

  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const takeSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const compressed = await compressDataUrl(rawDataUrl);
    onPhotoCaptured(compressed);
    stopCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const compressed = await compressDataUrl(reader.result);
        onPhotoCaptured(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/10 space-y-2">
      <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
        <span>{label}</span>
        {currentPhoto && (
          <button type="button" onClick={onPhotoRemoved} className="text-rose-400 hover:underline text-[11px] font-mono cursor-pointer">
            Remove Photo
          </button>
        )}
      </div>

      {currentPhoto ? (
        <div className="relative group w-32 h-32 rounded-xl overflow-hidden border-2 border-cyan-500/50 bg-black shadow-lg">
          <img src={currentPhoto} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="px-2.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-lg shadow cursor-pointer"
            >
              Retake
            </button>
          </div>
        </div>
      ) : isCameraActive ? (
        <div className="space-y-2">
          <video ref={videoRef} autoPlay playsInline className="w-full max-h-52 rounded-xl border-2 border-cyan-500/50 bg-black shadow-inner" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={takeSnapshot}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Camera className="w-4 h-4" />
              <span>📸 Snap Photo Now</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={startCamera}
            className="px-3.5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-bold text-xs rounded-xl border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Camera className="w-4 h-4" />
            <span>📷 Click Live Camera Photo</span>
          </button>

          <label className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 border border-white/10 transition-all">
            <Upload className="w-4 h-4" />
            <span>📁 Select File</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}
    </div>
  );
};

export default function Invoices() {
  const { isSuperAdmin } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ totalInvoices: 0, totalSalesVolume: 0, totalCommissionEarned: 0, grandTotalValue: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const [formData, setFormData] = useState({
    registrationNo: '',
    // Seller Details
    sellerName: '',
    sellerFatherName: '',
    sellerCnic: '',
    sellerAddress: '',
    sellerPhone: '',
    sellerPhoto: '',
    // Buyer Details
    buyerName: '',
    buyerFatherName: '',
    buyerCnic: '',
    buyerAddress: '',
    buyerPhone: '',
    buyerPhoto: '',
    // Vehicle Details
    vehicleMaker: '',
    vehicleModel: '',
    engineNumber: '',
    chassisNumber: '',
    powerCapacity: '',
    postOffice: '',
    lastToken: '',
    regName: '',
    regFatherName: '',
    regAddress: '',
    // Transaction Agreement
    agreedAmount: '',
    agreedAmountHalf: '',
    agreedAmountWords: '',
    agreementTime: '',
    agreementDay: '',
    // Imported Vehicle
    isImported: false,
    billOfEntryNo: '',
    portName: '',
    clearanceDate: '',
    importerName: '',
    // Financials
    totalPrice: '',
    advanceAmount: '',
    remainingAmount: '',
    paymentDuration: '',
    dated: new Date().toISOString().slice(0, 10),
    // Witnesses
    witness1Name: '',
    witness1Cnic: '',
    witness2Name: '',
    witness2Cnic: ''
  });

  useEffect(() => {
    if (isSuperAdmin) {
      fetchInvoices();
    }
  }, [search, isSuperAdmin]);

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

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculations for financial amounts
      if (field === 'totalPrice') {
        const total = parseFloat(value) || 0;
        const adv = parseFloat(updated.advanceAmount) || 0;
        updated.agreedAmount = value;
        updated.agreedAmountHalf = total ? (total / 2).toString() : '';
        updated.remainingAmount = total >= adv ? (total - adv).toString() : '0';
      } else if (field === 'advanceAmount') {
        const total = parseFloat(updated.totalPrice) || 0;
        const adv = parseFloat(value) || 0;
        updated.remainingAmount = total >= adv ? (total - adv).toString() : '0';
      } else if (field === 'agreedAmount') {
        const agreed = parseFloat(value) || 0;
        updated.agreedAmountHalf = agreed ? (agreed / 2).toString() : '';
        if (!updated.totalPrice) {
          updated.totalPrice = value;
          const adv = parseFloat(updated.advanceAmount) || 0;
          updated.remainingAmount = agreed >= adv ? (agreed - adv).toString() : '0';
        }
      }

      return updated;
    });
  };

  const openEditModal = (inv) => {
    setSelectedInvoice(inv);
    setFormData({
      registrationNo: inv.registrationNo || '',
      sellerName: inv.sellerName || '',
      sellerFatherName: inv.sellerFatherName || '',
      sellerCnic: inv.sellerCnic || '',
      sellerAddress: inv.sellerAddress || '',
      sellerPhone: inv.sellerPhone || '',
      sellerPhoto: inv.sellerPhoto || '',
      buyerName: inv.buyerName || inv.customerName || '',
      buyerFatherName: inv.buyerFatherName || '',
      buyerCnic: inv.buyerCnic || '',
      buyerAddress: inv.buyerAddress || inv.customerCity || '',
      buyerPhone: inv.buyerPhone || inv.customerPhone || '',
      buyerPhoto: inv.buyerPhoto || '',
      vehicleMaker: inv.vehicleMaker || inv.carVehicle || '',
      vehicleModel: inv.vehicleModel || inv.carModel || '',
      engineNumber: inv.engineNumber || '',
      chassisNumber: inv.chassisNumber || '',
      powerCapacity: inv.powerCapacity || '',
      postOffice: inv.postOffice || '',
      lastToken: inv.lastToken || '',
      regName: inv.regName || '',
      regFatherName: inv.regFatherName || '',
      regAddress: inv.regAddress || '',
      agreedAmount: inv.agreedAmount ? inv.agreedAmount.toString() : '',
      agreedAmountHalf: inv.agreedAmountHalf ? inv.agreedAmountHalf.toString() : '',
      agreedAmountWords: inv.agreedAmountWords || '',
      agreementTime: inv.agreementTime || '',
      agreementDay: inv.agreementDay || '',
      isImported: Boolean(inv.isImported),
      billOfEntryNo: inv.billOfEntryNo || '',
      portName: inv.portName || '',
      clearanceDate: inv.clearanceDate || '',
      importerName: inv.importerName || '',
      totalPrice: inv.totalPrice ? inv.totalPrice.toString() : '',
      advanceAmount: inv.advanceAmount ? inv.advanceAmount.toString() : '0',
      remainingAmount: inv.remainingAmount !== undefined && inv.remainingAmount !== null ? inv.remainingAmount.toString() : '',
      paymentDuration: inv.paymentDuration || '',
      dated: inv.dated || new Date(inv.createdAt || Date.now()).toISOString().slice(0, 10),
      witness1Name: inv.witness1Name || '',
      witness1Cnic: inv.witness1Cnic || '',
      witness2Name: inv.witness2Name || '',
      witness2Cnic: inv.witness2Cnic || ''
    });
    setActiveTab('general');
    setIsAddModalOpen(true);
  };

  const resetForm = () => {
    setSelectedInvoice(null);
    setFormData({
      registrationNo: '',
      sellerName: '',
      sellerFatherName: '',
      sellerCnic: '',
      sellerAddress: '',
      sellerPhone: '',
      sellerPhoto: '',
      buyerName: '',
      buyerFatherName: '',
      buyerCnic: '',
      buyerAddress: '',
      buyerPhone: '',
      buyerPhoto: '',
      vehicleMaker: '',
      vehicleModel: '',
      engineNumber: '',
      chassisNumber: '',
      powerCapacity: '',
      postOffice: '',
      lastToken: '',
      regName: '',
      regFatherName: '',
      regAddress: '',
      agreedAmount: '',
      agreedAmountHalf: '',
      agreedAmountWords: '',
      agreementTime: '',
      agreementDay: '',
      isImported: false,
      billOfEntryNo: '',
      portName: '',
      clearanceDate: '',
      importerName: '',
      totalPrice: '',
      advanceAmount: '',
      remainingAmount: '',
      paymentDuration: '',
      dated: new Date().toISOString().slice(0, 10),
      witness1Name: '',
      witness1Cnic: '',
      witness2Name: '',
      witness2Cnic: ''
    });
    setActiveTab('general');
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let savedResult;
      if (selectedInvoice) {
        savedResult = await api.updateInvoice(selectedInvoice.id, formData);
      } else {
        savedResult = await api.createInvoice(formData);
      }
      setIsAddModalOpen(false);
      resetForm();
      fetchInvoices();
      if (savedResult) {
        if (window.confirm(`Sales Receipt (سیل رسید) ${selectedInvoice ? 'updated' : 'created'} successfully! Do you want to print the receipt now?`)) {
          exportInvoicePDF(savedResult);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to save sales receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (id, invNum) => {
    if (!window.confirm(`Are you sure you want to delete sales receipt ${invNum}?`)) return;
    try {
      await api.deleteInvoice(id);
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Failed to delete receipt');
    }
  };

  const exportInvoicePDF = (inv) => {
    const printWindow = window.open('', '_blank');
    const createdDate = inv.dated || new Date(inv.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const receiptNo = inv.receiptNo || inv.invoiceNumber;
    const buyerName = inv.buyerName || inv.customerName || 'N/A';
    const buyerFather = inv.buyerFatherName || 'N/A';
    const buyerAddress = inv.buyerAddress || inv.customerCity || 'N/A';
    const buyerPhone = inv.buyerPhone || inv.customerPhone || 'N/A';

    const sellerName = inv.sellerName || 'N/A';
    const sellerFather = inv.sellerFatherName || 'N/A';
    const sellerAddress = inv.sellerAddress || 'N/A';
    const sellerPhone = inv.sellerPhone || 'N/A';

    const vehicleMaker = inv.vehicleMaker || inv.carVehicle || 'N/A';
    const vehicleModel = inv.vehicleModel || inv.carModel || 'N/A';
    const regNo = inv.registrationNo || inv.carRegNumber || 'UNREGISTERED';
    const chassisNo = inv.chassisNumber || 'N/A';
    const engineNo = inv.engineNumber || 'N/A';
    const powerCapacity = inv.powerCapacity || 'N/A';
    const postOffice = inv.postOffice || 'N/A';
    const lastToken = inv.lastToken || 'N/A';
    const regName = inv.regName || 'N/A';
    const regFatherName = inv.regFatherName || 'N/A';
    const regAddress = inv.regAddress || 'N/A';

    const agreedSum = inv.agreedAmount || inv.totalPrice || inv.saleAmount || 0;
    const agreedHalf = inv.agreedAmountHalf || (agreedSum / 2);
    const agreedWords = inv.agreedAmountWords || '';
    const agreementTime = inv.agreementTime || 'N/A';
    const agreementDay = inv.agreementDay || 'N/A';

    const totalPrice = inv.totalPrice || inv.saleAmount || 0;
    const advanceAmount = inv.advanceAmount || 0;
    const remainingAmount = inv.remainingAmount !== undefined && inv.remainingAmount !== null ? inv.remainingAmount : (totalPrice - advanceAmount);
    const paymentDuration = inv.paymentDuration || 'N/A';

    const renderCNICBoxes = (cnicStr) => {
      const digits = (cnicStr || '').replace(/\D/g, '').padEnd(13, ' ').slice(0, 13);
      const part1 = digits.slice(0, 5).split('');
      const part2 = digits.slice(5, 12).split('');
      const part3 = digits.slice(12, 13).split('');

      return `
        <span class="cnic-box-group" title="${cnicStr || 'CNIC Number'}">
          ${part1.map(d => `<span class="cnic-digit">${d !== ' ' ? d : '&nbsp;'}</span>`).join('')}
          <span class="cnic-hyphen">-</span>
          ${part2.map(d => `<span class="cnic-digit">${d !== ' ' ? d : '&nbsp;'}</span>`).join('')}
          <span class="cnic-hyphen">-</span>
          ${part3.map(d => `<span class="cnic-digit">${d !== ' ' ? d : '&nbsp;'}</span>`).join('')}
        </span>
      `;
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="ltr" lang="en">
        <head>
          <title>سیل رسید (Sales Receipt) - ${receiptNo} - AL ASR MOTORS</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 4mm 6mm; }
              body { padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, 'Jameel Noori Nastaleeq', 'Urdu Typesetting', sans-serif; 
              padding: 4px; 
              color: #0f172a; 
              background: #ffffff;
              line-height: 1.25;
              font-size: 9.5px;
            }
            
            .receipt-card {
              border: 2px solid #0284c7;
              border-radius: 8px;
              padding: 10px 14px;
              background: #ffffff;
            }

            .header-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0284c7;
              padding-bottom: 6px;
              margin-bottom: 6px;
            }
            .logo-box {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .logo-img {
              height: 52px;
              width: auto;
              object-fit: contain;
            }
            .title-box {
              text-align: center;
              flex: 1;
            }
            .title-urdu {
              font-size: 26px;
              font-weight: 900;
              color: #0284c7;
              line-height: 1;
              font-family: 'Jameel Noori Nastaleeq', 'Urdu Typesetting', Arial, sans-serif;
            }
            .title-en {
              font-size: 11px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-top: 2px;
            }
            .showroom-info {
              font-size: 8.5px;
              color: #64748b;
              font-weight: 600;
            }

            .meta-strip {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 6px;
              padding: 5px 12px;
              margin-bottom: 6px;
              font-size: 9.5px;
              font-weight: bold;
            }
            .meta-val {
              color: #0284c7;
              font-family: monospace;
              font-size: 11px;
              font-weight: 800;
              margin-left: 4px;
            }

            .section-card {
              border: 1px solid #cbd5e1;
              border-radius: 5px;
              margin-bottom: 6px;
              overflow: hidden;
            }
            .section-head {
              background: #0f172a;
              color: #ffffff;
              padding: 3.5px 8px;
              font-size: 9.5px;
              font-weight: 800;
              display: flex;
              justify-content: space-between;
            }

            table.grid-tbl {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #64748b;
            }
            table.grid-tbl td {
              padding: 3.5px 6px;
              border: 1px solid #64748b;
              font-size: 9px;
              vertical-align: middle;
            }
            table.grid-tbl td.lbl {
              color: #475569;
              background-color: #f8fafc;
              font-weight: 700;
              width: 23%;
            }
            table.grid-tbl td.val {
              font-weight: 800;
              color: #0f172a;
              width: 27%;
            }

            /* CNIC Digit Boxes CSS */
            .cnic-box-group {
              display: inline-flex;
              align-items: center;
              gap: 1.5px;
              font-family: monospace;
              vertical-align: middle;
            }
            .cnic-digit {
              width: 14px;
              height: 16px;
              border: 1.5px solid #0284c7;
              border-radius: 2px;
              text-align: center;
              line-height: 14px;
              font-size: 9.5px;
              font-weight: 900;
              color: #0f172a;
              background: #ffffff;
              display: inline-block;
            }
            .cnic-hyphen {
              font-weight: 900;
              font-size: 11px;
              color: #0284c7;
              padding: 0 1px;
            }

            .agreement-card {
              background: #fffbeb;
              border: 1.5px solid #fcd34d;
              border-radius: 5px;
              padding: 6px 10px;
              margin-bottom: 6px;
              line-height: 1.4;
            }
            .agr-urdu {
              direction: rtl;
              font-size: 10.5px;
              font-weight: 800;
              color: #1e1b4b;
              margin-bottom: 2px;
            }
            .agr-en {
              font-size: 8.5px;
              color: #475569;
            }

            .fin-tbl {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 6px;
            }
            .fin-tbl th {
              background: #0284c7;
              color: #ffffff;
              font-size: 9px;
              padding: 4px 6px;
              text-align: center;
              border: 1px solid #0284c7;
            }
            .fin-tbl td {
              padding: 5px 6px;
              border: 1px solid #cbd5e1;
              font-size: 10px;
              font-weight: 800;
              text-align: center;
            }

            .terms-card {
              border: 1px solid #cbd5e1;
              border-radius: 5px;
              background: #fafafa;
              padding: 5px 8px;
              margin-bottom: 6px;
            }
            .terms-head {
              background: #334155;
              color: #fff;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 9px;
              font-weight: 800;
              display: inline-block;
              margin-bottom: 4px;
            }
            .terms-grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 4px 8px;
            }
            .term-cell {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              padding: 3px 5px;
            }
            .term-ur {
              font-weight: 700;
              direction: rtl;
              font-size: 8.5px;
              color: #0f172a;
              margin-bottom: 1px;
            }
            .term-en {
              color: #64748b;
              font-size: 7.5px;
            }

            .sig-grid {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              margin-top: 42px;
            }
            .sig-cell {
              flex: 1;
              border-top: 1.5px solid #0f172a;
              padding-top: 4px;
              text-align: center;
              font-size: 8px;
              font-weight: 800;
              color: #0f172a;
            }

            .print-btn {
              background: #0284c7;
              color: white;
              padding: 8px 18px;
              border: none;
              border-radius: 6px;
              font-weight: bold;
              font-size: 12px;
              cursor: pointer;
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right;">
            <button onclick="window.print()" class="print-btn">🖨️ Print Official Receipt (پرنٹ کریں)</button>
          </div>

          <div class="receipt-card">
            <!-- Top Header -->
            <div class="header-bar">
              <div class="logo-box">
                <img src="${logoBase64}" class="logo-img" alt="AL ASR MOTORS" />
              </div>
              <div class="title-box">
                <div class="title-urdu">سیل رسید</div>
                <div class="title-en">AL ASR MOTORS — SALES RECEIPT</div>
                <div class="showroom-info">Main GT Road / City Center, Sahiwal, Pakistan • Phone: +92 300 1234567</div>
              </div>
            </div>

            <!-- Top Meta Strip -->
            <div class="meta-strip">
              <div>تاریخ (Date): <span class="meta-val">${createdDate}</span></div>
              <div>رجسٹریشن نمبر (Reg No): <span class="meta-val">${regNo}</span></div>
              <div>رسید نمبر (Receipt No): <span class="meta-val">${receiptNo}</span></div>
            </div>

            <!-- Seller Information (فروخت کنندہ) with CNIC digit boxes & Photo -->
            <div class="section-card">
              <div class="section-head">
                <span>فروخت کنندہ کی تفصیلات (Seller Information)</span>
                <span>SELLER DETAILS</span>
              </div>
              <table class="grid-tbl">
                <tr>
                  <td class="lbl">فروخت کنندہ (Seller Name):</td>
                  <td class="val">${sellerName}</td>
                  <td class="lbl">ولدیت (Father Name):</td>
                  <td class="val">${sellerFather}</td>
                  ${inv.sellerPhoto ? `
                    <td rowspan="3" style="width: 65px; text-align: center; vertical-align: middle; background: #ffffff; padding: 2px;">
                      <img src="${inv.sellerPhoto}" alt="Seller Photo" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #0284c7;" />
                    </td>
                  ` : ''}
                </tr>
                <tr>
                  <td class="lbl">شناختی کارڈ (CNIC No):</td>
                  <td class="val" colspan="${inv.sellerPhoto ? 3 : 3}">${renderCNICBoxes(inv.sellerCnic)}</td>
                </tr>
                <tr>
                  <td class="lbl">پتہ (Address):</td>
                  <td class="val">${sellerAddress}</td>
                  <td class="lbl">فون نمبر (Phone No):</td>
                  <td class="val">${sellerPhone}</td>
                </tr>
              </table>
            </div>

            <!-- Vehicle Specifications (گاڑی کی تفصیلات) -->
            <div class="section-card">
              <div class="section-head">
                <span>گاڑی کی تفصیلات (Vehicle Specifications)</span>
                <span>VEHICLE SPECS</span>
              </div>
              <table class="grid-tbl">
                <tr>
                  <td class="lbl">میکر (Maker / Brand):</td>
                  <td class="val">${vehicleMaker}</td>
                  <td class="lbl">ماڈل (Model & Year):</td>
                  <td class="val">${vehicleModel} ${inv.carYear || ''}</td>
                </tr>
                <tr>
                  <td class="lbl">انجن نمبر (Engine No):</td>
                  <td class="val">${engineNo}</td>
                  <td class="lbl">چیسز نمبر (Chassis No):</td>
                  <td class="val">${chassisNo}</td>
                </tr>
                <tr>
                  <td class="lbl">پاور (Power / CC):</td>
                  <td class="val">${powerCapacity}</td>
                  <td class="lbl">ڈاک خانہ (Post Office):</td>
                  <td class="val">${postOffice}</td>
                </tr>
                <tr>
                  <td class="lbl">آخری ٹوکن (Last Token):</td>
                  <td class="val">${lastToken}</td>
                  <td class="lbl">رجسٹریشن نام (Reg Owner):</td>
                  <td class="val">${regName}</td>
                </tr>
                <tr>
                  <td class="lbl">مالک ولدیت (Reg Father):</td>
                  <td class="val">${regFatherName}</td>
                  <td class="lbl">مالک پتہ (Reg Address):</td>
                  <td class="val">${regAddress}</td>
                </tr>
              </table>
            </div>

            <!-- Buyer Information (خریدار) with CNIC digit boxes & Photo -->
            <div class="section-card">
              <div class="section-head">
                <span>خریدار کی تفصیلات (Buyer Information)</span>
                <span>BUYER DETAILS</span>
              </div>
              <table class="grid-tbl">
                <tr>
                  <td class="lbl">خریدار (Buyer Name):</td>
                  <td class="val">${buyerName}</td>
                  <td class="lbl">ولدیت (Father Name):</td>
                  <td class="val">${buyerFather}</td>
                  ${inv.buyerPhoto ? `
                    <td rowspan="3" style="width: 65px; text-align: center; vertical-align: middle; background: #ffffff; padding: 2px;">
                      <img src="${inv.buyerPhoto}" alt="Buyer Photo" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #0284c7;" />
                    </td>
                  ` : ''}
                </tr>
                <tr>
                  <td class="lbl">شناختی کارڈ (CNIC No):</td>
                  <td class="val" colspan="${inv.buyerPhoto ? 3 : 3}">${renderCNICBoxes(inv.buyerCnic)}</td>
                </tr>
                <tr>
                  <td class="lbl">پتہ (Address):</td>
                  <td class="val">${buyerAddress}</td>
                  <td class="lbl">فون نمبر (Phone No):</td>
                  <td class="val">${buyerPhone}</td>
                </tr>
              </table>
            </div>

            <!-- Transaction Agreement (معاہدہ اقرار نامہ) -->
            <div class="agreement-card">
              <div class="agr-urdu">
                جملہ کاغذات و دیگر حقوق بعوض مبلغ Rs. ${Number(agreedSum).toLocaleString()} (جن کے نصف Rs. ${Number(agreedHalf).toLocaleString()} بنتے ہیں) بوقت ${agreementTime} بروز ${agreementDay} فریق دوئم (خریدار) پر فروخت کر دی جو کہ مندرجہ ذیل شرائط پر دونوں میں اقرارنامہ ہوا۔
              </div>
              <div class="agr-en">
                All vehicle documents & ownership rights sold for PKR ${Number(agreedSum).toLocaleString()} (half sum: PKR ${Number(agreedHalf).toLocaleString()}), at ${agreementTime} on ${agreementDay}, to the buyer under the following agreed terms. ${agreedWords ? 'Amount in words: ' + agreedWords : ''}
              </div>
            </div>

            <!-- Financial Balances -->
            <table class="fin-tbl">
              <thead>
                <tr>
                  <th>کل قیمت گاڑی<br/>(Total Price)</th>
                  <th>پیشگی / بیعانہ رقم<br/>(Advance Payment)</th>
                  <th>بقایا رقم<br/>(Remaining Balance)</th>
                  <th>بقایا بحساب / ٹائم<br/>(Payment Duration)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="color: #0f172a;">PKR ${Number(totalPrice).toLocaleString()}</td>
                  <td style="color: #16a34a;">PKR ${Number(advanceAmount).toLocaleString()}</td>
                  <td style="color: #dc2626;">PKR ${Number(remainingAmount).toLocaleString()}</td>
                  <td>${paymentDuration}</td>
                </tr>
              </tbody>
            </table>

            <!-- Note / Terms & Conditions (8 Official Points) -->
            <div class="terms-card">
              <div class="terms-head">نوٹ و شرائط (TERMS & CONDITIONS)</div>
              <div class="terms-grid">
                <div class="term-cell">
                  <div class="term-ur">1- کاغذات کی ایکسائز اور کمپیوٹر چیکنگ اندر معیاد 24 گھنٹے کروانا ہوگی۔ بصورت دیگر شوروم کی ذمہ داری نہ ہوگی۔</div>
                  <div class="term-en">Excise & computer document check must be done within 24 hours. Showroom is not responsible thereafter.</div>
                </div>

                <div class="term-cell">
                  <div class="term-ur">2- گاڑی قبضہ میں لینے سے پہلے انجن نمبر، چیسز نمبر چیک کر لیں۔ بعد میں شوروم کسی قسم کا ذمہ دار نہ ہوگا۔ کیونکہ شوروم معمولی کمیشن لیتا ہے۔</div>
                  <div class="term-en">Inspect engine & chassis numbers before taking possession. Showroom is not responsible later as it takes nominal commission.</div>
                </div>

                <div class="term-cell">
                  <div class="term-ur">3- گاڑی کی واپسی شوروم رولز کے تحت ہوگی۔ واپسی کی صورت میں کمیشن واپس نہیں دیا جائے گا۔</div>
                  <div class="term-en">Vehicle return is subject to showroom rules. Commission is non-refundable upon return.</div>
                </div>

                <div class="term-cell">
                  <div class="term-ur">4- فریق اول گاڑی کے کاغذات میں ہر قسم کی غلطی کا ذمہ دار ہوگا۔</div>
                  <div class="term-en">First party (Seller) shall be solely responsible for any errors/defects in vehicle documents.</div>
                </div>

                <div class="term-cell">
                  <div class="term-ur">5- گاڑی کی چیسز پلیٹ اور چیسز نمبر موقع پر چیک کیا اور ٹھیک پایا۔</div>
                  <div class="term-en">Chassis plate and chassis number were verified on the spot and found correct.</div>
                </div>

                <div class="term-cell">
                  <div class="term-ur">6- یہ سودا دونوں پارٹیوں کی رضامندی سے طے پایا۔</div>
                  <div class="term-en">This transaction was finalized with the mutual consent of both parties.</div>
                </div>

                <div class="term-cell">
                  <div class="term-ur">7- شوروم، ٹرانسپورٹ رولز کے تحت صرف گواہ کی حیثیت رکھتا ہے۔</div>
                  <div class="term-en">Under transport regulations, the showroom acts solely as an official witness.</div>
                </div>

                <div class="term-cell">
                  <div class="term-ur">8- بائیومیٹرک ادارہ 15 دن تک دینے کا پابند ہے۔</div>
                  <div class="term-en">Seller / Owner is obligated to provide biometric verification within 15 days.</div>
                </div>
              </div>
            </div>

            <!-- Signatures & Witness Bar -->
            <div class="sig-grid">
              <div class="sig-cell">
                دستخط فروخت کنندہ<br/>
                (Seller Signature)
              </div>
              <div class="sig-cell">
                دستخط خریدار<br/>
                (Buyer Signature)
              </div>
              <div class="sig-cell">
                گواہ نمبر 1: ${inv.witness1Name || '___________'}
              </div>
              <div class="sig-cell">
                گواہ نمبر 2: ${inv.witness2Name || '___________'}
              </div>
              <div class="sig-cell" style="border-top-color: #0284c7; color: #0284c7;">
                دستخط و مہر شوروم<br/>
                (Showroom Seal & Sign)
              </div>
            </div>

            <div style="margin-top: 6px; text-align: center; font-size: 7.5px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 3px;">
              Generated by AL ASR MOTORS Dealership System • Official Bilingual Voucher Record • Super Admin Verification
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // If user is not Super Admin, show unauthorized security gate
  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <div className="glass-card rounded-2xl p-10 border border-rose-500/30 bg-rose-500/5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Restricted Access Module</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            The Sales Receipt (سیل رسید) and Voucher Management module is exclusively restricted to <strong className="text-amber-400">Super Admin</strong> level authorization.
          </p>
          <div className="inline-flex items-center space-x-2 text-xs font-mono text-rose-400 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Unauthorized staff access attempt recorded</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400 border border-cyan-500/30">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Sales Receipts & Vouchers <span className="text-sm font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">سیل رسید</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">Super Admin Exclusive • Create, view & print official vehicle sales agreements</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Sales Receipt (سیل رسید)</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Sales Receipts</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono">{stats.totalInvoices || invoices.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">Issued Super Admin vouchers</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Dealership Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
            PKR {((stats.totalSalesVolume || 0) / 100000).toFixed(2)} Lac
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Gross vehicle agreement volume</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Commission Value</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            PKR {((stats.totalCommissionEarned || 0) / 1000).toFixed(1)} K
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Showroom standard fee share</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Grand Financial Worth</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400 mt-2 font-mono">
            PKR {((stats.grandTotalValue || 0) / 100000).toFixed(2)} Lac
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Total recorded transaction balances</p>
        </div>
      </div>

      {/* Filter and Search Rail */}
      <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Receipt #, Buyer, Seller, Reg #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="text-cyan-400 font-bold">{invoices.length}</span> official receipts
        </div>
      </div>

      {/* Receipts Data Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-mono">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading Super Admin Sales Receipts...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No Sales Receipts found in the system.</p>
            <p className="text-[10px] text-slate-500 mt-1">Click "New Sales Receipt (سیل رسید)" above to issue a voucher.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase border-b border-white/10">
                <tr>
                  <th className="p-3.5">Receipt #</th>
                  <th className="p-3.5">Registration #</th>
                  <th className="p-3.5">Buyer (خریدار)</th>
                  <th className="p-3.5">Seller (فروخت کنندہ)</th>
                  <th className="p-3.5">Vehicle Details</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Advance / Remaining</th>
                  <th className="p-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {invoices.map((inv) => {
                  const receiptNo = inv.receiptNo || inv.invoiceNumber;
                  const regNo = inv.registrationNo || inv.carRegNumber || 'UNREGISTERED';
                  const buyer = inv.buyerName || inv.customerName || 'N/A';
                  const seller = inv.sellerName || 'N/A';
                  const vehicle = `${inv.vehicleMaker || inv.carVehicle || ''} ${inv.vehicleModel || inv.carModel || ''}`.trim() || 'N/A';
                  const total = inv.totalPrice || inv.saleAmount || 0;
                  const adv = inv.advanceAmount || 0;
                  const remaining = inv.remainingAmount !== undefined && inv.remainingAmount !== null ? inv.remainingAmount : (total - adv);

                  return (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-mono text-cyan-400 font-bold">{receiptNo}</td>
                      <td className="p-3.5 font-mono text-slate-200">{regNo}</td>
                      <td className="p-3.5 font-semibold text-white">
                        {buyer}
                        {inv.buyerPhone && <div className="text-[10px] text-slate-400">{inv.buyerPhone}</div>}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {seller}
                        {inv.sellerPhone && <div className="text-[10px] text-slate-400">{inv.sellerPhone}</div>}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        <div className="font-semibold text-white">{vehicle}</div>
                        {(inv.chassisNumber || inv.engineNumber) && (
                          <div className="text-[10px] text-slate-400">
                            Chassis: {inv.chassisNumber || 'N/A'} | Eng: {inv.engineNumber || 'N/A'}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-emerald-400 font-bold">
                        PKR {Number(total).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-mono text-xs">
                        <div className="text-emerald-400">Adv: Rs. {Number(adv).toLocaleString()}</div>
                        <div className="text-rose-400">Rem: Rs. {Number(remaining).toLocaleString()}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => exportInvoicePDF(inv)}
                            className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 font-medium text-[11px] flex items-center space-x-1"
                            title="Print Sales Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print</span>
                          </button>
                          <button
                            onClick={() => openEditModal(inv)}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 font-medium text-[11px] flex items-center space-x-1"
                            title="Edit Sales Receipt"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, receiptNo)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                            title="Delete Receipt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT SALES RECEIPT (سیل رسید) BILINGUAL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b192c] border border-cyan-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedInvoice ? 'Edit Sales Receipt' : 'Create Sales Receipt'} <span className="text-cyan-400 font-normal text-sm font-mono">(سیل رسید)</span>
                  </h2>
                  <p className="text-xs text-slate-400">Fill in seller, buyer, vehicle, and transaction agreement details</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex overflow-x-auto border-b border-white/10 bg-slate-900/40 p-2 gap-1 text-xs">
              {[
                { id: 'general', label: '📌 General Details' },
                { id: 'seller', label: '👤 Seller Details (فروخت کنندہ)' },
                { id: 'buyer', label: '👤 Buyer Details (خریدار)' },
                { id: 'vehicle', label: '🚗 Vehicle Specs (گاڑی)' },
                { id: 'agreement', label: '📜 Agreement (معاہدہ)' },
                { id: 'financials', label: '💰 Balances & Financials' },
                { id: 'witnesses', label: '🖋️ Witnesses (گواہان)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveInvoice} className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* TAB 1: GENERAL DETAILS */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">General Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Date (تاریخ) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dated}
                        onChange={(e) => handleInputChange('dated', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Registration No. (رجسٹریشن نمبر) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. LEA-22-4589 or Unregistered"
                        value={formData.registrationNo}
                        onChange={(e) => handleInputChange('registrationNo', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SELLER DETAILS */}
              {activeTab === 'seller' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">Seller Details (فروخت کنندہ)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Seller Name (فروخت کنندہ) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Full name of seller"
                        value={formData.sellerName}
                        onChange={(e) => handleInputChange('sellerName', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Son of / Father's Name (ولدیت)
                      </label>
                      <input
                        type="text"
                        placeholder="Father's name"
                        value={formData.sellerFatherName}
                        onChange={(e) => handleInputChange('sellerFatherName', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        CNIC No. (شناختی کارڈ نمبر)
                      </label>
                      <input
                        type="text"
                        placeholder="35501-1234567-1"
                        value={formData.sellerCnic || ''}
                        onChange={(e) => handleInputChange('sellerCnic', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Phone No. (فون نمبر)
                      </label>
                      <input
                        type="text"
                        placeholder="0300-0000000"
                        value={formData.sellerPhone}
                        onChange={(e) => handleInputChange('sellerPhone', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Address (پتہ)
                      </label>
                      <input
                        type="text"
                        placeholder="Complete residential address"
                        value={formData.sellerAddress}
                        onChange={(e) => handleInputChange('sellerAddress', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <CameraCaptureWidget
                        label="Seller Live Photo (تصویر فروخت کنندہ)"
                        currentPhoto={formData.sellerPhoto}
                        onPhotoCaptured={(dataUrl) => handleInputChange('sellerPhoto', dataUrl)}
                        onPhotoRemoved={() => handleInputChange('sellerPhoto', '')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BUYER DETAILS */}
              {activeTab === 'buyer' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">Buyer Details (خریدار)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Buyer Name (خریدار) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Full name of buyer"
                        value={formData.buyerName}
                        onChange={(e) => handleInputChange('buyerName', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Son of / Father's Name (ولدیت)
                      </label>
                      <input
                        type="text"
                        placeholder="Buyer father's name"
                        value={formData.buyerFatherName}
                        onChange={(e) => handleInputChange('buyerFatherName', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        CNIC No. (شناختی کارڈ نمبر)
                      </label>
                      <input
                        type="text"
                        placeholder="35501-1234567-1"
                        value={formData.buyerCnic || ''}
                        onChange={(e) => handleInputChange('buyerCnic', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Phone No. (فون نمبر)
                      </label>
                      <input
                        type="text"
                        placeholder="0300-0000000"
                        value={formData.buyerPhone}
                        onChange={(e) => handleInputChange('buyerPhone', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Address (پتہ)
                      </label>
                      <input
                        type="text"
                        placeholder="Buyer's address / city"
                        value={formData.buyerAddress}
                        onChange={(e) => handleInputChange('buyerAddress', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <CameraCaptureWidget
                        label="Buyer Live Photo (تصویر خریدار)"
                        currentPhoto={formData.buyerPhoto}
                        onPhotoCaptured={(dataUrl) => handleInputChange('buyerPhoto', dataUrl)}
                        onPhotoRemoved={() => handleInputChange('buyerPhoto', '')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: VEHICLE DETAILS */}
              {activeTab === 'vehicle' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">Vehicle Specifications (گاڑی کی تفصیلات)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Maker (میکر) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Toyota / Honda"
                        value={formData.vehicleMaker}
                        onChange={(e) => handleInputChange('vehicleMaker', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Model (ماڈل) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Civic Oriel 2022"
                        value={formData.vehicleModel}
                        onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Power / Engine Capacity (پاور)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1800 cc"
                        value={formData.powerCapacity}
                        onChange={(e) => handleInputChange('powerCapacity', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Engine No. (انجن نمبر)
                      </label>
                      <input
                        type="text"
                        placeholder="Engine serial number"
                        value={formData.engineNumber}
                        onChange={(e) => handleInputChange('engineNumber', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Chassis No. (چیسز نمبر)
                      </label>
                      <input
                        type="text"
                        placeholder="Chassis serial number"
                        value={formData.chassisNumber}
                        onChange={(e) => handleInputChange('chassisNumber', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Post Office (ڈاک خانہ)
                      </label>
                      <input
                        type="text"
                        placeholder="Post office location"
                        value={formData.postOffice}
                        onChange={(e) => handleInputChange('postOffice', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Last Token (آخری ٹوکن)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Paid up to June 2026"
                        value={formData.lastToken}
                        onChange={(e) => handleInputChange('lastToken', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Registration Name (رجسٹریشن نام)
                      </label>
                      <input
                        type="text"
                        placeholder="Name on smartcard / papers"
                        value={formData.regName}
                        onChange={(e) => handleInputChange('regName', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Reg Owner Father (ولدیت)
                      </label>
                      <input
                        type="text"
                        placeholder="Registered owner father name"
                        value={formData.regFatherName}
                        onChange={(e) => handleInputChange('regFatherName', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: TRANSACTION AGREEMENT */}
              {activeTab === 'agreement' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">Transaction Agreement (اقرار نامہ و معاہدہ)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        All docs & rights sum of (جملہ کاغذات و دیگر حقوق بعوض مبلغ) (PKR) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 4500000"
                        value={formData.agreedAmount}
                        onChange={(e) => handleInputChange('agreedAmount', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Rupees, half of which (روپے جن کے نصف) (PKR)
                      </label>
                      <input
                        type="number"
                        placeholder="Half sum"
                        value={formData.agreedAmountHalf}
                        onChange={(e) => handleInputChange('agreedAmountHalf', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Rupees amounts to in words (روپے بنتے ہیں)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Forty Five Lakh Rupees Only / پینتالیس لاکھ روپے"
                        value={formData.agreedAmountWords}
                        onChange={(e) => handleInputChange('agreedAmountWords', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        At time (بوقت)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 03:30 PM"
                        value={formData.agreementTime}
                        onChange={(e) => handleInputChange('agreementTime', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        On day (بروز)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Saturday / ہفتہ"
                        value={formData.agreementDay}
                        onChange={(e) => handleInputChange('agreementDay', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: IMPORTED VEHICLE */}
              {activeTab === 'imported' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                    <h3 className="text-sm font-bold text-cyan-400">For Imported Vehicle (برائے امپورٹڈ گاڑی)</h3>
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isImported}
                        onChange={(e) => handleInputChange('isImported', e.target.checked)}
                        className="rounded border-white/10 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span>Is Imported Vehicle?</span>
                    </label>
                  </div>

                  {formData.isImported && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Bill of Entry No. (بل آف انٹری نمبر)
                        </label>
                        <input
                          type="text"
                          placeholder="Bill of entry number"
                          value={formData.billOfEntryNo}
                          onChange={(e) => handleInputChange('billOfEntryNo', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Port Name (نام پورٹ)
                        </label>
                        <input
                          type="text"
                          placeholder="Port of entry (e.g. Karachi Port)"
                          value={formData.portName}
                          onChange={(e) => handleInputChange('portName', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Clearance Date (تاریخ کلیرنس)
                        </label>
                        <input
                          type="date"
                          value={formData.clearanceDate}
                          onChange={(e) => handleInputChange('clearanceDate', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Importer Name (امپورٹر نام)
                        </label>
                        <input
                          type="text"
                          placeholder="Importer company or individual name"
                          value={formData.importerName}
                          onChange={(e) => handleInputChange('importerName', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: FINANCIALS */}
              {activeTab === 'financials' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">Financial Balances & Duration</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Total Price of Vehicle (کل قیمت گاڑی) (PKR) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 4500000"
                        value={formData.totalPrice}
                        onChange={(e) => handleInputChange('totalPrice', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Advance / Earnest Money (بیعانہ رقم) (PKR)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 500000"
                        value={formData.advanceAmount}
                        onChange={(e) => handleInputChange('advanceAmount', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Remaining Amount (بقایا رقم) (PKR)
                      </label>
                      <input
                        type="number"
                        placeholder="Auto-calculated"
                        value={formData.remainingAmount}
                        onChange={(e) => handleInputChange('remainingAmount', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Time / Duration (ٹائم)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 15 Days / 1 Month"
                        value={formData.paymentDuration}
                        onChange={(e) => handleInputChange('paymentDuration', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: WITNESSES */}
              {activeTab === 'witnesses' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">Witness Information (گواہان)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
                      <h4 className="text-xs font-bold text-slate-300">Witness No. 1 (گواہ نمبر 1)</h4>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Name</label>
                        <input
                          type="text"
                          placeholder="Witness 1 full name"
                          value={formData.witness1Name}
                          onChange={(e) => handleInputChange('witness1Name', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">CNIC / Phone</label>
                        <input
                          type="text"
                          placeholder="CNIC / Phone number"
                          value={formData.witness1Cnic}
                          onChange={(e) => handleInputChange('witness1Cnic', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
                      <h4 className="text-xs font-bold text-slate-300">Witness No. 2 (گواہ نمبر 2)</h4>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Name</label>
                        <input
                          type="text"
                          placeholder="Witness 2 full name"
                          value={formData.witness2Name}
                          onChange={(e) => handleInputChange('witness2Name', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">CNIC / Phone</label>
                        <input
                          type="text"
                          placeholder="CNIC / Phone number"
                          value={formData.witness2Cnic}
                          onChange={(e) => handleInputChange('witness2Cnic', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between bg-slate-900/40 p-4 -mx-6 -mb-6">
                <div className="flex space-x-2">
                  {activeTab !== 'general' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['general', 'seller', 'buyer', 'vehicle', 'agreement', 'imported', 'financials', 'witnesses'];
                        const idx = tabs.indexOf(activeTab);
                        if (idx > 0) setActiveTab(tabs[idx - 1]);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                    >
                      ← Previous Section
                    </button>
                  )}
                </div>

                <div className="flex space-x-3">
                  {activeTab !== 'witnesses' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['general', 'seller', 'buyer', 'vehicle', 'agreement', 'imported', 'financials', 'witnesses'];
                        const idx = tabs.indexOf(activeTab);
                        if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-semibold flex items-center space-x-1"
                    >
                      <span>Next Section</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Saving Receipt...' : 'Save & Issue Sales Receipt (سیل رسید)'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
