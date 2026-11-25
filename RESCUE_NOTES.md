# Rescued from Cursor

Source: Billkit Mobile — Expo app | Cursor https://cursor.com/agents/bc-ce3de8be-5c01-5eb3-8889-ae5f483befe3
Scope: Last Agent Turn
Captured: 2026-11-25T11:48:39.487Z
Files written: 97

Not in this copy: files Cursor's template created and the agent never changed (e.g. tsconfig, shadcn ui components, lockfiles, public assets) when scope is 'Last Agent Turn'; binaries.


## Repair pass (Claude, 2026-11-25)

Recreated:
- assets/{icon,favicon,splash-icon,android-icon-foreground,android-icon-background,android-icon-monochrome}.png: copied from expo-template-blank-typescript@58.0.35 (stock Expo placeholder icons, not Billkit branding).
- package-lock.json: regenerated with npm.
- docs/screenshots/*.png (11 files referenced in README): re-captured from the rebuilt web export with the repo's own playwright.screenshots.config.ts (real captures, not mockups).
- .gitignore: added .env.* (keeping !.env.example).

No source changes were needed.

Checks run locally on 2026-11-25 (Node 22.23.4, the CI version; npm install was done with Node 25):
- npm install: OK, package-lock.json regenerated (all from registry.npmjs.org)
- npm run lint: pass
- npm run typecheck (tsc --noEmit): pass
- jest: 3 suites, 15 tests pass (matches the Cursor run)
- npx expo export --platform web: pass (dist/)
- Playwright web e2e (chromium, CI=true): 5 passed (matches the Cursor run)

Note: under heavy machine load the first cold Jest run timed out on the first component test of a few suites (default 5s timeout while modules transform); a warm re-run passes. Not a code problem, but CI on a cold cache could be slow on that first test.

Still missing / needs a person: real app icons; Maestro flows not run; Apple/Google/Expo accounts, Supabase project + edge functions, Stripe secrets on the functions, DNS. No EAS build was run.

## App icons (Claude, 2026-11-25)

- Replaced the stock Expo placeholders in `assets/` with Billkit icons, rendered by the new `scripts/generate-icon.mjs` (plain Node, no dependencies, same approach as stamply-mobile) from the web app's `billkit/app/icon.svg` (cream glyph on #1F4D3A). Outputs: icon (1024, full-bleed), splash-icon (glyph only), favicon (48, rounded tile), Android adaptive background/foreground/monochrome (glyph at 72% for the safe zone).
- NOTE for Mustafa: the web favicon `app/icon.svg` draws an **M**, while the web header mark (`components/brand.tsx`) is a **B** in a green tile. The icons follow the only vector asset (the M). If B is the intended mark, fix `app/icon.svg` in billkit and update the path in `scripts/generate-icon.mjs`, then re-run it.
- `app.config.ts`: adaptive-icon and splash background changed from the in-app teal #0E6B66 to the logo colour #1F4D3A (splash imageWidth 180 -> 96, since the image is now the tightly framed glyph). Notification tint left as is.
- Checks: lint pass, typecheck pass, jest 3 suites / 15 tests pass, `expo config` resolves.
