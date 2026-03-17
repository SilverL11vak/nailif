'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';
import { ShopNavBar } from '@/components/shop/ShopNavBar';
import { ArrowLeft } from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  images?: string[];
  category?: string;
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { language, setLanguage, localizePath } = useTranslation();
  const { favoritesCount, isFavorite, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const copy =
    language === 'en'
      ? {
          back: 'Back to products',
          addToBag: 'Add to bag',
          addToBooking: 'Add during booking',
          detailsTitle: 'Product details',
          whatItDoes: 'What it does',
          whyItMatters: 'Why it matters',
          howToUse: 'How to use',
          whoFor: 'Who it is for',
          specs: 'Specifications',
          benefits: 'Benefits',
          pairing: 'Salon pairing',
          similar: 'Similar products',
          viewDetails: 'View details',
          notFound: 'Product not found',
          notFoundHint: 'This product may be unavailable right now.',
          backToHome: 'Back to home',
          backToShop: 'Back to products',
          nav: { home: 'Home', services: 'Services', gallery: 'Gallery', shop: 'Shop', contact: 'Contact', book: 'Book now' },
        }
      : {
          back: 'Tagasi toodete juurde',
          addToBag: 'Lisa korvi',
          addToBooking: 'Lisa broneeringu ajal',
          detailsTitle: 'Toote detailid',
          whatItDoes: 'Mida see teeb',
          whyItMatters: 'Miks see on oluline',
          howToUse: 'Kuidas kasutada',
          whoFor: 'Kellele sobib',
          specs: 'Tehnilised andmed',
          benefits: 'Peamised kasud',
          pairing: 'Sobib salongihooldusega',
          similar: 'Sarnased tooted',
          viewDetails: 'Vaata detaile',
          notFound: 'Toodet ei leitud',
          notFoundHint: 'See toode võib hetkel olla ajutiselt mitte saadaval.',
          backToHome: 'Tagasi avalehele',
          backToShop: 'Tagasi toodete juurde',
          nav: { home: 'Avaleht', services: 'Teenused', gallery: 'Galerii', shop: 'Pood', contact: 'Kontakt', book: 'Broneeri' },
        };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/products?lang=${language}`);
        if (!response.ok) throw new Error('Failed to load products');
        const data = (await response.json()) as { products?: ProductItem[] };
        if (mounted) setProducts(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (mounted) setProducts([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [language]);

  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const productImages = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) return product.images;
    return product.imageUrl ? [product.imageUrl] : [];
  }, [product]);

  const similarProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((item) => item.id !== product.id)
      .filter((item) => (product.category ? item.category === product.category : true))
      .slice(0, 4);
  }, [products, product]);

  const navCopy = language === 'en' ? { backToHome: 'Back to home' as const, nav: { home: 'Home', services: 'Services', gallery: 'Gallery', shop: 'Shop', contact: 'Contact', book: 'Book now' } } : { backToHome: 'Tagasi avalehele' as const, nav: { home: 'Avaleht', services: 'Teenused', gallery: 'Galerii', shop: 'Pood', contact: 'Kontakt', book: 'Broneeri' } };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff5fa_40%,_#fffafc_100%)]">
        <ShopNavBar language={language} setLanguage={setLanguage} localizePath={localizePath} copy={navCopy} favoritesCount={favoritesCount} />
        <main className="px-4 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl rounded-[28px] border border-[#ecdce7] bg-white/90 p-8">
            <p className="text-sm text-[#7b6979]">{language === 'en' ? 'Loading product...' : 'Laen toodet...'}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff5fa_40%,_#fffafc_100%)]">
        <ShopNavBar language={language} setLanguage={setLanguage} localizePath={localizePath} copy={copy} favoritesCount={favoritesCount} />
        <main className="px-4 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-[#ecdce7] bg-white/90 p-8 text-center">
            <h1 className="text-2xl font-semibold text-[#352b35]">{copy.notFound}</h1>
            <p className="mt-2 text-sm text-[#7b6979]">{copy.notFoundHint}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={localizePath('/')} className="inline-flex items-center gap-2 rounded-xl border border-[#e5c9d9] bg-white px-5 py-2.5 text-sm font-semibold text-[#6a4c64] hover:bg-[#fff2fa]">
                <ArrowLeft className="h-4 w-4" /> {copy.backToHome}
              </Link>
              <button onClick={() => router.push(localizePath('/shop'))} className="rounded-xl bg-[#c24d86] px-5 py-2.5 text-sm font-semibold text-white">
                {copy.backToShop}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff5fa_40%,_#fffafc_100%)]">
      <ShopNavBar language={language} setLanguage={setLanguage} localizePath={localizePath} copy={copy} favoritesCount={favoritesCount} />
      <main className="px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={localizePath('/')}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e8dce4] bg-white px-4 py-2.5 text-sm font-medium text-[#4b5563] shadow-sm hover:bg-[#fdf8fb]"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.backToHome}
            </Link>
            <button
              onClick={() => router.push(localizePath('/shop'))}
              className="rounded-xl border border-[#e5c9d9] bg-white px-4 py-2.5 text-sm font-semibold text-[#6a4c64] hover:bg-[#fff2fa]"
            >
              {copy.backToShop}
            </button>
          </div>

        <section className="grid gap-6 rounded-[30px] border border-[#ecdce7] bg-white/92 p-5 shadow-[0_24px_42px_-30px_rgba(90,55,82,0.35)] lg:grid-cols-12 lg:p-8">
          <div className="space-y-3 lg:col-span-7">
            <div className="relative overflow-hidden rounded-[24px] bg-[#f7ecf3]">
              {productImages[activeImageIndex] ? (
                <Image src={productImages[activeImageIndex]} alt={product.name} width={1200} height={900} unoptimized className="h-[380px] w-full object-cover sm:h-[440px]" />
              ) : (
                <div className="flex h-[380px] items-center justify-center text-[#8f7187]">{product.name}</div>
              )}
            </div>
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {productImages.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative h-20 w-20 overflow-hidden rounded-xl border ${index === activeImageIndex ? 'border-[#c24d86]' : 'border-[#e8d5e1]'}`}
                  >
                    <Image src={imageUrl} alt={`${product.name}-${index + 1}`} width={240} height={240} unoptimized className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#a06f8d]">{product.category ?? 'Aftercare'}</p>
            <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2f2530]">{product.name}</h1>
            <p className="text-sm leading-6 text-[#726272]">{product.description}</p>
            <p className="text-3xl font-semibold tracking-[-0.02em] text-[#b04b80]">EUR {product.price}</p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => addToCart(product.id)}
                className="rounded-full bg-[linear-gradient(120deg,#d4669e_0%,#c24d86_52%,#a93d71_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_22px_34px_-26px_rgba(139,51,100,0.75)]"
              >
                {copy.addToBag}
              </button>
              <button
                onClick={() => router.push(localizePath('/book'))}
                className="rounded-full border border-[#e5c8d8] bg-white px-5 py-2.5 text-sm font-semibold text-[#6a4c64] transition hover:bg-[#fff2fa]"
              >
                {copy.addToBooking}
              </button>
              <button
                onClick={() => toggleFavorite(product.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold ${
                  isFavorite(product.id)
                    ? 'border-[#c24d86] bg-[#fff1f8] text-[#b03f75]'
                    : 'border-[#e5c8d8] bg-white text-[#6a4c64]'
                }`}
              >
                <svg className="h-4 w-4" fill={isFavorite(product.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s-7.5-4.35-9.5-8.6C.9 9.05 2.15 5.5 5.9 5.5c2.1 0 3.4 1.1 4.1 2.15.7-1.05 2-2.15 4.1-2.15 3.75 0 5 3.55 3.4 6.9C19.5 16.65 12 21 12 21z" />
                </svg>
                {language === 'en' ? 'Favourite' : 'Lemmik'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[24px] border border-[#ecdce7] bg-white/92 p-6">
            <h2 className="text-lg font-semibold text-[#302532]">{copy.detailsTitle}</h2>
            <dl className="mt-3 space-y-3 text-sm leading-6 text-[#6f5f70]">
              <div><dt className="font-semibold text-[#3a2f3a]">{copy.whatItDoes}</dt><dd>{product.description}</dd></div>
              <div><dt className="font-semibold text-[#3a2f3a]">{copy.whyItMatters}</dt><dd>{language === 'en' ? 'Helps maintain salon-level finish for longer between appointments.' : 'Aitab hoida salongitulemust kauem kaunina järgmise hoolduseni.'}</dd></div>
              <div><dt className="font-semibold text-[#3a2f3a]">{copy.howToUse}</dt><dd>{language === 'en' ? 'Use daily on clean nails and cuticles for best result.' : 'Kasuta igapäevaselt puhastele küüntele ja küünenahkadele parima tulemuse jaoks.'}</dd></div>
              <div><dt className="font-semibold text-[#3a2f3a]">{copy.whoFor}</dt><dd>{language === 'en' ? 'For clients who want healthier nails and longer-lasting polish look.' : 'Sobib kliendile, kes soovib tervemaid küüsi ja kauem püsivat viimistlust.'}</dd></div>
            </dl>
          </article>

          <article className="rounded-[24px] border border-[#ecdce7] bg-white/92 p-6">
            <h2 className="text-lg font-semibold text-[#302532]">{copy.specs}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#6f5f70]">
              <li>{language === 'en' ? 'Category:' : 'Kategooria:'} {product.category ?? (language === 'en' ? 'Aftercare' : 'Järelhooldus')}</li>
              <li>{language === 'en' ? 'Finish support:' : 'Viimistluse tugi:'} {language === 'en' ? 'Gloss and hydration' : 'Läige ja niisutus'}</li>
              <li>{language === 'en' ? 'Usage frequency:' : 'Kasutussagedus:'} {language === 'en' ? 'Daily or as needed' : 'Igapäevaselt või vastavalt vajadusele'}</li>
            </ul>
            <h3 className="mt-5 text-base font-semibold text-[#302532]">{copy.benefits}</h3>
            <ul className="mt-2 space-y-2 text-sm text-[#6f5f70]">
              <li>{language === 'en' ? 'Supports longer-lasting manicure look' : 'Toetab kauem püsivat maniküüri tulemust'}</li>
              <li>{language === 'en' ? 'Helps keep cuticles balanced' : 'Aitab hoida küünenahad tasakaalus'}</li>
              <li>{language === 'en' ? 'Beauty-routine friendly application' : 'Lihtne lisada igapäevasesse ilurutiini'}</li>
            </ul>
            <h3 className="mt-5 text-base font-semibold text-[#302532]">{copy.pairing}</h3>
            <p className="mt-2 text-sm text-[#6f5f70]">
              {language === 'en'
                ? 'Recommended after gel manicure and maintenance appointments.'
                : 'Soovitatud pärast geelmaniküüri ja hooldusvisiite.'}
            </p>
          </article>
        </section>

        <section className="rounded-[26px] border border-[#ecdce7] bg-white/92 p-6">
          <h2 className="text-xl font-semibold text-[#302532]">{copy.similar}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similarProducts.map((item) => (
              <article key={item.id} className="group overflow-hidden rounded-[20px] border border-[#ecdce7] bg-white">
                <div className="relative h-40 overflow-hidden bg-[#f7ecf3]">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} width={500} height={420} unoptimized className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#8f7187]">{item.name}</div>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.id)}
                    className={`absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white/95 ${
                      isFavorite(item.id) ? 'border-[#c24d86] text-[#c24d86]' : 'border-[#ead6e2] text-[#8f7086]'
                    }`}
                    aria-label={language === 'en' ? 'Toggle favourite' : 'Muuda lemmikut'}
                  >
                    <svg className="h-3.5 w-3.5" fill={isFavorite(item.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s-7.5-4.35-9.5-8.6C.9 9.05 2.15 5.5 5.9 5.5c2.1 0 3.4 1.1 4.1 2.15.7-1.05 2-2.15 4.1-2.15 3.75 0 5 3.55 3.4 6.9C19.5 16.65 12 21 12 21z" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2 p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold text-[#322a33]">{item.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#b04b80]">EUR {item.price}</span>
                    <button
                      onClick={() => router.push(localizePath(`/shop/${item.id}`))}
                      className="rounded-full border border-[#e4c6d7] px-2.5 py-1 text-[11px] font-semibold text-[#6a4c64] transition hover:bg-[#fff3fa]"
                    >
                      {copy.viewDetails}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        </div>
      </main>
    </div>
  );
}

