'use client';

import { useEffect, useRef, useState } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import type { Service } from '@/store/booking-types';
import { useServices } from '@/hooks/use-services';
import { useBookingContent } from '@/hooks/use-booking-content';
import { useBookingAddOns } from '@/hooks/use-booking-addons';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';
import { PremiumImage as Image } from '@/components/ui/PremiumImage';
import { trackEvent, touchBookingActivity } from '@/lib/analytics-client';
import { trackEvent as trackFunnelEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeCopy(value?: string | null) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function cleanPrefixedValue(value: string, prefixes: string[]) {
  const normalized = normalizeCopy(value);
  if (!normalized) return normalized;
  const lowered = normalized.toLowerCase();
  for (const prefix of prefixes) {
    const prefixLower = prefix.toLowerCase();
    if (lowered.startsWith(prefixLower)) {
      return normalized.slice(prefix.length).trim();
    }
  }
  return normalized;
}

function isServiceFieldKeyLeak(value: string | undefined | null) {
  const s = (value ?? '').trim();
  if (!s) return false;
  if (s.startsWith('homepage.serviceDecision.fallback.')) return true;
  return /^homepage\.[a-z0-9_.-]+$/i.test(s) && s.includes('serviceDecision');
}

function pickServiceText(
  primary: string | undefined | null,
  secondary: string | undefined | null,
  fallback: string
) {
  const a = normalizeCopy(primary ?? '');
  if (a && !isServiceFieldKeyLeak(primary)) return a;
  const b = normalizeCopy(secondary ?? '');
  if (b && !isServiceFieldKeyLeak(secondary)) return b;
  return fallback;
}

const categoryTypeLabel = (category: string | undefined, en: boolean) => {
  const c = (category ?? '').toLowerCase();
  if (c === 'nail-art') return en ? 'Nail art' : 'Küünekunst';
  if (c === 'manicure') return en ? 'Manicure' : 'Maniküür';
  if (c === 'pedicure') return en ? 'Pedicure' : 'Pediküür';
  if (c === 'extensions') return en ? 'Extensions' : 'Pikendused';
  return en ? 'Service' : 'Teenus';
};

export function ServiceStep() {
  const { t, language } = useTranslation();
  const { services, loading } = useServices();
  const { text } = useBookingContent();
  const { addOns } = useBookingAddOns();
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectService = useBookingStore((state) => state.selectService);
  const nextStep = useBookingStore((state) => state.nextStep);
  const selectedStyle = useBookingStore((state) => state.selectedStyle);
  const continueButtonRef = useRef<HTMLDivElement>(null);
  const servicesViewAtRef = useRef<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (services.length === 0) return;
    if (servicesViewAtRef.current == null) servicesViewAtRef.current = Date.now();
    trackBehaviorEvent('booking_services_view', { numberOfServicesVisible: services.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, services.length]);

  const prefetchSlots = () => {
    const now = new Date();
    const to = new Date(now);
    to.setDate(to.getDate() + 40);
    void fetch(`/api/slots?from=${toIsoDate(now)}&to=${toIsoDate(to)}`).catch(() => null);
  };

  const handleChooseTime = (service: Service) => {
    const hesitationTime =
      servicesViewAtRef.current != null ? Math.max(0, Math.round((Date.now() - servicesViewAtRef.current) / 1000)) : undefined;
    trackBehaviorEvent('booking_service_selected', {
      serviceId: service.id,
      servicePrice: service.price,
      hesitationTime,
    });
    selectService(service);
    touchBookingActivity();
    trackEvent({
      eventType: 'booking_service_selected',
      step: 1,
      serviceId: service.id,
      metadata: { serviceName: service.name, duration: service.duration, price: service.price },
    });
    trackFunnelEvent({
      event: 'service_selected',
      serviceId: service.id,
      metadata: { serviceName: service.name, duration: service.duration, price: service.price, source: 'booking_step_1' },
      language,
    });
    prefetchSlots();
    nextStep();
    window.requestAnimationFrame(() => {
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const en = language === 'en';
  const styleHint = en ? 'Style selected — we’ll match the right service.' : 'Stiil on valitud — leiame sobiva teenuse.';
  const defaultLongevity = text('service_default_longevity', en ? 'Personalized wear' : 'Individuaalne püsivus');
  const defaultSuitability = text('service_default_suitability', en ? 'Tailored to you' : 'Kohandatud sulle');
  const defaultResult = text('service_default_result', en ? 'Premium finish.' : 'Premium viimistlus.');
  const includeLabel = text('service_include_label', en ? 'Includes' : 'Sisaldab');
  const viewDetailsLabel = en ? 'View details' : 'Vaata detaile';
  const hideDetailsLabel = en ? 'Hide details' : 'Peida detailid';
  const chooseTimeLabel = text('service_choose_time_cta', en ? 'Choose time' : 'Vali aeg');
  const addOnHint = text(
    'service_addon_hint',
    en ? 'Add nail art or repair in the next steps.' : 'Lisa disain või parandus järgmistes sammudes.'
  );
  const clientFavourite = text('service_client_favourite', en ? 'Popular' : 'Populaarne');
  const whoForLabel = en ? 'Best for' : 'Sobib';
  const detailsPreparation = text(
    'service_modal_preparation',
    en
      ? 'Arrive with clean nails. Add gel removal as a service if needed.'
      : 'Tule puhaste küüntega. Geeli eemaldus lisa teenusena.'
  );
  const detailsAftercare = text(
    'service_modal_aftercare',
    en
      ? 'Cuticle oil daily; avoid harsh chemicals for lasting shine.'
      : 'Küünenahaõli iga päev; väldi tugevaid kemikaale, et tulemus püsiks kaunis.'
  );
  const detailsResult = text(
    'service_modal_result',
    en
      ? 'Final tone confirmed with Sandra before work starts.'
      : 'Lõplik toon kinnitatakse Sandraga enne töö algust.'
  );

  const toggleDetails = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className="animate-fade-in motion-reduce:animate-none"
      style={{ animationDuration: '180ms' }}
    >
      <div className="mb-10 text-center md:mb-12">
        <h2 className="font-brand text-[1.75rem] font-semibold tracking-tight text-[#2f2530] md:text-[2rem]">
          {t('service.choose')}
        </h2>
        {selectedStyle ? (
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-[#c24d86]">
            <span>{selectedStyle.emoji}</span>
            <span>{styleHint}</span>
          </p>
        ) : (
          <p className="mt-2 text-[15px] text-[#7f6677]">{t('service.getStarted')}</p>
        )}
      </div>

      <div className="mx-auto grid max-w-[640px] grid-cols-1 gap-6 md:grid-cols-2 md:gap-6">
        {loading &&
          services.length === 0 &&
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`service-loading-${index}`}
              className="rounded-[20px] border border-[#eedfe8] bg-white p-5"
              style={{ padding: 20 }}
            >
              <SkeletonBlock className="mb-2 h-3 w-24 rounded" />
              <SkeletonBlock className="mb-3 h-7 w-4/5 rounded-lg" />
              <SkeletonBlock className="mb-3 h-10 w-full rounded-lg" />
              <SkeletonBlock className="h-11 w-full rounded-full" />
            </div>
          ))}

        {services.map((service) => {
          const isSelected = selectedService?.id === service.id;
          const expanded = expandedId === service.id;
          const rawResult = pickServiceText(
            service.resultDescription || service.resultDescriptionEt,
            service.description,
            defaultResult
          );
          const rawDescription = pickServiceText(service.description, null, '');
          const shortBlurb =
            rawDescription && rawDescription.length > 0 && rawDescription !== rawResult
              ? rawDescription
              : rawResult;
          const longevity = cleanPrefixedValue(
            pickServiceText(service.longevityDescription, service.longevityDescriptionEt, defaultLongevity),
            ['Pusivus:', 'Püsivus:', 'Stays:', 'Longevity:']
          );
          const suitability = cleanPrefixedValue(
            pickServiceText(service.suitabilityNote, service.suitabilityNoteEt, defaultSuitability),
            ['Sobivus:', 'Suitability:', 'Best for:']
          );
          const typeLabel = categoryTypeLabel(service.category, en);
          const smallLabel =
            service.category === 'nail-art'
              ? en
                ? 'Signature'
                : 'Signatuur'
              : en
                ? 'Premium service'
                : 'Premium teenus';

          return (
            <article
              key={service.id}
              className={`booking-service-card group relative flex flex-col rounded-[20px] border bg-white text-left transition-[transform,box-shadow] duration-[180ms] motion-reduce:transition-none ${
                isSelected
                  ? 'border-[#d4a8c0] shadow-[0_20px_40px_-28px_rgba(194,77,134,0.35)] ring-1 ring-[#f3e6ee]'
                  : 'border-[#ebe0e6] shadow-[0_8px_28px_-20px_rgba(57,33,52,0.12)] hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-24px_rgba(116,47,93,0.2)] active:scale-[0.99] md:hover:-translate-y-1'
              }`}
              style={{ padding: 20 }}
            >
              <div className="relative mb-4 overflow-hidden rounded-[16px] border border-[#f1e6ec] bg-[linear-gradient(135deg,#fbf3f7_0%,#f6eef2_55%,#f3eaee_100%)]">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={service.imageUrl ?? ''}
                    alt={service.name}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 420px"
                    className="object-cover"
                    revealEnabled
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,12,18,0.00)_0%,rgba(18,12,18,0.28)_72%,rgba(18,12,18,0.40)_100%)]" aria-hidden />
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a8899c]">
                  {smallLabel}
                </span>
                {service.isPopular && (
                  <span className="rounded-full bg-[#fdf2f8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#b04b80]">
                    {clientFavourite}
                  </span>
                )}
              </div>

              <h3 className="font-brand text-[1.35rem] font-semibold leading-tight tracking-tight text-[#2f2530] md:text-[1.45rem]">
                {service.name}
              </h3>

              <p className="mt-2 line-clamp-1 sm:line-clamp-2 text-[13px] leading-snug text-[#6b5a66]">{shortBlurb}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-[#faf6f8] px-2.5 py-1 text-[11px] font-medium text-[#715b69]">
                  {service.duration} {t('service.minutes')}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#faf6f8] px-2.5 py-1 text-[11px] font-medium text-[#715b69]">
                  {typeLabel}
                </span>
                {longevity && (
                  <span className="line-clamp-1 inline-flex max-w-full items-center rounded-full bg-[#faf6f8] px-2.5 py-1 text-[11px] text-[#8a7a85]">
                    {longevity}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-[#f4eaef] pt-4">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9b7a8d]">
                  {en ? 'From' : 'Alates'}
                </span>
                <span className="text-2xl font-semibold tabular-nums text-[#c24d86]">€{service.price}</span>
              </div>

              <button
                type="button"
                onClick={() => handleChooseTime(service)}
                className="booking-cta-primary mt-4 min-h-[48px] w-full rounded-full bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_48%,#a93d71_100%)] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_12px_32px_-12px_rgba(194,77,134,0.65)] transition-all duration-[180ms] hover:shadow-[0_16px_36px_-10px_rgba(194,77,134,0.55)] motion-reduce:transition-none"
              >
                {chooseTimeLabel}
              </button>

              <button
                type="button"
                onClick={(e) => toggleDetails(e, service.id)}
                className="mt-2.5 w-full py-1 text-center text-[13px] font-medium text-[#9d6b8a] underline decoration-[#e8c9d8] underline-offset-4 transition-opacity duration-[180ms] hover:text-[#c24d86] hover:decoration-[#c24d86]"
              >
                {expanded ? hideDetailsLabel : viewDetailsLabel}
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-[180ms] motion-reduce:transition-none ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-3 space-y-3 border-t border-[#f0e6ea] pt-3 text-[13px] leading-relaxed text-[#6d5868]">
                    {rawDescription && rawDescription !== shortBlurb && <p>{rawDescription}</p>}
                    <p>{rawResult}</p>
                    <p>
                      <span className="font-semibold text-[#5d4a59]">{whoForLabel}: </span>
                      {suitability || defaultSuitability}
                    </p>
                    <div className="rounded-xl bg-[#fff8fc] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b7a8d]">
                        {includeLabel}
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[#6d5868]">
                        <li>{detailsPreparation}</li>
                        <li>{detailsAftercare}</li>
                        <li>{detailsResult}</li>
                      </ul>
                    </div>
                    <p className="text-xs text-[#8a7a88]">{addOnHint}</p>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div
                  className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#c24d86] text-white shadow-md"
                  aria-hidden
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {addOns.length > 0 && (
        <div className="mx-auto mt-10 max-w-[640px]">
          <p className="mb-2 text-center text-xs font-medium text-[#8a7a88]">
            {text('service_addons_title', en ? 'Optional add-ons next:' : 'Valikulised lisad järgmisena:')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {addOns.slice(0, 4).map((chip) => (
              <span
                key={chip.id}
                className="rounded-full border border-[#ebe0e6] bg-white/80 px-3 py-1 text-[11px] text-[#7d6275]"
              >
                {chip.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div ref={continueButtonRef} />

      <p className="mt-8 text-center text-[11px] text-[#a898a8]">
        {en ? 'Most guests finish in under a minute.' : 'Enamik kliente lopetab alla minutiga.'}
      </p>
    </div>
  );
}

export default ServiceStep;
