/**
 * Validates AWS S3 env vars for Edge Functions that talk to S3.
 */
export type AwsS3Env = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

const KEYS = ["AWS_S3_BUCKET", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"] as const;

/** Strip BOM and outer whitespace — pasted Dashboard secrets often include a leading TAB. */
export function normalizeAwsEnvValue(raw: string): string {
  return raw.replace(/^\uFEFF/, "").trim();
}

export function missingAwsS3EnvKeys(): string[] {
  const missing: string[] = [];
  for (const k of KEYS) {
    const raw = Deno.env.get(k);
    const v = raw !== undefined ? normalizeAwsEnvValue(raw) : "";
    if (!v) missing.push(k);
  }
  return missing;
}

export function getAwsS3Env(): AwsS3Env | null {
  const missing = missingAwsS3EnvKeys();
  if (missing.length > 0) return null;
  return {
    bucket: normalizeAwsEnvValue(Deno.env.get("AWS_S3_BUCKET")!),
    region: normalizeAwsEnvValue(Deno.env.get("AWS_REGION")!),
    accessKeyId: normalizeAwsEnvValue(Deno.env.get("AWS_ACCESS_KEY_ID")!),
    secretAccessKey: normalizeAwsEnvValue(Deno.env.get("AWS_SECRET_ACCESS_KEY")!),
  };
}
