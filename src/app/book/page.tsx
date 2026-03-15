'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { BookingProgressBar } from '@/components/booking/BookingProgressBar';
import { ServiceStep } from '@/components/booking/ServiceStep';
import { DateTimeStep } from '@/components/booking/DateTimeStep';
import { ContactStep } from '@/components/booking/ContactStep';
import { ExtrasStep } from '@/components/booking/ExtrasStep';
import { ConfirmStep } from '@/components/booking/ConfirmStep';
import { useServices } from '@/hooks/use-services';

const nailStyles = [
  { id: '1', name: 'Glossy Pink French', slug: 'glossy-pink-french', recommendedServiceId: 'gel-manicure', emoji: 'P' },
  { id: '2', name: 'Matte Nude', slug: 'matte-nude', recommendedServiceId: 'gel-manicure', emoji: 'N' },
  { id: '3', name: 'Chrome Silver', slug: 'chrome-silver', recommendedServiceId: 'nail-art', emoji: 'C' },
  { id: '4', name: 'Ombre Sunset', slug: 'ombre-sunset', recommendedServiceId: 'gel-manicure', emoji: 'O' },
  { id: '5', name: 'Ruby Red', slug: 'ruby-red', recommendedServiceId: 'gel-manicure', emoji: 'R' },
  { id: '6', name: 'Pearl White', slug: 'pearl-white', recommendedServiceId: 'luxury-spa-manicure', emoji: 'W' },
];

function BookingContent() {
  const { t } = useTranslation();
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
  const { services } = useServices();

  const total = selectedService?.price || 0;
  const serviceRef = useRef<HTMLDivElement>(null);
  const stylePreview = selectedStyle?.emoji ?? 'S';
  const selectedSlotLabel = selectedSlot
    ? `${selectedSlot.date} ${t('confirm.at')} ${selectedSlot.time}`
    : null;

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
          }, 300);
        }
      }
    }
  }, [searchParams, setSelectedStyle, selectService, selectedService, nextStep, services, selectDate, setStep]);

  useEffect(() => {
    setMode('guided');
  }, [setMode]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#f7f2ee_42%,_#f3ede8_100%)]">
      <div className="border-b border-white/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto max-w-xl px-4 py-4">
          <div className="flex items-center justify-between gap-4 rounded-[28px] bg-white/80 px-4 py-3 shadow-[0_20px_55px_-40px_rgba(72,49,35,0.45)] ring-1 ring-[#e7ddd6]">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[linear-gradient(145deg,#f2ddd4,#cfa293)] shadow-[0_10px_24px_-14px_rgba(84,49,32,0.75)]">
                <div className="absolute inset-[3px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff6f0,_#d3a08f_70%,#b98271_100%)]" />
                <div className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-[#b08979]">Appointment Preview</p>
                <p className="text-sm font-semibold text-[#3d3028]">{t('booking.bookingWith')} Sandra</p>
                <p className="text-xs text-[#8c7568]">Mustamae Studio</p>
              </div>
            </div>
            <div className="hidden min-[430px]:flex items-center gap-2 rounded-full bg-[#fbf6f2] px-3 py-1.5 text-[11px] font-medium text-[#7b6559] ring-1 ring-[#efe4dc]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c59b8d]" />
              Certified nail technician
            </div>
          </div>
        </div>
      </div>

      <header className="sticky top-[89px] z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-xl px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 transition-colors hover:text-[#b58373]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">{t('booking.back')}</span>
            </button>

            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-[0.08em] text-[#b58373]">Nailify</h1>
              <p className="text-[11px] text-[#9f887b]">Designed for easy booking</p>
            </div>

            <div className="w-16" />
          </div>
        </div>
      </header>

      <BookingProgressBar />

      {currentStep >= 3 && (selectedService || selectedSlot) && (
        <div className="sticky top-[89px] z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto max-w-xl px-4 py-3">
            <div className="flex items-center justify-between gap-4 rounded-[24px] bg-white/85 px-4 py-3 shadow-[0_18px_45px_-35px_rgba(72,49,35,0.5)] ring-1 ring-[#ece1da]">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#f4e4dc,#e8c1b3)] text-lg text-[#9e725f] shadow-inner">
                  {stylePreview}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#aa8a7b]">Appointment preview</p>
                  <p className="truncate text-sm font-semibold text-[#3d3028]">
                    {selectedService?.name || selectedStyle?.name || 'Nailify booking'}
                  </p>
                  {selectedSlotLabel && (
                    <p className="truncate text-xs text-[#7d685d]">Approximate appointment time: {selectedSlotLabel}</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#aa8a7b]">Estimated total</p>
                <div className="text-sm font-semibold text-[#b58373]">EUR {total}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-xl px-4 py-8 sm:py-10">
        <div className="overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(255,250,247,0.98)_100%)] shadow-[0_24px_70px_-34px_rgba(62,42,30,0.32),0_12px_30px_-24px_rgba(62,42,30,0.22)] ring-1 ring-white/80">
          <div className="px-6 pt-5 text-center sm:px-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#b08979]">Tailored to your selected style</p>
          </div>
          <div className="animate-fade-in px-6 pb-7 pt-4 sm:px-8 sm:pb-8 sm:pt-5" key={currentStep}>
            {renderStep()}
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f0eb]">
          <div className="animate-pulse text-[#b58373]">Laadimine...</div>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
