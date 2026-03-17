import { NextResponse } from 'next/server';
import { ensureCatalogTables, listServices } from '@/lib/catalog';
import { ensureBookingContentTables, listBookingContent } from '@/lib/booking-content';
import { checkRateLimit } from '@/lib/rate-limit';

type Locale = 'et' | 'en';

interface IncomingMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface AssistantRequest {
  locale?: string;
  messages?: IncomingMessage[];
}

interface SimpleService {
  name: string;
  price: number;
  duration: number;
}

interface ParsedReply {
  reply: string;
  handoffSuggested: boolean;
}

interface AIKnowledge {
  specialistName: string;
  specialistRole: string;
  ownerName: string;
  brandAbout: string;
  location: string;
  guideline: string;
}

function normalizeLocale(locale?: string): Locale {
  return locale === 'en' ? 'en' : 'et';
}

function normalizeText(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function maybeDecodeMojibake(input: string) {
  if (!input || !/[\u00C3\u00E2]/.test(input)) return input;
  try {
    const repaired = Buffer.from(input, 'latin1').toString('utf8');
    return repaired || input;
  } catch {
    return input;
  }
}

function fallbackReply(locale: Locale): ParsedReply {
  return {
    reply:
      locale === 'en'
        ? 'I may not have enough context for a precise answer right now.'
        : 'Mul ei pruugi hetkel olla piisavalt konteksti tapselt vastamiseks.',
    handoffSuggested: true,
  };
}

function getAIKnowledge(content: Record<string, string>): AIKnowledge {
  return {
    specialistName: normalizeText(content.ai_knowledge_specialist_name || 'Sandra Samun'),
    specialistRole: normalizeText(content.ai_knowledge_specialist_role || 'Sertifitseeritud kuunetehnik'),
    ownerName: normalizeText(content.ai_knowledge_owner_name || 'Sandra Samun'),
    brandAbout: normalizeText(
      content.ai_knowledge_brand_about ||
        'Nailify on premium kuunehoolduse stuudio, mis keskendub personaalsetele tulemustele.'
    ),
    location: normalizeText(content.ai_knowledge_location || 'Mustamae stuudio, Tallinn'),
    guideline: normalizeText(
      content.ai_knowledge_guideline ||
        'Kui kusimus vajab loplikku kinnitust, suuna klient otse kuunetehnikule.'
    ),
  };
}

function resilientFallbackReply(
  locale: Locale,
  userText: string,
  services: SimpleService[]
): ParsedReply {
  const q = userText.toLowerCase();
  const serviceList = services
    .slice(0, 5)
    .map((service) => `${maybeDecodeMojibake(service.name)} (${service.price} EUR, ${service.duration} min)`)
    .join(', ');

  const asksServices =
    q.includes('teenus') ||
    q.includes('service') ||
    q.includes('pakute') ||
    q.includes('offer') ||
    q.includes('mida teete') ||
    q.includes('what do you do');
  const asksPrice = q.includes('hind') || q.includes('maksab') || q.includes('price') || q.includes('cost');
  const asksTime = q.includes('aeg') || q.includes('slot') || q.includes('available') || q.includes('vaba');
  const asksDesign = q.includes('design') || q.includes('disain') || q.includes('stiil') || q.includes('shape');
  const asksBooking = q.includes('book') || q.includes('booking') || q.includes('broneeri') || q.includes('kuidas');

  if (locale === 'en') {
    if (asksServices && serviceList) {
      return {
        reply: `Our current services include ${serviceList}. You can choose one in booking and then pick your time.`,
        handoffSuggested: false,
      };
    }
    if (asksPrice) {
      return {
        reply: serviceList
          ? `Current prices include ${serviceList}. Exact total depends on selected add-ons.`
          : 'Prices depend on selected service and add-ons. You can see exact prices in booking.',
        handoffSuggested: false,
      };
    }
    if (asksTime) {
      return {
        reply:
          'You can see current available slots in booking. If you need same-day confirmation, you can chat directly with the technician.',
        handoffSuggested: true,
      };
    }
    if (asksDesign) {
      return {
        reply: 'For detailed design and nail condition questions, direct confirmation with the technician is best.',
        handoffSuggested: true,
      };
    }
    if (asksBooking) {
      return {
        reply:
          'Booking is quick: choose service, choose time, add your details, then confirm. You can always adjust before final confirmation.',
        handoffSuggested: false,
      };
    }
    return {
      reply: serviceList
        ? `I can help with services, prices and booking times. Currently available: ${serviceList}.`
        : 'I can help with booking steps, services and timing.',
      handoffSuggested: false,
    };
  }

  if (asksServices && serviceList) {
    return {
      reply: `Teenused sisaldavad: ${serviceList}. Vali sobiv teenus ja seejarel saad valida aja.`,
      handoffSuggested: false,
    };
  }
  if (asksPrice) {
    return {
      reply: serviceList
        ? `Praegused hinnad: ${serviceList}. Loplik summa soltub valitud lisadest.`
        : 'Hind soltub valitud teenusest ja lisadest. Tapse hinna naed broneerimise vaates.',
      handoffSuggested: false,
    };
  }
  if (asksTime) {
    return {
      reply:
        'Vabu aegu naed broneerimise vaates. Kui vajad kohest kinnitust tana, saad suhelda otse kuunetehnikuga.',
      handoffSuggested: true,
    };
  }
  if (asksDesign) {
    return {
      reply:
        'Tapsete disaini- ja kuunte seisukorra kusimuste puhul on koige parem kinnitada otse tehnikuga.',
      handoffSuggested: true,
    };
  }
  if (asksBooking) {
    return {
      reply:
        'Broneerimine on lihtne: vali teenus, vali aeg, lisa andmed ja kinnita. Soovi korral saad enne loppu valikut muuta.',
      handoffSuggested: false,
    };
  }
  return {
    reply: serviceList
      ? `Saan aidata teenuste, hindade ja aegadega. Praegu saadaval: ${serviceList}. Kui soovid, utle millist teenust kaalud ja soovitan sobiva aja.`
      : 'Saan aidata broneerimise sammude, teenuste ja aegadega.',
    handoffSuggested: false,
  };
}

function parseModelPayload(text: string): ParsedReply {
  const source = normalizeText(maybeDecodeMojibake(text));
  if (!source) return { reply: '', handoffSuggested: true };
  const needsHumanMatch = source.match(/NEEDS_HUMAN\s*:\s*(yes|no)/i);
  const replyMatch = source.match(/REPLY\s*:\s*([\s\S]*)$/i);
  return {
    reply: normalizeText(replyMatch?.[1] ?? source),
    handoffSuggested: (needsHumanMatch?.[1] ?? 'yes').toLowerCase() !== 'no',
  };
}

function extractChatCompletionText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  const payloadError = record.error;
  if (payloadError && typeof payloadError === 'object') {
    const message = (payloadError as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      throw new Error(`Provider error: ${message}`);
    }
  }

  const choices = record.choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const first = choices[0];
  if (!first || typeof first !== 'object') return '';

  const legacyText = (first as Record<string, unknown>).text;
  if (typeof legacyText === 'string' && legacyText.trim().length > 0) return legacyText.trim();

  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') return '';

  const content = (message as Record<string, unknown>).content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const merged = content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (!part || typeof part !== 'object') return '';
        const partText = (part as Record<string, unknown>).text;
        return typeof partText === 'string' ? partText : '';
      })
      .join('\n')
      .trim();
    if (merged) return merged;
  }

  const reasoning = (message as Record<string, unknown>).reasoning;
  if (typeof reasoning === 'string' && reasoning.trim()) return reasoning.trim();
  return '';
}

function payloadSignature(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 'payload:not-object';
  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record).slice(0, 12);
  const choices = record.choices;
  const firstChoiceKeys =
    Array.isArray(choices) && choices.length > 0 && choices[0] && typeof choices[0] === 'object'
      ? Object.keys(choices[0] as Record<string, unknown>).slice(0, 10)
      : [];
  return `keys=${keys.join(',')} firstChoiceKeys=${firstChoiceKeys.join(',')}`;
}

function intentAnswer(
  locale: Locale,
  text: string,
  services: SimpleService[],
  knowledge: AIKnowledge
): ParsedReply | null {
  const q = text.toLowerCase();
  const isGreeting =
    q === 'tere' ||
    q === 'hei' ||
    q === 'hello' ||
    q === 'hi' ||
    q.startsWith('tere ') ||
    q.startsWith('hello ') ||
    q.startsWith('hi ');
  const asksServices =
    q.includes('teenus') ||
    q.includes('service') ||
    q.includes('pakute') ||
    q.includes('offer') ||
    q.includes('mida teete') ||
    q.includes('what do you do');
  const asksPrice = q.includes('hind') || q.includes('maksab') || q.includes('price') || q.includes('cost');
  const asksTime = q.includes('aeg') || q.includes('slot') || q.includes('available') || q.includes('vaba');
  const asksOwner =
    q.includes('omanik') || q.includes('owner') || q.includes('kes omanik') || q.includes('who owns');
  const asksSpecialist =
    q.includes('kes teeb') || q.includes('who does') || q.includes('tehnik') || q.includes('specialist');
  const asksBrand =
    q.includes('mis on nailify') ||
    q.includes('what is nailify') ||
    q.includes('ettevote') ||
    q.includes('about nailify');

  if (isGreeting) {
    return locale === 'en'
      ? {
          reply: 'Hi! I can help with services, prices and booking times. What would you like to know first?',
          handoffSuggested: false,
        }
      : {
          reply: 'Tere! Aitan teenuste, hindade ja aegadega. Mida soovid esimesena teada?',
          handoffSuggested: false,
        };
  }

  if (asksOwner) {
    return locale === 'en'
      ? { reply: `Nailify is operated by ${knowledge.ownerName}.`, handoffSuggested: false }
      : { reply: `Nailify omanik on ${knowledge.ownerName}.`, handoffSuggested: false };
  }
  if (asksSpecialist) {
    return locale === 'en'
      ? {
          reply: `Your appointment is handled by ${knowledge.specialistName} (${knowledge.specialistRole}) at ${knowledge.location}.`,
          handoffSuggested: false,
        }
      : {
          reply: `Sinu hooldust teeb ${knowledge.specialistName} (${knowledge.specialistRole}) asukohas ${knowledge.location}.`,
          handoffSuggested: false,
        };
  }
  if (asksBrand) {
    return locale === 'en'
      ? { reply: `${knowledge.brandAbout} Location: ${knowledge.location}.`, handoffSuggested: false }
      : { reply: `${knowledge.brandAbout} Asukoht: ${knowledge.location}.`, handoffSuggested: false };
  }

  if (!(asksServices || asksPrice || asksTime)) return null;
  return resilientFallbackReply(locale, text, services);
}

export async function POST(request: Request) {
  // Rate limit check - strict limit due to AI API costs
  const rateLimit = checkRateLimit('ai', request.headers);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter ?? 60) } }
    );
  }

  try {
    const body = (await request.json()) as AssistantRequest;
    const locale = normalizeLocale(body.locale);
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = rawMessages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .map((m) => ({ role: m.role, text: normalizeText(String(m.text ?? '')) }))
      .filter((m) => m.text.length > 0)
      .slice(-8);
    const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.text ?? '';

    if (messages.length === 0) {
      const fallback = fallbackReply(locale);
      return NextResponse.json({ ok: true, ...fallback });
    }

    await ensureCatalogTables();
    await ensureBookingContentTables();
    const services = await listServices(locale);
    const bookingContent = await listBookingContent(locale);
    const knowledge = getAIKnowledge(bookingContent as Record<string, string>);

    const direct = intentAnswer(locale, lastUserText, services, knowledge);
    if (direct) {
      return NextResponse.json({ ok: true, ...direct });
    }

    const provider = (process.env.AI_PROVIDER || '').trim().toLowerCase();
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const useOpenRouter = provider === 'openrouter' || (!provider && !!openRouterKey);
    if (!openRouterKey || !useOpenRouter) {
      const fallback = resilientFallbackReply(locale, lastUserText, services);
      return NextResponse.json({ ok: true, ...fallback });
    }

    const serviceContext = services
      .slice(0, 12)
      .map((service) => `- ${maybeDecodeMojibake(service.name)}: ${service.price} EUR, ${service.duration} min`)
      .join('\n');

    const systemPrompt =
      locale === 'en'
        ? `You are Nailify's booking assistant for a nail salon in Mustamae, Tallinn.
Respond in English.
Keep answers concise (1-3 short sentences), warm and practical.
Use only known context. Never invent exact availability.
If user asks for final confirmation, complex custom design, or uncertain situation, set NEEDS_HUMAN: yes.
If user asks simple questions (services, pricing logic, booking steps), set NEEDS_HUMAN: no.
Known services:
${serviceContext || '- Services are available in booking view.'}
Business context:
- Specialist: ${knowledge.specialistName} (${knowledge.specialistRole})
- Owner: ${knowledge.ownerName}
- Location: ${knowledge.location}
- About brand: ${knowledge.brandAbout}
- Rule: ${knowledge.guideline}

Return strictly in this format:
NEEDS_HUMAN: yes|no
REPLY: <assistant answer>`
        : `Sa oled Nailify broneerimisassistent Mustamae stuudiole Tallinnas.
Vasta eesti keeles.
Hoia vastused luhikesed (1-3 lauset), soojad ja praktilised.
Kasuta ainult teadaolevat konteksti. Ara motle valja tapseid vabu aegu.
Kui kasutaja vajab loplikku kinnitust, keerulist disainisoovitust voi olukord on ebaselge, pane NEEDS_HUMAN: yes.
Kui kusimus on lihtne (teenused, hinnaloogika, broneerimise sammud), pane NEEDS_HUMAN: no.
Teadaolevad teenused:
${serviceContext || '- Teenused on nahtavad broneerimisvaates.'}
Taustakontekst:
- Spetsialist: ${knowledge.specialistName} (${knowledge.specialistRole})
- Omanik: ${knowledge.ownerName}
- Asukoht: ${knowledge.location}
- Brandi kirjeldus: ${knowledge.brandAbout}
- Reegel: ${knowledge.guideline}

Tagasta rangelt selles formaadis:
NEEDS_HUMAN: yes|no
REPLY: <assistendi vastus>`;

    const openRouterModel = process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.5:free';
    const openRouterFallbackModel =
      process.env.OPENROUTER_FALLBACK_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';

    async function callOpenRouter(modelName: string) {
      const response = await fetch(
        process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openRouterKey}`,
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://nailif.vercel.app',
            'X-Title': process.env.OPENROUTER_APP_NAME || 'Nailify Assistant',
          },
          body: JSON.stringify({
            model: modelName,
            temperature: 0.35,
            max_tokens: 220,
            reasoning: { exclude: true },
            messages: [{ role: 'system', content: systemPrompt }, ...messages.map((m) => ({ role: m.role, content: m.text }))],
          }),
          signal: AbortSignal.timeout(12000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('POST /api/assistant-chat OpenRouter error:', response.status, modelName, errorText);
        return { text: '' };
      }

      const payload = (await response.json()) as unknown;
      const text = extractChatCompletionText(payload);
      if (!text.trim()) {
        console.error(
          `POST /api/assistant-chat OpenRouter empty text payload signature (model=${modelName}):`,
          payloadSignature(payload)
        );
      }
      return { text };
    }

    let text = (await callOpenRouter(openRouterModel)).text;

    if (!text.trim() && openRouterFallbackModel && openRouterFallbackModel !== openRouterModel) {
      text = (await callOpenRouter(openRouterFallbackModel)).text;
    }

    if (!text.trim()) {
      const fallback = resilientFallbackReply(locale, lastUserText, services);
      return NextResponse.json({ ok: true, ...fallback });
    }

    const parsed = parseModelPayload(text);
    const replyLooksBroken =
      !parsed.reply ||
      parsed.reply.length < 14 ||
      (/^[\p{L}\p{N}\s,:.\-!?]+$/u.test(parsed.reply) && !/[.!?]$/.test(parsed.reply) && parsed.reply.length < 28);

    const finalReply = replyLooksBroken
      ? resilientFallbackReply(locale, lastUserText, services).reply
      : parsed.reply;

    return NextResponse.json({ ok: true, reply: finalReply, handoffSuggested: parsed.handoffSuggested });
  } catch (error) {
    console.error('POST /api/assistant-chat error:', error);
    const fallback = fallbackReply('et');
    return NextResponse.json({ ok: true, ...fallback });
  }
}

