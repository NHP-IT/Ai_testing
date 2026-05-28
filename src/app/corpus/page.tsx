"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Database,
  FileText,
  Search,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { AgentConfig } from "@/lib/schemas/agent";
import type { DocumentSummary } from "@/lib/schemas/corpus";

// ─── Types ───────────────────────────────────────────────────────────────────

type SearchResult = {
  chunk_id: string;
  document_id: string;
  title: string;
  tags: string[];
  text: string;
  score: number;
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50"
    />
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
      {tag}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CorpusPage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docsFetchKey, setDocsFetchKey] = useState(0);

  // Upload state
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [docId, setDocId] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docTags, setDocTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Load agents on mount
  useEffect(() => {
    async function doLoad() {
      const res = await fetch("/api/agents");
      if (!res.ok) {
        setAgentsError("Could not load agents.");
        return;
      }
      const data = (await res.json()) as { agents: AgentConfig[] };
      setAgents(data.agents);
      if (data.agents.length > 0 && !selectedAgentId) {
        setSelectedAgentId(data.agents[0].agent_id);
      }
    }
    void doLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load documents when agent or fetchKey changes
  useEffect(() => {
    if (!selectedAgentId) return;

    async function doLoad() {
      const res = await fetch(`/api/corpus/${selectedAgentId}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setDocsError(body.error ?? "Failed to load documents.");
        setDocsLoading(false);
        return;
      }
      const data = (await res.json()) as { documents: DocumentSummary[] };
      setDocuments(data.documents);
      setDocsError(null);
      setDocsLoading(false);
    }

    void doLoad();
  }, [selectedAgentId, docsFetchKey]);

  function reloadDocs() {
    setDocsLoading(true);
    setDocsFetchKey((k) => k + 1);
  }

  function handleAgentChange(id: string) {
    setSelectedAgentId(id);
    setDocuments([]);
    setDocsLoading(true);
    setDocsError(null);
    setSearchResults(null);
    setSearchError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadFile(file);
    if (file && !docTitle) setDocTitle(file.name.replace(/\.[^.]+$/, ""));
    if (file && !docId) {
      setDocId(
        file.name
          .replace(/\.[^.]+$/, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80)
      );
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAgentId) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const body = new FormData();
    if (uploadMode === "file") {
      if (!uploadFile) {
        setUploadError("Select a file to upload.");
        setUploading(false);
        return;
      }
      body.append("file", uploadFile);
    } else {
      if (!pastedText.trim()) {
        setUploadError("Paste some text to upload.");
        setUploading(false);
        return;
      }
      body.append("text", pastedText);
    }
    if (docId.trim()) body.append("document_id", docId.trim());
    if (docTitle.trim()) body.append("title", docTitle.trim());
    if (docTags.trim()) body.append("tags", docTags.trim());

    const res = await fetch(`/api/corpus/${selectedAgentId}`, {
      method: "POST",
      body
    });

    const data = (await res.json()) as { added?: number; document_id?: string; error?: string };

    if (!res.ok) {
      setUploadError(data.error ?? "Upload failed.");
      setUploading(false);
      return;
    }

    setUploadSuccess(`Added ${data.added} chunk(s) for document "${data.document_id}".`);
    setUploadFile(null);
    setPastedText("");
    setDocId("");
    setDocTitle("");
    setDocTags("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    reloadDocs();
  }

  async function handleDelete(documentId: string) {
    if (!selectedAgentId) return;
    if (!confirm(`Remove all chunks for document "${documentId}"?`)) return;

    const res = await fetch(`/api/corpus/${selectedAgentId}/${documentId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      alert(body.error ?? "Delete failed.");
      return;
    }
    reloadDocs();
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAgentId || !query.trim()) return;

    setSearching(true);
    setSearchError(null);

    const res = await fetch(`/api/corpus/${selectedAgentId}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query.trim(),
        source_filter: sourceFilter.trim() || undefined,
        top_n: 5
      })
    });

    const data = (await res.json()) as { results?: SearchResult[]; error?: string };

    if (!res.ok) {
      setSearchError(data.error ?? "Search failed.");
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearchResults(data.results ?? []);
    setSearching(false);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        eyebrow="Source of truth"
        title="Corpus management"
        description="Upload source material per agent. Chunks are stored in OneLake and retrieved by BM25 during scoring."
      />

      {agentsError && <ErrorBanner message={agentsError} />}

      {/* Agent selector */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-semibold">Agent</label>
        <select
          value={selectedAgentId}
          onChange={(e) => handleAgentChange(e.target.value)}
          className="rounded border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          {agents.length === 0 && <option value="">No agents configured</option>}
          {agents.map((a) => (
            <option key={a.agent_id} value={a.agent_id}>
              {a.display_name} ({a.agent_id})
            </option>
          ))}
        </select>
      </div>

      {selectedAgentId && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          {/* Left: documents + upload */}
          <div className="flex flex-col gap-6">
            {/* Document list */}
            <section className="rounded border border-line bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div className="flex items-center gap-2">
                  <Database aria-hidden className="h-4 w-4 text-brand" />
                  <h2 className="text-sm font-semibold">Documents</h2>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                    {documents.length}
                  </span>
                </div>
                {docsLoading && <Spinner />}
              </div>

              {docsError && (
                <div className="px-5 py-3">
                  <ErrorBanner message={docsError} />
                </div>
              )}

              {!docsLoading && !docsError && documents.length === 0 && (
                <p className="px-5 py-6 text-sm text-muted text-center">
                  No documents yet — upload source material below.
                </p>
              )}

              {documents.length > 0 && (
                <ul className="divide-y divide-line">
                  {documents.map((doc) => (
                    <li key={doc.document_id} className="flex items-start gap-3 px-5 py-3">
                      <FileText aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-muted">{doc.document_id}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {doc.tags.map((t) => (
                            <TagPill key={t} tag={t} />
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold text-muted">
                          {doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-muted">
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDelete(doc.document_id)}
                        className="shrink-0 rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
                        title="Remove document"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Upload */}
            <section className="rounded border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <Upload aria-hidden className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-semibold">Add source material</h2>
              </div>

              {/* Mode tabs */}
              <div className="mb-4 flex gap-1 rounded border border-line bg-panel p-0.5 w-fit">
                {(["file", "text"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setUploadMode(mode);
                      setUploadError(null);
                      setUploadSuccess(null);
                    }}
                    className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                      uploadMode === mode
                        ? "bg-white text-foreground shadow-soft"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {mode === "file" ? "File" : "Paste text"}
                  </button>
                ))}
              </div>

              <form onSubmit={(e) => void handleUpload(e)} className="flex flex-col gap-3">
                {uploadMode === "file" ? (
                  <div>
                    <Label>File (.txt, .md, .csv)</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.csv"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-muted file:mr-3 file:rounded file:border file:border-line file:bg-panel file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground hover:file:bg-white"
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Pasted text</Label>
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      rows={6}
                      placeholder="Paste your source material here…"
                      className="w-full rounded border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Document ID (optional)</Label>
                    <Input
                      value={docId}
                      onChange={(e) => setDocId(e.target.value)}
                      placeholder="auto-generated"
                    />
                  </div>
                  <div>
                    <Label>Title (optional)</Label>
                    <Input
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="auto-generated"
                    />
                  </div>
                </div>

                <div>
                  <Label>Tags (comma-separated, optional)</Label>
                  <Input
                    value={docTags}
                    onChange={(e) => setDocTags(e.target.value)}
                    placeholder="products, support, faq"
                  />
                </div>

                {uploadError && <ErrorBanner message={uploadError} />}
                {uploadSuccess && (
                  <div className="flex items-center justify-between rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    <span>{uploadSuccess}</span>
                    <button type="button" onClick={() => setUploadSuccess(null)}>
                      <X aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
                >
                  {uploading ? <Spinner /> : <Upload aria-hidden className="h-4 w-4" />}
                  {uploading ? "Uploading…" : "Upload and chunk"}
                </button>
              </form>
            </section>
          </div>

          {/* Right: retrieval preview */}
          <section className="rounded border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <Search aria-hidden className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-semibold">Retrieval preview</h2>
            </div>
            <p className="mb-4 text-xs text-muted leading-5">
              Test the BM25 retrieval path used during scoring. Enter a question and optionally
              filter by source tag or document title.
            </p>

            <form onSubmit={(e) => void handleSearch(e)} className="flex flex-col gap-3">
              <div>
                <Label>Question</Label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What products does Sparky support?"
                />
              </div>
              <div>
                <Label>Source filter (optional)</Label>
                <Input
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  placeholder="products"
                />
              </div>

              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="inline-flex h-9 items-center justify-center gap-2 rounded border border-line bg-panel px-4 text-sm font-semibold text-foreground hover:bg-white disabled:opacity-50"
              >
                {searching ? <Spinner /> : <ChevronRight aria-hidden className="h-4 w-4" />}
                {searching ? "Searching…" : "Search top 5"}
              </button>
            </form>

            {searchError && (
              <div className="mt-4">
                <ErrorBanner message={searchError} />
              </div>
            )}

            {searchResults !== null && (
              <div className="mt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  {searchResults.length === 0
                    ? "No matching chunks found."
                    : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`}
                </p>
                <ul className="flex flex-col gap-3">
                  {searchResults.map((r) => (
                    <li
                      key={r.chunk_id}
                      className="rounded border border-line bg-panel p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <span className="font-semibold">{r.title}</span>
                          <span className="ml-2 text-xs text-muted">{r.document_id}</span>
                        </div>
                        <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-mono font-medium text-brand">
                          {r.score.toFixed(3)}
                        </span>
                      </div>
                      {r.tags.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {r.tags.map((t) => (
                            <TagPill key={t} tag={t} />
                          ))}
                        </div>
                      )}
                      <p className="text-xs leading-5 text-muted line-clamp-4">{r.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {searchResults === null && !searchError && (
              <p className="mt-6 text-center text-sm text-muted">
                Enter a question above to preview retrieval results.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
