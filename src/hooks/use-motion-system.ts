'use client';

import { useEffect } from 'react';

const SECTION_THRESHOLD = 0.18;
const STAGGER_STEP_MS = 60;

export function useMotionSystem() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const staggerParents = Array.from(document.querySelectorAll<HTMLElement>('[data-stagger]'));

    staggerParents.forEach((parent) => {
      const items = Array.from(parent.querySelectorAll<HTMLElement>('.motion-stagger-item'));
      items.forEach((item, index) => {
        item.style.setProperty('--motion-stagger-delay', `${index * STAGGER_STEP_MS}ms`);
      });
    });

    if (prefersReducedMotion) {
      revealNodes.forEach((node) => node.classList.add('is-visible'));
      staggerParents.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.classList.add('is-visible');
          observer.unobserve(target);
        });
      },
      {
        threshold: SECTION_THRESHOLD,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    revealNodes.forEach((node) => observer.observe(node));
    staggerParents.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);
}

