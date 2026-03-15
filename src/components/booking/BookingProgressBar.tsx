'use client';

import { useBookingStore } from '@/store/booking-store';

const steps = [
  { id: 1, label: 'Service' },
  { id: 2, label: 'Date' },
  { id: 3, label: 'Time' },
  { id: 4, label: 'Details' },
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
          {steps.map((step, index) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isClickable = step.id <= currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step Circle - with smooth scale animation */}
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

                {/* Step Label - visible on all screens */}
                <span 
                  className={`
                    mt-2 text-xs font-medium transition-all duration-300
                    ${isCurrent ? 'text-[#D4A59A] scale-105' : isCompleted ? 'text-gray-700' : 'text-gray-400'}
                  `}
                >
                  {step.label}
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