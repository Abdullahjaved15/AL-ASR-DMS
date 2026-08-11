import React, { useState } from 'react';
import { X, Car, Phone, MapPin, Calendar, Tag, UserCheck, Edit, Upload, ExternalLink, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import StatusBadge from './StatusBadge';
import ImageDropzone from './ImageDropzone';

const categories = ['All', 'Front', 'Back', 'Interior', 'Engine', 'Dashboard', 'Documents', 'Other'];

const formatDateStr = (dateVal) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

export default function SellerDetailModal({ seller, onClose, onEdit, onImagesUpdated }) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'upload'
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!seller) return null;

  const images = seller.images || [];
  const filteredImages = activeCategory === 'All'
    ? images
    : images.filter(img => img.category === activeCategory);

  const currentLightboxImg = lightboxIndex !== null ? filteredImages[lightboxIndex] : null;

  const handlePrev = (e) => {
    e.stopPropagation();
    if (lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
    else setLightboxIndex(filteredImages.length - 1);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (lightboxIndex < filteredImages.length - 1) setLightboxIndex(lightboxIndex + 1);
    else setLightboxIndex(0);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-modal rounded-3xl p-6 w-full max-w-4xl border border-white/10 shadow-2xl my-8 relative flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/10 gap-3 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-black font-extrabold text-lg">
              {seller.vehicle?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-extrabold text-white">{seller.vehicle} {seller.model}</h3>
                <StatusBadge status={seller.leadStatus} />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Stock ID: {seller.id?.substring(0, 8)} • Registration Date: {formatDateStr(seller.registrationDate || seller.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(seller)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-cyan-400" />
              <span>Edit Lead</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector Bar */}
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-white/10 gap-1 my-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'details'
                ? 'bg-cyan-500 text-black font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Vehicle Details & Photos ({images.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'upload'
                ? 'bg-cyan-500 text-black font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Manage Photo Attachments</span>
          </button>
        </div>

        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="space-y-6 overflow-y-auto flex-1 pr-1">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seller Information */}
              <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
                <h4 className="text-xs uppercase font-mono text-cyan-400 tracking-wider font-bold border-b border-white/5 pb-2">
                  Seller Contact Info
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Seller Name:</span>
                    <span className="font-bold text-white text-sm">{seller.sellerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Phone Number:</span>
                    <span className="font-mono text-cyan-400 font-bold">{seller.sellerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">City / Location:</span>
                    <span className="text-white font-medium">{seller.sellerCity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Lead Source:</span>
                    <span className="text-slate-300 font-mono">{seller.leadSource}</span>
                  </div>
                  {seller.leadReferredBy && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono">Referred By:</span>
                      <span className="text-sky-400 font-mono font-bold">{seller.leadReferredBy}</span>
                    </div>
                  )}
                  {seller.leadReference && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono">Reference:</span>
                      <span className="text-slate-300 font-mono">{seller.leadReference}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Specifications */}
              <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
                <h4 className="text-xs uppercase font-mono text-cyan-400 tracking-wider font-bold border-b border-white/5 pb-2">
                  Vehicle Specifications & Pricing
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Number Plate (Reg #):</span>
                    <span className="font-mono font-bold text-amber-300">
                      {seller.numberPlate || 'UNREGISTERED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Demand Price:</span>
                    <span className="font-mono font-extrabold text-cyan-400 text-base">
                      Rs. {seller.demandPrice?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Model Year:</span>
                    <span className="font-mono text-white font-semibold">{seller.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Exterior Color:</span>
                    <span className="text-white font-medium">{seller.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Mileage:</span>
                    <span className="font-mono text-slate-200">{seller.mileage?.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Assigned Agent:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {seller.assignedUser?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments & Condition Notes */}
            {seller.comments && (
              <div className="glass-card rounded-2xl p-4 border border-white/10">
                <h4 className="text-xs uppercase font-mono text-slate-400 tracking-wider mb-1">Vehicle Comments & Condition Notes</h4>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">{seller.comments}</p>
              </div>
            )}

            {/* EMBEDDED CAR PHOTO GALLERY */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Vehicle Photo Attachments ({images.length})</h4>
                  <p className="text-xs text-slate-400 font-mono">Categorized vehicle inspection photos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-mono flex items-center space-x-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Upload Photos</span>
                </button>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
                {categories.map((cat) => {
                  const count = cat === 'All'
                    ? images.length
                    : images.filter(img => img.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all flex items-center space-x-1.5 ${
                        activeCategory === cat
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className="px-1.5 py-0.2 bg-slate-800 text-cyan-400 font-bold rounded-full text-[10px]">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredImages.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => setLightboxIndex(idx)}
                    className="group relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900 aspect-video cursor-pointer hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.category}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                      <span className="px-2 py-0.5 bg-black/70 backdrop-blur rounded text-[10px] font-mono text-cyan-400 border border-cyan-500/30 self-start">
                        {img.category}
                      </span>
                      <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono">
                        <span>Click to view</span>
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                      </div>
                    </div>
                  </div>
                ))}

                {filteredImages.length === 0 && (
                  <div className="col-span-full py-10 text-center text-slate-500 font-mono text-xs border border-dashed border-white/10 rounded-2xl">
                    No photos uploaded for category [{activeCategory}]. Click "Manage Photo Attachments" to upload vehicle photos.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div className="py-4 overflow-y-auto flex-1">
            <ImageDropzone
              sellerId={seller.id}
              images={seller.images || []}
              onImagesUpdated={onImagesUpdated}
            />
          </div>
        )}

        {/* LIGHTBOX ENLARGED FULLSCREEN OVERLAY */}
        {currentLightboxImg && (
          <div
            className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-6 right-6 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <button
              onClick={handlePrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div
              className="relative max-w-5xl max-h-[85vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={currentLightboxImg.imageUrl}
                alt={currentLightboxImg.category}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
              />

              <div className="mt-4 flex items-center justify-between w-full px-4 text-xs font-mono text-slate-300">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-full">
                    Category: {currentLightboxImg.category}
                  </span>
                  <span>Photo {lightboxIndex + 1} of {filteredImages.length}</span>
                </div>
                <a
                  href={currentLightboxImg.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg flex items-center space-x-1 border border-white/10 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Resolution</span>
                </a>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
