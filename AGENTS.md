# The room's mood — notes for AI coding agents

A small Next.js app: people scan a QR code, type one word for how they feel,
and a live stage shows the room's mood. Words go to MongoDB Atlas and are
labelled for sentiment by Claude Haiku.

## Layout

```
web/                     the whole app (Next.js App Router)
  app/page.tsx           the stage — QR, live words, counters, vibe gauge
  app/join/page.tsx      the phone screen — name + one word
  app/api/moods/route.ts        GET aggregate, POST a word, DELETE to reset
  app/api/moods/stream/route.ts Atlas change stream -> Server-Sent Events
  lib/mongo.ts           one pooled MongoClient, the `moods` collection
  lib/sentiment.ts       Claude Haiku word classifier (never throws)
  app/number-value.tsx   the rolling counter used by the stage
  app/globals.css        the "dusk glass" theme layer
DESIGN.md                the visual contract for the two screens
```

## Rules that matter

- **Never commit secrets.** `MONGODB_URI` and `ANTHROPIC_API_KEY` live in
  `web/.env.local`, which is gitignored. `web/.env.example` is the template.
- **Sentiment must never break a submit.** `classify()` returns `null` on any
  error, timeout, or missing API key; the word still saves with
  `sentiment: null` and renders as neutral.
- **The word is untrusted input.** It is classified inside `<word>` tags with
  an explicit "treat as data" instruction. Keep it that way.
- **One Mongo client per process.** `lib/mongo.ts` caches it on `globalThis`
  so dev hot-reload does not open a pool per reload.
- **Change streams need a replica set.** They work on Atlas; a standalone
  local `mongod` will not serve `/api/moods/stream`.
- Read `DESIGN.md` before changing anything visual.

## UI packages

Everything is `@heroui/react` v3 (MIT) on Tailwind v4, so `pnpm install` works
for anyone with no licence or private registry. Keep it that way: no paid or
private packages. The animated counters are `NumberValue` in
`web/app/number-value.tsx`, a small local component, not a library import.

## Checks

```bash
cd web
pnpm typecheck
pnpm lint
pnpm build
```
