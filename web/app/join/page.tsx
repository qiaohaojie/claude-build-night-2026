"use client";

import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useEffect, useState } from "react";

const NAME_KEY = "room-mood:name";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [word, setWord] = useState("");
  const [flying, setFlying] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NAME_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setName(saved);
    } catch {}
  }, []);

  const saveName = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = nameDraft.trim().slice(0, 30);
    if (!clean) return;
    setName(clean);
    try {
      window.localStorage.setItem(NAME_KEY, clean);
    } catch {}
  };

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = word.trim().split(/\s+/)[0] ?? "";
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/moods", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, word: clean }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not send");
      setFlying(clean);
      setWord("");
      setSentCount((n) => n + 1);
      window.setTimeout(() => setFlying(null), 1100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-10">
      <header className="flex flex-col gap-3">
        <p className="text-muted text-sm font-medium tracking-[0.2em] uppercase">The room&apos;s mood</p>
        <h1 className="display text-5xl font-semibold">
          {name ? "One word. How do you feel?" : "First, who are you?"}
        </h1>
      </header>

      {!name ? (
        <Form className="glass flex flex-col gap-5 rounded-3xl p-6" onSubmit={saveName}>
          <TextField
            autoFocus
            isRequired
            maxLength={30}
            name="name"
            value={nameDraft}
            variant="secondary"
            onChange={setNameDraft}
          >
            <Label>Your name</Label>
            <Input autoComplete="given-name" className="h-14 w-full text-lg" data-testid="name-input" placeholder="e.g. George" />
            <FieldError />
          </TextField>
          <Button className="h-14 w-full text-base" data-testid="name-submit" size="lg" type="submit">
            Continue
          </Button>
        </Form>
      ) : (
        <Form className="glass relative flex flex-col gap-5 rounded-3xl p-6" onSubmit={send}>
          <TextField
            autoFocus
            isRequired
            isInvalid={!!error}
            maxLength={24}
            name="word"
            value={word}
            variant="secondary"
            onChange={(v) => setWord(v.replace(/\s+/g, ""))}
          >
            <Label>Hi {name}. Right now I feel…</Label>
            <Input
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              className="h-16 w-full text-center text-2xl font-semibold"
              data-testid="word-input"
              enterKeyHint="send"
              placeholder="curious"
            />
            <FieldError>{error}</FieldError>
          </TextField>
          <Button
            className="h-14 w-full text-base"
            data-testid="word-submit"
            isDisabled={!word.trim()}
            isPending={busy}
            size="lg"
            type="submit"
          >
            Send it to the room
          </Button>

          {flying ? (
            <span
              aria-hidden
              className="word-out pointer-events-none absolute inset-x-0 top-16 text-center text-3xl font-semibold text-white"
            >
              {flying}
            </span>
          ) : null}
        </Form>
      )}

      <footer className="text-muted flex min-h-6 items-center justify-between text-sm" role="status">
        {name && sentCount > 0 ? (
          <span data-testid="sent-status">
            Sent {sentCount} {sentCount === 1 ? "word" : "words"}. Look up at the screen, then send another.
          </span>
        ) : (
          <span>No login. Just one word.</span>
        )}
        {name ? (
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              setName("");
              setNameDraft("");
            }}
          >
            Not {name}?
          </Button>
        ) : null}
      </footer>
    </main>
  );
}
