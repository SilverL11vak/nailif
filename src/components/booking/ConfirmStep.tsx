'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { CreditCard, Lock, RefreshCw, ShieldCheck, Star } from 'lucide-react';
import { clearBookingSession, trackEvent, touchBookingActivity } from '@/lib/analytics-client';
import { trackEvent as trackFunnelEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';

const DEPOSIT_EUROS = 10;
const LOCK_STORAGE_KEY = 'booking_slot_lock';
const LOCK_DURATION_MS = 5 * 60 * 1000;

const FALLBACK_RESULT_IMAGES = [
  'https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=400&q=80',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80',
  'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&q=80',
];

function formatLockMmSs(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ConfirmStep() {
  const { t, language } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);
  const [lockReady, setLockReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(FALLBACK_RESULT_IMAGES);
  const [lockPulse, setLockPulse] = useState(false);
  const expiryFiredRef = useRef(false);
  const expiresAtRef = useRef<number>(0);

  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const selectedAddOns = useBookingStore((state) => state.selectedAddOns);
  const contactInfo = useBookingStore((state) => state.contactInfo);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const totalDuration = useBookingStore((state) => state.totalDuration);
  const selectSlot = useBookingStore((state) => state.selectSlot);
  const setStep = useBookingStore((state) => state.setStep);
  const setStatus = useBookingStore((state) => state.setStatus);

  const selectedExtras = selectedAddOns.filter((addOn) => addOn.selected);
  const extrasTotal = selectedExtras.reduce((s, a) => s + a.price, 0);
  const en = language === 'en';

  const copy = useMemo(
    () => ({
      title: en ? 'Almost done' : 'Peaaegu valmis',
      subtitle: en ? 'Confirm your appointment' : 'Kinnita oma aeg',
      reassurance: en ? 'You can still make changes.' : 'Saad veel muuta.',
      summary: en ? 'Appointment' : 'Broneering',
      service: en ? 'Service' : 'Teenus',
      specialist: en ? 'Specialist' : 'Spetsialist',
      when: en ? 'Date & time' : 'Kuupäev ja aeg',
      studio: en ? 'Studio' : 'Stuudio',
      studioLine: en ? 'Mustamäe tee 55, Tallinn' : 'Mustamäe tee 55, Tallinn',
      priceService: en ? 'Service' : 'Teenus',
      extras: en ? 'Add-ons' : 'Lisad',
      deposit: en ? 'Deposit today' : 'Ettemaks täna',
      remaining: en ? 'Remaining at studio' : 'Kohapeal tasuda',
      trustRating: en ? '4.9 rating (1200+ clients)' : '4.9 hinnang (1200+ klienti)',
      trustHygiene: en ? 'Medical hygiene' : 'Meditsiiniline hügieen',
      trustStripe: en ? 'Secure Stripe checkout' : 'Turvaline Stripe makse',
      trustReschedule: en ? 'Free reschedule' : 'Tasuta ümberbroneerimine',
      locked: en ? 'Time locked for you' : 'Aeg sulle lukus',
      resultsCaption: en ? 'Recent results from Sandra' : 'Sandra hiljutised tulemused',
      cta: en ? `Secure my appointment — €${DEPOSIT_EUROS}` : `Kinnita aeg — ${DEPOSIT_EUROS} €`,
      ctaSub: en ? 'Takes less than 10 seconds' : 'Alla 10 sekundi',
      note1: en ? 'Instant confirmation' : 'Kohene kinnitus',
      note2: en ? 'Flexible reschedule' : 'Paindlik ümberbroneering',
      note3: en ? 'Pay rest at studio' : 'Ülejäänud kohapeal',
      depositExplain: en
        ? 'The deposit confirms your reservation. The remaining amount is paid at the studio.'
        : 'Ettemaks kinnitab broneeringu. Ülejäänud summa tasud stuudios.',
      cancelExplain: en
        ? 'Need to change plans? You can reschedule your time later.'
        : 'Plaanid muutusid? Saad aja hiljem ümber broneerida.',
      toastExpired: en ? 'This time is no longer reserved' : 'See aeg pole enam broneeritud',
      needContact: en ? 'Please complete your details on the previous step.' : 'Palun täida eelmine samm.',
      at: en ? 'at' : 'kell',
    }),
    [en]
  );

  const remainingStudio = Math.max(0, Math.round((totalPrice - DEPOSIT_EUROS) * 100) / 100);

  useEffect(() => {
    trackBehaviorEvent('booking_payment_view', {
      serviceId: selectedService?.id,
      slotId: selectedSlot?.id,
      depositAmount: DEPOSIT_EUROS,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService?.id, selectedSlot?.id]);

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
        else if (urls.length > 0) {
          const pad = [...urls, ...FALLBACK_RESULT_IMAGES].slice(0, 3);
          setGalleryUrls(pad);
        }
      } catch {
        /* keep fallbacks */
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedSlot) {
      setLockReady(false);
      return;
    }
    setLockReady(false);
    expiryFiredRef.current = false;
    const now = Date.now();
    let expires = now + LOCK_DURATION_MS;
    try {
      const raw = localStorage.getItem(LOCK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { slotId?: string; expiresAt?: number };
        if (parsed.slotId === selectedSlot.id && typeof parsed.expiresAt === 'number') {
          expires = parsed.expiresAt;
        }
      }
    } catch {
      /* ignore */
    }
    expiresAtRef.current = expires;
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify({ slotId: selectedSlot.id, expiresAt: expires }));
    const initialLeft = Math.max(0, Math.ceil((expires - now) / 1000));
    setRemainingSec(initialLeft);
    setLockReady(true);

    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000));
      setRemainingSec(left);
    }, 1000);

    return () => window.clearInterval(id);
  }, [selectedSlot?.id]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLockPulse((p) => !p);
    }, 10000);
    return () => window.clearInterval(id);
  }, []);

  const onLockExpired = useCallback(() => {
    if (expiryFiredRef.current || !selectedSlot) return;
    expiryFiredRef.current = true;
    try {
      localStorage.removeItem(LOCK_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setToast(copy.toastExpired);
    selectSlot(null);
    setStep(2);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('booking_shake_slots', '1');
    }
    window.setTimeout(() => setToast(null), 5000);
    window.requestAnimationFrame(() => {
      document.getElementById('booking-datetime-slot-area')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [copy.toastExpired, selectSlot, setStep, selectedSlot]);

  useEffect(() => {
    if (!lockReady || remainingSec > 0 || !selectedSlot || expiryFiredRef.current) return;
    onLockExpired();
  }, [remainingSec, selectedSlot, lockReady, onLockExpired]);

  const handleConfirm = async () => {
    if (!selectedService || !selectedSlot || !contactInfo) return;

    setIsLoading(true);
    setStatus('confirming');
    touchBookingActivity();
    trackBehaviorEvent('payment_started', { paymentMethod: 'stripe' });
    trackEvent({
      eventType: 'booking_payment_start',
      step: 5,
      serviceId: selectedService.id,
      slotId: selectedSlot.id,
    });
    trackFunnelEvent({
      event: 'payment_started',
      serviceId: selectedService.id,
      slotId: selectedSlot.id,
      metadata: { totalPrice, totalDuration, source: 'booking_confirm_step' },
      language,
    });

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

      try {
        localStorage.removeItem(LOCK_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Confirm booking error:', error);
      setStatus('error');
      trackBehaviorEvent('payment_failed', { reason: error instanceof Error ? error.message : 'checkout_failed' });
      trackEvent({
        eventType: 'booking_payment_fail',
        step: 5,
        serviceId: selectedService?.id,
        slotId: selectedSlot?.id,
      });
      clearBookingSession();
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

  const dateStr = new Date(selectedSlot.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = `${dateStr} · ${copy.at} ${selectedSlot.time}`;
  const canPay = Boolean(contactInfo?.firstName && contactInfo?.phone);

  const lockLine = `${copy.locked} — ${formatLockMmSs(remainingSec)}`;

  const CtaButton = ({ className }: { className?: string }) => (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={isLoading || !canPay || remainingSec <= 0}
      className={`w-full rounded-full bg-[linear-gradient(135deg,#8f3d62_0%,#c24d86_45%,#a93d71_100%)] py-4 text-[15px] font-semibold text-white shadow-[0_16px_36px_-14px_rgba(194,77,134,0.55)] transition-all duration-200 hover:shadow-[0_20px_40px_-12px_rgba(194,77,134,0.45)] disabled:cursor-not-allowed disabled:opacity-45 ${className ?? ''}`}
    >
      {isLoading ? t('confirm.confirming') : copy.cta}
    </button>
  );

  return (
    <div className="animate-fade-in mx-auto max-w-xl pb-40 lg:max-w-2xl lg:pb-10">
      {toast && (
        <div
          className="fixed left-1/2 top-24 z-[60] max-w-sm -translate-x-1/2 rounded-2xl border border-[#e8dce4] bg-white px-5 py-3.5 text-center text-sm font-medium text-[#4a3d44] shadow-[0_20px_50px_-24px_rgba(57,33,52,0.35)]"
          role="status"
        >
          {toast}
        </div>
      )}

      <header className="mb-8 text-center lg:mb-10">
        <h1 className="font-brand text-[1.85rem] font-semibold tracking-tight text-[#1f171d] md:text-[2.05rem]">
          {copy.title}
        </h1>
        <p className="mt-2 text-lg font-medium text-[#5d4a56]">{copy.subtitle}</p>
        <p className="mt-2 text-sm text-[#8a7a88]">{copy.reassurance}</p>
      </header>

      <section className="mb-6 rounded-[22px] border border-[#e8e0e4] bg-[#fdfbfc] p-5 shadow-[0_20px_48px_-32px_rgba(57,33,52,0.18)] sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a898a8]">{copy.summary}</p>
        <div className="mt-4 space-y-3 border-b border-[#efe8ec] pb-5">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[#7a6a74]">{copy.service}</span>
            <span className="text-right font-semibold text-[#2f2530]">{selectedService.name}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[#7a6a74]">{copy.specialist}</span>
            <span className="font-medium text-[#3d2f38]">Sandra</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[#7a6a74]">{copy.when}</span>
            <span className="text-right font-medium text-[#3d2f38]">{timeStr}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[#7a6a74]">{copy.studio}</span>
            <span className="text-right text-[#5d4a56]">{copy.studioLine}</span>
          </div>
        </div>
        <div className="mt-5 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#7a6a74]">{copy.priceService}</span>
            <span className="font-medium tabular-nums text-[#2f2530]">€{selectedService.price}</span>
          </div>
          {selectedExtras.length > 0 && (
            <div className="flex justify-between">
              <span className="text-[#7a6a74]">{copy.extras}</span>
              <span className="font-medium tabular-nums text-[#2f2530]">€{extrasTotal}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-dashed border-[#e5dde2] pt-2.5">
            <span className="font-medium text-[#5d4a56]">{copy.deposit}</span>
            <span className="font-semibold tabular-nums text-[#c24d86]">€{DEPOSIT_EUROS}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7a6a74]">{copy.remaining}</span>
            <span className="font-medium tabular-nums text-[#3d2f38]">€{remainingStudio}</span>
          </div>
        </div>
        <div className="mt-4 space-y-1.5 rounded-2xl border border-[#f0e8ed] bg-white px-4 py-3 text-[12px] text-[#6f5d69]">
          <p className="font-medium text-[#5d4a56]">{copy.depositExplain}</p>
          <p className="inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-[#9d6b8a]" strokeWidth={1.8} aria-hidden />
            {copy.cancelExplain}
          </p>
        </div>
      </section>

      <div className="mb-6 flex flex-wrap justify-center gap-x-5 gap-y-2 border-y border-[#f0eaee] py-4 text-center text-[11px] font-medium leading-snug text-[#8a7c86] sm:justify-between sm:gap-3 sm:text-left">
        <span className="inline-flex min-w-[7.5rem] items-center gap-2 sm:min-w-0">
          <Star className="h-4 w-4 text-[#b85c8a]" strokeWidth={1.8} aria-hidden /> {copy.trustRating}
        </span>
        <span className="inline-flex min-w-[7.5rem] items-center gap-2 sm:min-w-0">
          <ShieldCheck className="h-4 w-4 text-[#6b9b7a]" strokeWidth={1.8} aria-hidden /> {copy.trustHygiene}
        </span>
        <span className="inline-flex min-w-[7.5rem] items-center gap-2 sm:min-w-0">
          <CreditCard className="h-4 w-4 text-[#6b5a66]" strokeWidth={1.8} aria-hidden /> {copy.trustStripe}
        </span>
        <span className="inline-flex min-w-[7.5rem] items-center gap-2 sm:min-w-0">
          <RefreshCw className="h-4 w-4 text-[#9d6b8a]" strokeWidth={1.8} aria-hidden /> {copy.trustReschedule}
        </span>
      </div>

      <div
        className={`mb-6 flex items-center gap-3 rounded-2xl border border-[#ebe4e8] bg-[#f9f6f8] px-4 py-3.5 transition-[box-shadow] duration-500 motion-reduce:transition-none ${
          lockPulse ? 'shadow-[inset_0_0_0_1px_rgba(194,77,134,0.08)]' : ''
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0e6ec] text-[#8b5c78]">
          <Lock className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#6d5a66]">{copy.locked}</p>
          <p className="font-brand text-2xl font-semibold tabular-nums tracking-tight text-[#2c2430]">
            {formatLockMmSs(remainingSec)}
          </p>
        </div>
      </div>

      <section className="mb-6">
        <p className="mb-3 text-center text-xs font-medium text-[#9a8a94]">{copy.resultsCaption}</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {galleryUrls.slice(0, 3).map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[#ebe4e8] bg-[#f5f0f3]"
            >
              <Image
                src={url}
                alt={en ? 'Recent nail work' : 'Hiljutine töö'}
                fill
                className="object-cover"
                sizes="120px"
              />
            </div>
          ))}
        </div>
      </section>

      {!canPay && (
        <p className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-center text-sm text-amber-900/90">
          {copy.needContact}
        </p>
      )}

      <div className="mb-4 hidden lg:block">
        <CtaButton />
        <p className="mt-3 text-center text-xs text-[#9a8a94]">{copy.ctaSub}</p>
      </div>

      <ul className="mb-8 space-y-1.5 text-center text-[13px] text-[#8a7c88] lg:mb-6 lg:text-left">
        <li>• {copy.note1}</li>
        <li>• {copy.note2}</li>
        <li>• {copy.note3}</li>
      </ul>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[50] h-32 bg-[linear-gradient(180deg,transparent_0%,#fff9fb_55%,#fff5f9_100%)] lg:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-[55] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto w-full max-w-lg rounded-[22px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_48px_-20px_rgba(57,33,52,0.28)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#f0eaee] pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <Lock className="h-4 w-4 shrink-0 text-[#9d7a8f]" strokeWidth={2} />
              <span className="truncate text-xs font-medium text-[#6d5a66]">{lockLine}</span>
            </div>
            <span className="shrink-0 font-brand text-lg font-semibold tabular-nums text-[#2c2430]">
              {formatLockMmSs(remainingSec)}
            </span>
          </div>
          <p className="mb-1 truncate text-[13px] font-semibold text-[#2f2530]">{selectedService.name}</p>
          <p className="mb-3 truncate text-xs text-[#8a7a88]">{selectedSlot.time}</p>
          <button
            id="booking-sticky-primary-action"
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !canPay || remainingSec <= 0}
            className="w-full rounded-full bg-[linear-gradient(135deg,#8f3d62_0%,#c24d86_45%,#a93d71_100%)] py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_32px_-12px_rgba(194,77,134,0.5)] transition-all active:scale-[0.99] disabled:opacity-45"
          >
            {isLoading ? t('confirm.confirming') : copy.cta}
          </button>
          <p className="mt-2 text-center text-[11px] text-[#a89a9f]">{copy.ctaSub}</p>
        </div>
      </div>
    </div>
  );
}

export default ConfirmStep;
