'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';

interface StickyBookingCTAProps {
  hideOnPaths?: string[];
}

export function StickyBookingCTA({ hideOnPaths = [] }: StickyBookingCTAProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  
  const { selectedService, totalPrice } = useBookingStore();

  // Check if we should hide based on current path
  const shouldHide = hideOnPaths.some(path => pathname.startsWith(path));

  // Handle scroll with useCallback to avoid cascading renders
  const handleScroll = useCallback(() => {
    if (shouldHide) {
      setIsVisible(false);
      return;
    }
    const currentScrollY = window.scrollY;
    setIsVisible(currentScrollY > 200);
  }, [shouldHide]);

  // Show after scrolling down a bit
  useEffect(() => {
    if (shouldHide) {
      setIsVisible(false);
      return;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll, shouldHide, pathname]);

  const handleClick = () => {
    const heroElement = document.getElementById('hero-booking');
    if (heroElement) {
      heroElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push('/book');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
      <div className="bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-gray-100 px-4 py-3">
        <button
          onClick={handleClick}
          className="w-full py-3.5 bg-[#D4A59A] text-white font-semibold rounded-xl hover:bg-[#C47D6D] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
        >
          {selectedService ? (
            <>
              <span>Book {selectedService.name}</span>
              {totalPrice > 0 && (
                <span className="opacity-80">from €{totalPrice}</span>
              )}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Now
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
    </div>
  );
}

export default StickyBookingCTA;
