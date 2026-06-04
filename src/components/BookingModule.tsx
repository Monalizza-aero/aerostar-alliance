import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Check, 
  AlertTriangle, 
  Plane, 
  Building, 
  PlusCircle, 
  FileText, 
  Calendar, 
  User, 
  CheckCircle2, 
  MapPin, 
  DollarSign 
} from 'lucide-react';
import { BookingItem, B2BPartner, Supplier, Language } from '../types';
import { TRANSLATIONS } from '../Translations';

interface BookingModuleProps {
  bookings: BookingItem[];
  partners: B2BPartner[];
  suppliers: Supplier[];
  lang: Language;
  onSaveBooking: (booking: Partial<BookingItem>, id?: string) => Promise<void>;
  onDeleteBooking: (id: string) => Promise<void>;
  currentUserEmail: string;
  currentUserName: string;
}

const PACKAGE_TEMPLATES = [
  { name: "Premium Royal Umrah 1447H", baseCostMYR: 9500 },
  { name: "Standard Ekonomi Umrah 1447H", baseCostMYR: 7000 },
  { name: "Custom Executive Umrah Package", baseCostMYR: 15000 },
  { name: "Historical Jordan & Saudi Tour", baseCostMYR: 12000 }
];

export default function BookingModule({
  bookings,
  partners,
  suppliers,
  lang,
  onSaveBooking,
  onDeleteBooking,
  currentUserEmail,
  currentUserName
}: BookingModuleProps) {
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  // Search/Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<Partial<BookingItem>>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    bookingType: 'Umrah Package',
    packageName: PACKAGE_TEMPLATES[0].name,
    paxCount: 1,
    travelDateFrom: new Date().toISOString().split('T')[0],
    travelDateTo: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'MYR',
    totalAmount: PACKAGE_TEMPLATES[0].baseCostMYR,
    bookingStatus: 'Draft',
    hotelMakkah: 'Pullman Zamzam Makkah',
    hotelMadinah: 'Anwar Al Madinah Mövenpick',
    transportType: 'Haramain High Speed Train (Business Class)',
    extraServices: [],
    b2bAgentId: '',
    b2bAgentName: '',
    supplierCostMYR: 5000,
    supplierId: '',
    notes: ''
  });

  const [inputService, setInputService] = useState('');

  const handleAddNewClick = () => {
    setIsEditing(true);
    setEditId(undefined);
    setForm({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      bookingType: 'Umrah Package',
      packageName: PACKAGE_TEMPLATES[0].name,
      paxCount: 2,
      travelDateFrom: new Date().toISOString().split('T')[0],
      travelDateTo: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'MYR',
      totalAmount: PACKAGE_TEMPLATES[0].baseCostMYR * 2,
      bookingStatus: 'Draft',
      hotelMakkah: 'Pullman Zamzam Makkah',
      hotelMadinah: 'Anwar Al Madinah Mövenpick',
      transportType: 'Haramain High Speed Train (Business Class)',
      extraServices: ['Ziyarah Tours Makkah', 'Ziyarah Tours Madinah'],
      b2bAgentId: '',
      b2bAgentName: '',
      supplierCostMYR: 5000 * 2,
      supplierId: suppliers[0]?.id || '',
      notes: ''
    });
  };

  const handleEditClick = (b: BookingItem) => {
    setIsEditing(true);
    setEditId(b.id);
    setForm({ ...b });
  };

  const handlePackageChange = (name: string) => {
    const template = PACKAGE_TEMPLATES.find(p => p.name === name);
    if (template) {
      const pax = form.paxCount || 1;
      setForm(prev => ({
        ...prev,
        packageName: name,
        totalAmount: template.baseCostMYR * pax,
        supplierCostMYR: Math.round(template.baseCostMYR * 0.7 * pax)
      }));
    }
  };

  const handlePaxChange = (count: number) => {
    const pax = Math.max(1, count);
    const template = PACKAGE_TEMPLATES.find(p => p.name === form.packageName);
    const baseCost = template ? template.baseCostMYR : 5000;
    setForm(prev => ({
      ...prev,
      paxCount: pax,
      totalAmount: baseCost * pax,
      supplierCostMYR: Math.round(baseCost * 0.7 * pax)
    }));
  };

  const handleAddService = () => {
    if (inputService.trim() && !form.extraServices?.includes(inputService.trim())) {
      setForm(prev => ({
        ...prev,
        extraServices: [...(prev.extraServices || []), inputService.trim()]
      }));
      setInputService('');
    }
  };

  const handleRemoveService = (srv: string) => {
    setForm(prev => ({
      ...prev,
      extraServices: prev.extraServices?.filter(s => s !== srv) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto populate partner agents
    let finalForm = { ...form };
    if (finalForm.b2bAgentId) {
      const partner = partners.find(p => p.id === finalForm.b2bAgentId);
      if (partner) {
        finalForm.b2bAgentName = partner.companyName;
      }
    } else {
      finalForm.b2bAgentName = null;
      finalForm.b2bAgentId = null;
    }

    await onSaveBooking(finalForm, editId);
    setIsEditing(false);
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          b.packageName.toLowerCase().includes(search.toLowerCase()) || mMatches(b.id, search);
    const matchesStatus = statusFilter === 'All' ? true : b.bookingStatus === statusFilter;
    const matchesType = typeFilter === 'All' ? true : b.bookingType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  function mMatches(id: string, q: string) {
    return id.toLowerCase().includes(q.toLowerCase());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{t('bookings')}</h2>
          <p className="text-xs text-slate-500">Create, manage and dispatch corporate Umrah & custom tours reservations</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleAddNewClick}
            className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('addBooking')}
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 animate-in slide-in-from-top-4 duration-200">
          <div className="border-b border-slate-150 pb-3 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-800" />
              {editId ? `Modify Booking ${editId}` : t('createBooking')}
            </h3>
            <span className="text-[10px] uppercase font-bold text-slate-400">Section 1447H Standardizer</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Customer Details */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-800" /> Customer Information
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Customer Name / Roster Leader</label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={e => setForm({ ...form, customerName: e.target.value })}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-800 focus:outline-none"
                    placeholder="Haji Mohd Shah"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Phone</label>
                  <input
                    type="text"
                    value={form.customerPhone}
                    onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-800 focus:outline-none"
                    placeholder="+60 12-345 6789"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Email</label>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={e => setForm({ ...form, customerEmail: e.target.value })}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-800 focus:outline-none"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Travel Packages & Dates */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <Plane className="w-3.5 h-3.5 text-emerald-800" /> Package & Logistics
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Booking Service Module</label>
                  <select
                    value={form.bookingType}
                    onChange={e => setForm({ ...form, bookingType: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-800 focus:outline-none font-semibold"
                  >
                    <option value="Umrah Package">Umrah Package (Packages + Hotels + Transport)</option>
                    <option value="Private Tour">Private Tour / Customized Leisure</option>
                    <option value="Hotel + Transport">Hotel Accommodation & Transport Only</option>
                  </select>
                </div>
                {form.bookingType === 'Umrah Package' ? (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Accredited Package Tiers</label>
                    <select
                      value={form.packageName}
                      onChange={e => handlePackageChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 font-semibold"
                    >
                      {PACKAGE_TEMPLATES.map(p => (
                        <option key={p.name} value={p.name}>{p.name} - (Base MYR {p.baseCostMYR})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Custom Target Name</label>
                    <input
                      type="text"
                      value={form.packageName}
                      onChange={e => setForm({ ...form, packageName: e.target.value })}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800"
                      placeholder="e.g. VIP Singapore Corporate Retreat"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Travel From</label>
                    <input
                      type="date"
                      value={form.travelDateFrom}
                      onChange={e => setForm({ ...form, travelDateFrom: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Travel To</label>
                    <input
                      type="date"
                      value={form.travelDateTo}
                      onChange={e => setForm({ ...form, travelDateTo: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Saudi Lodging venues & Supplier Pricing */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-emerald-800" /> Accommodation & B2B Links
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Hotel Makkah</label>
                    <input
                      type="text"
                      value={form.hotelMakkah}
                      onChange={e => setForm({ ...form, hotelMakkah: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800"
                      placeholder="Swissôtel / Pullman"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Hotel Madinah</label>
                    <input
                      type="text"
                      value={form.hotelMadinah}
                      onChange={e => setForm({ ...form, hotelMadinah: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800"
                      placeholder="Anwar Al Madinah Mövenpick"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">B2B Partner Agent (Optional)</label>
                  <select
                    value={form.b2bAgentId || ""}
                    onChange={e => setForm({ ...form, b2bAgentId: e.target.value || null })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800"
                  >
                    <option value="">Direct Corporate B2C Client</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.companyName} ({p.country} - {p.commissionRate}%)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Procurement Supplier Vendor Link</label>
                  <select
                    value={form.supplierId || ""}
                    onChange={e => setForm({ ...form, supplierId: e.target.value || null })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Bedding configuration */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">{t('paxCount')}</label>
              <input
                type="number"
                value={form.paxCount}
                onChange={e => handlePaxChange(Number(e.target.value))}
                min="1"
                required
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Settlement Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value as any })}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 font-bold"
              >
                <option value="MYR">MYR (Ringgit Malaysia)</option>
                <option value="SGD">SGD (Singapore Dollars)</option>
                <option value="IDR">IDR (Indonesian Rupiah)</option>
                <option value="SAR">SAR (Saudi Riyals)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Total Amount Charged (Local Currency)</label>
              <input
                type="number"
                value={form.totalAmount}
                onChange={e => setForm({ ...form, totalAmount: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 font-bold text-emerald-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">{t('supplierCost')} (MYR)</label>
              <input
                type="number"
                value={form.supplierCostMYR}
                onChange={e => setForm({ ...form, supplierCostMYR: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 font-bold text-rose-800"
                placeholder="Linked cost budget"
              />
            </div>
          </div>

          {/* Service Additions */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase block">Extra Service Inclusions</label>
            <div className="flex flex-wrap gap-2">
              {form.extraServices?.map(srv => (
                <span key={srv} className="bg-emerald-100 text-emerald-850 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-200">
                  {srv}
                  <button type="button" onClick={() => handleRemoveService(srv)} className="text-emerald-950 font-black hover:text-red-600">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={inputService}
                onChange={e => setInputService(e.target.value)}
                placeholder="e.g. VIP VIP Bus Charger Upgrade"
                className="bg-white border border-slate-200 rounded-lg p-2 text-xs grow focus:outline-emerald-800"
              />
              <button
                type="button"
                onClick={handleAddService}
                className="bg-slate-900 text-white font-bold py-1.5 px-3 rounded-lg text-xs"
              >
                Add Services
              </button>
            </div>
          </div>

          {/* Status & Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-rose-700 uppercase block mb-1">State Transition & Invoicing Action</label>
              <select
                value={form.bookingStatus}
                onChange={e => setForm({ ...form, bookingStatus: e.target.value as any })}
                className="bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 font-bold w-full"
              >
                <option value="Draft">Draft (No invoices generated)</option>
                <option value="Pending">Pending Validation (Temporary reservation)</option>
                <option value="Confirmed">Confirmed (⚠️ Spawns Automated Invoice and logs commission)</option>
                <option value="Completed">Completed Trip (Archived)</option>
                <option value="Cancelled">Cancelled (Clears/cancels active transactions)</option>
              </select>
              <p className="text-[9px] text-slate-400 mt-1">If marked as "Confirmed", the automated invoicing engine instantly materializes customer billing statements.</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Internal Log Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-800 focus:outline-none"
                rows={3}
                placeholder="Provide special diets, flight arrivals, or hotel requests..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-150">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 block"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-xs block"
            >
              {t('saveChanges')}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search pilgrim name or package name..."
                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-emerald-800"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto overflow-x-auto justify-end">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-emerald-800"
              >
                <option value="All">All Booking States</option>
                <option value="Draft">Draft</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-emerald-800"
              >
                <option value="All">All Module Types</option>
                <option value="Umrah Package">Umrah Package</option>
                <option value="Private Tour">Private Tour</option>
                <option value="Hotel + Transport">Hotel + Transport</option>
              </select>
            </div>
          </div>

          {/* List display */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-6">Booking ID</th>
                    <th className="py-4 px-6">Customer & Contract Details</th>
                    <th className="py-4 px-6">Accommodation (Makkah/Madinah)</th>
                    <th className="py-4 px-6 text-right">Price Matrix</th>
                    <th className="py-4 px-6 text-center">Invoicing state</th>
                    <th className="py-4 px-6 text-right">Action Desk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs text-slate-800">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        {t('noRecords')}
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map(b => {
                      const estProfitMYR = b.totalAmountMYR - b.supplierCostMYR;
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold text-emerald-850">
                            {b.id}
                          </td>
                          <td className="py-4 px-6 max-w-sm">
                            <span className="font-extrabold text-slate-900 text-sm block">{b.customerName}</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">{b.customerEmail} | {b.customerPhone}</span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md font-bold">
                                {b.bookingType}
                              </span>
                              <span className="text-[9px] bg-emerald-50 text-emerald-850 border border-emerald-100 px-2 py-0.5 rounded-md font-extrabold">
                                {b.packageName}
                              </span>
                              <span className="text-[9px] bg-blue-50 text-blue-800 border border-blue-100 px-2 py-0.5 rounded-md font-bold">
                                {b.paxCount} {t('paxUnit')}
                              </span>
                              {b.b2bAgentName && (
                                <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 rounded-md font-bold">
                                  B2B: {b.b2bAgentName}
                                </span>
                              )}
                            </div>
                            {b.notes && (
                              <p className="text-[10px] text-slate-400 italic mt-1 bg-slate-50 p-1 border border-slate-100 rounded-md">
                                Notes: {b.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-medium text-slate-800 block flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" /> Makkah: {b.hotelMakkah}
                            </span>
                            <span className="font-medium text-slate-800 block mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" /> Madinah: {b.hotelMadinah}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono block mt-1">
                              Transport: {b.transportType}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-semibold">
                            <span className="font-bold text-slate-900 block text-xs">
                              {b.currency} {b.totalAmount.toLocaleString()}
                            </span>
                            {b.currency !== 'MYR' && (
                              <span className="text-[10px] text-slate-500 block">
                                (MYR {b.totalAmountMYR.toLocaleString()})
                              </span>
                            )}
                            <div className="mt-1 text-[9px] text-slate-400">
                              Estimated Margin: <span className={estProfitMYR >= 0 ? "text-emerald-700 font-extrabold" : "text-rose-600 font-extrabold"}>MYR {estProfitMYR.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col items-center gap-1">
                              {b.bookingStatus === 'Confirmed' && (
                                <span className="bg-emerald-50 text-emerald-850 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  {t('confirmed')}
                                </span>
                              )}
                              {b.bookingStatus === 'Pending' && (
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  {t('pending')}
                                </span>
                              )}
                              {b.bookingStatus === 'Draft' && (
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-semibold">
                                  {t('draft')}
                                </span>
                              )}
                              {b.bookingStatus === 'Completed' && (
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-[10px] font-bold">
                                  {t('completed')}
                                </span>
                              )}
                              {b.bookingStatus === 'Cancelled' && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-bold">
                                  {t('cancelled')}
                                </span>
                              )}
                              <span className="text-[9px] font-mono text-slate-400 mt-1">
                                Travel: {b.travelDateFrom}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditClick(b)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg border border-slate-200 transition-colors"
                                title="Edit booking details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteBooking(b.id)}
                                className="bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 p-1.5 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
                                title="Remove reservation permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
