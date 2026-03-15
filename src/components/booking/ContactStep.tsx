'use client';

import { useState } from 'react';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
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
      <div className="space-y-4">
        {/* First Name */}
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
            className={`
              w-full px-4 py-3 bg-white border-2 rounded-xl 
              focus:outline-none focus:ring-2 transition-colors duration-200
              ${errors.firstName 
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                : 'border-gray-200 focus:border-[#D4A59A] focus:ring-[#D4A59A]/20'
              }
            `}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name (Optional) */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Your last name"
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#D4A59A] focus:outline-none focus:ring-2 focus:ring-[#D4A59A]/20 transition-colors duration-200"
          />
        </div>

        {/* Phone */}
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
            className={`
              w-full px-4 py-3 bg-white border-2 rounded-xl 
              focus:outline-none focus:ring-2 transition-colors duration-200
              ${errors.phone 
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                : 'border-gray-200 focus:border-[#D4A59A] focus:ring-[#D4A59A]/20'
              }
            `}
          />
          {errors.phone && (
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
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className={`
                  w-full px-4 py-3 bg-white border-2 rounded-xl 
                  focus:outline-none focus:ring-2 transition-colors duration-200
                  ${errors.email 
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-[#D4A59A] focus:ring-[#D4A59A]/20'
                  }
                `}
              />
              {errors.email && (
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

      {/* Continue Button */}
      <button
        onClick={handleSubmit}
        className="w-full mt-6 py-4 bg-[#D4A59A] text-white font-semibold rounded-xl hover:bg-[#C47D6D] active:scale-[0.98] transition-all duration-200"
      >
        Continue
      </button>
    </div>
  );
}

export default ContactStep;