export type UserRole = 'Admin' | 'Finance' | 'Sales' | 'Agent' | 'Staff';

export interface BookingItem {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  bookingType: 'Umrah Package' | 'Private Tour' | 'Hotel + Transport';
  packageName: string;
  paxCount: number;
  travelDateFrom: string;
  travelDateTo: string;
  currency: 'MYR' | 'IDR' | 'SGD' | 'SAR';
  totalAmount: number; // local currency
  totalAmountMYR: number; // converted base
  bookingStatus: 'Draft' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  hotelMakkah: string;
  hotelMadinah: string;
  transportType: string;
  extraServices: string[];
  b2bAgentId: string | null;  // linked partner if B2B booking
  b2bAgentName: string | null;
  supplierCostMYR: number;    // associated procurement cost
  supplierId: string | null;  // linked hotel/transport provider
  notes: string;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface InvoiceItemModel {
  id: string; // e.g. INV-2026-X
  bookingId: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  currency: 'MYR' | 'IDR' | 'SGD' | 'SAR';
  exchangeRateToMYR: number;
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid';
  dueDate: string;
  createdAt: string;
}

export interface B2BPartner {
  id: string;
  companyName: string;
  country: 'Malaysia' | 'Indonesia' | 'Singapore' | 'Saudi Arabia';
  contactName: string;
  phone: string;
  email: string;
  commissionRate: number; // percentage (e.g. 5 = 5%)
  contractStatus: 'Active' | 'Under Review' | 'Expired';
  totalBookingsCount: number;
  totalEarnedCommissionsMYR: number;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: 'Hotel' | 'Transportation' | 'Catering' | 'Visa/Ground';
  contactPerson: string;
  phone: string;
  email: string;
  country: 'Malaysia' | 'Indonesia' | 'Singapore' | 'Saudi Arabia';
  outstandingPaymentMYR: number;
  paymentStatus: 'Clear' | 'Pending Balance';
  notes: string;
}

export interface FinanceTransaction {
  id: string;
  type: 'Income' | 'Expense';
  category: 'Booking Revenue' | 'Supplier Payment' | 'HR Salary' | 'B2B Commission Payout' | 'Office Overhead' | 'Marketing';
  amount: number; // in MYR
  currency: 'MYR' | 'IDR' | 'SGD' | 'SAR';
  amountOriginalCurrency: number;
  exchangeRateToMYR: number;
  referenceId: string; // Booking ID, Supplier ID, Employee ID
  date: string;
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  baseSalaryMYR: number;
  commissionPercentage: number;
  commissionEarnedMYR: number;
  attendanceToday: 'Present' | 'Absent' | 'On Leave';
  joiningDate: string;
}

export interface ActivityLog {
  id: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'Booking' | 'Invoice' | 'Finance' | 'B2B' | 'Supplier' | 'HR' | 'System';
  timestamp: string;
}

export type Language = 'EN' | 'BM';
