import React, { useState } from 'react';
import { DollarSign, Trash2, Plus, Info, Globe, Coins, Percent, Save, CheckCircle, Tag, X, Building } from 'lucide-react';
import { PricingRule, HotelContract, Language } from '../types';

interface PricingSettingsProps {
  pricingRules: PricingRule[];
  hotelContracts: HotelContract[];
  onRefreshDatabase: () => Promise<void>;
  currentUserEmail: string;
}

// Global fixed conversions matching system requirements
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  MYR: 4.45,
  IDR: 15600.0,
  SGD: 1.34,
  SAR: 3.75
};

export default function PricingSettings({
  pricingRules,
  hotelContracts,
  onRefreshDatabase,
  currentUserEmail
}: PricingSettingsProps) {
  const [targetHotel, setTargetHotel] = useState<string>('All Hotels');
  const [targetRoom, setTargetRoom] = useState<'Double' | 'Triple' | 'Quad' | 'Quint' | 'Six-sharing'>('Double');
  const [targetPackage, setTargetPackage] = useState<'Room only' | 'Full Umrah package'>('Full Umrah package');
  const [rateInput, setRateInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [successNotif, setSuccessNotif] = useState(false);

  // Extract unique hotel names from contracts for selecting rules
  const uniqueHotels = Array.from(new Set(hotelContracts.map(c => c.hotelName)));

  // Rate conversions helper
  const convertMYR = (myrAmount: number, target: string): string => {
    if (!myrAmount || myrAmount <= 0) return '0.00';
    const inUSD = myrAmount / EXCHANGE_RATES.MYR;
    const result = inUSD * EXCHANGE_RATES[target];
    
    if (target === 'IDR') {
      return result.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Add rule function
  const handleAddNewRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRate = parseFloat(rateInput);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      alert("Please specify a valid numeric price greater than zero.");
      return;
    }

    // Check if duplicate rule exists
    const nextRules = [...pricingRules];
    const duplicateIdx = nextRules.findIndex(r => 
      r.hotelName === targetHotel && 
      r.roomType === targetRoom && 
      r.packageType === targetPackage
    );

    const newRule: PricingRule = {
      id: `RULE-${Date.now().toString().slice(-4)}`,
      hotelName: targetHotel,
      roomType: targetRoom,
      packageType: targetPackage,
      priceMYR: parsedRate
    };

    if (duplicateIdx !== -1) {
      // Override
      nextRules[duplicateIdx] = newRule;
    } else {
      nextRules.push(newRule);
    }

    await saveRulesToBackend(nextRules);
    setRateInput('');
  };

  // Delete rule
  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dynamic rate override? The system will immediately fall back to default hotel contract rates.")) return;
    const nextRules = pricingRules.filter(r => r.id !== id);
    await saveRulesToBackend(nextRules);
  };

  // Save list to database
  const saveRulesToBackend = async (rules: PricingRule[]) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricingRules: rules,
          authorEmail: currentUserEmail,
          authorName: 'Finance Settings Desk'
        })
      });

      if (res.ok) {
        setSuccessNotif(true);
        setTimeout(() => setSuccessNotif(false), 3000);
        await onRefreshDatabase();
      } else {
        alert("Failed to synchronize the new pricing settings onto the central database.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting the pricing controller service.");
    } finally {
      setIsSaving(false);
    }
  };

  const [aliasInputs, setAliasInputs] = useState<Record<string, string>>({});

  const handleAddAlias = async (contract: HotelContract) => {
    const text = (aliasInputs[contract.id] || '').trim();
    if (!text) return;

    const currentAliases = contract.aliases || [];
    if (currentAliases.some(a => a.toLowerCase() === text.toLowerCase())) {
      alert("This alias already exists for this hotel.");
      return;
    }

    const updatedAliases = [...currentAliases, text];
    const updatedContract = {
      ...contract,
      aliases: updatedAliases
    };

    try {
      const res = await fetch(`/api/hotel-contracts/${contract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: updatedContract,
          authorEmail: currentUserEmail,
          authorName: 'Hotel Directory Settings'
        })
      });

      if (res.ok) {
        setAliasInputs(prev => ({ ...prev, [contract.id]: '' }));
        await onRefreshDatabase();
      } else {
        alert("Failed to save alias to server.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error updating hotel aliases.");
    }
  };

  const handleClearAlias = async (contract: HotelContract, aliasToRemove: string) => {
    const currentAliases = contract.aliases || [];
    const updatedAliases = currentAliases.filter(a => a !== aliasToRemove);
    const updatedContract = {
      ...contract,
      aliases: updatedAliases
    };

    try {
      const res = await fetch(`/api/hotel-contracts/${contract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: updatedContract,
          authorEmail: currentUserEmail,
          authorName: 'Hotel Directory Settings'
        })
      });

      if (res.ok) {
        await onRefreshDatabase();
      } else {
        alert("Failed to remove alias from server.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error removing hotel alias.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic price override matrix form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: Add parameters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs h-fit">
          <div>
            <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-4 h-4 text-emerald-800" />
              Contract override matrix
            </h3>
            <p className="text-[10px] text-slate-500">Configure custom dynamic margins or overrides to supersede default contract rates.</p>
          </div>

          <form onSubmit={handleAddNewRule} className="space-y-3.5 pt-2">
            
            {/* Hotel context selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-450 uppercase tracking-wide block">Select target hotel</label>
              <select
                value={targetHotel}
                onChange={(e) => setTargetHotel(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-800 outline-hidden cursor-pointer"
              >
                <option value="All Hotels">All Hotels (Global Uniform Override)</option>
                {uniqueHotels.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Room type selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-450 uppercase tracking-wide block">Room allotment type</label>
              <select
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value as any)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-800 outline-hidden cursor-pointer"
              >
                <option value="Double">Double Room (2 pax)</option>
                <option value="Triple">Triple Room (3 pax)</option>
                <option value="Quad">Quad Room (4 pax)</option>
                <option value="Quint">Quint Room (5 pax)</option>
                <option value="Six-sharing">Six-sharing Room (6 pax)</option>
              </select>
            </div>

            {/* Package scope */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-450 uppercase tracking-wide block">Umrah Package Context</label>
              <select
                value={targetPackage}
                onChange={(e) => setTargetPackage(e.target.value as any)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-800 outline-hidden cursor-pointer"
              >
                <option value="Room only">Room Only Booking</option>
                <option value="Full Umrah package">Full Umrah Package (Hotel + Tour Transport)</option>
              </select>
            </div>

            {/* Custom overridden rate block */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-450 uppercase tracking-wide block">Dynamic Rate Target (MYR per room/night)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-extrabold text-xs">MYR</span>
                <input
                  type="number"
                  placeholder="e.g. 520"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full text-xs font-bold pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-800 focus:bg-white outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Live translation previews */}
            {rateInput && parseFloat(rateInput) > 0 && (
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-150 space-y-1.5 animate-in fade-in duration-250">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                  <Coins className="w-3 h-3 text-emerald-800" /> Regional equivalents:
                </span>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                  <div className="bg-white p-1.5 border border-emerald-100 rounded text-center">
                    <strong className="block text-emerald-800">SAR</strong>
                    <span>{convertMYR(parseFloat(rateInput), 'SAR')}</span>
                  </div>
                  <div className="bg-white p-1.5 border border-emerald-100 rounded text-center">
                    <strong className="block text-emerald-800">SGD</strong>
                    <span>{convertMYR(parseFloat(rateInput), 'SGD')}</span>
                  </div>
                  <div className="bg-white p-1.5 border border-emerald-100 rounded text-center">
                    <strong className="block text-emerald-800">IDR</strong>
                    <span>Rp {convertMYR(parseFloat(rateInput), 'IDR')}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2 bg-emerald-850 hover:bg-emerald-900 disabled:opacity-45 text-white text-xs font-black rounded-xl shadow-xs transition-transform cursor-pointer select-none active:scale-[0.98]"
            >
              {isSaving ? "Applying update..." : "Publish Rate Override"}
            </button>

          </form>
        </div>

        {/* Right pane: List active rules */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-emerald-800" />
                Active dynamic pricing matrix
              </h3>
              <p className="text-[10px] text-slate-500">Live override policies immediately supersede contractual base calculations upon new invoice generation.</p>
            </div>
            {successNotif && (
              <span id="rate_notif_success" className="text-[10px] text-emerald-800 bg-emerald-50 font-bold px-3 py-1 border border-emerald-200 rounded-lg flex items-center gap-1 animate-in slide-in-from-right-1">
                <CheckCircle className="w-3 h-3" /> Rates Synchronized
              </span>
            )}
          </div>

          {pricingRules.length === 0 ? (
            <div className="border border-slate-150 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-2">
              <Info className="w-6 h-6 text-slate-350" />
              <div>
                <strong className="text-slate-800 text-xs font-bold block">No dynamic price overrides configured</strong>
                <span className="text-[10px] text-slate-450 block mt-1">All booking transactions currently default strictly to fallback contract nightly rates.</span>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-[380px] overflow-y-auto">
              <table className="w-full text-xs font-sans text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-650 text-[10px] font-bold uppercase">
                    <th className="p-3">Target Scope (Hotel)</th>
                    <th className="p-3">Room Type</th>
                    <th className="p-3">Package Category</th>
                    <th className="p-3 text-right">MYR Target</th>
                    <th className="p-3 text-center">Multi-Currency Guides</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {pricingRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <strong className="text-slate-800 block text-xs">{rule.hotelName}</strong>
                        {rule.hotelName === 'All Hotels' && <span className="text-[9px] text-emerald-800 uppercase font-black block">Uniform fallback policy</span>}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.8 rounded text-[10px] font-mono">
                          {rule.roomType}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-600">{rule.packageType}</td>
                      <td className="p-3 text-right font-black text-emerald-850">
                        MYR {rule.priceMYR.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center text-[9px] font-mono font-medium">
                          <span className="bg-slate-105 border border-slate-200 px-1 py-0.5 rounded text-slate-600">SAR {convertMYR(rule.priceMYR, 'SAR')}</span>
                          <span className="bg-slate-105 border border-slate-200 px-1 py-0.5 rounded text-slate-600">SGD {convertMYR(rule.priceMYR, 'SGD')}</span>
                          <span className="bg-slate-105 border border-slate-200 px-1 py-0.5 rounded text-slate-600">IDR {convertMYR(rule.priceMYR, 'IDR')}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-transform hover:scale-105 cursor-pointer"
                          title="Delete pricing overriding policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

      {/* Hotel Settings & Alternative Name Aliases */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
            <Building className="w-4 h-4 text-emerald-800" />
            Hotel Directory & Alternative Name Aliases (Hotel Settings)
          </h3>
          <p className="text-[10px] text-slate-500">Configure alternative spelling names or abbreviations (aliases) for each hotel. This is used by the Excel/CSV importer to handle extra spaces, casing variations, or alternative name conventions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hotelContracts.map((contract) => (
            <div key={contract.id} id={`alias-card-${contract.id}`} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs">{contract.hotelName}</h4>
                  <span className="text-[9px] text-slate-450 font-mono font-bold block mt-0.5">ID: {contract.id} | Location: {contract.location}</span>
                </div>
              </div>

              {/* Badges of Existing Aliases */}
              <div className="flex flex-wrap gap-1.5 min-h-[1.5rem] pt-1">
                {(contract.aliases || []).length === 0 ? (
                  <span className="text-[9px] text-slate-400 italic">No alternative name aliases configured yet. Default spelling required.</span>
                ) : (
                  (contract.aliases || []).map((alias) => (
                    <span 
                      key={alias}
                      className="bg-emerald-50 text-emerald-8 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-200/50 flex items-center gap-1 animate-in fade-in zoom-in-95"
                    >
                      <Tag className="w-2.5 h-2.5 text-emerald-600" />
                      {alias}
                      <button
                        onClick={() => handleClearAlias(contract, alias)}
                        className="text-red-500 hover:text-red-700 hover:bg-slate-200 rounded p-0.5 cursor-pointer ml-0.5"
                        title="Remove alias"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add alias (e.g. Anjum, Pullman)"
                  value={aliasInputs[contract.id] || ''}
                  onChange={(e) => setAliasInputs(prev => ({ ...prev, [contract.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAlias(contract);
                    }
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-medium grow focus:outline-emerald-800"
                />
                <button
                  type="button"
                  onClick={() => handleAddAlias(contract)}
                  className="bg-emerald-800 hover:bg-emerald-950 text-white px-2.5 py-1 text-[10px] font-extrabold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
