import { NextResponse } from "next/server";
import { parseCsv } from "@/lib/csv";
import { validateCaseRows } from "@/lib/schemas/case";
import { readAgentRegistry } from "@/lib/config/agentRegistry";
import { FabricRequestError } from "@/lib/fabric/errors";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }

    const content = await file.text();
    const { headers, rows } = parseCsv(content);

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty." }, { status: 422 });
    }

    let agents: Awaited<ReturnType<typeof readAgentRegistry>>["data"]["agents"] = [];
    try {
      const reg = await readAgentRegistry();
      agents = reg.data.agents;
    } catch (err) {
      if (!(err instanceof FabricRequestError)) throw err;
      // OneLake not yet configured — still validate structure but skip agent cross-check
    }

    const result = validateCaseRows(rows, agents);
    const agentIds = [...new Set(result.cases.map((c) => c.agent_id))];

    return NextResponse.json({
      ok: result.ok,
      row_count: rows.length,
      case_count: result.cases.length,
      agent_ids: agentIds,
      headers,
      issues: result.issues
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
