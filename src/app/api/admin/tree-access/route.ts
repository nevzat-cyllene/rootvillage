import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    id?: string;
    status?: "approved" | "rejected";
    role?: "viewer" | "contributor";
  };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tree_access")
    .update({
      status: body.status,
      role: body.status === "approved" ? (body.role ?? "viewer") : undefined,
      decided_at: new Date().toISOString(),
      decided_by: profile.id,
    })
    .eq("id", body.id);

  // #region agent log
  try {
    const { appendFile, mkdir } = await import("fs/promises");
    const path = await import("path");
    await mkdir(path.join(process.cwd(), ".cursor"), { recursive: true });
    await appendFile(
      path.join(process.cwd(), ".cursor", "debug-947054.log"),
      `${JSON.stringify({
        sessionId: "947054",
        runId: "post-fix",
        hypothesisId: "B",
        location: "api/admin/tree-access:PATCH",
        message: "admin decided tree_access",
        data: { id: body.id, status: body.status, role: body.role ?? null, error: error?.message ?? null },
        timestamp: Date.now(),
      })}\n`,
      "utf8",
    );
  } catch {
    /* ignore */
  }
  // #endregion

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
