# The room's mood

A hackathon project: people scan a QR code, type one word for how they feel,
and a live stage shows the room's mood. Words are stored in MongoDB Atlas and
labelled by Claude Haiku for sentiment.

Two screens:

- **`/`** — the stage. A QR code to join, words landing live as people submit,
  a running count of words and people, and a gauge of the room's vibe.
- **`/join`** — the phone screen. Your name, then one word.

> [!IMPORTANT]
> **This repo uses HeroUI Pro, a paid library. `pnpm install` will fail for you without a HeroUI Pro license.**
>
> This was built for a hackathon under time pressure, so I used my usual code
> template, which includes HeroUI Pro. Almost all the UI uses the free, open-source
> `@heroui/react` components. The only Pro component is `NumberValue` (the big
> animated numbers in `web/app/page.tsx`), plus the Pro CSS import in
> `web/app/globals.css`. If you don't have a Pro license, installing
> `@heroui-pro/react` will fail. The fix is small: ask your AI coding assistant to
> "replace the HeroUI Pro `NumberValue` with a plain element or an open-source
> HeroUI component, and remove `@heroui-pro/react` from `web/package.json`,
> `web/pnpm-workspace.yaml` and `web/app/globals.css`." After that, everything
> runs on open-source packages. No HeroUI Pro source code is included in this repo.

## Run it

```bash
cd web
cp .env.example .env.local   # add your own MongoDB URI and Anthropic key
pnpm install
pnpm dev
```

Open http://localhost:3000 for the stage and http://localhost:3000/join on a
phone. Use your own MongoDB Atlas cluster and Anthropic API key. No
credentials are included in this repo.

### Environment

| Variable | Required | What it does |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas connection string. Must be a replica set — the live stage uses change streams, so a standalone `mongod` will not work. |
| `MONGODB_DB` | no | Database name. Defaults to `room_mood`. |
| `ANTHROPIC_API_KEY` | no | Enables Claude Haiku sentiment. Leave blank and words still save, with `sentiment: null`. |
| `PUBLIC_ORIGIN` | no | The URL encoded in the join QR code, for when the stage runs on localhost but phones need a public host. |

To let phones reach a local dev server, put a tunnel in front of it
(`cloudflared tunnel --url http://localhost:3000` or ngrok) and set
`PUBLIC_ORIGIN` to the tunnel URL. Those hosts are already allowed in
`web/next.config.ts`.

## How it works

- `POST /api/moods` trims the submission to a name and a single word, asks
  Claude Haiku for `{label, score, emoji}` (3s timeout, cached per distinct
  word, never throws), then inserts the document into MongoDB.
- `GET /api/moods/stream` opens an Atlas change stream and forwards each
  insert to the stage over Server-Sent Events, so new words appear without
  polling.
- `GET /api/moods` returns the latest words plus a `$group` aggregate of the
  room's average sentiment score and the positive / neutral / negative split.
- `DELETE /api/moods` clears the room so the next session starts fresh.

Documents look like this:

```js
{ name, word, wordNorm, room, createdAt, sentiment: { label, score, emoji } | null, embedding: null }
```

`embedding` is reserved for a vector-search follow-up and is unused today.

## Stack

Next.js 16 (App Router) · MongoDB Atlas · Anthropic Claude Haiku ·
HeroUI v3 + Tailwind v4 · TypeScript · pnpm

`DESIGN.md` is the visual contract for the two screens. `AGENTS.md` is a short
brief for AI coding assistants working in this repo.

## License

[MIT](LICENSE). Use it, copy it, change it, share it.
