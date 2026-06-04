import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  CreditCard, 
  Sparkles, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download, 
  Eye, 
  X,
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
  FileDown,
  UploadCloud,
  Copy,
  Send,
  Check,
  TrendingUp,
  Sliders,
  DollarSign,
  Briefcase,
  HelpCircle,
  Percent,
  CheckSquare,
  Square
} from 'lucide-react';
import { InvoiceItemModel, BookingItem, B2BPartner, Language, InvoiceItem } from '../types';
import { TRANSLATIONS } from '../Translations';

interface InvoiceModuleProps {
  invoices: InvoiceItemModel[];
  bookings: BookingItem[];
  partners: B2BPartner[];
  lang: Language;
  onUpdateInvoicePayment: (id: string, paidAmount: number, paymentStatus: 'Unpaid' | 'Partial' | 'Paid') => Promise<void>;
  onRefreshDatabase?: () => Promise<void>;
}

export default function InvoiceModule({
  invoices,
  bookings,
  partners,
  lang,
  onUpdateInvoicePayment,
  onRefreshDatabase
}: InvoiceModuleProps) {
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  // Tabs layout: ledger (Default list), create (Create Invoice), soa (Statement of Account), reports (Reporting), import (Bulk)
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'create' | 'soa' | 'reports' | 'import'>('ledger');

  // Multi-currency list
  const currencies: ('MYR' | 'IDR' | 'SGD' | 'SAR')[] = ['MYR', 'IDR', 'SGD', 'SAR'];

  // Currency exchange rates relative to MYR (for unified reports)
  const EXCHANGE_RATES = {
    MYR: 1.0,
    SAR: 1.25,  // 1 SAR = 1.25 MYR
    SGD: 3.45,  // 1 SGD = 3.45 MYR
    IDR: 0.0003 // 1 IDR = 0.0003 MYR
  };

  // State for Invoice Search/Filter in Ledger
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItemModel | null>(null);
  
  // Payment Logs
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [inputPaid, setInputPaid] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'Unpaid' | 'Partial' | 'Paid'>('Unpaid');

  // State for copy notifications
  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | 'none'>('none');

  // Edit fields for active invoice (Draft/unsettled only)
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editForm, setEditForm] = useState<Partial<InvoiceItemModel>>({
    customerName: '',
    customerEmail: '',
    currency: 'MYR',
    taxPercentage: 6,
    discountAmount: 0,
    dueDate: '',
    remarks: '',
    validityPeriod: '',
    items: []
  });

  // State for New Manual / Lump Sum / Proforma Invoice
  const [newInvType, setNewInvType] = useState<'Manual' | 'Lump Sum' | 'Proforma'>('Manual');
  const [linkedBookingId, setLinkedBookingId] = useState<string>('');
  const [newInvCustomer, setNewInvCustomer] = useState('');
  const [newInvEmail, setNewInvEmail] = useState('');
  const [newInvCurrency, setNewInvCurrency] = useState<'MYR' | 'IDR' | 'SGD' | 'SAR'>('MYR');
  const [newInvTaxPct, setNewInvTaxPct] = useState<number>(6);
  const [newInvDiscount, setNewInvDiscount] = useState<number>(0);
  const [newInvDueDate, setNewInvDueDate] = useState('');
  const [newInvRemarks, setNewInvRemarks] = useState('');
  const [newInvValidity, setNewInvValidity] = useState('');
  
  // Custom rows of itemized entries for new invoices
  const [newInvItems, setNewInvItems] = useState<{ description: string; unitPrice: number; quantity: number }[]>([
    { description: 'Umrah Custom Ground Services', unitPrice: 3500, quantity: 1 }
  ]);
  // Lump sum amount
  const [newInvLumpSumDesc, setNewInvLumpSumDesc] = useState('Comprehensive ground package and transfers');
  const [newInvLumpSumPrice, setNewInvLumpSumPrice] = useState<number>(5000);

  // Statement of Account (SOA) Generator filters
  const [soaPartner, setSoaPartner] = useState<string>('All');
  const [soaHotel, setSoaHotel] = useState<string>('All');
  const [soaCurrency, setSoaCurrency] = useState<'MYR' | 'IDR' | 'SGD' | 'SAR'>('SAR');
  const [soaDateFrom, setSoaDateFrom] = useState<string>('');
  const [soaDateTo, setSoaDateTo] = useState<string>('');
  const [soaSelectedChecked, setSoaSelectedChecked] = useState<Record<string, boolean>>({});

  // Bulk Import Clipboard Paste Data
  const [importPasteData, setImportPasteData] = useState<string>('');
  const [importFormat, setImportFormat] = useState<'JSON' | 'CSV'>('CSV');
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Filtered invoices for ledger list
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.customerName.toLowerCase().includes(search.toLowerCase()) || 
                            inv.id.toLowerCase().includes(search.toLowerCase()) || 
                            (inv.bookingId || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' ? true : inv.paymentStatus === statusFilter;
      const matchesType = typeFilter === 'All' ? true : (inv.invoiceType || 'Booking') === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [invoices, search, statusFilter, typeFilter]);

  // Extract unique hotels listing from bookings for filters
  const uniqueHotels = useMemo(() => {
    const list: string[] = [];
    bookings.forEach(b => {
      if (b.hotelMakkah && !list.includes(b.hotelMakkah)) list.push(b.hotelMakkah);
      if (b.hotelMadinah && !list.includes(b.hotelMadinah)) list.push(b.hotelMadinah);
    });
    return list;
  }, [bookings]);

  // SOA Ledger generation logic matches screenshot structure
  const soaRows = useMemo(() => {
    // Collect all confirmed bookings + related booking/manual invoices matching the customer & hotel
    return bookings.map(b => {
      // Find matching partner status
      const matchesPartner = soaPartner === 'All' 
        ? true 
        : (b.b2bAgentId === soaPartner || (b.b2bAgentName || '').toLowerCase().includes(soaPartner.toLowerCase()) || b.customerName.toLowerCase().includes(soaPartner.toLowerCase()));
      
      const inHotelMakkah = b.hotelMakkah && (soaHotel === 'All' || b.hotelMakkah === soaHotel);
      const inHotelMadinah = b.hotelMadinah && (soaHotel === 'All' || b.hotelMadinah === swaHotelTextMatch(soaHotel));
      const matchesHotel = soaHotel === 'All' ? true : (inHotelMakkah || inHotelMadinah);

      // Travel dates range filter
      let matchesDates = true;
      if (soaDateFrom) matchesDates = matchesDates && b.travelDateFrom >= soaDateFrom;
      if (soaDateTo) matchesDates = matchesDates && b.travelDateTo <= soaDateTo;

      if (!matchesPartner || !matchesHotel || !matchesDates) return null;

      // Find linked invoice to fetch the payment metrics or dues
      const linkedInvoice = invoices.find(inv => inv.bookingId === b.id);
      
      const nights = Math.max(1, Math.round((new Date(b.travelDateTo).getTime() - new Date(b.travelDateFrom).getTime()) / (1000 * 60 * 60 * 24)));
      const roomCount = b.roomAllocations?.reduce((sum, r) => sum + r.count, 0) || 0;

      // Convert pricing base on currency selection
      const rateFromBooking = EXCHANGE_RATES[b.currency as keyof typeof EXCHANGE_RATES] || 1.0;
      const rateToSelected = EXCHANGE_RATES[soaCurrency] || 1.0;
      
      // Calculate amounts converted to target statement currency
      const bookingTotalAmountMYR = b.totalAmount * rateFromBooking;
      const targetTotalAmount = Math.round(bookingTotalAmountMYR / rateToSelected);

      const paidAmountConverted = linkedInvoice 
        ? Math.round((linkedInvoice.paidAmount * (EXCHANGE_RATES[linkedInvoice.currency] || 1.0)) / rateToSelected)
        : 0;
      
      const outstandingAmountConverted = linkedInvoice
        ? Math.round(((linkedInvoice.grandTotal - linkedInvoice.paidAmount) * (EXCHANGE_RATES[linkedInvoice.currency] || 1.0)) / rateToSelected)
        : targetTotalAmount;

      return {
        id: b.id,
        aeroRef: b.aeroRef || 'AERO-' + b.id.replace('BK-', ''),
        paxRef: b.packageName || 'Umrah Group Package',
        customerName: b.customerName,
        checkIn: b.travelDateFrom,
        checkOut: b.travelDateTo,
        hotel: b.hotelSelectionType === 'Makkah Only' ? b.hotelMakkah : b.hotelSelectionType === 'Madinah Only' ? b.hotelMadinah : `${b.hotelMakkah || 'Makkah'} & ${b.hotelMadinah || 'Madinah'}`,
        nights,
        roomCount,
        paxCount: b.paxCount,
        roomAllocations: b.roomAllocations || [],
        amount: targetTotalAmount,
        paid: paidAmountConverted,
        outstanding: outstandingAmountConverted,
        paymentStatus: linkedInvoice?.paymentStatus || 'Unpaid'
      };
    }).filter(row => row !== null) as any[];
  }, [bookings, invoices, soaPartner, soaHotel, soaCurrency, soaDateFrom, soaDateTo]);

  // Helper helper
  function swaHotelTextMatch(h: string): string {
    return h;
  }

  // Calculate cumulative running outstanding balance for selected/checked items in SOA table
  const computedSoaRowsWithCumulative = useMemo(() => {
    let runningSum = 0;
    return soaRows.map(row => {
      const isChecked = soaSelectedChecked[row.id] !== false; // checked by default
      if (isChecked) {
        runningSum += row.outstanding;
      }
      return {
        ...row,
        cumulativeOutstanding: runningSum,
        checked: isChecked
      };
    });
  }, [soaRows, soaSelectedChecked]);

  // Financial Reports computation
  const reportingMetrics = useMemo(() => {
    // Total in MYR for consistency across different currencies
    let bookingRevenueMYR = 0;
    let manualRevenueMYR = 0;
    let lumpSumRevenueMYR = 0;
    let proformaRevenueMYR = 0;

    let outstandingMYR = 0;
    let paidMYR = 0;

    let totalProformas = 0;
    let convertedProformas = 0;

    invoices.forEach(inv => {
      const type = inv.invoiceType || 'Booking';
      const rate = inv.exchangeRateToMYR || EXCHANGE_RATES[inv.currency] || 1.0;
      const amountMYR = inv.grandTotal * rate;
      const collectedMYR = inv.paidAmount * rate;
      const unpaidMYR = (inv.grandTotal - inv.paidAmount) * rate;

      if (inv.paymentStatus !== 'Paid') {
        outstandingMYR += unpaidMYR;
      }
      paidMYR += collectedMYR;

      if (type === 'Booking') {
        bookingRevenueMYR += amountMYR;
      } else if (type === 'Manual') {
        manualRevenueMYR += amountMYR;
      } else if (type === 'Lump Sum') {
        lumpSumRevenueMYR += amountMYR;
      } else if (type === 'Proforma') {
        proformaRevenueMYR += amountMYR;
        totalProformas++;
        if (inv.convertedFromProforma) {
          convertedProformas++;
        }
      }
    });

    const conversionRate = totalProformas > 0 ? (convertedProformas / totalProformas) * 100 : 80; // default simulation fallback

    return {
      bookingRevenueMYR,
      manualRevenueMYR,
      lumpSumRevenueMYR,
      proformaRevenueMYR,
      totalRevenueMYR: bookingRevenueMYR + manualRevenueMYR + lumpSumRevenueMYR,
      outstandingMYR,
      paidMYR,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalProformas,
      convertedProformas
    };
  }, [invoices]);

  // Invoice detailed selection clicked
  const handleInvoiceSelect = (invoice: InvoiceItemModel) => {
    setSelectedInvoice(invoice);
    setInputPaid(invoice.paidAmount);
    setPaymentStatus(invoice.paymentStatus);
    setIsUpdatingPayment(false);
    setIsEditingInvoice(false);
  };

  // Payment logs submission
  const handleUpdatePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    
    await onUpdateInvoicePayment(selectedInvoice.id, inputPaid, paymentStatus);
    if (onRefreshDatabase) await onRefreshDatabase();

    const updated = { 
      ...selectedInvoice, 
      paidAmount: inputPaid,
      paymentStatus: paymentStatus
    };
    setSelectedInvoice(updated);
    setIsUpdatingPayment(false);
  };

  // Create new Invoice
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvCustomer) {
      alert('Please provide the customer or B2B Partner name.');
      return;
    }

    // Determine description & itemization structure
    let items: InvoiceItem[] = [];
    let subtotal = 0;

    if (newInvType === 'Lump Sum') {
      subtotal = newInvLumpSumPrice;
      items = [{
        description: newInvLumpSumDesc,
        unitPrice: newInvLumpSumPrice,
        quantity: 1,
        subtotal: newInvLumpSumPrice
      }];
    } else {
      subtotal = newInvItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      items = newInvItems.map(item => ({
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.unitPrice * item.quantity
      }));
    }

    const taxAmount = Math.round(subtotal * (newInvTaxPct / 100));
    const grandTotal = subtotal + taxAmount - newInvDiscount;

    const invoicePayload = {
      bookingId: linkedBookingId || null,
      customerName: newInvCustomer,
      customerEmail: newInvEmail || 'client@operator.com',
      items,
      currency: newInvCurrency,
      subtotal,
      taxPercentage: newInvTaxPct,
      taxAmount,
      discountAmount: newInvDiscount,
      grandTotal,
      paidAmount: 0,
      paymentStatus: 'Unpaid' as const,
      dueDate: newInvDueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      invoiceType: newInvType,
      remarks: newInvRemarks,
      validityPeriod: newInvValidity
    };

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: invoicePayload,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        if (onRefreshDatabase) await onRefreshDatabase();
        alert(`Successfully created ${newInvType} invoice!`);
        // Reset inputs
        setNewInvCustomer('');
        setNewInvEmail('');
        setLinkedBookingId('');
        setNewInvRemarks('');
        setNewInvValidity('');
        setActiveSubTab('ledger');
      } else {
        const err = await res.json();
        alert('Server returned error: ' + err.error);
      }
    } catch (err) {
      console.error(err);
      alert('Network failure processing new invoice.');
    }
  };

  // Convert Proforma Invoice to Standard active
  const handleConvertProforma = async (targetType: 'Booking' | 'Manual') => {
    if (!selectedInvoice) return;
    if (!confirm(`Are you sure you want to convert Proforma ${selectedInvoice.id} to active ${targetType} invoice?`)) return;

    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        if (onRefreshDatabase) await onRefreshDatabase();
        alert('Successfully converted proforma invoice!');
        setSelectedInvoice(body.invoice);
      } else {
        const err = await res.json();
        alert('Err: ' + err.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger invoice edit form setup
  const startEditingInvoice = () => {
    if (!selectedInvoice) return;
    setEditForm({
      customerName: selectedInvoice.customerName,
      customerEmail: selectedInvoice.customerEmail,
      currency: selectedInvoice.currency,
      taxPercentage: selectedInvoice.taxPercentage,
      discountAmount: selectedInvoice.discountAmount,
      dueDate: selectedInvoice.dueDate,
      remarks: selectedInvoice.remarks || '',
      validityPeriod: selectedInvoice.validityPeriod || '',
      items: [...selectedInvoice.items]
    });
    setIsEditingInvoice(true);
  };

  // Save the Structural Adjustments to Invoice
  const handleSaveInvoiceEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const items = editForm.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const taxPercentage = editForm.taxPercentage || 0;
    const taxAmount = Math.round(subtotal * (taxPercentage / 100));
    const discountAmount = editForm.discountAmount || 0;
    const grandTotal = subtotal + taxAmount - discountAmount;

    const payload = {
      ...editForm,
      subtotal,
      taxAmount,
      grandTotal,
      invoiceType: selectedInvoice.invoiceType || 'Manual',
      bookingId: selectedInvoice.bookingId
    };

    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: payload,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        if (onRefreshDatabase) await onRefreshDatabase();
        setSelectedInvoice(body.invoice);
        setIsEditingInvoice(false);
        alert('Invoice adjustments successfully saved & version upgraded with full audit log trails!');
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Item list changes in edit/create forms
  const handleAddItemRow = (isEdit: boolean) => {
    if (isEdit) {
      setEditForm(prev => ({
        ...prev,
        items: [...(prev.items || []), { description: 'Additional charge service entry', unitPrice: 500, quantity: 1, subtotal: 500 }]
      }));
    } else {
      setNewInvItems(prev => [...prev, { description: 'Additional adjustment service entry', unitPrice: 500, quantity: 1 }]);
    }
  };

  const handleRemoveItemRow = (index: number, isEdit: boolean) => {
    if (isEdit) {
      const items = [...(editForm.items || [])];
      items.splice(index, 1);
      setEditForm(prev => ({ ...prev, items }));
    } else {
      const items = [...newInvItems];
      items.splice(index, 1);
      setNewInvItems(items);
    }
  };

  const handleItemValueChange = (index: number, field: 'description' | 'unitPrice' | 'quantity', val: any, isEdit: boolean) => {
    if (isEdit) {
      const items = [...(editForm.items || [])];
      items[index] = { 
        ...items[index], 
        [field]: val,
        subtotal: field === 'description' ? items[index].subtotal : (field === 'unitPrice' ? val : items[index].unitPrice) * (field === 'quantity' ? val : items[index].quantity)
      };
      setEditForm(prev => ({ ...prev, items }));
    } else {
      const items = [...newInvItems];
      items[index] = { ...items[index], [field]: val };
      setNewInvItems(items);
    }
  };

  // WhatsApp template formatting builder
  const handleCopyShareTemplate = (type: 'whatsapp' | 'email') => {
    if (!selectedInvoice) return;
    
    let messageBody = '';
    const itemsText = selectedInvoice.items.map(it => ` - ${it.description} (${it.quantity}x): ${selectedInvoice.currency} ${it.subtotal.toLocaleString()}`).join('\r\n');
    const balance = selectedInvoice.grandTotal - selectedInvoice.paidAmount;

    if (type === 'whatsapp') {
      messageBody = `*INVOICE: ${selectedInvoice.id}*\n`;
      messageBody += `*To:* ${selectedInvoice.customerName}\n`;
      messageBody += `*Type:* ${selectedInvoice.invoiceType || 'Standard'} invoice\n`;
      messageBody += `*Status:* ${selectedInvoice.paymentStatus}\n`;
      messageBody += `*Grand Total:* ${selectedInvoice.currency} ${selectedInvoice.grandTotal.toLocaleString()}\n`;
      messageBody += `*Outstanding Balance:* ${selectedInvoice.currency} ${balance.toLocaleString()}\n\n`;
      messageBody += `*Itemized Description:*\n${itemsText}\n\n`;
      if (selectedInvoice.remarks) {
        messageBody += `*Note:* ${selectedInvoice.remarks}\n\n`;
      }
      messageBody += `_Please make standard payment transfer referencing ${selectedInvoice.id} to Aerostar Alliance Sdn Bhd. Under Maybank Account Number: 5623 0263 8067._`;
    } else {
      messageBody = `Subject: Invoice ${selectedInvoice.id} Statement of Account - Aerostar Alliance\n\n`;
      messageBody += `Dear ${selectedInvoice.customerName},\n\n`;
      messageBody += `We are providing the invoice billing for your reservation records.\n\n`;
      messageBody += `Invoice Number: ${selectedInvoice.id}\n`;
      messageBody += `Associated Booking: ${selectedInvoice.bookingId || 'Ad-hoc'}\n`;
      messageBody += `Due Date: ${selectedInvoice.dueDate}\n`;
      messageBody += `----------------------------------------------\n`;
      messageBody += `Itemization:\n${itemsText}\n`;
      messageBody += `----------------------------------------------\n`;
      messageBody += `Subtotal: ${selectedInvoice.currency} ${selectedInvoice.subtotal.toLocaleString()}\n`;
      messageBody += `Tax (${selectedInvoice.taxPercentage}%): ${selectedInvoice.currency} ${selectedInvoice.taxAmount.toLocaleString()}\n`;
      if (selectedInvoice.discountAmount > 0) {
        messageBody += `Discount Applied: -${selectedInvoice.currency} ${selectedInvoice.discountAmount.toLocaleString()}\n`;
      }
      messageBody += `GRAND TOTAL: ${selectedInvoice.currency} ${selectedInvoice.grandTotal.toLocaleString()}\n`;
      messageBody += `Cumulative Paid: ${selectedInvoice.currency} ${selectedInvoice.paidAmount.toLocaleString()}\n`;
      messageBody += `Outstanding Balance: ${selectedInvoice.currency} ${balance.toLocaleString()}\n\n`;
      if (selectedInvoice.remarks) {
        messageBody += `Remarks: ${selectedInvoice.remarks}\n\n`;
      }
      messageBody += `Kindly transfer settlements payouts to our Maybank Malaysia corporate account (5623-0263-8067) or SAKB Al-Hijaz Commercial Saudi Arabia (SA-21900-000000-2000-0004-110). Referencing invoice code is strictly required on bank receipt.\n\n`;
      messageBody += `Regards,\n`;
      messageBody += `Aerostar Alliance Sdn Bhd\n`;
      messageBody += `Operations & Finance desk\n`;
    }

    navigator.clipboard.writeText(messageBody);
    setCopiedType(type);
    setTimeout(() => setCopiedType('none'), 3000);
  };

  // Bulk clipboard import parser
  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPasteData.trim()) {
      alert('Please paste some text/delimited data first.');
      return;
    }

    try {
      let parsedList: any[] = [];
      
      if (importFormat === 'JSON') {
        parsedList = JSON.parse(importPasteData);
      } else {
        // Simple CSV parser
        const lines = importPasteData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        parsedList = lines.slice(1).filter(l => l.trim() !== '').map(line => {
          const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const rowObj: any = {};
          headers.forEach((h, index) => {
            rowObj[h] = cells[index];
          });
          
          return {
            customerName: rowObj.customername || 'Imported Customer',
            customerEmail: rowObj.customeremail || 'import@travelops.com',
            grandTotal: Number(rowObj.grandtotal || rowObj.total || 5000),
            currency: (rowObj.currency || 'MYR').toUpperCase(),
            invoiceType: rowObj.type || rowObj.invoicetype || 'Manual',
            bookingId: rowObj.bookingid || null,
            dueDate: rowObj.duedate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          };
        });
      }

      const res = await fetch('/api/invoices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoices: parsedList,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        if (onRefreshDatabase) await onRefreshDatabase();
        setImportStatusMessage(`✨ Successfully bulk imported ${parsedList.length} client invoices logs!`);
        setImportPasteData('');
        setTimeout(() => setImportStatusMessage(null), 5000);
      } else {
        const err = await res.json();
        alert('Server reported import error: ' + err.error);
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to parse importing records. Ensure formatting conforms to specs: ' + err.message);
    }
  };

  // Export to CSV files trigger
  const handleExportCSV = (list: InvoiceItemModel[]) => {
    const headers = 'Invoice ID,Customer,Email,Type,Booking ID,Currency,Subtotal,Tax,Discount,Grand Total,Paid,Status,Created At\n';
    const rows = list.map(inv => [
      inv.id,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      inv.customerEmail,
      inv.invoiceType || 'Booking',
      inv.bookingId || '-',
      inv.currency,
      inv.subtotal,
      inv.taxAmount,
      inv.discountAmount,
      inv.grandTotal,
      inv.paidAmount,
      inv.paymentStatus,
      inv.createdAt
    ].join(',')).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AEROSTAR_INVOICES_LEDGER_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Export Selected Invoice to Word document (.doc)
  const handleExportWord = (invoice: InvoiceItemModel) => {
    const title = invoice.invoiceType === 'Proforma' ? 'PROFORMA INVOICE' : 'OFFICIAL INVOICE';
    
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>${invoice.id}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #333333; line-height: 1.4; padding: 20px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .header-operator { font-size: 18px; font-weight: bold; color: #022c22; }
          .header-subtitle { font-size: 10px; color: #666666; margin-bottom: 2px; }
          .header-title { font-size: 20px; font-weight: bold; color: #0f172a; text-align: right; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .info-label { font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
          .info-value { font-size: 13px; font-weight: bold; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .items-table th { background-color: #022c22; color: #ffffff; font-size: 11px; font-weight: bold; padding: 10px; text-align: left; text-transform: uppercase; }
          .items-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .items-table tr:nth-child(even) td { background-color: #f8fafc; }
          .totals-table { width: 300px; margin-left: auto; border-collapse: collapse; margin-bottom: 30px; }
          .totals-table td { padding: 6px 10px; font-size: 12px; }
          .totals-label { text-align: left; color: #475569; }
          .totals-value { text-align: right; font-weight: bold; }
          .grand-total-row { font-size: 14px !important; font-weight: 800 !important; color: #000000; border-top: 2px solid #022c22; padding-top: 8px !important; }
          .footer-text { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td valign="top">
              <span class="header-operator">AEROSTAR ALLIANCE</span><br/>
              <span class="header-subtitle">M.A. TOUR & TRAVELS SDN BHD</span><br/>
              <span class="header-subtitle">Kuala Lumpur, Malaysia</span>
            </td>
            <td valign="top" style="text-align: right;">
              <span class="header-title">${title}</span><br/>
              <span class="header-subtitle">Date: ${invoice.createdAt.split('T')[0]}</span><br/>
              <span class="header-subtitle">Invoice ID: ${invoice.id}</span>
            </td>
          </tr>
        </table>

        <table class="info-table">
          <tr>
            <td style="width: 50%;" valign="top">
              <span class="info-label">Bill To Client Account:</span><br/>
              <span class="info-value">${invoice.customerName}</span><br/>
              <span style="font-size:12px; color:#475569;">${invoice.customerEmail}</span>
            </td>
            <td style="width: 50%; text-align: right;" valign="top">
              <span class="info-label">Payment Status:</span><br/>
              <span class="info-value" style="color: ${invoice.paymentStatus === 'Paid' ? '#0f5132' : invoice.paymentStatus === 'Partial' ? '#664d03' : '#842029'}">${invoice.paymentStatus.toUpperCase()}</span><br/>
              ${invoice.bookingId ? `<span class="header-subtitle">Booking Code: ${invoice.bookingId}</span>` : ''}
            </td>
          </tr>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 60%;">Item Description</th>
              <th style="width: 15%; text-align: right;">Unit Price</th>
              <th style="width: 10%; text-align: right;">Qty</th>
              <th style="width: 15%; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td><strong>${item.description}</strong></td>
                <td style="text-align: right;">${invoice.currency} ${item.unitPrice.toLocaleString()}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right; font-weight: bold;">${invoice.currency} ${item.subtotal.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td class="totals-label">Subtotal:</td>
            <td class="totals-value">${invoice.currency} ${invoice.subtotal.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="totals-label">SST/VAT (${invoice.taxPercentage}%):</td>
            <td class="totals-value">+${invoice.currency} ${invoice.taxAmount.toLocaleString()}</td>
          </tr>
          ${invoice.discountAmount > 0 ? `
          <tr style="color: #0f5132;">
            <td class="totals-label" style="font-weight: bold;">Promo Discount:</td>
            <td class="totals-value">-${invoice.currency} ${invoice.discountAmount.toLocaleString()}</td>
          </tr>
          ` : ''}
          <tr class="grand-total-row">
            <td class="totals-label" style="font-size:14px; font-weight:bold;">GRAND TOTAL:</td>
            <td class="totals-value" style="font-size:14px; font-weight:bold; color: #1e3a8a;">${invoice.currency} ${invoice.grandTotal.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="totals-label" style="color:#0f5132; font-weight:bold;">Total Paid:</td>
            <td class="totals-value" style="color:#0f5132;">${invoice.currency} ${invoice.paidAmount.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="totals-label" style="color:#842029; font-weight:bold;">Outstanding Balance:</td>
            <td class="totals-value" style="color:#842029; font-weight:bold;">${invoice.currency} ${(invoice.grandTotal - invoice.paidAmount).toLocaleString()}</td>
          </tr>
        </table>

        ${invoice.remarks ? `
        <div style="background-color: #f8fafc; border-left: 4px solid #022c22; padding: 10px; margin-top:20px; font-size:11px;">
          <strong style="color: #022c22;">Remarks / Wire Transfer Instructions:</strong><br/>
          ${invoice.remarks}
        </div>
        ` : ''}

        <p class="footer-text">
          Generated digitally on official ledger lines of Aerostar Alliance Alliance Operators Bhd.<br/>
          Kuala Lumpur Main Operations - Saudi Arabia Ground Logistics Platform
        </p>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AEROSTAR_INVOICE_${invoice.id}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Statement of Account (SOA) to Word Document (.doc)
  const handleExportSoaWord = () => {
    const title = `Statement of Account - ${soaPartner === 'All' ? 'Consolidated Partners' : soaPartner}`;
    const balance = computedSoaRowsWithCumulative.length > 0 
      ? computedSoaRowsWithCumulative[computedSoaRowsWithCumulative.length - 1].cumulativeOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
      : '0.00';

    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>${title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #333333; line-height: 1.4; padding: 20px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-bottom: 2px solid #000000; padding-bottom: 10px; }
          .header-operator { font-size: 18px; font-weight: bold; color: #022c22; }
          .header-subtitle { font-size: 10px; color: #666666; margin-bottom: 2px; }
          .header-title { font-size: 16px; font-weight: bold; color: #059669; text-align: right; text-transform: uppercase; }
          
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; }
          .meta-td { padding: 10px; font-size: 11px; }
          
          .ledger-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .ledger-table th { background-color: #0f172a; color: #ffffff; font-size: 9px; font-weight: bold; padding: 6px; text-transform: uppercase; text-align: left; }
          .ledger-table td { padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
          .ledger-table tr:nth-child(even) td { background-color: #f8fafc; }
          
          .col-right { text-align: right; }
          .col-center { text-align: center; }
          
          .grand-total-box { margin-left: auto; width: 300px; background-color: #0f172a; color: #ffffff; padding: 15px; text-align: right; font-weight: bold; font-size: 14px; margin-bottom: 30px; border-radius: 4px; }
          .footer-section { margin-top: 50px; width: 100%; border-collapse: collapse; }
          .footer-sign { width: 50%; font-size: 10px; color: #333; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td valign="top">
              <span class="header-operator">AEROSTAR ALLIANCE SDN BHD</span><br/>
              <span class="header-subtitle">Shah Alam, Selangor, Malaysia</span><br/>
              <span class="header-subtitle">Ground Operations & Finance Dept</span>
            </td>
            <td valign="top" style="text-align: right;">
              <span class="header-title">STATEMENT OF LEDGER ACCOUNT</span><br/>
              <span class="header-subtitle">Date Exported: ${new Date().toLocaleDateString()}</span><br/>
              <span class="header-subtitle">Currency: ${soaCurrency}</span>
            </td>
          </tr>
        </table>

        <table class="meta-table">
          <tr>
            <td class="meta-td" style="width: 50%;">
              <strong>CLIENT SUMMARY</strong><br/>
              Partner Account: ${soaPartner === 'All' ? 'Consolidated Master Records' : soaPartner}<br/>
              Selected Hotel Destination: ${soaHotel === 'All' ? 'All Locations' : soaHotel}
            </td>
            <td class="meta-td" style="width: 50%; text-align: right;">
              <strong>STATEMENT METRICS</strong><br/>
              Total Checked Bookings: ${computedSoaRowsWithCumulative.filter(r => r.checked).length}<br/>
              Total Balance Outstanding Due: <strong style="color: #e11d48;">${soaCurrency} ${balance}</strong>
            </td>
          </tr>
        </table>

        <table class="ledger-table">
          <thead>
            <tr>
              <th>Ref No</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Hotel Destination</th>
              <th>AERO REF</th>
              <th class="col-center">Rms</th>
              <th class="col-center">Ngt</th>
              <th class="col-center">Pax</th>
              <th class="col-right">Amount (${soaCurrency})</th>
              <th class="col-right">Paid (${soaCurrency})</th>
              <th class="col-right">Outstanding (${soaCurrency})</th>
            </tr>
          </thead>
          <tbody>
            ${computedSoaRowsWithCumulative.map(row => {
              if (!row.checked) return '';
              return `
                <tr>
                  <td><strong>${row.id}</strong></td>
                  <td class="col-center">${row.checkIn}</td>
                  <td class="col-center">${row.checkOut}</td>
                  <td>${row.hotel}</td>
                  <td>${row.aeroRef}</td>
                  <td class="col-center">${row.roomCount}</td>
                  <td class="col-center">${row.nights}</td>
                  <td class="col-center">${row.paxCount}</td>
                  <td class="col-right">${row.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td class="col-right" style="color: #0f5132;">${row.paid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td class="col-right" style="color: #b91c1c; font-weight: bold;">${row.outstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="grand-total-box">
          <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">CUMULATIVE LEDGER DEBT BALANCED DUE</span><br/>
          <span style="color: #fbbf24; font-size: 16px;">${soaCurrency} ${balance}</span>
        </div>

        <table class="footer-section">
          <tr>
            <td class="footer-sign">
              Statement Requested Of:<br/>
              <strong>${soaPartner === 'All' ? 'Partner Operator Network' : soaPartner}</strong><br/><br/><br/>
              _________________________________<br/>
              Authorized Agency Signature
            </td>
            <td class="footer-sign" style="text-align: right;">
              Prepared on Behalf of Operator:<br/>
              <strong>Aerostar Alliance alliance</strong><br/><br/><br/>
              _________________________________<br/>
              Finance Director Authority Sign
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AEROSTAR_SOA_${soaPartner.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Statement of Account (SOA) to Excel/CSV Document
  const handleExportSoaCSV = () => {
    const headers = 'Ref No,Check-In,Check-Out,Hotel Destination,AERO REF,Travel Pack Description,Rooms,Nights,Pax,Amount,Paid,Outstanding,Cumulative Outstanding,Status\n';
    const rows = computedSoaRowsWithCumulative.map(row => {
      return [
        row.id,
        row.checkIn,
        row.checkOut,
        `"${row.hotel.replace(/"/g, '""')}"`,
        row.aeroRef,
        `"${row.paxRef.replace(/"/g, '""')}"`,
        row.roomCount,
        row.nights,
        row.paxCount,
        row.amount,
        row.paid,
        row.outstanding,
        row.checked ? row.cumulativeOutstanding : '-',
        row.paymentStatus
      ].join(',');
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AEROSTAR_SOA_LEDGER_${soaPartner.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and Drop files handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (file.name.toLowerCase().endsWith('.json')) {
        setImportFormat('JSON');
      } else {
        setImportFormat('CSV');
      }
      setImportPasteData(text);
      setImportStatusMessage(`Successfully read ${file.name}! Preview loaded in pasteboard below.`);
    };
    reader.readAsText(file);
  };

  // Selection auto populate when booking linked inside Create tab
  const handleBookingLinkChange = (id: string) => {
    setLinkedBookingId(id);
    const matched = bookings.find(b => b.id === id);
    if (matched) {
      setNewInvCustomer(matched.customerName);
      setNewInvEmail(matched.customerEmail);
      setNewInvCurrency(matched.currency as any);
      setNewInvLumpSumPrice(matched.totalAmount);
      // Auto build items structure if packages
      setNewInvItems([{
        description: `Lodging & Transportation: ${matched.packageName} for ${matched.paxCount} Pax (Linked to Reservation: ${matched.id})`,
        unitPrice: matched.totalAmount / matched.paxCount,
        quantity: matched.paxCount
      }]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Print Hide Top Header Navigations block-print-hide */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 block-print-hide">
        <div>
          <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-950 text-white"><FileText className="w-5 h-5"/></span>
            {t('invoices')} & Master SOA Billing Desk
          </h2>
          <p className="text-xs text-slate-500 mt-1">Multi-currency invoicing for travelers, operators and corporate agencies in Malaysia, Indonesia, Singapore and Saudi Arabia.</p>
        </div>
        
        {/* Sub Navigation Sub-Tabs */}
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-xl self-stretch md:self-auto">
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'ledger' ? 'bg-white text-emerald-900 shadow-xs border-b-2 border-emerald-900' : 'text-slate-500 hover:text-slate-950'}`}
          >
            <FileText className="w-3.5 h-3.5" />
            Ledger Table
          </button>
          <button
            onClick={() => setActiveSubTab('create')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'create' ? 'bg-white text-emerald-900 shadow-xs border-b-2 border-emerald-900' : 'text-slate-500 hover:text-slate-950'}`}
          >
            <Plus className="w-3.5 h-3.5" />
            New Invoice
          </button>
          <button
            onClick={() => setActiveSubTab('soa')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'soa' ? 'bg-white text-emerald-900 shadow-xs border-b-2 border-emerald-900' : 'text-slate-500 hover:text-slate-950'}`}
          >
            <Printer className="w-3.5 h-3.5" />
            Statement of Account (SOA)
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'reports' ? 'bg-white text-emerald-900 shadow-xs border-b-2 border-emerald-900' : 'text-slate-500 hover:text-slate-950'}`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Finance Audit Reports
          </button>
          <button
            onClick={() => setActiveSubTab('import')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'import' ? 'bg-white text-emerald-900 shadow-xs border-b-2 border-emerald-900' : 'text-slate-500 hover:text-slate-950'}`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Imports Pasteboard
          </button>
        </div>
      </div>

      {/* ======================= TAB 1: INVOICES LEDGER ======================= */}
      {activeSubTab === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 block-print-hide">
          {/* List panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search client, ref or code..."
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-emerald-800"
                />
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-emerald-800"
                >
                  <option value="All">All statuses</option>
                  <option value="Paid">🟢 Paid Only</option>
                  <option value="Partial">🟡 Partially Paid</option>
                  <option value="Unpaid">🔴 Unpaid Only</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-emerald-800"
                >
                  <option value="All">All Types</option>
                  <option value="Booking">Auto-Booking</option>
                  <option value="Manual">Manual Ad-hoc</option>
                  <option value="Lump Sum">Lump Sum Base</option>
                  <option value="Proforma">Proforma Quotes</option>
                </select>

                <button
                  onClick={() => handleExportCSV(filteredInvoices)}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Export listing to Excel/CSV"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Excel CSV
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-4 px-6">Invoice Number</th>
                      <th className="py-4 px-6">Customer & Connection</th>
                      <th className="py-4 px-6">Category Type</th>
                      <th className="py-4 px-6 text-right">Invoice Sum</th>
                      <th className="py-4 px-6 text-center">Settlement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs text-slate-800">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                          No matching invoices located on disk.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map(inv => (
                        <tr 
                          key={inv.id} 
                          onClick={() => handleInvoiceSelect(inv)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedInvoice?.id === inv.id ? "bg-emerald-50/30 font-semibold" : ""}`}
                        >
                          <td className="py-4 px-6 font-mono font-bold text-slate-900">
                            <span className="block">{inv.id}</span>
                            <span className="text-[9px] text-slate-400 font-normal">Created: {inv.createdAt.split('T')[0]}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-extrabold text-slate-900 text-sm block">{inv.customerName}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Email: {inv.customerEmail} | {inv.bookingId ? `Booking: ${inv.bookingId}` : 'Ad-hoc invoice'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider ${
                              (inv.invoiceType || 'Booking') === 'Booking' ? 'bg-sky-50 text-sky-850 border border-sky-100' :
                              (inv.invoiceType || 'Booking') === 'Manual' ? 'bg-purple-50 text-purple-800 border border-purple-100' :
                              (inv.invoiceType || 'Booking') === 'Proforma' ? 'bg-amber-50 text-amber-850 border border-amber-200 font-extrabold' : 'bg-slate-50 text-slate-800 border border-slate-150'
                            }`}>
                              {inv.invoiceType || 'Booking'}
                              {inv.version && inv.version > 1 ? ` (v${inv.version})` : ''}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-black text-slate-950">
                            {inv.currency} {inv.grandTotal.toLocaleString()}
                            <span className="text-[9px] text-emerald-800 block font-normal">Paid: {inv.currency} {inv.paidAmount.toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex justify-center">
                              {inv.paymentStatus === 'Paid' && (
                                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase">
                                  Settled
                                </span>
                              )}
                              {inv.paymentStatus === 'Partial' && (
                                <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase">
                                  Partial
                                </span>
                              )}
                              {inv.paymentStatus === 'Unpaid' && (
                                <span className="bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase animate-[pulse_2s_infinite]">
                                  Unpaid
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detailed Audit & Editing Desk */}
          <div className="lg:col-span-1">
            {selectedInvoice ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm relative overflow-hidden">
                
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-900 via-emerald-950 to-amber-500" />

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Ledger Statement ID</span>
                    <h3 className="text-base font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                      {selectedInvoice.id} 
                      <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">v{selectedInvoice.version || 1}</span>
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedInvoice(null)} 
                    className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Edit Form trigger or Conversion Panel */}
                {isEditingInvoice ? (
                  <form onSubmit={handleSaveInvoiceEdits} className="space-y-4 pt-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-xs font-black text-slate-900">Adjust Invoice Structure</span>
                      <button 
                        type="button" 
                        onClick={() => setIsEditingInvoice(false)}
                        className="text-[10px] bg-white border px-1.5 py-0.5 rounded font-bold text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Customer Name</label>
                        <input 
                          type="text" 
                          value={editForm.customerName}
                          onChange={e => setEditForm({...editForm, customerName: e.target.value})}
                          className="bg-white border rounded-lg p-1.5 w-full mt-0.5" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Customer Email</label>
                        <input 
                          type="email" 
                          value={editForm.customerEmail}
                          onChange={e => setEditForm({...editForm, customerEmail: e.target.value})}
                          className="bg-white border rounded-lg p-1.5 w-full mt-0.5" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Billing Currency</label>
                          <select 
                            value={editForm.currency}
                            onChange={e => setEditForm({...editForm, currency: e.target.value as any})}
                            className="bg-white border rounded-lg p-1.5 w-full mt-0.5"
                          >
                            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Due Date</label>
                          <input 
                            type="date" 
                            value={editForm.dueDate}
                            onChange={e => setEditForm({...editForm, dueDate: e.target.value})}
                            className="bg-white border rounded-lg p-1.5 w-full mt-0.5 text-xs font-mono" 
                          />
                        </div>
                      </div>

                      {/* Items row editor */}
                      <div className="space-y-1.5 pt-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span>Billing Items entry</span>
                          <button 
                            type="button" 
                            onClick={() => handleAddItemRow(true)}
                            className="text-emerald-800 hover:text-emerald-905 flex items-center gap-0.5 font-sans"
                          >
                            + Add Item
                          </button>
                        </div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {editForm.items?.map((it, idx) => (
                            <div key={idx} className="bg-white p-2 rounded-lg border border-slate-250 flex flex-col gap-1.5 relative">
                              <button 
                                type="button" 
                                onClick={() => handleRemoveItemRow(idx, true)}
                                className="absolute top-1 right-1 text-rose-500 hover:text-rose-700"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <input 
                                type="text"
                                value={it.description}
                                onChange={e => handleItemValueChange(idx, 'description', e.target.value, true)}
                                placeholder="Service description..."
                                className="bg-slate-50 border p-1 rounded-sm text-[10px] w-full"
                              />
                              <div className="grid grid-cols-2 gap-1">
                                <div>
                                  <label className="text-[8px] text-slate-400 block font-bold">Price ({editForm.currency})</label>
                                  <input 
                                    type="number"
                                    value={it.unitPrice}
                                    onChange={e => handleItemValueChange(idx, 'unitPrice', Number(e.target.value), true)}
                                    className="bg-slate-50 border p-1 rounded-sm text-[10px] font-mono w-full"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] text-slate-400 block font-bold">Qty</label>
                                  <input 
                                    type="number"
                                    value={it.quantity}
                                    onChange={e => handleItemValueChange(idx, 'quantity', Number(e.target.value), true)}
                                    className="bg-slate-50 border p-1 rounded-sm text-[10px] font-mono w-full"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Tax (%)</label>
                          <input 
                            type="number" 
                            value={editForm.taxPercentage}
                            onChange={e => setEditForm({...editForm, taxPercentage: Number(e.target.value)})}
                            className="bg-white border rounded-lg p-1.5 w-full mt-0.5" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Discount ({editForm.currency})</label>
                          <input 
                            type="number" 
                            value={editForm.discountAmount}
                            onChange={e => setEditForm({...editForm, discountAmount: Number(e.target.value)})}
                            className="bg-white border rounded-lg p-1.5 w-full mt-0.5" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Validity Period (Proforma only)</label>
                        <input 
                          type="text" 
                          value={editForm.validityPeriod}
                          onChange={e => setEditForm({...editForm, validityPeriod: e.target.value})}
                          placeholder="e.g. Valid until July 15, 2026"
                          className="bg-white border rounded-lg p-1.5 w-full mt-0.5" 
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-emerald-900 text-white font-bold py-2 rounded-xl text-xs hover:bg-emerald-950 mt-4 cursor-pointer"
                    >
                      Process & Log Structural Changes
                    </button>
                  </form>
                ) : (
                  <>
                    {/* Standard Invoice presentation box */}
                    <div className="space-y-3">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Category</span>
                          <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-md ${
                            selectedInvoice.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-850' : 
                            selectedInvoice.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-805' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {selectedInvoice.invoiceType || 'Booking'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                          <div>
                            <span className="text-slate-400">Invoiced Value:</span>
                            <p className="font-extrabold text-slate-950 text-sm">{selectedInvoice.currency} {selectedInvoice.grandTotal.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Total Collected:</span>
                            <p className="font-extrabold text-emerald-850 text-sm">{selectedInvoice.currency} {selectedInvoice.paidAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Proforma special panel */}
                      {selectedInvoice.invoiceType === 'Proforma' && (
                        <div className="bg-amber-50 p-3.5 border border-amber-200 rounded-xl space-y-3">
                          <div className="flex items-center gap-1.5 text-amber-850 font-black text-xs">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            Quotation & Conversion Ready
                          </div>
                          <p className="text-[10px] text-amber-900 leading-tight">This Proforma Invoice functions as a prepay requisition or quote summary. You can convert it into a standard invoice with a single click.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConvertProforma('Booking')}
                              className="bg-emerald-900 text-white font-extrabold hover:bg-emerald-950 px-2.5 py-1 rounded text-[10px]"
                            >
                              Confirm Booking
                            </button>
                            <button
                              onClick={() => handleConvertProforma('Manual')}
                              className="bg-white border text-slate-700 font-extrabold hover:bg-slate-50 px-2.5 py-1 rounded text-[10px]"
                            >
                              Convert to Manual
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Display Validity Period / Remarks */}
                      {(selectedInvoice.validityPeriod || selectedInvoice.dueDate) && (
                        <div className="text-[10px] text-slate-500 bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-1">
                          {selectedInvoice.validityPeriod && <p><strong>Validity Offer:</strong> {selectedInvoice.validityPeriod}</p>}
                          <p><strong>Payment Due:</strong> {selectedInvoice.dueDate}</p>
                          {selectedInvoice.remarks && <p><strong>Special Instructions:</strong> {selectedInvoice.remarks}</p>}
                        </div>
                      )}

                      {/* Receipt printing preview */}
                      <div id="printable_invoice_area" className="border border-slate-200 rounded-xl p-4 bg-slate-50 font-sans shadow-inner space-y-4 text-[10px]">
                        <div className="border-b border-slate-300 pb-3 flex justify-between items-center font-mono">
                          <div>
                            <span className="font-black text-xs text-emerald-950 block">AEROSTAR ALLIANCE</span>
                            <span className="text-[8px] text-slate-400 block leading-tight">M.A. TOUR & TRAVELS SDN BHD</span>
                            <span className="text-[8px] text-slate-400 block leading-tight">Kuala Lumpur, Malaysia</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black block text-slate-900">
                              {selectedInvoice.invoiceType === 'Proforma' ? 'PROFORMA INVOICE' : 'OFFICIAL INVOICE'}
                            </span>
                            <span className="text-[8px] text-slate-400 block">Date: {selectedInvoice.createdAt.split('T')[0]}</span>
                            <span className="text-[8px] text-slate-400 block">No: {selectedInvoice.id}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-400 uppercase tracking-wide block">Bill to (Client Account):</span>
                          <p className="font-extrabold text-slate-950 text-xs">{selectedInvoice.customerName}</p>
                          <p className="text-slate-500 leading-tight">{selectedInvoice.customerEmail}</p>
                          {selectedInvoice.bookingId && <p className="text-[8px] text-slate-400 font-mono">Reference Booking Code: {selectedInvoice.bookingId}</p>}
                        </div>

                        <div className="border-t border-b border-slate-300 py-2 space-y-1">
                          <div className="grid grid-cols-5 font-bold text-slate-400 text-[8px] uppercase tracking-wider pb-1">
                            <span className="col-span-3">Item Description</span>
                            <span className="text-right">Qty</span>
                            <span className="text-right">Subtotal</span>
                          </div>
                          {selectedInvoice.items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-5 text-slate-700 py-1.5 border-t border-slate-100 font-mono">
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
                              <span>Promo Discount:</span>
                              <span>-{selectedInvoice.currency} {selectedInvoice.discountAmount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between w-44 text-slate-950 font-black border-t border-slate-300 pt-1 text-xs">
                            <span>GRAND TOTAL:</span>
                            <span>{selectedInvoice.currency} {selectedInvoice.grandTotal.toLocaleString()}</span>
                          </div>
                        </div>

                        <p className="text-center text-[7px] text-slate-400 pt-3 border-t border-slate-300 italic font-mono">
                          Generated digitally on official ledger lines of Aerostar Alliance Alliance Operators Bhd.
                        </p>
                      </div>

                      {/* Share and Print controls */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handlePrint}
                          className="flex-1 bg-slate-950 hover:bg-slate-900 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print / Export PDF
                        </button>
                        <button
                          onClick={() => handleExportWord(selectedInvoice)}
                          className="flex-1 bg-sky-905 hover:bg-sky-950 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer bg-emerald-950"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Download Word (.doc)
                        </button>
                        <button
                          onClick={startEditingInvoice}
                          disabled={selectedInvoice.paymentStatus === 'Paid'}
                          className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 ${
                            selectedInvoice.paymentStatus === 'Paid' 
                              ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'
                          }`}
                          title="Only allowed before full payment settled"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          Adjust Structure
                        </button>
                      </div>

                      {/* Payment logger button */}
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setIsUpdatingPayment(!isUpdatingPayment)}
                          className="w-full bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Update Payment & Deposits
                        </button>
                      </div>

                      {/* WhatsApp / Email Quick Share Buttons */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Quick Copy Share Templates</span>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <button
                            onClick={() => handleCopyShareTemplate('whatsapp')}
                            className="bg-white border border-slate-250 hover:bg-slate-100 p-2 rounded-lg font-bold text-slate-700 flex items-center gap-1 justify-center relative cursor-pointer"
                          >
                            <Send className="w-3 h-3 text-emerald-600" />
                            {copiedType === 'whatsapp' ? '✓ Copied' : 'WhatsApp'}
                          </button>
                          <button
                            onClick={() => handleCopyShareTemplate('email')}
                            className="bg-white border border-slate-250 hover:bg-slate-100 p-2 rounded-lg font-bold text-slate-700 flex items-center gap-1 justify-center relative cursor-pointer"
                          >
                            <Copy className="w-3 h-3 text-sky-600" />
                            {copiedType === 'email' ? '✓ Copied' : 'Email Draft'}
                          </button>
                        </div>
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

                      {/* Display Audit Trail inside selected invoice */}
                      {selectedInvoice.history && selectedInvoice.history.length > 0 && (
                        <div className="border-t border-slate-100 pt-4 space-y-2">
                          <span className="text-[9.5px] uppercase font-bold text-slate-400 font-mono tracking-widest block">Audit Trails Ledger</span>
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                            {selectedInvoice.history.map((log, lIdx) => (
                              <div key={lIdx} className="bg-slate-50/50 p-2 rounded border border-slate-150 text-[9px] space-y-0.5 leading-tight">
                                <div className="flex justify-between items-center text-slate-500 font-semibold">
                                  <span>{log.action}</span>
                                  <span>{log.timestamp.split('T')[0]}</span>
                                </div>
                                <p className="text-slate-800 font-mono">{log.changes}</p>
                                <p className="text-[8px] text-slate-400">By {log.authorName} ({log.authorEmail})</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-semibold">Select an invoice from the ledger table to audit, print receipts, adjust structural billing, or export templates.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 2: CREATE INVOICE ======================= */}
      {activeSubTab === 'create' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6 max-w-4xl mx-auto block-print-hide">
          <div className="border-b border-slate-150 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900">Establish Billing Statement</h3>
              <p className="text-xs text-slate-500">Initiate manual ad-hoc, single value lump sum, or quote-ready proforma invoices.</p>
            </div>
            
            <div className="flex gap-2">
              {(['Manual', 'Lump Sum', 'Proforma'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setNewInvType(type);
                    if (type === 'Proforma') setNewInvTaxPct(15); // Standard SAR Proforma VAT
                    else setNewInvTaxPct(6);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                    newInvType === type 
                      ? 'bg-emerald-950 text-white border-emerald-900 shadow-xs' 
                      : 'bg-slate-50 text-slate-600 border-slate-250 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateInvoiceSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Target / Reference Booking LINK */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">Link Confirmed Booking (Optional)</label>
                <select
                  value={linkedBookingId}
                  onChange={e => handleBookingLinkChange(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs w-full focus:outline-emerald-800"
                >
                  <option value="">-- No Booking Linked (Ad-hoc) --</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id} - {b.customerName} ({b.packageName || b.bookingType})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">Linking a booking auto-fills client name, email addresses, and generates item entries.</p>
              </div>

              {/* Passenger name */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">Customer or B2B Partner Agent Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tiram Travel Sdn Bhd"
                  value={newInvCustomer}
                  onChange={e => setNewInvCustomer(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs w-full focus:outline-emerald-800 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">Client Contact Email</label>
                <input
                  type="email"
                  placeholder="operations@tiram.com"
                  value={newInvEmail}
                  onChange={e => setNewInvEmail(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs w-full focus:outline-emerald-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Currency</label>
                  <select
                    value={newInvCurrency}
                    onChange={e => setNewInvCurrency(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs w-full focus:outline-emerald-800"
                  >
                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Invoice Due Date</label>
                  <input
                    type="date"
                    value={newInvDueDate}
                    onChange={e => setNewInvDueDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs w-full focus:outline-emerald-800 font-mono"
                  />
                </div>
              </div>

              {newInvType === 'Proforma' && (
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Quotation Validity period</label>
                  <input
                    type="text"
                    placeholder="e.g. Validity till Checked in Date (Sept 2026)"
                    value={newInvValidity}
                    onChange={e => setNewInvValidity(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs w-full focus:outline-emerald-800"
                  />
                </div>
              )}
            </div>

            {/* Item Breakdowns or Lump Sum section */}
            {newInvType === 'Lump Sum' ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <span className="text-xs font-bold text-slate-600 block uppercase">Lump Sum Billing Configuration</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Service Description</label>
                    <input
                      type="text"
                      value={newInvLumpSumDesc}
                      onChange={e => setNewInvLumpSumDesc(e.target.value)}
                      className="bg-white border p-2 rounded-lg text-xs w-full focus:outline-emerald-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Lump Sum Price ({newInvCurrency})</label>
                    <input
                      type="number"
                      value={newInvLumpSumPrice}
                      onChange={e => setNewInvLumpSumPrice(Number(e.target.value))}
                      className="bg-white border p-2 rounded-lg text-xs w-full font-mono focus:outline-emerald-800"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-widest font-mono">Invoice Billing Items Grid</span>
                  <button
                    type="button"
                    onClick={() => handleAddItemRow(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-extrabold px-3 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    + Add Charge Row
                  </button>
                </div>

                <div className="space-y-2">
                  {newInvItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 relative pr-10">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx, false)}
                        className="absolute right-3.5 top-8 md:top-3.5 text-rose-500 hover:text-rose-700"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Item Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => handleItemValueChange(idx, 'description', e.target.value, false)}
                          placeholder="e.g. 10x Standard Double occupancy Fairmont..."
                          className="bg-white border p-1 rounded-md text-xs w-full"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Price ({newInvCurrency})</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={e => handleItemValueChange(idx, 'unitPrice', Number(e.target.value), false)}
                          className="bg-white border p-1 rounded-md text-xs font-mono w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => handleItemValueChange(idx, 'quantity', Number(e.target.value), false)}
                          className="bg-white border p-1 rounded-md text-xs font-mono w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block text-right">Sum</label>
                        <p className="text-right text-xs font-bold font-mono pt-1.5 text-slate-800">
                          {newInvCurrency} {(item.unitPrice * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calculations summaries */}
            <div className="border-t border-slate-200 pt-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              
              <div className="space-y-2 w-full md:w-80">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">Tax Rate (%)</label>
                    <input
                      type="number"
                      value={newInvTaxPct}
                      onChange={e => setNewInvTaxPct(Number(e.target.value))}
                      className="bg-slate-50 border p-1.5 rounded-lg text-xs font-bold w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">Discount ({newInvCurrency})</label>
                    <input
                      type="number"
                      value={newInvDiscount}
                      onChange={e => setNewInvDiscount(Number(e.target.value))}
                      className="bg-slate-50 border p-1.5 rounded-lg text-xs font-bold w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Remarks / Notes</label>
                  <textarea
                    rows={2}
                    value={newInvRemarks}
                    onChange={e => setNewInvRemarks(e.target.value)}
                    placeholder="Special terms, wire-transfer codes, or reference links."
                    className="bg-slate-50 border p-1.5 rounded-lg text-xs w-full"
                  />
                </div>
              </div>

              {/* Computed Breakdown card */}
              <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 w-full md:w-80 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span>Gross Subtotal:</span>
                  <span className="font-bold">
                    {newInvCurrency} {(newInvType === 'Lump Sum' ? newInvLumpSumPrice : newInvItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Tax ({newInvTaxPct}%):</span>
                  <span className="font-bold">
                    +{newInvCurrency} {Math.round((newInvType === 'Lump Sum' ? newInvLumpSumPrice : newInvItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0)) * (newInvTaxPct / 100)).toLocaleString()}
                  </span>
                </div>
                {newInvDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-extrabold">
                    <span>Discount Applied:</span>
                    <span>-{newInvCurrency} {newInvDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-black text-sm border-t border-slate-750 pt-2 font-sans">
                  <span>Grand Total:</span>
                  <span className="text-amber-400 font-mono">
                    {newInvCurrency} {(
                      (newInvType === 'Lump Sum' ? newInvLumpSumPrice : newInvItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0)) +
                      Math.round((newInvType === 'Lump Sum' ? newInvLumpSumPrice : newInvItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0)) * (newInvTaxPct / 100)) - 
                      newInvDiscount
                    ).toLocaleString()}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-2.5 rounded-xl text-xs font-sans mt-3 cursor-pointer transition-colors"
                >
                  Generate {newInvType} Invoice
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* ======================= TAB 3: STATEMENT OF ACCOUNT (SOA) ======================= */}
      {activeSubTab === 'soa' && (
        <div className="space-y-6">
          
          {/* filters, hidden in print */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 block-print-hide space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-none">Generate Statement of Account Ledger (SOA)</h3>
              <p className="text-xs text-slate-400 mt-1">Audit, consolidate travel rooms, nights allocations, and generate cumulative outstanding debt balances for agencies and operators.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Customer / B2B Agent</label>
                <select
                  value={soaPartner}
                  onChange={e => setSoaPartner(e.target.value)}
                  className="bg-slate-50 border p-2 rounded-lg text-xs w-full focus:outline-emerald-800"
                >
                  <option value="All">All Partners / Walk-In</option>
                  {partners.map(p => <option key={p.id} value={p.companyName}>{p.companyName} ({p.country})</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Hotel Location</label>
                <select
                  value={soaHotel}
                  onChange={e => setSoaHotel(e.target.value)}
                  className="bg-slate-50 border p-2 rounded-lg text-xs w-full focus:outline-emerald-800"
                >
                  <option value="All">All Hotels</option>
                  <option value="FAIRMONT (KV)">Fairmont Clock Tower (KV)</option>
                  {uniqueHotels.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Statement Currency</label>
                <select
                  value={soaCurrency}
                  onChange={e => setSoaCurrency(e.target.value as any)}
                  className="bg-slate-50 border p-2 rounded-lg text-xs w-full focus:outline-emerald-800 font-bold"
                >
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">From Date</label>
                <input
                  type="date"
                  value={soaDateFrom}
                  onChange={e => setSoaDateFrom(e.target.value)}
                  className="bg-slate-50 border p-2 rounded-lg text-xs w-full font-mono text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">To Date</label>
                <input
                  type="date"
                  value={soaDateTo}
                  onChange={e => setSoaDateTo(e.target.value)}
                  className="bg-slate-50 border p-2 rounded-lg text-xs w-full font-mono text-center"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                onClick={handlePrint}
                className="bg-emerald-900 border border-emerald-800 hover:bg-emerald-950 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4.5 h-4.5" />
                Print Statement (Landscape PDF)
              </button>
              <button
                onClick={handleExportSoaCSV}
                className="bg-slate-800 border border-slate-700 hover:bg-slate-900 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4.5 h-4.5" />
                Export to Excel CSV
              </button>
              <button
                onClick={handleExportSoaWord}
                className="bg-blue-900 border border-blue-800 hover:bg-blue-950 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 cursor-pointer bg-emerald-950"
              >
                <FileDown className="w-4.5 h-4.5" />
                Export to Word (.doc)
              </button>
            </div>
          </div>

          {/* Statement Layout, print-allotments-block class prints elegantly */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs print-allotments-block">
            
            {/* Header elements */}
            <div className="flex justify-between items-start border-b-2 border-slate-200 pb-5 mb-5">
              <div className="space-y-1">
                <span className="font-mono font-bold text-slate-400 text-[10px] block uppercase tracking-widest">Statement of Ledger Account</span>
                <h2 className="text-xl font-black text-slate-900 uppercase">Aerostar Alliance Sdn Bhd</h2>
                <p className="text-xs text-slate-500 font-medium">Unit 1-3 (UG Floor) Lot 1, No 1, Pusat Perniagaan UOA Shah Alam, Selangor, Malaysia</p>
                <p className="text-[10px] text-slate-500 font-mono">Date Generated: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="text-right space-y-1 text-xs">
                <span className="text-slate-400 block font-bold uppercase tracking-wide text-[10px]">Client / Partner Account:</span>
                <p className="font-extrabold text-slate-950 text-sm">{soaPartner === 'All' ? 'Consolidated All Partners' : soaPartner}</p>
                <p className="text-slate-500">Selected Hotel Group: {soaHotel === 'All' ? 'All Hotels/Ground Services' : soaHotel}</p>
                <p className="text-emerald-950 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1 rounded inline-block">Ledger Base: {soaCurrency}</p>
              </div>
            </div>

            {/* Tables containing allotment matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px] font-sans">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 font-bold uppercase text-[9px] tracking-wider border-b border-slate-800">
                    <th className="py-2.5 px-3 block-print-hide text-center" style={{ width: '40px' }}>Include</th>
                    <th className="py-2.5 px-3">Ref No</th>
                    <th className="py-2.5 px-3 text-center">Check-In</th>
                    <th className="py-2.5 px-3 text-center">Check-Out</th>
                    <th className="py-2.5 px-3">Hotel Destination</th>
                    <th className="py-2.5 px-3">AERO REF</th>
                    <th className="py-2.5 px-3">Travel Pack Description</th>
                    <th className="py-2.5 px-3 text-center font-mono">Rms</th>
                    <th className="py-2.5 px-3 text-center font-mono">Ngt</th>
                    <th className="py-2.5 px-3 text-center font-mono">Pax</th>
                    <th className="py-2.5 px-3 text-right" style={{ color: '#fbbf24' }}>Amount ({soaCurrency})</th>
                    <th className="py-2.5 px-3 text-right text-emerald-300">Paid ({soaCurrency})</th>
                    <th className="py-2.5 px-3 text-right text-rose-300 font-bold">Outstanding ({soaCurrency})</th>
                    <th className="py-2.5 px-3 text-right bg-slate-950 text-amber-400 font-bold" style={{ minWidth: '100px' }}>Outstanding Sum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[10px] text-slate-800 font-mono">
                  {computedSoaRowsWithCumulative.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                        No transactions registered matching metrics on ledger database file.
                      </td>
                    </tr>
                  ) : (
                    computedSoaRowsWithCumulative.map((row, idx) => (
                      <tr key={row.id} className={`hover:bg-slate-50 ${!row.checked ? 'opacity-40 line-through' : ''}`}>
                        
                        {/* selection checkbox, hidden in print */}
                        <td className="py-3 px-3 block-print-hide text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSoaSelectedChecked({
                              ...soaSelectedChecked,
                              [row.id]: !row.checked
                            })}
                            className="text-slate-500 hover:text-slate-800"
                          >
                            {row.checked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-800 mx-auto" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-350 mx-auto" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3 font-bold text-slate-950 font-sans">{row.id}</td>
                        <td className="py-3 px-3 text-center">{row.checkIn}</td>
                        <td className="py-3 px-3 text-center">{row.checkOut}</td>
                        <td className="py-3 px-3 font-sans truncate" style={{ maxWidth: '120px' }}>{row.hotel}</td>
                        <td className="py-3 px-3 text-sky-850 font-bold uppercase tracking-wide font-sans">{row.aeroRef}</td>
                        <td className="py-3 px-3 font-sans truncate" style={{ maxWidth: '140px' }}>{row.paxRef}</td>
                        
                        <td className="py-3 px-3 text-center font-bold text-slate-905">{row.roomCount}</td>
                        <td className="py-3 px-3 text-center">{row.nights}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{row.paxCount}</td>
                        
                        <td className="py-3 px-3 text-right font-bold text-slate-950">{row.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td className="py-3 px-3 text-right text-emerald-800">{row.paid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td className="py-3 px-3 text-right text-rose-700 font-extrabold">{row.outstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        
                        {/* Running sum */}
                        <td className="py-3 px-3 text-right bg-slate-50 text-slate-900 font-extrabold">
                          {row.checked ? row.cumulativeOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Grand Total outstanding */}
            <div className="border-t-2 border-slate-300 pt-4 mt-6 flex justify-between items-center text-sm font-sans flex-col md:flex-row gap-4">
              <div className="text-slate-500 font-medium">
                Showing {computedSoaRowsWithCumulative.filter(r => r.checked).length} checked records with booking references.
              </div>
              
              <div className="bg-slate-900 text-white p-4 rounded-xl text-right font-mono min-w-[280px]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-none">Cumulative Statement Balanced Due</p>
                <p className="text-lg font-black text-amber-400 mt-1.5">
                  {soaCurrency} {computedSoaRowsWithCumulative.length > 0 
                    ? computedSoaRowsWithCumulative[computedSoaRowsWithCumulative.length - 1].cumulativeOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) 
                    : '0.00'}
                </p>
              </div>
            </div>

            {/* Signature section */}
            <div className="grid grid-cols-2 gap-12 pt-16 text-[9px] font-sans">
              <div>
                <p className="text-slate-400">Statement requested of:</p>
                <p className="font-extrabold text-slate-800 mt-0.5">{soaPartner === 'All' ? 'Operations Desk Partner Group' : soaPartner}</p>
                <div className="border-b border-dashed border-slate-300 w-36 h-12" />
                <p className="text-slate-400 mt-1">Authorized Agency Sign</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-slate-400">Prepared on behalf of Operator:</p>
                <p className="font-extrabold text-slate-800 mt-0.5">Aerostar Alliance alliance</p>
                <div className="border-b border-dashed border-slate-300 w-36 h-12" />
                <p className="text-slate-400 mt-1">Finance Executive Signature Address</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================= TAB 4: FINANCE AUDIT REPORTS ======================= */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6 block-print-hide">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Total Collected */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Gross Cash Inflow</span>
              <p className="text-2xl font-black text-slate-950 font-mono">MYR {reportingMetrics.paidMYR.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400 block">Settled payouts already received.</span>
            </div>

            {/* Total Outstanding */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Master Outstanding Ledger</span>
              <p className="text-2xl font-black text-rose-700 font-mono">MYR {reportingMetrics.outstandingMYR.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400 block">Cumulative remaining client debt.</span>
            </div>

            {/* Conversion rate */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Proforma Conversion</span>
              <p className="text-2xl font-black text-emerald-800 font-mono">{reportingMetrics.conversionRate}%</p>
              <span className="text-[10px] text-slate-400 block">{reportingMetrics.convertedProformas} converted from {reportingMetrics.totalProformas} quotes.</span>
            </div>

            {/* Total active ledger */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Billing Valuation</span>
              <p className="text-2xl font-black text-slate-900 font-mono">MYR {reportingMetrics.totalRevenueMYR.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400 block">Excluding estimated proforma quotes.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Type breakdown lists */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
              <h3 className="text-xs uppercase font-extrabold text-slate-400 font-mono tracking-widest">Revenue by Invoice Type</h3>
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 pb-1">
                    <span>Auto Booking-Based Billing</span>
                    <span className="font-mono">MYR {reportingMetrics.bookingRevenueMYR.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-sky-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(100, (reportingMetrics.bookingRevenueMYR / (reportingMetrics.totalRevenueMYR || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 pb-1">
                    <span>Manual Ad-hoc Invoicing</span>
                    <span className="font-mono">MYR {reportingMetrics.manualRevenueMYR.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-purple-600 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(100, (reportingMetrics.manualRevenueMYR / (reportingMetrics.totalRevenueMYR || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 pb-1">
                    <span>Lump Sum Operational Billing</span>
                    <span className="font-mono">MYR {reportingMetrics.lumpSumRevenueMYR.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-slate-800 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(100, (reportingMetrics.lumpSumRevenueMYR / (reportingMetrics.totalRevenueMYR || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-amber-800 pb-1">
                    <span>Proforma Estimates (Not included in gross totals)</span>
                    <span className="font-mono">MYR {reportingMetrics.proformaRevenueMYR.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-400 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(100, (reportingMetrics.proformaRevenueMYR / (reportingMetrics.totalRevenueMYR || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Audit Tips */}
            <div className="bg-emerald-950 text-slate-100 rounded-2xl p-6 border border-emerald-900 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-amber-400 font-extrabold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Operator Audit Guidelines
                </div>
                <h4 className="text-base font-black text-white leading-tight">Accurate Financial Synchronizations</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The billing engine validates tax structures depending on local regulations: MYR invoices auto-inject 6% SST, while SAR ones apply 15% VAT for local compliance, matching corporate standards.
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Only invoices with unpaid or partially settled indicators can qualify for architectural structural adjustment edits. Fully paid ledger accounts remain unmodifiable to prevent billing discrepancies.
                </p>
              </div>

              <div className="pt-4 border-t border-emerald-850 flex justify-between items-center text-[10px] text-emerald-300 font-mono">
                <span>System Health: Compliant</span>
                <span>Audit Period: 1447H Enterprise</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================= TAB 5: IMPORT / BULK OPERATIONS ======================= */}
      {activeSubTab === 'import' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6 max-w-2xl mx-auto block-print-hide">
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-none">Bulk Invoice Ledger Import</h3>
            <p className="text-xs text-slate-400 mt-1.5 font-sans">Upload your Excel/CSV reports, drag and drop documents, or paste serialized JSON payloads directly into the database ledger.</p>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 transition-all text-center relative ${
              dragActive 
                ? 'border-emerald-600 bg-emerald-50/50' 
                : 'border-slate-350 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-400'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-emerald-850 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-bold text-slate-800">Drag and drop your Excel CSV or JSON file here</p>
            <p className="text-xs text-slate-400 mt-0.5">Supports CSV, Excel-exported ledger sheets, or raw JSON arrays</p>
            <div className="mt-3">
              <label className="bg-emerald-950 hover:bg-emerald-900 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer shadow-xs inline-block transition-colors">
                Browse Files
                <input 
                  type="file" 
                  accept=".csv,.json"
                  onChange={handleChangeFile}
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {importStatusMessage && (
            <div className="bg-emerald-50 text-emerald-810 p-4 border border-emerald-200 rounded-xl text-xs font-bold leading-relaxed flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-700" />
              {importStatusMessage}
            </div>
          )}

          <form onSubmit={handleBulkImportSubmit} className="space-y-4">
            <div className="flex gap-4 items-center">
              <span className="text-xs font-bold text-slate-500 uppercase font-mono">Choose Format:</span>
              <label className="flex items-center gap-1.5 text-xs font-bold">
                <input 
                  type="radio" 
                  name="importFormat" 
                  checked={importFormat === 'CSV'} 
                  onChange={() => setImportFormat('CSV')} 
                />
                Delimited CSV Format
              </label>
              <label className="flex items-center gap-1.5 text-xs font-bold">
                <input 
                  type="radio" 
                  name="importFormat" 
                  checked={importFormat === 'JSON'} 
                  onChange={() => setImportFormat('JSON')} 
                />
                RAW JSON Array
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <label className="font-extrabold text-slate-400 uppercase tracking-wide">Data Pasteboard</label>
                <button
                  type="button"
                  onClick={() => {
                    if (importFormat === 'CSV') {
                      setImportPasteData(
                        'customerName,customerEmail,grandTotal,currency,type,bookingId\n' +
                        'Al-Safa Tours Jakarta,ops@alsafa-travel.id,45000,SAR,Manual,BK-1002\n' +
                        'Dar El-Iman Agency Singapore,accounts@dar-eliman.sg,15000,SGD,Proforma,BK-1001\n' +
                        'Pakej Umrah Haji Ahmad,finance@nusantara-net.id,12400,MYR,Lump Sum,\n'
                      );
                    } else {
                      setImportPasteData(
                        '[\n' +
                        '  {\n' +
                        '    "customerName": "Al-Safa Tours Jakarta",\n' +
                        '    "customerEmail": "ops@alsafa-travel.id",\n' +
                        '    "grandTotal": 45000,\n' +
                        '    "currency": "SAR",\n' +
                        '    "invoiceType": "Manual"\n' +
                        '  }\n' +
                        ']'
                      );
                    }
                  }}
                  className="text-emerald-800 font-bold hover:underline"
                >
                  Insert Sample Matrix
                </button>
              </div>

              <textarea
                value={importPasteData}
                onChange={e => setImportPasteData(e.target.value)}
                rows={8}
                placeholder={
                  importFormat === 'CSV' 
                    ? 'customerName,customerEmail,grandTotal,currency,type,bookingId\r\nClient A,email@client.com,45000,SAR,Manual,BK-1001'
                    : '[\n  {\n    "customerName": "Client A",\n    "grandTotal": 45000,\n    "currency": "SAR"\n  }\n]'
                }
                className="bg-slate-50 border p-3 rounded-xl text-xs w-full font-mono focus:outline-emerald-800"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-extrabold hover:bg-slate-950 py-2.5 rounded-xl text-xs"
            >
              Parse Data Pasteboard & Bulk Import
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
