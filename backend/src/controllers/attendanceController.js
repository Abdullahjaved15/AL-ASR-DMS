const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to normalize date to YYYY-MM-DD 00:00:00 UTC
const normalizeDate = (dateStr) => {
  if (!dateStr) {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
  }
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// Calculate total hours between checkIn and checkOut strings (e.g., "09:00 AM" or "09:00" and "09:00 PM" or "21:00")
const calculateHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  try {
    const parseTime = (str) => {
      if (!str || typeof str !== 'string') return null;
      const clean = str.trim();
      const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const modifier = match[3] ? match[3].toUpperCase() : null;
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      
      // Fallback for space separated or other standard splits
      const parts = clean.split(/[\s:]+/);
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        let minutes = parseInt(parts[1], 10) || 0;
        const modifier = parts[2] ? parts[2].toUpperCase() : null;
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      return null;
    };

    const inMins = parseTime(checkIn);
    const outMins = parseTime(checkOut);
    if (inMins === null || outMins === null) return 0;
    if (outMins < inMins) return 0;
    const diff = (outMins - inMins) / 60;
    return parseFloat(diff.toFixed(2));
  } catch (e) {
    return 0;
  }
};

// Helper to perform safe upsert for attendance record avoiding P2002 unique constraint errors
const upsertAttendanceRecord = async (employeeId, date, data) => {
  const normDate = normalizeDate(date);
  const startOfDay = new Date(normDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(normDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const existing = await prisma.attendance.findFirst({
    where: {
      employeeId,
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });

  const calculatedHours = calculateHours(data.checkIn, data.checkOut);

  if (existing) {
    return await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkIn: data.checkIn || null,
        checkOut: data.checkOut || null,
        status: data.status || 'PRESENT',
        totalHours: calculatedHours,
        notes: data.notes || null
      },
      include: { employee: true }
    });
  } else {
    return await prisma.attendance.create({
      data: {
        employeeId,
        date: normDate,
        checkIn: data.checkIn || null,
        checkOut: data.checkOut || null,
        status: data.status || 'PRESENT',
        totalHours: calculatedHours,
        notes: data.notes || null
      },
      include: { employee: true }
    });
  }
};

// --- EMPLOYEE MANAGEMENT ---

// Get all employees
const getEmployees = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// Create new employee
const createEmployee = async (req, res) => {
  try {
    const { name, designation, phone, email, department, userId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Employee name is required' });
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        designation: designation || 'Sales Executive',
        phone: phone || null,
        email: email || null,
        department: department || 'Sales',
        userId: userId || null
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee', details: error.message });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, designation, phone, email, department, status, userId } = req.body;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        designation,
        phone: phone || null,
        email: email || null,
        department,
        status,
        userId: userId || null
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

// Delete employee
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.employee.delete({ where: { id } });
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

// --- ATTENDANCE LOGGING ---

// Get attendance logs (filtered by date, date range, or employee)
const getAttendance = async (req, res) => {
  try {
    const { date, startDate, endDate, employeeId } = req.query;

    const where = {};
    if (employeeId) where.employeeId = employeeId;

    if (date) {
      const normDate = normalizeDate(date);
      const startOfDay = new Date(normDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(normDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      where.date = { gte: startOfDay, lte: endOfDay };
    } else if (startDate && endDate) {
      const start = normalizeDate(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = normalizeDate(endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { employee: { name: 'asc' } }],
      include: {
        employee: true
      }
    });

    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    res.status(500).json({ error: 'Failed to fetch attendance logs' });
  }
};

// Save / Upsert single employee attendance record
const saveAttendance = async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, notes } = req.body;
    if (!employeeId || !date) {
      return res.status(400).json({ error: 'Employee ID and Date are required' });
    }

    const record = await upsertAttendanceRecord(employeeId, date, {
      checkIn,
      checkOut,
      status,
      notes
    });

    res.json(record);
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ error: 'Failed to save attendance', details: error.message });
  }
};

// Bulk Save Attendance for multiple employees for a specific date
const saveBulkAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Date and records array are required' });
    }

    const updatedRecords = [];

    for (const rec of records) {
      if (!rec.employeeId) continue;
      const saved = await upsertAttendanceRecord(rec.employeeId, date, {
        checkIn: rec.checkIn,
        checkOut: rec.checkOut,
        status: rec.status,
        notes: rec.notes
      });
      updatedRecords.push(saved);
    }

    res.json({ message: 'Bulk attendance saved successfully', count: updatedRecords.length });
  } catch (error) {
    console.error('Error in bulk attendance save:', error);
    res.status(500).json({ error: 'Failed to save bulk attendance', details: error.message });
  }
};

// Delete attendance record
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.attendance.delete({ where: { id } });
    res.json({ message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ error: 'Failed to delete attendance record' });
  }
};

// --- WEEKLY & MONTHLY ATTENDANCE REPORTS ---
const getAttendanceReports = async (req, res) => {
  try {
    const { type, startDate, endDate, employeeId } = req.query;

    let start = startDate ? normalizeDate(startDate) : null;
    let end = endDate ? normalizeDate(endDate) : null;

    const now = new Date();
    if (type === 'weekly' && !start) {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      start = normalizeDate(d.toISOString().slice(0, 10));
      end = normalizeDate(now.toISOString().slice(0, 10));
    } else if (type === 'monthly' && !start) {
      start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (!start || !end) {
      start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
    }

    const empWhere = { status: 'ACTIVE' };
    if (employeeId) empWhere.id = employeeId;

    const employees = await prisma.employee.findMany({
      where: empWhere,
      orderBy: { name: 'asc' }
    });

    const attendances = await prisma.attendance.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(employeeId ? { employeeId } : {})
      },
      orderBy: { date: 'asc' }
    });

    const reportData = employees.map(emp => {
      const empLogs = attendances.filter(a => a.employeeId === emp.id);

      const presentCount = empLogs.filter(a => a.status === 'PRESENT').length;
      const lateCount = empLogs.filter(a => a.status === 'LATE').length;
      const halfDayCount = empLogs.filter(a => a.status === 'HALF_DAY').length;
      const leaveCount = empLogs.filter(a => a.status === 'LEAVE').length;
      const absentCount = empLogs.filter(a => a.status === 'ABSENT').length;
      const totalHours = empLogs.reduce((sum, a) => sum + (a.totalHours || 0), 0);

      const totalRecordedDays = empLogs.length;
      const activeDays = presentCount + lateCount + (halfDayCount * 0.5);
      const attendanceRate = totalRecordedDays > 0 
        ? Math.round((activeDays / totalRecordedDays) * 100) 
        : 0;

      return {
        employee: emp,
        summary: {
          presentDays: presentCount,
          lateDays: lateCount,
          halfDays: halfDayCount,
          leaveDays: leaveCount,
          absentDays: absentCount,
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalRecordedDays,
          attendanceRate
        },
        logs: empLogs
      };
    });

    res.json({
      startDate: start,
      endDate: end,
      type: type || 'custom',
      reports: reportData
    });
  } catch (error) {
    console.error('Error generating attendance reports:', error);
    res.status(500).json({ error: 'Failed to generate attendance reports' });
  }
};

// Export Attendance Report as CSV
const exportAttendanceCSV = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (startDate && endDate) {
      where.date = {
        gte: normalizeDate(startDate),
        lte: normalizeDate(endDate)
      };
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'asc' }, { employee: { name: 'asc' } }],
      include: { employee: true }
    });

    let csvContent = 'Date,Employee Name,Designation,Department,Status,Check In,Check Out,Total Hours,Notes\n';
    records.forEach(r => {
      const dateStr = new Date(r.date).toISOString().slice(0, 10);
      const empName = `"${(r.employee?.name || '').replace(/"/g, '""')}"`;
      const desig = `"${(r.employee?.designation || '').replace(/"/g, '""')}"`;
      const dept = `"${(r.employee?.department || '').replace(/"/g, '""')}"`;
      const status = r.status;
      const checkIn = r.checkIn || '';
      const checkOut = r.checkOut || '';
      const hours = r.totalHours || 0;
      const notes = `"${(r.notes || '').replace(/"/g, '""')}"`;

      csvContent += `${dateStr},${empName},${desig},${dept},${status},${checkIn},${checkOut},${hours},${notes}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${new Date().toISOString().slice(0, 10)}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting attendance CSV:', error);
    res.status(500).json({ error: 'Failed to export attendance CSV' });
  }
};

module.exports = {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAttendance,
  saveAttendance,
  saveBulkAttendance,
  deleteAttendance,
  getAttendanceReports,
  exportAttendanceCSV
};
