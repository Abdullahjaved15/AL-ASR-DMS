import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Upload, Image as ImageIcon, ExternalLink, FileText } from 'lucide-react';
import ImageDropzone from './ImageDropzone';

const categories = ['All', 'Front', 'Back', 'Interior', 'Engine', 'Dashboard', 'Documents', 'Other'];

export default function ImageViewerModal({ seller, onClose, onImagesUpdated }) {
  const [activeTab, setActiveTab] = useState('gallery'); // 'gallery' | 'upload'
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const images = seller?.images || [];

  const filteredImages = activeCategory === 'All'
    ? images
    : images.filter(img => img.category === activeCategory);

  const currentLightboxImg = lightboxIndex !== null ? filteredImages[lightboxIndex] : null;

  const handlePrev = (e) => {
    e.stopPropagation();
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else {
      setLightboxIndex(filteredImages.length - 1);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (lightboxIndex < filteredImages.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else {
      setLightboxIndex(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-modal rounded-3xl p-6 w-full max-w-4xl border border-white/10 shadow-2xl my-8 relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-full font-mono text-xs">
                {seller?.vehicle} {seller?.model} ({seller?.year})
              </span>
              <span className="text-xs text-slate-400 font-mono">Seller: {seller?.sellerName}</span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">Vehicle Media & Document Attachments</h3>
          </div>

          <div className="flex items-center space-x-3">
            {/* View / Upload Toggle Buttons */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('gallery')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center space-x-1.5 ${
                  activeTab === 'gallery'
                    ? 'bg-cyan-500 text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>View Gallery ({images.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center space-x-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-cyan-500 text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photos</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
              {categories.map((cat) => {
                const count = cat === 'All'
                  ? images.length
                  : images.filter(img => img.category === cat).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    type="button"
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all flex items-center space-x-1.5 ${
                      activeCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="px-1.5 py-0.2 bg-slate-800 text-cyan-400 font-bold rounded-full text-[10px]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grid of Images */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="px-2 py-0.5 bg-black/70 backdrop-blur rounded text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
                        {img.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                      <span>Click to view</span>
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  </div>
                </div>
              ))}

              {filteredImages.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-500 font-mono text-xs border border-dashed border-white/10 rounded-2xl">
                  No images uploaded under [{activeCategory}] category yet. Switch to "Upload Photos" tab to add vehicle images.
                </div>
              )}
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
            {/* Close Button */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-6 right-6 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Nav Arrow */}
            <button
              onClick={handlePrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Enlarged Image Container */}
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
                  <span>
                    Photo {lightboxIndex + 1} of {filteredImages.length}
                  </span>
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

            {/* Right Nav Arrow */}
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
