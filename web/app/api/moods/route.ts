import { NextResponse } from "next/server";
import { moods, ROOM } from "@/lib/mongo";
import { classify } from "@/lib/sentiment";

export const dynamic = "force-dynamic";

const MAX_WORD = 24;
const MAX_NAME = 30;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    word?: unknown;
  } | null;

  const name = String(body?.name ?? "").trim().slice(0, MAX_NAME);
  // One word only: keep the first token, drop anything after a space.
  const word = String(body?.word ?? "").trim().split(/\s+/)[0]?.slice(0, MAX_WORD) ?? "";

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!word) return NextResponse.json({ error: "Type one word" }, { status: 400 });

  // Classify first so the change-stream insert event already carries it.
  const sentiment = await classify(word);

  const doc = {
    name,
    word,
    wordNorm: word.toLowerCase(),
    room: ROOM,
    createdAt: new Date(),
    sentiment,
    embedding: null,
  };
  const col = await moods();
  const { insertedId } = await col.insertOne(doc);

  return NextResponse.json({ id: insertedId.toString(), word, name, sentiment }, { status: 201 });
}

// Stage "Reset": wipe this room's words so the next session starts clean.
export async function DELETE() {
  const col = await moods();
  const { deletedCount } = await col.deleteMany({ room: ROOM });
  return NextResponse.json({ deleted: deletedCount });
}

export async function GET() {
  const col = await moods();
  const [latest, totalWords, people, vibeRows] = await Promise.all([
    col
      .find({ room: ROOM }, { projection: { embedding: 0 } })
      .sort({ createdAt: -1 })
      .limit(60)
      .toArray(),
    col.countDocuments({ room: ROOM }),
    col.distinct("name", { room: ROOM }),
    col
      .aggregate<{ avgScore: number; positive: number; neutral: number; negative: number }>([
        { $match: { room: ROOM, sentiment: { $ne: null } } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: "$sentiment.score" },
            positive: { $sum: { $cond: [{ $eq: ["$sentiment.label", "positive"] }, 1, 0] } },
            neutral: { $sum: { $cond: [{ $eq: ["$sentiment.label", "neutral"] }, 1, 0] } },
            negative: { $sum: { $cond: [{ $eq: ["$sentiment.label", "negative"] }, 1, 0] } },
          },
        },
        { $project: { _id: 0 } },
      ])
      .toArray(),
  ]);

  return NextResponse.json({
    // Public host for the QR when the stage itself runs on localhost.
    joinOrigin: process.env.PUBLIC_ORIGIN ?? null,
    totalWords,
    totalPeople: people.length,
    vibe: vibeRows[0] ?? null,
    moods: latest.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      word: m.word,
      sentiment: m.sentiment ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
