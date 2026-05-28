import "server-only";

import { getAccessToken, hasFabricServicePrincipal } from "@/lib/fabric/auth";
import { getConfiguredNotebook } from "@/lib/fabric/jobs";
import { getEtag } from "@/lib/fabric/onelake";
import { testingConnections } from "@/lib/testingConnections";

export type ConnectivityState = "pass" | "fail" | "not_configured";

export type ConnectivityCheck = {
  id: string;
  label: string;
  state: ConnectivityState;
  message: string;
};

async function checkFabricAuth(): Promise<ConnectivityCheck> {
  if (!hasFabricServicePrincipal()) {
    return {
      id: "fabric_auth",
      label: "Fabric service principal",
      state: "not_configured",
      message:
        "No web-app service-principal client ID/secret exists in the reference notebooks."
    };
  }

  try {
    await getAccessToken("fabric");
    return {
      id: "fabric_auth",
      label: "Fabric service principal",
      state: "pass",
      message: "Fabric token acquired."
    };
  } catch (error) {
    return {
      id: "fabric_auth",
      label: "Fabric service principal",
      state: "fail",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkOneLake(): Promise<ConnectivityCheck> {
  if (!hasFabricServicePrincipal()) {
    return {
      id: "onelake",
      label: "OneLake app root",
      state: "not_configured",
      message: "OneLake checks require the missing service-principal credentials."
    };
  }

  try {
    await getEtag("config");
    return {
      id: "onelake",
      label: "OneLake app root",
      state: "pass",
      message: "OneLake app root responded."
    };
  } catch (error) {
    return {
      id: "onelake",
      label: "OneLake app root",
      state: "fail",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function checkNotebookConfig(kind: "responseCapture" | "scoreMerge"): ConnectivityCheck {
  try {
    const notebook = getConfiguredNotebook(kind);
    return {
      id: `${kind}_notebook`,
      label: `${notebook.name} notebook`,
      state: "pass",
      message: `Configured item ID ${notebook.itemId}.`
    };
  } catch (error) {
    return {
      id: `${kind}_notebook`,
      label: kind === "responseCapture" ? "Response-capture notebook" : "Score-merge notebook",
      state: "not_configured",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function checkSqlConfig(): ConnectivityCheck {
  if (!testingConnections.sqlEndpoint) {
    return {
      id: "sql_endpoint",
      label: "Lakehouse SQL endpoint",
      state: "not_configured",
      message: "The SQL analytics endpoint server/database string is not in the reference notebooks."
    };
  }

  return {
    id: "sql_endpoint",
    label: "Lakehouse SQL endpoint",
    state: "pass",
    message: "SQL endpoint is configured."
  };
}

async function checkDirectLine(): Promise<ConnectivityCheck> {
  try {
    const response = await fetch(
      "https://directline.botframework.com/v3/directline/tokens/generate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${testingConnections.copilotAgents.sparky.directLineSecret}`
        }
      }
    );

    if (!response.ok) {
      return {
        id: "direct_line",
        label: "Sparky Direct Line",
        state: "fail",
        message: `Direct Line returned ${response.status}: ${await response.text()}`
      };
    }

    return {
      id: "direct_line",
      label: "Sparky Direct Line",
      state: "pass",
      message: "Direct Line token generated."
    };
  } catch (error) {
    return {
      id: "direct_line",
      label: "Sparky Direct Line",
      state: "fail",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkJudge(): Promise<ConnectivityCheck> {
  const url = `${testingConnections.judge.localBaseUrl.replace(/\/$/, "")}/models`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${testingConnections.judge.apiKey}`
      }
    });

    if (!response.ok) {
      return {
        id: "judge",
        label: "Local Ollama judge",
        state: "fail",
        message: `Judge server returned ${response.status}: ${await response.text()}`
      };
    }

    return {
      id: "judge",
      label: "Local Ollama judge",
      state: "pass",
      message: `Judge server responded at ${url}.`
    };
  } catch (error) {
    return {
      id: "judge",
      label: "Local Ollama judge",
      state: "fail",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function runConnectivityChecks(): Promise<ConnectivityCheck[]> {
  const [fabricAuth, oneLake, directLine, judge] = await Promise.all([
    checkFabricAuth(),
    checkOneLake(),
    checkDirectLine(),
    checkJudge()
  ]);

  return [
    fabricAuth,
    oneLake,
    checkNotebookConfig("responseCapture"),
    checkNotebookConfig("scoreMerge"),
    checkSqlConfig(),
    directLine,
    judge
  ];
}
