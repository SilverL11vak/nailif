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
import { FavoriteHeartIcon } from '@/components/ui/FavoriteHeartIcon';
import { Globe, ShoppingBag, Menu, ArrowRight, MapPin, Clock, Car, Building2, CheckCircle2, RefreshCw, Bus } from 'lucide-react';
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

/** Next.js Image often paints an empty/gray box for data: URLs; native img displays base64 JPEGs reliably */
function isDataImageUrl(src: string | null | undefined): boolean {
  return typeof src === 'string' && /^\s*data:image\//i.test(src.trim());
}

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
  const [locationInView, setLocationInView] = useState(false);
  const [testimonialsInView, setTestimonialsInView] = useState(false);
  const [heroContentVisible, setHeroContentVisible] = useState(false);
  const [localTrustInView, setLocalTrustInView] = useState(false);
  const [servicesInView, setServicesInView] = useState(false);
  const [galleryInView, setGalleryInView] = useState(false);
  const gallerySectionRef = useRef<HTMLElement | null>(null);
  const scrollTickingRef = useRef(false);
  const showDiscountPillRef = useRef(showDiscountPill);
  const discountDismissedRef = useRef(discountPillDismissed);
  const sandraImageRef = useRef<HTMLDivElement | null>(null);
  const sandraSectionRef = useRef<HTMLElement | null>(null);
  const locationSectionRef = useRef<HTMLElement | null>(null);
  const testimonialsSectionRef = useRef<HTMLElement | null>(null);
  const localTrustSectionRef = useRef<HTMLElement | null>(null);
  const servicesSectionRef = useRef<HTMLElement | null>(null);
  const heroBookingCardRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const media = (key: string) => homepageMedia[key]?.trim() ?? '';
  const [feedbackItems, setFeedbackItems] = useState<
    Array<{
      id: string;
      clientName: string;
      clientAvatarUrl: string | null;
      rating: number;
      feedbackText: string;
      sourceLabel: string | null;
      serviceId?: string | null;
    }>
  >([]);
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
        const response = await fetch(`/api/services?lang=${language}`, { cache: 'no-store' });
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
        const data = (await response.json()) as {
          feedback?: Array<{
            id: string;
            clientName: string;
            clientAvatarUrl: string | null;
            rating: number;
            feedbackText: string;
            sourceLabel: string | null;
            serviceId?: string | null;
          }>;
        };
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
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setIsSandraInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIsSandraInView(true);
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sectionEl = locationSectionRef.current;
    if (!sectionEl) return;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setLocationInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setLocationInView(true);
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sectionEl = testimonialsSectionRef.current;
    if (!sectionEl) return;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setTestimonialsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setTestimonialsInView(true);
        });
      },
      { threshold: 0.12 }
    );
    observer.observe(sectionEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHeroContentVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const sectionEl = localTrustSectionRef.current;
    if (!sectionEl) return;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setLocalTrustInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setLocalTrustInView(true);
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(sectionEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sectionEl = servicesSectionRef.current;
    if (!sectionEl) return;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setServicesInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setServicesInView(true);
        });
      },
      { threshold: 0.12 }
    );
    observer.observe(sectionEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sectionEl = gallerySectionRef.current;
    if (!sectionEl) return;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setGalleryInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setGalleryInView(true);
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(sectionEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const cardEl = heroBookingCardRef.current;
    if (!cardEl) return;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const offset = Math.max(-6, Math.min(6, window.scrollY * 0.012));
        cardEl.style.transform = `translate3d(0, ${offset}px, 0)`;
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
  const galleryCardCount = 5;
  const nextGallery = () => {
    setActiveGalleryIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % galleryCardCount;
    });
  };
  const prevGallery = () => {
    setActiveGalleryIndex((prev) => {
      if (prev === null) return 0;
      return (prev - 1 + galleryCardCount) % galleryCardCount;
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
  /** DB/admin may accidentally store a literal i18n path — never show it as user-facing copy */
  const isServiceFieldKeyLeak = (value: string | undefined | null) => {
    const s = (value ?? '').trim();
    if (!s) return false;
    if (s.startsWith('homepage.serviceDecision.fallback.')) return true;
    return /^homepage\.[a-z0-9]+\.[a-zA-Z0-9._-]+$/i.test(s) && s.includes('serviceDecision');
  };
  // Avoid leaking translation keys when service-specific fallback is missing (use generic fallback)
  const getServiceFallback = (serviceId: string, kind: 'result' | 'suitability' | 'longevity', genericFallback: string) => {
    const key = `homepage.serviceDecision.fallback.${serviceId}.${kind}`;
    const localized = t(key);
    if (localized === key || isServiceFieldKeyLeak(localized)) return genericFallback;
    return localized;
  };
  const getServiceResultLine = (service: ServiceCard) => {
    const raw = service.resultDescription?.trim();
    if (raw && !isServiceFieldKeyLeak(raw)) return raw;
    return getServiceFallback(
      service.id,
      'result',
      language === 'en' ? 'Professional finish tailored to your nails.' : 'Professionaalne viimistlus sinu küüntele.'
    );
  };
  const getServiceDescriptionExtra = (service: ServiceCard) => {
    const d = service.description?.trim();
    if (!d || isServiceFieldKeyLeak(d)) return '';
    const result = getServiceResultLine(service);
    if (d.toLowerCase() === result.toLowerCase()) return '';
    return ` ${d}`;
  };

  const getServiceCategoryLabel = (category: ServiceCard['category'] | undefined) => {
    if (!category) return '';
    const key =
      category === 'nail-art'
        ? 'services.categoryNailArt'
        : `services.category${category.charAt(0).toUpperCase()}${category.slice(1)}` as 'services.categoryManicure' | 'services.categoryPedicure' | 'services.categoryExtensions';
    return t(key);
  };

  // Gallery data — defined before any useEffects/callbacks that might close over it (SSR)
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

  // Services: Only use API data - no mockServices fallback
  // If API returns empty, the section will show an empty state
  const servicesSource = serviceCards.length > 0 ? serviceCards : [];
  /** Featured hero only when admin marks a popular service — avoids duplicating the same list as “featured + first card again” */
  const featuredService = servicesSource.find((service) => Boolean(service.isPopular)) ?? null;
  const regularServices = featuredService
    ? servicesSource.filter((service) => service.id !== featuredService.id)
    : servicesSource;
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
    router.push(localizePath('/book'));
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
    'type-navbar-icon-btn relative inline-flex min-h-[48px] min-w-[48px] items-center justify-center';

  /* Premium layout: max 1280px, normalized section spacing */
  const sectionClass = 'py-16 md:py-20 lg:py-24';
  const contentMax = 'mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8';
  const headerTitleGap = 'mt-3';
  const headerSubtitleGap = 'mt-3';
  const headerToContent = 'mb-8 md:mb-10';

  return (
    <div className="min-h-screen bg-[#fafafa]">
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
        <div className={contentMax}>
          <div className={`flex items-center justify-between transition-all duration-300 ${
            // Mobile always 64px; desktop can breathe when not scrolled
            isScrolled ? 'h-16' : 'h-16 lg:h-20'
          }`}>
            {/* Logo — breathing room on mobile */}
            <div className="flex min-w-0 flex-shrink items-center gap-2 pr-2 sm:pr-0">
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

            {/* Right Side — mobile: icons + menu only (booking via sticky CTA) */}
            <div className="flex flex-shrink-0 items-center gap-3 sm:gap-3 lg:gap-4">
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

              {/* Icon cluster — spacing from logo; badges inset so they don’t crowd the edge */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToFavorites}
                  className={utilityIconClass}
                  aria-label={language === 'en' ? 'Open favourites' : 'Ava lemmikud'}
                  title={language === 'en' ? 'Favourites' : 'Lemmikud'}
                >
                  <FavoriteHeartIcon active={favoritesCount > 0} size={20} />
                  {favoritesCount > 0 && (
                    <span className="absolute right-0 top-0 inline-flex min-h-[18px] min-w-[18px] translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-[#c24d86] px-1 text-[9px] font-semibold leading-none text-white shadow-[0_10px_18px_-12px_rgba(194,77,134,0.85)]">
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
                  <ShoppingBag size={20} strokeWidth={1.8} />
                  {cartCount > 0 && (
                    <span className="absolute right-0 top-0 inline-flex min-h-[18px] min-w-[18px] translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-[#c24d86] px-1 text-[9px] font-semibold leading-none text-white shadow-[0_10px_18px_-12px_rgba(194,77,134,0.85)]">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </button>
              </div>
               
              {/* Book Now — lg+ only (.btn-primary display would otherwise override hidden on mobile) */}
              <button
                type="button"
                onClick={() => router.push(localizePath('/book'))}
                className="btn-primary type-navbar-cta !hidden min-h-[44px] items-center justify-center rounded-full px-6 text-base font-semibold text-white transition-all duration-180 lg:!inline-flex"
              >
                {t('nav.bookNow')}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#d4b4c7] bg-transparent text-[#7a6174] transition-all duration-180 hover:border-[#b8659a] hover:bg-[#fff1f8] lg:hidden"
                aria-label="Open menu"
              >
                <Menu size={20} strokeWidth={1.8} />
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
            className="mobile-menu-anim-panel absolute inset-y-0 right-0 flex w-[88%] max-w-[360px] flex-col overflow-hidden bg-[#fffdfd] shadow-[0_30px_56px_-34px_rgba(57,33,52,0.52)] [animation:mobileMenuPanelIn_280ms_cubic-bezier(0.22,0.8,0.22,1)_both]"
          >
            <div className="flex min-h-[100dvh] flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="mobile-menu-anim-item mb-6 flex items-center justify-between border-b border-[#efe2ea] pb-4 [animation:mobileMenuItemIn_240ms_ease-out_both]">
                <span
                  className="font-brand text-[1.65rem] font-semibold leading-none tracking-tight"
                  style={{ color: colors.primary }}
                >
                  Nailify
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-mobile-menu-close="true"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#e8d9e3] text-[#6f5b6c] transition-colors duration-200 hover:bg-[#faf5f8] active:bg-[#f9eef5]"
                  aria-label="Close menu"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="mobile-menu-anim-item flex-1 space-y-0.5 overflow-y-auto [animation:mobileMenuItemIn_260ms_ease-out_40ms_both]" aria-label="Mobile primary navigation">
                {[
                  { fn: () => goToPage(localizePath('/')), label: t('homepage.mobile.home') },
                  { fn: () => goToSection('services'), label: t('nav.services') },
                  { fn: () => goToSection('gallery'), label: t('nav.gallery') },
                  { fn: () => goToSection('products'), label: t('homepage.nav.products') },
                  { fn: () => goToSection('team'), label: t('homepage.mobile.team') },
                  { fn: () => goToSection('location'), label: t('nav.contact') },
                ].map((item, i) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.fn}
                    className="mobile-menu-anim-item flex min-h-[56px] w-full items-center rounded-xl px-1 py-1 text-left text-[1.125rem] font-medium tracking-tight text-[#2f2530] transition-colors active:bg-[#faf5f8] [animation:mobileMenuItemIn_220ms_ease-out_both]"
                    style={{ animationDelay: `${60 + i * 28}ms` }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mobile-menu-anim-item mt-6 space-y-4 border-t border-[#f0e4eb] pt-5 [animation:mobileMenuItemIn_240ms_ease-out_120ms_both]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a8899c]">
                  {language === 'en' ? 'Account & language' : 'Konto ja keel'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => goToPage(localizePath('/favorites'))}
                    className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl border border-[#eadce5] bg-[#faf6f9] px-3 py-3 text-center text-sm font-medium text-[#5d4a59] transition-colors active:bg-[#f5ebf2]"
                  >
                    <FavoriteHeartIcon active={favoritesCount > 0} size={20} />
                    <span>{language === 'en' ? 'Favourites' : 'Lemmikud'}</span>
                    {favoritesCount > 0 && (
                      <span className="text-xs font-semibold text-[#c24d86]">{favoritesCount > 9 ? '9+' : favoritesCount}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(localizePath('/shop'))}
                    className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl border border-[#eadce5] bg-[#faf6f9] px-3 py-3 text-center text-sm font-medium text-[#5d4a59] transition-colors active:bg-[#f5ebf2]"
                  >
                    <ShoppingBag className="h-5 w-5 text-[#7a6174]" strokeWidth={1.8} />
                    <span>{language === 'en' ? 'Shop' : 'Pood'}</span>
                    {cartCount > 0 && (
                      <span className="text-xs font-semibold text-[#c24d86]">{cartCount > 9 ? '9+' : cartCount}</span>
                    )}
                  </button>
                </div>
                <div className="flex h-11 w-full items-center justify-center gap-1 rounded-2xl border border-[#e8d9e3] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('et')}
                    className={`min-h-9 flex-1 rounded-xl px-3 text-sm font-medium transition-all duration-140 ${
                      language === 'et' ? 'bg-[#fff1f8] text-[#6a3b57]' : 'text-[#7a6878]'
                    }`}
                  >
                    Eesti
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`min-h-9 flex-1 rounded-xl px-3 text-sm font-medium transition-all duration-140 ${
                      language === 'en' ? 'bg-[#fff1f8] text-[#6a3b57]' : 'text-[#7a6878]'
                    }`}
                  >
                    English
                  </button>
                </div>
                {/* Booking CTA intentionally removed from mobile menu (booking via hero + sticky CTA) */}
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

      <style jsx global>{`
        @keyframes heroDrift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(2px, -3px); }
        }
        @keyframes heroGrain {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-5%, -5%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-drift, .hero-grain { animation: none !important; }
        }
      `}</style>

      {/* 2. HERO — Premium luxury nail studio conversion: editorial left + floating glass booking card right */}
      <section className={`relative min-h-[85vh] overflow-hidden pb-12 pt-24 md:pt-28 lg:min-h-[90vh] lg:pb-14 lg:pt-32 ${isScrolled ? 'pt-20' : ''}`}>
        {/* Background: subtle radial from top-left, light pink/cream, soft vignette */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_120%_80%_at_0%_0%,#fdf6f9_0%,#faf5f8_35%,#f6f0f4_70%,#f2ecf0_100%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,transparent_50%,rgba(240,230,235,0.4)_100%)]" aria-hidden />
        <div className="pointer-events-none absolute -left-[20%] top-[10%] z-0 h-[600px] w-[600px] rounded-full bg-[#f0e6ec]/50 blur-[100px]" aria-hidden />
        <div className="pointer-events-none absolute right-[-10%] top-[20%] z-0 h-[400px] w-[400px] rounded-full bg-[#eadce4]/35 blur-[80px]" aria-hidden />
        {/* Soft grain overlay — luxury editorial feel */}
        <div className="hero-grain pointer-events-none absolute inset-0 z-[1] opacity-[0.035] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', animation: 'heroGrain 20s linear infinite' }} aria-hidden />

        <div className={`relative z-10 ${contentMax}`}>
          <div className="grid grid-cols-1 grid-rows-[auto_auto_auto] items-center gap-10 lg:min-h-[88vh] lg:grid-cols-[1fr_minmax(400px,0.5fr)] lg:grid-rows-1 lg:gap-16">
            {/* LEFT — Luxury editorial (mobile: row 1; desktop: col 1) */}
            <div className="order-1 flex flex-col justify-center lg:row-span-1">
              <div
                className={`transition-all duration-700 ease-out ${
                  heroContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#8a6b7e]">
                  {getI18nTextOrFallback('homepage.hero.luxuryOverline', language === 'en' ? 'PRIVATE NAIL STUDIO MUSTAMÄE' : 'PRIVATE KÜÜNESTUUDIO MUSTAMÄEL')}
                </p>
                <h1 className="mt-6 font-brand max-w-[520px] text-[clamp(2.5rem,5vw,4.25rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-[#1f171d] lg:text-[56px] xl:text-[64px] xl:leading-[1.08]">
                  {(() => {
                    const headline = getI18nTextOrFallback('homepage.hero.luxuryHeadline', language === 'en' ? 'Beautiful nails.\nEffortlessly.' : 'Ilusad küüned.\nPingutuseta.');
                    const lines = headline.split('\n').filter(Boolean);
                    return lines.length >= 2 ? (
                      <>
                        {lines[0]}
                        <br />
                        {lines[1]}
                      </>
                    ) : (
                      headline
                    );
                  })()}
                </h1>
              </div>

              <p
                className={`mt-8 max-w-[480px] text-[1.05rem] leading-[1.65] text-[#6b5a62] transition-all duration-700 ease-out ${
                  heroContentVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transitionDelay: '120ms' }}
              >
                {getI18nTextOrFallback('homepage.hero.luxurySupport', language === 'en' ? 'Meticulous detail, elevated hygiene, and a calm appointment experience in a private Mustamäe studio.' : 'Metoodiline detailitöö, kõrgetasemeline hügieen ja rahulik vastuvõtt privaatses Mustamäe stuudios.')}
              </p>

              <div
                className={`mt-10 flex flex-wrap gap-4 transition-all duration-700 ease-out lg:mt-12 ${
                  heroContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '220ms' }}
              >
                <button
                  onClick={focusHeroBooking}
                  className="group inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#c24d86_0%,#a93d71_100%)] px-10 py-4 text-base font-semibold text-white shadow-[0_20px_40px_-12px_rgba(194,77,134,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-12px_rgba(194,77,134,0.6)] active:scale-[0.98]"
                >
                  {getI18nTextOrFallback('homepage.hero.luxuryCta', language === 'en' ? 'Choose your time' : 'Vali oma aeg')}
                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.2} />
                </button>
                <button
                  onClick={() => scrollToSection('services')}
                  className="inline-flex items-center rounded-full border-2 border-[#d4c4ce] bg-transparent px-8 py-4 text-base font-medium text-[#5c4a54] transition-all duration-300 hover:bg-[#faf5f8] hover:border-[#c9b5c1] hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  {getI18nTextOrFallback('homepage.hero.viewServices', language === 'en' ? 'View services' : 'Vaata teenuseid')}
                </button>
              </div>

              {/* Trust row — visible on desktop only (mobile has its own below card) */}
              <p
                className={`mt-10 hidden flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-[#6f5e66] transition-all duration-700 ease-out lg:mt-12 lg:flex ${
                  heroContentVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transitionDelay: '340ms' }}
              >
                <span className="flex items-center gap-1.5">{t('trust.rating')} {language === 'en' ? 'rated' : 'hinnang'}</span>
                <span className="h-1 w-1 rounded-full bg-[#c9b5c1]" aria-hidden />
                <span>{language === 'en' ? '1200+ clients' : '1200+ klienti'}</span>
                <span className="h-1 w-1 rounded-full bg-[#c9b5c1]" aria-hidden />
                <span>{language === 'en' ? 'Sterile tools' : 'Steriilsed töövahendid'}</span>
                <span className="h-1 w-1 rounded-full bg-[#c9b5c1]" aria-hidden />
                <span>{language === 'en' ? 'Private studio' : 'Privaatne stuudio'}</span>
              </p>
            </div>

            {/* RIGHT — Floating booking glass card (mobile: row 2) */}
            <div className="order-2 w-full lg:sticky lg:top-24 lg:self-center">
              {/* Faint floating shape behind card — ambient drift */}
              <div className="hero-drift pointer-events-none absolute -right-4 -top-4 z-0 h-[120%] w-[90%] rounded-[48px] bg-[#f0e4eb]/30 blur-[40px]" style={{ animation: 'heroDrift 8s ease-in-out infinite' }} aria-hidden />
              <div
                ref={heroBookingCardRef}
                className={`relative z-10 transition-all duration-[800ms] ease-out ${
                  heroContentVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
                } ${heroContentVisible ? 'lg:scale-105' : ''}`}
                style={{ transitionDelay: '380ms' }}
              >
                <div
                  id="hero-booking"
                  data-motion="hero-booking"
                  className={`relative overflow-hidden rounded-[28px] border border-white/60 bg-white/75 shadow-[0_32px_64px_-20px_rgba(70,45,60,0.28),0_0_0_1px_rgba(255,255,255,0.5)_inset backdrop-blur-xl transition ${
                    heroBookingFocused ? 'ring-2 ring-[#b07a9a] ring-offset-2' : ''
                  }`}
                  style={{ boxShadow: '0 32px 64px -20px rgba(70,45,60,0.28), 0 16px 48px -16px rgba(70,45,60,0.2), inset 0 1px 0 rgba(255,255,255,0.6)' }}
                >
                  <HeroBookingWidget />
                  <p className="px-6 pb-5 pt-1 text-center text-xs text-[#7a6572]">
                    {getI18nTextOrFallback('homepage.hero.cancelTrust', language === 'en' ? 'Free cancellation up to 24h' : 'Tühistamine tasuta kuni 24h')}
                  </p>
                </div>
              </div>
            </div>

            {/* Trust row — mobile only (order 3: after headline, CTA, card) */}
            <p className="order-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[14px] text-[#6f5e66] lg:hidden">
              <span className="flex items-center gap-1.5">{t('trust.rating')} {language === 'en' ? 'rated' : 'hinnang'}</span>
              <span className="h-1 w-1 rounded-full bg-[#c9b5c1]" aria-hidden />
              <span>{language === 'en' ? '1200+ clients' : '1200+ klienti'}</span>
              <span className="h-1 w-1 rounded-full bg-[#c9b5c1]" aria-hidden />
              <span>{language === 'en' ? 'Sterile tools' : 'Steriilsed töövahendid'}</span>
              <span className="h-1 w-1 rounded-full bg-[#c9b5c1]" aria-hidden />
              <span>{language === 'en' ? 'Private studio' : 'Privaatne stuudio'}</span>
            </p>
          </div>
        </div>
      </section>

      {/* 3. Trust strip + Local Trust / Mustamäe — premium 3-column, editorial continuation of hero */}
      <section className="border-y border-slate-200/70 bg-white/90 py-6 backdrop-blur-sm">
        <div className={contentMax}>
          <div className="flex flex-nowrap items-center justify-start gap-8 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center lg:gap-16">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">4.9</span>
              <span>{t('trust.googleRating')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">{t('trust.weeklyAppointmentsStat')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">100%</span>
              <span>{t('trust.sterileEquipment')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-medium text-gray-700">{t('trust.premiumProducts')}</span>
            </div>
          </div>
        </div>
      </section>
      <section
        ref={localTrustSectionRef}
        className={`relative overflow-hidden border-t border-[#e8dce4]/50 bg-gradient-to-b from-[#faf8f9] via-[#f8f5f7] to-[#f6f2f5] ${sectionClass}`}
      >
        {/* Optional very low opacity texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" aria-hidden>
          {media('location_studio') && (
            <Image src={media('location_studio')} alt="" fill className="object-cover blur-[80px]" unoptimized />
          )}
        </div>

        <div className={`relative z-10 ${contentMax}`}>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12 lg:items-center">
            {/* LEFT — Label, heading, subtext */}
            <div
              className={`transition-all duration-700 ease-out ${
                localTrustInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a6b7e]">
                {t('homepage.localAuthority.eyebrow')}
              </p>
              <h2 className="mt-3 font-brand max-w-[420px] text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#2d232d] lg:text-[32px]">
                {t('homepage.localAuthority.title')}
              </h2>
              <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-[#6b5a62]">
                {t('homepage.localAuthority.subtitle')}
              </p>
            </div>

            {/* CENTER — Trust indicators: address, parking, transport (pill badges, hover lift) */}
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible lg:gap-4">
              <a
                href="https://maps.google.com/?q=Mustamäe+tee+55+Tallinn"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-[260px] shrink-0 items-center gap-3 rounded-xl border border-[#ead8e2] bg-white/80 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#dfc8d4] hover:bg-[#fdf8fb] lg:min-w-0"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5ebf0] text-[#9b7590] transition-colors group-hover:bg-[#f0e2eb]">
                  <MapPin className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-sm font-medium text-[#4d3d47]">{t('homepage.localAuthority.item1')}</span>
              </a>
              <div className="flex min-w-[260px] shrink-0 items-center gap-3 rounded-xl border border-[#ead8e2] bg-white/80 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#dfc8d4] hover:bg-[#fdf8fb] lg:min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5ebf0] text-[#9b7590]">
                  <Car className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-sm font-medium text-[#4d3d47]">{t('homepage.localAuthority.item2')}</span>
              </div>
              <div className="flex min-w-[260px] shrink-0 items-center gap-3 rounded-xl border border-[#ead8e2] bg-white/80 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#dfc8d4] hover:bg-[#fdf8fb] lg:min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5ebf0] text-[#9b7590]">
                  <Bus className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-sm font-medium text-[#4d3d47]">{t('homepage.localAuthority.item3')}</span>
              </div>
            </div>

            {/* RIGHT — Studio credibility: rating, clients, studio (stacked with dividers, stagger) */}
            <div className="flex flex-wrap items-center justify-center gap-6 border-t border-[#ead8e2]/60 pt-8 lg:flex-col lg:items-start lg:justify-center lg:border-t-0 lg:border-l lg:border-[#ead8e2]/60 lg:pl-10 lg:pt-0">
              <div
                className={`flex items-center gap-2 transition-all duration-500 ease-out ${
                  localTrustInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: localTrustInView ? '0ms' : '0ms' }}
              >
                <span className="text-[#c24d86]" aria-hidden>•</span>
                <span className="text-sm font-semibold text-[#2d232d]">{t('trust.rating')}</span>
                <span className="text-sm text-[#6f5e66]">{t('trust.googleRating')}</span>
              </div>
              <div className="hidden h-px w-12 bg-[#e0d0d8] lg:block" aria-hidden />
              <div
                className={`flex items-center gap-2 transition-all duration-500 ease-out ${
                  localTrustInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: localTrustInView ? '80ms' : '0ms' }}
              >
                <span className="text-[#c24d86]" aria-hidden>•</span>
                <span className="text-sm font-semibold text-[#2d232d]">{t('trust.clients')}</span>
              </div>
              <div className="hidden h-px w-12 bg-[#e0d0d8] lg:block" aria-hidden />
              <div
                className={`flex items-center gap-2 transition-all duration-500 ease-out ${
                  localTrustInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: localTrustInView ? '160ms' : '0ms' }}
              >
                <span className="text-[#c24d86]" aria-hidden>•</span>
                <span className="text-sm font-semibold text-[#2d232d]">{t('trust.mustamaeStudio')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="services"
        ref={servicesSectionRef}
        className={`relative bg-gradient-to-b from-[#faf8f9] to-[#f5f2f4] ${sectionClass}`}
      >
        <div className={`relative ${contentMax}`}>
          <header className={`text-center ${headerToContent}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a6b7e]">{t('services.eyebrow')}</p>
            <h2 className={`font-brand text-[36px] font-semibold tracking-tight text-[#1f171d] ${headerTitleGap}`}>
              {t('services.title')}
            </h2>
            <p className={`mx-auto max-w-[32rem] text-[1rem] leading-relaxed text-[#6b5a62] ${headerSubtitleGap}`}>{t('services.subtitle')}</p>
          </header>

          <div className="space-y-12 lg:space-y-16">
            {/* LAYER 1 — Featured service hero (horizontal on desktop, stacked on mobile) */}
            {featuredService && (
              <article
                onClick={() => router.push(localizePath('/book'))}
                className={`group cursor-pointer overflow-hidden rounded-2xl border border-[#ebe0e6]/80 bg-white shadow-[0_8px_24px_-12px_rgba(60,40,52,0.08)] transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(60,40,52,0.12)] hover:scale-[1.01] ${
                  servicesInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDuration: '0.6s' }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-0">
                  {/* pb aspect box: data-URI / huge intrinsic imgs break aspect-ratio+abs in some engines */}
                  <div className="relative w-full max-lg:pb-[125%] overflow-hidden rounded-t-[28px] bg-[#f5e8ef] lg:col-span-5 lg:min-h-[420px] lg:pb-0 lg:aspect-[5/6] lg:rounded-l-[28px] lg:rounded-tr-none">
                    <div className="absolute left-5 top-5 z-10 rounded-full bg-white/95 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a4d66] shadow-lg backdrop-blur-sm">
                      {t('homepage.featuredService.badge')}
                    </div>
                    <div className="pointer-events-none absolute inset-0 z-[1] rounded-t-[28px] ring-1 ring-inset ring-black/5 lg:rounded-l-[28px] lg:rounded-tr-none" />
                    {featuredService.imageUrl || '' ? (
                      isDataImageUrl(featuredService.imageUrl) ? (
                        <img
                          src={featuredService.imageUrl || ''}
                          alt={featuredService.name}
                          className="absolute inset-0 box-border h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          style={{ maxWidth: '100%', maxHeight: '100%' }}
                          decoding="async"
                        />
                      ) : (
                        <Image
                          src={featuredService.imageUrl || ''}
                          alt={featuredService.name}
                          fill
                          sizes="(max-width: 1024px) 100vw, 42vw"
                          className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#f5e8ef] text-5xl text-[#9f7c91]">MN</div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between p-6 lg:col-span-7 lg:p-10 lg:pl-12 lg:pr-14">
                    <div>
                      <h3 className="font-brand text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[#1f171d] lg:text-[36px]">
                        {featuredService.name}
                      </h3>
                      <p className="mt-4 line-clamp-4 text-[1rem] leading-[1.65] text-[#564553]">
                        {getServiceResultLine(featuredService)}
                        {getServiceDescriptionExtra(featuredService)}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#f0e8ec] px-3.5 py-1.5 text-xs font-medium text-[#5d4a59]">
                          <Clock className="mr-1.5 inline h-3.5 w-3.5" strokeWidth={1.8} />
                          {featuredService.duration} {t('common.minutes')}
                        </span>
                        {getServiceCategoryLabel(featuredService.category) && (
                          <span className="rounded-full bg-[#f0e8ec] px-3.5 py-1.5 text-xs font-medium text-[#5d4a59]">
                            {getServiceCategoryLabel(featuredService.category)}
                          </span>
                        )}
                        {featuredService.isPopular && (
                          <span className="rounded-full bg-[#fff0f5] px-3.5 py-1.5 text-xs font-medium text-[#9b5c7a]">
                            {t('homepage.trust.premium')}
                          </span>
                        )}
                      </div>
                      <div className="mt-8">
                        <p className="text-[28px] lg:text-[32px] font-semibold leading-none tracking-tight text-[#c24d86]">
                          EUR {featuredService.price}
                        </p>
                        <p className="mt-1.5 text-sm text-[#6f5e66]">
                          {nextAvailable
                            ? `${t('services.nextTimeLabel')}: ${nextAvailable}`
                            : t('services.veryPopular')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToBooking();
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#c24d86] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_28px_-8px_rgba(194,77,134,0.5)] transition-all duration-300 hover:bg-[#b04376] hover:shadow-[0_16px_32px_-8px_rgba(194,77,134,0.55)] hover:scale-[1.02] active:scale-[0.99] sm:w-auto"
                      >
                        {t('homepage.servicesUi.confirmTime')}
                        <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(localizePath('/book'));
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#e0d0d8] bg-transparent px-8 py-4 text-base font-semibold text-[#5d4a59] transition-colors hover:bg-[#faf5f8] sm:w-auto"
                      >
                        {t('homepage.servicesUi.viewDetails')}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* LAYER 2 — Service card grid (3 cols desktop; horizontal scroll mobile) */}
            <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible lg:pb-0">
              <div className="flex min-w-0 gap-6 lg:grid lg:grid-cols-3 lg:gap-10">
                {regularServices.map((service, index) => (
                  <article
                    key={service.id}
                    onClick={() => router.push(localizePath('/book'))}
                    className={`group flex w-[min(300px,calc(100vw-2.5rem))] max-w-full shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#ebe0e6]/80 bg-white shadow-[0_8px_24px_-12px_rgba(60,40,52,0.06)] transition-all duration-400 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(60,40,52,0.1)] lg:w-auto lg:min-w-0 lg:max-w-none ${
                      servicesInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                    }`}
                    style={{
                      transitionDelay: servicesInView ? `${Math.min(index * 80, 320)}ms` : '0ms',
                      transitionDuration: '0.5s',
                    }}
                  >
                    <div className="relative w-full overflow-hidden rounded-t-2xl bg-[#f5e8ef] pb-[75%]">
                      <div className="pointer-events-none absolute inset-0 z-[1] rounded-t-2xl ring-1 ring-inset ring-black/5" />
                      {service.imageUrl || '' ? (
                        isDataImageUrl(service.imageUrl) ? (
                          <img
                            src={service.imageUrl || ''}
                            alt={service.name}
                            className="absolute inset-0 box-border h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                            style={{ maxWidth: '100%', maxHeight: '100%' }}
                            decoding="async"
                          />
                        ) : (
                          <Image
                            src={service.imageUrl || ''}
                            alt={service.name}
                            fill
                            sizes="(max-width: 1024px) min(300px,90vw), 33vw"
                            className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          />
                        )
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl text-[#9f7c91]">MN</div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5 lg:p-6">
                      <h3 className="font-brand text-lg font-semibold tracking-[-0.01em] text-[#1f171d] lg:text-xl">
                        {service.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-[0.9rem] leading-[1.55] text-[#5f4c59]">
                        {getServiceResultLine(service)}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#f0e8ec] px-2.5 py-1 text-[11px] font-medium text-[#5d4a59]">
                          {service.duration} {t('common.minutes')}
                        </span>
                        {getServiceCategoryLabel(service.category) && (
                          <span className="rounded-full bg-[#f0e8ec] px-2.5 py-1 text-[11px] font-medium text-[#5d4a59]">
                            {getServiceCategoryLabel(service.category)}
                          </span>
                        )}
                      </div>
                      <div className="mt-5 flex flex-1 flex-col gap-3 border-t border-[#f0e2eb] pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                        <div>
                          <p className="text-lg font-semibold leading-none tracking-tight text-[#c24d86]">EUR {service.price}</p>
                          <p className="mt-0.5 text-xs text-[#6f5e66]">
                            {nextAvailable ? `${t('services.nextTimeLabel')}: ${nextAvailable}` : t('services.veryPopular')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToBooking();
                          }}
                          className="w-full rounded-full bg-[#c24d86] px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#b04376] hover:scale-[1.02] active:scale-100 sm:w-auto sm:shrink-0"
                        >
                          {t('homepage.servicesUi.cardCta')}
                          <ArrowRight className="ml-1 inline h-4 w-4" strokeWidth={2.2} />
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

      {/* ===================== */}
      {/* 5. RESULTS GALLERY — Immersive luxury nail gallery / Meie tööd */}
      {/* ===================== */}
      <section id="gallery" ref={gallerySectionRef} className={`relative w-full bg-[#faf8f9] ${sectionClass}`}>
        <div className={contentMax}>
          <header className={`text-center ${headerToContent}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a6b7e]">
              {getI18nTextOrFallback('homepage.gallery.eyebrow', language === 'en' ? 'OUR WORK' : 'MEIE TÖÖ')}
            </p>
            <h2 className={`font-brand text-[36px] font-semibold tracking-tight text-[#1f171d] ${headerTitleGap}`}>
              {getI18nTextOrFallback('homepage.gallery.realResultsTitle', language === 'en' ? 'Real results.' : 'Päris tulemused.')}
            </h2>
            <p className={`mx-auto max-w-[32rem] text-[1rem] leading-relaxed text-[#6b5a62] ${headerSubtitleGap}`}>
              {t('homepage.gallery.subtitle')}
            </p>
          </header>

          {/* Desktop: asymmetric masonry grid */}
          <div className="hidden grid-cols-2 grid-rows-[300px_300px_220px] gap-6 lg:grid" style={{ gap: '24px' }}>
            {nailStyles[0] && (
              <article
                className={`group relative col-start-1 row-span-2 row-start-1 overflow-hidden rounded-[24px] shadow-[0_24px_48px_-16px_rgba(60,40,55,0.2)] transition-all duration-700 ease-out hover:shadow-[0_32px_64px_-16px_rgba(60,40,55,0.28)] ${
                  galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ minHeight: '600px', transitionDelay: '0ms' }}
              >
                <button type="button" className="absolute inset-0 z-10" onClick={() => openGallery(0)} aria-label={getStyleLabel(nailStyles[0])} />
                <Image
                  src={galleryCards[0]?.imageUrl || galleryUrls[0] || ''}
                  alt={getStyleLabel(nailStyles[0])}
                  width={1200}
                  height={900}
                  className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-20 p-8 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
                    {getI18nTextOrFallback('homepage.gallery.signatureLook', language === 'en' ? 'Signature look' : 'Signatuurstiil')}
                  </p>
                  <h3 className="mt-2 font-brand text-3xl font-semibold tracking-[-0.02em] lg:text-4xl">{getStyleLabel(nailStyles[0])}</h3>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleBookStyle(nailStyles[0]); }}
                    className="relative z-30 mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/95 underline-offset-4 transition-all duration-200 hover:underline hover:text-white"
                  >
                    {getI18nTextOrFallback('homepage.gallery.bookStyleCta', language === 'en' ? 'Book this style' : 'Broneeri see stiil')}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                </div>
              </article>
            )}
            {nailStyles[1] && (
              <article
                className={`group relative col-start-2 row-start-1 overflow-hidden rounded-[24px] shadow-[0_20px_40px_-16px_rgba(60,40,55,0.18)] transition-all duration-600 ease-out hover:scale-[1.03] hover:shadow-[0_28px_52px_-16px_rgba(60,40,55,0.24)] ${
                  galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '80ms' }}
              >
                <button type="button" className="absolute inset-0 z-10" onClick={() => openGallery(1)} aria-label={getStyleLabel(nailStyles[1])} />
                <Image src={galleryCards[1]?.imageUrl || galleryUrls[1] || galleryUrls[0] || ''} alt={getStyleLabel(nailStyles[1])} width={700} height={500} className="h-full w-full object-cover transition-transform duration-600 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 z-20 translate-y-2 p-5 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="font-brand text-lg font-semibold">{getStyleLabel(nailStyles[1])}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/90">{getI18nTextOrFallback('homepage.gallery.bookStyleCta', 'Broneeri see stiil')} →</span>
                </div>
              </article>
            )}
            {nailStyles[2] && (
              <article
                className={`group relative col-start-2 row-start-2 overflow-hidden rounded-[24px] shadow-[0_20px_40px_-16px_rgba(60,40,55,0.18)] transition-all duration-600 ease-out hover:scale-[1.03] hover:shadow-[0_28px_52px_-16px_rgba(60,40,55,0.24)] ${
                  galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '160ms' }}
              >
                <button type="button" className="absolute inset-0 z-10" onClick={() => openGallery(2)} aria-label={getStyleLabel(nailStyles[2])} />
                <Image src={galleryCards[2]?.imageUrl || galleryUrls[2] || galleryUrls[0] || ''} alt={getStyleLabel(nailStyles[2])} width={700} height={500} className="h-full w-full object-cover transition-transform duration-600 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 z-20 translate-y-2 p-5 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="font-brand text-lg font-semibold">{getStyleLabel(nailStyles[2])}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/90">{getI18nTextOrFallback('homepage.gallery.bookStyleCta', 'Broneeri see stiil')} →</span>
                </div>
              </article>
            )}
            {nailStyles[3] && (
              <article
                className={`group relative col-start-1 row-start-3 overflow-hidden rounded-[24px] shadow-[0_20px_40px_-16px_rgba(60,40,55,0.18)] transition-all duration-600 ease-out hover:scale-[1.03] hover:shadow-[0_28px_52px_-16px_rgba(60,40,55,0.24)] ${
                  galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '240ms' }}
              >
                <button type="button" className="absolute inset-0 z-10" onClick={() => openGallery(3)} aria-label={getStyleLabel(nailStyles[3])} />
                <Image src={galleryCards[3]?.imageUrl || galleryUrls[3] || galleryUrls[0] || ''} alt={getStyleLabel(nailStyles[3])} width={900} height={400} className="h-full w-full object-cover transition-transform duration-600 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 z-20 translate-y-2 p-5 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="font-brand text-lg font-semibold">{getStyleLabel(nailStyles[3])}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/90">{getI18nTextOrFallback('homepage.gallery.bookStyleCta', 'Broneeri see stiil')} →</span>
                </div>
              </article>
            )}
            {nailStyles[4] && (
              <article
                className={`group relative col-start-2 row-start-3 overflow-hidden rounded-[24px] shadow-[0_20px_40px_-16px_rgba(60,40,55,0.18)] transition-all duration-600 ease-out hover:scale-[1.03] hover:shadow-[0_28px_52px_-16px_rgba(60,40,55,0.24)] ${
                  galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '320ms' }}
              >
                <button type="button" className="absolute inset-0 z-10" onClick={() => openGallery(4)} aria-label={getStyleLabel(nailStyles[4])} />
                <Image src={galleryCards[4]?.imageUrl || galleryUrls[4] || galleryUrls[0] || ''} alt={getStyleLabel(nailStyles[4])} width={900} height={400} className="h-full w-full object-cover transition-transform duration-600 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 z-20 translate-y-2 p-5 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="font-brand text-lg font-semibold">{getStyleLabel(nailStyles[4])}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/90">{getI18nTextOrFallback('homepage.gallery.bookStyleCta', 'Broneeri see stiil')} →</span>
                </div>
              </article>
            )}
          </div>

          {/* Mobile: 2-column grid (no horizontal scroll) */}
          <div className="grid grid-cols-2 gap-2 lg:hidden">
            {galleryCards.map((card, index) => (
              <article
                key={card.style.id}
                className={`group relative overflow-hidden rounded-2xl bg-[#f0e2eb] shadow-[0_8px_22px_-14px_rgba(60,40,55,0.14)] transition ${
                  galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
                style={{ transitionDelay: `${Math.min(index * 40, 240)}ms` }}
              >
                <button
                  type="button"
                  className="absolute inset-0 z-10"
                  onClick={() => openGallery(index)}
                  aria-label={getStyleLabel(card.style)}
                />
                <div className="relative aspect-[4/5] w-full">
                  {isDataImageUrl(card.imageUrl) ? (
                    <img
                      src={card.imageUrl}
                      alt={getStyleLabel(card.style)}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <Image
                      src={card.imageUrl}
                      alt={getStyleLabel(card.style)}
                      fill
                      sizes="(max-width: 640px) 50vw, 320px"
                      className="object-cover"
                    />
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* CTA panel below grid */}
          <div className="mt-14 rounded-[24px] bg-gradient-to-b from-[#fdf5f9] to-[#f8f0f4] px-6 py-10 text-center shadow-[0_16px_40px_-20px_rgba(80,50,65,0.12)] lg:mt-16 lg:px-12 lg:py-12">
            <p className="text-[1.05rem] leading-relaxed text-[#5d4a56]">
              {getI18nTextOrFallback('homepage.gallery.ctaLead', language === 'en' ? 'Find your next favorite style.' : 'Leia oma järgmine lemmik stiil.')}
            </p>
            <button
              type="button"
              onClick={() => router.push(localizePath('/book'))}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#c24d86] px-10 py-4 text-base font-semibold text-white shadow-[0_20px_40px_-12px_rgba(194,77,134,0.45)] transition-all duration-300 hover:bg-[#b04376] hover:shadow-[0_24px_48px_-12px_rgba(194,77,134,0.5)] hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {getI18nTextOrFallback('homepage.gallery.bookTime', language === 'en' ? 'Book time' : 'Broneeri aeg')}
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
            {isDataImageUrl(galleryCards[activeGalleryIndex].imageUrl) ? (
              <img
                src={galleryCards[activeGalleryIndex].imageUrl}
                alt={getStyleLabel(galleryCards[activeGalleryIndex].style)}
                className="h-[62vh] w-full object-cover md:h-[70vh]"
                decoding="async"
              />
            ) : (
              <Image
                src={galleryCards[activeGalleryIndex].imageUrl}
                alt={getStyleLabel(galleryCards[activeGalleryIndex].style)}
                width={1600}
                height={1100}
                className="h-[62vh] w-full object-cover md:h-[70vh]"
              />
            )}
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
      <section id="pricing" className={`bg-slate-50/50 ${sectionClass}`}>
        <div className={contentMax}>
          <div className={`text-center ${headerToContent}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#b77f9f]">{t('homepage.addons.eyebrow')}</p>
            <h2 className={`section-title ${headerTitleGap}`}>{t('homepage.addons.title')}</h2>
            <p className={`text-[1rem] text-[#7b6778] ${headerSubtitleGap}`}>{t('homepage.addons.subtitle')}</p>
            <p className="mt-2 text-sm text-[#9a7891]">{t('homepage.addons.helper')}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {homepageAddOns.length > 0 ? (
              homepageAddOns.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(localizePath('/book'))}
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
                onClick={() => router.push(localizePath('/book'))}
                className="inline-flex items-center gap-2 rounded-full border border-[#e8cfdd] bg-white/90 px-4 py-2.5 text-sm font-medium text-[#5f4d5d] shadow-[0_14px_22px_-20px_rgba(101,65,90,0.45)] transition hover:-translate-y-0.5 hover:border-[#d9b4c8] hover:bg-white"
              >
                {language === 'en' ? 'Add-ons available when you book' : 'Lisateenused broneerimisel'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 8. SPECIALIST / SANDRA — Premium editorial authority */}
      {/* ===================== */}
      <section
        id="team"
        ref={sandraSectionRef}
        className={`relative overflow-visible border-t border-[#e8dce4]/60 bg-gradient-to-b from-[#fdf8fa] via-[#faf5f8] to-[#f8f2f6] ${sectionClass}`}
      >
        <div className={`relative ${contentMax}`}>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16 lg:items-center">
            {/* LEFT — Visual authority: tall portrait, overlap, badge */}
            <div className="relative order-1 lg:order-1 lg:col-span-5">
              <div
                ref={sandraImageRef}
                className={`relative overflow-hidden rounded-[32px] shadow-[0_32px_64px_-24px_rgba(80,48,65,0.22),0_0_0_1px_rgba(0,0,0,0.04)] transition-all duration-700 ease-out ${
                  isSandraInView ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
                }`}
              >
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#1a1218]/60 via-transparent to-transparent" />
                <span className="absolute left-5 top-5 z-20 rounded-full bg-white/94 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a4d66] shadow-lg backdrop-blur-sm">
                  {getI18nTextOrFallback('homepage.team.favoriteBadge', language === 'en' ? 'Client favourite' : 'Kliendi lemmik')}
                </span>
                <Image
                  src={orderedGalleryItems[0]?.imageUrl || media('team_portrait') || media('hero_main') || ''}
                  alt={getI18nTextOrFallback('homepage.team.imageAlt', language === 'en' ? 'Sandra Samun at Nailify studio' : 'Sandra Samun Nailify stuudios')}
                  width={1200}
                  height={1500}
                  className="aspect-[4/5] w-full object-cover lg:aspect-[5/6] lg:min-h-[520px]"
                />
              </div>
              {/* Overlap: image bleeds into section */}
              <div className="pointer-events-none absolute -bottom-6 -right-4 hidden h-32 w-48 rounded-full bg-[#f5e8ef]/60 blur-3xl lg:block" aria-hidden />
            </div>

            {/* RIGHT — Authority content column */}
            <div className="order-2 flex flex-col lg:col-span-7">
              <p
                className={`text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a6b7e] transition-all duration-600 ${
                  isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: '100ms' }}
              >
                {getI18nTextOrFallback('homepage.team.eyebrow', language === 'en' ? 'Personal specialist' : 'Isiklik spetsialist')}
              </p>
              <h2
                className={`mt-2 font-brand text-[36px] font-semibold leading-tight tracking-tight text-[#1f171d] transition-all duration-600 ${
                  isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: '180ms' }}
              >
                Sandra Samun
              </h2>

              {/* Trust micro row — 3 pills */}
              <div className="mt-5 flex flex-wrap gap-2.5">
                {[t('homepage.team.exp'), t('homepage.team.clients'), t('homepage.team.rating')].map((chip, index) => (
                  <span
                    key={chip}
                    className={`rounded-full bg-[#f0e8ec] px-4 py-2 text-xs font-medium text-[#5d4a59] transition-all duration-500 ${
                      isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                    }`}
                    style={{ transitionDelay: `${260 + index * 60}ms` }}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* Authority paragraph — max 2 lines */}
              <p
                className={`mt-6 line-clamp-2 text-[15px] leading-[1.6] text-[#5f4c59] transition-all duration-500 ${
                  isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: '440ms' }}
              >
                {t('homepage.team.subtitle')} {t('homepage.team.authorityLine')}
              </p>

              {/* Benefit cards — soft floating */}
              <div className="mt-8 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible lg:grid lg:grid-cols-3 lg:gap-5">
                {[
                  {
                    title: getI18nTextOrFallback('homepage.team.benefits.designs', language === 'en' ? 'Personalized design' : 'Personaalne disain'),
                    description: getI18nTextOrFallback('homepage.team.benefits.designsHint', language === 'en' ? 'Tailored to your hand shape and style.' : 'Kohandatud sinu käe kuju ja stiiliga.'),
                  },
                  {
                    title: getI18nTextOrFallback('homepage.team.benefits.results', language === 'en' ? 'Long-lasting result' : 'Kauapüsiv tulemus'),
                    description: getI18nTextOrFallback('homepage.team.benefits.resultsHint', language === 'en' ? 'Durability that keeps shine for weeks.' : 'Püsivus, mis hoiab läike nädalaid.'),
                  },
                  {
                    title: getI18nTextOrFallback('homepage.team.benefits.consultation', language === 'en' ? 'Consultation before service' : 'Konsultatsioon enne hooldust'),
                    description: getI18nTextOrFallback('homepage.team.benefits.consultationHint', language === 'en' ? 'Clear plan before your service starts.' : 'Selge plaan enne hoolduse algust.'),
                  },
                ].map((item, index) => (
                  <article
                    key={item.title}
                    className={`min-w-[260px] shrink-0 rounded-2xl bg-white/90 p-4 shadow-[0_12px_32px_-16px_rgba(70,45,58,0.12),0_0_0_1px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_-16px_rgba(70,45,58,0.16)] lg:min-w-0 ${
                      isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    }`}
                    style={{ transitionDelay: `${560 + index * 80}ms` }}
                  >
                    <h3 className="text-sm font-semibold text-[#2d232d]">{item.title}</h3>
                    <p className="mt-1.5 text-xs leading-[1.5] text-[#6f5e66]">{item.description}</p>
                  </article>
                ))}
              </div>

              {/* Signature style — fashion editorial */}
              <div className="mt-8">
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6b7e] transition-all duration-500 ${
                    isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                  }`}
                  style={{ transitionDelay: '800ms' }}
                >
                  {getI18nTextOrFallback('homepage.team.signatureLabel', language === 'en' ? 'Signature style' : 'Signature stiil')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    getI18nTextOrFallback('homepage.team.signatureTags.1', language === 'en' ? 'Nude luxury' : 'Nude luksus'),
                    getI18nTextOrFallback('homepage.team.signatureTags.2', language === 'en' ? 'Gloss finish' : 'Gloss finish'),
                    getI18nTextOrFallback('homepage.team.signatureTags.3', language === 'en' ? 'Minimal detail' : 'Minimal detail'),
                    getI18nTextOrFallback('homepage.team.signatureTags.4', language === 'en' ? 'Strong structure' : 'Tugev ehitus'),
                  ].map((tag) => (
                    <span key={tag} className="rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-medium text-[#5d4a59] shadow-sm ring-1 ring-[#ead8e2]/80">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Real work mini gallery — rounded thumbs, hover zoom, slight rotation */}
              <div className="mt-8">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6b7e]">
                  {getI18nTextOrFallback('homepage.team.resultsLabel', language === 'en' ? 'Real work results' : 'Päris töö tulemused')}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {specialistGallery.map((item, index) => (
                    <button
                      key={`${item.imageUrl}-${index}`}
                      type="button"
                      onClick={() => openSpecialistImage(index)}
                      className={`group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl shadow-[0_8px_24px_-12px_rgba(70,45,58,0.2)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_28px_-8px_rgba(70,45,58,0.28)] sm:h-24 sm:w-24 ${
                        index === 0 ? '-rotate-[0.5deg]' : index === 1 ? 'rotate-[0.5deg]' : '-rotate-[0.3deg]'
                      }`}
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.caption}
                        width={240}
                        height={240}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5 pointer-events-none" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary CTA — dramatic booking zone */}
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => router.push(localizePath('/book'))}
                  className="w-full rounded-full bg-[#c24d86] px-8 py-4 text-base font-semibold text-white shadow-[0_20px_40px_-16px_rgba(194,77,134,0.5)] transition-all duration-300 hover:bg-[#b04376] hover:shadow-[0_24px_48px_-16px_rgba(194,77,134,0.6)] hover:scale-[1.02] active:scale-[0.99] lg:w-auto lg:px-10 lg:py-4"
                >
                  {getI18nTextOrFallback('homepage.team.ctaStrong', language === 'en' ? 'Book with Sandra' : 'Broneeri aeg Sandraga')}
                  <ArrowRight className="ml-2 inline h-5 w-5" strokeWidth={2.2} />
                </button>
                <p className="mt-3 text-xs font-medium text-[#7a6572]">
                  {getI18nTextOrFallback('homepage.team.weeklyAvailability', language === 'en' ? 'Available slots this week' : 'Vabu aegu sel nädalal')}
                </p>
              </div>
            </div>
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
                onClick={() => router.push(localizePath('/book'))}
                className="mt-4 rounded-full bg-white px-5 py-2 text-xs font-semibold text-[#5e2d49] transition hover:bg-[#ffe9f5]"
              >
                {getI18nTextOrFallback('homepage.gallery.wantThisStyle', language === 'en' ? 'I want this style' : 'Soovin seda stiili')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== */}
      {/* 9. PRODUCT DISCOVERY — Premium editorial 3-zone layout */}
      {/* ===================== */}
      <section
        id="products"
        className={`relative overflow-hidden ${sectionClass} bg-[#f7f0f3]`}
      >
        {/* Layered depth: radial behind hero, pink-beige container, blurred glows, darker than page */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,#fdf6f9_0%,transparent_55%)]" aria-hidden />
        <div className="pointer-events-none absolute left-0 top-[8%] h-[380px] w-[380px] rounded-full bg-[#f0e2eb]/40 blur-[80px]" aria-hidden />
        <div className="pointer-events-none absolute right-0 top-[35%] h-[260px] w-[260px] rounded-full bg-[#ead8e4]/30 blur-[60px]" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[200px] w-[120%] rounded-full bg-[#f5ecf0]/25 blur-[60px]" aria-hidden />

        <div className={`relative z-10 ${contentMax}`}>
          {/* Section header */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6 lg:mb-10">
            <div className="max-w-3xl">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[#b57b9d]">
                {t('homepage.products.eyebrow')}
              </p>
              <h2 className="section-title">
                {getI18nTextOrFallback('homepage.products.retailTitle', language === 'en' ? 'Keep your salon result beautiful for longer' : 'Hoia salongitulemus kauem kaunis')}
              </h2>
              <p className="mt-4 max-w-[54ch] text-[1.01rem] leading-7 text-[#6f5d6d]">
                {getI18nTextOrFallback('homepage.products.retailSubtitle', language === 'en' ? "Sandra's recommended aftercare essentials for shine, durability and healthier nails." : 'Sandra soovitatud järelhooldus läike, püsivuse ja tervemate küünte hoidmiseks.')}
              </p>
              <p className="mt-2 text-sm font-medium text-[#8e6880]">
                {getI18nTextOrFallback('homepage.products.retailSupport', language === 'en' ? 'Curated products you can add to your booking or take home.' : 'Valitud tooted, mida saad lisada broneeringule või võtta koju kaasa.')}
              </p>
            </div>
            <button
              onClick={goToShop}
              className="rounded-full bg-transparent px-6 py-3 text-sm font-semibold text-[#6a4c64] transition-all duration-300 hover:bg-[#fdf4f9] hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('homepage.products.explore')}
            </button>
          </div>

          {productsLoading ? (
            <div className="grid items-start gap-6 lg:grid-cols-12">
              <article className="overflow-hidden rounded-[28px] lg:col-span-8">
                <SkeletonBlock className="aspect-[3/4] min-h-[320px]" />
                <div className="space-y-4 p-6">
                  <SkeletonBlock className="h-5 w-36 rounded-full" />
                  <SkeletonBlock className="h-10 w-3/4" />
                  <SkeletonBlock className="h-4 w-full max-w-[42ch]" />
                  <SkeletonBlock className="h-12 w-44 rounded-full" />
                </div>
              </article>
              <aside className="flex gap-4 overflow-x-auto pb-2 lg:col-span-4 lg:flex-col lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <SkeletonBlock className="h-5 w-28 rounded-full" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonBlock key={`pick-skel-${i}`} className="h-20 w-full min-w-[260px] rounded-2xl lg:min-w-0" />
                ))}
              </aside>
              <div className="lg:col-span-12">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <article key={`grid-skel-${i}`} className="overflow-hidden rounded-[24px]">
                      <SkeletonBlock className="aspect-[4/3]" />
                      <div className="space-y-3 p-4">
                        <SkeletonBlock className="h-5 w-4/5" />
                        <SkeletonBlock className="h-4 w-full" />
                        <SkeletonBlock className="h-9 w-28 rounded-full" />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Shared container: hero + curated picks — reduced hero height so grid rises; no right-column void */}
              <div className="rounded-[28px] bg-[#fdf9fb]/90 p-3 shadow-none backdrop-blur-sm lg:p-4">
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
                  {/* ZONE 1 — Hero: magazine cover proportion — image ~15% shorter, overlay higher + wider, gradient behind card, stronger title */}
                  {featuredProduct && (
                    <article className="group relative overflow-hidden rounded-2xl bg-white/95 shadow-[0_12px_36px_-16px_rgba(60,35,55,0.1),0_4px_16px_-8px_rgba(60,35,55,0.06)] transition-all duration-300 hover:-translate-y-0.5 lg:col-span-8">
                      <div className="relative flex flex-col pb-0">
                        {/* Hero image: aspect-ratio for responsive fill, no fixed height */}
                        <div className="relative aspect-[4/3] min-h-[200px] overflow-hidden rounded-t-2xl bg-[#f8edf3] sm:aspect-[3/2] lg:aspect-[8/5]">
                          {featuredProduct.imageUrl || featuredProduct.images?.[0] ? (
                            <Image
                              src={featuredProduct.imageUrl || featuredProduct.images?.[0] || ''}
                              alt={featuredProduct.name}
                              width={1200}
                              height={900}
                              unoptimized
                              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-[#7f6679]">{featuredProduct.name}</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#2a1828]/70 via-[#2a1828]/12 to-transparent" />
                          {/* Soft gradient fade behind where overlay card sits */}
                          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/20 to-transparent pointer-events-none" aria-hidden />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(featuredProduct.id); }}
                            className={`absolute right-3 top-3 z-10 inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-full bg-white/95 transition-all duration-200 hover:scale-110 ${
                              isFavorite(featuredProduct.id) ? 'text-[#c24d86]' : 'text-[#8b6c81] hover:text-[#b07a9a]'
                            }`}
                            aria-label={isFavorite(featuredProduct.id) ? (language === 'en' ? 'Remove from favourites' : 'Eemalda lemmikutest') : (language === 'en' ? 'Add to favourites' : 'Lisa lemmikutesse')}
                          >
                            <FavoriteHeartIcon active={isFavorite(featuredProduct.id)} size={18} />
                          </button>
                        </div>
                        {/* Overlay card: higher into image, slightly wider, less padding — bottom-sheet style on mobile */}
                        <div className="relative -mt-20 mx-2.5 w-[calc(100%-1.25rem)] max-w-[min(100%,34rem)] rounded-2xl bg-white/92 p-4 shadow-[0_8px_32px_-12px_rgba(50,28,45,0.12)] backdrop-blur-md sm:mx-3 sm:-mt-24 sm:p-4 lg:-mt-28 lg:mx-4 lg:max-w-[38rem] lg:p-5">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a06f8d]">
                            {featuredProduct.isFeatured
                              ? getI18nTextOrFallback('homepage.products.badgeRecommended', language === 'en' ? 'Sandra recommends' : 'Sandra soovitab')
                              : t('homepage.products.badgeBestseller')}
                          </p>
                          <h3 className="text-[1.35rem] font-bold leading-tight tracking-[-0.02em] text-[#2d232d] sm:text-[1.65rem]">
                            {featuredProduct.name}
                          </h3>
                          <p className="mt-1.5 line-clamp-2 max-w-[46ch] text-[13px] leading-6 text-[#6f5f6f]">
                            {featuredProduct.description}
                          </p>
                          <p className="mt-1 text-[11px] font-medium leading-6 text-[#8f6a84]">
                            {getI18nTextOrFallback(
                              'homepage.products.useCaseFeatured',
                              language === 'en'
                                ? 'Best paired with gel manicure and maintenance visits to keep shine and cuticles balanced.'
                                : 'Sobib eriti hästi geelhoolduse ja hooldusaegadega, et säilitada läige ning tasakaalus küünenahad.',
                            )}
                          </p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9b7590]">
                                {getI18nTextOrFallback('homepage.products.priceFrom', language === 'en' ? 'From' : 'Alates')}
                              </p>
                              <p className="text-[1.6rem] font-bold tracking-[-0.02em] text-[#b04b80] sm:text-2xl">EUR {featuredProduct.price}</p>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                              <button
                                onClick={() => router.push(localizePath('/book'))}
                                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#c24d86_0%,#a93d71_45%,#8f3362_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(139,51,100,0.55)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
                              >
                                {getI18nTextOrFallback('homepage.products.ctaAddWithBooking', language === 'en' ? 'Add with booking' : 'Lisa broneeringule')}
                              </button>
                              <button
                                onClick={() => goToProduct(featuredProduct.id)}
                                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-transparent px-4 py-2.5 text-sm font-semibold text-[#6a4c64] transition-all duration-200 hover:bg-[#fdf4f9] hover:scale-[1.01] active:scale-[0.99] sm:w-auto"
                              >
                                {getI18nTextOrFallback('homepage.products.ctaViewProduct', language === 'en' ? 'View product details' : 'Vaata toote detaile')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  )}

                  {/* ZONE 2 — Curated picks: mobile = horizontal swipe; desktop = sticky panel with max-height + fade */}
                  <aside className="relative rounded-[20px] bg-white/40 p-3 backdrop-blur-sm lg:col-span-4 lg:sticky lg:top-20 lg:max-h-[min(320px,40vh)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a06f8d]">
                      {getI18nTextOrFallback('homepage.products.quickPicksLabel', language === 'en' ? 'Quick picks' : 'Kiired valikud')}
                    </p>
                    <p className="mt-1 text-[12px] leading-5.5 text-[#6f5f6f] lg:max-w-[240px]">
                      {getI18nTextOrFallback(
                        'homepage.products.quickPicksDescription',
                        language === 'en'
                          ? 'Take-home essentials that support longer wear and healthier nails between appointments.'
                          : 'Koduseks hoolduseks valitud tooted, mis aitavad tulemusel püsida ja hoiavad küüned tervemad.',
                      )}
                    </p>
                    <div className="mt-2 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-y-auto lg:max-h-[200px] lg:gap-0 [scrollbar-width:thin]">
                      <div className="flex gap-3 lg:flex-col lg:gap-0 lg:divide-y lg:divide-[#eedce6]/40">
                        {supportingProducts.slice(0, 3).map((product) => (
                          <button
                            key={`quick-${product.id}`}
                            onClick={() => goToProduct(product.id)}
                            className="group flex w-[min(100%,280px)] shrink-0 items-center gap-2.5 rounded-xl bg-white/60 p-2.5 transition-colors hover:bg-[#fdf6fa]/80 lg:w-auto lg:min-w-0 lg:rounded-lg lg:bg-transparent lg:py-2.5 lg:hover:bg-[#fdf6fa]/70"
                          >
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f8edf3]">
                              {product.imageUrl || product.images?.[0] ? (
                                <Image src={product.imageUrl || product.images?.[0] || ''} alt={product.name} width={180} height={180} unoptimized className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] text-[#7f6679]">{product.name}</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 text-left lg:flex-1">
                              <p className="truncate text-[13px] font-semibold text-[#312631]">{product.name}</p>
                              <p className="mt-0.5 text-[10px] text-[#7f6b7c]">
                                {getI18nTextOrFallback('homepage.products.quickPickUseCase', language === 'en' ? 'Salon aftercare pick' : 'Salongi järelhoolduse valik')}
                              </p>
                            </div>
                            <p className="shrink-0 text-right text-[13px] font-semibold text-[#b04b80]">EUR {product.price}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 hidden h-8 bg-gradient-to-t from-[#fdf9fb] to-transparent lg:block" aria-hidden />
                  </aside>
                </div>
              </div>

              {/* ZONE 3 — Masonry grid: controlled rhythm — medium landscape → small portrait → tall portrait → medium → small (no content expansion) */}
              <div className="mt-6 lg:mt-8">
                <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible md:gap-4 lg:grid-cols-4 lg:gap-5">
                  {retailProducts.map((product, index) => {
                    const r = index % 5;
                    const cardSm = 'aspect-[4/3.2]';
                    const cardMd = 'aspect-[4/3.5]';
                    const cardLg = 'aspect-[4/3]';
                    const cardTall = 'aspect-[4/4.2]';
                    const aspectClass = r === 0 ? cardLg : r === 1 || r === 4 ? cardSm : r === 2 ? cardTall : cardMd;
                    const isTall = r === 2;
                    return (
                      <article
                        key={product.id}
                        className="group flex min-w-[240px] flex-col overflow-hidden rounded-[24px] bg-white/95 shadow-[0_8px_24px_-12px_rgba(65,38,58,0.08),0_2px_10px_-4px_rgba(65,38,58,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(65,38,58,0.12),0_4px_14px_-6px_rgba(65,38,58,0.06)] md:min-w-0"
                      >
                        <div
                          className={`relative cursor-pointer overflow-hidden rounded-t-[24px] bg-[#f8edf3] ${aspectClass}`}
                          onClick={() => goToProduct(product.id)}
                        >
                          {product.imageUrl || product.images?.[0] ? (
                            <Image
                              src={product.imageUrl || product.images?.[0] || ''}
                              alt={product.name}
                              width={760}
                              height={580}
                              unoptimized
                              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-[#7f6679]">{product.name}</div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                            className={`absolute right-2.5 top-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 transition-all duration-200 hover:scale-110 ${
                              isFavorite(product.id) ? 'text-[#c24d86]' : 'text-[#8b6c81] hover:text-[#b07a9a]'
                            }`}
                            aria-label={isFavorite(product.id) ? (language === 'en' ? 'Remove from favourites' : 'Eemalda lemmikutest') : (language === 'en' ? 'Add to favourites' : 'Lisa lemmikutesse')}
                          >
                            <FavoriteHeartIcon active={isFavorite(product.id)} size={16} />
                          </button>
                        </div>
                        <div className="flex min-h-[7.5rem] flex-1 flex-col p-4">
                          <h4 className={`font-semibold leading-snug text-[#322a33] ${isTall ? 'text-base' : 'text-[15px]'}`}>
                            {product.name}
                          </h4>
                          <p className="mt-0.5 line-clamp-2 max-w-[30ch] text-[11px] leading-[1.35] text-[#7a6677]">
                            {product.description}
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-[#9e7690]">
                            {getI18nTextOrFallback('homepage.products.cardUseCase', language === 'en' ? 'Supports longer-lasting salon results.' : 'Toetab kauapüsivamat salongitulemust.')}
                          </p>
                          <div className="mt-auto flex flex-col gap-2 pt-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                            <span className={`font-semibold text-[#b04b80] ${isTall ? 'text-base' : 'text-[15px]'}`}>EUR {product.price}</span>
                            <button
                              onClick={() => goToProduct(product.id)}
                              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#c24d86_0%,#a93d71_50%,#8f3362_100%)] px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(139,51,100,0.4)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
                            >
                              {getI18nTextOrFallback('homepage.products.ctaRetailTile', language === 'en' ? 'Buy now' : 'Osta kohe')}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===================== */}
      {/* 10. CLIENT FEEDBACK — Premium beauty social proof (editorial 2-layer) */}
      {/* ===================== */}
      <section
        id="testimonials"
        ref={testimonialsSectionRef}
        className={`relative overflow-hidden bg-gradient-to-b from-[#fbf7f9] via-[#f8f2f5] to-[#f4edf1] ${sectionClass}`}
      >
        {/* Calm trust zone: very subtle tint + soft radial */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_20%,rgba(252,248,250,0.5)_0%,transparent_55%)]" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-[#f5eef2]/40 to-transparent" aria-hidden />

        <div className={`relative z-10 ${contentMax} transition-all duration-700 ease-out ${testimonialsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <header className={`text-center ${headerToContent}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#a87a94]">
              {t('homepage.testimonials.eyebrow')}
            </p>
            <h2 className={`font-brand text-[36px] font-semibold leading-tight tracking-tight text-[#2d232d] ${headerTitleGap}`}>
              {t('homepage.testimonials.title')}
            </h2>
            <p className={`mx-auto max-w-[32rem] text-[1rem] font-medium leading-relaxed text-[#5f4d5a] ${headerSubtitleGap}`}>
              {t('homepage.testimonials.subtitle')}
            </p>
          </header>

          {feedbackItems.length === 0 ? (
            <div className="rounded-3xl border border-[#efe0e8] bg-white/90 px-6 py-14 text-center shadow-[0_12px_40px_-20px_rgba(70,40,60,0.08)]">
              <p className="text-[#7e6376]">{t('homepage.testimonials.subtitle')}</p>
            </div>
          ) : (
            <>
              {/* Featured reel testimonial */}
              {feedbackItems[0] && (() => {
                const featured = feedbackItems[0];
                const firstName = featured.clientName.trim().split(/\s+/)[0] || featured.clientName;
                const quoteShort = featured.feedbackText.length > 120 ? `${featured.feedbackText.slice(0, 117)}…` : featured.feedbackText;
                const caption =
                  featured.feedbackText.length > 34
                    ? `${featured.feedbackText.slice(0, 31).trim()}…`
                    : featured.feedbackText.trim() || (language === 'en' ? 'Loved my natural set' : 'Armastan oma naturaalset tulemust');
                const serviceLabel = (featured.serviceId || '')
                  .toString()
                  .trim()
                  .replace(/[-_]+/g, ' ')
                  .replace(/\b\w/g, (m) => m.toUpperCase());
                return (
                  <article
                    className="group mb-6 overflow-hidden rounded-[28px] border border-[#ebe0e6]/80 bg-white shadow-[0_18px_48px_-34px_rgba(60,40,52,0.28)] transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_26px_70px_-44px_rgba(60,40,52,0.32)] lg:mb-8"
                  >
                    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,0.44fr)_1fr]">
                      {/* Left: vertical reel visual */}
                      <div className="relative overflow-hidden bg-[#f5e8ef]">
                        <div className="relative aspect-[3/4] w-full">
                          {featured.clientAvatarUrl ? (
                            <Image
                              src={featured.clientAvatarUrl}
                              alt=""
                              fill
                              unoptimized
                              sizes="(max-width: 1024px) 100vw, 440px"
                              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_50%,#f0dce6_0%,#ead4e0_45%,#e5ccda_100%)]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#120c12]/60 via-[#120c12]/10 to-transparent" />

                          {/* Reel indicator */}
                          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white/95" aria-hidden="true">
                                <path d="M9 7.5v9l8-4.5-8-4.5Z" />
                              </svg>
                            </span>
                            {language === 'en' ? 'Featured reel' : 'Esile tõstetud'}
                          </div>

                          {/* Floating caption */}
                          <div className="absolute bottom-4 left-4 right-4">
                            <p className="inline-flex max-w-full items-center rounded-2xl bg-white/14 px-3.5 py-2 text-[12px] font-medium leading-snug text-white backdrop-blur-md">
                              “{caption}”
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: quote + meta + CTA */}
                      <div className="relative flex flex-col justify-center px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
                        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#a87a94]">
                          {language === 'en' ? 'Client discovery' : 'Kliendi kogemus'}
                        </p>
                        <blockquote className="mt-2 font-brand text-[1.55rem] font-medium leading-[1.45] tracking-[-0.02em] text-[#2d232d] sm:text-[1.75rem] lg:text-[1.95rem]">
                          &ldquo;{quoteShort}&rdquo;
                        </blockquote>

                        <div className="mt-3 flex items-center gap-2.5">
                          <div className="flex items-center gap-0 text-[#b86b8f]" role="img" aria-label={`${featured.rating} out of 5`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className="text-[12px] leading-none" aria-hidden>
                                {i < featured.rating ? '★' : '☆'}
                              </span>
                            ))}
                          </div>
                          <span className="text-[12px] font-medium text-[#7a6677]">
                            {featured.sourceLabel || (language === 'en' ? 'Verified client' : 'Kinnitatud klient')}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <p className="text-[14px] font-semibold text-[#2d232d]">{firstName}</p>
                          {serviceLabel && (
                            <span className="inline-flex items-center rounded-full border border-[#ead6e2] bg-[#fff7fb] px-3 py-1 text-[11px] font-semibold text-[#6a3b57]">
                              {serviceLabel}
                            </span>
                          )}
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => router.push(localizePath('/book'))}
                            className="cta-premium inline-flex min-h-[48px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#c24d86_0%,#a93d71_50%,#8f3362_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_-18px_rgba(194,77,134,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.02] active:scale-[0.99]"
                          >
                            {language === 'en' ? 'Book same result' : 'Broneeri sama tulemus'}
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(localizePath('/book'))}
                            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#ead6e2] bg-white px-6 py-3 text-sm font-semibold text-[#6a3b57] transition-colors hover:bg-[#fff4fa]"
                          >
                            {language === 'en' ? 'See availability' : 'Vaata aegu'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })()}

              {/* Reel mini cards — swipeable reels strip (desktop + mobile) */}
              <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-2 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory md:gap-5">
                  {feedbackItems.slice(1, 5).map((item) => {
                    const firstName = item.clientName.trim().split(/\s+/)[0] || item.clientName;
                    const caption =
                      item.feedbackText.length > 30 ? `${item.feedbackText.slice(0, 27).trim()}…` : item.feedbackText.trim();
                    return (
                      <article
                        key={item.id}
                        className="group relative min-w-[220px] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-[26px] border border-[#ebe0e6]/80 bg-white shadow-[0_16px_44px_-34px_rgba(60,40,52,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_-46px_rgba(60,40,52,0.3)] md:min-w-[240px]"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden bg-[#f8edf4]">
                          {item.clientAvatarUrl ? (
                            <Image
                              src={item.clientAvatarUrl}
                              alt=""
                              fill
                              unoptimized
                              sizes="240px"
                              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_50%,#f0dce6_0%,#ead4e0_45%,#e5ccda_100%)]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#120c12]/60 via-[#120c12]/12 to-transparent" />

                          {/* Tiny heart icon (decorative) */}
                          <div className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90 backdrop-blur-md transition-transform duration-200 group-hover:scale-[1.04]">
                            <FavoriteHeartIcon active={false} size={16} />
                          </div>

                          {/* Rating indicator */}
                          <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/95 backdrop-blur-md">
                            <span aria-hidden>★</span>
                            <span>{item.rating}/5</span>
                          </div>

                          {/* Caption overlay */}
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="rounded-2xl bg-white/14 px-3.5 py-2 backdrop-blur-md transition-opacity duration-300 md:opacity-95 md:group-hover:opacity-100">
                              <p className="text-[12px] font-medium leading-snug text-white">
                                “{caption || (language === 'en' ? 'Loved it.' : 'Väga rahul.') }”
                              </p>
                              <p className="mt-1 text-[11px] font-semibold text-white/85">{firstName}</p>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===================== */}
      {/* 9. LOCAL TRUST / VISIT US — Editorial 2-column */}
      {/* ===================== */}
      <section id="location" ref={locationSectionRef} className={`bg-slate-50/60 ${sectionClass}`}>
        <div className={contentMax}>
          <div
            className={`grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center transition-all duration-700 ease-out ${
              locationInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            {/* LEFT COLUMN: visual anchor — large image with overlay and optional label */}
            <div className="relative order-2 lg:order-1 overflow-hidden rounded-2xl bg-slate-200 shadow-xl">
              <div className="aspect-[4/3] lg:aspect-[5/4] relative group">
                {(media('location_studio') || media('team_portrait') || media('hero_main')) ? (
                  <Image
                    src={media('location_studio') || media('team_portrait') || media('hero_main')}
                    alt={t('homepage.location.mapTitle')}
                    width={1200}
                    height={900}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-500">
                    <span className="text-sm font-medium">{t('homepage.location.previewEyebrow')}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
                <span className="absolute bottom-4 left-4 text-sm font-medium text-white drop-shadow-md">
                  {t('location.mustamae')}
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: content block — eyebrow, heading, paragraph, chips, CTAs */}
            <div className="order-1 lg:order-2 flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                {t('homepage.localAuthority.eyebrow')}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                {t('homepage.location.title')}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                {t('homepage.location.subtitle')}
              </p>
              <p className="mt-2 text-base text-slate-500">
                {t('homepage.location.previewText')}
              </p>

              {/* Feature chips — soft rectangular, icon + text, 2 per row on mobile */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { icon: MapPin, key: 'badge1' as const },
                  { icon: Clock, key: 'badge2' as const },
                  { icon: Car, key: 'badge3' as const },
                  { icon: Building2, key: 'badge4' as const },
                ].map(({ icon: Icon, key }) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                    <span className="text-sm font-medium text-slate-700">{t(`homepage.location.${key}`)}</span>
                  </div>
                ))}
              </div>

              {/* CTAs — primary Get directions, secondary Book visit */}
              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="https://www.google.com/maps?q=Mustam%C3%A4e+tee+55+Tallinn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-7 py-3.5 text-base font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:opacity-95 hover:-translate-y-0.5"
                >
                  {t('location.getDirections')}
                </a>
                <button
                  type="button"
                  onClick={() => router.push(localizePath('/book'))}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:opacity-90 hover:-translate-y-0.5"
                >
                  {t('nav.bookNow')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 10. AFTERCARE + GIFT CARDS — premium editorial, lifestyle cards */}
      {/* ===================== */}
      <section className={`relative bg-gradient-to-b from-white to-[#faf8f9] ${sectionClass} pb-24 lg:pb-28`} id="aftercare-gifts">
        <div className={contentMax}>
          <header className={`text-center ${headerToContent}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a6b7e]">{t('homepage.revenue.sectionEyebrow')}</p>
            <h2 className={`font-brand text-[36px] font-semibold tracking-tight text-[#1f171d] ${headerTitleGap}`}>
              {t('homepage.revenue.sectionTitle')}
            </h2>
            <p className={`mx-auto max-w-[32rem] text-[1rem] leading-relaxed text-[#6b5a62] ${headerSubtitleGap}`}>
              {t('homepage.revenue.sectionIntro')}
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#ebe0e6]/80 bg-gradient-to-b from-[#fdfafc] to-[#f8f4f7] shadow-[0_8px_24px_-12px_rgba(60,40,52,0.08)] transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(60,40,52,0.12)] hover:scale-[1.01]">
              <div className="relative overflow-hidden">
                <Image
                  src={media('aftercare_image') || media('product_fallback_1') || media('hero_main')}
                  alt="Aftercare products"
                  width={1200}
                  height={760}
                  className="h-64 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] sm:h-72 lg:h-80"
                />
              </div>
              <div className="flex flex-1 flex-col p-6 lg:p-7">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#b07a99]">{t('homepage.aftercare.eyebrow')}</p>
                <h3 className="mt-2 font-brand text-[1.5rem] font-semibold leading-tight text-[#2f2530] lg:text-2xl">{t('homepage.aftercare.title')}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f5d6d]">{t('homepage.aftercare.subtitle')}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-[#6f5d6d]">
                  <li>{t('homepage.aftercare.tip1')}</li>
                  <li>{t('homepage.aftercare.tip2')}</li>
                  <li>{t('homepage.aftercare.tip3')}</li>
                </ul>
                <div className="mt-6">
                  <button
                    onClick={() => router.push(localizePath('/shop'))}
                    className="inline-flex items-center justify-center rounded-full bg-[#c24d86] px-6 py-3 text-[0.95rem] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(194,77,134,0.45)] transition-all duration-200 hover:bg-[#b04376] hover:shadow-[0_14px_28px_-8px_rgba(194,77,134,0.5)] hover:-translate-y-0.5 active:scale-[0.99]"
                  >
                    {t('homepage.aftercare.cta')}
                  </button>
                </div>
              </div>
            </article>

            <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#ebe0e6]/80 bg-gradient-to-b from-[#fdfafc] to-[#f8f4f7] shadow-[0_8px_24px_-12px_rgba(60,40,52,0.08)] transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(60,40,52,0.12)] hover:scale-[1.01]">
              <div className="relative overflow-hidden">
                <Image
                  src={media('giftcard_image') || media('product_fallback_2') || media('hero_main')}
                  alt="Gift card"
                  width={1200}
                  height={760}
                  className="h-64 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] sm:h-72 lg:h-80"
                />
              </div>
              <div className="flex flex-1 flex-col p-6 lg:p-7">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#b07a99]">{t('homepage.giftcards.eyebrow')}</p>
                <h3 className="mt-2 font-brand text-[1.5rem] font-semibold leading-tight text-[#2f2530] lg:text-2xl">{t('homepage.giftcards.title')}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f5d6d]">{t('homepage.giftcards.subtitle')}</p>
                <p className="mt-2 text-sm font-medium text-[#8e5f7f]">{t('homepage.giftcards.helper')}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[25, 50, 100].map((amount) => {
                    const isPopular = amount === 50;
                    return (
                      <span
                        key={amount}
                        className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                          isPopular
                            ? 'border-2 border-[#c24d86]/50 bg-[#fff0f6] text-[#9b3d6d] ring-1 ring-[#e8c4d8]/60'
                            : 'border border-[#e7cadb] bg-[#fff7fc] text-[#6b4e65] hover:border-[#dfbccd] hover:bg-[#fef5fa]'
                        }`}
                      >
                        EUR {amount}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-6">
                  <button
                    className="inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[1rem] font-semibold text-white shadow-[0_12px_28px_-8px_rgba(194,77,134,0.5)] transition-all duration-200 hover:shadow-[0_16px_32px_-8px_rgba(194,77,134,0.55)] hover:-translate-y-0.5 active:scale-[0.99] sm:w-auto"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {t('homepage.giftcards.cta')}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 11. HOW BOOKING WORKS - SUPPORT */}
      {/* ===================== */}
      <section className={`bg-slate-50/50 ${sectionClass}`}>
        <div className={contentMax}>
          <div className={`text-center ${headerToContent}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#b67f9f]">{t('homepage.flow.eyebrow')}</p>
            <h2 className={`font-brand text-[36px] font-semibold tracking-tight text-[#2A211D] ${headerTitleGap}`}>{t('howItWorks.title')}</h2>
            <p className={`text-[1rem] leading-relaxed text-[#6f5d53] ${headerSubtitleGap}`}>{t('howItWorks.subtitle')}</p>
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

      {/* Final CTA — split luxury layout: emotional left + conversion card right */}
      <section
        id="final-cta"
        className={`relative overflow-hidden bg-gradient-to-b from-[#faf8f6] to-[#f5f2ef] ${sectionClass}`}
        aria-labelledby="final-cta-heading"
      >
        {/* Subtle background glow — decorative only */}
        <div className="pointer-events-none absolute right-0 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(194,77,134,0.06),transparent_70%)]" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(194,77,134,0.04),transparent_70%)]" aria-hidden />

        <div className={`relative ${contentMax}`}>
          <div
            data-motion="major-cta"
            className="grid gap-10 lg:grid-cols-[1fr,auto] lg:gap-14 lg:items-center"
          >
            {/* LEFT: emotional content — eyebrow, headline, paragraph, trust rows */}
            <div className="max-w-[32rem]">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                {t('homepage.final.limited')}
              </p>
              <h2 id="final-cta-heading" className="mt-2 font-brand text-[36px] font-semibold leading-tight tracking-tight text-slate-900">
                {t('finalCta.title')}
              </h2>
              <p className="mt-4 text-[1rem] leading-relaxed text-slate-600">
                {t('finalCta.subtitle')}
              </p>

              {/* Trust indicators — stacked mini rows, icon + benefit */}
              <ul className="mt-6 space-y-3" role="list">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
                  <span className="text-sm font-medium text-slate-700">{t('finalCta.mostClients')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
                  <span className="text-sm font-medium text-slate-700">{t('finalCta.freeReschedule')}</span>
                </li>
              </ul>
            </div>

            {/* RIGHT: floating conversion card */}
            <div
              className="relative rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)] backdrop-blur-sm transition-all duration-300 hover:shadow-[0_20px_48px_-14px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 lg:min-w-[300px]"
            >
              <p className="text-sm text-slate-600">{t('homepage.final.reassureLine')}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col">
                <button
                  type="button"
                  onClick={() => router.push(localizePath('/book'))}
                  className="final-cta-primary inline-flex min-h-[48px] w-full items-center justify-center rounded-xl px-6 text-[0.95rem] font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 sm:w-auto"
                  style={{
                    backgroundColor: colors.primary,
                    boxShadow: `0 4px 20px -4px ${colors.primary}66`,
                  }}
                >
                  {t('finalCta.secureSlot')}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('services')}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-8 text-base font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 sm:w-auto"
                >
                  {t('finalCta.browseServices')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 12. FOOTER — Premium authority, final conversion safety zone */}
      {/* ===================== */}
      <footer className={`relative border-t border-[#e5dce2] bg-gradient-to-b from-[#f6f2f4] to-[#efe8ec] ${sectionClass}`}>
        {/* Subtle top divider: soft shadow fade */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e0d4db] to-transparent" aria-hidden />
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-12 bg-gradient-to-b from-black/[0.02] to-transparent" aria-hidden />

        <div className={`relative ${contentMax}`}>
          <div className="grid gap-14 text-center md:grid-cols-12 md:gap-x-10 md:text-left lg:gap-x-12">
            {/* Brand block — dominant left zone */}
            <div className="md:col-span-5 lg:col-span-5">
              <span className="font-brand text-[28px] lg:text-[32px] leading-none tracking-tight" style={{ color: colors.primary }}>Nailify</span>
              <p className="mt-4 max-w-[36ch] text-[1.05rem] leading-[1.7] text-[#5c4f58] md:max-w-none">
                {t('footer.description')}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-medium text-[#7d6e78]">
                <span>{t('trust.rating')}</span>
                <span className="text-[#d4c4ce]" aria-hidden>·</span>
                <span>{t('trust.clients')}</span>
                <span className="text-[#d4c4ce]" aria-hidden>·</span>
                <span>{t('trust.hygienicTools')}</span>
              </div>
            </div>

            {/* Quick links */}
            <div className="md:col-span-2">
              <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7c6977]">
                {t('footer.quickLinks')}
              </h4>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-2 md:flex-col md:gap-2">
                <button onClick={() => router.push(localizePath('/book'))} className="text-left text-sm text-[#6b5c65] transition-colors hover:text-[#4a3d44] hover:underline underline-offset-2 md:inline-block">
                  {t('nav.bookNow')}
                </button>
                <button onClick={() => scrollToSection('services')} className="text-left text-sm text-[#6b5c65] transition-colors hover:text-[#4a3d44] hover:underline underline-offset-2 md:inline-block">
                  {t('nav.services')}
                </button>
                <button onClick={() => scrollToSection('location')} className="text-left text-sm text-[#6b5c65] transition-colors hover:text-[#4a3d44] hover:underline underline-offset-2 md:inline-block">
                  {t('nav.contact')}
                </button>
              </div>
            </div>

            {/* Contact + reassurance */}
            <div className="md:col-span-3">
              <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7c6977]">
                {t('footer.contact')}
              </h4>
              <p className="text-sm font-medium text-[#4a3d44]">{t('homepage.footer.contactLine1')}</p>
              <p className="mt-0.5 text-sm text-[#6b5c65]">{t('homepage.footer.contactLine2')}</p>
              <p className="text-sm text-[#6b5c65]">{t('homepage.footer.contactLine3')}</p>
              <p className="mt-2 text-sm font-medium" style={{ color: colors.primary }}>hello@nailify.com</p>
              <p className="mt-2 text-xs text-[#7d6e78]">{t('homepage.footer.hours1Label')}: {t('homepage.footer.hours1Value')}</p>
              <p className="mt-3 text-[11px] text-[#8a7b88]">{t('footer.rescheduleHint')}</p>
            </div>

            {/* Final CTA zone — booking reinforcement */}
            <div className="flex flex-col items-center gap-3 md:col-span-12 md:mt-4 md:flex-row md:items-center md:justify-center md:gap-6 lg:col-span-2 lg:col-start-11 lg:row-start-1 lg:row-span-2 lg:mt-0 lg:flex-col lg:items-start lg:justify-center">
              <div className="w-full sm:w-auto">
                <p className="text-[13px] font-medium text-[#5c4f58]">{t('footer.ctaLine')}</p>
                <button
                  onClick={() => router.push(localizePath('/book'))}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#b03d6f_0%,#c24d86_48%,#a93d71_100%)] px-6 py-3 text-[0.95rem] font-semibold text-white shadow-[0_10px_28px_-10px_rgba(139,51,100,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-8px_rgba(139,51,100,0.5)] active:scale-[0.99] sm:w-auto"
                >
                  {t('footer.bookAppointment')}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[#e5dce2] pt-8 sm:flex-row">
            <p className="text-[13px] text-[#8a7b88]">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <StickyBookingCTA hideOnPaths={['/book', '/success']} />

      {/* Discount pill — above sticky CTA, soft style, no overlap (z below CTA + chat) */}
      {showDiscountPill && !discountPillDismissed && (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-4 right-14 z-[42] md:hidden">
          <div
            onClick={() => router.push(localizePath('/book'))}
            className="mx-auto flex max-w-sm cursor-pointer items-center justify-between gap-2 rounded-full border border-[#e8d4e0] bg-white/90 px-3 py-2 shadow-[0_4px_16px_-8px_rgba(90,55,78,0.12)] backdrop-blur-sm transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#fdf2f8] px-2 py-0.5 text-[10px] font-semibold text-[#b04376]">−15%</span>
              <span className="text-xs font-medium text-[#5c4a54]">{t('discountPill.firstVisit')}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDiscountPillDismissed(true);
                setShowDiscountPill(false);
              }}
              className="flex h-8 min-h-[44px] w-8 min-w-[44px] items-center justify-center rounded-full text-[#8a6b7e] transition-colors hover:bg-[#faf5f8]"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


