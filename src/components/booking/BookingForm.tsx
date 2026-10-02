"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  Calendar,
  User,
  Search,
  Plus,
  DoorOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Receipt,
  Sparkles,
  BedDouble,
  Clock,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { ICustomerData } from "@/types/customer";
import { IBookingData } from "@/types/booking";

interface BookingFormProps {
  portalType: "manager" | "receptionist";
  initialData?: IBookingData;
  isEdit?: boolean;
}

export default function BookingForm({
  portalType,
  initialData,
  isEdit = false,
}: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useUser();

  const accentColor = portalType === "manager" ? "amber" : "cyan";
  const basePath = `/${portalType}/bookings`;

  // Step 1: Customer State
  const [customers, setCustomers] = useState<ICustomerData[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomerData | null>(null);

  // Quick Customer Creation inline modal state
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [quickFullName, setQuickFullName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickIdType, setQuickIdType] = useState("Aadhaar");
  const [quickIdNumber, setQuickIdNumber] = useState("");
  const [quickCity, setQuickCity] = useState("");
  const [creatingQuickCustomer, setCreatingQuickCustomer] = useState(false);
  const [quickCustomerError, setQuickCustomerError] = useState<string | null>(null);

  // Step 2: Dates & Nights
  const getTodayString = () => new Date().toISOString().split("T")[0];
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const [checkInDate, setCheckInDate] = useState<string>(
    initialData
      ? new Date(initialData.checkInDate).toISOString().split("T")[0]
      : getTodayString()
  );
  const [checkInTime, setCheckInTime] = useState<string>(
    initialData?.checkInAt
      ? new Date(initialData.checkInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "14:00"
  );
  const [checkOutDate, setCheckOutDate] = useState<string>(
    initialData
      ? new Date(initialData.checkOutDate).toISOString().split("T")[0]
      : getTomorrowString()
  );

  // Step 3: Available Rooms State
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  // Step 4: Guests, Pricing & Metadata
  const [adults, setAdults] = useState<number>(initialData?.adults || 1);
  const [children, setChildren] = useState<number>(initialData?.children || 0);
  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);
  const [bookingSource, setBookingSource] = useState<string>(
    initialData?.bookingSource || "WALK_IN"
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || "");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<IBookingData | null>(null);

  // Prepopulate if customerId passed in query
  useEffect(() => {
    const prefillCustomerId = searchParams.get("customerId");
    if (prefillCustomerId && token && !initialData) {
      fetch(`/api/customers/${prefillCustomerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.customer) {
            setSelectedCustomer(data.customer);
          }
        })
        .catch(() => {});
    }
  }, [searchParams, token, initialData]);

  // Set initial data when editing
  useEffect(() => {
    if (initialData) {
      if (initialData.customerId && typeof initialData.customerId === "object") {
        setSelectedCustomer(initialData.customerId as ICustomerData);
      }
      if (initialData.roomId && typeof initialData.roomId === "object") {
        setSelectedRoom(initialData.roomId);
      }
    }
  }, [initialData]);

  // Search existing customers
  const searchCustomersList = useCallback(
    async (query: string) => {
      if (!token) return;
      setSearchingCustomers(true);
      try {
        const res = await fetch(
          `/api/customers?search=${encodeURIComponent(query)}&limit=10`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setCustomers(data.customers || []);
        }
      } catch {
        // quiet error
      } finally {
        setSearchingCustomers(false);
      }
    },
    [token]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchCustomersList(customerSearch);
    }, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch, searchCustomersList]);

  // Query Available Rooms whenever dates change
  const fetchAvailableRooms = useCallback(async () => {
    if (!token || !checkInDate || !checkOutDate) return;

    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      setAvailableRooms([]);
      return;
    }

    setLoadingRooms(true);
    try {
      const params = new URLSearchParams({
        checkInDate,
        checkOutDate,
        guests: String(adults + children || 1),
      });

      if (isEdit && initialData?._id) {
        params.set("excludeBookingId", initialData._id);
      }

      const res = await fetch(`/api/rooms/available?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAvailableRooms(data.rooms || []);
        // If current selected room is not in available rooms (and not initial in edit), unselect it
        if (selectedRoom && !data.rooms.some((r: any) => r._id === selectedRoom._id)) {
          if (!isEdit || selectedRoom._id !== (initialData?.roomId as any)?._id) {
            setSelectedRoom(null);
          }
        }
      }
    } catch {
      // quiet error
    } finally {
      setLoadingRooms(false);
    }
  }, [token, checkInDate, checkOutDate, adults, children, isEdit, initialData, selectedRoom]);

  useEffect(() => {
    fetchAvailableRooms();
  }, [checkInDate, checkOutDate, adults, children]);

  // Calculate Nights
  const numberOfNights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [checkInDate, checkOutDate]);

  // Calculate Pricing breakdown
  const pricing = useMemo(() => {
    const pricePerNight = selectedRoom?.pricePerNight || initialData?.pricePerNight || 0;
    const roomAmount = pricePerNight * numberOfNights;
    const validDiscount = Math.max(0, Math.min(discount || 0, roomAmount));
    const taxableAmount = Math.max(0, roomAmount - validDiscount);
    const tax = Math.round(taxableAmount * 0.12); // 12% GST
    const totalAmount = taxableAmount + tax;

    return {
      pricePerNight,
      roomAmount,
      discount: validDiscount,
      tax,
      totalAmount,
    };
  }, [selectedRoom, initialData, numberOfNights, discount]);

  // Quick Customer Creation Handler
  const handleCreateQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingQuickCustomer(true);
    setQuickCustomerError(null);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: quickFullName.trim(),
          phone: quickPhone.trim(),
          email: quickEmail.trim() || undefined,
          idType: quickIdType || undefined,
          idNumber: quickIdNumber.trim() || undefined,
          city: quickCity.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create customer");
      }

      setSelectedCustomer(data.customer);
      setShowQuickCustomerModal(false);
      // Reset form
      setQuickFullName("");
      setQuickPhone("");
      setQuickEmail("");
      setQuickIdNumber("");
      setQuickCity("");
    } catch (err: any) {
      setQuickCustomerError(err.message || "An error occurred");
    } finally {
      setCreatingQuickCustomer(false);
    }
  };

  // Submit Booking (Create / Edit)
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCustomer?._id) {
      setFormError("Please select a registered guest/customer.");
      return;
    }

    if (!selectedRoom?._id && !initialData?.roomId) {
      setFormError("Please select an available room.");
      return;
    }

    if (numberOfNights <= 0) {
      setFormError("Check-out date must be after check-in date (minimum 1 night).");
      return;
    }

    const totalGuests = Number(adults) + Number(children);
    const roomCapacity = selectedRoom?.capacity || (initialData?.roomId as any)?.capacity || 2;
    if (totalGuests > roomCapacity) {
      setFormError(
        `Total guest count (${totalGuests}) exceeds selected room capacity (${roomCapacity}).`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        customerId: selectedCustomer._id,
        roomId: selectedRoom?._id || (initialData?.roomId as any)?._id,
        checkInDate,
        checkInTime: checkInTime || "14:00",
        checkOutDate,
        adults: Number(adults),
        children: Number(children),
        discount: Number(discount) || 0,
        bookingSource,
        notes: notes.trim() || undefined,
      };

      const url = isEdit ? `/api/bookings/${initialData?._id}` : "/api/bookings";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process booking");
      }

      if (isEdit) {
        router.push(`${basePath}/${initialData?._id}`);
      } else {
        setCreatedBooking(data.booking);
      }
    } catch (err: any) {
      setFormError(err.message || "An error occurred while saving booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (createdBooking) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 animate-fade-in">
          <div className="w-18 h-18 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
              Reservation Confirmed
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Booking Created Successfully!
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              The room has been reserved. Booking reference ID is below.
            </p>
          </div>

          {/* Dossier Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 text-left space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  Booking Reference ID
                </span>
                <p className="font-mono text-lg font-extrabold text-cyan-400">
                  {createdBooking.bookingId}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {createdBooking.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Guest Name</span>
                <span className="font-bold text-white">
                  {(createdBooking.customerId as any)?.fullName || selectedCustomer?.fullName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Room Allocation</span>
                <span className="font-bold text-white">
                  Room {(createdBooking.roomId as any)?.roomNumber || selectedRoom?.roomNumber} (
                  {(createdBooking.roomId as any)?.roomType || selectedRoom?.roomType})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Stay Schedule</span>
                <span className="font-bold text-white">
                  {new Date(createdBooking.checkInDate).toLocaleDateString()} →{" "}
                  {new Date(createdBooking.checkOutDate).toLocaleDateString()}
                </span>
                <span className="text-[10px] text-cyan-400 block font-mono">
                  {createdBooking.numberOfNights} Nights
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Amount</span>
                <span className="font-extrabold text-white text-base">
                  ₹{createdBooking.totalAmount?.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Incl. 12% GST (₹{createdBooking.tax?.toLocaleString()})
                </span>
              </div>
            </div>
          </div>

          {/* CTA Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`${basePath}/${createdBooking._id}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition border border-slate-700"
            >
              View Booking Dossier
            </Link>
            <button
              onClick={() => {
                setCreatedBooking(null);
                setSelectedCustomer(null);
                setSelectedRoom(null);
                setNotes("");
                setDiscount(0);
                setCheckInDate(getTodayString());
                setCheckOutDate(getTomorrowString());
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Another Booking</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4" />
            <span>{isEdit ? "Modify Reservation" : "New Reservation"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isEdit ? `Edit Booking ${initialData?.bookingId}` : "Create Room Booking"}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            {isEdit
              ? "Update reservation stay dates, room allocation, or guest occupancy."
              : "Register guest reservation with real-time room availability verification."}
          </p>
        </div>

        <Link
          href={basePath}
          className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
        >
          Cancel & Back
        </Link>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmitBooking} className="space-y-6">
        {/* SECTION 1: CUSTOMER / GUEST SELECTION */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Guest Information</h2>
            </div>
            {!isEdit && (
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Register Guest</span>
              </button>
            )}
          </div>

          {/* Selected Customer View or Search Box */}
          {selectedCustomer ? (
            <div className="p-4 bg-slate-950/60 border border-cyan-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-extrabold text-sm">
                  {selectedCustomer.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {selectedCustomer.fullName}
                    </h3>
                    <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      {selectedCustomer.customerId}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>📞 {selectedCustomer.phone}</span>
                    {selectedCustomer.email && <span>✉️ {selectedCustomer.email}</span>}
                    {selectedCustomer.city && <span>📍 {selectedCustomer.city}</span>}
                  </div>
                </div>
              </div>

              {!isEdit && (
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Change Guest
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search existing guest by name, phone, or customer ID..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              {/* Customer Search Dropdown Results */}
              {searchingCustomers ? (
                <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Searching hotel guest ledger...</span>
                </div>
              ) : customers.length > 0 ? (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl max-h-48 overflow-y-auto bg-slate-950/80">
                  {customers.map((c) => (
                    <div
                      key={c._id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch("");
                      }}
                      className="p-3 flex items-center justify-between hover:bg-slate-800/50 cursor-pointer transition text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{c.fullName}</span>
                          <span className="font-mono text-[10px] text-cyan-400">
                            {c.customerId}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {c.phone} {c.email ? `• ${c.email}` : ""}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 font-bold text-[10px]">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              ) : customerSearch.trim() ? (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
                  No registered guest found matching "{customerSearch}".
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* SECTION 2: STAY DATES & OCCUPANCY */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Stay Schedule & Occupancy</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Check-in Date *
              </label>
              <input
                type="date"
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Check-in Time *
              </label>
              <input
                type="time"
                required
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Check-out Date *
              </label>
              <input
                type="date"
                required
                value={checkOutDate}
                min={checkInDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Adults (Age 12+) *
              </label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={adults}
                onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Children
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={children}
                onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Calculated Stay Duration:</span>
              <strong className="text-white font-mono">{numberOfNights} Nights</strong>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Total Guests:</span>
              <strong className="text-white font-mono">{adults + children}</strong>
            </div>
          </div>
        </div>

        {/* SECTION 3: ROOM SELECTION & AVAILABILITY */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Select Available Room</h2>
            </div>
            <span className="text-xs text-slate-400">
              {availableRooms.length} {availableRooms.length === 1 ? "room" : "rooms"} available
            </span>
          </div>

          {loadingRooms ? (
            <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Checking room availability & double-booking conflicts...</span>
            </div>
          ) : numberOfNights <= 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
              Select valid Check-in and Check-out dates to view available rooms.
            </div>
          ) : availableRooms.length === 0 ? (
            <div className="p-6 text-center text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
              <p className="font-bold">No rooms available for the selected dates & guest count.</p>
              <p className="text-slate-400 text-[11px]">
                Try selecting different dates or adjusting the guest count.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {availableRooms.map((room) => {
                const isSelected = selectedRoom?._id === room._id;
                return (
                  <div
                    key={room._id}
                    onClick={() => setSelectedRoom(room)}
                    className={`p-4 rounded-xl border cursor-pointer transition duration-150 relative ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/10"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <DoorOpen className={`w-4 h-4 ${isSelected ? "text-cyan-400" : "text-slate-400"}`} />
                      <span className="font-extrabold text-white text-sm">
                        Room {room.roomNumber}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-400 mb-3">
                      <p className="text-slate-200 font-semibold">{room.roomType}</p>
                      <p className="text-[11px]">Floor {room.floor} • Max {room.capacity} Guests</p>
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {room.amenities.slice(0, 3).map((am: string) => (
                            <span
                              key={am}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
                            >
                              {am}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Rate / Night</span>
                      <span className="font-extrabold text-cyan-400 text-sm">
                        ₹{room.pricePerNight?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 4: FINANCIAL BREAKDOWN & NOTES */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Pricing & Booking Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Booking Source, Discount, Notes */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Booking Channel / Source
                </label>
                <select
                  value={bookingSource}
                  onChange={(e) => setBookingSource(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  <option value="WALK_IN">Front Desk Walk-in</option>
                  <option value="PHONE">Phone Reservation</option>
                  <option value="WEBSITE">Official Website</option>
                  <option value="OTHER">Other / Corporate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Special Notes / Requests
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Late check-in, extra pillows, airport pickup..."
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>
            </div>

            {/* Right Column: Dynamic Price Summary Box */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Authoritative Price Snapshot
                </span>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Room Rate per Night:</span>
                  <span className="font-mono text-white">₹{pricing.pricePerNight?.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Stay Duration:</span>
                  <span className="font-mono text-white">{numberOfNights} Nights</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Subtotal (Room Amount):</span>
                  <span className="font-mono text-white">₹{pricing.roomAmount?.toLocaleString()}</span>
                </div>

                {pricing.discount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Discount applied:</span>
                    <span className="font-mono">- ₹{pricing.discount?.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-300">
                  <span>Taxes (12% GST):</span>
                  <span className="font-mono text-white">₹{pricing.tax?.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">Total Payable</span>
                  <span className="text-[10px] text-slate-500">Includes all applicable taxes</span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-white">
                  ₹{pricing.totalAmount?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={basePath}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || !selectedCustomer || (!selectedRoom && !initialData?.roomId)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEdit ? "Updating..." : "Creating Booking..."}</span>
              </>
            ) : (
              <>
                <CalendarCheck className="w-4 h-4" />
                <span>{isEdit ? "Save Changes" : "Confirm & Reserve Room"}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* QUICK CUSTOMER REGISTRATION MODAL */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Quick Register Guest</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {quickCustomerError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{quickCustomerError}</span>
              </div>
            )}

            <form onSubmit={handleCreateQuickCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={quickFullName}
                  onChange={(e) => setQuickFullName(e.target.value)}
                  placeholder="Guest full name"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                    placeholder="guest@mail.com"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    ID Type
                  </label>
                  <select
                    value={quickIdType}
                    onChange={(e) => setQuickIdType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    ID Number
                  </label>
                  <input
                    type="text"
                    value={quickIdNumber}
                    onChange={(e) => setQuickIdNumber(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  City / State
                </label>
                <input
                  type="text"
                  value={quickCity}
                  onChange={(e) => setQuickCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingQuickCustomer}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5 disabled:opacity-60"
                >
                  {creatingQuickCustomer ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Register & Select</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
