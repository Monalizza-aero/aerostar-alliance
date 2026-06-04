import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Award, 
  MapPin, 
  DollarSign, 
  Layers, 
  Send, 
  Search, 
  TrendingUp, 
  Activity, 
  UserPlus, 
  Briefcase 
} from 'lucide-react';
import { B2BPartner, Language } from '../types';
import { TRANSLATIONS } from '../Translations';

interface B2BModuleProps {
  partners: B2BPartner[];
  lang: Language;
  onAddPartner: (partner: Partial<B2BPartner>) => Promise<void>;
  onSimulateB2BBooking: (bookingData: any) => Promise<void>;
}

export default function B2BModule({
  partners,
  lang,
  onAddPartner,
  onSimulateB2BBooking
}: B2BModuleProps) {
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  const [search, setSearch] = useState('');
  const [showAddPartnerForm, setShowAddPartnerForm] = useState(false);
  const [showSimulateDesk, setShowSimulateDesk] = useState(false);

  // New Partner State
  const [partnerForm, setPartnerForm] = useState<Partial<B2BPartner>>({
    companyName: '',
    country: 'Indonesia',
    contactName: '',
    phone: '',
    email: '',
    commissionRate: 7,
    contractStatus: 'Active',
    notes: ''
  });

  // B2B Simulated Booking State
  const [b2bBookingForm, setB2bBookingForm] = useState({
    b2bAgentId: '',
    customerName: '',
    paxCount: 15,
    packageName: 'Standard Ekonomi Umrah 1447H',
    currency: 'MYR' as 'MYR' | 'IDR' | 'SGD' | 'SAR',
    totalAmount: 105000, // 15 pax * 7000 MYR
    notes: 'Urgent B2B simulated request.'
  });

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.companyName || !partnerForm.email) {
      alert("Please provide the company name and booking contact email.");
      return;
    }
    await onAddPartner(partnerForm);
    setShowAddPartnerForm(false);
    setPartnerForm({
      companyName: '',
      country: 'Indonesia',
      contactName: '',
      phone: '',
      email: '',
      commissionRate: 7,
      contractStatus: 'Active',
      notes: ''
    });
  };

  const handleSimulatedBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!b2bBookingForm.b2bAgentId || !b2bBookingForm.customerName) {
      alert("Please select simulating agency and client name.");
      return;
    }
    
    // Auto compute total cost based on simple pricing
    const pricePerPax = b2bBookingForm.packageName.includes('Premium') ? 9500 : 7000;
    const computedTotal = pricePerPax * b2bBookingForm.paxCount;

    const chosenPartner = partners.find(p => p.id === b2bBookingForm.b2bAgentId);

    const bFormatted = {
      customerName: b2bBookingForm.customerName,
      customerPhone: chosenPartner?.phone || "+60 123",
      customerEmail: chosenPartner?.email || "b2b@agency.com",
      bookingType: 'Umrah Package' as const,
      packageName: b2bBookingForm.packageName,
      paxCount: b2bBookingForm.paxCount,
      travelDateFrom: '2026-11-20',
      travelDateTo: '2026-11-30',
      currency: b2bBookingForm.currency,
      totalAmount: computedTotal,
      bookingStatus: 'Confirmed' as const, // auto trigger invoice & ledger logic
      hotelMakkah: 'Swissôtel Makkah',
      hotelMadinah: 'Anwar Al Madinah Mövenpick',
      transportType: 'Haramain Coach Mercedes Bus',
      extraServices: ['Ziyarah Historical Guide'],
      b2bAgentId: b2bBookingForm.b2bAgentId,
      b2bAgentName: chosenPartner?.companyName || null,
      supplierCostMYR: Math.round(computedTotal * 0.7),
      notes: b2bBookingForm.notes
    };

    await onSimulateB2BBooking(bFormatted);
    setShowSimulateDesk(false);
    
    // reset form
    setB2bBookingForm({
      b2bAgentId: '',
      customerName: '',
      paxCount: 15,
      packageName: 'Standard Ekonomi Umrah 1447H',
      currency: 'MYR',
      totalAmount: 105000,
      notes: 'B2B automatic simulated request.'
    });
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.companyName.toLowerCase().includes(search.toLowerCase()) || 
                          p.contactName.toLowerCase().includes(search.toLowerCase()) || 
                          p.country.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const bestPerformer = partners.reduce((prev, current) => {
    return (prev.totalBookingsCount > current.totalBookingsCount) ? prev : current;
  }, partners[0] || {} as B2BPartner);

  return (
    <div className="space-y-6">
      
      {/* Header Desk */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{t('partners')}</h2>
          <p className="text-xs text-slate-500">Coordinate regional commissions partnerships in Malaysia, Singapore, Saudi Arabia, and Indonesia.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSimulateDesk(!showSimulateDesk)}
            className="bg-amber-500 hover:bg-amber-600 text-emerald-950 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            Simulate B2B Agent Request
          </button>
          <button
            onClick={() => setShowAddPartnerForm(!showAddPartnerForm)}
            className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            New Partnership
          </button>
        </div>
      </div>

      {/* KPI Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Active Agency Alliances</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">{partners.length} Tour Operators</span>
            <span className="text-[10px] text-slate-500 block">Covering Southeast Asia region</span>
          </div>
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-150 text-slate-700 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl p-5 border border-emerald-800 shadow-sm text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-300 block tracking-wider">Top Performing Affiliate</span>
            <span className="text-lg font-black text-white block mt-1 truncate max-w-[200px]">
              {bestPerformer.companyName || "N/A"}
            </span>
            <span className="text-[10px] text-amber-300 font-semibold block mt-0.5">
              ⭐ {bestPerformer.totalBookingsCount || 0} Bookings Dispatched
            </span>
          </div>
          <div className="bg-emerald-850 p-3 rounded-xl border border-emerald-700 text-amber-400 shrink-0">
            <Award className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Commissions Released</span>
            <span className="text-2xl font-black text-emerald-800 block mt-1">
              MYR {partners.reduce((sum, p) => sum + p.totalEarnedCommissionsMYR, 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block">Standardized payouts under agreements</span>
          </div>
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Forms Drawer for simulating booking */}
      {showSimulateDesk && (
        <form onSubmit={handleSimulatedBookingSubmit} className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <h3 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-700-600" />
            B2B Simulation Desk: Submit Booking Request as Regional Partner
          </h3>
          <p className="text-xs text-amber-800 max-w-3xl leading-relaxed">
            By submitting a booking through this interactive simulator, your regional B2B travel affiliate initiates a block Umrah allocation. If confirmed automatically, it triggers an instant synchronized system invoice and allocates their custom commission.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-amber-900 uppercase">Partner Agency Selector</label>
              <select
                value={b2bBookingForm.b2bAgentId}
                onChange={e => setB2bBookingForm({ ...b2bBookingForm, b2bAgentId: e.target.value })}
                required
                className="bg-white border border-amber-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-emerald-800 focus:outline-none font-bold w-full"
              >
                <option value="">-- Choose Affiliate --</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.companyName} ({p.country} - {p.commissionRate}%)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-amber-900 uppercase">Simulated Client / Group Leader Name</label>
              <input
                type="text"
                value={b2bBookingForm.customerName}
                onChange={e => setB2bBookingForm({ ...b2bBookingForm, customerName: e.target.value })}
                placeholder="e.g. Haji Joko Widodo Group"
                required
                className="bg-white border border-amber-200 rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-800 w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-amber-900 uppercase">Travelers Count (Pax)</label>
              <input
                type="number"
                value={b2bBookingForm.paxCount}
                onChange={e => setB2bBookingForm({ ...b2bBookingForm, paxCount: Number(e.target.value) })}
                min="1"
                required
                className="bg-white border border-amber-200 rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-800 w-full font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-amber-900 uppercase">Choose Umrah Package Tier</label>
              <select
                value={b2bBookingForm.packageName}
                onChange={e => setB2bBookingForm({ ...b2bBookingForm, packageName: e.target.value })}
                className="bg-white border border-amber-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-emerald-800 focus:outline-none w-full font-semibold"
              >
                <option value="Premium Royal Umrah 1447H">Premium Royal Umrah (MYR 9,500/Pax)</option>
                <option value="Standard Ekonomi Umrah 1447H">Standard Ekonomi Umrah (MYR 7,000/Pax)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-amber-900 uppercase">Flight / Special Request Details</label>
            <input
              type="text"
              value={b2bBookingForm.notes}
              onChange={e => setB2bBookingForm({ ...b2bBookingForm, notes: e.target.value })}
              placeholder="e.g. Garuda flight GA-980 or separate hotel wings requested..."
              className="bg-white border border-amber-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-emerald-800 w-full"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSimulateDesk(false)}
              className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-5 rounded-lg text-xs shadow-xs cursor-pointer"
            >
              Simulate & Confirm Alliance Booking!
            </button>
          </div>
        </form>
      )}

      {/* New Partner Form Drawer */}
      {showAddPartnerForm && (
        <form onSubmit={handleCreatePartner} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-800" />
            Establish B2B Commission Agreement Contract
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Affiliate Corporate Name</label>
              <input
                type="text"
                value={partnerForm.companyName}
                onChange={e => setPartnerForm({ ...partnerForm, companyName: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="Nusantara Umrah Services"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Operations HQ Location</label>
              <select
                value={partnerForm.country}
                onChange={e => setPartnerForm({ ...partnerForm, country: e.target.value as any })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
              >
                <option value="Malaysia">Malaysia</option>
                <option value="Indonesia">Indonesia</option>
                <option value="Singapore">Singapore</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Key Operations Contact Person</label>
              <input
                type="text"
                value={partnerForm.contactName}
                onChange={e => setPartnerForm({ ...partnerForm, contactName: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="Haji Bambang Triyono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Email</label>
              <input
                type="email"
                value={partnerForm.email}
                onChange={e => setPartnerForm({ ...partnerForm, email: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="ops@affiliate.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Phone / Whatsapp</label>
              <input
                type="text"
                value={partnerForm.phone}
                onChange={e => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="+62 21-555"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Agreed Commission Rate (%)</label>
              <input
                type="number"
                value={partnerForm.commissionRate}
                onChange={e => setPartnerForm({ ...partnerForm, commissionRate: Number(e.target.value) })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 font-bold w-full"
                placeholder="e.g. 5"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Special Operational Scope</label>
            <input
              type="text"
              value={partnerForm.notes}
              onChange={e => setPartnerForm({ ...partnerForm, notes: e.target.value })}
              placeholder="e.g. Primary partner for Central Java. Handles outbound flights."
              className="bg-white border border-slate-200 rounded-xl p-2.1 text-xs focus:outline-emerald-800 w-full"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddPartnerForm(false)}
              className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-600 block cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2 px-5 rounded-lg text-xs block cursor-pointer"
            >
              Record Contract Agreement
            </button>
          </div>
        </form>
      )}

      {/* Partners List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Affiliated B2B Agencies Register</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter company, country, person..."
              className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs w-full focus:outline-emerald-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Affiliate ID</th>
                <th className="py-4 px-6">Company & HQ</th>
                <th className="py-4 px-6">Agreement Contacts</th>
                <th className="py-4 px-6 text-center">Comm. Rate</th>
                <th className="py-4 px-6 text-center">Dispatched Bookings</th>
                <th className="py-4 px-6 text-right">Released Comm. (MYR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs text-slate-800">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    {t('noRecords')}
                  </td>
                </tr>
              ) : (
                filteredPartners.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-500">
                      {p.id}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-extrabold text-slate-900 text-sm block">{p.companyName}</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm font-black border border-emerald-100 uppercase inline-block mt-1">
                        {p.country}
                      </span>
                      {p.notes && (
                        <p className="text-[10px] text-slate-400 italic mt-1 leading-tight">{p.notes}</p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-800 block flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-emerald-800 shrink-0" /> {p.contactName}
                      </span>
                      <span className="text-[10px] text-slate-450 block mt-0.5">{p.email} | {p.phone}</span>
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-bold text-slate-900">
                      {p.commissionRate}%
                    </td>
                    <td className="py-4 px-6 text-center font-bold">
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-extrabold">
                        {p.totalBookingsCount} Bookings
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-emerald-800">
                      MYR {p.totalEarnedCommissionsMYR.toLocaleString()}
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
