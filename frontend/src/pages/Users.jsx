import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Shield, CheckCircle, XCircle, Trash2, Mail, Phone, Clock, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form for creating salesman
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'SALESMAN'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId, newStatus, newRole) => {
    try {
      await api.updateUserStatus(userId, newStatus, newRole);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user account?')) return;
    try {
      await api.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleCreateSalesman = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(formData);
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'SALESMAN' });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to create user');
    }
  };

  const pendingUsers = users.filter(u => u.status === 'PENDING');

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Pending Approvals Notice Banner */}
      {pendingUsers.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-amber-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
            <div>
              <p className="text-xs font-mono font-bold">
                {pendingUsers.length} Salesman Registration Request(s) Pending Approval!
              </p>
              <p className="text-[11px] text-amber-300/80">Review and approve accounts below to grant access to DMS leads.</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Salesmen & Staff Account Management</h3>
          <p className="text-xs font-mono text-slate-400">Approve pending registrations, manage permissions, and assign roles.</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create Salesman Account</span>
        </button>
      </div>

      {/* Users Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">User Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">System Role</th>
                <th className="py-3.5 px-4">Assigned Leads</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <span>{u.name}</span>
                        {isSelf && (
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded text-[10px] font-mono">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <p className="text-slate-300">{u.email}</p>
                      <p className="text-[11px] text-slate-500">{u.phone || 'No phone'}</p>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      {u.role === 'SUPER_ADMIN' ? (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-xs font-bold">
                          SUPER ADMIN
                        </span>
                      ) : u.role === 'ADMIN' ? (
                        <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-xs">
                          ADMIN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-xs">
                          SALESMAN
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-400">
                      {u._count?.assignedSellers || 0} seller(s) • {u._count?.assignedBuyers || 0} buyer(s) • {u._count?.deals || 0} deal(s)
                    </td>

                    <td className="py-4 px-4">
                      {u.status === 'ACTIVE' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                          ACTIVE
                        </span>
                      )}
                      {u.status === 'PENDING' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-flex items-center animate-pulse">
                          <Clock className="w-3 h-3 mr-1" />
                          PENDING APPROVAL
                        </span>
                      )}
                      {u.status === 'SUSPENDED' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-flex items-center">
                          <XCircle className="w-3 h-3 mr-1" />
                          SUSPENDED
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      {!isSelf && (
                        <div className="flex items-center justify-end space-x-2 font-mono text-xs">
                          {u.status === 'PENDING' && (
                            <button
                              onClick={() => handleUpdateStatus(u.id, 'ACTIVE')}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition-colors flex items-center space-x-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {u.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleUpdateStatus(u.id, 'SUSPENDED')}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors"
                            >
                              Suspend
                            </button>
                          )}

                          {u.status === 'SUSPENDED' && (
                            <button
                              onClick={() => handleUpdateStatus(u.id, 'ACTIVE')}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors"
                            >
                              Reactivate
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SALESMAN MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-1">Create Salesman Account</h3>
            <p className="text-xs text-slate-400 font-mono mb-6">
              Create an active salesman account. Credentials can be provided to the sales agent.
            </p>

            <form onSubmit={handleCreateSalesman} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Miller"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="john@dealership.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Sales123!"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">System Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="SALESMAN">Salesman</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Create & Activate Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
