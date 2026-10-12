/*
 * Croslin Law blog builder
 *
 * Netlify runs this file every time something changes on GitHub.
 * It copies the finished website from /site into /dist, then builds:
 *   - one page for every post in /content/blog
 *   - the blog list page (/blog/)
 *   - updates to the sitemap, llms.txt, and search
 *   - an RSS feed
 * Nothing else on the site is touched.
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'site');
const DIST = path.join(ROOT, 'dist');
const POSTS_DIR = path.join(ROOT, 'content', 'blog');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'templates', 'page.html'), 'utf8');

const problems = [];   // these stop the build, and the message says what to fix
const warnings = [];   // these are shown in the log, and the build continues
const fail = (file, msg) => problems.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripTags = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();
const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

// ---------- 1. copy the finished site into /dist
fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(SITE, DIST, { recursive: true });

// ---------- 2. practice page names, used to check the "related" list in each post
const practiceSlugs = fs.existsSync(path.join(SITE, 'practice'))
  ? fs.readdirSync(path.join(SITE, 'practice'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];
const practiceTitle = {};
for (const s of practiceSlugs) {
  const h = fs.readFileSync(path.join(SITE, 'practice', s, 'index.html'), 'utf8');
  const m = h.match(/<h1>(.*?)<\/h1>/);
  practiceTitle[s] = m ? stripTags(m[1]) : s;
}

// ---------- 3. read the posts
function parsePost(file) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) { fail(file, 'The top of the file must start with a line of three dashes (---), then the details, then another line of three dashes. See _example-post.md.'); return null; }
  const meta = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i < 1) { fail(file, `This line in the top section is not "name: value": ${line}`); continue; }
    meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  const slug = file.replace(/\.md$/, '');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(file, 'The file name may use only lowercase letters, numbers, and dashes, such as how-probate-works.md');
  if (!meta.title) fail(file, 'Missing "title:" in the top section.');
  if (!meta.description) fail(file, 'Missing "description:" in the top section.');
  if (!meta.date || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) fail(file, 'Missing or invalid "date:". Use the form 2026-10-20.');
  if (meta.updated && !/^\d{4}-\d{2}-\d{2}$/.test(meta.updated)) fail(file, 'Invalid "updated:". Use the form 2026-10-20.');
  const related = (meta.related || '').split(',').map((x) => x.trim()).filter(Boolean);
  for (const r of related) if (!practiceSlugs.includes(r)) fail(file, `"related:" names a page that does not exist: ${r}. Choices are: ${practiceSlugs.join(', ')}`);
  if (meta.title && meta.title.length > 70) warn(file, `The title is ${meta.title.length} characters. Google shows about 60, so it may be cut off.`);
  if (meta.description && (meta.description.length < 70 || meta.description.length > 170)) warn(file, `The description is ${meta.description.length} characters. Aim for 70 to 160.`);
  if (/^# /m.test(m[2])) warn(file, 'The article contains a line starting with a single "#". The title is added automatically, so start your headings with ## instead.');
  if (meta.image && !meta.imagealt) fail(file, 'An "image:" needs an "imageAlt:" line that describes the picture in one sentence.');
  return { slug, file, meta, related, draft: /^true$/i.test(meta.draft || ''), body: m[2] };
}

const files = fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_')) : [];
const all = files.map(parsePost).filter(Boolean);
const slugsSeen = new Set();
for (const p of all) { if (slugsSeen.has(p.slug)) fail(p.file, 'Two posts have the same file name.'); slugsSeen.add(p.slug); }
const posts = all.filter((p) => !p.draft).sort((a, b) => (a.meta.date < b.meta.date ? 1 : a.meta.date > b.meta.date ? -1 : 0));

// ---------- 4. turn each post into HTML
for (const p of posts) {
  let html = marked.parse(p.body, { gfm: true });
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" rel="noopener" target="_blank"');
  p.html = html;
  p.text = stripTags(html);
  p.minutes = Math.max(1, Math.round(p.text.split(' ').length / 220));
  p.headings = [...html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/g)].map((x) => stripTags(x[1])).join(' ');
  // check internal links
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    const target = href.endsWith('/') ? path.join(DIST, href, 'index.html') : path.join(DIST, href);
    const isPost = href.startsWith('/blog/') && posts.some((x) => `/blog/${x.slug}/` === href);
    if (!fs.existsSync(target) && !isPost) warn(p.file, `A link goes to a page that does not exist: ${href}`);
  }
}

if (problems.length) {
  console.error('\nThe blog could not be built. Please fix these, then save again:\n');
  problems.forEach((x) => console.error('  - ' + x));
  console.error('');
  process.exit(1);
}

// ---------- 5. page pieces
const BASE = CFG.siteUrl.replace(/\/$/, '');
const crumbs = (items) => items.map((i, k) => (i.url ? `<a href="${i.url}">${esc(i.name)}</a>` : esc(i.name))).join(' / ');
const pageHead = (crumbHtml, title, extra) => `<div class="page-head"><div class="wrap"><div class="crumbs">${crumbHtml}</div><h1>${esc(title)}</h1>${extra || ''}</div></div>`;
const CTA = '<section class="cta"><div class="wrap"><div><h2>Talk with us about your situation</h2><p>Call or send us a message and we will explain your options.</p></div><div class="actions"><a class="btn" href="tel:+14053978313">Call (405) 397-8313</a><a class="btn ghost" href="/contact/">Contact us</a></div></div></section>';
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const ICONS = '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">';
const hasPosts = posts.length > 0;

function headBlock({ title, description, url, robots, type, extra }) {
  return [
    `<meta name="robots" content="${robots}">`,
    `<link rel="canonical" href="${url}">`,
    ICONS,
    '<link rel="alternate" type="application/rss+xml" title="Croslin Law blog" href="/blog/feed.xml">',
    `<meta property="og:type" content="${type}">`, '<meta property="og:site_name" content="Croslin Law, PLLC">',
    `<meta property="og:title" content="${esc(title)}">`, `<meta property="og:description" content="${esc(description)}">`, `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${BASE}/og-image.png">`, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${esc(title)}">`, `<meta name="twitter:description" content="${esc(description)}">`, `<meta name="twitter:image" content="${BASE}/og-image.png">`,
    extra || '',
  ].join('\n');
}
function render(page) {
  return TEMPLATE
    .replace('{{TITLE}}', () => esc(page.title))
    .replace('{{DESCRIPTION}}', () => esc(page.description))
    .replace('{{HEAD}}', () => page.head)
    .replace('{{PATH}}', () => page.path)
    .replace('{{MAIN}}', () => page.main);
}
function write(rel, html) {
  const dest = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
}

// ---------- 6. post pages
for (const p of posts) {
  const url = `${BASE}/blog/${p.slug}/`;
  const topic = p.meta.topic || 'Article';
  const author = p.meta.author || CFG.author;
  const related = p.related.length
    ? `<h3 style="margin-top:1.6em">Related areas</h3><div class="related">${p.related.map((s) => `<a href="/practice/${s}/">${esc(practiceTitle[s])}</a>`).join('')}</div>`
    : '';
  const image = p.meta.image ? `<img src="${esc(p.meta.image)}" alt="${esc(p.meta.imagealt)}" loading="lazy" decoding="async">` : '';
  const main =
    pageHead(crumbs([{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blog/' }, { name: topic }]), p.meta.title,
      `<p class="post-meta">By ${esc(author)} &middot; ${fmtDate(p.meta.date)} &middot; ${p.minutes} min read</p>`) +
    `<section class="s"><div class="wrap"><article class="prose">${image}${p.html}</article><div class="post-end">${related}<p><small>This article is general information, not legal advice. Reading it does not create an attorney-client relationship. See our <a href="/disclaimer/">Legal Disclaimer</a>.</small></p><p><a href="/blog/">Back to all posts</a></p></div></div></section>` + CTA;
  const robots = CFG.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';
  const jsonld =
    ld({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.meta.title, description: p.meta.description, datePublished: p.meta.date, dateModified: p.meta.updated || p.meta.date, author: { '@type': 'Person', name: author, url: CFG.authorUrl }, publisher: { '@id': CFG.firmId }, mainEntityOfPage: { '@type': 'WebPage', '@id': url }, ...(p.meta.image ? { image: BASE + p.meta.image } : {}) }) +
    ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: BASE + '/' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: BASE + '/blog/' }, { '@type': 'ListItem', position: 3, name: p.meta.title, item: url }] });
  const title = `${p.meta.title} | Croslin Law, PLLC`;
  write(`blog/${p.slug}/index.html`, render({ title, description: p.meta.description, path: `/blog/${p.slug}`, main, head: headBlock({ title, description: p.meta.description, url, robots, type: 'article', extra: jsonld }) }));
}

// ---------- 7. blog list page
{
  const listHtml = hasPosts
    ? `<div class="blog-list">${posts.map((p) => `<article class="post"><div class="meta">${esc(p.meta.topic || 'Article')} &middot; ${fmtDate(p.meta.date)}</div><h3><a href="/blog/${p.slug}/">${esc(p.meta.title)}</a></h3><p>${esc(p.meta.description)}</p></article>`).join('')}</div>`
    : '<p style="text-align:center;margin:0 auto">New articles are coming soon.</p>';
  const main = pageHead(crumbs([{ name: 'Home', url: '/' }, { name: 'Blog' }]), 'Blog', '<p>Plain-language answers to common legal questions.</p>') + `<section class="s"><div class="wrap">${listHtml}</div></section>` + CTA;
  const robots = CFG.indexable && hasPosts ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';
  const url = `${BASE}/blog/`;
  const title = 'Blog | Croslin Law, PLLC';
  const desc = 'Articles from Croslin Law in Tulsa on family law, estate planning, and criminal law.';
  const jsonld = ld({ '@context': 'https://schema.org', '@type': 'Blog', name: 'Croslin Law blog', url, publisher: { '@id': CFG.firmId }, blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.meta.title, url: `${BASE}/blog/${p.slug}/`, datePublished: p.meta.date })) });
  write('blog/index.html', render({ title, description: desc, path: '/blog', main, head: headBlock({ title, description: desc, url, robots, type: 'website', extra: jsonld }) }));
}

// ---------- 8. feed, search file, sitemap, llms.txt
write('blog/feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Croslin Law blog</title><link>${BASE}/blog/</link><description>Plain-language answers to common legal questions.</description>${posts.map((p) => `<item><title>${esc(p.meta.title)}</title><link>${BASE}/blog/${p.slug}/</link><guid>${BASE}/blog/${p.slug}/</guid><pubDate>${new Date(p.meta.date + 'T12:00:00Z').toUTCString()}</pubDate><description>${esc(p.meta.description)}</description></item>`).join('')}</channel></rss>\n`);
write('blog/posts.json', JSON.stringify(posts.map((p) => ({ path: `/blog/${p.slug}`, title: p.meta.title, headings: p.headings, text: p.text }))));

const smPath = path.join(DIST, 'sitemap.xml');
if (fs.existsSync(smPath) && hasPosts && CFG.indexable) {
  const newest = posts[0].meta.updated || posts[0].meta.date;
  const entries = [`<url><loc>${BASE}/blog/</loc><lastmod>${newest}</lastmod></url>`].concat(posts.map((p) => `<url><loc>${BASE}/blog/${p.slug}/</loc><lastmod>${p.meta.updated || p.meta.date}</lastmod></url>`));
  fs.writeFileSync(smPath, fs.readFileSync(smPath, 'utf8').replace('</urlset>', entries.join('\n') + '\n</urlset>'));
}
const llmsPath = path.join(DIST, 'llms.txt');
if (fs.existsSync(llmsPath) && hasPosts) {
  fs.appendFileSync(llmsPath, `\n## Articles\n${posts.map((p) => `- [${p.meta.title}](${BASE}/blog/${p.slug}/): ${p.meta.description}`).join('\n')}\n`);
}

// ---------- 9. going public: one setting in site.config.json turns the whole site on
if (CFG.indexable) {
  const neverIndex = new Set(['payment/index.html', 'thank-you/index.html', '404.html']);
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const f of walk(DIST).filter((x) => x.endsWith('.html'))) {
    const rel = path.relative(DIST, f).split(path.sep).join('/');
    if (neverIndex.has(rel) || rel.startsWith('blog/')) continue;
    const h = fs.readFileSync(f, 'utf8');
    if (h.includes('<meta name="robots" content="noindex, nofollow">')) fs.writeFileSync(f, h.replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="index, follow, max-image-preview:large">'));
  }
}

console.log(`Blog built: ${posts.length} published post(s), ${all.length - posts.length} draft(s). Search engines: ${CFG.indexable ? 'ALLOWED to list the site' : 'told NOT to list the site yet'}.`);
warnings.forEach((w) => console.log('  note: ' + w));
