'use client';

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

  const handleSelect = (service: Service) => {
    selectService(service);
    // Auto-advance to next step
    setTimeout(() => {
      nextStep();
    }, 300);
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Choose Your Service
        </h2>
        <p className="text-gray-500">
          Select a treatment to get started
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {mockServices.map((service) => {
          const isSelected = selectedService?.id === service.id;
          const benefit = serviceBenefits[service.id] || service.description || '';

          return (
            <button
              key={service.id}
              onClick={() => handleSelect(service)}
              className={`
                relative flex flex-col items-start p-5 rounded-2xl border-2 
                transition-all duration-200 text-left
                ${isSelected 
                  ? 'border-[#D4A59A] bg-[#FFF9F5] shadow-md' 
                  : 'border-gray-100 bg-white hover:border-[#D4A59A] hover:shadow-sm'
                }
              `}
            >
              {/* Popular Badge */}
              {service.isPopular && (
                <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                  Popular
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
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {service.duration} min
                </div>
                <span className="text-lg font-semibold text-[#D4A59A]">
                  From £{service.price}
                </span>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#D4A59A] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ServiceStep;