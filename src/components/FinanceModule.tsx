import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  HelpCircle,
  PiggyBank 
} from 'lucide-react';
import { FinanceTransaction, Language } from '../types';
import { TRANSLATIONS } from '../Translations';
import { EXCHANGE_RATES } from '../db_initial';

interface FinanceModuleProps {
  transactions: FinanceTransaction[];
  lang: Language;
  onAddTransaction: (txn: Partial<FinanceTransaction>) => Promise<void>;
  exchangeRates?: Record<string, number>;
}

export default function FinanceModule({
  transactions,
  lang,
  onAddTransaction,
  exchangeRates
}: FinanceModuleProps) {
  const t = (key: string) => TRANSLATIONS[lang][key] || key;
  const ACTIVE_RATES = exchangeRates || EXCHANGE_RATES;

  // Search/Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Form State for manual ledger entries
  const [showAddLedger, setShowAddLedger] = useState(false);
  const [form, setForm] = useState<Partial<FinanceTransaction>>({
    type: 'Income',
    category: 'Booking Revenue',
    amount: 1000,
    currency: 'MYR',
    description: ''
  });

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0 || !form.description) {
      alert("Please provide a valid transaction amount and description.");
      return;
    }

    await onAddTransaction(form);
    
    // Reset
    setShowAddLedger(false);
    setForm({
      type: 'Income',
      category: 'Booking Revenue',
      amount: 1000,
      currency: 'MYR',
      description: ''
    });
  };

  // Calculations (Standardized in MYR)
  const totalIncomeMYR = transactions
    .filter(tx => tx.type === 'Income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenseMYR = transactions
    .filter(tx => tx.type === 'Expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netProfitMYR = totalIncomeMYR - totalExpenseMYR;

  // Filter Transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(search.toLowerCase()) || 
                          tx.category.toLowerCase().includes(search.toLowerCase()) || 
                          tx.referenceId.toLowerCase().includes(search.toLowerCase()) || 
                          tx.id.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'All' ? true : tx.type === typeFilter;
    const matchesCategory = categoryFilter === 'All' ? true : tx.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const categories = Array.from(new Set(transactions.map(tx => tx.category)));

  // Responsive SVG Accounting Chart Mockups based on live ledger metrics
  // We'll generate dynamic SVG bar elements representing relative categories (Income vs Expense)
  const chartHeight = 160;
  const categoriesForChart = [
    { label: 'Booking Revenue', income: totalIncomeMYR, expense: 0 },
    { label: 'Supplier Fees', income: 0, expense: transactions.filter(t => t.category === 'Supplier Payment').reduce((s, t) => s + t.amount, 0) },
    { label: 'Office HR Salaries', income: 0, expense: transactions.filter(t => t.category === 'HR Salary').reduce((s, t) => s + t.amount, 0) },
    { label: 'Misc Overheads', income: 0, expense: transactions.filter(t => t.category === 'Office Overhead' || t.category === 'Marketing').reduce((s, t) => s + t.amount, 0) }
  ];

  const maxVal = Math.max(...categoriesForChart.map(c => Math.max(c.income, c.expense)), 10000);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{t('financeLead')}</h2>
          <p className="text-xs text-slate-500">Corporate balance sheet standardized in Malaysian Ringgit (MYR). Exposes unified transaction journals.</p>
        </div>
        <button
          onClick={() => setShowAddLedger(!showAddLedger)}
          className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Direct Ledger Entry
        </button>
      </div>

      {/* KPI Accounting Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Inflow */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">{t('income')}</span>
            <span className="text-2xl font-black text-emerald-800 block">MYR {totalIncomeMYR.toLocaleString()}</span>
            <span className="text-[9px] text-slate-400 block font-mono">Original Currencies converted</span>
          </div>
          <div className="bg-emerald-50 text-emerald-600 rounded-xl p-3 border border-emerald-100 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">{t('expense')}</span>
            <span className="text-2xl font-black text-rose-700 block">MYR {totalExpenseMYR.toLocaleString()}</span>
            <span className="text-[9px] text-slate-400 block font-mono">Includes hot-bed payments and HR</span>
          </div>
          <div className="bg-rose-50 text-rose-600 rounded-xl p-3 border border-rose-100 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Margin Profit */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-5 border border-slate-850 shadow-md text-white flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">{t('netProfit')}</span>
            <span className={`text-2xl font-black block ${netProfitMYR >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              MYR {netProfitMYR.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-400 block">Operating margins on hotbeds</span>
          </div>
          <div className="bg-slate-800/80 text-amber-400 rounded-xl p-3 border border-slate-700 shrink-0">
            <PiggyBank className="w-5 h-5 animate-bounce" />
          </div>
        </div>

        {/* Currency Rates Box */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-450 block">{t('exchangeRates')}</span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] text-slate-600">
            <div className="flex justify-between">
              <span>1 SGD =</span>
              <span className="font-bold text-slate-900">MYR {ACTIVE_RATES.SGD}</span>
            </div>
            <div className="flex justify-between">
              <span>1 SAR =</span>
              <span className="font-bold text-slate-900">MYR {ACTIVE_RATES.SAR}</span>
            </div>
            <div className="flex justify-between col-span-2 border-t border-slate-100 pt-1 mt-0.5">
              <span>10K IDR =</span>
              <span className="font-bold text-slate-900">MYR {(ACTIVE_RATES.IDR * 10000).toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Manual Entry Drawer */}
      {showAddLedger && (
        <form onSubmit={handleCreateLedger} className="bg-white rounded-2xl border border-slate-250 p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <h3 className="font-extrabold text-slate-900 border-b border-slate-200 pb-3 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-800" />
            Record General Ledger Adjustment Entry
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Cashflow Direction</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as any })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 font-bold w-full"
              >
                <option value="Income">Direct Cash Inflow (Income)</option>
                <option value="Expense">Direct Cash Outflow (Expense)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Operational Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value as any })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 font-semibold w-full"
              >
                <option value="Booking Revenue">Booking Revenue</option>
                <option value="Supplier Payment">Supplier Payment (Hot-Bed / Bus Shuttles)</option>
                <option value="HR Salary">Corporate Employee Salary</option>
                <option value="B2B Commission Payout">B2B Agent Commission Payout</option>
                <option value="Office Overhead">Administration / Utility Outlay</option>
                <option value="Marketing">Social Ads & Agency Marketing</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Original Amount</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 font-bold w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Settle Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value as any })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 font-semibold w-full"
              >
                <option value="MYR">MYR (Malaysian Ringgit)</option>
                <option value="SGD">SGD (Singapore Dollars)</option>
                <option value="SAR">SAR (Saudi Riyals)</option>
                <option value="IDR">IDR (Indonesian Rupiah)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Adjustment Description / Internal Log Explanation</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Paid internet fee, server backup bills, or direct customer cash ticket deposit..."
              required
              className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-emerald-800 w-full"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddLedger(false)}
              className="px-4 py-2 border border-slate-150 bg-white rounded-lg text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2 px-5 rounded-lg text-xs shadow-xs cursor-pointer"
            >
              Dispatch Ledger Entry
            </button>
          </div>
        </form>
      )}

      {/* SVG Analytics Chart and Audit Journals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Column */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Accounting Category Allocation</h3>
          <div className="h-64 flex items-center justify-center bg-slate-50 border border-slate-150 rounded-xl p-4">
            {/* Custom Responsive SVG Graph */}
            <svg viewBox="0 0 300 200" className="w-full h-full font-mono text-[8px] text-slate-500">
              {/* Y Axis line */}
              <line x1="45" y1="20" x2="45" y2="160" stroke="#CBD5E1" strokeWidth="1.5" />
              {/* X Axis line */}
              <line x1="45" y1="160" x2="280" y2="160" stroke="#CBD5E1" strokeWidth="1.5" />
              
              {/* Categories Plots */}
              {categoriesForChart.map((cat, idx) => {
                const xPos = 65 + idx * 56;
                const incomeHeight = (cat.income / maxVal) * 120;
                const expenseHeight = (cat.expense / maxVal) * 120;
                
                return (
                  <g key={idx}>
                    {/* Income Bar (Green) */}
                    {cat.income > 0 && (
                      <>
                        <rect 
                          x={xPos} 
                          y={160 - incomeHeight} 
                          width="16" 
                          height={incomeHeight} 
                          fill="url(#greenGrad)" 
                          rx="2"
                        />
                        <text x={xPos - 5} y={155 - incomeHeight} fill="#065F46" fontWeight="bold">
                          {(cat.income / 1000).toFixed(1)}k
                        </text>
                      </>
                    )}
                    {/* Expense Bar (Rose) */}
                    {cat.expense > 0 && (
                      <>
                        <rect 
                          x={xPos + 18} 
                          y={160 - expenseHeight} 
                          width="16" 
                          height={expenseHeight} 
                          fill="url(#redGrad)" 
                          rx="2"
                        />
                        <text x={xPos + 12} y={155 - expenseHeight} fill="#9F1239" fontWeight="bold">
                          {(cat.expense / 1000).toFixed(1)}k
                        </text>
                      </>
                    )}
                    {/* Label */}
                    <text x={xPos} y="175" fill="#64748B" fontSize="6px" fontWeight="bold" textAnchor="start" className="rotate-12 transform-gpu">
                      {cat.label.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              {/* Gradients */}
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E11D48" />
                  <stop offset="100%" stopColor="#FDA4AF" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex justify-center gap-4 text-[10px] font-bold">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs" /> Income Inflow</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-600 rounded-xs" /> Supplier / HR Expense</span>
          </div>
        </div>

        {/* Audit Journals List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Accounting Ledgers</h3>
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ledger journals..."
                className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs w-full focus:outline-emerald-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55 border-b border-slate-150 text-slate-500 font-bold uppercase text-[9px]">
                  <th className="py-2.5 px-4">TXN Code</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Ledger Statement</th>
                  <th className="py-2.5 px-4 text-right">Corporate Balance (MYR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                      No matching transaction journals found.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500 font-bold">
                        {tx.id}
                      </td>
                      <td className="py-3 px-4 text-slate-950 font-semibold">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] ${
                          tx.type === 'Income' ? 'bg-emerald-50 text-emerald-850 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 leading-snug">{tx.description}</p>
                        <span className="text-[9px] text-slate-400 font-mono">Date: {tx.date} | Currency: {tx.currency} | Ref: {tx.referenceId}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono font-extrabold ${tx.type === 'Income' ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {tx.type === 'Income' ? '+' : '-'} MYR {tx.amount.toLocaleString()}
                        </span>
                        {tx.currency !== 'MYR' && (
                          <span className="text-[8px] text-slate-400 block">
                            ({tx.currency} {tx.amountOriginalCurrency.toLocaleString()})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
