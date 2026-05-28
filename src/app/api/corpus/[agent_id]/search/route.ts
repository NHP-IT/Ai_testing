import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { agentIdSchema } from "@/lib/schemas/common";
import { readChunks } from "@/lib/config/corpus";
import { bm25Search } from "@/lib/retrieval/bm25";

type Params = { params: Promise<{ agent_id: string }> };

const bodySchema = z.object({
  query: z.string().min(1, "query is required"),
  source_filter: z.string().optional(),
  top_n: z.number().int().min(1).max(20).default(5)
});

export async function POST(request: Request, { params }: Params) {
  const { agent_id } = await params;

  const agentParsed = agentIdSchema.safeParse(agent_id);
  if (!agentParsed.success) {
    return NextResponse.json({ error: "Invalid agent_id" }, { status: 400 });
  }

  try {
    const body = bodySchema.parse(await request.json());
    const chunks = await readChunks(agentParsed.data);

    const results = bm25Search(body.query, chunks, {
      topN: body.top_n,
      sourceFilter: body.source_filter
    });

    return NextResponse.json({
      results: results.map((r) => ({
        chunk_id: r.chunk.chunk_id,
        document_id: r.chunk.document_id,
        title: r.chunk.title,
        tags: r.chunk.tags,
        text: r.chunk.text,
        score: Math.round(r.score * 1000) / 1000
      }))
    });
  } catch (err) {
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
