# Reel Audit - Global AI Video Compliance

Reel Audit is a Next.js application with a marketing landing page and a live compliance dashboard powered by Amazon Bedrock Nova and Amazon S3. Users can upload a local video, send it to S3, analyze it against selected market rules, and review normalized findings in a timeline-driven UI.

## Features
- Marketing landing page for the Reel Audit product story.
- Live dashboard upload flow with S3-backed video storage.
- Amazon Nova analysis through a Next.js API route.
- Market-aware violation timeline and inbox UI.
- Framer Motion transitions and Tailwind CSS styling.

## Routes
- `/` - Marketing landing page.
- `/dashboard` - Live compliance dashboard.
- `/api/analyze` - Server-side upload and Bedrock analysis endpoint.

## Tech Stack
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- Framer Motion
- Lucide React
- AWS SDK for JavaScript v3

## Prerequisites
- Node.js 20+
- An AWS account with access to Amazon Bedrock in `us-east-1`
- A writable S3 bucket in the same region
- Local AWS credentials configured either through `aws configure` or environment variables

## Environment Setup
Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required values:

```env
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.amazon.nova-lite-v1:0
S3_BUCKET_NAME=reelaudit-shubham-us-east-1
```

Note: for video understanding in `us-east-1`, this project defaults to `us.amazon.nova-lite-v1:0` and can fall back to `us.amazon.nova-pro-v1:0` if needed.

Optional if you already ran `aws configure`:

```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
```

## Getting Started
Install dependencies and start the dev server:

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

## How the Live Flow Works
1. A user selects a local video on `/dashboard`.
2. The Next.js API uploads that file to S3.
3. The server calls Amazon Nova through Bedrock using the uploaded S3 URI.
4. The model returns a normalized compliance report for the selected markets.
5. The dashboard renders the score, summary, warnings, timeline, and flagged moments.

## Current Limitations
- The first live integration analyzes video frames and visible on-screen text only.
- Audio-only violations are intentionally not evaluated yet.
- The ruleset in `lib/reelaudit-rules.ts` is a demo policy layer, not legal advice.
- The API currently supports uploads up to 100 MB.
- If a configured Nova model rejects video input, the server automatically tries other video-capable Nova models.

## Project Structure
- `app/page.tsx` - Landing page content and sections.
- `app/dashboard/page.tsx` - Live compliance dashboard UI.
- `app/api/analyze/route.ts` - Upload and Bedrock analysis endpoint.
- `lib/reelaudit-server.ts` - S3 upload and Nova invocation logic.
- `lib/reelaudit-rules.ts` - Demo policy definitions by market.
- `lib/reelaudit-types.ts` - Shared compliance response types.
- `app/layout.tsx` - Fonts, metadata, and global layout.
- `app/globals.css` - Global styles.

## Notes
- Amazon Nova model availability can differ by region. This setup is intended for `us-east-1`.
- Keep AWS credentials out of source control and never commit `.env.local`.
