'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import type { Service } from '@/store/booking-types';
import { useServices } from '@/hooks/use-services';
import { useBookingContent } from '@/hooks/use-booking-content';
import { useBookingAddOns } from '@/hooks/use-booking-addons';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';

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
  const [detailsService, setDetailsService] = useState<Service | null>(null);

  const prefetchSlots = () => {
    const now = new Date();
    const to = new Date(now);
    to.setDate(to.getDate() + 40);
    void fetch(`/api/slots?from=${toIsoDate(now)}&to=${toIsoDate(to)}`).catch(() => null);
  };

  const handleChooseTime = (service: Service) => {
    selectService(service);
    prefetchSlots();
    nextStep();
    window.requestAnimationFrame(() => {
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const styleHint =
    language === 'en' ? 'Style selected, we will match the right service.' : 'Stiil on valitud, leiame sobiva teenuse.';
  const defaultLongevity = text('service_default_longevity', language === 'en' ? 'Longevity: personalized' : 'Pusivus: individuaalne');
  const defaultSuitability = text('service_default_suitability', language === 'en' ? 'Suitability: tailored to your needs' : 'Sobivus: kohandatud sinu vajadusele');
  const defaultResult = text('service_default_result', language === 'en' ? 'Beautifully finished premium result.' : 'Kaunis, hoolikalt viimistletud tulemus.');
  const includeLabel = text('service_include_label', language === 'en' ? 'Includes' : 'Sisaldab');
  const detailsLabel = text('service_see_details', language === 'en' ? 'See details' : 'Vaata detaile');
  const chooseTimeLabel = text('service_choose_time_cta', language === 'en' ? 'Choose time' : 'Vali aeg');
  const addOnHint = text(
    'service_addon_hint',
    language === 'en' ? 'Want to add nail art or repair? You can add it in the next step.' : 'Soovid lisada disaini voi paranduse? Lisad selle jargmises sammus.'
  );
  const premiumMaterials = text('service_chip_materials', language === 'en' ? 'Premium materials' : 'Premium materjalid');
  const maintenanceHint = text('service_maintenance_hint', language === 'en' ? 'Maintenance every 3-4 weeks' : 'Hooldus iga 3-4 nadala jarel');
  const clientFavourite = text('service_client_favourite', language === 'en' ? 'Client favourite' : 'Kliendi lemmik');
  const detailsPreparation = text(
    'service_modal_preparation',
    language === 'en' ? 'Preparation: arrive with clean nails. If gel removal is needed, add removal service.' : 'Ettevalmistus: tule puhaste kuuntega. Kui vajad geeli eemaldust, lisa see teenusena.'
  );
  const detailsAftercare = text(
    'service_modal_aftercare',
    language === 'en' ? 'Aftercare: use cuticle oil daily and avoid harsh chemicals for long-lasting shine.' : 'Jarelhooldus: kasuta kuuneoli iga paev ja valdi tugevaid kemikaale, et laige pusiks.'
  );
  const detailsResult = text(
    'service_modal_result',
    language === 'en' ? 'Realistic result: final tone and finish are confirmed with Sandra before work starts.' : 'Realistlik tulemus: loplik toon ja viimistlus kinnitatakse Sandraga enne too algust.'
  );
  const whoForLabel = text('service_who_for_label', language === 'en' ? 'Best for' : 'Sobib');
  const fromLabel = text('service_from_label', language === 'en' ? 'Starting from' : 'Alates');

  return (
    <div className="animate-fade-in">
      <div className="mb-7 text-center">
        <p className="mb-2 text-[11px] uppercase tracking-[0.26em] text-[#b77f9f]">Samm 1</p>
        <h2 className="mb-2 text-2xl font-semibold text-[#2f2530]">{t('service.choose')}</h2>
        {selectedStyle ? (
          <div className="mb-2 flex items-center justify-center gap-2 text-sm text-[#c24d86]">
            <span>{selectedStyle.emoji}</span>
            <span>{styleHint}</span>
          </div>
        ) : (
          <p className="text-[#7f6677]">{t('service.getStarted')}</p>
        )}
        <p className="mt-2 text-sm text-[#7f6677]">
          {text('service_step_motivation', language === 'en' ? 'You are one step away from your next beautiful nails.' : 'Oled vaid uhe sammu kaugusel uutest kaunitest kuuntest.')}
        </p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        {loading && services.length === 0 &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`service-loading-${index}`} className="rounded-[24px] border border-[#eedfe8] bg-white px-5 py-5">
              <SkeletonBlock className="mb-2 h-4 w-28 rounded-lg" />
              <SkeletonBlock className="mb-2 h-6 w-2/3 rounded-lg" />
              <SkeletonBlock className="mb-2 h-4 w-full rounded-lg" />
              <SkeletonBlock className="h-4 w-3/4 rounded-lg" />
            </div>
          ))}

        {services.map((service) => {
          const isSelected = selectedService?.id === service.id;
          const rawResult = normalizeCopy(service.resultDescription || service.resultDescriptionEt || service.description || defaultResult);
          const rawDescription = normalizeCopy(service.description || defaultResult);
          const result = rawResult || rawDescription;
          const description = rawDescription && rawDescription.toLowerCase() !== rawResult.toLowerCase() ? rawDescription : '';
          const longevity = cleanPrefixedValue(
            service.longevityDescription || service.longevityDescriptionEt || defaultLongevity,
            ['Pusivus:', 'Püsivus:', 'Stays:', 'Longevity:']
          );
          const suitability = cleanPrefixedValue(
            service.suitabilityNote || service.suitabilityNoteEt || defaultSuitability,
            ['Sobivus:', 'Suitability:', 'Best for:']
          );

          return (
            <article
              key={service.id}
              onClick={() => handleChooseTime(service)}
              className={`group relative overflow-hidden rounded-[24px] border bg-white px-5 py-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_34px_-24px_rgba(116,47,93,0.26)] ${
                isSelected ? 'border-[#d7b0c7] bg-[#fff8fc] shadow-[0_18px_30px_-22px_rgba(116,47,93,0.38)] ring-1 ring-[#f3e6ee]' : 'border-[#eedfe8] hover:border-[#d9becc]'
              } cursor-pointer`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#b89e91]">
                  {service.category === 'nail-art' ? (language === 'en' ? 'Signature detail' : 'Signatuurstiil') : language === 'en' ? 'Premium service' : 'Premium teenus'}
                </p>
                {service.isPopular && (
                  <span className="inline-flex rounded-full bg-[#f9edf4] px-2.5 py-1 text-[11px] font-medium text-[#8e5d79] ring-1 ring-[#eddce7]">
                    {clientFavourite}
                  </span>
                )}
              </div>

              <h3 className="mb-2 text-[1.36rem] font-semibold leading-tight text-[#2f2530]">{service.name}</h3>
              <p className="mb-3 text-sm font-medium leading-6 text-[#5f4a5b]">{result}</p>
              {description && <p className="mb-4 line-clamp-2 text-xs leading-5 text-[#7f6878]">{description}</p>}

              <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-[#715b69]">
                <span className="inline-flex items-center rounded-full bg-[#fff7fc] px-2.5 py-1 ring-1 ring-[#eddde7]">{service.duration} {t('service.minutes')}</span>
                <span className="inline-flex items-center rounded-full bg-[#fff7fc] px-2.5 py-1 ring-1 ring-[#eddde7]">{longevity || maintenanceHint}</span>
                <span className="inline-flex items-center rounded-full bg-[#fff7fc] px-2.5 py-1 ring-1 ring-[#eddde7]">{premiumMaterials}</span>
              </div>

              <p className="mb-4 text-xs text-[#715b69]">
                <span className="font-medium text-[#60495a]">{whoForLabel}: </span>
                {suitability || defaultSuitability}
              </p>

              <div className="rounded-2xl border border-[#eddde7] bg-[#fff8fc] px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#9b7990]">{fromLabel}</p>
                <div className="text-2xl font-semibold leading-none text-[#c24d86]">€{service.price}</div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleChooseTime(service);
                  }}
                  className="w-full rounded-full bg-[#c24d86] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_22px_-16px_rgba(116,47,93,0.62)] transition hover:-translate-y-0.5 hover:bg-[#a93d71]"
                >
                  {chooseTimeLabel}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDetailsService(service);
                  }}
                  className="w-full rounded-full border border-[#eadce5] bg-[#fffafe] px-3 py-2 text-xs font-medium text-[#755f70] hover:bg-[#fff4fb]"
                >
                  {detailsLabel}
                </button>
              </div>

              {isSelected && (
                <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#c24d86] text-white shadow-[0_10px_22px_-12px_rgba(116,47,93,0.7)] animate-scale-in">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="mb-5">
        <p className="mb-2 text-center text-sm font-medium text-[#7d6275]">
          {text('service_addons_title', language === 'en' ? 'Add optional enhancements right away:' : 'Lisa soovi korral kohe juurde:')}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {addOns.slice(0, 4).map((chip) => (
            <span key={chip.id} className="rounded-full border border-[#e8d7e2] bg-[#fffafe] px-3 py-1 text-xs font-medium text-[#7d6275]">
              {chip.name}
            </span>
          ))}
        </div>
      </div>

      <div ref={continueButtonRef} />

      <div className="flex items-center justify-center gap-4 pt-3 text-xs text-[#8b7387]">
        <span>{language === 'en' ? 'Most clients finish booking in under 30 seconds.' : 'Enamik kliente lopetab broneeringu vahem kui 30 sekundiga.'}</span>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.18);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.28s ease-out forwards;
        }
      `}</style>

      {detailsService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => setDetailsService(null)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#eadce5] bg-white shadow-[0_30px_64px_-36px_rgba(95,38,77,0.48)]" onClick={(event) => event.stopPropagation()}>
            <div className="relative h-52 w-full bg-[#f9edf4]">
              {detailsService.imageUrl ? (
                <Image src={detailsService.imageUrl} alt={detailsService.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[#8b7387]">{detailsService.name}</div>
              )}
              <button type="button" onClick={() => setDetailsService(null)} className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#6d5868]">
                {language === 'en' ? 'Close details' : 'Sulge detailid'}
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-[#3f2d3e]">{detailsService.name}</h3>
              <p className="mt-2 text-sm text-[#6d5868]">{detailsService.description || defaultResult}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-[#eadce5] bg-[#fffafe]">
                  <div className="relative h-28 w-full">
                    {detailsService.imageUrl ? <Image src={detailsService.imageUrl} alt={`${detailsService.name} before`} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#8b7387]">Before</div>}
                  </div>
                  <p className="px-3 py-2 text-[11px] font-medium text-[#7d6275]">{language === 'en' ? 'Before consultation' : 'Enne konsultatsiooni'}</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[#eadce5] bg-[#fffafe]">
                  <div className="relative h-28 w-full">
                    {detailsService.imageUrl ? <Image src={detailsService.imageUrl} alt={`${detailsService.name} after`} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#8b7387]">After</div>}
                  </div>
                  <p className="px-3 py-2 text-[11px] font-medium text-[#7d6275]">{language === 'en' ? 'Expected finish' : 'Oodatav viimistlus'}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#eadce5] bg-[#fffafe] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9b7a8d]">{includeLabel}</p>
                  <ul className="mt-2 space-y-1 text-xs text-[#6d5868]">
                    <li>{detailsService.resultDescription || defaultResult}</li>
                    <li>{detailsService.longevityDescription || defaultLongevity}</li>
                    <li>{detailsService.suitabilityNote || defaultSuitability}</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-[#eadce5] bg-[#fffafe] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9b7a8d]">{language === 'en' ? 'Before and after care' : 'Enne ja parast hooldus'}</p>
                  <ul className="mt-2 space-y-1 text-xs text-[#6d5868]">
                    <li>{detailsPreparation}</li>
                    <li>{detailsAftercare}</li>
                    <li>{detailsResult}</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4 text-xs text-[#7d6275]">{addOnHint}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-semibold text-[#c24d86]">€{detailsService.price}</p>
                <button
                  type="button"
                  onClick={() => {
                    handleChooseTime(detailsService);
                    setDetailsService(null);
                  }}
                  className="rounded-full bg-[#c24d86] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a93d71]"
                >
                  {chooseTimeLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceStep;
