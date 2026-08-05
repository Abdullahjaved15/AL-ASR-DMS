import React from 'react';

const stages = [
  { key: 'New Lead', label: 'New Lead', color: 'bg-cyan-500', border: 'border-cyan-500' },
  { key: 'Contacted', label: 'Contacted', color: 'bg-blue-500', border: 'border-blue-500' },
  { key: 'Follow Up', label: 'Follow Up', color: 'bg-amber-500', border: 'border-amber-500' },
  { key: 'Interested', label: 'Interested', color: 'bg-purple-500', border: 'border-purple-500' },
  { key: 'Negotiation', label: 'Negotiation', color: 'bg-indigo-500', border: 'border-indigo-500' },
  { key: 'Deal Closed', label: 'Closed', color: 'bg-emerald-500', border: 'border-emerald-500' },
  { key: 'Lost', label: 'Lost', color: 'bg-rose-500', border: 'border-rose-500' }
];

export default function PipelineBar({ data = {} }) {
  const total = Object.values(data).reduce((sum, count) => sum + (count || 0), 0) || 1;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-bold text-white tracking-tight">Sales Pipeline Breakdown</h4>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Active leads across stages</p>
        </div>
        <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-mono">
          Total Leads: {total}
        </span>
      </div>

      {/* Progress bar container */}
      <div className="h-3 w-full bg-slate-900/80 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-white/5 shadow-inner">
        {stages.map((stage) => {
          const count = data[stage.key] || 0;
          const percentage = ((count / total) * 100).toFixed(1);
          if (count === 0) return null;
          return (
            <div
              key={stage.key}
              style={{ width: `${percentage}%` }}
              className={`${stage.color} h-full transition-all duration-500 relative group`}
              title={`${stage.label}: ${count} (${percentage}%)`}
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs text-white rounded whitespace-nowrap z-20 pointer-events-none border border-white/10 shadow-xl">
                {stage.label}: {count} ({percentage}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid of legend items */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-5 pt-4 border-t border-white/5">
        {stages.map((stage) => {
          const count = data[stage.key] || 0;
          return (
            <div key={stage.key} className="flex flex-col items-start">
              <div className="flex items-center space-x-1.5 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`}></span>
                <span className="text-xs text-slate-400 truncate">{stage.label}</span>
              </div>
              <span className="text-sm font-extrabold font-mono text-white">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
