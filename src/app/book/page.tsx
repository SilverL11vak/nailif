'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { BookingProgressBar } from '@/components/booking/BookingProgressBar';
import { ServiceStep } from '@/components/booking/ServiceStep';
import { DateTimeStep } from '@/components/booking/DateTimeStep';
import { ContactStep } from '@/components/booking/ContactStep';
import { ExtrasStep } from '@/components/booking/ExtrasStep';
import { ConfirmStep } from '@/components/booking/ConfirmStep';
import { mockServices } from '@/store/mock-data';

// Gallery nail styles for deep linking - must match homepage
const nailStyles = [
  { id: '1', name: 'Glossy Pink French', slug: 'glossy-pink-french', recommendedServiceId: 'gel-manicure', emoji: '💅' },
  { id: '2', name: 'Matte Nude', slug: 'matte-nude', recommendedServiceId: 'gel-manicure', emoji: '🎀' },
  { id: '3', name: 'Chrome Silver', slug: 'chrome-silver', recommendedServiceId: 'nail-art', emoji: '✨' },
  { id: '4', name: 'Ombre Sunset', slug: 'ombre-sunset', recommendedServiceId: 'gel-manicure', emoji: '🌅' },
  { id: '5', name: 'Ruby Red', slug: 'ruby-red', recommendedServiceId: 'gel-manicure', emoji: '❤️' },
  { id: '6', name: 'Pearl White', slug: 'pearl-white', recommendedServiceId: 'luxury-spa-manicure', emoji: '⚪' },
];

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = useBookingStore((state) => state.currentStep);
  const prevStep = useBookingStore((state) => state.prevStep);
  const setMode = useBookingStore((state) => state.setMode);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const selectedStyle = useBookingStore((state) => state.selectedStyle);
  const setSelectedStyle = useBookingStore((state) => state.setSelectedStyle);
  const selectService = useBookingStore((state) => state.selectService);
  const nextStep = useBookingStore((state) => state.nextStep);
  
  // Calculate total price locally
  const total = selectedService?.price || 0;
  const serviceRef = useRef<HTMLDivElement>(null);

  // Handle style deep link - preselect service
  useEffect(() => {
    const styleSlug = searchParams.get('style');
    if (styleSlug) {
      const style = nailStyles.find(s => s.slug === styleSlug);
      if (style) {
        setSelectedStyle(style);
        // Preselect the recommended service
        const recommendedService = mockServices.find(s => s.id === style.recommendedServiceId);
        if (recommendedService && !selectedService) {
          selectService(recommendedService);
          // Auto-advance after short delay for smooth UX
          setTimeout(() => {
            nextStep();
            // Scroll service into view if needed
            serviceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }
    }
  }, [searchParams, setSelectedStyle, selectService, selectedService, nextStep]);

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
      {/* Premium Identity Block */}
      <div className="bg-white border-b border-gray-100 py-3">
        <div className="max-w-xl mx-auto px-4 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            {/* Elegant avatar placeholder */}
            <div className="w-8 h-8 rounded-full bg-[#D4A59A]/20 flex items-center justify-center">
              <span className="text-sm text-[#D4A59A]">S</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-800">Booking with Sandra</p>
              <p className="text-xs text-gray-400">Mustamäe Studio</p>
            </div>
          </div>
          <span className="text-gray-200">•</span>
          <span className="text-xs text-gray-400">Certified nail technician</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-[73px] z-10">
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
                {selectedStyle && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-lg">{selectedStyle.emoji}</span>
                    <span className="text-gray-700 font-medium">{selectedStyle.name}</span>
                  </div>
                )}
                {selectedStyle && (selectedService || selectedSlot) && (
                  <span className="text-gray-300">•</span>
                )}
                {selectedService && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{selectedService.name}</span>
                  </div>
                )}
                {selectedService && selectedSlot && (
                  <span className="text-gray-300">•</span>
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
                €{total}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 py-8">
        {/* Floating Premium Card Effect */}
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* Subtle top gradient line */}
          <div className="h-1 bg-gradient-to-r from-[#D4A59A] via-[#E8C4B8] to-[#D4A59A]" />
          
          {/* Step Animation Container */}
          <div className="animate-fade-in p-6 sm:p-8" key={currentStep}>
            {renderStep()}
          </div>
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

// Default export with Suspense boundary for useSearchParams
export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="animate-pulse text-[#D4A59A]">Loading...</div>
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}