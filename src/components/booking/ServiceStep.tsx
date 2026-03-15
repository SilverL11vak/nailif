'use client';

import { useRef } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { mockServices } from '@/store/mock-data';
import type { Service } from '@/store/booking-types';

const serviceBenefits: Record<string, string> = {
  'gel-manicure': 'Long-lasting glossy finish',
  'acrylic-extensions': 'Durable length & strength',
  'luxury-spa-manicure': 'Ultimate pampering experience',
  'gel-pedicure': 'Perfect for feet',
  'nail-art': 'Custom designs',
};

export function ServiceStep() {
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectService = useBookingStore((state) => state.selectService);
  const nextStep = useBookingStore((state) => state.nextStep);
  const selectedStyle = useBookingStore((state) => state.selectedStyle);
  const continueButtonRef = useRef<HTMLDivElement>(null);

  const handleSelect = (service: Service) => {
    selectService(service);
    // Auto-advance to next step after short delay
    setTimeout(() => {
      nextStep();
      // Scroll next step into view
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Choose Your Service
        </h2>
        {selectedStyle ? (
          <div className="flex items-center justify-center gap-2 text-sm text-[#D4A59A] mb-2">
            <span>{selectedStyle.emoji}</span>
            <span>Style selected from gallery</span>
          </div>
        ) : (
          <p className="text-gray-500">
            Select a treatment to get started
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {mockServices.map((service) => {
          const isSelected = selectedService?.id === service.id;
          const benefit = serviceBenefits[service.id] || service.description || '';
          // Mini visual thumbnails for each service
          const serviceThumbnails: Record<string, string> = {
            'gel-manicure': '💅',
            'acrylic-extensions': '✨',
            'luxury-spa-manicure': '🌸',
            'gel-pedicure': '🦶',
            'nail-art': '🎨',
          };
          const thumbnail = serviceThumbnails[service.id] || '💅';

          return (
            <button
              key={service.id}
              onClick={() => handleSelect(service)}
              className={`
                relative flex flex-col items-start p-5 rounded-2xl border-2 
                transition-all duration-300 text-left
                hover:-translate-y-1 hover:shadow-xl
                ${isSelected 
                  ? 'border-[#D4A59A] bg-[#FFF9F5] shadow-lg' 
                  : 'border-gray-100 bg-white hover:border-[#D4A59A]'
                }
              `}
            >
              {/* Mini visual thumbnail */}
              <div className="absolute top-4 right-4 text-2xl opacity-60">
                {thumbnail}
              </div>

              {/* Popular Badge */}
              {service.isPopular && (
                <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Most booked
                </span>
              )}

              {/* Service Name */}
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {service.name}
              </h3>

              {/* Benefit Text */}
              <p className="text-sm text-gray-500 mb-3">
                {benefit}
              </p>

              {/* Duration & Price */}
              <div className="flex items-center justify-between w-full mt-auto">
                <div className="flex items-center gap-3">
                  {/* Duration Label */}
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {service.duration} min
                  </div>
                </div>
                {/* Clearer Price Hierarchy */}
                <div className="text-right">
                  <span className="text-lg font-bold text-[#D4A59A]">
                    €{service.price}
                  </span>
                </div>
              </div>

              {/* Selection Indicator - Strong highlight with checkmark */}
              {isSelected && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#D4A59A] rounded-full flex items-center justify-center animate-scale-in">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Hidden ref for scroll-into-view after selection */}
      <div ref={continueButtonRef} />
      
      {/* Decision Safety Microcopy */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-400 pt-4">
        <span>✓ Book in seconds</span>
        <span>•</span>
        <span>Free reschedule</span>
      </div>
      
      <style jsx>{`
        @keyframes scale-in {
          0% { transform: translate(-50%, -50%) scale(0); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default ServiceStep;