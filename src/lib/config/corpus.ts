import "server-only";
import { readJsonl, writeJsonl, createDirectory } from "@/lib/fabric/onelake";
import { FabricRequestError } from "@/lib/fabric/errors";
import { chunkSchema, type Chunk, type DocumentSummary } from "@/lib/schemas/corpus";

function corpusPath(agentId: string): string {
  return `corpus/${agentId}/chunks.jsonl`;
}

export async function readChunks(agentId: string): Promise<Chunk[]> {
  try {
    const result = await readJsonl(corpusPath(agentId), chunkSchema);
    return result.value;
  } catch (err) {
    if (err instanceof FabricRequestError && err.status === 404) return [];
    throw err;
  }
}

export async function writeChunks(agentId: string, chunks: Chunk[]): Promise<void> {
  await createDirectory(`corpus/${agentId}`);
  await writeJsonl(corpusPath(agentId), chunks);
}

export function summarizeDocuments(chunks: Chunk[]): DocumentSummary[] {
  const byDoc = new Map<string, Chunk[]>();
  for (const chunk of chunks) {
    const list = byDoc.get(chunk.document_id);
    if (list) {
      list.push(chunk);
    } else {
      byDoc.set(chunk.document_id, [chunk]);
    }
  }

  return Array.from(byDoc.entries()).map(([document_id, docChunks]) => ({
    document_id,
    title: docChunks[0].title,
    tags: [...new Set(docChunks.flatMap((c) => c.tags))],
    chunk_count: docChunks.length,
    updated_at: docChunks.reduce(
      (latest, c) => (c.updated_at > latest ? c.updated_at : latest),
      docChunks[0].updated_at
    )
  }));
}
