import { NextResponse } from "next/server";
import { z } from "zod";
import { agentIdSchema } from "@/lib/schemas/common";
import { readChunks, writeChunks, summarizeDocuments } from "@/lib/config/corpus";
import { chunkContent } from "@/lib/retrieval/chunker";

type Params = { params: Promise<{ agent_id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { agent_id } = await params;
  const parsed = agentIdSchema.safeParse(agent_id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid agent_id" }, { status: 400 });
  }

  try {
    const chunks = await readChunks(parsed.data);
    return NextResponse.json({ documents: summarizeDocuments(chunks) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

const docIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: "document_id must be lowercase alphanumeric with hyphens."
  });

function autoDocId(filename: string | null, fallback: string): string {
  if (!filename) return fallback;
  return filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

export async function POST(request: Request, { params }: Params) {
  const { agent_id } = await params;
  const agentParsed = agentIdSchema.safeParse(agent_id);
  if (!agentParsed.success) {
    return NextResponse.json({ error: "Invalid agent_id" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const textEntry = formData.get("text");

    if (!fileEntry && !textEntry) {
      return NextResponse.json(
        { error: "Provide either a file or pasted text." },
        { status: 400 }
      );
    }

    let content: string;
    let filename: string | undefined;

    if (fileEntry instanceof File) {
      content = await fileEntry.text();
      filename = fileEntry.name;
    } else {
      const raw = String(textEntry ?? "").trim();
      if (!raw) return NextResponse.json({ error: "text is empty." }, { status: 400 });
      content = raw;
    }

    const rawDocId = formData.get("document_id")
      ? String(formData.get("document_id"))
      : autoDocId(filename ?? null, `pasted-${Date.now()}`);

    const docIdParsed = docIdSchema.safeParse(rawDocId);
    if (!docIdParsed.success) {
      return NextResponse.json(
        { error: `Invalid document_id "${rawDocId}": ${docIdParsed.error.issues[0].message}` },
        { status: 400 }
      );
    }

    const title = formData.get("title")
      ? String(formData.get("title")).trim()
      : (filename ?? docIdParsed.data);

    const tagsRaw = formData.get("tags") ? String(formData.get("tags")) : "";
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const chunks = chunkContent({
      agentId: agentParsed.data,
      documentId: docIdParsed.data,
      title,
      tags,
      content,
      filename
    });

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No chunks could be extracted. Check that the content is non-empty." },
        { status: 422 }
      );
    }

    const existing = await readChunks(agentParsed.data);
    const withoutDoc = existing.filter((c) => c.document_id !== docIdParsed.data);
    await writeChunks(agentParsed.data, [...withoutDoc, ...chunks]);

    return NextResponse.json(
      { added: chunks.length, document_id: docIdParsed.data },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
