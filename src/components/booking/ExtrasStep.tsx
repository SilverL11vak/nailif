'use client';

import { useState } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingAddOns } from '@/hooks/use-booking-addons';

export function ExtrasStep() {
  const { t } = useTranslation();
  const selectedService = useBookingStore((state) => state.selectedService);
  useBookingAddOns(selectedService?.allowAddOns === false ? null : selectedService?.id ?? null);

  const selectedAddOns = useBookingStore((state) => state.selectedAddOns);
  const toggleAddOn = useBookingStore((state) => state.toggleAddOn);
  const nextStep = useBookingStore((state) => state.nextStep);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const totalDuration = useBookingStore((state) => state.totalDuration);
  const selectedCount = selectedAddOns.filter((a) => a.selected).length;
  const selectedExtrasTotal = selectedAddOns.filter((a) => a.selected).reduce((sum, a) => sum + a.price, 0);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const mostPopularId =
    selectedAddOns.length > 0 ? selectedAddOns.reduce((max, a) => (a.price > max.price ? a : max), selectedAddOns[0]).id : null;

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center md:mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9d8493]">
          {t('_auto.components_booking_ExtrasStep.p198')}
        </p>
        <h2 className="mt-2 font-brand text-[1.65rem] font-semibold tracking-tight text-[#2f2622] md:text-[1.85rem]">
          {t('_auto.components_booking_ExtrasStep.p199')}
        </h2>
        <p className="mt-2 text-[15px] text-[#6f655f]">
          {t('_auto.components_booking_ExtrasStep.p200')}
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-[#efe6ec] bg-white p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[#4a3344]">{selectedService?.name}</span>
          <div className="text-right">
            <span className="font-semibold text-[#b04b80]">€{totalPrice}</span>
            <span className="ml-2 text-[#7d6275]">- {totalDuration} {t('common.minutes')}</span>
          </div>
        </div>
      </div>

      {/* Hero -> next section transition (subtle blur line) */}
      <div className="mb-6 rounded-2xl border border-[#efe6ec] bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#eadce5] bg-[#fff7fb]">
            <span className="text-[10px] font-semibold tracking-wide text-[#8f5d78]">SPA</span>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-[#4a3344]">{t('extras.turnIntoSelfCare')}</p>
            <p className="text-xs text-[#7d6275]">{t('extras.pairBeautifully')}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 md:gap-4">
        {selectedService?.allowAddOns === false ? (
          <div className="md:col-span-2 rounded-2xl border border-[#efe6ec] bg-[#fffafd] p-5 text-sm text-[#6f5f69]">
            {t('_auto.components_booking_ExtrasStep.p201')}
          </div>
        ) : null}
        {selectedAddOns.map((addOn) => {
          const isSelected = addOn.selected;
          const description = addOn.description?.trim() ?? '';
          const isLongDescription = description.length > 120;
          const isDescriptionExpanded = Boolean(expandedDescriptions[addOn.id]);
          return (
            <button
              key={addOn.id}
              onClick={() => toggleAddOn(addOn)}
              className={`relative w-full rounded-2xl border p-5 md:p-6 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-[#d7b0c7] bg-[#fff8fc] shadow-[0_12px_20px_-24px_rgba(116,47,93,0.25)] hover:-translate-y-[1px] active:scale-[0.99]'
                  : 'border-[#efe6ec] bg-white hover:border-[#d7b0c7] hover:shadow-[0_14px_22px_-26px_rgba(194,77,134,0.22)] active:scale-[0.99]'
              }`}
            >
              {mostPopularId && addOn.id === mostPopularId && (
                <span className="absolute right-4 top-4 rounded-full border border-[#c24d86]/25 bg-[#fff2f9] px-2 py-0.5 text-[10px] font-semibold text-[#8b3b62] shadow-[0_10px_18px_-18px_rgba(194,77,134,0.3)]">
                  Most popular
                </span>
              )}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-all duration-200 ${
                      isSelected ? 'border-[#c24d86] bg-[#c24d86] text-white' : 'border-[#e1d6e0] bg-white text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-[#4a3344]">{addOn.name}</h3>
                    {description ? (
                      <div className="mt-0.5">
                        <p className={`text-sm text-[#75657a] ${isLongDescription && !isDescriptionExpanded ? 'line-clamp-2' : ''}`}>
                          {description}
                        </p>
                        {isLongDescription ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedDescriptions((prev) => ({ ...prev, [addOn.id]: !prev[addOn.id] }));
                            }}
                            className="mt-1 text-xs font-semibold text-[#8f3d62] underline underline-offset-2"
                            aria-expanded={isDescriptionExpanded}
                          >
                            {isDescriptionExpanded
                              ? t('_auto.components_booking_ExtrasStep.p202')
                              : t('_auto.components_booking_ExtrasStep.p203')}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {addOn.duration > 0 && (
                        <span className="pill-meta min-h-[30px] px-2.5 text-xs text-[#7d6275]">
                          {addOn.duration} {t('common.minutes')}
                        </span>
                      )}
                      <span className="pill-meta min-h-[30px] px-2.5 text-xs text-[#7d6275]">
                        {t('_auto.components_booking_ExtrasStep.p204')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-base font-semibold text-[#b04b80]">+€{addOn.price}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={nextStep}
          className="btn-secondary flex-1"
        >
          {t('extras.skip')}
        </button>
        <button
          id="booking-sticky-primary-action"
          type="button"
          onClick={nextStep}
          className="btn-primary btn-primary-lg flex-[2]"
        >
          {selectedCount > 0 ? `${t('extras.continue')} (+€${selectedExtrasTotal})` : t('extras.continue')}
        </button>
      </div>
    </div>
  );
}

export default ExtrasStep;
