import React, { useState } from 'react';
import { X, CheckCircle2, Circle, Save, Building2, User, FileText, Smartphone, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function BankChecklistModal({ buyer, onClose, onChecklistSaved }) {
  if (!buyer) return null;

  const defaultChecklist = {
    sourceOfIncomeJob: false,
    sourceOfIncomeBusiness: false,
    sixMonthBankStatement: false,
    accountMaintenanceLetter: false,
    passportPhotosBlueBg: false,
    casePersonIdCopies: false,
    twoRefIdNotBloodRelCopies: false,
    jobHolderSixSalarySlips: false,
    businessNameBankAccount: 'NO', // 'YES' | 'NO'
    filerStatus: 'NO', // 'YES' | 'NO'
    ntnReturnFile: false,
    mobileSimQuantity: ''
  };

  const initialList = { ...defaultChecklist, ...(buyer.bankChecklist || {}) };
  const [checklist, setChecklist] = useState(initialList);
  const [saving, setSaving] = useState(false);

  const toggleField = (field) => {
    setChecklist(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateBuyer(buyer.id, {
        isBankCase: true,
        bankChecklist: checklist
      });
      if (onChecklistSaved) onChecklistSaved();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to save bank checklist');
    } finally {
      setSaving(false);
    }
  };

  // Count completed items
  const totalItems = 12;
  const completedCount = [
    checklist.sourceOfIncomeJob,
    checklist.sourceOfIncomeBusiness,
    checklist.sixMonthBankStatement,
    checklist.accountMaintenanceLetter,
    checklist.passportPhotosBlueBg,
    checklist.casePersonIdCopies,
    checklist.twoRefIdNotBloodRelCopies,
    checklist.jobHolderSixSalarySlips,
    checklist.businessNameBankAccount === 'YES',
    checklist.filerStatus === 'YES',
    checklist.ntnReturnFile,
    Boolean(checklist.mobileSimQuantity && String(checklist.mobileSimQuantity).trim() !== '')
  ].filter(Boolean).length;

  const percent = Math.round((completedCount / totalItems) * 100);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-modal rounded-3xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl my-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-extrabold text-white">Bank Case Requirement Checklist</h3>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Buyer: <strong className="text-white">{buyer.buyerName}</strong> ({buyer.vehicle} {buyer.model}) • Bank: <span className="text-cyan-300 font-bold">{buyer.bankName || 'Standard Financing'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="my-4 bg-slate-900/90 p-3 rounded-2xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300">Document Completion Status:</span>
            <span className="text-cyan-400 font-bold">{completedCount} of {totalItems} completed ({percent}%)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
        </div>

        {/* Checklist Grid */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {/* Income Proofs */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>1. Proof of Income Documents</span>
            </h4>

            <div
              onClick={() => toggleField('sourceOfIncomeJob')}
              className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                checklist.sourceOfIncomeJob
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium">Source of Income with Proof (Job Holder)</span>
              {checklist.sourceOfIncomeJob ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
            </div>

            <div
              onClick={() => toggleField('sourceOfIncomeBusiness')}
              className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                checklist.sourceOfIncomeBusiness
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium">Source of Income with Proof (Business)</span>
              {checklist.sourceOfIncomeBusiness ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
            </div>

            <div
              onClick={() => toggleField('jobHolderSixSalarySlips')}
              className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                checklist.jobHolderSixSalarySlips
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium">Job Holder 6-Month Salary Slips</span>
              {checklist.jobHolderSixSalarySlips ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
            </div>
          </div>

          {/* Banking Documents */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>2. Banking & Account Verification</span>
            </h4>

            <div
              onClick={() => toggleField('sixMonthBankStatement')}
              className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                checklist.sixMonthBankStatement
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium">Six Month Bank Statement (with Sign & Stamp)</span>
              {checklist.sixMonthBankStatement ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
            </div>

            <div
              onClick={() => toggleField('accountMaintenanceLetter')}
              className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                checklist.accountMaintenanceLetter
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium">Account Maintenance Letter (with Sign & Stamp)</span>
              {checklist.accountMaintenanceLetter ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
              <span className="text-xs font-medium text-slate-300">Business Name Bank Account?</span>
              <div className="flex items-center space-x-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setChecklist({ ...checklist, businessNameBankAccount: 'YES' })}
                  className={`px-3 py-1 rounded-lg border ${
                    checklist.businessNameBankAccount === 'YES'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                      : 'bg-slate-800 text-slate-400 border-white/5'
                  }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setChecklist({ ...checklist, businessNameBankAccount: 'NO' })}
                  className={`px-3 py-1 rounded-lg border ${
                    checklist.businessNameBankAccount === 'NO'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold'
                      : 'bg-slate-800 text-slate-400 border-white/5'
                  }`}
                >
                  NO
                </button>
              </div>
            </div>
          </div>

          {/* Identity & Reference Documents */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5" />
              <span>3. Identity & References</span>
            </h4>

            <div
              onClick={() => toggleField('passportPhotosBlueBg')}
              className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                checklist.passportPhotosBlueBg
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium">Two Passport Size Photos (Blue Background)</span>
              {checklist.passportPhotosBlueBg ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
            </div>

            <div
              onClick={() => toggleField('casePersonIdCopies')}
              className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                checklist.casePersonIdCopies
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium">Case Person ID Card (4 Photo Copies)</span>
              {checklist.casePersonIdCopies ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
            </div>

            <div
              onClick={() => toggleField('twoRefIdNotBloodRelCopies')}
              className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                checklist.twoRefIdNotBloodRelCopies
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium">Two Reference ID Cards (Not Blood Relation, 4 Copies)</span>
              {checklist.twoRefIdNotBloodRelCopies ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
            </div>
          </div>

          {/* Tax & SIM Details */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>4. Tax Filer & SIM Information</span>
            </h4>

            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
              <span className="text-xs font-medium text-slate-300">Filer Status?</span>
              <div className="flex items-center space-x-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setChecklist({ ...checklist, filerStatus: 'YES' })}
                  className={`px-3 py-1 rounded-lg border ${
                    checklist.filerStatus === 'YES'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                      : 'bg-slate-800 text-slate-400 border-white/5'
                  }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setChecklist({ ...checklist, filerStatus: 'NO' })}
                  className={`px-3 py-1 rounded-lg border ${
                    checklist.filerStatus === 'NO'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold'
                      : 'bg-slate-800 text-slate-400 border-white/5'
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            <div
              onClick={() => toggleField('ntnReturnFile')}
              className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                checklist.ntnReturnFile
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium">NTN 2024/25/26 Return of Income File</span>
              {checklist.ntnReturnFile ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
              <span className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mobile SIM Quantity:</span>
              </span>
              <input
                type="text"
                placeholder="e.g. 2 SIMs"
                value={checklist.mobileSimQuantity || ''}
                onChange={(e) => setChecklist({ ...checklist, mobileSimQuantity: e.target.value })}
                className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono w-32 text-right"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-white/10 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Checklist Status'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
