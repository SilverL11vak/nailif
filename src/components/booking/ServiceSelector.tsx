'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { Service } from '@/store/booking-types';
import { useServices } from '@/hooks/use-services';

interface ServiceSelectorProps {
  onSelect: (service: Service) => void;
  selectedService?: Service | null;
}

export function ServiceSelector({ onSelect, selectedService }: ServiceSelectorProps) {
  const { t } = useTranslation();
  const { services, loading } = useServices();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (service: Service) => {
    onSelect(service);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-colors duration-200 hover:border-[#D4A59A] focus:border-[#D4A59A] focus:outline-none focus:ring-2 focus:ring-[#D4A59A]/20 disabled:cursor-wait"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {selectedService ? (
            <>
              <span className="font-medium text-gray-700">{selectedService.name}</span>
              <span className="text-sm text-gray-400">• {selectedService.duration} {t('common.minutes')}</span>
            </>
          ) : loading ? (
            <span className="premium-skeleton-card h-4 w-40 rounded-lg" />
          ) : (
            <span className="text-gray-400">{t('widget.selectService')}</span>
          )}
        </div>
        <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border-2 border-gray-100 bg-white shadow-lg">
          {loading && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="premium-skeleton-card h-14 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!loading && services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => handleSelect(service)}
              className={`flex w-full items-center justify-between px-4 py-3 transition-colors duration-150 hover:bg-[#FFF9F5] focus:bg-[#FFF9F5] ${selectedService?.id === service.id ? 'bg-[#FFF9F5]' : ''}`}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium text-gray-700">{service.name}</span>
                <span className="text-sm text-gray-400">{service.duration} {t('common.minutes')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#D4A59A]">EUR {service.price}</span>
                {service.isPopular && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {t('slot.popular')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ServiceSelector;
