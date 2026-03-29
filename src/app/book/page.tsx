'use client';

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { ServiceStep } from '@/components/booking/ServiceStep';
import { DateTimeStep } from '@/components/booking/DateTimeStep';
import { ExtrasStep } from '@/components/booking/ExtrasStep';
import { ConfirmStep } from '@/components/booking/ConfirmStep';
import { useServices } from '@/hooks/use-services';
import { useBookingAddOns } from '@/hooks/use-booking-addons';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';
import {
  clearBookingSession,
  getLastFunnelStep,
  hasBookingSuccess,
  setLastFunnelStep,
  touchBookingActivity,
  trackEvent,
  trackSessionStart,
} from '@/lib/analytics-client';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';
import { consumeBookingProductIntent } from '@/lib/booking-product-intent';

const nailStyles = [
  { id: '1', name: 'Glossy Pink French', slug: 'glossy-pink-french', recommendedServiceId: 'gel-manicure', emoji: 'P' },
  { id: '2', name: 'Matte Nude', slug: 'matte-nude', recommendedServiceId: 'gel-manicure', emoji: 'N' },
  { id: '3', name: 'Chrome Silver', slug: 'chrome-silver', recommendedServiceId: 'nail-art', emoji: 'C' },
  { id: '4', name: 'Ombre Sunset', slug: 'ombre-sunset', recommendedServiceId: 'gel-manicure', emoji: 'O' },
  { id: '5', name: 'Ruby Red', slug: 'ruby-red', recommendedServiceId: 'gel-manicure', emoji: 'R' },
  { id: '6', name: 'Pearl White', slug: 'pearl-white', recommendedServiceId: 'luxury-spa-manicure', emoji: 'W' },
];

function funnelStepFromBookingStep(step: number): 1 | 2 | 3 {
  if (step <= 1) return 1;
  if (step === 2) return 2;
  return 3;
}

function BookingContent() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStep = useBookingStore((s) => s.currentStep);
  const prevStep = useBookingStore((s) => s.prevStep);
  const setMode = useBookingStore((s) => s.setMode);
  const selectedService = useBookingStore((s) => s.selectedService);
  const selectedVariant = useBookingStore((s) => s.selectedVariant);
  const selectedAddOns = useBookingStore((s) => s.selectedAddOns);
  const selectedProducts = useBookingStore((s) => s.selectedProducts);
  const selectedSlot = useBookingStore((s) => s.selectedSlot);
  const addProductToBooking = useBookingStore((s) => s.addProductToBooking);
  const setSelectedStyle = useBookingStore((s) => s.setSelectedStyle);
  const selectService = useBookingStore((s) => s.selectService);
  const selectDate = useBookingStore((s) => s.selectDate);
  const setStep = useBookingStore((s) => s.setStep);
  const nextStep = useBookingStore((s) => s.nextStep);
  const totalPrice = useBookingStore((s) => s.totalPrice);
  const { services } = useServices();
  const { loading: addOnsLoading } = useBookingAddOns(selectedService?.id ?? null);

  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const activeTimelineRef = useRef<HTMLButtonElement | null>(null);
  const activePanelRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const transitionsEnabled = true;
  const abandonSentRef = useRef(false);
  const inactivityTimerRef = useRef<number | null>(null);
  const INACTIVITY_MS = 90_000;
  const stepStartedAtRef = useRef<number>(Date.now());
  const hesitationSentForStepRef = useRef<number | null>(null);
  const hesitationTimerRef = useRef<number | null>(null);

  const en = language === 'en';

  const copy = useMemo(
    () =>
      en
        ? { funnel1: 'Service', funnel2: 'Time', funnel3: 'Confirm', progressTitle: 'Your booking' }
        : { funnel1: 'Teenus', funnel2: 'Aeg', funnel3: 'Kinnitus', progressTitle: 'Sinu broneering' },
    [en]
  );

  /* ─── All booking logic hooks (unchanged) ─── */

  useEffect(() => {
    const styleSlug = searchParams.get('style');
    const serviceId = searchParams.get('service');
    const dateParam = searchParams.get('date');
    if (serviceId) {
      const directService = services.find((svc) => svc.id === serviceId);
      if (directService) {
        selectService(directService);
        setStep(2);
        if (dateParam) { const p = new Date(`${dateParam}T00:00:00`); if (!Number.isNaN(p.getTime())) selectDate(p); }
      }
    }
    if (styleSlug) {
      const style = nailStyles.find((item) => item.slug === styleSlug);
      if (style) {
        setSelectedStyle(style);
        const rec = services.find((svc) => svc.id === style.recommendedServiceId);
        if (rec && !selectedService) {
          selectService(rec);
          setTimeout(() => { nextStep(); serviceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250);
        }
      }
    }
  }, [searchParams, setSelectedStyle, selectService, selectedService, nextStep, services, selectDate, setStep]);

  useEffect(() => {
    const pp = consumeBookingProductIntent();
    if (!pp) return;
    if (selectedProducts.some((item) => item.productId === pp.productId)) return;
    addProductToBooking(pp);
  }, [addProductToBooking, selectedProducts]);

  useEffect(() => {
    trackSessionStart({ locale: language, path: typeof window !== 'undefined' ? window.location.pathname : '/book', referrer: typeof document !== 'undefined' ? document.referrer : '' });
    trackEvent({ eventType: 'booking_open', step: 0 });
    touchBookingActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    touchBookingActivity();
    setLastFunnelStep(currentStep);
    stepStartedAtRef.current = Date.now();
    hesitationSentForStepRef.current = null;
    if (currentStep === 1) return;
    if (currentStep === 4) trackEvent({ eventType: 'booking_details_started', step: 4, serviceId: selectedService?.id, slotId: selectedSlot?.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const resetInactivity = () => {
      touchBookingActivity();
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      if (hesitationTimerRef.current) window.clearTimeout(hesitationTimerRef.current);
      hesitationTimerRef.current = window.setTimeout(() => {
        if (hasBookingSuccess() || hesitationSentForStepRef.current === currentStep) return;
        hesitationSentForStepRef.current = currentStep;
        trackBehaviorEvent('hesitation_detected', { step: currentStep, duration: 10_000 });
      }, 10_000);
      inactivityTimerRef.current = window.setTimeout(() => {
        if (abandonSentRef.current || hasBookingSuccess()) return;
        abandonSentRef.current = true;
        trackEvent({ eventType: 'booking_abandon', step: getLastFunnelStep() ?? currentStep, serviceId: selectedService?.id, slotId: selectedSlot?.id, metadata: { reason: 'inactivity_timeout' } });
        trackBehaviorEvent('booking_abandon', { step: getLastFunnelStep() ?? currentStep, serviceId: selectedService?.id, slotId: selectedSlot?.id, timeOnStep: Math.max(0, Date.now() - stepStartedAtRef.current) });
        clearBookingSession();
      }, INACTIVITY_MS);
    };
    const rl: EventListener = () => resetInactivity();
    const onVis = () => { if (document.visibilityState === 'hidden') { resetInactivity(); if (!abandonSentRef.current && !hasBookingSuccess()) trackBehaviorEvent('booking_tab_hidden', { step: getLastFunnelStep() ?? currentStep }); } };
    const onBu = () => { resetInactivity(); if (abandonSentRef.current || hasBookingSuccess()) return; abandonSentRef.current = true; trackEvent({ eventType: 'booking_abandon', step: getLastFunnelStep() ?? currentStep, serviceId: selectedService?.id, slotId: selectedSlot?.id, metadata: { reason: 'page_unload' } }); trackBehaviorEvent('booking_abandon', { step: getLastFunnelStep() ?? currentStep, serviceId: selectedService?.id, slotId: selectedSlot?.id, timeOnStep: Math.max(0, Date.now() - stepStartedAtRef.current) }); clearBookingSession(); };
    const evts: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    for (const e of evts) window.addEventListener(e, rl, { passive: true } as AddEventListenerOptions);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onBu);
    resetInactivity();
    return () => { for (const e of evts) window.removeEventListener(e, rl); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('beforeunload', onBu); if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current); if (hesitationTimerRef.current) window.clearTimeout(hesitationTimerRef.current); };
  }, [currentStep, selectedService?.id, selectedSlot?.id]);

  useEffect(() => {
    return () => { if (abandonSentRef.current || hasBookingSuccess()) return; abandonSentRef.current = true; trackBehaviorEvent('booking_abandon', { step: getLastFunnelStep() ?? currentStep, serviceId: selectedService?.id, slotId: selectedSlot?.id, timeOnStep: Math.max(0, Date.now() - stepStartedAtRef.current) }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setMode('guided'); }, [setMode]);
  useEffect(() => { if (!transitionsEnabled) return; setIsStepTransitioning(true); const t = window.setTimeout(() => setIsStepTransitioning(false), 280); return () => window.clearTimeout(t); }, [currentStep, transitionsEnabled]);
  useEffect(() => { if (currentStep !== 3 || addOnsLoading || selectedAddOns.length > 0) return; setStep(4); }, [addOnsLoading, currentStep, selectedAddOns.length, setStep]);
  useEffect(() => { activeTimelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); activePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [currentStep]);

  const funnelStep = funnelStepFromBookingStep(currentStep);
  const funnelSteps = [
    { n: 1 as const, title: copy.funnel1 },
    { n: 2 as const, title: copy.funnel2 },
    { n: 3 as const, title: copy.funnel3 },
  ];

  const prefetchSlotsNav = () => { const now = new Date(); const to = new Date(now); to.setDate(to.getDate() + 40); void fetch(`/api/slots?from=${now.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`).catch(() => null); };
  const selectedServiceHasVariants = (selectedService?.variants ?? []).some((variant) => variant.isActive !== false);
  const canProceedFromServiceStep = Boolean(selectedService) && (!selectedServiceHasVariants || Boolean(selectedVariant));

  const handleFunnelStepClick = (n: 1 | 2 | 3) => {
    if (n === 1 && currentStep > 1) setStep(1);
    if (n === 2 && currentStep > 2) setStep(2);
    if (n === 3 && currentStep > 3) setStep(3);
  };

  const handleBack = () => { if (currentStep > 1) prevStep(); else router.push('/'); };

  const handleMobileStickyCta = () => {
    if (currentStep === 1 && canProceedFromServiceStep) { prefetchSlotsNav(); nextStep(); }
  };

  const effectivePrice = typeof selectedVariant?.price === 'number' ? selectedVariant.price : selectedService?.price ?? 0;
  const effectiveDuration = typeof selectedVariant?.duration === 'number' ? selectedVariant.duration : selectedService?.duration ?? 0;
  const variantNameForDisplay = (selectedVariant?.name || selectedVariant?.nameEt || '').trim();
  const effectiveServiceName = selectedService
    ? variantNameForDisplay
      ? `${selectedService.name} (${variantNameForDisplay.toLocaleLowerCase(en ? 'en' : 'et')})`
      : selectedService.name
    : '';
  const shellMaxWidthClass =
    currentStep === 1
      ? 'max-w-[1080px]'
      : currentStep === 2
        ? 'max-w-[960px]'
        : currentStep === 3
          ? 'max-w-[980px]'
          : 'max-w-[1040px]';

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <ServiceStep />;
      case 2: return <DateTimeStep step3AnchorRef={step3Ref} />;
      case 3: return <ExtrasStep />;
      case 4: case 5: return <ConfirmStep />;
      default: return <ServiceStep />;
    }
  };

  const isConfirm = currentStep >= 3;

  return (
    <div
      className={`min-h-screen bg-[#f8f7f6] ${
        isConfirm ? 'pb-[calc(14rem+env(safe-area-inset-bottom))] lg:pb-10'
        : currentStep === 2 ? 'pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10'
        : 'pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10'
      }`}
    >
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 bg-[#f8f7f6]/90 backdrop-blur-xl">
        <div className={`mx-auto flex ${shellMaxWidthClass} items-center justify-between gap-3 px-5 py-3`}>
          <button type="button" onClick={handleBack} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#555] transition hover:bg-white active:scale-[0.97]">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            {t('booking.back')}
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9f456f]">{copy.progressTitle}</p>
          <div className="w-16 shrink-0" aria-hidden />
        </div>
      </header>

      {/* ─── Main ─── */}
      <main
        ref={serviceRef}
        className={`mx-auto ${shellMaxWidthClass} px-4 pt-4 sm:px-5 md:pt-8`}
      >
        <section
          className={`overflow-hidden rounded-[24px] border border-[#efefef] bg-white shadow-[0_8px_40px_-16px_rgba(0,0,0,0.07)] transition-shadow duration-200 ${
            isStepTransitioning ? 'shadow-[0_12px_48px_-12px_rgba(159,69,111,0.08)]' : ''
          }`}
        >
          {/* ─── Micro Progress Navigation ─── */}
          <div className="flex items-center justify-center px-5 py-4">
            {funnelSteps.map(({ n, title }, i) => {
              const isActive = funnelStep === n;
              const isDone = funnelStep > n;
              const isNextPreview = currentStep === 1 && selectedService && n === 2;
              const canJump = (n === 1 && currentStep > 1) || (n === 2 && currentStep > 2) || (n === 3 && currentStep > 3);

              return (
                <Fragment key={n}>
                  {i > 0 && (
                    <div className={`mx-2 h-px w-6 sm:w-10 transition-colors duration-300 ${isDone || isActive ? 'bg-[#d8b0c4]' : 'bg-[#efefef]'}`} />
                  )}
                  <button
                    type="button"
                    ref={isActive ? activeTimelineRef : undefined}
                    tabIndex={canJump ? 0 : -1}
                    aria-current={isActive ? 'step' : undefined}
                    onClick={() => { if (canJump) handleFunnelStepClick(n); }}
                    className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 ${
                      isActive ? 'bg-[#FFF5F9] text-[#9f456f]'
                      : isDone ? 'bg-transparent text-[#9f456f]'
                      : isNextPreview ? 'bg-[#fff8fb] text-[#b77a99] ring-1 ring-[#edd8e4] pointer-events-none'
                      : 'bg-transparent text-[#bbb] pointer-events-none'
                    } ${canJump ? 'cursor-pointer hover:bg-[#fff0f5]' : 'cursor-default'}`}
                  >
                    {isDone ? (
                      <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#9f456f]">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </span>
                    ) : isActive ? (
                      <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#9f456f] text-[10px] font-bold text-white">{n}</span>
                    ) : isNextPreview ? (
                      <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full border-[1.5px] border-[#e3c8d7] text-[10px] font-bold text-[#b77a99]">2</span>
                    ) : (
                      <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full border-[1.5px] border-[#ddd] text-[10px] font-bold text-[#bbb]">{n}</span>
                    )}
                    <span className="hidden sm:inline">{title}</span>
                  </button>
                </Fragment>
              );
            })}
          </div>

          {/* ─── Step content ─── */}
          <div
            ref={activePanelRef}
            className={`px-5 pb-8 pt-2 sm:px-6 md:px-8 ${transitionsEnabled ? 'booking-step-slide' : ''} ${isStepTransitioning ? 'will-change-transform' : ''}`}
            key={currentStep}
          >
            <div ref={step3Ref} className="pointer-events-none h-0 w-full scroll-mt-[76px]" aria-hidden tabIndex={-1} />
            {currentStep === 1 ? (
              <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
                <div className="min-w-0">
                  <ServiceStep />
                </div>
                <aside className="sticky top-[92px] hidden self-start lg:block">
                  <div className="rounded-[18px] border border-[#efefef] bg-[#fcfbfc] p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a898a8]">
                      {t('_auto.app_book_page.p247')}
                    </p>
                    <p className="mt-1 text-[11px] text-[#9a8a94]">
                      {t('_auto.app_book_page.p248')}
                    </p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[#9a8a94]">{t('_auto.app_book_page.p249')}</p>
                        <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">
                          {effectiveServiceName || (t('_auto.app_book_page.p250'))}
                        </p>
                        {selectedService && selectedVariant ? (
                          <p className="mt-1 text-[12px] text-[#7f727a]">
                            {selectedVariant.duration} {t('_auto.app_book_page.p251')} · {`€${selectedVariant.price}`}
                          </p>
                        ) : selectedService ? (
                          <p className="mt-1 text-[12px] text-[#7f727a]">
                            {selectedService.duration} {t('_auto.app_book_page.p252')}
                          </p>
                        ) : null}
                      </div>
                      <div className="h-px bg-[#eee8ec]" />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-[#9a8a94]">{t('_auto.app_book_page.p253')}</p>
                          <p className="mt-1 text-[22px] font-bold tabular-nums text-[#9f456f]">
                            {selectedService ? `€${effectivePrice}` : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-wide text-[#9a8a94]">{t('_auto.app_book_page.p254')}</p>
                          <p className="mt-1 text-[13px] font-medium text-[#5f555b]">
                            {selectedSlot ? `${selectedSlot.date} · ${selectedSlot.time}` : (t('_auto.app_book_page.p255'))}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#efe8ec] bg-white px-3 py-2">
                        <p className="text-[11px] text-[#7f727a]">
                          {selectedService
                            ? (en
                                ? `Selected duration: ${effectiveDuration} min`
                                : `Valitud kestus: ${effectiveDuration} min`)
                            : (t('_auto.app_book_page.p256'))}
                        </p>
                      </div>
                      <p className="text-[11px] text-[#9a8a94]">
                        {t('_auto.app_book_page.p257')}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            ) : (
              renderStep()
            )}
          </div>
        </section>
      </main>

      {/* ─── Mobile sticky CTA — Step 1 (only when service selected) ─── */}
      {currentStep === 1 && canProceedFromServiceStep && selectedService && (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] h-24 bg-[linear-gradient(180deg,transparent_0%,rgba(248,247,246,0.95)_50%,#f8f7f6_100%)] lg:hidden" aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 lg:hidden" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="booking-mobile-cta-enter booking-mobile-cta-spring pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-[#efefef] bg-white p-3 shadow-[0_12px_36px_-16px_rgba(0,0,0,0.10)]">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#1a1a1a]">{effectiveServiceName || selectedService.name}</p>
                <p className="truncate text-[12px] text-[#7f727a]">{effectiveDuration} min · {`€${totalPrice || effectivePrice}`}</p>
              </div>
              <button
                type="button"
                onClick={handleMobileStickyCta}
                className="shrink-0 rounded-xl bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] px-6 py-3 text-[13px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(159,69,111,0.4)] transition-transform active:scale-[0.97]"
              >
                {t('_auto.app_book_page.p258')}
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes bookingStepSlide {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .booking-step-slide { animation: bookingStepSlide 240ms cubic-bezier(0.22, 0.68, 0, 1) both; }
        @keyframes bookingMobileCtaEnter {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .booking-mobile-cta-enter { animation: bookingMobileCtaEnter 260ms ease-out both; }
        @keyframes bookingMobileCtaSpring {
          0% { transform: translateY(16px) scale(0.985); opacity: 0; }
          70% { transform: translateY(-2px) scale(1.005); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .booking-mobile-cta-spring { animation: bookingMobileCtaSpring 240ms cubic-bezier(0.22, 0.68, 0, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .booking-step-slide, .booking-mobile-cta-enter, .booking-mobile-cta-spring { animation: none; }
        }
      `}</style>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f7f6]">
          <div className="mx-auto max-w-[720px] px-5 pb-12 pt-16">
            <SkeletonBlock className="mb-6 h-10 w-56 rounded-full" />
            <SkeletonBlock className="mb-4 h-5 w-2/3 rounded-full" />
            <SkeletonBlock className="h-[420px] rounded-[24px]" />
          </div>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
