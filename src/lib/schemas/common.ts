import { z } from "zod";

export const agentIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_]*$/, {
    message: "Use lowercase letters, numbers, and underscores; start with a letter."
  });

export const testIdSchema = z
  .string()
  .trim()
  .min(1, "test_id is required")
  .max(120, "test_id is too long");

export const runIdSchema = z
  .string()
  .trim()
  .min(1, "run_id is required")
  .max(160, "run_id is too long")
  .regex(/^[A-Za-z0-9_.:-]+$/, {
    message: "run_id may only contain letters, numbers, underscores, dots, colons, and hyphens."
  });

export const nonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, "Value is required");

export const guidStringSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, {
    message: "Value must be GUID-shaped."
  });

export const optionalStringSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}, z.string().optional());

export const csvStringSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}, z.string());

export const scoreSchema = z.number().min(0).max(1);

export const thresholdSchema = z.number().min(0).max(1);

export const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime({ local: true }));

export const sourceFilterSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^\u0000-\u001f\u007f]+$/, {
    message: "source_filter cannot include control characters."
  });

export function issueMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}
