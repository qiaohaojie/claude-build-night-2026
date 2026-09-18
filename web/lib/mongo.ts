import { MongoClient, type Collection } from "mongodb";
import type { Sentiment } from "./sentiment";

export type MoodDoc = {
  name: string;
  word: string;
  wordNorm: string;
  room: string;
  createdAt: Date;
  // Claude Haiku labels the word on write; MongoDB aggregates on read.
  sentiment: Sentiment | null;
  // Filled in step 2 (vector search). Kept on the doc so the shape is stable.
  embedding: number[] | null;
};

export const ROOM = "main";

const globalForMongo = globalThis as unknown as {
  _mongoClient?: Promise<MongoClient>;
  _moodIndexes?: Promise<unknown>;
};

function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (web/.env.local)");
  // One client per process; dev HMR would otherwise open a pool per reload.
  globalForMongo._mongoClient ??= new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  }).connect();
  return globalForMongo._mongoClient;
}

export async function moods(): Promise<Collection<MoodDoc>> {
  const db = (await client()).db(process.env.MONGODB_DB ?? "room_mood");
  const col = db.collection<MoodDoc>("moods");
  globalForMongo._moodIndexes ??= col.createIndex({ room: 1, createdAt: -1 });
  await globalForMongo._moodIndexes;
  return col;
}
