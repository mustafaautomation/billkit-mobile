# Billkit mobile deploy notes

Build and preview commands need no secrets. Mock mode is the default.

## Build

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run export:web
```

Static web output is written to `dist/`. Serve it with a single-page fallback:

```bash
node scripts/serve-web.mjs 4173
```

Local Expo web preview:

```bash
npm run web
```

## Env vars

All optional. Leave them unset for the seeded demo.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)

Do not set a service-role key. Stripe secrets belong on the Supabase edge functions only: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `BILLKIT_WEB_ORIGIN`.

## Live URL

Target: `https://billkit-app.quvantic.com`

Bundle id: `com.quvantic.billkit`

## Tests

```bash
npm test
npm run test:e2e
npx playwright test --config playwright.screenshots.config.ts
```

Maestro, on a simulator: `.maestro/owner-invoice-flow.yaml` and `.maestro/customer-pay-flow.yaml`.

CI: `.github/workflows/ci.yml` on `ubuntu-latest`, zero secrets. Playwright is `@playwright/test` >= 1.65.1.
