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
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      bookings: initialBookings,
      invoices: initialInvoices,
      partners: initialB2BPartners,
      suppliers: initialSuppliers,
      transactions: initialTransactions,
      employees: initialEmployees,
      logs: initialLogs,
      hotelContracts: initialHotelContracts
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data);
    if (!parsed.hotelContracts) {
      parsed.hotelContracts = initialHotelContracts;
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
      hotelContracts: initialHotelContracts
    };
  }
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
    if (booking.bookingStatus === 'Confirmed' && booking.roomAllocations) {
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
  if (booking.bookingStatus !== 'Confirmed' || !booking.roomAllocations || booking.roomAllocations.length === 0) {
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
          if (b.bookingStatus === 'Confirmed' && b.id !== bookingIdToExclude && b.roomAllocations) {
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
          if (b.bookingStatus === 'Confirmed' && b.id !== bookingIdToExclude && b.roomAllocations) {
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
  if (booking.bookingStatus !== "Confirmed") {
    // If not confirmed, we don't automatically generate invoice, 
    // unless one already exists, in which case we might keep it but sync content.
    // The requirement says: "When a booking is marked as 'Confirmed', the system must automatically generate an invoice."
    return;
  }

  // Check if invoice exists
  let invoice = db.invoices.find((inv: any) => inv.bookingId === booking.id);
  const rate = EXCHANGE_RATES[booking.currency as keyof typeof EXCHANGE_RATES] || 1.0;

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
      const partnerBookings = db.bookings.filter((b: any) => b.b2bAgentId === partner.id && b.bookingStatus === "Confirmed");
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

  const rate = EXCHANGE_RATES[booking.currency as keyof typeof EXCHANGE_RATES] || 1.0;
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
  const { booking, authorEmail, authorName } = req.body;

  const idx = db.bookings.findIndex((b: any) => b.id === bookingId);
  if (idx === -1) {
    return res.status(404).json({ error: "Booking not found" });
  }

  // Pre-validate overbooking limits, ignoring these current room allocations
  const validation = checkOverbooking(booking, db, bookingId);
  if (!validation.allowed) {
    return res.status(400).json({ error: validation.reason });
  }

  const rate = EXCHANGE_RATES[booking.currency as keyof typeof EXCHANGE_RATES] || 1.0;
  const oldStatus = db.bookings[idx].bookingStatus;

  const updatedBooking: BookingItem = {
    ...db.bookings[idx],
    ...booking,
    totalAmountMYR: Math.round(booking.totalAmount * rate)
  };

  db.bookings[idx] = updatedBooking;

  // Sync / Auto-generate Invoice if confirmed
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
    userRole: "Sales",
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
    const rate = EXCHANGE_RATES[invoice.currency] || 1.0;
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
  const rate = EXCHANGE_RATES[invoice.currency as keyof typeof EXCHANGE_RATES] || 1.0;

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
  const { invoice: updatedData, authorEmail, authorName } = req.body;

  const invoice = db.invoices.find((inv: any) => inv.id === id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  if (invoice.paymentStatus === "Paid") {
    return res.status(400).json({ error: "Cannot edit fully paid invoices." });
  }

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
    exchangeRateToMYR: EXCHANGE_RATES[updatedData.currency as keyof typeof EXCHANGE_RATES] || 1.0,
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
    history: [...previousHistory, newHistoryEntry]
  });

  db.logs.push({
    id: `LOG-${Date.now()}`,
    userEmail: authorEmail || "operations@aerostar.co",
    userName: authorName || "Ops Desk",
    userRole: "Finance",
    action: `Updated Invoice ${id} structure to Version ${newVersion}: ${changesText}.`,
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
    const rate = EXCHANGE_RATES[invoice.currency as keyof typeof EXCHANGE_RATES] || 1.0;

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

  const rate = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES] || 1.0;
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
