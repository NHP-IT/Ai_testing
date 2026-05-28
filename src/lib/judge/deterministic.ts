export type DeterministicResult = {
  must_contain_passed: boolean | undefined;
  must_not_contain_passed: boolean | undefined;
  deterministic_passed: boolean;
};

export function runDeterministicChecks(
  agentResponse: string,
  mustContain: string | undefined,
  mustNotContain: string | undefined
): DeterministicResult {
  const lower = agentResponse.toLowerCase();

  let must_contain_passed: boolean | undefined;
  if (mustContain) {
    const terms = mustContain
      .split("|")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    must_contain_passed = terms.every((t) => lower.includes(t));
  }

  let must_not_contain_passed: boolean | undefined;
  if (mustNotContain) {
    const terms = mustNotContain
      .split("|")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    must_not_contain_passed = !terms.some((t) => lower.includes(t));
  }

  const deterministic_passed =
    (must_contain_passed ?? true) && (must_not_contain_passed ?? true);

  return { must_contain_passed, must_not_contain_passed, deterministic_passed };
}
