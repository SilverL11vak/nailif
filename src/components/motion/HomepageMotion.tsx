'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function shouldReduceMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HomepageMotion() {
  const pathname = usePathname();
  const isHomepage = pathname === '/' || pathname === '/en';

  useEffect(() => {
    if (!isHomepage || shouldReduceMotion()) return;

    let cleanup: (() => void) | undefined;

    void (async () => {
      const gsapModule = await import('gsap');
      const scrollTriggerModule = await import('gsap/ScrollTrigger');
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;

      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        gsap.fromTo(
          '[data-motion="gallery-featured"]',
          { autoAlpha: 0, y: 36, scale: 0.985 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 1.05,
            ease: 'power2.out',
            scrollTrigger: { trigger: '#gallery', start: 'top 76%' },
          }
        );

        gsap.fromTo(
          '[data-motion="gallery-support"]',
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: { trigger: '#gallery', start: 'top 73%' },
          }
        );

        gsap.fromTo(
          '[data-motion="sandra-section"]',
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: 'power2.out',
            scrollTrigger: { trigger: '#team', start: 'top 75%' },
          }
        );

        gsap.utils.toArray<HTMLElement>('[data-motion="major-cta"]').forEach((element) => {
          gsap.fromTo(
            element,
            { autoAlpha: 0, y: 26 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.85,
              ease: 'power2.out',
              scrollTrigger: { trigger: element, start: 'top 82%' },
            }
          );
        });
      });

      cleanup = () => {
        context.revert();
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      };
    })();

    return () => {
      cleanup?.();
    };
  }, [isHomepage]);

  return null;
}

export default HomepageMotion;
