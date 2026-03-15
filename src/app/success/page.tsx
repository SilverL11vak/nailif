'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';

type PaymentStatus = 'idle' | 'verifying' | 'confirmed' | 'error';

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [bookingRef, setBookingRef] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentMessage, setPaymentMessage] = useState<string>('');

  const { selectedService, selectedSlot, totalPrice, totalDuration, reset } = useBookingStore();

  useEffect(() => {
    setBookingRef(`NF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  }, []);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const typeParam = searchParams.get('type');
    const type = typeParam === 'order' ? 'order' : typeParam === 'booking' ? 'booking' : null;
    if (!sessionId || !type) return;

    let isMounted = true;
    const verify = async () => {
      setPaymentStatus('verifying');
      try {
        const response = await fetch('/api/stripe/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, type }),
        });
        if (!response.ok) {
          throw new Error('Payment verification failed');
        }

        if (!isMounted) return;
        setPaymentStatus('confirmed');
        setPaymentMessage(
          type === 'booking'
            ? 'Ettemaks on edukalt tasutud. Teie aeg on kinnitatud.'
            : 'Makse on edukalt tasutud. Tellimus on vastu voetud.'
        );
      } catch (error) {
        console.error('Stripe confirm error:', error);
        if (!isMounted) return;
        setPaymentStatus('error');
        setPaymentMessage('Makse kinnitamine ebaonnestus. Palun vota meiega uhendust.');
      }
    };

    void verify();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F0EB] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mb-2 text-3xl font-semibold text-gray-800">{t('success.seeYouSoon')}</h1>
          <p className="text-gray-500">{t('success.confirmed')}</p>
          <p className="mt-2 font-medium text-[#D4A59A]">
            {t('success.ref')}: {bookingRef}
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-4 border-b border-gray-100 pb-4 text-center">
            <h2 className="text-lg font-semibold text-gray-800">{selectedService?.name ?? 'Nailify booking'}</h2>
            <p className="text-sm text-gray-500">
              {selectedSlot
                ? `${new Date(selectedSlot.date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })} ${t('confirm.at')} ${selectedSlot.time}`
                : t('success.confirmed')}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-gray-800">
                EUR {totalPrice || selectedService?.price || 35}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="font-semibold text-gray-800">
                {totalDuration || selectedService?.duration || 45} {t('common.minutes')}
              </span>
            </div>
          </div>
        </div>

        {(paymentStatus === 'verifying' || paymentStatus === 'confirmed' || paymentStatus === 'error') && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${
              paymentStatus === 'confirmed'
                ? 'border-green-200 bg-green-50 text-green-700'
                : paymentStatus === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {paymentStatus === 'verifying' ? 'Kontrollime makset...' : paymentMessage}
          </div>
        )}

        <button
          onClick={() => router.push('/')}
          className="mb-4 w-full rounded-xl bg-[#D4A59A] py-4 font-semibold text-white transition-all duration-200 hover:bg-[#C47D6D] active:scale-[0.98]"
        >
          Back to home
        </button>
        <button
          onClick={() => router.push('/shop')}
          className="w-full rounded-xl border border-[#D4A59A] bg-white py-4 font-semibold text-[#A06C5F] transition-colors hover:bg-[#FFF8F5]"
        >
          Visit shop
        </button>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F0EB] p-4 text-[#7d685d]">
          Loading confirmation...
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
