import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type LocaleCode } from '@/lib/i18n/locale-path';

const localeMeta: Record<LocaleCode, { title: string; description: string }> = {
  et: {
    title: 'Nailify - Premium küünehooldus Tallinnas',
    description: 'Broneeri kvaliteetne küünehooldus Mustamäe stuudios. Kiire broneerimine, premium tulemus.',
  },
  en: {
    title: 'Nailify - Premium Nail Care in Tallinn',
    description: 'Book premium nail care in our Mustamäe studio. Fast booking, elegant results.',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const meta = localeMeta[locale];

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        et: '/et',
        en: '/en',
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return children;
}
