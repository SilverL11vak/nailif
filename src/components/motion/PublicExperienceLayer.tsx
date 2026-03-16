'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';
import { GlobalLoader } from '@/components/loading/GlobalLoader';
import { RouteLoader } from '@/components/loading/RouteLoader';

const FIRST_LOAD_SEEN_KEY = 'nailify_first_load_seen_v3';

function isReducedMotionPreferred() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function asBool(value: string, fallback = true) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function PublicExperienceLayer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = useTranslation();
  const { text } = useBookingContent();
  const [showRouteLoader, setShowRouteLoader] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [isExitingIntro, setIsExitingIntro] = useState(false);
  const isFirstRouteChange = useRef(true);
  const routeLoaderTimeout = useRef<number | null>(null);

  const searchKey = searchParams.toString();
  const isAdmin = pathname.startsWith('/admin') || pathname.includes('/admin/');
  const isBooking = pathname === '/book' || pathname.includes('/book');
  const isPublic = !isAdmin;
  const shouldSmoothScroll = isPublic && !isBooking;
  const reducedMotion = isReducedMotionPreferred();

  const globalEnabled = asBool(text('loader_enable_global', '1'), true);
  const introEnabled = asBool(text('loader_enable_intro', '1'), true);
  const routeLoaderEnabled = asBool(text('loader_enable_route_loader', '1'), true);
  const skeletonsEnabled = asBool(text('loader_enable_skeletons', '1'), true);
  const imageRevealEnabled = asBool(text('loader_enable_image_reveal', '1'), true);
  const bookingTransitionsEnabled = asBool(text('loader_enable_booking_transitions', '1'), true);
  const loaderHeadline = text(
    'loader_headline',
    language === 'en' ? 'Preparing your experience...' : 'Laeme sinu kogemust...'
  );
  const loaderHelper = text(
    'loader_helper',
    language === 'en' ? 'Just a moment, almost ready.' : 'Hetk, kohe oleme valmis.'
  );
  const loaderTheme = text('loader_theme', 'blush');

  const introGradient = useMemo(() => {
    if (loaderTheme === 'cream') {
      return 'bg-[radial-gradient(circle_at_top,#fffef8_0%,#fff8ee_46%,#fffaf4_100%)]';
    }
    if (loaderTheme === 'rose') {
      return 'bg-[radial-gradient(circle_at_top,#fff8fb_0%,#fff0f6_46%,#fff6fa_100%)]';
    }
    return 'bg-[radial-gradient(circle_at_top,#fffdfa_0%,#fff3f9_46%,#fff8fb_100%)]';
  }, [loaderTheme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.scrollBehavior = shouldSmoothScroll && !reducedMotion ? 'smooth' : 'auto';
    document.body.dataset.loaderGlobal = globalEnabled ? '1' : '0';
    document.body.dataset.loaderSkeletons = skeletonsEnabled ? '1' : '0';
    document.body.dataset.loaderImageReveal = imageRevealEnabled ? '1' : '0';
    document.body.dataset.loaderBookingTransitions = bookingTransitionsEnabled ? '1' : '0';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, [shouldSmoothScroll, reducedMotion, globalEnabled, skeletonsEnabled, imageRevealEnabled, bookingTransitionsEnabled]);

  useEffect(() => {
    if (!isPublic || !globalEnabled) return;
    if (!routeLoaderEnabled) return;
    if (isFirstRouteChange.current) {
      isFirstRouteChange.current = false;
      return;
    }

    if (routeLoaderTimeout.current) {
      window.clearTimeout(routeLoaderTimeout.current);
    }

    routeLoaderTimeout.current = window.setTimeout(() => {
      setShowRouteLoader(true);
    }, 90);

    const hideTimer = window.setTimeout(() => {
      setShowRouteLoader(false);
    }, 360);

    return () => {
      if (routeLoaderTimeout.current) {
        window.clearTimeout(routeLoaderTimeout.current);
      }
      window.clearTimeout(hideTimer);
      setShowRouteLoader(false);
    };
  }, [pathname, searchKey, isPublic, globalEnabled, routeLoaderEnabled]);

  useEffect(() => {
    if (!isPublic || isBooking || !globalEnabled || !introEnabled) return;
    const seen = window.sessionStorage.getItem(FIRST_LOAD_SEEN_KEY);
    if (seen) return;

    window.sessionStorage.setItem(FIRST_LOAD_SEEN_KEY, '1');
    setShowIntro(true);
    setIsExitingIntro(false);

    let finished = false;
    let removeTimer: number | null = null;
    let safetyTimer: number | null = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      setIsExitingIntro(true);
      removeTimer = window.setTimeout(() => {
        setShowIntro(false);
        setIsExitingIntro(false);
      }, reducedMotion ? 90 : 180);
    };

    const onReady = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(finish);
      });
    };

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      onReady();
    } else {
      window.addEventListener('load', onReady, { once: true });
    }

    safetyTimer = window.setTimeout(finish, 1600);

    return () => {
      window.removeEventListener('load', onReady);
      if (removeTimer) window.clearTimeout(removeTimer);
      if (safetyTimer) window.clearTimeout(safetyTimer);
    };
  }, [isPublic, isBooking, reducedMotion, globalEnabled, introEnabled]);

  useEffect(() => {
    if (!introEnabled) {
      setShowIntro(false);
      setIsExitingIntro(false);
    }
  }, [introEnabled]);

  return (
    <>
      <RouteLoader show={showRouteLoader} />
      <GlobalLoader
        show={showIntro}
        exiting={isExitingIntro}
        headline={loaderHeadline}
        helper={loaderHelper}
        themeClass={introGradient}
        reducedMotion={reducedMotion}
      />
    </>
  );
}

export default PublicExperienceLayer;
