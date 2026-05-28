import { describe, expect, it } from "vitest";
import { bm25Search } from "../bm25";
import { chunkContent } from "../chunker";
import type { Chunk } from "@/lib/schemas/corpus";

// ─── BM25 search ──────────────────────────────────────────────────────────────

const sampleChunks: Chunk[] = [
  {
    chunk_id: "sparky-doc-001-0000",
    agent_id: "sparky",
    document_id: "doc-001",
    title: "Product support notes",
    tags: ["products"],
    text: "Sparky handles product warranty claims and technical troubleshooting for all registered devices.",
    updated_at: "2026-05-28T00:00:00.000Z"
  },
  {
    chunk_id: "sparky-doc-001-0001",
    agent_id: "sparky",
    document_id: "doc-001",
    title: "Product support notes",
    tags: ["products"],
    text: "Return policies require the original receipt and the product must be within the 30-day window.",
    updated_at: "2026-05-28T00:00:00.000Z"
  },
  {
    chunk_id: "sparky-doc-002-0000",
    agent_id: "sparky",
    document_id: "doc-002",
    title: "Pricing FAQ",
    tags: ["pricing"],
    text: "Pricing for extended warranties varies by product category and region.",
    updated_at: "2026-05-28T00:00:00.000Z"
  }
];

describe("BM25 search", () => {
  it("returns the most relevant chunk for a targeted query", () => {
    const results = bm25Search("warranty claims", sampleChunks, { topN: 1 });
    expect(results.length).toBe(1);
    expect(results[0].chunk.document_id).toBe("doc-001");
    expect(results[0].chunk.chunk_id).toBe("sparky-doc-001-0000");
  });

  it("scores pricing content higher for a pricing query", () => {
    const results = bm25Search("pricing extended warranties", sampleChunks, { topN: 3 });
    expect(results[0].chunk.document_id).toBe("doc-002");
  });

  it("respects the topN limit", () => {
    const results = bm25Search("product", sampleChunks, { topN: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("returns empty when no query terms match", () => {
    const results = bm25Search("zzz_nonexistent_zzz", sampleChunks);
    expect(results).toHaveLength(0);
  });

  it("returns empty when the corpus is empty", () => {
    const results = bm25Search("warranty", []);
    expect(results).toHaveLength(0);
  });

  it("filters by source_filter against tags and title", () => {
    const results = bm25Search("warranty", sampleChunks, {
      topN: 5,
      sourceFilter: "pricing"
    });
    expect(results.every((r) => r.chunk.tags.includes("pricing") || r.chunk.title.toLowerCase().includes("pricing"))).toBe(true);
  });

  it("returns results with positive scores only", () => {
    const results = bm25Search("product warranty", sampleChunks);
    expect(results.every((r) => r.score > 0)).toBe(true);
  });
});

// ─── Chunker ─────────────────────────────────────────────────────────────────

describe("chunkContent — plain text", () => {
  it("splits a long document into multiple chunks and assigns correct metadata", () => {
    // Each paragraph is >800 chars so it will definitely be split
    const longPara = "word ".repeat(180).trim(); // ~900 chars
    const content = `${longPara}\n\n${longPara}`;

    const chunks = chunkContent({
      agentId: "sparky",
      documentId: "faq-001",
      title: "FAQ",
      tags: ["faq"],
      content
    });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].chunk_id).toBe("sparky-faq-001-0000");
    expect(chunks[0].agent_id).toBe("sparky");
    expect(chunks[0].document_id).toBe("faq-001");
  });

  it("generates sequential chunk IDs with zero-padded indices", () => {
    const content = Array.from({ length: 5 }, (_, i) => `Paragraph ${i + 1}: ${"Word ".repeat(20).trim()}`).join("\n\n");
    const chunks = chunkContent({
      agentId: "sparky",
      documentId: "doc",
      title: "Doc",
      tags: [],
      content
    });

    const ids = chunks.map((c) => c.chunk_id);
    expect(ids[0]).toMatch(/sparky-doc-\d{4}/);
  });

  it("sets source_uri when filename is provided", () => {
    const chunks = chunkContent({
      agentId: "sparky",
      documentId: "notes",
      title: "Notes",
      tags: [],
      content: "Some content about products and services worth indexing.",
      filename: "notes.txt"
    });

    expect(chunks[0].source_uri).toContain("notes.txt");
  });

  it("skips content below minimum chunk size", () => {
    const chunks = chunkContent({
      agentId: "sparky",
      documentId: "tiny",
      title: "Tiny",
      tags: [],
      content: "Too short\n\nAlso short\n\nAnother one"
    });

    expect(chunks.every((c) => c.text.length >= 50)).toBe(true);
  });
});

describe("chunkContent — CSV", () => {
  it("converts each CSV row into a key-value text chunk", () => {
    const csv = [
      "product,category,warranty_months",
      "Widget Pro,Electronics,24",
      "Gadget Mini,Accessories,12"
    ].join("\n");

    const chunks = chunkContent({
      agentId: "sparky",
      documentId: "products",
      title: "Products",
      tags: ["products"],
      content: csv,
      filename: "products.csv"
    });

    expect(chunks.length).toBe(2);
    expect(chunks[0].text).toContain("product: Widget Pro");
    expect(chunks[0].text).toContain("warranty_months: 24");
  });

  it("handles quoted CSV fields with commas inside", () => {
    const csv = [
      "name,description",
      '"Widget Pro","Professional grade, high performance device"'
    ].join("\n");

    const chunks = chunkContent({
      agentId: "sparky",
      documentId: "items",
      title: "Items",
      tags: [],
      content: csv,
      filename: "items.csv"
    });

    expect(chunks[0].text).toContain("Professional grade, high performance device");
  });

  it("returns empty for a CSV with fewer than 2 lines", () => {
    const chunks = chunkContent({
      agentId: "sparky",
      documentId: "empty",
      title: "Empty",
      tags: [],
      content: "header1,header2",
      filename: "empty.csv"
    });

    expect(chunks).toHaveLength(0);
  });
});
