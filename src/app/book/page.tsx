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

const nailStyles = [
  { id: '1', name: 'Glossy Pink French', slug: 'glossy-pink-french', recommendedServiceId: 'gel-manicure', emoji: 'P' },
  { id: '2', name: 'Matte Nude', slug: 'matte-nude', recommendedServiceId: 'gel-manicure', emoji: 'N' },
  { id: '3', name: 'Chrome Silver', slug: 'chrome-silver', recommendedServiceId: 'nail-art', emoji: 'C' },
  { id: '4', name: 'Ombre Sunset', slug: 'ombre-sunset', recommendedServiceId: 'gel-manicure', emoji: 'O' },
  { id: '5', name: 'Ruby Red', slug: 'ruby-red', recommendedServiceId: 'gel-manicure', emoji: 'R' },
  { id: '6', name: 'Pearl White', slug: 'pearl-white', recommendedServiceId: 'luxury-spa-manicure', emoji: 'W' },
];

type TimelineStage = 1 | 2 | 3 | 4;

function stepToStage(step: number): TimelineStage {
  if (step <= 1) return 1;
  if (step === 2) return 2;
  if (step === 3 || step === 4) return 3;
  return 4;
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
  const selectedStyle = useBookingStore((state) => state.selectedStyle);
  const setSelectedStyle = useBookingStore((state) => state.setSelectedStyle);
  const selectService = useBookingStore((state) => state.selectService);
  const selectDate = useBookingStore((state) => state.selectDate);
  const setStep = useBookingStore((state) => state.setStep);
  const nextStep = useBookingStore((state) => state.nextStep);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const totalDuration = useBookingStore((state) => state.totalDuration);
  const allAddOns = useBookingStore((state) => state.selectedAddOns);
  const selectedAddOns = allAddOns.filter((item) => item.selected);
  const contactInfo = useBookingStore((state) => state.contactInfo);
  const { services } = useServices();
  useBookingAddOns();

  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const activeTimelineRef = useRef<HTMLButtonElement | null>(null);
  const activePanelRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);
  const transitionsEnabled = true;

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

  const currentStage = stepToStage(currentStep);
  const selectedSlotLabel = selectedSlot
    ? `${new Date(selectedSlot.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', { weekday: 'short', day: 'numeric', month: 'short' })} ${t('confirm.at')} ${selectedSlot.time}`
    : null;

  const timeline = [
    {
      id: 'service',
      stage: 1 as TimelineStage,
      label: copy.stageService,
      preview: copy.stageServicePreview,
      summary: selectedService?.name || null,
      editStep: 1,
    },
    {
      id: 'time',
      stage: 2 as TimelineStage,
      label: copy.stageTime,
      preview: copy.stageTimePreview,
      summary: selectedSlotLabel,
      editStep: 2,
    },
    {
      id: 'details',
      stage: 3 as TimelineStage,
      label: copy.stageDetails,
      preview: copy.stageDetailsPreview,
      summary:
        contactInfo?.firstName || selectedAddOns.length > 0
          ? `${contactInfo?.firstName ?? ''}${contactInfo?.firstName && selectedAddOns.length > 0 ? ' - ' : ''}${selectedAddOns.length > 0 ? `${selectedAddOns.length} ${language === 'en' ? 'extras' : 'lisa'}` : ''}`
          : null,
      editStep: 3,
    },
    {
      id: 'confirmation',
      stage: 4 as TimelineStage,
      label: copy.stageConfirm,
      preview: copy.stageConfirmPreview,
      summary: currentStep === 5 ? `${copy.total}: €${totalPrice || selectedService?.price || 0}` : null,
      editStep: 5,
    },
  ];

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
        return <DateTimeStep />;
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffdfa_0%,_#fff6fb_46%,_#fff2f8_100%)] pb-28 lg:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#f0e2ea] bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,246,251,0.92)_100%)] backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-full border border-[#ecdbe5] bg-white px-3 py-2 text-sm font-medium text-[#634f5f] transition hover:bg-[#fff4fa]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('booking.back')}
            </button>
            <div className="text-center">
              <p className="type-overline text-[#b77f9f]">{copy.header}</p>
              <p className="type-small mt-1 text-[#745f6e]">{copy.helper}</p>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <main className="w-full px-3 pb-8 pt-4 sm:px-5 sm:pt-5 lg:px-8 xl:px-10">
        <div className="mx-auto grid w-full max-w-[1600px] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section
            ref={serviceRef}
            className={`overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.99)_0%,rgba(255,248,252,0.99)_100%)] ring-1 ring-[#f0e3eb] transition-all duration-300 sm:rounded-[30px] xl:rounded-[36px] ${
              isStepTransitioning
                ? 'shadow-[0_34px_84px_-36px_rgba(95,38,77,0.24),0_0_0_1px_rgba(240,221,233,0.8)]'
                : 'shadow-[0_30px_80px_-36px_rgba(95,38,77,0.22)]'
            }`}
          >
            <div className="h-1 w-full bg-[#f4e7ee]">
              <div
                className="h-full bg-[linear-gradient(90deg,#e3b6cd_0%,#cf6ca0_55%,#b54a83_100%)] transition-all duration-300"
                style={{ width: `${(currentStage / 4) * 100}%` }}
              />
            </div>

            <div className="hidden gap-2 px-4 pt-5 sm:grid sm:grid-cols-4 sm:px-6 xl:px-8">
              {timeline.map((item) => {
                const status = currentStage > item.stage ? 'done' : currentStage === item.stage ? 'active' : 'upcoming';
                return (
                  <button
                    key={`timeline-inline-${item.id}`}
                    type="button"
                    ref={status === 'active' ? activeTimelineRef : undefined}
                    onClick={() => {
                      if (status === 'done') {
                        setStep(item.editStep as 1 | 2 | 3 | 4 | 5);
                      }
                    }}
                    className={`rounded-2xl border px-3 py-2.5 text-left transition-all duration-300 ${
                      status === 'active'
                        ? 'border-[#ecd9e4] bg-[linear-gradient(145deg,#fff,#fff5fb)] shadow-[0_16px_24px_-20px_rgba(119,64,97,0.28)]'
                        : status === 'done'
                          ? 'border-[#eee0e8] bg-[#fff8fc]'
                          : 'border-[#f2e7ee] bg-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                          status === 'done'
                            ? 'bg-[#eddde6] text-[#6a4c62]'
                            : status === 'active'
                              ? 'bg-[#c24d86] text-white'
                              : 'bg-[#f4e8ef] text-[#8a6e82]'
                        }`}
                      >
                        {status === 'done' ? '✓' : item.stage}
                      </span>
                      <span className="truncate text-xs font-semibold text-[#4a3243]">{item.label}</span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[#806a79]">
                      {status === 'done' && item.summary ? item.summary : item.preview}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="px-4 pt-4 text-center sm:px-8 sm:pt-6 xl:px-12 xl:pt-7">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#b27a98]">{copy.helper}</p>
            </div>

            <div
              ref={activePanelRef}
              className={`px-4 pb-8 pt-4 sm:px-8 sm:pb-11 sm:pt-5 xl:px-12 xl:pb-12 xl:pt-6 ${transitionsEnabled ? 'animate-fade-in-up' : ''}`}
              key={currentStep}
            >
              {renderStep()}
            </div>
          </section>

          <aside className="hidden xl:block">
            <div className="sticky top-28 overflow-hidden rounded-3xl border border-[#eddde7] bg-white/94 p-5 shadow-[0_26px_44px_-34px_rgba(95,38,77,0.32)] backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#9d6b8a]">{copy.summary}</p>

              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#fff6fb] p-3 ring-1 ring-[#efe1ea]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#f2deea,#e4bfd5)] text-[#935c7c]">
                  {selectedStyle?.emoji ?? '✦'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#4a3344]">{selectedService?.name || copy.pickService}</p>
                  <p className="text-xs text-[#7f6677]">{copy.studio}</p>
                </div>
              </div>

              <div className="mt-4 divide-y divide-[#f1e5ec] rounded-2xl border border-[#efe1ea] bg-[#fffafd] text-sm">
                <div className="px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#9b7a8d]">{copy.dateTime}</p>
                  <p className="mt-1 font-medium text-[#5d4558]">{selectedSlotLabel || copy.pickSlot}</p>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#9b7a8d]">{copy.duration}</p>
                  <p className="mt-1 font-medium text-[#5d4558]">{totalDuration || selectedService?.duration || 0} min</p>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#9b7a8d]">{copy.tech}</p>
                  <p className="mt-1 font-medium text-[#5d4558]">Sandra</p>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#9b7a8d]">{copy.total}</p>
                  <p className="mt-1 text-xl font-semibold text-[#b04b80]">€{totalPrice || selectedService?.price || 0}</p>
                </div>
              </div>

              {selectedSlot?.isSos && (
                <div className="mt-3 rounded-xl border border-[#f0d8e6] bg-[#faf3f7] px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#8f5d78]">{copy.sos}</p>
                  <p className="mt-1 font-semibold text-[#b05387]">
                    {selectedSlot.sosSurcharge ? `+€${selectedSlot.sosSurcharge}` : copy.noSos}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#eeddE8] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm xl:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#4a3243]">{selectedService?.name || copy.pickService}</p>
            <p className="truncate text-xs text-[#7f6677]">{selectedSlotLabel || copy.pickSlot}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#9b7a8d]">{copy.total}</p>
            <p className="text-sm font-semibold text-[#b04b80]">€{totalPrice || selectedService?.price || 0}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.995);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.28s ease-out;
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
