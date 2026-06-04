import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  MapPin, 
  Users, 
  ChevronRight, 
  DollarSign, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Download, 
  Globe, 
  Activity, 
  BookOpen, 
  FileText, 
  Hotel, 
  TrendingUp, 
  Workflow, 
  RefreshCw,
  FolderSync
} from 'lucide-react';

import { 
  BookingItem, 
  InvoiceItemModel, 
  B2BPartner, 
  Supplier, 
  FinanceTransaction, 
  Employee, 
  ActivityLog, 
  Language,
  HotelContract
} from './types';

import { TRANSLATIONS } from './Translations';

// Modular children
import BookingModule from './components/BookingModule';
import InvoiceModule from './components/InvoiceModule';
import FinanceModule from './components/FinanceModule';
import B2BModule from './components/B2BModule';
import ProcurementModule from './components/ProcurementModule';
import HRModule from './components/HRModule';
import RoomingModule from './components/RoomingModule';

export default function App() {
  const [lang, setLang] = useState<Language>('EN');
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  // Active Navigation Tab
  // Options: dashboard, bookings, invoices, partners, suppliers, hr, rooming
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'invoices' | 'partners' | 'suppliers' | 'hr' | 'rooming'>('dashboard');

  // Server Consolidated Database State
  const [db, setDb] = useState<{
    bookings: BookingItem[];
    invoices: InvoiceItemModel[];
    partners: B2BPartner[];
    suppliers: Supplier[];
    transactions: FinanceTransaction[];
    employees: Employee[];
    logs: ActivityLog[];
    hotelContracts?: HotelContract[];
  }>({
    bookings: [],
    invoices: [],
    partners: [],
    suppliers: [],
    transactions: [],
    employees: [],
    logs: [],
    hotelContracts: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Load database on mount
  useEffect(() => {
    fetchDatabase();
  }, []);

  const fetchDatabase = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        setDb(data);
      } else {
        console.error("Failed to read server database state, using initial local memory.");
      }
    } catch (err) {
      console.warn("Connection warning: REST server not fully boot stage yet, waiting recovery.", err);
    } finally {
      setIsLoading(false);
    }
  };

  const notify = (text: string) => {
    setMessage(text);
    setTimeout(() => {
      setMessage(null);
    }, 4000);
  };

  const handleResetDatabase = async () => {
    if (!confirm("Are you sure you want to reset the database to enterprise system defaults?")) return;
    try {
      const res = await fetch('/api/db/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'operations@aerostar-alliance.com' })
      });
      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
        notify("Central Database successfully cleared & seeded with 1447H default matrices!");
      }
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  const handleSaveBooking = async (booking: Partial<BookingItem>, id?: string) => {
    try {
      const isNew = !id;
      const url = isNew ? '/api/bookings' : `/api/bookings/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
        notify(isNew ? "Travel reservation established! Automated invoice generated." : "Travel reservation modified successfully & synchronized with matching invoices!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm(`Cancel and delete booking ${id} immediately? This action clears any linked invoices permanently.`)) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
        notify(`Booking ${id} cleared from active ledger files.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateInvoicePayment = async (id: string, paidAmount: number, paymentStatus: 'Unpaid' | 'Partial' | 'Paid') => {
    try {
      const res = await fetch(`/api/invoices/${id}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidAmount,
          paymentStatus,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
        notify(`Cash Payment of ${paidAmount} applied successfully against Invoice ${id}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPartner = async (partner: Partial<B2BPartner>) => {
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
        notify(`Established region partnership agreement with ${partner.companyName}!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateB2BBooking = async (bookingData: any) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking: bookingData,
          authorEmail: bookingData.customerEmail,
          authorName: bookingData.customerName
        })
      });

      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
        notify(`B2B Simulated Group Booking received! Confirmed State: spawned Automated Invoice & logged affiliate metrics.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSupplier = async (supplier: Partial<Supplier>) => {
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
        notify(`Logged Procurement vendor: ${supplier.name}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaySupplier = async (id: string, payAmount: number, description: string) => {
    try {
      const res = await fetch(`/api/suppliers/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payAmount,
          description,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
        notify(`Expedited payout of MYR ${payAmount} cleared successfully against Vendor Liabilities.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEmployee = async (employee: Partial<Employee>) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
        notify(`Hired Staff member: ${employee.name}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAttendance = async (id: string, status: 'Present' | 'On Leave' | 'Absent') => {
    try {
      const res = await fetch(`/api/employees/${id}/attendance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTransaction = async (txn: Partial<FinanceTransaction>) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...txn,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        setDb(body.db);
        notify(`Direct General Ledger transaction recorded in accounts.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Exporter helper
  const exportOperationalDataToCSV = () => {
    let csv = '';
    
    // Header section
    csv += "========================================================\n";
    csv += "      AEROSTAR ALLIANCE CONSOLIDATED AUDIT REPORT       \n";
    csv += `      Generated: ${new Date().toISOString()}            \n`;
    csv += "========================================================\n\n";

    // Bookings Dataset
    csv += "--- ACTIVE TRAVEL BOOKINGS ---\n";
    csv += "Booking ID,Customer,Email,Type,Package,Travel Date From,Travel Date To,Currency,Amount,Amount (MYR),Status,Makkah Hotel,Madinah Hotel\n";
    db.bookings.forEach(b => {
      csv += `"${b.id}","${b.customerName}","${b.customerEmail}","${b.bookingType}","${b.packageName}","${b.travelDateFrom}","${b.travelDateTo}","${b.currency}",${b.totalAmount},${b.totalAmountMYR},"${b.bookingStatus}","${b.hotelMakkah}","${b.hotelMadinah}"\n`;
    });
    
    csv += "\n";

    // Invoices Dataset
    csv += "--- AUTOMATED CLIENT INVOICES ---\n";
    csv += "Invoice ID,Booking ID,Customer,Currency,Grand Total,Paid Amount,Status,Due Date\n";
    db.invoices.forEach(inv => {
      csv += `"${inv.id}","${inv.bookingId}","${inv.customerName}","${inv.currency}",${inv.grandTotal},${inv.paidAmount},"${inv.paymentStatus}","${inv.dueDate}"\n`;
    });

    csv += "\n";

    // B2B Partners Dataset
    csv += "--- B2B REGIONAL OPERATORS ---\n";
    csv += "Partner ID,Company Name,HQ Country,Contact Person,Phone,Email,Commission Rate (%),Total Bookings,Total Paid Comm. (MYR)\n";
    db.partners.forEach(partner => {
      csv += `"${partner.id}","${partner.companyName}","${partner.country}","${partner.contactName}","${partner.phone}","${partner.email}",${partner.commissionRate},${partner.totalBookingsCount},${partner.totalEarnedCommissionsMYR}\n`;
    });

    csv += "\n";

    // Supplier backlogs
    csv += "--- SUPPLY PROCUREMENT LIABILITIES ---\n";
    csv += "Supplier ID,Vendor Name,Category,Country,Outstanding Liability (MYR),Status\n";
    db.suppliers.forEach(s => {
      csv += `"${s.id}","${s.name}","${s.category}","${s.country}",${s.outstandingPaymentMYR},"${s.paymentStatus}"\n`;
    });

    // Create download element
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `aerostar_alliance_operational_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Master Consolidated Operational CSV document generated & downloaded successfully!");
  };

  // Compute live totals
  const totalB2BCount = db.partners.length;
  const activeBookingsCount = db.bookings.filter(b => b.bookingStatus !== 'Cancelled').length;
  const pendingInvoicesTotal = db.invoices.filter(inv => inv.paymentStatus !== 'Paid').length;
  const netInflowsMYR = db.transactions
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-emerald-800 selection:text-white">
      
      {/* Toast Alert Banner */}
      {message && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 bg-slate-900 border border-emerald-500/30 text-white rounded-xl px-5 py-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-[ping_1s_infinite]" />
          <span className="text-xs font-semibold leading-none">{message}</span>
        </div>
      )}

      {/* Main Header / Portal Top panel */}
      <header className="bg-slate-950 text-white border-b border-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4.5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand Info */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-emerald-950 p-2.5 rounded-2xl font-bold shadow-lg shadow-emerald-950/20">
              <Compass className="w-5 h-5 animate-[spin_30s_linear_infinite]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
                  AEROSTAR ALLIANCE
                </span>
                <span className="text-[9px] bg-slate-800 text-amber-400 font-extrabold px-2 py-0.5 rounded-full border border-slate-700">
                  CENTRAL CONSOLE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold tracking-tight">Enterprise Pilgrimage Ground & Invoicing System</p>
            </div>
          </div>

          {/* Controls Bar: Refresh, Reset, CSV Export, Language Toggle */}
          <div className="flex items-center flex-wrap gap-2.5">
            
            {/* CSV MASTER EXPORT */}
            <button
              onClick={exportOperationalDataToCSV}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3.5 py-1.8 rounded-xl text-[10px] uppercase flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              title="Generate CSV Data Audit Sheet"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV Data
            </button>

            {/* Sync DB */}
            <button
              onClick={fetchDatabase}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 p-2 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
              title="Resync Ledger State"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Language Switch */}
            <button
              onClick={() => setLang(lang === 'EN' ? 'BM' : 'EN')}
              className="bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 font-bold px-3 py-1.8 rounded-xl text-[10px] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              {lang === 'EN' ? 'BM' : 'EN'}
            </button>

            {/* Reset Factory */}
            <button
              onClick={handleResetDatabase}
              className="bg-slate-900 hover:bg-red-950 text-rose-455 border border-slate-800 hover:border-red-900 font-bold px-2.5 py-1.8 rounded-xl text-[10px] cursor-pointer"
              title="Clear all inputs & reset to system seeds"
            >
              System Reset
            </button>
            
          </div>

        </div>
      </header>

      {/* Primary Module Navigation Tabs */}
      <div className="bg-slate-900 text-slate-400 border-b border-slate-850">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center overflow-x-auto gap-2 py-3 text-xs leading-none">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all text-nowrap cursor-pointer ${activeTab === 'dashboard' ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-inner' : 'hover:text-slate-100 hover:bg-slate-850'}`}
            >
              {t('dashboard')}
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all text-nowrap cursor-pointer ${activeTab === 'bookings' ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-inner' : 'hover:text-slate-100 hover:bg-slate-850'}`}
            >
              {t('bookings')}
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all text-nowrap cursor-pointer ${activeTab === 'invoices' ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-inner' : 'hover:text-slate-100 hover:bg-slate-850'}`}
            >
              {t('invoices')}
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all text-nowrap cursor-pointer ${activeTab === 'partners' ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-inner' : 'hover:text-slate-100 hover:bg-slate-850'}`}
            >
              {t('partners')}
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all text-nowrap cursor-pointer ${activeTab === 'suppliers' ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-inner' : 'hover:text-slate-100 hover:bg-slate-850'}`}
            >
              {t('suppliers')}
            </button>
            <button
              onClick={() => setActiveTab('hr')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all text-nowrap cursor-pointer ${activeTab === 'hr' ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-inner' : 'hover:text-slate-100 hover:bg-slate-850'}`}
            >
              {t('hr')}
            </button>
            <button
              onClick={() => setActiveTab('rooming')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all text-nowrap cursor-pointer ${activeTab === 'rooming' ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-inner' : 'hover:text-slate-100 hover:bg-slate-850'}`}
            >
              Room Checker & Discrepancies
            </button>
          </nav>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-emerald-800 animate-spin mx-auto" />
            <p className="text-slate-450 font-bold text-xs uppercase tracking-widest animate-pulse">Syncing Central Database Stream...</p>
          </div>
        ) : (
          <>
            {/* Navigation Tab Render Engine */}

            {/* Tab 1: Dashboard Overview */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-205">
                
                {/* Greeting Banner */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white p-7 rounded-2xl border border-slate-850 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">{t('welcomeSpecialist')}</span>
                    <h2 className="text-xl md:text-2xl font-black">Centralized Hajj & Umrah Operations Dashboard</h2>
                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      Coordinate accommodation check-in rooms, billing invoices, and B2B affiliate commission models across Malaysia, Indonesia, Singapore, and Saudi Arabia.
                    </p>
                  </div>
                  <div className="flex bg-slate-850/80 rounded-xl px-4 py-2 border border-slate-800 shrink-0 gap-3 items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-[ping_1.5s_infinite]" />
                    <span className="text-xs font-mono font-bold text-slate-200">Kuala Lumpur HQ: 2026-06-04</span>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* KPI 1 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider block">Dispatched Bookings</span>
                      <strong className="text-2xl font-black text-slate-905 block">{activeBookingsCount} active</strong>
                      <span className="text-[9px] text-slate-400 block font-semibold hover:underline cursor-pointer" onClick={() => setActiveTab('bookings')}>Manage Packages →</span>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-150 text-slate-705 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  </div>

                  {/* KPI 2 Invoice */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider block">Autogenerated Invoices</span>
                      <strong className="text-2xl font-black text-slate-905 block">{db.invoices.length} invoices</strong>
                      <span className="text-[9px] text-orange-700 block font-bold cursor-pointer" onClick={() => setActiveTab('invoices')}>
                        ⚠️ {pendingInvoicesTotal} pending collections
                      </span>
                    </div>
                    <div className="bg-orange-50 text-orange-600 p-3 rounded-xl border border-orange-100 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>

                  {/* KPI 3 Cashflow */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider block">Central Cash Receipts</span>
                      <strong className="text-2xl font-black text-emerald-805 block">MYR {netInflowsMYR.toLocaleString()}</strong>
                      <span className="text-[9px] text-slate-400 block font-semibold">Ledger entries converted</span>
                    </div>
                    <div className="bg-emerald-50 text-emerald-705 p-3 rounded-xl border border-emerald-100 shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  {/* KPI 4 B2B Partner commission */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider block">Affiliate alliances</span>
                      <strong className="text-2xl font-black text-slate-905 block">{totalB2BCount} partners</strong>
                      <span className="text-[9px] text-slate-400 block font-mono">Commission rate: 7-10%</span>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-150 text-slate-705 shrink-0">
                      <Workflow className="w-5 h-5" />
                    </div>
                  </div>

                </div>

                {/* Sub-grid of Finance and logs preview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left part: General Ledger preview */}
                  <div className="lg:col-span-2 space-y-4">
                    <FinanceModule 
                      transactions={db.transactions} 
                      lang={lang} 
                      onAddTransaction={handleAddTransaction} 
                    />
                  </div>

                  {/* Right part: System Audit Trail logs */}
                  <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-800 animate-pulse" />
                        {t('activityLogs')}
                      </h3>
                      <p className="text-[10px] text-slate-450">Centralized system audits of confirmed reservations & invoicing stamps.</p>
                    </div>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {db.logs.map((log) => (
                        <div key={log.id} className="text-[11px] bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-1 hover:bg-slate-100/50 transition-colors">
                          <div className="flex justify-between font-mono text-[9px] text-slate-400">
                            <strong>{log.userName} ({log.userRole})</strong>
                            <span>{log.timestamp.split('T')[1].slice(0, 5)} hrs</span>
                          </div>
                          <p className="text-slate-950 font-semibold leading-normal">{log.action}</p>
                          <span className="text-[8px] bg-emerald-50 text-emerald-850 px-2 py-0.5 rounded border border-emerald-100 font-extrabold uppercase inline-block">
                            {log.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* Tab 2: Bookings Operations */}
            {activeTab === 'bookings' && (
              <BookingModule 
                bookings={db.bookings}
                partners={db.partners}
                suppliers={db.suppliers}
                hotelContracts={db.hotelContracts || []}
                lang={lang}
                onSaveBooking={handleSaveBooking}
                onDeleteBooking={handleDeleteBooking}
                currentUserEmail="finance@aero-star.co"
                currentUserName="Ahmad Farhan"
              />
            )}

            {/* Tab 3: Automatic Invoices Segment */}
            {activeTab === 'invoices' && (
              <InvoiceModule 
                invoices={db.invoices}
                lang={lang}
                onUpdateInvoicePayment={handleUpdateInvoicePayment}
              />
            )}

            {/* Tab 4: B2B Operator Partnerships */}
            {activeTab === 'partners' && (
              <B2BModule 
                partners={db.partners}
                lang={lang}
                onAddPartner={handleAddPartner}
                onSimulateB2BBooking={handleSimulateB2BBooking}
              />
            )}

            {/* Tab 5: Supply chain and Procurement blocks */}
            {activeTab === 'suppliers' && (
              <ProcurementModule 
                suppliers={db.suppliers}
                lang={lang}
                onAddSupplier={handleAddSupplier}
                onPaySupplier={handlePaySupplier}
              />
            )}

            {/* Tab 6: Central HR */}
            {activeTab === 'hr' && (
              <HRModule 
                employees={db.employees}
                lang={lang}
                onAddEmployee={handleAddEmployee}
                onUpdateAttendance={handleUpdateAttendance}
              />
            )}

            {/* Tab 7: Room check discrepancies */}
            {activeTab === 'rooming' && (
              <RoomingModule 
                bookings={db.bookings}
                lang={lang}
              />
            )}

          </>
        )}

      </main>

      {/* Footer Branding block */}
      <footer className="bg-slate-950 border-t border-slate-900 text-slate-500 py-8 text-xs text-center font-sans space-y-2 mt-12">
        <p className="font-extrabold text-slate-400">© 2026 {t('allRightsReserved')}</p>
        <p className="text-[10px] text-slate-600 font-medium">{t('corporateOffice')}</p>
        <p className="text-[9px] text-slate-700 font-mono">Central Container API Port Ingress: Activated 3000 | Secure Server Mode (Node ESM)</p>
      </footer>

    </div>
  );
}
