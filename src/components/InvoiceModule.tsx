import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  CreditCard, 
  DollarSign, 
  Sparkles, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download, 
  Eye, 
  X,
  RefreshCw 
} from 'lucide-react';
import { InvoiceItemModel, Language } from '../types';
import { TRANSLATIONS } from '../Translations';

interface InvoiceModuleProps {
  invoices: InvoiceItemModel[];
  lang: Language;
  onUpdateInvoicePayment: (id: string, paidAmount: number, paymentStatus: 'Unpaid' | 'Partial' | 'Paid') => Promise<void>;
}

export default function InvoiceModule({
  invoices,
  lang,
  onUpdateInvoicePayment
}: InvoiceModuleProps) {
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItemModel | null>(null);
  
  // Payment adjustment states
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [inputPaid, setInputPaid] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'Unpaid' | 'Partial' | 'Paid'>('Unpaid');

  const handleInvoiceClick = (invoice: InvoiceItemModel) => {
    setSelectedInvoice(invoice);
    setInputPaid(invoice.paidAmount);
    setPaymentStatus(invoice.paymentStatus);
    setIsUpdatingPayment(false);
  };

  const handleUpdatePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    
    await onUpdateInvoicePayment(selectedInvoice.id, inputPaid, paymentStatus);
    
    // Refresh modal
    const updated = { 
      ...selectedInvoice, 
      paidAmount: inputPaid,
      paymentStatus: paymentStatus
    };
    setSelectedInvoice(updated);
    setIsUpdatingPayment(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          inv.id.toLowerCase().includes(search.toLowerCase()) || 
                          inv.bookingId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : inv.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{t('invoices')}</h2>
          <p className="text-xs text-slate-500">Corporate client invoices are automatically rendered here when booking status transitions to "Confirmed".</p>
        </div>
        <div className="flex bg-amber-50 rounded-xl px-3.5 py-1.5 items-center gap-2 border border-amber-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span className="text-[10px] uppercase font-bold text-amber-850">Dynamic Sync Enabled</span>
        </div>
      </div>

      {/* Main List & View layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Invoices List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search Invoice ID, name, or booking reference..."
                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-emerald-800"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3  py-2 text-xs font-semibold focus:outline-emerald-800 self-stretch sm:self-auto"
            >
              <option value="All">All Payments ({invoices.length})</option>
              <option value="Paid">🟢 Paid Only</option>
              <option value="Partial">🟡 Partially Paid</option>
              <option value="Unpaid">🔴 Unpaid Only</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-6">Invoice ID</th>
                    <th className="py-4 px-6">Customer & Reference</th>
                    <th className="py-4 px-6 text-right">Grand Total (Tax Included)</th>
                    <th className="py-4 px-6 text-center">Settlement Status</th>
                    <th className="py-4 px-6 text-right">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs text-slate-800">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                        {t('noRecords')}
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => (
                      <tr 
                        key={inv.id} 
                        onClick={() => handleInvoiceClick(inv)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedInvoice?.id === inv.id ? "bg-emerald-50/30 font-semibold" : ""}`}
                      >
                        <td className="py-4 px-6 font-mono font-bold text-slate-900">
                          {inv.id}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-extrabold text-slate-900 text-sm block">{inv.customerName}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Ref: {inv.bookingId} | Due: {inv.dueDate}</span>
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-slate-950">
                          {inv.currency} {inv.grandTotal.toLocaleString()}
                          <span className="text-[9px] text-slate-400 block font-normal">Paid: {inv.currency} {inv.paidAmount.toLocaleString()}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center">
                            {inv.paymentStatus === 'Paid' && (
                              <span className="bg-emerald-50 border border-emerald-200 text-emerald-850 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[pulse_1.5s_infinite]" />
                                {t('paid')}
                              </span>
                            )}
                            {inv.paymentStatus === 'Partial' && (
                              <span className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                {t('partial')}
                              </span>
                            )}
                            {inv.paymentStatus === 'Unpaid' && (
                              <span className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                {t('unpaid')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button className="bg-slate-100 p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-800 hover:text-white hover:border-emerald-700 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Detailed View & Action Desk */}
        <div className="lg:col-span-1">
          {selectedInvoice ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm relative overflow-hidden">
              
              {/* Card Ribbon */}
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-800 via-emerald-950 to-amber-500" />

              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Selected Ledger</span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">{selectedInvoice.id}</h3>
                </div>
                <button 
                  onClick={() => setSelectedInvoice(null)} 
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase">{t('paymentStatus')}</span>
                  <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-md ${
                    selectedInvoice.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-850' : 
                    selectedInvoice.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-805' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {selectedInvoice.paymentStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-200/50">
                  <div>
                    <span className="text-slate-400">Total Charged:</span>
                    <p className="font-extrabold text-slate-950 text-sm">{selectedInvoice.currency} {selectedInvoice.grandTotal.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Collected:</span>
                    <p className="font-extrabold text-emerald-800 text-sm">{selectedInvoice.currency} {selectedInvoice.paidAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Printable PDF Preview Block */}
              <div id="printable_invoice_area" className="border border-slate-200 rounded-xl p-4 bg-slate-50 font-sans shadow-inner space-y-4 text-[10px]">
                <div className="border-b border-slate-300 pb-3 flex justify-between items-center font-mono">
                  <div>
                    <span className="font-black text-xs text-emerald-950 block">AEROSTAR ALLIANCE</span>
                    <span className="text-[8px] text-slate-400 block leading-tight">M.A. TOUR & TRAVELS SDN BHD</span>
                    <span className="text-[8px] text-slate-400 block leading-tight"> Kuala Lumpur, Malaysia</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black block text-slate-900">INVOICE PREVIEW</span>
                    <span className="text-[8px] text-slate-400 block">Date: {selectedInvoice.createdAt.split('T')[0]}</span>
                    <span className="text-[8px] text-slate-400 block">Due Date: {selectedInvoice.dueDate}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-slate-400 uppercase tracking-wide block">Billed To:</span>
                  <p className="font-extrabold text-slate-950 text-xs">{selectedInvoice.customerName}</p>
                  <p className="text-slate-500">{selectedInvoice.customerEmail}</p>
                  <p className="text-[8px] text-slate-400 font-mono">Booking Base Ref: {selectedInvoice.bookingId}</p>
                </div>

                <div className="border-t border-b border-slate-300 py-2 space-y-1">
                  <div className="grid grid-cols-5 font-bold text-slate-400 text-[8px] uppercase tracking-wider pb-1">
                    <span className="col-span-3">Item Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Subtotal</span>
                  </div>
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-5 text-slate-700 py-1 border-t border-slate-100 font-mono">
                      <span className="col-span-3 leading-tight font-sans text-slate-900">{item.description}</span>
                      <span className="text-right font-medium">{item.quantity}</span>
                      <span className="text-right font-bold text-slate-950">{selectedInvoice.currency} {item.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 font-mono text-[9px] text-slate-700 flex flex-col items-end">
                  <div className="flex justify-between w-44">
                    <span>Subtotal:</span>
                    <span className="font-bold">{selectedInvoice.currency} {selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-44">
                    <span>Tax ({selectedInvoice.taxPercentage}%):</span>
                    <span className="font-bold">+{selectedInvoice.currency} {selectedInvoice.taxAmount.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.discountAmount > 0 && (
                    <div className="flex justify-between w-44 text-emerald-800 font-extrabold">
                      <span>Discount (Promo):</span>
                      <span>-{selectedInvoice.currency} {selectedInvoice.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between w-44 text-slate-950 font-black border-t border-slate-300 pt-1 text-xs">
                    <span>Grand Total:</span>
                    <span>{selectedInvoice.currency} {selectedInvoice.grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-center text-[7px] text-slate-400 pt-3 border-t border-slate-300 italic font-mono">
                  Thank you for trust Aerostar Alliance as your official Umrah pilgrims ground operator partner
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {t('exportPrint')}
                  </button>
                  <button
                    onClick={() => setIsUpdatingPayment(!isUpdatingPayment)}
                    className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold p-2.5 rounded-xl text-xs flex items-center justify-center shadow-md cursor-pointer"
                    title="Process payment logs"
                  >
                    <CreditCard className="w-4 h-4" />
                  </button>
                </div>

                {isUpdatingPayment && (
                  <form onSubmit={handleUpdatePaymentSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                    <h4 className="text-xs font-bold text-slate-900">Process/Log Client Settlement Payout</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Settlement Currency Amount Log</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 font-bold text-slate-400 text-xs">{selectedInvoice.currency}</span>
                          <input
                            type="number"
                            value={inputPaid}
                            onChange={e => setInputPaid(Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg p-1.5 pl-10 text-xs font-bold font-mono focus:outline-emerald-800 w-full"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Updated Payment Status</label>
                        <select
                          value={paymentStatus}
                          onChange={e => setPaymentStatus(e.target.value as any)}
                          className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold focus:outline-emerald-800 w-full"
                        >
                          <option value="Unpaid">🔴 Unpaid Ledger</option>
                          <option value="Partial">🟡 Partial / Installments Deposit</option>
                          <option value="Paid">🟢 Fully Paid Settled</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsUpdatingPayment(false)}
                        className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-[10px] font-bold text-slate-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
                      >
                        Record Deposit Ledger
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-slate-100 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-semibold">Select an invoice from the ledger table to audit, print receipts or document payments.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
