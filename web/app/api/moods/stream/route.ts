import { moods, ROOM } from "@/lib/mongo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Change Streams -> Server-Sent Events. Atlas pushes each insert to this
// route; the route pushes a small event to the stage, which then refreshes.
export async function GET(req: Request) {
  const col = await moods();
  const stream = col.watch(
    [{ $match: { operationType: "insert", "fullDocument.room": ROOM } }],
    { fullDocument: "default" },
  );
  const enc = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(enc.encode(s));
        } catch {}
      };
      const close = () => {
        clearInterval(heartbeat);
        stream.close().catch(() => {});
        try {
          controller.close();
        } catch {}
      };

      send("event: ready\ndata: {}\n\n");
      heartbeat = setInterval(() => send(": ping\n\n"), 15000);

      stream.on("change", (change) => {
        if (change.operationType !== "insert") return;
        const d = change.fullDocument;
        send(`event: mood\ndata: ${JSON.stringify({ id: String(change.documentKey._id), word: d.word, name: d.name, sentiment: d.sentiment ?? null })}\n\n`);
      });
      stream.on("error", close);
      req.signal.addEventListener("abort", close);
    },
    cancel() {
      clearInterval(heartbeat);
      stream.close().catch(() => {});
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
