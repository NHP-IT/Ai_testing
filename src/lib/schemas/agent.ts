import { z } from "zod";
import {
  agentIdSchema,
  guidStringSchema,
  nonEmptyStringSchema,
  thresholdSchema
} from "@/lib/schemas/common";

export const agentPlatformSchema = z.literal("copilot_studio");

export const connectionModeSchema = z.literal("direct_line_secret");

export const ragasThresholdsSchema = z.object({
  answer_relevancy: thresholdSchema.default(0.7),
  grounding: thresholdSchema.default(0.7)
});

export const agentSchema = z
  .object({
    agent_id: agentIdSchema,
    display_name: nonEmptyStringSchema,
    enabled: z.boolean().default(true),
    platform: agentPlatformSchema,
    connection_mode: connectionModeSchema,
    business_area: nonEmptyStringSchema,
    owner: nonEmptyStringSchema,
    schema_name: nonEmptyStringSchema,
    environment_id: guidStringSchema,
    bot_id: guidStringSchema,
    direct_line_secret: nonEmptyStringSchema.optional(),
    direct_line_secret_key: nonEmptyStringSchema.optional(),
    deterministic_rules: z.array(nonEmptyStringSchema).default([]),
    ragas_thresholds: ragasThresholdsSchema.default({
      answer_relevancy: 0.7,
      grounding: 0.7
    })
  })
  .superRefine((agent, ctx) => {
    if (!agent.direct_line_secret && !agent.direct_line_secret_key) {
      ctx.addIssue({
        code: "custom",
        path: ["direct_line_secret"],
        message:
          "Direct Line agents require either direct_line_secret or direct_line_secret_key."
      });
    }
  });

export const agentRegistrySchema = z
  .object({
    agents: z.array(agentSchema)
  })
  .superRefine((registry, ctx) => {
    const seen = new Set<string>();
    for (const [index, agent] of registry.agents.entries()) {
      if (seen.has(agent.agent_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["agents", index, "agent_id"],
          message: `Duplicate agent_id: ${agent.agent_id}`
        });
      }
      seen.add(agent.agent_id);
    }
  });

export type AgentConfig = z.infer<typeof agentSchema>;
export type AgentRegistry = z.infer<typeof agentRegistrySchema>;

export function parseAgentRegistry(input: unknown): AgentRegistry {
  return agentRegistrySchema.parse(input);
}

export function enabledAgentIds(agents: AgentConfig[]): Set<string> {
  return new Set(
    agents.filter((agent) => agent.enabled).map((agent) => agent.agent_id)
  );
}
