# Reel Audit - Global AI Video Compliance

Reel Audit is a Next.js UI prototype for a global video compliance product. It includes a marketing landing page and a mock compliance dashboard that simulates multi-market analysis, violations, and remediation guidance.

## Features
- Landing page with product narrative, workflow, and market highlights.
- Compliance dashboard with upload UI, market selection, and a multi-step processing simulation.
- Mock violations inbox with timeline seeking and recommended actions.
- Motion-driven UI using Framer Motion and Lucide icons.

## Routes
- `/` - Marketing landing page.
- `/dashboard` - Compliance dashboard (mock data and simulated processing).

## Tech Stack
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- Framer Motion
- Lucide React icons

## Getting Started
Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Scripts
```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure
- `app/page.tsx` - Landing page content and sections.
- `app/dashboard/page.tsx` - Compliance dashboard UI and mock data.
- `app/layout.tsx` - Fonts, metadata, and global layout.
- `app/globals.css` - Tailwind v4 setup and base styles.
- `public/` - Static assets.

## Notes
- The dashboard uses mock data only. There is no backend or API integration.
- Video uploads are handled locally in the browser via `URL.createObjectURL` and are not persisted.
- Processing steps and compliance scores are simulated for UI demonstration.
