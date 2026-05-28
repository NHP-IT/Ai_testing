import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { judgeProfileSchema } from "@/lib/schemas/judge";
import { readJudgeProfiles, writeJudgeProfiles } from "@/lib/config/judgeConfig";
import { ConfigConflictError } from "@/lib/config/store";

type Params = { params: Promise<{ profile_id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { profile_id } = await params;
  try {
    const partial = judgeProfileSchema.partial().parse(await request.json());
    const { data, etag } = await readJudgeProfiles();
    const idx = data.profiles.findIndex((p) => p.profile_id === profile_id);
    if (idx === -1) {
      return NextResponse.json({ error: `Judge profile '${profile_id}' not found.` }, { status: 404 });
    }
    const merged = judgeProfileSchema.parse({ ...data.profiles[idx], ...partial });
    const updated = data.profiles.map((p, i) => (i === idx ? merged : p));
    await writeJudgeProfiles({ profiles: updated }, etag);
    return NextResponse.json({ profile: merged });
  } catch (err) {
    if (err instanceof ConfigConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { profile_id } = await params;
  try {
    const { data, etag } = await readJudgeProfiles();
    if (!data.profiles.some((p) => p.profile_id === profile_id)) {
      return NextResponse.json({ error: `Judge profile '${profile_id}' not found.` }, { status: 404 });
    }
    await writeJudgeProfiles(
      { profiles: data.profiles.filter((p) => p.profile_id !== profile_id) },
      etag
    );
    return NextResponse.json({ removed: profile_id });
  } catch (err) {
    if (err instanceof ConfigConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
