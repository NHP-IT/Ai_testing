import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { agentSchema } from "@/lib/schemas/agent";
import { readAgentRegistry, writeAgentRegistry } from "@/lib/config/agentRegistry";
import { ConfigConflictError } from "@/lib/config/store";

type Params = { params: Promise<{ agent_id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { agent_id } = await params;
  try {
    const partial = agentSchema.partial().parse(await request.json());
    const { data, etag } = await readAgentRegistry();
    const idx = data.agents.findIndex((a) => a.agent_id === agent_id);
    if (idx === -1) {
      return NextResponse.json({ error: `Agent '${agent_id}' not found.` }, { status: 404 });
    }
    const merged = agentSchema.parse({ ...data.agents[idx], ...partial });
    const updated = data.agents.map((a, i) => (i === idx ? merged : a));
    await writeAgentRegistry({ agents: updated }, etag);
    return NextResponse.json({ agent: merged });
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
  const { agent_id } = await params;
  try {
    const { data, etag } = await readAgentRegistry();
    if (!data.agents.some((a) => a.agent_id === agent_id)) {
      return NextResponse.json({ error: `Agent '${agent_id}' not found.` }, { status: 404 });
    }
    await writeAgentRegistry(
      { agents: data.agents.filter((a) => a.agent_id !== agent_id) },
      etag
    );
    return NextResponse.json({ removed: agent_id });
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
