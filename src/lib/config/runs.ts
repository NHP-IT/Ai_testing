import "server-only";
import { readJson, writeJson, createDirectory } from "@/lib/fabric/onelake";
import { FabricRequestError } from "@/lib/fabric/errors";
import { runManifestSchema, type RunManifest } from "@/lib/schemas/run";

function randomSuffix(len: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export function createRunId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  return `${date}-${time}-${randomSuffix(4)}`;
}

function manifestPath(runId: string): string {
  return `runs/${runId}/manifest.json`;
}

export function casesPath(runId: string): string {
  return `runs/${runId}/cases.json`;
}

export async function readManifest(
  runId: string
): Promise<{ manifest: RunManifest; etag: string | undefined }> {
  const result = await readJson(manifestPath(runId), runManifestSchema);
  return { manifest: result.value, etag: result.etag };
}

export async function writeManifest(
  runId: string,
  manifest: RunManifest,
  etag?: string
): Promise<void> {
  await createDirectory(`runs/${runId}`);
  await writeJson(manifestPath(runId), manifest, etag ? { ifMatch: etag } : {});
}

export async function tryReadManifest(runId: string): Promise<RunManifest | null> {
  try {
    const result = await readJson(manifestPath(runId), runManifestSchema);
    return result.value;
  } catch (err) {
    if (err instanceof FabricRequestError && err.status === 404) return null;
    throw err;
  }
}
