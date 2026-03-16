'use client';

interface SkeletonBlockProps {
  className?: string;
}

export function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return <div aria-hidden="true" className={`premium-skeleton-card ${className}`} />;
}

export default SkeletonBlock;
