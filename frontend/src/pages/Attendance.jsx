import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clock, 
  UserCheck, 
  Users, 
  Calendar, 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  BarChart2, 
  Building, 
  Briefcase,
  ChevronRight,
  ChevronDown,
  Filter,
  LogIn,
  LogOut,
  RotateCcw,
  Sparkles,
  Check,
  Timer
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_CHECK_IN = '09:00 AM';
const DEFAULT_CHECK_OUT = '09:00 PM'; // 09:00 AM – 09:00 PM (12 hrs shift)

export default function AttendancePage() {
  const { user } = useAuth();

  // Navigation tabs: 'daily', 'roster', 'reports'
  const [activeTab, setActiveTab] = useState('daily');

  // Common state
  const [employees, setEmployees] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Live ticking clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Daily logger state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyLogsMap, setDailyLogsMap] = useState({}); // { employeeId: { id, checkIn, checkOut, status, notes, totalHours } }
  const [savingDaily, setSavingDaily] = useState(false);
  const [rowSaveStatus, setRowSaveStatus] = useState({}); // { [employeeId]: 'saving' | 'saved' | 'error' | null }
  const [dailySearch, setDailySearch] = useState('');
  const [dailyDeptFilter, setDailyDeptFilter] = useState('ALL');

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

  // Reports state (Daily, Weekly, Monthly, Custom)
  const [reportType, setReportType] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'custom'
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportEmpFilter, setReportEmpFilter] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);

  // Debounce timers ref for auto-saving manual text edits
  const debounceTimers = useRef({});

  // Clock interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchSystemUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyAttendance();
    } else if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, selectedDate, reportType, reportStartDate, reportEndDate, reportEmpFilter]);

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

  // Helper to format a time object or current date to standard AM/PM (e.g., "09:00 PM")
  const formatTime12h = (dateObj = new Date()) => {
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper to parse time string to minutes from midnight for comparisons
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const clean = timeStr.trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3] ? match[3].toUpperCase() : null;
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Helper to calculate total hours between two time strings
  const calculateDurationHours = (checkIn, checkOut) => {
    const inMins = parseTimeToMinutes(checkIn);
    const outMins = parseTimeToMinutes(checkOut);
    if (inMins === null || outMins === null || outMins < inMins) return 0;
    return parseFloat(((outMins - inMins) / 60).toFixed(2));
  };

  // Classify checkout timing: Early Departure (< 08:45 PM), Overtime (> 09:15 PM), Standard (null)
  const getCheckoutTag = (checkOut) => {
    const mins = parseTimeToMinutes(checkOut);
    if (mins === null) return null;
    const standardCheckoutMins = 21 * 60; // 09:00 PM = 1260 mins

    if (mins < standardCheckoutMins - 15) {
      return { type: 'EARLY', label: 'Early Departure', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    if (mins > standardCheckoutMins + 15) {
      return { type: 'OVERTIME', label: 'Overtime / Late Exit', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    }
    return null;
  };

  // Fetch attendance records for selectedDate and populate dailyLogsMap
  const fetchDailyAttendance = async () => {
    setLoading(true);
    try {
      const logs = await api.getAttendance({ date: selectedDate });
      const map = {};
      logs.forEach(l => {
        const checkIn = l.checkIn !== null && l.checkIn !== undefined && l.checkIn !== '' ? l.checkIn : DEFAULT_CHECK_IN;
        const checkOut = l.checkOut !== null && l.checkOut !== undefined && l.checkOut !== '' ? l.checkOut : DEFAULT_CHECK_OUT;
        map[l.employeeId] = {
          id: l.id,
          checkIn: l.checkIn !== null && l.checkIn !== undefined ? l.checkIn : DEFAULT_CHECK_IN,
          checkOut: l.checkOut !== null && l.checkOut !== undefined ? l.checkOut : DEFAULT_CHECK_OUT,
          status: l.status || 'PRESENT',
          notes: l.notes || '',
          totalHours: l.totalHours || calculateDurationHours(checkIn, checkOut)
        };
      });
      setDailyLogsMap(map);
    } catch (err) {
      console.error('Failed to fetch daily attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Execute immediate backend save for a single employee record
  const saveEmployeeAttendanceAsync = async (empId, currentData) => {
    setRowSaveStatus(prev => ({ ...prev, [empId]: 'saving' }));
    try {
      const payload = {
        employeeId: empId,
        date: selectedDate,
        checkIn: currentData.checkIn || null,
        checkOut: currentData.checkOut || null,
        status: currentData.status || 'PRESENT',
        notes: currentData.notes || null
      };
      const res = await api.saveAttendance(payload);
      
      setDailyLogsMap(prev => ({
        ...prev,
        [empId]: {
          ...(prev[empId] || {}),
          id: res.id,
          checkIn: res.checkIn || payload.checkIn,
          checkOut: res.checkOut || payload.checkOut,
          status: res.status,
          totalHours: res.totalHours,
          notes: res.notes || ''
        }
      }));

      setRowSaveStatus(prev => ({ ...prev, [empId]: 'saved' }));
      setTimeout(() => {
        setRowSaveStatus(prev => {
          if (prev[empId] === 'saved') {
            const next = { ...prev };
            delete next[empId];
            return next;
          }
          return prev;
        });
      }, 3000);
    } catch (err) {
      console.error(`Failed to auto-save attendance for emp ${empId}:`, err);
      setRowSaveStatus(prev => ({ ...prev, [empId]: 'error' }));
    }
  };

  // Handle live field change with debounced auto-save
  const handleDailyFieldChange = (empId, field, value) => {
    const existing = dailyLogsMap[empId] || {
      checkIn: DEFAULT_CHECK_IN,
      checkOut: DEFAULT_CHECK_OUT,
      status: 'PRESENT',
      notes: '',
      totalHours: 12.0
    };

    const updatedLog = {
      ...existing,
      [field]: value
    };

    if (field === 'checkIn' || field === 'checkOut') {
      updatedLog.totalHours = calculateDurationHours(
        field === 'checkIn' ? value : updatedLog.checkIn,
        field === 'checkOut' ? value : updatedLog.checkOut
      );
    }

    setDailyLogsMap(prev => ({
      ...prev,
      [empId]: updatedLog
    }));

    if (debounceTimers.current[empId]) {
      clearTimeout(debounceTimers.current[empId]);
    }
    debounceTimers.current[empId] = setTimeout(() => {
      saveEmployeeAttendanceAsync(empId, updatedLog);
    }, 700);
  };

  // Immediate Check-In Time Stamp & Auto-Save
  const handleStampCheckInNow = (empId) => {
    const timeNow = formatTime12h(new Date());
    const current = dailyLogsMap[empId] || {
      checkIn: DEFAULT_CHECK_IN,
      checkOut: DEFAULT_CHECK_OUT,
      status: 'PRESENT',
      notes: ''
    };

    const updated = {
      ...current,
      checkIn: timeNow,
      status: current.status === 'ABSENT' ? 'PRESENT' : current.status,
      totalHours: calculateDurationHours(timeNow, current.checkOut || DEFAULT_CHECK_OUT)
    };

    setDailyLogsMap(prev => ({ ...prev, [empId]: updated }));
    saveEmployeeAttendanceAsync(empId, updated);
  };

  // Immediate Check-Out Time Stamp & Auto-Save
  const handleStampCheckOutNow = (empId) => {
    const timeNow = formatTime12h(new Date());
    const current = dailyLogsMap[empId] || {
      checkIn: DEFAULT_CHECK_IN,
      checkOut: DEFAULT_CHECK_OUT,
      status: 'PRESENT',
      notes: ''
    };

    const checkInTime = current.checkIn && current.checkIn.trim() !== '' ? current.checkIn : DEFAULT_CHECK_IN;

    const updated = {
      ...current,
      checkIn: checkInTime,
      checkOut: timeNow,
      status: current.status === 'ABSENT' ? 'PRESENT' : current.status,
      totalHours: calculateDurationHours(checkInTime, timeNow)
    };

    setDailyLogsMap(prev => ({ ...prev, [empId]: updated }));
    saveEmployeeAttendanceAsync(empId, updated);
  };

  // Reset standard timings to 9:00 AM - 9:00 PM & Auto-Save
  const handleResetToStandardShift = (empId) => {
    const current = dailyLogsMap[empId] || { status: 'PRESENT', notes: '' };
    const updated = {
      ...current,
      checkIn: DEFAULT_CHECK_IN,
      checkOut: DEFAULT_CHECK_OUT,
      status: 'PRESENT',
      totalHours: 12.0
    };
    setDailyLogsMap(prev => ({ ...prev, [empId]: updated }));
    saveEmployeeAttendanceAsync(empId, updated);
  };

  // Bulk Save all employees
  const handleSaveAllDaily = async () => {
    setSavingDaily(true);
    try {
      const records = employees.map(emp => {
        const log = dailyLogsMap[emp.id] || { 
          checkIn: DEFAULT_CHECK_IN, 
          checkOut: DEFAULT_CHECK_OUT, 
          status: 'PRESENT', 
          notes: '' 
        };
        return {
          employeeId: emp.id,
          checkIn: log.checkIn || null,
          checkOut: log.checkOut || null,
          status: log.status || 'PRESENT',
          notes: log.notes || null
        };
      });

      await api.saveBulkAttendance({
        date: selectedDate,
        records
      });

      const newStatus = {};
      employees.forEach(e => { newStatus[e.id] = 'saved'; });
      setRowSaveStatus(newStatus);
      setTimeout(() => setRowSaveStatus({}), 3000);

      fetchDailyAttendance();
    } catch (err) {
      alert(err.message || 'Failed to save bulk attendance');
    } finally {
      setSavingDaily(false);
    }
  };

  // Mark all present with standard 09:00 AM - 09:00 PM shift & auto-save bulk
  const handleMarkAllPresentStandard = async () => {
    const updated = { ...dailyLogsMap };
    const records = employees.map(emp => {
      updated[emp.id] = {
        ...(updated[emp.id] || {}),
        checkIn: DEFAULT_CHECK_IN,
        checkOut: DEFAULT_CHECK_OUT,
        status: 'PRESENT',
        totalHours: 12.0
      };
      return {
        employeeId: emp.id,
        checkIn: DEFAULT_CHECK_IN,
        checkOut: DEFAULT_CHECK_OUT,
        status: 'PRESENT',
        notes: updated[emp.id]?.notes || null
      };
    });

    setDailyLogsMap(updated);

    try {
      setSavingDaily(true);
      await api.saveBulkAttendance({
        date: selectedDate,
        records
      });
      fetchDailyAttendance();
    } catch (err) {
      console.error('Failed to mark all present:', err);
    } finally {
      setSavingDaily(false);
    }
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

  // --- REPORT HANDLERS ---
  const fetchReports = async () => {
    setLoadingReport(true);
    try {
      const data = await api.getAttendanceReports({
        type: reportType,
        startDate: reportType === 'custom' ? reportStartDate : undefined,
        endDate: reportType === 'custom' ? reportEndDate : undefined,
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
      startDate: reportData?.startDate ? new Date(reportData.startDate).toISOString().slice(0, 10) : reportStartDate,
      endDate: reportData?.endDate ? new Date(reportData.endDate).toISOString().slice(0, 10) : reportEndDate,
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

  // Filtered employees for Daily tab
  const filteredDailyEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = !dailySearch || 
        emp.name.toLowerCase().includes(dailySearch.toLowerCase()) ||
        (emp.phone && emp.phone.includes(dailySearch)) ||
        (emp.designation && emp.designation.toLowerCase().includes(dailySearch.toLowerCase()));
      
      const matchesDept = dailyDeptFilter === 'ALL' || emp.department === dailyDeptFilter;
      return matchesSearch && matchesDept;
    });
  }, [employees, dailySearch, dailyDeptFilter]);

  // Daily KPI summary calculations
  const dailyStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let halfDay = 0;
    let leave = 0;
    let absent = 0;
    let checkedOutCount = 0;
    let onDutyCount = 0;

    employees.forEach(emp => {
      const log = dailyLogsMap[emp.id];
      if (!log) {
        absent++;
        return;
      }
      if (log.status === 'PRESENT') present++;
      else if (log.status === 'LATE') late++;
      else if (log.status === 'HALF_DAY') halfDay++;
      else if (log.status === 'LEAVE') leave++;
      else if (log.status === 'ABSENT') absent++;

      if (log.checkOut && log.checkOut.trim() !== '') {
        checkedOutCount++;
      } else if (log.checkIn && log.checkIn.trim() !== '') {
        onDutyCount++;
      }
    });

    return {
      total: employees.length,
      presentTotal: present + late + halfDay,
      present,
      late,
      halfDay,
      leave,
      absent,
      checkedOutCount,
      onDutyCount
    };
  }, [employees, dailyLogsMap]);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Live Digital Clock */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Employee Attendance System</h2>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wider">
                  Admin Exclusive
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Standard Shift: <span className="text-cyan-400 font-bold">09:00 AM – 09:00 PM</span> (12h) • Daily, Weekly & Monthly Hours Reports
              </p>
            </div>
          </div>
        </div>

        {/* Live Digital Clock Widget */}
        <div className="glass-card px-4 py-2 rounded-2xl border border-white/10 flex items-center space-x-3 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">Local Live Time</p>
            <p className="text-base font-mono font-extrabold text-emerald-400 tracking-wider">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Switcher Pills */}
      <div className="glass-card rounded-2xl p-1.5 border border-white/10 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-xl text-xs font-medium font-mono transition-all flex items-center space-x-2 ${
            activeTab === 'daily'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Daily Attendance Logger</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-medium font-mono transition-all flex items-center space-x-2 ${
            activeTab === 'roster'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Roster ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-medium font-mono transition-all flex items-center space-x-2 ${
            activeTab === 'reports'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Attendance Reports (Day, Week, Month)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY LOGGER & INTERACTIVE CHECKOUT */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Daily Quick Stats KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="glass-card rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Staff</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <p className="text-2xl font-extrabold text-white">{dailyStats.total}</p>
                <span className="text-[10px] font-mono text-slate-400">employees</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
              <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Present Today</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <p className="text-2xl font-extrabold text-emerald-400">{dailyStats.presentTotal}</p>
                <span className="text-[10px] font-mono text-emerald-400/70">
                  ({dailyStats.total > 0 ? Math.round((dailyStats.presentTotal / dailyStats.total) * 100) : 0}%)
                </span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-cyan-500/20 bg-cyan-500/5">
              <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Currently On Duty</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <p className="text-2xl font-extrabold text-cyan-400">{dailyStats.onDutyCount}</p>
                <span className="text-[10px] font-mono text-cyan-400/70">checked in</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-purple-500/20 bg-purple-500/5">
              <p className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Checked Out</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <p className="text-2xl font-extrabold text-purple-400">{dailyStats.checkedOutCount}</p>
                <span className="text-[10px] font-mono text-purple-400/70">done for day</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5">
              <p className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">Absent / Leave</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <p className="text-2xl font-extrabold text-rose-400">{dailyStats.absent + dailyStats.leave}</p>
                <span className="text-[10px] font-mono text-rose-400/70">off duty</span>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono text-slate-300 font-bold">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Search Employee */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter staff by name..."
                  value={dailySearch}
                  onChange={(e) => setDailySearch(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-48"
                />
              </div>

              {/* Department Filter */}
              <div className="flex items-center space-x-1">
                <select
                  value={dailyDeptFilter}
                  onChange={(e) => setDailyDeptFilter(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="ALL">All Departments</option>
                  <option value="Sales">Sales</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Management">Management</option>
                  <option value="Operations">Operations</option>
                  <option value="Support">Support</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleMarkAllPresentStandard}
                disabled={savingDaily}
                className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5"
                title="Mark all staff present with standard 09:00 AM to 09:00 PM shift"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark All Present (9 AM – 9 PM)</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllDaily}
                disabled={savingDaily}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>{savingDaily ? 'Saving Changes...' : 'Save All Attendance'}</span>
              </button>
            </div>
          </div>

          {/* Daily Interactive Attendance Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee Details</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Check-In Time</th>
                    <th className="py-3.5 px-4">Check-Out Action & Time</th>
                    <th className="py-3.5 px-4 text-center">Hours Worked</th>
                    <th className="py-3.5 px-4">Notes / Remarks</th>
                    <th className="py-3.5 px-4 text-right">Auto-Save Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredDailyEmployees.map((emp) => {
                    const log = dailyLogsMap[emp.id] || {
                      checkIn: DEFAULT_CHECK_IN,
                      checkOut: DEFAULT_CHECK_OUT,
                      status: 'PRESENT',
                      notes: '',
                      totalHours: 12.0
                    };

                    const hours = calculateDurationHours(log.checkIn, log.checkOut);
                    const checkoutTag = getCheckoutTag(log.checkOut);
                    const saveStatus = rowSaveStatus[emp.id];
                    const isAbsentOrLeave = log.status === 'ABSENT' || log.status === 'LEAVE';

                    return (
                      <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                        {/* Employee Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold flex items-center justify-center text-sm shadow-sm">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{emp.name}</p>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="text-[10px] font-mono text-cyan-400">{emp.designation}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-[10px] font-mono text-slate-400">{emp.department}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Selector */}
                        <td className="py-3.5 px-4">
                          <select
                            value={log.status}
                            onChange={(e) => handleDailyFieldChange(emp.id, 'status', e.target.value)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border bg-slate-950 focus:outline-none cursor-pointer transition-all ${getStatusBadgeClass(log.status)}`}
                          >
                            <option value="PRESENT">PRESENT</option>
                            <option value="LATE">LATE</option>
                            <option value="HALF_DAY">HALF DAY</option>
                            <option value="LEAVE">LEAVE</option>
                            <option value="ABSENT">ABSENT</option>
                          </select>
                        </td>

                        {/* Check-In Column */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                placeholder="09:00 AM"
                                value={log.checkIn || ''}
                                disabled={isAbsentOrLeave}
                                onChange={(e) => handleDailyFieldChange(emp.id, 'checkIn', e.target.value)}
                                className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono w-28 disabled:opacity-40"
                              />

                              <button
                                type="button"
                                onClick={() => handleStampCheckInNow(emp.id)}
                                disabled={isAbsentOrLeave}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-mono font-bold transition-all flex items-center space-x-1 disabled:opacity-30"
                                title="Stamp current time as Check-In and auto-save"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>Check In Now</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Check-Out Column: Early/Late stamping with immediate auto-save */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                placeholder="09:00 PM"
                                value={log.checkOut || ''}
                                disabled={isAbsentOrLeave}
                                onChange={(e) => handleDailyFieldChange(emp.id, 'checkOut', e.target.value)}
                                className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono w-28 disabled:opacity-40"
                              />

                              {/* Primary Check-Out Button */}
                              <button
                                type="button"
                                onClick={() => handleStampCheckOutNow(emp.id)}
                                disabled={isAbsentOrLeave}
                                className="px-2.5 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-[11px] font-mono font-bold transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-30"
                                title="Click to stamp employee's actual exit time (early or late) and auto-save immediately"
                              >
                                <LogOut className="w-3 h-3 text-purple-400" />
                                <span>Check Out Now</span>
                              </button>

                              {/* Reset to Standard 9:00 PM option */}
                              <button
                                type="button"
                                onClick={() => handleResetToStandardShift(emp.id)}
                                disabled={isAbsentOrLeave}
                                className="p-1 text-slate-400 hover:text-cyan-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-[10px]"
                                title="Reset to standard 09:00 AM – 09:00 PM shift"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Departure Tag / Badge (Only for Early or Overtime) */}
                            {!isAbsentOrLeave && log.checkOut && checkoutTag && (
                              <div className="flex items-center space-x-2">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${checkoutTag.color}`}>
                                  {checkoutTag.label} ({log.checkOut})
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Total Hours Worked */}
                        <td className="py-3.5 px-4 text-center">
                          {!isAbsentOrLeave ? (
                            <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 text-xs">
                              {hours.toFixed(1)} hrs
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono text-xs">0 hrs</span>
                          )}
                        </td>

                        {/* Notes Input */}
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            placeholder="Optional notes..."
                            value={log.notes || ''}
                            onChange={(e) => handleDailyFieldChange(emp.id, 'notes', e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 w-full min-w-[130px]"
                          />
                        </td>

                        {/* Row Level Auto-Save Status */}
                        <td className="py-3.5 px-4 text-right">
                          {saveStatus === 'saving' && (
                            <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-cyan-400 animate-pulse">
                              <Clock className="w-3 h-3 animate-spin" />
                              <span>Saving...</span>
                            </span>
                          )}
                          {saveStatus === 'saved' && (
                            <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              <span>Auto-Saved</span>
                            </span>
                          )}
                          {saveStatus === 'error' && (
                            <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/30">
                              <AlertCircle className="w-3 h-3" />
                              <span>Save Error</span>
                            </span>
                          )}
                          {!saveStatus && (
                            <button
                              type="button"
                              onClick={() => saveEmployeeAttendanceAsync(emp.id, log)}
                              className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-mono font-bold transition-all"
                            >
                              Save
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredDailyEmployees.length === 0 && !loading && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500 font-mono text-xs">
                        {employees.length === 0 
                          ? 'No employees registered yet. Go to "Staff Roster" tab to add employees.'
                          : 'No employees matching search filter.'}
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
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 font-extrabold text-lg flex items-center justify-center border border-cyan-500/30 shadow-md">
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
      {/* TAB 3: ATTENDANCE REPORTS (DAY, WEEK, MONTH) */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Filters */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400">Report Timeframe:</span>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
                >
                  <option value="daily">Daily Report (Today)</option>
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
                <span className="text-xs font-mono text-slate-400">Filter Staff:</span>
                <select
                  value={reportEmpFilter}
                  onChange={(e) => setReportEmpFilter(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">All Employees</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.department})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={fetchReports}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono font-bold transition-all"
              >
                Refresh Report
              </button>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV Hours Log</span>
              </button>
            </div>
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

                <div className="glass-card rounded-2xl p-4 border border-cyan-500/30 bg-cyan-500/5 shadow-lg shadow-cyan-500/10">
                  <p className="text-xs font-mono text-cyan-400 uppercase font-bold">Total Hours Worked</p>
                  <p className="text-2xl font-extrabold text-cyan-300 mt-1">
                    {reportData.reports.reduce((sum, r) => sum + r.summary.totalHours, 0).toFixed(1)} hrs
                  </p>
                </div>
              </div>

              {/* Per-Employee Summary & Check-In / Check-Out Hours Table */}
              <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
                <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      Employee Working Hours Summary & Attendance Log
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Period: <span className="text-cyan-400 font-bold">{new Date(reportData.startDate).toLocaleDateString()}</span> – <span className="text-cyan-400 font-bold">{new Date(reportData.endDate).toLocaleDateString()}</span> ({reportData.type.toUpperCase()})
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-xl border border-white/5">
                    Click any row to view day-by-day check-in & check-out logs
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                        <th className="py-3.5 px-4">Employee</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4 text-center">Present Days</th>
                        <th className="py-3.5 px-4 text-center">Late / Half Day</th>
                        <th className="py-3.5 px-4 text-center">Absent / Leave</th>
                        <th className="py-3.5 px-4 text-right font-bold text-amber-300">Total Hours Worked</th>
                        <th className="py-3.5 px-4 text-right">Avg Hrs/Day</th>
                        <th className="py-3.5 px-4 text-right">Attendance %</th>
                        <th className="py-3.5 px-4 text-center">Daily Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {reportData.reports.map((rep) => {
                        const isExpanded = expandedEmployeeId === rep.employee.id;

                        return (
                          <React.Fragment key={rep.employee.id}>
                            <tr 
                              onClick={() => setExpandedEmployeeId(isExpanded ? null : rep.employee.id)}
                              className="hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold flex items-center justify-center text-xs">
                                    {rep.employee.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white text-sm">{rep.employee.name}</p>
                                    <p className="text-[10px] font-mono text-cyan-400">{rep.employee.designation}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 font-mono text-slate-300">
                                {rep.employee.department}
                              </td>

                              <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                                {rep.summary.presentDays}
                              </td>

                              <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">
                                {rep.summary.lateDays + rep.summary.halfDays}
                              </td>

                              <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-400">
                                {rep.summary.absentDays + rep.summary.leaveDays}
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono font-extrabold text-amber-300 text-sm">
                                {rep.summary.totalHours.toFixed(1)} hrs
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                                {rep.summary.avgHoursPerDay ? `${rep.summary.avgHoursPerDay.toFixed(1)} hrs` : '0.0 hrs'}
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

                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                                >
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>

                            {/* Detailed Check-In / Check-Out Log Breakdown per day for this employee */}
                            {isExpanded && (
                              <tr className="bg-slate-950/70">
                                <td colSpan="9" className="p-4 pl-12">
                                  <div className="border border-white/10 rounded-2xl p-4 bg-slate-900/60 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h5 className="font-bold text-xs font-mono text-cyan-300 flex items-center space-x-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Daily Check-In & Check-Out Working Hours: {rep.employee.name}</span>
                                      </h5>
                                      <span className="text-[10px] font-mono text-slate-400">
                                        Total Shift Hours in Period: <strong className="text-amber-300">{rep.summary.totalHours.toFixed(1)} hrs</strong>
                                      </span>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left font-mono text-xs">
                                        <thead>
                                          <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase">
                                            <th className="py-2">Date</th>
                                            <th className="py-2">Check-In</th>
                                            <th className="py-2">Check-Out</th>
                                            <th className="py-2">Hours Worked</th>
                                            <th className="py-2">Status</th>
                                            <th className="py-2">Notes</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-slate-300">
                                          {rep.logs.map(log => {
                                            const tag = getCheckoutTag(log.checkOut);
                                            return (
                                              <tr key={log.id} className="hover:bg-white/5">
                                                <td className="py-2 text-cyan-300 font-bold">
                                                  {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="py-2 text-slate-200">
                                                  {log.checkIn || '-'}
                                                </td>
                                                <td className="py-2 text-slate-200">
                                                  <div className="flex items-center space-x-1.5">
                                                    <span>{log.checkOut || '-'}</span>
                                                    {log.checkOut && tag && (
                                                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${tag.color}`}>
                                                        {tag.label}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="py-2 font-bold text-amber-300">
                                                  {log.totalHours ? `${log.totalHours.toFixed(1)} hrs` : '0.0 hrs'}
                                                </td>
                                                <td className="py-2">
                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(log.status)}`}>
                                                    {log.status}
                                                  </span>
                                                </td>
                                                <td className="py-2 text-slate-400 font-sans">
                                                  {log.notes || '-'}
                                                </td>
                                              </tr>
                                            );
                                          })}

                                          {rep.logs.length === 0 && (
                                            <tr>
                                              <td colSpan="6" className="py-4 text-center text-slate-500 text-[11px]">
                                                No attendance logs recorded for this period.
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

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
