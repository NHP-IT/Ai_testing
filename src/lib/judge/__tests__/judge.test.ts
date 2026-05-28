import { describe, expect, it } from "vitest";
import { runDeterministicChecks } from "../deterministic";
import { Semaphore } from "../semaphore";

// ─── Deterministic checks ────────────────────────────────────────────────────

describe("runDeterministicChecks", () => {
  it("passes when must_contain term is present", () => {
    const result = runDeterministicChecks("Sparky validates the pipeline.", "validates", undefined);
    expect(result.must_contain_passed).toBe(true);
    expect(result.deterministic_passed).toBe(true);
  });

  it("fails when must_contain term is absent", () => {
    const result = runDeterministicChecks("Sparky is an assistant.", "validates", undefined);
    expect(result.must_contain_passed).toBe(false);
    expect(result.deterministic_passed).toBe(false);
  });

  it("passes when must_contain has pipe-separated alternatives and one matches", () => {
    const result = runDeterministicChecks(
      "Sparky validates the evaluation pipeline.",
      "validates the evaluation pipeline|other text",
      undefined
    );
    expect(result.must_contain_passed).toBe(true);
  });

  it("fails when must_not_contain term is present", () => {
    const result = runDeterministicChecks(
      "This includes a guaranteed discount tier.",
      undefined,
      "guaranteed|discount tier"
    );
    expect(result.must_not_contain_passed).toBe(false);
    expect(result.deterministic_passed).toBe(false);
  });

  it("passes when must_not_contain terms are all absent", () => {
    const result = runDeterministicChecks("Product information is available.", undefined, "guaranteed|discount");
    expect(result.must_not_contain_passed).toBe(true);
  });

  it("is case-insensitive", () => {
    const result = runDeterministicChecks("SPARKY VALIDATES the pipeline.", "validates", "FORBIDDEN");
    expect(result.must_contain_passed).toBe(true);
    expect(result.must_not_contain_passed).toBe(true);
  });

  it("returns undefined for checks that are not configured", () => {
    const result = runDeterministicChecks("any response", undefined, undefined);
    expect(result.must_contain_passed).toBeUndefined();
    expect(result.must_not_contain_passed).toBeUndefined();
    expect(result.deterministic_passed).toBe(true);
  });
});

// ─── Semaphore ────────────────────────────────────────────────────────────────

describe("Semaphore", () => {
  it("allows up to the concurrency limit through immediately", async () => {
    const sem = new Semaphore(2);
    const log: number[] = [];

    await Promise.all([
      sem.acquire().then(() => { log.push(1); sem.release(); }),
      sem.acquire().then(() => { log.push(2); sem.release(); })
    ]);

    expect(log).toContain(1);
    expect(log).toContain(2);
  });

  it("queues work beyond the concurrency limit", async () => {
    const sem = new Semaphore(1);
    const order: string[] = [];

    const first = sem.acquire().then(async () => {
      order.push("start-1");
      await Promise.resolve();
      order.push("end-1");
      sem.release();
    });

    const second = sem.acquire().then(() => {
      order.push("start-2");
      sem.release();
    });

    await Promise.all([first, second]);
    expect(order.indexOf("start-2")).toBeGreaterThan(order.indexOf("end-1"));
  });
});
