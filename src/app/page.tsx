'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HeroBookingWidget } from '@/components/booking/HeroBookingWidget';
import { StickyBookingCTA } from '@/components/layout/StickyBookingCTA';
import { mockServices, generateSlotsForDate } from '@/store/mock-data';

export default function Home() {
  const router = useRouter();
  const [nextAvailable, setNextAvailable] = useState<string>('');
  const [isScrolled, setIsScrolled] = useState(false);

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

    // Handle scroll for header shrink effect
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const services = mockServices.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
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
              <span className={`font-semibold text-[#D4A59A] transition-all duration-300 ${
                isScrolled ? 'text-xl' : 'text-2xl'
              }`}>Nailify</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-10">
              <button onClick={() => scrollToSection('services')} className="text-gray-600 hover:text-[#D4A59A] transition-colors font-medium">Services</button>
              <button onClick={() => scrollToSection('gallery')} className="text-gray-600 hover:text-[#D4A59A] transition-colors font-medium">Gallery</button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-[#D4A59A] transition-colors font-medium">Pricing</button>
              <button onClick={() => scrollToSection('location')} className="text-gray-600 hover:text-[#D4A59A] transition-colors font-medium">Contact</button>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Next Available */}
              {nextAvailable && (
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Next available: <span className="text-[#D4A59A] font-medium">{nextAvailable}</span></span>
                </div>
              )}
              
              {/* Book Now Button */}
              <button 
                onClick={() => router.push('/book')}
                className="px-6 py-2.5 bg-[#D4A59A] text-white rounded-full font-medium hover:bg-[#C47D6D] transition-all duration-200 hover:shadow-lg"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===================== */}
      {/* 2. HERO SECTION */}
      {/* ===================== */}
      <section className={`pt-24 lg:pt-28 pb-16 lg:pb-24 transition-all duration-300 ${
        isScrolled ? 'pt-20' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left: Editorial Image + Content */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              {/* Premium Editorial Image */}
              <div className="relative aspect-[4/3] lg:aspect-[16/10] rounded-3xl overflow-hidden mb-8 lg:mb-10">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FDFCFB] via-[#F5E6E0] to-[#E8D5C8]">
                  {/* Editorial image placeholder with decorative elements */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-8xl lg:text-9xl mb-4 transform hover:scale-110 transition-transform duration-500">💅</div>
                      <p className="text-[#D4A59A]/80 text-lg lg:text-xl font-medium tracking-wide">Premium Nail Artistry</p>
                    </div>
                  </div>
                </div>
                {/* Soft gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                {/* Trust Badge Overlay */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-lg border border-white/50">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-gray-800">4.9</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm text-gray-600 font-medium">1,200+ clients</span>
                </div>
              </div>

              {/* Headline + Trust */}
              <div className="max-w-xl">
                <h1 className="text-4xl lg:text-5xl font-semibold text-gray-900 leading-tight mb-5">
                  Beautiful nails,<br />
                  <span className="text-[#D4A59A]">effortlessly booked</span>
                </h1>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Experience premium nail artistry in our tranquil salon. 
                  Medical-grade hygiene, expert technicians, and lasting results.
                </p>

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-5">
                  <div className="flex items-center gap-2.5 text-gray-600">
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Sterile & Safe</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-600">
                    <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Non-toxic Polish</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-600">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">45 min avg</span>
                  </div>
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
      <section className="py-10 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Rating */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">4.9</div>
                <div className="text-xs text-gray-500">Google Rating</div>
              </div>
            </div>
            
            {/* Appointments */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-[#FFF9F5] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">150+</div>
                <div className="text-xs text-gray-500">Appointments This Week</div>
              </div>
            </div>
            
            {/* Hygiene */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">100%</div>
                <div className="text-xs text-gray-500">Sterile Equipment</div>
              </div>
            </div>
            
            {/* Products */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">5★</div>
                <div className="text-xs text-gray-500">Premium Products</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 4. POPULAR SERVICES */}
      {/* ===================== */}
      <section id="services" className="py-20 lg:py-28 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">Our Signature Services</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Expertly crafted treatments using premium products for lasting, beautiful results.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {services.map((service) => (
              <div 
                key={service.id}
                onClick={() => router.push('/book')}
                className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-[#D4A59A]/30 hover:shadow-xl hover:shadow-[#D4A59A]/10 transition-all duration-300 cursor-pointer"
              >
                {/* Service Image Placeholder - Editorial Style */}
                <div className="aspect-[4/3] bg-gradient-to-br from-[#FFF9F5] via-[#FDF8F5] to-[#F5E6E0] flex items-center justify-center relative overflow-hidden">
                  <span className="text-6xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    {service.category === 'manicure' ? '💅' : service.category === 'pedicure' ? '🦶' : service.category === 'extensions' ? '✨' : '🎨'}
                  </span>
                  {/* Soft overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#D4A59A]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    {service.isPopular && (
                      <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Popular</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{service.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {service.duration} min
                    </div>
                    <span className="text-lg font-semibold text-[#D4A59A]">From £{service.price}</span>
                  </div>

                  {/* Quick Book CTA */}
                  <button className="w-full mt-4 py-2.5 bg-[#D4A59A]/10 text-[#D4A59A] rounded-xl font-medium hover:bg-[#D4A59A] hover:text-white transition-all duration-200">
                    Quick Book
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button onClick={() => router.push('/book')} className="px-8 py-3 bg-[#D4A59A] text-white rounded-full font-medium hover:bg-[#C47D6D] transition-all duration-200 hover:shadow-lg">
              View All Services
            </button>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 5. HOW BOOKING WORKS */}
      {/* ===================== */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Book your appointment in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FFF9F5] rounded-full mb-6 group-hover:bg-[#D4A59A]/10 transition-colors duration-300">
                <svg className="w-9 h-9 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-[#D4A59A] mb-2">STEP 01</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose Service</h3>
              <p className="text-gray-600 leading-relaxed">Browse our premium treatments and select your perfect service</p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FFF9F5] rounded-full mb-6 group-hover:bg-[#D4A59A]/10 transition-colors duration-300">
                <svg className="w-9 h-9 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-[#D4A59A] mb-2">STEP 02</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pick Time</h3>
              <p className="text-gray-600 leading-relaxed">See real-time availability and choose a convenient slot</p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FFF9F5] rounded-full mb-6 group-hover:bg-[#D4A59A]/10 transition-colors duration-300">
                <svg className="w-9 h-9 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-[#D4A59A] mb-2">STEP 03</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Confirm</h3>
              <p className="text-gray-600 leading-relaxed">Secure your booking instantly with our quick confirmation</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 6. RESULTS GALLERY */}
      {/* ===================== */}
      <section id="gallery" className="py-20 lg:py-28 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">Our Work</h2>
            <p className="text-lg text-gray-600">A glimpse of beautiful nails we&apos;ve created</p>
          </div>

          {/* Gallery Grid - Editorial Style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
            {/* Large Feature Image */}
            <div className="col-span-2 row-span-2">
              <div className="aspect-square lg:aspect-[4/4] rounded-2xl lg:rounded-3xl bg-gradient-to-br from-[#FFF9F5] to-[#F5E6E0] flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform duration-500 overflow-hidden">
                <span className="text-8xl">💅</span>
              </div>
            </div>
            
            {/* Regular Images */}
            <div className="aspect-square rounded-2xl lg:rounded-3xl bg-gradient-to-br from-[#FDF8F5] to-[#F5E6E0] flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform duration-500 overflow-hidden">
              <span className="text-6xl">✨</span>
            </div>
            <div className="aspect-square rounded-2xl lg:rounded-3xl bg-gradient-to-br from-[#F5F0FF] to-[#E8E0F5] flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform duration-500 overflow-hidden">
              <span className="text-6xl">🌸</span>
            </div>
            <div className="aspect-square rounded-2xl lg:rounded-3xl bg-gradient-to-br from-[#FFF0F5] to-[#F5E0E8] flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform duration-500 overflow-hidden">
              <span className="text-6xl">💖</span>
            </div>
            <div className="aspect-square rounded-2xl lg:rounded-3xl bg-gradient-to-br from-[#F0F8FF] to-[#E0E8F5] flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform duration-500 overflow-hidden">
              <span className="text-6xl">🦋</span>
            </div>
          </div>

          <div className="text-center">
            <button onClick={() => router.push('/book')} className="px-8 py-3 bg-[#D4A59A] text-white rounded-full font-medium hover:bg-[#C47D6D] transition-all duration-200 hover:shadow-lg">
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
            <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">Signature Upgrades</h2>
            <p className="text-lg text-gray-600">Enhance your treatment with these premium add-ons</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Upgrade 1 */}
            <div 
              onClick={() => router.push('/book')}
              className="group bg-[#FFF9F5] rounded-2xl p-6 border border-[#D4A59A]/10 hover:border-[#D4A59A]/40 hover:shadow-lg hover:shadow-[#D4A59A]/10 transition-all duration-300 cursor-pointer"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">🌿</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Cuticle Care</h3>
              <p className="text-sm text-gray-500 mb-3">Healthy, hydrated cuticles</p>
              <div className="flex items-center justify-between">
                <span className="text-[#D4A59A] font-semibold">+£8</span>
                <span className="text-sm text-gray-400">+10 min</span>
              </div>
            </div>

            {/* Upgrade 2 */}
            <div 
              onClick={() => router.push('/book')}
              className="group bg-[#FFF9F5] rounded-2xl p-6 border border-[#D4A59A]/10 hover:border-[#D4A59A]/40 hover:shadow-lg hover:shadow-[#D4A59A]/10 transition-all duration-300 cursor-pointer"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">💆</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Hand Massage</h3>
              <p className="text-sm text-gray-500 mb-3">Relaxing tension release</p>
              <div className="flex items-center justify-between">
                <span className="text-[#D4A59A] font-semibold">+£12</span>
                <span className="text-sm text-gray-400">+15 min</span>
              </div>
            </div>

            {/* Upgrade 3 */}
            <div 
              onClick={() => router.push('/book')}
              className="group bg-[#FFF9F5] rounded-2xl p-6 border border-[#D4A59A]/10 hover:border-[#D4A59A]/40 hover:shadow-lg hover:shadow-[#D4A59A]/10 transition-all duration-300 cursor-pointer"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">💪</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Nail Strengthening</h3>
              <p className="text-sm text-gray-500 mb-3">Extra strength for weak nails</p>
              <div className="flex items-center justify-between">
                <span className="text-[#D4A59A] font-semibold">+£8</span>
                <span className="text-sm text-gray-400">+10 min</span>
              </div>
            </div>

            {/* Upgrade 4 */}
            <div 
              onClick={() => router.push('/book')}
              className="group bg-[#FFF9F5] rounded-2xl p-6 border border-[#D4A59A]/10 hover:border-[#D4A59A]/40 hover:shadow-lg hover:shadow-[#D4A59A]/10 transition-all duration-300 cursor-pointer"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">🎁</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Aftercare Kit</h3>
              <p className="text-sm text-gray-500 mb-3">Take-home care products</p>
              <div className="flex items-center justify-between">
                <span className="text-[#D4A59A] font-semibold">+£15</span>
                <span className="text-sm text-gray-400">Instant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 8. TEAM SECTION */}
      {/* ===================== */}
      <section className="py-20 lg:py-28 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">Meet Our Technicians</h2>
            <p className="text-lg text-gray-600">Expert artists dedicated to beautiful results</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Team Member 1 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-[#D4A59A]/20 transition-all duration-300 text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-[#FFF9F5] to-[#F5E6E0] rounded-full flex items-center justify-center">
                <span className="text-5xl">👩‍🎨</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Sophie</h3>
              <p className="text-[#D4A59A] font-medium text-sm mb-2">Gel Specialist</p>
              <p className="text-sm text-gray-500">8+ years experience in gel art</p>
            </div>

            {/* Team Member 2 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-[#D4A59A]/20 transition-all duration-300 text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-[#F5F0FF] to-[#E8E0F5] rounded-full flex items-center justify-center">
                <span className="text-5xl">🎨</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Maya</h3>
              <p className="text-[#D4A59A] font-medium text-sm mb-2">Nail Artist</p>
              <p className="text-sm text-gray-500">Known for intricate designs</p>
            </div>

            {/* Team Member 3 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-[#D4A59A]/20 transition-all duration-300 text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-[#FFF0F5] to-[#F5E0E8] rounded-full flex items-center justify-center">
                <span className="text-5xl">💅</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Emma</h3>
              <p className="text-[#D4A59A] font-medium text-sm mb-2">Spa Expert</p>
              <p className="text-sm text-gray-500">Specializes in luxury treatments</p>
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
              <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-6">Visit Us</h2>
              
              <div className="space-y-6 mb-8">
                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#FFF9F5] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                    <p className="text-gray-600">Nailify Shoreditch<br />123 High Street, London E1 6AN</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#FFF9F5] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Opening Hours</h3>
                    <p className="text-gray-600">Mon - Sat: 9am - 7pm<br />Sunday: 10am - 5pm</p>
                  </div>
                </div>

                {/* Transport */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#FFF9F5] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Transport</h3>
                    <p className="text-gray-600">5 min from Shoreditch High Street<br />Paid parking available</p>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-4">
                <button onClick={() => router.push('/book')} className="flex-1 px-6 py-3 bg-[#D4A59A] text-white rounded-full font-medium hover:bg-[#C47D6D] transition-all duration-200">
                  Book Now
                </button>
                <button className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-full font-medium hover:border-[#D4A59A] hover:text-[#D4A59A] transition-all duration-200">
                  Get Directions
                </button>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="aspect-square lg:aspect-[4/3] bg-gradient-to-br from-[#F5E6E0] via-[#FDF8F5] to-[#E8D5C8] rounded-3xl flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-[#D4A59A]/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-[#D4A59A]/50 font-medium">Shoreditch, London</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 10. AFTERCARE + GIFT CARDS */}
      {/* ===================== */}
      <section className="py-20 lg:py-28 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Aftercare */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Aftercare Support</h3>
              <div className="space-y-4">
                {[
                  { name: 'Cuticle Oil', desc: 'Keep nails hydrated', price: 8, emoji: '💧' },
                  { name: 'Nail Hardener', desc: 'Maintain strength', price: 12, emoji: '💪' },
                  { name: 'Protection Spray', desc: 'Extend your manicure', price: 10, emoji: '✨' },
                ].map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#FFF9F5] rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{product.emoji}</span>
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.desc}</div>
                      </div>
                    </div>
                    <div className="text-[#D4A59A] font-semibold">£{product.price}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gift Card */}
            <div className="bg-gradient-to-br from-[#D4A59A] to-[#C47D6D] rounded-3xl p-8 text-white flex flex-col justify-center">
              <h3 className="text-2xl font-semibold mb-4">Gift Cards</h3>
              <p className="text-white/80 mb-6">Perfect for anyone who deserves beautiful nails. Available in any amount.</p>
              <div className="flex gap-3 mb-6">
                {[25, 50, 100].map((amount) => (
                  <div key={amount} className="flex-1 bg-white/20 rounded-xl py-3 text-center font-semibold backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer">
                    £{amount}
                  </div>
                ))}
              </div>
              <button className="w-full py-3 bg-white text-[#D4A59A] rounded-full font-semibold hover:bg-white/90 transition-all duration-200">
                Purchase Gift Card
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 11. FINAL CTA */}
      {/* ===================== */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-[#FFF9F5] rounded-3xl p-12 lg:p-16 border border-[#D4A59A]/20 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A59A]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#D4A59A]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative">
              <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">
                Ready for Beautiful Nails?
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
                Secure your slot now and experience the Nailify difference. 
                Premium service, lasting results.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => router.push('/book')}
                  className="px-8 py-4 bg-[#D4A59A] text-white rounded-full font-semibold hover:bg-[#C47D6D] transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Secure Your Slot
                </button>
                <button 
                  onClick={() => scrollToSection('services')}
                  className="px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-full font-semibold hover:border-[#D4A59A] hover:text-[#D4A59A] transition-all duration-200"
                >
                  Browse Services
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 12. FOOTER - Light Premium */}
      {/* ===================== */}
      <footer className="bg-[#FDFCFB] border-t border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div>
              <span className="text-2xl font-semibold text-[#D4A59A]">Nailify</span>
              <p className="mt-4 text-gray-500 text-sm leading-relaxed">
                Premium nail artistry in the heart of Shoreditch. 
                Medical-grade hygiene, expert technicians.
              </p>
              <div className="flex gap-3 mt-6">
                <a href="#" className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:border-[#D4A59A] hover:text-[#D4A59A] transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:border-[#D4A59A] hover:text-[#D4A59A] transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-gray-500">
                <li><button onClick={() => router.push('/book')} className="hover:text-[#D4A59A] transition-colors">Book Now</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-[#D4A59A] transition-colors">Services</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-[#D4A59A] transition-colors">Pricing</button></li>
                <li><button onClick={() => scrollToSection('location')} className="hover:text-[#D4A59A] transition-colors">Contact</button></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Contact</h4>
              <ul className="space-y-2.5 text-gray-500 text-sm">
                <li>Nailify Shoreditch</li>
                <li>123 High Street</li>
                <li>London E1 6AN</li>
                <li className="text-[#D4A59A]">hello@nailify.com</li>
              </ul>
            </div>

            {/* Hours */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Opening Hours</h4>
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
              className="px-6 py-2 bg-[#D4A59A] text-white rounded-full font-medium hover:bg-[#C47D6D] transition-all duration-200"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <StickyBookingCTA hideOnPaths={['/book', '/success']} />
    </div>
  );
}
