import { NextResponse } from "next/server";
import { agentIdSchema } from "@/lib/schemas/common";
import { readChunks, writeChunks } from "@/lib/config/corpus";

type Params = { params: Promise<{ agent_id: string; document_id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { agent_id, document_id } = await params;

  const agentParsed = agentIdSchema.safeParse(agent_id);
  if (!agentParsed.success) {
    return NextResponse.json({ error: "Invalid agent_id" }, { status: 400 });
  }

  try {
    const existing = await readChunks(agentParsed.data);
    if (!existing.some((c) => c.document_id === document_id)) {
      return NextResponse.json(
        { error: `Document '${document_id}' not found.` },
        { status: 404 }
      );
    }

    const updated = existing.filter((c) => c.document_id !== document_id);
    await writeChunks(agentParsed.data, updated);
    return NextResponse.json({ removed: document_id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
