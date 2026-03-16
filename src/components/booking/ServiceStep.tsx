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

const serviceVisuals: Record<string, { accent: string; detail: string }> = {
  'gel-manicure': { accent: 'from-[#f5e5de] to-[#d9a89c]', detail: 'bg-[#fff7f3]' },
  'acrylic-extensions': { accent: 'from-[#ead8e7] to-[#c6a6bf]', detail: 'bg-[#faf5f9]' },
  'luxury-spa-manicure': { accent: 'from-[#efe3d8] to-[#ceb29a]', detail: 'bg-[#fdf8f3]' },
  'gel-pedicure': { accent: 'from-[#e3e6ef] to-[#b7c2da]', detail: 'bg-[#f6f8fc]' },
  'nail-art': { accent: 'from-[#f0dfd6] to-[#d9b0a3]', detail: 'bg-[#fcf7f4]' },
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
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
  const lastBookedHint = text('service_last_booked_hint', language === 'en' ? 'Popular choice this week' : 'Selle nadala populaarne valik');
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
  const staysLabel = text('service_stays_label', language === 'en' ? 'Stays' : 'Pusib');
  const fromLabel = text('service_from_label', language === 'en' ? 'Starting from' : 'Alates');

  return (
    <div className="animate-fade-in">
      <div className="mb-7 text-center">
        <p className="mb-2 text-[11px] uppercase tracking-[0.26em] text-[#b08979]">Samm 1</p>
        <h2 className="mb-2 text-2xl font-semibold text-gray-800">{t('service.choose')}</h2>
        {selectedStyle ? (
          <div className="mb-2 flex items-center justify-center gap-2 text-sm text-[#b58373]">
            <span>{selectedStyle.emoji}</span>
            <span>{styleHint}</span>
          </div>
        ) : (
          <p className="text-gray-500">{t('service.getStarted')}</p>
        )}
        <p className="mt-2 text-sm text-[#8c7568]">
          {text('service_step_motivation', language === 'en' ? 'You are one step away from your next beautiful nails.' : 'Oled vaid uhe sammu kaugusel uutest kaunitest kuuntest.')}
        </p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        {loading && services.length === 0 &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`service-loading-${index}`} className="rounded-[26px] border border-[#efe5de] bg-white px-5 py-5">
              <SkeletonBlock className="mb-4 h-14 w-14 rounded-[18px]" />
              <SkeletonBlock className="mb-2 h-4 w-28 rounded-lg" />
              <SkeletonBlock className="mb-2 h-6 w-2/3 rounded-lg" />
              <SkeletonBlock className="mb-2 h-4 w-full rounded-lg" />
              <SkeletonBlock className="h-4 w-3/4 rounded-lg" />
            </div>
          ))}

        {services.map((service) => {
            const isSelected = selectedService?.id === service.id;
            const visual = serviceVisuals[service.id] || serviceVisuals['gel-manicure'];
            const result = service.resultDescription || service.resultDescriptionEt || service.description || defaultResult;
            const longevity = service.longevityDescription || service.longevityDescriptionEt || defaultLongevity;
            const suitability = service.suitabilityNote || service.suitabilityNoteEt || defaultSuitability;

            return (
              <article
                key={service.id}
                onClick={() => handleChooseTime(service)}
                className={`group relative overflow-hidden rounded-[26px] border px-5 py-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_34px_-24px_rgba(72,49,35,0.45)] ${
                  isSelected ? 'border-[#d7b0a1] bg-[#fffaf7] shadow-[0_18px_30px_-22px_rgba(72,49,35,0.45)] ring-1 ring-[#f2e5de]' : 'border-[#efe5de] bg-white hover:border-[#d9beaf]'
                } cursor-pointer`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,165,154,0.14),transparent_40%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br ${visual.accent} shadow-[inset_0_1px_1px_rgba(255,255,255,0.75),0_12px_18px_-14px_rgba(72,49,35,0.6)] transition duration-300 group-hover:brightness-105`}>
                  <div className={`h-10 w-10 rounded-[14px] ${visual.detail} p-2 shadow-inner`}>
                    <div className="flex h-full items-end gap-1">
                      <span className="h-4 w-1.5 rounded-full bg-white/90" />
                      <span className="h-6 w-1.5 rounded-full bg-white/80" />
                      <span className="h-5 w-1.5 rounded-full bg-white/70" />
                    </div>
                  </div>
                </div>

                {service.isPopular && (
                  <span className="absolute left-4 top-4 rounded-full bg-[#f7efe9] px-2.5 py-1 text-[11px] font-medium text-[#8e6f61] ring-1 ring-[#efe2da]">
                    {clientFavourite}
                  </span>
                )}

                <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b89e91]">
                  {service.category === 'nail-art' ? (language === 'en' ? 'Signature detail' : 'Signatuurstiil') : language === 'en' ? 'Premium service' : 'Premium teenus'}
                </p>

                <div className="mb-2 flex items-start justify-between gap-3 pr-10">
                  <h3 className="text-lg font-semibold text-gray-800">{service.name}</h3>
                </div>

                <p className="mb-2 text-sm font-medium leading-6 text-[#6a5247]">{result}</p>
                <p className="mb-3 line-clamp-2 text-xs text-[#887469]">{service.description || defaultResult}</p>

                <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-[#7a655b]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fcf4ef] px-2.5 py-1 ring-1 ring-[#efe1d8]">⏱ {service.duration} {t('service.minutes')}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fcf4ef] px-2.5 py-1 ring-1 ring-[#efe1d8]">🔁 {maintenanceHint}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fcf4ef] px-2.5 py-1 ring-1 ring-[#efe1d8]">💎 {premiumMaterials}</span>
                </div>

                <div className="mb-3 space-y-1 text-xs text-[#7a655b]">
                  <p><span className="font-medium text-[#69564d]">{whoForLabel}: </span>{suitability}</p>
                  <p><span className="font-medium text-[#69564d]">{staysLabel}: </span>{longevity}</p>
                  {service.isPopular && <p className="font-medium text-[#986f60]">{lastBookedHint}</p>}
                </div>

                <div className="mt-auto rounded-2xl border border-[#f0e2d8] bg-[#fff8f3] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#a18374]">{fromLabel}</p>
                  <div className="text-2xl font-semibold leading-none text-[#b58373]">EUR {service.price}</div>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleChooseTime(service);
                    }}
                    className="w-full rounded-full bg-[#b58373] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_22px_-16px_rgba(90,61,46,0.75)] transition hover:-translate-y-0.5 hover:bg-[#a87463]"
                  >
                    {chooseTimeLabel}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDetailsService(service);
                    }}
                    className="w-full rounded-full border border-[#ead9cf] bg-[#fffaf7] px-3 py-2 text-xs font-medium text-[#7f695f] hover:bg-[#fff4ee]"
                  >
                    {detailsLabel}
                  </button>
                </div>

                {isSelected && (
                  <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#b58373] text-white shadow-[0_10px_22px_-12px_rgba(99,71,56,0.9)] animate-scale-in">
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
        <p className="mb-2 text-center text-sm font-medium text-[#7d685d]">
          {text('service_addons_title', language === 'en' ? 'Add optional enhancements right away:' : 'Lisa soovi korral kohe juurde:')}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {addOns.slice(0, 4).map((chip) => (
            <span key={chip.id} className="rounded-full border border-[#e8d7cf] bg-[#fffaf7] px-3 py-1 text-xs font-medium text-[#7d685d]">
              {chip.name}
            </span>
          ))}
        </div>
      </div>

      <div ref={continueButtonRef} />

      <div className="flex items-center justify-center gap-4 pt-3 text-xs text-[#9e8a80]">
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
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#ead9cf] bg-white shadow-[0_30px_64px_-36px_rgba(56,34,24,0.75)]" onClick={(event) => event.stopPropagation()}>
            <div className="relative h-52 w-full bg-[#f7efe9]">
              {detailsService.imageUrl ? (
                <Image src={detailsService.imageUrl} alt={detailsService.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[#8b6c5e]">{detailsService.name}</div>
              )}
              <button type="button" onClick={() => setDetailsService(null)} className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#6f5a50]">
                {language === 'en' ? 'Close details' : 'Sulge detailid'}
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-[#3c2f28]">{detailsService.name}</h3>
              <p className="mt-2 text-sm text-[#6f5a50]">{detailsService.description || defaultResult}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-[#eadcd2] bg-[#fff9f5]">
                  <div className="relative h-28 w-full">
                    {detailsService.imageUrl ? <Image src={detailsService.imageUrl} alt={`${detailsService.name} before`} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#8b6c5e]">Before</div>}
                  </div>
                  <p className="px-3 py-2 text-[11px] font-medium text-[#7a655b]">{language === 'en' ? 'Before consultation' : 'Enne konsultatsiooni'}</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[#eadcd2] bg-[#fff9f5]">
                  <div className="relative h-28 w-full">
                    {detailsService.imageUrl ? <Image src={detailsService.imageUrl} alt={`${detailsService.name} after`} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#8b6c5e]">After</div>}
                  </div>
                  <p className="px-3 py-2 text-[11px] font-medium text-[#7a655b]">{language === 'en' ? 'Expected finish' : 'Oodatav viimistlus'}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#eadcd2] bg-[#fff9f5] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a7c6d]">{includeLabel}</p>
                  <ul className="mt-2 space-y-1 text-xs text-[#6f5a50]">
                    <li>{detailsService.resultDescription || defaultResult}</li>
                    <li>{detailsService.longevityDescription || defaultLongevity}</li>
                    <li>{detailsService.suitabilityNote || defaultSuitability}</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-[#eadcd2] bg-[#fff9f5] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a7c6d]">{language === 'en' ? 'Before and after care' : 'Enne ja parast hooldus'}</p>
                  <ul className="mt-2 space-y-1 text-xs text-[#6f5a50]">
                    <li>{detailsPreparation}</li>
                    <li>{detailsAftercare}</li>
                    <li>{detailsResult}</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4 text-xs text-[#7f695f]">{addOnHint}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-semibold text-[#b58373]">EUR {detailsService.price}</p>
                <button
                  type="button"
                  onClick={() => {
                    handleChooseTime(detailsService);
                    setDetailsService(null);
                  }}
                  className="rounded-full bg-[#b58373] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a87463]"
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
