'use client';

import { useState, useRef, useEffect } from 'react';
import { useBookingStore } from '@/store/booking-store';

export function ContactStep() {
  const contactInfo = useBookingStore((state) => state.contactInfo);
  const setContactInfo = useBookingStore((state) => state.setContactInfo);
  const nextStep = useBookingStore((state) => state.nextStep);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const totalDuration = useBookingStore((state) => state.totalDuration);

  const [showEmail, setShowEmail] = useState(false);
  const [formData, setFormData] = useState({
    firstName: contactInfo?.firstName || '',
    lastName: contactInfo?.lastName || '',
    phone: contactInfo?.phone || '',
    email: contactInfo?.email || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const continueButtonRef = useRef<HTMLDivElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  // Auto-focus first name field on mount
  useEffect(() => {
    firstNameRef.current?.focus();
  }, []);

  // Format phone number as user types (UK format)
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Format phone number
    let processedValue = value;
    if (name === 'phone') {
      processedValue = formatPhoneNumber(value);
    }
    
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    // Mark as touched
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (showEmail && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      setContactInfo({
        firstName: formData.firstName,
        lastName: formData.lastName || undefined,
        phone: formData.phone,
        email: formData.email || undefined,
      });
      nextStep();
      // Scroll next step into view
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Mark all fields as touched to show errors
      setTouched({
        firstName: true,
        lastName: true,
        phone: true,
        email: true
      });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Your Details
        </h2>
        <p className="text-gray-500">
          We&apos;ll send your confirmation here
        </p>
      </div>

      {/* Booking Summary Card */}
      <div className="bg-[#FFF9F5] rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-800">{selectedService?.name}</span>
          <span className="text-[#D4A59A] font-semibold">£{totalPrice || selectedService?.price}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {selectedSlot 
              ? `${new Date(selectedSlot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${selectedSlot.time}`
              : 'No time selected'
            }
          </span>
          <span>{totalDuration || selectedService?.duration} min</span>
        </div>
      </div>

      {/* Contact Form */}
      <div className="space-y-5">
        {/* First Name - Floating Label Style */}
        <div className="relative">
          <input
            ref={firstNameRef}
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder=" "
            className={`
              peer w-full px-4 pt-6 pb-2 bg-white border-2 rounded-xl 
              focus:outline-none focus:ring-2 transition-all duration-200
              ${errors.firstName && touched.firstName
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                : 'border-gray-200 focus:border-[#D4A59A] focus:ring-[#D4A59A]/20'
              }
            `}
          />
          <label 
            htmlFor="firstName" 
            className={`
              absolute left-4 top-4 text-sm transition-all duration-200 pointer-events-none
              ${formData.firstName 
                ? 'top-1 text-xs text-gray-500' 
                : 'text-gray-400 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-500'
              }
              ${errors.firstName && touched.firstName ? 'text-red-500' : ''}
            `}
          >
            First Name *
          </label>
          {errors.firstName && touched.firstName && (
            <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name (Optional) */}
        <div className="relative">
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder=" "
            className="peer w-full px-4 pt-6 pb-2 bg-white border-2 border-gray-200 rounded-xl focus:border-[#D4A59A] focus:outline-none focus:ring-2 focus:ring-[#D4A59A]/20 transition-colors duration-200"
          />
          <label 
            htmlFor="lastName" 
            className={`
              absolute left-4 top-4 text-sm transition-all duration-200 pointer-events-none
              ${formData.lastName 
                ? 'top-1 text-xs text-gray-500' 
                : 'text-gray-400 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-500'
              }
            `}
          >
            Last Name <span className="text-gray-400">(optional)</span>
          </label>
        </div>

        {/* Phone */}
        <div className="relative">
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder=" "
            className={`
              peer w-full px-4 pt-6 pb-2 bg-white border-2 rounded-xl 
              focus:outline-none focus:ring-2 transition-all duration-200
              ${errors.phone && touched.phone
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                : 'border-gray-200 focus:border-[#D4A59A] focus:ring-[#D4A59A]/20'
              }
            `}
          />
          <label 
            htmlFor="phone" 
            className={`
              absolute left-4 top-4 text-sm transition-all duration-200 pointer-events-none
              ${formData.phone 
                ? 'top-1 text-xs text-gray-500' 
                : 'text-gray-400 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-500'
              }
              ${errors.phone && touched.phone ? 'text-red-500' : ''}
            `}
          >
            Phone Number *
          </label>
          {errors.phone && touched.phone && (
            <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        {/* Email (Collapsible) */}
        <div>
          {!showEmail ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="text-sm text-[#D4A59A] hover:text-[#C47D6D] font-medium"
            >
              + Add email for booking confirmation
            </button>
          ) : (
            <div className="relative">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder=" "
                className={`
                  peer w-full px-4 pt-6 pb-2 bg-white border-2 rounded-xl 
                  focus:outline-none focus:ring-2 transition-all duration-200
                  ${errors.email && touched.email
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-[#D4A59A] focus:ring-[#D4A59A]/20'
                  }
                `}
              />
              <label 
                htmlFor="email" 
                className={`
                  absolute left-4 top-4 text-sm transition-all duration-200 pointer-events-none
                  ${formData.email 
                    ? 'top-1 text-xs text-gray-500' 
                    : 'text-gray-400 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-500'
                  }
                `}
              >
                Email <span className="text-gray-400">(optional)</span>
              </label>
              {errors.email && touched.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowEmail(false);
                  setFormData((prev) => ({ ...prev, email: '' }));
                }}
                className="mt-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Remove email
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Helper Text - Privacy */}
      <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-gray-500">
          We only use your contact to confirm the booking.
        </p>
      </div>

      {/* Decision Safety Microcopy */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-400 mb-4">
        <span>✓ Takes less than a minute</span>
        <span>•</span>
        <span>You can reschedule anytime</span>
      </div>

      {/* Continue Button - Large tap area */}
      <button
        onClick={handleSubmit}
        className="w-full mt-2 py-5 bg-[#D4A59A] text-white font-semibold rounded-xl hover:bg-[#C47D6D] active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        Confirm Booking
      </button>
      
      {/* Hidden ref for scroll */}
      <div ref={continueButtonRef} />
    </div>
  );
}

export default ContactStep;