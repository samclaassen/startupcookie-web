#!/usr/bin/env node
// Rebuilds the list on /all-pages/ (all-pages/index.html) from sitemap.xml.
//
//   node scripts/build-all-pages.mjs           update all-pages/index.html
//   node scripts/build-all-pages.mjs --check   change nothing; exit 1 if it is out of date
//
// Every URL in sitemap.xml is listed once, grouped by its first folder (services,
// case-studies, guides, ...); single pages go under "Other". The link text is the
// page's <title> without the "| StartupCookie" suffix, else its <h1>, else the slug.
// Only the part between the all-pages:start / all-pages:end comments is rebuilt,
// plus the shared navigation, mobile menu and footer, which are copied from
// index.html so the page keeps matching the rest of the site.
// Plain Node 18+, no dependencies, no build step.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = 'all-pages/index.html';
const SECTION_ORDER = ['services', 'case-studies', 'guides', 'agencies', 'compare'];
const SHARED_BLOCKS = [
  /<!-- Navigation \(shared[\s\S]*?<\/nav>/,
  /<!-- Mobile Nav Overlay \(shared\)[\s\S]*?<\/ul>\s*<\/div>/,
  /<!-- Footer \(shared[\s\S]*?<\/footer>/,
];
const START = '<!-- all-pages:start -->';
const END = '<!-- all-pages:end -->';

const check = process.argv.includes('--check');
const errors = []; // make --check fail
const warnings = [];
const read = (file) => readFileSync(join(ROOT, file), 'utf8');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] !== '#' ? ENTITIES[e] ?? m : String.fromCodePoint(/x/i.test(e[1]) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));
const text = (html = '') => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const readable = (slug) => { const s = slug.replace(/[-_]+/g, ' '); return s[0].toUpperCase() + s.slice(1); };

// 1. Every URL in sitemap.xml, with the text of its page.
const locs = [...read('sitemap.xml').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decode(m[1]));
const pages = [...new Set(locs)].map((loc) => {
  const url = new URL(loc);
  const parts = url.pathname.split('/').filter(Boolean);
  const rel = decodeURIComponent(url.pathname).slice(1);
  const file = rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel.endsWith('.html') ? rel : `${rel}/index.html`;
  let label = '';
  if (existsSync(join(ROOT, file))) {
    const html = read(file);
    const title = text(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]).replace(/\s+[|–—-]\s+Startup ?Cookie$/i, '');
    label = title || text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
    if (!html.includes('href="/all-pages/"')) errors.push(`${file} has no link to /all-pages/ (copy the footer from another page)`);
  } else {
    errors.push(`${loc} is in sitemap.xml but ${file} does not exist`);
  }
  return { href: url.pathname + url.search, path: url.pathname, parts, file, label: label || (parts.length ? readable(parts.at(-1)) : 'Home') };
});

// 2. Group by first folder. Folders with sub-pages get their own section; the rest is "Other".
const sections = new Set([...SECTION_ORDER, ...pages.filter((p) => p.parts.length > 1).map((p) => p.parts[0])]);
const groups = new Map([...sections, 'other'].map((s) => [s, []]));
for (const p of pages) groups.get(sections.has(p.parts[0]) ? p.parts[0] : 'other').push(p);

const list = [...groups].filter(([, items]) => items.length).map(([key, items]) => [
  '      <section>',
  `        <h2 class="text-[22px] md:text-[28px] leading-[1.2] tracking-[-0.5px] text-black mb-[16px]">${key === 'other' ? 'Other' : escape(readable(key))}</h2>`,
  '        <ul class="font-sans flex flex-col gap-[10px] text-[16px] md:text-[17px] leading-[1.55]">',
  ...items.sort((a, b) => a.parts.length - b.parts.length).map((p) =>
    `          <li><a href="${escape(p.href)}" class="text-blue-link underline hover:opacity-80 transition-opacity"${p.path === '/all-pages/' ? ' aria-current="page"' : ''}>${escape(p.label)}</a></li>`),
  '        </ul>',
  '      </section>',
].join('\n')).join('\n');

// 3. Put the list between the markers and refresh the shared nav, mobile menu and footer.
const current = read(OUT);
const start = current.indexOf(START);
const end = current.indexOf(END);
if (start < 0 || end < start) {
  console.error(`${OUT} needs the ${START} and ${END} comments inside <main>.`);
  process.exit(1);
}
let html = `${current.slice(0, start)}${START}
    <div class="max-w-[900px] flex flex-col gap-[40px] md:gap-[56px]">
${list}
    </div>
    ${current.slice(end)}`;
const home = read('index.html');
for (const block of SHARED_BLOCKS) {
  const shared = home.match(block)?.[0];
  if (shared && block.test(html)) html = html.replace(block, () => shared);
  else warnings.push(`shared block ${block.source.slice(0, 30)}... not found in ${shared ? OUT : 'index.html'}; left as is`);
}

// 4. Report pages that exist but are missing from sitemap.xml (they cannot be listed).
const listed = new Set(pages.map((p) => p.file));
const walk = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((d) =>
  d.name.startsWith('.') || d.name === 'node_modules' ? []
    : d.isDirectory() ? walk(join(dir, d.name))
      : d.name === 'index.html' && !listed.has(join(dir, d.name)) ? [join(dir, d.name)] : []);
for (const file of walk('')) warnings.push(`${file} is not in sitemap.xml, so it is not on /all-pages/`);

for (const msg of [...errors, ...warnings]) console.warn(`warning: ${msg}`);
if (html === current) {
  console.log(`${OUT} is up to date: ${pages.length} pages from sitemap.xml.`);
} else if (check) {
  errors.push('stale');
  console.error(`${OUT} is out of date. Run: node scripts/build-all-pages.mjs`);
} else {
  writeFileSync(join(ROOT, OUT), html);
  console.log(`Updated ${OUT}: ${pages.length} pages from sitemap.xml.`);
}
if (check && errors.length) process.exit(1);
