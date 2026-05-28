import "server-only";

import { agentRegistrySchema, type AgentRegistry } from "@/lib/schemas/agent";
import { readConfig, writeConfig, type ConfigReadResult } from "@/lib/config/store";

const AGENTS_PATH = "config/agents.json";

export async function readAgentRegistry(): Promise<ConfigReadResult<AgentRegistry>> {
  return readConfig(AGENTS_PATH, agentRegistrySchema, { agents: [] });
}

export async function writeAgentRegistry(
  registry: AgentRegistry,
  etag: string | undefined
): Promise<void> {
  agentRegistrySchema.parse(registry);
  await writeConfig(AGENTS_PATH, registry, etag);
}
