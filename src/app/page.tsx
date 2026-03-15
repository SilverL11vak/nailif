'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HeroBookingWidget } from '@/components/booking/HeroBookingWidget';
import { StickyBookingCTA } from '@/components/layout/StickyBookingCTA';
import { mockServices, generateSlotsForDate } from '@/store/mock-data';
import { useBookingStore } from '@/store/booking-store';
import type { NailStyle } from '@/store/booking-types';

// Gallery nail styles for deep linking
const nailStyles: NailStyle[] = [
  { id: '1', name: 'Glossy Pink French', slug: 'glossy-pink-french', recommendedServiceId: 'gel-manicure', emoji: '💅' },
  { id: '2', name: 'Matte Nude', slug: 'matte-nude', recommendedServiceId: 'gel-manicure', emoji: '🎀' },
  { id: '3', name: 'Chrome Silver', slug: 'chrome-silver', recommendedServiceId: 'nail-art', emoji: '✨' },
  { id: '4', name: 'Ombre Sunset', slug: 'ombre-sunset', recommendedServiceId: 'gel-manicure', emoji: '🌅' },
  { id: '5', name: 'Ruby Red', slug: 'ruby-red', recommendedServiceId: 'gel-manicure', emoji: '❤️' },
  { id: '6', name: 'Pearl White', slug: 'pearl-white', recommendedServiceId: 'luxury-spa-manicure', emoji: '⚪' },
];

// Premium nail imagery from Unsplash
const nailImages: {
  hero: string;
  services: Record<string, string>;
  gallery: string[];
} = {
  hero: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80',
  services: {
    'gel-manicure': 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&q=80',
    'acrylic-extensions': 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80',
    'luxury-spa-manicure': 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600&q=80',
    'gel-pedicure': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80',
  },
  gallery: [
    'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80', // pink french
    'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80', // extensions
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80', // close-up
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&q=80', // spa
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80', // pedicure
    'https://images.unsplash.com/photo-1583616690835-130bc67bd1b4?w=800&q=80', // nude
  ],
};

export default function Home() {
  const router = useRouter();
  const setSelectedStyle = useBookingStore((state) => state.setSelectedStyle);
  const [nextAvailable, setNextAvailable] = useState<string>('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [discountPillDismissed, setDiscountPillDismissed] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);

  useEffect(() => {
    // Calculate next available slot
    const today = new Date();
    const slots = generateSlotsForDate(today);
    const available = slots.find(s => s.available);
    if (available) {
      setNextAvailable(`Today at ${available.time}`);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowSlots = generateSlotsForDate(tomorrow);
      const tomorrowAvailable = tomorrowSlots.find(s => s.available);
      if (tomorrowAvailable) {
        setNextAvailable(`Tomorrow at ${tomorrowAvailable.time}`);
      }
    }

    // Handle scroll for header shrink effect and progress tracking
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      
      // Calculate scroll progress for discount pill
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollableHeight = documentHeight - windowHeight;
      const progress = scrollTop / scrollableHeight;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for How It Works fade-in animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepIndex = parseInt(entry.target.getAttribute('data-step') || '0');
            setVisibleSteps(prev => [...new Set([...prev, stepIndex])]);
          }
        });
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll('.how-it-works-step').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle booking from gallery - deep link to booking with style
  const handleBookStyle = (style: NailStyle) => {
    setSelectedStyle(style);
    router.push(`/book?style=${style.slug}`);
  };

  const services = mockServices.slice(0, 4);

  // Color tokens per correction pass
  const colors = {
    primary: '#C9A99A',       // muted rose accent
    primaryHover: '#B89585', // deeper taupe
    background: '#FFFFFF',    // pure white
    backgroundAlt: '#FAFAF8', // soft cream
    backgroundTaupe: '#F5F3F0', // subtle taupe
    border: '#E5E5E5',        // light gray
    borderSubtle: '#EAEAEA',  // subtle border
    textPrimary: '#1F2937',   // gray-900
    textSecondary: '#4B5563',  // gray-600
    textMuted: '#6B7280',     // gray-500
  };

  // Show discount pill at 40% scroll
  const showDiscountPill = scrollProgress > 0.4 && !discountPillDismissed;

  return (
    <div className="min-h-screen bg-white">
      {/* ===================== */}
      {/* 1. STICKY HEADER */}
      {/* ===================== */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/98 backdrop-blur-lg shadow-sm' 
            : 'bg-white/95 backdrop-blur-md'
        } border-b border-gray-100`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between transition-all duration-300 ${
            isScrolled ? 'h-16' : 'h-20'
          }`}>
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className={`font-semibold transition-all duration-300 ${
                isScrolled ? 'text-xl' : 'text-2xl'
              }`} style={{ color: colors.primary }}>Nailify</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-10">
              <button onClick={() => scrollToSection('services')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">Services</button>
              <button onClick={() => scrollToSection('gallery')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">Gallery</button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">Pricing</button>
              <button onClick={() => scrollToSection('location')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">Contact</button>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Next Available */}
              {nextAvailable && (
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Next available: <span style={{ color: colors.primary, fontWeight: 500 }}>{nextAvailable}</span></span>
                </div>
              )}
              
              {/* Book Now Button */}
              <button 
                onClick={() => router.push('/book')}
                className="px-6 py-2.5 text-white rounded-full font-medium hover:opacity-90 transition-all duration-200"
                style={{ backgroundColor: colors.primary }}
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===================== */}
      {/* 2. HERO SECTION - DOMINATION */}
      {/* ===================== */}
      <section className={`pt-24 lg:pt-28 pb-16 lg:pb-24 transition-all duration-300 ${
        isScrolled ? 'pt-20' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left: Editorial Image + Content */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              {/* Clean Editorial Image */}
              <div className="relative aspect-[4/3] lg:aspect-[16/10] rounded-2xl overflow-hidden mb-8 lg:mb-10">
                <img 
                  src={nailImages.hero} 
                  alt="Beautiful manicured nails"
                  className="w-full h-full object-cover"
                />
                {/* Subtle overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>

              {/* Headline + Single Trust Signal */}
              <div className="max-w-xl">
                {/* EMOTIONAL HERO HEADLINE */}
                <h1 className="text-4xl lg:text-5xl font-medium text-gray-900 leading-tight mb-5 tracking-tight">
                  Obsessively beautiful nails.<br />
                  <span style={{ color: colors.primary }}>Booked in seconds.</span>
                </h1>
                
                {/* EMOTIONAL SUBTEXT */}
                <p className="text-lg text-gray-500 mb-6 leading-relaxed">
                  Long-lasting results crafted with meticulous attention to detail. 
                  Book your appointment in moments and walk out with confidence.
                </p>

                {/* Primary CTA - Dominant with shadow and lift */}
                <button 
                  onClick={() => router.push('/book')}
                  className="px-8 py-4 text-white rounded-full font-semibold text-lg transition-all duration-300 hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
                  style={{ backgroundColor: colors.primary }}
                >
                  Book Your Appointment
                </button>

                {/* MICRO TRUST STRIP */}
                <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Certified Technician
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Mustamäe Studio
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Premium Products
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hygienic Tools
                  </div>
                </div>

                {/* Trust Rating */}
                <div className="flex items-center gap-3 mt-6">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">4.9</span>
                  <span className="text-sm text-gray-400">· 1,200+ clients</span>
                </div>
              </div>
            </div>

            {/* Right: Booking Widget */}
            <div className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-24">
              <div id="hero-booking">
                <HeroBookingWidget />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 3. TRUST PROOF STRIP */}
      {/* ===================== */}
      <section className="py-8 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
            {/* Rating */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">4.9</span>
              <span>Google Rating</span>
            </div>
            
            {/* Appointments */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">150+</span>
              <span>Appointments This Week</span>
            </div>
            
            {/* Hygiene */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">100%</span>
              <span>Sterile Equipment</span>
            </div>
            
            {/* Products */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">Premium</span>
              <span>Products Only</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 4. POPULAR SERVICES - CONVERSION OPTIMIZED */}
      {/* ===================== */}
      <section id="services" className="py-20 lg:py-28" style={{ backgroundColor: colors.backgroundAlt }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-medium text-gray-900 mb-4 tracking-tight">Our Services</h2>
            {/* HELPER TEXT */}
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Choose your service and book in less than 30 seconds.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {services.map((service) => (
              <div 
                key={service.id}
                onClick={() => router.push('/book')}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              >
                {/* Clean Image Area with subtle visual indicator */}
                <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center relative overflow-hidden group-hover:brightness-95 transition-all duration-300">
                  {nailImages.services[service.id] ? (
                    <img 
                      src={nailImages.services[service.id]} 
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-5xl opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-110 duration-300">
                      {service.category === 'manicure' ? '💅' : service.category === 'pedicure' ? '🦶' : service.category === 'extensions' ? '✨' : '🎨'}
                    </div>
                  )}
                  {/* Subtle overlay on hover */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors duration-300" />
                </div>
                
                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{service.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {service.duration} min
                    </div>
                    <span className="text-base font-medium text-gray-700">From £{service.price}</span>
                  </div>

                  {/* Quick Book CTA */}
                  <button 
                    className="w-full py-2.5 text-white rounded-xl font-medium transition-all duration-200 group-hover:shadow-md"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button 
              onClick={() => router.push('/book')} 
              className="px-8 py-3 text-white rounded-full font-medium hover:opacity-90 transition-all duration-200"
              style={{ backgroundColor: colors.primary }}
            >
              View All Services
            </button>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 5. HOW BOOKING WORKS - CLARITY BOOST */}
      {/* ===================== */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-medium text-gray-900 mb-4 tracking-tight">How It Works</h2>
            {/* HELPER SUBTEXT */}
            <p className="text-lg text-gray-500">Simple 3-step booking flow.</p>
          </div>

          {/* Connecting Progress Line - Hidden on mobile */}
          <div className="relative max-w-4xl mx-auto">
            {/* Progress line behind steps - desktop only */}
            <div className="hidden md:block absolute top-6 left-1/4 right-1/4 h-px bg-gray-200 -translate-y-1/2" />

            <div className="grid md:grid-cols-3 gap-8 lg:gap-16">
              {/* Step 1 */}
              <div 
                data-step="1"
                className={`how-it-works-step text-center transition-all duration-700 ${
                  visibleSteps.includes(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 mb-5 relative">
                  {/* Step number bubble */}
                  <div className="absolute inset-0 bg-gray-100 rounded-full" />
                  <svg className="w-8 h-8 text-gray-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Choose Service</h3>
                <p className="text-gray-500 leading-relaxed">Select from our range of premium treatments</p>
              </div>

              {/* Step 2 */}
              <div 
                data-step="2"
                className={`how-it-works-step text-center transition-all duration-700 delay-100 ${
                  visibleSteps.includes(2) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 mb-5 relative">
                  <div className="absolute inset-0 bg-gray-100 rounded-full" />
                  <svg className="w-8 h-8 text-gray-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Pick Time</h3>
                <p className="text-gray-500 leading-relaxed">Choose a convenient time slot</p>
              </div>

              {/* Step 3 */}
              <div 
                data-step="3"
                className={`how-it-works-step text-center transition-all duration-700 delay-200 ${
                  visibleSteps.includes(3) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 mb-5 relative">
                  <div className="absolute inset-0 bg-gray-100 rounded-full" />
                  <svg className="w-8 h-8 text-gray-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm</h3>
                <p className="text-gray-500 leading-relaxed">Secure your booking instantly</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 6. RESULTS GALLERY - EDITORIAL RHYTHM */}
      {/* ===================== */}
      <section id="gallery" className="py-20 lg:py-28" style={{ backgroundColor: colors.backgroundAlt }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-medium text-gray-900 mb-4 tracking-tight">Our Work</h2>
            <p className="text-lg text-gray-500">A selection of recent work</p>
          </div>

          {/* Editorial Gallery Grid with Featured Images */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
            {/* Large Featured Image (positioned to create editorial rhythm) */}
            {nailStyles[0] && (
              <div 
                className="col-span-2 row-span-2 relative overflow-hidden rounded-2xl cursor-pointer group"
                onClick={() => handleBookStyle(nailStyles[0])}
              >
                <img 
                  src={nailImages.gallery[0]} 
                  alt={nailStyles[0].name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Hover zoom + gloss overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                {/* Book this style CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white text-sm font-medium mb-2">{nailStyles[0].name}</span>
                  <span className="px-4 py-2 bg-white/90 text-gray-900 text-xs font-semibold rounded-full shadow-lg">
                    Book this style
                  </span>
                </div>
              </div>
            )}
            
            {/* Regular Images */}
            {nailStyles.slice(1, 4).map((style, idx) => (
              <div 
                key={style.id}
                className="aspect-square rounded-2xl cursor-pointer group overflow-hidden relative"
                onClick={() => handleBookStyle(style)}
              >
                <img 
                  src={nailImages.gallery[idx + 1]} 
                  alt={style.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                {/* Book this style CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white text-xs font-medium mb-1.5">{style.name}</span>
                  <span className="px-3 py-1.5 bg-white/90 text-gray-900 text-xs font-semibold rounded-full">
                    Book this style
                  </span>
                </div>
              </div>
            ))}
            
            {/* Second Featured Image */}
            {nailStyles[4] && (
              <div 
                className="col-span-2 aspect-square rounded-2xl cursor-pointer group overflow-hidden relative"
                onClick={() => handleBookStyle(nailStyles[4])}
              >
                <img 
                  src={nailImages.gallery[4]} 
                  alt={nailStyles[4].name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                {/* Book this style CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white text-sm font-medium mb-2">{nailStyles[4].name}</span>
                  <span className="px-4 py-2 bg-white/90 text-gray-900 text-xs font-semibold rounded-full shadow-lg">
                    Book this style
                  </span>
                </div>
              </div>
            )}

            {/* Last Image */}
            {nailStyles[5] && (
              <div 
                className="aspect-square rounded-2xl cursor-pointer group overflow-hidden relative"
                onClick={() => handleBookStyle(nailStyles[5])}
              >
                <img 
                  src={nailImages.gallery[5]} 
                  alt={nailStyles[5].name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                {/* Book this style CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white text-xs font-medium mb-1.5">{nailStyles[5].name}</span>
                  <span className="px-3 py-1.5 bg-white/90 text-gray-900 text-xs font-semibold rounded-full">
                    Book this style
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="text-center">
            <button 
              onClick={() => router.push('/book')} 
              className="px-8 py-3 text-white rounded-full font-medium hover:opacity-90 transition-all duration-200"
              style={{ backgroundColor: colors.primary }}
            >
              Book Your Look
            </button>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 7. SIGNATURE UPGRADES */}
      {/* ===================== */}
      <section id="pricing" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-medium text-gray-900 mb-4 tracking-tight">Enhancements</h2>
            <p className="text-lg text-gray-500">Optional upgrades for your treatment</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Upgrade 1 */}
            <div 
              onClick={() => router.push('/book')}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <h3 className="font-medium text-gray-900 mb-1">Cuticle Care</h3>
              <p className="text-sm text-gray-400 mb-3">Healthy, hydrated cuticles</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">+£8</span>
                <span className="text-sm text-gray-400">+10 min</span>
              </div>
            </div>

            {/* Upgrade 2 */}
            <div 
              onClick={() => router.push('/book')}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <h3 className="font-medium text-gray-900 mb-1">Hand Massage</h3>
              <p className="text-sm text-gray-400 mb-3">Relaxing tension release</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">+£12</span>
                <span className="text-sm text-gray-400">+15 min</span>
              </div>
            </div>

            {/* Upgrade 3 */}
            <div 
              onClick={() => router.push('/book')}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <h3 className="font-medium text-gray-900 mb-1">Nail Strengthening</h3>
              <p className="text-sm text-gray-400 mb-3">Extra strength for weak nails</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">+£8</span>
                <span className="text-sm text-gray-400">+10 min</span>
              </div>
            </div>

            {/* Upgrade 4 */}
            <div 
              onClick={() => router.push('/book')}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <h3 className="font-medium text-gray-900 mb-1">Aftercare Kit</h3>
              <p className="text-sm text-gray-400 mb-3">Take-home care products</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">+£15</span>
                <span className="text-sm text-gray-400">Instant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 8. TEAM SECTION */}
      {/* ===================== */}
      <section className="py-20 lg:py-28" style={{ backgroundColor: colors.backgroundAlt }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-medium text-gray-900 mb-4 tracking-tight">Our Team</h2>
            <p className="text-lg text-gray-500">Expert technicians dedicated to beautiful results</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Team Member 1 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-4xl opacity-60">✦</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Sophie</h3>
              <p className="text-sm text-gray-500 mb-2">Gel Specialist</p>
              <p className="text-sm text-gray-400">8+ years experience</p>
            </div>

            {/* Team Member 2 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-4xl opacity-60">✦</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Maya</h3>
              <p className="text-sm text-gray-500 mb-2">Nail Artist</p>
              <p className="text-sm text-gray-400">Known for intricate designs</p>
            </div>

            {/* Team Member 3 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-4xl opacity-60">✦</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Emma</h3>
              <p className="text-sm text-gray-500 mb-2">Spa Expert</p>
              <p className="text-sm text-gray-400">Luxury treatment specialist</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 9. LOCATION + HOURS */}
      {/* ===================== */}
      <section id="location" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Info Side */}
            <div>
              <h2 className="text-3xl lg:text-4xl font-medium text-gray-900 mb-6 tracking-tight">Visit Us</h2>
              
              <div className="space-y-6 mb-8">
                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Address</h3>
                    <p className="text-gray-500">Nailify Shoreditch<br />123 High Street, London E1 6AN</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Opening Hours</h3>
                    <p className="text-gray-500">Mon - Sat: 9am - 7pm<br />Sunday: 10am - 5pm</p>
                  </div>
                </div>

                {/* Transport */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Transport</h3>
                    <p className="text-gray-500">5 min from Shoreditch High Street<br />Paid parking available</p>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-4">
                <button 
                  onClick={() => router.push('/book')} 
                  className="flex-1 px-6 py-3 text-white rounded-full font-medium hover:opacity-90 transition-all duration-200"
                  style={{ backgroundColor: colors.primary }}
                >
                  Book Now
                </button>
                <button className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all duration-200">
                  Get Directions
                </button>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="aspect-square lg:aspect-[4/3] bg-gray-50 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-400 font-medium">Shoreditch, London</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 10. AFTERCARE + GIFT CARDS */}
      {/* ===================== */}
      <section className="py-20 lg:py-28" style={{ backgroundColor: colors.backgroundAlt }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Aftercare */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-xl font-medium text-gray-900 mb-5">Aftercare</h3>
              <div className="space-y-3">
                {[
                  { name: 'Cuticle Oil', desc: 'Keep nails hydrated', price: 8 },
                  { name: 'Nail Hardener', desc: 'Maintain strength', price: 12 },
                  { name: 'Protection Spray', desc: 'Extend your manicure', price: 10 },
                ].map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                      <div className="text-xs text-gray-400">{product.desc}</div>
                    </div>
                    <div className="text-gray-700 font-medium">£{product.price}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gift Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 flex flex-col justify-center">
              <h3 className="text-xl font-medium text-gray-900 mb-2">Gift Cards</h3>
              <p className="text-gray-500 mb-5 text-sm">Perfect for anyone who deserves beautiful nails.</p>
              <div className="flex gap-3 mb-5">
                {[25, 50, 100].map((amount) => (
                  <div 
                    key={amount} 
                    className="flex-1 py-3 text-center font-medium text-gray-700 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    £{amount}
                  </div>
                ))}
              </div>
              <button 
                className="w-full py-3 text-white rounded-lg font-medium hover:opacity-90 transition-all duration-200"
                style={{ backgroundColor: colors.primary }}
              >
                Purchase Gift Card
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 11. FINAL CTA - CLOSING ENERGY */}
      {/* ===================== */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gray-50 rounded-2xl p-12 lg:p-16 border border-gray-100">
            <h2 className="text-3xl lg:text-4xl font-medium text-gray-900 mb-4 tracking-tight">
              Ready for Beautiful Nails?
            </h2>
            <p className="text-lg text-gray-500 mb-6 max-w-xl mx-auto">
              Secure your slot and experience the Nailify difference.
            </p>
            
            {/* REASSURANCE + RISK REMOVAL MICROCOPY */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Most clients return within 4 weeks</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Free reschedule if plans change</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => router.push('/book')}
                className="px-8 py-4 text-white rounded-full font-semibold hover:opacity-90 transition-all duration-200 shadow-lg"
                style={{ backgroundColor: colors.primary }}
              >
                Secure Your Slot
              </button>
              <button 
                onClick={() => scrollToSection('services')}
                className="px-8 py-4 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all duration-200"
              >
                Browse Services
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 12. FOOTER - Light Premium */}
      {/* ===================== */}
      <footer className="bg-gray-50 border-t border-gray-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div>
              <span className="text-xl font-semibold" style={{ color: colors.primary }}>Nailify</span>
              <p className="mt-4 text-gray-500 text-sm leading-relaxed">
                Premium nail artistry in the heart of Shoreditch. Expert technicians, lasting results.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-gray-500 text-sm">
                <li><button onClick={() => router.push('/book')} className="hover:text-gray-900 transition-colors">Book Now</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-gray-900 transition-colors">Services</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-gray-900 transition-colors">Pricing</button></li>
                <li><button onClick={() => scrollToSection('location')} className="hover:text-gray-900 transition-colors">Contact</button></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Contact</h4>
              <ul className="space-y-2.5 text-gray-500 text-sm">
                <li>Nailify Shoreditch</li>
                <li>123 High Street</li>
                <li>London E1 6AN</li>
                <li style={{ color: colors.primary }}>hello@nailify.com</li>
              </ul>
            </div>

            {/* Hours */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Opening Hours</h4>
              <ul className="space-y-2.5 text-gray-500 text-sm">
                <li className="flex justify-between"><span>Mon - Sat</span><span>9am - 7pm</span></li>
                <li className="flex justify-between"><span>Sunday</span><span>10am - 5pm</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">© 2026 Nailify. All rights reserved.</p>
            <button 
              onClick={() => router.push('/book')}
              className="px-6 py-2 text-white rounded-full font-medium hover:opacity-90 transition-all duration-200"
              style={{ backgroundColor: colors.primary }}
            >
              Book Appointment
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <StickyBookingCTA hideOnPaths={['/book', '/success']} />

      {/* ===================== */}
      {/* FLOATING DISCOUNT PILL - Mobile Conversion Trigger */}
      {/* ===================== */}
      {showDiscountPill && (
        <div className="fixed bottom-24 left-4 right-4 z-40 md:hidden">
          <div 
            onClick={() => router.push('/book')}
            className="bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl flex items-center justify-between cursor-pointer animate-in slide-in-from-bottom-4"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white text-gray-900 text-xs font-bold px-2 py-1 rounded-full">−15%</span>
              <span className="text-sm font-medium">First Visit Offer</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setDiscountPillDismissed(true);
              }}
              className="text-gray-400 hover:text-white p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
