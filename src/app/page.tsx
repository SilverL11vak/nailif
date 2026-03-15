'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { HeroBookingWidget } from '@/components/booking/HeroBookingWidget';
import { StickyBookingCTA } from '@/components/layout/StickyBookingCTA';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { mockServices } from '@/store/mock-data';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import type { NailStyle } from '@/store/booking-types';
import type { Product } from '@/lib/catalog';

// Gallery nail styles for deep linking
const nailStyles: NailStyle[] = [
  { id: '1', name: 'Glossy Pink French', slug: 'glossy-pink-french', recommendedServiceId: 'gel-manicure', emoji: 'P' },
  { id: '2', name: 'Matte Nude', slug: 'matte-nude', recommendedServiceId: 'gel-manicure', emoji: 'N' },
  { id: '3', name: 'Chrome Silver', slug: 'chrome-silver', recommendedServiceId: 'nail-art', emoji: 'C' },
  { id: '4', name: 'Ombre Sunset', slug: 'ombre-sunset', recommendedServiceId: 'gel-manicure', emoji: 'O' },
  { id: '5', name: 'Ruby Red', slug: 'ruby-red', recommendedServiceId: 'gel-manicure', emoji: 'R' },
  { id: '6', name: 'Pearl White', slug: 'pearl-white', recommendedServiceId: 'luxury-spa-manicure', emoji: 'W' },
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

const fallbackProducts: Array<{
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}> = [
  {
    id: 'rose-cuticle-oil',
    name: 'Rose Cuticle Oil',
    description: 'Daily nourishment for glossy, healthy-looking nails.',
    price: 19,
    imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80',
  },
  {
    id: 'silk-hand-cream',
    name: 'Silk Hand Cream',
    description: 'Velvet hydration that supports long-lasting manicure results.',
    price: 24,
    imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&q=80',
  },
  {
    id: 'nail-strength-serum',
    name: 'Nail Strength Serum',
    description: 'Targeted care for brittle nails between appointments.',
    price: 22,
    imageUrl: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=800&q=80',
  },
  {
    id: 'premium-aftercare-set',
    name: 'Premium Aftercare Set',
    description: 'Curated essentials for your at-home nail ritual.',
    price: 49,
    imageUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80',
  },
];

const clientFeedback = [
  {
    id: 'featured',
    name: 'Kristi',
    quote: 'My nails still looked perfect three weeks later. The finish felt truly premium.',
    rating: '5.0',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=80',
  },
  {
    id: 'c1',
    name: 'Anu',
    quote: 'Exactly the shape and tone I wanted.',
    rating: '5.0',
    imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=900&q=80',
  },
  {
    id: 'c2',
    name: 'Laura',
    quote: 'Clean studio, calm service, beautiful result.',
    rating: '4.9',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&q=80',
  },
  {
    id: 'c3',
    name: 'Maria',
    quote: 'Booked quickly and left fully confident.',
    rating: '5.0',
    imageUrl: 'https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=900&q=80',
  },
];

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const setSelectedStyle = useBookingStore((state) => state.setSelectedStyle);
  const [nextAvailable, setNextAvailable] = useState<string>('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [discountPillDismissed, setDiscountPillDismissed] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const featuredProducts = products.length > 0 ? products.slice(0, 6) : fallbackProducts;

  useEffect(() => {
    let mounted = true;
    const loadNextAvailable = async () => {
      try {
        const response = await fetch('/api/slots?upcoming=1&limit=1', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load next slot');
        const data = (await response.json()) as { slots?: Array<{ date: string; time: string }> };
        const slot = data.slots?.[0];
        if (!mounted) return;

        if (!slot) {
          setNextAvailable('');
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];

        if (slot.date === today) {
          setNextAvailable(`${t('widget.todayAt')} ${slot.time}`);
          return;
        }
        if (slot.date === tomorrowDate) {
          setNextAvailable(`${t('widget.tomorrowAt')} ${slot.time}`);
          return;
        }

        const formattedDate = new Date(`${slot.date}T00:00:00`).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        setNextAvailable(`${formattedDate} ${slot.time}`);
      } catch (error) {
        console.error('Homepage next slot load error:', error);
        if (mounted) {
          setNextAvailable('');
        }
      }
    };

    void loadNextAvailable();

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
    return () => {
      mounted = false;
      window.removeEventListener('scroll', handleScroll);
    };
  }, [t]);

  useEffect(() => {
    let mounted = true;
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load products');
        const data = (await response.json()) as { products?: Product[] };
        if (mounted && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } catch (error) {
        console.error('Homepage products load error:', error);
      }
    };
    void loadProducts();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileMenuOpen]);

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

  const goToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    scrollToSection(id);
  };

  const goToPage = (path: string) => {
    setIsMobileMenuOpen(false);
    router.push(path);
  };

  // Handle booking from gallery - deep link to booking with style
  const handleBookStyle = (style: NailStyle) => {
    setSelectedStyle(style);
    router.push(`/book?style=${style.slug}`);
  };

  const services = mockServices.slice(0, 4);

  // Color tokens per correction pass
  const colors = {
    primary: '#c24d86',
    primaryHover: '#a93d71',
    background: '#FFFFFF',
    backgroundAlt: '#fff4f9',
    backgroundTaupe: '#fff8fc',
    border: '#f0dbe6',
    borderSubtle: '#f5e7ef',
    textPrimary: '#2f2530',
    textSecondary: '#564a56',
    textMuted: '#877a87',
  };

  // Show discount pill at 40% scroll
  const showDiscountPill = scrollProgress > 0.4 && !discountPillDismissed;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff5fa_40%,_#fffafc_100%)]">
      {/* ===================== */}
      {/* 1. STICKY HEADER */}
      {/* ===================== */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/92 backdrop-blur-xl shadow-[0_18px_38px_-30px_rgba(97,48,85,0.35)]' 
            : 'bg-white/75 backdrop-blur-lg'
        } border-b border-[#f1e1ea]`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between transition-all duration-300 ${
            isScrolled ? 'h-16' : 'h-20'
          }`}>
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className={`font-semibold tracking-[0.08em] transition-all duration-300 ${
                isScrolled ? 'text-xl' : 'text-2xl'
              }`} style={{ color: colors.primary }}>Nailify</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-10">
              <button onClick={() => scrollToSection('services')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">{t('nav.services')}</button>
              <button onClick={() => scrollToSection('gallery')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">{t('nav.gallery')}</button>
              <button onClick={() => scrollToSection('products')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">Products</button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">Enhancements</button>
              <button onClick={() => scrollToSection('team')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">Team</button>
              <button onClick={() => scrollToSection('location')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">{t('nav.contact')}</button>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              <div className="hidden lg:block">
                <LanguageSwitcher />
              </div>
              
              {/* Next Available */}
              {nextAvailable && (
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>{t('hero.nextAvailable')}: <span style={{ color: colors.primary, fontWeight: 500 }}>{nextAvailable}</span></span>
                </div>
              )}
              
              {/* Book Now Button */}
              <button 
                onClick={() => router.push('/book')}
                className="hidden sm:inline-flex px-6 py-2.5 text-white rounded-full font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_28px_-18px_rgba(142,64,111,0.55)] shadow-[0_14px_24px_-18px_rgba(142,64,111,0.45)]"
                style={{ backgroundColor: colors.primary }}
              >
                {t('nav.bookNow')}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#eddce6] bg-white text-[#6f5b6c] transition-colors hover:bg-[#fff4fa] lg:hidden"
                aria-label="Open menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-[#1f1420]/45 backdrop-blur-sm"
            aria-label="Close menu backdrop"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white px-6 pb-8 pt-6 shadow-[0_26px_44px_-28px_rgba(57,33,52,0.55)]">
            <div className="mb-8 flex items-center justify-between">
              <span className="text-xl font-semibold tracking-[0.06em]" style={{ color: colors.primary }}>Nailify</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#eddce6] text-[#6f5b6c]"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-2 text-[1.02rem]">
              <button onClick={() => goToPage('/')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">Home</button>
              <button onClick={() => goToSection('services')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">Services</button>
              <button onClick={() => goToSection('gallery')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">Gallery</button>
              <button onClick={() => goToSection('products')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">Products</button>
              <button onClick={() => goToSection('team')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">Team</button>
              <button onClick={() => goToSection('location')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">Contact</button>
            </nav>

            <div className="mt-4 rounded-2xl border border-[#f0dfeb] bg-[#fff7fc] p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#9c8396]">Language</p>
              <LanguageSwitcher />
            </div>

            <button
              onClick={() => goToPage('/book')}
              className="mt-5 w-full rounded-xl py-3 font-semibold text-white shadow-[0_16px_26px_-18px_rgba(142,64,111,0.55)]"
              style={{ backgroundColor: colors.primary }}
            >
              {t('nav.bookNow')}
            </button>
          </aside>
        </div>
      )}

      {/* ===================== */}
      {/* 2. HERO SECTION - DOMINATION */}
      {/* ===================== */}
      <section className={`relative overflow-hidden border-b border-[#f2e3eb] pt-24 pb-18 transition-all duration-300 lg:pt-28 lg:pb-28 ${
        isScrolled ? 'pt-20' : ''
      }`}>
        <div className="pointer-events-none absolute -left-10 top-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(224,171,200,0.24)_0%,rgba(224,171,200,0)_72%)]" />
        <div className="pointer-events-none absolute right-0 top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(244,219,234,0.58)_0%,rgba(244,219,234,0)_74%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-[28%] h-44 bg-[radial-gradient(ellipse_at_center,rgba(255,228,242,0.42)_0%,rgba(255,228,242,0)_72%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
            
            {/* Left: Editorial Image + Content */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              {/* Clean Editorial Image */}
              <div className="relative mb-8 aspect-[4/3] overflow-hidden rounded-3xl ring-1 ring-white/90 shadow-[0_34px_56px_-34px_rgba(103,60,93,0.62)] lg:mb-10 lg:aspect-[16/10]">
                <Image
                  src={nailImages.hero}
                  alt="Beautiful manicured nails"
                  width={1200}
                  height={900}
                  className="h-full w-full object-cover"
                />
                {/* Subtle overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/34 via-black/5 to-transparent" />
              </div>

              {/* Headline + Single Trust Signal */}
              <div className="max-w-lg">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.26em] text-[#b77a9e]">
                  Editorial beauty booking
                </p>
                {/* EMOTIONAL HERO HEADLINE */}
                <h1 className="mb-5 text-4xl font-medium leading-[1.04] tracking-[-0.024em] text-[#2A211D] lg:text-[3.35rem]">
                  {t('hero.headline')}
                </h1>
                
                {/* EMOTIONAL SUBTEXT */}
                <p className="mb-7 max-w-[35ch] text-[1.03rem] leading-relaxed text-[#6d5b51]">
                  {t('hero.subtext')}
                </p>

                {/* Primary CTA - Dominant with shadow and lift */}
                <button
                  onClick={() => router.push('/book')}
                  className="rounded-full px-8 py-4 text-lg font-semibold text-white transition-all duration-300 shadow-[0_22px_34px_-22px_rgba(156,63,118,0.58)] hover:-translate-y-0.5 hover:shadow-[0_26px_38px_-22px_rgba(156,63,118,0.65)]"
                  style={{ backgroundColor: colors.primary }}
                >
                  {t('hero.cta')}
                </button>

                {/* MICRO TRUST STRIP */}
                <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {t('trust.certifiedTechnician')}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Mustamae Studio, Tallinn
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
                  <span className="text-sm text-gray-400">| 1,200+ clients</span>
                </div>
              </div>
            </div>

            {/* Right: Booking Widget */}
            <div className="order-1 lg:col-span-5 lg:order-2 lg:sticky lg:top-24">
              <div className="relative">
                <div className="pointer-events-none absolute -inset-4 rounded-[38px] bg-[radial-gradient(circle,rgba(224,146,191,0.18)_0%,rgba(224,146,191,0)_72%)]" />
                <div className="pointer-events-none absolute -inset-2 rounded-[34px] ring-1 ring-[#f4ddea]/70" />
              <div id="hero-booking" className="relative">
                <HeroBookingWidget />
              </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#fff4f9]" />
      </section>

      {/* ===================== */}
      {/* 3. TRUST PROOF STRIP */}
      {/* ===================== */}
      <section className="border-y border-[#f1e2eb] bg-[#fff9fc] py-8">
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
      <section id="services" className="bg-white py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-[2.7rem] font-medium text-[#2A211D] mb-4 tracking-[-0.015em]">Our Services</h2>
            {/* HELPER TEXT */}
            <p className="text-[1.03rem] text-[#6f5d53] max-w-[46ch] mx-auto leading-relaxed">{t('services.subtitle')}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-12 lg:[grid-auto-rows:minmax(140px,auto)]">
            {services.map((service, index) => (
              <div 
                key={service.id}
                onClick={() => router.push('/book')}
                className={`group cursor-pointer overflow-hidden rounded-3xl border border-[#f3e5ed] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#e4bfd3] hover:shadow-[0_24px_38px_-28px_rgba(120,79,106,0.37)] ${
                  index === 0
                    ? 'lg:col-span-6 lg:row-span-2'
                    : index === 1
                      ? 'lg:col-span-6'
                      : 'lg:col-span-3'
                }`}
              >
                {/* Clean Image Area with subtle visual indicator */}
                <div className={`bg-gray-50 flex items-center justify-center relative overflow-hidden group-hover:brightness-95 transition-all duration-300 ${
                  index === 0 ? 'aspect-[4/3]' : index === 1 ? 'aspect-[3/2]' : 'aspect-[4/3]'
                }`}>
                  {nailImages.services[service.id] ? (
                    <Image
                      src={nailImages.services[service.id]}
                      alt={service.name}
                      width={900}
                      height={700}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-5xl opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-110 duration-300">
                      {service.category === 'manicure' ? 'MN' : service.category === 'pedicure' ? 'PD' : service.category === 'extensions' ? 'EX' : 'AR'}
                    </div>
                  )}
                  {/* Subtle overlay on hover */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors duration-300" />
                </div>
                
                {/* Content */}
                <div className={`p-5 ${index === 0 ? 'lg:p-7' : ''}`}>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{service.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {service.duration} {t('common.minutes')}
                    </div>
                    <span className="text-base font-medium text-gray-700">From EUR {service.price}</span>
                  </div>

                  {/* Quick Book CTA */}
                  <button 
                    className="w-full rounded-xl py-2.5 font-medium text-white transition-all duration-200 group-hover:shadow-[0_18px_24px_-16px_rgba(156,63,118,0.52)]"
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
              className="rounded-full px-8 py-3 font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_24px_-16px_rgba(156,63,118,0.52)]"
              style={{ backgroundColor: colors.primary }}
            >
              {t('services.viewAll')}
            </button>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* ===================== */}
      {/* 5. RESULTS GALLERY - EDITORIAL RHYTHM */}
      {/* ===================== */}
      <section id="gallery" className="bg-[linear-gradient(180deg,#2f2230_0%,#231b25_100%)] py-28 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="mb-4 text-3xl font-medium tracking-[-0.015em] text-[#fff2fa] lg:text-[2.75rem]">{t('gallery.title')}</h2>
            <p className="text-lg text-[#e6cfe1]">Curated signature looks designed to inspire your next appointment.</p>
          </div>

          {/* Editorial Gallery Grid with Featured Images */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
            {/* Large Featured Image (positioned to create editorial rhythm) */}
            {nailStyles[0] && (
              <div 
                className="col-span-2 row-span-2 relative overflow-hidden rounded-3xl cursor-pointer group shadow-[0_28px_42px_-26px_rgba(0,0,0,0.6)]"
                onClick={() => handleBookStyle(nailStyles[0])}
              >
                {brokenImages[nailStyles[0].id] ? (
                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#f4d9e9,#e9bfd5)]">
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#4a2f45]">{nailStyles[0].name}</p>
                      <p className="mt-1 text-xs text-[#6e4f68]">Inspiration look</p>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={nailImages.gallery[0]}
                    alt={nailStyles[0].name}
                    onError={() => setBrokenImages((prev) => ({ ...prev, [nailStyles[0].id]: true }))}
                    width={900}
                    height={700}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                {/* Hover zoom + gloss overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                {/* Book this style CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white text-sm font-medium mb-2">{nailStyles[0].name}</span>
                  <span className="rounded-full bg-[#fff4fb]/95 px-4 py-2 text-xs font-semibold text-[#4b3044] shadow-lg">
                    {t('gallery.bookThisStyle')}
                  </span>
                </div>
              </div>
            )}
            
            {/* Regular Images */}
            {nailStyles.slice(1, 4).map((style, idx) => (
              <div 
                key={style.id}
                className="aspect-square rounded-3xl cursor-pointer group overflow-hidden relative shadow-[0_24px_36px_-26px_rgba(0,0,0,0.55)]"
                onClick={() => handleBookStyle(style)}
              >
                {brokenImages[style.id] ? (
                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#f6deec,#edc8db)]">
                    <p className="px-4 text-center text-xs font-medium text-[#5e3f57]">{style.name}</p>
                  </div>
                ) : (
                  <Image
                    src={nailImages.gallery[idx + 1]}
                    alt={style.name}
                    onError={() => setBrokenImages((prev) => ({ ...prev, [style.id]: true }))}
                    width={900}
                    height={700}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                {/* Book this style CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white text-xs font-medium mb-1.5">{style.name}</span>
                  <span className="rounded-full bg-[#fff4fb]/95 px-3 py-1.5 text-xs font-semibold text-[#4b3044]">
                    {t('gallery.bookThisStyle')}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Second Featured Image */}
            {nailStyles[4] && (
              <div 
                className="col-span-2 aspect-square rounded-3xl cursor-pointer group overflow-hidden relative shadow-[0_24px_36px_-26px_rgba(0,0,0,0.55)]"
                onClick={() => handleBookStyle(nailStyles[4])}
              >
                {brokenImages[nailStyles[4].id] ? (
                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#f4d9e9,#e9bfd5)]">
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#4a2f45]">{nailStyles[4].name}</p>
                      <p className="mt-1 text-xs text-[#6e4f68]">Inspiration look</p>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={nailImages.gallery[4]}
                    alt={nailStyles[4].name}
                    onError={() => setBrokenImages((prev) => ({ ...prev, [nailStyles[4].id]: true }))}
                    width={900}
                    height={700}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                {/* Book this style CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white text-sm font-medium mb-2">{nailStyles[4].name}</span>
                  <span className="rounded-full bg-[#fff4fb]/95 px-4 py-2 text-xs font-semibold text-[#4b3044] shadow-lg">
                    {t('gallery.bookThisStyle')}
                  </span>
                </div>
              </div>
            )}

            {/* Last Image */}
            {nailStyles[5] && (
              <div 
                className="aspect-square rounded-3xl cursor-pointer group overflow-hidden relative shadow-[0_24px_36px_-26px_rgba(0,0,0,0.55)]"
                onClick={() => handleBookStyle(nailStyles[5])}
              >
                {brokenImages[nailStyles[5].id] ? (
                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#f6deec,#edc8db)]">
                    <p className="px-4 text-center text-xs font-medium text-[#5e3f57]">{nailStyles[5].name}</p>
                  </div>
                ) : (
                  <Image
                    src={nailImages.gallery[5]}
                    alt={nailStyles[5].name}
                    onError={() => setBrokenImages((prev) => ({ ...prev, [nailStyles[5].id]: true }))}
                    width={900}
                    height={700}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                {/* Book this style CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white text-xs font-medium mb-1.5">{nailStyles[5].name}</span>
                  <span className="rounded-full bg-[#fff4fb]/95 px-3 py-1.5 text-xs font-semibold text-[#4b3044]">
                    {t('gallery.bookThisStyle')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="text-center">
            <button 
              onClick={() => router.push('/book')} 
              className="rounded-full border border-[#f0d3e4] bg-white/95 px-8 py-3 font-medium text-[#5f3b57] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_20px_28px_-20px_rgba(0,0,0,0.45)]"
            >
              {t('gallery.bookYourLook')}
            </button>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 7. PRODUCT DISCOVERY */}
      {/* ===================== */}
      <section id="products" className="bg-[#fff7fc] py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-4 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b57b9d]">Beauty retail</p>
              <h2 className="text-3xl font-medium tracking-[-0.015em] text-[#2f2631] lg:text-[2.55rem]">
                Extend your salon results at home
              </h2>
              <p className="mt-3 text-[1.01rem] text-[#6f5d6d]">
                Curated aftercare designed to protect color, hydration and strength between visits.
              </p>
            </div>
            <button
              onClick={() => router.push('/shop')}
              className="self-start rounded-full border border-[#e5c9d9] bg-white px-6 py-3 text-sm font-semibold text-[#6a4c64] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#fff3fa]"
            >
              Explore products
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {featuredProducts[0] && (
              <article className="group relative overflow-hidden rounded-3xl border border-[#edd8e5] bg-white shadow-[0_24px_40px_-28px_rgba(124,82,109,0.34)] lg:col-span-6">
                <div className="aspect-[4/3] overflow-hidden bg-[#f8ebf3]">
                  {featuredProducts[0].imageUrl ? (
                    <Image
                      src={featuredProducts[0].imageUrl}
                      alt={featuredProducts[0].name}
                      width={900}
                      height={700}
                      unoptimized
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#7d6277]">Featured product</div>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#b582a1]">Editor&apos;s pick</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[#2f2530]">{featuredProducts[0].name}</h3>
                  <p className="mt-2 max-w-[36ch] text-sm leading-6 text-[#6f5d6d]">{featuredProducts[0].description}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-lg font-semibold text-[#b04b80]">EUR {featuredProducts[0].price}</span>
                    <button
                      onClick={() => router.push('/shop')}
                      className="rounded-xl bg-[#c24d86] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a93d71]"
                    >
                      Shop now
                    </button>
                  </div>
                </div>
              </article>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-6">
              {featuredProducts.slice(1, 5).map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-[#efdde8] bg-white shadow-[0_18px_30px_-24px_rgba(124,82,109,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_34px_-24px_rgba(124,82,109,0.34)]"
                >
                  <div className="aspect-[5/4] overflow-hidden bg-[#f9edf4]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={700}
                        height={560}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[#7d6277]">{product.name}</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="text-base font-semibold text-[#322a33]">{product.name}</h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7a6677]">{product.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#b04b80]">EUR {product.price}</span>
                      <button
                        onClick={() => router.push('/shop')}
                        className="rounded-lg border border-[#e4c6d7] px-3 py-1.5 text-xs font-semibold text-[#6a4c64] transition-colors hover:bg-[#fff3fa]"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 7. HOW BOOKING WORKS - FRICTION REMOVAL */}
      {/* ===================== */}
      <section className="bg-white py-24 lg:py-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b67f9f]">Friction removal</p>
            <h2 className="text-3xl lg:text-[2.55rem] font-medium text-[#2A211D] mb-4 tracking-[-0.015em]">How It Works</h2>
            <p className="text-[1.02rem] text-[#6f5d53]">A clear three-step journey designed to feel effortless.</p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="hidden md:block absolute top-6 left-1/4 right-1/4 h-px bg-[#eadbe5] -translate-y-1/2" />

            <div className="grid md:grid-cols-3 gap-8 lg:gap-16">
              <div
                data-step="1"
                className={`how-it-works-step text-center transition-all duration-700 ${
                  visibleSteps.includes(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 mb-5 relative">
                  <div className="absolute inset-0 bg-[#f8eef4] rounded-full" />
                  <svg className="w-8 h-8 text-[#9f8596] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('howItWorks.step1Title')}</h3>
                <p className="text-gray-500 leading-relaxed">{t('howItWorks.step1Desc')}</p>
              </div>

              <div
                data-step="2"
                className={`how-it-works-step text-center transition-all duration-700 delay-100 ${
                  visibleSteps.includes(2) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 mb-5 relative">
                  <div className="absolute inset-0 bg-[#f8eef4] rounded-full" />
                  <svg className="w-8 h-8 text-[#9f8596] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('howItWorks.step2Title')}</h3>
                <p className="text-gray-500 leading-relaxed">{t('howItWorks.step2Desc')}</p>
              </div>

              <div
                data-step="3"
                className={`how-it-works-step text-center transition-all duration-700 delay-200 ${
                  visibleSteps.includes(3) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 mb-5 relative">
                  <div className="absolute inset-0 bg-[#f8eef4] rounded-full" />
                  <svg className="w-8 h-8 text-[#9f8596] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('howItWorks.step3Title')}</h3>
                <p className="text-gray-500 leading-relaxed">{t('howItWorks.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 8. SIGNATURE UPGRADES */}
      {/* ===================== */}
      <section id="pricing" className="bg-white py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-[2.55rem] font-medium text-[#2A211D] mb-4 tracking-[-0.015em]">{t('enhancements.title')}</h2>
            <p className="text-[1.02rem] text-[#6f5d53]">{t('enhancements.subtitle')}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Upgrade 1 */}
            <div 
              onClick={() => router.push('/book')}
              className="cursor-pointer rounded-2xl border border-[#f3e5ed] bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e5c4d6] hover:shadow-[0_18px_28px_-22px_rgba(120,79,106,0.3)]"
            >
              <h3 className="font-medium text-gray-900 mb-1">{t('enhancements.cuticleCare')}</h3>
              <p className="text-sm text-gray-400 mb-3">{t('enhancements.cuticleCareDesc')}</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">+EUR 8</span>
                <span className="text-sm text-gray-400">+10 {t('common.minutes')}</span>
              </div>
            </div>

            {/* Upgrade 2 */}
            <div 
              onClick={() => router.push('/book')}
              className="cursor-pointer rounded-2xl border border-[#f3e5ed] bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e5c4d6] hover:shadow-[0_18px_28px_-22px_rgba(120,79,106,0.3)]"
            >
              <h3 className="font-medium text-gray-900 mb-1">{t('enhancements.handMassage')}</h3>
              <p className="text-sm text-gray-400 mb-3">{t('enhancements.handMassageDesc')}</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">+EUR 12</span>
                <span className="text-sm text-gray-400">+15 {t('common.minutes')}</span>
              </div>
            </div>

            {/* Upgrade 3 */}
            <div 
              onClick={() => router.push('/book')}
              className="cursor-pointer rounded-2xl border border-[#f3e5ed] bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e5c4d6] hover:shadow-[0_18px_28px_-22px_rgba(120,79,106,0.3)]"
            >
              <h3 className="font-medium text-gray-900 mb-1">{t('enhancements.nailStrengthening')}</h3>
              <p className="text-sm text-gray-400 mb-3">{t('enhancements.nailStrengtheningDesc')}</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">+EUR 8</span>
                <span className="text-sm text-gray-400">+10 {t('common.minutes')}</span>
              </div>
            </div>

            {/* Upgrade 4 */}
            <div 
              onClick={() => router.push('/book')}
              className="cursor-pointer rounded-2xl border border-[#f3e5ed] bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e5c4d6] hover:shadow-[0_18px_28px_-22px_rgba(120,79,106,0.3)]"
            >
              <h3 className="font-medium text-gray-900 mb-1">Aftercare Kit</h3>
              <p className="text-sm text-gray-400 mb-3">Take-home care products</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">+EUR 15</span>
                <span className="text-sm text-gray-400">Instant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 8. TEAM SECTION */}
      {/* ===================== */}
      <section id="team" className="py-24 lg:py-32" style={{ backgroundColor: colors.backgroundAlt }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-[34px] border border-[#efdde8] bg-white p-6 shadow-[0_28px_44px_-30px_rgba(107,66,97,0.32)] lg:grid-cols-12 lg:items-center lg:gap-10 lg:p-8">
            <div className="group relative overflow-hidden rounded-[28px] lg:col-span-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(215,157,192,0.26),transparent_65%)]" />
              <Image
                src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80"
                alt="Sandra Samun at Nailify studio"
                width={1200}
                height={1500}
                className="h-full w-full rounded-[28px] object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            </div>

            <div className="lg:col-span-7">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#b77f9f]">Personal specialist</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.015em] text-[#2d232d] lg:text-[2.5rem]">
                Sandra Samun
              </h2>
              <p className="mt-2 text-sm font-medium text-[#7a5e73]">
                Certified Nail Technician / Mustamae Studio
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-[#fff4fa] px-3 py-1 font-medium text-[#7a5b72]">4.9 rating</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#f7f2f8] px-3 py-1 text-[#705a69]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Next slots this week
                </span>
              </div>

              <p className="mt-5 max-w-[52ch] text-[1.02rem] leading-7 text-[#5f4f5f]">
                Sandra combines meticulous technical work with a calm studio experience, creating polished nails designed
                around your lifestyle. Every appointment is tailored for durability, shape balance and refined finish.
              </p>

              <ul className="mt-5 space-y-2 text-sm text-[#5f4f5f]">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#b77f9f]" />
                  8+ years of specialist nail experience in Tallinn
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#b77f9f]" />
                  Medical-grade tool sterilization and strict hygiene protocol
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#b77f9f]" />
                  Premium professional product system for long-lasting wear
                </li>
              </ul>

              <button
                onClick={() => router.push('/book')}
                className="mt-7 rounded-xl bg-[#c24d86] px-6 py-3 font-semibold text-white shadow-[0_18px_30px_-20px_rgba(141,60,108,0.54)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a93d71]"
              >
                Book with Sandra
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 10. CLIENT PHOTO FEEDBACK */}
      {/* ===================== */}
      <section id="testimonials" className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center lg:mb-14">
            <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b77f9f]">Client feedback</p>
            <h2 className="text-3xl font-medium tracking-[-0.015em] text-[#2d232d] lg:text-[2.5rem]">
              Real clients. Real confidence.
            </h2>
            <p className="mx-auto mt-3 max-w-[48ch] text-[1.01rem] text-[#6f5d6d]">
              A quick look at the women behind the results, and why they continue booking with Sandra.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            <article className="group relative overflow-hidden rounded-[28px] lg:col-span-7 lg:row-span-2">
              <Image
                src={clientFeedback[0].imageUrl}
                alt={`${clientFeedback[0].name} feedback`}
                width={1200}
                height={900}
                className="h-full w-full min-h-[420px] object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/12 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#5f3e56]">
                  <span className="text-[#c24d86]">★</span>
                  {clientFeedback[0].rating}
                </div>
                <h3 className="text-2xl font-semibold text-white">{clientFeedback[0].name}</h3>
                <p className="mt-2 max-w-[46ch] text-sm leading-6 text-white/90">
                  “{clientFeedback[0].quote}”
                </p>
              </div>
            </article>

            {clientFeedback.slice(1).map((item) => (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-2xl lg:col-span-5"
              >
                <Image
                  src={item.imageUrl}
                  alt={`${item.name} feedback`}
                  width={900}
                  height={700}
                  className="h-full min-h-[200px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#5f3e56]">
                    <span className="text-[#c24d86]">★</span>
                    {item.rating}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-white/90">“{item.quote}”</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 9. LOCATION + HOURS */}
      {/* ===================== */}
      <section id="location" className="bg-[#fff8fc] py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Info Side */}
            <div>
              <h2 className="text-3xl lg:text-[2.55rem] font-medium text-[#2A211D] mb-6 tracking-[-0.015em]">Visit Us</h2>
              
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
                    <p className="text-gray-500">Nailify Mustamae<br />Mustamae Road 55, Tallinn</p>
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
                    <p className="text-gray-500">{t('location.transportDetail')}</p>
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
                  {t('nav.bookNow')}
                </button>
                <button className="flex-1 rounded-full border border-[#e7cedd] px-6 py-3 font-medium text-[#6d5867] transition-all duration-200 hover:bg-[#fff4fa]">
                  {t('location.getDirections')}
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
                <p className="font-medium text-gray-400">Mustamae, Tallinn</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 10. AFTERCARE + GIFT CARDS */}
      {/* ===================== */}
      <section className="py-24 lg:py-32" style={{ backgroundColor: colors.backgroundAlt }}>
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
                    <div className="text-gray-700 font-medium">EUR {product.price}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gift Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 flex flex-col justify-center">
              <h3 className="text-xl font-medium text-gray-900 mb-2">{t('giftCards.title')}</h3>
              <p className="text-gray-500 mb-5 text-sm">{t('giftCards.subtitle')}</p>
              <div className="flex gap-3 mb-5">
                {[25, 50, 100].map((amount) => (
                  <div 
                    key={amount} 
                    className="flex-1 py-3 text-center font-medium text-gray-700 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    EUR {amount}
                  </div>
                ))}
              </div>
              <button 
                className="w-full py-3 text-white rounded-lg font-medium hover:opacity-90 transition-all duration-200"
                style={{ backgroundColor: colors.primary }}
              >
                {t('giftCards.purchase')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 11. FINAL CTA - CLOSING ENERGY */}
      {/* ===================== */}
      <section className="bg-white py-28 lg:py-36">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-2xl border border-[#f1e0ea] bg-[#fff6fb] p-12 lg:p-16">
            <h2 className="text-3xl lg:text-[2.75rem] font-medium text-[#2A211D] mb-4 tracking-[-0.015em]">
              {t('finalCta.title')}
            </h2>
            <p className="text-[1.06rem] text-[#6f5d53] mb-7 max-w-[42ch] mx-auto leading-relaxed">
              Reserve your appointment in under a minute and enjoy a polished Nailify studio experience.
            </p>
            
            {/* REASSURANCE + RISK REMOVAL MICROCOPY */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t('finalCta.mostClients')}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{t('finalCta.freeReschedule')}</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => router.push('/book')}
                className="rounded-full px-8 py-4 font-semibold text-white transition-all duration-200 shadow-[0_24px_34px_-26px_rgba(156,63,118,0.58)] hover:-translate-y-0.5 hover:bg-[#a93d71] hover:shadow-[0_30px_40px_-26px_rgba(156,63,118,0.66)]"
                style={{ backgroundColor: colors.primary }}
              >
                {t('finalCta.secureSlot')}
              </button>
              <button 
                onClick={() => scrollToSection('services')}
                className="rounded-full border border-[#e8cede] px-8 py-4 font-medium text-[#6d5867] transition-all duration-200 hover:bg-[#fff3fa]"
              >
                Explore Signature Services
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 12. FOOTER - Light Premium */}
      {/* ===================== */}
      <footer className="border-t border-[#ecddea] bg-[#fff7fc] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div>
              <span className="text-xl font-semibold" style={{ color: colors.primary }}>Nailify</span>
              <p className="mt-4 text-gray-500 text-sm leading-relaxed">
                {t('footer.description')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">{t('footer.quickLinks')}</h4>
              <ul className="space-y-2.5 text-gray-500 text-sm">
                <li><button onClick={() => router.push('/book')} className="hover:text-gray-900 transition-colors">{t('nav.bookNow')}</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-gray-900 transition-colors">{t('nav.services')}</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-gray-900 transition-colors">{t('nav.pricing')}</button></li>
                <li><button onClick={() => scrollToSection('location')} className="hover:text-gray-900 transition-colors">{t('nav.contact')}</button></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Contact</h4>
              <ul className="space-y-2.5 text-gray-500 text-sm">
                <li>Nailify Mustamae</li>
                <li>Mustamae Road 55</li>
                <li>Tallinn, Estonia</li>
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
            <p className="text-gray-400 text-sm">{t('footer.copyright')}</p>
            <button 
              onClick={() => router.push('/book')}
              className="px-6 py-2 text-white rounded-full font-medium hover:opacity-90 transition-all duration-200"
              style={{ backgroundColor: colors.primary }}
            >
              Reserve Appointment
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
              <span className="bg-white text-gray-900 text-xs font-bold px-2 py-1 rounded-full">-15%</span>
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







