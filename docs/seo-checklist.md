# SEO Improvement Checklist

This checklist tracks implementation work to improve organic visibility for `rocksolidleveling.com`.

## Notes
- Previous sitemap entries included `#fragment` URLs (for example `/#faq`). Search engines generally index the base URL, not fragment destinations, so future section-level SEO targets should use real crawlable page URLs.

---

## Phase 1 — Foundation fixes (High Priority)

- [x] Correct JSON-LD business email to `info@rocksolidleveling.com`.
- [x] Remove fragment URLs from `public/sitemap.xml` after dedicated pages are live.
- [x] Add `<lastmod>` to sitemap URLs and keep it current.
- [x] Ensure canonical tags are present and correct on all indexable pages.
- [ ] Submit updated sitemap in Google Search Console and Bing Webmaster Tools.

### Definition of done
- Sitemap contains only canonical, crawlable URLs.
- Every indexable page has self-referencing canonical.
- Search Console accepts sitemap with no critical errors.

---

## Phase 2 — Crawlable page architecture

- [ ] Add dedicated `/faq` page (instead of only `#faq` section).
- [ ] Add dedicated service pages:
  - [ ] `/services/driveway-leveling-omaha`
  - [ ] `/services/sidewalk-leveling-omaha`
  - [ ] `/services/patio-leveling-omaha`
  - [ ] `/services/garage-floor-leveling-omaha`
- [ ] Add an Omaha service hub page (for internal linking and topical clustering).
- [x] Add internal links from homepage sections to these dedicated pages.

### Definition of done
- New pages are linked from nav/footer or contextual links.
- New pages are included in sitemap and have unique metadata.

---

## Phase 3 — Structured data expansion

- [ ] Add `FAQPage` JSON-LD for FAQ content.
- [ ] Expand `HomeAndConstructionBusiness` schema with:
  - [ ] `address` (`PostalAddress`)
  - [ ] `geo` (`GeoCoordinates`)
  - [ ] `openingHoursSpecification`
  - [ ] `sameAs` profile links
  - [ ] `image`
  - [ ] `priceRange`
- [ ] Keep NAP (name/address/phone) and email consistent across visible content and schema.

### Definition of done
- Rich Results Test validates schema with no critical errors.
- Contact details are consistent sitewide.

---

## Phase 4 — Content and local authority

- [ ] Add case study/project pages with before/after photos.
- [ ] Add customer review/testimonial section with schema where appropriate.
- [x] Add an areas served page for key service locations around Omaha.
- [ ] Add city-specific pages for the highest-priority service locations around Omaha.
- [ ] Align Google Business Profile services/categories with on-site service pages.
- [ ] Ensure citation consistency across top local directories.

### Definition of done
- Each new page targets a unique keyword intent and location.
- Internal links support service/location discoverability.

---

## Phase 5 — Performance & monitoring

- [ ] Track key queries and page performance in Search Console.
- [ ] Track conversions from organic traffic (estimate requests/calls).
- [ ] Run monthly technical SEO checks (crawl errors, canonicals, schema, sitemap health).
- [ ] Monitor Core Web Vitals and improve pages with poor UX metrics.

### Definition of done
- Monthly report includes ranking trend, indexed pages, top landing pages, and conversion trend.

---

## Validation checklist for each SEO change

- [ ] `npm run build`
- [ ] Validate changed pages load and link correctly
- [ ] Validate sitemap XML syntax
- [ ] Validate structured data in Rich Results Test
- [ ] Request indexing for high-priority pages in Search Console
