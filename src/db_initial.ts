import { BookingItem, InvoiceItemModel, B2BPartner, Supplier, FinanceTransaction, Employee, ActivityLog, HotelContract } from './types';

export const EXCHANGE_RATES = {
  MYR: 1.0,
  SGD: 3.3,
  SAR: 1.2,
  IDR: 0.0003
};

export const initialB2BPartners: B2BPartner[] = [
  {
    id: 'B2B-101',
    companyName: 'Nusantara Umrah Services Jakarta',
    country: 'Indonesia',
    contactName: 'Haji Bambang Triyono',
    phone: '+62 21-555-8291',
    email: 'info@nusantara-umrah.co.id',
    commissionRate: 8,
    contractStatus: 'Active',
    totalBookingsCount: 14,
    totalEarnedCommissionsMYR: 18500,
    notes: 'Primary B2B travel alliance in Java. Sends 100+ pilgrims monthly.'
  },
  {
    id: 'B2B-102',
    companyName: 'Al-Madinah Travel Singapore Pte Ltd',
    country: 'Singapore',
    contactName: 'Hajah Faridah Osman',
    phone: '+65 6743-1289',
    email: 'faridah@almadinah.com.sg',
    commissionRate: 5,
    contractStatus: 'Active',
    totalBookingsCount: 8,
    totalEarnedCommissionsMYR: 12400,
    notes: 'Premium Singapore operator. Focus on luxury VIP packages.'
  },
  {
    id: 'B2B-103',
    companyName: 'Kuala Lumpur Haramain Tours',
    country: 'Malaysia',
    contactName: 'Shafiq bin Ridzuan',
    phone: '+60 13-448-9210',
    email: 'shafiq@klharamain.com.my',
    commissionRate: 7,
    contractStatus: 'Active',
    totalBookingsCount: 19,
    totalEarnedCommissionsMYR: 24700,
    notes: 'Domestic agent network. Focuses on Selangor and Perak regional markets.'
  },
  {
    id: 'B2B-104',
    companyName: 'Jeddah Gateways & Logistics',
    country: 'Saudi Arabia',
    contactName: 'Abdulrahman Al-Sudais',
    phone: '+966 12-654-1192',
    email: 'a.sudais@jeddah-gate.sa',
    commissionRate: 10,
    contractStatus: 'Under Review',
    totalBookingsCount: 3,
    totalEarnedCommissionsMYR: 9000,
    notes: 'Saudi DMC partnership. Assists with local ground handling, visa clearances and luxury GMC coaches.'
  }
];

export const initialSuppliers: Supplier[] = [
  {
    id: 'SUP-401',
    name: 'Pullman Zamzam Makkah Hotel',
    category: 'Hotel',
    contactPerson: 'Saleh Al-Qahtani',
    phone: '+966 12-571-5555',
    email: 'reservations@pullmanzamzam.com',
    country: 'Saudi Arabia',
    outstandingPaymentMYR: 45000,
    paymentStatus: 'Pending Balance',
    notes: 'Preferred 5-star hotel in Abraj Al Bait with direct Haram views.'
  },
  {
    id: 'SUP-402',
    name: 'Anwar Al Madinah Mövenpick',
    category: 'Hotel',
    contactPerson: 'Mohamed Ibrahim',
    phone: '+966 14-820-1000',
    email: 'movenpick.anwar@accor.com',
    country: 'Saudi Arabia',
    outstandingPaymentMYR: 25000,
    paymentStatus: 'Pending Balance',
    notes: 'Directly linked to Northern Haram courtyard, ideal for Malaysian families.'
  },
  {
    id: 'SUP-403',
    name: 'Haramain Coach Logistics Group',
    category: 'Transportation',
    contactPerson: 'Faisal bin Nayef',
    phone: '+966 50-111-2234',
    email: 'fleet@haramaincoach.sa',
    country: 'Saudi Arabia',
    outstandingPaymentMYR: 0,
    paymentStatus: 'Clear',
    notes: 'Provides luxury Mercedes 50-seater tour buses with Wifi and USB charging.'
  },
  {
    id: 'SUP-404',
    name: 'Al-Safwah Visa & Ground Services',
    category: 'Visa/Ground',
    contactPerson: 'Haji Azman Ghani',
    phone: '+60 3-8022-9182',
    email: 'ops@alsafwah-visa.com.my',
    country: 'Malaysia',
    outstandingPaymentMYR: 12000,
    paymentStatus: 'Pending Balance',
    notes: 'Authorized Muassasah partner in Malaysia for quick Saudi visa stamp clearances.'
  }
];

export const initialBookings: BookingItem[] = [
  {
    id: 'BK-1001',
    customerName: 'Kamilah binti Yusuf',
    customerPhone: '+60 19-334-1182',
    customerEmail: 'kamilah.yusuf@gmail.com',
    bookingType: 'Umrah Package',
    packageName: 'Premium Royal Umrah 1447H',
    paxCount: 4,
    travelDateFrom: '2026-10-12',
    travelDateTo: '2026-10-22',
    currency: 'MYR',
    totalAmount: 38000,
    totalAmountMYR: 38000,
    bookingStatus: 'Confirmed',
    hotelMakkah: 'Pullman Zamzam Makkah',
    hotelMadinah: 'Anwar Al Madinah Mövenpick',
    transportType: 'Haramain High Speed Train (Business Class)',
    extraServices: ['Ziyarah Tours Makkah', 'Ziyarah Tours Madinah', 'Wheelchair Assistance'],
    b2bAgentId: null,
    b2bAgentName: null,
    supplierCostMYR: 28000,
    supplierId: 'SUP-401',
    notes: 'VIP Senior Citizen group. Double bed requirements.',
    createdAt: '2026-06-01T08:30:00Z'
  },
  {
    id: 'BK-1002',
    customerName: 'Haji Ahmad Firdaus Group',
    customerPhone: '+62 811-9214-411',
    customerEmail: 'ahmad.firdaus@nusantara-net.id',
    bookingType: 'Umrah Package',
    packageName: 'Standard Ekonomi Umrah 1447H',
    paxCount: 45,
    travelDateFrom: '2026-11-05',
    travelDateTo: '2026-11-17',
    currency: 'IDR',
    totalAmount: 315000000, // Converted using base
    totalAmountMYR: 94500,
    bookingStatus: 'Confirmed',
    hotelMakkah: 'Swissôtel Makkah',
    hotelMadinah: 'Anwar Al Madinah Mövenpick',
    transportType: 'Haramain Coach Mercedes Bus',
    extraServices: ['Full Board Catering (Indonesian Buffet)', 'Saudi Sim Card Pack'],
    b2bAgentId: 'B2B-101',
    b2bAgentName: 'Nusantara Umrah Services Jakarta',
    supplierCostMYR: 72000,
    supplierId: 'SUP-402',
    notes: 'B2B booked delegation. Commission at 8% applies to booking. Net operator margin monitored.',
    createdAt: '2026-06-02T10:15:00Z'
  },
  {
    id: 'BK-1003',
    customerName: 'Sulaiman bin Abdul Rahman',
    customerPhone: '+65 9182-4411',
    customerEmail: 'sulaiman.ar@yahoo.com.sg',
    bookingType: 'Hotel + Transport',
    packageName: 'Custom Executive Umrah Package',
    paxCount: 2,
    travelDateFrom: '2026-06-25',
    travelDateTo: '2026-07-02',
    currency: 'SGD',
    totalAmount: 9200,
    totalAmountMYR: 30360,
    bookingStatus: 'Pending',
    hotelMakkah: 'Fairmont Makkah Clock Royal Tower',
    hotelMadinah: 'The Oberoi Madinah',
    transportType: 'VIP GMC Coach',
    extraServices: ['VVIP Airport Lounge Access', 'Express Visa Service'],
    b2bAgentId: 'B2B-102',
    b2bAgentName: 'Al-Madinah Travel Singapore Pte Ltd',
    supplierCostMYR: 22000,
    supplierId: 'SUP-401',
    notes: 'Frequent high-end travelers from Singapore.',
    createdAt: '2026-06-03T14:45:00Z'
  },
  {
    id: 'BK-1004',
    customerName: 'Muhammad Farid Zahari',
    customerPhone: '+60 12-884-2193',
    customerEmail: 'farid.zahari@aerostarops.co',
    bookingType: 'Private Tour',
    packageName: 'Historical Jordan & Saudi Tour',
    paxCount: 12,
    travelDateFrom: '2026-08-10',
    travelDateTo: '2026-08-20',
    currency: 'MYR',
    totalAmount: 48000,
    totalAmountMYR: 48000,
    bookingStatus: 'Draft',
    hotelMakkah: 'Pullman Zamzam Makkah',
    hotelMadinah: 'Anwar Al Madinah Mövenpick',
    transportType: 'Private Coach',
    extraServices: ['Local Tour Historian Guide'],
    b2bAgentId: null,
    b2bAgentName: null,
    supplierCostMYR: 35000,
    supplierId: 'SUP-403',
    notes: 'Family gathering tour.',
    createdAt: '2026-06-04T02:10:00Z'
  }
];

export const initialInvoices: InvoiceItemModel[] = [
  {
    id: 'INV-2026-1001',
    bookingId: 'BK-1001',
    customerName: 'Kamilah binti Yusuf',
    customerEmail: 'kamilah.yusuf@gmail.com',
    items: [
      { description: 'Premium Royal Umrah 1447H Package (4 Pax)', unitPrice: 9500, quantity: 4, subtotal: 38000 },
      { description: 'Wheelchair Assistance Service Upgrade', unitPrice: 0, quantity: 1, subtotal: 0 }
    ],
    currency: 'MYR',
    exchangeRateToMYR: 1.0,
    subtotal: 38000,
    taxPercentage: 6, // Malaysian SST
    taxAmount: 2280,
    discountAmount: 1000,
    grandTotal: 39280,
    paidAmount: 39280,
    paymentStatus: 'Paid',
    dueDate: '2026-06-25',
    createdAt: '2026-06-01T08:35:00Z'
  },
  {
    id: 'INV-2026-1002',
    bookingId: 'BK-1002',
    customerName: 'Haji Ahmad Firdaus Group',
    customerEmail: 'ahmad.firdaus@nusantara-net.id',
    items: [
      { description: 'Standard Ekonomi Umrah 1447H Base All-inclusive (45 Pax)', unitPrice: 7000000, quantity: 45, subtotal: 315000000 }
    ],
    currency: 'IDR',
    exchangeRateToMYR: 0.0003,
    subtotal: 315000000,
    taxPercentage: 0,
    taxAmount: 0,
    discountAmount: 15000000,
    grandTotal: 300000000,
    paidAmount: 150000000,
    paymentStatus: 'Partial',
    dueDate: '2026-07-05',
    createdAt: '2026-06-02T10:20:00Z'
  }
];

export const initialTransactions: FinanceTransaction[] = [
  {
    id: 'TXN-001',
    type: 'Income',
    category: 'Booking Revenue',
    amount: 39280,
    currency: 'MYR',
    amountOriginalCurrency: 39280,
    exchangeRateToMYR: 1.0,
    referenceId: 'INV-2026-1001',
    date: '2026-06-01',
    description: 'Pristine full Payment received for Booking BK-1001 (Kamilah binti Yusuf)'
  },
  {
    id: 'TXN-002',
    type: 'Income',
    category: 'Booking Revenue',
    amount: 45000, // 150,000,000 IDR
    currency: 'IDR',
    amountOriginalCurrency: 150000000,
    exchangeRateToMYR: 0.0003,
    referenceId: 'INV-2026-1002',
    date: '2026-06-02',
    description: 'Downpayment partial deposit received for B2B booking BK-1002 via Jakarta Alliance'
  },
  {
    id: 'TXN-003',
    type: 'Expense',
    category: 'Supplier Payment',
    amount: 15000,
    currency: 'MYR',
    amountOriginalCurrency: 15000,
    exchangeRateToMYR: 1.0,
    referenceId: 'SUP-401',
    date: '2026-06-02',
    description: 'Advance hot-bed deposit payment dispatched to Pullman Zamzam Hotel'
  },
  {
    id: 'TXN-004',
    type: 'Expense',
    category: 'HR Salary',
    amount: 12500,
    currency: 'MYR',
    amountOriginalCurrency: 12500,
    exchangeRateToMYR: 1.0,
    referenceId: 'SYSTEM-PAYROLL',
    date: '2026-06-03',
    description: 'Payroll disbursement for central Kuala Lumpur office staff.'
  }
];

export const initialEmployees: Employee[] = [
  {
    id: 'EMP-501',
    name: 'Aminah Noor',
    role: 'Admin',
    email: 'aminah.noor@aerostar-alliance.com',
    phone: '+60 12-445-8822',
    baseSalaryMYR: 8500,
    commissionPercentage: 0,
    commissionEarnedMYR: 0,
    attendanceToday: 'Present',
    joiningDate: '2024-01-15'
  },
  {
    id: 'EMP-502',
    name: 'Farhan bin Razak',
    role: 'Finance',
    email: 'farhan.razak@aerostar-alliance.com',
    phone: '+60 17-291-5843',
    baseSalaryMYR: 6200,
    commissionPercentage: 0,
    commissionEarnedMYR: 0,
    attendanceToday: 'Present',
    joiningDate: '2024-06-01'
  },
  {
    id: 'EMP-503',
    name: 'Shaharuzi Amri',
    role: 'Sales',
    email: 'shaharuzi@aerostar-alliance.com',
    phone: '+60 11-1923-4560',
    baseSalaryMYR: 4500,
    commissionPercentage: 2, // 2% commission of sales
    commissionEarnedMYR: 3260,
    attendanceToday: 'Present',
    joiningDate: '2025-02-10'
  },
  {
    id: 'EMP-504',
    name: 'Hajah Zahrah Ishak',
    role: 'Agent',
    email: 'zahrah.ishak@aerostar-alliance.com',
    phone: '+60 18-994-3912',
    baseSalaryMYR: 3800,
    commissionPercentage: 3,
    commissionEarnedMYR: 1800,
    attendanceToday: 'On Leave',
    joiningDate: '2023-09-20'
  },
  {
    id: 'EMP-505',
    name: 'Mustafa Al-Kahlil',
    role: 'Staff',
    email: 'mustafa@aerostar.co.sa',
    phone: '+966 50-843-9214',
    baseSalaryMYR: 5000,
    commissionPercentage: 0,
    commissionEarnedMYR: 0,
    attendanceToday: 'Present',
    joiningDate: '2025-05-15'
  }
];

export const initialLogs: ActivityLog[] = [
  {
    id: 'LOG-001',
    userEmail: 'finance@aero-star.co',
    userName: 'Ahmad Farhan',
    userRole: 'Admin',
    action: 'System Seed Initialized with 1447H Hajj/Umrah Packages.',
    category: 'System',
    timestamp: '2026-06-04T01:00:00Z'
  },
  {
    id: 'LOG-002',
    userEmail: 'finance@aero-star.co',
    userName: 'Ahmad Farhan',
    userRole: 'Finance',
    action: 'Invoice INV-2026-1001 marked as fully PAID.',
    category: 'Invoice',
    timestamp: '2026-06-04T02:30:00Z'
  }
];

export const initialHotelContracts: HotelContract[] = [
  {
    id: 'CON-MAK-001',
    hotelName: 'Pullman Zamzam Makkah',
    location: 'Makkah',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    rooms: [
      { roomType: 'Double', capacity: 2, roomsAvailable: 15, roomsTotal: 15, contractRateMYR: 450 },
      { roomType: 'Triple', capacity: 3, roomsAvailable: 10, roomsTotal: 10, contractRateMYR: 550 },
      { roomType: 'Quad', capacity: 4, roomsAvailable: 15, roomsTotal: 15, contractRateMYR: 650 },
      { roomType: 'Quint', capacity: 5, roomsAvailable: 5, roomsTotal: 5, contractRateMYR: 750 },
      { roomType: 'Six-sharing', capacity: 6, roomsAvailable: 5, roomsTotal: 5, contractRateMYR: 850 }
    ]
  },
  {
    id: 'CON-MAK-002',
    hotelName: 'Swissôtel Makkah',
    location: 'Makkah',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    rooms: [
      { roomType: 'Double', capacity: 2, roomsAvailable: 25, roomsTotal: 25, contractRateMYR: 480 },
      { roomType: 'Triple', capacity: 3, roomsAvailable: 20, roomsTotal: 20, contractRateMYR: 580 },
      { roomType: 'Quad', capacity: 4, roomsAvailable: 25, roomsTotal: 25, contractRateMYR: 680 },
      { roomType: 'Quint', capacity: 5, roomsAvailable: 10, roomsTotal: 10, contractRateMYR: 780 },
      { roomType: 'Six-sharing', capacity: 6, roomsAvailable: 10, roomsTotal: 10, contractRateMYR: 880 }
    ]
  },
  {
    id: 'CON-MAD-001',
    hotelName: 'Anwar Al Madinah Mövenpick',
    location: 'Madinah',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    rooms: [
      { roomType: 'Double', capacity: 2, roomsAvailable: 20, roomsTotal: 20, contractRateMYR: 350 },
      { roomType: 'Triple', capacity: 3, roomsAvailable: 15, roomsTotal: 15, contractRateMYR: 450 },
      { roomType: 'Quad', capacity: 4, roomsAvailable: 20, roomsTotal: 20, contractRateMYR: 550 },
      { roomType: 'Quint', capacity: 5, roomsAvailable: 8, roomsTotal: 8, contractRateMYR: 650 },
      { roomType: 'Six-sharing', capacity: 6, roomsAvailable: 8, roomsTotal: 8, contractRateMYR: 750 }
    ]
  },
  {
    id: 'CON-MAD-002',
    hotelName: 'The Oberoi Madinah',
    location: 'Madinah',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    rooms: [
      { roomType: 'Double', capacity: 2, roomsAvailable: 10, roomsTotal: 10, contractRateMYR: 750 },
      { roomType: 'Triple', capacity: 3, roomsAvailable: 8, roomsTotal: 8, contractRateMYR: 900 },
      { roomType: 'Quad', capacity: 4, roomsAvailable: 10, roomsTotal: 10, contractRateMYR: 1100 },
      { roomType: 'Quint', capacity: 5, roomsAvailable: 5, roomsTotal: 5, contractRateMYR: 1300 },
      { roomType: 'Six-sharing', capacity: 6, roomsAvailable: 5, roomsTotal: 5, contractRateMYR: 1500 }
    ]
  }
];
