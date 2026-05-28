import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

const inputSchema = z.object({
  base_url: z.string().url("base_url must be a valid URL"),
  api_key: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const { base_url, api_key } = inputSchema.parse(await request.json());
    const url = `${base_url.replace(/\/+$/, "")}/models`;

    const res = await fetch(url, {
      headers: api_key ? { Authorization: `Bearer ${api_key}` } : {},
      signal: AbortSignal.timeout(10_000)
    });

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        message: `Judge server returned ${res.status}: ${await res.text()}`
      });
    }

    const payload = (await res.json()) as { data?: unknown[] };
    const count = Array.isArray(payload.data) ? payload.data.length : undefined;

    return NextResponse.json({
      ok: true,
      message:
        count !== undefined
          ? `Connected. ${count} model(s) available.`
          : "Connected. Judge server responded."
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { ok: false, message: err.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json({ ok: false, message: isTimeout ? "Judge server timed out (10s)." : msg });
  }
}
