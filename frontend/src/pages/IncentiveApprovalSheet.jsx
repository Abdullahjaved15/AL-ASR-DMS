import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  Plus, 
  Search, 
  Printer, 
  Edit, 
  Trash2, 
  Camera, 
  Image as ImageIcon, 
  Upload, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2,
  Calendar,
  User,
  Car,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function IncentiveApprovalSheetPage() {
  const { user } = useAuth();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Images Upload & Gallery States
  const [selectedFilesForUpload, setSelectedFilesForUpload] = useState([]);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedSheetForMedia, setSelectedSheetForMedia] = useState(null);
  const [mediaActiveTab, setMediaActiveTab] = useState('gallery'); // 'gallery' | 'upload'
  const [directUploadFiles, setDirectUploadFiles] = useState([]);
  const [uploadingDirectImages, setUploadingDirectImages] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Printable Sheet Modal State
  const [printSheet, setPrintSheet] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const initialFormData = {
    dateCol1: new Date().toISOString().slice(0, 10),
    dateCol2: '',
    vehicleRegCol1: '',
    vehicleRegCol2: '',
    chassisNoCol1: '',
    chassisNoCol2: '',
    colorCol1: '',
    colorCol2: '',
    modelCol1: '',
    modelCol2: '',
    purchaserCol1: '',
    purchaserCol2: '',
    sellerCol1: '',
    sellerCol2: '',
    personalContactCol1: '',
    personalContactCol2: '',
    socialMediaCol1: '',
    socialMediaCol2: '',
    walkingCustomerCol1: '',
    walkingCustomerCol2: '',
    visitingCustomerCol1: '',
    visitingCustomerCol2: '',
    otherCol1: '',
    otherCol2: '',
    cashBankCol1: '',
    cashBankCol2: '',
    salePersonSignCol1: user?.name || '',
    salePersonSignCol2: '',
    dealCol1: '',
    dealCol2: '',
    amountCol1: '',
    amountCol2: '',
    commissionCol1: '',
    commissionCol2: '',
    locationCol1: '',
    locationCol2: '',
    bioStatusCol1: '',
    bioStatusCol2: '',
    approvedByCol1: '',
    approvedByCol2: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  const rows = [
    { label: 'Date:', key1: 'dateCol1', key2: 'dateCol2' },
    { label: 'Vehicle + REG# :', key1: 'vehicleRegCol1', key2: 'vehicleRegCol2' },
    { label: 'Ch#', key1: 'chassisNoCol1', key2: 'chassisNoCol2' },
    { label: 'Color:', key1: 'colorCol1', key2: 'colorCol2' },
    { label: 'Model:', key1: 'modelCol1', key2: 'modelCol2' },
    { label: 'Purchaser Name/Number:', key1: 'purchaserCol1', key2: 'purchaserCol2' },
    { label: 'Seller Name/Number:', key1: 'sellerCol1', key2: 'sellerCol2' },
    { label: 'Personal Contact:', key1: 'personalContactCol1', key2: 'personalContactCol2' },
    { label: 'Social Media:', key1: 'socialMediaCol1', key2: 'socialMediaCol2' },
    { label: 'Walking Customer:', key1: 'walkingCustomerCol1', key2: 'walkingCustomerCol2' },
    { label: 'Visiting Customer:', key1: 'visitingCustomerCol1', key2: 'visitingCustomerCol2' },
    { label: 'Other:', key1: 'otherCol1', key2: 'otherCol2' },
    { label: 'Cash/Bank:', key1: 'cashBankCol1', key2: 'cashBankCol2' },
    { label: 'Sale Person/Name Sign:', key1: 'salePersonSignCol1', key2: 'salePersonSignCol2' },
    { label: 'Deal:', key1: 'dealCol1', key2: 'dealCol2' },
    { label: 'Amount:', key1: 'amountCol1', key2: 'amountCol2' },
    { label: 'Commision/ % Or Fee:', key1: 'commissionCol1', key2: 'commissionCol2' },
    { label: 'Location:', key1: 'locationCol1', key2: 'locationCol2' },
    { label: 'Bio Status:', key1: 'bioStatusCol1', key2: 'bioStatusCol2' },
    { label: 'Approved By:', key1: 'approvedByCol1', key2: 'approvedByCol2' }
  ];

  useEffect(() => {
    fetchSheets();
  }, [search]);

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const data = await api.getIncentiveApprovalSheets({ search });
      setSheets(data || []);
    } catch (err) {
      console.error('Failed to fetch incentive approval sheets:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingSheet(null);
    setSelectedFilesForUpload([]);
    setFormData({
      ...initialFormData,
      salePersonSignCol1: user?.name || ''
    });
  };

  const handleEditClick = (sheet) => {
    setEditingSheet(sheet);
    setSelectedFilesForUpload([]);
    setFormData({
      dateCol1: sheet.dateCol1 || '',
      dateCol2: sheet.dateCol2 || '',
      vehicleRegCol1: sheet.vehicleRegCol1 || '',
      vehicleRegCol2: sheet.vehicleRegCol2 || '',
      chassisNoCol1: sheet.chassisNoCol1 || '',
      chassisNoCol2: sheet.chassisNoCol2 || '',
      colorCol1: sheet.colorCol1 || '',
      colorCol2: sheet.colorCol2 || '',
      modelCol1: sheet.modelCol1 || '',
      modelCol2: sheet.modelCol2 || '',
      purchaserCol1: sheet.purchaserCol1 || '',
      purchaserCol2: sheet.purchaserCol2 || '',
      sellerCol1: sheet.sellerCol1 || '',
      sellerCol2: sheet.sellerCol2 || '',
      personalContactCol1: sheet.personalContactCol1 || '',
      personalContactCol2: sheet.personalContactCol2 || '',
      socialMediaCol1: sheet.socialMediaCol1 || '',
      socialMediaCol2: sheet.socialMediaCol2 || '',
      walkingCustomerCol1: sheet.walkingCustomerCol1 || '',
      walkingCustomerCol2: sheet.walkingCustomerCol2 || '',
      visitingCustomerCol1: sheet.visitingCustomerCol1 || '',
      visitingCustomerCol2: sheet.visitingCustomerCol2 || '',
      otherCol1: sheet.otherCol1 || '',
      otherCol2: sheet.otherCol2 || '',
      cashBankCol1: sheet.cashBankCol1 || '',
      cashBankCol2: sheet.cashBankCol2 || '',
      salePersonSignCol1: sheet.salePersonSignCol1 || '',
      salePersonSignCol2: sheet.salePersonSignCol2 || '',
      dealCol1: sheet.dealCol1 || '',
      dealCol2: sheet.dealCol2 || '',
      amountCol1: sheet.amountCol1 || '',
      amountCol2: sheet.amountCol2 || '',
      commissionCol1: sheet.commissionCol1 || '',
      commissionCol2: sheet.commissionCol2 || '',
      locationCol1: sheet.locationCol1 || '',
      locationCol2: sheet.locationCol2 || '',
      bioStatusCol1: sheet.bioStatusCol1 || '',
      bioStatusCol2: sheet.bioStatusCol2 || '',
      approvedByCol1: sheet.approvedByCol1 || '',
      approvedByCol2: sheet.approvedByCol2 || ''
    });
    setIsFormModalOpen(true);
  };

  const handleFileSelection = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFilesForUpload(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeSelectedFile = (index) => {
    setSelectedFilesForUpload(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSheet = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let savedSheet;
      if (editingSheet) {
        savedSheet = await api.updateIncentiveApprovalSheet(editingSheet.id, formData);
        if (savedSheet.requiresApproval) {
          alert('Your changes have been submitted to Super Admin for approval.');
        } else {
          alert('Incentive Approval Sheet updated successfully!');
        }
      } else {
        savedSheet = await api.createIncentiveApprovalSheet(formData);
        alert('Incentive Approval Sheet created successfully!');
      }

      if (savedSheet && savedSheet.id && selectedFilesForUpload.length > 0) {
        try {
          await api.uploadIncentiveApprovalSheetImages(savedSheet.id, selectedFilesForUpload);
        } catch (uploadErr) {
          console.error('Failed uploading attached images:', uploadErr);
          alert('Sheet saved, but there was an issue uploading images.');
        }
      }

      setIsFormModalOpen(false);
      resetForm();
      fetchSheets();
    } catch (err) {
      console.error('Failed saving incentive approval sheet:', err);
      alert('Error: ' + (err.message || 'Failed to save form.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSheet = async (sheet) => {
    if (!window.confirm(`Are you sure you want to delete Sheet #${sheet.sheetNumber}?`)) return;

    try {
      const res = await api.deleteIncentiveApprovalSheet(sheet.id);
      if (res.requiresApproval) {
        alert('Deletion request has been submitted to Super Admin for approval.');
      } else {
        alert('Incentive Approval Sheet deleted successfully!');
      }
      fetchSheets();
    } catch (err) {
      console.error('Failed deleting sheet:', err);
      alert('Error: ' + (err.message || 'Failed to delete sheet.'));
    }
  };

  const handleOpenMediaModal = (sheet) => {
    setSelectedSheetForMedia(sheet);
    setMediaActiveTab('gallery');
    setDirectUploadFiles([]);
    setIsImageModalOpen(true);
  };

  const handleDirectUploadImages = async () => {
    if (!selectedSheetForMedia || directUploadFiles.length === 0) return;
    setUploadingDirectImages(true);
    try {
      const res = await api.uploadIncentiveApprovalSheetImages(selectedSheetForMedia.id, directUploadFiles);
      setDirectUploadFiles([]);
      setMediaActiveTab('gallery');
      const updatedSheet = await api.getIncentiveApprovalSheetById(selectedSheetForMedia.id);
      setSelectedSheetForMedia(updatedSheet);
      fetchSheets();
      alert(res.message || 'Images uploaded successfully!');
    } catch (err) {
      console.error('Failed to upload images:', err);
      alert('Error: ' + (err.message || 'Failed to upload images.'));
    } finally {
      setUploadingDirectImages(false);
    }
  };

  const handleDeleteMediaImage = async (imageId) => {
    if (!selectedSheetForMedia) return;
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      await api.deleteIncentiveApprovalSheetImage(selectedSheetForMedia.id, imageId);
      const updatedSheet = await api.getIncentiveApprovalSheetById(selectedSheetForMedia.id);
      setSelectedSheetForMedia(updatedSheet);
      fetchSheets();
    } catch (err) {
      console.error('Failed to delete image:', err);
      alert('Failed to delete image.');
    }
  };

  // Dedicated Print Function using clean Popup Window
  const triggerPrintDocument = (sheet) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this site to print documents.');
      return;
    }

    const tableRowsHtml = rows.map(r => `
      <tr>
        <td class="lbl-col">${r.label}</td>
        <td class="val-col">${sheet[r.key1] || ''}</td>
        <td class="val-col">${sheet[r.key2] || ''}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>INCENTIVE APPROVAL SHEET - ${sheet.sheetNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: Arial, sans-serif;
              background: #ffffff;
              color: #000000;
              margin: 0;
              padding: 0;
            }
            .sheet-container {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              border: 1.5px solid #000000;
            }
            .header-banner {
              background-color: #969696 !important;
              color: #000000;
              font-weight: 800;
              font-size: 14px;
              text-transform: uppercase;
              text-align: center;
              padding: 8px 4px;
              border-bottom: 1.5px solid #000000;
              letter-spacing: 0.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td {
              border-bottom: 1px solid #000000;
              border-right: 1px solid #000000;
              padding: 5px 10px;
              font-size: 11.5px;
              height: 26px;
              vertical-align: middle;
            }
            td:last-child {
              border-right: none;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .lbl-col {
              font-weight: bold;
              width: 38%;
              background-color: #ffffff;
              text-align: left;
            }
            .val-col {
              width: 31%;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="sheet-container">
            <div class="header-banner">INCENTIVE APPROVAL SHEET</div>
            <table>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleOpenPrintPreview = (sheet) => {
    setPrintSheet(sheet);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                INCENTIVE APPROVAL SHEET
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Create, Edit, Upload Documents & Print Approval Forms
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Sheet#, Vehicle, Purchaser..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsFormModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Approval Sheet</span>
          </button>
        </div>
      </div>

      {/* Sheet List / Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-cyan-400 font-mono text-sm space-x-3">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Incentive Approval Sheets...</span>
        </div>
      ) : sheets.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-white/5 space-y-3">
          <FileCheck className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm font-medium">No Incentive Approval Sheets found.</p>
          <button
            onClick={() => {
              resetForm();
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-bold hover:bg-cyan-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Approval Sheet</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sheets.map((sheet) => {
            const vehicleInfo = sheet.vehicleRegCol1 || sheet.vehicleRegCol2 || 'N/A';
            const purchaserInfo = sheet.purchaserCol1 || sheet.purchaserCol2 || 'N/A';
            const amountInfo = sheet.amountCol1 || sheet.amountCol2 || 'N/A';
            const approvedBy = sheet.approvedByCol1 || sheet.approvedByCol2 || 'N/A';

            return (
              <div
                key={sheet.id}
                className="glass-card rounded-2xl border border-white/10 p-5 space-y-4 hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                      {sheet.sheetNumber}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {sheet.createdAt ? new Date(sheet.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-cyan-400" /> Vehicle/Reg:
                      </span>
                      <span className="font-semibold text-white truncate max-w-[160px]">{vehicleInfo}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-cyan-400" /> Purchaser:
                      </span>
                      <span className="font-semibold text-slate-200 truncate max-w-[160px]">{purchaserInfo}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Amount:
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">{amountInfo}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Approved By:</span>
                      <span className="font-medium text-slate-300">{approvedBy}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => triggerPrintDocument(sheet)}
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-[11px] font-semibold transition-all shadow-sm"
                    title="Print Document"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Sheet</span>
                  </button>

                  <button
                    onClick={() => handleOpenPrintPreview(sheet)}
                    className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
                    title="Preview Layout"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenMediaModal(sheet)}
                    className="relative flex items-center justify-center py-1.5 px-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-blue-500/20 hover:text-blue-400 border border-slate-700 hover:border-blue-500/40 text-[11px] font-semibold transition-all"
                    title="Upload / View attached images"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {sheet.images && sheet.images.length > 0 && (
                      <span className="ml-1 text-[10px] bg-cyan-500 text-slate-950 font-extrabold rounded-full px-1.5">
                        {sheet.images.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleEditClick(sheet)}
                    className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400 border border-slate-700 hover:border-amber-500/40 transition-all"
                    title="Edit Sheet"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteSheet(sheet)}
                    className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-all"
                    title="Delete Sheet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-card bg-[#091b2c] border border-cyan-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingSheet ? `Edit Incentive Approval Sheet (${editingSheet.sheetNumber})` : 'New Incentive Approval Sheet'}
                  </h2>
                  <p className="text-xs text-slate-400">All field variables are string inputs matching form rows.</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveSheet} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              <div className="bg-slate-950/60 border border-white/10 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                  Form Table Data (2 Columns per row)
                </h3>

                <div className="space-y-3">
                  {rows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-2 rounded-lg bg-slate-900/50 border border-white/5 hover:border-cyan-500/30 transition-all">
                      <div className="md:col-span-4 text-xs font-semibold text-slate-200">
                        {row.label}
                      </div>
                      <div className="md:col-span-4">
                        <input
                          type="text"
                          placeholder="Column 1 Value"
                          value={formData[row.key1] || ''}
                          onChange={(e) => setFormData({ ...formData, [row.key1]: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <input
                          type="text"
                          placeholder="Column 2 Value"
                          value={formData[row.key2] || ''}
                          onChange={(e) => setFormData({ ...formData, [row.key2]: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Attachments section */}
              <div className="bg-slate-950/60 border border-white/10 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  Attach Form Images / Documents (Optional)
                </label>

                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold cursor-pointer transition-all">
                    <Upload className="w-4 h-4" />
                    <span>Select Images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelection}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {selectedFilesForUpload.length} files selected
                  </span>
                </div>

                {selectedFilesForUpload.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedFilesForUpload.map((file, idx) => (
                      <div key={idx} className="relative group bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-200 flex items-center space-x-2">
                        <span className="truncate max-w-[140px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingSheet ? 'Update Sheet' : 'Save Sheet'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA & IMAGE GALLERY MODAL */}
      {isImageModalOpen && selectedSheetForMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="glass-card bg-[#091b2c] border border-cyan-500/30 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Attached Documents & Images - Sheet #{selectedSheetForMedia.sheetNumber}
                  </h2>
                  <p className="text-xs text-slate-400">Upload or view images associated with this approval sheet</p>
                </div>
              </div>
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 px-4 bg-slate-950/40">
              <button
                onClick={() => setMediaActiveTab('gallery')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  mediaActiveTab === 'gallery'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Gallery ({selectedSheetForMedia.images?.length || 0})
              </button>
              <button
                onClick={() => setMediaActiveTab('upload')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  mediaActiveTab === 'upload'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload New Images
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {mediaActiveTab === 'gallery' ? (
                !selectedSheetForMedia.images || selectedSheetForMedia.images.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-3">
                    <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs">No attached images found for this sheet.</p>
                    <button
                      onClick={() => setMediaActiveTab('upload')}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold"
                    >
                      Upload Image
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedSheetForMedia.images.map((img, idx) => (
                      <div key={img.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-950 aspect-video">
                        <img
                          src={img.imageUrl}
                          alt="Sheet Attachment"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setLightboxIndex(idx)}
                            className="p-2 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                            title="View Fullscreen"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMediaImage(img.id)}
                            className="p-2 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-400"
                            title="Delete Image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-6 text-center space-y-3 bg-slate-950/40">
                    <Upload className="w-8 h-8 text-cyan-400 mx-auto" />
                    <p className="text-xs text-slate-300">Select image files to attach to this sheet</p>
                    <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 text-cyan-400 border border-cyan-500/30 text-xs font-bold cursor-pointer hover:bg-slate-700">
                      <span>Browse Files</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setDirectUploadFiles(Array.from(e.target.files || []))}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {directUploadFiles.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-300">Selected Files:</p>
                      <div className="flex flex-wrap gap-2">
                        {directUploadFiles.map((f, i) => (
                          <span key={i} className="text-xs bg-slate-900 text-slate-300 px-3 py-1 rounded-lg border border-slate-700">
                            {f.name}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={handleDirectUploadImages}
                        disabled={uploadingDirectImages}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
                      >
                        {uploadingDirectImages ? 'Uploading...' : 'Confirm Upload'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR FULL IMAGE PREVIEW */}
      {lightboxIndex !== null && selectedSheetForMedia && selectedSheetForMedia.images && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={() => setLightboxIndex((lightboxIndex - 1 + selectedSheetForMedia.images.length) % selectedSheetForMedia.images.length)}
            className="absolute left-4 p-3 rounded-full bg-slate-800/80 text-white hover:bg-slate-700"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <img
            src={selectedSheetForMedia.images[lightboxIndex]?.imageUrl}
            alt="Full view"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />

          <button
            onClick={() => setLightboxIndex((lightboxIndex + 1) % selectedSheetForMedia.images.length)}
            className="absolute right-4 p-3 rounded-full bg-slate-800/80 text-white hover:bg-slate-700"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {isPrintModalOpen && printSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="glass-card bg-[#091b2c] border border-cyan-500/30 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <span className="text-xs font-mono text-cyan-400 font-bold">
                Sheet Preview: #{printSheet.sheetNumber}
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => triggerPrintDocument(printSheet)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document Now</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* On-screen Preview Display */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-200 text-black font-sans">
              <div className="max-w-[750px] mx-auto p-4 bg-white text-black border border-black shadow-lg">
                <div className="bg-[#969696] text-black font-extrabold uppercase tracking-wider text-center py-2.5 border border-black text-sm mb-0">
                  INCENTIVE APPROVAL SHEET
                </div>

                <table className="w-full border-collapse border border-black text-xs text-black font-sans">
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold w-[38%] bg-white text-left pl-3 text-black">
                          {row.label}
                        </td>
                        <td className="border-r border-black p-2 w-[31%] text-left pl-3 font-normal text-black min-h-[28px]">
                          {printSheet[row.key1] || ''}
                        </td>
                        <td className="p-2 w-[31%] text-left pl-3 font-normal text-black min-h-[28px]">
                          {printSheet[row.key2] || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
