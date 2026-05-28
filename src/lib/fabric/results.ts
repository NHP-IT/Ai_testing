import "server-only";

import sql from "mssql";
import { getAccessToken } from "@/lib/fabric/auth";
import { MissingConnectionValueError } from "@/lib/fabric/errors";
import { testingConnections } from "@/lib/testingConnections";

export type ResultQueryOptions = {
  runId?: string;
  limit?: number;
};

export async function queryAgentEvalResults(options: ResultQueryOptions = {}) {
  const endpoint = testingConnections.sqlEndpoint;
  if (!endpoint) {
    throw new MissingConnectionValueError("Lakehouse SQL analytics endpoint");
  }

  const token = await getAccessToken("sql");
  const pool = await sql.connect({
    server: endpoint.server,
    database: endpoint.database,
    options: {
      encrypt: true
    },
    authentication: {
      type: "azure-active-directory-access-token",
      options: {
        token
      }
    }
  });

  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const request = pool.request();
  request.input("limit", sql.Int, limit);

  let query = `
    SELECT TOP (@limit) *
    FROM agent_eval_results
  `;

  if (options.runId) {
    request.input("run_id", sql.NVarChar, options.runId);
    query += " WHERE run_id = @run_id";
  }

  query += " ORDER BY created_at DESC";

  try {
    const result = await request.query(query);
    return result.recordset;
  } finally {
    await pool.close();
  }
}
