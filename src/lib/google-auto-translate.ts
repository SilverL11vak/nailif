const MAX_CACHE_ITEMS = 2000;
const translationCache = new Map<string, string>();

function cacheKey(source: string, target: string, text: string) {
  return `${source}->${target}::${text}`;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => {
      const code = Number(num);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function setCached(key: string, value: string) {
  translationCache.set(key, value);
  if (translationCache.size <= MAX_CACHE_ITEMS) return;

  const oldestKey = translationCache.keys().next().value as string | undefined;
  if (oldestKey) translationCache.delete(oldestKey);
}

export async function autoTranslateText(
  text: string,
  target: 'et' | 'en',
  source: 'et' | 'en'
): Promise<string | null> {
  const input = text.trim();
  if (!input || source === target) return input;

  const key = cacheKey(source, target, input);
  const cached = translationCache.get(key);
  if (cached) return cached;

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        q: input,
        source,
        target,
        format: 'text',
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[translate] Google API failed: ${response.status}`);
      return null;
    }

    const payload = (await response.json()) as {
      data?: { translations?: Array<{ translatedText?: string }> };
    };
    const translated = payload.data?.translations?.[0]?.translatedText?.trim();
    if (!translated) return null;

    const decoded = decodeHtmlEntities(translated);
    setCached(key, decoded);
    return decoded;
  } catch (error) {
    console.error('[translate] Google API request failed', error);
    return null;
  }
}

export async function resolveLocalizedWithAutoTranslate(input: {
  locale: 'et' | 'en';
  et?: string | null;
  en?: string | null;
  fallback?: string | null;
}): Promise<string> {
  const etValue = (input.et ?? '').trim();
  const enValue = (input.en ?? '').trim();
  const fallback = (input.fallback ?? '').trim();

  if (input.locale === 'en') {
    if (enValue) return enValue;
    const sourceText = etValue || fallback;
    if (!sourceText) return '';
    return (await autoTranslateText(sourceText, 'en', 'et')) ?? sourceText;
  }

  if (etValue) return etValue;
  const sourceText = enValue || fallback;
  if (!sourceText) return '';
  return (await autoTranslateText(sourceText, 'et', 'en')) ?? sourceText;
}
