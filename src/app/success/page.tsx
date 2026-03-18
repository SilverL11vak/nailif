'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import type { TimeSlot } from '@/store/booking-types';
import { getLocaleFromPathname, withLocale, type LocaleCode } from '@/lib/i18n/locale-path';
import { clearBookingSession, markBookingSuccessForSession, trackEvent, touchBookingActivity } from '@/lib/analytics-client';
import { trackEvent as trackFunnelEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';

type PaymentStatus = 'idle' | 'verifying' | 'confirmed' | 'error';

const DEPOSIT_EUROS = 10;
const FALLBACK_GALLERY = [
  'https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=400&q=80',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80',
  'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&q=80',
];

function SuccessPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = useTranslation();
  const { text } = useBookingContent();
  const [bookingRef, setBookingRef] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const [flowType, setFlowType] = useState<'booking' | 'order' | null>(null);
  const [showRepeatOffer, setShowRepeatOffer] = useState(true);
  const [recommendedMaintenanceSlots, setRecommendedMaintenanceSlots] = useState<TimeSlot[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(FALLBACK_GALLERY);

  const { selectedService, selectedSlot, totalPrice, totalDuration, reset } = useBookingStore();

  const locale: LocaleCode = getLocaleFromPathname(pathname ?? '') ?? 'et';
  const L = (path: string) => withLocale(path, locale);
  const en = language === 'en';

  const copy = useMemo(
    () =>
      en
        ? {
            paymentVerifying: 'Verifying your payment…',
            paymentBookingOk: 'Deposit received. Your time is secured.',
            paymentOrderOk: 'Thank you — your order is on its way.',
            paymentFail: 'We could not verify this payment. Please contact us.',
            bookingNameFallback: 'Your appointment',
            depositPaid: 'Deposit paid',
            remainingStudio: 'Remaining at studio',
            studio: 'Mustamäe tee 55, Tallinn',
            specialist: 'Sandra',
            headline: 'Your appointment is confirmed',
            subtext: "We've reserved your time with Sandra. We're excited to see you.",
            refLabel: 'Reference',
            nextTitle: 'What happens next',
            next1: 'Confirmation sent to you by email',
            next2: 'Flexible reschedule if plans change',
            next3: 'Arrive 5 minutes early — we’ll be ready',
            tipLabel: 'Tip from Sandra',
            tipBody:
              'Come with clean nails and skip heavy hand cream that day — it helps your polish last beautifully.',
            resultsCaption: 'Clients love their results.',
            addCalendar: 'Add to Calendar',
            exploreShop: 'Explore products',
            bookAnother: 'Book another appointment',
            helpFooter: 'Questions? We’re here — hello@nailify.com',
            maintenanceTitle: 'Plan your next visit',
            maintenanceHelper: 'Many clients rebook 3–4 weeks ahead.',
            bookNext: 'Reserve next slot',
            skip: 'Not now',
            orderHeadline: 'Thank you for your order',
            orderSub: 'We’re preparing everything with care.',
            backHome: 'Back to home',
          }
        : {
            paymentVerifying: 'Kontrollime makset…',
            paymentBookingOk: 'Ettemaks laekus. Sinu aeg on kindlustatud.',
            paymentOrderOk: 'Aitäh — tellimus on teele pandud.',
            paymentFail: 'Makset ei õnnestunud kinnitada. Palun võta ühendust.',
            bookingNameFallback: 'Sinu aeg',
            depositPaid: 'Ettemaks tasutud',
            remainingStudio: 'Kohapeal tasuda',
            studio: 'Mustamäe tee 55, Tallinn',
            specialist: 'Sandra',
            headline: 'Sinu aeg on kinnitatud',
            subtext: 'Oleme sulle aja broneerinud Sandraga. Ootame sind!',
            refLabel: 'Viide',
            nextTitle: 'Mis edasi saab',
            next1: 'Saadame kinnituse e-postile',
            next2: 'Vajadusel saad aega paindlikult muuta',
            next3: 'Tule 5 minutit varem — oleme valmis',
            tipLabel: 'Nõuanne Sandralt',
            tipBody:
              'Tule puhaste küüntega ja väldi sel päeval raskeid kreeme — nii püsib viimistlus kauem kaunis.',
            resultsCaption: 'Kliendid on tulemustega väga rahul.',
            addCalendar: 'Lisa kalendrisse',
            exploreShop: 'Avasta tooted',
            bookAnother: 'Broneeri uus aeg',
            helpFooter: 'Küsimused? hello@nailify.com',
            maintenanceTitle: 'Planeeri järgmine külastus',
            maintenanceHelper: 'Paljud kliendid broneerivad 3–4 nädala ette.',
            bookNext: 'Broneeri järgmine aeg',
            skip: 'Mitte praegu',
            orderHeadline: 'Aitäh tellimuse eest',
            orderSub: 'Valmistame kõike hoolega ette.',
            backHome: 'Tagasi avalehele',
          },
    [en]
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
      label: `${start.toLocaleDateString(en ? 'en-GB' : 'et-EE', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(
        en ? 'en-GB' : 'et-EE',
        { day: 'numeric', month: 'short' }
      )}`,
    };
  }, [selectedSlot, en, text]);

  useEffect(() => {
    setBookingRef(`NF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  }, []);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/gallery');
        if (!res.ok) return;
        const data = (await res.json()) as { images?: { imageUrl: string }[] };
        const urls = (data.images ?? [])
          .map((i) => i.imageUrl)
          .filter(Boolean)
          .slice(0, 3);
        if (urls.length >= 3) setGalleryUrls(urls);
        else if (urls.length > 0) setGalleryUrls([...urls, ...FALLBACK_GALLERY].slice(0, 3));
      } catch {
        /* keep fallbacks */
      }
    })();
  }, []);

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
        setFlowType(type);
        setPaymentMessage(type === 'booking' ? copy.paymentBookingOk : copy.paymentOrderOk);
        touchBookingActivity();
        if (type === 'booking') {
          markBookingSuccessForSession();
          trackBehaviorEvent('payment_success', {
            serviceId: selectedService?.id,
            slotId: selectedSlot?.id,
            price: typeof totalPrice === 'number' ? totalPrice : undefined,
          });
          trackEvent({
            eventType: 'booking_success',
            step: 6,
            serviceId: selectedService?.id,
            slotId: selectedSlot?.id,
            metadata: {
              source: 'stripe_confirm',
              totalPrice: typeof totalPrice === 'number' ? totalPrice : null,
              totalDuration: typeof totalDuration === 'number' ? totalDuration : null,
              deposit: DEPOSIT_EUROS,
              remaining: typeof totalPrice === 'number' ? Math.max(0, Number((totalPrice - DEPOSIT_EUROS).toFixed(2))) : null,
              serviceName: selectedService?.name ?? null,
            },
          });
          trackFunnelEvent({
            event: 'payment_success',
            serviceId: selectedService?.id,
            slotId: selectedSlot?.id,
            metadata: { totalPrice, totalDuration, deposit: DEPOSIT_EUROS },
            language,
          });
          clearBookingSession();
        } else {
          trackBehaviorEvent('shop_payment_success');
        }
      } catch (error) {
        console.error('Stripe confirm error:', error);
        if (!isMounted) return;
        setPaymentStatus('error');
        setPaymentMessage(copy.paymentFail);
        trackBehaviorEvent('payment_failed', { reason: error instanceof Error ? error.message : 'verification_failed' });
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
    router.push(`${L('/book')}?${params.toString()}`);
  };

  const handleRecommendedMaintenance = (slot: TimeSlot) => {
    const params = new URLSearchParams();
    if (selectedService?.id) params.set('service', selectedService.id);
    params.set('date', slot.date);
    params.set('time', slot.time);
    router.push(`${L('/book')}?${params.toString()}`);
  };

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
    const title = encodeURIComponent(`Nailify — ${selectedService.name}`);
    const details = encodeURIComponent(
      en ? 'Appointment with Sandra at Nailify Mustamäe.' : 'Aeg Sandraga Nailify Mustamäe stuudios.'
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${toGCal(start)}/${toGCal(end)}&details=${details}&location=${encodeURIComponent(copy.studio)}`;
  }, [selectedService, selectedSlot, totalDuration, en, copy.studio]);

  const remainingStudio = Math.max(0, Math.round((totalPrice - DEPOSIT_EUROS) * 100) / 100);
  const checkoutType = searchParams.get('type');
  const isOrderCheckoutFlow = checkoutType === 'order';
  const isBookingView =
    !isOrderCheckoutFlow &&
    (flowType === 'booking' ||
      (flowType === null && (checkoutType === 'booking' || (!checkoutType && Boolean(selectedSlot)))));
  const dateTimeLine = selectedSlot
    ? `${new Date(selectedSlot.date).toLocaleDateString(en ? 'en-GB' : 'et-EE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })} · ${selectedSlot.time}`
    : '';

  if (paymentStatus === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f6] px-4 py-16">
        <div className="max-w-md rounded-2xl border border-[#e8ddd8] bg-white p-8 text-center shadow-sm">
          <p className="text-[#5c4a52]">{paymentMessage}</p>
          <button
            type="button"
            onClick={() => router.push(L('/'))}
            className="mt-6 rounded-full bg-[#c24d86] px-6 py-3 text-sm font-semibold text-white"
          >
            {copy.backHome}
          </button>
        </div>
      </div>
    );
  }

  if (flowType === 'order' && paymentStatus === 'confirmed') {
    return (
      <div className="min-h-screen bg-[#faf9f7] px-4 pb-36 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
        <div className="mx-auto max-w-md text-center">
          <div className="success-check-ring mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#f5eeef]">
            <svg className="success-check-icon h-10 w-10 text-[#b85c8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-brand text-2xl font-semibold text-[#2a2228]">{copy.orderHeadline}</h1>
          <p className="mt-3 text-[#7a6d74]">{copy.orderSub}</p>
          <p className="mt-2 text-xs text-[#a8989e]">
            {copy.refLabel}: {bookingRef}
          </p>
          <button
            type="button"
            onClick={() => router.push(L('/shop'))}
            className="mt-10 w-full rounded-full bg-[linear-gradient(135deg,#9c4d72_0%,#c24d86_50%,#a93d71_100%)] py-4 text-[15px] font-semibold text-white shadow-[0_16px_36px_-16px_rgba(194,77,134,0.45)]"
          >
            {copy.exploreShop}
          </button>
          <button type="button" onClick={() => router.push(L('/'))} className="mt-4 text-sm font-medium text-[#9d7a8a] underline underline-offset-2">
            {copy.backHome}
          </button>
        </div>
        <style jsx>{successStyles}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] pb-40 pt-8 sm:px-4 sm:pb-12 sm:pt-12 lg:pt-16">
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 sm:max-w-xl">
        {paymentStatus === 'verifying' && (
          <p className="mb-6 text-center text-sm text-[#8a7c84]">{copy.paymentVerifying}</p>
        )}

        {paymentStatus === 'confirmed' && isBookingView && (
          <p className="mb-4 text-center text-sm text-[#9d8a96]">{paymentMessage}</p>
        )}

        <div className="success-check-ring mb-8 flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full bg-[#f3ecee] shadow-[0_12px_32px_-20px_rgba(194,77,134,0.2)]">
          <svg
            className="success-check-icon h-11 w-11 text-[#b85c8a]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.65}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-center font-brand text-[1.75rem] font-semibold leading-tight tracking-tight text-[#2a2228] sm:text-[2rem]">
          {isBookingView ? copy.headline : copy.orderHeadline}
        </h1>
        <p className="mx-auto mt-3 max-w-[28ch] text-center text-[15px] leading-relaxed text-[#6d6268]">
          {isBookingView ? copy.subtext : copy.orderSub}
        </p>
        <p className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[#c9aeb8]">
          {copy.refLabel} · {bookingRef}
        </p>

        {isBookingView && selectedService && (
          <>
            <section className="mt-10 w-full rounded-[22px] border border-[#ebe6e3] bg-white p-5 shadow-[0_20px_48px_-32px_rgba(45,35,40,0.12)] sm:p-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#8a7d82]">{en ? 'Service' : 'Teenus'}</span>
                  <span className="text-right font-semibold text-[#2f282c]">{selectedService.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#8a7d82]">{en ? 'Specialist' : 'Spetsialist'}</span>
                  <span className="font-medium text-[#3d3539]">{copy.specialist}</span>
                </div>
                {selectedSlot && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#8a7d82]">{en ? 'Date & time' : 'Kuupäev ja aeg'}</span>
                    <span className="max-w-[60%] text-right text-[13px] font-medium leading-snug text-[#3d3539]">
                      {dateTimeLine}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-[#8a7d82]">{en ? 'Studio' : 'Stuudio'}</span>
                  <span className="text-right text-[13px] text-[#5d5258]">{copy.studio}</span>
                </div>
              </div>
              <div className="my-5 h-px bg-[#efeae7]" />
              <div className="flex justify-between text-sm">
                <span className="text-[#6d6268]">{copy.depositPaid}</span>
                <span className="font-semibold tabular-nums text-[#b04b80]">€{DEPOSIT_EUROS}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-[#6d6268]">{copy.remainingStudio}</span>
                <span className="font-medium tabular-nums text-[#3d3539]">€{remainingStudio}</span>
              </div>
            </section>

            <section className="mt-8 w-full">
              <h2 className="text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-[#a8989e]">
                {copy.nextTitle}
              </h2>
              <ul className="mt-4 space-y-3 text-center text-[15px] leading-relaxed text-[#5d545a] sm:text-left">
                <li className="flex gap-3 sm:items-start">
                  <span className="text-[#c9aeb8]">•</span>
                  <span>{copy.next1}</span>
                </li>
                <li className="flex gap-3 sm:items-start">
                  <span className="text-[#c9aeb8]">•</span>
                  <span>{copy.next2}</span>
                </li>
                <li className="flex gap-3 sm:items-start">
                  <span className="text-[#c9aeb8]">•</span>
                  <span>{copy.next3}</span>
                </li>
              </ul>
            </section>

            <div className="mt-8 w-full rounded-2xl border border-[#ecd4dc]/60 bg-[#fdf8fa] px-4 py-4 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b87a95]">{copy.tipLabel}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#5d4f55]">{copy.tipBody}</p>
            </div>

            <section className="mt-10 w-full">
              <p className="text-center text-xs font-medium text-[#9a8a94]">{copy.resultsCaption}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                {galleryUrls.slice(0, 3).map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[#ebe6e3] bg-[#f5f0ed]"
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width:640px) 30vw, 120px"
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-10 hidden w-full flex-col gap-3 sm:flex">
              <a
                href={calendarUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className={`block w-full rounded-full bg-[linear-gradient(135deg,#8f3d62_0%,#c24d86_48%,#a93d71_100%)] py-4 text-center text-[15px] font-semibold text-white shadow-[0_16px_36px_-16px_rgba(194,77,134,0.4)] ${!calendarUrl ? 'pointer-events-none opacity-40' : ''}`}
              >
                {copy.addCalendar}
              </a>
              <button
                type="button"
                onClick={() => router.push(L('/shop'))}
                className="w-full rounded-full border-2 border-[#e0d5d9] bg-white py-3.5 text-[15px] font-semibold text-[#5d4a56]"
              >
                {copy.exploreShop}
              </button>
              <button
                type="button"
                onClick={() => router.push(L('/book'))}
                className="w-full py-2 text-center text-sm font-medium text-[#9d7a8a] underline underline-offset-2"
              >
                {copy.bookAnother}
              </button>
            </div>

            {showRepeatOffer && (
              <section className="mt-8 w-full rounded-2xl border border-[#ebe6e3] bg-[#fffcfb] p-5 sm:mt-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b898a4]">{copy.maintenanceTitle}</p>
                <p className="mt-1 text-sm text-[#6d6268]">{copy.maintenanceHelper}</p>
                <p className="mt-2 text-xs text-[#8a7c82]">{nextBookingSuggestion.label}</p>
                {recommendedMaintenanceSlots.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recommendedMaintenanceSlots.map((slot) => (
                      <button
                        key={`future-${slot.id}`}
                        type="button"
                        onClick={() => handleRecommendedMaintenance(slot)}
                        className="rounded-full border border-[#e8dde2] bg-white px-3 py-1.5 text-xs font-medium text-[#6d525e] hover:bg-[#fff5f8]"
                      >
                        {new Date(`${slot.date}T00:00:00`).toLocaleDateString(en ? 'en-GB' : 'et-EE', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleNextBooking}
                  className="mt-4 w-full rounded-full border border-[#d4b8c4] bg-white py-2.5 text-sm font-semibold text-[#8b5c72] hover:bg-[#fff8fa]"
                >
                  {copy.bookNext}
                </button>
                <button type="button" onClick={() => setShowRepeatOffer(false)} className="mt-2 w-full text-xs text-[#a8989e]">
                  {copy.skip}
                </button>
              </section>
            )}
          </>
        )}

        {!isBookingView && paymentStatus === 'confirmed' && (
          <div className="mt-10 hidden w-full sm:block">
            <button
              type="button"
              onClick={() => router.push(L('/shop'))}
              className="w-full rounded-full bg-[linear-gradient(135deg,#8f3d62_0%,#c24d86_48%,#a93d71_100%)] py-4 text-[15px] font-semibold text-white"
            >
              {copy.exploreShop}
            </button>
          </div>
        )}

        <p className="mt-12 text-center text-xs text-[#b5a8ad]">{copy.helpFooter}</p>
      </div>

      {isBookingView && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ebe6e3] bg-[#fffcfc]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
          <a
            href={calendarUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className={`mb-2 block w-full rounded-full bg-[linear-gradient(135deg,#8f3d62_0%,#c24d86_48%,#a93d71_100%)] py-3.5 text-center text-[15px] font-semibold text-white shadow-[0_12px_28px_-12px_rgba(194,77,134,0.35)] ${!calendarUrl ? 'pointer-events-none opacity-40' : ''}`}
          >
            {copy.addCalendar}
          </a>
          <button
            type="button"
            onClick={() => router.push(L('/shop'))}
            className="w-full rounded-full border border-[#dcd4d6] bg-white py-3 text-[14px] font-semibold text-[#5d4a56]"
          >
            {copy.exploreShop}
          </button>
          <button
            type="button"
            onClick={() => router.push(L('/book'))}
            className="mt-2 w-full py-1.5 text-center text-xs font-medium text-[#9d7a8a]"
          >
            {copy.bookAnother}
          </button>
        </div>
      )}

      <style jsx>{successStyles}</style>
    </div>
  );
}

const successStyles = `
  @keyframes success-check-pop {
    0% {
      transform: scale(0.88);
      opacity: 0.75;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  .success-check-icon {
    animation: success-check-pop 0.65s cubic-bezier(0.22, 0.8, 0.22, 1) both;
  }
  @media (prefers-reduced-motion: reduce) {
    .success-check-icon {
      animation: none;
    }
  }
`;

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] p-4 text-[#8a7c84]">
          Loading…
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
