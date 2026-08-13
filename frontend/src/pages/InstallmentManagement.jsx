import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, Search, Calendar, AlertTriangle, CheckCircle, CreditCard, DollarSign, UserCheck } from 'lucide-react';
import { api } from '../services/api';

export default function InstallmentManagement() {
  const [plans, setPlans] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Form states
  const [planForm, setPlanForm] = useState({
    customerName: '',
    cnic: '',
    phone: '',
    address: '',
    city: '',
    vehicleDetails: '',
    totalAmount: '',
    downPayment: '',
    totalInstallments: 12,
    startDate: new Date().toISOString().slice(0, 10)
  });

  const [payForm, setPayForm] = useState({
    paidAmount: '',
    remarks: ''
  });

  useEffect(() => {
    fetchPlans();
    fetchDefaulters();
  }, [search, statusFilter]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await api.getInstallmentPlans({ search, status: statusFilter });
      setPlans(data);
    } catch (err) {
      console.error('Failed to fetch installment plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaulters = async () => {
    try {
      const data = await api.getDefaulterAlerts();
      setDefaulters(data);
    } catch (err) {
      console.error('Failed to fetch defaulter alerts:', err);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await api.createInstallmentPlan(planForm);
      setIsPlanModalOpen(false);
      setPlanForm({
        customerName: '', cnic: '', phone: '', address: '', city: '',
        vehicleDetails: '', totalAmount: '', downPayment: '', totalInstallments: 12,
        startDate: new Date().toISOString().slice(0, 10)
      });
      fetchPlans();
      fetchDefaulters();
    } catch (err) {
      alert(err.message || 'Failed to create installment plan');
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    try {
      await api.payInstallment({
        scheduleId: selectedSchedule.id,
        paidAmount: payForm.paidAmount || selectedSchedule.amount,
        remarks: payForm.remarks
      });
      setIsPayModalOpen(false);
      setSelectedSchedule(null);
      setPayForm({ paidAmount: '', remarks: '' });
      fetchPlans();
      fetchDefaulters();
    } catch (err) {
      alert(err.message || 'Failed to process installment payment');
    }
  };

  const openPayModal = (schedule, plan) => {
    setSelectedSchedule(schedule);
    setSelectedPlan(plan);
    setPayForm({ paidAmount: schedule.amount, remarks: '' });
    setIsPayModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Installment Management & Reminder System
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Create installment plans, track customer payments, view remaining balances, and send defaulter reminders.
          </p>
        </div>

        <button
          onClick={() => setIsPlanModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Installment Plan</span>
        </button>
      </div>

      {/* Defaulter Alert Warning Banner */}
      {defaulters.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-rose-300 uppercase tracking-wider font-mono">
                ⚠️ Defaulter Alert: {defaulters.length} Overdue Installment Payment(s)
              </p>
              <p className="text-slate-400 font-mono text-[11px] mt-0.5">
                Total overdue balance: Rs. {defaulters.reduce((acc, d) => acc + d.amount, 0).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('DEFAULTER')}
            className="px-3 py-1.5 bg-rose-500 text-white rounded-lg font-mono font-bold text-[11px] hover:bg-rose-400 self-start sm:self-auto"
          >
            Filter Defaulters
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search plan #, customer name, vehicle details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
        >
          <option value="">All Plan Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="DEFAULTER">DEFAULTER</option>
        </select>
      </div>

      {/* Installment Plans Ledger Grid */}
      <div className="space-y-4">
        {plans.map((plan) => {
          const financed = plan.financedAmount || (plan.totalAmount - plan.downPayment);
          const paidAmt = plan.paidInstallments * plan.monthlyInstallment;
          const remainingAmt = Math.max(0, financed - paidAmt);

          return (
            <div key={plan.id} className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-white font-mono text-sm">{plan.planNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      plan.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      plan.status === 'DEFAULTER' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-semibold mt-0.5">
                    Customer: {plan.customer?.customerName} • Phone: {plan.customer?.phone || 'N/A'} • Vehicle: {plan.vehicleDetails}
                  </p>
                </div>

                <div className="flex items-center space-x-4 font-mono text-xs text-right">
                  <div>
                    <span className="text-slate-400 block text-[10px]">TOTAL PRICE</span>
                    <span className="font-bold text-white">Rs. {plan.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">DOWN PAYMENT</span>
                    <span className="font-bold text-cyan-400">Rs. {plan.downPayment?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">REMAINING DUE</span>
                    <span className="font-bold text-rose-400">Rs. {remainingAmt.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Installment Schedules Grid */}
              <div>
                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono mb-2">
                  Monthly Installment Schedule ({plan.paidInstallments} of {plan.totalInstallments} Paid)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {plan.schedules?.map((sched) => {
                    const isOverdue = sched.status === 'PENDING' && new Date(sched.dueDate) < new Date();
                    return (
                      <div
                        key={sched.id}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          sched.status === 'PAID'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : isOverdue
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
                            : 'bg-slate-900 border-white/10 text-slate-300'
                        }`}
                      >
                        <div className="text-[10px] font-mono font-bold">Inst #{sched.installmentNo}</div>
                        <div className="text-xs font-mono font-extrabold my-0.5">Rs. {sched.amount?.toLocaleString()}</div>
                        <div className="text-[9px] font-mono opacity-80">
                          Due: {new Date(sched.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>

                        {sched.status === 'PENDING' ? (
                          <button
                            onClick={() => openPayModal(sched, plan)}
                            className="w-full mt-1.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-[9.5px] rounded"
                          >
                            Collect Payment
                          </button>
                        ) : (
                          <div className="mt-1 text-[9px] font-mono font-bold text-emerald-400 flex items-center justify-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5" /> PAID
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {plans.length === 0 && !loading && (
          <div className="glass-card rounded-2xl p-12 text-center text-slate-500 font-mono text-xs">
            No installment plans found. Click "New Installment Plan" to create one.
          </div>
        )}
      </div>

      {/* CREATE INSTALLMENT PLAN MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-xl border border-amber-500/30 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Customer Installment Plan</h3>
            <p className="text-xs text-slate-400 font-mono mb-5">
              Set vehicle total price, down payment, tenure months, and auto-generate schedule.
            </p>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tariq Mehmood"
                    value={planForm.customerName}
                    onChange={(e) => setPlanForm({ ...planForm, customerName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">CNIC Number</label>
                  <input
                    type="text"
                    placeholder="35501-1234567-1"
                    value={planForm.cnic}
                    onChange={(e) => setPlanForm({ ...planForm, cnic: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={planForm.phone}
                    onChange={(e) => setPlanForm({ ...planForm, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Vehicle Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota Corolla Altis 2022 (Super White)"
                    value={planForm.vehicleDetails}
                    onChange={(e) => setPlanForm({ ...planForm, vehicleDetails: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Total Vehicle Price (PKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 4500000"
                    value={planForm.totalAmount}
                    onChange={(e) => setPlanForm({ ...planForm, totalAmount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Down Payment (PKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1500000"
                    value={planForm.downPayment}
                    onChange={(e) => setPlanForm({ ...planForm, downPayment: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Tenure (Months) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="60"
                    value={planForm.totalInstallments}
                    onChange={(e) => setPlanForm({ ...planForm, totalInstallments: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20"
                >
                  Generate Plan Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT INSTALLMENT PAYMENT MODAL */}
      {isPayModalOpen && selectedSchedule && selectedPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md border border-emerald-500/30 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Collect Installment Payment</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Plan: {selectedPlan.planNumber} • Customer: {selectedPlan.customer?.customerName}
            </p>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="p-3 bg-slate-900 rounded-xl border border-white/10 text-xs font-mono space-y-1">
                <div className="text-slate-400">Installment Number: <span className="text-white font-bold">#{selectedSchedule.installmentNo}</span></div>
                <div className="text-slate-400">Due Date: <span className="text-amber-400 font-bold">{new Date(selectedSchedule.dueDate).toLocaleDateString()}</span></div>
                <div className="text-slate-400">Scheduled Amount: <span className="text-emerald-400 font-bold">Rs. {selectedSchedule.amount?.toLocaleString()}</span></div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Collected Amount (PKR) *</label>
                <input
                  type="number"
                  required
                  value={payForm.paidAmount}
                  onChange={(e) => setPayForm({ ...payForm, paidAmount: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Payment Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Received via Cash / Bank Transfer"
                  value={payForm.remarks}
                  onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20"
                >
                  Confirm Payment Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
