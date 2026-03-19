'use client';

import { Suspense, useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import type { TimeSlot } from '@/store/booking-types';
import type { BookingRecord } from '@/lib/bookings';
import { calculateBookingBreakdown } from '@/lib/booking-engine/pricing/calculate-booking-breakdown';
import { calculateBookingCheckoutPricingFromBookingRecord } from '@/lib/booking-engine/pricing/calculate-booking-checkout-pricing';
import { BOOKING_DEPOSIT_EUR } from '@/lib/booking-engine/pricing/calculate-booking-pricing';
import { getLocaleFromPathname, withLocale, type LocaleCode } from '@/lib/i18n/locale-path';
import { clearBookingSession, markBookingSuccessForSession, trackEvent, touchBookingActivity } from '@/lib/analytics-client';
import { trackEvent as trackFunnelEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';

type PaymentStatus = 'idle' | 'verifying' | 'confirmed' | 'error';
type SuccessProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category?: string;
};

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
  const [paymentMessage, setPaymentMessage] = useState('');
  const [flowType, setFlowType] = useState<'booking' | 'order' | null>(null);
  const [showRepeatOffer, setShowRepeatOffer] = useState(true);
  const [recommendedMaintenanceSlots, setRecommendedMaintenanceSlots] = useState<TimeSlot[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(FALLBACK_GALLERY);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const [postBookingProducts, setPostBookingProducts] = useState<SuccessProduct[]>([]);

  const bookingStore = useBookingStore();
  const { selectedService, selectedSlot, totalPrice, totalDuration, reset } = bookingStore;

  const capturedPriceRef = useRef<number>(0);
  const capturedDurationRef = useRef<number>(0);
  const capturedServiceRef = useRef(selectedService ?? null);
  const capturedSlotRef = useRef(selectedSlot ?? null);

  useEffect(() => {
    if (typeof totalPrice === 'number' && totalPrice > 0) capturedPriceRef.current = totalPrice;
    if (typeof totalDuration === 'number' && totalDuration >= 0) capturedDurationRef.current = totalDuration;
    if (selectedService) capturedServiceRef.current = selectedService;
    if (selectedSlot) capturedSlotRef.current = selectedSlot;
  }, [totalPrice, totalDuration, selectedService, selectedSlot]);

  const effectivePrice = (typeof totalPrice === 'number' && totalPrice > 0 ? totalPrice : null) ?? capturedPriceRef.current;
  const effectiveDuration = (typeof totalDuration === 'number' ? totalDuration : null) ?? capturedDurationRef.current;
  const effectiveService = selectedService ?? capturedServiceRef.current;
  const effectiveSlot = selectedSlot ?? capturedSlotRef.current;

  const storeServiceCost =
    typeof effectivePrice === 'number' && effectivePrice > 0 ? effectivePrice
    : typeof effectiveService?.price === 'number' ? effectiveService.price : 0;

  const bookingBreakdown = useMemo(() => confirmedBooking ? calculateBookingBreakdown(confirmedBooking) : null, [confirmedBooking]);
  const checkoutPricing = useMemo(() => confirmedBooking ? calculateBookingCheckoutPricingFromBookingRecord(confirmedBooking) : null, [confirmedBooking]);

  const serviceCost = checkoutPricing?.serviceTotal ?? bookingBreakdown?.finalTotal ?? storeServiceCost;
  const depositPaidForCard = checkoutPricing?.depositAmount ?? bookingBreakdown?.depositAmount ?? BOOKING_DEPOSIT_EUR;
  const productsTotal = checkoutPricing?.productsTotal ?? 0;
  const payNowTotal = checkoutPricing?.payNowTotal ?? Math.max(0, depositPaidForCard + productsTotal);

  const locale: LocaleCode = getLocaleFromPathname(pathname ?? '') ?? 'et';
  const L = (path: string) => withLocale(path, locale);
  const en = locale === 'en';

  const copy = useMemo(
    () =>
      en
        ? {
            verifying: 'Verifying your payment…',
            paymentOkBooking: 'Deposit received. Your time is secured.',
            paymentOkOrder: 'Thank you — your order is on its way.',
            paymentFail: 'We could not verify this payment. Please contact us.',
            heroHeadline: 'Sinu aeg on kinnitatud ✨',
            heroSub: "Booking with Sandra is confirmed.\nWe're looking forward to seeing you!",
            heroHeadlineEn: 'Your appointment is confirmed ✨',
            heroSubEn: "Your time with Sandra is secured.\nWe're looking forward to seeing you!",
            ref: 'Reference',
            durationLabel: 'Duration',
            techLabel: 'Technician',
            locationLabel: 'Location',
            serviceTotalLabel: 'Service total',
            depositLabel: 'Deposit paid',
            remainLabel: 'Remaining at salon',
            depositNote: 'Your deposit protects your time and prevents last-minute cancellations.',
            nextTitle: 'What happens next',
            next1: 'Confirmation sent to your email',
            next2: 'You can reschedule if plans change',
            next3: "Arrive 5 minutes early — we'll be ready",
            calendarCta: 'Add to Calendar',
            calendarHelper: "You'll get a reminder before your visit.",
            productsCta: 'View care products',
            bookNewCta: 'Book another time',
            inspirationTitle: 'Inspiration for your next visit',
            retentionTitle: 'Plan your next visit',
            retentionBody: 'Best results last 3–4 weeks. Most clients book their next appointment today.',
            retentionCta: 'Book your next appointment',
            retentionDismiss: 'Not now',
            footer: 'Questions? hello@nailify.com',
            backHome: 'Back to home',
            orderHeadline: 'Thank you for your order',
            orderSub: "We're preparing everything with care.",
            exploreCta: 'Explore products',
            maintenanceHint: 'Best results last 3–4 weeks.',
            postCareTitle: 'Keep your result beautiful longer',
            postCareBody: 'Based on your service, these are most recommended by our technicians.',
            addWithVisit: 'Add to order',
            shipWithVisit: 'Delivery with your visit prep',
            pickup: 'Pick up during visit',
            home: 'Home delivery',
          }
        : {
            verifying: 'Kontrollime makset…',
            paymentOkBooking: 'Ettemaks laekus. Sinu aeg on kindlustatud.',
            paymentOkOrder: 'Aitäh — tellimus on teele pandud.',
            paymentFail: 'Makset ei õnnestunud kinnitada. Palun võta ühendust.',
            heroHeadline: 'Sinu aeg on kinnitatud ✨',
            heroSub: 'Broneering Sandraga on edukalt tehtud.\nOotame sind!',
            heroHeadlineEn: 'Sinu aeg on kinnitatud ✨',
            heroSubEn: 'Broneering Sandraga on edukalt tehtud.\nOotame sind!',
            ref: 'Viide',
            durationLabel: 'Kestus',
            techLabel: 'Tehnik',
            locationLabel: 'Asukoht',
            serviceTotalLabel: 'Teenuse koguhind',
            depositLabel: 'Ettemaks tasutud',
            remainLabel: 'Ülejääk salongis',
            depositNote: 'Ettemaks kaitseb sinu aega ja väldib viimase hetke tühistamisi.',
            nextTitle: 'Mis edasi saab',
            next1: 'Saadame kinnituse e-postile',
            next2: 'Vajadusel saad aega paindlikult muuta',
            next3: 'Tule 5 minutit varem — oleme valmis',
            calendarCta: 'Lisa kalendrisse',
            calendarHelper: 'Saad automaatse meeldetuletuse enne visiiti.',
            productsCta: 'Vaata hooldustooteid',
            bookNewCta: 'Broneeri uus aeg',
            inspirationTitle: 'Inspiratsioon järgmiseks külastuseks',
            retentionTitle: 'Planeeri järgmine külastus',
            retentionBody: 'Parim tulemus püsib 3–4 nädalat. Enamus kliente broneerib järgmise aja juba täna.',
            retentionCta: 'Broneeri järgmine aeg',
            retentionDismiss: 'Mitte praegu',
            footer: 'Küsimused? hello@nailify.com',
            backHome: 'Tagasi avalehele',
            orderHeadline: 'Aitäh tellimuse eest',
            orderSub: 'Valmistame kõike hoolega ette.',
            exploreCta: 'Avasta tooted',
            maintenanceHint: 'Parim tulemus püsib 3–4 nädalat.',
            postCareTitle: 'Hoia tulemus kauem ilus',
            postCareBody: 'Sinu teenuse põhjal soovitavad tehnikud just neid tooteid.',
            addWithVisit: 'Lisa tellimusse',
            shipWithVisit: 'Tarne koos visiidiga',
            pickup: 'Võtan visiidil kaasa',
            home: 'Saadan koju',
          },
    [en]
  );

  const nextBookingSuggestion = useMemo(() => {
    const weeks = Number(text('repeat_booking_weeks', '4'));
    const days = Number.isFinite(weeks) && weeks > 0 ? weeks * 7 : 28;
    const base = selectedSlot ? new Date(`${selectedSlot.date}T12:00:00`) : new Date();
    const start = new Date(base); start.setDate(base.getDate() + Math.max(days - 7, 7));
    const end = new Date(base); end.setDate(base.getDate() + days);
    return {
      startDate: start.toISOString().slice(0, 10),
      label: `${start.toLocaleDateString(en ? 'en-GB' : 'et-EE', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(en ? 'en-GB' : 'et-EE', { day: 'numeric', month: 'short' })}`,
    };
  }, [selectedSlot, en, text]);

  useEffect(() => { setBookingRef(`NF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`); }, []);
  useEffect(() => { return () => { reset(); }; }, [reset]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/gallery');
        if (!res.ok) return;
        const data = (await res.json()) as { images?: { imageUrl: string }[] };
        const urls = (data.images ?? []).map((i) => i.imageUrl).filter(Boolean).slice(0, 3);
        if (urls.length >= 3) setGalleryUrls(urls);
        else if (urls.length > 0) setGalleryUrls([...urls, ...FALLBACK_GALLERY].slice(0, 3));
      } catch { /* keep fallbacks */ }
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
        const response = await fetch('/api/stripe/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, type }) });
        if (!response.ok) throw new Error('Payment verification failed');
        let bookingFromDb: BookingRecord | null = null;
        let breakdownForBooking: ReturnType<typeof calculateBookingBreakdown> | null = null;
        if (type === 'booking') {
          try {
            const r = await fetch(`/api/bookings/summary?stripeSessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
            if (r.ok) { const j = (await r.json()) as { booking?: BookingRecord }; if (j.booking) { bookingFromDb = j.booking; breakdownForBooking = calculateBookingBreakdown(j.booking); } }
          } catch { /* best-effort */ }
        }
        if (!isMounted) return;
        if (type === 'booking') setConfirmedBooking(bookingFromDb);
        setPaymentStatus('confirmed'); setFlowType(type);
        setPaymentMessage(type === 'booking' ? copy.paymentOkBooking : copy.paymentOkOrder);
        touchBookingActivity();
        if (type === 'booking') {
          const tTotal = breakdownForBooking?.finalTotal ?? serviceCost;
          const tDep = breakdownForBooking?.depositAmount ?? BOOKING_DEPOSIT_EUR;
          const tRem = breakdownForBooking?.remainingAmount ?? Math.max(0, tTotal - tDep);
          markBookingSuccessForSession();
          trackBehaviorEvent('payment_success', { serviceId: effectiveService?.id, slotId: effectiveSlot?.id, price: tTotal || undefined });
          trackEvent({ eventType: 'booking_success', step: 6, serviceId: effectiveService?.id, slotId: effectiveSlot?.id, metadata: { source: 'stripe_confirm', totalPrice: tTotal || null, totalDuration: bookingFromDb?.totalDuration ?? (effectiveDuration || null), deposit: tDep, remaining: tTotal > 0 ? Math.max(0, Number(tRem.toFixed(2))) : null, serviceName: effectiveService?.name ?? null } });
          trackFunnelEvent({ event: 'payment_success', serviceId: effectiveService?.id, slotId: effectiveSlot?.id, metadata: { totalPrice: tTotal, totalDuration: bookingFromDb?.totalDuration ?? effectiveDuration, deposit: tDep }, language });
          clearBookingSession();
        } else { trackBehaviorEvent('shop_payment_success'); }
      } catch (error) {
        console.error('Stripe confirm error:', error);
        if (!isMounted) return;
        setPaymentStatus('error'); setPaymentMessage(copy.paymentFail);
        trackBehaviorEvent('payment_failed', { reason: error instanceof Error ? error.message : 'verification_failed' });
      }
    };
    void verify();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, copy.paymentOkBooking, copy.paymentOkOrder, copy.paymentFail]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const weeks = Number(text('smart_settings_maintenance_weeks', text('repeat_booking_weeks', '4')));
      const w = Number.isFinite(weeks) && weeks > 0 ? weeks : 4;
      const fromBase = selectedSlot ? new Date(`${selectedSlot.date}T00:00:00`) : new Date();
      const from = new Date(fromBase); from.setDate(from.getDate() + Math.max(w * 7 - 7, 14));
      const to = new Date(fromBase); to.setDate(to.getDate() + w * 7 + 7);
      try {
        const r = await fetch(`/api/slots?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&smart=1&lang=${language}&serviceDuration=${selectedService?.duration ?? 0}`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = (await r.json()) as { recommendedTimes?: TimeSlot[] };
        if (mounted) setRecommendedMaintenanceSlots((d.recommendedTimes ?? []).filter((s) => s.available).slice(0, 3));
      } catch (e) { console.error('Recommendations failed:', e); }
    };
    void load();
    return () => { mounted = false; };
  }, [language, selectedService?.duration, selectedSlot, text]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const response = await fetch(`/api/products?lang=${language}`, { cache: 'force-cache' });
        if (!response.ok) return;
        const data = (await response.json()) as { products?: SuccessProduct[] };
        const all = data.products ?? [];
        if (!all.length) return;
        const serviceText = `${confirmedBooking?.serviceName ?? effectiveService?.name ?? ''} ${effectiveService?.category ?? ''}`.toLowerCase();
        const scored = all
          .map((product) => {
            const textValue = `${product.name} ${product.description} ${product.category ?? ''}`.toLowerCase();
            let score = 0;
            if (serviceText.includes('pikendus') || serviceText.includes('extension')) {
              if (textValue.includes('repair') || textValue.includes('seerum') || textValue.includes('serum')) score += 3;
            }
            if (serviceText.includes('gel') || serviceText.includes('manik')) {
              if (textValue.includes('oil') || textValue.includes('õli') || textValue.includes('topcoat')) score += 3;
            }
            if (textValue.includes('care') || textValue.includes('hooldus')) score += 1;
            return { product, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 2)
          .map((entry) => entry.product);
        if (mounted) setPostBookingProducts(scored);
      } catch {
        // best-effort upsell
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [confirmedBooking?.serviceName, effectiveService?.category, effectiveService?.name, language]);

  const handleNextBooking = () => {
    const p = new URLSearchParams();
    if (selectedService?.id) p.set('service', selectedService.id);
    if (nextBookingSuggestion.startDate) p.set('date', nextBookingSuggestion.startDate);
    if (selectedSlot?.time) p.set('time', selectedSlot.time);
    router.push(`${L('/book')}?${p.toString()}`);
  };

  const handleRecommendedMaintenance = (slot: TimeSlot) => {
    const p = new URLSearchParams();
    if (selectedService?.id) p.set('service', selectedService.id);
    p.set('date', slot.date); p.set('time', slot.time);
    router.push(`${L('/book')}?${p.toString()}`);
  };

  const handleInspirationTap = () => {
    if (recommendedMaintenanceSlots[0]) { handleRecommendedMaintenance(recommendedMaintenanceSlots[0]); return; }
    handleNextBooking();
  };

  const calendarUrl = useMemo(() => {
    if (!effectiveSlot || !effectiveService) return '';
    const start = new Date(`${effectiveSlot.date}T${effectiveSlot.time}:00`);
    const end = new Date(start); end.setMinutes(end.getMinutes() + (effectiveDuration || effectiveService.duration || 60));
    const g = (v: Date) => v.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(`Nailify — ${effectiveService.name}`);
    const details = encodeURIComponent(en ? 'Appointment with Sandra at Nailify Mustamäe.' : 'Aeg Sandraga Nailify Mustamäe stuudios.');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${g(start)}/${g(end)}&details=${details}&location=${encodeURIComponent('Mustamäe tee 55, Tallinn')}`;
  }, [effectiveService, effectiveSlot, effectiveDuration, en]);

  const remainingStudio = checkoutPricing ? Math.round(checkoutPricing.payLaterTotal * 100) / 100 : 0;
  const checkoutType = searchParams.get('type');
  const isOrderFlow = checkoutType === 'order';
  const isBookingView = !isOrderFlow && (flowType === 'booking' || (flowType === null && (checkoutType === 'booking' || (!checkoutType && Boolean(effectiveSlot)))));
  const serviceDisplayName = confirmedBooking?.serviceName ? confirmedBooking.serviceName : effectiveService ? (en ? effectiveService.nameEn ?? effectiveService.name : effectiveService.nameEt ?? effectiveService.name) : '';
  const durationDisplayMin = confirmedBooking?.totalDuration ?? effectiveDuration ?? effectiveService?.duration ?? 0;

  /* ─── Error state ─── */
  if (paymentStatus === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f6] px-4 py-16">
        <div className="max-w-md rounded-2xl border border-[#e8ddd8] bg-white p-8 text-center shadow-sm">
          <p className="text-[#5c4a52]">{paymentMessage}</p>
          <button type="button" onClick={() => router.push(L('/'))} className="mt-6 rounded-full bg-[#c24d86] px-6 py-3 text-sm font-semibold text-white">{copy.backHome}</button>
        </div>
      </div>
    );
  }

  /* ─── Order success ─── */
  if (flowType === 'order' && paymentStatus === 'confirmed') {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fffdfa_0%,_#fbf7fa_52%,_#f8f4f7_100%)] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-md text-center">
          <div className="success-check-ring mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4edf1] shadow-[0_8px_24px_-14px_rgba(159,69,111,0.15)]">
            <svg className="success-check-icon h-8 w-8 text-[#b85c8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="font-brand text-2xl font-semibold text-[#2a2228]">{copy.orderHeadline}</h1>
          <p className="mt-2 text-[#7a6d74]">{copy.orderSub}</p>
          <p className="mt-1.5 text-[10px] uppercase tracking-widest text-[#b8a8b0]">{copy.ref}: {bookingRef}</p>
          <button type="button" onClick={() => router.push(L('/shop'))} className="mt-8 w-full rounded-xl bg-[linear-gradient(135deg,#9c4d72_0%,#c24d86_50%,#a93d71_100%)] py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_28px_-14px_rgba(194,77,134,0.4)]">{copy.exploreCta}</button>
          <button type="button" onClick={() => router.push(L('/'))} className="mt-3 text-sm font-medium text-[#9d7a8a] underline underline-offset-2">{copy.backHome}</button>
        </div>
        <style jsx>{successStyles}</style>
      </div>
    );
  }

  /* ─── Booking success ─── */
  return (
    <div className="min-h-screen bg-[#f8f7f6] px-4 pb-14 pt-8 sm:pt-12">
      <div className="mx-auto flex max-w-lg flex-col items-center">

        {paymentStatus === 'verifying' && (
          <div className="mb-5 flex items-center gap-2 rounded-full border border-[#ede5ea] bg-white px-4 py-2 shadow-sm">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-[#ede5ea] border-t-[#9f456f]" />
            <span className="text-[13px] text-[#7a6d74]">{copy.verifying}</span>
          </div>
        )}

        {/* ─── Hero ─── */}
        <div className="success-check-ring mb-4 flex h-[5rem] w-[5rem] items-center justify-center rounded-full bg-[#FFF5F9] shadow-[0_8px_24px_-12px_rgba(159,69,111,0.15)]">
          <svg className="success-check-icon h-10 w-10 text-[#9f456f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="success-stagger-1 text-center font-brand text-[1.65rem] font-semibold leading-tight tracking-tight text-[#2a2228] sm:text-[1.9rem]">
          {isBookingView ? copy.heroHeadline : copy.orderHeadline}
        </h1>
        <p className="success-stagger-2 mx-auto mt-2.5 max-w-[34ch] whitespace-pre-line text-center text-[14px] leading-relaxed text-[#6d6268]">
          {isBookingView ? copy.heroSub : copy.orderSub}
        </p>

        {paymentStatus === 'confirmed' && isBookingView && (
          <p className="success-stagger-3 mt-3 rounded-full border border-[#e8dce4] bg-white px-4 py-1.5 text-[11px] font-medium text-[#9f456f] shadow-sm">
            {paymentMessage}
          </p>
        )}

        {isBookingView && effectiveService && (
          <>
            {/* ─── Booking Summary Card ─── */}
            <section className="success-stagger-4 mt-7 w-full rounded-[24px] border border-[#efefef] bg-white shadow-[0_8px_40px_-16px_rgba(0,0,0,0.07)]">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold text-[#2f282c]">{serviceDisplayName}</p>
                    {effectiveSlot && (
                      <p className="mt-1 text-[13px] text-[#6d6268]">
                        {new Date(effectiveSlot.date).toLocaleDateString(en ? 'en-GB' : 'et-EE', { weekday: 'long', day: 'numeric', month: 'long' })}{' · '}{effectiveSlot.time}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-lg bg-[#f8f4f6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a898a8]">{bookingRef}</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#f2eaed] pt-3 text-[12px]">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#b8a8b0]">{copy.durationLabel}</p>
                    <p className="mt-0.5 font-semibold text-[#2f282c]">{durationDisplayMin} min</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#b8a8b0]">{copy.techLabel}</p>
                    <p className="mt-0.5 font-semibold text-[#2f282c]">Sandra</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#b8a8b0]">{copy.locationLabel}</p>
                    <p className="mt-0.5 font-medium text-[#5d5258]">Mustamäe</p>
                  </div>
                </div>
              </div>

              {/* Financial breakdown */}
              <div className="border-t border-[#f2eaed] px-5 py-4 text-[13px]">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6d6268]">{copy.serviceTotalLabel}</span>
                    <span className="font-semibold tabular-nums text-[#2f282c]">{`€${serviceCost}`}</span>
                  </div>
                  {productsTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#6d6268]">{en ? 'Products' : 'Tooted'}</span>
                      <span className="font-semibold tabular-nums text-[#2f282c]">{`€${productsTotal}`}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#6d6268]">{copy.depositLabel}</span>
                    <span className="font-semibold tabular-nums text-[#9f456f]">{`€${checkoutPricing?.depositAmount ?? depositPaidForCard}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6d6268]">{en ? 'Paid at checkout' : 'Makstud'}</span>
                    <span className="font-semibold tabular-nums text-[#2f282c]">{`€${payNowTotal}`}</span>
                  </div>
                </div>
                {remainingStudio > 0 && (
                  <div className="mt-2.5 flex items-center justify-between rounded-xl bg-[#fff9fc] px-3.5 py-2">
                    <span className="text-[12px] font-semibold text-[#6a3b57]">{copy.remainLabel}</span>
                    <span className="text-[16px] font-bold tabular-nums text-[#9f456f]">{`€${remainingStudio}`}</span>
                  </div>
                )}

                {confirmedBooking?.products?.length ? (
                  <div className="mt-3 border-t border-[#f2eaed] pt-2.5">
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#b8a8b0]">{en ? 'Products' : 'Tooted'}</p>
                    {confirmedBooking.products.map((p) => (
                      <div key={p.productId} className="py-0.5 text-[12px]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-[#2f282c]">{p.name}{p.quantity > 1 ? ` ×${p.quantity}` : ''}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-[#9f456f]">{`€${p.unitPrice * p.quantity}`}</span>
                        </div>
                        <p className="text-[10px] text-[#9a8a94]">
                          {p.deliveryMethod === 'home_delivery' ? copy.home : copy.pickup}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <p className="mt-3 text-[11px] leading-relaxed text-[#8a7a85]">{copy.depositNote}</p>
              </div>
            </section>

            {/* ─── Actions ─── */}
            <section className="success-stagger-5 mt-4 w-full space-y-2.5">
              <a
                href={calendarUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] text-[15px] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(159,69,111,0.4)] transition-transform active:scale-[0.98] ${!calendarUrl ? 'pointer-events-none opacity-40' : ''}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                {copy.calendarCta}
              </a>
              <p className="text-center text-[11px] text-[#a898a8]">{copy.calendarHelper}</p>

              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => router.push(L('/shop'))} className="flex h-[44px] items-center justify-center rounded-[12px] border border-[#e8e8e8] bg-white text-[13px] font-semibold text-[#555] transition hover:bg-[#fafafa]">{copy.productsCta}</button>
                <button type="button" onClick={handleNextBooking} className="flex h-[44px] items-center justify-center rounded-[12px] border border-[#e8e8e8] bg-white text-[13px] font-semibold text-[#9f456f] transition hover:bg-[#fff5f9]">{copy.bookNewCta}</button>
              </div>
            </section>

            {postBookingProducts.length > 0 && (
              <section className="success-stagger-5 mt-4 w-full rounded-[18px] border border-[#efe3e9] bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a898a8]">{copy.postCareTitle}</p>
                <p className="mt-1 text-[12px] text-[#7a6a72]">{copy.postCareBody}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {postBookingProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => router.push(L(`/shop/${product.id}`))}
                      className="rounded-[12px] border border-[#f0e8ec] bg-[#fffafd] p-3 text-left"
                    >
                      <p className="line-clamp-2 text-[12px] font-semibold text-[#2f282c]">{product.name}</p>
                      <p className="mt-1 text-[11px] text-[#7a6d74]">€{product.price}</p>
                      <p className="mt-2 text-[10px] text-[#9f456f]">{copy.addWithVisit}</p>
                      <p className="text-[10px] text-[#a898a8]">{copy.shipWithVisit}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ─── What happens next ─── */}
            <section className="success-stagger-5 mt-5 w-full rounded-[18px] border border-[#f0f0f0] bg-white p-4">
              <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#a898a8]">{copy.nextTitle}</p>
              <div className="space-y-2.5">
                {[copy.next1, copy.next2, copy.next3].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f4edf1] text-[10px] font-bold text-[#9f456f]">{i + 1}</span>
                    <span className="text-[13px] text-[#5d5258]">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ─── Inspiration ─── */}
            <section className="success-stagger-6 mt-6 w-full">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a898a8]">{copy.inspirationTitle}</p>
              <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 success-inspiration-strip">
                {galleryUrls.map((url, i) => (
                  <button key={`${url}-${i}`} type="button" onClick={handleInspirationTap} className="group relative h-[102px] w-[150px] shrink-0 snap-start overflow-hidden rounded-xl border border-[#f0e8ec] bg-[#f5f0ed] shadow-[0_10px_24px_-18px_rgba(159,69,111,0.32)] transition-shadow hover:shadow-[0_14px_30px_-16px_rgba(159,69,111,0.30)]" aria-label={en ? 'Open related service' : 'Ava seotud teenus'}>
                    <Image src={url} alt="" fill unoptimized className="object-cover transition-transform duration-300 group-hover:scale-[1.04]" sizes="130px" />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-[11px] text-[#a898a8]">{copy.maintenanceHint}</p>
            </section>

            {/* ─── Retention ─── */}
            {showRepeatOffer && (
              <section className="success-stagger-7 mt-6 w-full rounded-[18px] border border-[#efefef] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#aaa]">{copy.retentionTitle}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#555]">{copy.retentionBody}</p>
                <p className="mt-1 text-[12px] text-[#999]">{en ? 'Most clients book their next time today.' : 'Enamus kliente broneerib järgmise aja juba täna.'}</p>
                <button type="button" onClick={handleNextBooking} className="mt-4 h-[48px] w-full rounded-[14px] bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] text-[14px] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(159,69,111,0.4)] transition-transform active:scale-[0.98]">{copy.retentionCta}</button>
                <button type="button" onClick={() => setShowRepeatOffer(false)} className="mt-2 w-full text-center text-[11px] font-medium text-[#aaa] hover:text-[#888]">{copy.retentionDismiss}</button>
              </section>
            )}
          </>
        )}

        {!isBookingView && paymentStatus === 'confirmed' && (
          <div className="mt-8 hidden w-full sm:block">
            <button type="button" onClick={() => router.push(L('/shop'))} className="h-[50px] w-full rounded-xl bg-[linear-gradient(135deg,#8f3d62_0%,#c24d86_48%,#a93d71_100%)] text-[15px] font-semibold text-white">{copy.exploreCta}</button>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-[#b5a8ad]">{copy.footer}</p>
      </div>

      <style jsx>{successStyles}</style>
    </div>
  );
}

const successStyles = `
  @keyframes success-check-spring {
    0% { transform: scale(0.5); opacity: 0; }
    40% { transform: scale(1.15); opacity: 1; }
    60% { transform: scale(0.92); }
    75% { transform: scale(1.04); }
    100% { transform: scale(1); opacity: 1; }
  }
  .success-check-icon { animation: success-check-spring 0.85s cubic-bezier(0.22,0.68,0,1) both; }
  @keyframes success-fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .success-stagger-1 { animation: success-fade-up 440ms ease-out both; }
  .success-stagger-2 { animation: success-fade-up 440ms ease-out both; animation-delay: 60ms; }
  .success-stagger-3 { animation: success-fade-up 440ms ease-out both; animation-delay: 110ms; }
  .success-stagger-4 { animation: success-fade-up 440ms ease-out both; animation-delay: 180ms; }
  .success-stagger-5 { animation: success-fade-up 440ms ease-out both; animation-delay: 240ms; }
  .success-stagger-6 { animation: success-fade-up 440ms ease-out both; animation-delay: 300ms; }
  .success-stagger-7 { animation: success-fade-up 440ms ease-out both; animation-delay: 360ms; }
  @media (prefers-reduced-motion: reduce) {
    .success-check-icon, .success-stagger-1, .success-stagger-2, .success-stagger-3,
    .success-stagger-4, .success-stagger-5, .success-stagger-6, .success-stagger-7 { animation: none; }
  }
  .success-inspiration-strip { -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
`;

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#faf9f7] p-4 text-[#8a7c84]">Loading…</div>}>
      <SuccessPageContent />
    </Suspense>
  );
}
