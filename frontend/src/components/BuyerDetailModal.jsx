import React from 'react';
import { X, Users, Phone, MapPin, Calendar, Tag, UserCheck, Edit, DollarSign, FileText, Truck } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../utils/priceFormatter';

const formatDateStr = (dateVal) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

export default function BuyerDetailModal({ buyer, onClose, onEdit }) {
  const { isAdmin } = useAuth();
  if (!buyer) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-modal rounded-3xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl my-8 relative flex flex-col">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/10 gap-3">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg font-extrabold text-lg ${
              (buyer.isCommercial || buyer.vehicleType === 'Commercial')
                ? 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/20 text-black'
                : 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/20 text-black'
            }`}>
              {buyer.buyerName?.charAt(0).toUpperCase() || 'B'}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <h3 className="text-xl font-extrabold text-white">{buyer.buyerName}</h3>
                {(buyer.isCommercial || buyer.vehicleType === 'Commercial') && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-extrabold">
                    <Truck className="w-3 h-3 text-amber-400" />
                    <span>COMMERCIAL BUYER</span>
                  </span>
                )}
                <StatusBadge status={buyer.leadStatus} />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Buyer Lead ID: {buyer.id?.substring(0, 8)} • Registration Date: {formatDateStr(buyer.registrationDate || buyer.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAdmin && (
              <button
                onClick={() => onEdit(buyer)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit Inquiry</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-5">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buyer Contact Information */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
              <h4 className="text-xs uppercase font-mono text-cyan-400 tracking-wider font-bold border-b border-white/5 pb-2">
                Buyer Contact Details
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">Full Name:</span>
                  <span className="font-bold text-white text-sm">{buyer.buyerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">Phone Number:</span>
                  <span className="font-mono text-cyan-400 font-bold">{buyer.buyerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">City / Location:</span>
                  <span className="text-white font-medium">{buyer.buyerCity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">Lead Source:</span>
                  <span className="text-slate-300 font-mono">{buyer.leadSource}</span>
                </div>
                {buyer.leadReferredBy && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Referred By:</span>
                    <span className="text-sky-400 font-mono font-bold">{buyer.leadReferredBy}</span>
                  </div>
                )}
                {buyer.leadReference && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Reference:</span>
                    <span className="text-slate-300 font-mono">{buyer.leadReference}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Requirement & Budget */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
              <h4 className="text-xs uppercase font-mono text-cyan-400 tracking-wider font-bold border-b border-white/5 pb-2">
                Inquiry Requirements & Budget
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">Payment / Financing:</span>
                  <span className={`font-mono font-bold ${buyer.isBankCase ? (buyer.bankCaseStatus === 'Confirmed' ? 'text-emerald-400' : 'text-amber-300') : 'text-emerald-400'}`}>
                    {buyer.isBankCase 
                      ? (buyer.bankCaseStatus === 'Confirmed' && buyer.bankCaseNo 
                          ? `BANK CASE #${buyer.bankCaseNo} (CONFIRMED - ${buyer.bankName || 'Bank'})` 
                          : `BANK CASE (NOT CONFIRMED / HOLD - ${buyer.bankName || 'Bank'})`
                        )
                      : 'DIRECT SALE'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">Vehicle Target Budget:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {formatPKR(buyer.budget)}
                  </span>
                </div>
                {buyer.isBankCase && isAdmin && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono">Downpayment ({buyer.downpaymentPercent || 0}% of Vehicle Price):</span>
                      <span className="font-mono text-amber-300 font-bold">
                        - {formatPKR(buyer.downpaymentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono">Processing Fees (Added After Downpayment):</span>
                      <span className="font-mono text-purple-300 font-bold">
                        + {formatPKR(buyer.processingFees)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/10">
                      <span className="text-slate-300 font-mono font-bold">Calculated Due Loan Balance:</span>
                      <span className="font-mono font-extrabold text-cyan-300 text-sm">
                        {formatPKR(buyer.dueAmount)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-400 font-mono">Desired Vehicle:</span>
                  <span className="font-bold text-white">{buyer.vehicle} {buyer.model} ({buyer.year || 'N/A'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">Preferred Color:</span>
                  <span className="font-mono text-white font-semibold">{buyer.color || 'Any'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">Condition:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{buyer.carCondition || 'Used'} {buyer.carCondition === 'Zero Meter' ? `(${buyer.zeroMeterType || 'Cash'})` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">Assigned Salesman:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {buyer.assignedUser?.name || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Comments & Inquiry Notes */}
          {buyer.comments && (
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <h4 className="text-xs uppercase font-mono text-slate-400 tracking-wider mb-1">Inquiry Comments & Requirements Notes</h4>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">{buyer.comments}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
