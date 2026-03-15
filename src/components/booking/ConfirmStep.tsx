'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';

export function ConfirmStep() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const selectedAddOns = useBookingStore((state) => state.selectedAddOns);
  const contactInfo = useBookingStore((state) => state.contactInfo);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const totalDuration = useBookingStore((state) => state.totalDuration);
  const setStatus = useBookingStore((state) => state.setStatus);
  const reset = useBookingStore((state) => state.reset);

  const selectedExtras = selectedAddOns.filter((a) => a.selected);

  const handleConfirm = async () => {
    setIsLoading(true);
    setStatus('confirming');

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mark as success
    setStatus('success');
    setIsLoading(false);

    // Redirect to success page
    router.push('/success');
  };

  if (!selectedService || !selectedSlot) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Missing booking details.</p>
        <p className="text-sm text-gray-400">Please go back and complete all steps.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Confirm Booking
        </h2>
        <p className="text-gray-500">
          Review your appointment details
        </p>
      </div>

      {/* Booking Summary Card */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 mb-6">
        {/* Service */}
        <div className="pb-4 mb-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg mb-1">
            {selectedService.name}
          </h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {selectedService.duration} min
            </span>
            <span className="font-semibold text-gray-800">
              £{selectedService.price}
            </span>
          </div>
        </div>

        {/* Date & Time */}
        <div className="pb-4 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFF9F5] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-800">
                {new Date(selectedSlot.date).toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-500">at {selectedSlot.time}</p>
            </div>
          </div>
        </div>

        {/* Extras */}
        {selectedExtras.length > 0 && (
          <div className="pb-4 mb-4 border-b border-gray-100">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Extras</h4>
            {selectedExtras.map((extra) => (
              <div key={extra.id} className="flex items-center justify-between text-sm py-1">
                <span className="text-gray-600">{extra.name}</span>
                <span className="text-gray-800">+£{extra.price}</span>
              </div>
            ))}
          </div>
        )}

        {/* Contact */}
        <div className="pb-4 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFF9F5] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-800">
                {contactInfo?.firstName} {contactInfo?.lastName}
              </p>
              <p className="text-sm text-gray-500">{contactInfo?.phone}</p>
              {contactInfo?.email && (
                <p className="text-sm text-gray-400">{contactInfo.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-semibold text-gray-800">Total</span>
            <p className="text-sm text-gray-500">{totalDuration} min total</p>
          </div>
          <span className="text-2xl font-semibold text-[#D4A59A]">
            £{totalPrice}
          </span>
        </div>
      </div>

      {/* Terms */}
      <p className="text-xs text-gray-400 text-center mb-6">
        By confirming, you agree to our booking terms and cancellation policy.
      </p>

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className={`
          w-full py-4 rounded-xl font-semibold transition-all duration-200
          flex items-center justify-center gap-2
          ${isLoading 
            ? 'bg-gray-100 text-gray-400 cursor-wait' 
            : 'bg-[#D4A59A] text-white hover:bg-[#C47D6D] active:scale-[0.98]'
          }
        `}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Confirming...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confirm Booking • £{totalPrice}
          </>
        )}
      </button>
    </div>
  );
}

export default ConfirmStep;