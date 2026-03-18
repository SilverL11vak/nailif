'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PremiumImage as Image } from '@/components/ui/PremiumImage';
import { HeroBookingWidget } from '@/components/booking/HeroBookingWidget';
import { StickyBookingCTA } from '@/components/layout/StickyBookingCTA';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation, type Language } from '@/lib/i18n';
import type { NailStyle } from '@/store/booking-types';
import type { Product } from '@/lib/catalog';
import { Globe, Heart, ShoppingBag, Menu, ArrowRight } from 'lucide-react';
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

const galleryFallbackKeys = [
  'gallery_fallback_1',
  'gallery_fallback_2',
  'gallery_fallback_3',
  'gallery_fallback_4',
  'gallery_fallback_5',
  'gallery_fallback_6',
];

export default function Home() {
  const router = useRouter();
  const { t, language, setLanguage, localizePath } = useTranslation();
  const setSelectedStyle = useBookingStore((state) => state.setSelectedStyle);
  const { favoritesCount, isFavorite, toggleFavorite } = useFavorites();
  const { cartCount } = useCart();
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
  const [homepageMedia, setHomepageMedia] = useState<Record<string, string>>({});
  const [serviceCards, setServiceCards] = useState<ServiceCard[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryImageItem[]>([]);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);
  const [activeSpecialistImageIndex, setActiveSpecialistImageIndex] = useState<number | null>(null);
  const [isSandraInView, setIsSandraInView] = useState(false);
  const [heroBookingFocused, setHeroBookingFocused] = useState(false);
  const scrollTickingRef = useRef(false);
  const showDiscountPillRef = useRef(showDiscountPill);
  const discountDismissedRef = useRef(discountPillDismissed);
  const sandraImageRef = useRef<HTMLDivElement | null>(null);
  const sandraSectionRef = useRef<HTMLElement | null>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const media = (key: string) => homepageMedia[key]?.trim() ?? '';
  const [feedbackItems, setFeedbackItems] = useState<Array<{ id: string; clientName: string; clientAvatarUrl: string | null; rating: number; feedbackText: string; sourceLabel: string | null }>>([]);
  const [homepageAddOns, setHomepageAddOns] = useState<Array<{ id: string; name: string; duration: number; price: number }>>([]);
  // Products: Only use API data - no hardcoded fallback
  // If API returns empty, the section will show an empty state
  const productSource = products;
  const featuredProduct = productSource.find((product) => product.isFeatured) ?? productSource[0];
  const supportingProducts = productSource.filter((product) => product.id !== featuredProduct?.id);
  const retailProducts = productSource;

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
        const data = (await response.json()) as { slots?: Array<{ date: string; time: string; available?: boolean }> };
        const slot = data.slots?.[0];
        if (!mounted) return;
        if (!slot || slot.available === false) {
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
        if (mounted) setServiceCards([]);
      }
    };
    void loadServices();
    return () => {
      mounted = false;
    };
  }, [language]);

  useEffect(() => {
    let mounted = true;
    const loadFeedback = async () => {
      try {
        const response = await fetch('/api/feedback?visible=1');
        if (!response.ok) return;
        const data = (await response.json()) as { feedback?: Array<{ id: string; clientName: string; clientAvatarUrl: string | null; rating: number; feedbackText: string; sourceLabel: string | null }> };
        if (mounted && Array.isArray(data.feedback)) {
          setFeedbackItems(data.feedback);
        }
      } catch {
        if (mounted) setFeedbackItems([]);
      }
    };
    void loadFeedback();
    return () => {
      mounted = false;
    };
  }, []);

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
    let mounted = true;
    const loadHomepageMedia = async () => {
      try {
        const response = await fetch('/api/homepage-media');
        if (!response.ok) return;
        const data = (await response.json()) as { mediaMap?: Record<string, string> };
        if (mounted && data.mediaMap) {
          setHomepageMedia(data.mediaMap);
        }
      } catch {
        if (mounted) {
          setHomepageMedia({});
        }
      }
    };
    void loadHomepageMedia();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadAddOns = async () => {
      try {
        const response = await fetch(`/api/booking-addons?lang=${language}`);
        if (!response.ok) return;
        const data = (await response.json()) as { addOns?: Array<{ id: string; name: string; duration: number; price: number }> };
        if (mounted && Array.isArray(data.addOns)) {
          setHomepageAddOns(data.addOns);
        }
      } catch {
        if (mounted) setHomepageAddOns([]);
      }
    };
    void loadAddOns();
    return () => { mounted = false; };
  }, [language]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    previousFocusedElementRef.current = document.activeElement as HTMLElement | null;
    const panel = mobileMenuPanelRef.current;
    const closeButton = panel?.querySelector<HTMLElement>('[data-mobile-menu-close="true"]');
    closeButton?.focus();

    const focusableSelector =
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusables = Array.from(
        panel?.querySelectorAll<HTMLElement>(focusableSelector) ?? []
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);

      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      previousFocusedElementRef.current?.focus();
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
  // Avoid leaking translation keys when service-specific fallback is missing (use generic fallback)
  const getServiceFallback = (serviceId: string, kind: 'result' | 'suitability' | 'longevity', genericFallback: string) => {
    const key = `homepage.serviceDecision.fallback.${serviceId}.${kind}`;
    const localized = t(key);
    return localized === key ? genericFallback : localized;
  };

  // Services: Only use API data - no mockServices fallback
  // If API returns empty, the section will show an empty state
  const servicesSource = serviceCards.length > 0 ? serviceCards : [];
  const featuredService = servicesSource.find((service) => Boolean(service.isPopular)) ?? servicesSource[0];
  const services = [
    ...(featuredService ? [featuredService] : []),
    ...servicesSource.filter((service) => service.id !== featuredService?.id),
  ];
  // Show all active services - no arbitrary slice limits
  const regularServices = services.filter((service) => service.id !== featuredService?.id);
  const orderedGalleryItems =
    galleryItems.length > 0
      ? [...galleryItems].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
      : [];
  const galleryFallbackUrls = galleryFallbackKeys
    .map((key) => media(key))
    .filter((value) => Boolean(value));
  const galleryUrls = [
    ...(orderedGalleryItems.map((item) => item.imageUrl) ?? []),
    ...galleryFallbackUrls,
  ].slice(0, 6);
  const galleryCards = nailStyles.slice(0, 5).map((style, index) => ({
    style,
    imageUrl: galleryUrls[index] ?? galleryUrls[0] ?? '',
    caption: getStyleCaption(style) || orderedGalleryItems[index]?.caption || t('homepage.gallery.inspirationLook'),
  }));
  const specialistGallery = Array.from({ length: 3 }).map((_, index) => ({
    imageUrl: orderedGalleryItems[index]?.imageUrl ?? galleryUrls[index] ?? media('team_portrait') ?? galleryUrls[0] ?? '',
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
  const goToProduct = (productId: string) => router.push(localizePath(`/shop/${productId}`));
  const goToShop = () => router.push(localizePath('/shop'));
  const goToFavorites = () => router.push(localizePath('/favorites'));
  const focusHeroBooking = () => {
    const target = document.getElementById('hero-booking');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHeroBookingFocused(true);
      window.setTimeout(() => setHeroBookingFocused(false), 1300);
      return;
    }
    router.push('/book');
  };
  /* Design system: use globals.css tokens; colors kept for one-off inline use only */
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

  const navLinkClass =
    'type-navbar-link group relative py-1 text-[#584a58] transition-colors duration-200 hover:text-[#2f2530]';
  const utilityIconClass =
    'type-navbar-icon-btn relative hidden lg:inline-flex';

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
              <span
                className={`font-brand type-navbar-logo leading-none transition-all duration-300 ${isScrolled ? 'lg:text-[34px]' : 'lg:text-[38px]'}`}
                style={{ color: colors.primary, letterSpacing: '-0.015em' }}
              >
                Nailify
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('services')} className={navLinkClass}><span>{t('nav.services')}</span><span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-[#c996b4] transition-transform duration-140 group-hover:scale-x-100" /></button>
              <button onClick={() => scrollToSection('gallery')} className={navLinkClass}><span>{t('nav.gallery')}</span><span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-[#c996b4] transition-transform duration-140 group-hover:scale-x-100" /></button>
              <button onClick={() => scrollToSection('products')} className={navLinkClass}><span>{t('homepage.nav.products')}</span><span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-[#c996b4] transition-transform duration-140 group-hover:scale-x-100" /></button>
              <button onClick={() => scrollToSection('location')} className={navLinkClass}><span>{t('nav.contact')}</span><span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-[#c996b4] transition-transform duration-140 group-hover:scale-x-100" /></button>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setIsLangMenuOpen((prev) => !prev)}
                  className="type-navbar-icon-btn"
                  aria-label="Open language menu"
                >
                  <Globe size={18} strokeWidth={1.8} />
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

              <button
                onClick={goToFavorites}
                className={utilityIconClass}
                aria-label={language === 'en' ? 'Open favourites' : 'Ava lemmikud'}
                title={language === 'en' ? 'Favourites' : 'Lemmikud'}
              >
                <Heart size={18} strokeWidth={1.8} fill={favoritesCount > 0 ? 'currentColor' : 'none'} />
                {favoritesCount > 0 && (
                  <span className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/4 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-[#c24d86] px-0.5 text-[9px] font-semibold text-white">
                    {favoritesCount > 9 ? '9+' : favoritesCount}
                  </span>
                )}
              </button>

              <button
                onClick={goToShop}
                className={utilityIconClass}
                aria-label={language === 'en' ? 'Open shop' : 'Ava pood'}
                title={language === 'en' ? 'Shop' : 'Pood'}
              >
                <ShoppingBag size={18} strokeWidth={1.8} />
                {cartCount > 0 && (
                  <span className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/4 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-[#c24d86] px-0.5 text-[9px] font-semibold text-white">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
               
              {nextAvailable && (
                <div className="type-navbar-utility hidden lg:flex items-center gap-1.5 text-[#7a6978]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>
                    {getI18nTextOrFallback('homepage.nav.nextTimeCompact', language === 'en' ? 'Next slot' : 'Järgmine aeg')}{' '}
                    <span className="font-semibold text-[#73556a]">{nextAvailable}</span>
                  </span>
                </div>
              )}
              
              {/* Book Now Button */}
              <button 
                onClick={() => router.push('/book')}
                className="type-navbar-cta btn-primary h-11 hidden lg:inline-flex px-6 text-white"
              >
                {t('nav.bookNow')}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#d4b4c7] bg-transparent text-[#7a6174] hover:border-[#b8659a] hover:bg-[#fff1f8] transition-all duration-180 lg:hidden"
                aria-label="Open menu"
              >
                <Menu size={18} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="mobile-menu-anim-overlay absolute inset-0 bg-[#1f141d]/45 [animation:mobileMenuOverlayIn_200ms_ease-out_both]"
            aria-label="Close menu backdrop"
          />
          <aside
            ref={mobileMenuPanelRef}
            role="dialog"
            aria-modal="true"
            className="mobile-menu-anim-panel absolute inset-y-0 right-0 w-[86%] max-w-sm overflow-y-auto bg-[#fffdfd] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_30px_56px_-34px_rgba(57,33,52,0.52)] [animation:mobileMenuPanelIn_240ms_cubic-bezier(0.22,0.8,0.22,1)_both]"
          >
            <div className="flex min-h-full flex-col">
              <div className="mb-7 flex items-center justify-between border-b border-[#efe2ea] pb-5">
                <span
                  className="font-brand type-navbar-logo leading-none"
                  style={{ color: colors.primary }}
                >
                  Nailify
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-mobile-menu-close="true"
                  className="inline-flex h-[37px] w-[37px] items-center justify-center rounded-full border border-[#e8d9e3] text-[#6f5b6c] transition-colors duration-200 active:bg-[#f9eef5]"
                  aria-label="Close menu"
                >
                  <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="space-y-[26px]" aria-label="Mobile primary navigation">
                <button
                  onClick={() => goToPage('/')}
                  className="type-mobile-nav mobile-menu-anim-item min-h-11 w-full py-2.5 text-left text-[22px] text-[#2f2530] transition-opacity duration-150 active:opacity-70 [animation:mobileMenuItemIn_220ms_ease-out_both]"
                  style={{ animationDelay: '0ms' }}
                >
                  {t('homepage.mobile.home')}
                </button>
                <button
                  onClick={() => goToSection('services')}
                  className="type-mobile-nav mobile-menu-anim-item min-h-11 w-full py-2.5 text-left text-[22px] text-[#2f2530] transition-opacity duration-150 active:opacity-70 [animation:mobileMenuItemIn_220ms_ease-out_both]"
                  style={{ animationDelay: '18ms' }}
                >
                  {t('nav.services')}
                </button>
                <button
                  onClick={() => goToSection('gallery')}
                  className="type-mobile-nav mobile-menu-anim-item min-h-11 w-full py-2.5 text-left text-[22px] text-[#2f2530] transition-opacity duration-150 active:opacity-70 [animation:mobileMenuItemIn_220ms_ease-out_both]"
                  style={{ animationDelay: '36ms' }}
                >
                  {t('nav.gallery')}
                </button>
                <button
                  onClick={() => goToSection('products')}
                  className="type-mobile-nav mobile-menu-anim-item min-h-11 w-full py-2.5 text-left text-[22px] text-[#2f2530] transition-opacity duration-150 active:opacity-70 [animation:mobileMenuItemIn_220ms_ease-out_both]"
                  style={{ animationDelay: '54ms' }}
                >
                  {t('homepage.nav.products')}
                </button>
                <button
                  onClick={() => goToSection('team')}
                  className="type-mobile-nav mobile-menu-anim-item min-h-11 w-full py-2.5 text-left text-[22px] text-[#2f2530] transition-opacity duration-150 active:opacity-70 [animation:mobileMenuItemIn_220ms_ease-out_both]"
                  style={{ animationDelay: '72ms' }}
                >
                  {t('homepage.mobile.team')}
                </button>
                <button
                  onClick={() => goToSection('location')}
                  className="type-mobile-nav mobile-menu-anim-item min-h-11 w-full py-2.5 text-left text-[22px] text-[#2f2530] transition-opacity duration-150 active:opacity-70 [animation:mobileMenuItemIn_220ms_ease-out_both]"
                  style={{ animationDelay: '90ms' }}
                >
                  {t('nav.contact')}
                </button>
              </nav>

              <div className="mobile-menu-anim-item mt-6 border-t border-[#f0e4eb]/35 pt-5 [animation:mobileMenuItemIn_220ms_ease-out_both] w-[60%] mx-auto" style={{ animationDelay: '118ms' }}>
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => goToPage(localizePath('/favorites'))}
                    className="type-navbar-utility inline-flex min-h-11 items-center gap-2 text-[#6e5c6c] transition-colors duration-200 active:text-[#4d3c4b]"
                  >
                    <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.35-9.5-8.6C.9 9.05 2.15 5.5 5.9 5.5c2.1 0 3.4 1.1 4.1 2.15.7-1.05 2-2.15 4.1-2.15 3.75 0 5 3.55 3.4 6.9C19.5 16.65 12 21 12 21z" /></svg>
                    <span>{language === 'en' ? 'Favourites' : 'Lemmikud'}</span>
                    {favoritesCount > 0 && (
                      <span className="rounded-full bg-[#c24d86] px-1.5 text-[10px] font-semibold text-white">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => goToPage(localizePath('/shop'))}
                    className="type-navbar-utility inline-flex min-h-11 items-center gap-2 text-[#6e5c6c] transition-colors duration-200 active:text-[#4d3c4b]"
                  >
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7.5 8.5V7.75a4.5 4.5 0 019 0v.75m-10 0h11l-.86 9.02a1.5 1.5 0 01-1.49 1.36H8.35a1.5 1.5 0 01-1.49-1.36L6 8.5z" /></svg>
                    <span>{language === 'en' ? 'Cart' : 'Korv'}</span>
                    {cartCount > 0 && (
                      <span className="rounded-full bg-[#c24d86] px-1.5 text-[10px] font-semibold text-white">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </button>
                </div>

                <div className="mt-3 inline-flex h-9 items-center rounded-full border border-[#e8d9e3] bg-white p-1">
                  <button
                    onClick={() => handleLanguageChange('et')}
                    className={`type-navbar-utility min-h-8 rounded-full px-3 transition-all duration-140 ${
                      language === 'et' ? 'bg-[#fff1f8] text-[#6a3b57] shadow-[0_2px_6px_-0_rgba(106,59,87,0.2)]' : 'text-[#7a6878]'
                    }`}
                  >
                    EST
                  </button>
                  <span className="mx-1 h-4 w-px bg-[#eadce5]/35" />
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`type-navbar-utility min-h-8 rounded-full px-3 transition-all duration-140 ${
                      language === 'en' ? 'bg-[#fff1f8] text-[#6a3b57] shadow-[0_2px_6px_-0_rgba(106,59,87,0.2)]' : 'text-[#7a6878]'
                    }`}
                  >
                    ENG
                  </button>
                </div>
              </div>

              <div className="mobile-menu-anim-item mt-auto pt-12 pb-2 [animation:mobileMenuItemIn_220ms_ease-out_both]" style={{ animationDelay: '148ms' }}>
                <button
                  onClick={() => goToPage('/book')}
                  className="btn-primary h-10 sm:h-11 w-full rounded-2xl sm:rounded-full text-white"
                >
                  {t('nav.bookNow')}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <style jsx global>{`
        @keyframes mobileMenuOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mobileMenuPanelIn {
          from {
            transform: translate3d(100%, 0, 0);
            opacity: 0.98;
          }
          to {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
        }
        @keyframes mobileMenuItemIn {
          from {
            opacity: 0;
            transform: translate3d(0, 4px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mobile-menu-anim-overlay,
          .mobile-menu-anim-panel,
          .mobile-menu-anim-item {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* ===================== */}
      {/* 2. HERO SECTION - LUXURY EDITORIAL */}
      {/* ===================== */}
      <section className={`relative overflow-hidden border-b border-[#f2e3eb] pt-28 pb-16 transition-all duration-300 lg:pt-28 lg:pb-22 ${
        isScrolled ? 'pt-20' : ''
      }`}>
        <div className="pointer-events-none absolute -left-24 top-4 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(224,171,200,0.18)_0%,rgba(224,171,200,0)_74%)]" />
        <div className="pointer-events-none absolute right-[-5rem] top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(244,219,234,0.45)_0%,rgba(244,219,234,0)_76%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-12">
            
            {/* Left: Hero message */}
            <div className="order-1 lg:col-span-7 lg:order-1">
              <div className="max-w-[620px] lg:pr-10" data-motion="hero-copy">
                <p className="type-overline text-[#8a6378]">
                  {getI18nTextOrFallback(
                    'homepage.hero.luxuryOverline',
                    language === 'en' ? 'PRIVATE NAIL STUDIO · MUSTAMÄE' : 'PRIVATE KÜÜNESTUUDIO · MUSTAMÄEL'
                  )}
                </p>

                <h1 className="type-display measure-headline mt-4 text-[#2d2229]">
                  {getI18nTextOrFallback(
                    'homepage.hero.luxuryHeadline',
                    language === 'en' ? 'Beautiful nails. Effortlessly reserved.' : 'Ilusad küüned. Pingutuseta broneeritud.'
                  )}
                </h1>

                <p className="type-body measure-copy mt-7 text-[#6a5766]">
                  {getI18nTextOrFallback(
                    'homepage.hero.luxurySupport',
                    language === 'en'
                      ? 'Meticulous detail, elevated hygiene, and a calm appointment experience in a private Mustamäe studio.'
                      : 'Metoodiline detailitöö, kõrgetasemeline hügieen ja rahulik vastuvõtt privaatses Mustamäe stuudios.'
                  )}
                </p>

                <button
                  onClick={focusHeroBooking}
                  className="btn-primary btn-primary-lg mt-6 inline-flex gap-2"
                >
                  <span>{getI18nTextOrFallback('homepage.hero.luxuryCta', language === 'en' ? 'Choose your time' : 'Vali oma aeg')}</span>
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 10h11" />
                    <path d="M11.5 6.5L15 10l-3.5 3.5" />
                  </svg>
                </button>

                <div className="hidden mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-[#7b6677]/75">
                  <span className="font-semibold text-[#6f4e66]">★ 4.9</span>
                  <span className="h-3 w-px bg-[#c2a5b8]/40" />
                  <span>{getI18nTextOrFallback('homepage.hero.trustClients', language === 'en' ? '120+ loyal clients' : '120+ püsiklienti')}</span>
                  <span className="h-3 w-px bg-[#c2a5b8]/40" />
                  <span>{getI18nTextOrFallback('homepage.hero.trustHygiene', language === 'en' ? 'Sterile tools' : 'Steriilsed töövahendid')}</span>
                  <span className="h-3 w-px bg-[#c2a5b8]/40" />
                  <span>{getI18nTextOrFallback('homepage.hero.trustStudio', language === 'en' ? 'Mustamäe studio' : 'Mustamäe stuudio')}</span>
                </div>
                <p className="mt-4 max-w-[56ch] text-[0.82rem] leading-6 text-[#7b6876]">
                  {getI18nTextOrFallback(
                    'homepage.hero.luxuryTrustSignature',
                    language === 'en'
                      ? '4.9 rated · 120+ returning clients · Sterile tools · Private studio'
                      : '4.9 hinnang · 120+ püsiklienti · Steriilsed töövahendid · Privaatne stuudio'
                  )}
                </p>

              </div>
            </div>

            {/* Right: Booking Widget */}
            <div className="order-2 lg:col-span-5 lg:order-2 lg:sticky lg:top-24">
              <div className="group relative">
                <div className="pointer-events-none absolute -inset-3 rounded-[34px] bg-[radial-gradient(circle,rgba(224,146,191,0.12)_0%,rgba(224,146,191,0)_74%)]" />
              <div
                id="hero-booking"
                data-motion="hero-booking"
                className={`relative transition-transform duration-300 group-hover:scale-[1.01] ${
                  heroBookingFocused ? 'scale-[1.01] ring-2 ring-[#cc6a9b]/45 ring-offset-4 ring-offset-white' : ''
                }`}
              >
                <HeroBookingWidget />
              </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#fff4f9]" />
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
          <div className={`mx-auto mt-7 max-w-4xl px-6 py-5 card-premium-soft`}>
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

      <section id="services" className="relative border-t border-[#efe0e8] py-24 lg:py-28" style={{ background: 'linear-gradient(180deg, #fef9fc 0%, #fdf3f8 35%, #fef9fc 100%)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(200,140,170,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(220,160,190,0.06) 0%, transparent 45%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 lg:mb-16">
            <h2 className={`mb-4 section-title`}>{t('services.title')}</h2>
            <p className="section-lead measure-copy mx-auto">{t('services.subtitle')}</p>
          </div>

          <div className="space-y-8 lg:space-y-10">
            {featuredService && (
              <article
                onClick={() => router.push('/book')}
                className="group cursor-pointer overflow-hidden rounded-[2rem] border-2 border-[#e8dae2] bg-white shadow-[0_32px_64px_-24px_rgba(90,55,78,0.28),0_0_0_1px_rgba(255,255,255,0.8)_inset] transition-all duration-400 ease-out hover:-translate-y-2 hover:border-[#d4a8be] hover:shadow-[0_48px_80px_-32px_rgba(100,60,85,0.35),0_0_0_1px_rgba(255,255,255,0.9)_inset]"
              >
                <div className="grid lg:grid-cols-12">
                  <div className="relative overflow-hidden lg:col-span-5">
                    <div className="absolute left-6 top-6 z-10 rounded-full bg-white/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a4d66] shadow-[0_8px_24px_-8px_rgba(100,55,80,0.35)] backdrop-blur-sm">
                      {t('homepage.featuredService.badge')}
                    </div>
                    <div className="absolute inset-0 z-[1] rounded-l-[2rem] ring-1 ring-inset ring-black/5" />
                    {featuredService.imageUrl || '' ? (
                      <Image
                        src={featuredService.imageUrl || ''}
                        alt={featuredService.name}
                        width={960}
                        height={680}
                        className="h-80 w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04] lg:h-full lg:min-h-[380px]"
                      />
                    ) : (
                      <div className="flex h-80 items-center justify-center bg-[#f5e8ef] text-5xl text-[#9f7c91] lg:h-full lg:min-h-[380px]">MN</div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between p-7 lg:col-span-7 lg:py-10 lg:pl-10 lg:pr-12">
                    <div>
                      <h3 className="font-brand text-3xl font-semibold tracking-[-0.02em] text-[#2f2530] lg:text-4xl">{featuredService.name}</h3>
                      <p className="mt-5 text-[1.05rem] leading-[1.7] text-[#564553]">
                        {featuredService.resultDescription || getServiceFallback(featuredService.id, 'result', language === 'en' ? 'Professional result.' : 'Professionaalne tulemus.')}
                      </p>
                      <p className="mt-4 text-sm text-[#675463]">
                        <span className="font-semibold text-[#4e3f4c]">{t('homepage.servicesUi.whoForLabel')} </span>
                        {featuredService.suitabilityNote || getServiceFallback(featuredService.id, 'suitability', language === 'en' ? 'Suitable for everyone.' : 'Sobib kõigile.')}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-[#6e5a68]">{featuredService.description}</p>

                      <div className="mt-7 flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-white px-4 py-2.5 text-sm font-medium text-[#5d4a59] shadow-sm">
                          <svg className="h-4 w-4 shrink-0 text-[#9b7590]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {featuredService.duration} {t('common.minutes')}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#ead6e2] bg-white px-4 py-2.5 text-sm font-medium text-[#5d4a59] shadow-sm">
                          <svg className="h-4 w-4 shrink-0 text-[#9b7590]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                          </svg>
                          {featuredService.longevityDescription || t('homepage.featuredService.longevityFallback')}
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium text-[#765e71]">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff5fb] px-3.5 py-2 border border-[#f5e2ed]">
                          <span className="text-[#a17291]">✓</span>{t('homepage.servicesUi.trustTag1')}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff5fb] px-3.5 py-2 border border-[#f5e2ed]">
                          <span className="text-[#a17291]">✓</span>{t('homepage.servicesUi.trustTag2')}
                        </span>
                      </div>

                      <div className="mt-5 rounded-2xl border border-[#f0dae6] bg-[#fff7fc] px-5 py-3.5 text-xs leading-relaxed text-[#6a5566]">
                        {t('homepage.featuredService.priceTrust')}
                      </div>
                    </div>

                    <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-[#f0e2eb] pt-8">
                      <div className="rounded-2xl bg-[#fdf6fa] px-5 py-3 ring-1 ring-[#f0dae6]">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[#9d7a90]">{t('homepage.servicesUi.priceLabel')}</p>
                        <p className="mt-1 text-[2rem] lg:text-[2.25rem] font-semibold leading-none tracking-tight text-[#2f2530]">EUR {featuredService.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          goToBooking();
                        }}
                        className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white shadow-[0_12px_32px_-8px_rgba(194,77,134,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-8px_rgba(194,77,134,0.55)] active:translate-y-0"
                        style={{ background: 'linear-gradient(135deg, #d978a7 0%, #c24d86 50%, #ac3d72 100%)' }}
                      >
                        {t('homepage.featuredService.cta')}
                        <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {regularServices.map((service) => (
                <article
                  key={service.id}
                  onClick={() => router.push('/book')}
                  className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-[#e8dce4] bg-white shadow-[0_28px_52px_-24px_rgba(90,55,78,0.3),0_0_0_1px_rgba(255,255,255,0.6)_inset] transition-all duration-400 ease-out hover:-translate-y-2 hover:border-[#d4a8be] hover:shadow-[0_40px_64px_-24px_rgba(100,60,85,0.38),0_0_0_1px_rgba(255,255,255,0.8)_inset]"
                >
                  <div className="relative aspect-[3/4] min-h-[220px] overflow-hidden rounded-t-2xl bg-[#f5e8ef]">
                    <div className="absolute inset-0 z-[1] ring-1 ring-inset ring-black/5 rounded-t-2xl pointer-events-none" />
                    {service.imageUrl || '' ? (
                      <Image
                        src={service.imageUrl || ''}
                        alt={service.name}
                        width={880}
                        height={620}
                        className="h-full w-full object-cover object-center transition-transform duration-600 ease-out group-hover:scale-[1.06]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl text-[#9f7c91]">MN</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-brand text-xl font-semibold tracking-[-0.01em] text-[#2f2530] lg:text-2xl">{service.name}</h3>
                    <p className="mt-3 line-clamp-2 text-[0.95rem] leading-[1.6] text-[#5f4c59]">
                      {service.resultDescription || getServiceFallback(service.id, 'result', language === 'en' ? 'Professional result.' : 'Professionaalne tulemus.')}
                    </p>
                    <p className="mt-2.5 text-sm text-[#665465]">
                      <span className="font-semibold text-[#4e3f4c]">{t('homepage.servicesUi.whoForLabel')} </span>
                      {service.suitabilityNote || getServiceFallback(service.id, 'suitability', language === 'en' ? 'Suitable for everyone.' : 'Sobib kõigile.')}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ead6e2] bg-white px-3.5 py-2 text-xs font-medium text-[#5e4d5b] shadow-sm">
                        <svg className="h-3.5 w-3.5 shrink-0 text-[#9b7590]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {service.duration} {t('common.minutes')}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ead6e2] bg-white px-3.5 py-2 text-xs font-medium text-[#5e4d5b] shadow-sm">
                        <svg className="h-3.5 w-3.5 shrink-0 text-[#9b7590]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                        </svg>
                        {service.longevityDescription || getServiceFallback(service.id, 'longevity', language === 'en' ? 'Long-lasting with care.' : 'Püsiv hoolitsusega.')}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-[#765e71]">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff5fb] px-3 py-1.5 border border-[#f5e2ed]">
                        <span className="text-[#a17291]">✓</span>{t('homepage.servicesUi.trustTag1')}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff5fb] px-3 py-1.5 border border-[#f5e2ed]">
                        <span className="text-[#a17291]">✓</span>{t('homepage.servicesUi.trustTag2')}
                      </span>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#f0e2eb] pt-5">
                      <div className="rounded-xl bg-[#fdf6fa] px-4 py-2.5 ring-1 ring-[#f0dae6]">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[#9d7a90]">{t('homepage.servicesUi.priceLabel')}</p>
                        <p className="mt-0.5 text-[1.5rem] font-semibold leading-none tracking-tight text-[#2f2530]">EUR {service.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          goToBooking();
                        }}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(194,77,134,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-6px_rgba(194,77,134,0.55)] active:translate-y-0"
                        style={{ background: 'linear-gradient(135deg, #d978a7 0%, #c24d86 50%, #ac3d72 100%)' }}
                      >
                        {t('homepage.servicesUi.cardCta')}
                        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
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
      {/* 5. RESULTS GALLERY - OUR WORK / MEIE TÖÖ */}
      {/* ===================== */}
      <section id="gallery" className="relative border-t border-[#efe0e8] py-24 lg:py-28" style={{ background: 'linear-gradient(180deg, #fef9fc 0%, #fdf2f7 38%, #fef9fc 100%)' }}>
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 25% 20%, rgba(210,150,180,0.1) 0%, transparent 48%), radial-gradient(circle at 75% 80%, rgba(230,180,205,0.08) 0%, transparent 48%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center lg:mb-16">
            <h2 className="font-brand text-3xl font-semibold tracking-[-0.02em] text-[#2d232d] lg:text-4xl">{t('gallery.title')}</h2>
            <p className="mx-auto mt-4 max-w-[42ch] text-[1.02rem] leading-relaxed text-[#6f5d6d]">{t('homepage.gallery.subtitle')}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 lg:gap-7">
            {nailStyles[0] && (
              <article
                data-motion="gallery-featured"
                className="group relative overflow-hidden rounded-[2rem] border-2 border-[#e8dae2] bg-white shadow-[0_36px_72px_-28px_rgba(88,52,75,0.32),0_0_0_1px_rgba(255,255,255,0.7)_inset] transition-all duration-400 ease-out hover:-translate-y-2 hover:border-[#d4a8be] hover:shadow-[0_48px_88px_-28px_rgba(95,55,80,0.38),0_0_0_1px_rgba(255,255,255,0.85)_inset] lg:col-span-8 lg:row-span-2"
              >
                <button className="absolute inset-0 z-10" onClick={() => openGallery(0)} aria-label={getStyleLabel(nailStyles[0])} />
                <div className="absolute inset-0 z-[1] rounded-[2rem] ring-1 ring-inset ring-black/[0.06]" />
                <Image
                  src={galleryCards[0]?.imageUrl || galleryUrls[0] || ''}
                  alt={getStyleLabel(nailStyles[0])}
                  width={1200}
                  height={900}
                  className="h-[30rem] w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.05] lg:h-full lg:min-h-[38rem]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.25)_70%,rgba(0,0,0,0.55)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 z-20 p-7 text-white lg:p-10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">{t('homepage.gallery.featuredLabel')}</p>
                  <h3 className="mt-3 font-brand text-2xl font-semibold tracking-[-0.02em] lg:text-3xl">{getStyleLabel(nailStyles[0])}</h3>
                  <p className="mt-2 max-w-[50ch] text-sm leading-relaxed text-white/95">{getStyleCaption(nailStyles[0]) || t('homepage.gallery.featuredQuote')}</p>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleBookStyle(nailStyles[0]);
                    }}
                    className="relative z-30 mt-5 inline-flex items-center gap-2 rounded-full bg-white/98 px-5 py-2.5 text-sm font-semibold text-[#4b3044] shadow-[0_8px_24px_-8px_rgba(60,35,50,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(60,35,50,0.45)]"
                  >
                    {getI18nTextOrFallback('gallery.bookThisStyle', language === 'en' ? 'Book a similar style' : 'Broneeri sarnane stiil')}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                </div>
              </article>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1 lg:gap-7">
              {nailStyles.slice(1, 3).map((style, idx) => (
                <article
                  key={style.id}
                  data-motion="gallery-support"
                  className="group relative overflow-hidden rounded-2xl border-2 border-[#e8dae2] bg-white shadow-[0_28px_56px_-24px_rgba(88,52,75,0.28),0_0_0_1px_rgba(255,255,255,0.6)_inset] transition-all duration-400 ease-out hover:-translate-y-2 hover:border-[#d4a8be] hover:shadow-[0_40px_64px_-24px_rgba(95,55,80,0.35),0_0_0_1px_rgba(255,255,255,0.8)_inset]"
                >
                  <button className="absolute inset-0 z-10" onClick={() => openGallery(idx + 1)} aria-label={getStyleLabel(style)} />
                  <div className="absolute inset-0 z-[1] rounded-2xl ring-1 ring-inset ring-black/[0.06]" />
                  <Image
                    src={galleryCards[idx + 1]?.imageUrl || galleryUrls[idx + 1] || galleryUrls[0] || ''}
                    alt={getStyleLabel(style)}
                    width={700}
                    height={860}
                    className="h-[18rem] w-full object-cover object-center transition-transform duration-600 ease-out group-hover:scale-[1.06] lg:h-[19rem]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.3)_70%,rgba(0,0,0,0.55)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 z-20 p-5 text-white lg:p-6">
                    <p className="font-brand text-lg font-semibold tracking-[-0.01em] lg:text-xl">{getStyleLabel(style)}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/90">{galleryCards[idx + 1]?.caption || t('homepage.gallery.inspirationLook')}</p>
                  </div>
                </article>
              ))}
            </div>

            {nailStyles[3] && (
              <article
                data-motion="gallery-support"
                className="group relative overflow-hidden rounded-2xl border-2 border-[#e8dae2] bg-white shadow-[0_28px_56px_-24px_rgba(88,52,75,0.28),0_0_0_1px_rgba(255,255,255,0.6)_inset] transition-all duration-400 ease-out hover:-translate-y-2 hover:border-[#d4a8be] hover:shadow-[0_40px_64px_-24px_rgba(95,55,80,0.35),0_0_0_1px_rgba(255,255,255,0.8)_inset] lg:col-span-5"
              >
                <button className="absolute inset-0 z-10" onClick={() => openGallery(3)} aria-label={getStyleLabel(nailStyles[3])} />
                <div className="absolute inset-0 z-[1] rounded-2xl ring-1 ring-inset ring-black/[0.06]" />
                <Image
                  src={galleryCards[3]?.imageUrl || galleryUrls[3] || galleryUrls[0] || ''}
                  alt={getStyleLabel(nailStyles[3])}
                  width={980}
                  height={760}
                  className="h-[20rem] w-full object-cover object-center transition-transform duration-600 ease-out group-hover:scale-[1.06] lg:h-[21rem]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.3)_70%,rgba(0,0,0,0.55)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 z-20 p-6 text-white">
                  <p className="font-brand text-xl font-semibold tracking-[-0.01em]">{getStyleLabel(nailStyles[3])}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/90">{galleryCards[3]?.caption || t('homepage.gallery.inspirationLook')}</p>
                </div>
              </article>
            )}

            {nailStyles[4] && (
              <article
                data-motion="gallery-support"
                className="group relative overflow-hidden rounded-2xl border-2 border-[#e8dae2] bg-white shadow-[0_28px_56px_-24px_rgba(88,52,75,0.28),0_0_0_1px_rgba(255,255,255,0.6)_inset] transition-all duration-400 ease-out hover:-translate-y-2 hover:border-[#d4a8be] hover:shadow-[0_40px_64px_-24px_rgba(95,55,80,0.35),0_0_0_1px_rgba(255,255,255,0.8)_inset] lg:col-span-7"
              >
                <button className="absolute inset-0 z-10" onClick={() => openGallery(4)} aria-label={getStyleLabel(nailStyles[4])} />
                <div className="absolute inset-0 z-[1] rounded-2xl ring-1 ring-inset ring-black/[0.06]" />
                <Image
                  src={galleryCards[4]?.imageUrl || galleryUrls[4] || galleryUrls[0] || ''}
                  alt={getStyleLabel(nailStyles[4])}
                  width={1200}
                  height={760}
                  className="h-[20rem] w-full object-cover object-center transition-transform duration-600 ease-out group-hover:scale-[1.06] lg:h-[21rem]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.3)_70%,rgba(0,0,0,0.55)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 z-20 p-6 text-white">
                  <p className="font-brand text-xl font-semibold tracking-[-0.01em]">{getStyleLabel(nailStyles[4])}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/90">{galleryCards[4]?.caption || t('homepage.gallery.inspirationLook')}</p>
                </div>
              </article>
            )}
          </div>

          <div className="mt-14 rounded-2xl border-2 border-[#e8dae2] bg-white/95 px-8 py-7 text-center shadow-[0_28px_56px_-24px_rgba(88,52,75,0.2),0_0_0_1px_rgba(255,255,255,0.8)_inset] backdrop-blur-sm lg:px-10 lg:py-8">
            <p className="text-[1.02rem] leading-relaxed text-[#6f5d6d]">
              {getI18nTextOrFallback('homepage.gallery.ctaLead', language === 'en' ? 'Find your next favorite design.' : 'Leia oma järgmine lemmik disain.')}
            </p>
            <button
              onClick={() => router.push('/book')}
              className="mt-4 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white shadow-[0_12px_32px_-8px_rgba(194,77,134,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-8px_rgba(194,77,134,0.55)]"
              style={{ background: 'linear-gradient(135deg, #d978a7 0%, #c24d86 50%, #ac3d72 100%)' }}
            >
              {t('gallery.bookYourLook')}
              <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
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
            <h2 className="section-title">{t('homepage.addons.title')}</h2>
            <p className="mt-3 text-[1.01rem] text-[#7b6778]">{t('homepage.addons.subtitle')}</p>
            <p className="mt-2 text-sm text-[#9a7891]">{t('homepage.addons.helper')}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {homepageAddOns.length > 0 ? (
              homepageAddOns.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push('/book')}
                  className="inline-flex items-center gap-3 rounded-full border border-[#e8cfdd] bg-white/90 px-4 py-2 text-left text-[#5f4d5d] shadow-[0_14px_22px_-20px_rgba(101,65,90,0.45)] transition hover:-translate-y-0.5 hover:border-[#d9b4c8] hover:bg-white"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fff2fb] text-xs font-semibold text-[#7f4668]">
                    {item.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-[#9a6e87]">+€{item.price}</span>
                  <span className="text-xs text-[#ad88a0]">+{item.duration} min</span>
                </button>
              ))
            ) : (
              <button
                onClick={() => router.push('/book')}
                className="inline-flex items-center gap-2 rounded-full border border-[#e8cfdd] bg-white/90 px-4 py-2.5 text-sm font-medium text-[#5f4d5d] shadow-[0_14px_22px_-20px_rgba(101,65,90,0.45)] transition hover:-translate-y-0.5 hover:border-[#d9b4c8] hover:bg-white"
              >
                {language === 'en' ? 'Add-ons available when you book' : 'Lisateenused broneerimisel'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 8. TEAM SECTION */}
      {/* ===================== */}
      <section id="team" ref={sandraSectionRef} className="relative overflow-hidden border-t border-[#f2e6ed] bg-[#fffbfd] py-14 sm:py-16 lg:py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/60 to-transparent" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:radial-gradient(#b57b9d_0.65px,transparent_0.65px)] [background-size:16px_16px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-motion="sandra-section" className={`relative mx-auto grid max-w-6xl gap-6 rounded-[30px] p-4 backdrop-blur-[2px] sm:p-6 lg:grid-cols-12 lg:items-center lg:gap-12 lg:rounded-[34px] lg:p-10 card-premium-soft`}>
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
                  src={orderedGalleryItems[0]?.imageUrl || media('team_portrait') || media('hero_main') || ''}
                  alt={getI18nTextOrFallback('homepage.team.imageAlt', language === 'en' ? 'Sandra Samun at Nailify studio' : 'Sandra Samun Nailify stuudios')}
                  width={1200}
                  height={1500}
                  className="h-full min-h-[300px] w-full rounded-[24px] object-cover transition-transform duration-700 group-hover:scale-[1.04] sm:min-h-[360px] lg:min-h-[430px]"
                />
              </div>
            </div>

            <div className="lg:col-span-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#b77f9f]">
                {getI18nTextOrFallback('homepage.team.eyebrow', language === 'en' ? 'Personal nail technician' : 'Isiklik küünetehnik')}
              </p>
              <h2 className="mt-2 text-[1.95rem] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2d232d] sm:text-[2.2rem] lg:text-[3.05rem]">
                Sandra Samun
              </h2>
              <p className="mt-2 text-sm font-medium text-[#74586e]">{t('homepage.team.subtitle')}</p>
              <p className="mt-2 text-sm font-medium text-[#7b5f73]">{t('homepage.team.authorityLine')}</p>

              <div className="mt-5 flex flex-wrap gap-2.5">
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

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                    className="rounded-2xl border border-[#edd9e5] bg-white/90 p-3 shadow-[0_18px_26px_-24px_rgba(95,54,81,0.52)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_30px_-20px_rgba(95,54,81,0.42)]"
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
                <div className="grid grid-cols-3 gap-2.5 sm:flex sm:overflow-x-auto sm:pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {specialistGallery.map((item, index) => (
                    <button
                      key={`${item.imageUrl}-${index}`}
                      onClick={() => openSpecialistImage(index)}
                      className="group relative h-24 w-full overflow-hidden rounded-2xl border border-[#edd9e5] shadow-[0_14px_22px_-18px_rgba(84,46,70,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_30px_-18px_rgba(84,46,70,0.5)] sm:h-[120px] sm:w-[120px] sm:flex-shrink-0"
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
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 10h11" />
                    <path d="M11.5 6.5L15 10l-3.5 3.5" />
                  </svg>
                </button>
                <p className="text-xs font-medium text-[#8a6b80]">
                  {getI18nTextOrFallback('homepage.team.weeklyAvailability', language === 'en' ? 'Available slots this week' : 'Vabu aegu sel nädalal')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 lg:hidden">
            <button
              onClick={() => router.push('/book')}
              className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[linear-gradient(120deg,#d9669e_0%,#c24d86_52%,#a93d71_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_24px_38px_-22px_rgba(142,56,105,0.62)]"
            >
              {getI18nTextOrFallback('homepage.team.ctaStrong', language === 'en' ? 'Book with Sandra' : 'Broneeri aeg Sandraga')}
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 10h11" />
                <path d="M11.5 6.5L15 10l-3.5 3.5" />
              </svg>
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
      <section id="products" className="border-t border-[#f2e6ed] bg-[#fff9fd] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b57b9d]">{t('homepage.products.eyebrow')}</p>
              <h2 className="section-title">
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
              onClick={goToShop}
              className="rounded-full border border-[#e5c9d9] bg-white px-6 py-3 text-sm font-semibold text-[#6a4c64] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#fff3fa] hover:shadow-[0_18px_28px_-22px_rgba(97,48,85,0.45)]"
            >
              {t('homepage.products.explore')}
            </button>
          </div>

          {productsLoading ? (
            <div className="grid items-start gap-5 lg:grid-cols-12">
              <article className={`overflow-hidden rounded-[32px] lg:col-span-8 card-premium`}>
                <SkeletonBlock className="aspect-[16/10]" />
                <div className="space-y-3 p-6">
                  <SkeletonBlock className="h-6 w-36 rounded-full" />
                  <SkeletonBlock className="h-9 w-2/3" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-5/6" />
                  <SkeletonBlock className="h-10 w-40 rounded-full" />
                </div>
              </article>
              <aside className={`space-y-3 rounded-[28px] p-5 lg:col-span-4 card-premium`}>
                <SkeletonBlock className="h-6 w-36 rounded-full" />
                {Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonBlock key={`product-rail-skeleton-${index}`} className="h-20 w-full rounded-2xl" />
                ))}
              </aside>
              <div className="lg:col-span-12">
                <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <article key={`product-mini-skeleton-${index}`} className={`min-w-[245px] overflow-hidden rounded-[24px] card-premium`}>
                      <SkeletonBlock className="aspect-[4/3]" />
                      <div className="space-y-2 p-4">
                        <SkeletonBlock className="h-5 w-3/4" />
                        <SkeletonBlock className="h-4 w-full" />
                        <SkeletonBlock className="h-9 w-28 rounded-full" />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid items-start gap-5 lg:grid-cols-12">
                {featuredProduct && (
                  <article className={`group overflow-hidden rounded-[32px] lg:col-span-8 card-premium`}>
                    <div className="grid lg:grid-cols-[1.08fr_1fr]">
                      <div className="relative min-h-[300px] overflow-hidden bg-[#f8edf3]">
                        {featuredProduct.imageUrl ? (
                          <Image src={featuredProduct.imageUrl} alt={featuredProduct.name} width={1200} height={800} unoptimized className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-[#7f6679]">{featuredProduct.name}</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2a1828]/45 via-transparent to-transparent" />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavorite(featuredProduct.id);
                          }}
                          className={`absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 transition ${
                            isFavorite(featuredProduct.id)
                              ? 'border-[#c24d86] text-[#c24d86]'
                              : 'border-[#e9d6e1] text-[#8b6c81] hover:border-[#d8b3ca]'
                          }`}
                          aria-label={isFavorite(featuredProduct.id) ? (language === 'en' ? 'Remove from favourites' : 'Eemalda lemmikutest') : (language === 'en' ? 'Add to favourites' : 'Lisa lemmikutesse')}
                        >
                          <svg className="h-4.5 w-4.5" fill={isFavorite(featuredProduct.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s-7.5-4.35-9.5-8.6C.9 9.05 2.15 5.5 5.9 5.5c2.1 0 3.4 1.1 4.1 2.15.7-1.05 2-2.15 4.1-2.15 3.75 0 5 3.55 3.4 6.9C19.5 16.65 12 21 12 21z" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex h-full flex-col justify-between space-y-4 p-6 lg:p-7">
                        <div className="space-y-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-[#a06f8d]">
                            {featuredProduct.isFeatured
                              ? getI18nTextOrFallback('homepage.products.badgeRecommended', language === 'en' ? 'Sandra recommends' : 'Sandra soovitab')
                              : t('homepage.products.badgeBestseller')}
                          </p>
                          <h3 className="text-[1.4rem] font-semibold tracking-[-0.015em] text-[#312631] sm:text-[1.6rem]">{featuredProduct.name}</h3>
                          <p className="line-clamp-3 text-sm leading-6 text-[#6f5f6f]">{featuredProduct.description}</p>
                          <p className="text-xs font-medium leading-6 text-[#8f6a84]">
                            {getI18nTextOrFallback(
                              'homepage.products.useCaseFeatured',
                              language === 'en'
                                ? 'Best paired with gel manicure and maintenance visits to keep shine and cuticles balanced.'
                                : 'Sobib eriti hästi geelhoolduse ja hooldusaegadega, et säilitada läige ning tasakaalus küünenahad.',
                            )}
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[#9b7590]">
                                {getI18nTextOrFallback('homepage.products.priceFrom', language === 'en' ? 'From' : 'Alates')}
                              </p>
                              <p className="text-3xl font-semibold tracking-[-0.02em] text-[#b04b80]">EUR {featuredProduct.price}</p>
                            </div>
                            <button
                              onClick={() => router.push(localizePath('/book'))}
                              className="btn-primary btn-primary-sm"
                            >
                              {getI18nTextOrFallback('homepage.products.ctaAddWithBooking', language === 'en' ? 'Add with booking' : 'Lisa broneeringule')}
                            </button>
                          </div>
                          <button
                            onClick={() => goToProduct(featuredProduct.id)}
                            className="w-full rounded-full border border-[#e5c8d8] bg-white px-4 py-2 text-sm font-semibold text-[#6a4c64] transition hover:bg-[#fff2fa]"
                          >
                            {getI18nTextOrFallback('homepage.products.ctaViewProduct', language === 'en' ? 'View product details' : 'Vaata toote detaile')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )}

                <aside className={`rounded-[28px] p-4 sm:p-5 lg:col-span-4 card-premium`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a06f8d]">
                    {getI18nTextOrFallback('homepage.products.quickPicksLabel', language === 'en' ? 'Quick picks' : 'Kiired valikud')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#6f5f6f]">
                    {getI18nTextOrFallback(
                      'homepage.products.quickPicksDescription',
                      language === 'en'
                        ? 'Take-home essentials that support longer wear and healthier nails between appointments.'
                        : 'Koduseks hoolduseks valitud tooted, mis aitavad tulemusel püsida ja hoiavad küüned tervemad.',
                    )}
                  </p>
                  <div className="mt-4 space-y-3">
                    {supportingProducts.slice(0, 3).map((product) => (
                      <button
                        key={`quick-${product.id}`}
                        onClick={() => goToProduct(product.id)}
                        className="group flex w-full items-center gap-3 rounded-2xl border border-[#eddbe5] bg-white px-3 py-3 text-left transition hover:border-[#dfbdd0] hover:bg-[#fff6fb]"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f8edf3]">
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} width={180} height={180} unoptimized className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-[#7f6679]">{product.name}</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#312631]">{product.name}</p>
                          <p className="mt-0.5 text-xs text-[#7f6b7c]">
                            {getI18nTextOrFallback('homepage.products.quickPickUseCase', language === 'en' ? 'Salon aftercare pick' : 'Salongi järelhoolduse valik')}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[#b04b80]">EUR {product.price}</p>
                      </button>
                    ))}
                  </div>
                </aside>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:pb-0">
                {retailProducts.map((product) => (
                  <article key={product.id} className={`card-premium group min-w-[245px] self-start overflow-hidden rounded-[26px] transition hover:-translate-y-0.5 hover:shadow-[0_24px_36px_-24px_rgba(118,75,102,0.45)] lg:min-w-0`}>
                    <div
                      className="relative h-44 cursor-pointer overflow-hidden bg-[#f8edf3]"
                      onClick={() => goToProduct(product.id)}
                    >
                      {product.imageUrl ? (
                        <Image src={product.imageUrl} alt={product.name} width={760} height={580} unoptimized className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[#7f6679]">{product.name}</div>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavorite(product.id);
                        }}
                        className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white/95 transition ${
                          isFavorite(product.id)
                            ? 'border-[#c24d86] text-[#c24d86]'
                            : 'border-[#e9d6e1] text-[#8b6c81] hover:border-[#d8b3ca]'
                        }`}
                        aria-label={isFavorite(product.id) ? (language === 'en' ? 'Remove from favourites' : 'Eemalda lemmikutest') : (language === 'en' ? 'Add to favourites' : 'Lisa lemmikutesse')}
                      >
                        <svg className="h-4 w-4" fill={isFavorite(product.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s-7.5-4.35-9.5-8.6C.9 9.05 2.15 5.5 5.9 5.5c2.1 0 3.4 1.1 4.1 2.15.7-1.05 2-2.15 4.1-2.15 3.75 0 5 3.55 3.4 6.9C19.5 16.65 12 21 12 21z" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-2 p-4">
                      <h4 className="text-base font-semibold text-[#322a33]">{product.name}</h4>
                      <p className="line-clamp-2 text-xs leading-5 text-[#7a6677]">{product.description}</p>
                      <p className="text-[11px] font-medium text-[#9e7690]">
                        {getI18nTextOrFallback('homepage.products.cardUseCase', language === 'en' ? 'Supports longer-lasting salon results.' : 'Toetab kauapüsivamat salongitulemust.')}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-base font-semibold text-[#b04b80]">EUR {product.price}</span>
                        <button
                          onClick={() => goToProduct(product.id)}
                          className="rounded-full border border-[#e4c6d7] px-3 py-1.5 text-xs font-semibold text-[#6a4c64] transition-colors hover:bg-[#fff3fa]"
                        >
                          {getI18nTextOrFallback('homepage.products.ctaRetailTile', language === 'en' ? 'Buy now' : 'Osta kohe')}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {false && featuredProduct && (
                <article className={`group self-start overflow-hidden rounded-[30px] card-premium`}>
                  <div className="grid lg:grid-cols-[1.05fr_1fr]">
                    <div className="relative h-64 overflow-hidden bg-[#f8edf3] sm:h-80">
                    {featuredProduct.imageUrl ? (
                      <Image src={featuredProduct.imageUrl || ''} alt={featuredProduct.name} width={1200} height={760} unoptimized className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#7f6679]">{featuredProduct.name}</div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a5272]">
                      {featuredProduct.isFeatured
                        ? getI18nTextOrFallback('homepage.products.badgeRecommended', language === 'en' ? 'Sandra recommends' : 'Sandra soovitab')
                        : t('homepage.products.badgeBestseller')}
                    </span>
                    </div>
                  <div className="space-y-4 p-5 sm:p-6 lg:p-7">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-[#fff2f8] px-2.5 py-1 font-semibold text-[#83526c]">
                        {getI18nTextOrFallback('homepage.products.forAftercare', language === 'en' ? 'Aftercare essential' : 'Järelhoolduse lemmik')}
                      </span>
                      <span className="rounded-full border border-[#e8d4df] bg-white px-2.5 py-1 text-[#84687b]">
                        {featuredProduct.category}
                      </span>
                    </div>
                    <h3 className="text-[1.4rem] font-semibold tracking-[-0.015em] text-[#312631] sm:text-[1.55rem]">
                      {featuredProduct.name}
                    </h3>
                    <p className="line-clamp-3 max-w-[56ch] text-sm leading-6 text-[#6f5f6f]">{featuredProduct.description}</p>
                    <p className="text-xs font-medium text-[#9a7590]">
                      {getI18nTextOrFallback('homepage.products.useCaseFeatured', language === 'en' ? 'Recommended after gel manicure to keep gloss and cuticles balanced.' : 'Soovitatud pärast geelhooldust, et hoida läiget ja küünenahad tasakaalus.')}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-2xl font-semibold text-[#b04b80]">EUR {featuredProduct.price}</span>
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
                  </div>
                </article>
              )}

                <div className="hidden">
                <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:pb-0">
                  {supportingProducts.map((product, index) => (
                    <article key={product.id} className={`card-premium group min-w-[255px] self-start overflow-hidden rounded-3xl transition hover:-translate-y-0.5 hover:shadow-[0_24px_36px_-24px_rgba(118,75,102,0.45)] lg:min-w-0`}>
                    <div className="relative h-44 overflow-hidden bg-[#f8edf3]">
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
                        <span className="text-base font-semibold text-[#b04b80]">EUR {product.price}</span>
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
            </div>
          )}
        </div>
      </section>

      {/* ===================== */}
      {/* 10. CLIENT FEEDBACK (admin-managed) */}
      {/* ===================== */}
      <section id="testimonials" className="border-t border-[#f2e6ed] bg-[#fffbfd] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center lg:mb-14">
            <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#b77f9f]">{t('homepage.testimonials.eyebrow')}</p>
            <h2 className="section-title">{t('homepage.testimonials.title')}</h2>
            <p className={`mx-auto mt-3 section-lead`}>{t('homepage.testimonials.subtitle')}</p>
          </div>

          {feedbackItems.length === 0 ? (
            <div className="rounded-2xl border border-[#f0e2eb] bg-[#fef9fc] px-6 py-12 text-center">
              <p className="text-[#7e6376]">{t('homepage.testimonials.subtitle')}</p>
            </div>
          ) : (
            <>
              {feedbackItems[0] && (
                <article className={`mb-8 overflow-hidden rounded-[30px] bg-[linear-gradient(130deg,#fff8fc_0%,#fff2f8_52%,#ffe9f4_100%)] px-6 py-8 lg:px-8 lg:py-10 card-premium-soft`}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#b47f9e]">{t('homepage.testimonials.heroMomentLabel')}</p>
                  <blockquote className="mt-3 text-2xl font-medium leading-relaxed tracking-[-0.012em] text-[#3a2c37] lg:text-[2rem]">
                    &ldquo;{feedbackItems[0].feedbackText}&rdquo;
                  </blockquote>
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-full bg-white/85 px-3 py-1 font-semibold text-[#66475b]">{feedbackItems[0].clientName}</span>
                    {feedbackItems[0].sourceLabel && (
                      <span className="rounded-full border border-[#ebd3e0] bg-white/80 px-3 py-1 text-[#7e6376]">{feedbackItems[0].sourceLabel}</span>
                    )}
                  </div>
                </article>
              )}

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {feedbackItems.map((item) => (
                  <article
                    key={item.id}
                    className="card-premium group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
                  >
                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#f0dae6] bg-[#f8edf4]">
                          {item.clientAvatarUrl ? (
                            <Image
                              src={item.clientAvatarUrl}
                              alt={item.clientName}
                              width={56}
                              height={56}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#9b7590]">
                              {item.clientName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#2f2530]">{item.clientName}</h3>
                          {item.sourceLabel && <p className="text-xs text-[#9d7a90]">{item.sourceLabel}</p>}
                          <div className="mt-1 flex items-center gap-0.5 text-[#c24d86]">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className="text-sm" aria-hidden>{i < item.rating ? '★' : '☆'}</span>
                            ))}
                            <span className="ml-1 text-xs text-[#6f5d6d]">{item.rating}/5</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[0.95rem] leading-relaxed text-[#5f4c59] line-clamp-4">&ldquo;{item.feedbackText}&rdquo;</p>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===================== */}
      {/* 9. LOCATION + HOURS */}
      {/* ===================== */}
      <section id="location" className="border-t border-[#f2e6ed] bg-[#fff9fc] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className={`mb-5 section-title`}>{t('homepage.location.title')}</h2>
              <p className={`mb-6 section-lead`}>{t('homepage.location.subtitle')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#efdde8] bg-white px-4 py-3 text-sm text-[#5d4b58]">{t('homepage.location.badge1')}</div>
                <div className="rounded-2xl border border-[#efdde8] bg-white px-4 py-3 text-sm text-[#5d4b58]">{t('homepage.location.badge2')}</div>
                <div className="rounded-2xl border border-[#efdde8] bg-white px-4 py-3 text-sm text-[#5d4b58]">{t('homepage.location.badge3')}</div>
                <div className="rounded-2xl border border-[#efdde8] bg-white px-4 py-3 text-sm text-[#5d4b58]">{t('homepage.location.badge4')}</div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => router.push('/book')}
                  className="btn-primary btn-primary-md"
                >
                  {t('nav.bookNow')}
                </button>
                <button className="btn-secondary btn-secondary-md">{t('location.getDirections')}</button>
              </div>
            </div>

            <div className="grid gap-4">
              <article className={`overflow-hidden card-premium`}>
                <Image
                src={media('location_studio') || media('team_portrait') || media('hero_main')}
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
              <article className={`overflow-hidden card-premium`}>
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
            <article className={`group overflow-hidden card-premium`}>
              <Image
                src={media('aftercare_image') || media('product_fallback_1') || media('hero_main')}
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
                    className="btn-primary btn-primary-sm"
                  >
                    {t('homepage.aftercare.cta')}
                  </button>
                </div>
              </div>
            </article>

            <article className={`group overflow-hidden card-premium`}>
              <Image
                src={media('giftcard_image') || media('product_fallback_2') || media('hero_main')}
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
                  className="btn-primary btn-primary-sm"
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
                className="btn-primary btn-primary-xl"
                style={{ backgroundColor: colors.primary }}
              >
                {t('finalCta.secureSlot')}
              </button>
              <button 
                onClick={() => scrollToSection('services')}
                className="btn-secondary btn-secondary-md px-8"
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
              <span className="font-brand type-navbar-logo leading-none" style={{ color: colors.primary }}>Nailify</span>
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


