'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import type { TimeSlot } from '@/store/booking-types';

type PaymentStatus = 'idle' | 'verifying' | 'confirmed' | 'error';

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useTranslation();
  const { text } = useBookingContent();
  const [bookingRef, setBookingRef] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const [showRepeatOffer, setShowRepeatOffer] = useState(true);
  const [recommendedMaintenanceSlots, setRecommendedMaintenanceSlots] = useState<TimeSlot[]>([]);

  const { selectedService, selectedSlot, totalPrice, totalDuration, reset } = useBookingStore();

  const copy = useMemo(
    () =>
      language === 'en'
        ? {
            paymentVerifying: 'Verifying payment...',
            paymentBookingOk: 'Deposit paid successfully. Your appointment is confirmed.',
            paymentOrderOk: 'Payment completed successfully. Your order has been received.',
            paymentFail: 'Payment verification failed. Please contact us.',
            bookingNameFallback: 'Nailify booking',
            total: 'Total',
            duration: 'Duration',
            whatNextA: 'We check your details and prepare your appointment.',
            whatNextB: 'If needed, we contact you before your visit.',
            prep: 'Arrive 5 minutes earlier and avoid oily hand creams on the same day.',
            maintenanceWindowLabel: 'Recommended window',
            skipRetention: 'Skip for now',
          }
        : {
            paymentVerifying: 'Kontrollime makset...',
            paymentBookingOk: 'Ettemaks on edukalt tasutud. Sinu aeg on kinnitatud.',
            paymentOrderOk: 'Makse on edukalt tasutud. Tellimus on vastu voetud.',
            paymentFail: 'Makse kinnitamine ebaonnestus. Palun vota uhendust.',
            bookingNameFallback: 'Nailify broneering',
            total: 'Kokku',
            duration: 'Kestus',
            whatNextA: 'Kontrollime sinu andmed ule ja valmistame visiidi ette.',
            whatNextB: 'Kui vaja, votame enne visiiti uhendust.',
            prep: 'Tule 5 minutit varem ja vali samal paeval kergem kaehooldus.',
            maintenanceWindowLabel: 'Soovituslik vahemik',
            skipRetention: 'Praegu mitte',
          },
    [language]
  );

  const nextBookingSuggestion = useMemo(() => {
    const configuredWeeks = Number(text('repeat_booking_weeks', '4'));
    const targetDays = Number.isFinite(configuredWeeks) && configuredWeeks > 0 ? configuredWeeks * 7 : 28;
    const base = selectedSlot ? new Date(`${selectedSlot.date}T12:00:00`) : new Date();
    const start = new Date(base);
    start.setDate(base.getDate() + Math.max(targetDays - 7, 7));
    const end = new Date(base);
    end.setDate(base.getDate() + targetDays);
    return {
      startDate: start.toISOString().slice(0, 10),
      label: `${start.toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(
        language === 'en' ? 'en-GB' : 'et-EE',
        { day: 'numeric', month: 'short' }
      )}`,
    };
  }, [selectedSlot, language, text]);

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
        if (!response.ok) throw new Error('Payment verification failed');
        if (!isMounted) return;
        setPaymentStatus('confirmed');
        setPaymentMessage(type === 'booking' ? copy.paymentBookingOk : copy.paymentOrderOk);
      } catch (error) {
        console.error('Stripe confirm error:', error);
        if (!isMounted) return;
        setPaymentStatus('error');
        setPaymentMessage(copy.paymentFail);
      }
    };

    void verify();
    return () => {
      isMounted = false;
    };
  }, [searchParams, copy.paymentBookingOk, copy.paymentOrderOk, copy.paymentFail]);

  useEffect(() => {
    let mounted = true;
    const loadRecommendations = async () => {
      const configuredWeeks = Number(text('smart_settings_maintenance_weeks', text('repeat_booking_weeks', '4')));
      const weeks = Number.isFinite(configuredWeeks) && configuredWeeks > 0 ? configuredWeeks : 4;
      const fromBase = selectedSlot ? new Date(`${selectedSlot.date}T00:00:00`) : new Date();
      const from = new Date(fromBase);
      from.setDate(from.getDate() + Math.max(weeks * 7 - 7, 14));
      const to = new Date(fromBase);
      to.setDate(to.getDate() + weeks * 7 + 7);
      try {
        const response = await fetch(
          `/api/slots?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&smart=1&lang=${language}&serviceDuration=${selectedService?.duration ?? 0}`,
          { cache: 'no-store' }
        );
        if (!response.ok) return;
        const data = (await response.json()) as { recommendedTimes?: TimeSlot[] };
        if (!mounted) return;
        setRecommendedMaintenanceSlots((data.recommendedTimes ?? []).filter((slot) => slot.available).slice(0, 3));
      } catch (error) {
        console.error('Success recommendations load failed:', error);
      }
    };

    void loadRecommendations();
    return () => {
      mounted = false;
    };
  }, [language, selectedService?.duration, selectedSlot, text]);

  const handleNextBooking = () => {
    const params = new URLSearchParams();
    if (selectedService?.id) params.set('service', selectedService.id);
    if (nextBookingSuggestion.startDate) params.set('date', nextBookingSuggestion.startDate);
    if (selectedSlot?.time) params.set('time', selectedSlot.time);
    router.push(`/book?${params.toString()}`);
  };

  const handleRecommendedMaintenance = (slot: TimeSlot) => {
    const params = new URLSearchParams();
    if (selectedService?.id) params.set('service', selectedService.id);
    params.set('date', slot.date);
    params.set('time', slot.time);
    router.push(`/book?${params.toString()}`);
  };

  const mapUrl = 'https://maps.google.com/?q=Mustam%C3%A4e,+Tallinn';
  const instagramUrl = 'https://instagram.com/';
  const calendarUrl = useMemo(() => {
    if (!selectedSlot || !selectedService) return '';
    const start = new Date(`${selectedSlot.date}T${selectedSlot.time}:00`);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (totalDuration || selectedService.duration || 60));
    const toGCal = (value: Date) =>
      value
        .toISOString()
        .replace(/[-:]/g, '')
        .split('.')[0] + 'Z';
    const title = encodeURIComponent(`Nailify - ${selectedService.name}`);
    const details = encodeURIComponent(language === 'en' ? 'Booked with Sandra at Mustamae studio.' : 'Broneering Sandraga Mustamäe stuudios.');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${toGCal(start)}/${toGCal(end)}&details=${details}&location=Mustam%C3%A4e%2C+Tallinn`;
  }, [selectedService, selectedSlot, totalDuration, language]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fffdfa_0%,#fff5fa_42%,#f7efe9_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="success-shimmer mb-5 rounded-[28px] border border-[#ead5e1] bg-white/92 p-7 text-center shadow-[0_28px_46px_-30px_rgba(110,66,95,0.38)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f2f9f0]">
            <svg className="h-8 w-8 text-[#3f8b58]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#352936]">{text('success_headline', language === 'en' ? 'Great, your appointment is confirmed!' : 'Suureparane, sinu aeg on kinnitatud!')}</h1>
          <p className="mx-auto mt-2 max-w-[52ch] text-sm text-[#6d5a68]">
            {text('success_subheadline', language === 'en' ? 'See you at the studio. We will also send your confirmation shortly.' : 'Kohtumiseni stuudios. Saadame peagi ka kinnituse.')}
          </p>
          <p className="mt-3 text-xs font-semibold tracking-[0.18em] text-[#b27f9f]">
            {t('success.ref')}: {bookingRef}
          </p>
        </section>

        {(paymentStatus === 'verifying' || paymentStatus === 'confirmed' || paymentStatus === 'error') && (
          <section
            className={`mb-5 rounded-2xl border p-4 text-sm ${
              paymentStatus === 'confirmed'
                ? 'border-green-200 bg-green-50 text-green-700'
                : paymentStatus === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {paymentStatus === 'verifying' ? copy.paymentVerifying : paymentMessage}
          </section>
        )}

        <section className="mb-5 rounded-[26px] border border-[#ead9cf] bg-[#fffaf7] p-6 shadow-[0_24px_38px_-34px_rgba(90,62,48,0.46)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#b08476]">{text('success_summary_title', language === 'en' ? 'Your booking details' : 'Sinu broneering')}</p>
          <div className="mt-2 border-b border-[#efdfd6] pb-4">
            <h2 className="text-lg font-semibold text-[#3d3028]">{selectedService?.name ?? copy.bookingNameFallback}</h2>
            <p className="text-sm text-[#6f5f55]">
              {selectedSlot
                ? `${new Date(selectedSlot.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', { weekday: 'long', day: 'numeric', month: 'long' })} ${t('confirm.at')} ${selectedSlot.time}`
                : t('success.confirmed')}
            </p>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-[#ecdcd2] bg-white px-3 py-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[#ac8a7b]">{copy.total}</p>
              <p className="mt-1 font-semibold text-[#5a483f]">EUR {totalPrice || selectedService?.price || 35}</p>
            </div>
            <div className="rounded-xl border border-[#ecdcd2] bg-white px-3 py-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[#ac8a7b]">{copy.duration}</p>
              <p className="mt-1 font-semibold text-[#5a483f]">{totalDuration || selectedService?.duration || 45} {t('common.minutes')}</p>
            </div>
          </div>
          <div className="mt-2 rounded-xl border border-[#ecdcd2] bg-white px-3 py-2 text-sm text-[#5a483f]">
            <span className="text-xs uppercase tracking-[0.14em] text-[#ac8a7b]">{text('success_technician_label', language === 'en' ? 'Technician' : 'Tehnik')}</span>
            <p className="mt-1 font-semibold">Sandra</p>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-[#ebdfd7] bg-white p-5">
          <p className="text-sm font-semibold text-[#4f3f46]">{text('success_next_steps_title', language === 'en' ? 'What happens next' : 'Mis juhtub jargmisena')}</p>
          <p className="mt-1 text-sm text-[#6f5a6a]">{text('success_next_steps_helper', language === 'en' ? 'We review your details and prepare your appointment. We contact you if needed.' : 'Kontrollime andmed ule ja valmistame visiidi ette. Vajadusel votame uhendust.')}</p>
          <ul className="mt-3 space-y-1 text-sm text-[#6f5a6a]">
            <li>{copy.whatNextA}</li>
            <li>{copy.whatNextB}</li>
            <li>{copy.prep}</li>
          </ul>
        </section>

        {showRepeatOffer && (
          <section className="mb-6 rounded-[30px] border border-[#e8c9da] bg-[linear-gradient(135deg,#fff8fc_0%,#ffeef7_55%,#ffe6f3_100%)] p-6 shadow-[0_30px_42px_-30px_rgba(126,58,98,0.45)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#b06b8f]">Next maintenance</p>
            <p className="mt-2 text-xl font-semibold text-[#4f3344]">
              {text('success_retention_title', text('repeat_booking_title', language === 'en' ? 'Would you like to reserve your next maintenance appointment?' : 'Soovid jargmise hoolduse juba ette broneerida?'))}
            </p>
            <p className="mt-2 text-sm text-[#6e4f62]">
              {text('success_retention_helper', text('repeat_booking_helper', language === 'en' ? 'We recommend planning your next maintenance visit in 3-4 weeks.' : 'Soovitame hooldusaja planeerida 3-4 nadala parast.'))}
            </p>
            <div className="mt-3 rounded-xl border border-[#efd5e2] bg-white/85 px-3 py-2 text-sm text-[#6e4f62]">
              <span className="font-semibold">{copy.maintenanceWindowLabel}:</span> {nextBookingSuggestion.label}
            </div>
            {recommendedMaintenanceSlots.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {recommendedMaintenanceSlots.map((slot) => (
                  <button
                    key={`future-${slot.id}`}
                    type="button"
                    onClick={() => handleRecommendedMaintenance(slot)}
                    className="rounded-xl border border-[#efd5e2] bg-white px-3 py-2 text-left text-sm text-[#5e4554] hover:bg-[#fff7fc]"
                  >
                    <p className="font-semibold">
                      {new Date(`${slot.date}T00:00:00`).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p>{slot.time}</p>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={handleNextBooking}
              className="cta-premium mt-4 w-full rounded-xl bg-[#c24d86] py-3.5 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(141,60,108,0.62)] hover:bg-[#a93d71]"
            >
              {text('repeat_booking_button', language === 'en' ? 'Book next appointment' : 'Broneeri jargmine aeg')}
            </button>
            <button
              onClick={() => setShowRepeatOffer(false)}
              className="mt-2 w-full rounded-xl border border-[#e5d5cb] bg-white py-2.5 text-xs font-medium text-[#7d685d]"
            >
              {text('repeat_booking_skip', copy.skipRetention)}
            </button>
          </section>
        )}

        <section className="mb-6 rounded-2xl border border-[#ead9cf] bg-white p-5">
          <p className="text-sm font-semibold text-[#4f3f46]">
            {text('success_upsell_title', language === 'en' ? 'Want to keep the result beautiful for longer?' : 'Soovid tulemust veel kauem hoida?')}
          </p>
          <p className="mt-1 text-sm text-[#6f5a6a]">
            {text('success_upsell_subtitle', language === 'en' ? 'Choose an add-on now to make your next visit even smoother.' : 'Vali sobiv lisa kohe, et jargmine visiit oleks veel sujuvam.')}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button onClick={() => router.push('/shop')} className="rounded-xl border border-[#e6d8ce] bg-[#fffaf7] px-3 py-3 text-xs font-semibold text-[#6f5a50] hover:bg-[#fff3ec]">
              {text('success_upsell_product', language === 'en' ? 'Aftercare products' : 'Jarelhooldustooted')}
            </button>
            <button onClick={() => router.push('/book')} className="rounded-xl border border-[#e6d8ce] bg-[#fffaf7] px-3 py-3 text-xs font-semibold text-[#6f5a50] hover:bg-[#fff3ec]">
              {text('success_upsell_addon', language === 'en' ? 'Nail strengthening add-ons' : 'Kuunte tugevdamise lisad')}
            </button>
            <button onClick={() => router.push('/shop')} className="rounded-xl border border-[#e6d8ce] bg-[#fffaf7] px-3 py-3 text-xs font-semibold text-[#6f5a50] hover:bg-[#fff3ec]">
              {text('success_upsell_gift', language === 'en' ? 'Gift cards' : 'Kinkekaardid')}
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <button onClick={() => router.push('/')} className="rounded-xl bg-[#D4A59A] py-3 font-semibold text-white transition hover:bg-[#C47D6D]">
            {text('success_primary_cta', language === 'en' ? 'Back to homepage' : 'Tagasi avalehele')}
          </button>
          <button onClick={() => router.push('/#services')} className="rounded-xl border border-[#D4A59A] bg-white py-3 font-semibold text-[#A06C5F] transition hover:bg-[#FFF8F5]">
            {text('success_secondary_cta', language === 'en' ? 'View services' : 'Vaata teenuseid')}
          </button>
          <button onClick={() => router.push('/#location')} className="rounded-xl border border-[#e3d3ca] bg-white py-3 font-semibold text-[#7d685d] transition hover:bg-[#faf4ef]">
            {text('success_contact_cta', language === 'en' ? 'Contact the salon' : 'Vota salongiga uhendust')}
          </button>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <a
            href={calendarUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className={`rounded-xl border border-[#e8d7ce] bg-white py-3 text-center text-sm font-semibold text-[#6f5a50] transition hover:bg-[#faf3ef] ${!calendarUrl ? 'pointer-events-none opacity-50' : ''}`}
          >
            {language === 'en' ? 'Add to calendar' : 'Lisa kalendrisse'}
          </a>
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[#e8d7ce] bg-white py-3 text-center text-sm font-semibold text-[#6f5a50] transition hover:bg-[#faf3ef]"
          >
            {language === 'en' ? 'Directions' : 'Juhised'}
          </a>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[#e8d7ce] bg-white py-3 text-center text-sm font-semibold text-[#6f5a50] transition hover:bg-[#faf3ef]"
          >
            {language === 'en' ? 'Follow on Instagram' : 'Jälgi Instagramis'}
          </a>
        </section>
      </div>

      <style jsx>{`
        .success-shimmer {
          position: relative;
          overflow: hidden;
        }
        .success-shimmer::after {
          content: '';
          position: absolute;
          inset: -30% auto auto -40%;
          width: 50%;
          height: 160%;
          background: linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.38) 45%, transparent 100%);
          transform: rotate(12deg);
          animation: shimmer-pass 2.6s ease-out 1;
          pointer-events: none;
        }
        @keyframes shimmer-pass {
          from {
            transform: translateX(0) rotate(12deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          to {
            transform: translateX(320%) rotate(12deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F5F0EB] p-4 text-[#7d685d]">Laen kinnitust...</div>}>
      <SuccessPageContent />
    </Suspense>
  );
}
