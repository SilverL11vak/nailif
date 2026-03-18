'use client';

import { Heart } from 'lucide-react';

const STROKE_WIDTH = 1.8;

export interface FavoriteHeartIconProps {
  /** Icon size in pixels (navbar uses 18; cards typically 16–18). */
  size?: number;
  /** When true, heart is filled (favourited). */
  active?: boolean;
  /** Optional class for color/transition (e.g. text-[#c24d86]). */
  className?: string;
}

/**
 * Single source of truth for the favourites heart icon across the app.
 * Matches the navbar heart: lucide-react Heart, strokeWidth 1.8, fill when active.
 */
export function FavoriteHeartIcon({
  size = 18,
  active = false,
  className,
}: FavoriteHeartIconProps) {
  return (
    <Heart
      size={size}
      strokeWidth={STROKE_WIDTH}
      fill={active ? 'currentColor' : 'none'}
      className={`transition-transform duration-200 hover:scale-110 ${className ?? ''}`.trim()}
      aria-hidden
    />
  );
}
