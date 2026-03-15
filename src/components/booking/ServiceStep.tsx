'use client';

import { useRef } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import type { Service } from '@/store/booking-types';
import { useServices } from '@/hooks/use-services';

const serviceBenefits: Record<string, string> = {
  'gel-manicure': 'Long-lasting glossy finish',
  'acrylic-extensions': 'Durable length and strength',
  'luxury-spa-manicure': 'Ultimate pampering experience',
  'gel-pedicure': 'Perfect for polished feet',
  'nail-art': 'Custom detail work',
};

const serviceVisuals: Record<string, { accent: string; detail: string; label: string }> = {
  'gel-manicure': { accent: 'from-[#f5e5de] to-[#d9a89c]', detail: 'bg-[#fff7f3]', label: 'Gloss finish' },
  'acrylic-extensions': { accent: 'from-[#ead8e7] to-[#c6a6bf]', detail: 'bg-[#faf5f9]', label: 'Sculpted length' },
  'luxury-spa-manicure': { accent: 'from-[#efe3d8] to-[#ceb29a]', detail: 'bg-[#fdf8f3]', label: 'Spa ritual' },
  'gel-pedicure': { accent: 'from-[#e3e6ef] to-[#b7c2da]', detail: 'bg-[#f6f8fc]', label: 'Polished toes' },
  'nail-art': { accent: 'from-[#f0dfd6] to-[#d9b0a3]', detail: 'bg-[#fcf7f4]', label: 'Signature detail' },
};

export function ServiceStep() {
  const { t } = useTranslation();
  const { services } = useServices();
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectService = useBookingStore((state) => state.selectService);
  const nextStep = useBookingStore((state) => state.nextStep);
  const selectedStyle = useBookingStore((state) => state.selectedStyle);
  const continueButtonRef = useRef<HTMLDivElement>(null);

  const handleSelect = (service: Service) => {
    selectService(service);
    setTimeout(() => {
      nextStep();
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-7 text-center">
        <p className="mb-2 text-[11px] uppercase tracking-[0.26em] text-[#b08979]">Step 1</p>
        <h2 className="mb-2 text-2xl font-semibold text-gray-800">{t('service.choose')}</h2>
        {selectedStyle ? (
          <div className="mb-2 flex items-center justify-center gap-2 text-sm text-[#b58373]">
            <span>{selectedStyle.emoji}</span>
            <span>{t('service.styleSelected')}</span>
          </div>
        ) : (
          <p className="text-gray-500">{t('service.getStarted')}</p>
        )}
        <p className="mt-2 text-sm text-[#8c7568]">Tailored to your selected style.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((service) => {
          const isSelected = selectedService?.id === service.id;
          const benefit = serviceBenefits[service.id] || service.description || '';
          const visual = serviceVisuals[service.id] || serviceVisuals['gel-manicure'];

          return (
            <button
              key={service.id}
              onClick={() => handleSelect(service)}
              className={`
                group relative flex flex-col items-start overflow-hidden rounded-[26px] border px-5 py-5 text-left transition-all duration-300
                hover:-translate-y-1.5 hover:shadow-[0_22px_34px_-24px_rgba(72,49,35,0.45)]
                ${isSelected
                  ? 'border-[#d7b0a1] bg-[#fffaf7] shadow-[0_18px_30px_-22px_rgba(72,49,35,0.45)] ring-1 ring-[#f2e5de]'
                  : 'border-[#efe5de] bg-white hover:border-[#d9beaf]'}
              `}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,165,154,0.14),transparent_40%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br ${visual.accent} shadow-[inset_0_1px_1px_rgba(255,255,255,0.75),0_12px_18px_-14px_rgba(72,49,35,0.6)] transition duration-300 group-hover:brightness-105`}>
                <div className={`h-10 w-10 rounded-[14px] ${visual.detail} p-2 shadow-inner`}>
                  <div className="flex h-full items-end gap-1">
                    <span className="h-4 w-1.5 rounded-full bg-white/90" />
                    <span className="h-6 w-1.5 rounded-full bg-white/80" />
                    <span className="h-5 w-1.5 rounded-full bg-white/70" />
                  </div>
                </div>
              </div>

              {service.isPopular && (
                <span className="absolute right-4 top-4 rounded-full bg-[#f7efe9] px-2.5 py-1 text-[11px] font-medium text-[#8e6f61] ring-1 ring-[#efe2da]">
                  {t('service.mostBooked')}
                </span>
              )}

              <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b89e91]">{visual.label}</p>
              <h3 className="mb-1 text-lg font-semibold text-gray-800">{service.name}</h3>
              <p className="mb-4 text-sm leading-6 text-gray-500">{benefit}</p>

              <div className="mt-auto flex w-full items-center justify-between">
                <div className="flex items-center gap-1.5 rounded-full bg-[#faf5f2] px-2.5 py-1 text-sm text-[#7d685d] ring-1 ring-[#f0e4dc]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {service.duration} {t('service.minutes')}
                </div>
                <div className="text-right text-lg font-semibold text-[#b58373]">EUR {service.price}</div>
              </div>

              {isSelected && (
                <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#b58373] text-white shadow-[0_10px_22px_-12px_rgba(99,71,56,0.9)] animate-scale-in">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div ref={continueButtonRef} />

      <div className="flex items-center justify-center gap-4 pt-5 text-xs text-[#9e8a80]">
        <span>Tailored to your selected style</span>
        <span>•</span>
        <span>{t('service.freeReschedule')}</span>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.28s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default ServiceStep;
