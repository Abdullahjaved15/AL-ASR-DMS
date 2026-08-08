import React, { useState } from 'react';
import { Filter, RotateCcw, ChevronDown, ChevronUp, X, Car, Calendar, DollarSign, MapPin, Tag, UserCheck, Building2 } from 'lucide-react';

const COMMON_BRANDS = [
  'Toyota', 'Honda', 'Suzuki', 'Hyundai', 'Kia', 'BMW', 'Mercedes-Benz', 
  'Audi', 'Nissan', 'Ford', 'MG', 'Haval', 'Changan', 'Lexus', 'Porsche'
];

const LEAD_STATUSES = [
  'New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation', 
  'Deal Closed', 'Lost', 'Cancelled', 'Incomplete'
];

export default function FilterBar({
  filters,
  setFilters,
  resetFilters,
  salesmenList = [],
  isAdmin = false,
  priceLabel = "Price Range"
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleInputChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const removeFilter = (field) => {
    setFilters(prev => ({ ...prev, [field]: '' }));
  };

  const removePriceRange = () => {
    setFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' }));
  };

  const removeYearRange = () => {
    setFilters(prev => ({ ...prev, minYear: '', maxYear: '' }));
  };

  // Count active filters
  const activeCount = Object.entries(filters).filter(([key, val]) => {
    if (key === 'minYear' || key === 'maxYear') return false; // Handled together
    if (key === 'minPrice' || key === 'maxPrice') return false; // Handled together
    return Boolean(val);
  }).length + (filters.minYear || filters.maxYear ? 1 : 0) + (filters.minPrice || filters.maxPrice ? 1 : 0);

  const hasActiveFilters = activeCount > 0;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 mb-6 border border-white/10 shadow-xl backdrop-blur-xl">
      {/* Filter Bar Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-wide">Multi-Field Search & Filters</h3>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono">
                  {activeCount} Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Search simultaneously by car make, model, year, price & more</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center space-x-1.5 transition-all"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors"
            title={isExpanded ? "Collapse filters" : "Expand filters"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Multi-Field Filter Controls */}
      {isExpanded && (
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Car Brand / Make */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
              <Car className="w-3.5 h-3.5 text-cyan-400" />
              <span>Car Brand / Make</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="brand-suggestions"
                placeholder="e.g. Toyota, Honda, BMW..."
                value={filters.vehicle || ''}
                onChange={(e) => handleInputChange('vehicle', e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
              <datalist id="brand-suggestions">
                {COMMON_BRANDS.map(brand => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>Car Model</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Corolla, Civic, Tucson..."
              value={filters.model || ''}
              onChange={(e) => handleInputChange('model', e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
            />
          </div>

          {/* Year Range */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Year Range</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min (2015)"
                value={filters.minYear || ''}
                onChange={(e) => handleInputChange('minYear', e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
              <input
                type="number"
                placeholder="Max (2025)"
                value={filters.maxYear || ''}
                onChange={(e) => handleInputChange('maxYear', e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>{priceLabel} ($)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min Price"
                value={filters.minPrice || ''}
                onChange={(e) => handleInputChange('minPrice', e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
              <input
                type="number"
                placeholder="Max Price"
                value={filters.maxPrice || ''}
                onChange={(e) => handleInputChange('maxPrice', e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>City / Location</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Lahore, Karachi, NY..."
              value={filters.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              <span>Lead Status</span>
            </label>
            <select
              value={filters.leadStatus || ''}
              onChange={(e) => handleInputChange('leadStatus', e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="">All Statuses</option>
              {LEAD_STATUSES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Bank Case Filter (If supported) */}
          {filters.isBankCase !== undefined && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5 text-sky-400" />
                <span>Payment Type</span>
              </label>
              <select
                value={filters.isBankCase || ''}
                onChange={(e) => handleInputChange('isBankCase', e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="">All Payments (Cash & Bank)</option>
                <option value="true">Bank Financing Cases Only</option>
                <option value="false">Cash Sales Only</option>
              </select>
            </div>
          )}

          {/* Search by Case # */}
          {filters.caseNo !== undefined && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider flex items-center space-x-1 font-mono">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Search Case #</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 1, 2, Case #1..."
                value={filters.caseNo || ''}
                onChange={(e) => handleInputChange('caseNo', e.target.value)}
                className="w-full bg-slate-900/90 border border-sky-500/40 rounded-xl px-3 py-2 text-xs text-sky-300 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all font-mono font-bold"
              />
            </div>
          )}

          {/* Salesman Filter (Admin only) */}
          {isAdmin && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Assigned Salesman</span>
              </label>
              <select
                value={filters.assignedTo || ''}
                onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="">All Salesmen</option>
                {salesmenList.map(sm => (
                  <option key={sm.id} value={sm.id}>{sm.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* From Lead Assign Date Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>From Assign Date</span>
            </label>
            <input
              type="date"
              value={filters.fromDate || ''}
              onChange={(e) => handleInputChange('fromDate', e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* To Lead Assign Date Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>To Assign Date</span>
            </label>
            <input
              type="date"
              value={filters.toDate || ''}
              onChange={(e) => handleInputChange('toDate', e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>
      )}

      {/* Active Filter Chips/Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-white/5">
          <span className="text-[11px] font-mono text-slate-400 mr-1">Applied Filters:</span>

          {filters.vehicle && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono">
              <span>Brand: <strong>{filters.vehicle}</strong></span>
              <button onClick={() => removeFilter('vehicle')} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.model && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 text-xs font-mono">
              <span>Model: <strong>{filters.model}</strong></span>
              <button onClick={() => removeFilter('model')} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(filters.minYear || filters.maxYear) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono">
              <span>Year: <strong>{filters.minYear || 'Any'} - {filters.maxYear || 'Any'}</strong></span>
              <button onClick={removeYearRange} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(filters.minPrice || filters.maxPrice) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono">
              <span>Price: <strong>${filters.minPrice || '0'} - ${filters.maxPrice || '∞'}</strong></span>
              <button onClick={removePriceRange} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.city && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs font-mono">
              <span>City: <strong>{filters.city}</strong></span>
              <button onClick={() => removeFilter('city')} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(filters.fromDate || filters.toDate) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono">
              <span>Assign Date Range: <strong>{filters.fromDate || 'Start'} to {filters.toDate || 'End'}</strong></span>
              <button onClick={() => { removeFilter('fromDate'); removeFilter('toDate'); }} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.leadStatus && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs font-mono">
              <span>Status: <strong>{filters.leadStatus}</strong></span>
              <button onClick={() => removeFilter('leadStatus')} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.assignedTo && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-mono">
              <span>Salesman: <strong>{salesmenList.find(s => s.id === filters.assignedTo)?.name || filters.assignedTo}</strong></span>
              <button onClick={() => removeFilter('assignedTo')} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
