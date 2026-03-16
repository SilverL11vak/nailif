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

      <div className="mb-5 rounded-2xl border border-[#e7dfd7] bg-[#faf7f4] p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[#4a3c35]">{selectedService?.name}</span>
          <div className="text-right">
            <span className="font-semibold text-[#9f7058]">EUR {totalPrice}</span>
            <span className="ml-2 text-[#7b6f67]">- {totalDuration} {t('common.minutes')}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#e5dcd5] bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f1e8e2]">
            <span className="text-xs font-semibold text-[#8f6d5f]">SPA</span>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-[#41342d]">{t('extras.turnIntoSelfCare')}</p>
            <p className="text-xs text-[#746860]">{t('extras.pairBeautifully')}</p>
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
                  ? 'border-[#d8c3b6] bg-[#fbf7f4] shadow-[0_16px_24px_-22px_rgba(72,49,35,0.4)]'
                  : 'border-[#ece5df] bg-white hover:border-[#d8c3b6]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-all duration-200 ${
                      isSelected ? 'border-[#b88468] bg-[#b88468] text-white' : 'border-[#d8cec6] bg-white text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                  <div>
                    <h3 className="font-medium text-[#3f332d]">{addOn.name}</h3>
                    <p className="mt-0.5 text-sm text-[#756a62]">{addOn.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {addOn.duration > 0 && (
                        <span className="rounded-full border border-[#e4d8cf] bg-white px-2.5 py-1 text-xs text-[#6f6259]">
                          {addOn.duration} {t('common.minutes')}
                        </span>
                      )}
                      <span className="rounded-full border border-[#e4d8cf] bg-white px-2.5 py-1 text-xs text-[#6f6259]">
                        {language === 'en' ? 'Optional upgrade' : 'Valikuline lisandus'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-base font-semibold text-[#a06f56]">+EUR {addOn.price}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={nextStep}
          className="cta-premium flex-1 rounded-2xl border border-[#ddd3cb] py-4 font-semibold text-[#62564f] transition-colors duration-200 hover:bg-[#f8f4f1]"
        >
          {t('extras.skip')}
        </button>
        <button
          onClick={nextStep}
          className="cta-premium flex-[2] rounded-2xl bg-[#b88468] py-5 text-base font-semibold text-white shadow-[0_20px_32px_-24px_rgba(72,49,35,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a67359] hover:shadow-[0_24px_36px_-24px_rgba(72,49,35,0.85)] active:scale-[0.99]"
        >
          {selectedCount > 0 ? `${t('extras.continue')} (+EUR ${selectedExtrasTotal})` : t('extras.continue')}
        </button>
      </div>
    </div>
  );
}

export default ExtrasStep;
