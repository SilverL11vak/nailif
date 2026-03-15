'use client';

import { useState, useEffect, useRef } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { generateSlotsForDate } from '@/store/mock-data';
import type { TimeSlot } from '@/store/booking-types';
import TimeSlotComponent from './TimeSlot';

export function DateTimeStep() {
  const selectedDate = useBookingStore((state) => state.selectedDate);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const selectDate = useBookingStore((state) => state.selectDate);
  const selectSlot = useBookingStore((state) => state.selectSlot);
  const nextStep = useBookingStore((state) => state.nextStep);

  const [isLoading, setIsLoading] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [showPreselectedMsg, setShowPreselectedMsg] = useState(false);
  const continueButtonRef = useRef<HTMLDivElement>(null);

  // Generate dates for next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  // Load slots when date changes
  useEffect(() => {
    const dateToUse = selectedDate || dates[0];
    selectDate(dateToUse);
    
    setIsLoading(true);
    // Simulate API call
    const timer = setTimeout(() => {
      const generatedSlots = generateSlotsForDate(dateToUse);
      setSlots(generatedSlots);
      setIsLoading(false);
      
      // Auto preselect first available slot
      const firstAvailable = generatedSlots.find(s => s.available);
      if (firstAvailable && !selectedSlot) {
        selectSlot(firstAvailable);
        setShowPreselectedMsg(true);
        // Hide message after 3 seconds
        setTimeout(() => setShowPreselectedMsg(false), 3000);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const handleDateSelect = (date: Date) => {
    selectDate(date);
    setIsLoading(true);
    
    // Simulate API call
    const timer = setTimeout(() => {
      const generatedSlots = generateSlotsForDate(date);
      setSlots(generatedSlots);
      setIsLoading(false);
      
      // Auto preselect first available slot
      const firstAvailable = generatedSlots.find(s => s.available);
      if (firstAvailable) {
        selectSlot(firstAvailable);
        setShowPreselectedMsg(true);
        setTimeout(() => setShowPreselectedMsg(false), 3000);
      }
    }, 300);

    return () => clearTimeout(timer);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    selectSlot(slot);
  };

  const handleContinue = () => {
    if (selectedSlot) {
      nextStep();
      // Scroll next step into view
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date has available slots
  const hasAvailableSlots = (date: Date) => {
    const dateSlots = generateSlotsForDate(date);
    return dateSlots.some(s => s.available);
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Choose Date & Time
        </h2>
        <p className="text-gray-500">
          Pick a convenient time for your appointment
        </p>
      </div>

      {/* Helper Microcopy */}
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-xl mb-4">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Earliest available appointment highlighted</span>
      </div>

      {/* Beauty Context Microcopy */}
      <div className="mb-6 p-4 bg-gradient-to-r from-[#D4A59A]/5 to-[#D4A59A]/10 rounded-2xl border border-[#D4A59A]/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#D4A59A]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">✨</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1">Your nails will thank you</p>
            <p className="text-xs text-gray-500">Relax in our Mustamäe studio. Each appointment includes a consultation to ensure your nails are perfectly suited to your lifestyle.</p>
          </div>
        </div>
      </div>

      {/* Horizontal Date Scroller */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {dates.map((date, index) => {
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const isEarliest = index === 0 && hasAvailableSlots(date);
          const hasSlots = hasAvailableSlots(date);
          
          return (
            <button
              key={index}
              onClick={() => hasSlots && handleDateSelect(date)}
              disabled={!hasSlots}
              className={`
                flex-shrink-0 flex flex-col items-center justify-center 
                w-16 h-20 rounded-2xl border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-[#D4A59A] bg-[#FFF9F5] shadow-md' 
                  : hasSlots 
                    ? isEarliest
                      ? 'border-amber-300 bg-amber-50 hover:border-amber-400 hover:shadow-md'
                      : 'border-gray-100 bg-white hover:border-[#D4A59A]'
                    : 'border-gray-50 bg-gray-50 cursor-not-allowed opacity-40'
                }
                ${hasSlots ? 'cursor-pointer' : ''}
              `}
            >
              {/* Earliest badge */}
              {isEarliest && (
                <span className="text-[10px] font-semibold text-amber-600 mb-0.5">Earliest</span>
              )}
              <span className={`text-xs font-medium ${isSelected ? 'text-[#D4A59A]' : hasSlots ? 'text-gray-500' : 'text-gray-300'}`}>
                {isToday(date) ? 'Today' : formatDate(date).split(' ')[0]}
              </span>
              <span className={`text-xl font-semibold ${isSelected ? 'text-[#D4A59A]' : hasSlots ? 'text-gray-800' : 'text-gray-300'}`}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slot List */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Available Times
        </h3>
        
        {/* Auto preselected microcopy */}
        {showPreselectedMsg && selectedSlot && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg mb-3 animate-fade-in">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Earliest available time preselected</span>
          </div>
        )}
        
        {isLoading ? (
          // Loading skeleton
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div 
                key={i}
                className="h-14 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {slots.map((slot) => (
              <TimeSlotComponent
                key={slot.id}
                slot={slot}
                isSelected={selectedSlot?.id === slot.id}
                onSelect={handleSlotSelect}
              />
            ))}
          </div>
        )}

        {!isLoading && slots.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No available slots for this date.</p>
            <p className="text-sm">Please try another date.</p>
          </div>
        )}
      </div>

      {/* Reassurance text */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 p-3 bg-gray-50 rounded-xl">
        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Free reschedule if your plans change</span>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!selectedSlot}
        className={`
          w-full py-4 rounded-xl font-semibold transition-all duration-200
          ${selectedSlot 
            ? 'bg-[#D4A59A] text-white hover:bg-[#C47D6D] active:scale-[0.98] shadow-lg hover:shadow-xl' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {selectedSlot ? 'Continue to Details' : 'Select a time'}
      </button>
      
      {/* Hidden ref for scroll */}
      <div ref={continueButtonRef} />
    </div>
  );
}

export default DateTimeStep;