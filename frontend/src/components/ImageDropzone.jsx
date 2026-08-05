import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon, FileText, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

const categories = ['Front', 'Back', 'Interior', 'Engine', 'Dashboard', 'Documents', 'Other'];

export default function ImageDropzone({ sellerId, images = [], onImagesUpdated }) {
  const [activeCategory, setActiveCategory] = useState('Front');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const filteredImages = images.filter(img => img.category === activeCategory);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setError('');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setError('');
    try {
      await api.uploadSellerImages(sellerId, activeCategory, selectedFiles);
      setSelectedFiles([]);
      if (onImagesUpdated) onImagesUpdated();
    } catch (err) {
      setError(err.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    try {
      await api.deleteSellerImage(sellerId, imageId);
      if (onImagesUpdated) onImagesUpdated();
    } catch (err) {
      alert(err.message || 'Failed to delete image');
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
        {categories.map((cat) => {
          const catCount = images.filter(img => img.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{cat}</span>
              {catCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-cyan-500 text-black font-mono font-bold rounded-full text-[10px]">
                  {catCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upload Box */}
      <div className="glass-card rounded-xl p-4 border-dashed border-white/15 text-center">
        <input
          type="file"
          id={`file-upload-${activeCategory}`}
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <label
          htmlFor={`file-upload-${activeCategory}`}
          className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-2"
        >
          <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              Upload photos/documents for category <span className="text-cyan-400">[{activeCategory}]</span>
            </p>
            <p className="text-[11px] text-slate-400">PNG, JPG, WEBP, or PDF up to 10MB each</p>
          </div>
        </label>

        {selectedFiles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400">
              {selectedFiles.length} file(s) selected
            </span>
            <button
              onClick={handleUpload}
              disabled={uploading}
              type="button"
              className="px-4 py-1.5 bg-cyan-500 text-black font-bold rounded-lg text-xs hover:bg-cyan-400 disabled:opacity-50 transition-all flex items-center space-x-1"
            >
              {uploading ? 'Uploading...' : 'Confirm Upload'}
            </button>
          </div>
        )}

        {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
      </div>

      {/* Image Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filteredImages.map((img) => (
          <div key={img.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-900 aspect-video">
            <img
              src={img.imageUrl}
              alt={img.category}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] font-mono text-cyan-400 border border-white/10">
                  {img.category}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  className="p-1 rounded bg-rose-500/80 text-white hover:bg-rose-600 transition-colors"
                  title="Delete image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredImages.length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-500 text-xs font-mono">
            No images uploaded yet for [{activeCategory}].
          </div>
        )}
      </div>
    </div>
  );
}
