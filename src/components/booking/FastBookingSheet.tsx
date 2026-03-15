'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [formData, setFormData] = useState<ContactInfo>({
    firstName: '',
    lastName: '',
    phone: '',
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
        throw new Error('Please enter your first name');
      }
      if (!formData.phone.trim()) {
        throw new Error('Please enter your phone number');
      }

      // Optimistic update - show success immediately
      setIsLoading(false);
      setIsSuccess(true);
      setStatus('success');
      
      // Save contact info
      setContactInfo(formData);
      calculateTotals();

      // Redirect after showing success
      setTimeout(() => {
        router.push('/success');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Drag Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
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
              <span className="absolute -top-2 -right-2 text-2xl animate-sparkle-1">✨</span>
              <span className="absolute -bottom-1 -left-2 text-xl animate-sparkle-2">💅</span>
            </div>
            
            {/* Emotional Headline */}
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
              Your appointment request is sent!
            </h3>
            <p className="text-gray-500 mb-2">
              Ref: #NF-{Math.random().toString(36).substring(2, 8).toUpperCase()}
            </p>
            {/* Reassurance */}
            <p className="text-sm text-green-600 font-medium">
              ✓ You will receive confirmation shortly
            </p>
            
            {/* Add to Calendar CTA */}
            <button 
              onClick={() => router.push('/success')}
              className="mt-6 px-6 py-3 bg-[#D4A59A] text-white rounded-full font-medium hover:bg-[#C47D6D] transition-colors"
            >
              Add to calendar
            </button>
          </div>
        ) : (
          // Form State
          <>
            {/* Header */}
            <div className="px-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Quick Book
                  </h3>
                  <p className="text-sm text-gray-500">
                    {service.name} • {service.duration} min
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Time Display */}
              <div className="mt-4 p-4 bg-[#FFF9F5] rounded-xl">
                <div className="flex items-center gap-2 text-[#D4A59A]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">
                    {new Date(slot.date).toLocaleDateString('en-GB', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'short' 
                    })} at {slot.time}
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Your first name"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#D4A59A] focus:outline-none focus:ring-2 focus:ring-[#D4A59A]/20 transition-colors duration-200"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+44 7700 900000"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#D4A59A] focus:outline-none focus:ring-2 focus:ring-[#D4A59A]/20 transition-colors duration-200"
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
                className="w-full py-4 bg-[#D4A59A] text-white font-semibold rounded-xl hover:bg-[#C47D6D] active:scale-[0.98] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Securing your slot...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    CONFIRM BOOKING • £{service.price}
                  </>
                )}
              </button>

              {/* Switch to Full Form */}
              {onSwitchToFull && (
                <button
                  type="button"
                  onClick={onSwitchToFull}
                  className="w-full py-3 text-gray-500 text-sm hover:text-[#D4A59A] transition-colors duration-200"
                >
                  or full booking form →
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
