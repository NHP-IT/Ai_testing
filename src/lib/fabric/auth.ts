import "server-only";

import { testingConnections } from "@/lib/testingConnections";
import { MissingConnectionValueError } from "@/lib/fabric/errors";

export type TokenAudience = "fabric" | "onelake" | "sql";

const scopes: Record<TokenAudience, string> = {
  fabric: "https://api.fabric.microsoft.com/.default",
  onelake: "https://storage.azure.com/.default",
  sql: "https://database.windows.net/.default"
};

export function hasFabricServicePrincipal(): boolean {
  return Boolean(testingConnections.fabric.servicePrincipal);
}

export async function getAccessToken(audience: TokenAudience): Promise<string> {
  const principal = testingConnections.fabric.servicePrincipal;

  if (!principal) {
    throw new MissingConnectionValueError("Fabric service principal");
  }

  const body = new URLSearchParams({
    client_id: principal.clientId,
    client_secret: principal.clientSecret,
    grant_type: "client_credentials",
    scope: scopes[audience]
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${principal.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    throw new Error(
      `Token request failed for ${audience}: ${response.status} ${await response.text()}`
    );
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error(`Token response for ${audience} did not include access_token.`);
  }

  return payload.access_token;
}

export async function authorizationHeader(
  audience: TokenAudience
): Promise<HeadersInit> {
  return {
    Authorization: `Bearer ${await getAccessToken(audience)}`
  };
}
