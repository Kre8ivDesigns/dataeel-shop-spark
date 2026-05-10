import { TextractClient, GetDocumentTextDetectionCommand } from "@aws-sdk/client-textract";
import { parseRacecardPredictions } from "./parser.mjs";

const textract = new TextractClient({});

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function postWebhook(body) {
  const response = await fetch(requiredEnv("WEBHOOK_URL"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-dataeel-digitizer-secret": requiredEnv("WEBHOOK_SECRET"),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Webhook ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function parseSnsMessage(record) {
  const envelope = JSON.parse(record.body);
  return JSON.parse(envelope.Message);
}

async function fetchAllBlocks(jobId) {
  const blocks = [];
  let nextToken;

  do {
    const response = await textract.send(new GetDocumentTextDetectionCommand({
      JobId: jobId,
      NextToken: nextToken,
    }));
    blocks.push(...(response.Blocks ?? []));
    nextToken = response.NextToken;
  } while (nextToken);

  return blocks;
}

export async function handler(event) {
  console.log("dataeel digitizer finish event", JSON.stringify({ records: event.Records?.length ?? 0 }));
  const results = [];

  for (const record of event.Records ?? []) {
    const message = parseSnsMessage(record);
    const jobId = message.JobId;
    if (!jobId) continue;
    console.log("textract completion received", JSON.stringify({ jobId, status: message.Status }));

    if (message.Status !== "SUCCEEDED") {
      await postWebhook({
        action: "failed",
        jobId,
        error: `Textract job ${message.Status ?? "failed"}`,
      });
      results.push({ jobId, status: message.Status ?? "FAILED" });
      continue;
    }

    const blocks = await fetchAllBlocks(jobId);
    const predictions = parseRacecardPredictions(blocks);
    console.log("textract blocks parsed", JSON.stringify({ jobId, blocks: blocks.length, predictions: predictions.length }));
    const webhookResult = await postWebhook({
      action: "complete",
      jobId,
      predictions,
    });

    results.push({
      jobId,
      status: "SUCCEEDED",
      blocks: blocks.length,
      predictions: predictions.length,
      webhookResult,
    });
  }

  return { ok: true, processed: results.length, results };
}
