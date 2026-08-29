import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Users, 
  TrendingUp, 
  Handshake, 
  DollarSign, 
  Award, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  ChevronRight,
  Activity
} from 'lucide-react';
import StatCard from '../components/StatCard';
import PipelineBar from '../components/PipelineBar';
import StatusBadge from '../components/StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPKR, parsePakistaniPrice } from '../utils/priceFormatter';

export default function Dashboard({ onNavigate, onOpenModal }) {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load AL ASR dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[600px]">
        <div className="flex items-center space-x-3 text-cyan-400 font-mono text-sm">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading AL ASR Operations Hub...</span>
        </div>
      </div>
    );
  }

  const metrics = stats?.metrics || {};

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-[#0d1c2d] to-cyan-950/40 border border-cyan-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span>AL ASR Motors Operational Hub</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Welcome back, <span className="text-cyan-400">{user?.name}</span>!
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {isAdmin 
                ? 'Here is your AL ASR dealership overview. Track sales pipeline, PKR revenue, top salesmen performance, and active vehicle inventory.'
                : 'Here is your personal sales pipeline summary. Manage your assigned seller leads, buyer inquiries, and closed transactions.'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onOpenModal('seller')}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2"
              >
                <Car className="w-4 h-4" />
                <span>+ Add Seller Vehicle</span>
              </button>
              <button
                onClick={() => onOpenModal('deal')}
                className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-semibold rounded-xl text-xs transition-all flex items-center space-x-2"
              >
                <Handshake className="w-4 h-4" />
                <span>Register Deal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN METRICS GRID */}
      {isAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Sellers / Vehicles"
              value={metrics.totalSellers || 0}
              icon={Car}
              color="cyan"
              subtitle="Listed vehicle inventory"
            />
            <StatCard
              title="Total Buyers"
              value={metrics.totalBuyers || 0}
              icon={Users}
              color="emerald"
              subtitle="Registered inquiries"
            />
            <StatCard
              title="Deals Closed This Month"
              value={metrics.dealsClosedThisMonth || 0}
              icon={Handshake}
              color="amber"
              trend={14.2}
              trendLabel="vs last month"
            />
            <StatCard
              title="Total Deal Revenue"
              value={`PKR ${(metrics.totalRevenue || 0).toLocaleString()}`}
              icon={DollarSign}
              color="purple"
              subtitle={`Total Profit: PKR ${(metrics.totalProfit || 0).toLocaleString()}`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Today's New Leads"
              value={metrics.todayNewLeads || 0}
              icon={Calendar}
              color="cyan"
              subtitle="Sellers + Buyers registered today"
            />
            <StatCard
              title="Deals Closed Today"
              value={metrics.dealsClosedToday || 0}
              icon={CheckCircle2}
              color="emerald"
              subtitle="Finalized today"
            />
            <StatCard
              title="Active Leads"
              value={metrics.activeLeads || 0}
              icon={Clock}
              color="amber"
              subtitle="Ongoing negotiations & follow-ups"
            />
            <StatCard
              title="Top Performer"
              value={metrics.topSalesman?.name || 'N/A'}
              icon={Award}
              color="rose"
              subtitle={`Volume: PKR ${(metrics.topSalesman?.revenue || 0).toLocaleString()}`}
            />
          </div>

          {/* Pipeline Funnel Breakdown */}
          <PipelineBar data={stats?.pipelineBreakdown} />

          {/* Bottom Grid: Recent Deals + Activity Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Closed Transactions */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                  <p className="text-xs text-slate-400 font-mono">Latest closed vehicle sales in PKR</p>
                </div>
                <button
                  onClick={() => onNavigate('deals')}
                  className="text-xs text-cyan-400 hover:underline font-mono flex items-center space-x-1"
                >
                  <span>View All Deals</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-3">Vehicle</th>
                      <th className="py-3.5 px-3">Buyer</th>
                      <th className="py-3.5 px-3">Salesman</th>
                      <th className="py-3.5 px-3">Price (PKR)</th>
                      <th className="py-3.5 px-3">Profit (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-sans">
                    {stats?.recentDeals?.map((deal) => (
                      <tr key={deal.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">
                          {deal.seller?.vehicle} {deal.seller?.model} ({deal.seller?.year})
                        </td>
                        <td className="py-3 px-3 text-slate-300">{deal.buyer?.buyerName}</td>
                        <td className="py-3 px-3 text-slate-300 font-mono">{deal.salesman?.name}</td>
                        <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                          {formatPKR(deal.dealPrice)}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-emerald-400">
                          {deal.profit !== null && deal.profit !== undefined && deal.profit !== ''
                            ? (parsePakistaniPrice(deal.profit) >= 0 ? `+${formatPKR(deal.profit)}` : `-${formatPKR(Math.abs(parsePakistaniPrice(deal.profit)))}`)
                            : 'Rs. 0'}
                        </td>
                      </tr>
                    ))}
                    {(!stats?.recentDeals || stats.recentDeals.length === 0) && (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-500 font-mono text-xs">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Salesmen & Activity Feed */}
            <div className="space-y-6">
              {/* Top Salesmen Leaderboard */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider mb-4 flex items-center space-x-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Sales Leaderboard</span>
                </h3>
                <div className="space-y-3">
                  {stats?.topSalesmenList?.map((sm, index) => (
                    <div key={sm.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
                      <div className="flex items-center space-x-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                          index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                        }`}>
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-white">{sm.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{sm.dealsCount} deal(s)</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-cyan-400">{formatPKR(sm.revenue)}</span>
                    </div>
                  ))}
                  {(!stats?.topSalesmenList || stats.topSalesmenList.length === 0) && (
                    <p className="text-xs text-slate-500 font-mono text-center py-2">No salesmen performance data.</p>
                  )}
                </div>
              </div>

              {/* Activity Log Feed */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider mb-4 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Audit Trail</span>
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {stats?.recentActivity?.map((act) => (
                    <div key={act.id} className="text-xs border-l-2 border-cyan-500/40 pl-3 py-1">
                      <p className="text-slate-200">{act.details}</p>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {act.user?.name || 'System'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SALESMAN METRICS GRID */}
      {!isAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="My Assigned Sellers"
              value={metrics.mySellers || 0}
              icon={Car}
              color="cyan"
              subtitle="Sellers under my pipeline"
            />
            <StatCard
              title="My Assigned Buyers"
              value={metrics.myBuyers || 0}
              icon={Users}
              color="emerald"
              subtitle="Buyer inquiries assigned"
            />
            <StatCard
              title="My Pending Leads"
              value={metrics.myPendingLeads || 0}
              icon={Clock}
              color="amber"
              subtitle="In active negotiation"
            />
            <StatCard
              title="My Follow Ups"
              value={metrics.myFollowUps || 0}
              icon={AlertCircle}
              color="rose"
              subtitle="Follow-up actions needed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="My Monthly Sales Revenue"
              value={`PKR ${(metrics.monthlyRevenue || 0).toLocaleString()}`}
              icon={DollarSign}
              color="cyan"
              subtitle={`${metrics.monthlyDealsCount || 0} deal(s) closed this month`}
            />
            <StatCard
              title="My Generated Profit"
              value={`PKR ${(metrics.monthlyProfit || 0).toLocaleString()}`}
              icon={TrendingUp}
              color="emerald"
              subtitle="Total deal profit margin"
            />
            <StatCard
              title="Today's Leads Added"
              value={metrics.todayLeads || 0}
              icon={Calendar}
              color="amber"
              subtitle="Leads registered today"
            />
          </div>

          {/* Salesman Recent Closed Deals */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">My Closed Deals</h3>
                <p className="text-xs text-slate-400 font-mono">Your personal sales portfolio in PKR</p>
              </div>
              <button
                onClick={() => onNavigate('deals')}
                className="text-xs text-cyan-400 hover:underline font-mono"
              >
                View All My Deals →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Vehicle</th>
                    <th className="py-3 px-3">Buyer Name</th>
                    <th className="py-3 px-3">Demand Price</th>
                    <th className="py-3 px-3">Final Deal Price</th>
                    <th className="py-3 px-3">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {stats?.recentDeals?.map((deal) => (
                    <tr key={deal.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        {deal.seller?.vehicle} {deal.seller?.model} ({deal.seller?.year})
                      </td>
                      <td className="py-3 px-3 text-slate-300">{deal.buyer?.buyerName}</td>
                      <td className="py-3 px-3 text-slate-400 font-mono">{formatPKR(deal.seller?.demandPrice)}</td>
                      <td className="py-3 px-3 font-mono font-bold text-cyan-400">{formatPKR(deal.dealPrice)}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-emerald-400">
                        {deal.profit !== null && deal.profit !== undefined && deal.profit !== ''
                          ? (parsePakistaniPrice(deal.profit) >= 0 ? `+${formatPKR(deal.profit)}` : `-${formatPKR(Math.abs(parsePakistaniPrice(deal.profit)))}`)
                          : 'Rs. 0'}
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recentDeals || stats.recentDeals.length === 0) && (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-500 font-mono text-xs">
                        You have not closed any deals yet. Advance seller leads to "Deal Closed"!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
