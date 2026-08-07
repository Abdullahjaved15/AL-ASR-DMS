import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, Filter, Award, TrendingUp, Clock, Printer } from 'lucide-react';
import { api } from '../services/api';
import { logoBase64 } from '../utils/logoBase64';

const dateRanges = ['Today', 'Yesterday', 'This Week', 'This Month', 'Custom'];

export default function Reports() {
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [selectedRange, startDate, endDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getSalesmenReports({
        range: selectedRange,
        startDate,
        endDate
      });
      setReportData(data.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const url = api.getExportCSVUrl({
      range: selectedRange,
      startDate,
      endDate
    });
    window.open(url, '_blank');
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const totalAssigned = reportData.reduce((sum, r) => sum + r.totalLeads, 0);
    const totalRev = reportData.reduce((sum, r) => sum + r.totalRevenue, 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL ASR MOTORS - Sales Executive Performance Report (${selectedRange})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #1e293b; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-box { display: flex; align-items: center; gap: 15px; }
            .title { font-size: 22px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 12px; color: #64748b; font-family: monospace; }
            .stats { display: flex; gap: 15px; margin-bottom: 20px; }
            .stat-box { flex: 1; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .stat-val { font-size: 18px; font-weight: bold; color: #0284c7; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            tr:nth-child(even) { background: #f8fafc; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .badge-conv { background: #dcfce7; color: #15803d; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-box">
              <img src="${logoBase64}" alt="AL ASR MOTORS Logo" style="height: 105px; width: auto; object-fit: contain;" />
              <div>
                <div class="title">AL ASR MOTORS - Sales Performance Report</div>
                <div class="subtitle">Reporting Period: ${selectedRange} • Generated: ${todayStr}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px; font-weight: bold; color: #0284c7;">AL ASR Motors Executive Board</div>
              <div style="font-size: 10px; color: #64748b;">Sahiwal, Pakistan</div>
            </div>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="stat-label">Active Sales Staff</div>
              <div class="stat-val">${reportData.length} Agents</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Assigned Leads</div>
              <div class="stat-val">${totalAssigned} Leads</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Closed Revenue (PKR)</div>
              <div class="stat-val">Rs. ${totalRev.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Sales Agent</th>
                <th>Assigned Leads</th>
                <th>Deals Closed</th>
                <th>Active Leads</th>
                <th>Follow Ups</th>
                <th>Closed Revenue (PKR)</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map((sm, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${sm.salesmanName}</strong><br/><span style="font-size: 10px; color: #64748b;">${sm.email}</span></td>
                  <td>${sm.totalLeads}</td>
                  <td><strong>${sm.closedDeals}</strong></td>
                  <td>${sm.activeLeads}</td>
                  <td>${sm.followUpsPending}</td>
                  <td><strong>Rs. ${sm.totalRevenue.toLocaleString()}</strong></td>
                  <td><span class="badge badge-conv">${sm.conversionRate}%</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Report generated by AL ASR Motors Executive System • Confidential Internal Document
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Date Filter & Export Header */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Reporting Period:</span>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10 gap-1">
            {dateRanges.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  selectedRange === range
                    ? 'bg-cyan-500 text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {selectedRange === 'Custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1 text-xs text-white font-mono"
              />
              <span className="text-slate-500 font-mono text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1 text-xs text-white font-mono"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-cyan-400 font-bold font-mono text-xs rounded-xl flex items-center space-x-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Export Printable PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/10">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Active Sales Agents</p>
            <h3 className="text-xl font-extrabold text-white mt-0.5">{reportData.length}</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/10">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Assigned Leads</p>
            <h3 className="text-xl font-extrabold text-cyan-400 mt-0.5">
              {reportData.reduce((sum, r) => sum + r.totalLeads, 0)}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/10">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Closed Revenue (PKR)</p>
            <h3 className="text-xl font-extrabold text-emerald-400 mt-0.5">
              Rs. {reportData.reduce((sum, r) => sum + r.totalRevenue, 0).toLocaleString()}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/10">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Top Lead Handler</p>
            <h3 className="text-sm font-extrabold text-amber-400 mt-0.5 truncate max-w-[150px]">
              {reportData[0]?.salesmanName || 'N/A'}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Salesman Comparative Performance Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Salesmen Performance Comparison (AL ASR)</h3>
            <p className="text-xs text-slate-400 font-mono">
              Comparing conversion rates, closed PKR volume, average deal turnaround time, and active leads for period [{selectedRange}].
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Sales Agent</th>
                <th className="py-3.5 px-4">Total Assigned Leads</th>
                <th className="py-3.5 px-4">Deals Closed</th>
                <th className="py-3.5 px-4">Active Leads</th>
                <th className="py-3.5 px-4">Follow Ups</th>
                <th className="py-3.5 px-4">Closed Revenue (PKR)</th>
                <th className="py-3.5 px-4">Conversion Rate</th>
                <th className="py-3.5 px-4">Avg Deal Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {reportData.map((sm) => (
                <tr key={sm.salesmanId} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-semibold text-white">
                    <p className="text-sm font-bold text-white">{sm.salesmanName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{sm.email}</p>
                  </td>

                  <td className="py-4 px-4 font-mono font-bold text-white text-sm">
                    {sm.totalLeads}
                  </td>

                  <td className="py-4 px-4 font-mono font-bold text-emerald-400 text-sm">
                    {sm.dealsClosed}
                  </td>

                  <td className="py-4 px-4 font-mono text-cyan-400">
                    {sm.activeLeads}
                  </td>

                  <td className="py-4 px-4 font-mono text-amber-400">
                    {sm.pendingLeads}
                  </td>

                  <td className="py-4 px-4 font-mono font-extrabold text-cyan-400 text-sm">
                    Rs. {sm.totalRevenue?.toLocaleString()}
                  </td>

                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-mono font-bold">
                      {sm.conversionRate}
                    </span>
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-300">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{sm.avgDealTime}</span>
                    </div>
                  </td>
                </tr>
              ))}

              {reportData.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No salesmen performance records found for selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
