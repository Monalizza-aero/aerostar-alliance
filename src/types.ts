export type UserRole = 'Admin' | 'Finance' | 'Sales' | 'Agent' | 'Staff' | 'Manager';

export interface RoomAllocation {
  roomType: 'Double' | 'Triple' | 'Quad' | 'Quint' | 'Six-sharing';
  count: number;
  capacity: number;
  ratePerRoom: number;
  isManualOverride?: boolean;
}

export interface MealsConfig {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  overrideCount?: number; // total meals manual override count
  customPackageName: string;
  pricePerMeal: number;
  totalCost: number;
}

export interface AdditionalService {
  name: string;
  cost: number;
  notes?: string;
  isPredefined?: boolean;
}

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
  bookingStatus: 'Draft' | 'Pending' | 'Confirmed' | 'Invoiced' | 'Completed' | 'Cancelled';
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
  aeroRef?: string;

  // Improved operational fields
  hotelSelectionType?: 'Makkah Only' | 'Madinah Only' | 'Makkah + Madinah' | 'Room Only' | 'Full Umrah Package';
  roomAllocations?: RoomAllocation[];
  mealsConfig?: MealsConfig;
  customServices?: AdditionalService[];
}

export interface RoomContract {
  roomType: 'Double' | 'Triple' | 'Quad' | 'Quint' | 'Six-sharing';
  capacity: number;
  roomsAvailable: number; // calculated dynamically or stored
  roomsTotal: number;
  contractRateMYR: number; // Cost rate per room per night
}

export interface HotelContractHistory {
  version: number;
  changeDate: string;
  rooms: RoomContract[];
  validFrom: string;
  validTo: string;
  authorName: string;
  authorEmail: string;
}

export interface HotelContract {
  id: string;
  hotelName: string;
  location: 'Makkah' | 'Madinah';
  rooms: RoomContract[];
  validFrom: string;
  validTo: string;
  version?: number;
  history?: HotelContractHistory[];
  aliases?: string[];
}

export interface InvoiceItem {
  description: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface InvoiceItemModel {
  id: string; // e.g. INV-2026-X
  bookingId?: string | null;
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

  // Invoice Module Enhancements
  invoiceType?: 'Booking' | 'Manual' | 'Lump Sum' | 'Proforma';
  validityPeriod?: string;
  version?: number;
  remarks?: string;
  convertedFromProforma?: boolean;
  approvalStatus?: 'Invoiced' | 'Awaiting Approval' | 'Modified';
  pendingChanges?: string; // description of modified items awaiting review
  draftInvoice?: string; // serialized pending invoice revision
  history?: {
    timestamp: string;
    action: string;
    authorName: string;
    authorEmail: string;
    changes?: string;
  }[];
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
  nric?: string;
  epfNumber?: string;
  socsoNumber?: string;
  taxNumber?: string;
  maritalStatus?: 'Single' | 'Married' | 'Divorced';
  numberOfChildren?: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Maternity' | 'Paternity' | 'Compassionate';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  approvedBy?: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // e.g. "2026-06"
  baseSalary: number;
  allowances: number;
  commission: number;
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  pcb: number;
  netSalary: number;
  status: 'Draft' | 'Paid';
  generatedAt: string;
  disbursedAt?: string;
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

export interface PricingRule {
  id: string;
  hotelName: string; // Specific hotel name or 'All Hotels'
  roomType: 'Double' | 'Triple' | 'Quad' | 'Quint' | 'Six-sharing';
  packageType: 'Room only' | 'Full Umrah package';
  priceMYR: number;
}
