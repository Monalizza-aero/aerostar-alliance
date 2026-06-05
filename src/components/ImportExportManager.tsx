import React, { useState, useMemo } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, HelpCircle, FileText, ArrowRight, Save, Sliders, X, RefreshCw } from 'lucide-react';
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
  rawObj: Record<string, string>;
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
  hotelId: string;
  matchedHotelName: string;
  matchedHotelId: string;
  matchedPartnerId: string;
  matchedPartnerName: string;
  status: 'valid' | 'warning' | 'invalid';
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
  suggestions: HotelContract[];
}

export default function ImportExportManager({
  bookings,
  hotelContracts,
  partners,
  onRefreshDatabase,
  onSaveBooking
}: ImportExportManagerProps) {
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [fileSelectedName, setFileSelectedName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  // Manual Row-specific mappings overrides
  const [manualRowHotels, setManualRowHotels] = useState<Record<number, string>>({});
  const [manualRowPartners, setManualRowPartners] = useState<Record<number, string>>({});

  // Reset all import state
  const handleClearImport = () => {
    setRawHeaders([]);
    setRawLines([]);
    setColumnMappings({});
    setFileSelectedName('');
    setImportSummary(null);
    setManualRowHotels({});
    setManualRowPartners({});
  };

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

  // Safe CSV Row Splitter matching quotes and commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let idx = 0; idx < line.length; idx++) {
      const char = line[idx];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  // Automatic column detection mapping rules
  const autoDetectMappings = (headers: string[]): Record<string, string> => {
    const findHeader = (patterns: string[]): string => {
      const match = headers.find(h => 
        patterns.some(p => h.toLowerCase().trim().replace(/[\s+-_]/g, '').includes(p.toLowerCase().replace(/[\s+-_]/g, '')))
      );
      return match || '';
    };

    return {
      company: findHeader(['company', 'sponsor', 'partner', 'agent', 'companys', 'b2b']),
      checkIn: findHeader(['checkin', 'check in', 'arrival', 'date from', 'travel date from', 'start']),
      checkOut: findHeader(['checkout', 'check out', 'departure', 'date to', 'travel date to', 'end']),
      doubleCount: findHeader(['db', 'double', 'dbl']),
      tripleCount: findHeader(['tpl', 'triple']),
      quadCount: findHeader(['quad']),
      quintCount: findHeader(['quint']),
      totalRooms: findHeader(['total room', 'rooms', 'totalrooms']),
      paxCount: findHeader(['pax no', 'pax', 'pilgrim', 'pax count', 'paxno']),
      series: findHeader(['series', 'group series']),
      ref: findHeader(['aero ref', 'ref', 'reference', 'aeroref']),
      hotel: findHeader(['hotel', 'accommodation', 'hotel name']),
      hotelId: findHeader(['hotel id', 'hotelid', 'contract id'])
    };
  };

  // Initial CSV upload loading
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

      // Read raw headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      setRawHeaders(headers);
      setRawLines(lines.slice(1));

      // Auto-detect mappings
      const detected = autoDetectMappings(headers);
      setColumnMappings(detected);
    };

    reader.readAsText(file);
    // Flush input value to allow uploading same file
    e.target.value = '';
  };

  // Core flexible and fault-tolerant parsing engine
  const parsedRows: ParsedRow[] = useMemo(() => {
    if (rawLines.length === 0 || Object.keys(columnMappings).length === 0) return [];
    
    return rawLines.map((line, index) => {
      const cols = parseCSVLine(line);
      const rowObj: Record<string, string> = {};
      rawHeaders.forEach((header, colIdx) => {
        rowObj[header] = cols[colIdx] || '';
      });

      const rowNum = index + 1;

      // Extract raw mapped cell text values
      const companyVal = columnMappings['company'] ? rowObj[columnMappings['company']] : '';
      const checkInVal = columnMappings['checkIn'] ? rowObj[columnMappings['checkIn']] : '';
      const checkOutVal = columnMappings['checkOut'] ? rowObj[columnMappings['checkOut']] : '';
      const hotelVal = columnMappings['hotel'] ? rowObj[columnMappings['hotel']] : '';
      const hotelIdVal = columnMappings['hotelId'] ? rowObj[columnMappings['hotelId']] : '';
      const paxVal = parseInt(columnMappings['paxCount'] ? rowObj[columnMappings['paxCount']] : '0') || 0;
      
      const doubleCount = parseInt(columnMappings['doubleCount'] ? rowObj[columnMappings['doubleCount']] : '0') || 0;
      const tripleCount = parseInt(columnMappings['tripleCount'] ? rowObj[columnMappings['tripleCount']] : '0') || 0;
      const quadCount = parseInt(columnMappings['quadCount'] ? rowObj[columnMappings['quadCount']] : '0') || 0;
      const quintCount = parseInt(columnMappings['quintCount'] ? rowObj[columnMappings['quintCount']] : '0') || 0;
      const totalRoomsMapped = parseInt(columnMappings['totalRooms'] ? rowObj[columnMappings['totalRooms']] : '0') || 0;
      const totalRooms = totalRoomsMapped || (doubleCount + tripleCount + quadCount + quintCount);

      const seriesVal = columnMappings['series'] ? rowObj[columnMappings['series']] : '';
      const refVal = columnMappings['ref'] ? rowObj[columnMappings['ref']] : '';

      const errors: { field: string; message: string }[] = [];
      const warnings: { field: string; message: string }[] = [];

      // A. Validate company
      if (!companyVal) {
        errors.push({ field: 'company', message: 'Missing B2B company / partner name.' });
      }

      // Check for manual overrides or auto-matches for partners
      let matchedPartnerId = '';
      let matchedPartnerName = '';
      if (manualRowPartners[rowNum]) {
        const foundP = partners.find(p => p.id === manualRowPartners[rowNum]);
        if (foundP) {
          matchedPartnerId = foundP.id;
          matchedPartnerName = foundP.companyName;
        }
      } else if (companyVal) {
        const cleanCompany = companyVal.trim().toLowerCase();
        const foundP = partners.find(p => 
          p.companyName.toLowerCase().replace(/[\s+-_]/g, '').includes(cleanCompany.replace(/[\s+-_]/g, '')) || 
          cleanCompany.replace(/[\s+-_]/g, '').includes(p.companyName.toLowerCase().replace(/[\s+-_]/g, ''))
        );
        if (foundP) {
          matchedPartnerId = foundP.id;
          matchedPartnerName = foundP.companyName;
        }
      }

      // B. Validate dates
      if (!checkInVal || !checkOutVal) {
        errors.push({ field: 'dates', message: 'Check-in or Check-out date is missing.' });
      } else {
        const checkInDate = new Date(checkInVal);
        const checkOutDate = new Date(checkOutVal);
        if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
          errors.push({ field: 'dates', message: 'Invalid date syntax (Expected YYYY-MM-DD).' });
        } else if (checkInDate >= checkOutDate) {
          errors.push({ field: 'dates', message: 'Check-out date is equal or prior to check-in.' });
        }
      }

      // C. Hotel Matching Logic
      let matchedContract: HotelContract | null = null;
      let matchReason = '';

      if (manualRowHotels[rowNum]) {
        matchedContract = hotelContracts.find(c => c.id === manualRowHotels[rowNum]) || null;
        if (matchedContract) {
          matchReason = "Manually linked by user override";
        }
      } else {
        // 1. Hotel ID primary key lookup first whenever available
        if (hotelIdVal) {
          matchedContract = hotelContracts.find(c => c.id.trim().toLowerCase() === hotelIdVal.trim().toLowerCase()) || null;
          if (matchedContract) {
            matchReason = `Matched exactly by Contract ID: ${matchedContract.id}`;
          }
        }

        // 2. Case-insensitive name + prefix/suffix & Alias lookup if not matched yet
        if (!matchedContract && hotelVal) {
          const cleanedInput = hotelVal.trim().toLowerCase().replace(/\s+/g, ' ');
          
          // Case-insensitive clean comparison
          matchedContract = hotelContracts.find(c => 
            c.hotelName.trim().toLowerCase().replace(/\s+/g, ' ') === cleanedInput
          ) || null;

          if (matchedContract) {
            matchReason = "Strict case-insensitive name match";
          } else {
            // Check alias settings on contracts
            matchedContract = hotelContracts.find(c => 
              (c.aliases || []).some(alias => alias.trim().toLowerCase().replace(/\s+/g, ' ') === cleanedInput)
            ) || null;
            if (matchedContract) {
              matchReason = "Matched via Hotel Setting alias spelling";
            }
          }

          // Substring approximation backup match
          if (!matchedContract) {
            matchedContract = hotelContracts.find(c => {
              const cleanContractName = c.hotelName.trim().toLowerCase().replace(/\s+/g, ' ');
              return cleanContractName.includes(cleanedInput) || cleanedInput.includes(cleanContractName);
            }) || null;
            if (matchedContract) {
              matchReason = "Approximate overlap match";
            }
          }
        }
      }

      let suggestions: HotelContract[] = [];
      if (!matchedContract) {
        errors.push({ field: 'hotel', message: `Hotel unrecognized ("${hotelVal || 'Empty'}"). Please map manually.` });

        // Rank suggestions by similarity
        const cleanedHotelInput = (hotelVal || '').trim().toLowerCase();
        suggestions = [...hotelContracts].map(c => {
          let score = 0;
          const cleanName = c.hotelName.trim().toLowerCase();
          
          if (cleanName.includes(cleanedHotelInput) || cleanedHotelInput.includes(cleanName)) {
            score += 0.5;
          }
          const inputWords = cleanedHotelInput.split(/\s+/).filter(w => w.length > 2);
          const contractWords = cleanName.split(/\s+/).filter(w => w.length > 2);
          const common = inputWords.filter(w => contractWords.includes(w));
          if (inputWords.length > 0) {
            score += (common.length / Math.max(inputWords.length, contractWords.length)) * 0.5;
          }
          return { contract: c, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(i => i.contract);
      }

      // Check contract dates validity range (Warning)
      if (matchedContract && checkInVal && checkOutVal) {
        const contractStart = matchedContract.validFrom;
        const contractEnd = matchedContract.validTo;
        if (checkInVal < contractStart || checkOutVal > contractEnd) {
          warnings.push({ field: 'dates', message: `Dates exceed contract validity (${contractStart} to ${contractEnd}).` });
        }
      }

      // D. Room capacity / count validation
      if (doubleCount === 0 && tripleCount === 0 && quadCount === 0 && quintCount === 0) {
        errors.push({ field: 'rooms', message: 'Missing room allocation counts. All rooms are zero.' });
      }

      // E. Pax capacity / count validation
      const bedSum = (doubleCount * 2) + (tripleCount * 3) + (quadCount * 4) + (quintCount * 5);
      if (paxVal <= 0) {
        errors.push({ field: 'pax', message: `Invalid pilgrim count of '${paxVal}' (Must be positive).` });
      } else if (bedSum > 0 && paxVal > bedSum) {
        warnings.push({ field: 'pax', message: `Pilgrim count (${paxVal}) exceeds total contract beds capacity (${bedSum}).` });
      } else if (bedSum > 0 && paxVal < bedSum) {
        warnings.push({ field: 'pax', message: `Under-occupied: Pilgrim count (${paxVal}) is lower than bedding limits (${bedSum}).` });
      }

      // F. Overbooking check (Warning)
      if (matchedContract && checkInVal && checkOutVal && errors.length === 0) {
        const stayDates = [];
        const start = new Date(checkInVal);
        const end = new Date(checkOutVal);
        let curr = new Date(start);
        while (curr < end) {
          stayDates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }

        const roomTypesInvolved = [
          { type: 'Double', count: doubleCount },
          { type: 'Triple', count: tripleCount },
          { type: 'Quad', count: quadCount },
          { type: 'Quint', count: quintCount }
        ];

        let overbookDetected = false;
        for (const dateStr of stayDates) {
          if (overbookDetected) break;
          for (const rTypes of roomTypesInvolved) {
            if (rTypes.count <= 0) continue;
            const cRoom = matchedContract.rooms.find(rm => rm.roomType === rTypes.type);
            if (!cRoom) {
              errors.push({ field: 'rooms', message: `Room type "${rTypes.type}" is not supported in contract.` });
              overbookDetected = true;
              break;
            }
            const roomsLimit = cRoom.roomsTotal;

            // Compute active confirmed bookings
            let bookedRooms = 0;
            bookings.forEach(b => {
              if (b.bookingStatus === 'Confirmed' && b.roomAllocations) {
                if (b.travelDateFrom <= dateStr && dateStr < b.travelDateTo) {
                  if (b.hotelMakkah === matchedContract?.hotelName || b.hotelMadinah === matchedContract?.hotelName) {
                    const matchRA = b.roomAllocations.find(ra => ra.roomType === rTypes.type);
                    if (matchRA) bookedRooms += matchRA.count;
                  }
                }
              }
            });

            if (bookedRooms + rTypes.count > roomsLimit) {
              warnings.push({ field: 'rooms', message: `Capacity warning on date ${dateStr} for ${rTypes.type} (${bookedRooms + rTypes.count}/${roomsLimit} rooms allocated).` });
              overbookDetected = true;
              break;
            }
          }
        }
      }

      const status = errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid';

      return {
        rowNum,
        rawObj,
        company: companyVal,
        checkIn: checkInVal,
        checkOut: checkOutVal,
        doubleCount,
        tripleCount,
        quadCount,
        quintCount,
        totalRooms,
        paxCount: paxVal,
        series: seriesVal,
        ref: refVal,
        hotel: hotelVal,
        hotelId: hotelIdVal,
        matchedHotelName: matchedContract ? matchedContract.hotelName : '',
        matchedHotelId: matchedContract ? matchedContract.id : '',
        matchedPartnerId,
        matchedPartnerName,
        status,
        errors,
        warnings,
        suggestions
      };
    });
  }, [rawLines, rawHeaders, columnMappings, hotelContracts, bookings, manualRowHotels, manualRowPartners, partners]);

  // Handle manual rows updates
  const handleManualRowHotelMap = (rowNum: number, hotelId: string) => {
    setManualRowHotels(prev => ({ ...prev, [rowNum]: hotelId }));
  };

  const handleManualRowPartnerMap = (rowNum: number, partnerId: string) => {
    setManualRowPartners(prev => ({ ...prev, [rowNum]: partnerId }));
  };

  // Convert parsed valid rows into bookings on backend independently (Fault-tolerant)
  const handleConfirmImport = async () => {
    const importableRows = parsedRows.filter(r => r.status === 'valid' || r.status === 'warning');
    if (importableRows.length === 0) {
      alert("No valid rows or warning rows exist to import. Correct manual mappings and try again.");
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    const importedRowNums = new Set<number>();

    for (const r of importableRows) {
      try {
        const matchingContract = hotelContracts.find(c => c.hotelName === r.matchedHotelName);
        const position = matchingContract?.location || 'Makkah';

        const rawAllocations: RoomAllocation[] = [
          { roomType: 'Double', count: r.doubleCount, capacity: 2, ratePerRoom: matchingContract?.rooms.find(rm => rm.roomType === 'Double')?.contractRateMYR || 450 },
          { roomType: 'Triple', count: r.tripleCount, capacity: 3, ratePerRoom: matchingContract?.rooms.find(rm => rm.roomType === 'Triple')?.contractRateMYR || 550 },
          { roomType: 'Quad', count: r.quadCount, capacity: 4, ratePerRoom: matchingContract?.rooms.find(rm => rm.roomType === 'Quad')?.contractRateMYR || 650 },
          { roomType: 'Quint', count: r.quintCount, capacity: 5, ratePerRoom: matchingContract?.rooms.find(rm => rm.roomType === 'Quint')?.contractRateMYR || 750 },
          { roomType: 'Six-sharing', count: 0, capacity: 6, ratePerRoom: matchingContract?.rooms.find(rm => rm.roomType === 'Six-sharing')?.contractRateMYR || 850 }
        ];

        const roomAllocations = rawAllocations.filter(alloc => alloc.count > 0);

        // Calculate nights
        const dayIn = new Date(r.checkIn);
        const dayOut = new Date(r.checkOut);
        const nights = Math.max(1, Math.round((dayOut.getTime() - dayIn.getTime()) / (1000 * 60 * 60 * 24))) || 1;
        
        // Exact real total based on contract rates and duration
        const totalAmountMYR = roomAllocations.reduce((sum, alloc) => sum + (alloc.count * alloc.ratePerRoom * nights), 0) || 5000;

        // B2B Partner resolution
        const finalPartnerId = r.matchedPartnerId || null;
        const finalPartnerName = r.matchedPartnerName || null;

        const formattedBooking: Partial<BookingItem> = {
          customerName: `${r.company} Series ${r.series || 'Import'} Group`,
          customerPhone: '+60 11-import',
          customerEmail: 'bulk-import@aerostar.co',
          bookingType: 'Umrah Package',
          packageName: `Custom Bulk series: ${r.series || 'CT-Series'}`,
          paxCount: r.paxCount,
          travelDateFrom: r.checkIn,
          travelDateTo: r.checkOut,
          currency: 'MYR',
          totalAmount: totalAmountMYR,
          totalAmountMYR,
          bookingStatus: 'Confirmed',
          hotelSelectionType: position === 'Makkah' ? 'Makkah Only' : 'Madinah Only',
          hotelMakkah: position === 'Makkah' ? r.matchedHotelName : '',
          hotelMadinah: position === 'Madinah' ? r.matchedHotelName : '',
          transportType: 'Standard Coaches Class A',
          extraServices: [],
          notes: `Bulk Import AERO REF: ${r.ref}. Associated partner: ${r.company}.`,
          aeroRef: r.ref,
          b2bAgentId: finalPartnerId,
          b2bAgentName: finalPartnerName,
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
          successCount++;
          importedRowNums.add(r.rowNum);
        } else {
          const errMsg = await res.json().catch(() => ({ error: 'Server boundary conflict' }));
          failCount++;
          r.status = 'invalid';
          r.errors.push({ field: 'submit', message: errMsg.error || 'Server validation failed' });
        }
      } catch (err) {
        failCount++;
        r.status = 'invalid';
        r.errors.push({ field: 'submit', message: 'Network connection broke.' });
      }
    }

    // Keep only non-imported / failed rows in the spreadsheet preview for re-import
    const remainingRows = parsedRows.filter(r => !importedRowNums.has(r.rowNum));
    
    // Clear the raw rows and re-populate rawLines with the failed/unimported lines in order to keep working with failed only!
    if (remainingRows.length > 0) {
      // Re-map to raw state
      const nextRawLines = remainingRows.map(r => {
        return rawHeaders.map(h => r.rawObj[h] || '').join(',');
      });
      setRawLines(nextRawLines);
      // Clear specific row overrides for successfully imported keys to avoid leak
      setManualRowHotels(prev => {
        const next = { ...prev };
        importedRowNums.forEach(num => { delete next[num]; });
        return next;
      });
      setManualRowPartners(prev => {
        const next = { ...prev };
        importedRowNums.forEach(num => { delete next[num]; });
        return next;
      });
    } else {
      setRawLines([]);
    }

    setIsLoading(false);
    setImportSummary(`Bulk operations finished! Successfully imported ${successCount} confirmed group reservation(s). Failed/Retained for correction: ${failCount + (parsedRows.length - importableRows.length)}.`);
    
    await onRefreshDatabase();
  };

  // Error Report Downloader CSV
  const handleDownloadErrorReport = () => {
    const errorRows = parsedRows.filter(r => r.status !== 'valid');
    if (errorRows.length === 0) {
      alert("No rows have errors or warnings in the current file!");
      return;
    }

    const headersLine = "Row,Line Number,B2B Company,Given Hotel,Status,Validation Failures / Warning Messages\n";
    const bodyContent = errorRows.map(r => {
      const messages = [...r.errors, ...r.warnings].map(item => `[${item.field}] ${item.message}`).join('; ');
      return `${r.rowNum},${r.rowNum},"${r.company}","${r.hotel}","${r.status}","${messages.replace(/"/g, '""')}"`;
    }).join('\n');

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headersLine + bodyContent);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `aerostar_import_errors_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bookings general ledger data exporter CSV triggered
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

  // Expected logical target fields for CSV matching map
  const fieldsToMap = [
    { key: 'company', label: 'B2B Client / Partner', required: true },
    { key: 'checkIn', label: 'Check-In Date', required: true },
    { key: 'checkOut', label: 'Check-Out Date', required: true },
    { key: 'hotel', label: 'Hotel Name spelling', required: true },
    { key: 'hotelId', label: 'Hotel ID primary key', required: false },
    { key: 'paxCount', label: 'Pilgrim / Pax amount', required: true },
    { key: 'doubleCount', label: 'Double (DB) rooms', required: false },
    { key: 'tripleCount', label: 'Triple (TPL) rooms', required: false },
    { key: 'quadCount', label: 'Quad (QUAD) rooms', required: false },
    { key: 'quintCount', label: 'Quint (QUINT) rooms', required: false },
    { key: 'totalRooms', label: 'Total rooms count', required: false },
    { key: 'series', label: 'Group Series code', required: false },
    { key: 'ref', label: 'AERO reservation Ref', required: false }
  ];

  // Helper counts for stats dashboard
  const totalRowsCount = parsedRows.length;
  const invalidRowsCount = parsedRows.filter(r => r.status === 'invalid').length;
  const warningRowsCount = parsedRows.filter(r => r.status === 'warning').length;
  const validRowsCount = parsedRows.filter(r => r.status === 'valid').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      
      {/* Top action header layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 uppercase tracking-wider">
            <Upload className="w-4 h-4 text-emerald-800" />
            Bulk Operations & Integration Hub
          </h3>
          <p className="text-xs text-slate-500">Import group reservation spreadsheets from external flight charters, map rooming keys, and audit hotel contracts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadTemplate}
            id="download_template_btn"
            className="px-3.5 py-1.8 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.8 border border-slate-250 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Import Template
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

      {/* CSV Drag zone inputs / Reset toggle */}
      {parsedRows.length === 0 ? (
        <div className="border-2 border-dashed border-slate-250 rounded-2xl bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center space-y-3 hover:border-emerald-800 transition-colors">
          <Upload className="w-8 h-8 text-slate-450" />
          <div>
            <strong className="text-slate-800 text-xs font-extrabold block">Select reservation Excel/CSV file from local disk</strong>
            <span className="text-[10px] text-slate-450 mt-1 block">Data mapping column header detection runs automatically</span>
          </div>
          <label className="px-4 py-2 bg-emerald-850 hover:bg-emerald-900 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 select-none">
            Choose reservation CSV File
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {fileSelectedName && (
            <span className="text-[10px] font-mono bg-slate-100 border border-slate-250 text-slate-700 px-2.5 py-1 rounded-md">
              Selected: <span className="text-emerald-850 font-bold">{fileSelectedName}</span>
            </span>
          )}
        </div>
      ) : (
        <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <strong className="text-[11px] text-slate-800 block">Active Spreadsheet Previewing: <span className="text-emerald-800 font-extrabold">{fileSelectedName}</span></strong>
              <span className="text-[9px] text-slate-450 font-semibold block">{parsedRows.length} total rows currently parsed inside preview</span>
            </div>
          </div>
          <button
            onClick={handleClearImport}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 hover:text-red-600 font-bold rounded-xl border border-slate-200 text-[10px] flex items-center gap-1 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Clear / Upload Diff Spreadsheet
          </button>
        </div>
      )}

      {/* Real-time response summary panel */}
      {importSummary && (
        <div id="import_summary_notif" className="p-4 bg-emerald-50 border border-emerald-250 rounded-2xl flex items-center gap-3 text-emerald-800 animate-in fade-in duration-350">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div className="text-xs font-bold leading-relaxed">
            {importSummary}
          </div>
        </div>
      )}

      {/* Interactive schema column alignment configurator */}
      {rawLines.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 animate-in fade-in duration-350">
          <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
            <Sliders className="w-4 h-4 text-emerald-800" />
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Spreadsheet Header Columns Manual Mapping</h4>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">If your spreadsheet column header spelling differs from system keys, adjust selectors below to override field mapping details instantly.</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
            {fieldsToMap.map((f) => (
              <div key={f.key} className="space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-450 block truncate">
                  {f.label} {f.required && <span className="text-red-500 font-bold">*</span>}
                </span>
                <select
                  value={columnMappings[f.key] || ''}
                  onChange={(e) => {
                    setColumnMappings(prev => ({ ...prev, [f.key]: e.target.value }));
                  }}
                  className={`w-full text-[10px] font-bold px-2 py-1.5 rounded-lg border focus:bg-white outline-none cursor-pointer truncate ${columnMappings[f.key] ? 'border-emerald-200 bg-emerald-50/10 text-emerald-85 *:' : 'border-slate-200 bg-white text-slate-600'}`}
                >
                  <option value="">{f.required ? '-- Required Mapping --' : '[Optional - Default to empty]'}</option>
                  {rawHeaders.map((headerText) => (
                    <option key={headerText} value={headerText}>{headerText}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rows validation dashboard */}
      {parsedRows.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-350">
          
          {/* Dashboard Summary Counts Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200">
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total records</span>
              <span className="text-lg font-black text-slate-800 mt-1 block">{totalRowsCount} Rows</span>
            </div>
            <div className={`bg-white p-3 rounded-xl border shadow-2xs ${validRowsCount > 0 ? 'border-emerald-200 bg-emerald-50/5' : 'border-slate-200/60'}`}>
              <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block">Clean / Ready</span>
              <span className="text-lg font-black text-emerald-800 mt-1 block">{validRowsCount} Rows</span>
            </div>
            <div className={`bg-white p-3 rounded-xl border shadow-2xs ${warningRowsCount > 0 ? 'border-amber-200 bg-amber-50/5' : 'border-slate-200/60'}`}>
              <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider block">Warnings / Bypass ok</span>
              <span className="text-lg font-black text-amber-800 mt-1 block">{warningRowsCount} Rows</span>
            </div>
            <div className={`bg-white p-3 rounded-xl border shadow-2xs ${invalidRowsCount > 0 ? 'border-red-200 bg-red-50/5' : 'border-slate-200/60'}`}>
              <span className="text-[9px] font-black text-red-500 uppercase tracking-wider block">Errors / Retained</span>
              <span className="text-lg font-black text-red-600 mt-1 block">{invalidRowsCount} Rows</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="text-slate-900 text-xs font-extrabold uppercase">Import Preview & Surgical Link Override Controls</h4>
              <p className="text-[10px] text-slate-450 font-medium">Verify spelling alignment and dates against active contracts before committing.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {invalidRowsCount > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadErrorReport}
                  id="download_errors_btn"
                  className="px-3 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Download Error Report ({invalidRowsCount})
                </button>
              )}
              <button
                onClick={handleConfirmImport}
                id="confirm_import_btn"
                disabled={isLoading || parsedRows.filter(r => r.status === 'valid' || r.status === 'warning').length === 0}
                className="px-4 py-2 bg-emerald-850 hover:bg-emerald-900 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <Save className="w-3.5 h-3.5" />
                {isLoading ? "Running bulk uploads..." : `Commit ${parsedRows.filter(r => r.status === 'valid' || r.status === 'warning').length} Valid Booking(s)`}
              </button>
            </div>
          </div>

          {/* Interactive spreadsheet table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-sans border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-650 text-[10px] font-bold uppercase text-left">
                    <th className="p-3">Row</th>
                    <th className="p-3">B2B Company / Partner</th>
                    <th className="p-3">Cleaned Mapped Hotel (Contract Link)</th>
                    <th className="p-3">Check In/Out</th>
                    <th className="p-3">Allotments</th>
                    <th className="p-3 text-center">Pax</th>
                    <th className="p-3 text-center">Aero Ref</th>
                    <th className="p-3">Validation & Dynamic Suggestions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {parsedRows.map((row) => {
                    let bgShade = 'bg-white hover:bg-slate-50/50';
                    if (row.status === 'invalid') bgShade = 'bg-red-50/20 hover:bg-red-50/35';
                    else if (row.status === 'warning') bgShade = 'bg-amber-50/15 hover:bg-amber-50/25';

                    return (
                      <tr key={row.rowNum} className={`${bgShade} transition-colors`}>
                        {/* Row number */}
                        <td className="p-3 font-mono font-bold text-slate-400">{row.rowNum}</td>
                        
                        {/* Company & Mapped Partner */}
                        <td className="p-3 space-y-1">
                          <div className={`font-extrabold text-slate-900 ${row.errors.some(e => e.field === 'company') ? 'p-1 bg-red-100/50 border border-red-300 rounded' : ''}`}>
                            {row.company || <span className="text-red-500 italic">[Empty]</span>}
                          </div>
                          <div>
                            {/* Manual partner selection box */}
                            <select
                              value={row.matchedPartnerId}
                              onChange={(e) => handleManualRowPartnerMap(row.rowNum, e.target.value)}
                              className="text-[9px] bg-slate-100 border border-slate-250 rounded px-1.5 py-0.5 outline-none font-bold text-slate-600 block cursor-pointer max-w-[150px]"
                              title="Connect B2B partner agent"
                            >
                              <option value="">[Direct Corporate Client]</option>
                              {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.companyName}</option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Hotel mapping spelling resolver */}
                        <td className="p-3 space-y-1">
                          <div className={`font-medium ${row.errors.some(e => e.field === 'hotel') ? 'p-1.5 bg-red-100/50 border border-red-350 rounded text-red-750 font-bold' : 'text-slate-800'}`}>
                            {row.hotel || <span className="italic">[Empty Hotel spelling]</span>}
                          </div>
                          
                          {/* Live hotel contract resolver selector */}
                          <div>
                            <select
                              value={row.matchedHotelId}
                              onChange={(e) => handleManualRowHotelMap(row.rowNum, e.target.value)}
                              className={`text-[9px] rounded px-1.5 py-0.5 font-extrabold outline-none tracking-wide block cursor-pointer ${row.matchedHotelId ? 'bg-emerald-50 text-emerald-8 border border-emerald-250' : 'bg-amber-50 text-amber-8 border border-amber-250 animate-bounce'}`}
                              title="Override matched contract mapping"
                            >
                              <option value="">-- Click to Link Hotel Contract --</option>
                              {hotelContracts.map(c => (
                                <option key={c.id} value={c.id}>{c.hotelName}</option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="p-3 font-mono">
                          <div className={`flex items-center gap-1 ${row.errors.some(e => e.field === 'dates') ? 'p-1.5 bg-red-100/50 border border-red-300 rounded text-red-700' : ''}`}>
                            <span className="text-slate-800 font-bold">{row.checkIn || 'Empty'}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-slate-800 font-bold">{row.checkOut || 'Empty'}</span>
                          </div>
                          {row.warnings.filter(w => w.field === 'dates').map((w, idx) => (
                            <span key={idx} className="text-[9px] text-amber-700 font-semibold block mt-1">⚠️ {w.message}</span>
                          ))}
                        </td>

                        {/* Allotments layout */}
                        <td className="p-3 font-mono">
                          <div className={`${row.errors.some(e => e.field === 'rooms') ? 'p-1.5 bg-red-100/50 border border-red-300 rounded text-red-700' : 'text-slate-500'}`}>
                            {row.doubleCount || 0} DB / {row.tripleCount || 0} TPL / {row.quadCount || 0} QUAD / {row.quintCount || 0} QUINT
                          </div>
                          {row.warnings.filter(w => w.field === 'rooms').map((w, idx) => (
                            <span key={idx} className="text-[9px] text-amber-700 font-bold block mt-1">⚠️ {w.message}</span>
                          ))}
                        </td>

                        {/* Pax */}
                        <td className="p-3 text-center">
                          <div className={`font-mono font-black text-slate-850 ${row.errors.some(e => e.field === 'pax') ? 'p-1.5 bg-red-100/50 border border-red-300 rounded text-red-700' : ''}`}>
                            {row.paxCount}
                          </div>
                          {row.warnings.filter(w => w.field === 'pax').map((w, idx) => (
                            <span key={idx} className="text-[9px] text-amber-700 font-bold block mt-1 leading-tight">⚠️ {w.message}</span>
                          ))}
                        </td>

                        {/* Service tracking ref */}
                        <td className="p-3 text-center font-mono font-bold text-slate-650">{row.ref || <span className="text-slate-350 italic">None</span>}</td>

                        {/* Validation & Suggestions UI */}
                        <td className="p-3">
                          {row.status === 'valid' && (
                            <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-[10px]">
                              <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                              Ready for check-in
                            </div>
                          )}

                          {row.status === 'warning' && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-[10px]">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                Validated with warnings
                              </div>
                              <div className="space-y-1">
                                {row.warnings.map((w, idx) => (
                                  <div key={idx} className="text-[9px] text-amber-800 leading-tight">
                                    • {w.message}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {row.status === 'invalid' && (
                            <div className="space-y-2">
                              <div className="space-y-1">
                                {row.errors.map((err, idx) => (
                                  <div key={idx} className="flex items-start gap-1 text-red-600 font-medium text-[9.5px] leading-tight">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                                    <span>{err.message}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Smart automatic spelling override suggester */}
                              {row.suggestions && row.suggestions.length > 0 && !row.matchedHotelId && (
                                <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg space-y-1 bg-gradient-to-r from-emerald-50/35 to-slate-100">
                                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Suggested Match Spelling Resolution:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {row.suggestions.slice(0, 2).map((s) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleManualRowHotelMap(row.rowNum, s.id)}
                                        className="text-[9px] bg-white hover:bg-emerald-800 hover:text-white border border-slate-250 font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                                      >
                                        Map to: "{s.hotelName}"
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
