import React, { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, HelpCircle, FileText, ArrowRight, Save } from 'lucide-react';
import { BookingItem, HotelContract, RoomAllocation, B2BPartner, Language } from '../types';

interface ImportExportManagerProps {
  bookings: BookingItem[];
  hotelContracts: HotelContract[];
  partners: B2BPartner[];
  onRefreshDatabase: () => Promise<void>;
  onSaveBooking: (booking: Partial<BookingItem>) => Promise<void>;
}

interface ParsedRow {
  rowNum: number;
  company: string;
  checkIn: string;
  checkOut: string;
  doubleCount: number;
  tripleCount: number;
  quadCount: number;
  quintCount: number;
  totalRooms: number;
  paxCount: number;
  series: string;
  ref: string;
  hotel: string;
  status: 'valid' | 'invalid';
  errors: string[];
}

export default function ImportExportManager({
  bookings,
  hotelContracts,
  partners,
  onRefreshDatabase,
  onSaveBooking
}: ImportExportManagerProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileSelectedName, setFileSelectedName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  // Template Download logic
  const handleDownloadTemplate = () => {
    const headers = "No,Companys,Check In,Check Out,DB,TPL,QUAD,QUINT,Nights,Total Room,Pax No,SERIES,AERO REF,Hotel\n";
    const row1 = "1,TIRAM,2026-10-12,2026-10-17,0,0,10,0,5,10,40,CT6,AERO 48-001,Pullman Zamzam Makkah\n";
    const row2 = "2,AL-MADINAH,2026-10-15,2026-10-19,0,0,5,0,4,5,20,CT7,AERO 48-002,Anwar Al Madinah Mövenpick\n";
    const row3 = "3,KUALA LUMPUR,2026-10-20,2026-10-25,2,0,0,0,5,2,4,CT8,AERO 48-003,Swissôtel Makkah";
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + row1 + row2 + row3);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "umrah_bulk_bookings_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV parsing engine
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileSelectedName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length <= 1) {
        alert("The uploaded CSV appears to contain only headers or is empty.");
        return;
      }

      // Read headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      const newParsedRows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Comma-separated parse
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < headers.length) continue;

        // Map columns
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = cols[index] || '';
        });

        const company = rowObj['Companys'] || '';
        const checkIn = rowObj['Check In'] || '';
        const checkOut = rowObj['Check Out'] || '';
        const doubleCount = parseInt(rowObj['DB'] || '0') || 0;
        const tripleCount = parseInt(rowObj['TPL'] || '0') || 0;
        const quadCount = parseInt(rowObj['QUAD'] || '0') || 0;
        const quintCount = parseInt(rowObj['QUINT'] || '0') || 0;
        const totalRooms = parseInt(rowObj['Total Room'] || '0') || 0;
        const paxCount = parseInt(rowObj['Pax No'] || '0') || 0;
        const series = rowObj['SERIES'] || '';
        const ref = rowObj['AERO REF'] || '';
        const hotel = rowObj['Hotel'] || '';

        // RUN exhaustive validator rules
        const errors: string[] = [];

        // 1. Check Hotel contracts
        const matchContract = hotelContracts.find(c => c.hotelName.toLowerCase().replace(/\s/g, '').includes(hotel.toLowerCase().replace(/\s/g, '')) || hotel.toLowerCase().replace(/\s/g, '').includes(c.hotelName.toLowerCase().replace(/\s/g, '')));
        let matchedHotelName = hotel;
        
        if (!hotel) {
          errors.push("Missing Hotel Name mapping column.");
        } else if (!matchContract) {
          errors.push(`Hotel Name "${hotel}" does not correspond to any active contract in the system directory.`);
        } else {
          matchedHotelName = matchContract.hotelName; // Align exactly
          
          // 2. Dates vs Contract
          if (checkIn && checkOut) {
            const contractStart = matchContract.validFrom;
            const contractEnd = matchContract.validTo;
            if (checkIn < contractStart || checkOut > contractEnd) {
              errors.push(`Dates (${checkIn} to ${checkOut}) transcend the contract validity dates of ${contractStart} to ${contractEnd}.`);
            }
          }
        }

        // 3. Room configuration parameters
        if (doubleCount === 0 && tripleCount === 0 && quadCount === 0 && quintCount === 0) {
          errors.push("Missing room types layout: DB, TPL, QUAD, and QUINT counts are all zero.");
        }

        // 4. Booking Date Logic checks
        if (!checkIn || !checkOut) {
          errors.push("Check-in or Check-out date strings are empty.");
        } else {
          const checkInDate = new Date(checkIn);
          const checkOutDate = new Date(checkOut);
          if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
            errors.push("Date parsing syntax mismatch: check check-in/checkout column structure.");
          } else if (checkInDate >= checkOutDate) {
            errors.push("Check-out date is equal or prior to check-in date.");
          }
        }

        // 5. Pax alignment checks
        const bedSum = (doubleCount * 2) + (tripleCount * 3) + (quadCount * 4) + (quintCount * 5);
        if (paxCount <= 0) {
          errors.push(`Invalid Pilgrim Count: '${paxCount}' must be a positive integer.`);
        } else if (bedSum > 0 && paxCount > bedSum) {
          errors.push(`Pilgrim Count (${paxCount}) exceeds the contract bedding capacities (${bedSum} beds).`);
        }

        // 6. Overbooking Check client-side preview (Only check against verified contracts)
        if (matchContract && checkIn && checkOut && errors.length === 0) {
          const stayDates = [];
          const start = new Date(checkIn);
          const end = new Date(checkOut);
          let curr = new Date(start);
          while (curr < end) {
            stayDates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
          }

          const roomTypesInvolved: { type: 'Double' | 'Triple' | 'Quad' | 'Quint'; count: number }[] = [
            { type: 'Double', count: doubleCount },
            { type: 'Triple', count: tripleCount },
            { type: 'Quad', count: quadCount },
            { type: 'Quint', count: quintCount }
          ];

          for (const d of stayDates) {
            for (const rAlloc of roomTypesInvolved) {
              if (rAlloc.count <= 0) continue;
              const cRoom = matchContract.rooms.find(rm => rm.roomType === rAlloc.type);
              if (!cRoom) {
                errors.push(`Room Type "${rAlloc.type}" is not supported inside contract for "${matchedHotelName}".`);
                break;
              }
              const roomsLimit = cRoom.roomsTotal;

              // Calculate existing occupied
              let occupiedCount = 0;
              bookings.forEach(b => {
                if (b.bookingStatus === 'Confirmed' && b.roomAllocations) {
                  if (b.travelDateFrom <= d && d < b.travelDateTo) {
                    if (b.hotelMakkah === matchContract.hotelName || b.hotelMadinah === matchContract.hotelName) {
                      const matchRA = b.roomAllocations.find(ra => ra.roomType === rAlloc.type);
                      if (matchRA) occupiedCount += matchRA.count;
                    }
                  }
                }
              });

              if (occupiedCount + rAlloc.count > roomsLimit) {
                errors.push(`Overbooking alarm on date ${d} for "${rAlloc.type}" rooms. Booked: ${occupiedCount}/${roomsLimit}. This upload requests ${rAlloc.count} more.`);
                break;
              }
            }
          }
        }

        newParsedRows.push({
          rowNum: i,
          company,
          checkIn,
          checkOut,
          doubleCount,
          tripleCount,
          quadCount,
          quintCount,
          totalRooms: totalRooms || (doubleCount + tripleCount + quadCount + quintCount),
          paxCount,
          series,
          ref,
          hotel: matchedHotelName,
          status: errors.length === 0 ? 'valid' : 'invalid',
          errors
        });
      }

      setParsedRows(newParsedRows);
    };

    reader.readAsText(file);
  };

  // Convert the parsed valid rows into bookings on backend sequentially
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.status === 'valid');
    if (validRows.length === 0) {
      alert("No valid rows exist to import. Correct validation warnings and try uploading again.");
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const r of validRows) {
      try {
        const matchingContract = hotelContracts.find(c => c.hotelName === r.hotel);
        const position = matchingContract?.location || 'Makkah';

        const rawAllocations: RoomAllocation[] = [
          { roomType: 'Double', count: r.doubleCount, capacity: 2, ratePerRoom: matchingContract?.rooms.find(rm => rm.roomType === 'Double')?.contractRateMYR || 450 },
          { roomType: 'Triple', count: r.tripleCount, capacity: 3, ratePerRoom: matchingContract?.rooms.find(rm => rm.roomType === 'Triple')?.contractRateMYR || 550 },
          { roomType: 'Quad', count: r.quadCount, capacity: 4, ratePerRoom: matchingContract?.rooms.find(rm => rm.roomType === 'Quad')?.contractRateMYR || 650 },
          { roomType: 'Quint', count: r.quintCount, capacity: 5, ratePerRoom: matchingContract?.rooms.find(rm => rm.roomType === 'Quint')?.contractRateMYR || 750 },
          { roomType: 'Six-sharing', count: 0, capacity: 6, ratePerRoom: matchingContract?.rooms.find(rm => rm.roomType === 'Six-sharing')?.contractRateMYR || 850 }
        ];

        // Filter out zero-count allocations for brevity
        const roomAllocations = rawAllocations.filter(alloc => alloc.count > 0);

        // Find standard ID if company matches a known partner
        const matchPartner = partners.find(p => p.companyName.toLowerCase().includes(r.company.toLowerCase()) || r.company.toLowerCase().includes(p.companyName.toLowerCase()));

        const formattedBooking: Partial<BookingItem> = {
          customerName: `${r.company} Series ${r.series || 'Import'} Group`,
          customerPhone: matchPartner?.phone || '+60 11-import',
          customerEmail: matchPartner?.email || 'bulk-import@aerostar.co',
          bookingType: 'Umrah Package',
          packageName: `Custom Bulk series: ${r.series || 'CT-Series'}`,
          paxCount: r.paxCount,
          travelDateFrom: r.checkIn,
          travelDateTo: r.checkOut,
          currency: 'MYR',
          totalAmount: 12000, // standard placeholder or calculated in backend on invoice triggering
          bookingStatus: 'Confirmed',
          hotelSelectionType: position === 'Makkah' ? 'Makkah Only' : 'Madinah Only',
          hotelMakkah: position === 'Makkah' ? r.hotel : '',
          hotelMadinah: position === 'Madinah' ? r.hotel : '',
          transportType: 'Standard Coaches Class A',
          extraServices: [],
          notes: `Bulk Import AERO REF: ${r.ref}. B2B associated partner: ${r.company}.`,
          aeroRef: r.ref,
          b2bAgentId: matchPartner?.id || null,
          b2bAgentName: matchPartner?.companyName || null,
          roomAllocations
        };

        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking: formattedBooking,
            authorEmail: 'operations@aerostar-alliance.com',
            authorName: 'Aero-Star Bulk Loader'
          })
        });

        if (res.ok) {
          await onSaveBooking(formattedBooking); // sync state block
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setIsLoading(false);
    setImportSummary(`Bulk transaction complete! Registered ${successCount} confirmed group reservation(s). Failed: ${failCount}.`);
    setParsedRows([]);
    await onRefreshDatabase();
  };

  // Raw book data CSV export triggered
  const handleExportBookings = () => {
    const headers = "Booking ID,Customer Name,Customer Email,Travel Date From,Travel Date To,Currency,Amount,Booking Status,Makkah Hotel,Madinah Hotel,Agent Partner\n";
    const rows = bookings.map(b => {
      return `"${b.id}","${b.customerName}","${b.customerEmail}","${b.travelDateFrom}","${b.travelDateTo}","${b.currency}",${b.totalAmount},"${b.bookingStatus}","${b.hotelMakkah || 'None'}","${b.hotelMadinah || 'None'}","${b.b2bAgentName || 'Corporate Client'}"`;
    }).join('\n');

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "aerostar_confirmed_bookings_ledger.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFinancialSummary = () => {
    const headers = "Booking ID,Customer Name,Invoice Currency,Amount,Supplier Cost MYR,Margin MYR\n";
    const rows = bookings.map(b => {
      const supCost = b.supplierCostMYR || Math.round(b.totalAmountMYR * 0.7);
      const margin = b.totalAmountMYR - supCost;
      return `"${b.id}","${b.customerName}","${b.currency}",${b.totalAmount},${supCost},${margin}`;
    }).join('\n');

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "comprehensive_hotel_revenue_margins.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      
      {/* Top action layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 uppercase tracking-wider">
            <Upload className="w-4 h-4 text-emerald-800" />
            Bulk Operations & Integration Hub
          </h3>
          <p className="text-xs text-slate-500">Coordinate group reservation CSV file uploads, map room keys, and run overbooking limit audits</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadTemplate}
            id="download_template_btn"
            className="px-3.5 py-1.8 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.8 border border-slate-250 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel/CSV Template
          </button>
          <button
            onClick={handleExportBookings}
            id="export_ledger_btn"
            className="px-3.5 py-1.8 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl flex items-center gap-1.8 shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Export Reservations
          </button>
          <button
            onClick={handleExportFinancialSummary}
            className="px-3.5 py-1.8 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.8 shadow-xs transition-all cursor-pointer hidden md:flex"
          >
            <Download className="w-3.5 h-3.5" />
            Revenue Export
          </button>
        </div>
      </div>

      {/* CSV Drop zone inputs */}
      <div className="border-2 border-dashed border-slate-250 rounded-2xl bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center space-y-3 hover:border-emerald-800 transition-colors">
        <Upload className="w-8 h-8 text-slate-400" />
        <div>
          <strong className="text-slate-800 text-xs font-extrabold block">Select reservation CSV file from local disk</strong>
          <span className="text-[10px] text-slate-450 mt-1 block">Strict validation runs automatically on uploads</span>
        </div>
        <label className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 select-none">
          Choose Reservation File
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        {fileSelectedName && (
          <span className="text-[10px] font-mono bg-slate-100 border border-slate-250 text-slate-705 px-2.5 py-1 rounded-md">
            Selected: <span className="text-emerald-800 font-bold">{fileSelectedName}</span>
          </span>
        )}
      </div>

      {/* Real-time Loader response summary text */}
      {importSummary && (
        <div id="import_summary_notif" className="p-4 bg-emerald-50 border border-emerald-250 rounded-2xl flex items-center gap-3 text-emerald-800 animate-in fade-in duration-350">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div className="text-xs font-bold font-sans">
            {importSummary}
          </div>
        </div>
      )}

      {/* Rows validation dashboard */}
      {parsedRows.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-350">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-slate-900 text-xs font-extrabold uppercase">File Audit Checklist & Capacity Warnings</h4>
              <p className="text-[10px] text-slate-450 font-medium">Please review status markings before submitting bulk reservation uploads</p>
            </div>
            <button
              onClick={handleConfirmImport}
              id="confirm_import_btn"
              disabled={isLoading || parsedRows.filter(r => r.status === 'valid').length === 0}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isLoading ? "Running bulk uploads..." : `Commit ${parsedRows.filter(r => r.status === 'valid').length} Valid Booking(s)`}
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-sans border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-650 text-[10px] font-bold uppercase text-left">
                    <th className="p-3">Num</th>
                    <th className="p-3">B2B Company</th>
                    <th className="p-3">Matched Hotel</th>
                    <th className="p-3">Check In/Out</th>
                    <th className="p-3">DB / TPL / QUAD / QUINT</th>
                    <th className="p-3 text-center">Pax</th>
                    <th className="p-3 text-center">Aero Ref</th>
                    <th className="p-3">Validation Checklist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowNum}
                      className={`${row.status === 'valid' ? 'bg-white hover:bg-slate-50/50' : 'bg-red-50/45 hover:bg-red-50/70'} transition-colors`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-400">{row.rowNum}</td>
                      <td className="p-3 font-extrabold text-slate-900">{row.company}</td>
                      <td className="p-3 text-slate-800 font-medium">{row.hotel || <span className="text-red-600 font-bold italic">Unmapped</span>}</td>
                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-800">{row.checkIn}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-800">{row.checkOut}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono">
                        <span className="text-slate-500">
                          {row.doubleCount || 0} DB / {row.tripleCount || 0} TPL / {row.quadCount || 0} QUAD / {row.quintCount || 0} QUINT
                        </span>
                      </td>
                      <td className="p-3 text-center font-extrabold text-slate-800">{row.paxCount}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-850">{row.ref || 'None'}</td>
                      <td className="p-3 space-y-1">
                        {row.status === 'valid' ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-[10px]">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            Validated & Ready for check-in
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {row.errors.map((err, errIdx) => (
                              <div key={errIdx} className="flex items-start gap-1 text-red-600 font-medium text-[10px]">
                                <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                                <span>{err}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
