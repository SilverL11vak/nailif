'use client';

import { useEffect, useMemo, useRef } from 'react';
import { trackEvent } from '@/lib/behavior-tracking';

function getScrollPercent(): number {
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop || 0;
  const height = Math.max(1, doc.scrollHeight - window.innerHeight);
  return Math.round((scrollTop / height) * 100);
}

export function BehaviorTracking() {
  const sentDepthsRef = useRef<Set<number>>(new Set());
  const rageRef = useRef<{ key: string; times: number[] }>({ key: '', times: [] });

  const depthMilestones = useMemo(() => [25, 50, 75, 100], []);

  useEffect(() => {
    const onScroll = () => {
      const percent = Math.min(100, Math.max(0, getScrollPercent()));
      for (const m of depthMilestones) {
        if (percent >= m && !sentDepthsRef.current.has(m)) {
          sentDepthsRef.current.add(m);
          trackEvent('scroll_depth', { percent: m });
        }
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Stable-ish "area" for rage click: element id, data-analytics, aria-label, or tag+class
      const area =
        target.getAttribute('data-analytics') ||
        target.id ||
        target.getAttribute('aria-label') ||
        `${target.tagName.toLowerCase()}${target.className ? `.${String(target.className).split(/\s+/).slice(0, 2).join('.')}` : ''}`;

      const now = Date.now();
      if (rageRef.current.key !== area) {
        rageRef.current = { key: area, times: [now] };
        return;
      }

      const times = [...rageRef.current.times, now].filter((t) => now - t <= 1200);
      rageRef.current.times = times;
      if (times.length >= 5) {
        rageRef.current.times = [];
        trackEvent('rage_click_detected', { area });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('click', onClickCapture, true);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('click', onClickCapture, true);
    };
  }, [depthMilestones]);

  return null;
}

export default BehaviorTracking;

