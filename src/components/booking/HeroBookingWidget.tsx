'use client';

import { useState } from 'react';
import { ServiceSelector } from './ServiceSelector';
import { TimeSlot } from './TimeSlot';
import { FastBookingSheet } from './FastBookingSheet';
import { useBookingStore } from '@/store/booking-store';
import { mockSlots, getNextAvailableSlot } from '@/store/mock-data';
import type { Service, TimeSlot as TimeSlotType } from '@/store/booking-types';

export function HeroBookingWidget() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const { 
    selectedService, 
    selectedSlot, 
    selectService, 
    selectSlot,
    activateFastBooking,
    calculateTotals
  } = useBookingStore();

  const nextSlot = getNextAvailableSlot(mockSlots);

  const handleSlotSelect = (slot: TimeSlotType) => {
    selectSlot(slot);
    // If service is also selected, open fast booking sheet
    if (selectedService) {
      setIsSheetOpen(true);
    }
  };

  const handleServiceSelect = (service: Service) => {
    selectService(service);
    calculateTotals();
  };

  const handleSecureSlot = () => {
    if (selectedService && selectedSlot) {
      activateFastBooking(selectedService, selectedSlot);
      setIsSheetOpen(true);
    } else if (selectedService && nextSlot) {
      // Auto-select next available slot
      selectSlot(nextSlot);
      activateFastBooking(selectedService, nextSlot);
      setIsSheetOpen(true);
    }
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
  };

  // Get next available time for display
  const getNextAvailableText = () => {
    if (!nextSlot) return 'No slots available';
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'short' });
    if (nextSlot.date === new Date().toISOString().split('T')[0]) {
      return `Today at ${nextSlot.time}`;
    }
    return `${today}, ${nextSlot.date.split('-')[2]} at ${nextSlot.time}`;
  };

  return (
    <div id="hero-booking" className="bg-white rounded-2xl shadow-lg p-6 lg:p-8">
      {/* Helper Headline */}
      <p className="text-center text-sm text-gray-500 mb-4 font-medium">
        Book your appointment in under 30 seconds.
      </p>
      
      {/* Next Available Badge */}
      <div className="flex items-center gap-2 text-sm text-green-600 mb-6">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="font-medium">Next available {getNextAvailableText()}</span>
      </div>
      
      {/* Service Selector */}
      <div className="mb-6">
        <ServiceSelector 
          onSelect={handleServiceSelect}
          selectedService={selectedService}
        />
      </div>

      {/* Date Picker - Simplified for hero */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-600 mb-3">Select a time</p>
        <div className="flex flex-wrap gap-2">
          {mockSlots.slice(0, 3).map((slot) => (
            <TimeSlot
              key={slot.id}
              slot={slot}
              isSelected={selectedSlot?.id === slot.id}
              onSelect={handleSlotSelect}
              compact
            />
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={handleSecureSlot}
        disabled={!selectedService}
        className={`w-full py-4 font-semibold rounded-xl transition-all duration-200
          flex items-center justify-center gap-2
          ${selectedService 
            ? 'bg-[#D4A59A] text-white hover:bg-[#C47D6D] active:scale-[0.98] shadow-lg hover:shadow-xl' 
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {selectedService ? 'SECURE THIS SLOT' : 'Select a service'}
      </button>

      {/* Trust badges */}
      <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>4.9 (1,200+)</span>
        </div>
        <span>•</span>
        <span>✓ Medical-grade sterilization</span>
      </div>

      {/* Fast Booking Sheet */}
      {selectedService && selectedSlot && (
        <FastBookingSheet
          isOpen={isSheetOpen}
          onClose={handleCloseSheet}
          service={selectedService}
          slot={selectedSlot}
        />
      )}
    </div>
  );
}

export default HeroBookingWidget;
