'use client';

import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingAddOns } from '@/hooks/use-booking-addons';

export function ExtrasStep() {
  const { t, language } = useTranslation();
  useBookingAddOns();

  const selectedAddOns = useBookingStore((state) => state.selectedAddOns);
  const toggleAddOn = useBookingStore((state) => state.toggleAddOn);
  const nextStep = useBookingStore((state) => state.nextStep);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const totalDuration = useBookingStore((state) => state.totalDuration);
  const selectedService = useBookingStore((state) => state.selectedService);

  const selectedCount = selectedAddOns.filter((a) => a.selected).length;
  const selectedExtrasTotal = selectedAddOns.filter((a) => a.selected).reduce((sum, a) => sum + a.price, 0);
  const mostPopularId =
    selectedAddOns.length > 0 ? selectedAddOns.reduce((max, a) => (a.price > max.price ? a : max), selectedAddOns[0]).id : null;

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center md:mb-10">
        <h2 className="font-brand text-[1.65rem] font-semibold tracking-tight text-[#2f2622] md:text-[1.85rem]">
          {language === 'en' ? 'Make your visit special' : 'Muuda külastus eriliseks'}
        </h2>
        <p className="mt-2 text-[15px] text-[#6f655f]">
          {language === 'en'
            ? 'Most clients add at least one add-on for a better result.'
            : 'Enamik kliendid lisavad vähemalt ühe lisa parema tulemuse jaoks.'}
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-[#eadce5] bg-[#fffafe] p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[#4a3344]">{selectedService?.name}</span>
          <div className="text-right">
            <span className="font-semibold text-[#b04b80]">€{totalPrice}</span>
            <span className="ml-2 text-[#7d6275]">- {totalDuration} {t('common.minutes')}</span>
          </div>
        </div>
      </div>

      {/* Hero -> next section transition (subtle blur line) */}
      <div
        className="mb-6 h-px w-full bg-[linear-gradient(90deg,transparent_0%,rgba(194,77,134,0.28)_50%,transparent_100%)] blur-[0.2px]"
        aria-hidden
      />

      <div className="mb-6 rounded-2xl border border-[#eadce5] bg-white p-5">
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

      <div className="mb-6 space-y-4">
        {selectedAddOns.map((addOn) => {
          const isSelected = addOn.selected;
          return (
            <button
              key={addOn.id}
              onClick={() => toggleAddOn(addOn)}
              className={`relative w-full rounded-2xl border p-5 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-[#d7b0c7] bg-[#fff8fc] shadow-[0_12px_20px_-24px_rgba(116,47,93,0.25)] hover:-translate-y-[1px] active:scale-[0.99]'
                  : 'border-[#eadce5] bg-white hover:border-[#d7b0c7] hover:shadow-[0_14px_22px_-26px_rgba(194,77,134,0.22)] active:scale-[0.99]'
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
                  <div>
                    <h3 className="font-medium text-[#4a3344]">{addOn.name}</h3>
                    <p className="mt-0.5 line-clamp-1 text-sm text-[#75657a]">{addOn.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {addOn.duration > 0 && (
                        <span className="rounded-full border border-[#eadce5] bg-white px-2.5 py-1 text-xs text-[#7d6275]">
                          {addOn.duration} {t('common.minutes')}
                        </span>
                      )}
                      <span className="rounded-full border border-[#eadce5] bg-white px-2.5 py-1 text-xs text-[#7d6275]">
                        {language === 'en' ? 'Optional upgrade' : 'Valikuline lisandus'}
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
          className="cta-premium flex-1 rounded-2xl border border-[#eadce5] py-4 font-semibold text-[#634f5f] transition-colors duration-200 hover:bg-[#fff7fc]"
        >
          {t('extras.skip')}
        </button>
        <button
          id="booking-sticky-primary-action"
          type="button"
          onClick={nextStep}
          className="cta-premium flex-[2] rounded-full bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_50%,#a93d71_100%)] py-4 text-base font-semibold text-white shadow-[0_14px_32px_-14px_rgba(194,77,134,0.5)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-12px_rgba(194,77,134,0.45)] active:scale-[0.99]"
        >
          {selectedCount > 0 ? `${t('extras.continue')} (+€${selectedExtrasTotal})` : t('extras.continue')}
        </button>
      </div>
    </div>
  );
}

export default ExtrasStep;
