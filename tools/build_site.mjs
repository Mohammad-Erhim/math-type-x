// Builds the website into dist-site/ (GitHub Pages): the pages in English and Arabic, the full-page editor, the sitemap and the
// files search engines read. The editor itself comes from `node tools/build.mjs --prod --static --out=.site-app` (npm run build:site).
//   SITE_URL=https://example.com/base  where the site is served (default: the GitHub Pages address of the project)
//   CNAME=example.com                  write a CNAME file (custom domain)
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SITE, PAGES, FAQ, EX, T, faqPlain } from '../site/content.mjs';

const cfg = JSON.parse(readFileSync('site/config.json', 'utf8'));
const SITE_URL = (process.env.SITE_URL || 'https://mohammad-erhim.github.io/math-type-x').replace(/\/+$/, '');
const BASE = new URL(SITE_URL).pathname.replace(/\/+$/, '');
const OUT = 'dist-site';
const APP = '.site-app/public';
if (!existsSync(`${APP}/editor.js`)) throw new Error('run `node tools/build.mjs --prod --static --out=.site-app` first (npm run build:site does)');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/assets/site`, { recursive: true });
cpSync('site/media', `${OUT}/media`, { recursive: true });
cpSync(`${APP}/fonts`, `${OUT}/assets/fonts`, { recursive: true });
copyFileSync(`${APP}/editor.js`, `${OUT}/assets/editor.js`);
const FONTS = [
  ['roboto-slab', 'roboto-slab-latin-700-normal', 'roboto-slab-700'], ['roboto-slab', 'roboto-slab-latin-600-normal', 'roboto-slab-600'],
  ['noto-sans', 'noto-sans-latin-400-normal', 'noto-sans-400'], ['noto-sans', 'noto-sans-latin-700-normal', 'noto-sans-700'],
  ['noto-sans-arabic', 'noto-sans-arabic-arabic-400-normal', 'noto-sans-arabic-400'], ['noto-sans-arabic', 'noto-sans-arabic-arabic-700-normal', 'noto-sans-arabic-700'],
  ['noto-naskh-arabic', 'noto-naskh-arabic-arabic-700-normal', 'noto-naskh-arabic-700'],
];
for (const [pkg, file, name] of FONTS) copyFileSync(`node_modules/@fontsource/${pkg}/files/${file}.woff2`, `${OUT}/assets/site/${name}.woff2`);

const stamp = createHash('sha1').update(readFileSync(`${APP}/editor.js`)).digest('hex').slice(0, 10);
const minify = (c) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '\n').replace(/\s*([{};,>])\s*/g, '$1');
const cssSource = readFileSync('site/style.css', 'utf8').replace(/__BASE__/g, BASE);
const [siteCss, appPart] = cssSource.split('/*@editor*/');
const css = minify(siteCss);
// the full-page editor gets only the few rules of its own bar: nothing of the site's styles may reach the editor widget
const appCss = minify(siteCss.match(/@font-face\{font-family:"Roboto Slab";font-weight:700[^}]*\}/)[0] + siteCss.match(/:root\{[^}]*\}/)[0] + siteCss.match(/\.brand,\.product,[^{]*\{[^}]*\}/)[0] + siteCss.match(/\.brand\{display:flex[^}]*\}/)[0] + siteCss.match(/\.brand img\{[^}]*\}/)[0] + appPart);
const editorPageCss = readFileSync(`${APP}/page.css`, 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const json = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// ---- URLs
const path = (lang, slug) => `${BASE}${lang === 'ar' ? '/ar' : ''}${slug ? '/' + slug : ''}/`;
const abs = (p) => SITE_URL.replace(new URL(SITE_URL).pathname.replace(/\/+$/, ''), '') + p;
const other = (lang) => (lang === 'ar' ? 'en' : 'ar');
const ctx = (lang) => ({
  lang,
  u: (slug) => path(lang, slug),
  uLang: (l, slug) => path(l, slug),
  m: (f) => `${BASE}/media/${f}`,
});

const SLUGS = Object.keys(PAGES);
const EXTRA = ['privacy'];

function head({ lang, slug, title, description, og, noindex, schema, styles }) {
  const s = SITE[lang];
  const url = abs(path(lang, slug));
  const alt = (l) => abs(path(l, slug));
  const image = abs(`${BASE}/media/${og || 'og-home.png'}`);
  return `<!doctype html>
<html lang="${lang}" dir="${s.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${alt('en')}">
<link rel="alternate" hreflang="ar" href="${alt('ar')}">
<link rel="alternate" hreflang="x-default" href="${alt('en')}">
<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}">
<meta name="google-site-verification" content="${cfg.googleSiteVerification}">
<meta name="theme-color" content="#18212f">
<meta name="color-scheme" content="light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${cfg.siteName}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${s.locale}">
<meta property="og:locale:alternate" content="${SITE[other(lang)].locale}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(s.tagline)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${image}">
<link rel="icon" type="image/png" sizes="32x32" href="${BASE}/media/icon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="${BASE}/media/icon-192.png">
<link rel="apple-touch-icon" href="${BASE}/media/icon-180.png">
<link rel="manifest" href="${BASE}/manifest.webmanifest">
<link rel="preload" href="${BASE}/assets/site/${lang === 'ar' ? 'noto-naskh-arabic-700' : 'roboto-slab-700'}.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${BASE}/assets/site/${lang === 'ar' ? 'noto-sans-arabic-400' : 'noto-sans-400'}.woff2" as="font" type="font/woff2" crossorigin>
<style>${styles ?? css}</style>
${(schema || []).map(json).join('\n')}
${cfg.gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${cfg.gaId}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cfg.gaId}');</script>` : ''}
</head>`;
}

function header(lang, slug) {
  const s = SITE[lang];
  const x = ctx(lang);
  const links = s.nav.map(([sl, label]) => `<li><a href="${x.u(sl)}"${sl === slug ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  const bar = lang === 'ar' ? 'جرّب MathTypeX الآن – بلا تسجيل.' : 'Try MathTypeX right now – no sign-up needed.';
  const globe = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>';
  return `<a class="skip" href="#main">${s.skip}</a>
<div class="announce">${bar}<a href="${x.u('editor')}">${s.openEditor} ${lang === 'ar' ? '←' : '→'}</a></div>
<input type="checkbox" id="menu" class="menu-toggle" aria-label="${s.menu}">
<header class="site-header"><div class="wrap bar">
  <a class="brand" href="${x.u('')}"><img src="${BASE}/media/icon-192.png" width="38" height="38" alt="">MathTypeX</a>
  <label class="menu-btn" for="menu">☰ ${s.menu}</label>
  <nav class="main" aria-label="${lang === 'ar' ? 'القائمة الرئيسية' : 'Main'}"><ul>${links}</ul></nav>
  <div class="head-right"><a class="lang" href="${path(other(lang), slug)}" hreflang="${other(lang)}" lang="${other(lang)}" title="${esc(s.switchLabel)}">${globe}<span>${s.switchTo}</span></a><a class="btn btn-dark btn-sm" href="${x.u('editor')}">${s.openEditor}</a></div>
</div></header>`;
}

function footer(lang) {
  const s = SITE[lang];
  const x = ctx(lang);
  const nav = Object.fromEntries(s.nav);
  const li = (sl) => `<li><a href="${x.u(sl)}">${nav[sl] || s.openEditor}</a></li>`;
  return `<footer class="site-footer"><div class="wrap foot-grid">
  <div><a class="brand" href="${x.u('')}"><img src="${BASE}/media/icon-192.png" width="38" height="38" alt="">MathTypeX</a><p class="tag">${s.tagline}</p></div>
  <div><h2>${s.footProduct}</h2><ul><li><a href="${x.u('editor')}">${s.openEditor}</a></li>${li('features')}${li('arabic-math-editor')}</ul></div>
  <div><h2>${s.footLearn}</h2><ul>${li('guide')}${li('faq')}${li('embed')}</ul></div>
  <div><h2>${s.footProject}</h2><ul>${li('about')}<li><a href="${cfg.github}" rel="noopener">${s.github}</a></li><li><a href="${path(other(lang), '')}" hreflang="${other(lang)}" lang="${other(lang)}">${s.switchTo}</a></li></ul></div>
</div>
<div class="foot-bottom"><div class="wrap"><span>${s.rights}</span><span><a href="${x.u('privacy')}">${lang === 'ar' ? 'الخصوصية' : 'Privacy'}</a></span></div></div></footer>`;
}

const orgSchema = () => ({
  '@type': 'Organization', '@id': `${abs(BASE + '/')}#org`, name: cfg.siteName, url: abs(BASE + '/'),
  logo: { '@type': 'ImageObject', url: abs(`${BASE}/media/icon-512.png`), width: 512, height: 512 },
  founder: { '@type': 'Person', name: cfg.author, url: cfg.github.replace(/\/[^/]+$/, '') }, sameAs: [cfg.github],
});
const appSchema = (lang) => ({
  '@type': 'SoftwareApplication', '@id': `${abs(BASE + '/')}#app`, name: cfg.siteName, url: abs(path(lang, '')),
  applicationCategory: 'EducationalApplication', operatingSystem: 'Any (web browser)', browserRequirements: 'Requires JavaScript. Works in current Chrome, Edge, Firefox and Safari.',
  description: PAGES[''][lang].description, inLanguage: ['en', 'ar'], image: abs(`${BASE}/media/og-home.png`),
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: lang === 'ar'
    ? ['كتابة المعادلات من اليمين إلى اليسار', 'واجهة عربية كاملة', 'حروف رياضية عربية', 'علامات المشتقة', 'ضبط دقيق للمواضع', 'تصدير صورة PNG', 'يعمل على الهاتف']
    : ['Right-to-left equation writing', 'Fully translated Arabic interface', 'Arabic math letters', 'Derivative marks', 'Exact positioning', 'PNG image export', 'Works on phones and tablets'],
  publisher: { '@id': `${abs(BASE + '/')}#org` },
});
const crumbs = (lang, slug, name) => ({
  '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: SITE[lang].breadcrumbHome, item: abs(path(lang, '')) },
    { '@type': 'ListItem', position: 2, name, item: abs(path(lang, slug)) },
  ],
});
const faqSchema = (lang, list) => ({ '@type': 'FAQPage', mainEntity: faqPlain({ lang }, lang).slice(0, list).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

function render(lang, slug) {
  const page = PAGES[slug];
  const meta = page[lang];
  const x = ctx(lang);
  x.lang = lang;
  const s = SITE[lang];
  const isHome = slug === '';
  const body = page.body(x);
  let inner;
  if (isHome) inner = body;
  else {
    inner = `<header class="page-hero"><div class="narrow"><p class="crumbs"><a href="${x.u('')}">${s.breadcrumbHome}</a> › ${meta.crumb}</p><h1>${meta.h1}</h1><p class="lead">${meta.lead}</p></div></header>\n<main id="main">${body}</main>`;
  }
  const schema = [];
  if (isHome) {
    schema.push({ '@context': 'https://schema.org', '@graph': [orgSchema(), {
      '@type': 'WebSite', '@id': `${abs(BASE + '/')}#site`, url: abs(BASE + '/'), name: cfg.siteName, alternateName: ['Math Type X', 'MathTypeX equation editor'], inLanguage: ['en', 'ar'], publisher: { '@id': `${abs(BASE + '/')}#org` },
    }, appSchema(lang), {
      '@type': 'VideoObject', name: T[lang].videoLabel, description: T[lang].watchLead, thumbnailUrl: abs(`${BASE}/media/demo-poster.webp`), uploadDate: cfg.published,
      contentUrl: abs(`${BASE}/media/demo.mp4`), duration: 'PT1M', inLanguage: lang, publisher: { '@id': `${abs(BASE + '/')}#org` },
    }, faqSchema(lang, 5)] });
  } else {
    const g = [crumbs(lang, slug, meta.crumb)];
    if (slug === 'faq') g.push(faqSchema(lang, 99));
    if (slug === 'arabic-math-editor') g.push(appSchema(lang));
    schema.push({ '@context': 'https://schema.org', '@graph': g });
  }
  const scripts = page.scripts === 'playground'
    ? `<script>window.MTX_PAGE=${JSON.stringify({ lang, editorSrc: `${BASE}/assets/editor.js?v=${stamp}`, examples: EX }).replace(/</g, '\\u003c')}</script>\n<script src="${BASE}/assets/playground.js?v=${stamp}" defer></script>`
    : '';
  return `${head({ lang, slug, title: meta.title, description: meta.description, og: meta.og, schema })}
<body>
${header(lang, slug)}
${inner}
${footer(lang)}
${scripts}
</body>
</html>
`;
}

function renderPrivacy(lang) {
  const s = SITE[lang];
  const x = ctx(lang);
  const ar = lang === 'ar';
  const meta = ar
    ? { title: 'الخصوصية | MathTypeX', description: 'كيف يتعامل MathTypeX مع بياناتك: المحرر يعمل في متصفحك ولا يرفع معادلاتك.', h1: 'الخصوصية', lead: 'ببساطة: معادلاتك تبقى عندك.' }
    : { title: 'Privacy | MathTypeX', description: 'How MathTypeX treats your data: the editor runs in your browser and does not upload your equations.', h1: 'Privacy', lead: 'In short: your equations stay with you.' };
  const body = ar
    ? `<p>يعمل محرر MathTypeX وتصدير الصور بالكامل داخل متصفحك. لا تُرسل معادلاتك إلى أي خادم، ولا يتطلب الموقع حسابًا.</p><p>يحفظ المحرر في متصفحك (التخزين المحلي) معادلتك الأخيرة وبعض تفضيلاتك مثل التبويب المفتوح، لتجدها عند عودتك. يمكنك مسحها بمسح بيانات الموقع في المتصفح.</p><p>تُستضاف الصفحات على GitHub Pages، وقد يسجّل المستضيف بيانات تقنية قياسية مثل عنوان IP عند طلب الصفحات، وفق سياسته. ونستخدم Google Analytics لعدّ الزيارات (مثل الصفحات المعروضة وبلد الزائر)، ولا يستقبل معادلاتك أبدًا. ونستخدم كذلك Google Search Console لفهم ظهور الموقع في نتائج البحث.</p>`
    : `<p>The MathTypeX editor and its image export run entirely inside your browser. Your equations are not sent to a server, and the site needs no account.</p><p>The editor keeps your last equation and a few preferences, such as the open tab, in your browser's local storage so they are there when you return. You can remove them by clearing the site data in your browser.</p><p>The pages are hosted on GitHub Pages, which may log standard technical data such as IP addresses when pages are requested, under its own policy. We use Google Analytics to count visits (for example which pages are viewed and from which country); it never receives your equations. We also use Google Search Console to understand how the site appears in search.</p>`;
  const html = `${head({ lang, slug: 'privacy', title: meta.title, description: meta.description, schema: [] })}
<body>
${header(lang, 'privacy')}
<header class="page-hero"><div class="narrow"><p class="crumbs"><a href="${x.u('')}">${s.breadcrumbHome}</a> › ${meta.h1}</p><h1>${meta.h1}</h1><p class="lead">${meta.lead}</p></div></header>
<main id="main"><section><div class="narrow prose">${body}</div></section></main>
${footer(lang)}
</body></html>
`;
  return html;
}

function renderEditor(lang) {
  const s = SITE[lang];
  const x = ctx(lang);
  const ar = lang === 'ar';
  const meta = ar
    ? { title: 'المحرر الكامل – محرر المعادلات MathTypeX', description: 'محرر معادلات رياضية بملء الصفحة: اكتب بالعربية أو الإنجليزية، ونزّل معادلتك صورة PNG. يعمل في متصفحك دون تثبيت.', h1: 'محرر المعادلات MathTypeX', intro: 'استخدم شريط الأدوات أو لوحة المفاتيح لبناء معادلتك، ثم افتح تبويب PNG لتنزيلها صورة.' }
    : { title: 'Full-Page Equation Editor – MathTypeX', description: 'The full-page equation editor: write in English or Arabic and download your equation as a PNG image. Runs in your browser, nothing to install.', h1: 'MathTypeX equation editor', intro: 'Use the toolbar or the keyboard to build your equation, then open the PNG tab to download it as an image.' };
  const schema = [{ '@context': 'https://schema.org', '@graph': [crumbs(lang, 'editor', ar ? 'المحرر' : 'Editor'), appSchema(lang)] }];
  const h = head({ lang, slug: 'editor', title: meta.title, description: meta.description, schema, styles: appCss + '\n' + editorPageCss.replace(/html\{color-scheme[^}]*\}/, '') });
  return `${h}
<body class="app">
<div class="app-bar"><a class="brand" href="${x.u('')}"><img src="${BASE}/media/icon-192.png" width="26" height="26" alt="">MathTypeX</a>
  <span class="sp"><a class="hide-sm" href="${x.u('guide')}">${s.nav[3][1]}</a><a class="hide-sm" href="${x.u('faq')}">${s.nav[4][1]}</a><a href="${x.u('')}">${s.home}</a><a href="${path(other(lang), 'editor')}" hreflang="${other(lang)}" lang="${other(lang)}">${s.switchTo}</a></span></div>
<main class="page">
  <h1 class="sr-only">${meta.h1}</h1>
  <p class="sr-only">${meta.intro}</p>
  <div class="wp-block-columns is-layout-flex"><div class="wp-block-column"><div id="editorContainer"></div><div id="outputContainer"></div></div></div>
</main>
<noscript><p style="padding:20px">${ar ? 'يحتاج المحرر إلى JavaScript.' : 'The editor needs JavaScript.'}</p></noscript>
<script>window.MTX_PAGE=${JSON.stringify({ lang })}</script>
<script src="${BASE}/assets/editor.js?v=${stamp}"></script>
<script src="${BASE}/assets/editor-page.js?v=${stamp}"></script>
</body>
</html>
`;
}

// ---- write everything
const write = (rel, text) => {
  mkdirSync(`${OUT}/${rel.split('/').slice(0, -1).join('/')}`, { recursive: true });
  writeFileSync(`${OUT}/${rel}`, text);
};
copyFileSync('site/playground.js', `${OUT}/assets/playground.js`);
copyFileSync('site/editor-page.js', `${OUT}/assets/editor-page.js`);
const urls = [];
for (const lang of ['en', 'ar']) {
  const pre = lang === 'ar' ? 'ar/' : '';
  for (const slug of SLUGS) {
    if (slug === 'editor') continue;
    write(`${pre}${slug ? slug + '/' : ''}index.html`, render(lang, slug));
  }
  write(`${pre}editor/index.html`, renderEditor(lang));
  write(`${pre}privacy/index.html`, renderPrivacy(lang));
}
const sitemapSlugs = [...SLUGS.filter((s) => s !== 'editor'), 'editor', 'privacy'];
const pri = { '': '1.0', features: '0.9', 'arabic-math-editor': '0.9', guide: '0.8', editor: '0.9', faq: '0.7', embed: '0.6', about: '0.5', privacy: '0.2' };
for (const slug of sitemapSlugs) {
  for (const lang of ['en', 'ar']) {
    urls.push(`<url><loc>${abs(path(lang, slug))}</loc><lastmod>${cfg.published}</lastmod><changefreq>monthly</changefreq><priority>${pri[slug] || '0.5'}</priority>` +
      `<xhtml:link rel="alternate" hreflang="en" href="${abs(path('en', slug))}"/><xhtml:link rel="alternate" hreflang="ar" href="${abs(path('ar', slug))}"/><xhtml:link rel="alternate" hreflang="x-default" href="${abs(path('en', slug))}"/></url>`);
  }
}
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs(BASE + '/sitemap.xml')}\n`);
write('manifest.webmanifest', JSON.stringify({
  name: 'MathTypeX', short_name: 'MathTypeX', description: PAGES[''].en.description, start_url: `${BASE}/editor/`, scope: `${BASE}/`, display: 'standalone',
  background_color: '#ffffff', theme_color: '#18212f', lang: 'en',
  icons: [{ src: `${BASE}/media/icon-192.png`, sizes: '192x192', type: 'image/png' }, { src: `${BASE}/media/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
}, null, 2));
write('.nojekyll', '');
if (process.env.CNAME) write('CNAME', process.env.CNAME + '\n');
// the 404 page (GitHub Pages serves it for every unknown address): not indexed
{
  const lang = 'en';
  const h = head({ lang, slug: '', title: 'Page not found | MathTypeX', description: 'This page does not exist. Go to the MathTypeX home page or open the editor.', noindex: true }).replace(/<link rel="canonical"[^>]*>\n/, '').replace(/<link rel="alternate"[^>]*>\n/g, '');
  const x = ctx(lang);
  write('404.html', `${h}
<body>
${header(lang, '404')}
<main id="main"><section><div class="narrow" style="text-align:center"><h1>Page not found</h1><p class="lead" style="margin-inline:auto">The page you are looking for does not exist or has moved.</p>
<div class="btn-row" style="justify-content:center"><a class="btn btn-dark" href="${x.u('')}">Go to the home page</a><a class="btn btn-outline" href="${x.u('editor')}">Open the editor</a><a class="btn btn-outline" href="${path('ar', '')}">العربية</a></div></div></section></main>
${footer(lang)}
</body></html>
`);
}
console.log(`site → ${OUT}  (${SITE_URL}, base "${BASE}")  ${urls.length} URLs in the sitemap`);
