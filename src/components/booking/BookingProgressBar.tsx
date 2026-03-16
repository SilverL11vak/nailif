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
  const isMinimalMode = currentStep >= 3;

  const handleStepClick = (stepId: number) => {
    if (stepId <= currentStep) {
      setStep(stepId as 1 | 2 | 3 | 4);
    }
  };

  if (isMinimalMode) {
    return (
      <div className="w-full border-b border-white/60 bg-white/55 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-6 text-sm">
          <span className="text-[#7d685d]">{selectedService?.name}</span>
          <span className="text-[#d7c9c1]">•</span>
          <span className="text-[#7d685d]">
            {selectedSlot
              ? `${new Date(selectedSlot.date).toLocaleDateString('et-EE', { weekday: 'short', day: 'numeric' })} ${t('confirm.at')} ${selectedSlot.time}`
              : ''}
          </span>
          <span className="text-[#d7c9c1]">•</span>
          <button onClick={() => handleStepClick(1)} className="font-medium text-[#b58373] hover:underline">
            {t('booking.edit')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border-b border-white/60 bg-white/55 py-4 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative mb-5">
          <div className="absolute left-0 right-0 top-4 h-px bg-[#e8ddd6]" />
          <div
            className="absolute left-0 top-4 h-px bg-[#c8a08f] transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        <div className="relative flex items-center justify-between">
          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isClickable = step.id <= currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={`
                    relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300
                    ${
                      isCompleted
                        ? 'bg-[#c8a08f] text-white shadow-[0_8px_18px_-12px_rgba(99,71,56,0.75)]'
                        : isCurrent
                          ? 'scale-[1.06] bg-[#b58373] text-white shadow-[0_14px_24px_-14px_rgba(99,71,56,0.78)]'
                          : 'bg-white text-gray-400 ring-1 ring-[#e8ddd6]'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                  `}
                >
                  {isCompleted ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span>{step.id}</span>
                  )}
                  {isCurrent && <span className="absolute inset-0 animate-ping rounded-full bg-[#b58373]/20" />}
                </button>
                <span
                  className={`
                    mt-2 text-xs font-medium transition-all duration-300
                    ${isCurrent ? 'text-[#b58373]' : isCompleted ? 'text-[#5b4a40]' : 'text-gray-400'}
                  `}
                >
                  {t(step.labelKey)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BookingProgressBar;
