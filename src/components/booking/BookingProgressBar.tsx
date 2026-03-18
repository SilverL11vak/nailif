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
      <div className="w-full border-b border-[#f0e2ea] bg-white/70 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-6 text-sm">
          <span className="text-[#7b6577]">{selectedService?.name}</span>
          <span className="text-[#d8c5d1]">•</span>
          <span className="text-[#7b6577]">
            {selectedSlot
              ? `${new Date(selectedSlot.date).toLocaleDateString('et-EE', { weekday: 'short', day: 'numeric' })} ${t('confirm.at')} ${selectedSlot.time}`
              : ''}
          </span>
          <span className="text-[#d8c5d1]">•</span>
          <button onClick={() => handleStepClick(1)} className="font-medium text-[#b04b80] hover:underline">
            {t('booking.edit')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border-b border-[#f0e2ea] bg-white/70 py-4 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative mb-5">
          <div className="absolute left-0 right-0 top-4 h-px bg-[#eadde6]" />
          <div
            className="absolute left-0 top-4 h-px bg-[linear-gradient(90deg,#d78db4_0%,#c24d86_100%)] transition-all duration-500 ease-out"
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
                        ? 'bg-[#d78db4] text-white shadow-[0_8px_18px_-12px_rgba(116,47,93,0.6)]'
                        : isCurrent
                          ? 'scale-[1.06] bg-[#c24d86] text-white shadow-[0_14px_24px_-14px_rgba(116,47,93,0.7)]'
                          : 'bg-white text-[#b5a1af] ring-1 ring-[#eadde6]'
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
                  {isCurrent && <span className="absolute inset-0 animate-ping rounded-full bg-[#c24d86]/20" />}
                </button>
                <span
                  className={`
                    mt-2 text-xs font-medium transition-all duration-300
                    ${isCurrent ? 'text-[#b04b80]' : isCompleted ? 'text-[#6a4c62]' : 'text-[#ab98a7]'}
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
