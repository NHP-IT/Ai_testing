import "server-only";

export type NotebookConnection = {
  name: string;
  itemId: string;
};

export type TestingConnections = {
  fabric: {
    apiBaseUrl: string;
    workspaceId: string;
    capacityId: string;
    servicePrincipal?: {
      tenantId: string;
      clientId: string;
      clientSecret: string;
    };
    notebooks: {
      previousArchitecture: Record<string, NotebookConnection>;
      responseCapture?: NotebookConnection;
      scoreMerge?: NotebookConnection;
    };
  };
  lakehouse: {
    id: string;
    codeName: string;
    metadataName: string;
  };
  oneLake: {
    dfsEndpoint: string;
    filesRootUrl: string;
    appRootUrl: string;
    appRootAbfss: string;
    configPath: string;
    runsPath: string;
    corpusPath: string;
  };
  sqlEndpoint?: {
    server: string;
    database: string;
  };
  copilotAgents: {
    sparky: {
      agentId: string;
      displayName: string;
      platform: "copilot_studio";
      connectionMode: "direct_line_secret";
      businessArea: string;
      owner: string;
      schemaName: string;
      environmentId: string;
      tenantId: string;
      botId: string;
      clientId: string;
      directLineSecret: string;
      directConnectUrl: string;
    };
  };
  judge: {
    provider: "ollama_openai_compatible";
    localBaseUrl: string;
    devTunnelBaseUrl: string;
    model: string;
    apiKey: string;
    temperature: number;
    timeoutMs: number;
    devTunnelCommand: string;
  };
};

export const testingConnections: TestingConnections = {
  fabric: {
    apiBaseUrl: "https://api.fabric.microsoft.com/v1",
    workspaceId: "d9e51304-2b8a-4e62-b689-922e79fd76b4",
    capacityId: "6E656A07-3795-4195-B8E9-080E3BF84E95",
    notebooks: {
      previousArchitecture: {
        orchestrator: {
          name: "00_orchestrator",
          itemId: "9c7c309a-ef72-4e62-a73f-9c06fc2cf2d6"
        },
        agentRegistry: {
          name: "00_agent_registry",
          itemId: "fe573cf1-5367-4fad-a5cb-fe35d05c2037"
        },
        dataContracts: {
          name: "01_data_contracts",
          itemId: "3530a316-6172-4777-84bc-3ae1d43bf223"
        },
        agentCaller: {
          name: "02_agent_caller",
          itemId: "cbcea447-245a-46bb-90d9-243a71235a3a"
        },
        sourceRetrieval: {
          name: "03_source_retrieval",
          itemId: "72a74714-46c7-49c0-a349-5ada601a68ba"
        },
        deterministic: {
          name: "04_deterministic",
          itemId: "345c1179-5111-4d57-a4f3-62471e04fe21"
        },
        claimGroundingScoring: {
          name: "05_claim_grounding_scoring",
          itemId: "5c7a85cb-1025-412d-86e2-1cb893f164cf"
        },
        microsoftEval: {
          name: "05b_microsoft_eval",
          itemId: "5d7c23ed-0ef8-4b72-ae11-f8e23fa046de"
        }
      }
    }
  },
  lakehouse: {
    id: "537823c4-b83a-4a9b-9444-6039d55a4b9e",
    codeName: "jacks_lakehouse",
    metadataName: "jacks_Lakehouse"
  },
  oneLake: {
    dfsEndpoint: "https://onelake.dfs.fabric.microsoft.com",
    filesRootUrl:
      "https://onelake.dfs.fabric.microsoft.com/d9e51304-2b8a-4e62-b689-922e79fd76b4/537823c4-b83a-4a9b-9444-6039d55a4b9e/Files",
    appRootUrl:
      "https://onelake.dfs.fabric.microsoft.com/d9e51304-2b8a-4e62-b689-922e79fd76b4/537823c4-b83a-4a9b-9444-6039d55a4b9e/Files/agent_eval",
    appRootAbfss:
      "abfss://d9e51304-2b8a-4e62-b689-922e79fd76b4@onelake.dfs.fabric.microsoft.com/537823c4-b83a-4a9b-9444-6039d55a4b9e/Files/agent_eval",
    configPath: "config",
    runsPath: "runs",
    corpusPath: "corpus"
  },
  copilotAgents: {
    sparky: {
      agentId: "sparky",
      displayName: "Sparky",
      platform: "copilot_studio",
      connectionMode: "direct_line_secret",
      businessArea: "Technical Support",
      owner: "BI & AI Team",
      schemaName: "cr578_Productsagent",
      environmentId: "605e3ed6-b18f-ece1-ad54-4f71a003a6cb",
      tenantId: "226e353c-f71a-4b6a-a6af-293275183a60",
      botId: "90834477-dcd9-4c4c-a025-dd256379a63a",
      clientId: "90834477-dcd9-4c4c-a025-dd256379a63a",
      directLineSecret:
        "7OjuL5Med3ZDXtgkYFEwbReZ0Lgd6AeegEyyXngPmSvVBmCSdrVgJQQJ99CDACYeBjFAArohAAABAZBS3bsh.7KTe1rZPwCrfkKt12QHTRdYiyvIHasJ3tMW3xIQYVAXAPNvv36idJQQJ99CDACYeBjFAArohAAABAZBS34rL",
      directConnectUrl:
        "https://605e3ed6b18fece1ad544f71a003a6.cb.environment.api.powerplatform.com/copilotstudio/dataverse-backed/authenticated/bots/cr578_Productsagent/conversations?api-version=2022-03-01-preview"
    }
  },
  judge: {
    provider: "ollama_openai_compatible",
    localBaseUrl: "http://127.0.0.1:11434/v1",
    devTunnelBaseUrl: "https://k5ljzg9z-11434.auc1.devtunnels.ms/v1",
    model: "llama3.2:3b",
    apiKey: "ollama",
    temperature: 0,
    timeoutMs: 120000,
    devTunnelCommand: "devtunnel host -p 11434 --allow-anonymous"
  }
} as const;
