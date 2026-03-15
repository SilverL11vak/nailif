'use client';

import { useState, useEffect } from 'react';
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
    }, 300);

    return () => clearTimeout(timer);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    selectSlot(slot);
  };

  const handleContinue = () => {
    if (selectedSlot) {
      nextStep();
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
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

      {/* Horizontal Date Scroller */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {dates.map((date, index) => {
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          
          return (
            <button
              key={index}
              onClick={() => handleDateSelect(date)}
              className={`
                flex-shrink-0 flex flex-col items-center justify-center 
                w-16 h-20 rounded-2xl border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-[#D4A59A] bg-[#FFF9F5]' 
                  : 'border-gray-100 bg-white hover:border-[#D4A59A]'
                }
              `}
            >
              <span className={`text-xs font-medium ${isSelected ? 'text-[#D4A59A]' : 'text-gray-500'}`}>
                {isToday(date) ? 'Today' : formatDate(date).split(' ')[0]}
              </span>
              <span className={`text-xl font-semibold ${isSelected ? 'text-[#D4A59A]' : 'text-gray-800'}`}>
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

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!selectedSlot}
        className={`
          w-full py-4 rounded-xl font-semibold transition-all duration-200
          ${selectedSlot 
            ? 'bg-[#D4A59A] text-white hover:bg-[#C47D6D] active:scale-[0.98]' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        Continue
      </button>
    </div>
  );
}

export default DateTimeStep;