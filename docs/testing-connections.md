# Testing Connections

This file records the real proof-of-concept connection values currently present in the previous Fabric notebook architecture.

These values are committed for testing only. Rotate secrets before production.

## Fabric workspace

| Field | Value |
|---|---|
| Workspace ID | `d9e51304-2b8a-4e62-b689-922e79fd76b4` |
| Capacity ID observed in notebook output | `6E656A07-3795-4195-B8E9-080E3BF84E95` |

## Lakehouse

| Field | Value |
|---|---|
| Lakehouse ID | `537823c4-b83a-4a9b-9444-6039d55a4b9e` |
| Lakehouse name used in notebook code | `jacks_lakehouse` |
| Lakehouse name observed in metadata | `jacks_Lakehouse` |

## OneLake roots

| Field | Value |
|---|---|
| DFS endpoint | `https://onelake.dfs.fabric.microsoft.com` |
| Files root URL | `https://onelake.dfs.fabric.microsoft.com/d9e51304-2b8a-4e62-b689-922e79fd76b4/537823c4-b83a-4a9b-9444-6039d55a4b9e/Files` |
| App root URL | `https://onelake.dfs.fabric.microsoft.com/d9e51304-2b8a-4e62-b689-922e79fd76b4/537823c4-b83a-4a9b-9444-6039d55a4b9e/Files/agent_eval` |
| App root ABFSS | `abfss://d9e51304-2b8a-4e62-b689-922e79fd76b4@onelake.dfs.fabric.microsoft.com/537823c4-b83a-4a9b-9444-6039d55a4b9e/Files/agent_eval` |
| Config path | `Files/agent_eval/config` |
| Runs path | `Files/agent_eval/runs` |
| Corpus path | `Files/agent_eval/corpus` |

## Existing Fabric notebooks

These are the previous architecture notebooks, not the final web-app response-capture and merge notebooks.

| Notebook | Observed item/artifact ID |
|---|---|
| `00_orchestrator` | `9c7c309a-ef72-4e62-a73f-9c06fc2cf2d6` |
| `00_agent_registry` | `fe573cf1-5367-4fad-a5cb-fe35d05c2037` |
| `01_data_contracts` | `3530a316-6172-4777-84bc-3ae1d43bf223` |
| `02_agent_caller` | `cbcea447-245a-46bb-90d9-243a71235a3a` |
| `03_source_retrieval` | `72a74714-46c7-49c0-a349-5ada601a68ba` |
| `04_deterministic` | `345c1179-5111-4d57-a4f3-62471e04fe21` |
| `05_claim_grounding_scoring` | `5c7a85cb-1025-412d-86e2-1cb893f164cf` |
| `05b_microsoft_eval` | `5d7c23ed-0ef8-4b72-ae11-f8e23fa046de` |

The future response-capture notebook ID and lightweight merge notebook ID are not present yet because those notebooks have not been created.

## Copilot agent

| Field | Value |
|---|---|
| Agent ID | `sparky` |
| Display name | `Sparky` |
| Platform | `copilot_studio` |
| Connection mode | `direct_line_secret` |
| Business area | `Technical Support` |
| Owner | `BI & AI Team` |
| Schema name | `cr578_Productsagent` |
| Environment ID | `605e3ed6-b18f-ece1-ad54-4f71a003a6cb` |
| Tenant ID | `226e353c-f71a-4b6a-a6af-293275183a60` |
| Bot ID | `90834477-dcd9-4c4c-a025-dd256379a63a` |
| Client ID recorded in agent registry | `90834477-dcd9-4c4c-a025-dd256379a63a` |
| Direct Line secret | `7OjuL5Med3ZDXtgkYFEwbReZ0Lgd6AeegEyyXngPmSvVBmCSdrVgJQQJ99CDACYeBjFAArohAAABAZBS3bsh.7KTe1rZPwCrfkKt12QHTRdYiyvIHasJ3tMW3xIQYVAXAPNvv36idJQQJ99CDACYeBjFAArohAAABAZBS34rL` |
| Direct connect URL | `https://605e3ed6b18fece1ad544f71a003a6.cb.environment.api.powerplatform.com/copilotstudio/dataverse-backed/authenticated/bots/cr578_Productsagent/conversations?api-version=2022-03-01-preview` |

## Judge server

| Field | Value |
|---|---|
| Provider | `ollama_openai_compatible` |
| Local base URL | `http://127.0.0.1:11434/v1` |
| Dev tunnel base URL | `https://k5ljzg9z-11434.auc1.devtunnels.ms/v1` |
| Model | `llama3.2:3b` |
| API key | `ollama` |
| Temperature | `0` |
| Timeout | `120000` |
| Dev tunnel command | `devtunnel host -p 11434 --allow-anonymous` |

## Values still required before live Stage 3 calls

The previous notebooks do not contain these final web-app values:

- Fabric service-principal client ID for the web app.
- Fabric service-principal client secret for the web app.
- Lakehouse SQL analytics endpoint server/database string.
- Final response-capture notebook item ID.
- Final lightweight merge notebook item ID.
