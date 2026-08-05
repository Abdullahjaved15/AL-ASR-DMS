import React from 'react';

const statusStyles = {
  'New Lead': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'Contacted': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Follow Up': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Interested': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Negotiation': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  'Deal Closed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Lost': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  'Cancelled': 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  'Incomplete': 'bg-orange-500/10 text-orange-400 border-orange-500/30'
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || 'bg-slate-500/10 text-slate-300 border-slate-500/30';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
      {status || 'Unknown'}
    </span>
  );
}
