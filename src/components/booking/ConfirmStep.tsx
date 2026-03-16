'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';

export function ConfirmStep() {
  const { t, language } = useTranslation();
  const { text } = useBookingContent();
  const [isLoading, setIsLoading] = useState(false);

  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const selectedAddOns = useBookingStore((state) => state.selectedAddOns);
  const contactInfo = useBookingStore((state) => state.contactInfo);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const totalDuration = useBookingStore((state) => state.totalDuration);
  const setStatus = useBookingStore((state) => state.setStatus);

  const selectedExtras = selectedAddOns.filter((addOn) => addOn.selected);

  const handleConfirm = async () => {
    if (!selectedService || !selectedSlot || !contactInfo) return;

    setIsLoading(true);
    setStatus('confirming');

    try {
      const response = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'guided',
          service: selectedService,
          slot: selectedSlot,
          contact: contactInfo,
          addOns: selectedExtras,
          totalPrice,
          totalDuration,
        }),
      });

      if (!response.ok) {
        throw new Error('Booking checkout failed');
      }

      const data = (await response.json()) as { checkoutUrl?: string };
      if (!data.checkoutUrl) {
        throw new Error('Missing Stripe checkout URL');
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Confirm booking error:', error);
      setStatus('error');
      setIsLoading(false);
    }
  };

  if (!selectedService || !selectedSlot) {
    return (
      <div className="py-8 text-center">
        <p className="text-[#6f655f]">{t('confirm.missingDetails')}</p>
        <p className="text-sm text-[#8d827b]">{t('confirm.completeAllSteps')}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-[#2f2622]">{t('confirm.title')}</h2>
        <p className="text-[#6f655f]">{t('confirm.reviewDetails')}</p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#e7dfd7] bg-white">
        <div className="border-b border-[#eee5de] px-5 py-4">
          <h3 className="mb-1 text-lg font-semibold text-[#332923]">{selectedService.name}</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#746860]">
              {selectedService.duration} {t('common.minutes')}
            </span>
            <span className="font-semibold text-[#9f7058]">EUR {selectedService.price}</span>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#968173]">{language === 'en' ? 'Visit time' : 'Visiidi aeg'}</p>
            <p className="mt-1 font-medium text-[#473a33]">
              {new Date(selectedSlot.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-[#746860]">
              {t('confirm.at')} {selectedSlot.time}
            </p>
            {selectedSlot.isSos && (
              <p className="mt-1 text-xs font-medium text-[#965e7d]">
                SOS: {selectedSlot.sosLabel || (language === 'en' ? 'Urgent slot' : 'Kiire aeg')}{' '}
                {selectedSlot.sosSurcharge ? `(+EUR ${selectedSlot.sosSurcharge})` : language === 'en' ? '(no surcharge)' : '(lisatasuta)'}
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#968173]">{language === 'en' ? 'Client' : 'Klient'}</p>
            <p className="mt-1 font-medium text-[#473a33]">
              {contactInfo?.firstName} {contactInfo?.lastName}
            </p>
            <p className="text-sm text-[#746860]">{contactInfo?.phone}</p>
            {contactInfo?.email && <p className="text-sm text-[#8a7f78]">{contactInfo.email}</p>}
          </div>

          {selectedExtras.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#968173]">{t('confirm.extras')}</p>
              <div className="mt-1 space-y-1">
                {selectedExtras.map((extra) => (
                  <div key={extra.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#5d514a]">{extra.name}</span>
                    <span className="font-medium text-[#7a6559]">+EUR {extra.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(contactInfo?.inspirationImage || contactInfo?.currentNailImage || contactInfo?.inspirationNote) && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#968173]">{language === 'en' ? 'Inspiration' : 'Inspiratsioon'}</p>
              <div className="mt-2 rounded-xl border border-[#e2d8d0] bg-[#fcfaf8] p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {contactInfo?.inspirationImage && (
                    <div className="relative h-28 w-full overflow-hidden rounded-lg">
                      <Image src={contactInfo.inspirationImage} alt={language === 'en' ? 'Inspiration preview' : 'Inspiratsiooni eelvaade'} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  {contactInfo?.currentNailImage && (
                    <div className="relative h-28 w-full overflow-hidden rounded-lg">
                      <Image src={contactInfo.currentNailImage} alt={language === 'en' ? 'Current nails preview' : 'Praeguste kuunte eelvaade'} fill className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
                {contactInfo?.inspirationNote && <p className="mt-2 text-sm text-[#6d5b51]">{contactInfo.inspirationNote}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between border-t border-[#eee5de] bg-[#faf7f4] px-5 py-4">
          <div>
            <span className="text-lg font-semibold text-[#3c2f29]">{t('confirm.total')}</span>
            <p className="text-sm text-[#746860]">
              {totalDuration} {t('confirm.totalTime')}
            </p>
          </div>
          <span className="text-3xl font-semibold text-[#9f7058]">EUR {totalPrice}</span>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#e5dcd5] bg-[#fcfaf8] p-4">
        <p className="text-sm font-semibold text-[#463831]">
          {text('confirm_expectation_title', language === 'en' ? 'Before your visit' : 'Enne visiiti')}
        </p>
        <ul className="mt-2 space-y-1 text-sm text-[#74675f]">
          <li>- {text('confirm_expectation_1', language === 'en' ? 'Arrive with clean nails. If you need gel removal, add it as a service.' : 'Tule puhaste kuuntega. Kui vajad geeli eemaldust, lisa see teenusena.')}</li>
          <li>- {text('confirm_expectation_2', language === 'en' ? 'An inspiration photo helps us prepare better, but it is optional.' : 'Inspiratsioonipilt aitab meil paremini ette valmistada, kuid on valikuline.')}</li>
          <li>- {text('confirm_expectation_3', language === 'en' ? 'Service duration can vary slightly depending on details.' : 'Teenuse kestus voib detailidest soltvalt veidi muutuda.')}</li>
          <li>- {text('confirm_expectation_4', language === 'en' ? 'Final price is confirmed before the service starts.' : 'Loplik hind kinnitatakse enne too algust.')}</li>
        </ul>
      </div>

      <p className="mb-4 text-center text-xs text-[#887c74]">
        {language === 'en'
          ? 'A 10 EUR deposit confirms your booking. The rest is paid in the studio.'
          : '10 EUR ettemaks kinnitab aja. Ulejaanud summa maksad kohapeal.'}
      </p>

      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className={`cta-premium w-full rounded-2xl py-5 text-base font-semibold transition-all duration-200 ${
          isLoading
            ? 'cursor-wait bg-[#f2ece8] text-[#8f7567] ring-2 ring-[#e4d7ce] animate-pulse'
            : 'bg-[#b88468] text-white shadow-[0_20px_32px_-24px_rgba(72,49,35,0.8)] hover:-translate-y-0.5 hover:bg-[#a67359] hover:shadow-[0_24px_36px_-24px_rgba(72,49,35,0.85)] active:scale-[0.99]'
        }`}
      >
        {isLoading ? t('confirm.confirming') : language === 'en' ? 'Confirm my appointment' : 'Kinnita minu aeg'}
      </button>
    </div>
  );
}

export default ConfirmStep;
