import { NextResponse } from "next/server";
import { runConnectivityChecks } from "@/lib/fabric/connectivity";

export async function POST() {
  const checks = await runConnectivityChecks();
  return NextResponse.json({
    checked_at: new Date().toISOString(),
    checks
  });
}
