'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PremiumImage as Image } from '@/components/ui/PremiumImage';
import { HeroBookingWidget } from '@/components/booking/HeroBookingWidget';
import { SkeletonBlock } from '@/components/loading/SkeletonBlock';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';
import { useMotionSystem } from '@/hooks/use-motion-system';
import { useBookingStore } from '@/store/booking-store';
import { clearBookingProductIntent, setBookingProductIntent } from '@/lib/booking-product-intent';
import { useTranslation, type Language } from '@/lib/i18n';
import type { Product } from '@/lib/catalog';
import { getNextAvailableSlotClient } from '@/lib/next-available-slot-client';
import { FavoriteHeartIcon } from '@/components/ui/FavoriteHeartIcon';
import { trackEvent as trackBehaviorEvent } from '@/lib/behavior-tracking';
import { getTodayInTallinn, getTomorrowInTallinn } from '@/lib/timezone';
import { getLocalizedValue } from '@/lib/localized-text';
import {
  Globe,
  ShoppingBag,
  Menu,
  ArrowRight,
  MapPin,
  Clock,
  Car,
  Building2,
  CheckCircle2,
  RefreshCw,
  Bus,
  Star,
  Users,
  Droplet,
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
interface ServiceCard {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  categoryName?: string;
  categoryNameEt?: string;
  categoryNameEn?: string;
  isPopular?: boolean;
  resultDescription?: string;
  longevityDescription?: string;
  suitabilityNote?: string;
  imageUrl?: string | null;
}

interface GalleryImageItem {
  id: string;
  imageUrl: string;
  title: string;
  tag: string;
  description: string;
  ctaHref: string;
  isFeatured: boolean;
  isVisible?: boolean;
  sortOrder?: number;
  createdAt?: string;
}

interface TeamMemberItem {
  id: string;
  slug: string;
  fullName: string;
  roleTitle: string;
  shortIntro: string;
  mainImage: string;
  badge1Text: string;
  badge2Text: string;
  badge3Text: string;
  feature1Title: string;
  feature1Text: string;
  feature2Title: string;
  feature2Text: string;
  feature3Title: string;
  feature3Text: string;
  signatureLabel: string;
  signatureTags: string[];
  previewGalleryImages: string[];
  primaryCtaText: string;
  primaryCtaLink: string;
  availabilityHelperText: string;
  isVisible: boolean;
  showOnHomepage: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt?: string;
}

type LocalizedTextLike = string | { et?: string; en?: string } | null | undefined;
type LocalizedListLike = string[] | { et?: string[]; en?: string[] } | null | undefined;

const GALLERY_DESKTOP_BREAKPOINT = 1024;
const GALLERY_TABLET_BREAKPOINT = 768;

function getHomepageGalleryInitialCount(width: number): number {
  if (width >= GALLERY_DESKTOP_BREAKPOINT) return 8;
  if (width >= GALLERY_TABLET_BREAKPOINT) return 6;
  return 4;
}

/** Next.js Image often paints an empty/gray box for data: URLs; native img displays base64 JPEGs reliably */
function isDataImageUrl(src: string | null | undefined): boolean {
  return typeof src === 'string' && /^\s*data:image\//i.test(src.trim());
}

function readLocalizedText(value: LocalizedTextLike, language: Language): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return getLocalizedValue({
      et: typeof value.et === 'string' ? value.et : '',
      en: typeof value.en === 'string' ? value.en : '',
      locale: language,
    });
  }
  return '';
}

function readLocalizedList(value: LocalizedListLike, language: Language): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (value && typeof value === 'object') {
    const et = Array.isArray(value.et) ? value.et.filter((item): item is string => typeof item === 'string') : [];
    const en = Array.isArray(value.en) ? value.en.filter((item): item is string => typeof item === 'string') : [];
    return language === 'en' ? (en.length ? en : et) : et;
  }
  return [];
}

export default function Home() {
  useMotionSystem();
  const router = useRouter();
  const { t, language, setLanguage, localizePath } = useTranslation();
  const addProductToBooking = useBookingStore((state) => state.addProductToBooking);
  const selectedProducts = useBookingStore((state) => state.selectedProducts);
  const removeProductFromBooking = useBookingStore((state) => state.removeProductFromBooking);
  const { favoritesCount, isFavorite, toggleFavorite } = useFavorites();
  const { cartCount, addToCart } = useCart();
  const activeBookingSession = useBookingStore((state) => state.selectedService || state.selectedSlot);
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
  const [homepageSections, setHomepageSections] = useState<Record<string, string>>({});
  const [serviceCards, setServiceCards] = useState<ServiceCard[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryImageItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);
  const [galleryInitialVisibleCount, setGalleryInitialVisibleCount] = useState(4);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [selectedGiftAmount, setSelectedGiftAmount] = useState(50);
  const [activeSpecialistImageIndex, setActiveSpecialistImageIndex] = useState<number | null>(null);
  const [isSandraInView, setIsSandraInView] = useState(false);
  const [heroBookingFocused, setHeroBookingFocused] = useState(false);
  const [locationInView, setLocationInView] = useState(false);
  const [testimonialsInView, setTestimonialsInView] = useState(false);
  const [heroContentVisible, setHeroContentVisible] = useState(false);
  const [localTrustInView, setLocalTrustInView] = useState(false);
  const [servicesInView, setServicesInView] = useState(false);
  const [galleryInView, setGalleryInView] = useState(false);
  const [quickBookInView, setQuickBookInView] = useState(false);
  const [productsInView, setProductsInView] = useState(false);
  const [finalCtaInView, setFinalCtaInView] = useState(false);
  const gallerySectionRef = useRef<HTMLElement | null>(null);
  const quickBookSectionRef = useRef<HTMLElement | null>(null);
  const productsSectionRef = useRef<HTMLElement | null>(null);
  const finalCtaSectionRef = useRef<HTMLElement | null>(null);
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
  const sectionText = (key: string, fallbackKey?: string, fallbackLiteral = '') => {
    const override = homepageSections[key]?.trim();
    if (override) return override;
    if (fallbackKey) return t(fallbackKey);
    return fallbackLiteral;
  };
  const trustRatingLabel = sectionText('trust_rating_label', 'trust.rating');
  const trustGoogleRating = sectionText('trust_google_rating', 'trust.googleRating');
  const trustClientsLabel = sectionText('trust_clients_label', 'trust.clients');
  const trustHygienicToolsLabel = sectionText('trust_hygienic_tools_label', 'trust.hygienicTools');
  const trustStudioLabel = sectionText('trust_studio_label', 'trust.mustamaeStudio');
  const locationMapQuery = sectionText('location_map_query', undefined, 'Mustamäe tee 55, Tallinn');
  const localAuthorityItem1 = sectionText('local_authority_item_1', 'homepage.localAuthority.item1');
  const localAuthorityItem2 = sectionText('local_authority_item_2', 'homepage.localAuthority.item2');
  const localAuthorityItem3 = sectionText('local_authority_item_3', 'homepage.localAuthority.item3');
  const footerContactLine1 = sectionText('footer_contact_line_1', 'homepage.footer.contactLine1');
  const footerContactLine2 = sectionText('footer_contact_line_2', 'homepage.footer.contactLine2');
  const footerContactLine3 = sectionText('footer_contact_line_3', 'homepage.footer.contactLine3');
  const footerEmail = sectionText('footer_email', undefined, 'hello@nailify.com');
  const footerHoursLabel = sectionText('footer_hours_label', 'homepage.footer.hours1Label');
  const footerHoursValue = sectionText('footer_hours_value', 'homepage.footer.hours1Value');

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
        const slot = await getNextAvailableSlotClient();
        if (!mounted) return;
        if (!slot) {
          setNextAvailable('');
          return;
        }

        const today = getTodayInTallinn();
        const tomorrowDate = getTomorrowInTallinn();

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
        // Use the API's Cache-Control header (short TTL) to avoid hammering DB on refresh.
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
        const data = (await response.json()) as {
          feedback?: Array<{
            id: string;
            clientName: string;
            clientAvatarUrl: string | null;
            rating: number;
            feedbackText: LocalizedTextLike;
            sourceLabel: LocalizedTextLike;
            serviceId?: string | null;
          }>;
        };
        if (mounted && Array.isArray(data.feedback)) {
          setFeedbackItems(
            data.feedback.map((item) => ({
              ...item,
              feedbackText: readLocalizedText(item.feedbackText, language),
              sourceLabel: readLocalizedText(item.sourceLabel, language) || null,
            }))
          );
        }
      } catch {
        if (mounted) setFeedbackItems([]);
      }
    };
    void loadFeedback();
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
        const data = (await response.json()) as {
          images?: Array<
            Omit<GalleryImageItem, 'title' | 'tag' | 'description'> & {
              title: LocalizedTextLike;
              tag: LocalizedTextLike;
              description: LocalizedTextLike;
            }
          >;
        };
        if (mounted && Array.isArray(data.images)) {
          setGalleryItems(
            data.images.map((item) => ({
              ...item,
              title: readLocalizedText(item.title, language),
              tag: readLocalizedText(item.tag, language),
              description: readLocalizedText(item.description, language),
            }))
          );
        }
      } catch {
        if (mounted) setGalleryItems([]);
      }
    };
    void loadGallery();
    return () => {
      mounted = false;
    };
  }, [language]);

  useEffect(() => {
    let mounted = true;
    const loadTeamMembers = async () => {
      try {
        const response = await fetch('/api/team');
        if (!response.ok) return;
        const data = (await response.json()) as {
          members?: Array<
            Omit<
              TeamMemberItem,
              | 'fullName'
              | 'roleTitle'
              | 'shortIntro'
              | 'badge1Text'
              | 'badge2Text'
              | 'badge3Text'
              | 'feature1Title'
              | 'feature1Text'
              | 'feature2Title'
              | 'feature2Text'
              | 'feature3Title'
              | 'feature3Text'
              | 'signatureLabel'
              | 'signatureTags'
              | 'primaryCtaText'
              | 'availabilityHelperText'
            > & {
              fullName: LocalizedTextLike;
              roleTitle: LocalizedTextLike;
              shortIntro: LocalizedTextLike;
              badge1Text: LocalizedTextLike;
              badge2Text: LocalizedTextLike;
              badge3Text: LocalizedTextLike;
              feature1Title: LocalizedTextLike;
              feature1Text: LocalizedTextLike;
              feature2Title: LocalizedTextLike;
              feature2Text: LocalizedTextLike;
              feature3Title: LocalizedTextLike;
              feature3Text: LocalizedTextLike;
              signatureLabel: LocalizedTextLike;
              signatureTags: LocalizedListLike;
              primaryCtaText: LocalizedTextLike;
              availabilityHelperText: LocalizedTextLike;
            }
          >;
        };
        if (mounted && Array.isArray(data.members)) {
          setTeamMembers(
            data.members.map((item) => ({
              ...item,
              fullName: readLocalizedText(item.fullName, language),
              roleTitle: readLocalizedText(item.roleTitle, language),
              shortIntro: readLocalizedText(item.shortIntro, language),
              badge1Text: readLocalizedText(item.badge1Text, language),
              badge2Text: readLocalizedText(item.badge2Text, language),
              badge3Text: readLocalizedText(item.badge3Text, language),
              feature1Title: readLocalizedText(item.feature1Title, language),
              feature1Text: readLocalizedText(item.feature1Text, language),
              feature2Title: readLocalizedText(item.feature2Title, language),
              feature2Text: readLocalizedText(item.feature2Text, language),
              feature3Title: readLocalizedText(item.feature3Title, language),
              feature3Text: readLocalizedText(item.feature3Text, language),
              signatureLabel: readLocalizedText(item.signatureLabel, language),
              signatureTags: readLocalizedList(item.signatureTags, language),
              primaryCtaText: readLocalizedText(item.primaryCtaText, language),
              availabilityHelperText: readLocalizedText(item.availabilityHelperText, language),
            }))
          );
        }
      } catch {
        if (mounted) setTeamMembers([]);
      }
    };
    void loadTeamMembers();
    return () => {
      mounted = false;
    };
  }, [language]);

  useEffect(() => {
    if (teamMembers.length === 0) {
      setActiveTeamIndex(0);
      return;
    }
    if (activeTeamIndex >= teamMembers.length) {
      setActiveTeamIndex(0);
    }
  }, [activeTeamIndex, teamMembers.length]);

  useEffect(() => {
    const updateVisibleCount = () => {
      setGalleryInitialVisibleCount(getHomepageGalleryInitialCount(window.innerWidth));
    };
    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
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
    const loadHomepageSections = async () => {
      try {
        const response = await fetch(`/api/homepage-sections?lang=${language}`);
        if (!response.ok) return;
        const data = (await response.json()) as { sections?: Record<string, string> };
        if (mounted && data.sections && typeof data.sections === 'object') {
          setHomepageSections(data.sections);
        }
      } catch {
        if (mounted) setHomepageSections({});
      }
    };
    void loadHomepageSections();
    return () => {
      mounted = false;
    };
  }, [language]);

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
      try {
        const doc = document.documentElement;
        const scrollTop = window.scrollY || doc.scrollTop || 0;
        const height = Math.max(1, doc.scrollHeight - window.innerHeight);
        const scrollDepthPercent = Math.round((scrollTop / height) * 100);
        trackBehaviorEvent('testimonials_view', { scrollDepthPercent });
      } catch {
        // ignore
      }
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTestimonialsInView(true);
            try {
              const doc = document.documentElement;
              const scrollTop = window.scrollY || doc.scrollTop || 0;
              const height = Math.max(1, doc.scrollHeight - window.innerHeight);
              const scrollDepthPercent = Math.round((scrollTop / height) * 100);
              trackBehaviorEvent('testimonials_view', { scrollDepthPercent });
            } catch {
              // ignore
            }
          }
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
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setQuickBookInView(true);
      setProductsInView(true);
      setFinalCtaInView(true);
      return;
    }
    const attach = (ref: { current: HTMLElement | null }, setter: (value: boolean) => void) => {
      const el = ref.current;
      if (!el) return () => {};
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setter(true);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
      );
      observer.observe(el);
      return () => observer.disconnect();
    };
    const cleanups = [
      attach(quickBookSectionRef, setQuickBookInView),
      attach(productsSectionRef, setProductsInView),
      attach(finalCtaSectionRef, setFinalCtaInView),
    ];
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
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
  const openQuickBook = (mode: 'today' | 'tomorrow' | 'week' | 'quick' | 'design') => {
    const params = new URLSearchParams();
    if (mode === 'today') params.set('date', getTodayInTallinn());
    if (mode === 'tomorrow') params.set('date', getTomorrowInTallinn());
    if (mode === 'week') params.set('date', getTodayInTallinn());
    if (mode === 'quick') {
      const quickService = [...servicesSource].sort((a, b) => a.duration - b.duration)[0];
      if (quickService?.id) params.set('service', quickService.id);
    }
    if (mode === 'design') {
      const designService = servicesSource.find((service) => service.category === 'nail-art');
      if (designService?.id) params.set('service', designService.id);
    }
    trackBehaviorEvent('homepage_quickbook_click', { mode });
    router.push(localizePath(`/book${params.toString() ? `?${params.toString()}` : ''}`));
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    router.push(localizePath(pathname, newLang));
    setIsLangMenuOpen(false);
  };

  const handleBookFromGallery = () => {
    router.push(localizePath('/book'));
  };
  const handleGalleryCta = (ctaHref?: string) => {
    const href = (ctaHref ?? '').trim();
    if (!href) {
      handleBookFromGallery();
      return;
    }
    if (/^https?:\/\//i.test(href)) {
      window.location.href = href;
      return;
    }
    if (href.startsWith('/')) {
      router.push(localizePath(href));
      return;
    }
    handleBookFromGallery();
  };
  const openGallery = (index: number) => setActiveGalleryIndex(index);
  const closeGallery = () => setActiveGalleryIndex(null);
  const nextGallery = () => {
    setActiveGalleryIndex((prev) => {
      if (prev === null) return 0;
      if (galleryCards.length === 0) return 0;
      return (prev + 1) % galleryCards.length;
    });
  };
  const prevGallery = () => {
    setActiveGalleryIndex((prev) => {
      if (prev === null) return 0;
      if (galleryCards.length === 0) return 0;
      return (prev - 1 + galleryCards.length) % galleryCards.length;
    });
  };

  // Touch handling for gallery swipe on mobile
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const swipeThreshold = 60;
    if (deltaX > swipeThreshold) prevGallery();
    else if (deltaX < -swipeThreshold) nextGallery();
    touchStartX.current = null;
  };
  /** DB/admin may accidentally store a literal i18n path ā€” never show it as user-facing copy */
  const isServiceFieldKeyLeak = (value: string | undefined | null) => {
    const s = (value ?? '').trim();
    if (!s) return false;
    if (s.startsWith('homepage.serviceDecision.fallback.')) return true;
    return /^homepage\.[a-z0-9]+\.[a-zA-Z0-9._-]+$/i.test(s) && s.includes('serviceDecision');
  };
  const knownServiceFallbackIds = useMemo(
    () =>
      new Set([
        'gel-manicure',
        'acrylic-extensions',
        'luxury-spa-manicure',
        'gel-pedicure',
        'nail-art',
      ]),
    []
  );
  const normalizeServiceFallbackId = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  // Avoid leaking translation keys when service-specific fallback is missing (use generic fallback)
  const getServiceFallback = (serviceId: string, kind: 'result' | 'suitability' | 'longevity', genericFallback: string) => {
    const normalizedId = normalizeServiceFallbackId(serviceId);
    const candidateIds = [serviceId, normalizedId].filter((id, index, arr) => id && arr.indexOf(id) === index);

    for (const candidateId of candidateIds) {
      if (!knownServiceFallbackIds.has(candidateId)) {
        continue;
      }
      const key = `homepage.serviceDecision.fallback.${candidateId}.${kind}`;
      const localized = t(key);
      if (!localized || localized === key || isServiceFieldKeyLeak(localized)) {
        continue;
      }
      return localized;
    }

    return genericFallback;
  };
  const getServiceResultLine = (service: ServiceCard) => {
    const raw = service.resultDescription?.trim();
    if (raw && !isServiceFieldKeyLeak(raw)) return raw;
    return getServiceFallback(
      service.id,
      'result',
      t('_auto.page.p001')
    );
  };
  const getServiceDescriptionExtra = (service: ServiceCard) => {
    const d = service.description?.trim();
    if (!d || isServiceFieldKeyLeak(d)) return '';
    const result = getServiceResultLine(service);
    if (d.toLowerCase() === result.toLowerCase()) return '';
    return ` ${d}`;
  };

  const formatCategoryText = (value: string) =>
    value
      .replace(/^services\.category/i, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const getServiceCategoryLabel = (service: ServiceCard) => {
    const localizedCategoryName =
      language === 'en'
        ? service.categoryNameEn?.trim() || service.categoryName?.trim()
        : service.categoryNameEt?.trim() || service.categoryName?.trim();
    if (localizedCategoryName && !isServiceFieldKeyLeak(localizedCategoryName)) return localizedCategoryName;

    const category = service.category?.trim();
    if (!category) return '';

    if (category.startsWith('services.category')) {
      const translated = t(category);
      if (translated !== category && !isServiceFieldKeyLeak(translated)) return translated;
      return formatCategoryText(category);
    }

    const knownCategoryKey =
      category === 'nail-art'
        ? 'services.categoryNailArt'
        : `services.category${category.charAt(0).toUpperCase()}${category.slice(1)}`;
    const knownCategoryTranslation = t(knownCategoryKey);
    if (knownCategoryTranslation !== knownCategoryKey && !isServiceFieldKeyLeak(knownCategoryTranslation)) {
      return knownCategoryTranslation;
    }

    return formatCategoryText(category);
  };

  // Gallery data ā€” defined before any useEffects/callbacks that might close over it (SSR)
  const orderedGalleryItems =
    galleryItems.length > 0
      ? [...galleryItems].sort((a, b) => {
          const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          if (a.isFeatured !== b.isFeatured) return Number(b.isFeatured) - Number(a.isFeatured);
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return createdB - createdA;
        })
      : [];
  const orderedTeamMembers =
    teamMembers.length > 0
      ? [...teamMembers].sort((a, b) => {
          const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          if (a.isFeatured !== b.isFeatured) return Number(b.isFeatured) - Number(a.isFeatured);
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return createdA - createdB;
        })
      : [];
  const activeTeamMember = orderedTeamMembers[activeTeamIndex] ?? null;
  const galleryCards = orderedGalleryItems.map((item, index) => {
    const fallbackTitle = t('homepage.gallery.inspirationLook');
    const title = item.title?.trim() || fallbackTitle;
    const tag = item.tag?.trim() || (item.isFeatured ? t('homepage.gallery.featuredLabel') : t('homepage.gallery.inspirationLook'));
    const description = item.description?.trim() || '';

    return {
      id: item.id,
      sourceIndex: index,
      imageUrl: item.imageUrl,
      title,
      caption: description,
      ctaHref: item.ctaHref?.trim() || '',
      tag,
      alt: title,
      isFeatured: item.isFeatured,
    };
  });
  const galleryCollapsedCount = Math.min(galleryInitialVisibleCount, galleryCards.length);
  const galleryIsToggleVisible = galleryCards.length > galleryCollapsedCount;
  const visibleGalleryCards = isGalleryExpanded ? galleryCards : galleryCards.slice(0, galleryCollapsedCount);
  const featuredVisibleCard = visibleGalleryCards[0] ?? null;
  const secondaryVisibleCard = visibleGalleryCards[1] ?? null;
  const remainingVisibleCards = visibleGalleryCards.slice(secondaryVisibleCard ? 2 : 1);

  // Services: Only use API data - no mockServices fallback
  // If API returns empty, the section will show an empty state
  const servicesSource = serviceCards.length > 0 ? serviceCards : [];
  /** Featured hero only when admin marks a popular service ā€” avoids duplicating the same list as ā€featured + first card againā€¯ */
  const featuredService = servicesSource.find((service) => Boolean(service.isPopular)) ?? null;
  const regularServices = featuredService
    ? servicesSource.filter((service) => service.id !== featuredService.id)
    : servicesSource;
  const specialistGallery = Array.from({ length: 3 }).map((_, index) => ({
    imageUrl:
      activeTeamMember?.previewGalleryImages?.[index]?.trim() ||
      orderedGalleryItems[index]?.imageUrl ||
      galleryCards[index]?.imageUrl ||
      activeTeamMember?.mainImage?.trim() ||
      media('team_portrait') ||
      galleryCards[0]?.imageUrl ||
      '',
    caption:
      orderedGalleryItems[index]?.description ||
      orderedGalleryItems[index]?.title ||
      activeTeamMember?.fullName ||
      t(`homepage.team.workCaptions.${index + 1}`),
  }));
  const teamBadgeChips = [
    activeTeamMember?.badge1Text?.trim() ?? '',
    activeTeamMember?.badge2Text?.trim() ?? '',
    activeTeamMember?.badge3Text?.trim() ?? '',
  ].filter((chip) => chip.length > 0);
  const teamFeatureCards = [
    {
      title: activeTeamMember?.feature1Title?.trim() ?? '',
      description: activeTeamMember?.feature1Text?.trim() ?? '',
    },
    {
      title: activeTeamMember?.feature2Title?.trim() ?? '',
      description: activeTeamMember?.feature2Text?.trim() ?? '',
    },
    {
      title: activeTeamMember?.feature3Title?.trim() ?? '',
      description: activeTeamMember?.feature3Text?.trim() ?? '',
    },
  ].filter((card) => card.title.length > 0 || card.description.length > 0);
  const signatureTags = (activeTeamMember?.signatureTags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  const hasTeamSwitcher = orderedTeamMembers.length > 1;
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
  const prevTeamMember = () => {
    if (orderedTeamMembers.length < 2) return;
    setActiveSpecialistImageIndex(null);
    setActiveTeamIndex((prev) => (prev - 1 + orderedTeamMembers.length) % orderedTeamMembers.length);
  };
  const nextTeamMember = () => {
    if (orderedTeamMembers.length < 2) return;
    setActiveSpecialistImageIndex(null);
    setActiveTeamIndex((prev) => (prev + 1) % orderedTeamMembers.length);
  };
  const teamCtaLink = activeTeamMember?.primaryCtaLink?.trim() || '/book';
  const goToTeamCta = () => {
    const target = teamCtaLink.startsWith('/') ? localizePath(teamCtaLink) : teamCtaLink;
    router.push(target);
  };
  const goToProduct = (productId: string) => router.push(localizePath(`/shop/${productId}`));
  const goToShop = () => router.push(localizePath('/shop'));
  const goToFavorites = () => router.push(localizePath('/favorites'));
  const focusHeroBooking = () => {
    const target = document.getElementById('hero-booking');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHeroBookingFocused(true);
      target.classList.add('hero-booking-highlight');
      window.setTimeout(() => { setHeroBookingFocused(false); target.classList.remove('hero-booking-highlight'); }, 1600);
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
  const headerContainerClass = 'mx-auto max-w-6xl px-6';
  const utilityIconClass = 'icon-circle-btn nav-icon-btn relative';
  const navIconSvgClass = 'h-[18px] w-[18px] stroke-[1.8]';

  /* Premium layout: max 1280px, normalized section spacing */
  const sectionClass = 'py-16 md:py-20 lg:py-28';
  const contentMax = 'mx-auto max-w-6xl px-6';
  const headerTitleGap = 'mt-3';
  const headerSubtitleGap = 'mt-3';
  const headerToContent = 'mb-8 md:mb-10';

  return (
    <div className="min-h-screen bg-[#fafafa] pb-[84px] lg:pb-0">
      {/* ===================== */}
      {/* 1. STICKY HEADER */}
      {/* ===================== */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.10)] border-b border-black/[0.04]' 
            : 'bg-white/80 backdrop-blur-lg border-b border-[#f0e8ec]/60'
        }`}
      >
        <div className={headerContainerClass}>
          <div className={`flex items-center justify-between transition-all duration-300 ${
            isScrolled ? 'h-16' : 'h-16 lg:h-[4.75rem]'
          }`}>
            {/* Logo ā€” breathing room on mobile */}
            <div className="flex min-w-0 flex-shrink items-center gap-2 pr-2 sm:pr-0">
              <span
                className={`font-brand type-navbar-logo leading-none transition-all duration-300 ${isScrolled ? 'lg:text-[34px]' : 'lg:text-[38px]'}`}
                style={{ color: colors.primary, letterSpacing: '-0.015em' }}
              >
                Nailify
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-9">
              <button onClick={() => scrollToSection('services')} className={navLinkClass}><span>{t('nav.services')}</span><span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-[#c996b4] transition-transform duration-140 group-hover:scale-x-100" /></button>
              <button onClick={() => scrollToSection('gallery')} className={navLinkClass}><span>{t('nav.gallery')}</span><span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-[#c996b4] transition-transform duration-140 group-hover:scale-x-100" /></button>
              <button onClick={() => scrollToSection('products')} className={navLinkClass}><span>{t('homepage.nav.products')}</span><span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-[#c996b4] transition-transform duration-140 group-hover:scale-x-100" /></button>
              <button onClick={() => scrollToSection('location')} className={navLinkClass}><span>{t('nav.contact')}</span><span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-[#c996b4] transition-transform duration-140 group-hover:scale-x-100" /></button>
            </nav>

            {/* Right Side ā€” mobile: icons + menu only (booking via sticky CTA) */}
            <div className="flex flex-shrink-0 items-center gap-4">
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setIsLangMenuOpen((prev) => !prev)}
                  className={utilityIconClass}
                  aria-label="Open language menu"
                >
                  <Globe className={navIconSvgClass} />
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

              {/* Icon cluster ā€” spacing from logo; badges inset so they donā€™t crowd the edge */}
              <div className="flex items-center gap-3">
                <button
                  onClick={goToFavorites}
                  className={utilityIconClass}
                  aria-label={t('_auto.page.p005')}
                  title={t('_auto.page.p006')}
                >
                  <FavoriteHeartIcon active={favoritesCount > 0} size={17} />
                  {favoritesCount > 0 && (
                    <span className="absolute right-0 top-0.5 inline-flex min-h-[16px] min-w-[16px] translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-[#c24d86] px-1 text-[8px] font-semibold leading-none text-white">
                      {favoritesCount > 9 ? '9+' : favoritesCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={goToShop}
                  className={utilityIconClass}
                  aria-label={t('_auto.page.p007')}
                  title={t('_auto.page.p008')}
                >
                  <ShoppingBag className={navIconSvgClass} />
                  {cartCount > 0 && (
                    <span className="absolute right-0 top-0.5 inline-flex min-h-[16px] min-w-[16px] translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-[#c24d86] px-1 text-[8px] font-semibold leading-none text-white">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </button>
              </div>
               
              {/* Book Now ā€” lg+ only (.btn-primary display would otherwise override hidden on mobile) */}
              <button
                type="button"
                onClick={() => router.push(localizePath('/book'))}
                className="btn-primary nav-cta-btn !hidden lg:!inline-flex"
              >
                {t('nav.bookNow')}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`${utilityIconClass} lg:!hidden`}
                aria-label="Open menu"
              >
                <Menu className={navIconSvgClass} />
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
                  className={utilityIconClass}
                  aria-label="Close menu"
                >
                  <svg className={navIconSvgClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  {t('_auto.page.p009')}
                </p>
                <div className="mx-auto grid max-w-[300px] grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => goToPage(localizePath('/favorites'))}
                    className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-[#eadce5] bg-[#faf6f9] px-3 py-3 text-center text-sm font-medium text-[#5d4a59] transition-colors active:bg-[#f5ebf2]"
                  >
                    <FavoriteHeartIcon active={favoritesCount > 0} size={20} />
                    <span>{t('_auto.page.p010')}</span>
                    {favoritesCount > 0 && (
                      <span className="text-xs font-semibold text-[#c24d86]">{favoritesCount > 9 ? '9+' : favoritesCount}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(localizePath('/shop'))}
                    className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-[#eadce5] bg-[#faf6f9] px-3 py-3 text-center text-sm font-medium text-[#5d4a59] transition-colors active:bg-[#f5ebf2]"
                  >
                    <ShoppingBag className="h-5 w-5 text-[#7a6174]" strokeWidth={1.8} />
                    <span>{t('_auto.page.p011')}</span>
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
        @keyframes heroBgShift {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(4px,-6px,0) scale(1.01); }
        }
        @keyframes heroGrain {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-5%, -5%); }
        }
        @keyframes heroBookingGlow {
          0% { box-shadow: 0 32px 64px -20px rgba(70,45,60,0.28), 0 0 0 0 rgba(159,69,111,0); }
          30% { box-shadow: 0 32px 64px -20px rgba(70,45,60,0.28), 0 0 0 6px rgba(159,69,111,0.12); }
          60% { box-shadow: 0 32px 64px -20px rgba(70,45,60,0.28), 0 0 0 3px rgba(159,69,111,0.06); }
          100% { box-shadow: 0 32px 64px -20px rgba(70,45,60,0.28), 0 0 0 0 rgba(159,69,111,0); }
        }
        .hero-booking-highlight { animation: heroBookingGlow 1.2s ease-out both; }
        @keyframes heroTrustFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes homepageStickyBookEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-trust-fade { animation: heroTrustFade 600ms ease-out 500ms both; }
        .homepage-sticky-book-enter { animation: homepageStickyBookEnter 260ms cubic-bezier(0.22,0.68,0,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .hero-drift, .hero-grain, .hero-bg-shift, .hero-booking-highlight, .hero-trust-fade, .homepage-sticky-book-enter { animation: none !important; }
        }
      `}</style>

      {/* 2. HERO ā€” Premium luxury nail studio conversion: editorial left + floating glass booking card right */}
      <section data-reveal className={`relative min-h-[68vh] overflow-hidden pb-8 pt-24 md:pt-16 lg:min-h-[82vh] lg:pb-12 lg:pt-20 ${isScrolled ? 'pt-24' : ''}`}>
        {/* Background: subtle radial from top-left, light pink/cream, soft vignette */}
        <div className="hero-bg-shift pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_120%_80%_at_0%_0%,#fdf6f9_0%,#faf5f8_35%,#f6f0f4_70%,#f2ecf0_100%)]" style={{ animation: 'heroBgShift 28s ease-in-out infinite' }} aria-hidden />
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,transparent_50%,rgba(240,230,235,0.4)_100%)]" aria-hidden />
        <div className="pointer-events-none absolute -left-[20%] top-[10%] z-0 h-[600px] w-[600px] rounded-full bg-[#f0e6ec]/50 blur-[100px]" aria-hidden />
        <div className="pointer-events-none absolute right-[-10%] top-[20%] z-0 h-[400px] w-[400px] rounded-full bg-[#eadce4]/35 blur-[80px]" aria-hidden />
        {/* Soft grain overlay ā€” luxury editorial feel */}
        <div className="hero-grain pointer-events-none absolute inset-0 z-[1] opacity-[0.035] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', animation: 'heroGrain 20s linear infinite' }} aria-hidden />

        <div className="relative z-10 mx-auto max-w-[1320px] px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 grid-rows-[auto_auto_auto] items-center gap-6 lg:min-h-[78vh] lg:grid-cols-[1fr_minmax(390px,0.5fr)] lg:grid-rows-1 lg:gap-6 xl:gap-8">
            {/* LEFT ā€” Luxury editorial (mobile: row 1; desktop: col 1) */}
            <div className="order-1 flex flex-col justify-center lg:row-span-1">
              <div
                className={`transition-all duration-[350ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] ${
                  heroContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#8a6b7e]">
                  {t('homepage.hero.luxuryOverline')}
                </p>
                <h1 className="mb-[18px] mt-4 font-brand max-w-[560px] text-[clamp(2.4rem,5vw,4.1rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#1f171d] lg:text-[54px] xl:text-[62px]">
                  {(() => {
                    const headline = t('homepage.hero.luxuryHeadline');
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
                className={`mt-0 max-w-[540px] text-[1rem] leading-[1.58] text-[#6b5a62] transition-all duration-[420ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] ${
                  heroContentVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transitionDelay: '120ms' }}
              >
                {t('homepage.hero.luxurySupport')}
              </p>

              <div
                className={`mt-7 flex flex-wrap gap-3 transition-all duration-[380ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] lg:mt-9 ${
                  heroContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '220ms' }}
              >
                <button
                  onClick={focusHeroBooking}
                  className="btn-primary btn-primary-lg"
                >
                  {t('_auto.page.p015')}
                </button>
                <button
                  onClick={() => scrollToSection('gallery')}
                  className="btn-secondary"
                >
                  {t('_auto.page.p016')}
                </button>
              </div>

              {/* Trust row ā€” visible on desktop only (mobile has its own below card) */}
              <div className="mt-10 hidden flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-medium text-[#5d4e56] lg:mt-12 lg:flex">
                {[
                  {
                    icon: <Star className="h-4 w-4 opacity-60 transition-colors duration-180 group-hover:text-[#8f3d62]" strokeWidth={1.8} />,
                    label: trustRatingLabel,
                  },
                  {
                    icon: <Users className="h-4 w-4 opacity-60 transition-colors duration-180 group-hover:text-[#8f3d62]" strokeWidth={1.8} />,
                    label: trustClientsLabel,
                  },
                  {
                    icon: <Droplet className="h-4 w-4 opacity-60 transition-colors duration-180 group-hover:text-[#8f3d62]" strokeWidth={1.8} />,
                    label: trustHygienicToolsLabel,
                  },
                  {
                    icon: <HomeIcon className="h-4 w-4 opacity-60 transition-colors duration-180 group-hover:text-[#8f3d62]" strokeWidth={1.8} />,
                    label: trustStudioLabel,
                  },
                ].map((item, index) => (
                  <div key={item.label} className="group flex items-center gap-3">
                    {index > 0 ? <span className="text-[10px] text-[#c9b5c1]" aria-hidden>&bull;</span> : null}
                    <span
                      className={`flex items-center gap-2 transition-all duration-[420ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] ${
                        heroContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'
                      }`}
                      style={{ transitionDelay: `${380 + index * 50}ms` }}
                    >
                      {item.icon}
                      <span className="transition-colors duration-180 group-hover:text-[#4f4048]">{item.label}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT ā€” Floating booking glass card (mobile: row 2) */}
            <div className="order-2 mt-7 w-full lg:sticky lg:top-20 lg:mt-0 lg:self-center">
              {/* Faint floating shape behind card ā€” ambient drift */}
              <div className="hero-drift pointer-events-none absolute -right-4 -top-4 z-0 h-[120%] w-[90%] rounded-[48px] bg-[#f0e4eb]/30 blur-[40px]" style={{ animation: 'heroDrift 8s ease-in-out infinite' }} aria-hidden />
              <div className="pointer-events-none absolute right-[-8%] top-[15%] z-0 h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle,rgba(194,77,134,0.16)_0%,transparent_72%)] blur-2xl" aria-hidden />
              <div
                ref={heroBookingCardRef}
                className={`relative z-10 transition-all duration-[500ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] ${
                  heroContentVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-[0.985]'
                }`}
                style={{ transitionDelay: '300ms' }}
              >
                <div
                  id="hero-booking"
                  data-motion="hero-booking"
                  className={`relative overflow-hidden rounded-[24px] border border-[rgba(201,165,154,0.25)] bg-white/78 backdrop-blur-[16px] transition ${
                    heroBookingFocused ? 'ring-2 ring-[#b07a9a] ring-offset-2' : ''
                  }`}
                  style={{ boxShadow: '0 40px 90px rgba(20,12,18,0.18)' }}
                >
                  <HeroBookingWidget />
                  <p className="px-6 pb-5 pt-1 text-center text-xs text-[#7a6572]">
                    {t('homepage.hero.cancelTrust')}
                  </p>
                </div>
              </div>
            </div>

            {/* Trust row ā€” mobile only (order 3: after headline, CTA, card) */}
            <div className="order-3 mt-[18px] flex flex-wrap items-center justify-center gap-3 text-[13px] font-medium text-[#5d4e56] lg:hidden">
              {[
                {
                  icon: <Star className="h-4 w-4 opacity-60" strokeWidth={1.8} />,
                  label: trustRatingLabel,
                },
                {
                  icon: <Users className="h-4 w-4 opacity-60" strokeWidth={1.8} />,
                  label: trustClientsLabel,
                },
                {
                  icon: <Droplet className="h-4 w-4 opacity-60" strokeWidth={1.8} />,
                  label: trustHygienicToolsLabel,
                },
                {
                  icon: <HomeIcon className="h-4 w-4 opacity-60" strokeWidth={1.8} />,
                  label: trustStudioLabel,
                },
              ].map((item, index) => (
                <div key={item.label} className="flex items-center gap-3">
                  {index > 0 ? <span className="text-[10px] text-[#c9b5c1]" aria-hidden>&bull;</span> : null}
                  <span
                    className={`flex items-center gap-2 transition-all duration-[360ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] ${
                      heroContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'
                    }`}
                    style={{ transitionDelay: `${420 + index * 45}ms` }}
                  >
                    {item.icon}
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. QUICK BOOK STRIP ā€” impulse routing into prefilled booking */}
      <section
        ref={quickBookSectionRef}
        data-reveal
        data-stagger
        className={`border-y border-neutral-100 bg-white/88 py-10 backdrop-blur-sm transition-all duration-[460ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] ${
          quickBookInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18px]'
        }`}
      >
        <div className={contentMax}>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d7a90]">
              {t('_auto.page.p026')}
            </p>
            {[
                  { id: 'today' as const, label: t('_auto.page.p027') },
              { id: 'tomorrow' as const, label: t('_auto.page.p028') },
                  { id: 'week' as const, label: t('_auto.page.p029') },
              { id: 'quick' as const, label: t('_auto.page.p030') },
              { id: 'design' as const, label: t('_auto.page.p031') },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => openQuickBook(chip.id)}
                className="motion-stagger-item pill-selectable min-h-[44px] px-4 text-[12px]"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* (layout cleanup) removed empty trust strip spacer */}
      <section
        ref={localTrustSectionRef}
        data-reveal
        className={`relative overflow-hidden bg-[#faf8f9] ${sectionClass}`}
      >
        {/* Optional very low opacity texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" aria-hidden>
          {media('location_studio') && (
            <Image src={media('location_studio')} alt="" fill className="object-cover blur-[80px]" unoptimized />
          )}
        </div>

        <div className={`relative z-10 ${contentMax}`}>
          <div className="rounded-[30px] border border-[#eadce4] bg-white/80 p-6 shadow-[0_18px_46px_-34px_rgba(70,40,60,0.22)] backdrop-blur-[2px] md:p-8 lg:p-10">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12 lg:items-center">
            {/* LEFT ā€” Label, heading, subtext */}
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

            {/* CENTER ā€” Trust indicators: address, parking, transport (pill badges, hover lift) */}
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible lg:gap-4">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(locationMapQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-[260px] shrink-0 items-center gap-3 rounded-xl border border-[#ead8e2] bg-white/80 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#dfc8d4] hover:bg-[#fdf8fb] lg:min-w-0"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5ebf0] text-[#9b7590] transition-colors group-hover:bg-[#f0e2eb]">
                  <MapPin className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-sm font-medium text-[#4d3d47]">{localAuthorityItem1}</span>
              </a>
              <div className="flex min-w-[260px] shrink-0 items-center gap-3 rounded-xl border border-[#ead8e2] bg-white/80 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#dfc8d4] hover:bg-[#fdf8fb] lg:min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5ebf0] text-[#9b7590]">
                  <Car className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-sm font-medium text-[#4d3d47]">{localAuthorityItem2}</span>
              </div>
              <div className="flex min-w-[260px] shrink-0 items-center gap-3 rounded-xl border border-[#ead8e2] bg-white/80 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#dfc8d4] hover:bg-[#fdf8fb] lg:min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5ebf0] text-[#9b7590]">
                  <Bus className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-sm font-medium text-[#4d3d47]">{localAuthorityItem3}</span>
              </div>
            </div>

            {/* RIGHT ā€” Studio credibility: rating, clients, studio (stacked with dividers, stagger) */}
            <div className="flex flex-wrap items-center justify-center gap-6 border-t border-[#ead8e2]/60 pt-8 lg:flex-col lg:items-start lg:justify-center lg:border-t-0 lg:border-l lg:border-[#ead8e2]/60 lg:pl-10 lg:pt-0">
              <div
                className={`flex items-center gap-2 transition-all duration-500 ease-out ${
                  localTrustInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: localTrustInView ? '0ms' : '0ms' }}
              >
                <span className="text-[#c24d86]" aria-hidden>{'\u2022'}</span>
                <span className="text-sm font-semibold text-[#2d232d]">{trustRatingLabel}</span>
                <span className="text-sm text-[#6f5e66]">{trustGoogleRating}</span>
              </div>
              <div className="hidden h-px w-12 bg-[#e0d0d8] lg:block" aria-hidden />
              <div
                className={`flex items-center gap-2 transition-all duration-500 ease-out ${
                  localTrustInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: localTrustInView ? '80ms' : '0ms' }}
              >
                <span className="text-[#c24d86]" aria-hidden>{'\u2022'}</span>
                <span className="text-sm font-semibold text-[#2d232d]">{trustClientsLabel}</span>
              </div>
              <div className="hidden h-px w-12 bg-[#e0d0d8] lg:block" aria-hidden />
              <div
                className={`flex items-center gap-2 transition-all duration-500 ease-out ${
                  localTrustInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: localTrustInView ? '160ms' : '0ms' }}
              >
                <span className="text-[#c24d86]" aria-hidden>{'\u2022'}</span>
                <span className="text-sm font-semibold text-[#2d232d]">{trustStudioLabel}</span>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="services"
        ref={servicesSectionRef}
        data-reveal
        className={`relative bg-gradient-to-b from-[#faf8f9] to-[#f5f2f4] ${sectionClass}`}
      >
        <div className={`relative ${contentMax}`}>
          <header className={`text-center ${headerToContent}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a6b7e]">{t('services.eyebrow')}</p>
            <h2 className={`font-brand text-[36px] font-semibold tracking-tight text-[#1f171d] ${headerTitleGap}`}>
              {t('services.title')}
            </h2>
            <p className={`mx-auto max-w-[32rem] text-[1rem] leading-relaxed text-[#6b5a62] ${headerSubtitleGap}`}>{t('services.subtitle')}</p>
            {showDiscountPill && !discountPillDismissed && (
              <div className="mx-auto mt-5 flex max-w-[22rem] items-center justify-center gap-2 rounded-full border border-[#eadce5] bg-white/60 px-4 py-2 text-[12px] font-medium text-[#5c4a54] md:hidden">
                <span className="rounded-full bg-[#fdf2f8] px-2 py-0.5 text-[10px] font-semibold text-[#b04376]">
                  {t('discountPill.discount')}
                </span>
                <span>{t('discountPill.firstVisit')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountPillDismissed(true);
                    setShowDiscountPill(false);
                  }}
                  className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-[#8a6b7e] transition-colors hover:bg-[#faf5f8]"
                  aria-label="Close"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </header>

          <div className="space-y-12 lg:space-y-16">
            {/* LAYER 1 ā€” Featured service hero (horizontal on desktop, stacked on mobile) */}
            {featuredService && (
              <article
                onClick={() => {
                  trackBehaviorEvent('service_card_click', {
                    serviceId: featuredService.id,
                    servicePosition: 0,
                    price: featuredService.price,
                  });
                  router.push(localizePath('/book'));
                }}
                className={`group cursor-pointer overflow-hidden rounded-3xl border border-[#ebe0e6]/70 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(0,0,0,0.08)] ${
                  servicesInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDuration: '0.6s' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 md:items-center md:gap-16">
                  {/* pb aspect box: data-URI / huge intrinsic imgs break aspect-ratio+abs in some engines */}
                  <div className="relative w-full max-lg:pb-[125%] overflow-hidden rounded-t-[28px] bg-[#f5e8ef] md:min-h-[520px] md:pb-0 md:aspect-[5/6] md:rounded-l-[28px] md:rounded-tr-none">
                    <div className="absolute left-5 top-5 z-10 rounded-full bg-white/95 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a4d66] shadow-lg backdrop-blur-sm">
                      {t('homepage.featuredService.badge')}
                    </div>
                    <div className="pointer-events-none absolute inset-0 z-[1] rounded-t-[28px] ring-1 ring-inset ring-black/5 lg:rounded-l-[28px] lg:rounded-tr-none" />
                    {featuredService.imageUrl || '' ? (
                      isDataImageUrl(featuredService.imageUrl) ? (
                        <img
                          src={featuredService.imageUrl || ''}
                          alt={featuredService.name}
                          className="absolute inset-0 box-border h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                          style={{ maxWidth: '100%', maxHeight: '100%' }}
                          decoding="async"
                        />
                      ) : (
                        <Image
                          src={featuredService.imageUrl || ''}
                          alt={featuredService.name}
                          fill
                          sizes="(max-width: 1024px) 100vw, 42vw"
                          className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#f5e8ef] text-5xl text-[#9f7c91]">MN</div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
                    <div>
                      <h3 className="font-brand text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[#1f171d] lg:text-[36px]">
                        {featuredService.name}
                      </h3>
                      <p className="mt-4 line-clamp-4 text-[1rem] leading-[1.65] text-[#564553]">
                        {getServiceResultLine(featuredService)}
                        {getServiceDescriptionExtra(featuredService)}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-2">
                        <span className="pill-meta min-h-[34px] px-3.5 text-xs">
                          <Clock className="mr-1.5 inline h-3.5 w-3.5" strokeWidth={1.8} />
                          {featuredService.duration} {t('common.minutes')}
                        </span>
                        {getServiceCategoryLabel(featuredService) && (
                          <span className="pill-meta min-h-[34px] px-3.5 text-xs">
                            {getServiceCategoryLabel(featuredService)}
                          </span>
                        )}
                        {featuredService.isPopular && (
                          <span className="pill-tag min-h-[32px] px-3.5 text-xs normal-case tracking-[0.01em]">
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
                        className="btn-primary btn-primary-xl w-full sm:w-auto"
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
                        className="btn-secondary w-full sm:w-auto"
                      >
                        {t('homepage.servicesUi.viewDetails')}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* LAYER 2 ā€” Service card grid (3 cols desktop; horizontal scroll mobile) */}
            <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible lg:pb-0">
              <div data-stagger className="flex min-w-0 gap-6 lg:grid lg:grid-cols-3 lg:gap-10">
                {regularServices.map((service, index) => (
                  <article
                    key={service.id}
                    onClick={() => {
                      trackBehaviorEvent('service_card_click', {
                        serviceId: service.id,
                        servicePosition: index + 1,
                        price: service.price,
                      });
                      router.push(localizePath('/book'));
                    }}
                    className={`motion-stagger-item group flex w-[min(300px,calc(100vw-2.5rem))] max-w-full shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#ebe0e6]/80 bg-white shadow-[0_8px_24px_-12px_rgba(60,40,52,0.06)] transition-all duration-400 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(60,40,52,0.1)] lg:w-auto lg:min-w-0 lg:max-w-none ${
                      servicesInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                    }`}
                    style={{
                      transitionDelay: servicesInView ? `${Math.min(index * 60, 300)}ms` : '0ms',
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
                            className="motion-image-zoom absolute inset-0 box-border h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                            style={{ maxWidth: '100%', maxHeight: '100%' }}
                            decoding="async"
                          />
                        ) : (
                          <Image
                            src={service.imageUrl || ''}
                            alt={service.name}
                            fill
                            sizes="(max-width: 1024px) min(300px,90vw), 33vw"
                            className="motion-image-zoom object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
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
                        <span className="pill-meta min-h-[32px] px-2.5 text-[11px]">
                          {service.duration} {t('common.minutes')}
                        </span>
                        {getServiceCategoryLabel(service) && (
                          <span className="pill-meta min-h-[32px] px-2.5 text-[11px]">
                            {getServiceCategoryLabel(service)}
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
                          className="btn-primary btn-small w-full sm:w-auto sm:shrink-0"
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
      {/* 5. RESULTS GALLERY - Immersive luxury nail gallery / Meie tood */}
      {/* ===================== */}
      <section id="gallery" ref={gallerySectionRef} data-reveal className={`relative w-full bg-[#faf8f9] ${sectionClass}`}>
        <div className={contentMax}>
          <header className={`text-center ${headerToContent}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a6b7e]">
              {t('homepage.gallery.eyebrow')}
            </p>
            <h2 className={`font-brand text-[36px] font-semibold tracking-tight text-[#1f171d] ${headerTitleGap}`}>
              {t('homepage.gallery.realResultsTitle')}
            </h2>
            <p className={`mx-auto max-w-[32rem] text-[1rem] leading-relaxed text-[#6b5a62] ${headerSubtitleGap}`}>
              {t('homepage.gallery.subtitle')}
            </p>
          </header>

          {galleryCards.length > 0 ? (
            <div id="homepage-gallery-grid" aria-live="polite" className="space-y-5 lg:space-y-6">
              <div data-stagger className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:gap-6">
                {featuredVisibleCard && (
                  <article
                    className={`motion-stagger-item group relative overflow-hidden rounded-[24px] transition-all duration-500 ease-out hover:-translate-y-[2px] ${
                      galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    } lg:col-span-8`}
                  >
                    <button
                      type="button"
                      className="absolute inset-0 z-10"
                      onClick={() => openGallery(featuredVisibleCard.sourceIndex)}
                      aria-label={featuredVisibleCard.alt}
                    />
                    <div className="relative aspect-[4/5] w-full md:aspect-[16/10]">
                      {isDataImageUrl(featuredVisibleCard.imageUrl) ? (
                        <img
                          src={featuredVisibleCard.imageUrl}
                          alt={featuredVisibleCard.alt}
                          className="motion-image-zoom absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                          loading="eager"
                          decoding="async"
                        />
                      ) : (
                        <Image
                          src={featuredVisibleCard.imageUrl}
                          alt={featuredVisibleCard.alt}
                          fill
                          sizes="(max-width: 1023px) 100vw, 66vw"
                          revealEnabled={false}
                          placeholderMode="empty"
                          className="motion-image-zoom object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                          priority
                        />
                      )}
                      <div className="absolute inset-0 hidden bg-gradient-to-t from-black/42 via-black/8 to-transparent opacity-0 transition-opacity duration-300 lg:block lg:group-hover:opacity-100 lg:group-focus-within:opacity-100" />
                      <div className="absolute inset-x-0 bottom-0 z-20 hidden p-5 text-white transition-all duration-300 sm:p-6 lg:block lg:p-7 lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/88">{featuredVisibleCard.tag}</p>
                        <h3 className="mt-2 font-brand text-[1.6rem] font-semibold leading-tight tracking-[-0.01em] sm:text-[1.85rem]">
                          {featuredVisibleCard.title}
                        </h3>
                        {featuredVisibleCard.caption ? (
                          <p className="mt-2 max-w-[50ch] text-sm text-white/88">{featuredVisibleCard.caption}</p>
                        ) : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleGalleryCta(featuredVisibleCard.ctaHref);
                          }}
                          className="relative z-20 mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/95 underline-offset-4 transition-all duration-200 hover:text-white hover:underline"
                        >
                          {t('homepage.gallery.bookStyleCta')}
                          <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                        </button>
                      </div>
                    </div>
                  </article>
                )}

                {secondaryVisibleCard && (
                  <article
                    className={`motion-stagger-item group relative overflow-hidden rounded-[24px] transition-all duration-500 ease-out hover:-translate-y-[2px] ${
                      galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    } lg:col-span-4`}
                    style={{ transitionDelay: '60ms' }}
                  >
                    <button
                      type="button"
                      className="absolute inset-0 z-10"
                      onClick={() => openGallery(secondaryVisibleCard.sourceIndex)}
                      aria-label={secondaryVisibleCard.alt}
                    />
                    <div className="relative aspect-[4/5] w-full">
                      {isDataImageUrl(secondaryVisibleCard.imageUrl) ? (
                        <img
                          src={secondaryVisibleCard.imageUrl}
                          alt={secondaryVisibleCard.alt}
                          className="motion-image-zoom absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <Image
                          src={secondaryVisibleCard.imageUrl}
                          alt={secondaryVisibleCard.alt}
                          fill
                          sizes="(max-width: 1023px) 100vw, 34vw"
                          revealEnabled={false}
                          placeholderMode="empty"
                          className="motion-image-zoom object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        />
                      )}
                      <div className="absolute inset-0 hidden bg-gradient-to-t from-black/38 via-black/6 to-transparent opacity-0 transition-opacity duration-300 lg:block lg:group-hover:opacity-100 lg:group-focus-within:opacity-100" />
                      <div className="absolute inset-x-0 bottom-0 z-20 hidden p-4 text-white transition-all duration-300 sm:p-5 lg:block lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-white/88">{secondaryVisibleCard.tag}</p>
                        <h3 className="mt-1.5 font-brand text-[1.35rem] font-semibold leading-tight tracking-[-0.01em]">{secondaryVisibleCard.title}</h3>
                        {secondaryVisibleCard.caption ? (
                          <p className="mt-1.5 text-xs text-white/86 line-clamp-2">{secondaryVisibleCard.caption}</p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )}
              </div>

              {remainingVisibleCards.length > 0 && (
                <div data-stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
                  {remainingVisibleCards.map((card, index) => (
                    <article
                      key={card.id}
                      className={`motion-stagger-item group relative overflow-hidden rounded-[22px] transition-all duration-500 ease-out hover:-translate-y-[1.5px] ${
                        galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      }`}
                      style={{ transitionDelay: `${Math.min((index + 2) * 50, 300)}ms` }}
                    >
                      <button
                        type="button"
                        className="absolute inset-0 z-10"
                        onClick={() => openGallery(card.sourceIndex)}
                        aria-label={card.alt}
                      />
                      <div className="relative aspect-[4/5] w-full">
                        {isDataImageUrl(card.imageUrl) ? (
                          <img
                            src={card.imageUrl}
                            alt={card.alt}
                            className="motion-image-zoom absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <Image
                            src={card.imageUrl}
                            alt={card.alt}
                            fill
                            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                            revealEnabled={false}
                            placeholderMode="empty"
                            className="motion-image-zoom object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                          />
                        )}
                        <div className="absolute inset-0 hidden bg-gradient-to-t from-black/34 via-black/4 to-transparent opacity-0 transition-opacity duration-300 lg:block lg:group-hover:opacity-100 lg:group-focus-within:opacity-100" />
                        <div className="absolute inset-x-0 bottom-0 z-20 hidden p-4 text-white transition-all duration-300 sm:p-5 lg:block lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/86">{card.tag}</p>
                          <h3 className="mt-1.5 font-brand text-[1.25rem] font-semibold leading-tight tracking-[-0.01em] line-clamp-2">{card.title}</h3>
                          {card.caption ? <p className="mt-1 text-xs text-white/84 line-clamp-2">{card.caption}</p> : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[22px] border border-[#eadde5] bg-white/70 px-6 py-10 text-center text-[#735f6e] shadow-[0_14px_28px_-22px_rgba(60,40,55,0.22)]">
              {t('_auto.page.p035')}
            </div>
          )}

          {galleryIsToggleVisible && (
            <div className="mt-8 flex justify-center lg:mt-10">
              <button
                type="button"
                aria-expanded={isGalleryExpanded}
                aria-controls="homepage-gallery-grid"
                onClick={() => setIsGalleryExpanded((prev) => !prev)}
                className="btn-secondary"
              >
                {isGalleryExpanded
                  ? t('homepage.gallery.showLess')
                  : t('homepage.gallery.showAll')}
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-300 ${isGalleryExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          )}

          {/* CTA panel below grid */}
          <div className="mt-14 rounded-[24px] bg-gradient-to-b from-[#fdf5f9] to-[#f8f0f4] px-6 py-10 text-center shadow-[0_16px_40px_-20px_rgba(80,50,65,0.12)] lg:mt-16 lg:px-12 lg:py-12">
            <p className="text-[1.05rem] leading-relaxed text-[#5d4a56]">
              {t('homepage.gallery.ctaLead')}
            </p>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-[#7a6572]">
              {t('_auto.page.p039')}
            </p>
            <p className="mt-1 text-[0.9rem] font-medium text-[#6f4b62]">
              {t('_auto.page.p040')}
            </p>
            <button
              type="button"
              onClick={() => router.push(localizePath('/book'))}
              className="btn-primary btn-primary-xl mt-6"
            >
              {t('homepage.gallery.bookTime')}
              <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </section>

      {activeGalleryIndex !== null && galleryCards[activeGalleryIndex] && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            className="absolute inset-0"
            onClick={closeGallery}
            aria-label={t('homepage.gallery.closeLightbox')}
          />
          <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[1.8rem] border border-white/35 bg-[#140f13] shadow-[0_36px_60px_-28px_rgba(0,0,0,0.7)]">
            {isDataImageUrl(galleryCards[activeGalleryIndex].imageUrl) ? (
              <img
                src={galleryCards[activeGalleryIndex].imageUrl}
                alt={galleryCards[activeGalleryIndex].alt}
                className="h-[62vh] w-full object-cover md:h-[70vh]"
                decoding="async"
              />
            ) : (
              <Image
                src={galleryCards[activeGalleryIndex].imageUrl}
                alt={galleryCards[activeGalleryIndex].alt}
                width={1600}
                height={1100}
                className="h-[62vh] w-full object-cover md:h-[70vh]"
              />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_56%,rgba(0,0,0,0.7)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 p-5 text-white md:p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-white/75">{t('homepage.gallery.featuredLabel')}</p>
              <h3 className="text-xl font-semibold md:text-2xl">{galleryCards[activeGalleryIndex].title}</h3>
              {galleryCards[activeGalleryIndex].caption ? (
                <p className="max-w-[60ch] text-sm text-white/90">{galleryCards[activeGalleryIndex].caption}</p>
              ) : null}
              <button
                onClick={() => handleGalleryCta(galleryCards[activeGalleryIndex].ctaHref)}
                className="mt-1 inline-flex w-fit rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-[#4b3044]"
              >
                {t('homepage.gallery.bookTime')}
              </button>
            </div>
            <button
              onClick={prevGallery}
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white"
            >
              {t('_auto.page.p044')}
            </button>
            <button
              onClick={nextGallery}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white"
            >
              {t('_auto.page.p045')}
            </button>
            <button
              onClick={closeGallery}
              className="absolute right-3 top-3 z-20 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white"
            >
              {t('_auto.page.p046')}
            </button>
          </div>
        </div>
      )}

      {/* ===================== */}
      {/* 8. SIGNATURE UPGRADES */}
      {/* ===================== */}
      <section id="pricing" data-reveal className={`bg-slate-50/50 ${sectionClass}`}>
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
                  className="pill-selectable min-h-[44px] gap-3 px-4 text-left text-[#5f4d5d]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fff2fb] text-xs font-semibold text-[#7f4668]">
                    {item.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-[#9a6e87]">+{'\u20AC'}{item.price}</span>
                  <span className="text-xs text-[#ad88a0]">+{item.duration} min</span>
                </button>
              ))
            ) : (
              <button
                onClick={() => router.push(localizePath('/book'))}
                className="pill-selectable min-h-[44px] gap-2 px-4 text-sm font-medium text-[#5f4d5d]"
              >
                {t('_auto.page.p047')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 8. TEAM — admin managed */}
      {/* ===================== */}
      <section
        id="team"
        ref={sandraSectionRef}
        data-reveal
        className={`relative overflow-visible bg-[radial-gradient(ellipse_95%_70%_at_50%_0%,#fff8fc_0%,#fbf5f8_42%,#f7f1f5_100%)] ${sectionClass}`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-multiply"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 240 240\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.95\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
          aria-hidden
        />
        <div className={`relative ${contentMax}`}>
          <div className="rounded-3xl bg-gradient-to-br from-[#faf7f8] to-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] sm:p-8 lg:p-12">
            <div className="grid grid-cols-1 gap-14 lg:grid-cols-[0.96fr_1.04fr] lg:gap-20 lg:items-center">
            <div className="relative order-1">
              <div
                ref={sandraImageRef}
                className={`group relative overflow-hidden rounded-[34px] shadow-[0_44px_92px_-30px_rgba(68,38,56,0.42)] ring-1 ring-[#ebdce5]/80 transition-all duration-700 ease-out ${
                  isSandraInView ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
                }`}
              >
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#170f15]/36 via-transparent to-transparent" />
                <span className="absolute left-5 top-5 z-20 rounded-full border border-[#ead5e1]/85 bg-white/90 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#784f66] shadow-[0_14px_30px_-18px_rgba(59,35,49,0.45)] backdrop-blur-sm">
                  {activeTeamMember?.isFeatured
                    ? t('homepage.team.favoriteBadge')
                    : activeTeamMember?.roleTitle?.trim() || t('homepage.team.eyebrow')}
                </span>
                <Image
                  src={activeTeamMember?.mainImage?.trim() || media('team_portrait') || orderedGalleryItems[0]?.imageUrl || media('hero_main') || ''}
                  alt={activeTeamMember?.fullName?.trim() || t('homepage.team.imageAlt')}
                  width={1200}
                  height={1500}
                  revealEnabled={false}
                  className="aspect-[5/6] w-full object-cover transition-transform duration-700 ease-out lg:min-h-[700px] lg:group-hover:scale-[1.02]"
                />
              </div>
              <div className="pointer-events-none absolute -bottom-10 -right-8 hidden h-52 w-56 rounded-full bg-[#f0dfe9]/70 blur-3xl lg:block" aria-hidden />
            </div>

            <div className="order-2 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p
                  className={`text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a6b7e] transition-all duration-600 ${
                    isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                  }`}
                  style={{ transitionDelay: '100ms' }}
                >
                  {activeTeamMember?.roleTitle?.trim() || t('homepage.team.eyebrow')}
                </p>
                {hasTeamSwitcher ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={prevTeamMember}
                      aria-label={t('_auto.page.p052')}
                      className="icon-circle-btn h-10 w-10"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextTeamMember}
                      aria-label={t('_auto.page.p053')}
                      className="icon-circle-btn h-10 w-10"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>

              <h2
                className={`mt-2 font-brand text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#1f171d] transition-all duration-600 sm:text-[46px] lg:text-[56px] ${
                  isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: '180ms' }}
              >
                {activeTeamMember?.fullName?.trim() || 'Nailify Team'}
              </h2>

              <p
                className={`mt-5 max-w-[58ch] text-[1.02rem] leading-[1.72] text-[#5f4c59] transition-all duration-500 ${
                  isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: '300ms' }}
              >
                {activeTeamMember?.shortIntro?.trim() || t('homepage.team.subtitle')}
              </p>

              {teamBadgeChips.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {teamBadgeChips.map((chip, index) => (
                    <span
                      key={`${chip}-${index}`}
                      className={`pill-meta min-h-[36px] px-4 text-xs transition-all duration-500 ${
                        isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                      }`}
                      style={{ transitionDelay: `${360 + index * 60}ms` }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}

              {teamFeatureCards.length > 0 ? (
                <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {teamFeatureCards.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className={`flex gap-3 rounded-2xl px-1 py-1 transition-all duration-500 ${
                        isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`}
                      style={{ transitionDelay: `${520 + index * 80}ms` }}
                    >
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4e8ef] text-[#8a5d74]">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div>
                        {item.title ? <h3 className="text-sm font-semibold text-[#2d232d]">{item.title}</h3> : null}
                        {item.description ? <p className="mt-1 text-[12.5px] leading-[1.55] text-[#6f5e66]">{item.description}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {signatureTags.length > 0 ? (
                <div className="mt-8">
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6b7e] transition-all duration-500 ${
                      isSandraInView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                    }`}
                    style={{ transitionDelay: '800ms' }}
                  >
                    {activeTeamMember?.signatureLabel?.trim() || t('homepage.team.signatureLabel')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {signatureTags.map((tag) => (
                      <span key={tag} className="pill-tag min-h-[32px] px-3.5 text-xs normal-case tracking-[0.01em]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-8">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6b7e]">
                  {t('homepage.team.resultsLabel')}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {specialistGallery.map((item, index) => (
                    <button
                      key={`${item.imageUrl}-${index}`}
                      type="button"
                      onClick={() => openSpecialistImage(index)}
                      className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-[16px] border border-[#eadbe4] bg-white shadow-[0_12px_24px_-18px_rgba(70,45,58,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-18px_rgba(70,45,58,0.34)] sm:h-24 sm:w-24"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.caption}
                        width={240}
                        height={240}
                        revealEnabled={false}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5 pointer-events-none" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-10">
                <button
                  type="button"
                  onClick={goToTeamCta}
                  className="btn-primary btn-primary-xl w-full lg:w-auto"
                >
                  {activeTeamMember?.primaryCtaText?.trim()
                    || (t('_auto.page.p056'))}
                  <ArrowRight className="ml-2 inline h-5 w-5" strokeWidth={2.2} />
                </button>
                <p className="mt-3 text-xs font-medium text-[#7a6572]">
                  {activeTeamMember?.availabilityHelperText?.trim()
                    || (t('_auto.page.p057'))}
                </p>
              </div>
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
            {t('homepage.gallery.closeLightbox')}
          </button>
          <button
            onClick={prevSpecialistImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/12 px-3 py-2 text-xs font-semibold text-white"
          >
            {t('_auto.page.p059')}
          </button>
          <button
            onClick={nextSpecialistImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/12 px-3 py-2 text-xs font-semibold text-white"
          >
            {t('_auto.page.p060')}
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
                {t('homepage.gallery.wantThisStyle')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== */}
      {/* 9. PRODUCT DISCOVERY ā€” Premium editorial 3-zone layout */}
      {/* ===================== */}
      <section
        id="products"
        ref={productsSectionRef}
        data-reveal
        className={`relative overflow-hidden ${sectionClass} bg-[#f7f0f3] transition-all duration-[460ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] ${
          productsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18px]'
        }`}
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
                {t('homepage.products.retailTitle')}
              </h2>
              <p className="mt-4 max-w-[54ch] text-[1.01rem] leading-7 text-[#6f5d6d]">
                {t('homepage.products.retailSubtitle')}
              </p>
              <p className="mt-2 text-sm font-medium text-[#8e6880]">
                {t('homepage.products.retailSupport')}
              </p>
              <p className="mt-4 text-[1.06rem] font-semibold tracking-[-0.01em] text-[#6a4a60]">
                {t('_auto.page.p064')}
              </p>
            </div>
            <button
              onClick={goToShop}
              className="rounded-full bg-transparent px-6 py-3 text-sm font-semibold text-[#6a4c64] transition-all duration-300 hover:bg-[#fdf4f9] hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('homepage.products.explore')}
            </button>
          </div>

          {!productsLoading && retailProducts.length > 0 && (
            <div className="mb-6 grid gap-3 rounded-[22px] border border-[#eedfe7] bg-white/75 p-4 backdrop-blur-sm lg:grid-cols-[1.1fr_1fr_0.9fr]">
              <div className="rounded-[14px] border border-[#f0e4ea] bg-[#fffafd] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9d7a90]">
                  {t('_auto.page.p065')}
                </p>
                <p className="mt-1 text-[13px] text-[#5e4c58]">
                  {retailProducts.slice(0, 3).map((product) => product.name).join(' \u00B7 ')}
                </p>
              </div>
              <div className="rounded-[14px] border border-[#efdce6] bg-[#fff7fb] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9d7a90]">
                  {t('_auto.page.p066')}
                </p>
                <p className="mt-1 text-[13px] text-[#5e4c58]">
                  {t('_auto.page.p067')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(localizePath('/shop'))}
                className="rounded-[14px] border border-[#e8d6e1] bg-white px-4 py-3 text-left transition hover:bg-[#fff8fb]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9d7a90]">
                  {t('_auto.page.p068')}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[#6f4b62]">
                  {t('_auto.page.p069')}
                </p>
              </button>
            </div>
          )}

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
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
              {/* Shared container: hero + curated picks ā€” reduced hero height so grid rises; no right-column void */}
              <div className="rounded-[28px] bg-[#fdf9fb]/90 p-3 shadow-none backdrop-blur-sm lg:p-4">
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
                  {/* ZONE 1 ā€” Hero: magazine cover proportion ā€” image ~15% shorter, overlay higher + wider, gradient behind card, stronger title */}
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
                            className={`icon-circle-btn absolute right-3 top-3 z-10 h-11 min-h-[44px] w-11 min-w-[44px] bg-white/95 transition-all duration-200 hover:scale-110 ${
                              isFavorite(featuredProduct.id) ? 'text-[#c24d86]' : 'text-[#8b6c81] hover:text-[#b07a9a]'
                            }`}
                            aria-label={isFavorite(featuredProduct.id) ? (t('_auto.page.p070')) : (t('_auto.page.p071'))}
                          >
                            <FavoriteHeartIcon active={isFavorite(featuredProduct.id)} size={18} />
                          </button>
                        </div>
                        {/* Overlay card: higher into image, slightly wider, less padding ā€” bottom-sheet style on mobile */}
                        <div className="relative -mt-20 mx-2.5 w-[calc(100%-1.25rem)] max-w-[min(100%,34rem)] rounded-2xl bg-white/92 p-4 shadow-[0_8px_32px_-12px_rgba(50,28,45,0.12)] backdrop-blur-md sm:mx-3 sm:-mt-24 sm:p-4 lg:-mt-28 lg:mx-4 lg:max-w-[38rem] lg:p-5">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a06f8d]">
                            {featuredProduct.isFeatured
                              ? t('homepage.products.badgeRecommended')
                              : t('homepage.products.badgeBestseller')}
                          </p>
                          <h3 className="text-[1.35rem] font-bold leading-tight tracking-[-0.02em] text-[#2d232d] sm:text-[1.65rem]">
                            {featuredProduct.name}
                          </h3>
                          <p className="mt-1.5 line-clamp-2 max-w-[46ch] text-[13px] leading-6 text-[#6f5f6f]">
                            {featuredProduct.description}
                          </p>
                          <p className="mt-1 text-[11px] font-medium leading-6 text-[#8f6a84]">
                            {t('homepage.products.useCaseFeatured')}
                          </p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9b7590]">
                                {t('homepage.products.priceFrom')}
                              </p>
                              <p className="text-[1.6rem] font-bold tracking-[-0.02em] text-[#b04b80] sm:text-2xl">EUR {featuredProduct.price}</p>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                              <button
                                onClick={() => addToCart(featuredProduct.id, 1, featuredProduct.price)}
                                className="btn-primary btn-small w-full sm:w-auto"
                              >
                                {t('add_to_cart')}
                              </button>
                              {Boolean(activeBookingSession) && (
                                <button
                                  onClick={() => {
                                    const isSelected = selectedProducts.some((p) => p.productId === featuredProduct.id);
                                    if (isSelected) {
                                      clearBookingProductIntent();
                                      removeProductFromBooking(featuredProduct.id);
                                      return;
                                    }

                                    const bookingProduct = {
                                      productId: featuredProduct.id,
                                      name: featuredProduct.name,
                                      unitPrice: featuredProduct.price,
                                      quantity: 1,
                                      imageUrl: featuredProduct.imageUrl ?? null,
                                    };
                                    setBookingProductIntent(bookingProduct);
                                    addProductToBooking(bookingProduct);
                                    router.push(localizePath('/book'));
                                  }}
                                  className="btn-secondary btn-small w-full sm:w-auto"
                                >
                                  {selectedProducts.some((p) => p.productId === featuredProduct.id)
                                    ? t('_auto.page.p075')
                                    : t('add_to_booking')}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  trackBehaviorEvent('product_card_click', {
                                    productId: featuredProduct.id,
                                    productPosition: 0,
                                    price: featuredProduct.price,
                                  });
                                  goToProduct(featuredProduct.id);
                                }}
                                className="btn-secondary btn-small w-full sm:w-auto"
                              >
                                {t('homepage.products.ctaViewProduct')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  )}

                  {/* ZONE 2 ā€” Curated picks: mobile = horizontal swipe; desktop = sticky panel with max-height + fade */}
                  <aside className="relative rounded-[20px] bg-white/40 p-3 backdrop-blur-sm lg:col-span-4 lg:sticky lg:top-20 lg:max-h-[min(320px,40vh)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a06f8d]">
                      {t('homepage.products.quickPicksLabel')}
                    </p>
                    <p className="mt-1 text-[12px] leading-5.5 text-[#6f5f6f] lg:max-w-[240px]">
                      {t('homepage.products.quickPicksDescription')}
                    </p>
                    <div className="mt-2 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-y-auto lg:max-h-[200px] lg:gap-0 [scrollbar-width:thin]">
                      <div className="flex gap-3 lg:flex-col lg:gap-0 lg:divide-y lg:divide-[#eedce6]/40">
                        {supportingProducts.slice(0, 3).map((product) => (
                          <button
                            key={`quick-${product.id}`}
                            onClick={() => {
                              const idx = supportingProducts.findIndex((p) => p.id === product.id);
                              trackBehaviorEvent('product_card_click', {
                                productId: product.id,
                                productPosition: idx >= 0 ? idx + 1 : undefined,
                                price: product.price,
                              });
                              goToProduct(product.id);
                            }}
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
                                {t('homepage.products.quickPickUseCase')}
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

              {/* ZONE 3 ā€” Masonry grid: controlled rhythm ā€” medium landscape ā†’ small portrait ā†’ tall portrait ā†’ medium ā†’ small (no content expansion) */}
              <div className="mt-6 lg:mt-8">
                <div data-stagger className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible md:gap-4 lg:grid-cols-3 lg:gap-5">
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
                        className="motion-stagger-item group flex min-w-[220px] flex-col overflow-hidden rounded-[24px] bg-white/95 shadow-[0_8px_24px_-12px_rgba(65,38,58,0.08),0_2px_10px_-4px_rgba(65,38,58,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(65,38,58,0.12),0_4px_14px_-6px_rgba(65,38,58,0.06)] md:min-w-0"
                      >
                        <div
                          className={`relative cursor-pointer overflow-hidden rounded-t-[24px] bg-[#f8edf3] ${aspectClass}`}
                          onClick={() => {
                            trackBehaviorEvent('product_card_click', {
                              productId: product.id,
                              productPosition: index + 1,
                              price: product.price,
                            });
                            goToProduct(product.id);
                          }}
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
                            className={`icon-circle-btn absolute right-2.5 top-2.5 z-10 h-8 w-8 min-h-[32px] min-w-[32px] bg-white/90 transition-all duration-200 hover:scale-110 ${
                              isFavorite(product.id) ? 'text-[#c24d86]' : 'text-[#8b6c81] hover:text-[#b07a9a]'
                            }`}
                            aria-label={isFavorite(product.id) ? (t('_auto.page.p081')) : (t('_auto.page.p082'))}
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
                            {t('homepage.products.cardUseCase')}
                          </p>
                          <div className="mt-auto flex flex-col gap-2 pt-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                            <span className={`font-semibold text-[#b04b80] ${isTall ? 'text-base' : 'text-[15px]'}`}>EUR {product.price}</span>
                            <button
                              onClick={() => {
                                trackBehaviorEvent('product_card_click', {
                                  productId: product.id,
                                  productPosition: index + 1,
                                  price: product.price,
                                });
                                goToProduct(product.id);
                              }}
                              className="btn-primary btn-small w-full px-3.5 text-[11px] sm:w-auto"
                            >
                              {t('homepage.products.ctaRetailTile')}
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
      {/* 10. CLIENT FEEDBACK ā€” Premium beauty social proof (editorial 2-layer) */}
      {/* ===================== */}
      <section
        id="testimonials"
        ref={testimonialsSectionRef}
        data-reveal
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
              <p className="text-[#7e6376]">
                {t('_auto.app_page.p106')}
              </p>
            </div>
          ) : (
            <>
              {/* Featured reel testimonial */}
              {feedbackItems[0] && (() => {
                const featured = feedbackItems[0];
                const firstName = featured.clientName.trim().split(/\s+/)[0] || featured.clientName;
                const quoteText = featured.feedbackText.trim() || (t('_auto.page.p085'));
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
                            {t('_auto.page.p086')}
                          </div>

                        </div>
                      </div>

                      {/* Right: quote + meta + CTA */}
                      <div className="relative flex flex-col justify-center px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
                        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#a87a94]">
                          {t('_auto.page.p087')}
                        </p>
                        <blockquote className="mt-2 font-brand text-[1.22rem] font-medium leading-[1.5] tracking-[-0.015em] text-[#2d232d] sm:text-[1.45rem] lg:text-[1.7rem]">
                          &ldquo;{quoteText}&rdquo;
                        </blockquote>

                        <div className="mt-3 flex items-center gap-2.5">
                          <div className="flex items-center gap-0 text-[#b86b8f]" role="img" aria-label={`${featured.rating} out of 5`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className="text-[12px] leading-none" aria-hidden>
                                {i < featured.rating ? '\u2605' : '\u2606'}
                              </span>
                            ))}
                          </div>
                          <span className="text-[12px] font-medium text-[#7a6677]">
                            {featured.sourceLabel || (t('_auto.page.p088'))}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <p className="text-[14px] font-semibold text-[#2d232d]">{firstName}</p>
                          {serviceLabel && (
                            <span className="pill-tag min-h-[30px] px-3 text-[11px] normal-case tracking-[0.01em]">
                              {serviceLabel}
                            </span>
                          )}
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => router.push(localizePath('/book'))}
                            className="btn-primary btn-primary-lg"
                          >
                            {t('_auto.page.p089')}
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(localizePath('/book'))}
                            className="btn-secondary"
                          >
                            {t('_auto.page.p090')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })()}

              {/* Reel mini cards ā€” swipeable reels strip (desktop + mobile) */}
              <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-2 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory md:gap-5">
                  {feedbackItems.slice(1, 5).map((item) => {
                    const firstName = item.clientName.trim().split(/\s+/)[0] || item.clientName;
                    const caption = item.feedbackText.trim();
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
                            <span aria-hidden>{'\u2605'}</span>
                            <span>{item.rating}/5</span>
                          </div>

                          {/* Caption overlay */}
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="rounded-2xl bg-white/14 px-3.5 py-2 backdrop-blur-md transition-opacity duration-300 md:opacity-95 md:group-hover:opacity-100">
                              <p className="text-[12px] font-medium leading-snug text-white">
                                &ldquo;{caption || (t('_auto.page.p091')) }&rdquo;
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
      {/* 9. LOCAL TRUST / VISIT US ā€” Editorial 2-column */}
      {/* ===================== */}
      <section
        id="location"
        ref={locationSectionRef}
        data-reveal
        className={`relative overflow-hidden bg-[radial-gradient(ellipse_110%_80%_at_50%_0%,#fff9fc_0%,#fbf5f8_42%,#f7f1f5_100%)] ${sectionClass}`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-multiply"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 240 240\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-[#f2e2eb]/70 blur-3xl" aria-hidden />
        <div className={contentMax}>
          <div
            className={`grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 lg:items-center transition-all duration-700 ease-out ${
              locationInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            {/* LEFT COLUMN: visual anchor ā€” large image with overlay and optional label */}
            <div className="relative order-1 overflow-visible">
              <div className="pointer-events-none absolute -inset-x-6 -bottom-8 h-40 rounded-full bg-[#efdeea]/75 blur-3xl" aria-hidden />
              <div className="relative aspect-[6/5] overflow-hidden rounded-[24px] bg-slate-200 shadow-[0_34px_78px_-30px_rgba(67,37,54,0.45)] lg:min-h-[490px]">
                {(media('location_studio') || media('team_portrait') || media('hero_main')) ? (
                  <Image
                    src={media('location_studio') || media('team_portrait') || media('hero_main')}
                    alt={t('homepage.location.mapTitle')}
                    width={1200}
                    height={900}
                    className={`h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.03] ${
                      locationInView ? 'scale-[1.01]' : 'scale-[1.06]'
                    }`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-500">
                    <span className="text-sm font-medium">{t('homepage.location.previewEyebrow')}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#120c12]/58 to-transparent pointer-events-none" />
                <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-white/14 px-3.5 py-1.5 text-xs font-medium text-white/95 backdrop-blur-md">
                  {t('_auto.page.p092')}
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: content block ā€” eyebrow, heading, paragraph, chips, CTAs */}
            <div className="order-2 lg:order-2 flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#8a6b7e]">
                {t('homepage.localAuthority.eyebrow')}
              </p>
              <h2 className="mt-4 font-brand text-[2rem] font-semibold leading-[1.14] tracking-[-0.02em] text-[#1f171d] md:text-[2.55rem]">
                {t('homepage.location.title')}
              </h2>
              <p className="mt-6 text-[1.03rem] leading-[1.72] text-[#5f4c59]">
                {t('homepage.location.subtitle')}
              </p>
              <p className="mt-3 text-[0.98rem] leading-[1.68] text-[#6f5e66]">
                {t('homepage.location.previewText')}
              </p>
              <p className="mt-4 font-brand text-[1.08rem] italic leading-relaxed text-[#6a4d61]">
                “{t('_auto.page.p095')}”
                <span className="ml-2 not-italic text-sm text-[#8c7281]">— {t('_auto.page.p096')}</span>
              </p>

              <ul className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { icon: MapPin, key: 'badge1' as const },
                  { icon: Clock, key: 'badge2' as const },
                  { icon: Car, key: 'badge3' as const },
                  { icon: Building2, key: 'badge4' as const },
                ].map(({ icon: Icon, key }) => (
                  <li
                    key={key}
                    className="pill-meta gap-3.5 bg-white/75 text-[#544552]"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#8b6278] shadow-[0_8px_20px_-16px_rgba(73,43,60,0.55)] ring-1 ring-[#ead9e3]/90">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-[0.96rem] font-medium leading-relaxed">{t(`homepage.location.${key}`)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <button
                  type="button"
                  onClick={() => router.push(localizePath('/book'))}
                  className="btn-primary btn-primary-xl w-full sm:w-auto"
                >
                  {t('_auto.page.p097')}
                </button>
                <a
                  href="https://www.google.com/maps?q=Mustam%C3%A4e+tee+55+Tallinn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full sm:w-auto"
                >
                  {t('_auto.page.p098')}
                </a>
              </div>

              <p className="mt-4 text-xs font-medium text-[#7a6572]">
                {t('homepage.hero.cancelTrust')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 10. AFTERCARE + GIFT CARDS - premium editorial commerce support */}
      {/* ===================== */}
      <section
        data-reveal
        className={`relative overflow-hidden bg-[linear-gradient(180deg,#fffdfd_0%,#f8f2f5_56%,#f6f0f3_100%)] ${sectionClass} pb-24 lg:pb-28`}
        id="aftercare-gifts"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #bfa4b3 1px, transparent 0)', backgroundSize: '18px 18px' }} />
        <div className={contentMax}>
          <header className={`mx-auto max-w-[720px] text-center ${headerToContent}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a6b7e]">{t('homepage.revenue.sectionEyebrow')}</p>
            <h2 className={`font-brand text-[2.15rem] font-semibold tracking-[-0.02em] text-[#1f171d] md:text-[2.55rem] ${headerTitleGap}`}>
              {t('homepage.revenue.sectionTitle')}
            </h2>
            <p className={`mx-auto max-w-[44rem] text-[1.02rem] leading-[1.75] text-[#6b5a62] ${headerSubtitleGap}`}>
              {t('homepage.revenue.sectionIntro')}
            </p>
          </header>

          <div className="grid items-start gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
            <article className="group relative">
              <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[30px] bg-[radial-gradient(ellipse_at_top_left,rgba(195,126,163,0.13),transparent_62%)]" aria-hidden />
              <div className="relative overflow-hidden rounded-[24px] shadow-[0_28px_66px_-30px_rgba(45,20,34,0.28)] ring-1 ring-[#eadce4]/80">
                <Image
                  src={media('aftercare_image') || media('product_fallback_1') || media('hero_main')}
                  alt="Aftercare products"
                  width={1200}
                  height={760}
                  className="h-[20rem] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] sm:h-[24rem] lg:h-[28rem]"
                />
              </div>
              <div className="mt-7 px-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#9f6e8c]">{t('homepage.aftercare.eyebrow')}</p>
                <h3 className="mt-3 font-brand text-[1.72rem] font-semibold leading-[1.2] tracking-[-0.015em] text-[#2a202a] md:text-[2.02rem]">{t('homepage.aftercare.title')}</h3>
                <p className="mt-4 max-w-[58ch] text-[0.99rem] leading-[1.72] text-[#6d5a67]">{t('homepage.aftercare.subtitle')}</p>
                <ul className="mt-5 space-y-2.5 text-[0.95rem] leading-relaxed text-[#5f4f5a]">
                  <li className="flex items-start gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#ba5b89]" />{t('homepage.aftercare.tip1')}</li>
                  <li className="flex items-start gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#ba5b89]" />{t('homepage.aftercare.tip2')}</li>
                  <li className="flex items-start gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#ba5b89]" />{t('homepage.aftercare.tip3')}</li>
                </ul>
                <div className="mt-7">
                  <button
                    onClick={() => router.push(localizePath('/shop'))}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    {t('homepage.aftercare.cta')}
                  </button>
                </div>
              </div>
            </article>

            <article className="group rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.8)_0%,rgba(248,238,244,0.9)_100%)] p-5 shadow-[0_24px_56px_-36px_rgba(48,22,36,0.3)] ring-1 ring-[#eadbe4]/80 sm:p-7">
              <div className="relative overflow-hidden rounded-[22px]">
                <Image
                  src={media('giftcard_image') || media('product_fallback_2') || media('hero_main')}
                  alt="Gift card"
                  width={1200}
                  height={760}
                  className="h-[18rem] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035] sm:h-[20rem] lg:h-[23rem]"
                />
              </div>
              <div className="mt-6 flex flex-1 flex-col">
                <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#9f6e8c]">{t('homepage.giftcards.eyebrow')}</p>
                <h3 className="mt-3 font-brand text-[1.64rem] font-semibold leading-[1.2] tracking-[-0.015em] text-[#2a202a] md:text-[1.9rem]">{t('homepage.giftcards.title')}</h3>
                <p className="mt-3 text-[0.98rem] leading-[1.7] text-[#6d5a67]">{t('homepage.giftcards.subtitle')}</p>
                <p className="mt-3 text-[0.92rem] font-medium text-[#8e5f7f]">{t('homepage.giftcards.helper')}</p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {[25, 50, 100].map((amount) => {
                    const isSelected = selectedGiftAmount === amount;
                    return (
                      <button
                        type="button"
                        key={amount}
                        onClick={() => setSelectedGiftAmount(amount)}
                        className={`pill-selectable ${isSelected ? 'is-selected' : ''}`}
                      >
                        EUR {amount}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-7">
                  <button
                    className="btn-primary btn-primary-xl w-full sm:w-auto"
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
      <section data-reveal className={`bg-slate-50/50 ${sectionClass}`}>
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

      {/* Final CTA - premium final conversion push */}
      <section
        id="final-cta"
        ref={finalCtaSectionRef}
        data-reveal
        className={`relative overflow-hidden bg-[linear-gradient(180deg,#faf6f8_0%,#f6eff3_58%,#f3eaef_100%)] ${sectionClass} !pt-14 !pb-16 md:!pt-16 md:!pb-20 transition-all duration-[480ms] [transition-timing-function:cubic-bezier(0.22,0.68,0,1)] ${
          finalCtaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18px]'
        }`}
        aria-labelledby="final-cta-heading"
      >
        <div className="pointer-events-none absolute right-0 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(194,77,134,0.08),transparent_70%)]" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[280px] w-[280px] rounded-full bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(194,77,134,0.05),transparent_70%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#f2e8ee]" aria-hidden />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#e3d2dc] to-transparent" aria-hidden />

        <div className={`relative ${contentMax}`}>
          <div data-motion="major-cta" className="mx-auto max-w-[1180px]">
            <div className="mx-auto max-w-[44rem] text-center lg:text-left">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#8a6b7e]">
                {t('homepage.final.limited')}
              </p>
              <h2 id="final-cta-heading" className="mt-3 font-brand text-[2rem] font-semibold leading-[1.12] tracking-[-0.02em] text-[#221722] md:text-[2.65rem]">
                {t('finalCta.title')}
              </h2>
              <p className="mt-4 text-[1.03rem] leading-[1.75] text-[#62515f]">
                {t('finalCta.subtitle')}
              </p>
              <div className="mt-5 inline-flex flex-col rounded-2xl border border-[#e5d3de]/90 bg-white/68 px-4 py-3 text-left shadow-[0_12px_26px_-20px_rgba(67,38,55,0.32)]">
                <p className="text-[0.9rem] font-medium text-[#6a4e5f]">
                  {t('_auto.page.p100')}
                </p>
                <p className="mt-1 text-[0.84rem] text-[#7a6271]">
                  {t('_auto.page.p101')}
                </p>
              </div>
            </div>

            <ul className="mx-auto mt-7 grid max-w-[52rem] gap-3 sm:grid-cols-2 lg:mt-8 lg:grid-cols-3" role="list">
              <li className="pill-meta gap-2.5 bg-white/72 ring-1 ring-[#ead8e3]/85">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#3f9a72]" aria-hidden />
                <span className="text-[0.9rem] font-medium text-[#5a4a55]">{t('finalCta.mostClients')}</span>
              </li>
              <li className="pill-meta gap-2.5 bg-white/72 ring-1 ring-[#ead8e3]/85">
                <RefreshCw className="h-4.5 w-4.5 shrink-0 text-[#3f9a72]" aria-hidden />
                <span className="text-[0.9rem] font-medium text-[#5a4a55]">{t('finalCta.freeReschedule')}</span>
              </li>
              <li className="pill-meta gap-2.5 bg-white/72 ring-1 ring-[#ead8e3]/85 sm:col-span-2 lg:col-span-1">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#3f9a72]" aria-hidden />
                <span className="text-[0.9rem] font-medium text-[#5a4a55]">
                  {t('homepage.final.depositTrust')}
                </span>
              </li>
            </ul>

            <div className="mx-auto mt-6 max-w-[52rem] rounded-[28px] border border-[#e8d8e1]/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.72)_100%)] p-5 shadow-[0_28px_60px_-38px_rgba(55,30,44,0.35)] backdrop-blur-[8px] sm:p-6 lg:mt-7 lg:p-7">
              <div className="h-1 w-full rounded-full bg-[linear-gradient(90deg,rgba(192,88,139,0.75),rgba(226,182,200,0.22),transparent_88%)]" />
              <p className="mt-4 text-[0.96rem] leading-relaxed text-[#63525e]">
                {t('homepage.final.reassureLine')}
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => router.push(localizePath('/book'))}
                  className="btn-primary btn-primary-xl w-full"
                >
                  {t('finalCta.secureSlot')}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('services')}
                  className="btn-secondary w-full"
                >
                  {t('finalCta.browseServices')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile sticky booking conversion rail */}
      <div className="homepage-sticky-book-enter fixed inset-x-0 bottom-0 z-40 border-t border-[#eadde5] bg-white/92 px-3 py-2 shadow-[0_-20px_38px_-22px_rgba(60,40,55,0.45)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#6b5463]">
            {language === 'en'
              ? `Next slot ${nextAvailable || 'today 15:30'}`
              : `Järgmine aeg ${nextAvailable || 'täna 15:30'}`}
          </p>
          <button
            type="button"
            onClick={focusHeroBooking}
            className="btn-primary btn-primary-md"
          >
            {t('_auto.page.p103')}
          </button>
        </div>
      </div>

      {/* ===================== */}
      {/* 12. FOOTER ā€” Premium authority, final conversion safety zone */}
      {/* ===================== */}
      <footer data-reveal className={`relative border-t border-[#e5dce2] bg-gradient-to-b from-[#f6f2f4] to-[#efe8ec] ${sectionClass}`}>
        {/* Subtle top divider: soft shadow fade */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e0d4db] to-transparent" aria-hidden />
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-12 bg-gradient-to-b from-black/[0.02] to-transparent" aria-hidden />

        <div className={`relative ${contentMax}`}>
          <div data-stagger className="grid gap-14 text-center md:grid-cols-12 md:gap-x-10 md:text-left lg:gap-x-12">
            {/* Brand block ā€” dominant left zone */}
            <div className="motion-stagger-item md:col-span-5 lg:col-span-5">
              <span className="font-brand text-[28px] lg:text-[32px] leading-none tracking-tight" style={{ color: colors.primary }}>Nailify</span>
              <p className="mt-4 max-w-[36ch] text-[1.05rem] leading-[1.7] text-[#5c4f58] md:max-w-none">
                {t('footer.description')}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-medium text-[#7d6e78]">
                <span>{trustRatingLabel}</span>
                <span className="text-[#d4c4ce]" aria-hidden>{'\u00B7'}</span>
                <span>{trustClientsLabel}</span>
                <span className="text-[#d4c4ce]" aria-hidden>{'\u00B7'}</span>
                <span>{trustHygienicToolsLabel}</span>
              </div>
            </div>

            {/* Quick links */}
            <div className="motion-stagger-item md:col-span-2">
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
            <div className="motion-stagger-item md:col-span-3">
              <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7c6977]">
                {t('footer.contact')}
              </h4>
              <p className="text-sm font-medium text-[#4a3d44]">{footerContactLine1}</p>
              <p className="mt-0.5 text-sm text-[#6b5c65]">{footerContactLine2}</p>
              <p className="text-sm text-[#6b5c65]">{footerContactLine3}</p>
              <p className="mt-2 text-sm font-medium" style={{ color: colors.primary }}>{footerEmail}</p>
              <p className="mt-2 text-xs text-[#7d6e78]">{footerHoursLabel}: {footerHoursValue}</p>
              <p className="mt-3 text-[11px] text-[#8a7b88]">{t('footer.rescheduleHint')}</p>
            </div>

            {/* Final CTA zone ā€” booking reinforcement */}
            <div className="motion-stagger-item flex flex-col items-center gap-3 md:col-span-12 md:mt-4 md:flex-row md:items-center md:justify-center md:gap-6 lg:col-span-2 lg:col-start-11 lg:row-start-1 lg:row-span-2 lg:mt-0 lg:flex-col lg:items-start lg:justify-center">
              <div className="w-full sm:w-auto">
                <p className="text-[13px] font-medium text-[#5c4f58]">{t('footer.ctaLine')}</p>
                <button
                  onClick={() => router.push(localizePath('/book'))}
                  className="btn-primary btn-primary-lg mt-2.5 w-full sm:w-auto"
                >
                  {t('footer.bookAppointment')}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[#e5dce2] pt-10 sm:flex-row">
            <p className="text-[13px] text-[#8a7b88]">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
