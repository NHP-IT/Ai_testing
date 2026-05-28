import { describe, expect, it } from "vitest";
import { parseCsv } from "../csv";

describe("parseCsv", () => {
  it("parses a basic CSV into headers and row objects", () => {
    const { headers, rows } = parseCsv(
      "test_id,agent_id,question\nSPARKY_001,sparky,What can you help with?"
    );
    expect(headers).toEqual(["test_id", "agent_id", "question"]);
    expect(rows[0]).toEqual({
      test_id: "SPARKY_001",
      agent_id: "sparky",
      question: "What can you help with?"
    });
  });

  it("handles quoted fields containing commas", () => {
    const { rows } = parseCsv(
      'id,text\n1,"Hello, world"'
    );
    expect(rows[0].text).toBe("Hello, world");
  });

  it("handles escaped double-quotes within quoted fields", () => {
    const { rows } = parseCsv(
      'id,text\n1,"He said ""hello"""'
    );
    expect(rows[0].text).toBe('He said "hello"');
  });

  it("handles CRLF line endings", () => {
    const { rows } = parseCsv("a,b\r\n1,2\r\n3,4");
    expect(rows).toHaveLength(2);
    expect(rows[1].b).toBe("4");
  });

  it("skips entirely blank lines", () => {
    const { rows } = parseCsv("a,b\n1,2\n\n3,4");
    expect(rows).toHaveLength(2);
  });

  it("returns empty result for empty input", () => {
    const { headers, rows } = parseCsv("");
    expect(headers).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });

  it("returns only headers when there are no data rows", () => {
    const { headers, rows } = parseCsv("test_id,question");
    expect(headers).toEqual(["test_id", "question"]);
    expect(rows).toHaveLength(0);
  });

  it("trims header names", () => {
    const { headers } = parseCsv("  test_id , question \nval,q");
    expect(headers).toEqual(["test_id", "question"]);
  });

  it("fills missing columns with empty string", () => {
    const { rows } = parseCsv("a,b,c\n1,2");
    expect(rows[0].c).toBe("");
  });
});
