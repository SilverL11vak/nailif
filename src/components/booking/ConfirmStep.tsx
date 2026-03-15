'use client';

import { useState } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';

export function ConfirmStep() {
  const { t } = useTranslation();
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
        <p className="text-gray-500">{t('confirm.missingDetails')}</p>
        <p className="text-sm text-gray-400">{t('confirm.completeAllSteps')}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-gray-800">{t('confirm.title')}</h2>
        <p className="text-gray-500">{t('confirm.reviewDetails')}</p>
      </div>

      <div className="mb-6 rounded-2xl border-2 border-gray-100 bg-white p-5">
        <div className="mb-4 border-b border-gray-100 pb-4">
          <h3 className="mb-1 text-lg font-semibold text-gray-800">{selectedService.name}</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {selectedService.duration} {t('common.minutes')}
            </span>
            <span className="font-semibold text-gray-800">EUR {selectedService.price}</span>
          </div>
        </div>

        <div className="mb-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF9F5]">
              <svg className="h-5 w-5 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-800">
                {new Date(selectedSlot.date).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-500">
                {t('confirm.at')} {selectedSlot.time}
              </p>
              {selectedSlot.isSos && (
                <p className="text-xs font-medium text-[#b05387]">
                  SOS: {selectedSlot.sosLabel || 'Kiire aeg'}{' '}
                  {selectedSlot.sosSurcharge ? `(+EUR ${selectedSlot.sosSurcharge})` : '(lisatasuta)'}
                </p>
              )}
            </div>
          </div>
        </div>

        {selectedExtras.length > 0 && (
          <div className="mb-4 border-b border-gray-100 pb-4">
            <h4 className="mb-2 text-sm font-medium text-gray-600">{t('confirm.extras')}</h4>
            {selectedExtras.map((extra) => (
              <div key={extra.id} className="flex items-center justify-between py-1 text-sm">
                <span className="text-gray-600">{extra.name}</span>
                <span className="text-gray-800">+EUR {extra.price}</span>
              </div>
            ))}
          </div>
        )}

        {selectedSlot.isSos && (
          <div className="mb-4 border-b border-gray-100 pb-4">
            <h4 className="mb-2 text-sm font-medium text-gray-600">SOS ajavalik</h4>
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-gray-600">Kiire aeg: {selectedSlot.time}</span>
              <span className="font-semibold text-[#b05387]">
                {selectedSlot.sosSurcharge ? `+EUR ${selectedSlot.sosSurcharge}` : 'Lisatasuta'}
              </span>
            </div>
          </div>
        )}

        <div className="mb-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF9F5]">
              <svg className="h-5 w-5 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-800">
                {contactInfo?.firstName} {contactInfo?.lastName}
              </p>
              <p className="text-sm text-gray-500">{contactInfo?.phone}</p>
              {contactInfo?.email && <p className="text-sm text-gray-400">{contactInfo.email}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-semibold text-gray-800">{t('confirm.total')}</span>
            <p className="text-sm text-gray-500">
              {totalDuration} {t('confirm.totalTime')}
            </p>
          </div>
          <span className="text-2xl font-semibold text-[#D4A59A]">EUR {totalPrice}</span>
        </div>
      </div>

      <p className="mb-4 text-center text-xs text-gray-400">10 EUR ettemaks kinnitab aja. Ülejäänud summa maksad kohapeal.</p>

      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className={`w-full rounded-xl py-5 font-semibold transition-all duration-200 ${
          isLoading
            ? 'cursor-wait bg-gray-100 text-gray-400'
            : 'bg-[#D4A59A] text-white shadow-lg hover:bg-[#C47D6D] hover:shadow-xl active:scale-[0.98]'
        }`}
      >
        {isLoading ? t('confirm.confirming') : 'Pay 10 EUR deposit'}
      </button>
    </div>
  );
}

export default ConfirmStep;
