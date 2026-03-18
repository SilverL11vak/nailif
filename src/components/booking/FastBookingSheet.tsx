'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import type { Service, TimeSlot, ContactInfo } from '@/store/booking-types';
import { useBookingStore } from '@/store/booking-store';

interface FastBookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service;
  slot: TimeSlot;
  onSwitchToFull?: () => void;
}

export function FastBookingSheet({
  isOpen, 
  onClose, 
  service, 
  slot,
  onSwitchToFull 
}: FastBookingSheetProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const phonePrefix = '+372';
  const [formData, setFormData] = useState<ContactInfo>({
    firstName: '',
    lastName: '',
    phone: phonePrefix,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setContactInfo, setStatus, calculateTotals } = useBookingStore();

  // Reset state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setError(null);
      setIsLoading(false);
      setFormData((prev) => ({
        ...prev,
        phone: prev.phone?.trim() ? prev.phone : phonePrefix,
      }));
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate
      if (!formData.firstName.trim()) {
        throw new Error(t('contact.required'));
      }
      if (!formData.phone.trim()) {
        throw new Error(t('contact.required'));
      }

      // Save contact info
      setContactInfo(formData);
      calculateTotals();

      const response = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'fast',
          service,
          slot,
          contact: formData,
          addOns: [],
          totalPrice: service.price,
          totalDuration: service.duration,
        }),
      });

      if (!response.ok) {
        throw new Error(t('error.somethingWrong'));
      }

      const data = (await response.json()) as { checkoutUrl?: string };
      if (!data.checkoutUrl) {
        throw new Error('Missing Stripe checkout URL');
      }
      setStatus('confirming');
      window.location.href = data.checkoutUrl;

    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.somethingWrong'));
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const trimmed = value.replace(/\s+/g, ' ').trimStart();
      if (!trimmed) {
        setFormData((prev) => ({ ...prev, phone: phonePrefix }));
        return;
      }
      if (!trimmed.startsWith(phonePrefix)) {
        const normalized = trimmed.startsWith('+') ? trimmed : `${phonePrefix} ${trimmed.replace(/^\+?/, '')}`;
        setFormData((prev) => ({ ...prev, phone: normalized }));
        return;
      }
      // Prevent deleting the prefix (keep at least "+372")
      if (trimmed.length < phonePrefix.length) {
        setFormData((prev) => ({ ...prev, phone: phonePrefix }));
        return;
      }
      setFormData((prev) => ({ ...prev, phone: trimmed }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-[#f0dfe9] bg-[linear-gradient(180deg,#fff_0%,#fff7fc_100%)] shadow-[0_-24px_48px_-24px_rgba(117,52,97,0.35)] animate-slide-up">
        {/* Drag Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-[#e8d7e2]" />
        </div>

        {isSuccess ? (
          // Success State - Dopamine State
          <div className="px-6 pb-12 text-center">
            {/* Animated Success Circle with Sparkle */}
            <div className="relative inline-flex mb-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-scale-in">
                <svg className="w-12 h-12 text-green-500 animate-check" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* Sparkle effects */}
              <span className="absolute -top-2 -right-2 text-2xl animate-sparkle-1">*</span>
              <span className="absolute -bottom-1 -left-2 text-xl animate-sparkle-2">*</span>
            </div>
            
            {/* Emotional Headline */}
            <h3 className="mb-2 text-2xl font-semibold text-[#3f2d3e]">
              {t('fastBook.requestSent')}
            </h3>
            <p className="mb-2 text-[#8b7387]">
              {t('success.ref')}: #NF-{Math.random().toString(36).substring(2, 8).toUpperCase()}
            </p>
            {/* Reassurance */}
            <p className="text-sm text-green-600 font-medium">
              {t('fastBook.willReceiveConfirmation')}
            </p>
            
            {/* Add to Calendar CTA */}
            <button 
              onClick={() => router.push('/success')}
              className="mt-6 rounded-full bg-[linear-gradient(120deg,#d4669e_0%,#c24d86_52%,#a93d71_100%)] px-6 py-3 font-medium text-white shadow-[0_20px_30px_-20px_rgba(116,47,93,0.66)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_34px_-20px_rgba(116,47,93,0.76)]"
            >
              {t('fastBook.addToCalendar')}
            </button>
          </div>
        ) : (
          // Form State
          <>
            {/* Header */}
            <div className="border-b border-[#f0e1ea] px-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#3f2d3e]">
                    {t('fastBook.quickBook')}
                  </h3>
                  <p className="text-sm text-[#8b7387]">
                    {service.name} | {service.duration} {t('common.minutes')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-[#a1889b] transition hover:bg-[#fff2fa] hover:text-[#7b5f73]"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Time Display */}
              <div className="mt-4 rounded-xl border border-[#efdce7] bg-[#fff7fc] p-4">
                <div className="flex items-center gap-2 text-[#b04b80]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">
                    {new Date(slot.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'short' 
                    })} {t('confirm.at')} {slot.time}
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              <div>
                <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-[#5f4b5f]">
                  {t('contact.firstName')} *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder={t('fastBook.yourFirstName')}
                  className="w-full rounded-xl border-2 border-[#e9d7e4] bg-white px-4 py-3 transition-colors duration-200 focus:border-[#c24d86] focus:outline-none focus:ring-2 focus:ring-[#c24d86]/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-[#5f4b5f]">
                  {t('contact.phone')} *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+372 5xxxxxx"
                  className="w-full rounded-xl border-2 border-[#e9d7e4] bg-white px-4 py-3 transition-colors duration-200 focus:border-[#c24d86] focus:outline-none focus:ring-2 focus:ring-[#c24d86]/20"
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(120deg,#d4669e_0%,#c24d86_52%,#a93d71_100%)] py-4 font-semibold text-white shadow-[0_20px_30px_-22px_rgba(116,47,93,0.66)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_34px_-20px_rgba(116,47,93,0.76)] active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('fastBook.securingSlot')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {language === 'en' ? 'Pay 10 € deposit' : 'Maksa 10 € ettemaks'}
                  </>
                )}
              </button>

              {/* Switch to Full Form */}
              {onSwitchToFull && (
                <button
                  type="button"
                  onClick={onSwitchToFull}
                  className="w-full py-3 text-sm text-[#8b7387] transition-colors duration-200 hover:text-[#b04b80]"
                >
                  {t('fastBook.orFullForm')} -&gt;
                </button>
              )}
            </form>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes check {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        .animate-check {
          stroke-dasharray: 100;
          animation: check 0.5s ease-out forwards;
        }
        @keyframes scale-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out forwards;
        }
        @keyframes sparkle-1 {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        .animate-sparkle-1 {
          animation: sparkle-1 1s ease-out 0.2s forwards;
        }
        @keyframes sparkle-2 {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(-180deg); }
        }
        .animate-sparkle-2 {
          animation: sparkle-2 1s ease-out 0.4s forwards;
        }
      `}</style>
    </div>
  );
}

export default FastBookingSheet;



