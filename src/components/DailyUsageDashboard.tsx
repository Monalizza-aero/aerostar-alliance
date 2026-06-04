import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  ShieldAlert, 
  CheckSquare, 
  Hotel, 
  Info, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { BookingItem, HotelContract, RoomAllocation } from '../types';

interface DailyUsageDashboardProps {
  bookings: BookingItem[];
  hotelContracts: HotelContract[];
}

export default function DailyUsageDashboard({
  bookings,
  hotelContracts
}: DailyUsageDashboardProps) {
  // Configured default start tracking date range (matching typical August/September 2026 range or current)
  const [startDateStr, setStartDateStr] = useState<string>('2026-08-25');
  const [selectedHotelName, setSelectedHotelName] = useState<string>(
    hotelContracts[0]?.hotelName || 'Pullman Zamzam Makkah'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'cards'>('spreadsheet');

  // Generate 16 successive dates from startDateStr
  const generateDateRange = (start: string): string[] => {
    const dates: string[] = [];
    const dateObj = new Date(start);
    if (isNaN(dateObj.getTime())) return [];
    
    for (let i = 0; i < 16; i++) {
      const next = new Date(dateObj);
      next.setDate(dateObj.getDate() + i);
      dates.push(next.toISOString().split('T')[0]);
    }
    return dates;
  };

  const datesToTrack = generateDateRange(startDateStr);

  const getTravelNightsLocal = (from: string, to: string) => {
    if (!from || !to) return 0;
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diff = d2.getTime() - d1.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getBookingTotalRooms = (b: BookingItem) => {
    return b.roomAllocations?.reduce((sum, a) => sum + a.count, 0) || 0;
  };

  const getBookingSeriesStr = (b: BookingItem) => {
    const match = b.notes?.match(/CT\s*\d+/i) || b.packageName?.match(/CT\s*\d+/i);
    if (match) return match[0].toUpperCase();
    if (b.customerName?.toLowerCase().includes('series')) {
      const parts = b.customerName.match(/series\s*([a-zA-Z0-9\-_]+)/i);
      if (parts) return parts[1].toUpperCase();
    }
    return 'CT9';
  };

  // Format date to DD/MM for short visual columns
  const formatShortDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length < 3) return dStr;
    return `${parts[2]}/${parts[1]}`;
  };

  // Convert check-in/out text mapping like '31/08'
  const formatColumnDayHeader = (dStr: string) => {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return { dayName: '', shortDate: dStr };
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const shortDate = formatShortDate(dStr);
    return { dayName, shortDate };
  };

  // Filter ONLY confirmed bookings for our grid/tracker
  const confirmedBookingsAll = bookings.filter(b => b.bookingStatus === 'Confirmed');

  // Filter based on active hotel & search criteria
  const confirmedBookingsFiltered = confirmedBookingsAll.filter(b => {
    const hasHotel = (b.hotelMakkah === selectedHotelName || b.hotelMadinah === selectedHotelName);
    if (!hasHotel) return false;

    if (searchQuery.trim() === '') return true;

    const query = searchQuery.toLowerCase();
    const companyName = (b.b2bAgentName || b.customerName || '').toLowerCase();
    const aeroRefVal = (b.aeroRef || '').toLowerCase();
    const series = getBookingSeriesStr(b).toLowerCase();
    const id = b.id.toLowerCase();

    return companyName.includes(query) || 
           aeroRefVal.includes(query) || 
           series.includes(query) || 
           id.includes(query);
  });

  // Shift start monitor date forward/backward
  const shiftMonitorDate = (days: number) => {
    const d = new Date(startDateStr);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + days);
      setStartDateStr(d.toISOString().split('T')[0]);
    }
  };

  // Day total ocupancy metrics
  const computeDayStats = (dateStr: string, hotelName: string) => {
    const activeContract = hotelContracts.find(c => 
      c.hotelName === hotelName && 
      c.validFrom <= dateStr && dateStr <= c.validTo
    );

    const roomTypes = ['Double', 'Triple', 'Quad', 'Quint', 'Six-sharing'] as const;
    const roomBreakdown = roomTypes.map(rt => {
      const contractLimit = activeContract?.rooms.find(r => r.roomType === rt)?.roomsTotal || 0;
      let occupiedCount = 0;
      confirmedBookingsAll.forEach(b => {
        if (b.travelDateFrom <= dateStr && dateStr < b.travelDateTo) {
          if (b.hotelMakkah === hotelName || b.hotelMadinah === hotelName) {
            const matchedRoom = b.roomAllocations?.find(ra => ra.roomType === rt);
            if (matchedRoom) occupiedCount += matchedRoom.count;
          }
        }
      });

      return {
        roomType: rt,
        occupied: occupiedCount,
        capacity: contractLimit,
        isOverbooked: occupiedCount > contractLimit
      };
    });

    const totalOccupied = roomBreakdown.reduce((sum, r) => sum + r.occupied, 0);
    const totalCapacity = roomBreakdown.reduce((sum, r) => sum + r.capacity, 0);
    const percentOccupied = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
    
    return {
      hasContract: !!activeContract,
      roomBreakdown,
      totalOccupied,
      totalCapacity,
      percentOccupied
    };
  };

  // Dynamic Day totals column allotment summed across filtered bookings
  const getDayFilteredAllotmentSum = (dStr: string) => {
    let daySum = 0;
    confirmedBookingsFiltered.forEach(b => {
      const isActiveOnDay = (b.travelDateFrom <= dStr && dStr < b.travelDateTo);
      const bookingStayInThisHotel = (b.hotelMakkah === selectedHotelName || b.hotelMadinah === selectedHotelName);
      if (isActiveOnDay && bookingStayInThisHotel) {
        daySum += getBookingTotalRooms(b);
      }
    });
    return daySum;
  };

  // EXCEL / CSV Dowload generator
  const handleDownloadExcel = () => {
    const dates = generateDateRange(startDateStr);
    
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Allotments Matrix</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: Segoe UI, Arial, sans-serif; }
          th { border: 1px solid #94a3b8; font-size: 11px; padding: 6px; text-align: center; }
          td { border: 1px solid #cbd5e1; font-size: 11px; padding: 6px; text-align: center; }
          .hdr-days { background-color: #d8b4fe; color: #581c87; font-weight: bold; }
          .hdr-date { background-color: #f3e8ff; font-weight: bold; }
          .hdr-metric { background-color: #06b6d4; color: white; font-weight: bold; font-size: 11px; }
          .hdr-total { background-color: #e0f2fe; color: #0369a1; font-weight: bold; }
          .label-col { text-align: left; font-weight: bold; background-color: #f8fafc; }
          .cell-occupied { background-color: #ccfbf1; color: #0f766e; font-weight: bold; }
          .cell-empty { color: #cbd5e1; }
        </style>
      </head>
      <body>
        <h3>AERO-STAR ALLOTMENT MATRIX</h3>
        <p><strong>Hotel:</strong> ${selectedHotelName} | <strong>Start Date:</strong> ${startDateStr}</p>
        
        <table>
          <thead>
            <tr>
              <th rowspan="3" style="background-color: #0d9488; color: white; font-size: 12px;">Companys</th>
              <th colspan="2" style="background-color: #14b8a6; color: white;">Date</th>
              <th colspan="4" style="background-color: #0ea5e9; color: white;">Room Type</th>
              <th rowspan="3" style="background-color: #38bdf8; color: white;">Nights</th>
              <th rowspan="3" style="background-color: #ff007f; color: white;">Total Room</th>
              <th rowspan="3" style="background-color: #f43f5e; color: white;">Pax No</th>
              <th rowspan="3" style="background-color: #64748b; color: white;">SERIES</th>
              <th rowspan="3" style="background-color: #8b5cf6; color: white;">AERO REF</th>
              <th rowspan="3" style="background-color: #e2e8f0; color: #334155;">Hotel</th>
              <th rowspan="3" style="background-color: #e2e8f0; color: #334155;">Remarks</th>
              ${dates.map(d => {
                const daySum = getDayFilteredAllotmentSum(d);
                return `<th class="hdr-metric">${daySum}</th>`;
              }).join('')}
            </tr>
            <tr>
              <th colspan="2" style="background-color: #f1f5f9;">In / Out</th>
              <th style="background-color: #fdba74;">DB</th>
              <th style="background-color: #fdba74;">TPL</th>
              <th style="background-color: #fdba74;">QUAD</th>
              <th style="background-color: #fdba74;">QUINT</th>
              ${dates.map(d => {
                const { dayName } = formatColumnDayHeader(d);
                return `<th class="hdr-days">${dayName}</th>`;
              }).join('')}
            </tr>
            <tr>
              <th style="background-color: #f1f5f9;">Check In</th>
              <th style="background-color: #f1f5f9;">Check Out</th>
              <th style="background-color: #fef08a;">Double</th>
              <th style="background-color: #fef08a;">Triple</th>
              <th style="background-color: #fef08a;">Quad</th>
              <th style="background-color: #fef08a;">Quint</th>
              ${dates.map(d => {
                const { shortDate } = formatColumnDayHeader(d);
                return `<th class="hdr-date">${shortDate}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${confirmedBookingsFiltered.map(b => {
              const checkInShort = formatShortDate(b.travelDateFrom);
              const checkOutShort = formatShortDate(b.travelDateTo);
              const dbCount = b.roomAllocations?.find(r => r.roomType === 'Double')?.count || 0;
              const tplCount = b.roomAllocations?.find(r => r.roomType === 'Triple')?.count || 0;
              const quadCount = b.roomAllocations?.find(r => r.roomType === 'Quad')?.count || 0;
              const quintCount = b.roomAllocations?.find(r => r.roomType === 'Quint')?.count || 0;
              const nights = getTravelNightsLocal(b.travelDateFrom, b.travelDateTo);
              const totalRooms = getBookingTotalRooms(b);
              const series = getBookingSeriesStr(b);
              const aeroRefVal = b.aeroRef || '';
              const hotelVal = b.hotelMakkah || b.hotelMadinah || selectedHotelName;
              const remarksVal = b.notes || '';
              const companyName = b.b2bAgentName || b.customerName;

              return `
                <tr>
                  <td class="label-col">${companyName}</td>
                  <td>${checkInShort}</td>
                  <td>${checkOutShort}</td>
                  <td style="font-weight: bold;">${dbCount || ''}</td>
                  <td style="font-weight: bold;">${tplCount || ''}</td>
                  <td style="font-weight: bold;">${quadCount || ''}</td>
                  <td style="font-weight: bold;">${quintCount || ''}</td>
                  <td style="font-weight: bold;">${nights}</td>
                  <td class="hdr-total">${totalRooms}</td>
                  <td style="font-weight: bold;">${b.paxCount}</td>
                  <td>${series}</td>
                  <td style="font-weight: bold; color: #581c87;">${aeroRefVal}</td>
                  <td>${hotelVal}</td>
                  <td>${remarksVal}</td>
                  ${dates.map(dStr => {
                    const active = (b.travelDateFrom <= dStr && dStr < b.travelDateTo);
                    const cellCount = active ? totalRooms : 0;
                    return active 
                      ? `<td class="cell-occupied">${cellCount}</td>` 
                      : `<td class="cell-empty">0</td>`;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Aero_Daily_Allotment_${selectedHotelName.replace(/\s+/g, '_')}_${startDateStr}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WORD .doc Generator
  const handleDownloadWord = () => {
    const dates = generateDateRange(startDateStr);
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Segoe UI, Arial, sans-serif; margin: 30px; }
          h2 { color: #0d9488; font-weight: bold; border-bottom: 2px solid #0d9488; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #0f766e; color: white; border: 1px solid #cbd5e1; font-size: 10px; padding: 6px; font-weight: bold; }
          td { border: 1px solid #cbd5e1; font-size: 10px; padding: 6px; text-align: center; }
          .occupied { background-color: #d1f2eb; font-weight: bold; }
          .empty { color: #cbd5e1; }
        </style>
      </head>
      <body>
        <h2>AERO-STAR ALLOTMENT LEDGER REPORT</h2>
        <p><strong>Hotel Location:</strong> ${selectedHotelName} | <strong>Start Monitor Date:</strong> ${startDateStr}</p>
        <table>
          <thead>
            <tr>
              <th>Companys</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>DB</th>
              <th>TPL</th>
              <th>QUAD</th>
              <th>QUINT</th>
              <th>Nights</th>
              <th>Total Room</th>
              <th>Pax No</th>
              <th>SERIES</th>
              <th>AERO REF</th>
              <th>Hotel</th>
              ${dates.map(d => {
                const { dayName, shortDate } = formatColumnDayHeader(d);
                return `<th>${dayName}<br/>${shortDate}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${confirmedBookingsFiltered.map(b => {
              const checkInShort = formatShortDate(b.travelDateFrom);
              const checkOutShort = formatShortDate(b.travelDateTo);
              const dbCount = b.roomAllocations?.find(r => r.roomType === 'Double')?.count || 0;
              const tplCount = b.roomAllocations?.find(r => r.roomType === 'Triple')?.count || 0;
              const quadCount = b.roomAllocations?.find(r => r.roomType === 'Quad')?.count || 0;
              const quintCount = b.roomAllocations?.find(r => r.roomType === 'Quint')?.count || 0;
              const nights = getTravelNightsLocal(b.travelDateFrom, b.travelDateTo);
              const totalRooms = getBookingTotalRooms(b);
              const series = getBookingSeriesStr(b);
              const aeroRefVal = b.aeroRef || '';
              const hotelVal = b.hotelMakkah || b.hotelMadinah || selectedHotelName;
              const companyName = b.b2bAgentName || b.customerName;

              return `
                <tr>
                  <td style="font-weight:bold; text-align:left;">${companyName}</td>
                  <td>${checkInShort}</td>
                  <td>${checkOutShort}</td>
                  <td>${dbCount || 0}</td>
                  <td>${tplCount || 0}</td>
                  <td>${quadCount || 0}</td>
                  <td>${quintCount || 0}</td>
                  <td>${nights}</td>
                  <td style="font-weight:bold; background-color:#e0f2fe;">${totalRooms}</td>
                  <td>${b.paxCount}</td>
                  <td>${series}</td>
                  <td style="font-weight:bold;color:#6b21a8;">${aeroRefVal}</td>
                  <td>${hotelVal}</td>
                  ${dates.map(dStr => {
                    const active = (b.travelDateFrom <= dStr && dStr < b.travelDateTo);
                    const cellCount = active ? totalRooms : 0;
                    return active 
                      ? `<td class="occupied">${cellCount}</td>` 
                      : `<td class="empty">0</td>`;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Daily_Room_Allotments_${startDateStr}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Trigger using window.print() and customized landscape element styles
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Search selection tools */}
      <div className="bg-white border border-slate-205 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Calendar className="w-5 h-5 text-emerald-805" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm tracking-wide">Daily Rooms Usage Ledger</h3>
              <p className="text-[10px] text-slate-450 leading-relaxed">
                Track real-time allocations, series, and AERO Ref grouping identifiers.
              </p>
            </div>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('spreadsheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'spreadsheet' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-550 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 inline-block mr-1" />
              Spreadsheet View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-550 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 inline-block mr-1" />
              Dynamic Cards
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Hotel Select */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-450 tracking-wider flex items-center gap-1">
              <Hotel className="w-3 h-3 text-emerald-805" /> Active Hotel
            </label>
            <select
              value={selectedHotelName}
              onChange={(e) => setSelectedHotelName(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-800"
            >
              {Array.from(new Set(hotelContracts.map(c => c.hotelName))).map(hName => (
                <option key={hName} value={hName}>{hName}</option>
              ))}
            </select>
          </div>

          {/* Date Picker & controls */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-450 tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-805" /> Start Date
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonitorDate(-7)}
                title="Back 1 week"
                className="p-1 px-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 text-xs font-bold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-full text-xs font-bold px-2 py-1.8 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-emerald-800"
              />
              <button
                type="button"
                onClick={() => shiftMonitorDate(7)}
                title="Forward 1 week"
                className="p-1 px-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 text-xs font-bold cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Query */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-450 tracking-wider flex items-center gap-1">
              <Search className="w-3 h-3 text-emerald-805" /> Search / Group
            </label>
            <input
              type="text"
              placeholder="e.g. TIRAM, AERO Ref, CT9..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold px-3 py-1.8 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-800"
            />
          </div>

          {/* Dispatch Export controls */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-450 tracking-wider block">
              Tender & Dispatch exports
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="px-3 py-1.8 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition-all shadow-2xs cursor-pointer grow justify-center"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
              </button>
              <button
                type="button"
                onClick={handleDownloadWord}
                className="px-3 py-1.8 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition-all shadow-2xs cursor-pointer grow justify-center"
              >
                <FileText className="w-3.5 h-3.5" />
                Word
              </button>
              <button
                type="button"
                id="daily-print-pdf-btn"
                onClick={handlePrintPDF}
                className="p-1.8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition-all cursor-pointer border border-slate-205"
                title="Print Landscape Allotment Master spreadsheet to PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 bg-teal-50 text-teal-950 font-medium text-[10px] rounded-2xl flex items-center gap-2 border border-teal-150 leading-relaxed block-print-hide">
          <Info className="w-4 h-4 text-teal-800 shrink-0" />
          <span>
            Excel and Word documents download with localized day matrix matrices. Highlighted values register <strong>Total Room active Allotments</strong> for each confirmed pilgrim series stays.
          </span>
        </div>
      </div>

      {/* SPREADSHEET MATRIX DESIGN */}
      {viewMode === 'spreadsheet' && (
        <div id="hotel-occupancy-spreadsheet" className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden print-allotments-block">
          <div className="p-4 bg-slate-50 border-b border-rose-205 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 block-print-hide">
            <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
              AERO-STAR SPACE ALLOTMENT SHEET (16-DAY SPREAD)
            </span>
            <div className="text-[10px] text-slate-505 font-medium">
              Showing <strong>{confirmedBookingsFiltered.length}</strong> confirmed group reservations for <strong>{selectedHotelName}</strong>.
            </div>
          </div>

          <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left border-collapse table-auto min-w-[1400px]">
              <thead>
                {/* SUM ROWS HEADER */}
                <tr className="bg-cyan-55/80 border-b border-slate-250">
                  <th rowSpan={3} className="p-2.5 font-black text-slate-900 border-r border-slate-250 text-xs bg-slate-100 sticky left-0 z-10">Companys</th>
                  <th colSpan={2} className="p-1.5 text-center text-[10px] font-black text-slate-600 border-r border-slate-200 bg-slate-50 uppercase tracking-wide">Date</th>
                  <th colSpan={4} className="p-1.5 text-center text-[10px] font-black text-slate-600 border-r border-slate-200 bg-slate-50 uppercase tracking-wide">Room Type</th>
                  <th rowSpan={3} className="p-2 text-center text-[10px] font-black text-slate-700 border-r border-slate-200 bg-slate-50">Nights</th>
                  <th rowSpan={3} className="p-2 text-center text-[10px] font-black text-indigo-900 border-r border-slate-200 bg-indigo-50/50">Total Room</th>
                  <th rowSpan={3} className="p-2 text-center text-[10px] font-black text-rose-900 border-r border-slate-200 bg-rose-50/50">Pax No</th>
                  <th rowSpan={3} className="p-2 text-center text-[10px] font-black text-slate-700 border-r border-slate-200 bg-slate-50">SERIES</th>
                  <th rowSpan={3} className="p-2 text-center text-[10px] font-black text-sky-950 border-r border-slate-200 bg-sky-50">AERO REF</th>
                  <th rowSpan={3} className="p-2 text-[10px] font-black text-slate-700 border-r border-slate-200 bg-slate-50 min-w-[130px]">Hotel</th>
                  <th rowSpan={3} className="p-2 text-[10px] font-black text-slate-700 border-r border-slate-200 bg-slate-50 min-w-[120px]">Remarks</th>
                  
                  {datesToTrack.map(dStr => {
                    const dayAllotmentSum = getDayFilteredAllotmentSum(dStr);
                    return (
                      <th 
                        key={`total-${dStr}`} 
                        className={`p-2.5 text-center text-[11px] font-black border-r border-slate-200 transition-colors ${
                          dayAllotmentSum > 0 ? 'bg-cyan-100 text-cyan-950' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {dayAllotmentSum}
                      </th>
                    );
                  })}
                </tr>

                {/* WEEKDAY LABELS */}
                <tr className="bg-purple-50/70 border-b border-slate-200">
                  <th colSpan={2} className="p-1 text-center font-bold text-[9px] text-slate-400 border-r border-slate-200">Check In / Out</th>
                  <th className="p-1 text-center font-extrabold text-[9px] text-amber-800 border-r border-slate-150">DB</th>
                  <th className="p-1 text-center font-extrabold text-[9px] text-amber-800 border-r border-slate-150">TPL</th>
                  <th className="p-1 text-center font-extrabold text-[9px] text-amber-800 border-r border-slate-150">QUAD</th>
                  <th className="p-1 text-center font-extrabold text-[9px] text-amber-800 border-r border-slate-200">QUINT</th>

                  {datesToTrack.map(dStr => {
                    const { dayName } = formatColumnDayHeader(dStr);
                    return (
                      <th 
                        key={`day-${dStr}`} 
                        className="p-1.5 text-center text-[10px] font-black text-purple-750 tracking-wider border-r border-slate-200 uppercase bg-purple-100/30"
                      >
                        {dayName}
                      </th>
                    );
                  })}
                </tr>

                {/* SHORT DATE HEADER */}
                <tr className="bg-slate-105 border-b border-slate-300">
                  <th className="p-1.5 text-center text-[9px] font-extrabold text-slate-500 border-r border-slate-200 bg-slate-50">In</th>
                  <th className="p-1.5 text-center text-[9px] font-extrabold text-slate-500 border-r border-slate-200 bg-slate-50">Out</th>
                  <th className="p-1 text-center text-[9px] font-bold text-slate-450 border-r border-slate-150">Double</th>
                  <th className="p-1 text-center text-[9px] font-bold text-slate-450 border-r border-slate-150">Triple</th>
                  <th className="p-1 text-center text-[9px] font-bold text-slate-450 border-r border-slate-150">Quad</th>
                  <th className="p-1 text-center text-[9px] font-bold text-slate-450 border-r border-slate-200">Quint</th>

                  {datesToTrack.map(dStr => {
                    const { shortDate } = formatColumnDayHeader(dStr);
                    return (
                      <th 
                        key={`date-${dStr}`} 
                        className="p-1.5 text-center text-[10px] font-extrabold text-slate-600 border-r border-slate-200 font-mono"
                      >
                        {shortDate}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {confirmedBookingsFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={14 + datesToTrack.length} className="p-10 text-center text-[11px] font-semibold text-slate-400 italic bg-white">
                      No matching confirmed series groups found for {selectedHotelName} on selected timeline.
                    </td>
                  </tr>
                ) : (
                  confirmedBookingsFiltered.map(b => {
                    const checkInShort = formatShortDate(b.travelDateFrom);
                    const checkOutShort = formatShortDate(b.travelDateTo);
                    const dbCount = b.roomAllocations?.find(r => r.roomType === 'Double')?.count || 0;
                    const tplCount = b.roomAllocations?.find(r => r.roomType === 'Triple')?.count || 0;
                    const quadCount = b.roomAllocations?.find(r => r.roomType === 'Quad')?.count || 0;
                    const quintCount = b.roomAllocations?.find(r => r.roomType === 'Quint')?.count || 0;
                    const nights = getTravelNightsLocal(b.travelDateFrom, b.travelDateTo);
                    const totalRooms = getBookingTotalRooms(b);
                    const series = getBookingSeriesStr(b);
                    const companyName = b.b2bAgentName || b.customerName;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Company Name column */}
                        <td className="p-2.5 font-extrabold text-slate-900 border-r border-slate-250 bg-slate-50 text-xs sticky left-0 z-10 shadow-xs">
                          {companyName}
                        </td>
                        {/* Dates short */}
                        <td className="p-2 text-center text-[10px] border-r border-slate-150 font-bold text-slate-605">{checkInShort}</td>
                        <td className="p-2 text-center text-[10px] border-r border-slate-200 font-bold text-slate-605">{checkOutShort}</td>
                        {/* Room Allocations Counts */}
                        <td className={`p-2 text-center text-[11px] border-r border-slate-150 font-mono font-black ${dbCount > 0 ? 'text-amber-850 bg-amber-50/30' : 'text-slate-300'}`}>
                          {dbCount || ''}
                        </td>
                        <td className={`p-2 text-center text-[11px] border-r border-slate-150 font-mono font-black ${tplCount > 0 ? 'text-amber-850 bg-amber-50/30' : 'text-slate-300'}`}>
                          {tplCount || ''}
                        </td>
                        <td className={`p-2 text-center text-[11px] border-r border-slate-150 font-mono font-black ${quadCount > 0 ? 'text-amber-850 bg-amber-50/30' : 'text-slate-300'}`}>
                          {quadCount || ''}
                        </td>
                        <td className={`p-2 text-center text-[11px] border-r border-slate-200 font-mono font-black ${quintCount > 0 ? 'text-amber-850 bg-amber-50/30' : 'text-slate-300'}`}>
                          {quintCount || ''}
                        </td>
                        {/* Travel Details columns */}
                        <td className="p-2 text-center text-xs border-r border-slate-200 font-bold text-purple-950">{nights}</td>
                        <td className="p-2 text-center text-xs border-r border-slate-200 font-black text-emerald-900 bg-emerald-50">{totalRooms}</td>
                        <td className="p-2 text-center text-xs border-r border-slate-200 font-extrabold text-rose-900 bg-rose-50/30">{b.paxCount}</td>
                        <td className="p-2 text-center text-[10px] border-r border-slate-200 font-extrabold text-slate-600 bg-slate-50">{series}</td>
                        {/* AERO REF ID Column */}
                        <td className="p-2 text-center text-[11px] border-r border-slate-200 font-black text-sky-850 font-mono bg-sky-50 uppercase tracking-wide">
                          {b.aeroRef || '-'}
                        </td>
                        <td className="p-2 text-[10px] border-r border-slate-200 font-semibold text-slate-550 italic" title={b.hotelMakkah || b.hotelMadinah}>
                          {b.hotelMakkah || b.hotelMadinah || selectedHotelName}
                        </td>
                        <td className="p-2 text-[10px] border-r border-slate-200 font-medium text-slate-450 truncate max-w-[120px]" title={b.notes}>
                          {b.notes || <span className="text-slate-300 italic">No notes</span>}
                        </td>

                        {/* DAY BY DAY ROOM COUNTS CELLS */}
                        {datesToTrack.map(dStr => {
                          const active = (b.travelDateFrom <= dStr && dStr < b.travelDateTo);
                          const cellRoomCount = active ? totalRooms : 0;
                          return (
                            <td 
                              key={`cell-${b.id}-${dStr}`} 
                              className={`p-2 text-center text-[11px] border-r border-slate-200 font-bold transition-all ${
                                cellRoomCount > 0 
                                  ? 'bg-emerald-500 text-white font-extrabold shadow-inner' 
                                  : 'text-slate-200 bg-transparent'
                              }`}
                            >
                              {cellRoomCount}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HORIZONTAL CARDS TIMELINE DESIGN */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {datesToTrack.map(dStr => {
            const stats = computeDayStats(dStr, selectedHotelName);
            const isFull = stats.percentOccupied >= 100;
            const isWarning = stats.percentOccupied >= 75 && stats.percentOccupied < 100;
            const hasOverbook = stats.roomBreakdown.some(r => r.isOverbooked);
            
            // Format full header text
            const dObj = new Date(dStr);
            const displayDateText = dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            return (
              <div
                key={dStr}
                className={`border rounded-2xl p-4 bg-white shadow-2xs space-y-3 transition-colors ${
                  hasOverbook ? 'border-red-300 ring-1 ring-red-100 bg-red-50/10' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <div>
                    <strong className="text-slate-900 text-sm font-extrabold block">{displayDateText}</strong>
                    <span className="text-[9px] text-slate-450 font-mono">{dStr}</span>
                  </div>

                  {stats.hasContract ? (
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250 font-mono">
                      Contract Active
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-red-655 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-mono">
                      No Contract
                    </span>
                  )}
                </div>

                {stats.hasContract && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-505 font-medium">Allotment Occupancy:</span>
                      <strong className={`font-black ${hasOverbook ? 'text-red-650' : isFull ? 'text-amber-650' : 'text-slate-805'}`}>
                        {stats.totalOccupied} / {stats.totalCapacity} rooms ({stats.percentOccupied}%)
                      </strong>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-150">
                      <div
                        className={`h-full transition-all ${
                          hasOverbook ? 'bg-red-500' : isFull ? 'bg-amber-400' : 'bg-emerald-700'
                        }`}
                        style={{ width: `${Math.min(100, stats.percentOccupied)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] uppercase font-black text-slate-450 tracking-wider block">ALLOTMENT SEGMENTS</span>
                  
                  {stats.hasContract ? (
                    <div className="space-y-1 text-[11px]">
                      {stats.roomBreakdown.map(room => (
                        <div
                          key={room.roomType}
                          className={`flex justify-between items-center p-1.5 rounded-lg ${
                            room.isOverbooked ? 'bg-red-50 text-red-800 font-bold border border-red-100' : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="font-semibold">{room.roomType}</span>
                          <div className="flex items-center gap-1 font-mono">
                            <span className={room.isOverbooked ? 'text-red-700 font-black' : 'text-slate-800 font-bold'}>
                              {room.occupied}
                            </span>
                            <span className="text-slate-400">/</span>
                            <span className="text-slate-550">{room.capacity}</span>

                            {room.isOverbooked && (
                              <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0 ml-0.5" title="Overbooked Allotment!" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-150 rounded-xl text-center text-[10px] text-slate-400">
                      <ShieldAlert className="w-4 h-4 text-red-400 mb-1" />
                      No overlapping contract valid on this date.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
