import React, { useState, useEffect } from 'react';
import { BarChart3, Printer, RefreshCw, DollarSign, TrendingUp, Building2 } from 'lucide-react';
import { api } from '../services/api';
import { logoBase64 } from '../utils/logoBase64';

export default function FinancialStatements() {
  const [activeTab, setActiveTab] = useState('balance_sheet'); // balance_sheet, income_statement, trial_balance
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [trialBalance, setTrialBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    setLoading(true);
    try {
      const [bs, inc, tb] = await Promise.all([
        api.getBalanceSheet().catch(() => null),
        api.getIncomeStatement().catch(() => null),
        api.getTrialBalance().catch(() => null)
      ]);

      setBalanceSheet(bs);
      setIncomeStatement(inc);
      setTrialBalance(tb);
    } catch (err) {
      console.error('Failed to fetch financial statements:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportStatementPDF = () => {
    const printWindow = window.open('', '_blank');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

    let titleText = 'BALANCE SHEET STATEMENT';
    let bodyHTML = '';

    if (activeTab === 'balance_sheet' && balanceSheet) {
      titleText = 'BALANCE SHEET STATEMENT';
      bodyHTML = `
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-top: 10px;">
          <tr style="background: #0f172a; color: white; font-weight: bold;"><td colspan="2" style="padding: 6px;">ASSETS (روپے / PKR)</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Central Company Vault Liquid Cash Balance</td><td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">Rs. ${(balanceSheet.assets?.cashAndVaultBalance || 0).toLocaleString()}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Showroom Available Stock Valuation</td><td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">Rs. ${(balanceSheet.assets?.showroomStockValuation || 0).toLocaleString()}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Customer Installment Accounts Receivable</td><td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">Rs. ${(balanceSheet.assets?.installmentReceivables || 0).toLocaleString()}</td></tr>
          <tr style="background: #f8fafc; font-weight: 900;"><td style="padding: 8px;">TOTAL ASSETS</td><td style="padding: 8px; text-align: right; font-family: monospace; color: #0284c7; font-size: 13px;">PKR ${(balanceSheet.assets?.totalAssets || 0).toLocaleString()}</td></tr>

          <tr style="background: #0f172a; color: white; font-weight: bold;"><td colspan="2" style="padding: 6px; margin-top: 15px;">LIABILITIES & EQUITY (روپے / PKR)</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Issued Security Cheques Pending Clearance</td><td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">Rs. ${(balanceSheet.liabilities?.pendingIssuedCheques || 0).toLocaleString()}</td></tr>
          <tr style="background: #f8fafc; font-weight: 900;"><td style="padding: 8px;">TOTAL LIABILITIES</td><td style="padding: 8px; text-align: right; font-family: monospace; color: #dc2626;">PKR ${(balanceSheet.liabilities?.totalLiabilities || 0).toLocaleString()}</td></tr>
          <tr style="background: #f1f5f9; font-weight: 900;"><td style="padding: 8px;">NET RETAINED EQUITY</td><td style="padding: 8px; text-align: right; font-family: monospace; color: #16a34a; font-size: 13px;">PKR ${(balanceSheet.equity?.retainedEarningsAndNetEquity || 0).toLocaleString()}</td></tr>
        </table>
      `;
    } else if (activeTab === 'income_statement' && incomeStatement) {
      titleText = 'INCOME STATEMENT (PROFIT & LOSS)';
      bodyHTML = `
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-top: 10px;">
          <tr style="background: #0f172a; color: white; font-weight: bold;"><td colspan="2" style="padding: 6px;">REVENUE & SALES</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Total Vehicle Sales Revenue</td><td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">Rs. ${(incomeStatement.revenue?.totalVehicleSales || 0).toLocaleString()}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Less: Cost of Vehicles Sold (COGS)</td><td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold; color: #dc2626;">-Rs. ${(incomeStatement.costOfSales?.costOfVehiclesSold || 0).toLocaleString()}</td></tr>
          <tr style="background: #f8fafc; font-weight: 900;"><td style="padding: 8px;">GROSS PROFIT ON SALES</td><td style="padding: 8px; text-align: right; font-family: monospace; color: #16a34a; font-size: 13px;">PKR ${(incomeStatement.costOfSales?.grossProfit || 0).toLocaleString()}</td></tr>

          <tr style="background: #0f172a; color: white; font-weight: bold;"><td colspan="2" style="padding: 6px;">OPERATING EXPENSES</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Vehicle Refurbishment & Repair Expenses</td><td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">Rs. ${(incomeStatement.operatingExpenses?.refurbishmentAndRepairs || 0).toLocaleString()}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">General Showroom Operating Expenses</td><td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">Rs. ${(incomeStatement.operatingExpenses?.generalOperatingExpenses || 0).toLocaleString()}</td></tr>
          <tr style="background: #f1f5f9; font-weight: 900;"><td style="padding: 8px;">NET OPERATING PROFIT / LOSS</td><td style="padding: 8px; text-align: right; font-family: monospace; color: #0284c7; font-size: 14px;">PKR ${(incomeStatement.netProfitLoss || 0).toLocaleString()}</td></tr>
        </table>
      `;
    } else if (activeTab === 'trial_balance' && trialBalance) {
      titleText = 'TRIAL BALANCE STATEMENT';
      bodyHTML = `
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-top: 10px;">
          <thead>
            <tr style="background: #0f172a; color: white; font-weight: bold;">
              <th style="padding: 6px; text-align: left;">Account Ledger Description</th>
              <th style="padding: 6px; text-align: right;">Debit (PKR)</th>
              <th style="padding: 6px; text-align: right;">Credit (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${(trialBalance.items || []).map(i => `
              <tr>
                <td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">${i.account}</td>
                <td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">${i.debit ? 'Rs. ' + i.debit.toLocaleString() : '-'}</td>
                <td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">${i.credit ? 'Rs. ' + i.credit.toLocaleString() : '-'}</td>
              </tr>
            `).join('')}
            <tr style="background: #f8fafc; font-weight: 900;">
              <td style="padding: 8px;">TOTAL LEDGER BALANCE</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; color: #0284c7;">PKR ${(trialBalance.totalDebit || 0).toLocaleString()}</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; color: #0284c7;">PKR ${(trialBalance.totalCredit || 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AL-ASR MOTORS - ${titleText} (${todayStr})</title>
          <style>
            @page { size: portrait; margin: 8mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 10px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
            .title { font-size: 18px; font-weight: 900; color: #0f172a; }
            .subtitle { font-size: 9.5px; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${logoBase64}" style="height: 48px;" />
              <div>
                <div class="title">AL-ASR MOTORS — ${titleText}</div>
                <div class="subtitle">Official Financial Statement • Generated: ${todayStr} • Sahiwal, Pakistan</div>
              </div>
            </div>
          </div>
          ${bodyHTML}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Financial Statements (Balance Sheet, P&L, Trial Balance)
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Official accounting financial reports with 1-click printable PDF statement generator.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchStatements}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate</span>
          </button>

          <button
            onClick={exportStatementPDF}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Export Statement PDF</span>
          </button>
        </div>
      </div>

      {/* Statement Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-white/10 bg-slate-900/60 p-2 gap-2 rounded-xl text-xs font-mono">
        {[
          { id: 'balance_sheet', label: '📊 Balance Sheet (Assets vs Liabilities & Equity)' },
          { id: 'income_statement', label: '💰 Income Statement (Profit & Loss)' },
          { id: 'trial_balance', label: '⚖️ Trial Balance Statement' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: BALANCE SHEET */}
      {activeTab === 'balance_sheet' && balanceSheet && (
        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              AL-ASR MOTORS — BALANCE SHEET STATEMENT
            </h3>
            <span className="text-xs font-mono text-purple-300">As of Today</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-cyan-500/30">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono border-b border-white/10 pb-2">
                1. ASSETS (اثاثے)
              </h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                  <span>Central Company Vault Balance</span>
                  <span className="font-bold text-white">Rs. {(balanceSheet.assets?.cashAndVaultBalance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                  <span>Showroom Available Stock Valuation</span>
                  <span className="font-bold text-white">Rs. {(balanceSheet.assets?.showroomStockValuation || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                  <span>Installment Receivables Due</span>
                  <span className="font-bold text-white">Rs. {(balanceSheet.assets?.installmentReceivables || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-extrabold text-cyan-400">
                  <span>TOTAL ASSETS</span>
                  <span>PKR {(balanceSheet.assets?.totalAssets || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-purple-500/30">
              <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono border-b border-white/10 pb-2">
                2. LIABILITIES & EQUITY (واجبات اور ایکویٹی)
              </h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                  <span>Pending Issued Security Cheques</span>
                  <span className="font-bold text-rose-400">Rs. {(balanceSheet.liabilities?.pendingIssuedCheques || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                  <span>Total Liabilities</span>
                  <span className="font-bold text-rose-400">Rs. {(balanceSheet.liabilities?.totalLiabilities || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                  <span>Net Retained Earnings & Equity</span>
                  <span className="font-bold text-emerald-400">Rs. {(balanceSheet.equity?.retainedEarningsAndNetEquity || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-extrabold text-purple-300">
                  <span>TOTAL LIABILITIES & EQUITY</span>
                  <span>PKR {(balanceSheet.equity?.totalLiabilitiesAndEquity || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INCOME STATEMENT */}
      {activeTab === 'income_statement' && incomeStatement && (
        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              AL-ASR MOTORS — INCOME STATEMENT (PROFIT & LOSS)
            </h3>
            <span className="text-xs font-mono text-emerald-400">Cumulative Sales Ledger</span>
          </div>

          <div className="space-y-4 bg-slate-900/80 p-5 rounded-xl border border-white/10 text-xs font-mono">
            <div className="flex justify-between py-2 border-b border-white/10 text-slate-300">
              <span className="font-bold text-white">Vehicle Sales Revenues</span>
              <span className="font-bold text-emerald-400 text-sm">Rs. {(incomeStatement.revenue?.totalVehicleSales || 0).toLocaleString()}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-white/10 text-slate-300">
              <span>Less: Cost of Vehicles Sold (COGS)</span>
              <span className="font-bold text-rose-400">-Rs. {(incomeStatement.costOfSales?.costOfVehiclesSold || 0).toLocaleString()}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-white/10 text-cyan-300 font-bold bg-cyan-500/10 px-3 rounded">
              <span>GROSS PROFIT ON SALES</span>
              <span className="text-sm">PKR {(incomeStatement.costOfSales?.grossProfit || 0).toLocaleString()}</span>
            </div>

            <div className="pt-2 space-y-1">
              <p className="text-slate-400 uppercase text-[10px] font-bold">Operating Expenses</p>
              <div className="flex justify-between py-1 text-slate-300">
                <span>Vehicle Refurbishment & Repairs</span>
                <span className="text-rose-300">Rs. {(incomeStatement.operatingExpenses?.refurbishmentAndRepairs || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-300">
                <span>Showroom Operating Expenses</span>
                <span className="text-rose-300">Rs. {(incomeStatement.operatingExpenses?.generalOperatingExpenses || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-white/20 text-base font-extrabold text-emerald-400">
              <span>NET OPERATING PROFIT / LOSS</span>
              <span>PKR {(incomeStatement.netProfitLoss || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRIAL BALANCE */}
      {activeTab === 'trial_balance' && trialBalance && (
        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              AL-ASR MOTORS — TRIAL BALANCE STATEMENT
            </h3>
            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
              trialBalance.isBalanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {trialBalance.isBalanced ? '✓ LEDGER BALANCED' : '⚠️ RECONCILING'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-slate-900 border-b border-white/10 text-slate-400 text-[11px] uppercase">
                  <th className="py-3 px-4">Account Ledger Description</th>
                  <th className="py-3 px-4 text-right">Debit (PKR)</th>
                  <th className="py-3 px-4 text-right">Credit (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(trialBalance.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="py-3 px-4 font-semibold text-white">{item.account}</td>
                    <td className="py-3 px-4 text-right text-cyan-400 font-bold">
                      {item.debit ? `Rs. ${item.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                      {item.credit ? `Rs. ${item.credit.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-900 font-extrabold text-sm border-t-2 border-white/20">
                  <td className="py-3 px-4 text-white">TOTAL LEDGER BALANCE</td>
                  <td className="py-3 px-4 text-right text-cyan-400">PKR {(trialBalance.totalDebit || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-emerald-400">PKR {(trialBalance.totalCredit || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
