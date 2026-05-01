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

export function missingAwsS3EnvKeys(): string[] {
  const missing: string[] = [];
  for (const k of KEYS) {
    const v = Deno.env.get(k)?.trim();
    if (!v) missing.push(k);
  }
  return missing;
}

export function getAwsS3Env(): AwsS3Env | null {
  const missing = missingAwsS3EnvKeys();
  if (missing.length > 0) return null;
  return {
    bucket: Deno.env.get("AWS_S3_BUCKET")!.trim(),
    region: Deno.env.get("AWS_REGION")!.trim(),
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!.trim(),
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!.trim(),
  };
}
