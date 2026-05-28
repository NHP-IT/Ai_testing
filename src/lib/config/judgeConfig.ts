import "server-only";

import { z } from "zod";
import { judgeProfileSchema, scoringProfileSchema } from "@/lib/schemas/judge";
import { readConfig, writeConfig, type ConfigReadResult } from "@/lib/config/store";

const judgeProfilesFileSchema = z.object({ profiles: z.array(judgeProfileSchema) });
const scoringProfilesFileSchema = z.object({ profiles: z.array(scoringProfileSchema) });

export type JudgeProfilesFile = z.infer<typeof judgeProfilesFileSchema>;
export type ScoringProfilesFile = z.infer<typeof scoringProfilesFileSchema>;

const JUDGE_PATH = "config/judge_profiles.json";
const SCORING_PATH = "config/scoring_profiles.json";

export async function readJudgeProfiles(): Promise<ConfigReadResult<JudgeProfilesFile>> {
  return readConfig(JUDGE_PATH, judgeProfilesFileSchema, { profiles: [] });
}

export async function writeJudgeProfiles(
  file: JudgeProfilesFile,
  etag: string | undefined
): Promise<void> {
  judgeProfilesFileSchema.parse(file);
  await writeConfig(JUDGE_PATH, file, etag);
}

export async function readScoringProfiles(): Promise<ConfigReadResult<ScoringProfilesFile>> {
  return readConfig(SCORING_PATH, scoringProfilesFileSchema, { profiles: [] });
}

export async function writeScoringProfiles(
  file: ScoringProfilesFile,
  etag: string | undefined
): Promise<void> {
  scoringProfilesFileSchema.parse(file);
  await writeConfig(SCORING_PATH, file, etag);
}
