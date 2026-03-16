# Rock Solid Leveling

Marketing website for `rocksolidleveling.com`.

This build reworks the old `rbconcretelevel.com` content into a new brand-forward single-page site for Rock Solid Leveling, formerly R&B Concrete Leveling and Repair.

## Stack

- Vite
- React
- TypeScript
- Static deployment on GitHub Pages

## Highlights

- New hero layout with a custom before/after comparison slider
- Scroll-reactive level graphic inspired by the new logo
- Content carried over from the old site and reorganized into a stronger marketing flow
- Quote request form that can post directly to an `n8n` webhook or fall back to email/share
- GitHub Pages deployment workflow in `.github/workflows/deploy.yml`

## Local development

```bash
npm install
npm run dev
```

To enable direct form submissions, copy `.env.example` to `.env` and set:

```bash
VITE_N8N_WEBHOOK_URL=https://your-n8n-domain/webhook/your-webhook-id
VITE_N8N_FORM_ID=rock-solid-website
```

If `VITE_N8N_WEBHOOK_URL` is omitted, the quote form falls back to the existing share sheet and email draft flow.

## Production build

```bash
npm run build
```

## GitHub Pages + custom domain

The repo includes a GitHub Actions workflow for Pages deployment. After pushing to GitHub:

1. Push the repo to GitHub on the `main` branch
2. In GitHub, open `Settings -> Pages` and set `Source` to `GitHub Actions`
3. In the same Pages screen, confirm the custom domain is `rocksolidleveling.com`
4. In your DNS provider, point the apex domain to GitHub Pages with these `A` records:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
5. Add `www` as a `CNAME` to `blakefosdick.github.io`
6. Wait for DNS and the GitHub Pages certificate to finish provisioning, then enable `Enforce HTTPS`

The deployed artifact includes `public/CNAME`, so the domain stays attached across deploys.
