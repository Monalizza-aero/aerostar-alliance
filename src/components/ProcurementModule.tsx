import React, { useState } from 'react';
import { 
  Building, 
  Plus, 
  MapPin, 
  DollarSign, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  HelpCircle, 
  Bus, 
  ShieldCheck 
} from 'lucide-react';
import { Supplier, Language } from '../types';
import { TRANSLATIONS } from '../Translations';

interface ProcurementModuleProps {
  suppliers: Supplier[];
  lang: Language;
  onAddSupplier: (supplier: Partial<Supplier>) => Promise<void>;
  onPaySupplier: (id: string, payAmount: number, description: string) => Promise<void>;
}

export default function ProcurementModule({
  suppliers,
  lang,
  onAddSupplier,
  onPaySupplier
}: ProcurementModuleProps) {
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPaySupplier, setSelectedPaySupplier] = useState<Supplier | null>(null);

  // Form states
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({
    name: '',
    category: 'Hotel',
    contactPerson: '',
    phone: '',
    email: '',
    country: 'Saudi Arabia',
    outstandingPaymentMYR: 0,
    paymentStatus: 'Clear',
    notes: ''
  });

  const [payAmount, setPayAmount] = useState<number>(5000);
  const [payReason, setPayReason] = useState<string>('');

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.contactPerson) {
      alert("Please provide procurement vendor company name and contact person.");
      return;
    }
    
    const formatted = {
      ...supplierForm,
      paymentStatus: Number(supplierForm.outstandingPaymentMYR || 0) > 0 ? "Pending Balance" : "Clear" as any
    };

    await onAddSupplier(formatted);
    setShowAddForm(false);
    setSupplierForm({
      name: '',
      category: 'Hotel',
      contactPerson: '',
      phone: '',
      email: '',
      country: 'Saudi Arabia',
      outstandingPaymentMYR: 0,
      paymentStatus: 'Clear',
      notes: ''
    });
  };

  const handlePayDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaySupplier) return;
    if (payAmount <= 0) {
      alert("Provide a valid positive money amount to disburse.");
      return;
    }

    const desc = payReason.trim() || `Disbursement check of MYR ${payAmount} sent to ${selectedPaySupplier.name}`;
    await onPaySupplier(selectedPaySupplier.id, payAmount, desc);
    setSelectedPaySupplier(null);
    setPayReason('');
    setPayAmount(5000);
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.category.toLowerCase().includes(search.toLowerCase()) || 
                          s.contactPerson.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const totalDebts = suppliers.reduce((sum, s) => sum + s.outstandingPaymentMYR, 0);

  return (
    <div className="space-y-6">
      
      {/* Header desk */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{t('suppliers')}</h2>
          <p className="text-xs text-slate-500">Procure lodging block options and transport contracts from Makkah/Madinah vendors.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('addSupplier')}
        </button>
      </div>

      {/* Debt indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Contract Suppliers</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">{suppliers.length} Vendors Registered</span>
            <span className="text-[10px] text-slate-500 block">Hotels, fleets & visa Muassasah partners</span>
          </div>
          <div className="bg-slate-100 p-3 rounded-xl text-slate-700 shrink-0">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-900 to-rose-950 rounded-2xl p-5 border border-rose-800 shadow-sm text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-300 block tracking-wider">{t('outstandingDebt')}</span>
            <span className="text-2xl font-black text-white block mt-1">
              MYR {totalDebts.toLocaleString()}
            </span>
            <span className="text-[10px] text-rose-300 block mt-0.5">Accounts payable backlog needing settlements</span>
          </div>
          <div className="bg-rose-850 text-rose-400 p-3 rounded-xl border border-rose-700 shrink-0 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Default Settlement Region</span>
            <span className="text-2xl font-black text-emerald-800 block mt-1">Saudi Arabia (SAR)</span>
            <span className="text-[10px] text-slate-500 block">Direct bank transfers to Arab National Bank</span>
          </div>
          <div className="bg-emerald-50 text-emerald-705 p-3 rounded-xl border border-emerald-100 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Supplier Register Add Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateSupplier} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-800" />
            Establish Procurement Supplier Contract Link
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Supplier Company Name</label>
              <input
                type="text"
                value={supplierForm.name}
                onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="e.g. Swissôtel Makkah"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Logistics Category</label>
              <select
                value={supplierForm.category}
                onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value as any })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
              >
                <option value="Hotel">Hotel & Lodging Blocks</option>
                <option value="Transportation">Transportation & GMC Coach Fleets</option>
                <option value="Catering">Food & Pilgrim Field Buffet Catering</option>
                <option value="Visa/Ground">Visa Clearances & Saudi Ground Muassasah</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Vendor Key Spokesperson</label>
              <input
                type="text"
                value={supplierForm.contactPerson}
                onChange={e => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="Haji Radhi Al-Mihrab"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Spokesman Email Address</label>
              <input
                type="email"
                value={supplierForm.email}
                onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="reservations@hotelmakkah.sa"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Whatsapp/Phone Contacts</label>
              <input
                type="text"
                value={supplierForm.phone}
                onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="+966 50-000-0000"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Outstanding Initial Debts (MYR)</label>
              <input
                type="number"
                value={supplierForm.outstandingPaymentMYR}
                onChange={e => setSupplierForm({ ...supplierForm, outstandingPaymentMYR: Number(e.target.value) })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 font-bold w-full"
                placeholder="Initial allocation cost lock"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Operating Country Location</label>
              <select
                value={supplierForm.country}
                onChange={e => setSupplierForm({ ...supplierForm, country: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
              >
                <option value="Saudi Arabia">Saudi Arabia (KSA)</option>
                <option value="Malaysia">Malaysia (MY)</option>
                <option value="Jordan">Jordan (JOR)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Special Contract Arrangement Notes</label>
              <input
                type="text"
                value={supplierForm.notes}
                onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl p-2.1 text-xs focus:outline-emerald-800 w-full"
                placeholder="Includes suite upgrades, VIP check-in lines..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2 px-5 rounded-lg text-xs cursor-pointer"
            >
              Log Supplier Contract
            </button>
          </div>
        </form>
      )}

      {/* Pay Supplier Modal Overlay or Section */}
      {selectedPaySupplier && (
        <form onSubmit={handlePayDispatchSubmit} className="bg-rose-50/50 border border-rose-200 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-rose-950 text-sm flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-rose-700" />
              Dispatch Treasury Cash Settlement to {selectedPaySupplier.name}
            </h3>
            <button 
              type="button" 
              onClick={() => setSelectedPaySupplier(null)} 
              className="text-rose-900 font-bold hover:text-red-750"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-rose-900 uppercase">Cash Amount to Send (MYR)</label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(Number(e.target.value))}
                max={selectedPaySupplier.outstandingPaymentMYR}
                min="1"
                required
                className="bg-white border border-rose-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-rose-600 focus:outline-none font-bold w-full text-rose-950 font-mono"
              />
              <span className="text-[9px] text-rose-800 block mt-1">Maximum Outstanding: MYR {selectedPaySupplier.outstandingPaymentMYR.toLocaleString()}</span>
            </div>
            <div>
              <label className="text-[10px] font-bold text-rose-900 uppercase">Treasury / Voucher Reference Details</label>
              <input
                type="text"
                value={payReason}
                onChange={e => setPayReason(e.target.value)}
                placeholder="e.g. Bank wire ref: ANB-99824 - Makkah check-in batch lock"
                required
                className="bg-white border border-rose-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-600 w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSelectedPaySupplier(null)}
              className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-650 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-rose-800 hover:bg-rose-950 text-white font-extrabold py-2 px-5 rounded-lg text-xs shadow-xs cursor-pointer"
            >
              Authorize & Wire Payout!
            </button>
          </div>
        </form>
      )}

      {/* Supplier List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Saudi Ground Handling & Hotel Partnerships</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search hotels, transport codes..."
              className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs w-full focus:outline-emerald-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Procurement Vendor</th>
                <th className="py-4 px-6">Operations Category</th>
                <th className="py-4 px-6">Direct Spokesperson Contacts</th>
                <th className="py-4 px-6">Country</th>
                <th className="py-4 px-6 text-right">Outstanding Debt (MYR)</th>
                <th className="py-4 px-6 text-right">Settlement Desk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs text-slate-800">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    {t('noRecords')}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-extrabold text-slate-900 text-sm block">{s.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">Supplier ID: {s.id}</span>
                      {s.notes && (
                        <p className="text-[10px] text-slate-400 italic mt-1 leading-normal">
                          Contract Scope: {s.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 text-slate-705 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-800 block">{s.contactPerson}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{s.email} | {s.phone}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block">
                        📍 {s.country}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-rose-750">
                      MYR {s.outstandingPaymentMYR.toLocaleString()}
                      {s.outstandingPaymentMYR > 0 ? (
                        <span className="text-[8px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-sm block mt-1 border border-rose-105 uppercase text-center max-w-[100px] ml-auto">Pending Pay</span>
                      ) : (
                        <span className="text-[8px] bg-emerald-50 text-emerald-850 px-1.5 py-0.5 rounded-sm block mt-1 border border-emerald-100 uppercase text-center max-w-[100px] ml-auto">Outstanding Cleared</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {s.outstandingPaymentMYR > 0 ? (
                        <button
                          onClick={() => { setSelectedPaySupplier(s); setPayAmount(s.outstandingPaymentMYR); }}
                          className="bg-rose-50 text-rose-705 border border-rose-220 hover:bg-rose-800 hover:text-white hover:border-rose-750 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 inline-block"
                        >
                          Send Wire Pay <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                          Clear Balance ✔
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
  );
}
