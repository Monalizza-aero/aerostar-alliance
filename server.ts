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

// Core Business Logic: Track rooms availability dynamically
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

  // Subtract room allocations of Confirmed bookings
  db.bookings.forEach((booking: any) => {
    if (booking.bookingStatus === 'Confirmed' && booking.roomAllocations) {
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
  });
}

function checkOverbooking(booking: any, db: any, bookingIdToExclude?: string): { allowed: boolean; reason?: string } {
  if (booking.bookingStatus !== 'Confirmed' || !booking.roomAllocations || booking.roomAllocations.length === 0) {
    return { allowed: true };
  }

  // Calculate available inventory EXCLUDING this booking
  const tempContracts = JSON.parse(JSON.stringify(db.hotelContracts || initialHotelContracts));
  
  // Reset all available to total
  tempContracts.forEach((contract: any) => {
    contract.rooms.forEach((room: any) => {
      room.roomsAvailable = room.roomsTotal;
    });
  });

  db.bookings.forEach((b: any) => {
    if (b.bookingStatus === 'Confirmed' && b.id !== bookingIdToExclude && b.roomAllocations) {
      b.roomAllocations.forEach((alloc: any) => {
        if (b.hotelSelectionType !== 'Madinah Only' && b.hotelMakkah) {
          const makkahContract = tempContracts.find((c: any) => c.hotelName === b.hotelMakkah && c.location === 'Makkah');
          if (makkahContract) {
            const r = makkahContract.rooms.find((rm: any) => rm.roomType === alloc.roomType);
            if (r) r.roomsAvailable = Math.max(0, r.roomsAvailable - alloc.count);
          }
        }
        if (b.hotelSelectionType !== 'Makkah Only' && b.hotelMadinah) {
          const madinahContract = tempContracts.find((c: any) => c.hotelName === b.hotelMadinah && c.location === 'Madinah');
          if (madinahContract) {
            const r = madinahContract.rooms.find((rm: any) => rm.roomType === alloc.roomType);
            if (r) r.roomsAvailable = Math.max(0, r.roomsAvailable - alloc.count);
          }
        }
      });
    }
  });

  // Now validate if booking fits
  for (const alloc of booking.roomAllocations) {
    if (booking.hotelSelectionType !== 'Madinah Only' && booking.hotelMakkah) {
      const makkahContract = tempContracts.find((c: any) => c.hotelName === booking.hotelMakkah && c.location === 'Makkah');
      if (makkahContract) {
        const r = makkahContract.rooms.find((rm: any) => rm.roomType === alloc.roomType);
        if (r && r.roomsAvailable < alloc.count) {
          return {
            allowed: false,
            reason: `Makkah Hotel (${booking.hotelMakkah}) has insufficient rooms of type "${alloc.roomType}". Contract has only ${r.roomsAvailable} room(s) available, but booking requests ${alloc.count}.`
          };
        }
      }
    }
    if (booking.hotelSelectionType !== 'Makkah Only' && booking.hotelMadinah) {
      const madinahContract = tempContracts.find((c: any) => c.hotelName === booking.hotelMadinah && c.location === 'Madinah');
      if (madinahContract) {
        const r = madinahContract.rooms.find((rm: any) => rm.roomType === alloc.roomType);
        if (r && r.roomsAvailable < alloc.count) {
          return {
            allowed: false,
            reason: `Madinah Hotel (${booking.hotelMadinah}) has insufficient rooms of type "${alloc.roomType}". Contract has only ${r.roomsAvailable} room(s) available, but booking requests ${alloc.count}.`
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
    invoice.customerName = booking.customerName;
    invoice.customerEmail = booking.customerEmail;
    invoice.items = itemsList;
    invoice.currency = booking.currency;
    invoice.exchangeRateToMYR = rate;
    invoice.subtotal = subtotal;
    invoice.taxPercentage = taxPercentage;
    invoice.taxAmount = taxAmount;
    invoice.grandTotal = grandTotal;
    
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
      createdAt: new Date().toISOString()
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
