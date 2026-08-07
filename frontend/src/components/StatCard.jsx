import React from 'react';

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, subtitle, color = 'cyan' }) {
  const colorMap = {
    cyan: 'from-cyan-500/20 to-blue-600/20 text-cyan-400 border-cyan-500/30',
    emerald: 'from-emerald-500/20 to-teal-600/20 text-emerald-400 border-emerald-500/30',
    amber: 'from-amber-500/20 to-orange-600/20 text-amber-400 border-amber-500/30',
    purple: 'from-purple-500/20 to-indigo-600/20 text-purple-400 border-purple-500/30',
    rose: 'from-rose-500/20 to-pink-600/20 text-rose-400 border-rose-500/30'
  };

  const iconStyle = colorMap[color] || colorMap.cyan;

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase font-sans tracking-wider text-slate-400 font-semibold mb-1">{title}</p>
          <h3 className="text-2xl font-extrabold text-white tracking-tight font-sans">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br border ${iconStyle} shadow-lg shadow-black/40 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center text-xs">
          <span className={`font-sans font-semibold mr-1.5 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend >= 0 ? `+${trend}%` : `${trend}%`}
          </span>
          <span className="text-slate-400">{trendLabel || 'vs previous period'}</span>
        </div>
      )}
    </div>
  );
}
