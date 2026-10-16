# Search engines (SEO) and analytics

What the website already does, and the few steps that only the site owner can do.

## Built into every page
* A unique `<title>` (brand first on the home page) and `<meta name="description">`; one `<h1>`, ordered headings, descriptive link text.
* `<link rel="canonical">`, and English ⇄ Arabic alternates (`hreflang="en"`, `ar`, `x-default`) so Google shows each language to the right people.
* Open Graph and Twitter cards with a 1200 × 630 share picture.
* Structured data (JSON-LD): `Organization`, `WebSite` (with alternate names), `SoftwareApplication`, `VideoObject`, `FAQPage`, `BreadcrumbList`.
* `sitemap.xml` (with the language alternates and dates), `robots.txt`, web app manifest, icons.
* Speed: the CSS is inline, fonts are preloaded with `font-display: swap`, images are WebP with width and height (no layout shift), the
  live editor (1.7 MB) loads only when the visitor gets near it, the video loads on demand.
* Accessibility: skip link, landmarks, focus outlines, alt text, `lang`/`dir` per page, 44 px touch targets, no horizontal scrolling on phones.
* Google Analytics 4 and the Search Console verification tag are set in `site/config.json` (`gaId`, `googleSiteVerification`).

## Steps for the owner
1. **Search Console** (search.google.com/search-console): add the property (URL prefix) of the site, verify with the HTML tag (already in the pages), then
   **Sitemaps → add `sitemap.xml`**. Use **URL inspection → Request indexing** for the home page and the Arabic home page.
2. **Links**: put the site address in the GitHub repository's "Website" field and README, in your GitHub profile and anywhere you publish. Links
   from other sites are the strongest ranking signal.
3. **A domain with the name in it** (for example `mathtypex.com`) helps brand searches. Set the repository variables `SITE_URL` and `CNAME`,
   add the DNS records GitHub Pages asks for, and add the new address as a new Search Console property.
4. **`robots.txt` only works at the root of a host.** On `username.github.io/project/` crawlers do not read it (the sitemap still works). A custom
   domain fixes that.

## Notes
* MathTypeX is an independent project; the pages say so. Do not use other companies' product names as keywords.
* Rankings take weeks; check Search Console → Performance for the queries and pages that bring visitors.
