'use client';

import Image from 'next/image';
import { Package } from 'lucide-react';

interface ProductGalleryProps {
  name: string;
  images: string[];
  activeImageIndex: number;
  onActiveImageChange: (index: number) => void;
}

export function ProductGallery({ name, images, activeImageIndex, onActiveImageChange }: ProductGalleryProps) {
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[26px] bg-[#f7ecf3]">
        {images[activeImageIndex] ? (
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={images[activeImageIndex]}
              alt={name}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 hover:scale-[1.03]"
            />
          </div>
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center text-[#8f7187]">
            <Package className="h-10 w-10 opacity-50" />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              onClick={() => onActiveImageChange(index)}
              className={`relative h-20 w-20 overflow-hidden rounded-xl border ${index === activeImageIndex ? 'border-[#c24d86]' : 'border-[#e8d5e1]'}`}
            >
              <Image src={imageUrl} alt={`${name}-${index + 1}`} width={240} height={240} unoptimized className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
