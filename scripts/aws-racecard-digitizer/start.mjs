import crypto from "node:crypto";
import { TextractClient, StartDocumentTextDetectionCommand } from "@aws-sdk/client-textract";

const textract = new TextractClient({});

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function postWebhook(body, attempts = 8) {
  const url = requiredEnv("WEBHOOK_URL");
  const secret = requiredEnv("WEBHOOK_SECRET");
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dataeel-digitizer-secret": secret,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) return response.json();
    const payload = await response.text();
    lastError = new Error(`Webhook ${response.status}: ${payload}`);
    if (response.status !== 404 && response.status < 500) throw lastError;
    await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
  }

  throw lastError ?? new Error("Webhook failed");
}

function decodeS3Key(rawKey) {
  return decodeURIComponent(rawKey.replace(/\+/g, " "));
}

function clientRequestToken(bucket, key) {
  return crypto.createHash("sha256").update(`${bucket}/${key}`).digest("hex");
}

export async function handler(event) {
  console.log("dataeel digitizer start event", JSON.stringify({ records: event.Records?.length ?? 0 }));
  const topicArn = requiredEnv("TEXTRACT_SNS_TOPIC_ARN");
  const roleArn = requiredEnv("TEXTRACT_ROLE_ARN");
  const results = [];

  for (const record of event.Records ?? []) {
    const bucket = record.s3?.bucket?.name;
    const key = record.s3?.object?.key ? decodeS3Key(record.s3.object.key) : null;
    if (!bucket || !key || !key.startsWith("racecards/") || !key.toLowerCase().endsWith(".pdf")) continue;

    console.log("starting textract job", JSON.stringify({ bucket, key }));
    const response = await textract.send(new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: { Bucket: bucket, Name: key },
      },
      ClientRequestToken: clientRequestToken(bucket, key),
      JobTag: "dataeel-racecard",
      NotificationChannel: {
        SNSTopicArn: topicArn,
        RoleArn: roleArn,
      },
    }), { abortSignal: AbortSignal.timeout(25000) });

    console.log("textract job started", JSON.stringify({ key, jobId: response.JobId }));
    await postWebhook({
      action: "processing",
      s3Key: key,
      jobId: response.JobId,
    });
    console.log("processing webhook accepted", JSON.stringify({ key, jobId: response.JobId }));

    results.push({ bucket, key, jobId: response.JobId });
  }

  return { ok: true, started: results.length, results };
}
