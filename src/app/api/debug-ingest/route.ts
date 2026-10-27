import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const LOG_PATH = path.join(process.cwd(), ".cursor", "debug-ffc48a.log");
const INGEST =
  "http://127.0.0.1:7762/ingest/a3a263e2-4994-425b-8858-1c3468f5f9c3";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const entry = {
    sessionId: "ffc48a",
    ...body,
    timestamp: typeof body.timestamp === "number" ? body.timestamp : Date.now(),
    via: "api/debug-ingest",
  };

  try {
    await mkdir(path.dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // ignore read-only FS
  }

  try {
    await fetch(INGEST, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "ffc48a",
      },
      body: JSON.stringify(entry),
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
}
