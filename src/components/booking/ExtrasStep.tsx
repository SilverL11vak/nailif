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

  return (
    <div className="animate-fade-in">
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-[#2f2622]">{t('extras.addExtras')}</h2>
        <p className="text-[#6f655f]">{t('extras.makeSpecial')}</p>
      </div>

      <div className="mb-5 rounded-2xl border border-[#eadce5] bg-[#fffafe] p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[#4a3344]">{selectedService?.name}</span>
          <div className="text-right">
            <span className="font-semibold text-[#b04b80]">€{totalPrice}</span>
            <span className="ml-2 text-[#7d6275]">- {totalDuration} {t('common.minutes')}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#eadce5] bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f5eaf1]">
            <span className="text-xs font-semibold text-[#8f5d78]">SPA</span>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-[#4a3344]">{t('extras.turnIntoSelfCare')}</p>
            <p className="text-xs text-[#7d6275]">{t('extras.pairBeautifully')}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        {selectedAddOns.map((addOn) => {
          const isSelected = addOn.selected;
          return (
            <button
              key={addOn.id}
              onClick={() => toggleAddOn(addOn)}
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-[#d7b0c7] bg-[#fff8fc] shadow-[0_16px_24px_-22px_rgba(116,47,93,0.3)]'
                  : 'border-[#eadce5] bg-white hover:border-[#d7b0c7]'
              }`}
            >
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
                    <p className="mt-0.5 text-sm text-[#75657a]">{addOn.description}</p>
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
          onClick={nextStep}
          className="cta-premium flex-[2] rounded-2xl bg-[#c24d86] py-5 text-base font-semibold text-white shadow-[0_20px_32px_-24px_rgba(116,47,93,0.62)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a93d71] hover:shadow-[0_24px_36px_-24px_rgba(116,47,93,0.72)] active:scale-[0.99]"
        >
          {selectedCount > 0 ? `${t('extras.continue')} (+€${selectedExtrasTotal})` : t('extras.continue')}
        </button>
      </div>
    </div>
  );
}

export default ExtrasStep;
