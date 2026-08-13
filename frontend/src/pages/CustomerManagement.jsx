import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, MapPin, CreditCard, ShoppingBag, Eye, Edit, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);

  const [formData, setFormData] = useState({
    customerName: '',
    cnic: '',
    phone: '',
    address: '',
    city: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers({ search });
      setCustomers(data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (selectedCustomer) {
        await api.updateCustomer(selectedCustomer.id, formData);
      } else {
        await api.createCustomer(formData);
      }
      setIsAddModalOpen(false);
      setSelectedCustomer(null);
      setFormData({ customerName: '', cnic: '', phone: '', address: '', city: '' });
      fetchCustomers();
    } catch (err) {
      alert(err.message || 'Failed to save customer');
    }
  };

  const openDetailModal = async (cust) => {
    try {
      const data = await api.getCustomerById(cust.id);
      setCustomerDetails(data);
      setIsDetailModalOpen(true);
    } catch (err) {
      alert(err.message || 'Failed to load customer purchase history');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer record?')) return;
    try {
      await api.deleteCustomer(id);
      fetchCustomers();
    } catch (err) {
      alert(err.message || 'Failed to delete customer');
    }
  };

  const openEditModal = (cust) => {
    setSelectedCustomer(cust);
    setFormData({
      customerName: cust.customerName || '',
      cnic: cust.cnic || '',
      phone: cust.phone || '',
      address: cust.address || '',
      city: cust.city || ''
    });
    setIsAddModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Customer Management & Purchase History
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Directory of buyers, CNIC records, contact details, total purchases, and purchase timeline.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCustomer(null);
            setFormData({ customerName: '', cnic: '', phone: '', address: '', city: '' });
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search customer by name, CNIC, phone, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Customers Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Customer Name & Info</th>
                <th className="py-3.5 px-4">CNIC Number</th>
                <th className="py-3.5 px-4">Contact Details</th>
                <th className="py-3.5 px-4 text-center">Active Installment Plans</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {customers.map((cust) => (
                <tr key={cust.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-extrabold text-white text-sm">{cust.customerName}</p>
                    <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{cust.city || 'N/A'} • {cust.address || 'Address N/A'}</span>
                    </p>
                  </td>

                  <td className="py-4 px-4 font-mono font-bold text-cyan-400">
                    {cust.cnic ? (
                      <span className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30">
                        {cust.cnic}
                      </span>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </td>

                  <td className="py-4 px-4">
                    <p className="font-mono text-white flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>{cust.phone || 'N/A'}</span>
                    </p>
                  </td>

                  <td className="py-4 px-4 text-center font-mono">
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      {cust.installmentPlans?.length || 0} Plan(s)
                    </span>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openDetailModal(cust)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 font-mono text-[11px] flex items-center space-x-1"
                        title="View Full Purchase History"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>

                      <button
                        onClick={() => openEditModal(cust)}
                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
                        title="Edit Customer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteCustomer(cust.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {customers.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No customer records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md border border-cyan-500/30 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              {selectedCustomer ? 'Edit Customer Record' : 'Add New Customer Profile'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-5">
              Enter customer personal credentials, CNIC, and contact details.
            </p>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ali"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">CNIC Number</label>
                <input
                  type="text"
                  placeholder="35501-1234567-1"
                  value={formData.cnic}
                  onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  placeholder="0300-1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  placeholder="e.g. Sahiwal / Lahore"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Full Residential Address</label>
                <textarea
                  rows="2"
                  placeholder="Full street address..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20"
                >
                  Save Customer Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER PURCHASE HISTORY TIMELINE MODAL */}
      {isDetailModalOpen && customerDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{customerDetails.customerName} — Purchase History</h3>
                <p className="text-xs text-slate-400 font-mono">
                  CNIC: {customerDetails.cnic || 'N/A'} • Phone: {customerDetails.phone || 'N/A'} • City: {customerDetails.city || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* Active Installment Plans */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono">
                💳 Installment Plans ({customerDetails.installmentPlans?.length || 0})
              </h4>
              {customerDetails.installmentPlans?.map((plan) => (
                <div key={plan.id} className="p-3 bg-slate-900 border border-purple-500/20 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono">{plan.planNumber} — {plan.vehicleDetails}</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                      {plan.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-300">
                    <div>Total: Rs. {plan.totalAmount?.toLocaleString()}</div>
                    <div>Down: Rs. {plan.downPayment?.toLocaleString()}</div>
                    <div>Progress: {plan.paidInstallments}/{plan.totalInstallments} paid</div>
                  </div>
                </div>
              ))}

              {(!customerDetails.installmentPlans || customerDetails.installmentPlans.length === 0) && (
                <p className="text-xs text-slate-500 font-mono italic">No installment plans registered for this customer.</p>
              )}
            </div>

            {/* Issued Invoices & Receipts */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                📄 Invoices & Receipt Documents ({customerDetails.invoices?.length || 0})
              </h4>
              {customerDetails.invoices?.map((inv) => (
                <div key={inv.id} className="p-3 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white font-mono">{inv.invoiceNumber} ({inv.category})</span>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Date: {new Date(inv.date || inv.createdAt).toLocaleDateString()} • Vehicle: {inv.vehicleMaker} {inv.vehicleModel}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-cyan-400">
                    Rs. {(inv.totalPrice || 0).toLocaleString()}
                  </span>
                </div>
              ))}

              {(!customerDetails.invoices || customerDetails.invoices.length === 0) && (
                <p className="text-xs text-slate-500 font-mono italic">No invoices linked to this customer name/CNIC.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-mono font-bold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
