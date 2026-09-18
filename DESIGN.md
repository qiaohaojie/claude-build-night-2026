# Design contract — The room's mood

Read this before changing any product UI (`.tsx`, `.jsx`, `.css`).

## 1. Brand

- The room's mood: a live event wall. Audience: a room of people with phones.
- Tone: warm, short, sentence case. It must feel like one shared sky.

## 2. Theme and tokens

- HeroUI default dark theme plus the "Dusk glass" layer in
  `web/app/globals.css` (unlayered, imported last). Dark only. Look: Apple
  liquid glass over a dusk sky (navy above, warm horizon below). No purple.
- Tokens: `--room-ink` (page), `--room-sky`, `--room-dusk` (sky lights),
  `--room-teal`, `--room-coral`. `--accent` is clear white glass, not a brand
  colour. Colour on a word means sentiment: teal positive, white neutral, coral
  negative. Always paired with a text count, never colour alone.
- Surfaces: `.glass` panels (white gradient fill, bright top edge, 36px blur,
  deep drop shadow), `.glass-pill` capsules for words and status. Radius
  2.5rem on stage panels, 1.5rem on phone cards. QR sits in a glass bezel.
- Type: SF Pro via `-apple-system`, Geist fallback. `.display` headline is
  solid white, tracking -0.035em. No gradient text. Counters are tabular.
- Motion: slow aurora drift, `word-in` on landing, `word-out` on send. All
  off under `prefers-reduced-motion`.

## 3. Layout

- Stage `/`: two glass panels, QR 2fr / live room 3fr, stacks under `lg`.
  Must fit 1440×900 with no scroll.
- Phone `/join`: one centred column, max-w-md, one input per step.

## 4. Component selection

- Forms: `Form` + `TextField` (`variant="secondary"` on glass) + `Button`.
- Counters: HeroUI Pro `NumberValue` (the repo's only Pro component — see
  `AGENTS.md` for the open-source swap). Status: `Chip` soft.

## 5. Copy voice

- One short sentence. Second person. No exclamation marks, no emoji.

## 6. Accessibility floor

- 44px touch targets (phone controls are 56px+). Visible focus rings.
  Live text uses `role="status"`. QR has a title and the URL in text.

## 7. Forbidden patterns

- Light mode, a second component library, emoji as icons, hex colours in
  components (use the tokens), login or any field beyond name + word.
