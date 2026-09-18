"use client";

import { Button, Chip } from "@heroui/react";
import { NumberValue } from "./number-value";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

type Label = "positive" | "neutral" | "negative";
type Mood = {
  id: string;
  name: string;
  word: string;
  createdAt: string;
  sentiment: { label: Label; score: number; emoji: string } | null;
};
type Vibe = { avgScore: number; positive: number; neutral: number; negative: number };
type Feed = { joinOrigin?: string | null; vibe?: Vibe | null; totalWords: number; totalPeople: number; moods: Mood[] };

// Change stream pushes are the fast path. Polling is the safety net.
const ABOUT_URL = "https://claude.ai/artifact/F4XYKuUqcbMm355PiSREfA";
const POLL_FAST_MS = 2000;
const POLL_SLOW_MS = 10000;
// Newest words are biggest; older ones settle down.
const SIZES = ["text-6xl", "text-5xl", "text-4xl", "text-3xl", "text-2xl"];
// Colour means sentiment (DESIGN.md §2). Unlabelled words read as neutral.
const TINT: Record<Label, string> = {
  positive: "text-[var(--room-teal)]",
  neutral: "text-white",
  negative: "text-[var(--room-coral)]",
};

export default function StagePage() {
  const [joinUrl, setJoinUrl] = useState("");
  const [feed, setFeed] = useState<Feed>({ totalWords: 0, totalPeople: 0, moods: [] });
  const [live, setLive] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [armed, setArmed] = useState(false);
  const [resetting, setResetting] = useState(false);

  // First press arms, second press wipes. Disarms itself after 3s.
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);

  const reset = async () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    setResetting(true);
    try {
      const res = await fetch("/api/moods", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      seen.current.clear();
      setFresh(new Set());
      setFeed((f) => ({ ...f, vibe: null, totalWords: 0, totalPeople: 0, moods: [] }));
    } catch {
      // The next poll shows the truth either way.
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/moods", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Feed;
        if (stop) return;
        const incoming = data.moods.filter((m) => !seen.current.has(m.id)).map((m) => m.id);
        incoming.forEach((id) => seen.current.add(id));
        setFresh(firstLoad.current ? new Set() : new Set(incoming));
        firstLoad.current = false;
        setFeed(data);
        // QR: the public host if the server names one, else this page's host.
        setJoinUrl(`${data.joinOrigin || window.location.origin}/join`);
        setLive(true);
      } catch {
        if (!stop) setLive(false);
      }
    };
    tick();

    let t = window.setInterval(tick, POLL_FAST_MS);
    const repoll = (ms: number) => {
      window.clearInterval(t);
      t = window.setInterval(tick, ms);
    };

    const es = new EventSource("/api/moods/stream");
    es.addEventListener("ready", () => {
      setStreaming(true);
      repoll(POLL_SLOW_MS);
    });
    es.addEventListener("mood", () => void tick());
    es.onerror = () => {
      // EventSource retries by itself; poll fast until it is back.
      setStreaming(false);
      repoll(POLL_FAST_MS);
    };

    return () => {
      stop = true;
      es.close();
      window.clearInterval(t);
    };
  }, []);

  const shown = feed.moods.slice(0, 18);

  return (
    <main className="grid flex-1 grid-cols-1 gap-6 p-6 lg:h-dvh lg:max-h-dvh lg:min-h-0 lg:flex-none lg:overflow-hidden lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-8 lg:p-10">
      {/* Left: scan to join */}
      <section className="glass flex flex-col items-center justify-between gap-4 rounded-[2.5rem] p-8 lg:min-h-0 lg:p-10">
        <header className="flex w-full flex-col gap-4">
          <p className="text-muted text-sm font-medium tracking-[0.25em] uppercase">The room&apos;s mood</p>
          <h1 className="display text-4xl font-semibold xl:text-6xl">How&apos;s the room feeling?</h1>
        </header>

        <div className="qr-halo rounded-[2rem] bg-white p-5" data-testid="qr">
          {joinUrl ? (
            <QRCodeSVG
              bgColor="#ffffff"
              className="h-auto w-[min(56vw,22rem,36vh)] xl:w-[min(26rem,38vh)]"
              fgColor="#0b1424"
              level="M"
              size={512}
              title="Scan to join"
              value={joinUrl}
            />
          ) : (
            <div className="aspect-square w-[min(56vw,22rem,36vh)] xl:w-[min(26rem,38vh)]" />
          )}
        </div>

        <footer className="flex w-full flex-col items-center gap-2 text-center">
          <p className="text-2xl font-medium">Scan. Type one word. Watch it land.</p>
          <p className="text-muted font-mono text-sm break-all" data-testid="join-url">
            {joinUrl.replace(/^https?:\/\//, "")}
          </p>
          <a
            className="glass-pill mt-2 px-4 py-2 font-mono text-sm text-white/85 underline-offset-4 hover:underline"
            data-testid="about-link"
            href={ABOUT_URL}
            rel="noreferrer"
            target="_blank"
          >
            {ABOUT_URL.replace(/^https?:\/\//, "")}
          </a>
        </footer>
      </section>

      {/* Right: live room. Step 2 swaps the word field for the cluster view. */}
      <section className="glass flex min-h-[60vh] flex-col gap-5 rounded-[2.5rem] p-8 lg:min-h-0 lg:p-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex gap-10">
            <Stat label="words" value={feed.totalWords} />
            <Stat label="people" value={feed.totalPeople} />
          </div>
          <Chip className="glass-pill px-4 py-2 text-white" size="lg" variant="soft">
            <span
              className={`mr-2 inline-block size-2 rounded-full ${live ? "bg-success pulse-dot" : "bg-warning"}`}
            />
            {!live ? "Connecting…" : streaming ? "Live · Atlas change stream" : "Live · polling Atlas"}
          </Chip>
        </header>

        {shown.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="display text-5xl font-semibold">It&apos;s quiet in here.</p>
            <p className="text-muted text-xl">Be the first. Scan the code and send one word.</p>
          </div>
        ) : (
          <ul
            aria-label="Latest words"
            className="flex min-h-0 flex-1 flex-wrap content-start items-baseline justify-center gap-3 overflow-hidden"
            data-testid="word-field"
          >
            {shown.map((m, i) => (
              <li
                key={m.id}
                className={`${fresh.has(m.id) ? "word-in" : ""} glass-pill flex items-baseline gap-[0.4em] px-[0.7em] py-[0.32em] leading-none ${SIZES[Math.min(SIZES.length - 1, Math.floor(i / 3))]}`}
                style={{ opacity: Math.max(0.45, 1 - i * 0.025) }}
              >
                <span className={`font-semibold tracking-tight ${TINT[m.sentiment?.label ?? "neutral"]}`}>{m.word}</span>
                <span className="text-xs font-medium tracking-normal text-white/55">{m.name}</span>
              </li>
            ))}
          </ul>
        )}

        <footer className="flex flex-col items-end justify-between gap-4 sm:flex-row">
          <LatestRead mood={feed.moods.find((m) => m.sentiment) ?? null} />
          <div className="flex shrink-0 items-end gap-4">
            <Button
              className={`glass-pill h-auto px-5 py-3 text-base font-medium ${armed ? "text-[var(--room-coral)]" : "text-white/85"}`}
              data-testid="reset"
              isDisabled={resetting}
              variant="ghost"
              onPress={reset}
            >
              {resetting ? "Clearing…" : armed ? "Sure? Press again" : "Reset"}
            </Button>
            <VibeGauge vibe={feed.vibe ?? null} />
          </div>
        </footer>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <NumberValue className="text-6xl font-semibold tracking-tight tabular-nums" value={value} />
      <span className="text-muted text-sm tracking-[0.2em] uppercase">{label}</span>
    </div>
  );
}

const MOOD_WORDS: [number, string][] = [
  [0.6, "Glowing"],
  [0.25, "Upbeat"],
  [-0.25, "Mixed"],
  [-0.6, "Uneasy"],
  [-2, "Heavy"],
];

function labelOf(score: number): Label {
  return score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral";
}

/** What Claude Haiku made of the most recent word. */
function LatestRead({ mood }: { mood: Mood | null }) {
  if (!mood?.sentiment) return <span />;
  const { label, score } = mood.sentiment;
  return (
    <p className="glass-pill flex min-w-0 items-baseline gap-x-2 px-5 py-3 text-base whitespace-nowrap" data-testid="latest-read">
      <span className="text-muted text-xs tracking-[0.2em] uppercase">Claude Haiku read</span>
      <span className="font-semibold text-white">{mood.word}</span>
      <span className="text-muted">as</span>
      <span className={`font-semibold ${TINT[label]}`}>
        {label} {score > 0 ? "+" : ""}
        {score.toFixed(2)}
      </span>
    </p>
  );
}

/** Half-dial for the room's average sentiment. -1 is far left, +1 far right. */
function VibeGauge({ vibe }: { vibe: Vibe | null }) {
  const score = Math.max(-1, Math.min(1, vibe?.avgScore ?? 0));
  const total = (vibe?.positive ?? 0) + (vibe?.neutral ?? 0) + (vibe?.negative ?? 0);
  const word = MOOD_WORDS.find(([min]) => score >= min)?.[1] ?? "Mixed";
  const tone = TINT[labelOf(score)];
  const fill = ((score + 1) / 2) * 100;
  const arc = "M 24 124 A 96 96 0 0 1 216 124";
  const pct = (n: number) => (total ? `${(n / total) * 100}%` : "0%");

  return (
    <figure
      aria-label={`Room vibe ${score.toFixed(2)} on a scale from -1 to 1, ${word}`}
      className="glass-pill flex w-[17rem] shrink-0 flex-col items-center gap-1.5 !rounded-[2rem] px-5 pt-4 pb-3"
      data-testid="vibe-gauge"
    >
      <figcaption className="text-muted flex w-full items-center justify-between text-xs tracking-[0.2em] uppercase">
        <span>Room vibe</span>
        <span>Claude Haiku</span>
      </figcaption>

      <div className="relative w-full">
        <svg className="w-full overflow-visible" viewBox="0 0 240 136">
          <defs>
            <linearGradient id="vibe-grad" x1="24" x2="216" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--room-coral)" />
              <stop offset="0.5" stopColor="white" />
              <stop offset="1" stopColor="var(--room-teal)" />
            </linearGradient>
            <filter id="vibe-glow" x="-20%" y="-20%" width="140%" height="160%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          {/* track, glow, then the lit part of the arc */}
          <path d={arc} fill="none" stroke="white" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="14" />
          <path
            className="gauge-arc"
            d={arc}
            fill="none"
            filter="url(#vibe-glow)"
            opacity="0.7"
            pathLength={100}
            stroke="url(#vibe-grad)"
            strokeDasharray={`${fill} 100`}
            strokeLinecap="round"
            strokeWidth="14"
          />
          <path
            className="gauge-arc"
            d={arc}
            fill="none"
            pathLength={100}
            stroke="url(#vibe-grad)"
            strokeDasharray={`${fill} 100`}
            strokeLinecap="round"
            strokeWidth="14"
          />

          {/* ticks at -1, -0.5, 0, +0.5, +1 */}
          {[-90, -45, 0, 45, 90].map((deg) => (
            <line
              key={deg}
              stroke="white"
              strokeLinecap="round"
              strokeOpacity={deg === 0 ? 0.7 : 0.35}
              strokeWidth="2"
              transform={`rotate(${deg} 120 124)`}
              x1="120"
              x2="120"
              y1="46"
              y2={deg === 0 ? 56 : 52}
            />
          ))}

          <g className="gauge-needle" style={{ transform: `rotate(${score * 90}deg)`, transformOrigin: "120px 124px" }}>
            <path d="M 117 124 L 120 40 L 123 124 Z" fill="white" />
          </g>
          <circle cx="120" cy="124" fill="white" r="7" />
          <circle cx="120" cy="124" fill="var(--room-ink)" r="3" />
        </svg>
        <span className="text-muted absolute bottom-0 left-0 text-xs">−1</span>
        <span className="text-muted absolute right-0 bottom-0 text-xs">+1</span>
      </div>

      <div className="flex items-baseline gap-3">
        <NumberValue
          className={`text-4xl font-semibold tracking-tight tabular-nums ${tone}`}
          maximumFractionDigits={2}
          minimumFractionDigits={2}
          signDisplay="exceptZero"
          value={score}
        />
        <span className={`text-xl font-medium ${tone}`} data-testid="vibe-word">
          {total ? word : "Waiting"}
        </span>
      </div>

      {/* share of positive / neutral / negative words */}
      <div aria-hidden className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-white/10">
        <i className="gauge-bar bg-[var(--room-teal)]" style={{ width: pct(vibe?.positive ?? 0) }} />
        <i className="gauge-bar bg-white/80" style={{ width: pct(vibe?.neutral ?? 0) }} />
        <i className="gauge-bar bg-[var(--room-coral)]" style={{ width: pct(vibe?.negative ?? 0) }} />
      </div>
      <p className="flex w-full justify-between text-xs" data-testid="vibe-counts">
        <span className={TINT.positive}>{vibe?.positive ?? 0} positive</span>
        <span className={TINT.neutral}>{vibe?.neutral ?? 0} neutral</span>
        <span className={TINT.negative}>{vibe?.negative ?? 0} negative</span>
      </p>
    </figure>
  );
}
