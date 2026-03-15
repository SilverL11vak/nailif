'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';

export default function SuccessPage() {
  const router = useRouter();
  const [bookingRef, setBookingRef] = useState('');
  
  const { selectedService, selectedSlot, totalPrice, totalDuration, reset } = useBookingStore();

  // Generate booking ref on client only to avoid hydration mismatch
  useEffect(() => {
    setBookingRef(`NF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  }, []);

  // Reset booking state when leaving
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleRebook = () => {
    router.push('/');
  };

  const handleAddToCalendar = () => {
    // In production, this would generate a calendar event
    alert('Calendar integration would be implemented here');
  };

  const handleDirections = () => {
    // In production, this would open Google Maps
    alert('Directions integration would be implemented here');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nailify Booking',
          text: `I just booked an appointment at Nailify!`,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-green-500 animate-check" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-gray-800 mb-2">
            You are booked!
          </h1>
          <p className="text-gray-500">
            Ref: {bookingRef}
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center border-b border-gray-100 pb-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedService?.name || 'Gel Manicure'}
            </h2>
            <p className="text-gray-500 text-sm">
              {selectedSlot 
                ? `${new Date(selectedSlot.date).toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })} at ${selectedSlot.time}`
                : 'Friday, March 18 at 2:30 PM'
              }
            </p>
            <p className="text-gray-400 text-sm">
              {selectedService?.duration || 45} min • with Sophie
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-gray-800">
                £{totalPrice || selectedService?.price || 35} • {totalDuration || selectedService?.duration || 45} min
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleAddToCalendar}
            className="flex items-center justify-center gap-2 py-3 bg-white rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add to Calendar
          </button>
          
          <button
            onClick={handleDirections}
            className="flex items-center justify-center gap-2 py-3 bg-white rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Get Directions
          </button>
        </div>

        {/* Rebook CTA */}
        <button
          onClick={handleRebook}
          className="w-full py-4 bg-[#D4A59A] text-white font-semibold rounded-xl hover:bg-[#C47D6D] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Rebook Same Service
        </button>

        {/* Share */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">Share with friends</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleShare}
              className="p-3 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button
              onClick={() => window.open('https://wa.me/', '_blank')}
              className="p-3 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Instagram CTA */}
        <div className="mt-8 text-center border-t border-gray-200 pt-6">
          <p className="text-gray-500 text-sm">
            Follow us @nailify for nail inspiration 💅
          </p>
        </div>
      </div>

      <style jsx>{`
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
          animation: check 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
