import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('general');

  const [formData, setFormData] = useState({
    registrationNo: '',
    // Seller Details
    sellerName: '',
    sellerFatherName: '',
    sellerAddress: '',
    sellerPhone: '',
    // Buyer Details
    buyerName: '',
    buyerFatherName: '',
    buyerAddress: '',
    buyerPhone: '',
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

  const resetForm = () => {
    setFormData({
      registrationNo: '',
      sellerName: '',
      sellerFatherName: '',
      sellerAddress: '',
      sellerPhone: '',
      buyerName: '',
      buyerFatherName: '',
      buyerAddress: '',
      buyerPhone: '',
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

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.createInvoice(formData);
      setIsAddModalOpen(false);
      resetForm();
      fetchInvoices();
      if (created) {
        if (window.confirm('Sales Receipt (سیل رسید) created successfully! Do you want to print the receipt now?')) {
          exportInvoicePDF(created);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to create sales receipt');
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

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="ltr" lang="en">
        <head>
          <title>Sales Receipt (سیل رسید) - ${receiptNo} - AL ASR MOTORS</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 8mm 10mm; }
              body { padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 6px; 
              color: #0f172a; 
              background: #ffffff;
              line-height: 1.3;
              font-size: 9.5px;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2.5px double #0284c7;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-img {
              height: 60px;
              width: auto;
              object-fit: contain;
            }
            .brand-title {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: 0.5px;
            }
            .brand-subtitle {
              font-size: 11px;
              color: #0284c7;
              font-weight: bold;
            }
            .brand-contact {
              font-size: 9px;
              color: #64748b;
              margin-top: 1px;
            }
            .doc-title-badge {
              text-align: right;
              background: #0f172a;
              color: #ffffff;
              padding: 6px 14px;
              border-radius: 8px;
            }
            .doc-title {
              font-size: 13px;
              font-weight: 800;
              color: #38bdf8;
              text-transform: uppercase;
            }
            .doc-num {
              font-size: 10.5px;
              font-family: monospace;
              margin-top: 2px;
            }

            .section-box {
              border: 1px solid #cbd5e1;
              border-radius: 5px;
              margin-bottom: 8px;
              overflow: hidden;
            }
            .section-header {
              background: #f1f5f9;
              padding: 4px 10px;
              font-weight: bold;
              font-size: 10.5px;
              color: #0f172a;
              border-bottom: 1px solid #cbd5e1;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            table.details-table {
              width: 100%;
              border-collapse: collapse;
            }
            table.details-table td {
              padding: 4px 8px;
              font-size: 9.5px;
              border-bottom: 1px solid #f1f5f9;
              border-right: 1px solid #f1f5f9;
              vertical-align: middle;
            }
            table.details-table td.label-col {
              color: #475569;
              background-color: #f8fafc;
              font-weight: 600;
              width: 25%;
            }
            table.details-table td.val-col {
              font-weight: bold;
              color: #0f172a;
              width: 25%;
            }

            .financial-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 4px;
              margin-bottom: 8px;
            }
            .financial-table th {
              background: #0f172a;
              color: #fff;
              font-size: 9.5px;
              padding: 5px 8px;
              text-align: left;
            }
            .financial-table td {
              padding: 5px 8px;
              border: 1px solid #cbd5e1;
              font-size: 10.5px;
              font-weight: bold;
            }

            .terms-box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 5px;
              padding: 6px 10px;
              margin-top: 6px;
              margin-bottom: 8px;
            }
            .terms-title {
              font-size: 10px;
              font-weight: bold;
              color: #0f172a;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 3px;
              margin-bottom: 4px;
            }
            .terms-list {
              font-size: 8.5px;
              color: #334155;
              padding-left: 14px;
              margin: 0;
              line-height: 1.35;
            }
            .terms-list li {
              margin-bottom: 2px;
            }

            .signature-container {
              display: flex;
              justify-content: space-between;
              margin-top: 36px;
              gap: 12px;
            }
            .sig-box {
              flex: 1;
              border-top: 1.5px solid #334155;
              padding-top: 6px;
              text-align: center;
              font-size: 9px;
              font-weight: bold;
              color: #334155;
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
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right;">
            <button onclick="window.print()" class="print-btn">🖨️ Print Official Receipt (پرنٹ کریں)</button>
          </div>

          <!-- Header -->
          <div class="header-container">
            <div class="logo-section">
              <img src="${logoBase64}" class="logo-img" alt="AL ASR MOTORS" />
              <div>
                <div class="brand-title">AL ASR MOTORS</div>
                <div class="brand-subtitle">VEHICLE SALES RECEIPT • سیل رسید</div>
                <div class="brand-contact">Showroom Floor • Main GT Road / City Center, Sahiwal, Pakistan</div>
                <div class="brand-contact">Phone: +92 300 1234567 • Official Dealership Copy</div>
              </div>
            </div>
            <div class="doc-title-badge">
              <div class="doc-title">Sales Receipt (سیل رسید)</div>
              <div class="doc-num">Receipt No: ${receiptNo}</div>
              <div style="font-size: 10px; color: #cbd5e1; margin-top: 3px;">Date (تاریخ): ${createdDate}</div>
            </div>
          </div>

          <!-- General & Vehicle Plate Details -->
          <div class="section-box">
            <div class="section-header">
              <span>📌 General Details (عمومی تفصیلات)</span>
              <span>Registration No (رجسٹریشن نمبر): <strong style="color:#0284c7;">${regNo}</strong></span>
            </div>
            <table class="details-table">
              <tr>
                <td class="label-col">Date (تاریخ):</td>
                <td class="val-col">${createdDate}</td>
                <td class="label-col">Receipt No. (رسید نمبر):</td>
                <td class="val-col">${receiptNo}</td>
              </tr>
              <tr>
                <td class="label-col">Registration No. (رجسٹریشن نمبر):</td>
                <td class="val-col">${regNo}</td>
                <td class="label-col">Vehicle Maker (میکر):</td>
                <td class="val-col">${vehicleMaker}</td>
              </tr>
            </table>
          </div>

          <!-- Seller Details -->
          <div class="section-box">
            <div class="section-header">
              <span>👤 Seller Details (فروخت کنندہ)</span>
            </div>
            <table class="details-table">
              <tr>
                <td class="label-col">Seller Name (فروخت کنندہ):</td>
                <td class="val-col">${sellerName}</td>
                <td class="label-col">Son of / Father (ولدیت):</td>
                <td class="val-col">${sellerFather}</td>
              </tr>
              <tr>
                <td class="label-col">Phone No. (فون نمبر):</td>
                <td class="val-col">${sellerPhone}</td>
                <td class="label-col">Address (پتہ):</td>
                <td class="val-col">${sellerAddress}</td>
              </tr>
            </table>
          </div>

          <!-- Buyer Details -->
          <div class="section-box">
            <div class="section-header">
              <span>👤 Buyer Details (خریدار)</span>
            </div>
            <table class="details-table">
              <tr>
                <td class="label-col">Buyer Name (خریدار):</td>
                <td class="val-col">${buyerName}</td>
                <td class="label-col">Son of / Father (ولدیت):</td>
                <td class="val-col">${buyerFather}</td>
              </tr>
              <tr>
                <td class="label-col">Phone No. (فون نمبر):</td>
                <td class="val-col">${buyerPhone}</td>
                <td class="label-col">Address (پتہ):</td>
                <td class="val-col">${buyerAddress}</td>
              </tr>
            </table>
          </div>

          <!-- Vehicle Details -->
          <div class="section-box">
            <div class="section-header">
              <span>🚗 Vehicle Specifications (گاڑی کی تفصیلات)</span>
            </div>
            <table class="details-table">
              <tr>
                <td class="label-col">Maker (میکر):</td>
                <td class="val-col">${vehicleMaker}</td>
                <td class="label-col">Model (ماڈل):</td>
                <td class="val-col">${vehicleModel}</td>
              </tr>
              <tr>
                <td class="label-col">Engine No. (انجن نمبر):</td>
                <td class="val-col">${engineNo}</td>
                <td class="label-col">Chassis No. (چیسز نمبر):</td>
                <td class="val-col">${chassisNo}</td>
              </tr>
              <tr>
                <td class="label-col">Power Capacity (پاور):</td>
                <td class="val-col">${powerCapacity}</td>
                <td class="label-col">Post Office (ڈاک خانہ):</td>
                <td class="val-col">${postOffice}</td>
              </tr>
              <tr>
                <td class="label-col">Last Token (آخری ٹوکن):</td>
                <td class="val-col">${lastToken}</td>
                <td class="label-col">Reg. Owner Name (رجسٹریشن نام):</td>
                <td class="val-col">${regName}</td>
              </tr>
              <tr>
                <td class="label-col">Reg Owner Father (ولدیت):</td>
                <td class="val-col">${regFatherName}</td>
                <td class="label-col">Reg Address (پتہ):</td>
                <td class="val-col">${regAddress}</td>
              </tr>
            </table>
          </div>

          <!-- Transaction Agreement -->
          <div class="section-box">
            <div class="section-header">
              <span>📜 Transaction Agreement (معاہدہ اقرار نامہ)</span>
            </div>
            <table class="details-table">
              <tr>
                <td class="label-col">All docs & rights sum (جملہ کاغذات و حقوق بعوض):</td>
                <td class="val-col" colspan="3">PKR ${Number(agreedSum).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label-col">Half sum (روپے جن کے نصف):</td>
                <td class="val-col">PKR ${Number(agreedHalf).toLocaleString()}</td>
                <td class="label-col">Amount in words (روپے بنتے ہیں):</td>
                <td class="val-col">${agreedWords || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label-col">At time (بوقت):</td>
                <td class="val-col">${agreementTime}</td>
                <td class="label-col">On day (بروز):</td>
                <td class="val-col">${agreementDay}</td>
              </tr>
              <tr>
                <td colspan="4" style="font-size: 10px; color: #475569; padding: 6px 10px; background: #fafafa;">
                  <strong>Condition:</strong> Sold to the second party (buyer), and an agreement was made between both on the following conditions: (فریق دوئم پر فروخت کر دی جو کہ مندرجہ ذیل شرائط پر دونوں میں اقرار نامہ ہوا)
                </td>
              </tr>
            </table>
          </div>

          ${inv.isImported ? `
          <!-- Imported Vehicle Section -->
          <div class="section-box">
            <div class="section-header">
              <span>🚢 For Imported Vehicle (برائے امپورٹڈ گاڑی)</span>
            </div>
            <table class="details-table">
              <tr>
                <td class="label-col">Bill of Entry No. (بل آف انٹری نمبر):</td>
                <td class="val-col">${inv.billOfEntryNo || 'N/A'}</td>
                <td class="label-col">Port Name (نام پورٹ):</td>
                <td class="val-col">${inv.portName || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label-col">Clearance Date (تاریخ کلیرنس):</td>
                <td class="val-col">${inv.clearanceDate || 'N/A'}</td>
                <td class="label-col">Importer Name (امپورٹر نام):</td>
                <td class="val-col">${inv.importerName || 'N/A'}</td>
              </tr>
            </table>
          </div>
          ` : ''}

          <!-- Financial Balances -->
          <div style="margin-bottom: 12px;">
            <table class="financial-table">
              <thead>
                <tr>
                  <th>Total Price of Vehicle (کل قیمت گاڑی)</th>
                  <th>Advance / Earnest Money (بیعانہ رقم)</th>
                  <th>Remaining Balance (بقایا رقم)</th>
                  <th>Time / Duration (ٹائم)</th>
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
          </div>

          <!-- Note / Terms & Conditions -->
          <div class="terms-box">
            <div class="terms-title">📝 Note / Terms & Conditions (نوٹ و شرائط)</div>
            <ol class="terms-list">
              <li>Excise and computer checking of documents must be done within 24 hours. Otherwise, the showroom will not be responsible. (گاڑی کی ایکسائز اور کمپیوٹر چیکنگ 24 گھنٹے کے اندر اندر کروانا لازمی ہے بصورت دیگر شوروم ذمہ دار نہ ہوگا۔)</li>
              <li>Check the engine number and chassis number before taking possession of the vehicle. Later, the showroom will not be responsible in any way because the showroom takes a nominal commission. (گاڑی کی تحویل سے قبل انجن نمبر اور چیسز نمبر تسلی سے چیک کر لیں بعد میں شوروم کی کوئی ذمہ داری نہ ہوگی کیونکہ شوروم محض برائے نام کمیشن لیتا ہے۔)</li>
              <li>Return of the vehicle will be under showroom rules. In case of a return, the commission will not be refunded. (گاڑی کی واپسی شوروم کے قوانین کے مطابق ہوگی، واپسی کی صورت میں کمیشن واپس نہیں ہوگا۔)</li>
              <li>The first party (seller) will be responsible for any kind of error in the vehicle's documents. (گاڑی کے کاغذات میں کسی بھی قسم کی غلطی کا ذمہ دار فریق اول (فروخت کنندہ) ہوگا۔)</li>
              <li>The chassis plate and chassis number of the vehicle were checked on the spot and found to be correct. (گاڑی کی چیسز پلیٹ اور چیسز نمبر موقع پر چیک کر کے درست پائے گئے۔)</li>
              <li>This deal was settled with the mutual consent of both parties. (یہ سودا دونوں فریقین کی باہمی رضامندی سے طے پایا۔)</li>
              <li>Under transport rules, the showroom acts only as a witness. (ٹرانسپورٹ رولز کے تحت شوروم صرف بطور گواہ عمل کرتا ہے۔)</li>
              <li>The institution is bound to provide biometrics within 15 days. (ادارہ 15 ایام کے اندر بائیومیٹرک فراہم کرنے کا پابند ہے۔)</li>
            </ol>
          </div>

          <!-- Signatures & Final Balances -->
          <div class="signature-container">
            <div class="sig-box">
              Signature of Seller<br/>
              (دستخط فروخت کنندہ)
            </div>
            <div class="sig-box">
              Signature of Buyer<br/>
              (دستخط خریدار)
            </div>
            <div class="sig-box">
              Witness No. 1<br/>
              (گواہ نمبر 1: ${inv.witness1Name || ''})
            </div>
            <div class="sig-box">
              Witness No. 2<br/>
              (گواہ نمبر 2: ${inv.witness2Name || ''})
            </div>
            <div class="sig-box" style="border-top-color: #0284c7; color: #0284c7;">
              Showroom Stamp & Sign<br/>
              (دستخط و مہر شوروم)
            </div>
          </div>

          <div style="margin-top: 8px; text-align: center; font-size: 7.5px; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 4px;">
            Generated by AL ASR MOTORS Dealership Management System • System Verified Record • Super Admin Module
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

      {/* CREATE SALES RECEIPT (سیل رسید) BILINGUAL MODAL */}
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
                    Create Sales Receipt <span className="text-cyan-400 font-normal text-sm font-mono">(سیل رسید)</span>
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
                { id: 'imported', label: '🚢 Imported Vehicle' },
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
            <form onSubmit={handleCreateInvoice} className="p-6 overflow-y-auto flex-1 space-y-6">
              
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
