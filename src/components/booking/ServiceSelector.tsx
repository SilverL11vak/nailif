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
  const { services } = useServices();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
        className="w-full flex items-center justify-between px-4 py-3 
                   bg-white border-2 border-gray-200 rounded-xl
                   hover:border-[#D4A59A] focus:border-[#D4A59A] 
                   focus:outline-none focus:ring-2 focus:ring-[#D4A59A]/20
                   transition-colors duration-200"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {selectedService ? (
            <>
              <span className="text-gray-700 font-medium">
                {selectedService.name}
              </span>
              <span className="text-gray-400 text-sm">
                • {selectedService.duration} {t('common.minutes')}
              </span>
            </>
          ) : (
            <span className="text-gray-400">{t('widget.selectService')}</span>
          )}
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-100 
                        rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => handleSelect(service)}
              className={`w-full flex items-center justify-between px-4 py-3 
                         hover:bg-[#FFF9F5] focus:bg-[#FFF9F5] 
                         transition-colors duration-150
                         ${selectedService?.id === service.id ? 'bg-[#FFF9F5]' : ''}`}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium text-gray-700">{service.name}</span>
                <span className="text-sm text-gray-400">{service.duration} {t('common.minutes')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#D4A59A]">€{service.price}</span>
                {service.isPopular && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
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
