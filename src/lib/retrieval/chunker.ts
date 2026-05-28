import type { Chunk } from "@/lib/schemas/corpus";

const MAX_CHUNK_CHARS = 800;
const MIN_CHUNK_CHARS = 50;

function makeChunkId(agentId: string, documentId: string, index: number): string {
  return `${agentId}-${documentId}-${String(index).padStart(4, "0")}`;
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function chunkPlainText(text: string): string[] {
  const paragraphs = text
    .split(/\r?\n\r?\n/)
    .map((p) => p.replace(/\r?\n/g, " ").trim())
    .filter((p) => p.length >= MIN_CHUNK_CHARS);

  const result: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    if (para.length > MAX_CHUNK_CHARS) {
      if (buffer) {
        result.push(buffer.trim());
        buffer = "";
      }
      const sentences = splitSentences(para);
      let sentBuf = "";
      for (const s of sentences) {
        if (sentBuf.length + s.length + 1 > MAX_CHUNK_CHARS && sentBuf) {
          result.push(sentBuf.trim());
          sentBuf = s;
        } else {
          sentBuf = sentBuf ? `${sentBuf} ${s}` : s;
        }
      }
      if (sentBuf.length >= MIN_CHUNK_CHARS) result.push(sentBuf.trim());
    } else if (buffer.length + para.length + 2 > MAX_CHUNK_CHARS) {
      if (buffer.length >= MIN_CHUNK_CHARS) result.push(buffer.trim());
      buffer = para;
    } else {
      buffer = buffer ? `${buffer}  ${para}` : para;
    }
  }

  if (buffer.length >= MIN_CHUNK_CHARS) result.push(buffer.trim());
  return result;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && !inQuotes) {
      inQuotes = true;
    } else if (ch === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

function chunkCsv(content: string): string[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);

  return lines
    .slice(1)
    .map((line) => {
      const values = parseCsvLine(line);
      return headers
        .map((h, i) => {
          const v = (values[i] ?? "").trim();
          return v ? `${h}: ${v}` : null;
        })
        .filter(Boolean)
        .join(", ");
    })
    .filter((t): t is string => t.length >= MIN_CHUNK_CHARS);
}

export type ChunkInput = {
  agentId: string;
  documentId: string;
  title: string;
  tags: string[];
  content: string;
  filename?: string;
  updatedAt?: string;
};

export function chunkContent(input: ChunkInput): Chunk[] {
  const { agentId, documentId, title, tags, content, filename, updatedAt } = input;
  const ts = updatedAt ?? new Date().toISOString();
  const isCsv = filename?.toLowerCase().endsWith(".csv") === true;
  const texts = isCsv ? chunkCsv(content) : chunkPlainText(content);

  return texts.map((text, i) => ({
    chunk_id: makeChunkId(agentId, documentId, i),
    agent_id: agentId,
    document_id: documentId,
    title,
    tags,
    text,
    source_uri: filename ? `onelake://corpus/${agentId}/${filename}` : undefined,
    updated_at: ts
  }));
}
