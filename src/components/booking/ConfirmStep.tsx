'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useBookingStore } from '@/store/booking-store';
import type { ContactInfo } from '@/store/booking-types';
import { useTranslation } from '@/lib/i18n';
import { Lock, Camera } from 'lucide-react';
import { trackEvent, touchBookingActivity } from '@/lib/analytics-client';
import { trackEvent as trackFunnelEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';
import { getPotentialBundleSavings, recommendCrossSellProduct, type CareProductLite } from '@/lib/care-funnel';

const LOCK_STORAGE_KEY = 'booking_slot_lock';
const LOCK_DURATION_MS = 15 * 60 * 1000;

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

  const selectedService = useBookingStore((s) => s.selectedService);
  const selectedVariant = useBookingStore((s) => s.selectedVariant);
  const selectedSlot = useBookingStore((s) => s.selectedSlot);
  const selectedAddOns = useBookingStore((s) => s.selectedAddOns);
  const selectedProducts = useBookingStore((s) => s.selectedProducts);
  const contactInfo = useBookingStore((s) => s.contactInfo);
  const setContactInfo = useBookingStore((s) => s.setContactInfo);
  const totalPrice = useBookingStore((s) => s.totalPrice);
  const totalDuration = useBookingStore((s) => s.totalDuration);
  const pricingSummary = useBookingStore((s) => s.pricing);
  const removeProductFromBooking = useBookingStore((s) => s.removeProductFromBooking);
  const addProductToBooking = useBookingStore((s) => s.addProductToBooking);
  const setProductDeliveryMethod = useBookingStore((s) => s.setProductDeliveryMethod);
  const selectSlot = useBookingStore((s) => s.selectSlot);
  const setStep = useBookingStore((s) => s.setStep);
  const setStatus = useBookingStore((s) => s.setStatus);
  const calculateTotals = useBookingStore((s) => s.calculateTotals);

  const selectedExtras = selectedAddOns.filter((a) => a.selected);
  const en = language === 'en';

  const productsTotalPrice = pricingSummary.productsTotal;
  const payLaterTotal = pricingSummary.payLaterTotal;
  const payNowTotal = pricingSummary.payNowTotal;
  const depositAmount = pricingSummary.depositAmount;
  const selectedProductCount = selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
  const potentialBundleSavings = getPotentialBundleSavings(selectedProductCount);

  const copy = useMemo(
    () => ({
      timerText: en
        ? 'This time is reserved for you'
        : 'See aeg on sulle ajutiselt reserveeritud',
      timerSub: en
        ? `Complete your booking within ${formatLockMmSs(remainingSec)}`
        : `Lõpeta broneering ${formatLockMmSs(remainingSec)} jooksul`,
      formTitle: en ? 'Your details' : 'Sinu andmed',
      firstName: en ? 'First name' : 'Eesnimi',
      phone: en ? 'Phone' : 'Telefon',
      email: en ? 'Email (optional)' : 'E-post (valikuline)',
      notes: en ? 'Quick note (optional)' : 'Kiire märkus (valikuline)',
      uploadLabel: en ? 'Add inspiration photo' : 'Lisa inspiratsioonipilt',
      uploadHint: en ? 'Optional' : 'Valikuline',
      trustChip1: en ? 'Free rescheduling' : 'Tasuta ümberbroneerimine',
      trustChip2: en ? 'Instant confirmation' : 'Kohe kinnitatud aeg',
      trustChip3: en ? 'Certified technician' : 'Sertifitseeritud tehnik',
      hybridCart: en ? 'Booking + care cart' : 'Broneering + hoolduskorv',
      deliveryTitle: en ? 'Delivery method' : 'Tarneviis',
      pickup: en ? 'Pick up during visit' : 'Võtan visiidil kaasa',
      home: en ? 'Deliver home' : 'Saada koju',
      commitTitle: en ? 'Confirm your time' : 'Kinnita oma aeg',
      payNowLabel: en ? 'Pay today' : 'Täna maksad',
      remainingLabel: en
        ? `Remaining €${payLaterTotal} at salon after service`
        : `Ülejäänud €${payLaterTotal} salongis pärast teenust`,
      cta: en ? `Confirm time & pay €${payNowTotal}` : `Kinnita aeg ja maksa €${payNowTotal}`,
      ctaLoading: en ? 'Securing your appointment…' : 'Broneerime sinu aega…',
      ctaSub: en ? 'Secure payment via Stripe' : 'Turvaline makse läbi Stripe',
      toastExpired: en ? 'This time is no longer reserved' : 'See aeg pole enam broneeritud',
    }),
    [en, payNowTotal, payLaterTotal, remainingSec]
  );

  const phoneRegex = /^\+\d[\d\s-]{5,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [form, setForm] = useState(() => ({
    firstName: contactInfo?.firstName ?? '',
    phone: contactInfo?.phone ?? '',
    email: contactInfo?.email ?? '',
    notes: contactInfo?.notes ?? '',
    inspirationImage: contactInfo?.inspirationImage ?? '',
    currentNailImage: contactInfo?.currentNailImage ?? '',
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
      currentNailImage: contactInfo.currentNailImage ?? '',
    });
    setFormErrors({});
    setTouched({});
  }, [contactInfo]);

  useEffect(() => {
    trackBehaviorEvent('booking_payment_view', {
      serviceId: selectedService?.id,
      slotId: selectedSlot?.id,
      depositAmount,
    });
  }, [depositAmount, selectedService?.id, selectedSlot?.id]);

  useEffect(() => {
    if (!selectedSlot) { setLockReady(false); return; }
    setLockReady(false);
    expiryFiredRef.current = false;
    const now = Date.now();
    let expires = now + LOCK_DURATION_MS;
    try {
      const raw = localStorage.getItem(LOCK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { slotId?: string; expiresAt?: number };
        if (parsed.slotId === selectedSlot.id && typeof parsed.expiresAt === 'number') expires = parsed.expiresAt;
      }
    } catch { /* ignore */ }
    expiresAtRef.current = expires;
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify({ slotId: selectedSlot.id, expiresAt: expires }));
    setRemainingSec(Math.max(0, Math.ceil((expires - now) / 1000)));
    setLockReady(true);
    const id = window.setInterval(() => {
      setRemainingSec(Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [selectedSlot]);

  useEffect(() => {
    const id = window.setInterval(() => setLockPulse((p) => !p), 3000);
    return () => window.clearInterval(id);
  }, []);

  const onLockExpired = useCallback(() => {
    if (expiryFiredRef.current || !selectedSlot) return;
    expiryFiredRef.current = true;
    try { localStorage.removeItem(LOCK_STORAGE_KEY); } catch { /* ignore */ }
    setToast(copy.toastExpired);
    selectSlot(null);
    setStep(2);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('booking_shake_slots', '1');
    window.setTimeout(() => setToast(null), 5000);
    window.requestAnimationFrame(() => {
      document.getElementById('booking-datetime-slot-area')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [copy.toastExpired, selectSlot, setStep, selectedSlot]);

  useEffect(() => {
    if (!lockReady || remainingSec > 0 || !selectedSlot || expiryFiredRef.current) return;
    onLockExpired();
  }, [remainingSec, selectedSlot, lockReady, onLockExpired]);

  const pricingRetryRef = useRef(false);

  const handleConfirm = async (payloadContact: ContactInfo): Promise<boolean> => {
    if (!selectedService || !selectedSlot) return false;
    setIsLoading(true);
    setStatus('confirming');
    touchBookingActivity();
    trackBehaviorEvent('payment_started', { paymentMethod: 'stripe' });
    trackEvent({ eventType: 'booking_payment_start', step: 5, serviceId: selectedService.id, slotId: selectedSlot.id });
    trackFunnelEvent({ event: 'payment_started', serviceId: selectedService.id, slotId: selectedSlot.id, metadata: { totalPrice, totalDuration, source: 'booking_confirm_step' }, language });

    const effectiveName = (selectedVariant?.name || selectedVariant?.nameEt) ?? selectedService.name;
    const effectivePrice = typeof selectedVariant?.price === 'number' ? selectedVariant.price : selectedService.price;
    const effectiveDuration = typeof selectedVariant?.duration === 'number' ? selectedVariant.duration : selectedService.duration;
    const checkoutService = { ...selectedService, name: effectiveName, price: effectivePrice, duration: effectiveDuration, ...(selectedVariant && { variantId: selectedVariant.id }) };

    try {
      const response = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'guided', service: checkoutService, slot: selectedSlot, contact: payloadContact, addOns: selectedExtras, totalPrice, totalDuration, products: selectedProducts, productsTotalPrice, pricingSnapshot: pricingSummary, locale: language }),
      });
      const data = (await response.json()) as { checkoutUrl?: string; error?: string; code?: string };
      if (!response.ok) {
        const serverMsg = data.error || 'Booking checkout failed';
        const code = data.code;
        console.error('Checkout API error:', response.status, code, serverMsg);
        if (code === 'slot_unavailable' || code === 'slot_conflict') {
          setToast(en ? 'This time slot is no longer available.' : 'See aeg pole enam saadaval.');
          selectSlot(null); setStep(2); setIsLoading(false); return false;
        }
        if (code === 'pricing_mismatch') {
          if (!pricingRetryRef.current) {
            pricingRetryRef.current = true; calculateTotals(); setIsLoading(false);
            await new Promise((r) => setTimeout(r, 100));
            return handleConfirm(payloadContact);
          }
          pricingRetryRef.current = false;
          setToast(en ? 'Pricing has changed — please review.' : 'Hind on muutunud — palun vaata üle.');
          setIsLoading(false); return false;
        }
        throw new Error(serverMsg);
      }
      pricingRetryRef.current = false;
      if (!data.checkoutUrl) throw new Error('Missing Stripe checkout URL');
      try { localStorage.removeItem(LOCK_STORAGE_KEY); } catch { /* ignore */ }
      window.location.href = data.checkoutUrl;
      return true;
    } catch (error) {
      console.error('Confirm booking error:', error);
      const reason = error instanceof Error ? error.message : 'checkout_failed';
      setStatus('error'); setToast(reason);
      trackBehaviorEvent('payment_failed', { reason });
      trackEvent({ eventType: 'booking_payment_fail', step: 5, serviceId: selectedService?.id, slotId: selectedSlot?.id });
      setIsLoading(false); return false;
    }
  };

  const firstNameValid = form.firstName.trim().length > 0;
  const phoneValid = phoneRegex.test(form.phone.trim());
  const emailInput = form.email.trim();
  const emailValid = !emailInput || emailRegex.test(emailInput);
  const phonePrefix = '+372';
  const phoneRest = form.phone.trim().startsWith(phonePrefix) ? form.phone.trim().slice(phonePrefix.length).trim() : form.phone.trim();
  const canPay = firstNameValid && phoneValid && emailValid && remainingSec > 0 && lockReady && !isLoading;

  const [ctaGlow, setCtaGlow] = useState(false);
  const [inspirationUploading, setInspirationUploading] = useState(false);
  const [currentNailsUploading, setCurrentNailsUploading] = useState(false);
  const [suggestedCare, setSuggestedCare] = useState<CareProductLite | null>(null);
  const ctaAnchorRef = useRef<HTMLDivElement>(null);
  const didAutoScrollRef = useRef(false);
  const inspirationInputRef = useRef<HTMLInputElement>(null);
  const currentNailsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !canPay || didAutoScrollRef.current) return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    didAutoScrollRef.current = true;
    requestAnimationFrame(() => ctaAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }, [canPay]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const response = await fetch(`/api/products?lang=${language}`, { cache: 'force-cache' });
        if (!response.ok) return;
        const data = (await response.json()) as { products?: CareProductLite[] };
        const all = data.products ?? [];
        if (!all.length) return;
        const pick = recommendCrossSellProduct(all, selectedService, selectedProducts.map((p) => p.productId));
        if (mounted) setSuggestedCare(pick);
      } catch {
        // best-effort bridge
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [language, selectedProducts, selectedService]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t('contact.required');
    if (!form.phone.trim()) errs.phone = t('contact.required');
    else if (!phoneValid) errs.phone = t('contact.validPhone');
    if (emailInput && !emailValid) errs.email = t('contact.validEmail');
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageUpload = async (kind: 'inspiration' | 'current', files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 3 * 1024 * 1024) { setFormErrors((p) => ({ ...p, inspiration: en ? 'Max 3 MB.' : 'Max 3 MB.' })); return; }
    if (kind === 'inspiration') setInspirationUploading(true);
    else setCurrentNailsUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((p) => ({ ...p, ...(kind === 'inspiration' ? { inspirationImage: dataUrl } : { currentNailImage: dataUrl }) }));
      setFormErrors((p) => ({ ...p, inspiration: '' }));
    } catch { setFormErrors((p) => ({ ...p, inspiration: en ? 'Upload failed.' : 'Laadimine ebaõnnestus.' })); }
    finally {
      if (kind === 'inspiration') {
        setInspirationUploading(false);
        if (inspirationInputRef.current) inspirationInputRef.current.value = '';
      } else {
        setCurrentNailsUploading(false);
        if (currentNailsInputRef.current) currentNailsInputRef.current.value = '';
      }
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

  const dateLong = new Date(selectedSlot.date).toLocaleDateString(en ? 'en-GB' : 'et-EE', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateShort = new Date(selectedSlot.date).toLocaleDateString(en ? 'en-GB' : 'et-EE', { day: 'numeric', month: 'short' });
  const effectiveDurationForDisplay = typeof selectedVariant?.duration === 'number' ? selectedVariant.duration : selectedService.duration;
  const durationMin = totalDuration || effectiveDurationForDisplay || 0;
  const effectiveServiceName = (selectedVariant?.name || selectedVariant?.nameEt) ?? selectedService.name;

  const handleSubmit = async () => {
    setTouched({ firstName: true, phone: true, email: true, notes: true, inspiration: true });
    if (!validateForm()) { setCtaGlow(false); return; }
    if (!selectedService || !selectedSlot) return;
    const payloadContact: ContactInfo = {
      firstName: form.firstName.trim(),
      phone: form.phone.trim(),
      email: emailInput || undefined,
      notes: form.notes.trim() || undefined,
      inspirationImage: form.inspirationImage || undefined,
      currentNailImage: form.currentNailImage || undefined,
    };
    setContactInfo(payloadContact);
    const ok = await handleConfirm(payloadContact);
    if (!ok) setCtaGlow(false);
  };

  const fireCta = () => {
    if (!canPay || isLoading) return;
    setCtaGlow(true);
    window.setTimeout(() => setCtaGlow(false), 1100);
    void handleSubmit();
  };

  const inputCls = (hasError: boolean) =>
    `h-[48px] w-full rounded-[14px] border bg-white px-4 text-[14px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] outline-none transition-all ${
      hasError
        ? 'border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
        : 'border-[#e8e8e8] focus:border-[#c24d86]/40 focus:shadow-[0_0_0_3px_rgba(159,69,111,0.08)]'
    }`;

  /* ─── Payment Commitment Card (shared between desktop sidebar + mobile) ─── */
  const PaymentCard = ({ mobile }: { mobile?: boolean }) => (
    <div className={mobile ? '' : 'rounded-[18px] border border-[#f0f0f0] bg-[#fafafa] p-5'}>
      {!mobile && (
        <p className="mb-4 text-[13px] font-semibold text-[#241b23]">{copy.commitTitle}</p>
      )}

      {/* Price hero */}
      <div className={`${mobile ? '' : 'rounded-xl bg-[#fff9fc] px-4 py-3'}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a898a8]">{copy.payNowLabel}</p>
        <p className="mt-0.5 text-[28px] font-bold tabular-nums leading-none text-[#9f456f]">{`€${payNowTotal}`}</p>
      </div>
      <p className={`${mobile ? 'mt-1' : 'mt-3'} text-[12px] text-[#8a7a85]`}>{copy.remainingLabel}</p>

      {/* Benefits */}
      {!mobile && (
        <div className="mt-4 space-y-2">
          {[copy.trustChip1, copy.trustChip2, copy.trustChip3].map((label) => (
            <div key={label} className="flex items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#f4edf1]">
                <svg className="h-2.5 w-2.5 text-[#9f456f]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </span>
              <span className="text-[12px] text-[#5d5258]">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={fireCta}
        disabled={!canPay}
        className={`${mobile ? 'mt-2.5' : 'mt-5'} flex h-[56px] w-full items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] text-[15px] font-semibold text-white shadow-[0_14px_32px_-14px_rgba(159,69,111,0.5)] transition-all duration-200 hover:shadow-[0_18px_42px_-16px_rgba(159,69,111,0.42)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
          ctaGlow ? 'confirm-cta-glow' : ''
        }`}
      >
        {isLoading ? copy.ctaLoading : copy.cta}
      </button>
      <p className={`${mobile ? 'mt-1' : 'mt-2'} text-center text-[10px] text-[#b8a8b0]`}>{copy.ctaSub}</p>
    </div>
  );

  return (
    <div className="animate-fade-in mx-auto w-full pb-52 lg:pb-8 text-[#1a1a1a]">
      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-20 z-[60] max-w-sm -translate-x-1/2 rounded-[16px] border border-[#efefef] bg-white px-5 py-3 text-center text-sm font-medium text-[#444] shadow-[0_12px_36px_-16px_rgba(0,0,0,0.10)]" role="status">
          {toast}
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ede5ea] border-t-[#9f456f]" />
          <p className="mt-4 text-[14px] font-medium text-[#5d4a56]">{copy.ctaLoading}</p>
          <p className="mt-1 text-[12px] text-[#a898a8]">{copy.ctaSub}</p>
        </div>
      )}

      {/* ─── Timer Strip ─── */}
      <div
        className={`sticky top-[72px] z-20 mb-5 flex items-center gap-3 rounded-[16px] border border-[#f0e0e8] bg-[#FFF5F9] px-4 py-3 ${
          lockPulse ? 'confirm-lock-pulse' : ''
        }`}
      >
        <Lock className="h-4 w-4 shrink-0 text-[#c88cab]" strokeWidth={1.8} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#6a3b57]">{copy.timerText}</p>
          <p className="mt-0.5 text-[11px] text-[#8a7a85]">{copy.timerSub}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[18px] font-bold tabular-nums text-[#9f456f] shadow-[0_2px_8px_-4px_rgba(159,69,111,0.12)]">
          {formatLockMmSs(remainingSec)}
        </span>
      </div>

      {/* ─── 2-Column Desktop / Single Column Mobile ─── */}
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
        {/* LEFT COLUMN */}
        <div className="min-w-0">
          {/* Summary Card */}
          <div className="mb-4 rounded-[18px] border border-[#f0f0f0] bg-[#fafafa] p-5 sm:p-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#a898a8]">{copy.hybridCart}</p>
            <h3 className="mt-2 text-[17px] font-semibold text-[#241b23]">{effectiveServiceName}</h3>
            <div className="mt-2 space-y-1 text-[13px] text-[#5d5258]">
              <p>{dateLong} · {selectedSlot.time}</p>
              {durationMin > 0 && <p>{durationMin} min</p>}
              <p>Sandra · Mustamäe tee 55, Tallinn</p>
            </div>

            <div className="mt-4 space-y-1.5 border-t border-[#f2eaed] pt-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#7a6a75]">{en ? 'Service price' : 'Teenuse hind'}</span>
                <span className="font-semibold tabular-nums text-[#2f2530]">{`€${totalPrice}`}</span>
              </div>
              {productsTotalPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#7a6a75]">{en ? 'Products' : 'Tooted'}</span>
                  <span className="font-semibold tabular-nums text-[#2f2530]">{`€${productsTotalPrice}`}</span>
                </div>
              )}
              <div className="flex justify-between rounded-lg bg-[#fff9fc] px-2.5 py-1.5">
                <span className="font-semibold text-[#6a3b57]">{en ? 'Pay today' : 'Ette maksta täna'}</span>
                <span className="font-bold tabular-nums text-[#9f456f]">{`€${payNowTotal}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a7a85]">{en ? 'Remaining at salon' : 'Ülejäänud salongis'}</span>
                <span className="font-medium tabular-nums text-[#8a7a85]">{`€${payLaterTotal}`}</span>
              </div>
            </div>

            {potentialBundleSavings > 0 && (
              <div className="mt-2 rounded-lg border border-[#ead9e3] bg-[#fff9fc] px-3 py-2 text-[11px] text-[#7a4563]">
                {en
                  ? `Bundle insight: add this as a care set and save up to €${potentialBundleSavings}.`
                  : `Komplekti soovitus: hoolduskomplektina saad säästa kuni €${potentialBundleSavings}.`}
              </div>
            )}

            {selectedProducts.length > 0 && (
              <div className="mt-3 border-t border-[#f2eaed] pt-3">
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#a898a8]">{en ? 'Products' : 'Tooted'}</p>
                {selectedProducts.map((p) => (
                  <div key={p.productId} className="py-1.5 text-[12px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[#2f2530]">{p.name}{p.quantity > 1 ? ` ×${p.quantity}` : ''}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-semibold tabular-nums text-[#9f456f]">{`€${p.unitPrice * p.quantity}`}</span>
                        <button type="button" onClick={() => removeProductFromBooking(p.productId)} className="text-[10px] font-medium text-[#b85c8a] underline underline-offset-2">{en ? 'Remove' : 'Eemalda'}</button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] text-[#8a7a85]">{copy.deliveryTitle}:</span>
                      <button
                        type="button"
                        onClick={() => setProductDeliveryMethod(p.productId, 'pickup_visit')}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                          (p.deliveryMethod ?? 'pickup_visit') === 'pickup_visit'
                            ? 'bg-[#f3e8ef] text-[#7a4563]'
                            : 'bg-[#f5f5f5] text-[#8a7a85]'
                        }`}
                      >
                        {copy.pickup}
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductDeliveryMethod(p.productId, 'home_delivery')}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                          p.deliveryMethod === 'home_delivery'
                            ? 'bg-[#f3e8ef] text-[#7a4563]'
                            : 'bg-[#f5f5f5] text-[#8a7a85]'
                        }`}
                      >
                        {copy.home}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {suggestedCare && (
              <div className="mt-3 rounded-[12px] border border-[#efe3e9] bg-[#fffafd] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9d7a90]">
                  {en ? 'Clients often add this' : 'Kliendid lisavad sageli'}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8a7a85]">
                  {en ? 'Supports longer-lasting appointment results.' : 'Aitab tulemust kauem püsivana hoida.'}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#f0e8ec] bg-white">
                    {suggestedCare.imageUrl ? (
                      <Image src={suggestedCare.imageUrl} alt={suggestedCare.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#b8a8b0]">+</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#2f2530]">{suggestedCare.name}</p>
                    <p className="text-[11px] text-[#7a6a75]">€{suggestedCare.price}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      addProductToBooking({
                        productId: suggestedCare.id,
                        name: suggestedCare.name,
                        unitPrice: suggestedCare.price,
                        deliveryMethod: 'pickup_visit',
                        imageUrl: suggestedCare.imageUrl ?? null,
                      })
                    }
                    className="rounded-full border border-[#dfcdd7] px-3 py-1 text-[11px] font-semibold text-[#6a3b57] hover:bg-white"
                  >
                    {en ? 'Add' : 'Lisa'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Details Form */}
          <form
            className="rounded-[18px] border border-[#f0f0f0] bg-white p-5 sm:p-6"
            onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
          >
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#a898a8]">{copy.formTitle}</p>

            {/* Name + Phone row */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12px] font-medium text-[#3a2a35]">{copy.firstName} <span className="text-[#c24d86]">*</span></span>
                <input
                  type="text" name="firstName" value={form.firstName}
                  onChange={(e) => { setForm((p) => ({ ...p, firstName: e.target.value })); setFormErrors((p) => ({ ...p, firstName: '' })); }}
                  onBlur={() => setTouched((p) => ({ ...p, firstName: true }))}
                  className={`mt-1 ${inputCls(Boolean(touched.firstName && !firstNameValid))}`}
                  placeholder={en ? 'First name' : 'Eesnimi'}
                  aria-invalid={Boolean(formErrors.firstName)}
                />
                {touched.firstName && formErrors.firstName && <p className="mt-0.5 text-[10px] text-red-500">{formErrors.firstName}</p>}
              </label>

              <label className="block">
                <span className="text-[12px] font-medium text-[#3a2a35]">{copy.phone} <span className="text-[#c24d86]">*</span></span>
                <div className={`mt-1 flex h-[48px] items-center gap-1.5 rounded-[14px] border bg-white px-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] transition-all ${
                  touched.phone && !phoneValid
                    ? 'border-red-300 focus-within:border-red-400 focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                    : 'border-[#e8e8e8] focus-within:border-[#c24d86]/40 focus-within:shadow-[0_0_0_3px_rgba(159,69,111,0.08)]'
                }`}>
                  <span className="text-[14px] font-semibold text-[#3a2a35]">{phonePrefix}</span>
                  <input
                    type="tel" name="phone" value={phoneRest}
                    onChange={(e) => { const v = e.target.value.trim(); setForm((p) => ({ ...p, phone: v ? `${phonePrefix} ${v}` : '' })); setFormErrors((p) => ({ ...p, phone: '' })); }}
                    onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                    className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#b8a8b0]"
                    placeholder="5xx xxxx" inputMode="tel" aria-invalid={Boolean(formErrors.phone)}
                  />
                </div>
                {touched.phone && formErrors.phone && <p className="mt-0.5 text-[10px] text-red-500">{formErrors.phone}</p>}
              </label>
            </div>

            {/* Email */}
            <label className="mt-3 block">
              <span className="text-[12px] font-medium text-[#7a6a75]">{copy.email}</span>
              <input
                type="email" name="email" value={form.email}
                onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setFormErrors((p) => ({ ...p, email: '' })); }}
                onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                className={`mt-1 ${inputCls(Boolean(touched.email && emailInput && !emailValid))}`}
                placeholder={en ? 'name@email.com' : 'nimi@email.com'}
                aria-invalid={Boolean(formErrors.email)}
              />
              {touched.email && formErrors.email && <p className="mt-0.5 text-[10px] text-red-500">{formErrors.email}</p>}
            </label>

            {/* Notes */}
            <label className="mt-3 block">
              <span className="text-[11px] font-medium text-[#8a7a85]">{copy.notes}</span>
                <textarea
                name="notes" value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1 min-h-[52px] w-full resize-none rounded-[14px] border border-[#e8e8e8] bg-white px-4 py-3 text-[14px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] outline-none transition-all focus:border-[#c24d86]/40 focus:shadow-[0_0_0_3px_rgba(159,69,111,0.08)]"
                placeholder={en ? 'E.g. nail shape preference...' : 'Nt. küünekuju eelistus...'}
              />
            </label>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {/* Inspiration */}
              <div className="rounded-[14px] border border-[#efeaed] bg-[#fcfbfc] p-3">
                <p className="mb-1 text-[11px] font-medium text-[#8a7a85]">{copy.uploadLabel} ({copy.uploadHint})</p>
                <p className="mb-2 text-[11px] text-[#a898a8]">{en ? 'Inspiration for desired style' : 'Inspiratsioon soovitud stiilist'}</p>
                <input ref={inspirationInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleImageUpload('inspiration', e.target.files)} />
                {form.inspirationImage ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-xl border border-[#f0e8ec]">
                      <Image src={form.inspirationImage} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <div>
                      <button type="button" onClick={() => inspirationInputRef.current?.click()} className="text-[11px] font-medium text-[#9f456f] underline underline-offset-2">{en ? 'Replace' : 'Asenda'}</button>
                      <span className="mx-1.5 text-[#d0c4ca]">·</span>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, inspirationImage: '' }))} className="text-[11px] font-medium text-[#b85c6a] underline underline-offset-2">{en ? 'Remove' : 'Eemalda'}</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button" onClick={() => inspirationInputRef.current?.click()} disabled={inspirationUploading}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#e0e0e0] bg-white text-[12px] font-medium text-[#888] transition hover:border-[#c8a8bc] hover:text-[#9f456f]"
                  >
                    <Camera className="h-4 w-4" strokeWidth={1.5} />
                    {inspirationUploading ? (en ? 'Uploading…' : 'Laen…') : copy.uploadLabel}
                  </button>
                )}
              </div>

              {/* Current nails photo */}
              <div className="rounded-[14px] border border-[#efeaed] bg-[#fcfbfc] p-3">
                <p className="mb-1 text-[11px] font-medium text-[#8a7a85]">{en ? 'Add photo of your current nails (optional)' : 'Lisa foto oma küüntest (valikuline)'}</p>
                <p className="mb-2 text-[11px] text-[#a898a8]">{en ? 'Helps your technician prepare better' : 'Aitab tehnikul paremini ette valmistuda'}</p>
                <input ref={currentNailsInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleImageUpload('current', e.target.files)} />
                {form.currentNailImage ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-xl border border-[#f0e8ec]">
                      <Image src={form.currentNailImage} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <div>
                      <button type="button" onClick={() => currentNailsInputRef.current?.click()} className="text-[11px] font-medium text-[#9f456f] underline underline-offset-2">{en ? 'Replace' : 'Asenda'}</button>
                      <span className="mx-1.5 text-[#d0c4ca]">·</span>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, currentNailImage: '' }))} className="text-[11px] font-medium text-[#b85c6a] underline underline-offset-2">{en ? 'Remove' : 'Eemalda'}</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button" onClick={() => currentNailsInputRef.current?.click()} disabled={currentNailsUploading}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#e0e0e0] bg-white text-[12px] font-medium text-[#888] transition hover:border-[#c8a8bc] hover:text-[#9f456f]"
                  >
                    <Camera className="h-4 w-4" strokeWidth={1.5} />
                    {currentNailsUploading ? (en ? 'Uploading…' : 'Laen…') : (en ? 'Add photo of current nails' : 'Lisa foto oma küüntest')}
                  </button>
                )}
              </div>
            </div>
            {formErrors.inspiration && <p className="mt-0.5 text-[10px] text-red-500">{formErrors.inspiration}</p>}
          </form>
        </div>

        {/* RIGHT COLUMN — Desktop Sticky Payment Card */}
        <aside className="hidden lg:sticky lg:top-[88px] lg:block">
          <PaymentCard />
        </aside>
      </div>

      {/* ─── Mobile Sticky CTA ─── */}
      <div ref={ctaAnchorRef} id="confirm-step-cta-anchor" className="h-px" aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[50] h-32 bg-[linear-gradient(180deg,transparent_0%,rgba(248,247,246,0.95)_55%,#f8f7f6_100%)] lg:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-[55] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 lg:hidden">
        <div className="mx-auto w-full max-w-md rounded-[16px] border border-[#efefef] bg-white p-3 shadow-[0_12px_36px_-16px_rgba(0,0,0,0.10)]">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#2f2530]">{effectiveServiceName}</p>
              <p className="truncate text-[11px] text-[#8a7a85]">{dateShort} · {selectedSlot.time}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a898a8]">{copy.payNowLabel}</p>
              <p className="text-[18px] font-bold tabular-nums leading-none text-[#9f456f]">{`€${payNowTotal}`}</p>
            </div>
          </div>
          <PaymentCard mobile />
        </div>
      </div>

      <style jsx global>{`
        @keyframes confirm-lock-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(194,77,134,0); }
          50% { box-shadow: 0 0 0 4px rgba(194,77,134,0.06); }
        }
        .confirm-lock-pulse { animation: confirm-lock-pulse 780ms ease-out both; }
        @keyframes confirm-cta-glow {
          0% { box-shadow: 0 14px 32px -14px rgba(159,69,111,0.5), 0 0 0 0 rgba(194,77,134,0); }
          40% { box-shadow: 0 22px 52px -12px rgba(159,69,111,0.5), 0 0 0 6px rgba(194,77,134,0.14); }
          100% { box-shadow: 0 14px 32px -14px rgba(159,69,111,0.5), 0 0 0 0 rgba(194,77,134,0); }
        }
        .confirm-cta-glow { animation: confirm-cta-glow 740ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .confirm-lock-pulse, .confirm-cta-glow { animation: none !important; } }
      `}</style>
    </div>
  );
}

export default ConfirmStep;
