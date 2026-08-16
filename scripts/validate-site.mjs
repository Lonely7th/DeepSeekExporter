import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const ignored = new Set(['.git', 'node_modules']);
const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html') && !entry.name.startsWith('baidu_verify_codeva-')) htmlFiles.push(full);
  }
}
walk(root);

const errors = [];
const warnings = [];
const titles = new Map();
const canonicals = new Map();
const internalTargets = new Set();
const get = (html, re) => html.match(re)?.[1]?.trim();

for (const file of htmlFiles) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const html = fs.readFileSync(file, 'utf8');
  const is404 = rel === '404.html';
  const title = get(html, /<title>([^<]+)<\/title>/i);
  const description = get(html, /<meta\s+name="description"\s+content="([^"]+)"/i);
  const canonical = get(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (!title) errors.push(`${rel}: missing title`);
  if (!is404 && !description) errors.push(`${rel}: missing description`);
  if (!is404 && !canonical) errors.push(`${rel}: missing canonical`);
  if (h1Count !== 1) errors.push(`${rel}: expected one h1, found ${h1Count}`);
  if (title) {
    if (titles.has(title)) errors.push(`${rel}: duplicate title with ${titles.get(title)}`);
    titles.set(title, rel);
  }
  if (canonical) {
    if (!canonical.startsWith('https://www.aibusgo.com/')) errors.push(`${rel}: canonical uses wrong host`);
    if (canonicals.has(canonical)) errors.push(`${rel}: duplicate canonical with ${canonicals.get(canonical)}`);
    canonicals.set(canonical, rel);
  }
  if (!is404) {
    for (const key of ['og:title', 'og:description', 'og:url', 'og:image']) {
      if (!html.includes(`property="${key}"`)) errors.push(`${rel}: missing ${key}`);
    }
    for (const key of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      if (!html.includes(`name="${key}"`)) errors.push(`${rel}: missing ${key}`);
    }
  }
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const url = match[1].split(/[?#]/)[0];
    if (!url || url === '/') continue;
    internalTargets.add(url);
    const local = path.join(root, decodeURIComponent(url));
    const exists = fs.existsSync(local) || fs.existsSync(path.join(local, 'index.html'));
    if (!exists) errors.push(`${rel}: broken internal target ${url}`);
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt="[^"]*"/i.test(match[0])) errors.push(`${rel}: image missing alt`);
  }
  if (html.includes('m.aiwhaler.com/deepseek.html')) errors.push(`${rel}: legacy canonical URL remains`);
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const canonical of canonicals.keys()) {
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) errors.push(`sitemap missing ${canonical}`);
}
if (!fs.readFileSync(path.join(root, 'robots.txt'), 'utf8').includes('https://www.aibusgo.com/sitemap.xml')) errors.push('robots.txt missing sitemap URL');
if (!fs.existsSync(path.join(root, 'images', 'og-deepseek-exporter.png'))) errors.push('missing Open Graph image');
if (!fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('SoftwareApplication')) errors.push('homepage missing SoftwareApplication schema');

console.log(`Checked ${htmlFiles.length} HTML files and ${internalTargets.size} internal targets.`);
if (warnings.length) console.log(`Warnings:\n- ${warnings.join('\n- ')}`);
if (errors.length) {
  console.error(`Errors:\n- ${[...new Set(errors)].join('\n- ')}`);
  process.exit(1);
}
console.log('Site validation passed.');
