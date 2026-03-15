'use client';

import { useBookingStore } from '@/store/booking-store';

const steps = [
  { id: 1, label: 'Service' },
  { id: 2, label: 'Date & Time' },
  { id: 3, label: 'Details' },
  { id: 4, label: 'Extras' },
  { id: 5, label: 'Confirm' },
];

export function BookingProgressBar() {
  const currentStep = useBookingStore((state) => state.currentStep);
  const setStep = useBookingStore((state) => state.setStep);

  const handleStepClick = (stepId: number) => {
    // Only allow clicking on completed steps or current step
    if (stepId <= currentStep) {
      setStep(stepId as 1 | 2 | 3 | 4 | 5);
    }
  };

  return (
    <div className="w-full bg-white border-b border-gray-100 py-4">
      <div className="max-w-xl mx-auto px-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isClickable = step.id <= currentStep;

            return (
              <div key={step.id} className="flex items-center">
                {/* Step Circle */}
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={`
                    relative flex items-center justify-center w-8 h-8 rounded-full 
                    text-sm font-medium transition-all duration-200
                    ${isCompleted 
                      ? 'bg-[#D4A59A] text-white' 
                      : isCurrent 
                        ? 'bg-[#D4A59A] text-white ring-4 ring-[#D4A59A]/20' 
                        : 'bg-gray-100 text-gray-400'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </button>

                {/* Step Label - hide on mobile */}
                <span 
                  className={`
                    hidden md:block ml-2 text-sm font-medium transition-colors duration-200
                    ${isCurrent ? 'text-[#D4A59A]' : isCompleted ? 'text-gray-700' : 'text-gray-400'}
                  `}
                >
                  {step.label}
                </span>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div 
                    className={`
                      w-8 md:w-16 h-0.5 mx-2 transition-colors duration-200
                      ${isCompleted ? 'bg-[#D4A59A]' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BookingProgressBar;