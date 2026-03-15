'use client';

import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';

const steps = [
  { id: 1, labelKey: 'booking.stepService' },
  { id: 2, labelKey: 'booking.stepDateTime' },
  { id: 3, labelKey: 'booking.stepDetails' },
  { id: 4, labelKey: 'booking.stepConfirm' },
];

export function BookingProgressBar() {
  const { t } = useTranslation();
  const currentStep = useBookingStore((state) => state.currentStep);
  const setStep = useBookingStore((state) => state.setStep);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  
  // Reduce visual dominance after step 2 (when service and time are selected)
  const isMinimalMode = currentStep >= 3;

  const handleStepClick = (stepId: number) => {
    if (stepId <= currentStep) {
      setStep(stepId as 1 | 2 | 3 | 4);
    }
  };

  // Compact version for later steps
  if (isMinimalMode) {
    return (
      <div className="w-full bg-white border-b border-gray-50 py-2">
        <div className="max-w-xl mx-auto px-4 flex items-center justify-center gap-2 text-sm">
          {/* Compact summary */}
          <span className="text-gray-500">
            {selectedService?.name}
          </span>
          <span className="text-gray-300">•</span>
          <span className="text-gray-500">
            {selectedSlot ? `${new Date(selectedSlot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${t('confirm.at')} ${selectedSlot.time}` : ''}
          </span>
          <span className="text-gray-300">•</span>
          <button 
            onClick={() => handleStepClick(1)}
            className="text-[#D4A59A] hover:underline font-medium"
          >
            {t('booking.edit')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border-b border-gray-100 py-4 overflow-hidden">
      <div className="max-w-xl mx-auto px-4">
        {/* Progress Line Background */}
        <div className="relative mb-6">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100" />
          <div 
            className="absolute top-4 left-0 h-0.5 bg-[#D4A59A] transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between relative">
          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isClickable = step.id <= currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step Circle */}
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={`
                    relative flex items-center justify-center w-10 h-10 rounded-full 
                    text-sm font-semibold transition-all duration-300 transform
                    ${isCompleted 
                      ? 'bg-[#D4A59A] text-white scale-100' 
                      : isCurrent 
                        ? 'bg-[#D4A59A] text-white scale-110 shadow-lg shadow-[#D4A59A]/30' 
                        : 'bg-gray-100 text-gray-400'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-115' : 'cursor-default'}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5 animate-scale-in" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span>{step.id}</span>
                  )}
                  
                  {/* Current step pulse */}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-[#D4A59A]/30" />
                  )}
                </button>

                {/* Step Label */}
                <span 
                  className={`
                    mt-2 text-xs font-medium transition-all duration-300
                    ${isCurrent ? 'text-[#D4A59A] scale-105' : isCompleted ? 'text-gray-700' : 'text-gray-400'}
                  `}
                >
                  {t(step.labelKey)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scale-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default BookingProgressBar;
