import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  initialBookings, 
  initialInvoices, 
  initialB2BPartners, 
  initialSuppliers, 
  initialTransactions, 
  initialEmployees, 
  initialLogs,
  EXCHANGE_RATES,
  initialHotelContracts
} from "./src/db_initial.js";
import { BookingItem, InvoiceItemModel, ActivityLog, FinanceTransaction, HotelContract, RoomAllocation, MealsConfig, AdditionalService } from "./src/types.js";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Middleware
app.use(express.json());

// Initialize Local JSON Database
function getDatabase() {
  const initialLeaves = [
    {
      id: "LV-101",
      employeeId: "EMP-504",
      employeeName: "Hajah Zahrah Ishak",
      leaveType: "Annual",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      reason: "Umrah family trip personal leave",
      status: "Approved",
      requestedAt: "2026-05-15T09:00:00Z"
    },
    {
      id: "LV-102",
      employeeId: "EMP-503",
      employeeName: "Shaharuzi Amri",
      leaveType: "Sick",
      startDate: "2026-06-12",
      endDate: "2026-06-13",
      reason: "Medical checkup and flu",
      status: "Pending",
      requestedAt: "2026-06-04T11:20:00Z"
    }
  ];

  const initialPayslips = [
    {
      id: "SL-101",
      employeeId: "EMP-501",
      employeeName: "Aminah Noor",
      month: "2026-05",
      baseSalary: 8500,
      allowances: 250,
      commission: 0,
      epfEmployee: 962.50,
      epfEmployer: 1050.00,
      socsoEmployee: 30.00,
      socsoEmployer: 105.00,
      eisEmployee: 12.00,
      eisEmployer: 12.00,
      pcb: 542.50,
      netSalary: 7203.00,
      status: "Paid",
      generatedAt: "2026-05-28T08:00:00Z"
    }
  ];

  const mockStatDetails = [
    { id: "EMP-501", nric: "890514-14-5211", epfNumber: "EPF-12884102", socsoNumber: "SOC-A3199827", taxNumber: "SG4918239011", maritalStatus: "Married", numberOfChildren: 2 },
    { id: "EMP-502", nric: "911220-10-5341", epfNumber: "EPF-13998244", socsoNumber: "SOC-A4211993", taxNumber: "SG5481729012", maritalStatus: "Single", numberOfChildren: 0 },
    { id: "EMP-503", nric: "860228-14-5519", epfNumber: "EPF-11993421", socsoNumber: "SOC-A3004182", taxNumber: "SG3918203913", maritalStatus: "Married", numberOfChildren: 1 },
    { id: "EMP-504", nric: "750810-10-5110", epfNumber: "EPF-10118392", socsoNumber: "SOC-A1948271", taxNumber: "SG1948291014", maritalStatus: "Married", numberOfChildren: 4 },
    { id: "EMP-505", nric: "930415-14-5555", epfNumber: "EPF-14992144", socsoNumber: "SOC-A5928173", taxNumber: "SG5028192015", maritalStatus: "Single", numberOfChildren: 0 },
  ];

  if (!fs.existsSync(DB_FILE)) {
    const defaultData: any = {
      bookings: initialBookings,
      invoices: initialInvoices,
      partners: initialB2BPartners,
      suppliers: initialSuppliers,
      transactions: initialTransactions,
      employees: initialEmployees.map(e => {
        const d = mockStatDetails.find(m => m.id === e.id);
        return {
          ...e,
          nric: d?.nric,
          epfNumber: d?.epfNumber,
          socsoNumber: d?.socsoNumber,
          taxNumber: d?.taxNumber,
          maritalStatus: d?.maritalStatus as any,
          numberOfChildren: d?.numberOfChildren
        };
      }),
      logs: initialLogs,
      hotelContracts: initialHotelContracts,
      exchangeRates: EXCHANGE_RATES,
      leaveRequests: initialLeaves,
      payslips: initialPayslips
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data);
    let updated = false;

    if (!parsed.hotelContracts) {
      parsed.hotelContracts = initialHotelContracts;
      updated = true;
    }
    if (!parsed.exchangeRates) {
      parsed.exchangeRates = EXCHANGE_RATES;
      updated = true;
    }
    if (!parsed.leaveRequests) {
      parsed.leaveRequests = initialLeaves;
      updated = true;
    }
    if (!parsed.payslips) {
      parsed.payslips = initialPayslips;
      updated = true;
    }

    // Ensure employees have statutory attributes
    parsed.employees.forEach((e: any) => {
      const match = mockStatDetails.find(d => d.id === e.id);
      if (match) {
        if (!e.nric) { e.nric = match.nric; updated = true; }
        if (!e.epfNumber) { e.epfNumber = match.epfNumber; updated = true; }
        if (!e.socsoNumber) { e.socsoNumber = match.socsoNumber; updated = true; }
        if (!e.taxNumber) { e.taxNumber = match.taxNumber; updated = true; }
        if (!e.maritalStatus) { e.maritalStatus = match.maritalStatus; updated = true; }
        if (e.numberOfChildren === undefined) { e.numberOfChildren = match.numberOfChildren; updated = true; }
      } else {
        if (!e.nric) { e.nric = "900101-14-" + Math.floor(1000 + Math.random() * 9000); updated = true; }
        if (!e.epfNumber) { e.epfNumber = "EPF-" + Math.floor(10000000 + Math.random() * 90000000); updated = true; }
        if (!e.socsoNumber) { e.socsoNumber = "SOC-A" + Math.floor(1000000 + Math.random() * 9000000); updated = true; }
        if (!e.taxNumber) { e.taxNumber = "SG" + Math.floor(1000000000 + Math.random() * 900000000); updated = true; }
        if (!e.maritalStatus) { e.maritalStatus = "Single"; updated = true; }
        if (e.numberOfChildren === undefined) { e.numberOfChildren = 0; updated = true; }
      }
    });

    if (updated) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch (err) {
    console.error("Error reading database file, returning default data:", err);
    return {
      bookings: initialBookings,
      invoices: initialInvoices,
      partners: initialB2BPartners,
      suppliers: initialSuppliers,
      transactions: initialTransactions,
      employees: initialEmployees,
      logs: initialLogs,
      hotelContracts: initialHotelContracts,
      exchangeRates: EXCHANGE_RATES,
      leaveRequests: initialLeaves,
      payslips: initialPayslips
    };
  }
}

function getRates(db: any) {
  return db.exchangeRates || EXCHANGE_RATES;
}

function saveDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save to database file:", err);
  }
}

// Core Business Logic: Track rooms availability dynamically for a given date (defaults to today)
function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
  const curr = new Date(start);
  while (curr < end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

function computeLiveInventory(db: any) {
  if (!db.hotelContracts) {
    db.hotelContracts = JSON.parse(JSON.stringify(initialHotelContracts));
  }
  
  // Reset all roomsAvailable to roomsTotal
  db.hotelContracts.forEach((contract: any) => {
    contract.rooms.forEach((room: any) => {
      room.roomsAvailable = room.roomsTotal;
    });
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // For visual convenience, roomsAvailable reflects occupancy for Today
  db.bookings.forEach((booking: any) => {
    if ((booking.bookingStatus === 'Confirmed' || booking.bookingStatus === 'Invoiced') && booking.roomAllocations) {
      const coversToday = booking.travelDateFrom <= todayStr && todayStr < booking.travelDateTo;
      if (coversToday) {
        booking.roomAllocations.forEach((alloc: any) => {
          if (booking.hotelSelectionType !== 'Madinah Only' && booking.hotelMakkah) {
            const makkahContract = db.hotelContracts.find((c: any) => c.hotelName === booking.hotelMakkah && c.location === 'Makkah');
            if (makkahContract) {
              const room = makkahContract.rooms.find((r: any) => r.roomType === alloc.roomType);
              if (room) {
                room.roomsAvailable = Math.max(0, room.roomsAvailable - alloc.count);
              }
            }
          }
          if (booking.hotelSelectionType !== 'Makkah Only' && booking.hotelMadinah) {
            const madinahContract = db.hotelContracts.find((c: any) => c.hotelName === booking.hotelMadinah && c.location === 'Madinah');
            if (madinahContract) {
              const room = madinahContract.rooms.find((r: any) => r.roomType === alloc.roomType);
              if (room) {
                room.roomsAvailable = Math.max(0, room.roomsAvailable - alloc.count);
              }
            }
          }
        });
      }
    }
  });
}

function checkOverbooking(booking: any, db: any, bookingIdToExclude?: string): { allowed: boolean; reason?: string } {
  if ((booking.bookingStatus !== 'Confirmed' && booking.bookingStatus !== 'Invoiced') || !booking.roomAllocations || booking.roomAllocations.length === 0) {
    return { allowed: true };
  }

  const travelDates = getDatesInRange(booking.travelDateFrom, booking.travelDateTo);
  if (travelDates.length === 0) {
    return { allowed: false, reason: "Invalid travel date range. Ensure Check-In is prior to Check-Out." };
  }

  const contracts = db.hotelContracts || initialHotelContracts;

  // Validate date-by-date
  for (const d of travelDates) {
    // 1. Validate Makkah Hotel
    if (booking.hotelSelectionType !== 'Madinah Only' && booking.hotelMakkah) {
      const makkahContract = contracts.find((c: any) => 
        c.hotelName === booking.hotelMakkah && 
        c.location === 'Makkah' &&
        c.validFrom <= d && d <= c.validTo
      );

      if (!makkahContract) {
        return { 
          allowed: false, 
          reason: `No active hotel contract found in Makkah for "${booking.hotelMakkah}" on ${d}. Booking cannot be confirmed outside contract validity periods.` 
        };
      }

      for (const alloc of booking.roomAllocations) {
        if (alloc.count <= 0) continue;
        const contractRoom = makkahContract.rooms.find((r: any) => r.roomType === alloc.roomType);
        if (!contractRoom) {
          return {
            allowed: false,
            reason: `Makkah contract for "${booking.hotelMakkah}" does not offer Room Type "${alloc.roomType}"`
          };
        }

        const totalRooms = contractRoom.roomsTotal;
        let occupiedOnDay = 0;
        db.bookings.forEach((b: any) => {
          if ((b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Invoiced') && b.id !== bookingIdToExclude && b.roomAllocations) {
            if (b.travelDateFrom <= d && d < b.travelDateTo) {
              if (b.hotelSelectionType !== 'Madinah Only' && b.hotelMakkah === booking.hotelMakkah) {
                const bAlloc = b.roomAllocations.find((ra: any) => ra.roomType === alloc.roomType);
                if (bAlloc) occupiedOnDay += bAlloc.count;
              }
            }
          }
        });

        if (occupiedOnDay + alloc.count > totalRooms) {
          return {
            allowed: false,
            reason: `Overbooking on ${d} in Makkah (${booking.hotelMakkah}) for "${alloc.roomType}" rooms. Current booked: ${occupiedOnDay}, Contract capacity: ${totalRooms}. Fails by ${occupiedOnDay + alloc.count - totalRooms} room(s).`
          };
        }
      }
    }

    // 2. Validate Madinah Hotel
    if (booking.hotelSelectionType !== 'Makkah Only' && booking.hotelMadinah) {
      const madinahContract = contracts.find((c: any) => 
        c.hotelName === booking.hotelMadinah && 
        c.location === 'Madinah' &&
        c.validFrom <= d && d <= c.validTo
      );

      if (!madinahContract) {
        return { 
          allowed: false, 
          reason: `No active hotel contract found in Madinah for "${booking.hotelMadinah}" on ${d}. Booking cannot be confirmed outside contract validity periods.` 
        };
      }

      for (const alloc of booking.roomAllocations) {
        if (alloc.count <= 0) continue;
        const contractRoom = madinahContract.rooms.find((r: any) => r.roomType === alloc.roomType);
        if (!contractRoom) {
          return {
            allowed: false,
            reason: `Madinah contract for "${booking.hotelMadinah}" does not offer Room Type "${alloc.roomType}"`
          };
        }

        const totalRooms = contractRoom.roomsTotal;
        let occupiedOnDay = 0;
        db.bookings.forEach((b: any) => {
          if ((b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Invoiced') && b.id !== bookingIdToExclude && b.roomAllocations) {
            if (b.travelDateFrom <= d && d < b.travelDateTo) {
              if (b.hotelSelectionType !== 'Makkah Only' && b.hotelMadinah === booking.hotelMadinah) {
                const bAlloc = b.roomAllocations.find((ra: any) => ra.roomType === alloc.roomType);
                if (bAlloc) occupiedOnDay += bAlloc.count;
              }
            }
          }
        });

        if (occupiedOnDay + alloc.count > totalRooms) {
          return {
            allowed: false,
            reason: `Overbooking on ${d} in Madinah (${booking.hotelMadinah}) for "${alloc.roomType}" rooms. Current booked: ${occupiedOnDay}, Contract capacity: ${totalRooms}. Fails by ${occupiedOnDay + alloc.count - totalRooms} room(s).`
          };
        }
      }
    }
  }

  return { allowed: true };
}

// REST APIs
// 1. Get entire db state
app.get("/api/db", (req, res) => {
  const db = getDatabase();
  computeLiveInventory(db);
  res.json(db);
});

// Update Exchange Rates
app.post("/api/exchange-rates", (req, res) => {
  const db = getDatabase();
  const { rates, authorEmail, authorName } = req.body;
  if (!rates) {
    return res.status(400).json({ error: "Rates configuration is required" });
  }

  const updatedRates = {
    MYR: 1.0,
    SGD: Number(rates.SGD) || 3.3,
    SAR: Number(rates.SAR) || 1.2,
    IDR: Number(rates.IDR) || 0.0003,
  };

  db.exchangeRates = updatedRates;

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "finance@aero-star.co",
    userName: authorName || "Ops Desk",
    userRole: "Finance",
    action: `Updated currency conversion rates: SGD=${updatedRates.SGD}, SAR=${updatedRates.SAR}, IDR=${updatedRates.IDR}`,
    category: "System",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, exchangeRates: updatedRates, db });
});

// 2. Reset database state
app.post("/api/db/reset", (req, res) => {
  const defaultData = {
    bookings: initialBookings,
    invoices: initialInvoices,
    partners: initialB2BPartners,
    suppliers: initialSuppliers,
    transactions: initialTransactions,
    employees: initialEmployees,
    hotelContracts: initialHotelContracts,
    logs: [
      {
        id: `LOG-${Date.now()}`,
        userEmail: req.body.email || "finance@aero-star.co",
        userName: "Ahmad Farhan",
        userRole: "Admin",
        action: "Database state completely reset to enterprise seed defaults.",
        category: "System",
        timestamp: new Date().toISOString()
      }
    ]
  };
  saveDatabase(defaultData);
  res.json({ success: true, db: defaultData });
});

// Helper: Auto generate Unique Invoice Number
function generateInvoiceNumber(invoices: InvoiceItemModel[]): string {
  const year = new Date().getFullYear();
  const index = invoices.length + 1001;
  return `INV-${year}-${index}`;
}

// Core Business Logic Utility: Sync Invoice with booking
function syncBookingInvoice(booking: BookingItem, db: any, authorEmail: string, authorName: string) {
  if (booking.bookingStatus !== "Confirmed" && booking.bookingStatus !== "Invoiced") {
    // If not confirmed, we don't automatically generate invoice, 
    // unless one already exists, in which case we might keep it but sync content.
    // The requirement says: "When a booking is marked as 'Confirmed', the system must automatically generate an invoice."
    return;
  }

  // Check if invoice exists
  let invoice = db.invoices.find((inv: any) => inv.bookingId === booking.id);
  const rate = getRates(db)[booking.currency as keyof typeof EXCHANGE_RATES] || 1.0;

  // Build itemized breakdown
  const itemsList: any[] = [];
  
  if (booking.roomAllocations && booking.roomAllocations.length > 0) {
    const nights = Math.max(1, Math.round((new Date(booking.travelDateTo).getTime() - new Date(booking.travelDateFrom).getTime()) / (1000 * 60 * 60 * 24)));
    booking.roomAllocations.forEach(alloc => {
      if (alloc.count > 0) {
        // Contract rate is in MYR, so convert to booking currency
        const unitPriceInCurrency = Math.round(alloc.ratePerRoom / rate);
        const sub = alloc.count * unitPriceInCurrency * nights;
        
        let destinationHotel = "";
        if (booking.hotelSelectionType === "Makkah Only") {
          destinationHotel = booking.hotelMakkah;
        } else if (booking.hotelSelectionType === "Madinah Only") {
          destinationHotel = booking.hotelMadinah;
        } else {
          destinationHotel = `${booking.hotelMakkah} & ${booking.hotelMadinah}`;
        }

        itemsList.push({
          description: `Lodging: ${alloc.roomType} Room (Capacity: ${alloc.capacity}pax) at ${destinationHotel || "Selected Hotels"} - ${alloc.count} room(s) x ${nights} night(s)`,
          unitPrice: unitPriceInCurrency,
          quantity: alloc.count,
          subtotal: sub
        });
      }
    });
  }

  // Add Meal Plans
  if (booking.mealsConfig && booking.mealsConfig.totalCost > 0) {
    itemsList.push({
      description: `Meal Package: ${booking.mealsConfig.customPackageName || "Default Board Catering"}`,
      unitPrice: booking.mealsConfig.totalCost,
      quantity: 1,
      subtotal: booking.mealsConfig.totalCost
    });
  }

  // Add custom services
  if (booking.customServices && booking.customServices.length > 0) {
    booking.customServices.forEach(srv => {
      itemsList.push({
        description: `Additional Service: ${srv.name}${srv.notes ? ' (' + srv.notes + ')' : ''}`,
        unitPrice: srv.cost,
        quantity: 1,
        subtotal: srv.cost
      });
    });
  }

  // Fallback for pre-seed bookings (which have empty allocations but non-zero totalAmount)
  if (itemsList.length === 0) {
    itemsList.push({
      description: `${booking.packageName} (${booking.paxCount} Pax) - ${booking.bookingType}`,
      unitPrice: Math.round(booking.totalAmount / booking.paxCount),
      quantity: booking.paxCount,
      subtotal: booking.totalAmount
    });
    
    if (booking.extraServices && booking.extraServices.length > 0) {
      booking.extraServices.forEach(srv => {
        itemsList.push({
          description: `Service Add-on: ${srv}`,
          unitPrice: 0,
          quantity: 1,
          subtotal: 0
        });
      });
    }
  }

  const subtotal = booking.totalAmount;
  const taxPercentage = booking.currency === "MYR" ? 6 : booking.currency === "SAR" ? 15 : 0; // 6% SST for MYR, 15% VAT for SAR
  const taxAmount = Math.round(subtotal * (taxPercentage / 100));
  const grandTotal = subtotal + taxAmount;

  if (invoice) {
    // Update existing invoice
    const oldTotal = invoice.grandTotal;
    const versionBefore = invoice.version || 1;
    let nextVersion = versionBefore;
    const previousHistory = invoice.history || [];

    if (Math.round(oldTotal) !== Math.round(grandTotal)) {
      nextVersion += 1;
      previousHistory.push({
        timestamp: new Date().toISOString(),
        action: `Sync update to v${nextVersion}`,
        authorName: authorName || "System Sync",
        authorEmail: authorEmail || "system@aero-star.co",
        changes: `Booking adjustment auto-trigger: adjusted from ${invoice.currency} ${Math.round(oldTotal)} to ${invoice.currency} ${Math.round(grandTotal)}`
      });
    }

    invoice.customerName = booking.customerName;
    invoice.customerEmail = booking.customerEmail;
    invoice.items = itemsList;
    invoice.currency = booking.currency;
    invoice.exchangeRateToMYR = rate;
    invoice.subtotal = subtotal;
    invoice.taxPercentage = taxPercentage;
    invoice.taxAmount = taxAmount;
    invoice.grandTotal = grandTotal;
    invoice.invoiceType = invoice.invoiceType || "Booking";
    invoice.version = nextVersion;
    invoice.history = previousHistory;
    
    // Create Log
    db.logs.push({
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      userEmail: authorEmail,
      userName: authorName,
      userRole: "Admin",
      action: `Auto-updated Invoice ${invoice.id} in-sync with changes on Booking ${booking.id}.`,
      category: "Invoice",
      timestamp: new Date().toISOString()
    });
  } else {
    // Generate fresh invoice
    const newInvoiceId = generateInvoiceNumber(db.invoices);
    const newInvoice: InvoiceItemModel = {
      id: newInvoiceId,
      bookingId: booking.id,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      items: itemsList,
      currency: booking.currency,
      exchangeRateToMYR: rate,
      subtotal: subtotal,
      taxPercentage: taxPercentage,
      taxAmount: taxAmount,
      discountAmount: 0,
      grandTotal: grandTotal,
      paidAmount: 0,
      paymentStatus: "Unpaid",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 14 days credit
      createdAt: new Date().toISOString(),
      invoiceType: "Booking",
      version: 1,
      history: [{
        timestamp: new Date().toISOString(),
        action: "Auto-Created",
        authorName: authorName || "System Sync",
        authorEmail: authorEmail || "system@aero-star.co",
        changes: `Auto-generated booking-based invoice of ${booking.currency} ${grandTotal}`
      }]
    };
    db.invoices.push(newInvoice);

    // Track Finance Income transaction simulation
    db.logs.push({
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      userEmail: authorEmail,
      userName: authorName,
      userRole: "Admin",
      action: `Booking ${booking.id} Confirmed! Auto-generated Invoice ${newInvoiceId} successfully.`,
      category: "Invoice",
      timestamp: new Date().toISOString()
    });
  }

  // Update commission payout tracking for B2B partner agent
  if (booking.b2bAgentId) {
    const partner = db.partners.find((p: any) => p.id === booking.b2bAgentId);
    if (partner) {
      // Calculate B2B commission reward
      const commValueMYR = Math.round(booking.totalAmountMYR * (partner.commissionRate / 100));
      // Standard recalculation of all confirmed bookings for this partner
      const partnerBookings = db.bookings.filter((b: any) => b.b2bAgentId === partner.id && (b.bookingStatus === "Confirmed" || b.bookingStatus === "Invoiced"));
      partner.totalBookingsCount = partnerBookings.length;
      partner.totalEarnedCommissionsMYR = partnerBookings.reduce((sum: number, b: any) => sum + Math.round(b.totalAmountMYR * (partner.commissionRate / 100)), 0);
    }
  }
}

// 3. Create booking
app.post("/api/bookings", (req, res) => {
  const db = getDatabase();
  const { booking, authorEmail, authorName } = req.body;

  if (!booking) {
    return res.status(400).json({ error: "Missing booking data" });
  }

  // Pre-validate overbooking limits
  const validation = checkOverbooking(booking, db);
  if (!validation.allowed) {
    return res.status(400).json({ error: validation.reason });
  }

  const rate = getRates(db)[booking.currency as keyof typeof EXCHANGE_RATES] || 1.0;
  const newBooking: BookingItem = {
    ...booking,
    id: `BK-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`,
    totalAmountMYR: Math.round(booking.totalAmount * rate),
    createdAt: new Date().toISOString()
  };

  db.bookings.push(newBooking);

  // Sync / Auto generate Invoice if Confirmed
  syncBookingInvoice(newBooking, db, authorEmail, authorName);

  // Recalculate live hotel capacities
  computeLiveInventory(db);

  // Write systemic audit log
  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole: "Sales",
    action: `Created new ${newBooking.bookingType} booking (${newBooking.id}) for ${newBooking.customerName}. Status: ${newBooking.bookingStatus}.`,
    category: "Booking",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, booking: newBooking, db });
});

// 4. Update booking
app.put("/api/bookings/:id", (req, res) => {
  const db = getDatabase();
  const bookingId = req.params.id;
  const { booking, authorEmail, authorName, userRole } = req.body;

  const idx = db.bookings.findIndex((b: any) => b.id === bookingId);
  if (idx === -1) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const oldStatus = db.bookings[idx].bookingStatus;
  const isAuthorizedStatusChanger = userRole === "Admin" || userRole === "Manager" || userRole === "Finance";
  const isAuthorizedFullEdits = userRole === "Admin" || userRole === "Manager";

  // Check if booking was already Invoiced
  if (oldStatus === "Invoiced" && !isAuthorizedFullEdits) {
    // Check if key itinerary fields are being changed
    const original = db.bookings[idx];
    const hasCoreChanges = 
      JSON.stringify(original.roomAllocations) !== JSON.stringify(booking.roomAllocations) ||
      original.paxCount !== booking.paxCount ||
      original.customerName !== booking.customerName ||
      original.travelDateFrom !== booking.travelDateFrom ||
      original.travelDateTo !== booking.travelDateTo ||
      original.hotelMakkah !== booking.hotelMakkah ||
      original.hotelMadinah !== booking.hotelMadinah ||
      original.totalAmount !== booking.totalAmount;

    if (hasCoreChanges) {
      return res.status(403).json({ 
        error: "This reservation has been INVOICED. Modifying active travel details requires Admin or Manager authorization. Contact Sarah Manager (Manager) or Ahmad Admin to apply edits." 
      });
    }
  }

  // Check authorization for changing status to Invoiced
  if (booking.bookingStatus === "Invoiced" && oldStatus !== "Invoiced" && !isAuthorizedStatusChanger) {
    return res.status(403).json({
      error: "Only authorized personnel (Admin, Manager, or Finance) can execute transitions to Invoiced status."
    });
  }

  // Pre-validate overbooking limits, ignoring these current room allocations
  const validation = checkOverbooking(booking, db, bookingId);
  if (!validation.allowed) {
    return res.status(400).json({ error: validation.reason });
  }

  const rate = getRates(db)[booking.currency as keyof typeof EXCHANGE_RATES] || 1.0;

  const updatedBooking: BookingItem = {
    ...db.bookings[idx],
    ...booking,
    totalAmountMYR: Math.round(booking.totalAmount * rate)
  };

  db.bookings[idx] = updatedBooking;

  // Sync / Auto-generate Invoice if confirmed/invoiced
  syncBookingInvoice(updatedBooking, db, authorEmail, authorName);

  // Check if invoice needs status payment action or logging invoice cancellation
  if (updatedBooking.bookingStatus === "Cancelled") {
    const linkedInvoice = db.invoices.find((inv: any) => inv.bookingId === bookingId);
    if (linkedInvoice) {
      linkedInvoice.paymentStatus = "Unpaid"; // cancel actions reset payment or flag
    }
  }

  // Recalculate live hotel capacities
  computeLiveInventory(db);

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole: userRole || "Sales",
    action: `Updated booking ${bookingId}. Status transitioned from [${oldStatus}] to [${updatedBooking.bookingStatus}].`,
    category: "Booking",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, booking: updatedBooking, db });
});

// 5. Delete or Soft Cancel booking
app.delete("/api/bookings/:id", (req, res) => {
  const db = getDatabase();
  const bookingId = req.params.id;
  const { authorEmail, authorName } = req.body || { authorEmail: "operations@aerostar.co", authorName: "Ops Desk" };

  const booking = db.bookings.find((b: any) => b.id === bookingId);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  // Remove booking and any linked invoices
  db.bookings = db.bookings.filter((b: any) => b.id !== bookingId);
  db.invoices = db.invoices.filter((inv: any) => inv.bookingId !== bookingId);

  // Recalculate live capacities
  computeLiveInventory(db);

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole: "Admin",
    action: `Deleted/Removed booking ${bookingId} and associated invoices from the records permanently.`,
    category: "Booking",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, db });
});

// 6. Update invoice payment & Log finance transaction on updates
app.put("/api/invoices/:id/payment", (req, res) => {
  const db = getDatabase();
  const invId = req.params.id;
  const { paidAmount, paymentStatus, authorEmail, authorName } = req.body;

  const invoice = db.invoices.find((inv: any) => inv.id === invId);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  const oldPaid = invoice.paidAmount;
  invoice.paidAmount = Number(paidAmount);
  invoice.paymentStatus = paymentStatus;

  const newReceived = invoice.paidAmount - oldPaid;
  if (newReceived > 0) {
    // Simulate real income transaction for the accounting ledger
    const rate = getRates(db)[invoice.currency as keyof typeof EXCHANGE_RATES] || 1.0;
    const amountMYR = Math.round(newReceived * rate);
    
    const transaction: FinanceTransaction = {
      id: `TXN-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`,
      type: "Income",
      category: "Booking Revenue",
      amount: amountMYR,
      currency: invoice.currency,
      amountOriginalCurrency: newReceived,
      exchangeRateToMYR: rate,
      referenceId: invoice.id,
      date: new Date().toISOString().split("T")[0],
      description: `Payment segment of ${invoice.currency} ${newReceived} received for Invoice ${invoice.id} (${invoice.customerName}).`
    };
    db.transactions.push(transaction);
  }

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole: "Finance",
    action: `Updated Invoice ${invId} payments: Status set to ${paymentStatus}, cumulative paid ${invoice.currency} ${invoice.paidAmount}.`,
    category: "Invoice",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, invoice, db });
});

// 6a. Create Invoice (Manual / Lump Sum / Proforma)
app.post("/api/invoices", (req, res) => {
  const db = getDatabase();
  const { invoice, authorEmail, authorName } = req.body;

  if (!invoice) {
    return res.status(400).json({ error: "Missing invoice data" });
  }

  const index = db.invoices.length + 1001;
  const year = new Date().getFullYear();
  let prefix = "INV";
  if (invoice.invoiceType === "Proforma") prefix = "PRO";
  else if (invoice.invoiceType === "Lump Sum") prefix = "LMP";
  else if (invoice.invoiceType === "Manual") prefix = "MAN";
  
  const id = `${prefix}-${year}-${index}`;
  const rate = getRates(db)[invoice.currency as keyof typeof EXCHANGE_RATES] || 1.0;

  const newInvoice: InvoiceItemModel = {
    ...invoice,
    id,
    exchangeRateToMYR: rate,
    version: 1,
    history: [{
      timestamp: new Date().toISOString(),
      action: "Created Invoice",
      authorName: authorName || "Ops Desk",
      authorEmail: authorEmail || "operations@aerostar.co",
      changes: `Invoice registered as ${invoice.invoiceType || 'Manual'} invoice with amount ${invoice.grandTotal}`
    }],
    createdAt: new Date().toISOString()
  };

  db.invoices.push(newInvoice);

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "operations@aerostar.co",
    userName: authorName || "Ops Desk",
    userRole: "Finance",
    action: `Created new ${invoice.invoiceType || 'Manual'} Invoice ${id} for ${invoice.customerName} (${invoice.currency} ${invoice.grandTotal}).`,
    category: "Invoice",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, invoice: newInvoice, db });
});

// 6b. Edit/Adjust Invoice (Only allowed before full payment)
app.put("/api/invoices/:id", (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { invoice: updatedData, authorEmail, authorName, userRole } = req.body;

  const invoice = db.invoices.find((inv: any) => inv.id === id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  if (invoice.paymentStatus === "Paid") {
    return res.status(400).json({ error: "Cannot edit fully paid invoices." });
  }

  // Ensure default approvalStatus
  if (!invoice.approvalStatus) {
    invoice.approvalStatus = "Invoiced";
  }

  const isAuthorized = userRole === "Admin" || userRole === "Manager";

  // If the invoice is in 'Invoiced' state and the user is NOT authorized,
  // we restrict direct transition to 'Modified' and instead enter 'Awaiting Approval'
  if (invoice.approvalStatus === "Invoiced" && !isAuthorized) {
    const oldTotal = invoice.grandTotal;
    const pendingChanges = `Draft update requested by ${authorName || "Staff"} (${userRole || "Staff"}): Adjusted total from ${invoice.currency} ${oldTotal} to ${updatedData.currency} ${updatedData.grandTotal}. Item description and quantities recalculated.`;

    invoice.approvalStatus = "Awaiting Approval";
    invoice.pendingChanges = pendingChanges;
    invoice.draftInvoice = JSON.stringify(updatedData);

    db.logs.push({
      id: `LOG-${Date.now()}`,
      userEmail: authorEmail || "operations@aerostar.co",
      userName: authorName || "Ops Desk",
      userRole: userRole || "Staff",
      action: `Invoice ${id} modification submitted for authorization: status moved to [Awaiting Approval].`,
      category: "Invoice",
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    return res.json({ success: true, isAwaitingApproval: true, invoice, db });
  }

  // Otherwise, if authorized or already modifying from modified state, proceed directly
  const oldTotal = invoice.grandTotal;
  const previousVersion = invoice.version || 1;
  const newVersion = previousVersion + 1;

  // Track changed items text description
  const changesText = `Adjusted grand total from ${invoice.currency} ${oldTotal} to ${updatedData.currency} ${updatedData.grandTotal}.`;

  const newHistoryEntry = {
    timestamp: new Date().toISOString(),
    action: `Updated parameters to v${newVersion}`,
    authorName: authorName || "Ops Desk",
    authorEmail: authorEmail || "operations@aerostar.co",
    changes: changesText
  };

  const previousHistory = invoice.history || [];
  
  let updatedPaymentStatus = invoice.paymentStatus;
  const paid = invoice.paidAmount || 0;
  if (paid >= updatedData.grandTotal) {
    updatedPaymentStatus = "Paid";
  } else if (paid > 0 && paid < updatedData.grandTotal) {
    updatedPaymentStatus = "Partial";
  } else {
    updatedPaymentStatus = "Unpaid";
  }

  Object.assign(invoice, {
    customerName: updatedData.customerName,
    customerEmail: updatedData.customerEmail,
    items: updatedData.items || [],
    currency: updatedData.currency,
    exchangeRateToMYR: getRates(db)[updatedData.currency as keyof typeof EXCHANGE_RATES] || 1.0,
    subtotal: updatedData.subtotal,
    taxPercentage: updatedData.taxPercentage,
    taxAmount: updatedData.taxAmount,
    discountAmount: updatedData.discountAmount,
    grandTotal: updatedData.grandTotal,
    paymentStatus: updatedPaymentStatus,
    dueDate: updatedData.dueDate || invoice.dueDate,
    remarks: updatedData.remarks || invoice.remarks,
    validityPeriod: updatedData.validityPeriod || invoice.validityPeriod,
    invoiceType: updatedData.invoiceType || invoice.invoiceType,
    bookingId: updatedData.bookingId !== undefined ? updatedData.bookingId : invoice.bookingId,
    version: newVersion,
    approvalStatus: "Modified", // Shuffled successfully to Modified
    pendingChanges: null,
    draftInvoice: null,
    history: [...previousHistory, newHistoryEntry]
  });

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "operations@aerostar.co",
    userName: authorName || "Ops Desk",
    userRole: userRole || "Finance",
    action: `Updated Invoice ${id} structure to Version ${newVersion}: ${changesText} (Status: Modified).`,
    category: "Invoice",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, invoice, db });
});

// 6x. Approve Invoice Pending Changes
app.post("/api/invoices/:id/approve", (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { authorEmail, authorName, userRole } = req.body;

  const invoice = db.invoices.find((inv: any) => inv.id === id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  if (userRole !== "Admin" && userRole !== "Manager") {
    return res.status(403).json({ error: "Only accounts holding Manager or Administrator roles can authorize invoice overrides." });
  }

  if (!invoice.draftInvoice) {
    return res.status(400).json({ error: "No pending draft found for this record." });
  }

  try {
    const updatedData = JSON.parse(invoice.draftInvoice);
    const oldTotal = invoice.grandTotal;
    const previousVersion = invoice.version || 1;
    const newVersion = previousVersion + 1;
    const changesText = `Approved draft adjustments: Shuffled total from ${invoice.currency} ${oldTotal} to ${updatedData.currency} ${updatedData.grandTotal}.`;

    const newHistoryEntry = {
      timestamp: new Date().toISOString(),
      action: `Approved & Transitioned to v${newVersion}`,
      authorName: authorName || " Sarah Manager",
      authorEmail: authorEmail || "manager@aerostar.co",
      changes: changesText
    };

    const previousHistory = invoice.history || [];

    let updatedPaymentStatus = invoice.paymentStatus;
    const paid = invoice.paidAmount || 0;
    if (paid >= updatedData.grandTotal) {
      updatedPaymentStatus = "Paid";
    } else if (paid > 0 && paid < updatedData.grandTotal) {
      updatedPaymentStatus = "Partial";
    } else {
      updatedPaymentStatus = "Unpaid";
    }

    Object.assign(invoice, {
      customerName: updatedData.customerName,
      customerEmail: updatedData.customerEmail,
      items: updatedData.items || [],
      currency: updatedData.currency,
      exchangeRateToMYR: getRates(db)[updatedData.currency as keyof typeof EXCHANGE_RATES] || 1.0,
      subtotal: updatedData.subtotal,
      taxPercentage: updatedData.taxPercentage,
      taxAmount: updatedData.taxAmount,
      discountAmount: updatedData.discountAmount,
      grandTotal: updatedData.grandTotal,
      paymentStatus: updatedPaymentStatus,
      dueDate: updatedData.dueDate || invoice.dueDate,
      remarks: updatedData.remarks || invoice.remarks,
      validityPeriod: updatedData.validityPeriod || invoice.validityPeriod,
      invoiceType: updatedData.invoiceType || invoice.invoiceType,
      bookingId: updatedData.bookingId !== undefined ? updatedData.bookingId : invoice.bookingId,
      version: newVersion,
      approvalStatus: "Modified",
      pendingChanges: null,
      draftInvoice: null,
      history: [...previousHistory, newHistoryEntry]
    });

    db.logs.push({
      id: `LOG-${Date.now()}`,
      userEmail: authorEmail,
      userName: authorName,
      userRole: userRole,
      action: `Approved and merged pending adjustments on Invoice ${id} (Status set to Modified).`,
      category: "Invoice",
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    res.json({ success: true, invoice, db });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to parse or apply draft changes: " + e.message });
  }
});

// 6y. Reject Invoice Pending Changes
app.post("/api/invoices/:id/reject", (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { authorEmail, authorName, userRole } = req.body;

  const invoice = db.invoices.find((inv: any) => inv.id === id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  if (userRole !== "Admin" && userRole !== "Manager") {
    return res.status(403).json({ error: "Only accounts holding Manager or Administrator roles can authorize invoice overrides." });
  }

  invoice.approvalStatus = "Invoiced";
  invoice.pendingChanges = null;
  invoice.draftInvoice = null;

  invoice.history = invoice.history || [];
  invoice.history.push({
    timestamp: new Date().toISOString(),
    action: "Rejected Pending Changes",
    authorName,
    authorEmail,
    changes: `Pending changes requested were declined. Reverted state back to Invoiced.`
  });

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole,
    action: `Rejected pending draft edits on Invoice ${id} and restored standard Invoiced state.`,
    category: "Invoice",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, invoice, db });
});

// 6c. Convert Proforma Invoice to Standard Active Invoice
app.post("/api/invoices/:id/convert", (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { authorEmail, authorName, targetType } = req.body; // targetType: Booking / Manual

  const invoice = db.invoices.find((inv: any) => inv.id === id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  if (invoice.invoiceType !== "Proforma") {
    return res.status(400).json({ error: "Only proforma invoices can be converted." });
  }

  invoice.invoiceType = targetType || "Manual";
  invoice.convertedFromProforma = true;
  invoice.history = invoice.history || [];
  invoice.history.push({
    timestamp: new Date().toISOString(),
    action: "Converted Proforma",
    authorName: authorName || "Ops Desk",
    authorEmail: authorEmail || "operations@aerostar.co",
    changes: `Converted from Proforma to active ${invoice.invoiceType} invoice successfully.`
  });

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "operations@aerostar.co",
    userName: authorName || "Ops Desk",
    userRole: "Finance",
    action: `Converted Proforma Invoice ${id} to fully active ${invoice.invoiceType} Invoice.`,
    category: "Invoice",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, invoice, db });
});

// 6d. Import Invoices bulk
app.post("/api/invoices/import", (req, res) => {
  const db = getDatabase();
  const { invoices: importList, authorEmail, authorName } = req.body;

  if (!Array.isArray(importList)) {
    return res.status(400).json({ error: "Import data must be an array of invoices" });
  }

  let importedCount = 0;
  importList.forEach(invoice => {
    const index = db.invoices.length + 1001;
    const year = new Date().getFullYear();
    let prefix = "INV";
    if (invoice.invoiceType === "Proforma") prefix = "PRO";
    else if (invoice.invoiceType === "Lump Sum") prefix = "LMP";
    else if (invoice.invoiceType === "Manual") prefix = "MAN";
    
    const id = `${prefix}-${year}-${index}`;
    const rate = getRates(db)[invoice.currency as keyof typeof EXCHANGE_RATES] || 1.0;

    const newInvoice: InvoiceItemModel = {
      id,
      bookingId: invoice.bookingId || null,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail || "client@import.co",
      items: invoice.items || [{ description: invoice.description || "Imported Package Services", unitPrice: invoice.grandTotal, quantity: 1, subtotal: invoice.grandTotal }],
      currency: invoice.currency || "MYR",
      exchangeRateToMYR: rate,
      subtotal: invoice.subtotal || invoice.grandTotal,
      taxPercentage: invoice.taxPercentage || 0,
      taxAmount: invoice.taxAmount || 0,
      discountAmount: invoice.discountAmount || 0,
      grandTotal: invoice.grandTotal,
      paidAmount: invoice.paidAmount || 0,
      paymentStatus: invoice.paymentStatus || "Unpaid",
      dueDate: invoice.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      invoiceType: invoice.invoiceType || "Manual",
      version: 1,
      history: [{
        timestamp: new Date().toISOString(),
        action: "Bulk Imported",
        authorName: authorName || "Ops Desk",
        authorEmail: authorEmail || "operations@aerostar.co",
        changes: `Bulk Imported via operations desk.`
      }]
    };

    db.invoices.push(newInvoice);
    importedCount++;
  });

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "operations@aerostar.co",
    userName: authorName || "Ops Desk",
    userRole: "Finance",
    action: `Bulk Imported ${importedCount} Invoices successfully into system files.`,
    category: "Invoice",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, count: importedCount, db });
});

// 7. Manage B2B Partner Operators
app.post("/api/partners", (req, res) => {
  const db = getDatabase();
  const { partner, authorEmail, authorName } = req.body;

  const newPartner = {
    ...partner,
    id: `B2B-${Date.now().toString().slice(-3)}`,
    totalBookingsCount: 0,
    totalEarnedCommissionsMYR: 0
  };

  db.partners.push(newPartner);
  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole: "Admin",
    action: `Registered B2B Partner Agency: ${newPartner.companyName} (${newPartner.country})`,
    category: "B2B",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, partner: newPartner, db });
});

// 8. Manage Suppliers
app.post("/api/suppliers", (req, res) => {
  const db = getDatabase();
  const { supplier, authorEmail, authorName } = req.body;

  const newSup = {
    ...supplier,
    id: `SUP-${Date.now().toString().slice(-3)}`,
    outstandingPaymentMYR: Number(supplier.outstandingPaymentMYR || 0)
  };

  db.suppliers.push(newSup);
  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole: "Admin",
    action: `Procurement Vendor registered: ${newSup.name} [Category: ${newSup.category}].`,
    category: "Supplier",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, supplier: newSup, db });
});

// 9. Process Supplier Expense Dispatches
app.post("/api/suppliers/:id/pay", (req, res) => {
  const db = getDatabase();
  const supId = req.params.id;
  const { payAmount, authorEmail, authorName, description } = req.body;

  const supplier = db.suppliers.find((s: any) => s.id === supId);
  if (!supplier) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  const amt = Number(payAmount);
  supplier.outstandingPaymentMYR = Math.max(0, supplier.outstandingPaymentMYR - amt);
  if (supplier.outstandingPaymentMYR === 0) {
    supplier.paymentStatus = "Clear";
  }

  // Create financial dispatch transaction
  const transaction: FinanceTransaction = {
    id: `TXN-PAY-${Date.now().toString().slice(-4)}`,
    type: "Expense",
    category: "Supplier Payment",
    amount: amt,
    currency: "MYR",
    amountOriginalCurrency: amt,
    exchangeRateToMYR: 1.0,
    referenceId: supplier.id,
    date: new Date().toISOString().split("T")[0],
    description: description || `Payment dispatch of MYR ${amt} to Supplier ${supplier.name}`
  };
  db.transactions.push(transaction);

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole: "Finance",
    action: `Procured payment of MYR ${amt} released to supplier ${supplier.name}. Remainder outstanding: MYR ${supplier.outstandingPaymentMYR}.`,
    category: "Supplier",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, supplier, db });
});

// 9b. Manage Hotel Contracts CRUD & Snapshot Version Control
app.post("/api/hotel-contracts", (req, res) => {
  const db = getDatabase();
  const { contract, authorEmail, authorName } = req.body;

  if (!contract) {
    return res.status(400).json({ error: "Missing contract data." });
  }

  const newContract = {
    ...contract,
    id: contract.id || `CON-${Date.now().toString().slice(-4)}`,
    version: 1,
    history: [{
      version: 1,
      changeDate: new Date().toISOString().split('T')[0],
      rooms: JSON.parse(JSON.stringify(contract.rooms || [])),
      validFrom: contract.validFrom,
      validTo: contract.validTo,
      authorEmail: authorEmail || "operations@aerostar.co",
      authorName: authorName || "Ops Desk"
    }]
  };

  if (!db.hotelContracts) {
    db.hotelContracts = [];
  }

  db.hotelContracts.push(newContract);

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "operations@aerostar.co",
    userName: authorName || "Ops Desk",
    userRole: "Admin",
    action: `Registered Hotel Contract: ${newContract.hotelName} (${newContract.location}) - ID: ${newContract.id} [v1]`,
    category: "Supplier",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, contract: newContract, db });
});

app.put("/api/hotel-contracts/:id", (req, res) => {
  const db = getDatabase();
  const contractId = req.params.id;
  const { contract, authorEmail, authorName } = req.body;

  if (!db.hotelContracts) {
    db.hotelContracts = [];
  }

  const idx = db.hotelContracts.findIndex((c: any) => c.id === contractId);
  if (idx === -1) {
    return res.status(404).json({ error: "Hotel Contract not found." });
  }

  const oldContract = db.hotelContracts[idx];
  const nextVersion = (oldContract.version || 1) + 1;

  const historyEntry = {
    version: nextVersion,
    changeDate: new Date().toISOString().split('T')[0],
    rooms: JSON.parse(JSON.stringify(contract.rooms || [])),
    validFrom: contract.validFrom,
    validTo: contract.validTo,
    authorEmail: authorEmail || "operations@aerostar.co",
    authorName: authorName || "Ops Desk"
  };

  const updatedContract = {
    ...oldContract,
    ...contract,
    version: nextVersion,
    history: [...(oldContract.history || []), historyEntry]
  };

  db.hotelContracts[idx] = updatedContract;

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "operations@aerostar.co",
    userName: authorName || "Ops Desk",
    userRole: "Admin",
    action: `Modified Hotel Contract: ${updatedContract.hotelName} [ID: ${contractId}]. Incremented to version [v${nextVersion}].`,
    category: "Supplier",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, contract: updatedContract, db });
});

app.delete("/api/hotel-contracts/:id", (req, res) => {
  const db = getDatabase();
  const contractId = req.params.id;
  const { authorEmail, authorName } = req.body || {};

  if (!db.hotelContracts) {
    db.hotelContracts = [];
  }

  const contract = db.hotelContracts.find((c: any) => c.id === contractId);
  if (!contract) {
    return res.status(404).json({ error: "Contract not found." });
  }

  db.hotelContracts = db.hotelContracts.filter((c: any) => c.id !== contractId);

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "operations@aerostar.co",
    userName: authorName || "Ops Desk",
    userRole: "Admin",
    action: `Archived/Removed Hotel Contract: ${contract.hotelName} [ID: ${contractId}] permanently.`,
    category: "Supplier",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, db });
});

// 9c. Dynamic Pricing Rules Matrix
app.post("/api/pricing-rules", (req, res) => {
  const db = getDatabase();
  const { pricingRules, authorEmail, authorName } = req.body;

  if (!pricingRules) {
    return res.status(400).json({ error: "Missing pricingRules data." });
  }

  db.pricingRules = pricingRules;

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "finance@aero-star.co",
    userName: authorName || "Ahmad Farhan",
    userRole: "Finance",
    action: `Synchronized global Dynamic Pricing rules matrix (Active Rules: ${pricingRules.length}).`,
    category: "System",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, pricingRules: db.pricingRules, db });
});

// 10. HR Employees Management - Add new employees
app.post("/api/employees", (req, res) => {
  const db = getDatabase();
  const { employee, authorEmail, authorName } = req.body;

  const newEmp = {
    ...employee,
    id: `EMP-${Date.now().toString().slice(-3)}`,
    commissionEarnedMYR: 0,
    joiningDate: new Date().toISOString().split("T")[0]
  };

  db.employees.push(newEmp);
  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole: "Admin",
    action: `Registered HR Employee: ${newEmp.name} [Role: ${newEmp.role}] with Base Salary MYR ${newEmp.baseSalaryMYR}.`,
    category: "HR",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, employee: newEmp, db });
});

// 11. HR Employees - Clock/Log daily attendance
app.put("/api/employees/:id/attendance", (req, res) => {
  const db = getDatabase();
  const empId = req.params.id;
  const { status, authorEmail, authorName } = req.body;

  const emp = db.employees.find((e: any) => e.id === empId);
  if (!emp) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const oldStat = emp.attendanceToday;
  emp.attendanceToday = status;

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole: "Staff",
    action: `Lobby Attendance Registered for ${emp.name}. Switch [${oldStat}] -> [${status}].`,
    category: "HR",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, employee: emp, db });
});

// 12. Create General Financial Accounting records directly
app.post("/api/transactions", (req, res) => {
  const db = getDatabase();
  const { type, category, amount, currency, description, authorEmail, authorName } = req.body;

  const rate = getRates(db)[currency as keyof typeof EXCHANGE_RATES] || 1.0;
  const amtMYR = Math.round(Number(amount) * rate);

  const transaction: FinanceTransaction = {
    id: `TXN-${Date.now().toString().slice(-4)}`,
    type: type as "Income" | "Expense",
    category: category as any,
    amount: amtMYR,
    currency: currency as any,
    amountOriginalCurrency: Number(amount),
    exchangeRateToMYR: rate,
    referenceId: "DIRECT-LEDGER",
    date: new Date().toISOString().split("T")[0],
    description: description || `Direct general ledger ledger entry.`
  };

  db.transactions.push(transaction);
  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail,
    userName: authorName,
    userRole: "Finance",
    action: `Direct Ledger Transaction added: ${type} of ${currency} ${amount} (MYR ${amtMYR}) under category ${category}.`,
    category: "Finance",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, transaction, db });
});


// Helper: Calculate Malaysia tax for taxable income
function calculateAnnualMalaysiaTax(taxableIncome: number): number {
  if (taxableIncome <= 5000) return 0;
  let tax = 0;
  let remaining = taxableIncome;
  
  // Bracket 1: First 5000 (0%)
  remaining -= 5000;
  
  // Bracket 2: 5001 to 20000 (1%) -> max 15000
  const b2 = Math.min(remaining, 15000);
  tax += b2 * 0.01;
  remaining -= b2;
  if (remaining <= 0) return tax;
  
  // Bracket 3: 20001 to 35000 (3%) -> max 15000
  const b3 = Math.min(remaining, 15000);
  tax += b3 * 0.03;
  remaining -= b3;
  if (remaining <= 0) return tax;
  
  // Bracket 4: 35001 to 50000 (6%) -> max 15000
  const b4 = Math.min(remaining, 15000);
  tax += b4 * 0.06;
  remaining -= b4;
  if (remaining <= 0) return tax;
  
  // Bracket 5: 50001 to 70000 (11%) -> max 20000
  const b5 = Math.min(remaining, 20000);
  tax += b5 * 0.11;
  remaining -= b5;
  if (remaining <= 0) return tax;
  
  // Bracket 6: 70001 to 100000 (19%) -> max 30000
  const b6 = Math.min(remaining, 30000);
  tax += b6 * 0.19;
  remaining -= b6;
  if (remaining <= 0) return tax;
  
  // Bracket 7: 100001 to 250000 (25%) -> max 150000
  const b7 = Math.min(remaining, 150000);
  tax += b7 * 0.25;
  remaining -= b7;
  if (remaining <= 0) return tax;
  
  // Bracket 8: 250001 to 400000 (26%) -> max 150000
  const b8 = Math.min(remaining, 150000);
  tax += b8 * 0.26;
  remaining -= b8;
  if (remaining <= 0) return tax;
  
  // Bracket 9: 400001 to 600000 (28%) -> max 200000
  const b9 = Math.min(remaining, 200000);
  tax += b9 * 0.28;
  remaining -= b9;
  if (remaining <= 0) return tax;
  
  // Bracket 10: > 600000 (30%)
  tax += remaining * 0.30;
  return tax;
}

// 13a. GET Leaves
app.get("/api/hr/leaves", (req, res) => {
  const db = getDatabase();
  res.json(db.leaveRequests || []);
});

// 13b. Raising a Leave Request
app.post("/api/hr/leaves", (req, res) => {
  const db = getDatabase();
  const { employeeId, leaveType, startDate, endDate, reason, authorEmail, authorName } = req.body;
  
  const emp = db.employees.find((e: any) => e.id === employeeId);
  if (!emp) {
    return res.status(404).json({ error: "Employee account not found" });
  }

  const newLeave = {
    id: `LV-${Date.now().toString().slice(-4)}`,
    employeeId,
    employeeName: emp.name,
    leaveType,
    startDate,
    endDate,
    reason,
    status: "Pending",
    requestedAt: new Date().toISOString()
  };

  if (!db.leaveRequests) db.leaveRequests = [];
  db.leaveRequests.push(newLeave);

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || emp.email,
    userName: authorName || emp.name,
    userRole: "Staff",
    action: `Submitted leave application: ${leaveType} leave from ${startDate} to ${endDate} for ${emp.name}.`,
    category: "HR",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, leave: newLeave, db });
});

// 13c. Approve/Reject Leave Request
app.post("/api/hr/leaves/:id/approve", (req, res) => {
  const db = getDatabase();
  const leaveId = req.params.id;
  const { status, authorEmail, authorName } = req.body;

  if (!db.leaveRequests) db.leaveRequests = [];
  const leave = db.leaveRequests.find((l: any) => l.id === leaveId);
  if (!leave) {
    return res.status(404).json({ error: "Leave request not found" });
  }

  leave.status = status;
  leave.approvedBy = authorName || authorEmail || "HR Desk";

  // If approved, update active employee status
  if (status === "Approved") {
    const emp = db.employees.find((e: any) => e.id === leave.employeeId);
    if (emp) {
      emp.attendanceToday = "On Leave";
    }
  }

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "hr@aero-star.co",
    userName: authorName || "HR Desk",
    userRole: "Admin",
    action: `Decided leave application with [${status}] for ${leave.employeeName} (${leave.leaveType} leave).`,
    category: "HR",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, leave, db });
});

// 13d. Update employee statutory details
app.post("/api/hr/employees/:id/update-statutory", (req, res) => {
  const db = getDatabase();
  const empId = req.params.id;
  const { nric, epfNumber, socsoNumber, taxNumber, maritalStatus, numberOfChildren, authorEmail, authorName } = req.body;

  const emp = db.employees.find((e: any) => e.id === empId);
  if (!emp) {
    return res.status(404).json({ error: "Employee account not found" });
  }

  emp.nric = nric;
  emp.epfNumber = epfNumber;
  emp.socsoNumber = socsoNumber;
  emp.taxNumber = taxNumber;
  emp.maritalStatus = maritalStatus;
  emp.numberOfChildren = Number(numberOfChildren) || 0;

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "hr@aero-star.co",
    userName: authorName || "HR Manager",
    userRole: "Admin",
    action: `Updated statutory identification portfolio for: ${emp.name} (NRIC: ${nric}).`,
    category: "HR",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, employee: emp, db });
});

// 13e. GET Payslips
app.get("/api/hr/payslips", (req, res) => {
  const db = getDatabase();
  res.json(db.payslips || []);
});

// 13f. Generate Payslips
app.post("/api/hr/payslips", (req, res) => {
  const db = getDatabase();
  const { employeeId, month, allowances, commissionOverride, authorEmail, authorName } = req.body;

  const emp = db.employees.find((e: any) => e.id === employeeId);
  if (!emp) {
    return res.status(404).json({ error: "Employee account not found" });
  }

  const baseWages = emp.baseSalaryMYR || 0;
  const commWages = commissionOverride !== undefined ? Number(commissionOverride) : (emp.commissionEarnedMYR || 0);
  const allowWages = Number(allowances) || 0;
  const totalGrossWages = baseWages + commWages + allowWages;

  // Standard EPF calculation: 11% employee, 12% (salary > 5000) or 13% (salary <= 5000) for employer
  const epfEmployee = parseFloat((totalGrossWages * 0.11).toFixed(2));
  const epfEmployer = parseFloat((totalGrossWages * (totalGrossWages <= 5000 ? 0.13 : 0.12)).toFixed(2));

  // SOCSO: Capped at 6000 ceiling. Employee approx 0.5%, Employer approx 1.75%
  const wageCeiling = Math.min(totalGrossWages, 6000);
  const socsoEmployee = parseFloat((wageCeiling * 0.005).toFixed(2));
  const socsoEmployer = parseFloat((wageCeiling * 0.0175).toFixed(2));

  // EIS: Capped at 6000 ceiling. Both Employee and Employer are 0.2%
  const eisEmployee = parseFloat((wageCeiling * 0.002).toFixed(2));
  const eisEmployer = parseFloat((wageCeiling * 0.002).toFixed(2));

  // PCB Monthly tax calculation:
  const annualGross = totalGrossWages * 12;
  const annualEpfEmployeeRelief = Math.min(epfEmployee * 12, 4000);
  const standardPersonalRelief = 9000;
  const childrenCount = emp.numberOfChildren || 0;
  const childrenRelief = childrenCount * 2000;
  
  const taxableIncome = Math.max(0, annualGross - standardPersonalRelief - annualEpfEmployeeRelief - childrenRelief);
  const annualTax = calculateAnnualMalaysiaTax(taxableIncome);
  const pcb = parseFloat((annualTax / 12).toFixed(2));

  const netSalary = parseFloat((totalGrossWages - epfEmployee - socsoEmployee - eisEmployee - pcb).toFixed(2));

  if (!db.payslips) db.payslips = [];

  // If there's an existing draft or payslip for this month & employee, overwrite it
  const existingIdx = db.payslips.findIndex((s: any) => s.employeeId === employeeId && s.month === month);
  
  const newPayslip = {
    id: existingIdx >= 0 ? db.payslips[existingIdx].id : `SL-${Date.now().toString().slice(-4)}`,
    employeeId,
    employeeName: emp.name,
    month,
    baseSalary: baseWages,
    allowances: allowWages,
    commission: commWages,
    epfEmployee,
    epfEmployer,
    socsoEmployee,
    socsoEmployer,
    eisEmployee,
    eisEmployer,
    pcb,
    netSalary,
    status: "Draft",
    generatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    db.payslips[existingIdx] = newPayslip;
  } else {
    db.payslips.push(newPayslip);
  }

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "hr@aero-star.co",
    userName: authorName || "HR Manager",
    userRole: "Admin",
    action: `Generated payroll payslip for: ${emp.name} for period [${month}] with total gross MYR ${totalGrossWages}.`,
    category: "HR",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, payslip: newPayslip, db });
});

// 13g. Disburse Payslip with ledger syncing
app.post("/api/hr/payslips/:id/disburse", (req, res) => {
  const db = getDatabase();
  const slipId = req.params.id;
  const { authorEmail, authorName } = req.body;

  if (!db.payslips) db.payslips = [];
  const slip = db.payslips.find((s: any) => s.id === slipId);
  if (!slip) {
    return res.status(404).json({ error: "Payslip record not found" });
  }

  slip.status = "Paid";
  slip.disbursedAt = new Date().toISOString();

  // Deduct commissions from employee list to reset cycle if it was processed
  const emp = db.employees.find((e: any) => e.id === slip.employeeId);
  if (emp) {
    emp.commissionEarnedMYR = 0; // successfully paid and disbursed, reset running comms
  }

  // Record a solid general ledger expense
  const txnAmount = slip.netSalary;
  const totalCompanyOutflow = slip.baseSalary + slip.allowances + slip.commission + slip.epfEmployer + slip.socsoEmployer + slip.eisEmployer;
  
  const transaction = {
    id: `TXN-${Date.now().toString().slice(-4)}`,
    type: "Expense" as const,
    category: "HR Salary" as const,
    amount: txnAmount, // Actual bank disbursement value
    currency: "MYR" as const,
    amountOriginalCurrency: txnAmount,
    exchangeRateToMYR: 1.0,
    referenceId: slip.id,
    date: new Date().toISOString().split("T")[0],
    description: `Disbursed Monthly Salary to ${slip.employeeName} for ${slip.month}. Net: MYR ${txnAmount} (Statutory EPF/SOCSO/PCB held/remitted). Total Outflow MYR ${totalCompanyOutflow}.`
  };

  db.transactions.push(transaction);

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "finance@aero-star.co",
    userName: authorName || "Ops Desk",
    userRole: "Admin",
    action: `Finalized disbursement and locked payroll for ${slip.employeeName} [Month: ${slip.month}]. Finance ledger synced.`,
    category: "HR",
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({ success: true, payslip: slip, db });
});


// Express/Vite Dev Setup
async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aerostar Alliance] Full-Stack server booted at http://localhost:${PORT}`);
  });
}

startServer();
