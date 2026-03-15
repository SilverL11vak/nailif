'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { BookingProgressBar } from '@/components/booking/BookingProgressBar';
import { ServiceStep } from '@/components/booking/ServiceStep';
import { DateTimeStep } from '@/components/booking/DateTimeStep';
import { ContactStep } from '@/components/booking/ContactStep';
import { ExtrasStep } from '@/components/booking/ExtrasStep';
import { ConfirmStep } from '@/components/booking/ConfirmStep';

export default function BookingPage() {
  const router = useRouter();
  const currentStep = useBookingStore((state) => state.currentStep);
  const prevStep = useBookingStore((state) => state.prevStep);
  const setMode = useBookingStore((state) => state.setMode);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  
  // Calculate total price locally
  const total = selectedService?.price || 0;

  // Initialize - set mode to guided and ensure we start at step 1
  useEffect(() => {
    setMode('guided');
  }, [setMode]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleBack = () => {
    if (currentStep > 1) {
      prevStep();
    } else {
      router.push('/');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ServiceStep />;
      case 2:
        return <DateTimeStep />;
      case 3:
        return <ContactStep />;
      case 4:
        return <ExtrasStep />;
      case 5:
        return <ConfirmStep />;
      default:
        return <ServiceStep />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-[#D4A59A] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Logo */}
            <h1 className="text-xl font-semibold text-[#D4A59A]">Nailify</h1>

            {/* Spacer for balance */}
            <div className="w-16" />
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <BookingProgressBar />

      {/* Sticky Booking Summary - Shows after step 2 */}
      {currentStep >= 3 && (selectedService || selectedSlot) && (
        <div className="sticky top-[73px] z-10 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedService && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{selectedService.name}</span>
                    <span className="text-xs text-gray-400">•</span>
                  </div>
                )}
                {selectedSlot && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      {selectedSlot.date} at {selectedSlot.time}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm font-semibold text-[#D4A59A]">
                £{total}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 py-8">
        {/* Step Animation Container */}
        <div className="animate-fade-in" key={currentStep}>
          {renderStep()}
        </div>
      </main>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}