'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useBookingStore } from '@/store/booking-store';
import type { ContactInfo } from '@/store/booking-types';
import { useTranslation } from '@/lib/i18n';
import { Check, CheckCircle2, Eye, Lock, RefreshCw, ShieldCheck, Star, UploadCloud } from 'lucide-react';
import { clearBookingSession, trackEvent, touchBookingActivity } from '@/lib/analytics-client';
import { trackEvent as trackFunnelEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';

const DEPOSIT_EUROS = 10;
const LOCK_STORAGE_KEY = 'booking_slot_lock';
const LOCK_DURATION_MS = 5 * 60 * 1000;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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
  const [lockPulse, setLockPulse] = useState(false);
  const expiryFiredRef = useRef(false);
  const expiresAtRef = useRef<number>(0);

  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const selectedAddOns = useBookingStore((state) => state.selectedAddOns);
  const contactInfo = useBookingStore((state) => state.contactInfo);
  const setContactInfo = useBookingStore((state) => state.setContactInfo);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const totalDuration = useBookingStore((state) => state.totalDuration);
  const selectSlot = useBookingStore((state) => state.selectSlot);
  const setStep = useBookingStore((state) => state.setStep);
  const setStatus = useBookingStore((state) => state.setStatus);

  const selectedExtras = selectedAddOns.filter((addOn) => addOn.selected);
  const en = language === 'en';

  const copy = useMemo(
    () => ({
      title: en ? 'Almost done — your time is reserved' : 'Peaaegu valmis — sinu aeg on lukus',
      subtitle: en ? 'Complete your booking to secure this appointment.' : 'Lõpeta broneering, et see aeg jääks ainult sulle.',
      timerHint: en ? 'If the timer expires, your slot will be released.' : 'Kui lahkud sellelt lehelt võib sinu reserveeritud aeg vabaneda.',
      locked: 'Time locked for you',
      depositTitle: en ? `€${DEPOSIT_EUROS} deposit secures your time` : 'Ettemaks hoiab sinu aja ainult sulle',
      depositSub: en
        ? 'This prevents last-minute cancellations and guarantees your appointment.'
        : 'See hoiab ära viimase hetke tühistamised ja tagab sinu aja.',
      depositChipStripe: en ? 'Secure Stripe payment' : 'Turvaline Stripe makse',
      depositChipEncrypted: en ? 'Encrypted data' : 'Krüpteeritud andmed',
      depositChipCancel: en ? 'Free cancellation up to 24h' : 'Tasuta tühistamine kuni 24h',
      depositChipEmail: en ? 'Instant confirmation email' : 'Kohene kinnituse email',
      formTitle: en ? 'Your details' : 'Sinu andmed',
      firstName: en ? 'First name' : 'Eesnimi',
      phone: en ? 'Phone' : 'Telefon',
      email: en ? 'Email (optional)' : 'E-post (valikuline)',
      notes: en ? 'Notes (optional)' : 'Märkused (valikuline)',
      inspiration: en ? 'Inspiration photo (optional)' : 'Inspiratsioonipilt (valikuline)',
      trustChip1: en ? 'Free rescheduling' : 'Tasuta ümberbroneerimine',
      trustChip2: en ? 'Certified hygiene' : 'Sertifitseeritud hügieen',
      trustChip3: en ? 'Private studio' : 'Privaatne stuudio',
      trustStrip1: en ? '4.9 rating' : '4.9 hinnang',
      trustStrip2: en ? '1200+ happy clients' : '1200+ rahul klienti',
      trustStrip3: en ? 'Sterilised tools' : 'Steriliseeritud tööriistad',
      trustStrip4: en ? 'Cancel free up to 24h' : 'Tasuta tühistamine kuni 24h',
      cta: en ? 'Confirm my appointment' : 'Kinnita minu broneering',
      ctaLoading: en ? 'Securing your time…' : 'Broneerin sinu aega...',
      ctaSub: en ? 'You will be redirected to secure payment' : 'Teid suunatakse turvalisse maksele',
      toastExpired: en ? 'This time is no longer reserved' : 'See aeg pole enam broneeritud',
      needContact: en ? 'Please complete your details.' : 'Palun täida oma andmed.',
      at: en ? 'at' : 'kell',
    }),
    [en]
  );

  const phoneRegex = /^\+\d[\d\s-]{5,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [form, setForm] = useState(() => ({
    firstName: contactInfo?.firstName ?? '',
    phone: contactInfo?.phone ?? '',
    email: contactInfo?.email ?? '',
    notes: contactInfo?.notes ?? '',
    inspirationImage: contactInfo?.inspirationImage ?? '',
  }));

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!contactInfo) return;
    setForm({
      firstName: contactInfo.firstName ?? '',
      phone: contactInfo.phone ?? '',
      email: contactInfo.email ?? '',
      notes: contactInfo.notes ?? '',
      inspirationImage: contactInfo.inspirationImage ?? '',
    });
    setFormErrors({});
    setTouched({});
  }, [contactInfo]);

  useEffect(() => {
    trackBehaviorEvent('booking_payment_view', {
      serviceId: selectedService?.id,
      slotId: selectedSlot?.id,
      depositAmount: DEPOSIT_EUROS,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService?.id, selectedSlot?.id]);

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
    }, 3000);
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

  const handleConfirm = async (payloadContact: ContactInfo): Promise<boolean> => {
    if (!selectedService || !selectedSlot) return false;

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
          contact: payloadContact,
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
      return true;
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
      return false;
    }
  };

  const firstNameValid = form.firstName.trim().length > 0;
  const phoneValid = phoneRegex.test(form.phone.trim());
  const emailInput = form.email.trim();
  const emailValid = !emailInput || emailRegex.test(emailInput);

  const canPay = firstNameValid && phoneValid && emailValid && remainingSec > 0 && lockReady && !isLoading;

  const [ctaPressed, setCtaPressed] = useState(false);
  const [ctaGlowOnce, setCtaGlowOnce] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(true);
  const [inspirationUploading, setInspirationUploading] = useState(false);

  const ctaAnchorRef = useRef<HTMLDivElement>(null);
  const didAutoScrollRef = useRef(false);
  const inspirationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!canPay) return;
    if (didAutoScrollRef.current) return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;

    didAutoScrollRef.current = true;
    requestAnimationFrame(() => {
      ctaAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [canPay]);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.firstName.trim()) nextErrors.firstName = t('contact.required');
    if (!form.phone.trim()) nextErrors.phone = t('contact.required');
    else if (!phoneValid) nextErrors.phone = t('contact.validPhone');

    if (emailInput && !emailValid) nextErrors.email = t('contact.validEmail');

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleInspirationUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 3 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        inspiration: en ? 'Image is too large (max 3 MB).' : 'Pilt on liiga suur (max 3 MB).',
      }));
      return;
    }
    setInspirationUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, inspirationImage: dataUrl }));
      setFormErrors((prev) => ({ ...prev, inspiration: '' }));
    } catch {
      setFormErrors((prev) => ({
        ...prev,
        inspiration: en ? 'Image upload failed.' : 'Pildi lisamine ebaõnnestus.',
      }));
    } finally {
      setInspirationUploading(false);
      if (inspirationInputRef.current) inspirationInputRef.current.value = '';
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

  const dateLong = new Date(selectedSlot.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const dateShort = new Date(selectedSlot.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const durationMin = totalDuration || selectedService.duration || 0;
  const totalPriceDisplay = totalPrice || selectedService.price || 0;

  const technicianName = 'Sandra';
  const studioLocation = 'Mustamäe tee 55, Tallinn';

  const lockLine = `${copy.locked} — ${formatLockMmSs(remainingSec)}`;

  const viewedToday = 3;

  const handleSubmit = async () => {
    setTouched({ firstName: true, phone: true, email: true, notes: true, inspiration: true });
    if (!validateForm()) {
      setCtaPressed(false);
      setCtaGlowOnce(false);
      return;
    }
    if (!selectedService || !selectedSlot) return;

    const payloadContact: ContactInfo = {
      firstName: form.firstName.trim(),
      phone: form.phone.trim(),
      email: emailInput ? emailInput : undefined,
      notes: form.notes.trim() ? form.notes.trim() : undefined,
      inspirationImage: form.inspirationImage || undefined,
    };

    setContactInfo(payloadContact);
    const ok = await handleConfirm(payloadContact);
    if (!ok) {
      setCtaPressed(false);
      setCtaGlowOnce(false);
    }
  };

  const BookingSummaryPremiumCard = ({ className }: { className?: string }) => (
    <div
      className={[
        'booking-summary-premium relative overflow-hidden rounded-[26px] border border-[#f0e8ed] bg-[radial-gradient(ellipse_at_top,_rgba(194,77,134,0.14)_0%,_rgba(255,250,252,0.95)_50%,_rgba(255,255,255,1)_100%)] p-5 shadow-[0_26px_66px_-40px_rgba(57,33,52,0.22)] ring-1 ring-[#f3e8f0]/40 transition-all duration-300 hover:shadow-[0_40px_92px_-60px_rgba(194,77,134,0.18)]',
        className ?? '',
      ].join(' ')}
    >
      {ctaPressed && <div className="booking-summary-shimmer" aria-hidden />}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a898a8]">{en ? 'Your appointment' : 'Sinu broneering'}</p>
          <p className="mt-2 font-brand text-lg font-semibold leading-tight text-[#2f2530]">{selectedService.name}</p>
            <p className="mt-1 text-xs font-medium text-[#8a7a88]">
            {dateShort} · {selectedSlot.time}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Total' : 'Kokku'}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[#c24d86]">€{totalPriceDisplay}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Date' : 'Kuupäev'}</p>
          <p className="mt-0.5 font-medium text-[#3d2f38]">{dateLong}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Time' : 'Aeg'}</p>
          <p className="mt-0.5 font-semibold text-[#8a7a88]">{selectedSlot.time}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Duration' : 'Kestus'}</p>
          <p className="mt-0.5 font-medium text-[#3d2f38]">{durationMin} min</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Price' : 'Hind'}</p>
          <p className="mt-0.5 font-semibold text-[#2f2530]">€{totalPriceDisplay}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Technician & studio' : 'Tehnik ja stuudio'}</p>
          <p className="mt-0.5 font-medium text-[#3d2f38]">
            {technicianName} · {studioLocation}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { label: copy.trustChip1 },
          { label: copy.trustChip2 },
          { label: copy.trustChip3 },
        ].map((chip, i) => (
          <span
            key={chip.label}
            className="booking-trust-chip-anim relative inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-[#5d4a56]"
            style={{ animationDelay: `${i * 140}ms` }}
          >
            <Check
              className={[
                'h-4 w-4',
                ctaPressed ? 'text-[#2d8a5e] booking-benefit-tick-ok' : 'text-[#c24d86]',
              ].join(' ')}
              style={ctaPressed ? { animationDelay: `${i * 140}ms` } : undefined}
              strokeWidth={2.4}
              aria-hidden
            />
            {chip.label}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[640px] pb-40 lg:pb-10">
      {toast && (
        <div
          className="fixed left-1/2 top-24 z-[60] max-w-sm -translate-x-1/2 rounded-2xl border border-[#e8dce4] bg-white px-5 py-3.5 text-center text-sm font-medium text-[#4a3d44] shadow-[0_20px_50px_-24px_rgba(57,33,52,0.35)]"
          role="status"
        >
          {toast}
        </div>
      )}

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_390px] xl:gap-10">
        {/* LEFT: emotional confirmation + form */}
        <div>
          <header className="mb-5 text-center">
            <h1 className="font-brand text-[28px] font-medium leading-[1.25] tracking-tight text-[#1f171d]">
              {copy.title}
            </h1>
            <p className="mt-2 text-[15px] leading-[1.65] font-medium text-[#5d4a56]">{copy.subtitle}</p>

            {/* Loss framing bar */}
            <div className="mx-auto mt-4 flex max-w-[560px] items-start gap-3 rounded-[22px] border-l-4 border-l-[#c24d86]/30 border border-[#f0d6e3] bg-[#fff4fb]/90 px-4 py-3 shadow-[0_16px_40px_-32px_rgba(57,33,52,0.12)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f0e6ec] text-[#c24d86]">
                <Lock className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <p className="pt-0.5 text-left text-sm font-medium text-[#6a3b57]">{copy.timerHint}</p>
            </div>

            {/* Animated countdown badge */}
            <div
              className={`mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-[#efe0e8] bg-white/80 px-4 py-2 text-sm font-semibold text-[#6a3b57] shadow-[0_16px_40px_-32px_rgba(57,33,52,0.12)] backdrop-blur-sm ${
                lockPulse ? 'booking-countdown-badge-pulse' : ''
              }`}
            >
              <Lock className="h-4 w-4 text-[#c24d86]" strokeWidth={2} aria-hidden />
              <span>
                {copy.locked} — {formatLockMmSs(remainingSec)}
              </span>
            </div>
          </header>

          {/* Mobile: collapsible booking summary */}
          <div className="xl:hidden mb-5">
            <button
              type="button"
              onClick={() => setMobileSummaryOpen((s) => !s)}
              className="w-full rounded-[22px] border border-[#efe0e8] bg-white/80 px-4 py-3 text-left shadow-[0_16px_40px_-32px_rgba(57,33,52,0.12)]"
              aria-expanded={mobileSummaryOpen}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a898a8]">
                    {en ? 'Booking summary' : 'Broneeringu kokkuvõte'}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-[#2f2530]">{selectedService.name}</p>
                  <p className="mt-0.5 text-xs font-medium text-[#8a7a88]">
                    {dateShort} · {selectedSlot.time}
                  </p>
                </div>
                <span className="shrink-0 text-[#c24d86] text-[22px] leading-none font-semibold" aria-hidden>
                  {mobileSummaryOpen ? '−' : '+'}
                </span>
              </div>
            </button>
            {mobileSummaryOpen && (
              <div className="mt-3">
                <BookingSummaryPremiumCard />
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#8a7a88]">
                  <Eye className="h-4 w-4 text-[#c24d86]" strokeWidth={2} aria-hidden />
                  {en ? `${viewedToday} people viewed this slot today` : '3 inimest vaatas seda aega täna'}
                </div>
              </div>
            )}
          </div>

          {/* Hero -> next section transition (subtle blur line) */}
          <div
            className="xl:hidden mb-5 h-px w-full bg-[linear-gradient(90deg,transparent_0%,rgba(194,77,134,0.28)_50%,transparent_100%)] blur-[0.2px]"
            aria-hidden
          />

          {/* Deposit framing */}
          <section className="mb-5 rounded-[22px] border border-[#ead6e2] bg-[linear-gradient(180deg,#fff7fb_0%,#fffafd_60%,#ffffff_100%)] p-5 shadow-[0_18px_44px_-36px_rgba(194,77,134,0.35)]">
            <div className="min-w-0">
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#8a7a88]">{en ? 'Deposit' : 'Ettemaks'}</p>
              <p className="mt-2 font-brand text-[20px] font-semibold text-[#2f2530]">{copy.depositTitle}</p>
              <p className="mt-2 text-sm font-medium text-[#7a6a72]">{copy.depositSub}</p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-white/70 px-3 py-1 text-[12px] font-semibold text-[#5d4a56]">
                <Lock className="h-4 w-4 text-[#c24d86]" strokeWidth={2} aria-hidden />
                {en ? 'Secure Stripe checkout' : 'Turvaline Stripe makse'}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <span className="booking-deposit-chip inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-[#5d4a56]">
                  <Lock className="h-4 w-4 text-[#c24d86]" strokeWidth={2} aria-hidden />
                  {copy.depositChipStripe}
                </span>
                <span className="booking-deposit-chip inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-[#5d4a56]">
                  <ShieldCheck className="h-4 w-4 text-[#6b9b7a]" strokeWidth={2} aria-hidden />
                  {copy.depositChipEncrypted}
                </span>
                <span className="booking-deposit-chip inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-[#5d4a56]">
                  <RefreshCw className="h-4 w-4 text-[#9d6b8a]" strokeWidth={2} aria-hidden />
                  {copy.depositChipCancel}
                </span>
                <span className="booking-deposit-chip inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-[#5d4a56]">
                  <CheckCircle2 className="h-4 w-4 text-[#2d8a5e]" strokeWidth={2} aria-hidden />
                  {copy.depositChipEmail}
                </span>
              </div>

              {/* Payment method mini logos */}
              <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-[#ead6e2] bg-white/60 px-3 py-2">
                <span className="inline-flex items-center justify-center rounded-xl border border-[#ead6e2] bg-white px-3 py-1 text-[12px] font-bold text-[#244b7a]">
                  VISA
                </span>
                <span className="inline-flex items-center justify-center rounded-xl border border-[#ead6e2] bg-white px-3 py-1 text-[12px] font-bold text-[#5d4a56]">
                  Mastercard
                </span>
                <span className="inline-flex items-center justify-center rounded-xl border border-[#ead6e2] bg-[linear-gradient(135deg,#a93d71_0%,#c24d86_50%,#b03d6f_100%)] px-3 py-1 text-[12px] font-bold text-white">
                  Stripe
                </span>
              </div>
            </div>
          </section>

          {/* Client details form */}
          <form
            className="mb-5 rounded-[22px] border border-[#eadce5] bg-white/80 p-5 backdrop-blur-sm lg:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#8a7a88]">{copy.formTitle}</p>
              {!canPay && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-[12px] font-semibold text-amber-900/90">
                  <Lock className="h-4 w-4 text-[#9d6b8a]" strokeWidth={2} aria-hidden />
                  {en ? 'Finish to confirm' : 'Kinnitamiseks lõpeta'}
                </span>
              )}
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
              {/* First name */}
              <label className="block">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px] font-medium text-[#443630]">
                    {copy.firstName} <span className="text-[#c24d86]">*</span>
                  </span>
                  {touched.firstName && firstNameValid ? (
                    <CheckCircle2 className="h-5 w-5 text-[#2d8a5e]" aria-hidden />
                  ) : null}
                </div>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => ({ ...prev, firstName: v }));
                    setFormErrors((prev) => ({ ...prev, firstName: '' }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, firstName: true }))}
                  className={`mt-2 h-[56px] w-full rounded-[14px] border bg-white px-4 text-[16px] outline-none transition sm:text-sm ${
                    touched.firstName && !firstNameValid
                      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-300/20'
                      : 'border-[#e3dbd4] focus:border-[#c24d86]/60 focus:ring-2 focus:ring-[#c24d86]/20'
                  }`}
                  placeholder={en ? 'Your first name' : 'Eesnimi'}
                  aria-invalid={Boolean(formErrors.firstName)}
                />
                {touched.firstName && formErrors.firstName ? (
                  <p className="mt-1 text-xs text-red-500">{formErrors.firstName}</p>
                ) : null}
              </label>

              {/* Phone */}
              <label className="block">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px] font-medium text-[#443630]">
                    {copy.phone} <span className="text-[#c24d86]">*</span>
                  </span>
                  {touched.phone && phoneValid ? (
                    <CheckCircle2 className="h-5 w-5 text-[#2d8a5e]" aria-hidden />
                  ) : null}
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => ({ ...prev, phone: v }));
                    setFormErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                  className={`mt-2 h-[56px] w-full rounded-[14px] border bg-white px-4 text-[16px] outline-none transition sm:text-sm ${
                    touched.phone && !phoneValid
                      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-300/20'
                      : 'border-[#e3dbd4] focus:border-[#c24d86]/60 focus:ring-2 focus:ring-[#c24d86]/20'
                  }`}
                  placeholder={en ? '+372 5xx xxx' : '+372 5xx xxx'}
                  aria-invalid={Boolean(formErrors.phone)}
                />
                {touched.phone && formErrors.phone ? <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p> : null}
              </label>

              </div>

              <div className="space-y-4">
              {/* Email */}
              <label className="block">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px] font-medium text-[#443630]">{copy.email}</span>
                  {touched.email && emailInput && emailValid ? (
                    <CheckCircle2 className="h-5 w-5 text-[#2d8a5e]" aria-hidden />
                  ) : null}
                </div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => ({ ...prev, email: v }));
                    setFormErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  className={`mt-2 h-[56px] w-full rounded-[14px] border bg-white px-4 text-[16px] outline-none transition sm:text-sm ${
                    touched.email && emailInput && !emailValid
                      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-300/20'
                      : 'border-[#e3dbd4] focus:border-[#c24d86]/60 focus:ring-2 focus:ring-[#c24d86]/20'
                  }`}
                  placeholder={en ? 'name@email.com' : 'nimi@email.com'}
                  aria-invalid={Boolean(formErrors.email)}
                />
                {touched.email && formErrors.email ? <p className="mt-1 text-xs text-red-500">{formErrors.email}</p> : null}
              </label>

              {/* Notes */}
              <label className="block">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px] font-medium text-[#443630]">{copy.notes}</span>
                </div>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => ({ ...prev, notes: v }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, notes: true }))}
                  className="mt-2 min-h-[88px] w-full resize-none rounded-[14px] border border-[#e3dbd4] bg-white px-4 py-4 text-[16px] outline-none transition focus:border-[#c24d86]/60 focus:ring-2 focus:ring-[#c24d86]/20 sm:text-sm"
                  placeholder={en ? 'Anything you want us to know…' : 'Kõik, mida peaks teadma…'}
                />
              </label>

              </div>

              {/* Inspiration upload */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-medium text-[#443630]">{en ? 'Inspiration photos' : 'Inspiratsioon'}</p>
                    <p className="mt-1 text-[13px] font-medium text-[#7d6275]">
                      {en ? 'Optional — helps us prepare.' : 'Valikuline — aitab meil ette valmistada.'}
                    </p>
                  </div>
                  {form.inspirationImage ? (
                    <CheckCircle2 className="mt-1 h-5 w-5 text-[#2d8a5e]" aria-hidden />
                  ) : null}
                </div>

                <input
                  ref={inspirationInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleInspirationUpload(e.target.files)}
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => inspirationInputRef.current?.click()}
                    disabled={inspirationUploading}
                    className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#e1d6cd] bg-white/60 px-4 py-4 text-left transition hover:border-[#c79c84] hover:bg-[#fff6fb] active:scale-[0.99]"
                    aria-busy={inspirationUploading}
                  >
                    <UploadCloud className="h-5 w-5 text-[#c24d86]" strokeWidth={2} aria-hidden />
                    <span className="text-[13px] font-semibold text-[#6f5d69]">{en ? 'Upload inspiration photo' : 'Lisa inspiratsioonipilt'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => inspirationInputRef.current?.click()}
                    disabled={inspirationUploading}
                    className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#e1d6cd] bg-white/60 px-4 py-4 text-left transition hover:border-[#c79c84] hover:bg-[#fff6fb] active:scale-[0.99]"
                    aria-busy={inspirationUploading}
                  >
                    <UploadCloud className="h-5 w-5 text-[#c24d86]" strokeWidth={2} aria-hidden />
                    <span className="text-[13px] font-semibold text-[#6f5d69]">{en ? 'Upload current nails photo' : 'Lisa pilt praegustest küüntest'}</span>
                  </button>
                </div>

                {form.inspirationImage ? (
                  <div className="mt-3">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#eadce5] bg-white">
                      <Image
                        src={form.inspirationImage}
                        alt={en ? 'Inspiration preview' : 'Inspiratsiooni eelvaade'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                      <button
                        type="button"
                        onClick={() => inspirationInputRef.current?.click()}
                        className="text-[14px] font-semibold text-[#c24d86] underline decoration-[#c24d86]/30 underline-offset-4 transition hover:decoration-[#c24d86]"
                      >
                        {en ? 'Replace' : 'Asenda'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, inspirationImage: '' }))}
                        className="text-[14px] font-semibold text-[#d24f61] underline decoration-[#d24f61]/30 underline-offset-4 transition hover:decoration-[#d24f61]"
                      >
                        {en ? 'Remove' : 'Eemalda'}
                      </button>
                    </div>
                  </div>
                ) : (
                  inspirationUploading ? (
                    <p className="mt-2 text-[13px] font-medium text-[#7d6275]">
                      {en ? 'Uploading…' : 'Laen üles…'}
                    </p>
                  ) : null
                )}

                {formErrors.inspiration ? <p className="mt-2 text-xs text-red-500">{formErrors.inspiration}</p> : null}
              </div>
            </div>
          </form>

          {/* Trust micro block is shown directly under CTA */}

          {/* Desktop CTA (mobile uses sticky bar) */}
          <div className="hidden lg:block">
            <div className="mb-4" />
            <button
              type="button"
              onClick={() => {
                if (!canPay || isLoading) return;
                setCtaPressed(true);
                setCtaGlowOnce(true);
                window.setTimeout(() => setCtaGlowOnce(false), 1100);
                void handleSubmit();
              }}
              disabled={!canPay}
              className={`h-[56px] w-full rounded-full bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_45%,#a93d71_100%)] px-6 py-0 text-[15px] font-semibold text-white shadow-[0_12px_28px_-14px_rgba(194,77,134,0.45)] transition-all duration-200 hover:shadow-[0_16px_36px_-18px_rgba(194,77,134,0.38)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                ctaGlowOnce ? 'booking-cta-glow-once' : ''
              }`}
            >
              {isLoading ? copy.ctaLoading : copy.cta}
            </button>
            {/* Trust micro block under CTA */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f0e6ec] bg-white/80 px-3 py-2 text-[12px] font-semibold text-[#5d4a56]">
                <Star className="h-4 w-4 text-[#b85c8a]" strokeWidth={1.8} aria-hidden />
                {en ? '⭐ 4.9 rating' : '⭐ 4.9 hinnang'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f0e6ec] bg-white/80 px-3 py-2 text-[12px] font-semibold text-[#5d4a56]">
                <ShieldCheck className="h-4 w-4 text-[#6b9b7a]" strokeWidth={1.8} aria-hidden />
                {en ? '🧼 Medical level hygiene' : '🧼 Meditsiiniline hügieen'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f0e6ec] bg-white/80 px-3 py-2 text-[12px] font-semibold text-[#5d4a56]">
                <RefreshCw className="h-4 w-4 text-[#9d6b8a]" strokeWidth={1.8} aria-hidden />
                {en ? '🔁 Free rescheduling' : '🔁 Tasuta ümberbroneerimine'}
              </span>
            </div>
            <p className="mt-3 text-center text-xs font-medium text-[#9a8a94]">{copy.ctaSub}</p>
          </div>
        </div>

        {/* RIGHT: sticky booking summary + urgency/trust */}
        <aside className="hidden xl:block xl:sticky xl:top-[120px] self-start">
          <div className="rounded-[28px] border border-[#f0e8ed] bg-white/75 p-5 shadow-[0_20px_48px_-28px_rgba(57,33,52,0.14)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-[#5d4a56]">
                  <Lock className="h-4 w-4 text-[#c24d86]" strokeWidth={2} aria-hidden />
                  {en ? 'Reserved for you — expires soon' : 'Broneeritud sinu jaoks — aeg lõpeb varsti'}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#2f2530]">{selectedService.name}</p>
                <p className="mt-1 text-xs font-medium text-[#8a7a88]">
                  {dateShort} · {selectedSlot.time}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Deposit' : 'Ettemaks'}</p>
                <p className="mt-1 text-sm font-semibold text-[#c24d86]">€{DEPOSIT_EUROS}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b8a8b0]">{en ? 'Total' : 'Kokku'}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-[#c24d86]">€{totalPriceDisplay}</p>
              </div>
            </div>

            <div className="mt-4 booking-summary-float">
              <BookingSummaryPremiumCard />
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#8a7a88]">
              <Eye className="h-4 w-4 text-[#c24d86]" strokeWidth={2} aria-hidden />
              {en ? `${viewedToday} people viewed this slot today` : '3 inimest vaatas seda aega täna'}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div ref={ctaAnchorRef} className="h-px lg:hidden" aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[50] h-32 bg-[linear-gradient(180deg,transparent_0%,#fff9fb_55%,#fff5f9_100%)] lg:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-[55] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto w-full max-w-lg rounded-[22px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_48px_-20px_rgba(57,33,52,0.28)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#f0eaee] pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <Lock className="h-4 w-4 shrink-0 text-[#9d7a8f]" strokeWidth={2} aria-hidden />
              <span className="truncate text-xs font-medium text-[#6d5a66]">{lockLine}</span>
            </div>
            <span className="shrink-0 font-brand text-lg font-semibold tabular-nums text-[#2c2430]">{formatLockMmSs(remainingSec)}</span>
          </div>

          <p className="mb-1 truncate text-[13px] font-semibold text-[#2f2530]">{selectedService.name}</p>
          <p className="mb-3 truncate text-xs text-[#8a7a88]">
            {dateShort} · {selectedSlot.time}
          </p>

          <button
            type="button"
            onClick={() => {
              if (!canPay || isLoading) return;
              setCtaPressed(true);
              setCtaGlowOnce(true);
              window.setTimeout(() => setCtaGlowOnce(false), 1100);
              void handleSubmit();
            }}
            disabled={!canPay}
            className={`h-[56px] w-full rounded-full bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_45%,#a93d71_100%)] px-5 py-0 text-[15px] font-semibold text-white shadow-[0_12px_28px_-14px_rgba(194,77,134,0.45)] transition-all active:scale-[0.98] disabled:opacity-45 ${
              ctaGlowOnce ? 'booking-cta-glow-once' : ''
            }`}
          >
            {isLoading ? copy.ctaLoading : copy.cta}
          </button>
          {/* Trust micro block under CTA */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0e6ec] bg-white/80 px-3 py-2 text-[12px] font-semibold text-[#5d4a56]">
              <Star className="h-4 w-4 text-[#b85c8a]" strokeWidth={1.8} aria-hidden />
              {en ? '⭐ 4.9 rating' : '⭐ 4.9 hinnang'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0e6ec] bg-white/80 px-3 py-2 text-[12px] font-semibold text-[#5d4a56]">
              <ShieldCheck className="h-4 w-4 text-[#6b9b7a]" strokeWidth={1.8} aria-hidden />
              {en ? '🧼 Medical level hygiene' : '🧼 Meditsiiniline hügieen'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0e6ec] bg-white/80 px-3 py-2 text-[12px] font-semibold text-[#5d4a56]">
              <RefreshCw className="h-4 w-4 text-[#9d6b8a]" strokeWidth={1.8} aria-hidden />
              {en ? '🔁 Free rescheduling' : '🔁 Tasuta ümberbroneerimine'}
            </span>
          </div>
          <p className="mt-2 text-center text-[11px] text-[#a89a9f]">{copy.ctaSub}</p>
        </div>
      </div>
      <style jsx global>{`
        @keyframes bookingTrustChipFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .booking-trust-chip-anim {
          animation: bookingTrustChipFadeIn 520ms ease-out both;
        }

        @keyframes booking-cta-glow-once {
          0% {
            box-shadow:
              0 16px 36px -14px rgba(194, 77, 134, 0.55),
              0 0 0 0 rgba(194, 77, 134, 0.0);
          }
          40% {
            box-shadow:
              0 22px 52px -12px rgba(194, 77, 134, 0.58),
              0 0 0 6px rgba(194, 77, 134, 0.18);
          }
          100% {
            box-shadow:
              0 16px 36px -14px rgba(194, 77, 134, 0.55),
              0 0 0 0 rgba(194, 77, 134, 0.0);
          }
        }
        .booking-cta-glow-once {
          animation: booking-cta-glow-once 740ms ease-out both;
        }

        @keyframes booking-countdown-badge-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(194, 77, 134, 0);
            transform: translateY(0) scale(1);
          }
          50% {
            box-shadow: 0 0 0 3px rgba(194, 77, 134, 0.18);
            transform: translateY(-1px) scale(1.01);
          }
        }
        .booking-countdown-badge-pulse {
          animation: booking-countdown-badge-pulse 780ms ease-out both;
        }

        @keyframes booking-summary-shimmer {
          0% {
            opacity: 0;
            transform: translateX(-55%);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0.9;
            transform: translateX(55%);
          }
        }
        .booking-summary-shimmer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.65) 45%, transparent 100%);
          transform: translateX(-55%);
          animation: booking-summary-shimmer 900ms ease-out both;
        }

        @keyframes booking-benefit-tick-ok {
          0% {
            transform: scale(0.7);
            opacity: 0.6;
          }
          45% {
            transform: scale(1.15);
            opacity: 1;
          }
          100% {
            transform: scale(1);
          }
        }
        .booking-benefit-tick-ok {
          animation: booking-benefit-tick-ok 540ms cubic-bezier(0.22, 0.8, 0.22, 1) both;
        }

        @keyframes bookingSummaryFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }
        .booking-summary-float {
          animation: bookingSummaryFloat 2600ms ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .booking-summary-float,
          .booking-cta-glow-once,
          .booking-countdown-badge-pulse,
          .booking-summary-shimmer,
          .booking-benefit-tick-ok,
          .booking-trust-chip-anim {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ConfirmStep;
