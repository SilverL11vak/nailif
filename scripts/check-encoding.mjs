import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoot = path.join(root, 'src');
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md']);

// Common mojibake fragments seen when UTF-8 text gets re-saved through the wrong code page.
const suspiciousTokens = [
  'Ć',
  'Å',
  'Ã',
  'â€™',
  'â€œ',
  'â€',
  'â€“',
  'â€”',
  'p?s',
  'k??',
  'Mustam?e',
  'J?rgmine',
];

const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      walk(fullPath);
      continue;
    }

    if (!exts.has(path.extname(entry.name))) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (suspiciousTokens.some((token) => line.includes(token))) {
        findings.push({
          file: path.relative(root, fullPath),
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  }
}

if (fs.existsSync(scanRoot)) {
  walk(scanRoot);
}

if (findings.length > 0) {
  console.error('Encoding check failed. Suspicious mojibake-like text found:\n');
  findings.slice(0, 80).forEach((finding) => {
    console.error(`${finding.file}:${finding.line}: ${finding.text}`);
  });
  if (findings.length > 80) {
    console.error(`\n...and ${findings.length - 80} more`);
  }
  process.exit(1);
}

console.log('Encoding check passed.');
