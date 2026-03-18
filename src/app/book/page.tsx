'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { ServiceStep } from '@/components/booking/ServiceStep';
import { DateTimeStep } from '@/components/booking/DateTimeStep';
import { ContactStep } from '@/components/booking/ContactStep';
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

  const currentStep = useBookingStore((state) => state.currentStep);
  const prevStep = useBookingStore((state) => state.prevStep);
  const setMode = useBookingStore((state) => state.setMode);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const setSelectedStyle = useBookingStore((state) => state.setSelectedStyle);
  const selectService = useBookingStore((state) => state.selectService);
  const selectDate = useBookingStore((state) => state.selectDate);
  const setStep = useBookingStore((state) => state.setStep);
  const nextStep = useBookingStore((state) => state.nextStep);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const { services } = useServices();
  useBookingAddOns();

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

  const copy = useMemo(
    () =>
      language === 'en'
        ? {
            header: 'Booking with Sandra',
            helper: 'Take your time - you can always adjust.',
            stageService: 'Service',
            stageServicePreview: 'Choose your ideal base service',
            stageTime: 'Time',
            stageTimePreview: 'Find the best moment for your visit',
            stageDetails: 'Details',
            stageDetailsPreview: 'Share your preferences and notes',
            stageConfirm: 'Confirmation',
            stageConfirmPreview: 'Review and confirm with confidence',
            edit: 'Edit',
            summary: 'Booking summary',
            pickService: 'Select service',
            studio: 'Mustamäe studio',
            dateTime: 'Date and time',
            pickSlot: 'Choose time',
            total: 'Total',
            sos: 'SOS surcharge',
            noSos: 'No surcharge',
            duration: 'Approximate duration',
            tech: 'Technician',
            funnel1: 'Choose service',
            funnel2: 'Choose time',
            funnel3: 'Confirm booking',
            stepLabel: 'Step',
            progressTitle: 'Your booking',
            mobileSelectService: 'Select a service',
            mobileContinueTime: 'Choose time',
            mobilePickSlot: 'Pick a time',
            mobileContinue: 'Continue',
            mobileConfirm: 'Confirm booking',
          }
        : {
            header: 'Broneerimine Sandraga',
            helper: 'Vali rahulikult - saad alati muuta.',
            stageService: 'Teenus',
            stageServicePreview: 'Vali oma soovitud põhiteenus',
            stageTime: 'Aeg',
            stageTimePreview: 'Leia visiidiks sobivaim aeg',
            stageDetails: 'Detailid',
            stageDetailsPreview: 'Lisa eelistused ja märkused',
            stageConfirm: 'Kinnitus',
            stageConfirmPreview: 'Vaata üle ja kinnita enesekindlalt',
            edit: 'Muuda',
            summary: 'Broneeringu kokkuvõte',
            pickService: 'Vali teenus',
            studio: 'Mustamäe stuudio',
            dateTime: 'Kuupäev ja aeg',
            pickSlot: 'Vali aeg',
            total: 'Kokku',
            sos: 'SOS lisatasu',
            noSos: 'Lisatasuta',
            duration: 'Ligikaudne kestus',
            tech: 'Tehnik',
            funnel1: 'Vali teenus',
            funnel2: 'Vali aeg',
            funnel3: 'Kinnita broneering',
            stepLabel: 'Samm',
            progressTitle: 'Sinu broneering',
            mobileSelectService: 'Vali teenus',
            mobileContinueTime: 'Vali aeg',
            mobilePickSlot: 'Vali kellaaeg',
            mobileContinue: 'Jätka',
            mobileConfirm: 'Kinnita broneering',
          },
    [language]
  );

  useEffect(() => {
    const styleSlug = searchParams.get('style');
    const serviceId = searchParams.get('service');
    const dateParam = searchParams.get('date');

    if (serviceId) {
      const directService = services.find((service) => service.id === serviceId);
      if (directService) {
        selectService(directService);
        setStep(2);
        if (dateParam) {
          const parsed = new Date(`${dateParam}T00:00:00`);
          if (!Number.isNaN(parsed.getTime())) {
            selectDate(parsed);
          }
        }
      }
    }

    if (styleSlug) {
      const style = nailStyles.find((item) => item.slug === styleSlug);
      if (style) {
        setSelectedStyle(style);
        const recommendedService = services.find((service) => service.id === style.recommendedServiceId);
        if (recommendedService && !selectedService) {
          selectService(recommendedService);
          setTimeout(() => {
            nextStep();
            serviceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 250);
        }
      }
    }
  }, [searchParams, setSelectedStyle, selectService, selectedService, nextStep, services, selectDate, setStep]);

  // Analytics: session lifecycle start + booking open
  useEffect(() => {
    trackSessionStart({
      locale: language,
      path: typeof window !== 'undefined' ? window.location.pathname : '/book',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    });
    trackEvent({ eventType: 'booking_open', step: 0 });
    touchBookingActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Analytics: update last step + key milestones.
  useEffect(() => {
    touchBookingActivity();
    setLastFunnelStep(currentStep);
    stepStartedAtRef.current = Date.now();
    hesitationSentForStepRef.current = null;

    if (currentStep === 1) return;
    if (currentStep === 3) {
      trackEvent({
        eventType: 'booking_details_started',
        step: 3,
        serviceId: selectedService?.id,
        slotId: selectedSlot?.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Analytics: inactivity + abandon detection (non-blocking).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resetInactivity = () => {
      touchBookingActivity();
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      if (hesitationTimerRef.current) window.clearTimeout(hesitationTimerRef.current);

      // Lightweight hesitation detection (>10s idle on step)
      hesitationTimerRef.current = window.setTimeout(() => {
        if (hasBookingSuccess()) return;
        if (hesitationSentForStepRef.current === currentStep) return;
        hesitationSentForStepRef.current = currentStep;
        trackBehaviorEvent('hesitation_detected', { step: currentStep, duration: 10_000 });
      }, 10_000);

      inactivityTimerRef.current = window.setTimeout(() => {
        if (abandonSentRef.current) return;
        if (hasBookingSuccess()) return;
        abandonSentRef.current = true;
        trackEvent({
          eventType: 'booking_abandon',
          step: getLastFunnelStep() ?? currentStep,
          serviceId: selectedService?.id,
          slotId: selectedSlot?.id,
          metadata: { reason: 'inactivity_timeout' },
        });
        trackBehaviorEvent('booking_abandon', {
          step: getLastFunnelStep() ?? currentStep,
          serviceId: selectedService?.id,
          slotId: selectedSlot?.id,
          timeOnStep: Math.max(0, Date.now() - stepStartedAtRef.current),
        });
        clearBookingSession();
      }, INACTIVITY_MS);
    };

    const resetInactivityListener: EventListener = () => resetInactivity();

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        resetInactivity();
        if (abandonSentRef.current) return;
        if (hasBookingSuccess()) return;
        trackBehaviorEvent('booking_tab_hidden', { step: getLastFunnelStep() ?? currentStep });
      }
    };

    const onBeforeUnload = () => {
      resetInactivity();
      if (abandonSentRef.current) return;
      if (hasBookingSuccess()) return;
      abandonSentRef.current = true;
      trackEvent({
        eventType: 'booking_abandon',
        step: getLastFunnelStep() ?? currentStep,
        serviceId: selectedService?.id,
        slotId: selectedSlot?.id,
        metadata: { reason: 'page_unload' },
      });
      trackBehaviorEvent('booking_abandon', {
        step: getLastFunnelStep() ?? currentStep,
        serviceId: selectedService?.id,
        slotId: selectedSlot?.id,
        timeOnStep: Math.max(0, Date.now() - stepStartedAtRef.current),
      });
      clearBookingSession();
    };

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    for (const e of events) window.addEventListener(e, resetInactivityListener, { passive: true } as AddEventListenerOptions);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    resetInactivity();

    return () => {
      for (const e of events) window.removeEventListener(e, resetInactivityListener);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      if (hesitationTimerRef.current) window.clearTimeout(hesitationTimerRef.current);
    };
  }, [currentStep, selectedService?.id, selectedSlot?.id]);

  // Analytics: route change / unmount abandon (SPA-safe)
  useEffect(() => {
    return () => {
      if (abandonSentRef.current) return;
      if (hasBookingSuccess()) return;
      abandonSentRef.current = true;
      trackBehaviorEvent('booking_abandon', {
        step: getLastFunnelStep() ?? currentStep,
        serviceId: selectedService?.id,
        slotId: selectedSlot?.id,
        timeOnStep: Math.max(0, Date.now() - stepStartedAtRef.current),
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMode('guided');
  }, [setMode]);

  useEffect(() => {
    if (!transitionsEnabled) return;
    setIsStepTransitioning(true);
    const timer = window.setTimeout(() => setIsStepTransitioning(false), 260);
    return () => window.clearTimeout(timer);
  }, [currentStep, transitionsEnabled]);

  useEffect(() => {
    activeTimelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    activePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStep]);

  const funnelStep = funnelStepFromBookingStep(currentStep);
  const progressFillPct = funnelStep === 1 ? 33.333 : funnelStep === 2 ? 66.667 : 100;
  const selectedSlotLabel = selectedSlot
    ? `${new Date(selectedSlot.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', { weekday: 'short', day: 'numeric', month: 'short' })} ${t('confirm.at')} ${selectedSlot.time}`
    : null;

  const funnelSteps = [
    { n: 1 as const, title: copy.funnel1 },
    { n: 2 as const, title: copy.funnel2 },
    { n: 3 as const, title: copy.funnel3 },
  ];

  const prefetchSlotsNav = () => {
    const now = new Date();
    const to = new Date(now);
    to.setDate(to.getDate() + 40);
    const from = now.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    void fetch(`/api/slots?from=${from}&to=${toStr}`).catch(() => null);
  };

  const handleFunnelStepClick = (n: 1 | 2 | 3) => {
    if (n === 1 && currentStep > 1) setStep(1);
    if (n === 2 && currentStep > 2) setStep(2);
    if (n === 3 && currentStep > 3) setStep(3);
  };

  const handleMobileStickyCta = () => {
    if (currentStep === 1) {
      if (!selectedService) return;
      prefetchSlotsNav();
      nextStep();
    } else if (currentStep === 2) {
      if (!selectedSlot) return;
      nextStep();
    } else {
      document.getElementById('booking-sticky-primary-action')?.click();
    }
  };

  const mobileCtaDisabled =
    (currentStep === 1 && !selectedService) || (currentStep === 2 && !selectedSlot);

  const mobileCtaLabel =
    currentStep === 1
      ? selectedService
        ? copy.mobileContinueTime
        : copy.mobileSelectService
      : currentStep === 2
        ? selectedSlot
          ? copy.mobileContinue
          : copy.mobilePickSlot
        : currentStep === 5
          ? copy.mobileConfirm
          : copy.mobileContinue;

  const handleBack = () => {
    if (currentStep > 1) {
      prevStep();
    } else {
      router.push('/');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ServiceStep />;
      case 2:
        return <DateTimeStep step3AnchorRef={step3Ref} />;
      case 3:
        return <ContactStep />;
      case 4:
        return <ExtrasStep />;
      case 5:
        return <ConfirmStep />;
      default:
        return <ServiceStep />;
    }
  };

  return (
    <div
      className={`min-h-screen bg-[radial-gradient(ellipse_at_top,_#fffdfa_0%,_#fff6fb_50%,_#fef5f9_100%)] xl:pb-12 ${
        currentStep === 5
          ? 'pb-[calc(12rem+env(safe-area-inset-bottom))]'
          : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]'
      }`}
    >
      <header className="sticky top-0 z-40 border-b border-[#f0e6ec]/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#ecdbe5] bg-white px-3 py-2 text-sm font-medium text-[#634f5f] transition-[background-color,transform] duration-[180ms] hover:bg-[#fff8fc] active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('booking.back')}
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c24d86]">
              {copy.progressTitle} · {copy.stepLabel} {funnelStep} / 3
            </p>
            <p className="truncate text-xs text-[#8a7a88]">{copy.header}</p>
          </div>
          <div className="w-14 shrink-0 sm:w-20" aria-hidden />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 sm:px-6 md:pt-10 lg:px-8 lg:pt-[48px] xl:pt-20">
        <div
          className={`grid items-start gap-8 xl:gap-10 ${currentStep === 2 ? '' : 'xl:grid-cols-[minmax(0,1fr)_300px]'}`}
        >
          <section
            ref={serviceRef}
            className={`overflow-hidden rounded-[24px] bg-white/90 shadow-[0_24px_64px_-40px_rgba(95,38,77,0.28)] ring-1 ring-[#f0e6ec]/90 transition-shadow duration-[180ms] xl:rounded-[28px] ${
              isStepTransitioning ? 'shadow-[0_32px_72px_-36px_rgba(194,77,134,0.22)]' : ''
            }`}
          >
            <div className="h-1 w-full bg-[#f4eaef]">
              <div
                className="h-full rounded-r-full bg-[linear-gradient(90deg,#e8b8d4_0%,#c24d86_55%,#a93d71_100%)] transition-[width] duration-[180ms] ease-out"
                style={{ width: `${progressFillPct}%` }}
              />
            </div>

            <div className="border-b border-[#f5eaef] px-4 py-5 sm:px-6 md:px-8 md:py-8">
              <p className="mb-4 text-center text-[10px] font-medium uppercase tracking-[0.24em] text-[#b8a0ae]">
                {copy.helper}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {funnelSteps.map(({ n, title }) => {
                  const isActive = funnelStep === n;
                  const isDone = funnelStep > n;
                  const canJumpBack = (n === 1 && currentStep > 1) || (n === 2 && currentStep > 2) || (n === 3 && currentStep > 3);
                  return (
                    <button
                      key={n}
                      type="button"
                      ref={isActive ? activeTimelineRef : undefined}
                      tabIndex={canJumpBack || isActive ? 0 : -1}
                      aria-current={isActive ? 'step' : undefined}
                      onClick={() => {
                        if (canJumpBack) handleFunnelStepClick(n);
                      }}
                      className={`rounded-2xl px-4 py-3 text-left transition-all duration-[180ms] sm:py-3.5 ${
                        isActive
                          ? 'bg-[linear-gradient(180deg,#fffdfb_0%,#fff5f9_100%)] shadow-[0_12px_32px_-20px_rgba(194,77,134,0.35)] ring-2 ring-[#c24d86]/20'
                          : isDone
                            ? 'bg-white/70 opacity-90 ring-1 ring-[#eee5ea] hover:bg-[#fffafc] hover:opacity-100'
                            : 'pointer-events-none bg-[#faf8f9]/80 opacity-[0.38] ring-1 ring-transparent'
                      } ${canJumpBack ? 'cursor-pointer' : isActive ? 'cursor-default' : ''}`}
                    >
                      <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#c24d86]">
                        {language === 'en' ? `STEP ${n}` : `${copy.stepLabel} ${n}`} —{' '}
                        <span className="font-semibold normal-case tracking-normal text-[#2f2530]">{title}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              ref={activePanelRef}
              className={`px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 md:px-8 md:pb-14 xl:px-10 ${
                transitionsEnabled ? 'booking-step-fade' : ''
              } ${isStepTransitioning ? 'will-change-transform' : ''}`}
              key={currentStep}
            >
              <div
                ref={step3Ref}
                className="pointer-events-none h-0 w-full scroll-mt-[76px]"
                aria-hidden
                tabIndex={-1}
              />
              {renderStep()}
            </div>
          </section>

          <aside className={currentStep === 2 || currentStep === 5 ? 'hidden' : 'hidden xl:block'}>
            <div className="sticky top-24 rounded-2xl bg-white/75 p-6 shadow-[0_20px_48px_-28px_rgba(57,33,52,0.18)] backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c24d86] text-xs font-bold text-white">
                  {funnelStep}
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a8899c]">
                    {copy.stepLabel} {funnelStep} / 3
                  </p>
                  <p className="text-sm font-semibold text-[#2f2530]">
                    {funnelStep === 1 ? copy.funnel1 : funnelStep === 2 ? copy.funnel2 : copy.funnel3}
                  </p>
                </div>
              </div>
              <div className="space-y-4 border-t border-[#f0e8ed] pt-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a898a8]">{copy.pickService}</p>
                  <p className="mt-0.5 font-brand text-lg font-semibold text-[#3a2a35]">{selectedService?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a898a8]">{copy.dateTime}</p>
                  <p className="mt-0.5 text-sm font-medium text-[#5d4558]">{selectedSlotLabel ?? copy.pickSlot}</p>
                </div>
                <div className="flex items-end justify-between border-t border-dashed border-[#ebe0e6] pt-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a898a8]">{copy.total}</span>
                  <span className="text-2xl font-semibold tabular-nums text-[#c24d86]">
                    €{totalPrice || selectedService?.price || 0}
                  </span>
                </div>
              </div>
              {selectedSlot?.isSos && (
                <p className="mt-3 text-xs text-[#9d6b8a]">
                  {copy.sos}: {selectedSlot.sosSurcharge ? `+€${selectedSlot.sosSurcharge}` : copy.noSos}
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>

      {currentStep !== 2 && currentStep !== 5 && (
        <>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(255,250,252,0.92)_45%,#fff8fb_100%)] xl:hidden"
        aria-hidden
      />

      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 xl:hidden pointer-events-none">
        <div className="pointer-events-auto flex h-16 w-full max-w-lg items-center gap-3 rounded-full border border-white/60 bg-white/65 px-4 shadow-[0_12px_40px_-12px_rgba(57,33,52,0.25)] backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#2f2530]">{selectedService?.name || copy.pickService}</p>
            <p className="text-sm font-semibold tabular-nums text-[#c24d86]">€{totalPrice || selectedService?.price || 0}</p>
          </div>
          <button
            type="button"
            disabled={mobileCtaDisabled}
            onClick={handleMobileStickyCta}
            className={`shrink-0 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(194,77,134,0.55)] transition-all duration-[180ms] ${
              mobileCtaDisabled
                ? 'cursor-not-allowed bg-[#e8dce2] text-[#9a8a94] shadow-none'
                : 'bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_50%,#a93d71_100%)] hover:shadow-[0_10px_28px_-6px_rgba(194,77,134,0.5)] active:scale-[0.98]'
            }`}
          >
            {mobileCtaLabel}
          </button>
        </div>
      </div>
        </>
      )}

      <style jsx global>{`
        .booking-step-fade {
          animation: bookingStepFade 180ms ease-out both;
        }
        @keyframes bookingStepFade {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .booking-step-fade {
            animation: none;
          }
        }
        .booking-cta-primary:hover:not(:disabled) {
          box-shadow: 0 16px 40px -10px rgba(194, 77, 134, 0.45);
        }
      `}</style>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fffdfa_0%,#fff6fb_42%,#fff9fc_100%)]">
          <div className="mx-auto max-w-4xl px-4 pb-12 pt-20 sm:px-6">
            <SkeletonBlock className="mb-6 h-10 w-56 rounded-full" />
            <SkeletonBlock className="mb-4 h-5 w-2/3 rounded-full" />
            <SkeletonBlock className="mb-8 h-5 w-1/2 rounded-full" />
            <SkeletonBlock className="h-[420px] rounded-[32px]" />
          </div>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
