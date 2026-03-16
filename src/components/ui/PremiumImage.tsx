'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

interface PremiumImageProps extends Omit<ImageProps, 'alt'> {
  alt: string;
  revealEnabled?: boolean;
  skeletonClassName?: string;
  fallbackSrc?: string;
}

export function PremiumImage({
  alt,
  className,
  revealEnabled = true,
  skeletonClassName = '',
  fallbackSrc,
  onLoad,
  onError,
  src,
  ...props
}: PremiumImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [config, setConfig] = useState({ skeletons: false, reveal: false });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const skeletons = document.body.dataset.loaderSkeletons === '1';
    const reveal = document.body.dataset.loaderImageReveal === '1' && revealEnabled;
    setConfig({ skeletons, reveal });
  }, [revealEnabled]);

  useEffect(() => {
    setResolvedSrc(src);
    setLoaded(false);
    setHasError(false);
  }, [src]);

  return (
    <>
      {!loaded && !hasError && config.skeletons && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 animate-premium-shimmer [border-radius:inherit] bg-[linear-gradient(110deg,#f5ede9_8%,#fff8f5_18%,#f5ede9_33%)] ${skeletonClassName}`}
        />
      )}
      <Image
        {...props}
        src={resolvedSrc}
        alt={alt}
        onError={(event) => {
          if (fallbackSrc && typeof resolvedSrc === 'string' && resolvedSrc !== fallbackSrc) {
            setResolvedSrc(fallbackSrc);
            setLoaded(false);
            return;
          }
          setHasError(true);
          setLoaded(true);
          onError?.(event);
        }}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        placeholder="blur"
        blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Crect width='16' height='10' fill='%23f6ece8'/%3E%3C/svg%3E"
        className={`${className ?? ''} transition-all duration-500 ease-out ${
          hasError
            ? 'opacity-100'
            : config.reveal
            ? loaded
              ? 'opacity-100 blur-0 scale-100 shadow-[0_14px_24px_-22px_rgba(79,52,64,0.42)]'
              : 'opacity-100 blur-[1px] scale-[1.01]'
            : 'opacity-100'
        }`}
      />
    </>
  );
}

export default PremiumImage;
