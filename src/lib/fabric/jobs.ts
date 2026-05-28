import "server-only";

import { authorizationHeader } from "@/lib/fabric/auth";
import { FabricRequestError, MissingConnectionValueError } from "@/lib/fabric/errors";
import { testingConnections, type NotebookConnection } from "@/lib/testingConnections";

export type FabricNotebookParameter = {
  name: string;
  value: string | number | boolean;
  type?: "Text" | "Boolean" | "Integer" | "Float";
};

export type FabricJobStart = {
  location: string;
  retryAfterSeconds?: number;
  jobInstanceId?: string;
};

export type FabricJobStatus = {
  status?: string;
  raw: unknown;
};

function notebookRunUrl(notebookId: string): string {
  return `${testingConnections.fabric.apiBaseUrl}/workspaces/${testingConnections.fabric.workspaceId}/notebooks/${notebookId}/jobs/execute/instances?beta=false`;
}

function parseJobInstanceId(location: string): string | undefined {
  return location.match(/\/jobs\/instances\/([^/?#]+)/)?.[1];
}

export function getConfiguredNotebook(
  kind: "responseCapture" | "scoreMerge"
): NotebookConnection {
  const notebook = testingConnections.fabric.notebooks[kind];
  if (!notebook) {
    throw new MissingConnectionValueError(`${kind} notebook item ID`);
  }
  return notebook;
}

export async function runNotebook(
  notebook: NotebookConnection,
  parameters: FabricNotebookParameter[] = []
): Promise<FabricJobStart> {
  const response = await fetch(notebookRunUrl(notebook.itemId), {
    method: "POST",
    headers: {
      ...(await authorizationHeader("fabric")),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      parameters: parameters.map((parameter) => ({
        type: parameter.type ?? "Text",
        ...parameter,
        value: String(parameter.value)
      }))
    })
  });

  if (response.status !== 202) {
    throw new FabricRequestError(
      `Notebook run request failed with ${response.status}`,
      response.status,
      await response.text()
    );
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Fabric notebook run response did not include a Location header.");
  }

  const retryAfter = response.headers.get("retry-after");

  return {
    location,
    retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
    jobInstanceId: parseJobInstanceId(location)
  };
}

export async function getNotebookJobStatus(location: string): Promise<FabricJobStatus> {
  const response = await fetch(location, {
    headers: await authorizationHeader("fabric")
  });

  if (!response.ok) {
    throw new FabricRequestError(
      `Notebook job status request failed with ${response.status}`,
      response.status,
      await response.text()
    );
  }

  const raw = (await response.json()) as Record<string, unknown>;

  return {
    status:
      typeof raw.status === "string"
        ? raw.status
        : typeof raw.state === "string"
          ? raw.state
          : undefined,
    raw
  };
}
