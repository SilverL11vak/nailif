'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PremiumImage as Image } from '@/components/ui/PremiumImage';
import { HeroBookingWidget } from '@/components/booking/HeroBookingWidget';
import { StickyBookingCTA } from '@/components/layout/StickyBookingCTA';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';
import { mockServices } from '@/store/mock-data';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation, type Language } from '@/lib/i18n';
import type { NailStyle } from '@/store/booking-types';
import type { Product } from '@/lib/catalog';
interface ServiceCard {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: 'manicure' | 'pedicure' | 'extensions' | 'nail-art';
  isPopular?: boolean;
  resultDescription?: string;
  longevityDescription?: string;
  suitabilityNote?: string;
  imageUrl?: string | null;
}

interface GalleryImageItem {
  id: string;
  imageUrl: string;
  caption: string;
  isFeatured: boolean;
}

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
    'acrylic-extensions': 'https://images.unsplash.com/photo-1583616690835-130bc67bd1b4?w=600&q=80',
    'luxury-spa-manicure': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
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
  category: string;
  stock: number;
  active: boolean;
  isFeatured: boolean;
}> = [
  {
    id: 'rose-cuticle-oil',
    name: 'Rose Cuticle Oil',
    description: 'Daily nourishment for hydrated cuticles and glossy nails.',
    price: 19,
    imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80',
    category: 'Aftercare',
    stock: 40,
    active: true,
    isFeatured: true,
  },
  {
    id: 'silk-hand-cream',
    name: 'Silk Hand Cream',
    description: 'Velvet hydration that keeps hands smooth between visits.',
    price: 24,
    imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&q=80',
    category: 'Aftercare',
    stock: 35,
    active: true,
    isFeatured: false,
  },
  {
    id: 'nail-strength-serum',
    name: 'Nail Strength Serum',
    description: 'Targeted support for brittle nails after gel removal.',
    price: 22,
    imageUrl: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=800&q=80',
    category: 'Aftercare',
    stock: 28,
    active: true,
    isFeatured: false,
  },
  {
    id: 'keratin-repair-balm',
    name: 'Keratin Repair Balm',
    description: 'Repair-focused balm for dry cuticles and nail comfort.',
    price: 27,
    imageUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80',
    category: 'Repair',
    stock: 24,
    active: true,
    isFeatured: false,
  },
  {
    id: 'gloss-protect-topcoat',
    name: 'Gloss Protect Topcoat',
    description: 'Adds shine and helps salon finish last longer.',
    price: 18,
    imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80',
    category: 'Finish care',
    stock: 30,
    active: true,
    isFeatured: false,
  },
  {
    id: 'premium-care-kit',
    name: 'Premium Care Kit',
    description: 'Complete at-home set for stronger and healthier nails.',
    price: 49,
    imageUrl: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=800&q=80',
    category: 'Kit',
    stock: 16,
    active: true,
    isFeatured: false,
  },
];

const clientFeedback = [
  {
    id: 'featured',
    rating: '5.0',
    imageUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=1200&q=80',
  },
  {
    id: 'c1',
    rating: '5.0',
    imageUrl: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=900&q=80',
  },
  {
    id: 'c2',
    rating: '4.9',
    imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=900&q=80',
  },
  {
    id: 'c3',
    rating: '5.0',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=80',
  },
];

export default function Home() {
  const router = useRouter();
  const { t, language, setLanguage, localizePath } = useTranslation();
  const setSelectedStyle = useBookingStore((state) => state.setSelectedStyle);
  const pathname = usePathname();
  const [nextAvailable, setNextAvailable] = useState<string>('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDiscountPill, setShowDiscountPill] = useState(false);
  const [discountPillDismissed, setDiscountPillDismissed] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [serviceCards, setServiceCards] = useState<ServiceCard[]>(mockServices as ServiceCard[]);
  const [galleryItems, setGalleryItems] = useState<GalleryImageItem[]>([]);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);
  const [activeSpecialistImageIndex, setActiveSpecialistImageIndex] = useState<number | null>(null);
  const [isSandraInView, setIsSandraInView] = useState(false);
  const scrollTickingRef = useRef(false);
  const showDiscountPillRef = useRef(showDiscountPill);
  const discountDismissedRef = useRef(discountPillDismissed);
  const sandraImageRef = useRef<HTMLDivElement | null>(null);
  const sandraSectionRef = useRef<HTMLElement | null>(null);
  const productSource = products.length > 0 ? products.slice(0, 8) : fallbackProducts;
  const featuredProduct = productSource.find((product) => product.isFeatured) ?? productSource[0];
  const supportingProducts = productSource.filter((product) => product.id !== featuredProduct?.id).slice(0, 4);

  useEffect(() => {
    showDiscountPillRef.current = showDiscountPill;
  }, [showDiscountPill]);

  useEffect(() => {
    discountDismissedRef.current = discountPillDismissed;
  }, [discountPillDismissed]);

  useEffect(() => {
    let mounted = true;
    const loadNextAvailable = async () => {
      try {
        const response = await fetch('/api/slots?upcoming=1&limit=1');
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

        const formattedDate = new Date(`${slot.date}T00:00:00`).toLocaleDateString(language === 'en' ? 'en-GB' : 'et-EE', {
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

    // Throttle scroll-driven state updates to avoid full-page rerenders on every pixel.
    const handleScroll = () => {
      if (scrollTickingRef.current) return;
      scrollTickingRef.current = true;
      window.requestAnimationFrame(() => {
        const nextScrolled = window.scrollY > 20;
        setIsScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));

        if (!discountDismissedRef.current && !showDiscountPillRef.current) {
          const windowHeight = window.innerHeight;
          const documentHeight = document.documentElement.scrollHeight;
          const scrollTop = window.scrollY;
          const scrollableHeight = Math.max(1, documentHeight - windowHeight);
          const progress = scrollTop / scrollableHeight;
          if (progress > 0.4) {
            setShowDiscountPill(true);
          }
        }

        scrollTickingRef.current = false;
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      mounted = false;
      window.removeEventListener('scroll', handleScroll);
    };
  }, [language, t]);

  useEffect(() => {
    let mounted = true;
    const loadProducts = async () => {
      if (mounted) setProductsLoading(true);
      try {
        const response = await fetch(`/api/products?lang=${language}`);
        if (!response.ok) {
          if (mounted) setProducts([]);
          return;
        }
        const data = (await response.json()) as { products?: Product[] };
        if (mounted && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } catch {
        if (mounted) setProducts([]);
      } finally {
        if (mounted) setProductsLoading(false);
      }
    };
    void loadProducts();
    return () => {
      mounted = false;
    };
  }, [language]);

  useEffect(() => {
    let mounted = true;
    const loadServices = async () => {
      try {
        const response = await fetch(`/api/services?lang=${language}`);
        if (!response.ok) return;
        const data = (await response.json()) as { services?: ServiceCard[] };
        if (mounted && Array.isArray(data.services) && data.services.length > 0) {
          setServiceCards(data.services);
        }
      } catch {
        if (mounted) setServiceCards(mockServices as ServiceCard[]);
      }
    };
    void loadServices();
    return () => {
      mounted = false;
    };
  }, [language]);

  useEffect(() => {
    let mounted = true;
    const loadGallery = async () => {
      try {
        const response = await fetch('/api/gallery');
        if (!response.ok) return;
        const data = (await response.json()) as { images?: GalleryImageItem[] };
        if (mounted && Array.isArray(data.images)) {
          setGalleryItems(data.images);
        }
      } catch {
        if (mounted) setGalleryItems([]);
      }
    };
    void loadGallery();
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

  useEffect(() => {
    const sectionEl = sandraSectionRef.current;
    if (!sectionEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsSandraInView(true);
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(sectionEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const imageEl = sandraImageRef.current;
    if (!imageEl) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      imageEl.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const offset = Math.max(-10, Math.min(12, window.scrollY * 0.022));
        imageEl.style.transform = `translate3d(0, ${offset}px, 0) scale(1.015)`;
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      imageEl.style.transform = 'translate3d(0, 0, 0)';
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
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
  const goToBooking = () => {
    router.push(localizePath('/book'));
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    router.push(localizePath(pathname, newLang));
    setIsLangMenuOpen(false);
  };

  // Handle booking from gallery - deep link to booking with style
  const handleBookStyle = (style: NailStyle) => {
    setSelectedStyle(style);
    router.push(`/book?style=${style.slug}`);
  };
  const openGallery = (index: number) => setActiveGalleryIndex(index);
  const closeGallery = () => setActiveGalleryIndex(null);
  const nextGallery = () => {
    setActiveGalleryIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % galleryCards.length;
    });
  };
  const prevGallery = () => {
    setActiveGalleryIndex((prev) => {
      if (prev === null) return 0;
      return (prev - 1 + galleryCards.length) % galleryCards.length;
    });
  };
  const getStyleLabel = (style: NailStyle) => {
    const key = `homepage.gallery.styleNames.${style.slug}`;
    const localized = t(key);
    return localized === key ? style.name : localized;
  };
  const getStyleCaption = (style: NailStyle) => {
    const key = `homepage.gallery.styleCaptions.${style.slug}`;
    const localized = t(key);
    return localized === key ? '' : localized;
  };
  const getI18nTextOrFallback = (key: string, fallback: string) => {
    const localized = t(key);
    return localized === key ? fallback : localized;
  };

  const servicesSource = serviceCards.length > 0 ? serviceCards : (mockServices as ServiceCard[]);
  const featuredService = servicesSource.find((service) => Boolean(service.isPopular)) ?? servicesSource[0];
  const services = [
    ...(featuredService ? [featuredService] : []),
    ...servicesSource.filter((service) => service.id !== featuredService?.id),
  ].slice(0, 5);
  const regularServices = services.filter((service) => service.id !== featuredService?.id).slice(0, 4);
  const staggeredLeftService = regularServices[0];
  const staggeredStackServices = regularServices.slice(1, 3);
  const centeredWideService = regularServices[3];
  const orderedGalleryItems =
    galleryItems.length > 0
      ? [...galleryItems].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
      : [];
  const galleryUrls = [
    ...(orderedGalleryItems.map((item) => item.imageUrl) ?? []),
    ...nailImages.gallery,
  ].slice(0, 6);
  const galleryCards = nailStyles.slice(0, 5).map((style, index) => ({
    style,
    imageUrl: galleryUrls[index] ?? galleryUrls[0] ?? nailImages.gallery[0],
    caption: getStyleCaption(style) || orderedGalleryItems[index]?.caption || t('homepage.gallery.inspirationLook'),
  }));
  const specialistGallery = Array.from({ length: 3 }).map((_, index) => ({
    imageUrl: orderedGalleryItems[index]?.imageUrl ?? galleryUrls[index] ?? nailImages.gallery[index] ?? nailImages.gallery[0],
    caption:
      orderedGalleryItems[index]?.caption ||
      getI18nTextOrFallback(
        `homepage.team.workCaptions.${index + 1}`,
        language === 'en'
          ? index === 0
            ? 'Gel manicure result'
            : index === 1
              ? 'Luxury spa result'
              : 'Minimal nude design'
          : index === 0
            ? 'Geelmaniküüri tulemus'
            : index === 1
              ? 'Luxury spa tulemus'
              : 'Minimal nude disain'
      ),
  }));
  const openSpecialistImage = (index: number) => setActiveSpecialistImageIndex(index);
  const closeSpecialistImage = () => setActiveSpecialistImageIndex(null);
  const nextSpecialistImage = () => {
    setActiveSpecialistImageIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % specialistGallery.length;
    });
  };
  const prevSpecialistImage = () => {
    setActiveSpecialistImageIndex((prev) => {
      if (prev === null) return 0;
      return (prev - 1 + specialistGallery.length) % specialistGallery.length;
    });
  };

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

  const sectionTitleClass =
    'text-[2.15rem] font-medium leading-[1.08] tracking-[-0.02em] text-[#2d232d] lg:text-[2.72rem]';
  const sectionLeadClass = 'mx-auto max-w-[50ch] text-[1.02rem] leading-7 text-[#6f5d6d]';
  const cardTitleClass = 'text-[1.18rem] font-semibold tracking-[-0.01em] text-[#2f2530]';
  const primaryCtaClass =
    'cta-premium rounded-full font-semibold text-white transition-all duration-200 hover:-translate-y-0.5';
  const secondaryCtaClass =
    'rounded-full border border-[#e7cedd] bg-white/92 font-medium text-[#6d5867] transition-all duration-200 hover:bg-[#fff4fa]';
  const unifiedCardClass =
    'rounded-3xl border border-[#ecdfe7] bg-white shadow-[0_24px_38px_-30px_rgba(95,63,86,0.34)]';
  const unifiedCardSoftClass =
    'rounded-3xl border border-[#efe4eb] bg-white/92 shadow-[0_20px_34px_-30px_rgba(95,63,86,0.28)]';

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
            <nav className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('services')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">{t('nav.services')}</button>
              <button onClick={() => scrollToSection('gallery')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">{t('nav.gallery')}</button>
              <button onClick={() => scrollToSection('products')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">{t('homepage.nav.products')}</button>
              <button onClick={() => scrollToSection('location')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-[15px]">{t('nav.contact')}</button>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setIsLangMenuOpen((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ead8e3] bg-white text-[#7e6178] shadow-[0_14px_24px_-22px_rgba(97,48,85,0.5)] transition hover:border-[#d8b3ca] hover:bg-[#fff6fb]"
                  aria-label="Open language menu"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3.6 9h16.8M3.6 15h16.8M12 3c2.5 2.3 4 5.5 4 9s-1.5 6.7-4 9m0-18c-2.5 2.3-4 5.5-4 9s1.5 6.7 4 9" />
                  </svg>
                </button>
                {isLangMenuOpen && (
                  <div className="absolute right-0 top-12 w-36 overflow-hidden rounded-2xl border border-[#ecdce6] bg-white p-1.5 shadow-[0_22px_34px_-24px_rgba(57,33,52,0.5)]">
                    <button
                      onClick={() => handleLanguageChange('et')}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm ${language === 'et' ? 'bg-[#fff2f9] text-[#6a3b57]' : 'text-[#5f4f5f] hover:bg-[#fff7fc]'}`}
                    >
                      Eesti
                    </button>
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`mt-1 w-full rounded-xl px-3 py-2 text-left text-sm ${language === 'en' ? 'bg-[#fff2f9] text-[#6a3b57]' : 'text-[#5f4f5f] hover:bg-[#fff7fc]'}`}
                    >
                      English
                    </button>
                  </div>
                )}
              </div>
              
              {nextAvailable && (
                <div className="hidden xl:flex items-center gap-2 text-sm text-gray-500">
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
              <button onClick={() => goToPage('/')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">{t('homepage.mobile.home')}</button>
              <button onClick={() => goToSection('services')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">{t('nav.services')}</button>
              <button onClick={() => goToSection('gallery')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">{t('nav.gallery')}</button>
              <button onClick={() => goToSection('products')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">{t('homepage.nav.products')}</button>
              <button onClick={() => goToSection('team')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">{t('homepage.mobile.team')}</button>
              <button onClick={() => goToSection('location')} className="rounded-xl px-3 py-3 text-left text-[#3a2f38] hover:bg-[#fff4fa]">{t('nav.contact')}</button>
            </nav>

            <div className="mt-4 rounded-2xl border border-[#f0dfeb] bg-[#fff7fc] p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#9c8396]">{t('homepage.mobile.language')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLanguageChange('et')}
                  className={`rounded-xl px-3 py-2 text-sm ${language === 'et' ? 'bg-white text-[#6a3b57] shadow-sm' : 'text-[#6f5b6c]'}`}
                >
                  Eesti
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`rounded-xl px-3 py-2 text-sm ${language === 'en' ? 'bg-white text-[#6a3b57] shadow-sm' : 'text-[#6f5b6c]'}`}
                >
                  English
                </button>
              </div>
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
      <section className={`relative overflow-hidden border-b border-[#f2e3eb] pt-24 pb-20 transition-all duration-300 lg:pt-28 lg:pb-32 ${
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
                  priority
                  revealEnabled={false}
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  fallbackSrc="https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=1200&q=80"
                  className="h-full w-full object-cover"
                />
                {/* Subtle overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/34 via-black/5 to-transparent" />
              </div>

              {/* Headline + Single Trust Signal */}
              <div className="max-w-xl" data-motion="hero-copy">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.26em] text-[#b77a9e]">
                  {t('homepage.hero.eyebrow')}
                </p>
                {/* EMOTIONAL HERO HEADLINE */}
                <h1 className="mb-5 text-[2.7rem] font-medium leading-[1.01] tracking-[-0.03em] text-[#2A211D] lg:text-[3.72rem]">
                  {t('hero.headline')}
                </h1>
                
                {/* EMOTIONAL SUBTEXT */}
                <p className="mb-7 max-w-[41ch] text-[1.02rem] leading-7 text-[#6d5b51]">
                  {t('hero.subtext')}
                </p>

                {/* Primary CTA - Dominant with shadow and lift */}
                <button
                  onClick={() => router.push('/book')}
                  className={`${primaryCtaClass} px-9 py-4 text-base shadow-[0_24px_36px_-22px_rgba(156,63,118,0.62)] ring-1 ring-white/25 hover:shadow-[0_28px_40px_-22px_rgba(156,63,118,0.72)]`}
                  style={{ backgroundColor: colors.primary }}
                >
                  {t('hero.cta')}
                </button>

                <div className="mt-5 rounded-2xl border border-[#f1dce8] bg-[#fff7fc] px-4 py-3 text-sm text-[#6f5d6d]">
                  {t('homepage.hero.nextAvailableLine')} {nextAvailable ? nextAvailable.replace(`${t('widget.todayAt')} `, '') : '16:30'}
                </div>

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
                    {t('trust.mustamaeStudio')}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    {t('homepage.hero.loyalClients')}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('trust.hygienicTools')}
                  </div>
                </div>
                <p className="mt-3 text-sm text-[#7c6873]">{t('homepage.hero.trustAnchor')}</p>

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
                    <span className="text-sm text-gray-400">| {t('homepage.hero.loyalClients')}</span>
                </div>
              </div>
            </div>

            {/* Right: Booking Widget */}
            <div className="order-1 lg:col-span-5 lg:order-2 lg:sticky lg:top-24">
              <div className="group relative">
                <div className="pointer-events-none absolute -inset-4 rounded-[38px] bg-[radial-gradient(circle,rgba(224,146,191,0.18)_0%,rgba(224,146,191,0)_72%)]" />
                <div className="pointer-events-none absolute -inset-2 rounded-[34px] ring-1 ring-[#f4ddea]/70" />
              <div id="hero-booking" data-motion="hero-booking" className="relative transition-transform duration-300 group-hover:scale-[1.015]">
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
      <section className="border-y border-[#f0e4eb] bg-white/70 py-8 backdrop-blur-[1px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
            {/* Rating */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">4.9</span>
              <span>{t('trust.googleRating')}</span>
            </div>
            
            {/* Appointments */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">150+</span>
              <span>{t('trust.appointmentsThisWeek')}</span>
            </div>
            
            {/* Hygiene */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">100%</span>
              <span>{t('trust.sterileEquipment')}</span>
            </div>
            
            {/* Products */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">{t('homepage.trust.premium')}</span>
              <span>{t('trust.premiumProducts')}</span>
            </div>
          </div>
          <div className={`mx-auto mt-7 max-w-4xl px-6 py-5 ${unifiedCardSoftClass}`}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#ad7898]">{t('homepage.localAuthority.eyebrow')}</p>
            <h3 className="mt-2 text-xl font-semibold text-[#2f2530]">{t('homepage.localAuthority.title')}</h3>
            <p className="mt-2 text-sm leading-6 text-[#6c596b]">{t('homepage.localAuthority.subtitle')}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[#765c70]">
              <span className="rounded-full border border-[#ead3df] bg-white px-3 py-1">{t('homepage.localAuthority.item1')}</span>
              <span className="rounded-full border border-[#ead3df] bg-white px-3 py-1">{t('homepage.localAuthority.item2')}</span>
              <span className="rounded-full border border-[#ead3df] bg-white px-3 py-1">{t('homepage.localAuthority.item3')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 4. POPULAR SERVICES - CONVERSION OPTIMIZED */}
      {/* ===================== */}
      <section
        id="services-media"
        className="hidden"
        style={{
          background:
            'radial-gradient(circle at 15% 0%, rgba(242, 203, 224, 0.34), transparent 36%), radial-gradient(circle at 85% 18%, rgba(244, 224, 236, 0.46), transparent 42%), linear-gradient(180deg, #fffdfd 0%, #fff8fc 48%, #fffdfc 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: 'radial-gradient(rgba(181,129,153,0.16) 0.6px, transparent 0.6px)',
            backgroundSize: '14px 14px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center lg:mb-16">
            <h2 className={`mb-4 ${sectionTitleClass}`}>{t('services.title')}</h2>
            <p className={sectionLeadClass}>{t('services.subtitle')}</p>
          </div>

          <div className="space-y-8 lg:space-y-10">
            {featuredService && (
              <article
                onClick={() => router.push('/book')}
                className="service-featured group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/80 bg-white/68 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-[6px]"
              >
                <div className="pointer-events-none absolute -inset-8 rounded-[2.6rem] bg-[radial-gradient(circle_at_30%_12%,rgba(223,157,190,0.32),transparent_55%)] animate-[serviceHalo_4.2s_ease-in-out_infinite]" />
                <div className="grid lg:grid-cols-12">
                  <div className="relative h-[21rem] overflow-hidden lg:col-span-6 lg:h-full lg:min-h-[24.5rem]">
                    <div className="absolute left-5 top-5 z-20 rounded-full bg-white/92 px-3.5 py-1.5 text-[11px] font-semibold text-[#7f4f69] shadow-[0_10px_20px_-18px_rgba(98,56,84,0.75)] animate-[serviceBadgeFloat_3.6s_ease-in-out_infinite]">
                      {t('homepage.featuredService.badge')}
                    </div>
                    {(featuredService.imageUrl || nailImages.services[featuredService.id]) ? (
                      <Image
                        src={featuredService.imageUrl ?? nailImages.services[featuredService.id]}
                        alt={featuredService.name}
                        width={1080}
                        height={1400}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[#f7edf4] text-6xl text-[#9f7c91]">MN</div>
                    )}
                  </div>
                  <div className="relative z-10 flex flex-col justify-between p-6 lg:col-span-6 lg:p-9">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#a27189]">{t('homepage.servicesUi.featuredTitle')}</p>
                      <h3 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#2f2530]">{featuredService.name}</h3>
                      <p className="mt-3 text-[1.02rem] leading-7 text-[#594858]">
                        {featuredService.resultDescription || t(`homepage.serviceDecision.fallback.${featuredService.id}.result`)}
                      </p>
                      <p className="mt-2 text-sm text-[#6a5668]">{t('homepage.servicesUi.trustTag1')} • {t('homepage.servicesUi.trustTag2')}</p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#fff1f8] px-3.5 py-1.5 text-xs text-[#6d4e63]">
                        <svg className="h-4 w-4 text-[#9a6b84]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {featuredService.duration} {t('common.minutes')}
                      </div>
                    </div>
                    <div className="mt-7 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#9d7a90]">{t('homepage.servicesUi.priceLabel')}</p>
                        <p className="mt-1 text-[2rem] font-semibold leading-none text-[#2f2530]">EUR {featuredService.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          goToBooking();
                        }}
                        className="rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_30px_rgba(220,120,160,0.25)]"
                        style={{ background: 'linear-gradient(135deg,#d978a7 0%,#c24d86 65%,#ac3d72 100%)' }}
                      >
                        {t('homepage.featuredService.cta')}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            <div className="hidden lg:grid lg:grid-cols-12 lg:gap-7">
              {staggeredLeftService && (
                <article
                  onClick={() => router.push('/book')}
                  className="group relative col-span-5 cursor-pointer overflow-hidden rounded-[1.9rem] border border-white/80 bg-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-[6px]"
                >
                  <div className="relative h-full min-h-[27rem]">
                    <Image
                      src={staggeredLeftService.imageUrl ?? nailImages.services[staggeredLeftService.id] ?? nailImages.gallery[0]}
                      alt={staggeredLeftService.name}
                      width={900}
                      height={1200}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                      <h3 className="text-2xl font-semibold tracking-[-0.02em]">{staggeredLeftService.name}</h3>
                      <p className="mt-1 text-sm text-white/90">
                        {staggeredLeftService.resultDescription || t(`homepage.serviceDecision.fallback.${staggeredLeftService.id}.result`)}
                      </p>
                      <p className="mt-2 text-xs text-white/85">{t('homepage.servicesUi.trustTag1')} • {t('homepage.servicesUi.trustTag2')}</p>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <span className="text-sm text-white/90">{staggeredLeftService.duration} {t('common.minutes')}</span>
                        <p className="text-2xl font-semibold leading-none">EUR {staggeredLeftService.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          goToBooking();
                        }}
                        className="mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_30px_rgba(220,120,160,0.25)]"
                        style={{ background: 'linear-gradient(135deg,#d978a7 0%,#c24d86 65%,#ac3d72 100%)' }}
                      >
                        {t('homepage.servicesUi.cardCta')}
                      </button>
                    </div>
                  </div>
                </article>
              )}

              <div className="col-span-7 space-y-7">
                {staggeredStackServices.map((service) => (
                  <article
                    key={service.id}
                    onClick={() => router.push('/book')}
                    className="group relative cursor-pointer overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/72 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-[6px]"
                  >
                    <div className="relative min-h-[12.75rem]">
                      <Image
                        src={service.imageUrl ?? nailImages.services[service.id] ?? nailImages.gallery[1]}
                        alt={service.name}
                        width={1200}
                        height={700}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
                      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <h3 className="text-xl font-semibold tracking-[-0.01em]">{service.name}</h3>
                        <p className="mt-1 text-sm text-white/90">
                          {service.resultDescription || t(`homepage.serviceDecision.fallback.${service.id}.result`)}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-xs text-white/85">{service.duration} {t('common.minutes')}</span>
                          <p className="text-xl font-semibold">EUR {service.price}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            goToBooking();
                          }}
                          className="mt-3 rounded-full px-4.5 py-2 text-xs font-semibold text-white transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_30px_rgba(220,120,160,0.25)]"
                          style={{ background: 'linear-gradient(135deg,#d978a7 0%,#c24d86 65%,#ac3d72 100%)' }}
                        >
                          {t('homepage.servicesUi.cardCta')}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {centeredWideService && (
              <div className="hidden lg:flex lg:justify-center">
                <article
                  onClick={() => router.push('/book')}
                  className="group relative w-full max-w-4xl cursor-pointer overflow-hidden rounded-[1.95rem] border border-white/80 bg-white/72 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-[6px]"
                >
                  <div className="relative min-h-[18rem]">
                    <Image
                      src={centeredWideService.imageUrl ?? nailImages.services[centeredWideService.id] ?? nailImages.gallery[2]}
                      alt={centeredWideService.name}
                      width={1400}
                      height={780}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                      <h3 className="text-2xl font-semibold tracking-[-0.02em]">{centeredWideService.name}</h3>
                      <p className="mt-1 text-sm text-white/90">
                        {centeredWideService.resultDescription || t(`homepage.serviceDecision.fallback.${centeredWideService.id}.result`)}
                      </p>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs text-white/85">{centeredWideService.duration} {t('common.minutes')}</p>
                          <p className="mt-1 text-2xl font-semibold">EUR {centeredWideService.price}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            goToBooking();
                          }}
                          className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_30px_rgba(220,120,160,0.25)]"
                          style={{ background: 'linear-gradient(135deg,#d978a7 0%,#c24d86 65%,#ac3d72 100%)' }}
                        >
                          {t('homepage.servicesUi.cardCta')}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            )}

            <div className="lg:hidden">
              <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {regularServices.map((service) => (
                  <article
                    key={`mobile-${service.id}`}
                    onClick={() => router.push('/book')}
                    className="group relative min-w-[82%] cursor-pointer overflow-hidden rounded-[1.7rem] border border-white/80 bg-white/72 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-[6px]"
                  >
                    <div className="relative h-[21rem]">
                      <Image
                        src={service.imageUrl ?? nailImages.services[service.id] ?? nailImages.gallery[0]}
                        alt={service.name}
                        width={860}
                        height={1100}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
                      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <h3 className="text-xl font-semibold tracking-[-0.01em]">{service.name}</h3>
                        <p className="mt-1 text-sm text-white/90">
                          {service.resultDescription || t(`homepage.serviceDecision.fallback.${service.id}.result`)}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-sm text-white/90">{service.duration} {t('common.minutes')}</p>
                          <p className="text-xl font-semibold">EUR {service.price}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            goToBooking();
                          }}
                          className="mt-3 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                          style={{ background: 'linear-gradient(135deg,#d978a7 0%,#c24d86 65%,#ac3d72 100%)' }}
                        >
                          {t('homepage.servicesUi.cardCta')}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="border-t border-[#f2e6ed] bg-[#fffbfd] py-20 lg:py-26">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-14">
            <h2 className={`mb-4 ${sectionTitleClass}`}>{t('services.title')}</h2>
            {/* HELPER TEXT */}
            <p className={sectionLeadClass}>{t('services.subtitle')}</p>
          </div>

          <div className="space-y-6 lg:space-y-7">
            {featuredService && (
              <article
                onClick={() => router.push('/book')}
                className={`${unifiedCardClass} group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d8aac2] hover:shadow-[0_34px_52px_-30px_rgba(122,69,106,0.48)]`}
              >
                <div className="grid lg:grid-cols-12">
                  <div className="relative overflow-hidden bg-[#f8edf4] lg:col-span-5">
                    <div className="absolute left-4 top-4 z-10 rounded-full border border-[#e7c3d6] bg-white/95 px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-[#764a64]">
                      {t('homepage.featuredService.badge')}
                    </div>
                    {featuredService.imageUrl || nailImages.services[featuredService.id] ? (
                      <Image
                        src={featuredService.imageUrl ?? nailImages.services[featuredService.id]}
                        alt={featuredService.name}
                        width={960}
                        height={680}
                        className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] lg:h-full lg:min-h-[320px]"
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center text-5xl text-[#9f7c91] lg:h-full lg:min-h-[320px]">MN</div>
                    )}
                  </div>
                  <div className="flex flex-col p-6 lg:col-span-7 lg:p-8">
                    <h3 className="text-2xl font-semibold tracking-[-0.02em] text-[#2f2530]">{featuredService.name}</h3>
                    <p className="mt-3 text-[0.98rem] leading-6 text-[#564553]">
                      {featuredService.resultDescription || t(`homepage.serviceDecision.fallback.${featuredService.id}.result`)}
                    </p>
                    <p className="mt-2 text-sm text-[#675463]">
                      <span className="font-medium text-[#4e3f4c]">{t('homepage.servicesUi.whoForLabel')} </span>
                      {featuredService.suitabilityNote || t(`homepage.serviceDecision.fallback.${featuredService.id}.suitability`)}
                    </p>
                    <p className="mt-3 text-sm text-[#6e5a68]">{featuredService.description}</p>

                    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#5d4a59]">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <svg className="h-4 w-4 text-[#9b7590]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {featuredService.duration} {t('common.minutes')}
                      </span>
                      <span className="h-4 w-px bg-[#e7d1de]" />
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <svg className="h-4 w-4 text-[#9b7590]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                        </svg>
                        {featuredService.longevityDescription || t('homepage.featuredService.longevityFallback')}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-[#765e71]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5fb] px-3 py-1">
                        <span className="text-[#a17291]">✓</span>{t('homepage.servicesUi.trustTag1')}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5fb] px-3 py-1">
                        <span className="text-[#a17291]">✓</span>{t('homepage.servicesUi.trustTag2')}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl border border-[#f0dae6] bg-[#fff7fc] px-3 py-2 text-xs text-[#6a5566]">
                      {t('homepage.featuredService.priceTrust')}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[#9d7a90]">{t('homepage.servicesUi.priceLabel')}</p>
                        <p className="text-[1.75rem] font-semibold leading-none text-[#2f2530]">EUR {featuredService.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          goToBooking();
                        }}
                        className="rounded-2xl px-6 py-3.5 text-sm font-semibold text-white shadow-[0_20px_28px_-18px_rgba(156,63,118,0.58)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_24px_34px_-20px_rgba(156,63,118,0.62)]"
                        style={{ backgroundColor: colors.primary }}
                      >
                        {t('homepage.featuredService.cta')}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {regularServices.map((service) => (
                <article
                  key={service.id}
                  onClick={() => router.push('/book')}
                  className={`${unifiedCardClass} group flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-[#dfbfd1] hover:shadow-[0_28px_42px_-30px_rgba(108,71,96,0.5)]`}
                >
                  <div className="relative overflow-hidden bg-[#f8edf4]">
                    {service.imageUrl || nailImages.services[service.id] ? (
                      <Image
                        src={service.imageUrl ?? nailImages.services[service.id]}
                        alt={service.name}
                        width={880}
                        height={620}
                        className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center text-5xl text-[#9f7c91]">MN</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className={cardTitleClass}>{service.name}</h3>
                    <p className="mt-2 text-[0.95rem] leading-6 text-[#5f4c59]">
                      {service.resultDescription || t(`homepage.serviceDecision.fallback.${service.id}.result`)}
                    </p>
                    <p className="mt-2 text-sm text-[#665465]">
                      <span className="font-medium text-[#4e3f4c]">{t('homepage.servicesUi.whoForLabel')} </span>
                      {service.suitabilityNote || t(`homepage.serviceDecision.fallback.${service.id}.suitability`)}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-[#5e4d5b]">
                      <p className="inline-flex items-center gap-1.5 font-medium">
                        <svg className="h-4 w-4 text-[#9b7590]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {service.duration} {t('common.minutes')}
                      </p>
                      <p className="inline-flex items-center gap-1.5 font-medium">
                        <svg className="h-4 w-4 text-[#9b7590]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                        </svg>
                        {service.longevityDescription || t(`homepage.serviceDecision.fallback.${service.id}.longevity`)}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-[#765e71]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5fb] px-3 py-1">
                        <span className="text-[#a17291]">✓</span>{t('homepage.servicesUi.trustTag1')}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5fb] px-3 py-1">
                        <span className="text-[#a17291]">✓</span>{t('homepage.servicesUi.trustTag2')}
                      </span>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3">
                      <p className="text-[1.48rem] font-semibold leading-none text-[#2f2530]">EUR {service.price}</p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          goToBooking();
                        }}
                        className="rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_18px_26px_-18px_rgba(156,63,118,0.58)]"
                        style={{ backgroundColor: colors.primary }}
                      >
                        {t('homepage.servicesUi.cardCta')}
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
      {/* ===================== */}
      {/* 5. RESULTS GALLERY - EDITORIAL RHYTHM */}
      {/* ===================== */}
      <section id="gallery" className="relative border-t border-[#f2e6ed] bg-[#fff8fc] py-20 lg:py-26">
        <div className="pointer-events-none absolute inset-x-0 mt-6 h-28 bg-[radial-gradient(ellipse_at_center,rgba(225,169,199,0.13)_0%,rgba(225,169,199,0)_72%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center lg:mb-14">
            <h2 className={`mb-4 ${sectionTitleClass}`}>{t('gallery.title')}</h2>
            <p className={sectionLeadClass}>{t('homepage.gallery.subtitle')}</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            {nailStyles[0] && (
              <article
                data-motion="gallery-featured"
                className="group relative overflow-hidden rounded-[2rem] border border-white/80 shadow-[0_34px_52px_-28px_rgba(101,65,90,0.48)] lg:col-span-8 lg:row-span-2"
              >
                <button className="absolute inset-0 z-10" onClick={() => openGallery(0)} aria-label={getStyleLabel(nailStyles[0])} />
                <Image
                  src={galleryCards[0]?.imageUrl ?? galleryUrls[0]}
                  alt={getStyleLabel(nailStyles[0])}
                  width={1200}
                  height={900}
                  className="h-[28rem] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] lg:h-full lg:min-h-[36rem]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 z-20 p-6 text-white lg:p-8">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/80">{t('homepage.gallery.featuredLabel')}</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] lg:text-[2rem]">{getStyleLabel(nailStyles[0])}</h3>
                  <p className="mt-2 max-w-[50ch] text-sm text-white/90">{getStyleCaption(nailStyles[0]) || t('homepage.gallery.featuredQuote')}</p>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleBookStyle(nailStyles[0]);
                    }}
                    className="relative z-30 mt-4 inline-flex rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-[#4b3044] shadow-lg"
                  >
                    {getI18nTextOrFallback('gallery.bookThisStyle', language === 'en' ? 'Book a similar style' : 'Broneeri sarnane stiil')}
                  </button>
                </div>
              </article>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
              {nailStyles.slice(1, 3).map((style, idx) => (
                <article key={style.id} data-motion="gallery-support" className="group relative overflow-hidden rounded-[1.7rem] border border-white/80 shadow-[0_24px_36px_-28px_rgba(98,62,89,0.35)]">
                  <button className="absolute inset-0 z-10" onClick={() => openGallery(idx + 1)} aria-label={getStyleLabel(style)} />
                  <Image
                    src={galleryCards[idx + 1]?.imageUrl ?? galleryUrls[idx + 1] ?? galleryUrls[0]}
                    alt={getStyleLabel(style)}
                    width={700}
                    height={860}
                    className="h-[16.5rem] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] lg:h-[17.5rem]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 z-20 p-4 text-white">
                    <p className="text-base font-semibold">{getStyleLabel(style)}</p>
                    <p className="mt-1 text-xs text-white/90">{galleryCards[idx + 1]?.caption || t('homepage.gallery.inspirationLook')}</p>
                  </div>
                </article>
              ))}
            </div>

            {nailStyles[3] && (
              <article data-motion="gallery-support" className="group relative overflow-hidden rounded-[1.7rem] border border-white/80 shadow-[0_24px_36px_-28px_rgba(98,62,89,0.35)] lg:col-span-5">
                <button className="absolute inset-0 z-10" onClick={() => openGallery(3)} aria-label={getStyleLabel(nailStyles[3])} />
                <Image
                  src={galleryCards[3]?.imageUrl ?? galleryUrls[3] ?? galleryUrls[0]}
                  alt={getStyleLabel(nailStyles[3])}
                  width={980}
                  height={760}
                  className="h-[19rem] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 z-20 p-5 text-white">
                  <p className="text-lg font-semibold">{getStyleLabel(nailStyles[3])}</p>
                  <p className="mt-1 text-sm text-white/90">{galleryCards[3]?.caption || t('homepage.gallery.inspirationLook')}</p>
                </div>
              </article>
            )}

            {nailStyles[4] && (
              <article data-motion="gallery-support" className="group relative overflow-hidden rounded-[1.7rem] border border-white/80 shadow-[0_24px_36px_-28px_rgba(98,62,89,0.35)] lg:col-span-7">
                <button className="absolute inset-0 z-10" onClick={() => openGallery(4)} aria-label={getStyleLabel(nailStyles[4])} />
                <Image
                  src={galleryCards[4]?.imageUrl ?? galleryUrls[4] ?? galleryUrls[0]}
                  alt={getStyleLabel(nailStyles[4])}
                  width={1200}
                  height={760}
                  className="h-[19rem] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 z-20 p-5 text-white">
                  <p className="text-lg font-semibold">{getStyleLabel(nailStyles[4])}</p>
                  <p className="mt-1 text-sm text-white/90">{galleryCards[4]?.caption || t('homepage.gallery.inspirationLook')}</p>
                </div>
              </article>
            )}
          </div>

          <div className="mt-10 rounded-[1.6rem] border border-[#ecd9e5] bg-white/82 px-6 py-5 text-center shadow-[0_24px_36px_-30px_rgba(95,59,83,0.4)] backdrop-blur-sm">
            <p className="text-sm text-[#6f5d6d]">
              {getI18nTextOrFallback('homepage.gallery.ctaLead', language === 'en' ? 'Find your next favorite design.' : 'Leia oma järgmine lemmik disain.')}
            </p>
            <button
              onClick={() => router.push('/book')}
              className="mt-3 rounded-full px-7 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(220,120,160,0.25)]"
              style={{ background: 'linear-gradient(135deg,#d978a7 0%,#c24d86 65%,#ac3d72 100%)' }}
            >
              {t('gallery.bookYourLook')}
            </button>
          </div>
        </div>
      </section>

      {activeGalleryIndex !== null && galleryCards[activeGalleryIndex] && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
          <button
            className="absolute inset-0"
            onClick={closeGallery}
            aria-label={getI18nTextOrFallback('homepage.gallery.closeLightbox', language === 'en' ? 'Close gallery' : 'Sulge galerii')}
          />
          <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[1.8rem] border border-white/35 bg-[#140f13] shadow-[0_36px_60px_-28px_rgba(0,0,0,0.7)]">
            <Image
              src={galleryCards[activeGalleryIndex].imageUrl}
              alt={getStyleLabel(galleryCards[activeGalleryIndex].style)}
              width={1600}
              height={1100}
              className="h-[62vh] w-full object-cover md:h-[70vh]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_56%,rgba(0,0,0,0.7)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 p-5 text-white md:p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-white/75">{t('homepage.gallery.featuredLabel')}</p>
              <h3 className="text-xl font-semibold md:text-2xl">{getStyleLabel(galleryCards[activeGalleryIndex].style)}</h3>
              <p className="max-w-[60ch] text-sm text-white/90">{galleryCards[activeGalleryIndex].caption}</p>
              <button
                onClick={() => handleBookStyle(galleryCards[activeGalleryIndex].style)}
                className="mt-1 inline-flex w-fit rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-[#4b3044]"
              >
                {getI18nTextOrFallback('homepage.gallery.wantThisStyle', language === 'en' ? 'I want this style' : 'Soovin seda stiili')}
              </button>
            </div>
            <button
              onClick={prevGallery}
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white"
            >
              {language === 'en' ? 'Prev' : 'Eelmine'}
            </button>
            <button
              onClick={nextGallery}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white"
            >
              {language === 'en' ? 'Next' : 'Järgmine'}
            </button>
            <button
              onClick={closeGallery}
              className="absolute right-3 top-3 z-20 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white"
            >
              {language === 'en' ? 'Close' : 'Sulge'}
            </button>
          </div>
        </div>
      )}

      {/* ===================== */}
      {/* 8. SIGNATURE UPGRADES */}
      {/* ===================== */}
      <section id="pricing" className="border-t border-[#f2e6ed] bg-[#fff5fa] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center lg:mb-12">
            <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b77f9f]">{t('homepage.addons.eyebrow')}</p>
            <h2 className={sectionTitleClass}>{t('homepage.addons.title')}</h2>
            <p className="mt-3 text-[1.01rem] text-[#7b6778]">{t('homepage.addons.subtitle')}</p>
            <p className="mt-2 text-sm text-[#9a7891]">{t('homepage.addons.helper')}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: t('homepage.addons.items.nailArt'), price: '+EUR 12', time: '+15 min', icon: 'NA' },
              { label: t('homepage.addons.items.repair'), price: '+EUR 8', time: '+10 min', icon: 'RP' },
              { label: t('homepage.addons.items.chromeFinish'), price: '+EUR 10', time: '+10 min', icon: 'CH' },
              { label: t('homepage.addons.items.frenchUpgrade'), price: '+EUR 9', time: '+10 min', icon: 'FR' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => router.push('/book')}
                className="inline-flex items-center gap-3 rounded-full border border-[#e8cfdd] bg-white/90 px-4 py-2 text-left text-[#5f4d5d] shadow-[0_14px_22px_-20px_rgba(101,65,90,0.45)] transition hover:-translate-y-0.5 hover:border-[#d9b4c8] hover:bg-white"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fff2fb] text-xs font-semibold text-[#7f4668]">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-[#9a6e87]">{item.price}</span>
                <span className="text-xs text-[#ad88a0]">{item.time}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 8. TEAM SECTION */}
      {/* ===================== */}
      <section id="team" ref={sandraSectionRef} className="relative overflow-hidden border-t border-[#f2e6ed] bg-[#fffbfd] py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/60 to-transparent" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#b57b9d_0.65px,transparent_0.65px)] [background-size:16px_16px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-motion="sandra-section" className={`relative mx-auto grid max-w-6xl gap-8 rounded-[34px] p-6 backdrop-blur-[2px] lg:grid-cols-12 lg:items-center lg:gap-12 lg:p-10 ${unifiedCardSoftClass}`}>
            <div className="relative lg:col-span-6">
              <div className="pointer-events-none absolute -left-8 -top-8 h-36 w-36 rounded-full bg-[#f4d7e8]/70 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-8 -right-6 h-44 w-44 rounded-full bg-[#f7d9ea]/65 blur-3xl" />
              <div
                ref={sandraImageRef}
                className="group relative overflow-hidden rounded-[24px] shadow-[0_24px_48px_-24px_rgba(94,54,82,0.45)] transition-transform duration-300"
              >
                <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(39,25,37,0.02)_34%,rgba(34,18,31,0.48)_100%)]" />
                <div className="pointer-events-none absolute left-0 top-0 z-20 h-40 w-40 rounded-br-[84px] bg-[radial-gradient(circle_at_top,rgba(253,229,241,0.5),transparent_70%)]" />
                <span className="absolute left-4 top-4 z-30 rounded-full border border-white/55 bg-white/88 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#81506a] shadow-[0_12px_18px_-16px_rgba(65,29,51,0.45)]">
                  {getI18nTextOrFallback('homepage.team.favoriteBadge', language === 'en' ? 'Client favourite' : 'Kliendi lemmik')}
                </span>
                <Image
                  src={orderedGalleryItems[0]?.imageUrl ?? 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80'}
                  alt={getI18nTextOrFallback('homepage.team.imageAlt', language === 'en' ? 'Sandra Samun at Nailify studio' : 'Sandra Samun Nailify stuudios')}
                  width={1200}
                  height={1500}
                  className="h-full min-h-[430px] w-full rounded-[24px] object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </div>
            </div>

            <div className="lg:col-span-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#b77f9f]">
                {getI18nTextOrFallback('homepage.team.eyebrow', language === 'en' ? 'Personal nail technician' : 'Isiklik küünetehnik')}
              </p>
              <h2 className="mt-2 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2d232d] lg:text-[3.05rem]">
                Sandra Samun
              </h2>
              <p className="mt-2 text-sm font-medium text-[#74586e]">{t('homepage.team.subtitle')}</p>
              <p className="mt-2 text-sm font-medium text-[#7b5f73]">{t('homepage.team.authorityLine')}</p>

              <div className="mt-5 flex gap-2.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  t('homepage.team.exp'),
                  t('homepage.team.clients'),
                  t('homepage.team.rating'),
                  getI18nTextOrFallback('homepage.team.trustPremiumProducts', language === 'en' ? 'Premium product system' : 'Premium toodetesüsteem'),
                  getI18nTextOrFallback('homepage.team.trustHygiene', language === 'en' ? 'Medical hygiene protocol' : 'Meditsiiniline hügieen'),
                ].map((chip, index) => (
                  <span
                    key={chip}
                    className={`flex-shrink-0 rounded-full border border-[#edd8e4] bg-white px-3 py-1.5 text-xs font-medium text-[#6f5669] shadow-[0_14px_18px_-18px_rgba(86,44,70,0.42)] transition-all duration-500 ${
                      isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                    }`}
                    style={{ transitionDelay: `${index * 70}ms` }}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  {
                    title: getI18nTextOrFallback('homepage.team.benefits.designs', language === 'en' ? 'Personalized designs' : 'Personaalsed disainid'),
                    description: getI18nTextOrFallback('homepage.team.benefits.designsHint', language === 'en' ? 'Tailored to your hand shape and style.' : 'Kohandatud sinu käe kuju ja stiiliga.'),
                  },
                  {
                    title: getI18nTextOrFallback('homepage.team.benefits.results', language === 'en' ? 'Long-lasting result' : 'Kauapüsiv tulemus'),
                    description: getI18nTextOrFallback('homepage.team.benefits.resultsHint', language === 'en' ? 'Durability that keeps shine for weeks.' : 'Püsivus, mis hoiab läike nädalaid.'),
                  },
                  {
                    title: getI18nTextOrFallback('homepage.team.benefits.consultation', language === 'en' ? 'Consultation first' : 'Konsultatsioon enne hooldust'),
                    description: getI18nTextOrFallback('homepage.team.benefits.consultationHint', language === 'en' ? 'Clear plan before your service starts.' : 'Selge plaan enne hoolduse algust.'),
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="min-w-[220px] rounded-2xl border border-[#edd9e5] bg-white/90 p-3 shadow-[0_18px_26px_-24px_rgba(95,54,81,0.52)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_30px_-20px_rgba(95,54,81,0.42)] sm:min-w-0"
                  >
                    <h3 className="text-sm font-semibold text-[#3b2f3a]">{item.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#7b6677]">{item.description}</p>
                  </article>
                ))}
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9c6d88]">
                  {getI18nTextOrFallback('homepage.team.signatureLabel', language === 'en' ? 'Signature style' : 'Signature stiil')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    getI18nTextOrFallback('homepage.team.signatureTags.1', language === 'en' ? 'Nude luxury' : 'Nude luksus'),
                    getI18nTextOrFallback('homepage.team.signatureTags.2', language === 'en' ? 'Gloss finish' : 'Gloss finish'),
                    getI18nTextOrFallback('homepage.team.signatureTags.3', language === 'en' ? 'Minimal detail' : 'Minimal detail'),
                    getI18nTextOrFallback('homepage.team.signatureTags.4', language === 'en' ? 'Strong structure' : 'Tugev ehitus'),
                  ].map((tag) => (
                    <span key={tag} className="rounded-full border border-[#ead4df] bg-[#fff6fb] px-3 py-1 text-xs font-medium text-[#765b6e]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#9c6c88]">
                  {getI18nTextOrFallback('homepage.team.resultsLabel', language === 'en' ? 'Real work results' : 'Päris töö tulemused')}
                </p>
                <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {specialistGallery.map((item, index) => (
                    <button
                      key={`${item.imageUrl}-${index}`}
                      onClick={() => openSpecialistImage(index)}
                      className="group relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-[#edd9e5] shadow-[0_14px_22px_-18px_rgba(84,46,70,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_30px_-18px_rgba(84,46,70,0.5)] sm:h-[120px] sm:w-[120px]"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.caption}
                        width={240}
                        height={240}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1.5 text-[10px] font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        {item.caption}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7 space-y-2">
                <button
                  onClick={() => router.push('/book')}
                  className="cta-premium inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,#d9669e_0%,#c24d86_50%,#a93d71_100%)] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_26px_40px_-24px_rgba(146,55,104,0.62)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_30px_44px_-22px_rgba(146,55,104,0.72)]"
                >
                  {getI18nTextOrFallback('homepage.team.ctaStrong', language === 'en' ? 'Book with Sandra' : 'Broneeri aeg Sandraga')}
                  <span aria-hidden>{'->'}</span>
                </button>
                <p className="text-xs font-medium text-[#8a6b80]">
                  {getI18nTextOrFallback('homepage.team.weeklyAvailability', language === 'en' ? 'Available slots this week' : 'Vabu aegu sel nädalal')}
                </p>
              </div>
            </div>
          </div>

          <div className="sticky bottom-5 z-20 mt-5 lg:hidden">
            <button
              onClick={() => router.push('/book')}
              className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[linear-gradient(120deg,#d9669e_0%,#c24d86_52%,#a93d71_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_24px_38px_-22px_rgba(142,56,105,0.62)]"
            >
              {getI18nTextOrFallback('homepage.team.ctaStrong', language === 'en' ? 'Book with Sandra' : 'Broneeri aeg Sandraga')}
              <span aria-hidden>{'->'}</span>
            </button>
          </div>
        </div>
      </section>

      {activeSpecialistImageIndex !== null && specialistGallery[activeSpecialistImageIndex] && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-[#140b16]/92 p-4">
          <button
            onClick={closeSpecialistImage}
            className="absolute right-4 top-4 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white"
          >
            {getI18nTextOrFallback('homepage.gallery.closeLightbox', language === 'en' ? 'Close gallery' : 'Sulge galerii')}
          </button>
          <button
            onClick={prevSpecialistImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/12 px-3 py-2 text-xs font-semibold text-white"
          >
            {language === 'en' ? 'Prev' : 'Eelmine'}
          </button>
          <button
            onClick={nextSpecialistImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/12 px-3 py-2 text-xs font-semibold text-white"
          >
            {language === 'en' ? 'Next' : 'Järgmine'}
          </button>
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/12 bg-black/35 shadow-[0_38px_64px_-34px_rgba(0,0,0,0.86)]">
            <Image
              src={specialistGallery[activeSpecialistImageIndex].imageUrl}
              alt={specialistGallery[activeSpecialistImageIndex].caption}
              width={1200}
              height={900}
              className="h-[66vh] w-full object-cover"
            />
            <div className="bg-[linear-gradient(180deg,rgba(22,13,20,0.45)_0%,rgba(20,11,19,0.86)_100%)] px-6 py-5">
              <p className="text-sm font-medium text-white/92">{specialistGallery[activeSpecialistImageIndex].caption}</p>
              <button
                onClick={() => router.push('/book')}
                className="mt-4 rounded-full bg-white px-5 py-2 text-xs font-semibold text-[#5e2d49] transition hover:bg-[#ffe9f5]"
              >
                {getI18nTextOrFallback('homepage.gallery.wantThisStyle', language === 'en' ? 'I want this style' : 'Soovin seda stiili')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== */}
      {/* 9. PRODUCT DISCOVERY */}
      {/* ===================== */}
      <section id="products" className="border-t border-[#f2e6ed] bg-[#fff8fc] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 grid gap-5 lg:grid-cols-12 lg:items-end">
            <div className="max-w-2xl lg:col-span-8 lg:max-w-4xl">
              <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b57b9d]">{t('homepage.products.eyebrow')}</p>
              <h2 className={sectionTitleClass}>
                {getI18nTextOrFallback('homepage.products.retailTitle', language === 'en' ? 'Keep your salon result beautiful for longer' : 'Hoia salongitulemus kauem kaunis')}
              </h2>
              <p className="mt-3 max-w-[54ch] text-[1.01rem] leading-7 text-[#6f5d6d]">
                {getI18nTextOrFallback('homepage.products.retailSubtitle', language === 'en' ? "Sandra's recommended aftercare essentials for shine, durability and healthier nails." : 'Sandra soovitatud järelhooldus läike, püsivuse ja tervemate küünte hoidmiseks.')}
              </p>
              <p className="mt-2 text-sm font-medium text-[#8e6880]">
                {getI18nTextOrFallback('homepage.products.retailSupport', language === 'en' ? 'Curated products you can add to your booking or take home.' : 'Valitud tooted, mida saad lisada broneeringule või võtta koju kaasa.')}
              </p>
            </div>
            <button
              onClick={() => router.push('/shop')}
              className="self-start justify-self-start rounded-full border border-[#e5c9d9] bg-white px-6 py-3 text-sm font-semibold text-[#6a4c64] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#fff3fa] hover:shadow-[0_18px_28px_-22px_rgba(97,48,85,0.45)] lg:col-span-4 lg:justify-self-end"
            >
              {t('homepage.products.explore')}
            </button>
          </div>

          {productsLoading ? (
            <div className="grid items-start gap-5 lg:grid-cols-12">
                <article className={`overflow-hidden rounded-[30px] lg:col-span-7 ${unifiedCardClass}`}>
                <SkeletonBlock className="aspect-[16/10]" />
                <div className="space-y-3 p-6">
                  <SkeletonBlock className="h-5 w-32 rounded-full" />
                  <SkeletonBlock className="h-8 w-2/3" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-4/5" />
                </div>
              </article>
              <div className="grid gap-5 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <article key={`product-side-skeleton-${index}`} className={`overflow-hidden ${unifiedCardClass}`}>
                    <SkeletonBlock className="aspect-[7/5]" />
                    <div className="space-y-2 p-4">
                      <SkeletonBlock className="h-5 w-2/3" />
                      <SkeletonBlock className="h-4 w-full" />
                      <SkeletonBlock className="h-4 w-4/5" />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-12">
              {featuredProduct && (
                <article className={`group self-start overflow-hidden rounded-[30px] lg:col-span-7 ${unifiedCardClass}`}>
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#f8edf3]">
                    {featuredProduct.imageUrl ? (
                      <Image src={featuredProduct.imageUrl} alt={featuredProduct.name} width={1200} height={760} unoptimized className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#7f6679]">{featuredProduct.name}</div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a5272]">
                      {featuredProduct.isFeatured
                        ? getI18nTextOrFallback('homepage.products.badgeRecommended', language === 'en' ? 'Sandra recommends' : 'Sandra soovitab')
                        : t('homepage.products.badgeBestseller')}
                    </span>
                  </div>
                  <div className="space-y-4 p-6 lg:p-7">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-[#fff2f8] px-2.5 py-1 font-semibold text-[#83526c]">
                        {getI18nTextOrFallback('homepage.products.forAftercare', language === 'en' ? 'Aftercare essential' : 'Järelhoolduse lemmik')}
                      </span>
                      <span className="rounded-full border border-[#e8d4df] bg-white px-2.5 py-1 text-[#84687b]">
                        {featuredProduct.category}
                      </span>
                    </div>
                    <h3 className="text-[1.55rem] font-semibold tracking-[-0.015em] text-[#312631]">
                      {featuredProduct.name}
                    </h3>
                    <p className="max-w-[56ch] text-sm leading-6 text-[#6f5f6f]">{featuredProduct.description}</p>
                    <p className="text-xs font-medium text-[#9a7590]">
                      {getI18nTextOrFallback('homepage.products.useCaseFeatured', language === 'en' ? 'Recommended after gel manicure to keep gloss and cuticles balanced.' : 'Soovitatud pärast geelhooldust, et hoida läiget ja küünenahad tasakaalus.')}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-lg font-semibold text-[#b04b80]">EUR {featuredProduct.price}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => router.push('/shop')}
                          className="rounded-full border border-[#e3c4d5] bg-white px-4 py-2 text-xs font-semibold text-[#6a4c64] transition hover:bg-[#fff2fa]"
                        >
                          {getI18nTextOrFallback('homepage.products.ctaViewProduct', language === 'en' ? 'View product' : 'Vaata toodet')}
                        </button>
                        <button
                          onClick={() => router.push('/book')}
                          className="rounded-full bg-[linear-gradient(120deg,#d4669e_0%,#c24d86_52%,#a93d71_100%)] px-4 py-2 text-xs font-semibold text-white shadow-[0_20px_30px_-24px_rgba(139,51,100,0.7)] transition hover:-translate-y-0.5"
                        >
                          {getI18nTextOrFallback('homepage.products.ctaAddWithBooking', language === 'en' ? 'Add with booking' : 'Lisa broneeringule')}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )}

                <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:col-span-5 lg:grid lg:grid-cols-2 lg:gap-5 lg:overflow-visible lg:pb-0">
                  {supportingProducts.map((product, index) => (
                    <article key={product.id} className={`${unifiedCardClass} group min-w-[260px] self-start overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_24px_36px_-24px_rgba(118,75,102,0.45)] lg:min-w-0`}>
                    <div className="relative aspect-[7/5] overflow-hidden bg-[#f8edf3]">
                      {product.imageUrl ? (
                        <Image src={product.imageUrl} alt={product.name} width={700} height={520} unoptimized className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[#7f6679]">{product.name}</div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a5171]">
                        {index === 0 ? t('homepage.products.badgeMostLoved') : t('homepage.products.badgeSalonPick')}
                      </span>
                    </div>
                    <div className="space-y-2 p-4">
                      <h4 className="text-base font-semibold text-[#322a33]">{product.name}</h4>
                      <p className="line-clamp-2 text-xs leading-5 text-[#7a6677]">{product.description}</p>
                      <p className="text-[11px] text-[#9e7690]">
                        {getI18nTextOrFallback('homepage.products.cardUseCase', language === 'en' ? 'Supports longer-lasting salon results.' : 'Toetab kauapüsivamat salongitulemust.')}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#b04b80]">EUR {product.price}</span>
                        <button
                          onClick={() => router.push('/shop')}
                          className="rounded-lg border border-[#e4c6d7] px-3 py-1.5 text-xs font-semibold text-[#6a4c64] transition-colors hover:bg-[#fff3fa]"
                        >
                          {getI18nTextOrFallback('homepage.products.ctaShort', language === 'en' ? 'See product' : 'Vaata toodet')}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===================== */}
      {/* 10. CLIENT PHOTO FEEDBACK */}
      {/* ===================== */}
      <section id="testimonials" className="border-t border-[#f2e6ed] bg-[#fffbfd] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center lg:mb-14">
            <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b77f9f]">{t('homepage.testimonials.eyebrow')}</p>
            <h2 className={sectionTitleClass}>
              {t('homepage.testimonials.title')}
            </h2>
            <p className={`mx-auto mt-3 ${sectionLeadClass}`}>
              {t('homepage.testimonials.subtitle')}
            </p>
          </div>

          <article className={`mb-8 overflow-hidden rounded-[30px] bg-[linear-gradient(130deg,#fff8fc_0%,#fff2f8_52%,#ffe9f4_100%)] px-6 py-8 lg:px-8 lg:py-10 ${unifiedCardSoftClass}`}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#b47f9e]">{t('homepage.testimonials.heroMomentLabel')}</p>
            <blockquote className="mt-3 text-2xl font-medium leading-relaxed tracking-[-0.012em] text-[#3a2c37] lg:text-[2rem]">
              &ldquo;{t('homepage.feedback.featured.quote')}&rdquo;
            </blockquote>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-white/85 px-3 py-1 font-semibold text-[#66475b]">{t('homepage.feedback.featured.name')}</span>
              <span className="rounded-full border border-[#ebd3e0] bg-white/80 px-3 py-1 text-[#7e6376]">{t('homepage.testimonials.heroServiceRef')}</span>
            </div>
          </article>

          <div className="grid gap-5 lg:grid-cols-12">
            <article className={`group relative overflow-hidden rounded-[24px] lg:col-span-7 ${unifiedCardClass}`}>
              <Image
                src={clientFeedback[0].imageUrl}
                alt={`${t('homepage.feedback.featured.name')} nail result`}
                width={1200}
                height={900}
                className="h-[340px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] lg:h-[420px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#5f3e56]">
                  <span className="text-[#c24d86]">&#9733;</span>
                  {clientFeedback[0].rating}
                </div>
                <h3 className="text-xl font-semibold text-white">{t('homepage.feedback.featured.name')}</h3>
                <p className="mt-1 max-w-[50ch] text-xs leading-5 text-white/90 lg:text-sm">
                  &ldquo;{t('homepage.feedback.featured.quote')}&rdquo;
                </p>
              </div>
            </article>

            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
              {clientFeedback.slice(1).map((item) => (
                <article key={item.id} className={`group relative overflow-hidden rounded-2xl ${unifiedCardClass}`}>
                  <Image
                    src={item.imageUrl}
                    alt={`${t(`homepage.feedback.${item.id}.name`)} nail result`}
                    width={900}
                    height={700}
                    className="h-[220px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-[#5f3e56]">
                      <span className="text-[#c24d86]">&#9733;</span>
                      {item.rating}
                    </div>
                    <h3 className="text-base font-semibold text-white">{t(`homepage.feedback.${item.id}.name`)}</h3>
                    <p className="mt-1 text-[11px] leading-4 text-white/90">&ldquo;{t(`homepage.feedback.${item.id}.quote`)}&rdquo;</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 9. LOCATION + HOURS */}
      {/* ===================== */}
      <section id="location" className="border-t border-[#f2e6ed] bg-[#fff9fc] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className={`mb-5 ${sectionTitleClass}`}>{t('homepage.location.title')}</h2>
              <p className={`mb-6 ${sectionLeadClass}`}>{t('homepage.location.subtitle')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#efdde8] bg-white px-4 py-3 text-sm text-[#5d4b58]">{t('homepage.location.badge1')}</div>
                <div className="rounded-2xl border border-[#efdde8] bg-white px-4 py-3 text-sm text-[#5d4b58]">{t('homepage.location.badge2')}</div>
                <div className="rounded-2xl border border-[#efdde8] bg-white px-4 py-3 text-sm text-[#5d4b58]">{t('homepage.location.badge3')}</div>
                <div className="rounded-2xl border border-[#efdde8] bg-white px-4 py-3 text-sm text-[#5d4b58]">{t('homepage.location.badge4')}</div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => router.push('/book')}
                  className={`${primaryCtaClass} px-7 py-3 text-sm shadow-[0_18px_28px_-20px_rgba(141,60,108,0.52)] hover:bg-[#a93d71]`}
                >
                  {t('nav.bookNow')}
                </button>
                <button className={`${secondaryCtaClass} px-6 py-3 text-sm`}>{t('location.getDirections')}</button>
              </div>
            </div>

            <div className="grid gap-4">
              <article className={`overflow-hidden ${unifiedCardClass}`}>
                <Image
                  src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=80"
                  alt="Nailify studio interior"
                  width={1200}
                  height={760}
                  className="h-52 w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#b07a99]">{t('homepage.location.previewEyebrow')}</p>
                  <p className="mt-1 text-sm text-[#5d4b58]">{t('homepage.location.previewText')}</p>
                </div>
              </article>
              <article className={`overflow-hidden ${unifiedCardClass}`}>
                <iframe
                  title={t('homepage.location.mapTitle')}
                  src="https://www.google.com/maps?q=Mustam%C3%A4e+tee+55+Tallinn&output=embed"
                  className="h-56 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 10. AFTERCARE + GIFT CARDS */}
      {/* ===================== */}
      <section className="border-t border-[#f2e6ed] bg-[#fff7fb] py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[#8a657c]">
            <span className="rounded-full border border-[#e6cddd] bg-white/80 px-3 py-1">{t('homepage.revenue.offerA')}</span>
            <span className="rounded-full border border-[#e6cddd] bg-white/80 px-3 py-1">{t('homepage.revenue.offerB')}</span>
            <span className="rounded-full border border-[#e6cddd] bg-white/80 px-3 py-1">{t('homepage.revenue.offerC')}</span>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <article className={`group overflow-hidden ${unifiedCardClass}`}>
              <Image
                src="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200&q=80"
                alt="Aftercare products"
                width={1200}
                height={760}
                className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#b07a99]">{t('homepage.aftercare.eyebrow')}</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#2f2530]">{t('homepage.aftercare.title')}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f5d6d]">{t('homepage.aftercare.subtitle')}</p>
                <ul className="mt-4 space-y-1 text-sm text-[#6f5d6d]">
                  <li>{t('homepage.aftercare.tip1')}</li>
                  <li>{t('homepage.aftercare.tip2')}</li>
                  <li>{t('homepage.aftercare.tip3')}</li>
                </ul>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => router.push('/shop')}
                    className="rounded-xl bg-[#c24d86] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a93d71]"
                  >
                    {t('homepage.aftercare.cta')}
                  </button>
                </div>
              </div>
            </article>

            <article className={`group overflow-hidden ${unifiedCardClass}`}>
              <Image
                src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200&q=80"
                alt="Gift card"
                width={1200}
                height={760}
                className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#b07a99]">{t('homepage.giftcards.eyebrow')}</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#2f2530]">{t('homepage.giftcards.title')}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f5d6d]">{t('homepage.giftcards.subtitle')}</p>
                <p className="mt-2 text-sm font-medium text-[#8e5f7f]">{t('homepage.giftcards.helper')}</p>
                <div className="mt-4 flex gap-2">
                  {[25, 50, 100].map((amount) => (
                    <span key={amount} className="rounded-full border border-[#e7cadb] bg-[#fff7fc] px-3 py-1 text-xs font-semibold text-[#6b4e65]">
                      EUR {amount}
                    </span>
                  ))}
                </div>
                <button
                  className="mt-5 rounded-xl bg-[#c24d86] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a93d71]"
                  style={{ backgroundColor: colors.primary }}
                >
                  {t('homepage.giftcards.cta')}
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 11. HOW BOOKING WORKS - SUPPORT */}
      {/* ===================== */}
      <section className="border-t border-[#f2e6ed] bg-[#fffbfd] py-14 lg:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 lg:mb-10">
            <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b67f9f]">{t('homepage.flow.eyebrow')}</p>
            <h2 className="mb-3 text-[2rem] font-medium tracking-[-0.02em] text-[#2A211D] lg:text-[2.35rem]">{t('howItWorks.title')}</h2>
            <p className="text-[0.98rem] text-[#6f5d53]">{t('howItWorks.subtitle')}</p>
          </div>

          <div className="relative mx-auto max-w-4xl">
            <div className="hidden md:block absolute top-6 left-1/4 right-1/4 h-px bg-[#eadbe5] -translate-y-1/2" />

            <div className="grid gap-6 md:grid-cols-3 lg:gap-10">
              <div
                data-step="1"
                className={`how-it-works-step text-center transition-all duration-700 ${
                  visibleSteps.includes(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 mb-4 relative">
                  <div className="absolute inset-0 bg-[#f8eef4] rounded-full" />
                  <svg className="w-7 h-7 text-[#9f8596] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-2">{t('howItWorks.step1Title')}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t('howItWorks.step1Desc')}</p>
              </div>

              <div
                data-step="2"
                className={`how-it-works-step text-center transition-all duration-700 delay-100 ${
                  visibleSteps.includes(2) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 mb-4 relative">
                  <div className="absolute inset-0 bg-[#f8eef4] rounded-full" />
                  <svg className="w-7 h-7 text-[#9f8596] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-2">{t('howItWorks.step2Title')}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t('howItWorks.step2Desc')}</p>
              </div>

              <div
                data-step="3"
                className={`how-it-works-step text-center transition-all duration-700 delay-200 ${
                  visibleSteps.includes(3) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 mb-4 relative">
                  <div className="absolute inset-0 bg-[#f8eef4] rounded-full" />
                  <svg className="w-7 h-7 text-[#9f8596] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-2">{t('howItWorks.step3Title')}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t('howItWorks.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 12. FINAL CTA - CLOSING ENERGY */}
      {/* ===================== */}
      <section className="border-t border-[#f2e6ed] bg-[#fff8fc] py-20 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div data-motion="major-cta" className="relative overflow-hidden rounded-[34px] border border-[#ebd2e1] bg-[linear-gradient(145deg,#fff2f9_0%,#ffdff0_55%,#ffd3ea_100%)] p-12 shadow-[0_40px_62px_-34px_rgba(130,53,96,0.58)] lg:p-16">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.7),transparent_68%)]" />
            <h2 className="mb-4 text-[2.85rem] font-medium tracking-[-0.03em] text-[#2A211D] lg:text-[3.35rem]">{t('finalCta.title')}</h2>
            <p className="mx-auto mb-7 max-w-[44ch] text-[1.06rem] leading-7 text-[#6f5d53]">
              {t('finalCta.subtitle')}
            </p>
            <p className="mb-6 text-sm font-medium text-[#8d5d79]">{t('homepage.final.limited')}</p>
            
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
                className="cta-premium rounded-full bg-[#c24d86] px-11 py-4 text-base font-semibold text-white transition-all duration-200 shadow-[0_30px_46px_-18px_rgba(156,63,118,0.8)] ring-2 ring-white/35 hover:-translate-y-0.5 hover:bg-[#a93d71] hover:shadow-[0_36px_52px_-18px_rgba(156,63,118,0.88)]"
                style={{ backgroundColor: colors.primary }}
              >
                {t('finalCta.secureSlot')}
              </button>
              <button 
                onClick={() => scrollToSection('services')}
                className={`${secondaryCtaClass} px-8 py-4`}
              >
                {t('finalCta.browseServices')}
              </button>
            </div>
            <p className="mt-6 text-sm text-[#8c5f79]">{t('homepage.final.reassureLine')}</p>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 12. FOOTER - Light Premium */}
      {/* ===================== */}
      <footer className="border-t border-[#ecddea] bg-[#fff9fd] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 border-b border-[#efe0e9] pb-10 text-center md:grid-cols-3 md:text-left">
            <div>
              <span className="text-2xl font-semibold tracking-[0.04em]" style={{ color: colors.primary }}>Nailify</span>
              <p className="mt-3 max-w-[30ch] text-sm leading-6 text-gray-500 md:max-w-none">{t('footer.description')}</p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#7c6977]">{t('footer.quickLinks')}</h4>
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <button onClick={() => router.push('/book')} className="rounded-full border border-[#ead7e3] px-3 py-1.5 text-sm text-[#6f5f6f] transition hover:bg-white">{t('nav.bookNow')}</button>
                <button onClick={() => scrollToSection('services')} className="rounded-full border border-[#ead7e3] px-3 py-1.5 text-sm text-[#6f5f6f] transition hover:bg-white">{t('nav.services')}</button>
                <button onClick={() => scrollToSection('location')} className="rounded-full border border-[#ead7e3] px-3 py-1.5 text-sm text-[#6f5f6f] transition hover:bg-white">{t('nav.contact')}</button>
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#7c6977]">{t('footer.contact')}</h4>
              <p className="text-sm text-gray-500">{t('homepage.footer.contactLine1')}</p>
              <p className="text-sm text-gray-500">{t('homepage.footer.contactLine2')}</p>
              <p className="text-sm text-gray-500">{t('homepage.footer.contactLine3')}</p>
              <p className="mt-2 text-sm font-medium" style={{ color: colors.primary }}>hello@nailify.com</p>
              <p className="mt-2 text-xs text-[#8a7b88]">{t('homepage.footer.hours1Label')}: {t('homepage.footer.hours1Value')}</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 pt-6 sm:flex-row">
            <p className="text-gray-400 text-sm">{t('footer.copyright')}</p>
            <button 
              onClick={() => router.push('/book')}
              className="rounded-full px-6 py-2 text-white font-medium transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: colors.primary }}
            >
              {t('footer.bookAppointment')}
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <StickyBookingCTA hideOnPaths={['/book', '/success']} />

      {/* ===================== */}
      {/* FLOATING DISCOUNT PILL - Mobile Conversion Trigger */}
      {/* ===================== */}
      {showDiscountPill && !discountPillDismissed && (
        <div className="fixed bottom-24 left-4 right-4 z-40 md:hidden">
          <div 
            onClick={() => router.push('/book')}
            className="bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl flex items-center justify-between cursor-pointer animate-in slide-in-from-bottom-4"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white text-gray-900 text-xs font-bold px-2 py-1 rounded-full">-15%</span>
              <span className="text-sm font-medium">{t('discountPill.firstVisit')}</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setDiscountPillDismissed(true);
                setShowDiscountPill(false);
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







