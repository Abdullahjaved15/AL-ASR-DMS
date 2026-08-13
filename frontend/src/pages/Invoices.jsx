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
  const { isSuperAdmin, isAdmin, user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ totalInvoices: 0, totalSalesVolume: 0, totalCommissionEarned: 0, grandTotalValue: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const [receiptImageModalOpen, setReceiptImageModalOpen] = useState(false);
  const [selectedReceiptForImages, setSelectedReceiptForImages] = useState(null);
  const [uploadingReceiptImages, setUploadingReceiptImages] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const [formData, setFormData] = useState({
    category: 'SALES_RECEIPT',
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
    carYear: '',
    engineNumber: '',
    chassisNumber: '',
    powerCapacity: '',
    color: '',
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
    // Voucher Specific Fields
    payeeName: '',
    headOfAccount: '',
    inWords: '',
    bankStatus: '',
    chequeNo: '',
    dueDate: '',
    onAccount: '',
    accountOf: '',
    time: '',
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

  const canAccessInvoices = isSuperAdmin || isAdmin || user?.role === 'ACCOUNTS_HEAD' || user?.role === 'ACCOUNTS_STAFF' || user?.role === 'SALES_HEAD';

  useEffect(() => {
    if (canAccessInvoices) {
      fetchInvoices();
    }
  }, [search, selectedCategory, canAccessInvoices]);

  const openImageGalleryModal = (inv) => {
    setSelectedReceiptForImages(inv);
    setReceiptImageModalOpen(true);
  };

  const handleUploadReceiptImages = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedReceiptForImages) return;

    setUploadingReceiptImages(true);
    try {
      const res = await api.uploadInvoiceImages(selectedReceiptForImages.id, files);
      if (res && res.images) {
        const updatedImages = [...(selectedReceiptForImages.images || []), ...res.images];
        const updatedReceipt = { ...selectedReceiptForImages, images: updatedImages };
        setSelectedReceiptForImages(updatedReceipt);
        setInvoices(prev => prev.map(inv => inv.id === selectedReceiptForImages.id ? updatedReceipt : inv));
      }
    } catch (err) {
      alert(err.message || 'Failed to upload signed receipt photos');
    } finally {
      setUploadingReceiptImages(false);
      e.target.value = '';
    }
  };

  const handleDeleteReceiptImage = async (imageId) => {
    if (!selectedReceiptForImages || !window.confirm('Are you sure you want to delete this signed receipt photo?')) return;

    try {
      await api.deleteInvoiceImage(selectedReceiptForImages.id, imageId);
      const updatedImages = (selectedReceiptForImages.images || []).filter(img => img.id !== imageId);
      const updatedReceipt = { ...selectedReceiptForImages, images: updatedImages };
      setSelectedReceiptForImages(updatedReceipt);
      setInvoices(prev => prev.map(inv => inv.id === selectedReceiptForImages.id ? updatedReceipt : inv));
      if (lightboxIndex >= updatedImages.length) {
        setLightboxIndex(updatedImages.length - 1);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete photo');
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoices({ search, category: selectedCategory });
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
      category: inv.category || 'SALES_RECEIPT',
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
      carYear: inv.carYear || '',
      engineNumber: inv.engineNumber || '',
      chassisNumber: inv.chassisNumber || '',
      powerCapacity: inv.powerCapacity || '',
      color: inv.color || '',
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
      payeeName: inv.payeeName || '',
      headOfAccount: inv.headOfAccount || '',
      inWords: inv.inWords || '',
      bankStatus: inv.bankStatus || '',
      chequeNo: inv.chequeNo || '',
      dueDate: inv.dueDate || '',
      onAccount: inv.onAccount || '',
      accountOf: inv.accountOf || '',
      time: inv.time || '',
      cashAmount: inv.cashAmount || '',
      statusBoxNotes: inv.statusBoxNotes || '',
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
      category: 'SALES_RECEIPT',
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
      carYear: '',
      engineNumber: '',
      chassisNumber: '',
      powerCapacity: '',
      color: '',
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
      payeeName: '',
      headOfAccount: '',
      inWords: '',
      bankStatus: '',
      chequeNo: '',
      dueDate: '',
      onAccount: '',
      accountOf: '',
      time: '',
      cashAmount: '',
      statusBoxNotes: '',
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
    const category = inv.category || 'SALES_RECEIPT';
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
    const agreedWords = inv.agreedAmountWords || inv.inWords || '';
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

    let innerHTMLBody = '';

    if (category === 'DELIVERY_LETTER') {
      innerHTMLBody = `
        <div class="receipt-card">
          <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 14px;">
              <img src="${logoBase64}" style="height: 52px;" />
              <div>
                <h1 style="font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #0f172a; margin: 0;">AL-ASR MOTORS</h1>
                <p style="font-size: 10px; color: #475569; margin: 2px 0 0 0;">Lahore by pass near McDonald, Sahiwal. Tel: 040-4400688</p>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 0 4px;">
              <h2 style="font-size: 16px; font-weight: 900; text-decoration: underline; margin: 0; color: #0f172a;">DELIVERY LETTER</h2>
              <span style="font-size: 13px; font-weight: 800; font-family: monospace; color: #dc2626;">No. ${receiptNo}</span>
            </div>
          </div>

          <p style="font-size: 11px; text-align: justify; line-height: 1.6; margin-bottom: 12px; font-weight: 600;">
            I, the undersigned, here declare that I have thoroughly checked the machine as and whatever it is and the relevant documents of Motor Car, Bearing
          </p>

          <table class="grid-tbl" style="margin-bottom: 12px;">
            <tr>
              <td class="lbl">Make:</td><td class="val">${vehicleMaker}</td>
              <td class="lbl">Power:</td><td class="val">${powerCapacity}</td>
            </tr>
            <tr>
              <td class="lbl">Chassis No:</td><td class="val">${chassisNo}</td>
              <td class="lbl">Engine No:</td><td class="val">${engineNo}</td>
            </tr>
            <tr>
              <td class="lbl">Color:</td><td class="val">${inv.color || 'N/A'}</td>
              <td class="lbl">Model:</td><td class="val">${vehicleModel} ${inv.carYear || ''}</td>
            </tr>
            <tr>
              <td class="lbl">From:</td><td class="val" colspan="3" style="font-weight: 900;">AL-ASR MOTORS SAHIWAL</td>
            </tr>
            <tr>
              <td class="lbl">Date:</td><td class="val">${createdDate}</td>
              <td class="lbl">Time:</td><td class="val">${inv.time || agreementTime}</td>
            </tr>
            <tr>
              <td class="lbl">Account of:</td><td class="val" colspan="3">${inv.accountOf || 'N/A'}</td>
            </tr>
          </table>

          <div style="border: 1px solid #0f172a; padding: 10px; font-size: 10px; line-height: 1.6; text-align: justify; margin-bottom: 14px; background: #f8fafc; border-radius: 4px;">
            My entire satisfaction, and have taken possession of the same in perfect satisfactory condition, I do hereby I shall be fully responsible for all accident, Tokens, Machine defects and the undertake to get the ownership of this vehicle transferred in my name from the concerned registration Authority within the stipulated period of 15 days from today, and if could not, I will do so my own responsibility and risk. During the invoice making process, if any price change occurs at company end, I will pay the invoice difference.
          </div>

          <table class="grid-tbl" style="margin-bottom: 16px;">
            <tr>
              <td class="lbl">Byer's Name:</td><td class="val">${buyerName}</td>
              <td class="lbl">S/o:</td><td class="val">${buyerFather}</td>
            </tr>
            <tr>
              <td class="lbl">Address:</td><td class="val" colspan="3">${buyerAddress}</td>
            </tr>
            <tr>
              <td class="lbl">N.I.C. No:</td><td class="val" colspan="3">${renderCNICBoxes(inv.buyerCnic)}</td>
            </tr>
            <tr>
              <td class="lbl">Signature:</td><td class="val" style="height: 28px;"></td>
              <td class="lbl">Contact:</td><td class="val">${buyerPhone}</td>
            </tr>
            <tr>
              <td class="lbl">Witness Name:</td><td class="val">${inv.witness1Name || 'N/A'}</td>
              <td class="lbl">Signature:</td><td class="val" style="height: 28px;"></td>
            </tr>
            <tr>
              <td class="lbl">N.I.C. No:</td><td class="val" colspan="3">${renderCNICBoxes(inv.witness1Cnic)}</td>
            </tr>
            <tr>
              <td class="lbl">Witness Name:</td><td class="val">${inv.witness2Name || 'N/A'}</td>
              <td class="lbl">Signature:</td><td class="val" style="height: 28px;"></td>
            </tr>
            <tr>
              <td class="lbl">N.I.C. No:</td><td class="val" colspan="3">${renderCNICBoxes(inv.witness2Cnic)}</td>
            </tr>
          </table>

          <div style="margin-top: 40px; text-align: right; font-weight: 900; font-size: 11px;">
            Authorized Signature: ___________________________
          </div>
        </div>
      `;
    } else if (category === 'PAYMENT_VOUCHER') {
      const payee = inv.payeeName || (inv.buyerName && inv.buyerName !== 'N/A' ? inv.buyerName : '') || (inv.sellerName && inv.sellerName !== 'N/A' ? inv.sellerName : '') || (inv.customerName && inv.customerName !== 'N/A' ? inv.customerName : '') || '';
      const headAccount = inv.headOfAccount || '';
      const desc = inv.remarks || '';
      const amountStr = totalPrice ? Number(totalPrice).toLocaleString() + ' /-' : '';

      innerHTMLBody = `
        <div class="receipt-card" style="border: 2px solid #0f172a; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #ffffff;">
          <!-- Top Header Strip -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${logoBase64}" style="height: 54px;" />
              <div>
                <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #0f172a; letter-spacing: 0.5px;">AL-ASR MOTORS</h1>
                <p style="font-size: 10px; color: #334155; margin: 2px 0 0 0; font-weight: 600;">450 - A/B, Lahore Road, Sahiwal.</p>
                <p style="font-size: 9.5px; color: #334155; margin: 0;">Tel.: 040-4403799, 4403899, Fax: 040-4462087</p>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 20px; font-weight: 900; background: #0f172a; color: white; padding: 3px 18px; border-radius: 3px; display: inline-block; letter-spacing: 1px;">P. V.</span>
              <div style="font-size: 12px; margin-top: 8px; font-weight: bold; color: #0f172a;">Date: <span style="font-family: monospace; border-bottom: 1px dotted #0f172a; padding: 0 10px;">${createdDate}</span></div>
            </div>
          </div>

          <!-- Payee's Name Line -->
          <div style="font-size: 12px; margin-bottom: 14px; color: #0f172a;">
            <strong>Payee's Name</strong> <span style="border-bottom: 1.5px solid #0f172a; display: inline-block; width: calc(100% - 110px); padding-left: 8px; font-weight: 800; font-size: 13px;">${payee}</span>
          </div>

          <!-- Main Head of Account & Rupees Table -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-bottom: 14px; font-size: 11px;">
            <thead>
              <tr style="border-bottom: 1.5px solid #0f172a; background: #f8fafc; font-weight: 900; font-size: 11px; text-align: center;">
                <td style="padding: 6px 10px; border-right: 1.5px solid #0f172a; text-align: left; width: 75%;">Head of Account</td>
                <td style="padding: 6px 10px; width: 25%;">Rupees</td>
              </tr>
            </thead>
            <tbody>
              <tr style="height: 140px; vertical-align: top;">
                <td style="padding: 10px; border-right: 1.5px solid #0f172a; line-height: 1.8;">
                  <div style="font-weight: 800; font-size: 12px; color: #0f172a; text-decoration: underline; margin-bottom: 6px;">${headAccount}</div>
                  <div style="font-size: 11px; color: #334155;">${desc}</div>
                </td>
                <td style="padding: 10px; text-align: right; font-family: monospace; font-size: 14px; font-weight: 900; color: #0f172a;">
                  ${amountStr}
                </td>
              </tr>
              <tr style="border-top: 1.5px solid #0f172a; font-weight: 900; background: #f8fafc; font-size: 12px;">
                <td style="padding: 8px 12px; text-align: right; border-right: 1.5px solid #0f172a;">Grand Total</td>
                <td style="padding: 8px 12px; text-align: right; font-family: monospace; font-size: 14px; color: #0284c7;">
                  ${totalPrice ? 'PKR ' + Number(totalPrice).toLocaleString() : ''}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- In Words Line -->
          <div style="font-size: 11.5px; margin-bottom: 30px; color: #0f172a;">
            <strong>In Words</strong> <span style="border-bottom: 1.5px solid #0f172a; display: inline-block; width: calc(100% - 75px); padding-left: 8px; font-style: italic; font-weight: 600;">${agreedWords || 'Rupees Only'}</span>
          </div>

          <!-- Bottom 5 Signature Boxes Grid -->
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0; border: 1.5px solid #0f172a; text-align: center;">
            <div style="border-right: 1px solid #0f172a; padding: 6px 2px; height: 50px; display: flex; flex-direction: column; justify-content: flex-end;">
              <span style="font-size: 10px; font-weight: 800; border-top: 1px solid #0f172a; padding-top: 3px;">Received By</span>
            </div>
            <div style="border-right: 1px solid #0f172a; padding: 6px 2px; height: 50px; display: flex; flex-direction: column; justify-content: flex-end;">
              <span style="font-size: 10px; font-weight: 800; border-top: 1px solid #0f172a; padding-top: 3px;">Paid By</span>
            </div>
            <div style="border-right: 1px solid #0f172a; padding: 6px 2px; height: 50px; display: flex; flex-direction: column; justify-content: flex-end;">
              <span style="font-size: 10px; font-weight: 800; border-top: 1px solid #0f172a; padding-top: 3px;">Prepared By</span>
            </div>
            <div style="border-right: 1px solid #0f172a; padding: 6px 2px; height: 50px; display: flex; flex-direction: column; justify-content: flex-end;">
              <span style="font-size: 10px; font-weight: 800; border-top: 1px solid #0f172a; padding-top: 3px;">Checked By</span>
            </div>
            <div style="padding: 6px 2px; height: 50px; display: flex; flex-direction: column; justify-content: flex-end;">
              <span style="font-size: 10px; font-weight: 800; border-top: 1px solid #0f172a; padding-top: 3px;">Approved By</span>
            </div>
          </div>
        </div>
      `;
    } else if (category === 'BOOKING_RECEIPT') {
      const statusLines = (inv.statusBoxNotes || '').split('\n').filter(Boolean);
      innerHTMLBody = `
        <div class="receipt-card" style="border: 2px solid #002b66; padding: 22px; font-family: 'Segoe UI', Arial, sans-serif; color: #002b66; background: #ffffff; width: 100%; box-sizing: border-box;">
          <!-- Receipt Top Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #002b66; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${logoBase64}" style="height: 52px;" />
              <div>
                <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #002b66; letter-spacing: 0.5px;">AL-ASR MOTORS</h1>
                <p style="font-size: 9.5px; color: #002b66; margin: 2px 0 0 0; font-weight: 600;">450 - A/B, Lahore Road, Sahiwal.</p>
                <p style="font-size: 9px; color: #002b66; margin: 0;">Tel: 040-4403799, 4403899, Fax: 040-4462087</p>
                <p style="font-size: 9px; color: #002b66; margin: 0;">E-mail: al.asr.motors@live.com</p>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 16px; font-weight: 900; background: #002b66; color: white; padding: 4px 16px; border-radius: 3px; display: inline-block;">Receipt</span>
              <div style="font-size: 14px; margin-top: 6px; font-weight: 800; font-family: monospace; color: #dc2626;">No.: <span style="text-decoration: underline;">${receiptNo}</span></div>
            </div>
          </div>

          <!-- Top Details Form Fields -->
          <div style="font-size: 11px; line-height: 2.1; color: #002b66;">
            <div style="margin-bottom: 2px;">
              <strong>Date:</strong> <span style="border-bottom: 1px dotted #002b66; padding: 0 10px; font-family: monospace; font-weight: bold;">${createdDate}</span>
            </div>
            <div style="display: flex; gap: 15px;">
              <div style="flex: 2;"><strong>Name:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 55px); font-weight: bold;">${buyerName}</span></div>
              <div style="flex: 1;"><strong>Tel.:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 40px); font-family: monospace; font-weight: bold;">${buyerPhone}</span></div>
            </div>
            <div style="display: flex; gap: 15px;">
              <div style="flex: 1.2;"><strong>Vehicle No.:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 85px); font-family: monospace; font-weight: bold;">${regNo}</span></div>
              <div style="flex: 1;"><strong>Engine No.:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 80px); font-family: monospace; font-weight: bold;">${engineNo}</span></div>
            </div>
            <div style="display: flex; gap: 15px;">
              <div style="flex: 1.2;"><strong>Chases No.:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 85px); font-family: monospace; font-weight: bold;">${chassisNo}</span></div>
              <div style="flex: 1;"><strong>Colour:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 55px); font-weight: bold;">${inv.color || ''}</span></div>
            </div>
            <div>
              <strong>Total Deal:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 75px); font-family: monospace; font-weight: bold;">${totalPrice ? 'PKR ' + Number(totalPrice).toLocaleString() : ''}</span>
            </div>
            <div style="display: flex; gap: 15px;">
              <div style="flex: 1;"><strong>Advance:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 65px); font-family: monospace; font-weight: bold;">${advanceAmount ? 'PKR ' + Number(advanceAmount).toLocaleString() : ''}</span></div>
              <div style="flex: 1.5;"><strong>In words:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 65px); font-style: italic;">${agreedWords || ''}</span></div>
            </div>
            <div>
              <strong>Balance:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 65px); font-family: monospace; font-weight: bold; color: #dc2626;">${remainingAmount ? 'PKR ' + Number(remainingAmount).toLocaleString() : ''}</span>
            </div>
          </div>

          <!-- Bottom Section: Bank Status & Blank Lined Status Box -->
          <div style="display: flex; gap: 20px; margin-top: 15px; align-items: flex-start;">
            <!-- Left: Bank Status Details -->
            <div style="flex: 1.1; font-size: 11px; line-height: 2.1; color: #002b66;">
              <div style="font-size: 13px; font-weight: 900; font-style: italic; border-bottom: 2px solid #002b66; margin-bottom: 6px;">Bank Status</div>
              <div><strong>Cash:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 45px); font-family: monospace;">${inv.cashAmount ? 'PKR ' + Number(inv.cashAmount).toLocaleString() : (advanceAmount ? 'PKR ' + Number(advanceAmount).toLocaleString() : '')}</span></div>
              <div><strong>Cheque # ./DD # .On line:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 170px); font-family: monospace;">${inv.chequeNo || ''}</span></div>
              <div><strong>Due Date:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 65px); font-family: monospace;">${inv.dueDate ? formatDateStr(inv.dueDate) : ''}</span></div>
              <div><strong>on Account:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 80px);">${inv.onAccount || ''}</span></div>
              <div><strong>Status:</strong> <span style="border-bottom: 1px dotted #002b66; display: inline-block; width: calc(100% - 55px); font-weight: bold;">${inv.bankStatus || inv.paymentStatus || ''}</span></div>
            </div>

            <!-- Right: Lined Blank Space Box for Status -->
            <div style="flex: 1; text-align: center; color: #002b66;">
              <div style="font-size: 13px; font-weight: 900; font-style: italic; margin-bottom: 4px;">Status</div>
              <div style="border: 2px solid #002b66; border-radius: 18px; padding: 8px 12px; min-height: 165px; display: flex; flex-direction: column; justify-content: space-around; background: #ffffff;">
                <div style="border-bottom: 1px solid #cbd5e1; height: 24px; text-align: left; font-size: 10px; font-weight: 600;">${statusLines[0] || ''}</div>
                <div style="border-bottom: 1px solid #cbd5e1; height: 24px; text-align: left; font-size: 10px; font-weight: 600;">${statusLines[1] || ''}</div>
                <div style="border-bottom: 1px solid #cbd5e1; height: 24px; text-align: left; font-size: 10px; font-weight: 600;">${statusLines[2] || ''}</div>
                <div style="border-bottom: 1px solid #cbd5e1; height: 24px; text-align: left; font-size: 10px; font-weight: 600;">${statusLines[3] || ''}</div>
                <div style="border-bottom: 1px solid #cbd5e1; height: 24px; text-align: left; font-size: 10px; font-weight: 600;">${statusLines[4] || ''}</div>
                <div style="height: 24px; text-align: left; font-size: 10px; font-weight: 600;">${statusLines[5] || ''}</div>
              </div>
            </div>
          </div>

          <!-- Bottom Footer Signatures -->
          <div style="display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 10.5px; font-weight: bold; color: #002b66;">
            <div style="border-top: 1.5px solid #002b66; width: 28%; padding-top: 4px;">Issued By</div>
            <div style="border-top: 1.5px solid #002b66; width: 32%; padding-top: 4px;">Customer's Signature</div>
            <div style="border-top: 1.5px solid #002b66; width: 28%; padding-top: 4px;">For AL-ASR Motors</div>
          </div>
        </div>
      `;
    } else {
      // Default: SALES_RECEIPT
      innerHTMLBody = `
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
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="ltr" lang="en">
        <head>
          <title>${category.replace('_', ' ')} - ${receiptNo} - AL ASR MOTORS</title>
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
              padding: 12px 16px;
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
            <button onclick="window.print()" class="print-btn">🖨️ Print Official Voucher (پرنٹ کریں)</button>
          </div>

          ${innerHTMLBody}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // If user is not authorized, show security gate
  if (!canAccessInvoices) {
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

      {/* Category Tabs & Filter Rail */}
      <div className="glass-card p-4 rounded-xl border border-white/5 space-y-4">
        <div className="flex overflow-x-auto gap-2 text-xs pb-1 border-b border-white/10">
          {[
            { id: 'ALL', label: 'All Vouchers & Receipts' },
            { id: 'SALES_RECEIPT', label: '📜 Sales Receipt (سیل رسید)' },
            { id: 'DELIVERY_LETTER', label: '📄 Delivery Letter (ڈیلیوری لیٹر)' },
            { id: 'PAYMENT_VOUCHER', label: '💵 Payment Voucher (P.V.)' },
            { id: 'BOOKING_RECEIPT', label: '🧾 Booking Receipt (رسید)' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Voucher #, Payee, Buyer, Seller, Reg #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="text-xs text-slate-400">
            Showing <span className="text-cyan-400 font-bold">{invoices.length}</span> official records
          </div>
        </div>
      </div>

      {/* Receipts Data Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-mono">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading Super Admin Sales Receipts & Vouchers...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No Sales Receipts or Vouchers found in the system.</p>
            <p className="text-[10px] text-slate-500 mt-1">Click "New Sales Receipt (سیل رسید)" above to issue a voucher.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase border-b border-white/10">
                <tr>
                  <th className="p-3.5">Voucher # & Category</th>
                  <th className="p-3.5">Registration #</th>
                  <th className="p-3.5">Buyer / Payee</th>
                  <th className="p-3.5">Seller (فروخت کنندہ)</th>
                  <th className="p-3.5">Vehicle Details / Head</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Signed Receipt</th>
                  <th className="p-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {invoices.map((inv) => {
                  const receiptNo = inv.receiptNo || inv.invoiceNumber;
                  const regNo = inv.registrationNo || inv.carRegNumber || 'UNREGISTERED';
                  const buyer = inv.payeeName || inv.buyerName || inv.customerName || 'N/A';
                  const seller = inv.sellerName || 'N/A';
                  const vehicle = `${inv.vehicleMaker || inv.carVehicle || ''} ${inv.vehicleModel || inv.carModel || ''}`.trim() || inv.headOfAccount || 'N/A';
                  const total = inv.totalPrice || inv.saleAmount || 0;
                  const adv = inv.advanceAmount || 0;
                  const remaining = inv.remainingAmount !== undefined && inv.remainingAmount !== null ? inv.remainingAmount : (total - adv);
                  const cat = inv.category || 'SALES_RECEIPT';

                  return (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <div className="font-mono text-cyan-400 font-bold">{receiptNo}</div>
                        <span className={`inline-block text-[9px] px-2 py-0.5 rounded font-bold uppercase mt-1 ${
                          cat === 'DELIVERY_LETTER' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          cat === 'PAYMENT_VOUCHER' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          cat === 'BOOKING_RECEIPT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {cat.replace('_', ' ')}
                        </span>
                      </td>
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
                        <button
                          onClick={() => openImageGalleryModal(inv)}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                            inv.images && inv.images.length > 0
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30 shadow-sm'
                              : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
                          }`}
                          title="Upload & view signed paper receipts photos"
                        >
                          <Camera className="w-3.5 h-3.5 text-purple-400" />
                          <span>
                            {inv.images && inv.images.length > 0
                              ? `${inv.images.length} Signed Photo(s)`
                              : '+ Upload Photo'}
                          </span>
                        </button>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => exportInvoicePDF(inv)}
                            className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 font-medium text-[11px] flex items-center space-x-1"
                            title="Print Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print</span>
                          </button>
                          <button
                            onClick={() => openEditModal(inv)}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 font-medium text-[11px] flex items-center space-x-1"
                            title="Edit Voucher"
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

      {/* CREATE / EDIT SALES RECEIPT & VOUCHERS MODAL */}
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
                    {selectedInvoice ? 'Edit' : 'Create'}{' '}
                    {formData.category === 'DELIVERY_LETTER' ? 'Delivery Letter' :
                     formData.category === 'BOOKING_RECEIPT' ? 'Booking Receipt' :
                     formData.category === 'PAYMENT_VOUCHER' ? 'Payment Voucher' :
                     'Sales Receipt'}
                    <span className="text-cyan-400 font-normal text-sm font-mono">
                      {formData.category === 'DELIVERY_LETTER' ? '(ڈیلیوری لیٹر)' :
                       formData.category === 'BOOKING_RECEIPT' ? '(رسید)' :
                       formData.category === 'PAYMENT_VOUCHER' ? '(ادائیگی واؤچر)' :
                       '(سیل رسید)'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {formData.category === 'DELIVERY_LETTER' ? 'Vehicle handover declaration form for physical paper pad printing' :
                     formData.category === 'BOOKING_RECEIPT' ? 'Booking voucher and advance receipt matching physical pad' :
                     formData.category === 'PAYMENT_VOUCHER' ? 'Payment voucher (P.V.) receipt entry' :
                     'Fill in seller, buyer, vehicle, and transaction agreement details'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs - ONLY SHOWN FOR FULL SALES RECEIPT */}
            {formData.category === 'SALES_RECEIPT' && (
              <div className="flex overflow-x-auto border-b border-white/10 bg-slate-900/40 p-2 gap-1 text-xs">
                {[
                  { id: 'general', label: '📌 General Meta' },
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
                    className={`px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Modal Form Content */}
            <form onSubmit={handleSaveInvoice} className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* CATEGORY SWITCHER CARDS */}
              <div>
                <label className="block text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider">
                  Voucher / Invoice Category (اقسام واؤچر) <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'SALES_RECEIPT', title: 'Sales Receipt', sub: 'سیل رسید (Dual Language)' },
                    { id: 'DELIVERY_LETTER', title: 'Delivery Letter', sub: 'ڈیلیوری لیٹر (Handover)' },
                    { id: 'PAYMENT_VOUCHER', title: 'Payment Voucher', sub: 'P.V. (ادائیگی واؤچر)' },
                    { id: 'BOOKING_RECEIPT', title: 'Booking Receipt', sub: 'رسید (Payment Receipt)' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleInputChange('category', cat.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        formData.category === cat.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-md font-bold'
                          : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{cat.title}</div>
                      <div className="text-[10px] font-mono opacity-80 mt-0.5">{cat.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 1: DELIVERY LETTER (ڈیلیوری لیٹر) - SINGLE PAGE FORM */}
              {/* ------------------------------------------------------------- */}
              {formData.category === 'DELIVERY_LETTER' && (
                <div className="space-y-6 pt-2">
                  <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                        📄 Official AL-ASR Motors Delivery Letter Entry (ڈیلیوری لیٹر)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Contains ONLY the fields required for Delivery Letter matching the physical paper pad.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-300 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/40">
                      Letter # {formData.invoiceNumber || selectedInvoice?.receiptNo || 'DL-PAD'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-slate-300 italic leading-relaxed">
                    <span className="font-bold text-cyan-400 not-italic">Paper Pad Text Preview: </span>
                    "I, the undersigned, here declare that I have thoroughly checked the machine as and whatever it is and the relevant documents of Motor Car..."
                  </div>

                  {/* 1. Date & General Info */}
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-white/10">
                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-white/10 pb-2">
                      1. Date & Delivery Info
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Date (تاریخ) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.dated}
                          onChange={(e) => handleInputChange('dated', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Time (وقت)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 03:30 PM"
                          value={formData.time || formData.agreementTime || ''}
                          onChange={(e) => handleInputChange('time', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          From (فروخت کنندہ مقام)
                        </label>
                        <input
                          type="text"
                          readOnly
                          value="AL-ASR MOTORS SAHIWAL"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-cyan-400 text-xs font-bold font-mono cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Account Of (کھاتہ نام)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Self / Company Account"
                          value={formData.accountOf || ''}
                          onChange={(e) => handleInputChange('accountOf', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Vehicle Specifications */}
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-white/10">
                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-white/10 pb-2">
                      2. Vehicle Specifications (گاڑی کی تفصیلات)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Make (میکر) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Toyota / Honda / Suzuki"
                          value={formData.vehicleMaker}
                          onChange={(e) => handleInputChange('vehicleMaker', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Model & Year (ماڈل) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Corolla Altis 2022"
                          value={formData.vehicleModel}
                          onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Power / Capacity (پاور)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 1800 cc"
                          value={formData.powerCapacity || ''}
                          onChange={(e) => handleInputChange('powerCapacity', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Chassis No. (چیسس نمبر)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. NZE140-123456"
                          value={formData.chassisNumber || ''}
                          onChange={(e) => handleInputChange('chassisNumber', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Engine No. (انجن نمبر)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 1ZZ-987654"
                          value={formData.engineNumber || ''}
                          onChange={(e) => handleInputChange('engineNumber', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Color (رنگ)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Super White / Silver"
                          value={formData.color || ''}
                          onChange={(e) => handleInputChange('color', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Buyer / Customer Information */}
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-white/10">
                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-white/10 pb-2">
                      3. Buyer / Recipient Details (خریدار کی تفصیلات)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Buyer's Name (خریدار کا نام) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Full name of buyer taking delivery"
                          value={formData.buyerName}
                          onChange={(e) => handleInputChange('buyerName', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          S/o / Father's Name (ولدیت)
                        </label>
                        <input
                          type="text"
                          placeholder="Buyer's father name"
                          value={formData.buyerFatherName || ''}
                          onChange={(e) => handleInputChange('buyerFatherName', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Address (مکمل پتہ)
                        </label>
                        <input
                          type="text"
                          placeholder="Residential or business address"
                          value={formData.buyerAddress || ''}
                          onChange={(e) => handleInputChange('buyerAddress', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          N.I.C. No (شناختی کارڈ نمبر)
                        </label>
                        <input
                          type="text"
                          placeholder="35501-1234567-1"
                          value={formData.buyerCnic || ''}
                          onChange={(e) => handleInputChange('buyerCnic', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Contact / Phone (رابطہ نمبر)
                        </label>
                        <input
                          type="text"
                          placeholder="0300-1234567"
                          value={formData.buyerPhone || ''}
                          onChange={(e) => handleInputChange('buyerPhone', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Witness Information */}
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-white/10">
                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-white/10 pb-2">
                      4. Witness Details (گواہان)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-900/60 rounded-lg border border-white/5 space-y-3">
                        <h6 className="text-xs font-bold text-slate-300">Witness No. 1 (گواہ نمبر 1)</h6>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Witness Name</label>
                          <input
                            type="text"
                            placeholder="Full name of witness 1"
                            value={formData.witness1Name || ''}
                            onChange={(e) => handleInputChange('witness1Name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">N.I.C. No.</label>
                          <input
                            type="text"
                            placeholder="35501-0000000-1"
                            value={formData.witness1Cnic || ''}
                            onChange={(e) => handleInputChange('witness1Cnic', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-lg border border-white/5 space-y-3">
                        <h6 className="text-xs font-bold text-slate-300">Witness No. 2 (گواہ نمبر 2)</h6>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Witness Name</label>
                          <input
                            type="text"
                            placeholder="Full name of witness 2"
                            value={formData.witness2Name || ''}
                            onChange={(e) => handleInputChange('witness2Name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">N.I.C. No.</label>
                          <input
                            type="text"
                            placeholder="35501-0000000-2"
                            value={formData.witness2Cnic || ''}
                            onChange={(e) => handleInputChange('witness2Cnic', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 2: BOOKING RECEIPT (رسید) - SINGLE PAGE FORM          */}
              {/* ------------------------------------------------------------- */}
              {formData.category === 'BOOKING_RECEIPT' && (
                <div className="space-y-6 pt-2">
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">🧾 Official AL-ASR Motors Booking Voucher Entry</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">Fills exact fields matching the physical printed receipt book pad.</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40">
                      Voucher # {formData.invoiceNumber || selectedInvoice?.receiptNo || 'BK-PAD'}
                    </span>
                  </div>

                  {/* 1. Date & Customer Info */}
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-white/10">
                    <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/10 pb-2">1. Date & Customer Details</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Date (تاریخ) <span className="text-rose-400">*</span></label>
                        <input
                          type="date"
                          value={formData.dated}
                          onChange={(e) => handleInputChange('dated', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Customer / Buyer Name (نام) <span className="text-rose-400">*</span></label>
                        <input
                          type="text"
                          placeholder="e.g. Mian Sarfraz"
                          value={formData.buyerName}
                          onChange={(e) => handleInputChange('buyerName', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Tel / Phone (فون) <span className="text-rose-400">*</span></label>
                        <input
                          type="text"
                          placeholder="e.g. 0300-1234567"
                          value={formData.buyerPhone}
                          onChange={(e) => handleInputChange('buyerPhone', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500 font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Vehicle Specs */}
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-white/10">
                    <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/10 pb-2">2. Vehicle Specifications</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle No. (گاڑی نمبر)</label>
                        <input
                          type="text"
                          placeholder="e.g. LEA-22-4589 or Unregistered"
                          value={formData.registrationNo}
                          onChange={(e) => handleInputChange('registrationNo', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Engine No. (انجن نمبر)</label>
                        <input
                          type="text"
                          placeholder="Engine number"
                          value={formData.engineNumber}
                          onChange={(e) => handleInputChange('engineNumber', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Chases No. (چیسس نمبر)</label>
                        <input
                          type="text"
                          placeholder="Chassis number"
                          value={formData.chassisNumber}
                          onChange={(e) => handleInputChange('chassisNumber', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Colour (رنگ)</label>
                        <input
                          type="text"
                          placeholder="e.g. White / Silver"
                          value={formData.color}
                          onChange={(e) => handleInputChange('color', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Financial Deal Details */}
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-white/10">
                    <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/10 pb-2">3. Deal Amounts & Calculations</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Total Deal (Rs.) <span className="text-rose-400">*</span></label>
                        <input
                          type="number"
                          placeholder="e.g. 5000000"
                          value={formData.totalPrice}
                          onChange={(e) => {
                            const tot = parseFloat(e.target.value) || 0;
                            const adv = parseFloat(formData.advanceAmount) || 0;
                            handleInputChange('totalPrice', e.target.value);
                            handleInputChange('remainingAmount', Math.max(0, tot - adv));
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500 font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Advance (Rs.) <span className="text-rose-400">*</span></label>
                        <input
                          type="number"
                          placeholder="e.g. 500000"
                          value={formData.advanceAmount}
                          onChange={(e) => {
                            const adv = parseFloat(e.target.value) || 0;
                            const tot = parseFloat(formData.totalPrice) || 0;
                            handleInputChange('advanceAmount', e.target.value);
                            handleInputChange('remainingAmount', Math.max(0, tot - adv));
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500 font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Balance (Rs.) (بقایا)</label>
                        <input
                          type="number"
                          readOnly
                          value={formData.totalPrice && formData.advanceAmount ? Math.max(0, (parseFloat(formData.totalPrice) || 0) - (parseFloat(formData.advanceAmount) || 0)) : (formData.remainingAmount || '')}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-rose-400 text-xs font-bold font-mono cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">In Words (الفاظ میں)</label>
                        <input
                          type="text"
                          placeholder="e.g. Five Lac Rupees Only"
                          value={formData.agreedAmountWords || formData.inWords}
                          onChange={(e) => {
                            handleInputChange('agreedAmountWords', e.target.value);
                            handleInputChange('inWords', e.target.value);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500 italic"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Bank Status */}
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-white/10">
                    <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-white/10 pb-2">4. Bank Status & Payment Details</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Cash (نقد / تفصیل)</label>
                        <input
                          type="text"
                          placeholder="e.g. Cash / Bank Transfer"
                          value={formData.cashAmount || ''}
                          onChange={(e) => handleInputChange('cashAmount', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Cheque # / DD # / On Line</label>
                        <input
                          type="text"
                          placeholder="e.g. CHQ-9842104"
                          value={formData.chequeNo}
                          onChange={(e) => handleInputChange('chequeNo', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-emerald-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date (معیاد)</label>
                        <input
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => handleInputChange('dueDate', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">on Account</label>
                        <input
                          type="text"
                          placeholder="e.g. Advance Booking"
                          value={formData.onAccount}
                          onChange={(e) => handleInputChange('onAccount', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-emerald-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Status (بینک اسٹیٹس)</label>
                        <input
                          type="text"
                          placeholder="e.g. Cleared / Pending / Cash Paid"
                          value={formData.bankStatus}
                          onChange={(e) => handleInputChange('bankStatus', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Status Box Notes */}
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h5 className="text-xs font-bold text-sky-400 uppercase tracking-wider">5. Status Box Remarks (Right Lined Blank Space)</h5>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">Leave blank for empty lined space like physical receipt book!</span>
                    </div>
                    <textarea
                      rows="3"
                      placeholder="Enter status notes line-by-line (or leave blank to print empty lined space box just like the picture)..."
                      value={formData.statusBoxNotes || ''}
                      onChange={(e) => handleInputChange('statusBoxNotes', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-sky-500 custom-scrollbar"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 3: PAYMENT VOUCHER (P.V.) - SINGLE PAGE FORM          */}
              {/* ------------------------------------------------------------- */}
              {formData.category === 'PAYMENT_VOUCHER' && (
                <div className="space-y-6 pt-2">
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        💵 Official AL-ASR Motors Payment Voucher Entry (P.V.)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Fills exact fields matching the physical payment voucher pad.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40">
                      P.V. # {formData.invoiceNumber || selectedInvoice?.receiptNo || 'PV-PAD'}
                    </span>
                  </div>

                  <div className="space-y-4 bg-slate-900/80 p-5 rounded-xl border border-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Date (تاریخ) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.dated}
                          onChange={(e) => handleInputChange('dated', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Payee's Name (نام پانے والا) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Name of person or entity receiving payment"
                          value={formData.payeeName || formData.buyerName || ''}
                          onChange={(e) => {
                            handleInputChange('payeeName', e.target.value);
                            handleInputChange('buyerName', e.target.value);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-amber-500"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Head of Account (کھاتہ) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Vehicle Purchase / Office Expense / Settlement"
                          value={formData.headOfAccount || ''}
                          onChange={(e) => handleInputChange('headOfAccount', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Amount (Rs. / روپے) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 250000"
                          value={formData.totalPrice || ''}
                          onChange={(e) => handleInputChange('totalPrice', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-amber-500 font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          In Words (الفاظ میں)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Two Lac Fifty Thousand Rupees Only"
                          value={formData.inWords || ''}
                          onChange={(e) => handleInputChange('inWords', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-amber-500 italic"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Particulars / Description (تفصیل)
                        </label>
                        <textarea
                          rows="3"
                          placeholder="Description of payment voucher..."
                          value={formData.remarks || ''}
                          onChange={(e) => handleInputChange('remarks', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-amber-500 custom-scrollbar"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 4: SALES RECEIPT (سیل رسید) - TABBED MULTI-SECTION  */}
              {/* ------------------------------------------------------------- */}
              {formData.category === 'SALES_RECEIPT' && (
                <>
                  {/* TAB 1: GENERAL DETAILS */}
                  {activeTab === 'general' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">Basic Metadata & Registration</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                            Registration No. (رجسٹریشن نمبر)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. LEA-22-4589 or Unregistered"
                            value={formData.registrationNo}
                            onChange={(e) => handleInputChange('registrationNo', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Time (وقت)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 03:30 PM"
                            value={formData.time || formData.agreementTime || ''}
                            onChange={(e) => handleInputChange('time', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:border-cyan-500"
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

                  {/* TAB 6: FINANCIALS */}
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

                  {/* TAB 7: WITNESSES */}
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
                </>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between bg-slate-900/40 p-4 -mx-6 -mb-6">
                <div className="flex space-x-2">
                  {formData.category === 'SALES_RECEIPT' && activeTab !== 'general' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['general', 'seller', 'buyer', 'vehicle', 'agreement', 'financials', 'witnesses'];
                        const idx = tabs.indexOf(activeTab);
                        if (idx > 0) setActiveTab(tabs[idx - 1]);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
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
      {/* SIGNED RECEIPT PHOTOS GALLERY & UPLOAD MODAL */}
      {receiptImageModalOpen && selectedReceiptForImages && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b192c] border border-purple-500/30 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Signed Receipt Photos <span className="text-purple-400 font-mono">({selectedReceiptForImages.invoiceNumber})</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload photos of the physical printed paper voucher signed by {selectedReceiptForImages.buyerName || 'Customer'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReceiptImageModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Upload Area */}
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-dashed border-purple-500/40 text-center space-y-3">
                <input
                  type="file"
                  id="receipt-photo-upload"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadReceiptImages}
                />
                <label
                  htmlFor="receipt-photo-upload"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 cursor-pointer text-xs font-bold transition-all shadow-lg"
                >
                  <Upload className="w-4 h-4" />
                  <span>Select & Upload Signed Receipt Photos</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Supports JPG, PNG, WEBP signed receipt copies (camera photos or scans).
                </p>
                {uploadingReceiptImages && (
                  <div className="flex items-center justify-center space-x-2 text-xs text-purple-400 font-mono pt-1">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading image(s) to secure cloud storage...</span>
                  </div>
                )}
              </div>

              {/* Photos Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Uploaded Signed Receipts ({selectedReceiptForImages.images?.length || 0})
                </h4>

                {!selectedReceiptForImages.images || selectedReceiptForImages.images.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-white/5 text-slate-500 text-xs">
                    No signed receipt photos uploaded yet. Use the upload button above to attach paper receipt scans/photos.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedReceiptForImages.images.map((img, idx) => (
                      <div key={img.id} className="group relative bg-slate-900 rounded-xl border border-white/10 overflow-hidden shadow-md">
                        <img
                          src={img.imageUrl}
                          alt="Signed Receipt"
                          className="w-full h-36 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                          onClick={() => setLightboxIndex(idx)}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setLightboxIndex(idx)}
                            className="p-2 rounded-lg bg-cyan-500/80 text-white hover:bg-cyan-500 shadow"
                            title="View Fullscreen"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReceiptImage(img.id)}
                            className="p-2 rounded-lg bg-rose-500/80 text-white hover:bg-rose-500 shadow"
                            title="Delete Photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FULLSCREEN MODAL */}
      {lightboxIndex >= 0 && selectedReceiptForImages?.images?.[lightboxIndex] && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxIndex(-1)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold bg-white/10 p-2 rounded-full cursor-pointer"
          >
            ✕
          </button>
          
          {lightboxIndex > 0 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex - 1)}
              className="absolute left-4 text-white/80 hover:text-white p-3 bg-white/10 rounded-full text-xl cursor-pointer"
            >
              ◀
            </button>
          )}

          <img
            src={selectedReceiptForImages.images[lightboxIndex].imageUrl}
            alt="Signed Receipt Large"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/20"
          />

          {lightboxIndex < selectedReceiptForImages.images.length - 1 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-4 text-white/80 hover:text-white p-3 bg-white/10 rounded-full text-xl cursor-pointer"
            >
              ▶
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-white/20 px-4 py-2 rounded-full text-white text-xs font-mono">
            Photo {lightboxIndex + 1} of {selectedReceiptForImages.images.length}
          </div>
        </div>
      )}
    </div>
  );
}
