export type StageState = "available" | "next" | "planned";

export const stageOneRoutes = [
  {
    name: "Dashboard",
    href: "/",
    status: "available" as StageState,
    summary: "Operational entry point for stage status and next actions."
  },
  {
    name: "Agents",
    href: "/agents",
    status: "available" as StageState,
    summary: "Add and manage Copilot Studio agents, including MS Eval (Track B) settings."
  },
  {
    name: "Judge",
    href: "/judge",
    status: "available" as StageState,
    summary: "Judge provider profiles and scoring thresholds."
  },
  {
    name: "Corpus",
    href: "/corpus",
    status: "available" as StageState,
    summary: "Upload source material per agent; BM25 retrieval preview."
  },
  {
    name: "Connections",
    href: "/connections",
    status: "available" as StageState,
    summary: "Manual checks for Fabric, OneLake, Direct Line, SQL, and judge connectivity."
  },
  {
    name: "New Run",
    href: "/runs/new",
    status: "available" as StageState,
    summary: "CSV upload with live validation, judge/scoring selection, and dual-track run start."
  },
  {
    name: "Run Status",
    href: "/runs/[run_id]",
    status: "available" as StageState,
    summary: "URL-addressable run detail with polling, scoring trigger, and Track A/B breakdown."
  }
];

export const implementationStages = [
  {
    stage: "Stage 1–3",
    name: "App shell, schemas, Fabric layer",
    status: "available" as StageState,
    summary: "Routes, layouts, shared TypeScript contracts, OneLake helpers, auth, connectivity."
  },
  {
    stage: "Stage 4",
    name: "Agent and judge config",
    status: "available" as StageState,
    summary: "ETag-protected CRUD for agents, judge profiles, and scoring profiles backed by OneLake."
  },
  {
    stage: "Stage 5",
    name: "Corpus management",
    status: "available" as StageState,
    summary: "Text/CSV chunking to OneLake chunks.jsonl; BM25 keyword retrieval with source filter."
  },
  {
    stage: "Stage 6",
    name: "CSV upload and run creation",
    status: "available" as StageState,
    summary: "Validate, create manifest, trigger Track A + optional Track B notebooks in parallel."
  },
  {
    stage: "Stage 7/7b",
    name: "Fabric notebook contracts",
    status: "next" as StageState,
    summary: "Response capture (Track A) and MS native eval (Track B) notebooks need item IDs from IT."
  },
  {
    stage: "Stage 8",
    name: "RAG + judge scoring",
    status: "available" as StageState,
    summary: "BM25 retrieval, deterministic checks, concurrent judge LLM calls, resume from partial runs."
  },
  {
    stage: "Stage 9–10",
    name: "Delta merge and table contracts",
    status: "next" as StageState,
    summary: "Fabric score-merge notebook and final Delta table schema — pending notebook item IDs."
  },
  {
    stage: "Stage 11–13",
    name: "Recovery rules, run detail UI, tests",
    status: "available" as StageState,
    summary: "Per-case recovery, dual-track run detail with polling, 50 passing unit tests."
  }
];
