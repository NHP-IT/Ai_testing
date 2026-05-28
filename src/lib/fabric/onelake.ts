import "server-only";

import { z } from "zod";
import { authorizationHeader } from "@/lib/fabric/auth";
import { FabricRequestError } from "@/lib/fabric/errors";
import { testingConnections } from "@/lib/testingConnections";

export type OneLakeReadResult<T> = {
  value: T;
  etag?: string;
};

const storageApiVersion = "2021-06-08";

function trimSlashes(path: string): string {
  return path.replace(/^\/+|\/+$/g, "");
}

export function oneLakeFileUrl(relativePath: string, query?: string): string {
  const cleanPath = trimSlashes(relativePath);
  const base = `${testingConnections.oneLake.appRootUrl}/${cleanPath}`;
  return query ? `${base}?${query}` : base;
}

async function oneLakeFetch(
  relativePath: string,
  init: RequestInit = {},
  query?: string
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("x-ms-version", storageApiVersion);

  const auth = await authorizationHeader("onelake");
  for (const [key, value] of Object.entries(auth)) {
    headers.set(key, value);
  }

  return fetch(oneLakeFileUrl(relativePath, query), {
    ...init,
    headers
  });
}

async function assertOk(response: Response, action: string): Promise<void> {
  if (!response.ok) {
    throw new FabricRequestError(
      `${action} failed with ${response.status}`,
      response.status,
      await response.text()
    );
  }
}

export async function readText(relativePath: string): Promise<OneLakeReadResult<string>> {
  const response = await oneLakeFetch(relativePath);
  await assertOk(response, `Read ${relativePath}`);

  return {
    value: await response.text(),
    etag: response.headers.get("etag") ?? undefined
  };
}

export async function readJson<T>(
  relativePath: string,
  schema?: z.ZodType<T>
): Promise<OneLakeReadResult<T>> {
  const result = await readText(relativePath);
  const parsed = JSON.parse(result.value) as unknown;

  return {
    value: schema ? schema.parse(parsed) : (parsed as T),
    etag: result.etag
  };
}

export async function readJsonl<T>(
  relativePath: string,
  schema?: z.ZodType<T>
): Promise<OneLakeReadResult<T[]>> {
  const result = await readText(relativePath);
  const rows = result.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);

  return {
    value: schema ? rows.map((row) => schema.parse(row)) : (rows as T[]),
    etag: result.etag
  };
}

export async function getEtag(relativePath: string): Promise<string | undefined> {
  const response = await oneLakeFetch(relativePath, { method: "HEAD" });
  if (response.status === 404) {
    return undefined;
  }
  await assertOk(response, `Read ETag ${relativePath}`);
  return response.headers.get("etag") ?? undefined;
}

export async function createDirectory(relativePath: string): Promise<void> {
  const response = await oneLakeFetch(
    relativePath,
    {
      method: "PUT"
    },
    "resource=directory"
  );

  if (response.status === 409) {
    return;
  }

  await assertOk(response, `Create directory ${relativePath}`);
}

async function createFile(relativePath: string, ifMatch?: string): Promise<void> {
  const headers = new Headers();
  if (ifMatch) {
    headers.set("If-Match", ifMatch);
  }

  const response = await oneLakeFetch(
    relativePath,
    {
      method: "PUT",
      headers
    },
    "resource=file"
  );

  await assertOk(response, `Create file ${relativePath}`);
}

async function appendFile(relativePath: string, content: string): Promise<void> {
  const bytes = new TextEncoder().encode(content);
  const response = await oneLakeFetch(
    relativePath,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.byteLength)
      },
      body: bytes
    },
    "action=append&position=0"
  );

  await assertOk(response, `Append file ${relativePath}`);

  const flush = await oneLakeFetch(
    relativePath,
    {
      method: "PATCH"
    },
    `action=flush&position=${bytes.byteLength}`
  );

  await assertOk(flush, `Flush file ${relativePath}`);
}

export async function writeText(
  relativePath: string,
  content: string,
  options: { ifMatch?: string } = {}
): Promise<void> {
  await createFile(relativePath, options.ifMatch);
  await appendFile(relativePath, content);
}

export async function writeJson(
  relativePath: string,
  value: unknown,
  options: { ifMatch?: string } = {}
): Promise<void> {
  await writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`, options);
}

export async function writeJsonl(
  relativePath: string,
  values: unknown[],
  options: { ifMatch?: string } = {}
): Promise<void> {
  const content = values.map((value) => JSON.stringify(value)).join("\n");
  await writeText(relativePath, `${content}\n`, options);
}

export async function writeCsv(
  relativePath: string,
  content: string,
  options: { ifMatch?: string } = {}
): Promise<void> {
  await writeText(relativePath, content, options);
}
