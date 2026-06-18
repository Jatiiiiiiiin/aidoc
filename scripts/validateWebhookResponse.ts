import * as fs from "fs";

const args = process.argv.slice(2);
let responsePath = "";
let maxRetries = 5;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--response" && i + 1 < args.length) {
    responsePath = args[i + 1];
    i++;
  } else if (args[i] === "--max-retries" && i + 1 < args.length) {
    maxRetries = parseInt(args[i + 1], 10);
    i++;
  }
}

export interface WebhookResponse {
  status: "success" | "skip" | "error";
  slug?: string;
  sectionsUpdated?: number;
  error?: string;
}

export function validateWebhookResponse(raw: unknown): WebhookResponse {
  if (!raw || typeof raw !== "object") {
    return { status: "error", error: "Response is not an object" };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.error) {
    return { status: "error", error: String(obj.error) };
  }

  if (obj.skip === true || obj.isSkip === true) {
    return { status: "skip", slug: obj.slug as string | undefined };
  }

  if (obj.status === "success" || obj.sectionsUpdated !== undefined) {
    return {
      status: "success",
      slug: obj.slug as string | undefined,
      sectionsUpdated: typeof obj.sectionsUpdated === "number" ? obj.sectionsUpdated : undefined,
    };
  }

  return { status: "error", error: "Unrecognized response shape" };
}

export function assertWebhookSuccess(response: WebhookResponse, attempt: number, max: number): void {
  if (response.status === "error") {
    const msg = `Webhook error (attempt ${attempt}/${max}): ${response.error}`;
    if (attempt >= max) {
      console.error(msg);
      process.exit(1);
    }
    console.warn(msg + " — will retry");
  } else if (response.status === "skip") {
    console.log(`n8n skipped doc update (no significant changes detected). Slug: ${response.slug ?? "unknown"}`);
  } else {
    console.log(
      `Doc update successful. Slug: ${response.slug ?? "unknown"}, sections updated: ${response.sectionsUpdated ?? "unknown"}`
    );
  }
}

function main() {
  if (!responsePath) {
    console.error("Error: --response parameter is required.");
    process.exit(1);
  }

  if (!fs.existsSync(responsePath)) {
    console.error(`Response file not found: ${responsePath}`);
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(responsePath, "utf-8"));
  } catch {
    console.error("Failed to parse response JSON.");
    process.exit(1);
  }

  const response = validateWebhookResponse(raw);
  assertWebhookSuccess(response, 1, maxRetries);
}

if (require.main === module) {
  main();
}
