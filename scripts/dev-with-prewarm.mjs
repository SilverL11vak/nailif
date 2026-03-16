import { spawn } from 'node:child_process';

const port = process.env.PORT || '3003';
const host = process.env.PREWARM_HOST || 'http://localhost';
const baseUrl = `${host}:${port}`;

const endpoints = [
  '/api/services?lang=et',
  '/api/products?lang=et',
  '/api/slots?days=7&lang=et',
  '/api/booking-content?lang=et',
  '/api/booking-addons?lang=et',
  '/api/gallery',
  '/et',
  '/et/book',
];

let didPrewarm = false;

async function prewarm() {
  const startedAt = Date.now();
  const results = [];

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    const oneStart = Date.now();
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'x-prewarm': '1' },
      });
      results.push({
        endpoint,
        ok: response.ok,
        status: response.status,
        ms: Date.now() - oneStart,
      });
    } catch (error) {
      results.push({
        endpoint,
        ok: false,
        status: 0,
        ms: Date.now() - oneStart,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const totalMs = Date.now() - startedAt;
  const okCount = results.filter((item) => item.ok).length;
  const failCount = results.length - okCount;

  process.stdout.write(
    `\n[prewarm] Completed in ${totalMs}ms (${okCount} ok, ${failCount} failed)\n`
  );
  for (const row of results) {
    const status = row.ok ? `${row.status}` : `ERR${row.status ? `:${row.status}` : ''}`;
    process.stdout.write(
      `[prewarm] ${status} ${row.endpoint} (${row.ms}ms)${
        row.error ? ` - ${row.error}` : ''
      }\n`
    );
  }
}

const child =
  process.platform === 'win32'
    ? spawn(`npx next dev -p ${port}`, {
        env: process.env,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
      })
    : spawn('npx', ['next', 'dev', '-p', port], {
        env: process.env,
        stdio: ['inherit', 'pipe', 'pipe'],
      });

child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  if (!didPrewarm && text.includes('Ready in')) {
    didPrewarm = true;
    prewarm().catch((error) => {
      process.stderr.write(
        `[prewarm] Failed: ${error instanceof Error ? error.message : String(error)}\n`
      );
    });
  }
});

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk.toString());
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
