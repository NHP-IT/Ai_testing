import "server-only";

import { z } from "zod";
import { readJson, writeJson, createDirectory } from "@/lib/fabric/onelake";
import { FabricRequestError } from "@/lib/fabric/errors";

export type ConfigReadResult<T> = {
  data: T;
  etag: string | undefined;
};

export class ConfigConflictError extends Error {
  constructor() {
    super("Config was modified by another writer. Re-read and try again.");
    this.name = "ConfigConflictError";
  }
}

export async function readConfig<T>(
  relativePath: string,
  schema: z.ZodType<T>,
  defaultValue: T
): Promise<ConfigReadResult<T>> {
  try {
    const result = await readJson<T>(relativePath, schema);
    return { data: result.value, etag: result.etag };
  } catch (err) {
    if (err instanceof FabricRequestError && err.status === 404) {
      return { data: defaultValue, etag: undefined };
    }
    throw err;
  }
}

export async function writeConfig<T>(
  relativePath: string,
  data: T,
  etag: string | undefined
): Promise<void> {
  const slash = relativePath.lastIndexOf("/");
  if (slash > 0) {
    await createDirectory(relativePath.substring(0, slash));
  }
  try {
    await writeJson(relativePath, data, etag ? { ifMatch: etag } : {});
  } catch (err) {
    if (err instanceof FabricRequestError && err.status === 412) {
      throw new ConfigConflictError();
    }
    throw err;
  }
}
