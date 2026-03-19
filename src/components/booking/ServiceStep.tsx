'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import type { Service, ServiceVariant } from '@/store/booking-types';
import { useServices } from '@/hooks/use-services';
import { useBookingContent } from '@/hooks/use-booking-content';
import { useBookingAddOns } from '@/hooks/use-booking-addons';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';
import { trackEvent, touchBookingActivity } from '@/lib/analytics-client';
import { trackEvent as trackFunnelEvent } from '@/lib/funnel-track';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';
import { recommendProductsForService, type CareProductLite } from '@/lib/care-funnel';

function toIsoDate(date: Date) { return date.toISOString().slice(0, 10); }

const categoryTypeLabel = (category: string | undefined, en: boolean) => {
  const c = (category ?? '').toLowerCase();
  if (c === 'nail-art') return en ? 'Nail art' : 'Küünekunst';
  if (c === 'manicure') return en ? 'Manicure' : 'Maniküür';
  if (c === 'pedicure') return en ? 'Pedicure' : 'Pediküür';
  if (c === 'extensions') return en ? 'Extensions' : 'Pikendused';
  return category?.trim() || (en ? 'Service' : 'Teenus');
};

type ServiceChoice = {
  key: string;
  service: Service;
  variant: ServiceVariant | null;
  title: string;
  parentTitle: string | null;
  duration: number;
  price: number;
  benefit: string;
  categoryLabel: string;
};

const ServiceChoiceCard = memo(function ServiceChoiceCard({
  choice,
  isSelected,
  onSelect,
  en,
}: {
  choice: ServiceChoice;
  isSelected: boolean;
  onSelect: (service: Service, variant: ServiceVariant | null) => void;
  en: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(choice.service, choice.variant)}
      className={`group relative w-full overflow-hidden rounded-[18px] border bg-white p-5 text-left transition-all duration-200 active:scale-[0.985] ${
        isSelected
          ? 'service-selected-confirm border-[#ddb7cb] bg-[#fff8fb] shadow-[0_14px_32px_-22px_rgba(159,69,111,0.28)]'
          : 'border-[#ece6ea] shadow-[0_6px_20px_-18px_rgba(34,25,31,0.2)] hover:-translate-y-0.5 hover:border-[#dfc7d5] hover:shadow-[0_18px_34px_-22px_rgba(34,25,31,0.28)]'
      }`}
    >
      {isSelected && (
        <span className="absolute right-4 top-4 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#9f456f] text-white">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9f8f98]">{choice.categoryLabel}</p>
          <h3 className="mt-1.5 font-brand text-[24px] font-semibold leading-[1.08] tracking-[-0.012em] text-[#20171d]">
            {choice.title}
          </h3>
          {choice.parentTitle ? <p className="mt-0.5 text-[12px] text-[#8e7d87]">{choice.parentTitle}</p> : null}
          <p className="mt-2 text-[12px] text-[#887983]">{choice.duration} {en ? 'min' : 'min'}</p>
        </div>

        <div className="shrink-0 text-right">
          <p className={`text-[28px] font-bold leading-none tabular-nums ${isSelected ? 'text-[#9f456f]' : 'text-[#2a2228]'}`}>
            {`€${choice.price}`}
          </p>
          <span
            className={`mt-3 inline-flex rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
              isSelected
                ? 'bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] text-white shadow-[0_10px_22px_-14px_rgba(159,69,111,0.5)]'
                : 'border border-[#dfd1d8] bg-white text-[#6c5e67]'
            }`}
          >
            {isSelected ? (en ? '✓ Selected' : '✓ Valitud') : (en ? 'Select' : 'Vali')}
          </span>
        </div>
      </div>

      <div className="mt-3 h-px bg-[#f0e7ec]" />

      <p className="mt-3 text-[13px] leading-relaxed text-[#74656f]">{choice.benefit}</p>
    </button>
  );
});

export function ServiceStep() {
  const { t, language } = useTranslation();
  const { services, loading } = useServices();
  const { text } = useBookingContent();
  const selectedService = useBookingStore((s) => s.selectedService);
  const { addOns } = useBookingAddOns(selectedService?.id ?? null);
  const selectedVariant = useBookingStore((s) => s.selectedVariant);
  const selectService = useBookingStore((s) => s.selectService);
  const setSelectedVariant = useBookingStore((s) => s.setSelectedVariant);
  const nextStep = useBookingStore((s) => s.nextStep);
  const selectedStyle = useBookingStore((s) => s.selectedStyle);
  const selectedProducts = useBookingStore((s) => s.selectedProducts);
  const addProductToBooking = useBookingStore((s) => s.addProductToBooking);
  const removeProductFromBooking = useBookingStore((s) => s.removeProductFromBooking);
  const continueButtonRef = useRef<HTMLDivElement>(null);
  const servicesViewAtRef = useRef<number | null>(null);
  const [products, setProducts] = useState<CareProductLite[]>([]);

  const en = language === 'en';

  useEffect(() => {
    if (loading || services.length === 0) return;
    if (servicesViewAtRef.current == null) servicesViewAtRef.current = Date.now();
    trackBehaviorEvent('booking_services_view', { numberOfServicesVisible: services.length });
  }, [loading, services.length]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const response = await fetch(`/api/products?lang=${language}`, { cache: 'force-cache' });
        if (!response.ok) return;
        const data = (await response.json()) as { products?: CareProductLite[] };
        if (mounted && Array.isArray(data.products)) setProducts(data.products);
      } catch {
        // best-effort recommendations
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [language]);

  const prefetchSlots = () => {
    const now = new Date(); const to = new Date(now); to.setDate(to.getDate() + 40);
    void fetch(`/api/slots?from=${toIsoDate(now)}&to=${toIsoDate(to)}`).catch(() => null);
  };

  const handleChooseTime = useCallback((service: Service, variant?: ServiceVariant | null) => {
    const hesitationTime = servicesViewAtRef.current != null ? Math.max(0, Math.round((Date.now() - servicesViewAtRef.current) / 1000)) : undefined;
    const effectiveName = variant?.name ?? service.name;
    const effectivePrice = variant?.price ?? service.price;
    const effectiveDuration = variant?.duration ?? service.duration;
    trackBehaviorEvent('booking_service_selected', { serviceId: service.id, servicePrice: effectivePrice, variantId: variant?.id, hesitationTime });
    selectService(service);
    setSelectedVariant(variant ?? null);
    try {
      localStorage.setItem(
        'nailify_care_profile_v1',
        JSON.stringify({
          lastServiceId: service.id,
          lastServiceName: effectiveName,
          lastServiceCategory: service.category ?? null,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // ignore storage issues
    }
    touchBookingActivity();
    trackEvent({ eventType: 'booking_service_selected', step: 1, serviceId: service.id, metadata: { serviceName: effectiveName, duration: effectiveDuration, price: effectivePrice, variantId: variant?.id } });
    trackFunnelEvent({ event: 'service_selected', serviceId: service.id, metadata: { serviceName: effectiveName, duration: effectiveDuration, price: effectivePrice, source: 'booking_step_1' }, language });
    prefetchSlots();
    window.requestAnimationFrame(() => { continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  }, [language, selectService, setSelectedVariant]);

  const getBenefitLine = useCallback((service: Service, duration: number) => {
    const localized =
      (en ? service.suitabilityNoteEn : service.suitabilityNoteEt) ??
      service.suitabilityNote ??
      (en ? service.resultDescriptionEn : service.resultDescriptionEt) ??
      service.resultDescription;
    if (localized?.trim()) return localized.trim();
    if (service.isPopular) return en ? 'Most popular choice' : 'Kõige populaarsem valik';
    if (duration <= 45) return en ? 'Quick service' : 'Kiire hooldus';
    if (duration >= 90) return en ? 'Long-lasting result' : 'Kauakestev tulemus';
    return en ? 'Great for first-time guests' : 'Sobib esmakordseks hoolduseks';
  }, [en]);

  const groupedChoices = useMemo(() => {
    const grouped = new Map<string, { heading: string; choices: ServiceChoice[] }>();
    for (const service of services) {
      const categoryKey = (service.category || 'service').toLowerCase();
      if (!grouped.has(categoryKey)) {
        grouped.set(categoryKey, { heading: categoryTypeLabel(service.category, en), choices: [] });
      }
      const group = grouped.get(categoryKey)!;
      const variants = service.variants ?? [];
      if (variants.length > 0) {
        for (const variant of variants) {
          group.choices.push({
            key: variant.id,
            service,
            variant,
            title: variant.name || variant.nameEt || service.name,
            parentTitle: service.name,
            duration: variant.duration,
            price: variant.price,
            benefit: getBenefitLine(service, variant.duration),
            categoryLabel: categoryTypeLabel(service.category, en),
          });
        }
      } else {
        group.choices.push({
          key: service.id,
          service,
          variant: null,
          title: service.name,
          parentTitle: null,
          duration: service.duration,
          price: service.price,
          benefit: getBenefitLine(service, service.duration),
          categoryLabel: categoryTypeLabel(service.category, en),
        });
      }
    }
    return Array.from(grouped.values());
  }, [en, getBenefitLine, services]);

  const styleHint = en ? 'Style selected — we will match the right service.' : 'Stiil on valitud — leiame sobiva teenuse.';
  const selectedProductIds = useMemo(() => selectedProducts.map((p) => p.productId), [selectedProducts]);
  const serviceCareRecommendations = useMemo(
    () => recommendProductsForService(products, selectedService, 3, selectedProductIds),
    [products, selectedProductIds, selectedService]
  );

  return (
    <div className="animate-fade-in pb-2 motion-reduce:animate-none" style={{ animationDuration: '200ms' }}>
      <div className="mb-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a28999]">
          {en ? 'Step 1 of 3 — Choose your service' : 'Samm 1 / 3 — Vali teenus'}
        </p>
        <h2 className="font-brand text-[1.5rem] font-semibold tracking-tight text-[#1a1a1a] sm:text-[1.65rem]">
          {t('service.choose')}
        </h2>
        {selectedStyle ? (
          <p className="mt-2 flex items-center gap-2 text-[13px] text-[#9d5078]">
            <span>{selectedStyle.emoji}</span>
            <span>{styleHint}</span>
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-[#888]">{t('service.getStarted')}</p>
        )}
      </div>

      <div className="space-y-6">
        {loading && services.length === 0 &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-${i}`} className="rounded-[18px] border border-[#f0f0f0] p-5">
              <SkeletonBlock className="mb-3 h-4 w-3/4 rounded" />
              <SkeletonBlock className="h-10 w-full rounded-lg" />
            </div>
          ))}

        {groupedChoices.map((group) => (
          <section key={group.heading} className="space-y-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a28999]">{group.heading}</p>
            <div className="grid gap-3.5">
              {group.choices.map((choice) => {
                const isSelected = selectedService?.id === choice.service.id && (choice.variant ? selectedVariant?.id === choice.variant.id : selectedVariant == null);
                return (
                  <ServiceChoiceCard
                    key={choice.key}
                    choice={choice}
                    isSelected={isSelected}
                    onSelect={handleChooseTime}
                    en={en}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {selectedService && serviceCareRecommendations.length > 0 && (
        <section className="mt-6 rounded-[16px] border border-[#efe3e9] bg-[#fffafd] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9d7a90]">
                {en ? 'Technician recommendation' : 'Tehniku soovitus'}
              </p>
              <p className="mt-0.5 text-[12px] text-[#6f5d6d]">
                {en ? 'Recommended care products for this service' : 'Selle teenuse soovitatud hooldustooted'}
              </p>
            </div>
            <span className="rounded-full border border-[#ead8e2] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#7c4363]">
              {en ? 'Optional' : 'Valikuline'}
            </span>
          </div>
          <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1">
            {serviceCareRecommendations.map((product) => {
              const added = selectedProductIds.includes(product.id);
              return (
                <label
                  key={product.id}
                  className={`min-w-[200px] snap-start rounded-[14px] border p-3 transition ${
                    added ? 'border-[#ddb7cb] bg-white' : 'border-[#eee4ea] bg-white/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-[#2f2530]">{product.name}</p>
                      <p className="mt-1 text-[11px] text-[#7a6a72]">€{product.price}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={added}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          addProductToBooking({
                            productId: product.id,
                            name: product.name,
                            unitPrice: product.price,
                            imageUrl: product.imageUrl ?? null,
                            deliveryMethod: 'pickup_visit',
                          });
                        } else {
                          removeProductFromBooking(product.id);
                        }
                      }}
                      className="h-4 w-4 accent-[#9f456f]"
                    />
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[#8a7a85]">{product.description ?? ''}</p>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {addOns.length > 0 && (
        <div className="mt-6 rounded-[14px] border border-[#f0f0f0] bg-[#fafafa] px-4 py-3">
          <p className="mb-2 text-center text-[11px] font-medium text-[#888]">
            {text('service_addons_title', en ? 'Optional extras available after selection' : 'Valikulised lisad peale valikut')}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {addOns.slice(0, 4).map((chip) => (
              <span key={chip.id} className="rounded-full border border-[#eee] bg-white px-2.5 py-0.5 text-[10px] font-medium text-[#777]">{chip.name}</span>
            ))}
          </div>
        </div>
      )}

      <div ref={continueButtonRef} />

      {selectedService && (
        <div className="mt-6 hidden lg:block">
          <button
            type="button"
            onClick={nextStep}
            className="w-full rounded-[14px] bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] py-3.5 text-[14px] font-semibold text-white shadow-[0_12px_28px_-14px_rgba(159,69,111,0.45)]"
          >
            {en ? 'Continue to time selection' : 'Jätka aja valimisse'}
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes serviceSelectedConfirm {
          0% { transform: scale(0.996); }
          65% { transform: scale(1.006); }
          100% { transform: scale(1); }
        }
        .service-selected-confirm {
          animation: serviceSelectedConfirm 240ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .service-selected-confirm { animation: none; }
        }
      `}</style>
    </div>
  );
}

export default ServiceStep;
