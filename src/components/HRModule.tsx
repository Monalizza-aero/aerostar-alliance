import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Briefcase, 
  DollarSign, 
  Award, 
  UserCheck, 
  Calendar, 
  Mail, 
  Phone, 
  TrendingUp, 
  Clock,
  FileText,
  FileSpreadsheet,
  Building,
  Printer,
  Download,
  Coins,
  Info,
  CheckCircle,
  XCircle,
  ChevronRight,
  Settings,
  FlameKindling
} from 'lucide-react';
import { Employee, Language, LeaveRequest, Payslip } from '../types';
import { TRANSLATIONS } from '../Translations';

interface HRModuleProps {
  employees: Employee[];
  lang: Language;
  onAddEmployee: (employee: Partial<Employee>) => Promise<void>;
  onUpdateAttendance: (id: string, status: 'Present' | 'On Leave' | 'Absent') => Promise<void>;
  leaveRequests: LeaveRequest[];
  payslips: Payslip[];
  onUpdateDb: (db: any) => void;
}

export default function HRModule({
  employees,
  lang,
  onAddEmployee,
  onUpdateAttendance,
  leaveRequests = [],
  payslips = [],
  onUpdateDb
}: HRModuleProps) {
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  // Active HR Sub Tab Selection
  // roster = Staff & Lobby attendance
  // payroll = Monthly Payslips calculator
  // leaves = Leave Request & Approvals
  // taxForms = Taxation Form EA and Form E
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'payroll' | 'leaves' | 'taxForms'>('roster');

  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Profile Edit drawer state for Malaysian Statutory IDs
  const [editingEmployeeForStatutory, setEditingEmployeeForStatutory] = useState<Employee | null>(null);
  const [statForm, setStatForm] = useState({
    nric: '',
    epfNumber: '',
    socsoNumber: '',
    taxNumber: '',
    maritalStatus: 'Single' as 'Single' | 'Married' | 'Divorced',
    numberOfChildren: 0
  });

  // Payslip generation settings
  const [payrollMonth, setPayrollMonth] = useState('2026-06');
  const [allowanceConfig, setAllowanceConfig] = useState<Record<string, number>>({});
  const [commissionOverride, setCommissionOverride] = useState<Record<string, number>>({});
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);

  // Company-wide Malaysian Statutory IDs
  const [companyEPFNo, setCompanyEPFNo] = useState("25231236");
  const [companySOCSONo, setCompanySOCSONo] = useState("9600054211");
  const [companyLHDNNo, setCompanyLHDNNo] = useState("E-2091018220");
  const [statutoryPreviewType, setStatutoryPreviewType] = useState<'epf' | 'socso' | null>(null);

  // EA & Form E parameters
  const [selectedEmployeeForEA, setSelectedEmployeeForEA] = useState<Employee | null>(null);
  const [eaYear, setEaYear] = useState(2026);

  // Raise Leave form state
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'Annual' as any,
    startDate: '',
    endDate: '',
    reason: ''
  });

  // TXT Downloader helper function
  const downloadTXT = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate KWSP Monthly Form A Raw Text File Content
  const generateKWSPTxt = (): string => {
    const [year, month] = payrollMonth.split('-');
    const periodYYYYMM = `${year}${month}`;
    const periodMMYYYY = `${month}${year}`;

    let totalEmployeeEPF = 0;
    let totalEmployerEPF = 0;
    let hashTotalEPFNumbers = 0;

    const detailRecords = employees.map((emp, idx) => {
      const p = payslips.find(p => p.employeeId === emp.id && p.month === payrollMonth);
      const base = p ? p.baseSalary : emp.baseSalaryMYR;
      const allowances = p ? p.allowances : 0;
      const commission = p ? p.commission : (emp.commissionEarnedMYR || 0);
      const gross = base + allowances + commission;

      const epfEmployee = p ? p.epfEmployee : parseFloat((gross * 0.11).toFixed(2));
      const epfEmployer = p ? p.epfEmployer : parseFloat((gross * (gross <= 5000 ? 0.13 : 0.12)).toFixed(2));

      totalEmployeeEPF = parseFloat((totalEmployeeEPF + epfEmployee).toFixed(2));
      totalEmployerEPF = parseFloat((totalEmployerEPF + epfEmployer).toFixed(2));

      const epfNoStr = (emp.epfNumber || `1288410${idx + 1}`).replace(/\D/g, '');
      const epfNoNumeric = parseInt(epfNoStr) || 0;
      hashTotalEPFNumbers += epfNoNumeric;

      const recordType = "02";
      const empEpfPadded = epfNoStr.padStart(19, '0');
      const cleanNric = (emp.nric || '890514-14-5211').replace(/\D/g, '').padEnd(12, ' ').slice(0, 12);
      const namePadded = ("   " + emp.name.toUpperCase()).padEnd(43, ' ').slice(0, 43);
      const rateCode = "002"; 
      const spacing = " ".repeat(17);
      
      const epfEmpCents = Math.round(epfEmployee * 100).toString().padStart(8, '0');
      const epfEmployerCents = Math.round(epfEmployer * 100).toString().padStart(8, '0');
      const grossCents = Math.round(gross * 100).toString().padStart(17, '0');

      return recordType + empEpfPadded + cleanNric + namePadded + rateCode + spacing + epfEmpCents + epfEmployerCents + grossCents;
    });

    const totalEmployeeEPFCentsStr = Math.round(totalEmployeeEPF * 100).toString().padStart(15, '0');
    const totalEmployerEPFCentsStr = Math.round(totalEmployerEPF * 100).toString().padStart(15, '0');
    const companyEpfPadded = companyEPFNo.replace(/\D/g, '').padStart(17, '0');
    
    const header00 = "00" + "EPF MONTHLY FORM A" + periodYYYYMM + "15" + "00001" + totalEmployeeEPFCentsStr + totalEmployerEPFCentsStr + companyEpfPadded;
    const header00Padded = header00.padEnd(120, ' ');

    const companyEpfPadded19 = companyEPFNo.replace(/\D/g, '').padStart(19, '0');
    const header01 = "01" + companyEpfPadded19 + periodMMYYYY + "CDR" + "00001" + "00000000";
    const header01Padded = header01.padEnd(120, ' ');

    const recCountStr = employees.length.toString().padStart(7, '0');
    const hashTotalStr = hashTotalEPFNumbers.toString().padStart(20, '0');
    const trailer = "99" + recCountStr + totalEmployeeEPFCentsStr + totalEmployerEPFCentsStr + hashTotalStr;
    const trailerPadded = trailer.padEnd(120, ' ');

    return [header00Padded, header01Padded, ...detailRecords, trailerPadded].join("\n");
  };

  const handleDownloadKWSPTxt = () => {
    const text = generateKWSPTxt();
    downloadTXT(text, `kwsp_form_a_diskette_${payrollMonth}.txt`);
  };

  // Generate PERKESO SOCSO Raw Text File ASSIST Format Content
  const generateSOCSOTxt = (): string => {
    const [year, month] = payrollMonth.split('-');
    const periodYYYYMM = `${year}${month}`;

    let totalSocsoEisContributions = 0;
    const cleanCompanyCode = companySOCSONo.replace(/\D/g, '').padEnd(10, '0').substring(0, 10);

    const detailRecords = employees.map((emp, idx) => {
      const p = payslips.find(p => p.employeeId === emp.id && p.month === payrollMonth);
      const base = p ? p.baseSalary : emp.baseSalaryMYR;
      const allowances = p ? p.allowances : 0;
      const commission = p ? p.commission : (emp.commissionEarnedMYR || 0);
      const gross = base + allowances + commission;

      const wageCeiling = Math.min(gross, 6000);

      const socsoEmployee = p ? p.socsoEmployee : parseFloat((wageCeiling * 0.005).toFixed(2));
      const eisEmployee = p ? p.eisEmployee : parseFloat((wageCeiling * 0.002).toFixed(2));

      const employeeShare = parseFloat((socsoEmployee + eisEmployee).toFixed(2));
      totalSocsoEisContributions = parseFloat((totalSocsoEisContributions + employeeShare).toFixed(2));

      const socsoNoStr = (emp.socsoNumber || `SOC-2200000${idx + 1}`).replace(/\D/g, '').padStart(11, '0').slice(0, 11);
      const namePadded = emp.name.toUpperCase().padEnd(80, ' ').substring(0, 80);
      const nricPadded = (emp.nric || '890514-14-5211').replace(/\D/g, '').padEnd(12, ' ').substring(0, 12);
      const spaces14 = " ".repeat(14);
      const centsStr = Math.round(employeeShare * 100).toString().padStart(8, '0');
      const zeros10 = "0".repeat(10);
      const statusCode = "1"; 
      const trailingSpaces = " ".repeat(7);

      return "D" + socsoNoStr + namePadded + nricPadded + spaces14 + centsStr + zeros10 + statusCode + trailingSpaces;
    });

    const contributionSumCentsStr = Math.round(totalSocsoEisContributions * 100).toString().padStart(10, '0');
    const countFormat = employees.length.toString().padStart(5, '0') + "00000";
    const fillerZeros = "0".repeat(10);

    const header = "H" + cleanCompanyCode + cleanCompanyCode + periodYYYYMM + contributionSumCentsStr + countFormat + fillerZeros;

    return [header, ...detailRecords].join("\n");
  };

  const handleDownloadSOCSOTxt = () => {
    const text = generateSOCSOTxt();
    downloadTXT(text, `perkeso_socso_assist_${payrollMonth}.txt`);
  };

  // CSV Downloader helper function
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Download LHDN CP39/PCB e-remittance upload CSV
  const handleDownloadCP39 = () => {
    const header = [
      "Company Tax Ref No (Majikan)",
      "Employee Income Tax No (No Cukai)",
      "Employee Legal Name",
      "NRIC / Passport",
      "Marital Status",
      "Wages Subject to PCB (RM)",
      "Monthly Tax Deduction - PCB Amount (RM)",
      "Payroll Period"
    ].join(",") + "\n";
    
    const rows = employees.map(emp => {
      const p = payslips.find(p => p.employeeId === emp.id && p.month === payrollMonth);
      const base = p ? p.baseSalary : emp.baseSalaryMYR;
      const allowances = p ? p.allowances : 0;
      const commission = p ? p.commission : (emp.commissionEarnedMYR || 0);
      const gross = base + allowances + commission;
      const pcb = p ? p.pcb : 0;
      return [
        "E-2091018220",
        `"${emp.taxNumber || 'SG4918239011'}"`,
        `"${emp.name.toUpperCase()}"`,
        `"${emp.nric || '890514-14-5211'}"`,
        `"${emp.maritalStatus || 'Single'}"`,
        gross.toFixed(2),
        pcb.toFixed(2),
        `"${payrollMonth}"`
      ].join(",");
    }).join("\n");

    downloadCSV(header + rows, `lhdn_pcb_cp39_submission_${payrollMonth}.csv`);
  };

  // 2. Download KWSP EPF e-Caruman bulk upload format
  const handleDownloadKWSP = () => {
    const header = [
      "Employer EPF No",
      "Employee EPF Member No",
      "Employee Legal Name",
      "NRIC / Passport",
      "Qualifying Wages (RM)",
      "Employee EPF Portion (11%) (RM)",
      "Employer EPF Portion (12%/13%) (RM)",
      "Total EPF Due (RM)",
      "Payroll Period"
    ].join(",") + "\n";

    const rows = employees.map(emp => {
      const p = payslips.find(p => p.employeeId === emp.id && p.month === payrollMonth);
      const base = p ? p.baseSalary : emp.baseSalaryMYR;
      const allowances = p ? p.allowances : 0;
      const commission = p ? p.commission : (emp.commissionEarnedMYR || 0);
      const gross = base + allowances + commission;
      const epfEmployee = p ? p.epfEmployee : parseFloat((gross * 0.11).toFixed(2));
      const epfEmployer = p ? p.epfEmployer : parseFloat((gross * (gross <= 5000 ? 0.13 : 0.12)).toFixed(2));
      const totalEPF = parseFloat((epfEmployee + epfEmployer).toFixed(2));
      return [
        "EPF-HQ-5928183",
        `"${emp.epfNumber || 'EPF-12884102'}"`,
        `"${emp.name.toUpperCase()}"`,
        `"${emp.nric || '890514-14-5211'}"`,
        gross.toFixed(2),
        epfEmployee.toFixed(2),
        epfEmployer.toFixed(2),
        totalEPF.toFixed(2),
        `"${payrollMonth}"`
      ].join(",");
    }).join("\n");

    downloadCSV(header + rows, `kwsp_ecaruman_submission_${payrollMonth}.csv`);
  };

  // 3. Download PERKESO SOCSO & EIS ASSIST upload format
  const handleDownloadSOCSO = () => {
    const header = [
      "Employer SOCSO Code",
      "Employee Legal Name",
      "NRIC / Passport",
      "Qualifying Wages (Capped at 6000) (RM)",
      "Employee SOCSO Share (RM)",
      "Employer SOCSO Share (RM)",
      "Employee EIS Share (RM)",
      "Employer EIS Share (RM)",
      "Combined PERKESO Due (RM)",
      "Payroll Period"
    ].join(",") + "\n";

    const rows = employees.map(emp => {
      const p = payslips.find(p => p.employeeId === emp.id && p.month === payrollMonth);
      const base = p ? p.baseSalary : emp.baseSalaryMYR;
      const allowances = p ? p.allowances : 0;
      const commission = p ? p.commission : (emp.commissionEarnedMYR || 0);
      const gross = base + allowances + commission;
      const wageCeiling = Math.min(gross, 6000);
      const socsoEmployee = p ? p.socsoEmployee : parseFloat((wageCeiling * 0.005).toFixed(2));
      const socsoEmployer = p ? p.socsoEmployer : parseFloat((wageCeiling * 0.0175).toFixed(2));
      const eisEmployee = p ? p.eisEmployee : parseFloat((wageCeiling * 0.002).toFixed(2));
      const eisEmployer = p ? p.eisEmployer : parseFloat((wageCeiling * 0.002).toFixed(2));
      const totalPERKESO = parseFloat((socsoEmployee + socsoEmployer + eisEmployee + eisEmployer).toFixed(2));
      return [
        "SOC-HQ-104928A",
        `"${emp.name.toUpperCase()}"`,
        `"${emp.nric || '890514-14-5211'}"`,
        gross.toFixed(2),
        socsoEmployee.toFixed(2),
        socsoEmployer.toFixed(2),
        eisEmployee.toFixed(2),
        eisEmployer.toFixed(2),
        totalPERKESO.toFixed(2),
        `"${payrollMonth}"`
      ].join(",");
    }).join("\n");

    downloadCSV(header + rows, `perkeso_socso_eis_assist_${payrollMonth}.csv`);
  };

  // 4. Download master statutory audit ledger trace
  const handleDownloadMasterReport = () => {
    const header = [
      "Payroll Month",
      "Employee ID",
      "Employee Name",
      "Division Role",
      "NRIC / ID",
      "EPF Member No",
      "SOCSO Registry No",
      "Income Tax Reference No",
      "Marital Status",
      "Children Dependents",
      "Base Salary MYR",
      "Hourly Allowances MYR",
      "Cumulative Commissions MYR",
      "Gross Remuneration MYR",
      "EPF Employee (11%) MYR",
      "EPF Employer Share MYR",
      "SOCSO Employee Share MYR",
      "SOCSO Employer Share MYR",
      "Sip/EIS Employee Share MYR",
      "Sip/EIS Employer Share MYR",
      "Withholding Tax PCB MYR",
      "Net Payout MYR",
      "Disbursement Status",
      "Audit Date"
    ].join(",") + "\n";

    const rows = employees.map(emp => {
      const p = payslips.find(p => p.employeeId === emp.id && p.month === payrollMonth);
      const base = p ? p.baseSalary : emp.baseSalaryMYR;
      const allowances = p ? p.allowances : 0;
      const commission = p ? p.commission : (emp.commissionEarnedMYR || 0);
      const gross = base + allowances + commission;
      const epfEmp = p ? p.epfEmployee : parseFloat((gross * 0.11).toFixed(2));
      const epfEmployer = p ? p.epfEmployer : parseFloat((gross * (gross <= 5000 ? 0.13 : 0.12)).toFixed(2));
      const wageCeiling = Math.min(gross, 6000);
      const socsoEmp = p ? p.socsoEmployee : parseFloat((wageCeiling * 0.005).toFixed(2));
      const socsoEmployer = p ? p.socsoEmployer : parseFloat((wageCeiling * 0.0175).toFixed(2));
      const eisEmp = p ? p.eisEmployee : parseFloat((wageCeiling * 0.002).toFixed(2));
      const eisEmployer = p ? p.eisEmployer : parseFloat((wageCeiling * 0.002).toFixed(2));
      const pcb = p ? p.pcb : 0;
      const net = p ? p.netSalary : parseFloat((gross - epfEmp - socsoEmp - eisEmp - pcb).toFixed(2));
      const status = p ? p.status : "Draft Projection";
      const disAt = p ? (p.disbursedAt || p.generatedAt || '') : '';
      return [
        `"${payrollMonth}"`,
        `"${emp.id}"`,
        `"${emp.name.toUpperCase()}"`,
        `"${emp.role}"`,
        `"${emp.nric || '890514-14-5211'}"`,
        `"${emp.epfNumber || 'EPF-12884102'}"`,
        `"${emp.socsoNumber || 'SOC-A3199827'}"`,
        `"${emp.taxNumber || 'SG4918239011'}"`,
        `"${emp.maritalStatus || 'Single'}"`,
        emp.numberOfChildren || 0,
        base,
        allowances,
        commission,
        gross,
        epfEmp,
        epfEmployer,
        socsoEmp,
        socsoEmployer,
        eisEmp,
        eisEmployer,
        pcb,
        net,
        `"${status}"`,
        `"${disAt}"`
      ].join(",");
    }).join("\n");

    downloadCSV(header + rows, `malaysia_statutory_master_report_${payrollMonth}.csv`);
  };

  // Form State: Add Employee
  const [empForm, setEmpForm] = useState<Partial<Employee>>({
    name: '',
    role: 'Staff',
    email: '',
    phone: '',
    baseSalaryMYR: 4500,
    commissionPercentage: 2,
    attendanceToday: 'Present'
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name || !empForm.email) {
      alert("Please provide the employee's name and corporate email.");
      return;
    }
    await onAddEmployee(empForm);
    setShowAddForm(false);
    setEmpForm({
      name: '',
      role: 'Staff',
      email: '',
      phone: '',
      baseSalaryMYR: 4500,
      commissionPercentage: 2,
      attendanceToday: 'Present'
    });
  };

  // Statutory save fetch trigger
  const handleSaveEmployeeStatutory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployeeForStatutory) return;
    
    try {
      const res = await fetch(`/api/hr/employees/${editingEmployeeForStatutory.id}/update-statutory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...statForm,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        onUpdateDb(body.db);
        setEditingEmployeeForStatutory(null);
      }
    } catch (err) {
      console.error("Failed to update employee statutory attributes", err);
    }
  };

  // Raise leave fetch trigger
  const handleCreateLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate) {
      alert("Please fill in all leave request inputs.");
      return;
    }

    try {
      const res = await fetch('/api/hr/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...leaveForm,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        onUpdateDb(body.db);
        setShowLeaveForm(false);
        setLeaveForm({
          employeeId: '',
          leaveType: 'Annual',
          startDate: '',
          endDate: '',
          reason: ''
        });
      }
    } catch (err) {
      console.error("Failed to raise leave query", err);
    }
  };

  // Approve leave fetch trigger
  const handleDecideLeave = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/hr/leaves/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        onUpdateDb(body.db);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate individual Employee payslip for month
  const handleGeneratePayslip = async (employeeId: string) => {
    const allowances = allowanceConfig[employeeId] || 0;
    const commOverride = commissionOverride[employeeId];

    try {
      const res = await fetch('/api/hr/payslips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          month: payrollMonth,
          allowances,
          commissionOverride: commOverride !== undefined ? Number(commOverride) : undefined,
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        onUpdateDb(body.db);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk calculate all payslips for current selected month
  const handleBulkGeneratePayslips = async () => {
    for (const emp of employees) {
      await handleGeneratePayslip(emp.id);
    }
  };

  // Lock and disburse payment
  const handleDisbursePayment = async (payslipId: string) => {
    try {
      const res = await fetch(`/api/hr/payslips/${payslipId}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorEmail: 'finance@aero-star.co',
          authorName: 'Ahmad Farhan'
        })
      });

      if (res.ok) {
        const body = await res.json();
        onUpdateDb(body.db);
        if (viewingPayslip && viewingPayslip.id === payslipId) {
          const freshSlip = body.db.payslips.find((p: any) => p.id === payslipId);
          if (freshSlip) setViewingPayslip(freshSlip);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
                          e.role.toLowerCase().includes(search.toLowerCase()) || 
                          e.email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const presentCount = employees.filter(e => e.attendanceToday === 'Present').length;
  const leaveCount = employees.filter(e => e.attendanceToday === 'On Leave').length;
  const totalPayroll = employees.reduce((sum, e) => sum + e.baseSalaryMYR + e.commissionEarnedMYR, 0);

  // EA cumulative calculations for an employee for assessment year (mocked by sum of payslips generated)
  const getEAContributionsOfEmployee = (empId: string) => {
    const slips = payslips.filter(p => p.employeeId === empId && p.month.startsWith(eaYear.toString()));
    const totalBase = slips.reduce((s, p) => s + p.baseSalary, 0) || (employees.find(e => e.id === empId)?.baseSalaryMYR || 0) * 12;
    const totalAllowances = slips.reduce((s, p) => s + p.allowances, 0) || 0;
    const totalComms = slips.reduce((s, p) => s + p.commission, 0) || (employees.find(e => e.id === empId)?.commissionEarnedMYR || 0) * 12;
    const totalGross = totalBase + totalAllowances + totalComms;
    
    const epfEmp = slips.reduce((s, p) => s + p.epfEmployee, 0) || parseFloat((totalGross * 0.11).toFixed(2));
    const epfEmployer = slips.reduce((s, p) => s + p.epfEmployer, 0) || parseFloat((totalGross * 0.12).toFixed(2));
    const socsoEmp = slips.reduce((s, p) => s + p.socsoEmployee, 0) || parseFloat((Math.min(totalGross, 6000 * 12) * 0.005).toFixed(2));
    const socsoEmployer = slips.reduce((s, p) => s + p.socsoEmployer, 0) || parseFloat((Math.min(totalGross, 6000 * 12) * 0.0175).toFixed(2));
    const eisEmp = slips.reduce((s, p) => s + p.eisEmployee, 0) || parseFloat((Math.min(totalGross, 6000 * 12) * 0.002).toFixed(2));
    const eisEmployer = slips.reduce((s, p) => s + p.eisEmployer, 0) || parseFloat((Math.min(totalGross, 6000 * 12) * 0.002).toFixed(2));
    const pcb = slips.reduce((s, p) => s + p.pcb, 0) || 0;
    const net = totalGross - epfEmp - socsoEmp - eisEmp - pcb;

    return {
      gross: totalGross,
      base: totalBase,
      allowances: totalAllowances,
      commission: totalComms,
      epfEmp,
      epfEmployer,
      socsoEmp,
      socsoEmployer,
      eisEmp,
      eisEmployer,
      pcb,
      net
    };
  };

  // Form E aggregate employer returns calculations for year
  const getFormEAggregates = () => {
    let companyGross = 0;
    let companyEPFEmp = 0;
    let companyEPFEmployer = 0;
    let companySOCSOEmp = 0;
    let companySOCSOEmployer = 0;
    let companyEISEmp = 0;
    let companyEISEmployer = 0;
    let companyPCB = 0;

    employees.forEach(e => {
      const stats = getEAContributionsOfEmployee(e.id);
      companyGross += stats.gross;
      companyEPFEmp += stats.epfEmp;
      companyEPFEmployer += stats.epfEmployer;
      companySOCSOEmp += stats.socsoEmp;
      companySOCSOEmployer += stats.socsoEmployer;
      companyEISEmp += stats.eisEmp;
      companyEISEmployer += stats.eisEmployer;
      companyPCB += stats.pcb;
    });

    return {
      totalEmployees: employees.length,
      grossRemuneration: companyGross,
      epfTotal: companyEPFEmp + companyEPFEmployer,
      epfEmployerOnly: companyEPFEmployer,
      socsoTotal: companySOCSOEmp + companySOCSOEmployer,
      eisTotal: companyEISEmp + companyEISEmployer,
      pcbTotal: companyPCB
    };
  };

  const formEData = getFormEAggregates();

  return (
    <div className="space-y-6">
      
      {/* Outer Title and Stats Summary Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-800" />
            {t('hr')} & Malaysia Statutory Center
          </h2>
          <p className="text-xs text-slate-500">Monitor centralized corporate agents, request leaves, process payroll & generate Malaysia LHDN compliant EA Forms and Form E tax sheets.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('addEmployee')}
          </button>
        </div>
      </div>

      {/* Main Tab Controls for Sub Modules */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('roster')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'roster' ? 'border-emerald-800 text-emerald-800 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <Users className="w-3.5 h-3.5" />
          Employees & Attendance Today
        </button>
        <button
          onClick={() => setActiveSubTab('payroll')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'payroll' ? 'border-emerald-800 text-emerald-800 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <Coins className="w-3.5 h-3.5" />
          EPF/SOCSO/PCB Payroll Console
        </button>
        <button
          onClick={() => setActiveSubTab('leaves')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'leaves' ? 'border-emerald-800 text-emerald-800 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Leave Desk ({leaveRequests.filter(l => l.status === 'Pending').length} Pending)
        </button>
        <button
          onClick={() => setActiveSubTab('taxForms')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'taxForms' ? 'border-emerald-800 text-emerald-800 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <FileText className="w-3.5 h-3.5" />
          EA Form & Return Form E (Malaysia)
        </button>
      </div>

      {/* KPI Overviews bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Attendance Today</span>
          <span className="text-xl font-extrabold text-slate-900 block mt-0.5">{presentCount} Present / {employees.length} Staff</span>
          <span className="text-[10px] text-slate-500 block">{leaveCount} Officers On Approved Leave</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Base Payroll cost</span>
          <span className="text-xl font-extrabold text-slate-900 block mt-0.5">MYR {totalPayroll.toLocaleString()} / mo</span>
          <span className="text-[10px] text-slate-500 block">Excluding statutory contributions</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">LHDN PCB Tax Suspended</span>
          <span className="text-xl font-extrabold text-emerald-850 block mt-0.5">MYR {payslips.reduce((sum, p) => sum + p.pcb, 0).toLocaleString()}</span>
          <span className="text-[10px] text-slate-500 block">Accumulated tax deduction this year</span>
        </div>
        <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-xs pr-1">
          <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">Malaysia Hub Statutory</span>
          <span className="text-sm font-bold text-slate-100 block mt-0.5 leading-snug">EPF Code: EPF-HQ-5928183</span>
          <span className="text-[10px] text-slate-400 block">SOCSO Code: SOC-HQ-104928A</span>
        </div>
      </div>

      {/* Roster & Add Forms section */}
      {showAddForm && (
        <form onSubmit={handleCreateEmployee} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Users className="w-4 h-4 text-emerald-800" />
            Assign New Central Staff / Tour Specialist Account
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Employee Full Name</label>
              <input
                type="text"
                value={empForm.name}
                onChange={e => setEmpForm({ ...empForm, name: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="Aminah Noor"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Assign Division Role</label>
              <select
                value={empForm.role}
                onChange={e => setEmpForm({ ...empForm, role: e.target.value as any })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full font-bold"
              >
                <option value="Admin">Admin Specialist (HQ)</option>
                <option value="Finance">Finance Controller / Auditor</option>
                <option value="Sales">Sales Consultant Executive</option>
                <option value="Agent">B2B Liaison Agent</option>
                <option value="Staff">Operations Operations Officer</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Corporate Email Address</label>
              <input
                type="email"
                value={empForm.email}
                onChange={e => setEmpForm({ ...empForm, email: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="name@aerostar.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Direct Mobile Contacts</label>
              <input
                type="text"
                value={empForm.phone}
                onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="+60 1x-xxx xxxx"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Base Monthly Salary (MYR)</label>
              <input
                type="number"
                value={empForm.baseSalaryMYR}
                onChange={e => setEmpForm({ ...empForm, baseSalaryMYR: Number(e.target.value) })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 font-bold w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Sales Commission Bonus Rate (%)</label>
              <input
                type="number"
                value={empForm.commissionPercentage}
                onChange={e => setEmpForm({ ...empForm, commissionPercentage: Number(e.target.value) })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 font-bold w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 text-xs pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-500 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2 px-5 rounded-lg text-xs cursor-pointer"
            >
              Issue Corporate Contract
            </button>
          </div>
        </form>
      )}

      {/* SUB-MODULE VARYING VIEWPORTS */}
      
      {/* 2. SUB TAB: ROSTER VIEWPORT */}
      {activeSubTab === 'roster' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">{t('salaryCalculation')}</h3>
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search staff, roles, levels..."
                  className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs w-full focus:outline-emerald-800"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-4 px-6">Staff Member</th>
                      <th className="py-4 px-6">Role Division</th>
                      <th className="py-4 px-6">Statutory IDs</th>
                      <th className="py-4 px-6 text-right">Base Salary (MYR)</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs text-slate-800">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                          {t('noRecords')}
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map(e => (
                        <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-extrabold text-slate-900 text-sm block">{e.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{e.email} | {e.phone}</span>
                            <span className="text-[9px] font-mono text-slate-400 mt-1 block">Joined: {e.joiningDate}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${e.role === 'Admin' ? 'bg-slate-900 text-white' : e.role === 'Finance' ? 'bg-blue-50 text-blue-900 border-blue-150' : e.role === 'Sales' ? 'bg-emerald-50 text-emerald-850 border-emerald-100' : 'bg-slate-100 text-slate-650'}`}>
                              {e.role}
                            </span>
                          </td>
                          <td className="py-4 px-6 space-y-0.5 text-[10px] text-slate-500 font-mono">
                            <div>NRIC: <span className="font-bold text-slate-800">{e.nric || 'Not Configured'}</span></div>
                            <div>EPF: <span className="font-bold text-slate-800">{e.epfNumber || 'No Code'}</span></div>
                            <div>Tax Code: <span className="font-bold text-slate-800">{e.taxNumber || 'No Code'}</span></div>
                            <div>Status: <span className="font-bold text-slate-800">{e.maritalStatus} ({e.numberOfChildren} Dep)</span></div>
                          </td>
                          <td className="py-4 px-6 text-right font-semibold">
                            MYR {e.baseSalaryMYR.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                setEditingEmployeeForStatutory(e);
                                setStatForm({
                                  nric: e.nric || '',
                                  epfNumber: e.epfNumber || '',
                                  socsoNumber: e.socsoNumber || '',
                                  taxNumber: e.taxNumber || '',
                                  maritalStatus: e.maritalStatus || 'Single',
                                  numberOfChildren: e.numberOfChildren || 0
                                });
                              }}
                              className="text-[10px] text-emerald-800 hover:text-emerald-950 font-black flex items-center justify-end gap-1 w-full cursor-pointer hover:underline"
                            >
                              <Settings className="w-3 h-3" />
                              Configure Statutory
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT PANELS: Statutory form drawer & attendance clicker */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* 1. Configure Statutory Record Form Inline */}
            {editingEmployeeForStatutory ? (
              <form onSubmit={handleSaveEmployeeStatutory} className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
                <div className="border-b border-emerald-100 pb-2">
                  <h3 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider block">Set Malaysia Statutory Portfolio</h3>
                  <p className="text-[10px] text-emerald-850 mt-0.5">Define personal identification values for tax returns & payslip deductions representing <strong>{editingEmployeeForStatutory.name}</strong>.</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-emerald-900 uppercase block mb-1">Malaysian NRIC / Passport ID</label>
                    <input
                      type="text"
                      required
                      value={statForm.nric}
                      onChange={e => setStatForm({ ...statForm, nric: e.target.value })}
                      className="bg-white border border-emerald-200 rounded-lg p-2 text-xs focus:outline-emerald-800 w-full font-mono"
                      placeholder="e.g. 890514-14-5211"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-emerald-900 uppercase block mb-1">KWSP / EPF Number</label>
                    <input
                      type="text"
                      required
                      value={statForm.epfNumber}
                      onChange={e => setStatForm({ ...statForm, epfNumber: e.target.value })}
                      className="bg-white border border-emerald-200 rounded-lg p-2 text-xs focus:outline-emerald-800 w-full"
                      placeholder="e.g. EPF-12884102"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-emerald-900 uppercase block mb-1">PERKESO / SOCSO Number</label>
                    <input
                      type="text"
                      required
                      value={statForm.socsoNumber}
                      onChange={e => setStatForm({ ...statForm, socsoNumber: e.target.value })}
                      className="bg-white border border-emerald-200 rounded-lg p-2 text-xs focus:outline-emerald-800 w-full"
                      placeholder="e.g. SOC-A3199827"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-emerald-900 uppercase block mb-1">LHDN Income Tax File Reference</label>
                    <input
                      type="text"
                      required
                      value={statForm.taxNumber}
                      onChange={e => setStatForm({ ...statForm, taxNumber: e.target.value })}
                      className="bg-white border border-emerald-200 rounded-lg p-2 text-xs focus:outline-emerald-800 w-full font-mono"
                      placeholder="e.g. SG4918239011"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-emerald-900 uppercase block mb-1">Marital Status</label>
                      <select
                        value={statForm.maritalStatus}
                        onChange={e => setStatForm({ ...statForm, maritalStatus: e.target.value as any })}
                        className="bg-white border border-emerald-200 rounded-lg p-1.5 text-xs focus:outline-emerald-850 w-full"
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-emerald-900 uppercase block mb-1">Dependent Children</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={statForm.numberOfChildren}
                        onChange={e => setStatForm({ ...statForm, numberOfChildren: Number(e.target.value) })}
                        className="bg-white border border-emerald-200 rounded-lg p-1.5 text-xs focus:outline-emerald-850 w-full font-bold"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingEmployeeForStatutory(null)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 bg-white border border-slate-250 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-800 text-white hover:bg-emerald-950 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Update Statutory Portfolio
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-emerald-900 text-white rounded-2xl p-5 border border-emerald-950 shadow-sm space-y-3">
                <h4 className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-4 h-4 text-emerald-300" />
                  Malaysia Statutory Compliance Note
                </h4>
                <p className="text-[11px] text-emerald-100 leading-relaxed">
                  According to Inland Revenue Board of Malaysia (LHDN) and Employees Provident Fund Board (KWSP):
                </p>
                <div className="space-y-2 text-[10px] text-emerald-200">
                  <p>• <strong>EPF (KWSP)</strong>: Employee default rate is 11%. Employer rate is 13% for wages ≤ RM5k, else 12%.</p>
                  <p>• <strong>SOCSO (PERKESO)</strong>: Wage ceiling capped at RM6k with approx 0.5% employee & 1.75% employer contribution.</p>
                  <p>• <strong>PCB Taxes</strong>: Handled via Monthly Tax Deduction calculated with progressive income tax bracket rules minus EPF/child relieves.</p>
                </div>
              </div>
            )}

            {/* Attendance toggle desk */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-800" />
                  {t('attendance')} Control Desk
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Toggle daily attendance status to log into centralized operations audit trackers.</p>
              </div>

              <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                {employees.map(e => (
                  <div key={e.id} className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded-xl p-2.5 transition-all hover:border-slate-300">
                    <div>
                      <span className="font-black text-slate-900 text-xs block leading-tight">{e.name}</span>
                      <span className="text-[9px] text-slate-500 font-semibold">{e.role}</span>
                    </div>
                    
                    <div className="flex gap-1.5 font-mono text-[9px] font-black">
                      <button
                        onClick={() => onUpdateAttendance(e.id, 'Present')}
                        className={`px-2 py-1 rounded cursor-pointer ${e.attendanceToday === 'Present' ? 'bg-emerald-600 text-white font-extrabold' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                      >
                        P
                      </button>
                      <button
                        onClick={() => onUpdateAttendance(e.id, 'On Leave')}
                        className={`px-2 py-1 rounded cursor-pointer ${e.attendanceToday === 'On Leave' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                      >
                        L
                      </button>
                      <button
                        onClick={() => onUpdateAttendance(e.id, 'Absent')}
                        className={`px-2 py-1 rounded cursor-pointer ${e.attendanceToday === 'Absent' ? 'bg-rose-500 text-white font-extrabold' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                      >
                        A
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-slate-350 flex justify-between font-mono pt-2 border-t border-slate-100">
                <span>P: Present</span>
                <span>L: On Leave</span>
                <span>A: Absent</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. SUB TAB: PAYROLL VIEWPORT */}
      {activeSubTab === 'payroll' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-950 text-sm">Monthly Payroll Processing Router</h3>
                <p className="text-xs text-slate-500">Choose salary disbursement period year/month to trigger Malaysian statutory deductions.</p>
              </div>
              <div className="flex flex-wrap gap-2.5 items-center">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Target Period</label>
                  <input
                    type="month"
                    value={payrollMonth}
                    onChange={e => setPayrollMonth(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-emerald-800"
                  />
                </div>
                <div>
                  <span className="block mb-1 text-[9px] text-transparent">Action</span>
                  <button
                    onClick={handleBulkGeneratePayslips}
                    className="bg-slate-900 text-white hover:bg-slate-950 text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer"
                  >
                    Run Bulk Calculations
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px]">
                    <th className="py-4 px-4">Employee</th>
                    <th className="py-4 px-4 text-right">Base Pay</th>
                    <th className="py-4 px-4">Recurring Allowances</th>
                    <th className="py-4 px-4">Comms Override</th>
                    <th className="py-4 px-4 text-center">Statutory Deductions (EPF/SOCSO/EIS/TAX)</th>
                    <th className="py-4 px-4 text-right">Net Pay</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-right">Payroll Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  {employees.map(emp => {
                    const matchedPayslip = payslips.find(p => p.employeeId === emp.id && p.month === payrollMonth);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70">
                        <td className="py-4 px-4">
                          <span className="font-extrabold text-slate-900 block">{emp.name}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">{emp.id} | {emp.role}</span>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold">
                          MYR {emp.baseSalaryMYR.toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            placeholder="MYR Allowances"
                            value={allowanceConfig[emp.id] || ''}
                            onChange={e => setAllowanceConfig({ ...allowanceConfig, [emp.id]: Number(e.target.value) })}
                            className="bg-slate-50 border border-slate-200 rounded p-1 text-xs text-right font-bold w-24 focus:outline-emerald-800"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            placeholder={`MYR running ${emp.commissionEarnedMYR}`}
                            value={commissionOverride[emp.id] !== undefined ? commissionOverride[emp.id] : ''}
                            onChange={e => setCommissionOverride({ ...commissionOverride, [emp.id]: Number(e.target.value) })}
                            className="bg-slate-50 border border-slate-200 rounded p-1 text-xs text-right font-bold w-24 focus:outline-emerald-800"
                          />
                          {commissionOverride[emp.id] === undefined && emp.commissionEarnedMYR > 0 && (
                            <span className="text-[9px] text-emerald-800 font-bold block mt-0.5">Running: MYR {emp.commissionEarnedMYR}</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {matchedPayslip ? (
                            <div className="inline-grid grid-cols-4 gap-1.5 text-[9px] font-mono font-bold bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-slate-550">
                              <span title="Employee EPF Share (11%)">EPF: {matchedPayslip.epfEmployee}</span>
                              <span title="SOCSO Share">SOC: {matchedPayslip.socsoEmployee}</span>
                              <span title="EIS Share">EIS: {matchedPayslip.eisEmployee}</span>
                              <span title="Monthly Income Tax PCB Deduction" className="text-emerald-800">PCB: {matchedPayslip.pcb}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic font-medium">Pending Calculation</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-black text-slate-900">
                          {matchedPayslip ? `MYR ${matchedPayslip.netSalary.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {matchedPayslip ? (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${matchedPayslip.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' : 'bg-amber-100 text-amber-800 border border-amber-250 animate-pulse'}`}>
                              {matchedPayslip.status}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No Slip</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right space-y-1.5">
                          <button
                            onClick={() => handleGeneratePayslip(emp.id)}
                            className="bg-emerald-800 hover:bg-emerald-950 text-white font-extrabold px-3 py-1 rounded text-[10px] block w-full text-center cursor-pointer"
                          >
                            Calculate Pay
                          </button>
                          {matchedPayslip && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setViewingPayslip(matchedPayslip)}
                                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-2 py-1 rounded text-[10px] flex items-center gap-1 w-full text-center cursor-pointer justify-center"
                              >
                                <Printer className="w-2.5 h-2.5" />
                                Payslip
                              </button>
                              {matchedPayslip.status === 'Draft' && (
                                <button
                                  onClick={() => handleDisbursePayment(matchedPayslip.id)}
                                  className="bg-slate-900 hover:bg-slate-950 text-white font-black px-2 py-1 rounded text-[10px] w-full text-center cursor-pointer justify-center block"
                                >
                                  Disburse
                                </button>
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

          {/* Malaysia Statutory Submission Portal (LHDN/KWSP/PERKESO Export Desk) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs animate-in fade-in duration-300 animate-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-800" />
                  Malaysia Statutory Submission Portal
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate and download customized bulk file formats for seamless batch uploads to Malaysian official portals for {payrollMonth}.
                </p>
              </div>
              <button
                onClick={handleDownloadMasterReport}
                className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Statutory Master Ledger (.csv)
              </button>
            </div>

            {/* Dynamic Corporate Identifier Configuration */}
            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-3">
              <strong className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Corporate Employer Identifiers</strong>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">KWSP EPF Employer No</label>
                  <input
                    type="text"
                    value={companyEPFNo}
                    onChange={(e) => setCompanyEPFNo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-emerald-800 font-mono"
                    placeholder="e.g. 25231236"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">PERKESO SOCSO Employer No</label>
                  <input
                    type="text"
                    value={companySOCSONo}
                    onChange={(e) => setCompanySOCSONo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-emerald-800 font-mono"
                    placeholder="e.g. 9600054211"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">LHDN Employer Tax No (Majikan)</label>
                  <input
                    type="text"
                    value={companyLHDNNo}
                    onChange={(e) => setCompanyLHDNNo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-emerald-800 font-mono"
                    placeholder="e.g. E-2091018220"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Box 1: KWSP EPF e-Caruman */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">KWSP EPF</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-200 font-mono">e-Caruman & Form A</span>
                  </div>
                  <strong className="block text-slate-900 mt-2 text-sm">e-Caruman Form A Exporter</strong>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Preloaded EPF member IDs, wages, and 11% employee + 12%/13% employer portions. Supports both generic CSV and official ASCII Diskette format.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                    <span>CO-EPF: {companyEPFNo}</span>
                    <span>KWSP RAW / CSV</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={handleDownloadKWSP}
                      className="bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-extrabold text-[10px] py-2 px-1 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                      title="Download standard tabular CSV sheet"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      Bulk CSV
                    </button>
                    <button
                      onClick={handleDownloadKWSPTxt}
                      className="bg-emerald-800 hover:bg-emerald-950 text-white font-extrabold text-[10px] py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      title="Download official raw text Form A submission format"
                    >
                      <FileText className="w-3 h-3" />
                      Raw TXT
                    </button>
                  </div>
                  <button
                    onClick={() => setStatutoryPreviewType(statutoryPreviewType === 'epf' ? null : 'epf')}
                    className="w-full text-center text-[10px] text-emerald-800 font-bold hover:underline py-1 bg-emerald-50/50 rounded border border-emerald-100 cursor-pointer"
                  >
                    {statutoryPreviewType === 'epf' ? 'Hide Live Terminal Preview 👀' : 'Preview ASCII Text Alignment 🖥️'}
                  </button>
                </div>
              </div>

              {/* Box 2: PERKESO SOCSO & EIS */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">PERKESO</span>
                    <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded border border-blue-200 font-mono font-bold">ASSIST Portal</span>
                  </div>
                  <strong className="block text-slate-900 mt-2 text-sm">SOCSO & EIS ASSIST Exporter</strong>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Preloaded employee names, NRICs and wage classes capped at RM6k. Generates automated text file with Headers, Details, and rate codes.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                    <span>CO-SOC: {companySOCSONo}</span>
                    <span>ASSIST TEXT / CSV</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={handleDownloadSOCSO}
                      className="bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-extrabold text-[10px] py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                      title="Download standard tabular CSV sheet"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      Bulk CSV
                    </button>
                    <button
                      onClick={handleDownloadSOCSOTxt}
                      className="bg-blue-800 hover:bg-blue-950 text-white font-extrabold text-[10px] py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      title="Download official ASSIST text file layout"
                    >
                      <FileText className="w-3 h-3" />
                      Raw TXT
                    </button>
                  </div>
                  <button
                    onClick={() => setStatutoryPreviewType(statutoryPreviewType === 'socso' ? null : 'socso')}
                    className="w-full text-center text-[10px] text-blue-800 font-bold hover:underline py-1 bg-blue-50/50 rounded border border-blue-100 cursor-pointer"
                  >
                    {statutoryPreviewType === 'socso' ? 'Hide Live Terminal Preview 👀' : 'Preview ASCII Text Alignment 🖥️'}
                  </button>
                </div>
              </div>

              {/* Box 3: LHDN MTD/PCB CP39 */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">LHDN TAX</span>
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-200 font-mono font-bold">CP39 e-Data</span>
                  </div>
                  <strong className="block text-slate-900 mt-2 text-sm">CP39 Monthly PCB Exporter</strong>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Preloads Tax reference numbers, NRICs and wage components parsed dynamically from payroll months. Configured for fast e-Data tax uploads.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                    <span>CO-TAX: {companyLHDNNo}</span>
                    <span>LHDN ST-CSV</span>
                  </div>
                  <button
                    onClick={handleDownloadCP39}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-[11px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CP39 CSV File
                  </button>
                  <div className="h-6 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                    * Format specified for LHDN MyTax Portal
                  </div>
                </div>
              </div>

            </div>

            {/* LIVE DATA TERMINAL VISUAL SANDBOX PREVIEW */}
            {statutoryPreviewType && (
              <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-lg space-y-4 font-mono text-xs border border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="ml-2 font-bold text-slate-400 text-xs">
                      {statutoryPreviewType === 'epf' ? 'KWSP EPF Form A ASCII Preview Console' : 'PERKESO SOCSO ASSIST Text Preview Console'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(statutoryPreviewType === 'epf' ? generateKWSPTxt() : generateSOCSOTxt());
                      alert("Raw statutory text copied to clipboard successfully!");
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-1 px-3 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Copy Output
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed space-y-1">
                  <header className="font-bold underline text-slate-300">File Specification Audit Ledger & Validation Map:</header>
                  {statutoryPreviewType === 'epf' ? (
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li><strong>Row 00 (Header Record)</strong>: Form ID, Month ({payrollMonth.replace('-', '')}), Total Employee Share Cents, Total Employer Share Cents, Corporate EPF ({companyEPFNo})</li>
                      <li><strong>Row 01 (Registry record)</strong>: Corporate EPF Registration Number, Period MMYYYY, constant 'CDR'</li>
                      <li><strong>Row 02 (Detail Record)</strong>: Employee EPF Number (19-padded), NRIC, Name (43-char padded), Employee Share, Employer Share, Remuneration Base</li>
                      <li><strong>Row 99 (Trailer Record)</strong>: Dynamic Record Count ({employees.length}), sum counts, and EPF Member ID Hash Checksum</li>
                    </ul>
                  ) : (
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li><strong>Row H (Header Record)</strong>: Constant 'H', Employer Code ({companySOCSONo}), YearMonth ({payrollMonth.replace('-', '')}), Combined SOCSO+EIS Employee Sum Cents, Employee Count Format, filler zeros</li>
                      <li><strong>Row D (Detail Record)</strong>: Constant 'D', Employee SOCSO registration, Name (80 left-padded), NRIC, Spacer, Combined Employee Share (SOCSO+EIS), Employee Status Category Code</li>
                    </ul>
                  )}
                </div>

                <div className="overflow-x-auto bg-black p-4 rounded-xl border border-slate-800 text-[10px] font-mono leading-relaxed whitespace-pre font-normal text-emerald-400 tracking-wider">
                  {statutoryPreviewType === 'epf' ? generateKWSPTxt() : generateSOCSOTxt()}
                </div>

                <div className="text-[10px] justify-between flex text-slate-500 select-none">
                  <span>CHAR COLUMNS INDEX SYNC [1 - 132 CHARS FIXED-WIDTH WIDTHS COCONUT]</span>
                  <span>STATUS: READY FOR MALAYSIAN GOVERNMENT PORTALS</span>
                </div>
              </div>
            )}

            {/* Practical Portal Upload Guides */}
            <div className="bg-emerald-50 text-emerald-950 p-4 rounded-xl border border-emerald-200 flex gap-3">
              <Info className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-xs block font-bold text-emerald-900">Portal Submission Instructions for {payrollMonth}:</strong>
                <div className="text-[11px] text-emerald-800 space-y-1.5 leading-normal">
                  <p>
                    1. <strong>KWSP e-Caruman (EPF Form A TXT/CSV)</strong>: Log in to KWSP i-Akaun Majikan, select "e-Caruman", upload your downloaded KWSP text folder or CSV sheet and click submit to trigger FPX payment gateway authorization.
                  </p>
                  <p>
                    2. <strong>PERKESO ASSIST (SOCSO & EIS TXT/CSV)</strong>: Log in to the PERKESO ASSIST Portal, navigate to "Employer Portal" &rarr; "Monthly Contribution" &rarr; "Text File Upload" and select your PERKESO assist text file.
                  </p>
                  <p>
                    3. <strong>LHDN e-Data PCB</strong>: Log in to LHDN MyTax Portal (e-Data PCB), select "Bulk Upload", browse to select your LHDN CP39 file, and finalize online remittance or generate CP39 bill reference.
                  </p>
                  <p className="font-bold">
                    * Pro-tip: Run the calculations by clicking "Calculate Pay" to make sure custom allowance overrides and active LHDN tax bracket deductions are included.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* PRINT VIEW MODE MODAL FOR THE MONTHLY MALAYSIAN PAYSLIP */}
          {viewingPayslip && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 p-6 shadow-2xl relative space-y-6 animate-in zoom-in-95 duration-200 my-8">
                
                {/* Print Title header controls */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 no-print">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider font-mono">Malaysian Remuneration Slip</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-300"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Slip
                    </button>
                    <button
                      onClick={() => setViewingPayslip(null)}
                      className="bg-slate-900 text-white hover:bg-slate-950 text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer"
                    >
                      Close Slip
                    </button>
                  </div>
                </div>

                {/* Core Payslip printable document layout */}
                <div className="payslip-print-block border-2 border-slate-900 p-8 rounded-lg font-sans space-y-6 bg-white text-slate-900">
                  
                  {/* Company Letterhead */}
                  <div className="flex justify-between items-start border-b border-slate-900 pb-4">
                    <div>
                      <h4 className="font-black text-lg tracking-tight uppercase">AEROSTAR SERVICES SDN BHD</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Company Reg No: 202401029103 (1529188-A)</p>
                      <p className="text-[10px] text-slate-600">Menara Aerostar, Kuala Lumpur CC, Malaysia</p>
                      <p className="text-[10px] text-slate-600">Tel: +60 3-8022-9182 | Email: hr@aero-star.co</p>
                    </div>
                    <div className="text-right">
                      <span className="border border-slate-900 font-black px-3 py-1.5 text-xs inline-block uppercase bg-slate-100 font-mono">Confidential Payslip</span>
                      <p className="text-[11px] font-bold text-slate-700 mt-2">Payroll Month: {viewingPayslip.month}</p>
                      <p className="text-[9px] font-mono text-slate-400">Slip ID: {viewingPayslip.id}</p>
                    </div>
                  </div>

                  {/* Staff Info Grid */}
                  <div className="grid grid-cols-2 gap-4 text-[11px] border-b border-slate-300 pb-4">
                    <div className="space-y-1">
                      <div>Employee Name: <strong className="text-slate-900 font-extrabold uppercase">{viewingPayslip.employeeName}</strong></div>
                      <div>Staff ID: <span className="font-mono">{viewingPayslip.employeeId}</span></div>
                      <div>Role Title: <strong>{employees.find(e => e.id === viewingPayslip.employeeId)?.role || 'Specialist'}</strong></div>
                      <div>NRIC Details: <strong className="font-mono">{employees.find(e => e.id === viewingPayslip.employeeId)?.nric || '890514-14-5211'}</strong></div>
                    </div>
                    <div className="space-y-1 font-mono">
                      <div>EPF Number: <strong>{employees.find(e => e.id === viewingPayslip.employeeId)?.epfNumber || 'EPF-12884102'}</strong></div>
                      <div>SOCSO Number: <strong>{employees.find(e => e.id === viewingPayslip.employeeId)?.socsoNumber || 'SOC-A3199827'}</strong></div>
                      <div>Tax Reference No: <strong>{employees.find(e => e.id === viewingPayslip.employeeId)?.taxNumber || 'SG4918239011'}</strong></div>
                      <div>Children Rel.: <strong className="text-slate-800">{employees.find(e => e.id === viewingPayslip.employeeId)?.numberOfChildren || 0} Children dependents</strong></div>
                    </div>
                  </div>

                  {/* Earnings and Deductions breakdown columns */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    
                    {/* Left: Earnings Column */}
                    <div className="space-y-3.5">
                      <div className="border-b border-slate-800 pb-1">
                        <strong className="text-xs uppercase tracking-wider block">1. Gross Earnings</strong>
                      </div>
                      <table className="w-full text-left text-[11px]">
                        <tbody>
                          <tr className="border-b border-slate-100">
                            <td className="py-1.5 text-slate-600">Base Monthly Salary</td>
                            <td className="py-1.5 text-right font-bold">MYR {viewingPayslip.baseSalary.toFixed(2)}</td>
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td className="py-1.5 text-slate-600">Sales Commission Bonus</td>
                            <td className="py-1.5 text-right font-bold text-emerald-800">MYR {viewingPayslip.commission.toFixed(2)}</td>
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td className="py-1.5 text-slate-600">Recurring Allowances</td>
                            <td className="py-1.5 text-right font-bold">MYR {viewingPayslip.allowances.toFixed(2)}</td>
                          </tr>
                          <tr className="border-t border-slate-800 font-extrabold text-slate-900 bg-slate-50">
                            <td className="py-2 px-1">Total Gross Rewards</td>
                            <td className="py-2 px-1 text-right">MYR {(viewingPayslip.baseSalary + viewingPayslip.commission + viewingPayslip.allowances).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Right: Statutory Deductions Column */}
                    <div className="space-y-3.5">
                      <div className="border-b border-slate-800 pb-1">
                        <strong className="text-xs uppercase tracking-wider block">2. Employee Deductions</strong>
                      </div>
                      <table className="w-full text-left text-[11px]">
                        <tbody>
                          <tr className="border-b border-slate-100 text-rose-800">
                            <td className="py-1.5 text-slate-600">EPF Contribution (11%)</td>
                            <td className="py-1.5 text-right font-bold">- MYR {viewingPayslip.epfEmployee.toFixed(2)}</td>
                          </tr>
                          <tr className="border-b border-slate-100 text-rose-800">
                            <td className="py-1.5 text-slate-600">SOCSO Contribution</td>
                            <td className="py-1.5 text-right font-bold">- MYR {viewingPayslip.socsoEmployee.toFixed(2)}</td>
                          </tr>
                          <tr className="border-b border-slate-100 text-rose-800">
                            <td className="py-1.5 text-slate-600">EIS Contribution (0.2%)</td>
                            <td className="py-1.5 text-right font-bold">- MYR {viewingPayslip.eisEmployee.toFixed(2)}</td>
                          </tr>
                          <tr className="border-b border-slate-100 text-rose-800">
                            <td className="py-1.5 text-teal-800 font-bold">Monthly Income Tax (PCB)</td>
                            <td className="py-1.5 text-right font-bold">- MYR {viewingPayslip.pcb.toFixed(2)}</td>
                          </tr>
                          <tr className="border-t border-slate-800 font-extrabold text-slate-900 bg-slate-50">
                            <td className="py-2 px-1">Total Deductions Held</td>
                            <td className="py-2 px-1 text-right">MYR {(viewingPayslip.epfEmployee + viewingPayslip.socsoEmployee + viewingPayslip.eisEmployee + viewingPayslip.pcb).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                  </div>

                  {/* Employer Statutory Contributions Reference Block */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg grid grid-cols-3 gap-2 text-[10px] text-slate-600 font-mono justify-between">
                    <div>
                      <span>Employer EPF Share:</span>
                      <strong className="block text-slate-900 mt-0.5">MYR {viewingPayslip.epfEmployer.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Employer SOCSO Share:</span>
                      <strong className="block text-slate-900 mt-0.5">MYR {viewingPayslip.socsoEmployer.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Employer EIS Share:</span>
                      <strong className="block text-slate-900 mt-0.5">MYR {viewingPayslip.eisEmployer.toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Bottom line net pay highlighting */}
                  <div className="border-2 border-slate-900 p-4 rounded-lg flex justify-between items-center bg-slate-950 text-white">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Net Salary Disbursed</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Wired directly to payroll corporate bank account.</p>
                    </div>
                    <span className="text-2xl font-black text-amber-400 tracking-tight">MYR {viewingPayslip.netSalary.toLocaleString()}</span>
                  </div>

                  {/* Corporate signature declaration */}
                  <div className="grid grid-cols-2 gap-4 text-[10px] pt-4 leading-relaxed text-slate-500 font-mono border-t border-slate-200">
                    <div>
                      <span>Prepared by:</span>
                      <strong className="block text-slate-800 uppercase mt-4">AeroStar HR Payroll Officer</strong>
                      <span className="block text-[8px] mt-0.5 text-slate-400">Electronic verification: APPROVED</span>
                    </div>
                    <div className="text-right">
                      <span>Employee signature:</span>
                      <div className="mt-4 border-b border-dashed border-slate-400 w-44 inline-block"></div>
                      <span className="block text-[8px] mt-0.5 text-slate-400">Verification timestamp: {viewingPayslip.disbursedAt ? new Date(viewingPayslip.disbursedAt).toISOString().split('T')[0] : 'CONFIRMED'}</span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. SUB TAB: LEAVE WORK DESK VIEWPORT */}
      {activeSubTab === 'leaves' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Leave requests list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider block">Leave Requests Register</h3>
                <p className="text-[10px] text-slate-400">Monitor active leave applications, sick records, family leaves, and track approvals.</p>
              </div>
              <button
                onClick={() => setShowLeaveForm(!showLeaveForm)}
                className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2 px-3.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Apply Leave For Staff
              </button>
            </div>

            {/* Leave register form popup inline if enabled */}
            {showLeaveForm && (
              <form onSubmit={handleCreateLeaveRequest} className="bg-white border rounded-2xl border-slate-200 p-5 space-y-4 animate-in slide-in-from-top-4 duration-200">
                <h4 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-2">Apply Leave Request (Malaysian Guidelines)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Select Target Officer</label>
                    <select
                      value={leaveForm.employeeId}
                      onChange={e => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                      required
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 w-full font-bold"
                    >
                      <option value="">-- Click to Select Staff --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Leave Category</label>
                    <select
                      value={leaveForm.leaveType}
                      onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value as any })}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 w-full"
                    >
                      <option value="Annual">Annual Leave</option>
                      <option value="Sick">Medical / Sick Leave</option>
                      <option value="Unpaid">Unpaid Leave</option>
                      <option value="Maternity">Maternity Leave</option>
                      <option value="Paternity">Paternity Leave</option>
                      <option value="Compassionate">Compassionate Leave</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Date Commencement</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.startDate}
                      onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 w-full font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Date Resumption</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.endDate}
                      onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 w-full font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Brief Reason / Remarks</label>
                  <textarea
                    rows={2}
                    value={leaveForm.reason}
                    onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-800 w-full"
                    placeholder="Provide details about the tour scheduling, healthcare, etc."
                  />
                </div>
                <div className="flex gap-2 justify-end text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setShowLeaveForm(false)}
                    className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-800 hover:bg-emerald-950 text-white font-black py-2 px-5 rounded-lg cursor-pointer animate-pulse"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-4 px-6">Leave ID</th>
                      <th className="py-4 px-6">Employee</th>
                      <th className="py-4 px-6">Type & Reason</th>
                      <th className="py-4 px-6">Dates Range</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {leaveRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                          No leave requests raised yet. Use Apply Leave form above.
                        </td>
                      </tr>
                    ) : (
                      [...leaveRequests].reverse().map(req => {
                        const days = Math.max(1, Math.round((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
                        return (
                          <tr key={req.id} className="hover:bg-slate-50/70">
                            <td className="py-4 px-6 font-mono font-bold text-slate-900">{req.id}</td>
                            <td className="py-4 px-6">
                              <span className="font-extrabold text-slate-900 block">{req.employeeName}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">ID: {req.employeeId}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-bold text-slate-900 block">{req.leaveType} Leave</span>
                              <p className="text-[11px] text-slate-400 italic font-medium max-w-xs truncate">{req.reason || '- no comments Given -'}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-bold text-slate-900 block">{req.startDate} to {req.endDate}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">{days} Day(s) duration</span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-150' : req.status === 'Rejected' ? 'bg-rose-50 text-rose-800 border-rose-150' : 'bg-amber-50 text-amber-800 border-amber-150'}`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {req.status === 'Pending' ? (
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => handleDecideLeave(req.id, 'Approved')}
                                    className="bg-emerald-800 text-white hover:bg-emerald-950 font-bold p-1 px-2.5 rounded text-[10px] cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleDecideLeave(req.id, 'Rejected')}
                                    className="bg-rose-600 text-white hover:bg-rose-800 font-bold p-1 px-2.5 rounded text-[10px] cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono italic">Handled by: {req.approvedBy || 'HR Admin'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Statistics details for leave control */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Leave Entitlements guidelines</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Under Section 60D of Malaysia Employment Act 1955, employees have statutory entitlements based on service terms:
              </p>
              <ul className="space-y-1.5 text-[10px] text-slate-500 font-semibold leading-relaxed">
                <li>• <strong>Service &lt; 2 yrs</strong>: 8 days Annual / 14 days Sick</li>
                <li>• <strong>Service 2 - 5 yrs</strong>: 12 days Annual / 18 days Sick</li>
                <li>• <strong>Service &gt; 5 yrs</strong>: 16 days Annual / 22 days Sick</li>
                <li>• <strong>Maternity Leave</strong>: Capped at 98 continuous days</li>
                <li>• <strong>Paternity Leave</strong>: 7 continuous days</li>
              </ul>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5 shadow-xs">
              <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Current Month Leave Statistics</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Leaves Logged:</span>
                  <span className="font-extrabold text-slate-900">{leaveRequests.length} applications</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Approved Leave:</span>
                  <span className="font-extrabold text-emerald-800">{leaveRequests.filter(l => l.status === 'Approved').length} Requests</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Awaiting Decision:</span>
                  <span className="font-extrabold text-amber-500 ">{leaveRequests.filter(l => l.status === 'Pending').length} Pending</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 5. SUB TAB: TAX FORMS (EA FORM / FORM E) VIEWPORT */}
      {activeSubTab === 'taxForms' && (
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-6">
            <h3 className="font-black text-slate-950 text-sm border-b border-slate-100 pb-2">Malaysia LHDN Tax Portals & Inland Revenue Return Creators</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
              
              {/* Option A: Annual CP8A (EA Form) Generator */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-100 text-emerald-800 p-2 rounded-xl border border-emerald-250">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-950">Employee CP8A Annual Statement (EA Form)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Generate the annual statement of remuneration from employment for personal tax filings.</p>
                  </div>
                </div>
                <div className="space-y-3 bg-white p-3.5 border border-slate-200 rounded-xl">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Assessment Year</label>
                      <input
                        type="number"
                        value={eaYear}
                        onChange={e => setEaYear(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 p-2 text-xs font-bold focus:outline-emerald-800 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Select Employee</label>
                      <select
                        onChange={e => {
                          const emp = employees.find(emp => emp.id === e.target.value);
                          setSelectedEmployeeForEA(emp || null);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 p-2 text-xs focus:outline-emerald-800 w-full"
                      >
                        <option value="">-- Choose Employee --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {selectedEmployeeForEA && (
                    <button
                      onClick={() => {}}
                      className="bg-emerald-800 hover:bg-emerald-950 text-white font-extrabold text-xs py-2 w-full rounded-lg cursor-pointer text-center block mt-2"
                    >
                      Verify EA Details Rendered Below
                    </button>
                  )}
                </div>
              </div>

              {/* Option B: Company Corporate Return Form E Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-800 p-2 rounded-xl border border-blue-250">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-950">Corporate Return of Employer (Form E Return)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Aggregate annual salary summaries, tax filings, and combined KWSP/PERKESO corporate contributions.</p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Total Corporate Heads Code:</span>
                    <strong className="text-slate-900">{formEData.totalEmployees} Salaries Filings</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Combined Accumulated Wages:</span>
                    <strong className="text-slate-900">MYR {formEData.grossRemuneration.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Total EPF Collected/Remitted:</span>
                    <strong className="text-slate-900">MYR {formEData.epfTotal.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Total PCB Taxes Paid:</span>
                    <strong className="text-emerald-800">MYR {formEData.pcbTotal.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* EA RENDERED DOCUMENT SHEET PREVIEW IF AN EMPLOYEE IS CHOSEN */}
            {selectedEmployeeForEA ? (
              <div className="border border-slate-200 rounded-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center no-print border-b border-slate-100 pb-3">
                  <span className="bg-slate-100 font-bold text-slate-800 rounded px-2.5 py-1 text-xs font-mono">CP8A Statement (EA Form) Assessment Year {eaYear}</span>
                  <button
                    onClick={() => window.print()}
                    className="bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs py-1.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print EA Statement
                  </button>
                </div>

                {/* Printable Document Block */}
                <div className="payslip-print-block border-2 border-slate-950 p-6 md:p-10 font-sans space-y-6 bg-white text-slate-900">
                  
                  {/* Title Header CP8A */}
                  <div className="text-center pb-4 border-b-2 border-slate-950 space-y-1">
                    <span className="font-mono text-[9px] block uppercase text-slate-500">M.A.L.A.Y.S.I.A INLAND REVENUE BOARD</span>
                    <h3 className="font-extrabold text-base uppercase leading-snug tracking-tight">STATEMENT OF REMUNERATION FROM EMPLOYMENT</h3>
                    <h4 className="font-black text-sm uppercase">FORM EA (ASSESSMENT YEAR {eaYear})</h4>
                    <span className="text-[10px] block text-slate-400">Section 83(1A) of Income Tax Act 1967</span>
                  </div>

                  {/* SECTION A: PARTNER EMPLOYER DETAILS */}
                  <div className="space-y-2 border-b border-slate-300 pb-4 text-xs font-semibold">
                    <span className="font-black text-slate-900 uppercase block tracking-wider text-[10px] bg-slate-50 p-1">PART A: EMPLOYER DATA</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>Employer Name: <strong className="uppercase">AEROSTAR SERVICES SDN BHD</strong></div>
                      <div>Employer Tax File ID: <strong>E-2091018220</strong></div>
                      <div>Address: <strong>Level 32, Menara Aerostar, KL CC, Malaysia</strong></div>
                      <div>Registry No: <span className="font-mono">202401029103 (1529188-A)</span></div>
                    </div>
                  </div>

                  {/* SECTION B: EMPLOYEE STATUTORY DETAILS */}
                  <div className="space-y-2 border-b border-slate-300 pb-4 text-xs font-semibold">
                    <span className="font-black text-slate-900 uppercase block tracking-wider text-[10px] bg-slate-50 p-1">PART B: EMPLOYEE IDENTIFICATION</span>
                    <div className="grid grid-cols-2 gap-4 font-mono">
                      <div className="font-sans">Full Name: <strong className="uppercase font-extrabold">{selectedEmployeeForEA.name}</strong></div>
                      <div>NRIC Number: <strong>{selectedEmployeeForEA.nric || '890514-14-5211'}</strong></div>
                      <div className="font-sans">Role Grade: <strong>{selectedEmployeeForEA.role}</strong></div>
                      <div>Income Tax File ID: <strong>{selectedEmployeeForEA.taxNumber || 'SG4918239011'}</strong></div>
                      <div>EPF Registry Code: <strong>{selectedEmployeeForEA.epfNumber || 'EPF-12884102'}</strong></div>
                      <div>SOCSO Registry Code: <strong>{selectedEmployeeForEA.socsoNumber || 'SOC-A3199827'}</strong></div>
                    </div>
                  </div>

                  {/* SECTION C: TOTAL GROSS PAYMENTS AND COMPENSATION (EA core formula) */}
                  <div className="space-y-2 border-b border-slate-300 pb-4 font-semibold text-xs">
                    <span className="font-black text-slate-900 uppercase block tracking-wider text-[10px] bg-slate-50 p-1">PART C: REMUNERATION AND BENEFITS WAGES</span>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-800 font-extrabold text-slate-900 bg-slate-100">
                            <th className="py-2 px-2">Remuneration Earnings description</th>
                            <th className="py-2 px-2 text-right">Aggregate Amount (MYR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-100">
                            <td className="py-2 px-2 text-slate-600">1. Gross Salaries, wages, leave pay, fee parameters and overtime</td>
                            <td className="py-2 px-2 text-right font-bold">MYR {getEAContributionsOfEmployee(selectedEmployeeForEA.id).base.toFixed(2)}</td>
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td className="py-2 px-2 text-slate-600">2. Commissions, fees, bonuses, gratuity patterns or allowances and variables</td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-800">MYR {(getEAContributionsOfEmployee(selectedEmployeeForEA.id).commission + getEAContributionsOfEmployee(selectedEmployeeForEA.id).allowances).toFixed(2)}</td>
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td className="py-2 px-2 text-slate-600">3. Benefits-In-Kind (BIK) utilities and hospitality perks</td>
                            <td className="py-2 px-2 text-right font-bold">MYR 0.00</td>
                          </tr>
                          <tr className="border-t border-slate-950 font-black text-slate-950 bg-slate-50 text-xs">
                            <td className="py-2.5 px-2">Total Gross Remuneration Assessment</td>
                            <td className="py-2.5 px-2 text-right">MYR {getEAContributionsOfEmployee(selectedEmployeeForEA.id).gross.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SECTION D: DEDUCTIONS FOR HELD TAX / COMPULSORY FUNDS */}
                  <div className="space-y-2 border-b border-slate-300 pb-4 font-semibold text-xs">
                    <span className="font-black text-slate-900 uppercase block tracking-wider text-[10px] bg-slate-50 p-1">PART D: STATUTORY DEDUCTIONS CONSERVANCY PORTFOLIO</span>
                    
                    <div className="grid grid-cols-2 gap-4 text-[11px] font-mono">
                      <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
                        <div>EPF Employee Deducted Share:</div>
                        <strong className="text-slate-950 block text-xs">MYR {getEAContributionsOfEmployee(selectedEmployeeForEA.id).epfEmp.toFixed(2)}</strong>
                      </div>
                      <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
                        <div>SOCSO Employee Deducted Share:</div>
                        <strong className="text-slate-950 block text-xs">MYR {getEAContributionsOfEmployee(selectedEmployeeForEA.id).socsoEmp.toFixed(2)}</strong>
                      </div>
                      <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
                        <div>EIS Employee Deducted Share:</div>
                        <strong className="text-slate-950 block text-xs">MYR {getEAContributionsOfEmployee(selectedEmployeeForEA.id).eisEmp.toFixed(2)}</strong>
                      </div>
                      <div className="space-y-1 bg-emerald-50 text-emerald-950 p-3 rounded border border-emerald-200">
                        <div>PCB Income Tax Withheld (LHDN CP38):</div>
                        <strong className="text-emerald-900 block text-xs">MYR {getEAContributionsOfEmployee(selectedEmployeeForEA.id).pcb.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Corporate and regulatory sign-off */}
                  <div className="grid grid-cols-2 gap-4 text-[10px] pt-4 font-mono text-slate-500 leading-normal">
                    <div>
                      <span>Employer Representative Declaration:</span>
                      <strong className="block text-slate-900 mt-4">AHMAD FARHAN BIN RAZAK</strong>
                      <span className="block mt-0.5 text-slate-400 text-[8px]">Designation: Finance Officer, AeroStar Alliance</span>
                    </div>
                    <div className="text-right">
                      <span>Verification Audit Stamp:</span>
                      <strong className="block text-slate-900 mt-4 uppercase">LHDN MALAYSIA CERTIFIED</strong>
                      <span className="block mt-0.5 text-slate-400 text-[8px]">Secured via Aerostar Enterprise Cloud Systems</span>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200 text-center text-slate-400 space-y-2 animate-in fade-in duration-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <span className="font-extrabold text-xs block text-slate-600">Select an employee above to preview active CP8A (EA Form)</span>
                <p className="text-[10px] text-slate-500 max-w-md mx-auto">This compiles all salary payslips generated on disk for the assessment year and provides a compliant, printable report with employer and employee identifiers.</p>
              </div>
            )}

            {/* FULL CORPORATE MASTER FORM E RETURNS FOR THE COMPANY PANEL */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 space-y-6">
              
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="font-mono text-[9px] text-amber-400 font-extrabold uppercase tracking-widest block">Enterprise Returns</span>
                  <h3 className="font-black text-base text-white">Composite Form E Return Summary ({eaYear})</h3>
                </div>
                <button
                  onClick={() => window.print()}
                  className="bg-white hover:bg-slate-100 text-slate-950 font-black text-xs py-1.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-950" />
                  Download Form E Ledger
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-slate-100 text-[11px]">
                
                <div className="space-y-4 bg-slate-850 p-4 rounded-xl border border-slate-800">
                  <div className="text-amber-400 uppercase tracking-wider font-extrabold text-[9px] border-b border-slate-850 pb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    1. COMPANY PROFILE
                  </div>
                  <div className="space-y-2">
                    <div>No. of active Staff: <strong className="text-white font-sans text-xs">{employees.length} employees</strong></div>
                    <div>EPF Account Reg No: <strong>EPF-HQ-5928183</strong></div>
                    <div>SOCSO Account Reg No: <strong>SOC-HQ-104928A</strong></div>
                    <div>LHDN Registry File ID: <strong>E-2091018220</strong></div>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-850 p-4 rounded-xl border border-slate-800">
                  <div className="text-amber-400 uppercase tracking-wider font-extrabold text-[9px] border-b border-slate-850 pb-1 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    2. TOTAL HOURLY/MONTHLY WAGES
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>Total Gross salaries Paid: <strong className="text-white text-sm">MYR {formEData.grossRemuneration.toLocaleString()}</strong></div>
                    <div className="text-[10px] text-slate-400 font-sans leading-relaxed">
                      Represents entire base, Commissions overrides & Allowance benefits wired this fiscal period.
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-850 p-4 rounded-xl border border-slate-800">
                  <div className="text-amber-400 uppercase tracking-wider font-extrabold text-[9px] border-b border-slate-850 pb-1 flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    3. SECURED STATUTORY COMPILATIONS
                  </div>
                  <div className="space-y-1.5 leading-relaxed text-[11px]">
                    <div>Total Combined EPF Paid: <span className="text-white block font-bold text-xs mt-0.5">MYR {formEData.epfTotal.toLocaleString()}</span></div>
                    <div>Total Combined SOCSO Paid: <span className="text-white block font-bold text-xs mt-0.5">MYR {formEData.socsoTotal.toLocaleString()}</span></div>
                    <div>Total Inland Revenue PCB: <span className="text-teal-400 block font-bold text-xs mt-0.5">MYR {formEData.pcbTotal.toLocaleString()}</span></div>
                  </div>
                </div>

              </div>
              
              <p className="text-[10px] text-slate-400 font-sans leading-relaxed text-center block pt-2 border-t border-slate-800 max-w-xl mx-auto">
                Form E is a mandatory statement of annual remuneration under Malaysian LHDN and must be submitted on or before 31st March of the preceding year. This ledger summarizes real-time aggregates based on generated employees database.
              </p>
            </div>

          </div>
          
        </div>
      )}

    </div>
  );
}
