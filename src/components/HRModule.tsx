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
  Clock 
} from 'lucide-react';
import { Employee, Language } from '../types';
import { TRANSLATIONS } from '../Translations';

interface HRModuleProps {
  employees: Employee[];
  lang: Language;
  onAddEmployee: (employee: Partial<Employee>) => Promise<void>;
  onUpdateAttendance: (id: string, status: 'Present' | 'On Leave' | 'Absent') => Promise<void>;
}

export default function HRModule({
  employees,
  lang,
  onAddEmployee,
  onUpdateAttendance
}: HRModuleProps) {
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
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

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
                          e.role.toLowerCase().includes(search.toLowerCase()) || 
                          e.email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const presentCount = employees.filter(e => e.attendanceToday === 'Present').length;
  const leaveCount = employees.filter(e => e.attendanceToday === 'On Leave').length;
  const totalPayroll = employees.reduce((sum, e) => sum + e.baseSalaryMYR + e.commissionEarnedMYR, 0);

  return (
    <div className="space-y-6">
      
      {/* Header desk */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{t('hr')}</h2>
          <p className="text-xs text-slate-500">Monitor centralized corporate agents, payroll systems, and check lobby attendance statuses.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('addEmployee')}
        </button>
      </div>

      {/* KPI Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Lobby Attendance Today</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">{presentCount} / {employees.length} Active Staff</span>
            <span className="text-[10px] text-slate-500 block">Status: {leaveCount} Officers On Leave</span>
          </div>
          <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-100 text-emerald-705 shrink-0">
            <UserCheck className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Monthly Payroll Cost</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              MYR {totalPayroll.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block">Includes base and variables</span>
          </div>
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-150 text-slate-700 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl p-5 border border-slate-850 shadow-sm text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">Central HQ Location</span>
            <span className="text-sm font-extrabold text-white block mt-1 leading-snug">Menara Aerostar, KL CC</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Dual-Currency Singapore / Jakarta desks</span>
          </div>
          <div className="bg-slate-800 text-amber-400 p-3 rounded-xl border border-slate-700 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Add Employee Form */}
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
              className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-650 cursor-pointer text-slate-500"
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

      {/* Roster & Attendance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Central Employees list stats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">{t('salaryCalculation')}</h3>
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
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
                    <th className="py-4 px-6 text-right">Base Salary</th>
                    <th className="py-4 px-6 text-right">Quotas / {t('commissionEarned')}</th>
                    <th className="py-4 px-6 text-right">Net Compensation (MYR)</th>
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
                    filteredEmployees.map(e => {
                      const netComp = e.baseSalaryMYR + e.commissionEarnedMYR;
                      return (
                        <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-extrabold text-slate-900 text-sm block">{e.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{e.email} | {e.phone}</span>
                            <span className="text-[9px] font-mono text-slate-400 mt-1 block">Contract Hired: {e.joiningDate}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              e.role === 'Admin' ? 'bg-slate-900 text-white' :
                              e.role === 'Finance' ? 'bg-blue-55 text-blue-900 border-blue-150' :
                              e.role === 'Sales' ? 'bg-emerald-50 text-emerald-850 border-emerald-100 font-extrabold' : 'bg-slate-100 text-slate-650'
                            }`}>
                              {e.role}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-semibold">
                            MYR {e.baseSalaryMYR.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-right font-medium text-slate-600">
                            {e.commissionPercentage > 0 ? (
                              <>
                                <span className="font-bold text-emerald-800">MYR {e.commissionEarnedMYR.toLocaleString()}</span>
                                <span className="text-[9px] text-slate-400 block">Rate: {e.commissionPercentage}% volume</span>
                              </>
                            ) : (
                              <span className="text-slate-400 font-normal italic">- N/A -</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right font-black text-slate-900">
                            MYR {netComp.toLocaleString()}
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

        {/* Attendance clicker list */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-800" />
              {t('attendance')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Toggle daily attendance status to log into centralized operations audit trackers.</p>
          </div>

          <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
            {employees.map(e => (
              <div key={e.id} className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded-xl p-3.5 transition-all hover:border-slate-300">
                <div>
                  <span className="font-black text-slate-900 text-xs block leading-tight">{e.name}</span>
                  <span className="text-[9px] text-slate-500 font-semibold">{e.role}</span>
                </div>
                
                {/* Selector */}
                <div className="flex gap-1.5 font-mono text-[9px] font-black">
                  <button
                    onClick={() => onUpdateAttendance(e.id, 'Present')}
                    className={`px-2 py-1 rounded cursor-pointer ${e.attendanceToday === 'Present' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >
                    P
                  </button>
                  <button
                    onClick={() => onUpdateAttendance(e.id, 'On Leave')}
                    className={`px-2 py-1 rounded cursor-pointer ${e.attendanceToday === 'On Leave' ? 'bg-amber-500 text-slate-950' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => onUpdateAttendance(e.id, 'Absent')}
                    className={`px-2 py-1 rounded cursor-pointer ${e.attendanceToday === 'Absent' ? 'bg-rose-500 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}
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
            <span>A: Absent / Off-Duty</span>
          </div>
        </div>

      </div>

    </div>
  );
}
