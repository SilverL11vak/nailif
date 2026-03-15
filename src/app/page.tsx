'use client';

import { HeroBookingWidget } from '@/components/booking/HeroBookingWidget';
import { StickyBookingCTA } from '@/components/layout/StickyBookingCTA';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-semibold text-[#D4A59A]">Nailify</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-gray-600 hover:text-[#D4A59A] transition-colors">Services</a>
              <a href="#gallery" className="text-gray-600 hover:text-[#D4A59A] transition-colors">Gallery</a>
              <a href="#location" className="text-gray-600 hover:text-[#D4A59A] transition-colors">Location</a>
              <button className="px-4 py-2 bg-[#D4A59A] text-white rounded-xl font-medium hover:bg-[#C47D6D] transition-colors">
                Book Now
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 lg:pt-32 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left Column - Messaging */}
            <div className="pt-4">
              <h1 className="text-4xl lg:text-5xl font-semibold text-gray-800 leading-tight mb-6">
                Book your perfect nails in seconds
              </h1>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-1 text-amber-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold text-gray-800">4.9</span>
                  <span className="text-gray-500">(1,200+ clients)</span>
                </div>
              </div>

              <div className="space-y-2 text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Medical-grade sterilization</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Single-use tools</span>
                </div>
              </div>
            </div>

            {/* Right Column - Booking Widget */}
            <div>
              <HeroBookingWidget />
            </div>
          </div>
        </div>
      </section>

      {/* Popular Services Section */}
      <section id="services" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-8 text-center">Popular Services</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Gel Manicure', price: 'From £35', duration: '45 min', image: '💅' },
              { name: 'Acrylic Extensions', price: 'From £65', duration: '90 min', image: '✨' },
              { name: 'Luxury Spa', price: 'From £55', duration: '60 min', image: '🧖‍♀️' },
              { name: 'Gel Pedicure', price: 'From £40', duration: '50 min', image: '🦶' },
            ].map((service, i) => (
              <div key={i} className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-[#D4A59A] hover:shadow-lg transition-all duration-200 cursor-pointer group">
                <div className="text-4xl mb-4 text-center">{service.image}</div>
                <h3 className="font-semibold text-gray-800 mb-1">{service.name}</h3>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{service.duration}</span>
                  <span className="text-[#D4A59A] font-medium">{service.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-[#F5F0EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-12 text-center">How Booking Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🎯', title: 'Choose', desc: 'Pick your treatment' },
              { icon: '📅', title: 'Schedule', desc: 'Select date & time' },
              { icon: '✨', title: 'Relax', desc: 'We will confirm instantly' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl mb-4">{step.icon}</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section id="location" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Visit Us</h2>
              <div className="space-y-4 text-gray-600">
                <p className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Nailify Shoreditch, 123 High Street, London
                </p>
                <p className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#D4A59A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mon-Sat: 9am - 7pm, Sun: 10am - 5pm
                </p>
              </div>
            </div>
            <div className="bg-gray-100 rounded-2xl h-64 flex items-center justify-center">
              <span className="text-gray-400">Map Preview</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2026 Nailify. All rights reserved.</p>
        </div>
      </footer>

      {/* Sticky CTA for Mobile */}
      <StickyBookingCTA hideOnPaths={['/book', '/success']} />
    </div>
  );
}
