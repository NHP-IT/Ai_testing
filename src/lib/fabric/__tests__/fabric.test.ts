import { describe, expect, it } from "vitest";
import {
  getAccessToken,
  getConfiguredNotebook,
  hasFabricServicePrincipal,
  oneLakeFileUrl
} from "@/lib/fabric";
import { MissingConnectionValueError } from "@/lib/fabric/errors";
import { testingConnections } from "@/lib/testingConnections";

describe("testing connection inventory", () => {
  it("uses the real workspace and lakehouse IDs from the previous notebooks", () => {
    expect(testingConnections.fabric.workspaceId).toBe(
      "d9e51304-2b8a-4e62-b689-922e79fd76b4"
    );
    expect(testingConnections.lakehouse.id).toBe(
      "537823c4-b83a-4a9b-9444-6039d55a4b9e"
    );
  });

  it("has the real SQL analytics endpoint configured", () => {
    expect(testingConnections.sqlEndpoint?.server).toContain("datawarehouse.fabric.microsoft.com");
  });

  it("keeps notebook item IDs unconfigured until provided by the user", () => {
    expect(hasFabricServicePrincipal()).toBe(false);
    expect(testingConnections.fabric.notebooks.responseCapture).toBeUndefined();
    expect(testingConnections.fabric.notebooks.scoreMerge).toBeUndefined();
  });
});

describe("Fabric auth", () => {
  it("throws a typed error when service-principal credentials are not configured", async () => {
    await expect(getAccessToken("fabric")).rejects.toBeInstanceOf(
      MissingConnectionValueError
    );
  });
});

describe("OneLake path builder", () => {
  it("uses GUID-based OneLake DFS syntax", () => {
    expect(oneLakeFileUrl("/config/agents.json")).toBe(
      "https://onelake.dfs.fabric.microsoft.com/d9e51304-2b8a-4e62-b689-922e79fd76b4/537823c4-b83a-4a9b-9444-6039d55a4b9e/Files/agent_eval/config/agents.json"
    );
  });

  it("adds query strings without changing the path", () => {
    expect(oneLakeFileUrl("runs/RUN-1/manifest.json", "resource=file")).toBe(
      "https://onelake.dfs.fabric.microsoft.com/d9e51304-2b8a-4e62-b689-922e79fd76b4/537823c4-b83a-4a9b-9444-6039d55a4b9e/Files/agent_eval/runs/RUN-1/manifest.json?resource=file"
    );
  });
});

describe("notebook job configuration", () => {
  it("reports missing final response-capture notebook ID", () => {
    expect(() => getConfiguredNotebook("responseCapture")).toThrow(
      MissingConnectionValueError
    );
  });

  it("reports missing final score-merge notebook ID", () => {
    expect(() => getConfiguredNotebook("scoreMerge")).toThrow(
      MissingConnectionValueError
    );
  });
});
