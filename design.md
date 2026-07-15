# Rock Solid Design Guide

This file is the written source of truth for future agents working on the Rock Solid Leveling site.

The live visual reference is `design.html`, which builds as a separate hidden page and is intentionally not linked from the main site menu.

## Purpose

- Extend the current Rock Solid Leveling marketing site without creating a second visual system.
- Keep the site mobile-first, conversion-oriented, and GitHub Pages compatible.
- Preserve the current brand language: concrete textures, bright blue CTA energy, teal utility accents, orange emphasis, and dark navy proof sections.

## Visual direction

- The brand should feel practical, trustworthy, local, and premium without feeling corporate or flashy.
- Use contrast and hierarchy to guide users toward quote requests.
- Keep layouts clean and spacious. The site should feel solid and intentional, not crowded.
- Accent colors should feel construction-adjacent and brand-specific. Do not drift into purple-heavy or generic SaaS styling.

## Core tokens

Colors from `src/app.css`:

- `--bg: #f7f7f3`
- `--surface: #ffffff`
- `--surface-soft: #f5f7fb`
- `--ink: #121726`
- `--muted: #687184`
- `--navy: #0d1528`
- `--navy-soft: #131d34`
- `--blue: #1453e5`
- `--blue-deep: #0f43ba`
- `--teal: #0f7a72`
- `--orange: #e77d23`

Shape and elevation:

- `--radius-xl: 1.75rem`
- `--radius-lg: 1.25rem`
- `--radius-md: 1rem`
- `--shadow: 0 22px 50px rgba(11, 20, 38, 0.08)`
- `--shadow-strong: 0 28px 70px rgba(8, 17, 33, 0.16)`
- Rounded cards are preferred over square corners.
- Use shadows softly but consistently. Avoid flat panels when a section is meant to feel important.

## Typography

- Use `Archivo` for major headings, section titles, and important card titles.
- Use `Manrope` for body copy, labels, helper text, and UI.
- Headings are tight and compact with slightly negative tracking.
- Body copy is calm, readable, and supportive. Avoid long dense paragraphs.
- Keep the orange accent treatment for selective emphasis only, especially in hero-style headlines.

## Layout rules

- The site uses a centered max width of `1120px`.
- Sections rely on generous vertical spacing and simple grids.
- Mobile layouts collapse early and prioritize full-width buttons and single-column reading.
- Dark sections should be used selectively to create emphasis around proof, results, or footer content.
- Prefer extending existing section rhythms instead of introducing entirely new spacing systems.

## Component guidance

Header:

- Sticky, translucent white header with subtle blur.
- Compact logo on the left, simple nav in the middle, CTA on the right.
- On very small screens, the CTA hides and the nav wraps.

Buttons:

- Primary buttons use the blue gradient and a stronger shadow.
- Secondary buttons are white with a subtle border and soft elevation.
- Buttons are bold, slightly rounded, and should feel substantial.
- On mobile, buttons commonly expand to full width.

Hero:

- Centered composition with logo, compact headline, and two CTA actions.
- Use soft radial glow backgrounds, not busy textures.
- Messaging should immediately communicate value proposition and service area trust.

Benefits and process:

- Benefit items use numbered circular markers.
- Process steps use outline number circles and centered content.
- Keep these sections concise and scannable.

Dark proof band:

- Use the navy background treatment for the most persuasive visual section.
- The before/after module should stay framed, tactile, and easy to understand.
- Avoid using the dark band for too many consecutive sections.

FAQ:

- Rounded white disclosure cards with minimal borders.
- Motion is restrained and should respect reduced-motion preferences.
- Answers should be practical, concise, and confidence-building.

Quote card:

- This is a major conversion module and should stay visually prominent.
- Use a blue header band, white card body, strong labels, and clean inputs.
- File upload uses teal for the file button.
- Status messages should feel calm and helpful, not technical or alarming.

Footer:

- Dark navy background with clear columns and a white logo card.
- Retain the former brand name mention for trust and SEO continuity unless strategy changes.

## Imagery and graphics

- Reuse existing logo assets and slab/level graphics where appropriate.
- Favor real concrete imagery and straightforward construction visuals.
- Decorative elements should support the message, not dominate it.
- If adding texture, keep it subtle and low-noise.

## Content and tone

- Lead with practical outcomes: safer walking surfaces, avoided replacement cost, fast turnaround.
- Sound confident and local, not hype-heavy.
- Use short proof-oriented subheads and trust-building copy.
- Keep calls to action direct: free estimate, get a quote, see how it works.

## Accessibility and interaction

- Maintain strong contrast and visible focus states.
- Support reduced motion where animation exists.
- Keep forms clearly labeled and easy to complete on mobile.
- Avoid hover-only meaning; the interface should still read well on touch devices.

## Implementation guidance for future agents

- Check `src/app.css` before creating new styles.
- Prefer reusing existing button, card, section, and form patterns.
- If a new page or section is needed, match the current spacing, border radius, and shadow language first.
- Keep hidden/internal references off the public nav unless asked otherwise.
- Preserve static hosting compatibility and avoid introducing routing or infrastructure complexity without a clear reason.

## Files to consult

- `src/App.tsx`
- `src/app.css`
- `src/DesignPage.tsx`
- `src/design.css`
- `design.html`
