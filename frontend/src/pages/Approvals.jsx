import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle, 
  ArrowRight, Search, Filter, RefreshCw, User, Calendar, 
  Car, Users, Package, FileText, Check, X, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatDateStr = (dateVal) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getEntityIcon = (type) => {
  switch (type) {
    case 'SELLER': return <Car className="w-4 h-4 text-cyan-400" />;
    case 'BUYER': return <Users className="w-4 h-4 text-emerald-400" />;
    case 'CURRENT_STOCK': return <Package className="w-4 h-4 text-amber-400" />;
    case 'RECEIVING_LETTER': return <FileText className="w-4 h-4 text-purple-400" />;
    default: return <Car className="w-4 h-4 text-slate-400" />;
  }
};

const getEntityLabel = (type) => {
  switch (type) {
    case 'SELLER': return 'Seller / Car Inventory';
    case 'BUYER': return 'Buyer Inquiry';
    case 'CURRENT_STOCK': return 'Showroom Stock';
    case 'RECEIVING_LETTER': return 'Receiving Letter';
    default: return type;
  }
};

export default function Approvals() {
  const { user, isSuperAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  
  // Action modals
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState(null); // 'APPROVE' | 'REJECT'
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedDiffs, setExpandedDiffs] = useState({});

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, entityFilter, actionFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getApprovals({
        status: statusFilter || undefined,
        entityType: entityFilter || undefined,
        action: actionFilter || undefined
      });
      if (data) {
        setRequests(data.requests || []);
        setCounts(data.counts || { total: 0, pending: 0, approved: 0, rejected: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch approval requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedReq) return;
    setSubmitting(true);
    try {
      await api.approveRequest(selectedReq.id, reviewNotes);
      setSelectedReq(null);
      setActionType(null);
      setReviewNotes('');
      fetchRequests();
    } catch (err) {
      alert(err.message || 'Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReq) return;
    setSubmitting(true);
    try {
      await api.rejectRequest(selectedReq.id, reviewNotes);
      setSelectedReq(null);
      setActionType(null);
      setReviewNotes('');
      fetchRequests();
    } catch (err) {
      alert(err.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDiff = (id) => {
    setExpandedDiffs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter requests locally by search keyword
  const filteredRequests = requests.filter(req => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (req.entityName && req.entityName.toLowerCase().includes(q)) ||
      (req.reason && req.reason.toLowerCase().includes(q)) ||
      (req.requestedByUser?.name && req.requestedByUser.name.toLowerCase().includes(q))
    );
  });

  // Calculate field diffs for EDIT requests
  const getFieldDiffs = (current, proposed) => {
    if (!proposed || typeof proposed !== 'object') return [];
    const diffs = [];
    const ignoreKeys = ['id', 'createdAt', 'updatedAt', 'createdByUser', 'assignedUser', 'images', 'sellerImages'];
    
    Object.keys(proposed).forEach(key => {
      if (ignoreKeys.includes(key)) return;
      const oldVal = current ? current[key] : undefined;
      const newVal = proposed[key];
      
      // Compare values
      const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal) : '';
      const newStr = newVal !== undefined && newVal !== null ? String(newVal) : '';
      
      if (oldStr !== newStr) {
        diffs.push({
          field: key,
          oldValue: oldStr || '(Empty)',
          newValue: newStr || '(Cleared)'
        });
      }
    });
    return diffs;
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-black font-extrabold shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {isSuperAdmin ? 'Super Admin Approval Center' : 'My Change Approval Requests'}
              </h2>
              <p className="text-xs font-mono text-slate-400">
                {isSuperAdmin 
                  ? 'Review, verify, and approve or reject edits and deletions initiated by Administrators.' 
                  : 'Track the real-time status of your edit and deletion requests submitted to the Super Admin.'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchRequests}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Requests</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter('PENDING')}
          className={`glass-card p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'PENDING' ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/5' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Pending Approvals</p>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{counts.pending || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('APPROVED')}
          className={`glass-card p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'APPROVED' ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Approved & Executed</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{counts.approved || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('REJECTED')}
          className={`glass-card p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'REJECTED' ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-500/5' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Rejected Requests</p>
              <h3 className="text-2xl font-extrabold text-rose-400 mt-1">{counts.rejected || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('')}
          className={`glass-card p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === '' ? 'border-cyan-500 ring-1 ring-cyan-500 bg-cyan-500/5' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">All Request History</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{counts.total || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-card p-4 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicle, requester, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Categories</option>
            <option value="SELLER">Car Inventory (Sellers)</option>
            <option value="BUYER">Buyer Inquiries</option>
            <option value="CURRENT_STOCK">Showroom Stock</option>
            <option value="RECEIVING_LETTER">Receiving Letters</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Actions (Edit & Delete)</option>
            <option value="EDIT">Edits Only</option>
            <option value="DELETE">Deletions Only</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-card p-12 text-center text-slate-400 rounded-2xl border border-white/10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent mb-3"></div>
            <p className="font-mono text-sm">Loading approval requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-400 rounded-2xl border border-white/10 font-mono text-sm">
            No approval requests found matching current filters.
          </div>
        ) : (
          filteredRequests.map((req) => {
            const diffs = req.action === 'EDIT' ? getFieldDiffs(req.currentData, req.proposedData) : [];
            const isExpanded = Boolean(expandedDiffs[req.id]);

            return (
              <div 
                key={req.id}
                className="glass-card rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all p-5 space-y-4"
              >
                {/* Request Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center">
                      {getEntityIcon(req.entityType)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="font-extrabold text-white text-base">{req.entityName || `${req.entityType} #${req.entityId}`}</span>
                        
                        {/* Entity Pill */}
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/10">
                          {getEntityLabel(req.entityType)}
                        </span>

                        {/* Action Pill */}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold uppercase border ${
                          req.action === 'DELETE'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        }`}>
                          {req.action === 'DELETE' ? '🗑️ DELETION REQUEST' : '✏️ EDIT REQUEST'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mt-0.5">
                        <span>Requested by: <strong className="text-white">{req.requestedByUser?.name || 'Admin'}</strong></span>
                        <span>•</span>
                        <span>{formatDateStr(req.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-mono font-extrabold uppercase border ${
                      req.status === 'PENDING'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                        : req.status === 'APPROVED'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Reason Note */}
                {req.reason && (
                  <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5 text-xs text-slate-300 font-mono flex items-start space-x-2">
                    <MessageSquare className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 font-bold">Admin Note: </span>
                      <span>{req.reason}</span>
                    </div>
                  </div>
                )}

                {/* Diff Viewer for Edit requests */}
                {req.action === 'EDIT' && diffs.length > 0 && (
                  <div className="bg-slate-950/80 rounded-xl p-3.5 border border-white/5 space-y-2">
                    <div 
                      onClick={() => toggleDiff(req.id)}
                      className="flex items-center justify-between cursor-pointer text-xs font-mono text-cyan-400 font-bold"
                    >
                      <span>Modified Fields ({diffs.length} changes)</span>
                      <button className="flex items-center space-x-1 hover:text-white">
                        <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                        {diffs.map((d, i) => (
                          <div key={i} className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5 space-y-1">
                            <div className="text-slate-400 font-bold capitalize">{d.field}:</div>
                            <div className="flex items-center space-x-2 flex-wrap text-[11px]">
                              <span className="line-through text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{d.oldValue}</span>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              <span className="text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">{d.newValue}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Deletion Warning for Delete requests */}
                {req.action === 'DELETE' && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300 font-mono flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>This request will permanently delete this record from the database once approved by Super Admin.</span>
                  </div>
                )}

                {/* Resolution Footer / Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {req.status === 'PENDING' ? (
                    isSuperAdmin ? (
                      <div className="flex items-center space-x-2 ml-auto">
                        <button
                          onClick={() => { setSelectedReq(req); setActionType('REJECT'); }}
                          className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject Request</span>
                        </button>

                        <button
                          onClick={() => { setSelectedReq(req); setActionType('APPROVE'); }}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Execute</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-amber-400/90 ml-auto flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Awaiting Super Admin review...</span>
                      </div>
                    )
                  ) : (
                    <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-2 flex-wrap">
                      <span>Reviewed by: <strong className="text-slate-200">{req.reviewedByUser?.name || 'Super Admin'}</strong></span>
                      <span>•</span>
                      <span>Resolved on: {formatDateStr(req.resolvedAt)}</span>
                      {req.reviewNotes && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 italic">"{req.reviewNotes}"</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* APPROVAL / REJECTION CONFIRMATION MODAL */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl my-8">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                actionType === 'APPROVE' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {actionType === 'APPROVE' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {actionType === 'APPROVE' ? 'Approve & Execute Request' : 'Reject Change Request'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedReq.entityName}
                </p>
              </div>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Super Admin Decision Notes (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder={actionType === 'APPROVE' ? 'e.g. Approved and confirmed with client...' : 'e.g. Please double check vehicle demand price before updating...'}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => { setSelectedReq(null); setActionType(null); }}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-mono text-xs hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={actionType === 'APPROVE' ? handleApprove : handleReject}
                className={`px-5 py-2 text-black font-bold font-mono text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 ${
                  actionType === 'APPROVE'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-400 hover:to-red-500 shadow-rose-500/20'
                }`}
              >
                {submitting ? 'Processing...' : (actionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
