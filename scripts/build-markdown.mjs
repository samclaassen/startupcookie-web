#!/usr/bin/env node
// Builds a markdown copy of every page in sitemap.xml, plus /llms-full.txt.
//
//   node scripts/build-markdown.mjs           write the .md files and llms-full.txt
//   node scripts/build-markdown.mjs --check   write nothing; exit 1 if a page can't be converted
//
// Vercel runs this on every deploy (vercel.json → buildCommand), so the markdown
// always matches the HTML that ships. Nothing it writes is committed (.gitignore).
//
//   /                         → /index.md
//   /case-studies/tofu/       → /case-studies/tofu.md
//
// Each .md file holds the page's main content: everything between the shared mobile
// menu and the shared footer, minus navigation, buttons and scripts. Same words as
// the HTML, nothing added except the page description and its canonical URL.
// Every HTML page also gets <link rel="alternate" type="text/markdown"> in its <head>.
// .md files are served noindex (vercel.json headers) and stay out of sitemap.xml,
// so the HTML page remains the one search engines index and AI answers cite.
//
// Adding a page needs nothing extra: add it to sitemap.xml (see EDITING.md) and its
// markdown copy is built on the next deploy.
// Plain Node 18+, no dependencies.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://startupcookie.com';
const CONTENT_START = /<!-- Mobile Nav Overlay \(shared\)[\s\S]*?<\/ul>\s*<\/div>/;
const CONTENT_END = '<!-- Footer (shared';

const check = process.argv.includes('--check');
const read = (file) => readFileSync(join(ROOT, file), 'utf8');
const errors = [];

// ---------- HTML → tree ----------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', middot: '·', rarr: '→', larr: '←', times: '×', copy: '©', reg: '®', trade: '™', bull: '•', deg: '°', eacute: 'é' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] !== '#' ? ENTITIES[e.toLowerCase()] ?? m : String.fromCodePoint(/x/i.test(e[1]) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const SKIP = new Set(['script', 'style', 'noscript', 'svg', 'nav', 'button', 'form', 'template', 'head', 'input', 'select', 'textarea', 'iframe']);
const INLINE = new Set(['a', 'span', 'strong', 'b', 'em', 'i', 'u', 'code', 'small', 'sup', 'sub', 'abbr', 'time', 'mark', 'label', 'img', 'br', 'cite', 'q', 's', 'del', 'ins', 'wbr']);

function parse(html) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+|<)/g;
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[4] !== undefined) { top.children.push({ text: decode(m[4]) }); continue; }
    if (!m[2]) continue; // comment
    const tag = m[2].toLowerCase();
    if (m[1]) { // closing tag: pop to the matching element, if open
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const attrs = {};
    for (const a of m[3].matchAll(/([^\s=/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+))?/g)) {
      attrs[a[1].toLowerCase()] = decode(a[3] ?? a[4] ?? (a[2] || ''));
    }
    const node = { tag, attrs, children: [] };
    top.children.push(node);
    if (tag === 'script' || tag === 'style') { // raw text: skip to the closing tag
      const close = html.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
      re.lastIndex = close < 0 ? html.length : close;
      continue;
    }
    if (!VOID.has(tag) && !/\/\s*$/.test(m[3])) stack.push(node);
  }
  return root;
}

// ---------- tree → markdown ----------

const abs = (href, base) => {
  if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return href.startsWith('#') ? base + href : href;
  try { return new URL(href, base).href; } catch { return href; }
};
const isBlock = (n) => n.tag && !INLINE.has(n.tag);
const hasBlock = (n) => (n.children || []).some((c) => isBlock(c) && !SKIP.has(c.tag) || (c.tag && hasBlock(c)));
const squash = (s) => s.replace(/[ \t\r\n]+/g, ' ');
const mdEscape = (s) => s.replace(/([\\`*_\[\]])/g, '\\$1');
// Text that would read as a heading, quote or list item at the start of a paragraph.
const escapeStart = (s) => s.replace(/^(#{1,6} |>|[-+] |\d+\. )/, '\\$1');

function inline(nodes, base) {
  let out = '';
  for (const n of nodes) {
    if (n.text !== undefined) { out += mdEscape(squash(n.text)); continue; }
    if (SKIP.has(n.tag)) continue;
    const inner = () => inline(n.children, base);
    switch (n.tag) {
      case 'br': out += '  \n'; break;
      case 'strong': case 'b': { const t = inner().trim(); if (t) out += wrapWs(inner(), `**${t}**`); break; }
      case 'em': case 'i': case 'cite': { const t = inner().trim(); if (t) out += wrapWs(inner(), `*${t}*`); break; }
      case 'code': out += '`' + textOf(n) + '`'; break;
      case 'img': { // icons and logos (SVG) become their alt text; photos and charts stay images
        const alt = n.attrs.alt?.trim();
        if (alt) out += /\.svg($|\?)/i.test(n.attrs.src || '') ? ` ${mdEscape(alt)} ` : `![${mdEscape(alt)}](${abs(n.attrs.src, base)})`;
        break;
      }
      case 'a': {
        const t = inner().trim();
        const href = abs(n.attrs.href || '', base);
        if (!t) break;
        out += href ? wrapWs(inner(), `[${t}](${href})`) : inner();
        break;
      }
      default: out += isBlock(n) ? ' ' + inner() + ' ' : inner();
    }
  }
  return out;
}
const wrapWs = (raw, s) => (/^\s/.test(raw) ? ' ' : '') + s + (/\s$/.test(raw) ? ' ' : '');
const textOf = (n) => n.text !== undefined ? n.text : (n.children || []).map(textOf).join('');
const tidy = (s) => s.replace(/ *\n */g, '\n').replace(/[ \t]+/g, ' ').replace(/^ | $/g, '').replace(/ {2}\n/g, '  \n');
const isHidden = (n) => n.attrs && ('hidden' in n.attrs || n.attrs['aria-hidden'] === 'true');

// Returns markdown blocks (strings) for a node's children.
function blocks(nodes, base, ctx = {}) {
  const out = [];
  let buf = [];
  const flush = () => {
    const t = escapeStart(tidy(inline(buf, base)).trim());
    if (t) out.push(t);
    buf = [];
  };
  for (const n of nodes) {
    if (n.text !== undefined || (INLINE.has(n.tag) && !hasBlock(n))) { buf.push(n); continue; }
    if (SKIP.has(n.tag) || isHidden(n)) continue;
    flush();
    out.push(...block(n, base, ctx));
  }
  flush();
  return out;
}

function block(n, base, ctx) {
  const t = n.tag;
  if (/^h[1-6]$/.test(t)) {
    const text = tidy(inline(n.children, base)).trim().replace(/\n+/g, ' ');
    return text ? [`${'#'.repeat(Math.max(Number(t[1]), ctx.minHeading || 1))} ${text}`] : [];
  }
  if (t === 'ul' || t === 'ol') {
    const items = n.children.filter((c) => c.tag === 'li');
    const lines = items.map((li, i) => {
      const marker = t === 'ol' ? `${i + 1}. ` : '- ';
      const inner = blocks(li.children, base, ctx).join('\n\n');
      if (!inner) return null;
      return marker + inner.replace(/\n/g, '\n' + ' '.repeat(marker.length));
    }).filter(Boolean);
    return lines.length ? [lines.join('\n')] : [];
  }
  if (t === 'blockquote') {
    const inner = blocks(n.children, base, ctx).join('\n\n');
    return inner ? [inner.split('\n').map((l) => (l ? '> ' + l : '>')).join('\n')] : [];
  }
  if (t === 'pre') return ['```\n' + textOf(n).replace(/\n$/, '') + '\n```'];
  if (t === 'hr') return ['---'];
  if (t === 'table') return [table(n, base)].filter(Boolean);
  if (t === 'details') {
    const summary = n.children.find((c) => c.tag === 'summary');
    const rest = n.children.filter((c) => c !== summary);
    const q = summary ? tidy(inline(summary.children, base)).trim() : '';
    return [...(q ? [`### ${q}`] : []), ...blocks(rest, base, ctx)];
  }
  if (t === 'a') { // a link wrapping a card: link its heading (or first block) instead
    const href = abs(n.attrs.href || '', base);
    const inner = blocks(n.children, base, ctx);
    if (!href || !inner.length) return inner;
    const i = Math.max(0, inner.findIndex((b) => /^#{1,6} /.test(b)));
    const m = inner[i].match(/^(#{1,6} )?([\s\S]*)$/);
    if (!/\]\(/.test(m[2])) inner[i] = (m[1] || '') + `[${m[2]}](${href})`;
    return inner;
  }
  return blocks(n.children, base, ctx);
}

function table(n, base) {
  const rows = [];
  (function walk(x) { for (const c of x.children || []) { if (c.tag === 'tr') rows.push(c); else if (c.tag) walk(c); } })(n);
  const cells = rows.map((r) => r.children.filter((c) => c.tag === 'td' || c.tag === 'th')
    .map((c) => tidy(blocks(c.children, base).join(' ')).replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim()));
  if (!cells.length) return '';
  const width = Math.max(...cells.map((r) => r.length));
  const pad = (r) => [...r, ...Array(width - r.length).fill('')];
  const line = (r) => `| ${pad(r).join(' | ')} |`;
  return [line(cells[0]), line(Array(width).fill('---')), ...cells.slice(1).map(line)].join('\n');
}

// ---------- pages ----------

const sitemap = read('sitemap.xml');
const entries = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => ({ loc: decode(m[1]) }));

const mdPathFor = (pathname) => (pathname === '/' ? '/index.md' : pathname.replace(/\/$/, '') + '.md');
const meta = (html, name) => decode(html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, 'i'))?.[1] || '');

const pages = [];
for (const { loc } of [...new Map(entries.map((e) => [e.loc, e])).values()]) {
  const url = new URL(loc);
  const rel = decodeURIComponent(url.pathname).slice(1);
  const file = rel === '' || rel.endsWith('/') ? `${rel}index.html` : `${rel}/index.html`;
  if (!existsSync(join(ROOT, file))) { errors.push(`${loc}: ${file} does not exist`); continue; }
  const html = read(file);
  const start = html.match(CONTENT_START);
  const end = html.indexOf(CONTENT_END);
  if (!start || end < 0) { errors.push(`${file}: shared mobile menu or footer comment not found, can't find the main content`); continue; }
  const body = html.slice(start.index + start[0].length, end);
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  const description = meta(html, 'description');
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1] || loc;

  let content = blocks(parse(body).children, canonical);
  const h1 = content.findIndex((b) => /^# /.test(b));
  const heading = h1 >= 0 ? content[h1] : `# ${title.replace(/\s+[|–—-]\s+Startup ?Cookie$/i, '')}`;
  if (h1 >= 0) content.splice(h1, 1);
  const md = [
    heading,
    ...(description ? [`> ${description}`] : []),
    `Canonical: ${canonical}`,
    ...content,
  ].join('\n\n').replace(/\n{3,}/g, '\n\n') + '\n';

  if (content.join('').length < 200) errors.push(`${file}: markdown has almost no content (${content.join('').length} chars)`);
  pages.push({ loc, file, canonical, title, mdPath: mdPathFor(url.pathname), md, html });
}

// ---------- write ----------

const today = new Date().toISOString().slice(0, 10);
const llms = read('llms.txt');
const intro = llms.split('\n## ')[0].trim();
const full = [
  intro.replace(/^# .*/, (h) => `${h} - full site content`),
  `Every page on ${SITE}, as markdown. Each page also has its own copy: replace the trailing slash of a page URL with .md (homepage: ${SITE}/index.md).\nGenerated: ${today}`,
  ...pages.map((p) => p.md.trim()),
].join('\n\n---\n\n') + '\n';

for (const p of pages) {
  const link = `<link rel="alternate" type="text/markdown" href="${SITE}${p.mdPath}">`;
  if (check) continue;
  writeFileSync(join(ROOT, p.mdPath.slice(1)), p.md);
  if (!p.html.includes('type="text/markdown"')) {
    writeFileSync(join(ROOT, p.file), p.html.replace(/(<link\s+rel="canonical"[^>]*>)/i, `$1\n  ${link}`));
  }
}
if (!check) writeFileSync(join(ROOT, 'llms-full.txt'), full);
// With a build step Vercel publishes the whole folder; without one it hid README.md.
// Keep it hidden. Only on Vercel (VERCEL=1), never on someone's own machine.
if (!check && process.env.VERCEL === '1') rmSync(join(ROOT, 'README.md'), { force: true });

// llms.txt should link the markdown copy of every page it lists.
for (const m of llms.matchAll(/https:\/\/startupcookie\.com(\/[^\s)]*)/g)) {
  const path = m[1];
  if (path.endsWith('.md') && !pages.some((p) => p.mdPath === path)) errors.push(`llms.txt links ${path}, which is not built (page missing from sitemap.xml?)`);
}

console.log(`${check ? 'Checked' : 'Built'} ${pages.length} markdown pages, llms-full.txt ${full.length.toLocaleString('en-US')} chars.`);
if (full.length > 500_000) console.warn('Warning: llms-full.txt is over 500k chars.');
// On deploy, problems are printed but never block the site from going live.
for (const e of errors) console.error(`${check ? 'Error' : 'Warning'}: ${e}`);
if (check && errors.length) process.exit(1);
