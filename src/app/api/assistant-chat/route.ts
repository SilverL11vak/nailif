import { NextResponse } from 'next/server';
import { ensureCatalogTables, listServices } from '@/lib/catalog';

type Locale = 'et' | 'en';

interface IncomingMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface AssistantRequest {
  locale?: string;
  messages?: IncomingMessage[];
}

function normalizeLocale(locale?: string): Locale {
  return locale === 'en' ? 'en' : 'et';
}

function fallbackReply(locale: Locale) {
  return {
    reply:
      locale === 'en'
        ? 'I may not have enough context for a precise answer right now.'
        : 'Mul ei pruugi hetkel olla piisavalt konteksti tapselt vastamiseks.',
    handoffSuggested: true,
  };
}

function quotaReply(locale: Locale) {
  return {
    reply:
      locale === 'en'
        ? 'Our AI assistant is temporarily unavailable. You can chat directly with the technician right now.'
        : 'AI assistent on ajutiselt pausil. Soovi korral saad kohe otse küünetehnikuga suhelda.',
    handoffSuggested: true,
  };
}

function parseModelPayload(text: string | null | undefined) {
  const source = (text ?? '').trim();
  if (!source) return { reply: '', handoffSuggested: true };

  const needsHumanMatch = source.match(/NEEDS_HUMAN\s*:\s*(yes|no)/i);
  const replyMatch = source.match(/REPLY\s*:\s*([\s\S]*)$/i);

  return {
    reply: (replyMatch?.[1] ?? source).trim(),
    handoffSuggested: (needsHumanMatch?.[1] ?? 'yes').toLowerCase() !== 'no',
  };
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;

  const outputText = record.output_text;
  if (typeof outputText === 'string' && outputText.trim().length > 0) {
    return outputText.trim();
  }

  const output = record.output;
  if (!Array.isArray(output)) return '';

  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string' && text.trim().length > 0) return text.trim();
    }
  }

  return '';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AssistantRequest;
    const locale = normalizeLocale(body.locale);
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = rawMessages
      .filter((message) => message && (message.role === 'user' || message.role === 'assistant'))
      .map((message) => ({
        role: message.role,
        text: String(message.text ?? '').trim(),
      }))
      .filter((message) => message.text.length > 0)
      .slice(-8);

    if (messages.length === 0) {
      return NextResponse.json({ ok: true, ...fallbackReply(locale) });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: true, ...fallbackReply(locale) });
    }

    await ensureCatalogTables();
    const services = await listServices(locale);
    const serviceContext = services
      .slice(0, 12)
      .map((service) => `- ${service.name}: ${service.price}€, ${service.duration} min`)
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

Return strictly in this format:
NEEDS_HUMAN: yes|no
REPLY: <assistant answer>`
        : `Sa oled Nailify broneerimisassistent Mustamae stuudiole Tallinnas.
Vasta eesti keeles.
Hoia vastused luhikesed (1-3 lauset), soojad ja praktilised.
Kasuta ainult teadaolevat konteksti. Ara motle valja taitseid vabu aegu.
Kui kasutaja vajab loplikku kinnitust, keerulist disainisoovitust voi olukord on ebaselge, pane NEEDS_HUMAN: yes.
Kui kusimus on lihtne (teenused, hinnaloogika, broneerimise sammud), pane NEEDS_HUMAN: no.
Teadaolevad teenused:
${serviceContext || '- Teenused on nähtavad broneerimisvaates.'}

Tagasta rangelt selles formaadis:
NEEDS_HUMAN: yes|no
REPLY: <assistendi vastus>`;

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    const input = [
      {
        role: 'system',
        content: [{ type: 'input_text', text: systemPrompt }],
      },
      ...messages.map((message) => ({
        role: message.role,
        content: [{ type: 'input_text', text: message.text }],
      })),
    ];

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_output_tokens: 220,
        input,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('POST /api/assistant-chat OpenAI error:', response.status, errorText);
      if (response.status === 429) {
        return NextResponse.json({ ok: true, ...quotaReply(locale) });
      }
      return NextResponse.json({ ok: true, ...fallbackReply(locale) });
    }

    const payload = (await response.json()) as unknown;
    const text = extractOutputText(payload);
    const parsed = parseModelPayload(text);
    const reply = parsed.reply || fallbackReply(locale).reply;

    return NextResponse.json({
      ok: true,
      reply,
      handoffSuggested: parsed.handoffSuggested,
    });
  } catch (error) {
    console.error('POST /api/assistant-chat error:', error);
    return NextResponse.json({ ok: true, ...fallbackReply('et') });
  }
}
