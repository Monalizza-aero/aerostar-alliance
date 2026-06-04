import React, { useState } from 'react';
import { 
  Users, 
  MapPin, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Trash2, 
  Plus, 
  UserX, 
  Group, 
  CheckSquare, 
  HelpCircle 
} from 'lucide-react';
import { PilgrimRoomingItem, BookingItem, Language } from '../types';
import { TRANSLATIONS } from '../Translations';

interface RoomingModuleProps {
  bookings: BookingItem[];
  lang: Language;
}

export default function RoomingModule({
  bookings,
  lang
}: RoomingModuleProps) {
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  // Initial local mock state for the check-in rooming list, prefilled with the user's specific scenario.
  const [pilgrims, setPilgrims] = useState<PilgrimRoomingItem[]>([
    {
      id: 'PIL-101',
      name: 'Ahmad bin Subarjo',
      gender: 'Male',
      agencyId: 'B2B-101',
      agencyName: 'Nusantara Umrah Services Jakarta',
      groupName: 'Batch A - Java Tour Leader Husni',
      bookingId: 'BK-1002',
      bookingDetails: 'Swissôtel Makkah (Quad)',
      plannedRoomNo: '402',
      actualRoomNo: '402',
      status: 'Checked-In',
      notes: 'Lobby bag labels marked. Cleared immigration.'
    },
    {
      id: 'PIL-102',
      name: 'Hajah Siti Aminah',
      gender: 'Female',
      agencyId: 'B2B-101',
      agencyName: 'Nusantara Umrah Services Jakarta',
      groupName: 'Batch A - Java Tour Leader Husni',
      bookingId: 'BK-1002',
      bookingDetails: 'Swissôtel Makkah (Quad)',
      plannedRoomNo: '402',
      actualRoomNo: '408', // DISCREPANCY! Same agency but different group block swapped keys at the counter!
      status: 'RoomMismatched',
      notes: 'Assigned to room 408 at reception desk due to physical wheelchair corridor width request.'
    },
    {
      id: 'PIL-103',
      name: 'Yusuf Widodo',
      gender: 'Male',
      agencyId: 'B2B-101',
      agencyName: 'Nusantara Umrah Services Jakarta',
      groupName: 'Batch B - Java Leader Amin', // Different group same agency!
      bookingId: 'BK-1002',
      bookingDetails: 'Swissôtel Makkah (Quad)',
      plannedRoomNo: '405',
      actualRoomNo: '405',
      status: 'Checked-In',
      notes: 'Standard checking.'
    },
    {
      id: 'PIL-104',
      name: 'Melati binti Siregar',
      gender: 'Female',
      agencyId: 'B2B-101',
      agencyName: 'Nusantara Umrah Services Jakarta',
      groupName: 'Batch B - Java Leader Amin', // Different group same agency!
      bookingId: 'BK-1002',
      bookingDetails: 'Swissôtel Makkah (Quad)',
      plannedRoomNo: '405',
      actualRoomNo: '412', // DISCREPANCY! Double booking room overlap.
      status: 'RoomMismatched',
      notes: 'Hotel reception changed room to 412 because Batch B female wing in fourth floor was overbooked.'
    },
    {
      id: 'PIL-105',
      name: 'Haji Sulaiman Abdul Rahman',
      gender: 'Male',
      agencyId: 'B2B-102',
      agencyName: 'Al-Madinah Travel Singapore Pte Ltd',
      groupName: 'VIP Singapore Tour',
      bookingId: 'BK-1003',
      bookingDetails: 'Fairmont Makkah (Double)',
      plannedRoomNo: '1202',
      actualRoomNo: '1202',
      status: 'Checked-In',
      notes: 'VIP check-in expedited.'
    },
    {
      id: 'PIL-110',
      name: 'Kamal Azman Ghani',
      gender: 'Male',
      agencyId: 'B2C',
      agencyName: 'Aerostar Direct B2C',
      groupName: 'KL Core Tour 1',
      bookingId: 'BK-1001',
      bookingDetails: 'Pullman Zamzam Makkah',
      plannedRoomNo: '811',
      actualRoomNo: '', // Waiting physical check-in
      status: 'Pre-Assigned',
      notes: 'Flight expected to arrive at King Abdulaziz Intl Jeddah around 18:00.'
    }
  ]);

  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'RoomMismatched' | 'Checked-In' | 'Pre-Assigned'>('All');

  // New Pilgrim input state
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<Partial<PilgrimRoomingItem>>({
    name: '',
    gender: 'Male',
    agencyName: 'Nusantara Umrah Services Jakarta',
    groupName: 'Batch A - Java Tour Leader Husni',
    bookingId: '',
    plannedRoomNo: '',
    actualRoomNo: '',
    notes: ''
  });

  const handleCreatePilgrim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.groupName) {
      alert("Name and Tour Group designation are required.");
      return;
    }

    const b = bookings.find(x => x.id === form.bookingId) || bookings[0];

    let computedStatus: PilgrimRoomingItem['status'] = 'Pre-Assigned';
    if (form.actualRoomNo) {
      if (form.plannedRoomNo && form.actualRoomNo !== form.plannedRoomNo) {
        computedStatus = 'RoomMismatched';
      } else {
        computedStatus = 'Checked-In';
      }
    }

    const newP: PilgrimRoomingItem = {
      id: `PIL-${Date.now().toString().slice(-4)}`,
      name: form.name!,
      gender: form.gender! as any,
      agencyId: b ? (b.b2bAgentId || 'B2C') : 'B2C',
      agencyName: b ? (b.b2bAgentName || 'Aerostar Direct B2C') : 'Aerostar Direct B2C',
      groupName: form.groupName!,
      bookingId: b ? b.id : 'BK-GENERAL',
      bookingDetails: b ? `${b.hotelMakkah} (${b.packageName})` : 'General Hotel Block',
      plannedRoomNo: form.plannedRoomNo || 'TBD',
      actualRoomNo: form.actualRoomNo || '',
      status: computedStatus,
      notes: form.notes || ''
    };

    setPilgrims([...pilgrims, newP]);
    setShowAddForm(false);
    setForm({
      name: '',
      gender: 'Male',
      agencyName: 'Nusantara Umrah Services Jakarta',
      groupName: 'Batch A - Java Tour Leader Husni',
      bookingId: '',
      plannedRoomNo: '',
      actualRoomNo: '',
      notes: ''
    });
  };

  const handleSyncRoom = (id: string, preferred: 'planned' | 'actual') => {
    setPilgrims(prev => prev.map(p => {
      if (p.id === id) {
        const syncedRoom = preferred === 'planned' ? p.plannedRoomNo : p.actualRoomNo;
        return {
          ...p,
          plannedRoomNo: syncedRoom,
          actualRoomNo: syncedRoom,
          status: 'Checked-In' as const,
          notes: `${p.notes ? p.notes + ' | ' : ''}Aligned rooming lists to checked-in Key ${syncedRoom}.`
        };
      }
      return p;
    }));
  };

  const updateRoomVal = (id: string, field: 'plannedRoomNo' | 'actualRoomNo', val: string) => {
    setPilgrims(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: val };
        if (!updated.actualRoomNo) {
          updated.status = 'Pre-Assigned';
        } else if (updated.actualRoomNo === updated.plannedRoomNo) {
          updated.status = 'Checked-In';
        } else {
          updated.status = 'RoomMismatched';
        }
        return updated;
      }
      return p;
    }));
  };

  const deletePilgrim = (id: string) => {
    setPilgrims(prev => prev.filter(p => p.id !== id));
  };

  const filtered = pilgrims.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.groupName.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = filterGroup === 'All' ? true : p.groupName === filterGroup;
    const matchesStatus = filterStatus === 'All' ? true : p.status === filterStatus;
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const uniqueGroups = Array.from(new Set(pilgrims.map(p => p.groupName)));
  const totalMismatches = pilgrims.filter(p => p.status === 'RoomMismatched').length;

  return (
    <div className="space-y-6">
      
      {/* Header desk */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Rooming List & Check-in Desk</h2>
          <p className="text-xs text-slate-500">Audit and resolve spatial room mismatches triggered when keys are assigned to differing groups of the same partner agency.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Assign Pilgrim to Rooming List
        </button>
      </div>

      {/* Mismatch Alert Box */}
      {totalMismatches > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-4 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-amber-955 text-sm">Discrepancy Warning: {totalMismatches} Rooms Swapped during Hotel Check-In</h4>
            <p className="text-xs text-amber-900 leading-relaxed max-w-4xl">
              Our auditor has flagged <strong>{totalMismatches} pilgrims</strong> belonging to the same agency but different travel batches/groups whose pre-arranged room keys do not align with physical check-in cards at Saudi Arabia desks. Verify with hotel counter team and hit <strong>"Sync Room"</strong> to correct.
            </p>
          </div>
        </div>
      )}

      {/* Roster form drawer */}
      {showAddForm && (
        <form onSubmit={handleCreatePilgrim} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-800" />
            Establish Pre-Check-in Room Allocation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-505 uppercase">Pilgrim Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
                placeholder="e.g. Haji Ahmad Fauzi"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Gender Roster Status</label>
              <select
                value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value as any })}
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full font-bold"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Hotel Room Booking Block Reference</label>
              <select
                value={form.bookingId}
                onChange={e => setForm({ ...form, bookingId: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full font-bold"
              >
                <option value="">-- Choose Hotel Block --</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>{b.hotelMakkah} ({b.id} - {b.packageName})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-505 uppercase">Tour Group / Batch Name</label>
              <input
                type="text"
                value={form.groupName}
                onChange={e => setForm({ ...form, groupName: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full font-semibold"
                placeholder="e.g. Batch A - Selangor Leader"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Pre-Planned Room Number (Roster)</label>
              <input
                type="text"
                value={form.plannedRoomNo}
                onChange={e => setForm({ ...form, plannedRoomNo: e.target.value })}
                required
                placeholder="e.g. 402"
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Actual Assigned Room Number (Counters)</label>
              <input
                type="text"
                value={form.actualRoomNo}
                onChange={e => setForm({ ...form, actualRoomNo: e.target.value })}
                placeholder="Leave blank if pre-check-in phase"
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full font-mono font-bold text-emerald-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Roster Remarks / Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Wheelchair, double bed setups..."
                className="bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-emerald-800 w-full"
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
              Register on Roster
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pilgrim name or batch leader..."
            className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-emerald-800"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-emerald-800 Grow"
          >
            <option value="All">All Tour Batches ({uniqueGroups.length})</option>
            {uniqueGroups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-emerald-800 Grow"
          >
            <option value="All">All Status Check</option>
            <option value="RoomMismatched">⚠️ Room Mismatch Discrepancies</option>
            <option value="Checked-In">🟢 Success Checked-In</option>
            <option value="Pre-Assigned">🔵 Pre-CheckIn phase</option>
          </select>
        </div>
      </div>

      {/* Pilgrim List containing dynamic room edit inputs */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Pilgrim ID</th>
                <th className="py-4 px-6">Pilgrim Particulars & Batch Group</th>
                <th className="py-4 px-6 text-center">Planned Room</th>
                <th className="py-4 px-6 text-center">Actual CheckIn Room</th>
                <th className="py-4 px-6 text-center">Roster Audit Status</th>
                <th className="py-4 px-6 text-right">Audit Conflict Resolution Desk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No matching pilgrim rosters found in segment.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-500">
                      {p.id}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-extrabold text-slate-900 text-sm block">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Gender: {p.gender} | Contract Agent: {p.agencyName}</span>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="bg-slate-100 text-slate-700 font-bold text-[9px] px-2 py-0.5 rounded-sm border border-slate-200">
                          {p.groupName}
                        </span>
                        <span className="bg-blue-50 text-blue-800 font-semibold text-[9px] px-2 py-0.5 rounded-sm border border-blue-100">
                          {p.bookingDetails}
                        </span>
                      </div>
                      {p.notes && (
                        <p className="border border-slate-150 bg-slate-50 p-1 rounded-sm text-[10px] text-slate-450 italic mt-1.5 max-w-sm">
                          Notes: {p.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {/* Direct update input */}
                      <input
                        type="text"
                        value={p.plannedRoomNo}
                        onChange={e => updateRoomVal(p.id, 'plannedRoomNo', e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-1 text-center w-16 text-xs font-mono font-bold focus:outline-emerald-800"
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
                      {/* Direct update input */}
                      <input
                        type="text"
                        value={p.actualRoomNo}
                        onChange={e => updateRoomVal(p.id, 'actualRoomNo', e.target.value)}
                        placeholder="Waiting"
                        className="bg-white border border-slate-200 rounded-lg p-1 text-center w-16 text-xs font-mono font-bold focus:outline-emerald-800 text-emerald-900 placeholder:text-slate-400 uppercase"
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center">
                        {p.status === 'Checked-In' && (
                          <span className="bg-emerald-50 border border-emerald-250 text-emerald-850 px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-700" /> Matches OK
                          </span>
                        )}
                        {p.status === 'RoomMismatched' && (
                          <span className="bg-rose-50 border border-rose-220 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" /> Swapped Mismatch
                          </span>
                        )}
                        {p.status === 'Pre-Assigned' && (
                          <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            Pre-Arrival
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {p.status === 'RoomMismatched' ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleSyncRoom(p.id, 'planned')}
                            className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer text-nowrap"
                            title="Force planned roster room as actual room"
                          >
                            Sync to Planned
                          </button>
                          <button
                            onClick={() => handleSyncRoom(p.id, 'actual')}
                            className="bg-emerald-850 text-white hover:bg-emerald-950 text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer text-nowrap"
                            title="Force actual checked-in room as roster room"
                          >
                            Sync to Checked-In
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => deletePilgrim(p.id)}
                            className="text-slate-400 hover:text-rose-700 p-1 rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
