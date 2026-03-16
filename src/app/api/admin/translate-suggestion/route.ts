import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin-auth';

const replacements: Array<[RegExp, string]> = [
  [/\bküüneõli\b/gi, 'cuticle oil'],
  [/\bmaniküür\b/gi, 'manicure'],
  [/\bpediküür\b/gi, 'pedicure'],
  [/\bhooldus\b/gi, 'care'],
  [/\bparandus\b/gi, 'repair'],
  [/\bkroomviimistlus\b/gi, 'chrome finish'],
  [/\bpikendused\b/gi, 'extensions'],
  [/\bprantsuse\b/gi, 'french'],
  [/\bkirjeldus\b/gi, 'description'],
  [/\bteenus\b/gi, 'service'],
  [/\btoode\b/gi, 'product'],
  [/\bniisutav\b/gi, 'hydrating'],
  [/\bluksuslik\b/gi, 'luxury'],
  [/\bloomulik\b/gi, 'natural'],
  [/\bpüsiv\b/gi, 'long-lasting'],
  [/\bkvaliteetne\b/gi, 'premium'],
];

function suggestEnglish(text: string) {
  let result = text.trim();
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export async function POST(request: Request) {
  const adminUser = await getAdminFromCookies();
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await request.json()) as { text?: string };
  const source = payload.text?.trim();
  if (!source) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, suggestion: suggestEnglish(source) });
}
