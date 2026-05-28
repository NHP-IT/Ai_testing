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
    summary: "Registry workspace for Copilot Studio agents."
  },
  {
    name: "Judge",
    href: "/judge",
    status: "available" as StageState,
    summary: "Configuration workspace for Ollama and scoring settings."
  },
  {
    name: "Corpus",
    href: "/corpus",
    status: "available" as StageState,
    summary: "Source-of-truth corpus workspace."
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
    summary: "CSV upload and run creation workspace."
  },
  {
    name: "Run Status",
    href: "/runs/[run_id]",
    status: "available" as StageState,
    summary: "URL-addressable run detail route."
  }
];

export const implementationStages = [
  {
    stage: "Stage 1",
    name: "Next.js app shell",
    status: "available" as StageState,
    summary: "Routes, layout, navigation, and static operational screens."
  },
  {
    stage: "Stage 2",
    name: "Schemas and contracts",
    status: "available" as StageState,
    summary: "Shared TypeScript contracts for agents, cases, judge settings, runs, and results."
  },
  {
    stage: "Stage 3",
    name: "Fabric and OneLake layer",
    status: "next" as StageState,
    summary: "Server-side auth, file access, notebook jobs, and result reads."
  },
  {
    stage: "Stage 4",
    name: "Registry and judge config",
    status: "planned" as StageState,
    summary: "Persisted agent registry, judge settings, and scoring profiles."
  },
  {
    stage: "Stage 5+",
    name: "Corpus, runs, scoring, merge",
    status: "planned" as StageState,
    summary: "Corpus ingestion, CSV validation, response capture, judge scoring, and Delta merge."
  }
];
