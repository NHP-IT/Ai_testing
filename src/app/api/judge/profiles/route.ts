import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { judgeProfileSchema } from "@/lib/schemas/judge";
import { readJudgeProfiles, writeJudgeProfiles } from "@/lib/config/judgeConfig";
import { ConfigConflictError } from "@/lib/config/store";

export async function GET() {
  try {
    const { data, etag } = await readJudgeProfiles();
    const res = NextResponse.json({ profiles: data.profiles });
    if (etag) res.headers.set("ETag", etag);
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const profile = judgeProfileSchema.parse(await request.json());
    const { data, etag } = await readJudgeProfiles();
    if (data.profiles.some((p) => p.profile_id === profile.profile_id)) {
      return NextResponse.json(
        { error: `Judge profile '${profile.profile_id}' already exists.` },
        { status: 409 }
      );
    }
    await writeJudgeProfiles({ profiles: [...data.profiles, profile] }, etag);
    return NextResponse.json({ profile }, { status: 201 });
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
