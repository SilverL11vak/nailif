'use client';

import Image from 'next/image';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import type { Service, ServiceVariant } from '@/store/booking-types';
import { useServices } from '@/hooks/use-services';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';
import { touchBookingActivity, trackEvent } from '@/lib/analytics-client';
import { trackEvent as trackFunnelEvent } from '@/lib/funnel-track';

function byOrderIndex(a: ServiceVariant, b: ServiceVariant) {
  return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
}

function normalizeCategoryKey(value?: string | null) {
  if (!value) return '';
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const OptionButton = memo(function OptionButton({
  label,
  description,
  price,
  duration,
  selected,
  selectLabel,
  selectedLabel,
  onClick,
}: {
  label: string;
  description?: string;
  price: number;
  duration: number;
  selected: boolean;
  selectLabel: string;
  selectedLabel: string;
  onClick: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 transition-all duration-200 ${
        selected
          ? 'border-[#d7b0c7] bg-[#fff8fc] shadow-[0_12px_20px_-24px_rgba(116,47,93,0.25)]'
          : 'border-[#ece6ea] bg-white hover:border-[#dcc9d4]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#2b2128]">{label}</p>
          {description ? <p className="mt-1 line-clamp-1 text-xs text-[#766a72]">{description}</p> : null}
          <p className="mt-1.5 text-xs font-medium text-[#5f535b]">EUR {price} · {duration} min</p>
        </div>
        <button
          type="button"
          onClick={onClick}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            selected
              ? 'bg-[#8f3d62] text-white'
              : 'border border-[#dac8d2] bg-white text-[#7b3e61] hover:border-[#cfaec0]'
          }`}
          aria-pressed={selected}
        >
          {selected ? selectedLabel : selectLabel}
        </button>
      </div>
    </div>
  );
});

function buildVariantHint(service: Service) {
  const raw =
    service.suitabilityNoteEt ||
    service.suitabilityNote ||
    service.resultDescriptionEt ||
    service.resultDescription ||
    service.descriptionEt ||
    service.description ||
    '';
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const firstSentence = clean.split(/[.!?]/)[0]?.trim() ?? clean;
  if (firstSentence.length <= 82) return firstSentence;
  return `${firstSentence.slice(0, 79).trimEnd()}...`;
}

export function ServiceStep() {
  const { t, language } = useTranslation();
  const { services, categories, loading } = useServices();
  const selectedService = useBookingStore((s) => s.selectedService);
  const selectedVariant = useBookingStore((s) => s.selectedVariant);
  const selectService = useBookingStore((s) => s.selectService);
  const setSelectedVariant = useBookingStore((s) => s.setSelectedVariant);
  const nextStep = useBookingStore((s) => s.nextStep);
  const continueButtonRef = useRef<HTMLDivElement>(null);
  const en = language === 'en';

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const activeCategories = useMemo(() => {
    if (categories.length > 0) return categories;

    const fromServices = new Map<string, { id: string; name: string }>();
    for (const service of services) {
      const id =
        normalizeCategoryKey(service.categoryId) ||
        normalizeCategoryKey(service.categoryNameEt) ||
        normalizeCategoryKey(service.categoryName) ||
        normalizeCategoryKey(service.category);
      if (!id) continue;
      const name = service.categoryName || service.category || (t('_auto.components_booking_ServiceStep.p228'));
      if (!fromServices.has(id)) {
        fromServices.set(id, { id, name });
      }
    }
    return Array.from(fromServices.values());
  }, [categories, en, services]);

  useEffect(() => {
    if (selectedService?.categoryId) {
      setSelectedCategoryId((prev) => prev || selectedService.categoryId || '');
      return;
    }
    if (!selectedCategoryId && activeCategories.length > 0) {
      setSelectedCategoryId(activeCategories[0].id);
    }
  }, [activeCategories, selectedCategoryId, selectedService?.categoryId]);

  const servicesInCategory = useMemo(() => {
    const selectedKey = normalizeCategoryKey(selectedCategoryId);
    const list = services.filter((service) => {
      if (!selectedCategoryId) return true;
      const serviceKeys = [
        normalizeCategoryKey(service.categoryId),
        normalizeCategoryKey(service.categoryNameEt),
        normalizeCategoryKey(service.categoryName),
        normalizeCategoryKey(service.category),
      ].filter(Boolean);
      return serviceKeys.includes(selectedKey);
    });
    return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [selectedCategoryId, services]);

  const canContinue = useMemo(() => {
    if (!selectedService) return false;
    const variants = (selectedService.variants ?? []).filter((variant) => variant.isActive !== false);
    if (variants.length === 0) return true;
    return Boolean(selectedVariant?.id);
  }, [selectedService, selectedVariant?.id]);

  const handleSelectOption = useCallback(
    (service: Service, variant: ServiceVariant | null) => {
      selectService(service);
      setSelectedVariant(variant);
      touchBookingActivity();
      const finalName = variant?.name || variant?.nameEt || service.name;
      const finalPrice = variant?.price ?? service.price;
      const finalDuration = variant?.duration ?? service.duration;
      trackEvent({
        eventType: 'booking_service_selected',
        step: 1,
        serviceId: service.id,
        metadata: {
          serviceName: finalName,
          price: finalPrice,
          duration: finalDuration,
          variantId: variant?.id,
        },
      });
      trackFunnelEvent({
        event: 'service_selected',
        serviceId: service.id,
        language,
        metadata: {
          variantId: variant?.id,
          serviceName: finalName,
          price: finalPrice,
          duration: finalDuration,
          source: 'booking_step_1_hierarchy',
        },
      });

      window.requestAnimationFrame(() => {
        continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },
    [language, selectService, setSelectedVariant]
  );

  return (
    <div className="animate-fade-in pb-2 motion-reduce:animate-none" style={{ animationDuration: '180ms' }}>
      <div className="mb-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a28999]">
          {t('_auto.components_booking_ServiceStep.p229')}
        </p>
        <h2 className="font-brand text-[1.5rem] font-semibold tracking-tight text-[#1a1a1a] sm:text-[1.65rem]">{t('service.choose')}</h2>
        <p className="mt-1 text-[13px] text-[#80737c]">
          {t('_auto.components_booking_ServiceStep.p230')}
        </p>
      </div>

      <section className="rounded-2xl border border-[#eee5ea] bg-white p-4 sm:p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a28999]">{t('_auto.components_booking_ServiceStep.p231')}</p>
        <div className="flex flex-wrap gap-2.5">
          {activeCategories.map((category) => {
            const selected = selectedCategoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  setExpandedServiceId(null);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selected
                    ? 'border-[#d4acc2] bg-[#fff5fb] text-[#7f3559]'
                    : 'border-[#e8dfe5] bg-white text-[#5c5058] hover:border-[#dac8d2]'
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-5 space-y-4">
        {loading && servicesInCategory.length === 0
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={`sk-${index}`} className="rounded-2xl border border-[#efe7ec] p-5">
                <SkeletonBlock className="mb-3 h-6 w-2/5 rounded" />
                <SkeletonBlock className="h-4 w-3/5 rounded" />
              </div>
            ))
          : null}

        {!loading && servicesInCategory.length === 0 ? (
          <div className="rounded-2xl border border-[#f0e6ec] bg-[#fffafd] px-4 py-5 text-sm text-[#726672]">
            {t('_auto.components_booking_ServiceStep.p232')}
          </div>
        ) : null}

        {servicesInCategory.map((service) => {
          const hasOptions = (service.variants ?? []).some((variant) => variant.isActive !== false);
          const isExpanded = expandedServiceId === service.id;
          const isServiceSelected = selectedService?.id === service.id;
          const description = service.description?.trim() ?? '';
          const isDescriptionLong = description.length > 240;
          const isDescriptionExpanded = Boolean(expandedDescriptions[service.id]);

          return (
            <article key={service.id} className="overflow-hidden rounded-2xl border border-[#ece4ea] bg-white shadow-[0_8px_20px_-18px_rgba(29,20,26,0.35)]">
              <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="relative aspect-[4/3] bg-[#f4edf1] md:aspect-auto md:h-full">
                  {service.imageUrl ? (
                    <Image
                      src={service.imageUrl}
                      alt={service.name}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 220px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#8f828a]">
                      {t('_auto.components_booking_ServiceStep.p233')}
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-brand text-[1.25rem] font-semibold tracking-tight text-[#221a20]">{service.name}</h3>
                      {description ? (
                        <div className="mt-1 max-w-2xl">
                          <p
                            className={`text-sm leading-relaxed text-[#736772] ${
                              isDescriptionLong && !isDescriptionExpanded ? 'line-clamp-4' : ''
                            }`}
                          >
                            {description}
                          </p>
                          {isDescriptionLong ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDescriptions((prev) => ({
                                  ...prev,
                                  [service.id]: !prev[service.id],
                                }))
                              }
                              className="mt-1.5 text-xs font-semibold text-[#8f3d62] underline underline-offset-2"
                              aria-expanded={isDescriptionExpanded}
                              aria-label={
                                isDescriptionExpanded
                                  ? t('_auto.components_booking_ServiceStep.p234')
                                  : t('_auto.components_booking_ServiceStep.p235')
                              }
                            >
                              {isDescriptionExpanded
                                ? t('_auto.components_booking_ServiceStep.p236')
                                : t('_auto.components_booking_ServiceStep.p237')}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[#2b2128]">EUR {service.price}</p>
                      <p className="text-xs text-[#7f707a]">{service.duration} min</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (hasOptions) {
                          setExpandedServiceId((prev) => (prev === service.id ? null : service.id));
                          if (selectedService?.id !== service.id) {
                            setSelectedVariant(null);
                          }
                          return;
                        }
                        handleSelectOption(service, null);
                      }}
                      className="btn-primary btn-small px-5 text-sm"
                    >
                      {hasOptions
                        ? t('_auto.components_booking_ServiceStep.p238')
                        : isServiceSelected
                          ? t('_auto.components_booking_ServiceStep.p239')
                          : t('_auto.components_booking_ServiceStep.p240')}
                    </button>
                  </div>

                </div>
              </div>

              {hasOptions && isExpanded ? (
                <div className="border-t border-[#f0e7ec] bg-[#fffdfd] px-4 pb-4 pt-4 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a08998]">
                    {t('_auto.components_booking_ServiceStep.p241')}
                  </p>
                  <p className="mt-1 text-xs text-[#7b6d77]">
                    {en ? `Options for ${service.name}` : `Variandid teenusele: ${service.name}`}
                  </p>
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    {(service.variants ?? [])
                      .filter((variant) => variant.isActive !== false)
                      .sort(byOrderIndex)
                      .map((variant) => (
                        <OptionButton
                          key={variant.id}
                          label={variant.name || variant.nameEt || (t('_auto.components_booking_ServiceStep.p242'))}
                          description={buildVariantHint(service)}
                          price={variant.price}
                          duration={variant.duration}
                          selected={selectedService?.id === service.id && selectedVariant?.id === variant.id}
                          selectLabel={t('_auto.components_booking_ServiceStep.p243')}
                          selectedLabel={t('_auto.components_booking_ServiceStep.p244')}
                          onClick={() => handleSelectOption(service, variant)}
                        />
                      ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {canContinue ? (
        <div className="mt-6 rounded-2xl border border-[#efe4eb] bg-[#fff9fc] px-4 py-4">
          <p className="text-sm text-[#6f5f69]">
            {t('_auto.components_booking_ServiceStep.p245')}
          </p>
        </div>
      ) : null}

      <div ref={continueButtonRef} />

      {canContinue ? (
        <div className="mt-6 hidden lg:block">
          <button
            type="button"
            onClick={nextStep}
            className="w-full rounded-[14px] bg-[linear-gradient(135deg,#8f3d62_0%,#9f456f_55%,#7f3559_100%)] py-3.5 text-[14px] font-semibold text-white shadow-[0_12px_28px_-14px_rgba(159,69,111,0.45)]"
          >
            {t('_auto.components_booking_ServiceStep.p246')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ServiceStep;
