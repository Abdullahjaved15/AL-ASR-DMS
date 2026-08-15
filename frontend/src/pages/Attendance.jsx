import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  UserCheck, 
  Users, 
  Calendar, 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Printer, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  BarChart2, 
  Building, 
  Briefcase,
  ChevronRight,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AttendancePage() {
  const { user } = useAuth();

  // Primary navigation tabs: 'daily', 'roster', 'history', 'reports'
  const [activeTab, setActiveTab] = useState('daily');

  // Common state
  const [employees, setEmployees] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Daily logger state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyLogsMap, setDailyLogsMap] = useState({}); // { employeeId: { checkIn, checkOut, status, notes, totalHours } }
  const [savingDaily, setSavingDaily] = useState(false);

  // Employee modal state
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    designation: 'Sales Executive',
    department: 'Sales',
    phone: '',
    email: '',
    userId: ''
  });

  // History state
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [historyEndDate, setHistoryEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [historyEmpFilter, setHistoryEmpFilter] = useState('');

  // Reports state
  const [reportType, setReportType] = useState('monthly'); // 'weekly', 'monthly', 'custom'
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportEmpFilter, setReportEmpFilter] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchSystemUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyAttendance();
    } else if (activeTab === 'history') {
      fetchHistoryAttendance();
    } else if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, selectedDate, historyStartDate, historyEndDate, historyEmpFilter, reportType, reportStartDate, reportEndDate, reportEmpFilter]);

  const fetchEmployees = async () => {
    try {
      const data = await api.getEmployees();
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchSystemUsers = async () => {
    try {
      const data = await api.getUsers();
      setSystemUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch system users:', err);
    }
  };

  // Fetch attendance records for selectedDate and populate dailyLogsMap
  const fetchDailyAttendance = async () => {
    setLoading(true);
    try {
      const logs = await api.getAttendance({ date: selectedDate });
      const map = {};
      logs.forEach(l => {
        map[l.employeeId] = {
          id: l.id,
          checkIn: l.checkIn || '09:00 AM',
          checkOut: l.checkOut || '06:00 PM',
          status: l.status || 'PRESENT',
          notes: l.notes || '',
          totalHours: l.totalHours || 0
        };
      });
      setDailyLogsMap(map);
    } catch (err) {
      console.error('Failed to fetch daily attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDailyFieldChange = (empId, field, value) => {
    setDailyLogsMap(prev => {
      const existing = prev[empId] || {
        checkIn: '09:00 AM',
        checkOut: '06:00 PM',
        status: 'PRESENT',
        notes: '',
        totalHours: 9.0
      };
      return {
        ...prev,
        [empId]: {
          ...existing,
          [field]: value
        }
      };
    });
  };

  const handleSaveSingleDaily = async (empId) => {
    const log = dailyLogsMap[empId] || { checkIn: '09:00 AM', checkOut: '06:00 PM', status: 'PRESENT', notes: '' };
    try {
      await api.saveAttendance({
        employeeId: empId,
        date: selectedDate,
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        status: log.status,
        notes: log.notes
      });
      alert('Attendance saved for employee!');
      fetchDailyAttendance();
    } catch (err) {
      alert(err.message || 'Failed to save attendance');
    }
  };

  const handleSaveAllDaily = async () => {
    setSavingDaily(true);
    try {
      const records = employees.map(emp => {
        const log = dailyLogsMap[emp.id] || { checkIn: '09:00 AM', checkOut: '06:00 PM', status: 'PRESENT', notes: '' };
        return {
          employeeId: emp.id,
          checkIn: log.checkIn,
          checkOut: log.checkOut,
          status: log.status,
          notes: log.notes
        };
      });

      await api.saveBulkAttendance({
        date: selectedDate,
        records
      });

      alert(`Attendance saved for all ${records.length} employees!`);
      fetchDailyAttendance();
    } catch (err) {
      alert(err.message || 'Failed to save bulk attendance');
    } finally {
      setSavingDaily(false);
    }
  };

  const handleMarkAllPresent = () => {
    const updated = { ...dailyLogsMap };
    employees.forEach(emp => {
      updated[emp.id] = {
        ...(updated[emp.id] || {}),
        checkIn: '09:00 AM',
        checkOut: '06:00 PM',
        status: 'PRESENT'
      };
    });
    setDailyLogsMap(updated);
  };

  // --- EMPLOYEE ROSTER HANDLERS ---
  const handleOpenEmpModal = (emp = null) => {
    if (emp) {
      setEditingEmp(emp);
      setEmpForm({
        name: emp.name || '',
        designation: emp.designation || 'Sales Executive',
        department: emp.department || 'Sales',
        phone: emp.phone || '',
        email: emp.email || '',
        userId: emp.userId || ''
      });
    } else {
      setEditingEmp(null);
      setEmpForm({
        name: '',
        designation: 'Sales Executive',
        department: 'Sales',
        phone: '',
        email: '',
        userId: ''
      });
    }
    setIsEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      if (editingEmp) {
        await api.updateEmployee(editingEmp.id, empForm);
      } else {
        await api.createEmployee(empForm);
      }
      setIsEmpModalOpen(false);
      fetchEmployees();
    } catch (err) {
      alert(err.message || 'Failed to save employee');
    }
  };

  const handleDeleteEmployee = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete employee "${name}"? All associated attendance history will also be removed.`)) return;
    try {
      await api.deleteEmployee(id);
      fetchEmployees();
    } catch (err) {
      alert(err.message || 'Failed to delete employee');
    }
  };

  // --- HISTORY LOG HANDLERS ---
  const fetchHistoryAttendance = async () => {
    setLoading(true);
    try {
      const logs = await api.getAttendance({
        startDate: historyStartDate,
        endDate: historyEndDate,
        employeeId: historyEmpFilter
      });
      setHistoryLogs(logs || []);
    } catch (err) {
      console.error('Failed to fetch history logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryRecord = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try {
      await api.deleteAttendance(id);
      fetchHistoryAttendance();
    } catch (err) {
      alert(err.message || 'Failed to delete attendance record');
    }
  };

  // --- REPORT HANDLERS ---
  const fetchReports = async () => {
    setLoadingReport(true);
    try {
      const data = await api.getAttendanceReports({
        type: reportType,
        startDate: reportStartDate,
        endDate: reportEndDate,
        employeeId: reportEmpFilter
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportCSV = () => {
    const url = api.getAttendanceExportUrl({
      startDate: reportStartDate,
      endDate: reportEndDate,
      employeeId: reportEmpFilter
    });
    window.open(url, '_blank');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'LATE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'HALF_DAY':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'LEAVE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ABSENT':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Employee Attendance System</h2>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 uppercase">
                  Super Admin Exclusive
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Log daily check-in & check-out times, manage staff roster, and view weekly & monthly reports.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="glass-card rounded-2xl p-1.5 border border-white/10 flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium font-mono transition-all flex items-center space-x-1.5 ${
              activeTab === 'daily'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Daily Logger</span>
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium font-mono transition-all flex items-center space-x-1.5 ${
              activeTab === 'roster'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Roster ({employees.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium font-mono transition-all flex items-center space-x-1.5 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Attendance History</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium font-mono transition-all flex items-center space-x-1.5 ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Weekly & Monthly Reports</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY LOGGER */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-slate-300 font-bold">Select Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>

              <button
                onClick={handleSaveAllDaily}
                disabled={savingDaily}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>{savingDaily ? 'Saving...' : 'Save All Attendance'}</span>
              </button>
            </div>
          </div>

          {/* Daily Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee Name</th>
                    <th className="py-3.5 px-4">Designation / Dept</th>
                    <th className="py-3.5 px-4">Attendance Status</th>
                    <th className="py-3.5 px-4">Check-In Time</th>
                    <th className="py-3.5 px-4">Check-Out Time</th>
                    <th className="py-3.5 px-4">Notes / Remarks</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {employees.map((emp) => {
                    const log = dailyLogsMap[emp.id] || {
                      checkIn: '09:00 AM',
                      checkOut: '06:00 PM',
                      status: 'PRESENT',
                      notes: ''
                    };

                    return (
                      <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{emp.name}</p>
                              <p className="text-[10px] font-mono text-slate-400">{emp.phone || emp.email || 'No contact'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-200">{emp.designation}</p>
                          <p className="text-[10px] font-mono text-cyan-400">{emp.department}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={log.status}
                            onChange={(e) => handleDailyFieldChange(emp.id, 'status', e.target.value)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border bg-slate-950 focus:outline-none ${getStatusBadgeClass(log.status)}`}
                          >
                            <option value="PRESENT">PRESENT</option>
                            <option value="LATE">LATE</option>
                            <option value="HALF_DAY">HALF DAY</option>
                            <option value="LEAVE">LEAVE</option>
                            <option value="ABSENT">ABSENT</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            placeholder="09:00 AM"
                            value={log.checkIn}
                            disabled={log.status === 'ABSENT' || log.status === 'LEAVE'}
                            onChange={(e) => handleDailyFieldChange(emp.id, 'checkIn', e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono w-28 disabled:opacity-40"
                          />
                        </td>

                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            placeholder="06:00 PM"
                            value={log.checkOut}
                            disabled={log.status === 'ABSENT' || log.status === 'LEAVE'}
                            onChange={(e) => handleDailyFieldChange(emp.id, 'checkOut', e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono w-28 disabled:opacity-40"
                          />
                        </td>

                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            placeholder="Optional notes..."
                            value={log.notes}
                            onChange={(e) => handleDailyFieldChange(emp.id, 'notes', e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 w-full min-w-[140px]"
                          />
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleSaveSingleDaily(emp.id)}
                            className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[11px] font-mono font-bold transition-all"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {employees.length === 0 && !loading && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500 font-mono text-xs">
                        No employees registered yet. Go to "Staff Roster" tab to add employees.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STAFF ROSTER */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-white">Employee Roster Directory</h3>
            </div>

            <button
              onClick={() => handleOpenEmpModal()}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(emp => (
              <div key={emp.id} className="glass-card rounded-2xl p-5 border border-white/10 hover:border-cyan-500/40 transition-all space-y-4 relative group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 font-extrabold text-lg flex items-center justify-center border border-cyan-500/30">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base">{emp.name}</h4>
                      <p className="text-xs font-semibold text-cyan-400">{emp.designation}</p>
                      <p className="text-[10px] font-mono text-slate-400">{emp.department} Dept</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    emp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                  }`}>
                    {emp.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-white/5 font-mono">
                  <p><span className="text-slate-500">Phone:</span> {emp.phone || 'N/A'}</p>
                  <p><span className="text-slate-500">Email:</span> {emp.email || 'N/A'}</p>
                  {emp.user && (
                    <p><span className="text-slate-500">Linked User:</span> <span className="text-amber-300 font-bold">{emp.user.name}</span></p>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/5">
                  <button
                    onClick={() => handleOpenEmpModal(emp)}
                    className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors"
                    title="Edit employee"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title="Delete employee"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {employees.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs glass-card rounded-2xl">
                No employees found. Click "Add Employee" to register staff.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ATTENDANCE HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History Filters */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400">From:</span>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400">To:</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400">Employee:</span>
                <select
                  value={historyEmpFilter}
                  onChange={(e) => setHistoryEmpFilter(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">All Employees</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={fetchHistoryAttendance}
              className="px-3.5 py-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all"
            >
              Refresh Logs
            </button>
          </div>

          {/* History Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Employee Name</th>
                    <th className="py-3.5 px-4">Designation</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Check-In</th>
                    <th className="py-3.5 px-4">Check-Out</th>
                    <th className="py-3.5 px-4">Hours Worked</th>
                    <th className="py-3.5 px-4">Notes</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors font-mono">
                      <td className="py-3.5 px-4 text-cyan-300 font-bold">
                        {new Date(log.date).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 font-sans font-bold text-white">
                        {log.employee?.name || 'Unknown'}
                      </td>

                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        {log.employee?.designation || 'N/A'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${getStatusBadgeClass(log.status)}`}>
                          {log.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-200">
                        {log.checkIn || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-200">
                        {log.checkOut || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-amber-300 font-bold">
                        {log.totalHours || 0} hrs
                      </td>

                      <td className="py-3.5 px-4 font-sans text-slate-400">
                        {log.notes || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteHistoryRecord(log.id)}
                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Delete log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {historyLogs.length === 0 && !loading && (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-500 font-mono text-xs">
                        No attendance history records found for the selected filter range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WEEKLY & MONTHLY REPORTS */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Filters */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400">Timeframe:</span>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="weekly">Weekly Report (Last 7 Days)</option>
                  <option value="monthly">Monthly Report (This Month)</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {reportType === 'custom' && (
                <>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-xs font-mono text-slate-400">to</span>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </>
              )}

              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400">Employee:</span>
                <select
                  value={reportEmpFilter}
                  onChange={(e) => setReportEmpFilter(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">All Employees</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV Report</span>
            </button>
          </div>

          {/* Report Breakdown */}
          {reportData && (
            <div className="space-y-6">
              {/* Summary KPIs aggregate */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card rounded-2xl p-4 border border-white/10">
                  <p className="text-xs font-mono text-slate-400 uppercase">Total Present Days</p>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                    {reportData.reports.reduce((sum, r) => sum + r.summary.presentDays, 0)}
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-4 border border-white/10">
                  <p className="text-xs font-mono text-slate-400 uppercase">Total Late / Half Days</p>
                  <p className="text-2xl font-extrabold text-amber-400 mt-1">
                    {reportData.reports.reduce((sum, r) => sum + r.summary.lateDays + r.summary.halfDays, 0)}
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-4 border border-white/10">
                  <p className="text-xs font-mono text-slate-400 uppercase">Total Absent Days</p>
                  <p className="text-2xl font-extrabold text-rose-400 mt-1">
                    {reportData.reports.reduce((sum, r) => sum + r.summary.absentDays, 0)}
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-4 border border-white/10">
                  <p className="text-xs font-mono text-slate-400 uppercase">Total Hours Worked</p>
                  <p className="text-2xl font-extrabold text-cyan-400 mt-1">
                    {reportData.reports.reduce((sum, r) => sum + r.summary.totalHours, 0).toFixed(1)} hrs
                  </p>
                </div>
              </div>

              {/* Per-Employee Summary Table */}
              <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">Employee Attendance Summary & Performance</h4>
                  <span className="text-xs font-mono text-slate-400">
                    Period: {new Date(reportData.startDate).toLocaleDateString()} – {new Date(reportData.endDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                        <th className="py-3.5 px-4">Employee</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4 text-center">Present</th>
                        <th className="py-3.5 px-4 text-center">Late</th>
                        <th className="py-3.5 px-4 text-center">Half Day</th>
                        <th className="py-3.5 px-4 text-center">Leave</th>
                        <th className="py-3.5 px-4 text-center">Absent</th>
                        <th className="py-3.5 px-4 text-right">Total Hours</th>
                        <th className="py-3.5 px-4 text-right">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {reportData.reports.map((rep) => (
                        <tr key={rep.employee.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-white text-sm">{rep.employee.name}</p>
                            <p className="text-[10px] font-mono text-cyan-400">{rep.employee.designation}</p>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {rep.employee.department}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                            {rep.summary.presentDays}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">
                            {rep.summary.lateDays}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-bold text-cyan-400">
                            {rep.summary.halfDays}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono text-blue-400">
                            {rep.summary.leaveDays}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-400">
                            {rep.summary.absentDays}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                            {rep.summary.totalHours} hrs
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full"
                                  style={{ width: `${rep.summary.attendanceRate}%` }}
                                ></div>
                              </div>
                              <span className="font-mono font-bold text-cyan-400 text-xs w-9 text-right">
                                {rep.summary.attendanceRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {reportData.reports.length === 0 && (
                        <tr>
                          <td colSpan="9" className="py-12 text-center text-slate-500 font-mono text-xs">
                            No employee report data available for this timeframe.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT EMPLOYEE MODAL */}
      {/* ========================================================================= */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-lg border border-white/10 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-white">
                  {editingEmp ? `Edit Employee (${editingEmp.name})` : 'Add New Employee'}
                </h3>
              </div>
              <button
                onClick={() => setIsEmpModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Employee Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ali Raza"
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Sales Manager"
                    value={empForm.designation}
                    onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Department</label>
                  <select
                    value={empForm.department}
                    onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Management">Management</option>
                    <option value="Operations">Operations</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +92 300 1234567"
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. ali@alasrmotors.com"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Link to System User (Optional)</label>
                <select
                  value={empForm.userId}
                  onChange={(e) => setEmpForm({ ...empForm, userId: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">None (Standalone Employee Entry)</option>
                  {systemUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email}) - {u.role}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{editingEmp ? 'Update Employee' : 'Create Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
