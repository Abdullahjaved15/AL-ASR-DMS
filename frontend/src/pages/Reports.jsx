import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, Filter, Award, TrendingUp, Clock } from 'lucide-react';
import { api } from '../services/api';

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

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel / CSV</span>
        </button>
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
