import React, { useState, useEffect } from 'react';
import ImportExportManager from './ImportExportManager';
import PricingSettings from './PricingSettings';
import DailyUsageDashboard from './DailyUsageDashboard';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Check, 
  AlertTriangle, 
  Plane, 
  Building, 
  PlusCircle, 
  FileText, 
  Calendar, 
  User, 
  CheckCircle2, 
  MapPin, 
  DollarSign,
  Utensils,
  BarChart3,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  ShieldCheck,
  Percent,
  TrendingUp,
  Download
} from 'lucide-react';
import { BookingItem, B2BPartner, Supplier, Language, HotelContract, RoomAllocation, MealsConfig, AdditionalService, PricingRule } from '../types';
import { TRANSLATIONS } from '../Translations';

interface BookingModuleProps {
  bookings: BookingItem[];
  partners: B2BPartner[];
  suppliers: Supplier[];
  hotelContracts: HotelContract[];
  pricingRules: PricingRule[];
  lang: Language;
  onSaveBooking: (booking: Partial<BookingItem>, id?: string) => Promise<void>;
  onDeleteBooking: (id: string) => Promise<void>;
  onRefreshDatabase: () => Promise<void>;
  currentUserEmail: string;
  currentUserName: string;
}

const PACKAGE_TEMPLATES = [
  { name: "Premium Royal Umrah 1447H", baseCostMYR: 9500 },
  { name: "Standard Ekonomi Umrah 1447H", baseCostMYR: 7000 },
  { name: "Custom Executive Umrah Package", baseCostMYR: 15000 },
  { name: "Historical Jordan & Saudi Tour", baseCostMYR: 12000 }
];

const PREDEFINED_SERVICES = [
  { name: "VIP Airport Meet & Greet", defaultCostMYR: 250, description: "Fast track assistance and porter services at Terminal" },
  { name: "Private GMC Transfer Upgrade", defaultCostMYR: 1200, description: "Luxury private transfers across Haramain routes" },
  { name: "Taif Day Tour & Cable Car", defaultCostMYR: 350, description: "Historical guides, fruit market lunch & mountain cables" },
  { name: "Express Visa Stamp Assistance", defaultCostMYR: 180, description: "Expedited Saudi biometric data & Muassasah approval" },
  { name: "Special Diet Malaysian Catering (Extra)", defaultCostMYR: 150, description: "Daily herbal preparations and specific soft diets" }
];

const MEAL_PACKAGES = [
  { name: "Full Board Malaysian Buffet", defaultPrice: 110, description: "Standard Breakfast, Lunch & Dinner by Malaysian chefs" },
  { name: "Half Board Arabic Fusion", defaultPrice: 85, description: "Mid-day breakfast & dinner offering local Mandi/Kabsah" },
  { name: "VIP Executive Hotel Catering", defaultPrice: 220, description: "High-tier custom hotel banquet with premium dietary options" },
  { name: "Custom Board Plan", defaultPrice: 40, description: "Manual base rate configuration per meal segment" }
];

const EXCHANGE_RATES = {
  MYR: 1.0,
  SGD: 3.3,
  SAR: 1.2,
  IDR: 0.0003
};

export default function BookingModule({
  bookings,
  partners,
  suppliers,
  hotelContracts,
  pricingRules,
  lang,
  onSaveBooking,
  onDeleteBooking,
  onRefreshDatabase,
  currentUserEmail,
  currentUserName
}: BookingModuleProps) {
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  // Primary Workspace tab: 'list' (manage bookings & create/edit form), 'inventory' (view hotel contracted capacity), 'reports' (reservation reports)
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'inventory' | 'daily_usage' | 'settings' | 'reports'>('list');

  // Search/Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Form states and switches
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState<Partial<BookingItem>>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    aeroRef: '',
    bookingType: 'Umrah Package',
    packageName: PACKAGE_TEMPLATES[0].name,
    paxCount: 2,
    travelDateFrom: new Date().toISOString().split('T')[0],
    travelDateTo: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'MYR',
    totalAmount: PACKAGE_TEMPLATES[0].baseCostMYR * 2,
    bookingStatus: 'Draft',
    hotelSelectionType: 'Full Umrah Package',
    hotelMakkah: 'Pullman Zamzam Makkah',
    hotelMadinah: 'Anwar Al Madinah Mövenpick',
    transportType: 'Haramain High Speed Train (Business Class)',
    extraServices: [],
    b2bAgentId: '',
    b2bAgentName: '',
    supplierCostMYR: 6000,
    supplierId: suppliers[0]?.id || '',
    notes: '',
    roomAllocations: [
      { roomType: 'Double', count: 1, capacity: 2, ratePerRoom: 450 },
      { roomType: 'Triple', count: 0, capacity: 3, ratePerRoom: 550 },
      { roomType: 'Quad', count: 0, capacity: 4, ratePerRoom: 650 },
      { roomType: 'Quint', count: 0, capacity: 5, ratePerRoom: 750 },
      { roomType: 'Six-sharing', count: 0, capacity: 6, ratePerRoom: 850 }
    ],
    mealsConfig: {
      breakfast: true,
      lunch: true,
      dinner: true,
      customPackageName: 'Full Board Malaysian Buffet',
      pricePerMeal: 35,
      totalCost: 110 * 2 * 10
    },
    customServices: []
  });

  // Services manual adders
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState<string>('Custom Manual entry');
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState<number>(100);
  const [customServiceNotes, setCustomServiceNotes] = useState('');

  // Reporting filters
  const [reportLocation, setReportLocation] = useState<'All' | 'Makkah' | 'Madinah'>('All');
  const [reportHotel, setReportHotel] = useState<string>('All');
  const [reportStart, setReportStart] = useState<string>('2026-01-01');
  const [reportEnd, setReportEnd] = useState<string>('2026-12-31');

  // Load relevant hotel contracts list from server contracts
  const makkahHotels = hotelContracts.filter(c => c.location === 'Makkah');
  const madinahHotels = hotelContracts.filter(c => c.location === 'Madinah');

  // Derived helper: Calculate client travel nights
  const getTravelNights = (from: string, to: string) => {
    if (!from || !to) return 1;
    const diff = new Date(to).getTime() - new Date(from).getTime();
    const nights = Math.round(diff / (1000 * 60 * 60 * 24));
    return Math.max(1, nights);
  };

  const currentNightsCount = getTravelNights(form.travelDateFrom || '', form.travelDateTo || '');

  // Bed details helper sum
  const getBeddingCapacitySum = (allocations?: RoomAllocation[]) => {
    return allocations?.reduce((acc, alloc) => acc + (alloc.count * alloc.capacity), 0) || 0;
  };

  const currentBeddingSumCapacity = getBeddingCapacitySum(form.roomAllocations);

  // Recalculator engine for cost matrices (Lodging + Meals + Services in MYR, then converted)
  const calculateTotalBookingAmount = (currentForm: Partial<BookingItem>) => {
    const nights = getTravelNights(currentForm.travelDateFrom || '', currentForm.travelDateTo || '');
    const pax = currentForm.paxCount || 1;
    const rateToConvert = EXCHANGE_RATES[currentForm.currency as keyof typeof EXCHANGE_RATES] || 1.0;

    // 1. Bedding Sum
    const beddingMYR = currentForm.roomAllocations?.reduce((acc, alloc) => {
      // Find matching contracts if any to get true pricing
      return acc + (alloc.count * alloc.ratePerRoom * nights);
    }, 0) || 0;

    // 2. Meal Plan Sum
    let mealsMYR = 0;
    if (currentForm.mealsConfig) {
      const meal = currentForm.mealsConfig;
      if (meal.breakfast || meal.lunch || meal.dinner) {
        let activeMeals = 0;
        if (meal.breakfast) activeMeals++;
        if (meal.lunch) activeMeals++;
        if (meal.dinner) activeMeals++;

        const baseTotalMealsCount = activeMeals * pax * nights;
        const totalMealsCount = meal.overrideCount !== undefined ? meal.overrideCount : baseTotalMealsCount;
        mealsMYR = totalMealsCount * meal.pricePerMeal;
      }
    }

    // 3. Additional Services Sum
    const servicesMYR = currentForm.customServices?.reduce((acc, s) => acc + s.cost, 0) || 0;

    // Sum up direct costs
    const finalMYR = beddingMYR + mealsMYR + servicesMYR;
    const convertedAmount = Math.round(finalMYR / rateToConvert);

    // Estimate supplier baseline cost (as 70% of total amount in MYR)
    const supplierCost = Math.round(finalMYR * 0.7);

    return {
      ...currentForm,
      supplierCostMYR: supplierCost,
      totalAmount: finalMYR > 0 ? convertedAmount : (PACKAGE_TEMPLATES.find(p => p.name === currentForm.packageName)?.baseCostMYR || 5000) * pax,
      mealsConfig: currentForm.mealsConfig ? {
        ...currentForm.mealsConfig,
        totalCost: mealsMYR
      } : undefined
    };
  };

  // When hotel selection or room allocation types change, update the contract rates
  const runHotelSelectionRatesSync = (currentForm: Partial<BookingItem>) => {
    const selectedMakkahHotel = currentForm.hotelMakkah;
    const selectedMadinahHotel = currentForm.hotelMadinah;
    const selectionType = currentForm.hotelSelectionType;

    const makkahContract = hotelContracts.find(c => c.hotelName === selectedMakkahHotel && c.location === 'Makkah');
    const madinahContract = hotelContracts.find(c => c.hotelName === selectedMadinahHotel && c.location === 'Madinah');

    const targetPackageType = selectionType === 'Room Only' ? 'Room only' : 'Full Umrah package';

    const updatedAllocations = currentForm.roomAllocations?.map((alloc) => {
      if (alloc.isManualOverride) {
        return alloc;
      }
      let makkahRate = 0;
      let madinahRate = 0;

      // 1. Resolve Makkah Portion
      if (selectionType !== 'Madinah Only') {
        const makkahRule = pricingRules?.find(r => r.hotelName === selectedMakkahHotel && r.roomType === alloc.roomType && r.packageType === targetPackageType);
        if (makkahRule) {
          makkahRate = makkahRule.priceMYR;
        } else if (makkahContract) {
          const rCap = makkahContract.rooms.find(r => r.roomType === alloc.roomType);
          if (rCap) makkahRate = rCap.contractRateMYR;
        }
      }

      // 2. Resolve Madinah Portion
      if (selectionType !== 'Makkah Only') {
        const madinahRule = pricingRules?.find(r => r.hotelName === selectedMadinahHotel && r.roomType === alloc.roomType && r.packageType === targetPackageType);
        if (madinahRule) {
          madinahRate = madinahRule.priceMYR;
        } else if (madinahContract) {
          const rCap = madinahContract.rooms.find(r => r.roomType === alloc.roomType);
          if (rCap) madinahRate = rCap.contractRateMYR;
        }
      }

      let finalRate = makkahRate + madinahRate;

      // 3. Fallback to Global All-Hotels Rule if no specific hotel rule was configured
      const makkahMatchedSpecialRule = pricingRules?.some(r => r.hotelName === selectedMakkahHotel && r.roomType === alloc.roomType && r.packageType === targetPackageType);
      const madinahMatchedSpecialRule = pricingRules?.some(r => r.hotelName === selectedMadinahHotel && r.roomType === alloc.roomType && r.packageType === targetPackageType);
      
      if (!makkahMatchedSpecialRule && !madinahMatchedSpecialRule) {
        const globalRule = pricingRules?.find(r => r.hotelName === 'All Hotels' && r.roomType === alloc.roomType && r.packageType === targetPackageType);
        if (globalRule) {
          finalRate = globalRule.priceMYR;
        }
      }

      return {
        ...alloc,
        ratePerRoom: finalRate > 0 ? finalRate : alloc.ratePerRoom
      };
    }) || [];

    return {
      ...currentForm,
      roomAllocations: updatedAllocations
    };
  };

  // Run initial hook when editing or creating to maintain rates
  const updateFormStateAndTotals = (newForm: Partial<BookingItem>) => {
    const syncedRates = runHotelSelectionRatesSync(newForm);
    const finalForm = calculateTotalBookingAmount(syncedRates);
    setForm(finalForm);
  };

  // Toggling room allocation quantities
  const handleRoomCountChange = (roomType: string, count: number) => {
    const updatedAllocations = form.roomAllocations?.map((alloc) => {
      if (alloc.roomType === roomType) {
        return { ...alloc, count: Math.max(0, count) };
      }
      return alloc;
    }) || [];

    const calculatedCapacity = updatedAllocations.reduce((acc, alloc) => acc + (alloc.count * alloc.capacity), 0);

    const partialForm = {
      ...form,
      roomAllocations: updatedAllocations,
      paxCount: calculatedCapacity > 0 ? calculatedCapacity : form.paxCount
    };

    updateFormStateAndTotals(partialForm);
  };

  const handleRoomRateChange = (roomType: string, newRate: number) => {
    const updatedAllocations = form.roomAllocations?.map((alloc) => {
      if (alloc.roomType === roomType) {
        return { 
          ...alloc, 
          ratePerRoom: Math.max(0, newRate), 
          isManualOverride: true 
        };
      }
      return alloc;
    }) || [];

    const partialForm = {
      ...form,
      roomAllocations: updatedAllocations
    };

    updateFormStateAndTotals(partialForm);
  };

  const handleResetRoomRate = (roomType: string) => {
    const updatedAllocations = form.roomAllocations?.map((alloc) => {
      if (alloc.roomType === roomType) {
        return { 
          ...alloc, 
          isManualOverride: false 
        };
      }
      return alloc;
    }) || [];

    const partialForm = {
      ...form,
      roomAllocations: updatedAllocations
    };

    updateFormStateAndTotals(partialForm);
  };

  const syncPaxToBeds = () => {
    if (currentBeddingSumCapacity > 0) {
      updateFormStateAndTotals({
        ...form,
        paxCount: currentBeddingSumCapacity
      });
    }
  };

  const handleAddNewClick = () => {
    setErrorMessage(null);
    setIsEditing(true);
    setEditId(undefined);

    const defaultForm: Partial<BookingItem> = {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      aeroRef: '',
      bookingType: 'Umrah Package',
      packageName: PACKAGE_TEMPLATES[0].name,
      paxCount: 2,
      travelDateFrom: new Date().toISOString().split('T')[0],
      travelDateTo: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'MYR',
      bookingStatus: 'Draft',
      hotelSelectionType: 'Full Umrah Package',
      hotelMakkah: makkahHotels[0]?.hotelName || 'Pullman Zamzam Makkah',
      hotelMadinah: madinahHotels[0]?.hotelName || 'Anwar Al Madinah Mövenpick',
      transportType: 'Haramain High Speed Train (Business Class)',
      extraServices: [],
      b2bAgentId: '',
      b2bAgentName: '',
      notes: '',
      roomAllocations: [
        { roomType: 'Double', count: 1, capacity: 2, ratePerRoom: 450 },
        { roomType: 'Triple', count: 0, capacity: 3, ratePerRoom: 550 },
        { roomType: 'Quad', count: 0, capacity: 4, ratePerRoom: 650 },
        { roomType: 'Quint', count: 0, capacity: 5, ratePerRoom: 750 },
        { roomType: 'Six-sharing', count: 0, capacity: 6, ratePerRoom: 850 }
      ],
      mealsConfig: {
        breakfast: true,
        lunch: true,
        dinner: true,
        customPackageName: 'Full Board Malaysian Buffet',
        pricePerMeal: 35,
        totalCost: 110 * 2 * 10
      },
      customServices: []
    };

    updateFormStateAndTotals(defaultForm);
  };

  const handleEditClick = (b: BookingItem) => {
    setErrorMessage(null);
    setIsEditing(true);
    setEditId(b.id);
    
    // Fill allocations if empty
    const defaultAllocations = [
      { roomType: 'Double', count: 0, capacity: 2, ratePerRoom: 450 },
      { roomType: 'Triple', count: 0, capacity: 3, ratePerRoom: 550 },
      { roomType: 'Quad', count: 0, capacity: 4, ratePerRoom: 650 },
      { roomType: 'Quint', count: 0, capacity: 5, ratePerRoom: 750 },
      { roomType: 'Six-sharing', count: 0, capacity: 6, ratePerRoom: 850 }
    ];

    const currentForm = {
      ...b,
      aeroRef: b.aeroRef || '',
      hotelSelectionType: b.hotelSelectionType || 'Full Umrah Package',
      roomAllocations: b.roomAllocations && b.roomAllocations.length > 0 ? b.roomAllocations : defaultAllocations,
      mealsConfig: b.mealsConfig || {
        breakfast: false,
        lunch: false,
        dinner: false,
        customPackageName: 'None',
        pricePerMeal: 35,
        totalCost: 0
      },
      customServices: b.customServices || []
    };

    updateFormStateAndTotals(currentForm);
  };

  const handleAddService = () => {
    if (selectedServiceToAdd === 'Custom Manual entry') {
      if (!customServiceName.trim()) return;
      const srv: AdditionalService = {
        name: customServiceName.trim(),
        cost: customServicePrice,
        notes: customServiceNotes.trim(),
        isPredefined: false
      };
      const updatedList = [...(form.customServices || []), srv];
      updateFormStateAndTotals({ ...form, customServices: updatedList });
      setCustomServiceName('');
      setCustomServiceNotes('');
    } else {
      const match = PREDEFINED_SERVICES.find(s => s.name === selectedServiceToAdd);
      if (match) {
        const srv: AdditionalService = {
          name: match.name,
          cost: match.defaultCostMYR,
          notes: 'Predefined operations package',
          isPredefined: true
        };
        const updatedList = [...(form.customServices || []), srv];
        updateFormStateAndTotals({ ...form, customServices: updatedList });
      }
    }
  };

  const handleRemoveService = (index: number) => {
    const updatedList = form.customServices?.filter((_, i) => i !== index) || [];
    updateFormStateAndTotals({ ...form, customServices: updatedList });
  };

  const handleEditServiceCost = (index: number, cost: number) => {
    const updatedList = form.customServices?.map((s, i) => {
      if (i === index) return { ...s, cost: Math.max(0, cost) };
      return s;
    }) || [];
    updateFormStateAndTotals({ ...form, customServices: updatedList });
  };

  const handleMealPlanToggle = (field: 'breakfast' | 'lunch' | 'dinner', val: boolean) => {
    const currentMeals = form.mealsConfig || {
      breakfast: false,
      lunch: false,
      dinner: false,
      customPackageName: 'None',
      pricePerMeal: 35,
      totalCost: 0
    };

    const updatedConfig = {
      ...currentMeals,
      [field]: val
    };

    updateFormStateAndTotals({ ...form, mealsConfig: updatedConfig });
  };

  const handleMealPackageChange = (packageName: string) => {
    const match = MEAL_PACKAGES.find(m => m.name === packageName);
    const price = match ? match.defaultPrice / 3 : 35; // divide rate into standard meals segments

    const updatedConfig = {
      ...(form.mealsConfig || {
        breakfast: true,
        lunch: true,
        dinner: true,
        customPackageName: packageName,
        pricePerMeal: 35,
        totalCost: 0
      }),
      customPackageName: packageName,
      pricePerMeal: Math.round(price)
    };

    updateFormStateAndTotals({ ...form, mealsConfig: updatedConfig });
  };

  const handleMealPriceOverride = (price: number) => {
    const updatedConfig = {
      ...(form.mealsConfig || {
        breakfast: true,
        lunch: true,
        dinner: true,
        customPackageName: 'Custom Board Plan',
        pricePerMeal: 35,
        totalCost: 0
      }),
      pricePerMeal: Math.max(0, price)
    };

    updateFormStateAndTotals({ ...form, mealsConfig: updatedConfig });
  };

  const handleMealOverrideMealsCount = (mealsCount: number | undefined) => {
    const updatedConfig = {
      ...(form.mealsConfig || {
        breakfast: true,
        lunch: true,
        dinner: true,
        customPackageName: 'Custom Board Plan',
        pricePerMeal: 35,
        totalCost: 0
      }),
      overrideCount: mealsCount !== undefined && mealsCount >= 0 ? mealsCount : undefined
    };

    updateFormStateAndTotals({ ...form, mealsConfig: updatedConfig });
  };

  // Main Form Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Populate Partner Name metadata
    let finalForm = { ...form };
    if (finalForm.b2bAgentId) {
      const partner = partners.find(p => p.id === finalForm.b2bAgentId);
      if (partner) {
        finalForm.b2bAgentName = partner.companyName;
      }
    } else {
      finalForm.b2bAgentName = null;
      finalForm.b2bAgentId = null;
    }

    try {
      const isNew = !editId;
      const url = isNew ? '/api/bookings' : `/api/bookings/${editId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking: finalForm,
          authorEmail: currentUserEmail,
          authorName: currentUserName
        })
      });

      const body = await res.json();
      if (res.ok) {
        // App.tsx has its state and logs synced
        await onSaveBooking(finalForm, editId);
        setIsEditing(false);
      } else {
        setErrorMessage(body.error || "Overbooking limits violated or parameter mismatch.");
      }
    } catch (err) {
      setErrorMessage("Network error occurred validating hotel contract capacities.");
    }
  };

  // Dynamic booking query filtering
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          b.id.toLowerCase().includes(search.toLowerCase()) ||
                          (b.aeroRef && b.aeroRef.toLowerCase().includes(search.toLowerCase())) ||
                          (b.packageName && b.packageName.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' ? true : b.bookingStatus === statusFilter;
    const matchesType = typeFilter === 'All' ? true : b.bookingType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Export Booking list to CSV
  const exportReservationsToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Reservation ID,Customer Name,Roster Headcount,Travel From,Travel To,Nights,Makkah Hotel,Madinah Hotel,Booking Package,Total Price,Currency,Status\r\n";
    
    filteredBookings.forEach(b => {
      const nights = getTravelNights(b.travelDateFrom, b.travelDateTo);
      const row = `"${b.id}","${b.customerName}",${b.paxCount},"${b.travelDateFrom}","${b.travelDateTo}",${nights},"${b.hotelMakkah}","${b.hotelMadinah}","${b.packageName || b.bookingType}",${b.totalAmount},"${b.currency}","${b.bookingStatus}"`;
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aerostar_Umrah_Reservations_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // REPORTS CALCULATIONS:
  // 1. Room Type Utilization Count
  const reportingBookings = bookings.filter(b => b.bookingStatus === 'Confirmed');
  
  const roomTypeUtilization: Record<string, { count: number; totalRoomsCapacity: number }> = {
    'Double': { count: 0, totalRoomsCapacity: 70 }, // hardcoded contract aggregates for nice graph
    'Triple': { count: 0, totalRoomsCapacity: 53 },
    'Quad': { count: 0, totalRoomsCapacity: 70 },
    'Quint': { count: 0, totalRoomsCapacity: 28 },
    'Six-sharing': { count: 0, totalRoomsCapacity: 28 }
  };

  reportingBookings.forEach(b => {
    if (b.roomAllocations) {
      b.roomAllocations.forEach(alloc => {
        if (roomTypeUtilization[alloc.roomType]) {
          roomTypeUtilization[alloc.roomType].count += alloc.count;
        }
      });
    }
  });

  // 2. Hotel confirm counters
  const hotelCountsMakkah: Record<string, { bookings: number; pax: number }> = {};
  const hotelCountsMadinah: Record<string, { bookings: number; pax: number }> = {};

  reportingBookings.forEach(b => {
    if (b.hotelMakkah && b.hotelSelectionType !== 'Madinah Only') {
      if (!hotelCountsMakkah[b.hotelMakkah]) hotelCountsMakkah[b.hotelMakkah] = { bookings: 0, pax: 0 };
      hotelCountsMakkah[b.hotelMakkah].bookings++;
      hotelCountsMakkah[b.hotelMakkah].pax += b.paxCount;
    }
    if (b.hotelMadinah && b.hotelSelectionType !== 'Makkah Only') {
      if (!hotelCountsMadinah[b.hotelMadinah]) hotelCountsMadinah[b.hotelMadinah] = { bookings: 0, pax: 0 };
      hotelCountsMadinah[b.hotelMadinah].bookings++;
      hotelCountsMadinah[b.hotelMadinah].pax += b.paxCount;
    }
  });

  // 3. Meal counts analytics
  let totalBreakfastCount = 0;
  let totalLunchCount = 0;
  let totalDinnerCount = 0;

  reportingBookings.forEach(b => {
    const nights = getTravelNights(b.travelDateFrom, b.travelDateTo);
    if (b.mealsConfig) {
      if (b.mealsConfig.breakfast) totalBreakfastCount += b.paxCount * nights;
      if (b.mealsConfig.lunch) totalLunchCount += b.paxCount * nights;
      if (b.mealsConfig.dinner) totalDinnerCount += b.paxCount * nights;
    }
  });

  // 4. Additional Services breakdown
  const servicesUsageSummary: Record<string, { bookingsCount: number; totalRevenueMYR: number }> = {};

  reportingBookings.forEach(b => {
    const rate = EXCHANGE_RATES[b.currency as keyof typeof EXCHANGE_RATES] || 1.0;
    if (b.customServices) {
      b.customServices.forEach(s => {
        if (!servicesUsageSummary[s.name]) {
          servicesUsageSummary[s.name] = { bookingsCount: 0, totalRevenueMYR: 0 };
        }
        servicesUsageSummary[s.name].bookingsCount++;
        servicesUsageSummary[s.name].totalRevenueMYR += Math.round(s.cost * rate);
      });
    }
  });


  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-xl font-bold font-sans text-slate-950 flex items-center gap-1.5">
            <Building className="w-5.5 h-5.5 text-emerald-800" />
            Reservation Management Center
          </h2>
          <p className="text-xs text-slate-500">Secure real-time hotel allocations, itemized meal bookings, and supplier cost auditing</p>
        </div>
        
        {!isEditing && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveSubTab('list')}
              className={`px-3 py-1.8 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'list' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              Bookings Ledger
            </button>
            <button
              onClick={() => setActiveSubTab('inventory')}
              className={`px-3 py-1.8 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'inventory' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              Hotel Contracts & Inventory
            </button>
            <button
              onClick={() => setActiveSubTab('daily_usage')}
              id="daily_usage_tab_btn"
              className={`px-3 py-1.8 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'daily_usage' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Daily Rooms Usage
            </button>
            <button
              onClick={() => setActiveSubTab('settings')}
              id="pricing_settings_tab_btn"
              className={`px-3 py-1.8 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'settings' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Pricing Settings
            </button>
            <button
              onClick={() => setActiveSubTab('reports')}
              className={`px-3 py-1.8 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'reports' ? 'bg-emerald-850 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Operational Reports
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 animate-in slide-in-from-top-4 duration-200">
          <div className="border-b border-slate-150 pb-3 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-800" />
              {editId ? `Modify Extended Reservation ${editId}` : "Establish Luxury Pilgrim Reservation"}
            </h3>
            <span className="text-[10px] uppercase font-bold text-slate-400">Section 1447H Enterprise Capacity Planner</span>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-semibold flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* SECTION 1: Pilgrim Contact Information */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <User className="w-4 h-4 text-emerald-800" /> Roster / Group Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Roster Lead Pilgrim Name</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={e => setForm({ ...form, customerName: e.target.value })}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:ring-1 focus:ring-emerald-800 focus:outline-none"
                  placeholder="e.g. Haji Mohd Shah bin Sulaiman"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Contact Phone Number</label>
                <input
                  type="text"
                  value={form.customerPhone}
                  onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:ring-1 focus:ring-emerald-800 focus:outline-none"
                  placeholder="e.g. +60 19-334 1182"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Contact Email Address</label>
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={e => setForm({ ...form, customerEmail: e.target.value })}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:ring-1 focus:ring-emerald-800 focus:outline-none"
                  placeholder="shah@gmail.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1">AERO REF ID <span className="text-[8px] text-slate-400 font-normal normales">(for grouping)</span></label>
                <input
                  type="text"
                  value={form.aeroRef || ''}
                  onChange={e => setForm({ ...form, aeroRef: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-emerald-950 focus:ring-1 focus:ring-emerald-800 focus:outline-none border-emerald-300"
                  placeholder="e.g. AERO 48-092"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Rules-Based Hotel assignment and Location Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Building className="w-4 h-4 text-emerald-800" /> Hotel Selection & Validity Rules
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">Operational Selection Rule</label>
                <select
                  value={form.hotelSelectionType}
                  onChange={e => {
                    const nextVal = e.target.value as any;
                    const defaultMakkah = nextVal === 'Madinah Only' ? '' : (makkahHotels[0]?.hotelName || 'Pullman Zamzam Makkah');
                    const defaultMadinah = nextVal === 'Makkah Only' ? '' : (madinahHotels[0]?.hotelName || 'Anwar Al Madinah Mövenpick');
                    
                    updateFormStateAndTotals({
                      ...form,
                      hotelSelectionType: nextVal,
                      hotelMakkah: defaultMakkah,
                      hotelMadinah: defaultMadinah
                    });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:ring-1 focus:ring-emerald-800 focus:outline-none"
                >
                  <option value="Full Umrah Package">Full Umrah Package (Hotels + Transport + Services)</option>
                  <option value="Makkah + Madinah">Makkah + Madinah Accommodation Only</option>
                  <option value="Makkah Only">Makkah Only Lodging</option>
                  <option value="Madinah Only">Madinah Only Lodging</option>
                  <option value="Room Only">Room Only Booking (Leisure / Direct)</option>
                </select>
              </div>

              {form.hotelSelectionType !== 'Madinah Only' ? (
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">Makkah Contracted Hotel</label>
                  <select
                    value={form.hotelMakkah}
                    onChange={e => updateFormStateAndTotals({ ...form, hotelMakkah: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none"
                  >
                    {makkahHotels.map(h => (
                      <option key={h.id} value={h.hotelName}>{h.hotelName} (Makkah - Valid to {h.validTo})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="opacity-40">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide block mb-1">Makkah Hotel (Disabled)</label>
                  <input type="text" value="Not Applicable" disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-xs font-bold cursor-not-allowed" />
                </div>
              )}

              {form.hotelSelectionType !== 'Makkah Only' ? (
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">Madinah Contracted Hotel</label>
                  <select
                    value={form.hotelMadinah}
                    onChange={e => updateFormStateAndTotals({ ...form, hotelMadinah: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none"
                  >
                    {madinahHotels.map(h => (
                      <option key={h.id} value={h.hotelName}>{h.hotelName} (Madinah - Valid to {h.validTo})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="opacity-40">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide block mb-1">Madinah Hotel (Disabled)</label>
                  <input type="text" value="Not Applicable" disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-xs font-bold cursor-not-allowed" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Date From</label>
                  <input
                    type="date"
                    value={form.travelDateFrom}
                    onChange={e => updateFormStateAndTotals({ ...form, travelDateFrom: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Date To</label>
                  <input
                    type="date"
                    value={form.travelDateTo}
                    onChange={e => updateFormStateAndTotals({ ...form, travelDateTo: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-850">
              <span className="font-semibold flex items-center gap-1">
                <Calendar className="w-4 h-4 text-emerald-700" />
                Calculated Stay Duration: <strong className="font-extrabold">{currentNightsCount} nights</strong>
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-950 px-2.5 py-0.8 rounded-full font-bold">
                Contract Rate Multipliers Applied
              </span>
            </div>
          </div>

          {/* SECTION 3: Advanced Room Allocation Engine with Pax Counter Check */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-emerald-800" /> Hotel Bedding & Room Allocation Engine
              </h4>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-550 font-semibold">Total Pax count:</span>
                  <input
                    type="number"
                    value={form.paxCount}
                    onChange={e => updateFormStateAndTotals({ ...form, paxCount: Math.max(1, Number(e.target.value)) })}
                    className="w-14 bg-white border border-slate-200 rounded-lg p-1 text-center text-xs font-extrabold text-emerald-950"
                  />
                </div>
                {currentBeddingSumCapacity > 0 && currentBeddingSumCapacity !== form.paxCount && (
                  <button
                    type="button"
                    onClick={syncPaxToBeds}
                    className="bg-emerald-850 hover:bg-emerald-950 text-white font-bold text-[10px] uppercase py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Sync Passenger size to beds ({currentBeddingSumCapacity})
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {form.roomAllocations?.map((alloc) => (
                <div key={alloc.roomType} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 hover:border-emerald-700 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 block uppercase">{alloc.roomType} Room</span>
                  <strong className="text-slate-900 text-xs block font-bold">{alloc.capacity} beds capacity</strong>
                  
                  {/* Dynamic & Manual Rate Modifier Block */}
                  <div className="space-y-1 pt-1.5 pb-1">
                    <label className="text-[9px] font-extrabold text-slate-450 block uppercase tracking-wider">
                      Price per Night
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1 text-slate-400 font-bold text-[10px]">MYR</span>
                      <input
                        type="number"
                        value={alloc.ratePerRoom || ''}
                        onChange={(e) => handleRoomRateChange(alloc.roomType, parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs font-black pl-11 pr-2 py-1 rounded-lg border outline-hidden transition-all ${
                          alloc.isManualOverride 
                            ? 'bg-amber-50 border-amber-300 text-amber-950 focus:border-amber-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-700 focus:bg-white'
                        }`}
                        title="Modify rate manually"
                        placeholder="0"
                      />
                    </div>
                    {alloc.isManualOverride && (
                      <button
                        type="button"
                        onClick={() => handleResetRoomRate(alloc.roomType)}
                        className="text-[9px] font-bold text-amber-700 hover:text-amber-900 flex items-center justify-end w-full gap-0.5 mt-0.5 cursor-pointer underline select-none"
                      >
                        Reset to default rate
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => handleRoomCountChange(alloc.roomType, alloc.count - 1)}
                      className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg font-black text-slate-800 text-xs flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-black text-slate-900 text-xs">{alloc.count}</span>
                    <button
                      type="button"
                      onClick={() => handleRoomCountChange(alloc.roomType, alloc.count + 1)}
                      className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg font-black text-slate-800 text-xs flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Capacity validators feedback */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">
                Sum of Bedding Spaces: <strong className="font-extrabold text-slate-800">{currentBeddingSumCapacity} beds</strong> vs Assigned Travelers: <strong className="font-extrabold text-slate-800">{form.paxCount} pilgrims</strong>
              </span>

              {currentBeddingSumCapacity === form.paxCount ? (
                <span className="text-[11px] bg-emerald-100 border border-emerald-250 text-emerald-850 px-3 py-1 rounded-full font-black flex items-center gap-1 animate-pulse">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Bedding Alignment Pristine! (Matches capacity count)
                </span>
              ) : currentBeddingSumCapacity < form.paxCount ? (
                <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Bed Underallocation! Need {form.paxCount - currentBeddingSumCapacity} more beds.
                </span>
              ) : (
                <span className="text-[11px] bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  Extra room vacancies: Overallocated by {currentBeddingSumCapacity - form.paxCount} beds.
                </span>
              )}
            </div>
          </div>

          {/* SECTION 4: Meal Planning System */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Utensils className="w-4 h-4 text-emerald-800" /> Catering & Meal Planning System
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-150">
                <span className="text-[10px] font-black text-slate-400 block uppercase">Segments Selection</span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-850 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.mealsConfig?.breakfast}
                      onChange={e => handleMealPlanToggle('breakfast', e.target.checked)}
                      className="rounded text-emerald-800 shrink-0"
                    />
                    Provide Breakfast (MYR 25/pax/day)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-850 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.mealsConfig?.lunch}
                      onChange={e => handleMealPlanToggle('lunch', e.target.checked)}
                      className="rounded text-emerald-800 shrink-0"
                    />
                    Provide Lunch (MYR 45/pax/day)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-850 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.mealsConfig?.dinner}
                      onChange={e => handleMealPlanToggle('dinner', e.target.checked)}
                      className="rounded text-emerald-800 shrink-0"
                    />
                    Provide Dinner (MYR 45/pax/day)
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Pre-defined Catering package</label>
                <select
                  value={form.mealsConfig?.customPackageName || "Custom Board Plan"}
                  onChange={e => handleMealPackageChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none"
                >
                  {MEAL_PACKAGES.map(m => (
                    <option key={m.name} value={m.name}>{m.name} (MYR {m.defaultPrice}/pax/day)</option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 mt-1">Caterer pricing structures auto-synchronize with package configurations.</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Catering Unit Price (Per Meal)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs font-bold font-mono">MYR</span>
                  <input
                    type="number"
                    value={form.mealsConfig?.pricePerMeal || 35}
                    onChange={e => handleMealPriceOverride(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 pl-11 text-xs font-bold focus:outline-none"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Override default culinary rate to apply premium catering fees.</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Catering quantity / Manual Count Override</label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.mealsConfig?.overrideCount !== undefined ? form.mealsConfig.overrideCount : ""}
                    onChange={e => {
                      const val = e.target.value;
                      handleMealOverrideMealsCount(val === "" ? undefined : Number(val));
                    }}
                    placeholder={`Auth: ${(form.mealsConfig?.breakfast ? 1 : 0 + (form.mealsConfig?.lunch ? 1 : 0) + (form.mealsConfig?.dinner ? 1 : 0)) * (form.paxCount || 1) * currentNightsCount} meals`}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Keep empty to auto calculate based on pax, nights, and segments selection.</p>
              </div>
            </div>

            <div className="p-3 bg-orange-50 border border-orange-100/60 rounded-xl text-xs text-orange-900 font-semibold flex items-center justify-between">
              <span>Meal pricing calculations summary:</span>
              <strong className="font-extrabold text-xs">Total Catering Fee: MYR {form.mealsConfig?.totalCost || 0}</strong>
            </div>
          </div>

          {/* SECTION 5: Predefined and Custom Additional Services Module (Editable) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <PlusCircle className="w-4 h-4 text-emerald-800" /> Additional Service Arrangements (Editable)
            </h4>

            {/* Custom Add Line Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Predefined Options</label>
                <select
                  value={selectedServiceToAdd}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedServiceToAdd(val);
                    if (val !== 'Custom Manual entry') {
                      const match = PREDEFINED_SERVICES.find(p => p.name === val);
                      if (match) {
                        setCustomServiceName(match.name);
                        setCustomServicePrice(match.defaultCostMYR);
                      }
                    } else {
                      setCustomServiceName('');
                      setCustomServicePrice(100);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="Custom Manual entry">-- Custom Manual Lump-Sum entry --</option>
                  {PREDEFINED_SERVICES.map(p => (
                    <option key={p.name} value={p.name}>{p.name} (MYR {p.defaultCostMYR})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Arrangement / Service Title</label>
                <input
                  type="text"
                  value={customServiceName}
                  onChange={e => setCustomServiceName(e.target.value)}
                  disabled={selectedServiceToAdd !== 'Custom Manual entry'}
                  placeholder="e.g. Taif Rose Garden Guide Ticket"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Operational Price Rate (MYR Cost)</label>
                <input
                  type="number"
                  value={customServicePrice}
                  onChange={e => setCustomServicePrice(Math.max(0, Number(e.target.value)))}
                  placeholder="MYR Cost"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddService}
                className="bg-slate-900 hover:bg-slate-950 text-white font-black text-xs h-10 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Insert Service Line
              </button>
            </div>

            {/* List and pricing adjustments */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-800">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase font-black text-slate-400">
                    <th className="p-3 pl-4">No.</th>
                    <th className="p-3">Inclusion Arrangement</th>
                    <th className="p-3">Reference notes</th>
                    <th className="p-3 text-right">Editable Cost (MYR)</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!form.customServices || form.customServices.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">No custom services added. Use the block above to add VIP transfers, Taif tours, or guidance visa upgrades.</td>
                    </tr>
                  ) : (
                    form.customServices.map((srv, index) => (
                      <tr key={index} className="hover:bg-slate-55/40">
                        <td className="p-3 pl-4 font-black">{index + 1}</td>
                        <td className="p-3 font-semibold">{srv.name}</td>
                        <td className="p-3 text-slate-450 text-[11px]">{srv.notes || "Assigned directly"}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            value={srv.cost}
                            onChange={e => handleEditServiceCost(index, Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded p-1 w-24 text-right text-xs font-extrabold focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveService(index)}
                            className="text-red-500 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 6: State Transition, Invoicing Trigger, and Currencies */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-800" /> Operational State Transitions & Accounting Rates
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black text-rose-700 uppercase block mb-1">State Transition Invoicing Action</label>
                <select
                  value={form.bookingStatus}
                  onChange={e => setForm({ ...form, bookingStatus: e.target.value as any })}
                  className="bg-white border border-slate-250 rounded-lg p-2.5 text-xs font-bold focus:outline-emerald-850 w-full text-emerald-950"
                >
                  <option value="Draft">Draft (No invoices generated)</option>
                  <option value="Pending">Pending (Hold reservation blocks)</option>
                  <option value="Confirmed">Confirmed (⚠️ Spawns Automated Itemized Invoice)</option>
                  <option value="Completed">Completed Trip (Closed ledger)</option>
                  <option value="Cancelled">Cancelled (Releases hotel bedding)</option>
                </select>
                <p className="text-[9px] text-slate-400 mt-1">If marked as "Confirmed", the automated invoicing engine itemizes this client's lodging, meals, and booking services.</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Settlement Exchange Currency</label>
                <select
                  value={form.currency}
                  onChange={e => {
                    const nextCurr = e.target.value as any;
                    calculateTotalBookingAmount({ ...form, currency: nextCurr });
                    setForm(prev => ({
                      ...prev,
                      currency: nextCurr
                    }));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none"
                >
                  <option value="MYR">MYR (Malaysian Ringgit)</option>
                  <option value="SGD">SGD (Singapore Dollars)</option>
                  <option value="SAR">SAR (Saudi Riyals)</option>
                  <option value="IDR">IDR (Indonesian Rupiah)</option>
                </select>
                <p className="text-[9px] text-slate-400 mt-1">Settlement invoices print under chosen corporate local tender.</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">B2B Partner Link (Optional)</label>
                <select
                  value={form.b2bAgentId || ""}
                  onChange={e => setForm({ ...form, b2bAgentId: e.target.value || null })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none"
                >
                  <option value="">Direct Corporate B2C Pilgrim Client</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.companyName} ({p.country} - {p.commissionRate}%)</option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 mt-1">Affiliate commissions track automatically upon confirmation.</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Internal operations audit notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:outline-none"
                  rows={2}
                  placeholder="Dietary requests, airline terminal dates, medical requirements..."
                />
              </div>
            </div>

            {/* Matrix total readout pane */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-950 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 block tracking-widest">Real-time Cost Summary (Converted)</span>
                <strong className="text-2xl font-black text-slate-100 flex items-center gap-1">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  {form.currency} {form.totalAmount?.toLocaleString()}
                </strong>
                <span className="text-[9px] text-slate-400 block">Pricing matches calculated contracted room rates, food plans, and added service inclusions.</span>
              </div>
              <div className="bg-slate-800 border border-slate-750 px-4 py-2.5 rounded-xl shrink-0 text-right">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-black">Estimated Procurement supplier cost</span>
                <strong className="text-sm font-black text-rose-400">MYR {form.supplierCostMYR?.toLocaleString()}</strong>
                <span className="text-[8px] text-slate-450 block">Operator Procurement Budget Allocated</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-150">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 block transition-colors cursor-pointer"
            >
              Cancel modifications
            </button>
            <button
              type="submit"
              className="bg-emerald-855 hover:bg-emerald-950 text-white font-black py-2.5 px-6 rounded-xl text-xs shadow-xs block transition-colors bg-emerald-800 cursor-pointer"
            >
              Commit & Save Reservation
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          
          {/* Sub-tab 1: Reservations list block */}
          {activeSubTab === 'list' && (
            <div className="space-y-4">
              {/* Excel / CSV Import & Export integration Panel */}
              <ImportExportManager 
                bookings={bookings}
                hotelContracts={hotelContracts}
                partners={partners}
                onRefreshDatabase={onRefreshDatabase}
                onSaveBooking={async (b) => { await onSaveBooking(b); }}
              />
              {/* Search and filters workspace */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search client roster, reservation id..."
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-emerald-800"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-emerald-800"
                  >
                    <option value="All">All Operations Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending Validation</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed Trip</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-emerald-800"
                  >
                    <option value="All">All Package Modes</option>
                    <option value="Umrah Package">Umrah Package</option>
                    <option value="Private Tour">Private Tour</option>
                    <option value="Hotel + Transport">Hotel + Transport</option>
                  </select>
                  
                  <button
                    onClick={exportReservationsToCSV}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer"
                    title="Export filtered records as CSV sheet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV Export
                  </button>

                  <button
                    onClick={handleAddNewClick}
                    className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer inline-block"
                  >
                    <Plus className="w-4 h-4" />
                    Establish Booking
                  </button>
                </div>
              </div>

              {/* Data Grid table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-4 px-6 text-emerald-850">Reserve ID</th>
                        <th className="py-4 px-6">Client / Package Info</th>
                        <th className="py-4 px-6">Hotel Placement</th>
                        <th className="py-4 px-6">Bedding & Meals Allocated</th>
                        <th className="py-4 px-6 text-right">Reservation price</th>
                        <th className="py-4 px-6 text-center">Status context</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-xs text-slate-800">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">No reservation records fit the chosen filter.</td>
                        </tr>
                      ) : (
                        filteredBookings.map(b => {
                          const margin = b.totalAmountMYR - b.supplierCostMYR;
                          const calculatedCapacity = getBeddingCapacitySum(b.roomAllocations);
                          return (
                            <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-6 font-mono font-bold text-emerald-850">{b.id}</td>
                              <td className="py-4 px-6 max-w-xs space-y-1">
                                <span className="font-extrabold text-slate-900 text-sm block">{b.customerName}</span>
                                <span className="text-[10px] text-slate-500 block">{b.customerEmail} | {b.customerPhone}</span>
                                <div className="flex flex-wrap items-center gap-1 pt-1">
                                  <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold">{b.bookingType}</span>
                                  <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded font-extrabold">{b.packageName}</span>
                                  {b.aeroRef && (
                                    <span className="text-[9px] bg-sky-55 text-sky-850 border border-sky-200 px-2 py-0.5 rounded-sm font-extrabold font-mono uppercase tracking-wider">Aero Ref: {b.aeroRef}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-6 max-w-xs space-y-1">
                                {b.hotelSelectionType !== 'Madinah Only' && b.hotelMakkah && (
                                  <span className="block font-medium flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-500" /> Makkah: <strong className="font-bold">{b.hotelMakkah}</strong></span>
                                )}
                                {b.hotelSelectionType !== 'Makkah Only' && b.hotelMadinah && (
                                  <span className="block font-medium flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> Madinah: <strong className="font-bold">{b.hotelMadinah}</strong></span>
                                )}
                                <span className="text-[10px] text-slate-400 italic block">Selection rule: {b.hotelSelectionType || "Umrah Package"}</span>
                              </td>
                              <td className="py-4 px-6 max-w-xs space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-805">
                                  Bedding: {b.paxCount} pax ({calculatedCapacity > 0 ? `${calculatedCapacity} beds` : "No individual rooms selected"})
                                </div>
                                
                                {b.roomAllocations && b.roomAllocations.some(a => a.count > 0) && (
                                  <div className="flex flex-wrap gap-1">
                                    {b.roomAllocations.filter(a => a.count > 0).map(a => (
                                      <span key={a.roomType} className="bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 text-[9px] font-bold">
                                        {a.count}x {a.roomType}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {b.mealsConfig && (b.mealsConfig.breakfast || b.mealsConfig.lunch || b.mealsConfig.dinner) ? (
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Utensils className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Food package: <strong className="font-semibold text-slate-700">{b.mealsConfig.customPackageName}</strong></span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-400 italic">No food catering selected</div>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right font-semibold">
                                <strong className="font-extrabold text-slate-900 block text-xs">{b.currency} {b.totalAmount?.toLocaleString()}</strong>
                                {b.currency !== 'MYR' && (
                                  <span className="text-[10px] text-slate-400 block">(MYR {b.totalAmountMYR?.toLocaleString()})</span>
                                )}
                                <span className="text-[9px] block text-slate-400 mt-1">Marginal Margin: <span className={margin >= 0 ? "text-emerald-700 font-extrabold" : "text-rose-600 font-extrabold"}>MYR {margin?.toLocaleString()}</span></span>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {b.bookingStatus === 'Confirmed' && (
                                    <span className="bg-emerald-50 text-emerald-850 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                      Confirmed
                                    </span>
                                  )}
                                  {b.bookingStatus === 'Pending' && (
                                    <span className="bg-amber-50 text-amber-80 *0 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                                      <AlertTriangle className="w-3 h-3 text-amber-600 font-medium" />
                                      Pending Approval
                                    </span>
                                  )}
                                  {b.bookingStatus === 'Draft' && (
                                    <span className="bg-slate-100 text-slate-650 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-semibold">
                                      Draft Ledger
                                    </span>
                                  )}
                                  {b.bookingStatus === 'Completed' && (
                                    <span className="bg-blue-50 text-blue-750 border border-blue-200 px-3 py-1 rounded-full text-[10px] font-semibold">
                                      Completed Trip
                                    </span>
                                  )}
                                  {b.bookingStatus === 'Cancelled' && (
                                    <span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-bold">
                                      Released / Canceled
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 block mt-1 font-mono">{b.travelDateFrom} to {b.travelDateTo}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleEditClick(b)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                    title="Edit room layouts & meals config"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteBooking(b.id)}
                                    className="bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 p-2 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                                    title="Delete/Purge reservation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
          )}

          {/* Sub-tab 2: Hotel Contracts & Inventory Tracker */}
          {activeSubTab === 'inventory' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-800" /> Contracted Allotment bed limits & Real-time availability
                  </h3>
                  <p className="text-xs text-slate-450">Active commercial hotel contracts in Makkah and Madinah. Real-time availability automatically decrements when reservations transition into "Confirmed" states.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hotelContracts.map((contract) => (
                    <div key={contract.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3 hover:shadow-xs transition-shadow">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <div>
                          <strong className="text-slate-900 text-sm font-extrabold block">{contract.hotelName}</strong>
                          <span className="text-[10px] text-slate-450 uppercase font-black block mt-0.5">{contract.location} ALLOTMENT SHIELD</span>
                        </div>
                        <span className="text-[10px] bg-slate-200/80 text-slate-700 border border-slate-250 px-2.5 py-0.5 rounded font-mono font-bold">
                          Validity: {contract.validFrom} - {contract.validTo}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {contract.rooms.map((room) => {
                          const percentageLeft = Math.round((room.roomsAvailable / room.roomsTotal) * 100);
                          return (
                            <div key={room.roomType} className="p-2.5 bg-white rounded-xl border border-slate-150 space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <div>
                                  <strong className="font-extrabold text-slate-800">{room.roomType} room</strong>
                                  <span className="text-[9px] text-slate-400 block">Night Contract Rate: <span className="text-emerald-800 font-bold">MYR {room.contractRateMYR}</span></span>
                                </div>
                                <span className={`text-[11px] font-black ${room.roomsAvailable === 0 ? "text-red-600 animate-pulse" : room.roomsAvailable < 5 ? "text-amber-600" : "text-emerald-700"}`}>
                                  {room.roomsAvailable} left / {room.roomsTotal} rooms
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-150">
                                <div
                                  className={`h-full rounded-full transition-all ${room.roomsAvailable === 0 ? "bg-red-500" : room.roomsAvailable < 5 ? "bg-amber-400" : "bg-emerald-700"}`}
                                  style={{ width: `${Math.min(100, percentageLeft)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2b: Daily Rooms Usage Tracker */}
          {activeSubTab === 'daily_usage' && (
            <DailyUsageDashboard 
              bookings={bookings}
              hotelContracts={hotelContracts}
            />
          )}

          {/* Sub-tab 2c: Dynamic Pricing settings Matrix */}
          {activeSubTab === 'settings' && (
            <PricingSettings 
              pricingRules={pricingRules}
              hotelContracts={hotelContracts}
              onRefreshDatabase={onRefreshDatabase}
              currentUserEmail={currentUserEmail}
            />
          )}

          {/* Sub-tab 3: Reservation Operational Reports with SVG Graphs */}
          {activeSubTab === 'reports' && (
            <div className="space-y-6">
              
              {/* Reports KPI grid stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Confirmed reservations count</span>
                  <strong className="text-xl font-bold text-slate-900 block">{reportingBookings.length} bookings</strong>
                  <span className="text-[9px] text-slate-450 block">Excludes drafts & canceled bookings</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Pilgrims Confirmed Roster</span>
                  <strong className="text-xl font-bold text-slate-900 block">{reportingBookings.reduce((sum, b) => sum + b.paxCount, 0)} Pilgrims</strong>
                  <span className="text-[9px] text-slate-450 block">Cumulative booking pass size</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Confirmed Meal Volume</span>
                  <strong className="text-xl font-bold text-slate-900 block">{(totalBreakfastCount + totalLunchCount + totalDinnerCount).toLocaleString()} Servings</strong>
                  <span className="text-[9px] text-slate-450 block">{totalBreakfastCount}B, {totalLunchCount}L, {totalDinnerCount}D</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Custom services added</span>
                  <strong className="text-xl font-bold text-slate-900 block">
                    {Object.values(servicesUsageSummary).reduce((sum, s) => sum + s.bookingsCount, 0)} arrangements
                  </strong>
                  <span className="text-[9px] text-slate-450 block">Taif, airport & VIP coach transfers</span>
                </div>
              </div>

              {/* Advanced interactive visualizer subgrids */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Visualizer 1: Room type utilization */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Confirmed Room Type Utilization Bar chart</h4>
                    <p className="text-[10px] text-slate-400">Total rooms reserved across confirmed commercial reservations.</p>
                  </div>

                  <div className="pt-4 space-y-3">
                    {Object.entries(roomTypeUtilization).map(([type, stats]) => {
                      const maxCapacity = stats.totalRoomsCapacity;
                      const percentage = Math.min(100, Math.round((stats.count / maxCapacity) * 100));
                      return (
                        <div key={type} className="space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-755">{type} room type</span>
                            <span className="text-slate-500">{stats.count} booked rooms / {maxCapacity} capacity</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3.5 border border-slate-200 overflow-hidden relative">
                            <div className="bg-emerald-800 h-full rounded-full transition-all" style={{ width: `${percentage}%` }} />
                            <span className="absolute right-2 top-0.5 text-[9px] text-slate-500 font-black">{percentage}% utilization</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Visualizer 2: Makkah vs Madinah Hotel booking comparison */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider font-sans">Hotel Reservations distribution</h4>
                    <p className="text-[10px] text-slate-400">Rosters and headcount booked per contracted hotel facility.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-rose-500 block">Makkah Hotel Assignments count</span>
                      <div className="space-y-2 mt-1.5">
                        {Object.keys(hotelCountsMakkah).length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No bookings assigned to Makkah hotels.</p>
                        ) : (
                          Object.entries(hotelCountsMakkah).map(([name, data]) => (
                            <div key={name} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg border border-slate-150">
                              <span className="font-semibold text-slate-800">{name}</span>
                              <span className="font-mono text-slate-500">
                                <strong>{data.bookings}</strong> bookings / <strong className="text-slate-800">{data.pax}</strong> pilgrims
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-700 block">Madinah Hotel Assignments count</span>
                      <div className="space-y-2 mt-1.5">
                        {Object.keys(hotelCountsMadinah).length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No bookings assigned to Madinah hotels.</p>
                        ) : (
                          Object.entries(hotelCountsMadinah).map(([name, data]) => (
                            <div key={name} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg border border-slate-150">
                              <span className="font-semibold text-slate-800">{name}</span>
                              <span className="font-mono text-slate-500">
                                <strong>{data.bookings}</strong> bookings / <strong className="text-slate-800">{data.pax}</strong> pilgrims
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visualizer 3: Meal Planning summary count chart */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Catering Service meal segments volume</h4>
                    <p className="text-[10px] text-slate-400">Total cumulative dining plates required inside active confirmed windows.</p>
                  </div>

                  <div className="flex justify-around items-end h-44 pt-4 text-center">
                    <div className="space-y-2 w-20">
                      <div className="w-full bg-slate-100 rounded-xl h-24 overflow-hidden relative border border-slate-200">
                        <div className="bg-teal-600 w-full rounded-b-xl absolute bottom-0" style={{ height: `${Math.min(100, Math.round((totalBreakfastCount / 500) * 100))}%` }} />
                      </div>
                      <div className="text-xs">
                        <strong className="block font-black font-mono">{totalBreakfastCount}</strong>
                        <span className="text-[10px] text-slate-450 uppercase font-bold">Breakfasts</span>
                      </div>
                    </div>

                    <div className="space-y-2 w-20">
                      <div className="w-full bg-slate-100 rounded-xl h-24 overflow-hidden relative border border-slate-200">
                        <div className="bg-amber-600 w-full rounded-b-xl absolute bottom-0" style={{ height: `${Math.min(100, Math.round((totalLunchCount / 500) * 100))}%` }} />
                      </div>
                      <div className="text-xs">
                        <strong className="block font-black font-mono">{totalLunchCount}</strong>
                        <span className="text-[10px] text-slate-455 uppercase font-bold">Lunches</span>
                      </div>
                    </div>

                    <div className="space-y-2 w-20">
                      <div className="w-full bg-slate-100 rounded-xl h-24 overflow-hidden relative border border-slate-200">
                        <div className="bg-rose-600 w-full rounded-b-xl absolute bottom-0" style={{ height: `${Math.min(100, Math.round((totalDinnerCount / 500) * 100))}%` }} />
                      </div>
                      <div className="text-xs">
                        <strong className="block font-black font-mono">{totalDinnerCount}</strong>
                        <span className="text-[10px] text-slate-455 uppercase font-bold">Dinners</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visualizer 4: Premium Extra Service revenues list */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Premium Extra Services Revenue breakdown</h4>
                    <p className="text-[10px] text-slate-400">Total active sales volume driven by airport VIP, visa, and Taif mountain packages.</p>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pt-2">
                    {Object.keys(servicesUsageSummary).length === 0 ? (
                      <p className="text-slate-400 text-xs italic text-center py-8">No additional services recorded under confirmed bookings.</p>
                    ) : (
                      Object.entries(servicesUsageSummary).map(([name, data]) => (
                        <div key={name} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-150 rounded-xl">
                          <div>
                            <span className="font-extrabold block text-slate-800">{name}</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Booked {data.bookingsCount} times</span>
                          </div>
                          <strong className="text-emerald-800 font-mono font-black">MYR {data.totalRevenueMYR.toLocaleString()}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
