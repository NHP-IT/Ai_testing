import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { agentSchema } from "@/lib/schemas/agent";
import { readAgentRegistry, writeAgentRegistry } from "@/lib/config/agentRegistry";
import { ConfigConflictError } from "@/lib/config/store";

export async function GET() {
  try {
    const { data, etag } = await readAgentRegistry();
    const res = NextResponse.json({ agents: data.agents });
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
    const agent = agentSchema.parse(await request.json());
    const { data, etag } = await readAgentRegistry();
    if (data.agents.some((a) => a.agent_id === agent.agent_id)) {
      return NextResponse.json(
        { error: `Agent '${agent.agent_id}' already exists.` },
        { status: 409 }
      );
    }
    await writeAgentRegistry({ agents: [...data.agents, agent] }, etag);
    return NextResponse.json({ agent }, { status: 201 });
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
